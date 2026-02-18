"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { TEMPLATES, TEMPLATE_NAMES } from "@/lib/prompts";
import { startGeneration, getGeneration, clearGeneration, subscribe } from "@/lib/generation-store";
import { addToHistory, updateLatestHistory, getHistory, updateHistoryById, getHistoryById, deleteHistoryById } from "@/lib/history";
import PasswordModal, { isAuthenticated } from "@/components/PasswordModal";
import { injectEditingCapabilities } from "@/lib/iframe-editing";

const TAB_COLORS = [
  "#d4a574", // Restaurant - gold
  "#ff4d4d", // Fitness - red
  "#0071e3", // Portfolio - blue
  "#2a9d8f", // Dentist - teal
  "#7c3aed", // Tech - purple
  "#D4813B", // Bakery - warm orange
  "#c9a84c", // Real Estate - gold
  "#e85d04", // Online Shop - orange
];

const EXAMPLES = [
  { label: "Restaurant", style: "Dunkel & Gold", text: "Eine elegante Landing Page für ein Restaurant mit dunklem Design, goldenen Akzenten, Speisekarte und Reservierungsbereich" },
  { label: "Fitnessstudio", style: "Energetisch", text: "Eine energetische Website für ein Fitnessstudio mit kräftigen Rot- und Schwarztönen, Hero-Video-Bereich und Kursplan" },
  { label: "Portfolio", style: "Minimalistisch", text: "Ein minimalistisches Portfolio für eine Fotografin mit viel Weissraum, Bildergalerie im Grid und sanften Hover-Animationen" },
  { label: "Arztpraxis", style: "Vertrauensvoll", text: "Eine vertrauenswürdige Website für eine Zahnarztpraxis mit beruhigenden Blau- und Weisstönen, Team-Sektion und Online-Terminbuchung" },
  { label: "Tech Startup", style: "Futuristisch", text: "Eine moderne Website für ein Tech-Startup mit Gradient-Effekten, dunklem Theme, animierten Statistiken und Pricing-Tabelle" },
  { label: "Bäckerei", style: "Warm & Handgemacht", text: "Eine warme Website für eine Bäckerei mit Erdtönen, handgemachtem Feeling, Produktkarten und Über-uns-Geschichte" },
  { label: "Immobilien", style: "Elegant & Seriös", text: "Eine professionelle Website für eine Immobilienagentur mit Objekt-Karussell, Suchfiltern, dunklem Marineblau und Gold-Akzenten" },
  { label: "Online Shop", style: "Modern & Conversion", text: "Ein vollständiger Online-Shop mit professionellem Header (Logo, Suche, Warenkorb-Icon mit Badge), Kategorie-Filter-Leiste und einem responsiven Produkt-Grid mit mindestens 12 Produktkarten. Jede Karte hat abgerundete Ecken, Produktfoto, Badge (Neu/Sale), Produktname, Bewertungssterne, Preis und einen auffälligen 'In den Warenkorb'-Button mit Hover-Effekt. Beim Klick auf eine Karte öffnet sich ein elegantes Modal mit großem Produktbild, Beschreibung, Varianten-Auswahl, Menge und Kauf-Button. Cleanes weisses Design mit dunklen Akzenten, sanfte Schatten und smooth Animationen." },
  { label: "Musikband", style: "Grunge & Retro", text: "Eine retro-inspirierte Website für eine Rockband mit körnigem Hintergrund, Tour-Daten, Albumcover-Galerie und eingebettetem Musikplayer" },
];


const PROGRESS_STEPS = [
  { pct: 5,  text: "Analysiere deine Beschreibung..." },
  { pct: 15, text: "Wähle Farbpalette und Schriften..." },
  { pct: 28, text: "Erstelle Header und Navigation..." },
  { pct: 42, text: "Gestalte Hero-Bereich..." },
  { pct: 55, text: "Lade Bilder und Assets..." },
  { pct: 67, text: "Erstelle Inhalts-Sektionen..." },
  { pct: 78, text: "Optimiere responsives Design..." },
  { pct: 88, text: "Letzte Feinabstimmungen..." },
  { pct: 93, text: "Fast fertig..." },
];

function extractHTML(text: string): string {
  console.log('🔍 [extractHTML] Input length:', text.length);
  console.log('🔍 [extractHTML] Input preview:', text.substring(0, 300));

  const fenceMatch = text.match(/```(?:html)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    console.log('🔍 [extractHTML] Found markdown fence');
    return fenceMatch[1].trim();
  }

  if (text.trim().match(/^<!DOCTYPE|^<html/i)) {
    console.log('🔍 [extractHTML] Found DOCTYPE or <html>');
    return text.trim();
  }

  console.log('🔍 [extractHTML] Wrapping content in basic HTML structure');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body>${text}</body></html>`;
}

export default function WebCreatorPage() {
  const [prompt, setPrompt] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(-1);
  const [currentHTML, setCurrentHTML] = useState("");
  const [resultHTML, setResultHTML] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTemplateIdx, setModalTemplateIdx] = useState(-1);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState(-1);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<"generate" | "modify" | null>(null);
  const [lastAIHTML, setLastAIHTML] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showModifyPanel, setShowModifyPanel] = useState(false);
  const [modifyPrompt, setModifyPrompt] = useState("");
  const [isModifying, setIsModifying] = useState(false);
  const [error, setError] = useState("");
  const [myWebsites, setMyWebsites] = useState<Array<{id: string; html: string; prompt: string; createdAt: string}>>([]);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const [targetSection, setTargetSection] = useState<string | null>(null);
  const [editSidebarOpen, setEditSidebarOpen] = useState(false);
  const [editingSectionIndex, setEditingSectionIndex] = useState<number | null>(null);
  const [editingSectionName, setEditingSectionName] = useState("");
  const [hasEdits, setHasEdits] = useState(false);
  const [editingSectionStyles, setEditingSectionStyles] = useState<Record<string, string>>({});
  const [pageTitle, setPageTitle] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [selectedModel, setSelectedModel] = useState<"gpt-5.1-codex-mini" | "gpt-4o" | "gemini-3-pro" | "gemini">("gpt-5.1-codex-mini");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  // Extract page title from HTML whenever resultHTML changes
  useEffect(() => {
    if (!resultHTML) { setPageTitle(""); return; }
    const m = resultHTML.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    setPageTitle(m ? m[1].trim() : "");
  }, [resultHTML]);

  const updatePageTitle = useCallback((newTitle: string) => {
    setPageTitle(newTitle);
    setResultHTML(prev => {
      let updated: string;
      if (prev.match(/<title[^>]*>[\s\S]*?<\/title>/i)) {
        updated = prev.replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title>${newTitle}</title>`);
      } else if (prev.includes('</head>')) {
        updated = prev.replace('</head>', `<title>${newTitle}</title>\n</head>`);
      } else {
        updated = prev;
      }
      setCurrentHTML(updated);
      setHasEdits(true);
      sessionStorage.setItem("web_completed_html", updated);
      sessionStorage.setItem("web_completed_timestamp", Date.now().toString());
      if (currentHistoryId) {
        updateHistoryById(currentHistoryId, { html: updated });
      }
      return updated;
    });
  }, [currentHistoryId]);

  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const iframeResultRef = useRef<HTMLIFrameElement>(null);
  const resultHTMLRef = useRef(resultHTML);
  resultHTMLRef.current = resultHTML;

  // Extract clean HTML directly from the iframe DOM (bypasses postMessage)
  const getIframeHTML = useCallback(() => {
    try {
      const iframe = iframeResultRef.current;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (iframe?.contentWindow && (iframe.contentWindow as any).__soraGetCleanHTML) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const html = (iframe.contentWindow as any).__soraGetCleanHTML();
        console.log('📋 Extracted HTML from iframe, length:', html?.length);
        return html;
      }
    } catch (e) {
      console.warn('Could not extract HTML from iframe:', e);
    }
    return null;
  }, []);

  // Close result modal and sync lastAIHTML with the latest edited HTML
  const closeResultModal = useCallback(() => {
    // Extract latest HTML directly from iframe DOM
    const freshHTML = getIframeHTML();
    const htmlToSave = freshHTML || resultHTML;

    if (htmlToSave && htmlToSave !== lastAIHTML) {
      setLastAIHTML(htmlToSave);
      setResultHTML(htmlToSave);
      setCurrentHTML(htmlToSave);
      // Persist to storage
      sessionStorage.setItem("web_completed_html", htmlToSave);
      sessionStorage.setItem("web_completed_timestamp", Date.now().toString());
      if (currentHistoryId) {
        updateHistoryById(currentHistoryId, { html: htmlToSave });
        console.log(`💾 Saved edited HTML to history: ${currentHistoryId}`);
      }
    }
    setResultModalOpen(false);
    setHasEdits(false);
    setPreviewTab(999);
  }, [resultHTML, lastAIHTML, getIframeHTML, currentHistoryId]);

  // Load user's generated websites from history
  useEffect(() => {
    const webHistory = getHistory("web").slice(0, 10); // Last 10 webs
    const websites = webHistory.map(item => ({
      id: item.id,
      html: item.metadata?.html as string || "",
      prompt: item.prompt,
      createdAt: item.createdAt
    })).filter(w => w.html);
    setMyWebsites(websites);
    // If user has generated websites, show "Meine Websites" tab by default
    if (websites.length > 0) {
      setPreviewTab(999);
    }
  }, [resultModalOpen]); // Refresh when modal closes

  const [displayURL, setDisplayURL] = useState("");

  useEffect(() => {
    if (!lastAIHTML) {
      setDisplayURL("");
      return;
    }

    console.log('🎨 [displayURL] Creating blob URL with editing capabilities');
    // Convert relative image/asset paths to absolute so they work inside blob URL
    const origin = window.location.origin;
    const htmlWithAbsolutePaths = lastAIHTML
      .replace(/(src=["'])\/(?!\/)/g, `$1${origin}/`)
      .replace(/(url\(["']?)\/(?!\/)/g, `$1${origin}/`);

    const htmlWithEditing = injectEditingCapabilities(htmlWithAbsolutePaths);
    const blob = new Blob([htmlWithEditing], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    setDisplayURL(url);

    return () => { URL.revokeObjectURL(url); };
  }, [lastAIHTML]);

  // Listen for inline edits and section edit requests from iframe
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type) {
        console.log('📩 Message from iframe:', event.data.type, event.data.html?.length || 0);
      }
      // Handle inline edits (text/image changes)
      if (event.data?.type === "sora-edit" && event.data.html) {
        setResultHTML(event.data.html);
        setCurrentHTML(event.data.html);
        setHasEdits(true);

        // Save to sessionStorage for immediate persistence
        sessionStorage.setItem("web_completed_html", event.data.html);
        sessionStorage.setItem("web_completed_timestamp", Date.now().toString());

        // Save to localStorage via history system
        if (currentHistoryId) {
          updateHistoryById(currentHistoryId, { html: event.data.html });
          console.log(`💾 Inline edit saved to localStorage for history ID: ${currentHistoryId}`);
        } else {
          updateLatestHistory("web", { html: event.data.html });
          console.log("💾 Inline edit saved to latest history item");
        }
      }

      // Handle section edit button clicks → open sidebar
      if (event.data?.type === "sora-edit-section" && event.data.sectionName) {
        console.log(`🎯 User wants to edit section: ${event.data.sectionName}`);
        setTargetSection(event.data.sectionName);
        setEditingSectionName(event.data.sectionName);
        setEditingSectionIndex(event.data.sectionIndex ?? null);
        setEditingSectionStyles(event.data.currentStyles || {});
        setEditSidebarOpen(true);
        setModifyPrompt("");
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [currentHistoryId]);

  // Listen for edits coming back from the web-preview new tab
  useEffect(() => {
    const channel = new BroadcastChannel("sora-web-preview");
    channel.onmessage = (event) => {
      if (event.data?.type === "sora-preview-edit" && event.data.html) {
        const { historyId: hId, html: updatedHtml } = event.data;
        setResultHTML(updatedHtml);
        setCurrentHTML(updatedHtml);
        setLastAIHTML(updatedHtml);
        sessionStorage.setItem("web_completed_html", updatedHtml);
        if (hId) {
          updateHistoryById(hId, { html: updatedHtml });
        }
      }
    };
    return () => channel.close();
  }, []);

  // Restore state from global store on mount + restore completed result from sessionStorage
  useEffect(() => {
    // First, try to restore from localStorage using history ID
    const savedHistoryId = sessionStorage.getItem("web_current_history_id");
    if (savedHistoryId) {
      const historyItem = getHistoryById(savedHistoryId);
      if (historyItem && historyItem.metadata?.html) {
        console.log(`🔄 Restoring web from history ID: ${savedHistoryId}`);
        const html = historyItem.metadata.html as string;
        setCurrentHTML(html);
        setResultHTML(html);
        setLastAIHTML(html);
        setCurrentHistoryId(savedHistoryId);
        if (historyItem.prompt) setPrompt(historyItem.prompt);

        // Also update sessionStorage to keep it in sync
        sessionStorage.setItem("web_completed_html", html);
        sessionStorage.setItem("web_completed_prompt", historyItem.prompt);
        sessionStorage.setItem("web_completed_timestamp", Date.now().toString());
        return;
      } else {
        // History item not found or doesn't have HTML, clear the ID
        sessionStorage.removeItem("web_current_history_id");
      }
    }

    // Fallback: check if there's a completed web in sessionStorage
    const savedHTML = sessionStorage.getItem("web_completed_html");
    const savedPrompt = sessionStorage.getItem("web_completed_prompt");
    const savedTimestamp = sessionStorage.getItem("web_completed_timestamp");

    if (savedHTML && savedTimestamp) {
      // Check if result is recent (within 1 hour)
      const elapsed = Date.now() - parseInt(savedTimestamp);
      if (elapsed < 60 * 60 * 1000) {
        // Save the HTML but DON'T open the modal automatically
        setCurrentHTML(savedHTML);
        setResultHTML(savedHTML);
        setLastAIHTML(savedHTML);
        // setResultModalOpen(true); ← REMOVED - don't auto-open
        if (savedPrompt) setPrompt(savedPrompt);
        return; // Don't check generation store if we have a completed result
      } else {
        // Clear old data
        sessionStorage.removeItem("web_completed_html");
        sessionStorage.removeItem("web_completed_prompt");
        sessionStorage.removeItem("web_completed_timestamp");
      }
    }

    // Then check generation store for ongoing generation
    const gen = getGeneration("web");
    if (!gen) return;

    if (gen.status === "pending") {
      setIsGenerating(true);
      // Resume progress from elapsed time
      const elapsed = Date.now() - gen.startedAt;
      const stepsPassed = Math.min(Math.floor(elapsed / 1800), PROGRESS_STEPS.length - 1);
      setProgressPct(PROGRESS_STEPS[stepsPassed].pct);
      setProgressText(PROGRESS_STEPS[stepsPassed].text);
      // Continue progress from current step
      let step = stepsPassed + 1;
      progressRef.current = setInterval(() => {
        if (step < PROGRESS_STEPS.length) {
          setProgressPct(PROGRESS_STEPS[step].pct);
          setProgressText(PROGRESS_STEPS[step].text);
          step++;
        }
      }, 1800);
      gen.promise.then(() => {
        const updated = getGeneration("web");
        if (updated?.status === "done" && updated.result) {
          // Don't auto-open modal when restoring from generation store
          handleWebResult(updated.result as Record<string, string>, false);
        } else if (updated?.status === "error") {
          finishProgress();
        }
      });
    } else if (gen.status === "done" && gen.result) {
      const r = gen.result as Record<string, string>;
      if (r.botReply) {
        const html = extractHTML(r.botReply);
        setCurrentHTML(html);
        setResultHTML(html);
        setLastAIHTML(html);
        // Don't auto-open modal on page reload
        // setResultModalOpen(true); ← Only open when actively generating
      }
    }

    return subscribe("web", () => {
      const g = getGeneration("web");
      if (g?.status !== "pending") setIsGenerating(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleWebResult = (data: Record<string, string>, shouldOpenModal: boolean = true) => {
    finishProgress();
    console.log('✅ [handleWebResult] Received data:', { status: data.status, replyLength: data.botReply?.length });

    if (data.status === "success" && data.botReply) {
      console.log('✅ [handleWebResult] Bot reply preview:', data.botReply.substring(0, 500));
      const html = extractHTML(data.botReply);
      console.log('✅ [handleWebResult] Extracted HTML length:', html.length);
      console.log('✅ [handleWebResult] Extracted HTML preview:', html.substring(0, 300));

      setCurrentHTML(html);
      setResultHTML(html);
      setLastAIHTML(html);

      // Only open if this is an active generation, not a restore
      if (shouldOpenModal) {
        // Update localStorage so the already-open preview tab picks up the HTML
        localStorage.setItem("sora_preview_html", html);
        localStorage.removeItem("sora_preview_loading");
      }

      // Save to history and get the generated ID
      const newHistoryId = addToHistory({
        type: "web",
        prompt: prompt || "Web generiert",
        url: "",
        title: prompt?.substring(0, 60) || "Generierte Website",
        metadata: { html },
      });

      if (newHistoryId) {
        setCurrentHistoryId(newHistoryId);
        sessionStorage.setItem("web_current_history_id", newHistoryId);
        // Update preview page so it knows the history ID to save edits
        localStorage.setItem("sora_preview_history_id", newHistoryId);
        console.log(`💾 Saved new web to history with ID: ${newHistoryId}`);
      }

      // Save to sessionStorage so it persists across page changes
      sessionStorage.setItem("web_completed_html", html);
      sessionStorage.setItem("web_completed_prompt", prompt || "Web generiert");
      sessionStorage.setItem("web_completed_timestamp", Date.now().toString());
    }
  };

  const startProgress = useCallback(() => {
    let currentPct = 0;
    setProgressPct(0);
    setProgressText(PROGRESS_STEPS[0].text);

    progressRef.current = setInterval(() => {
      // Asymptotic curve: always moves but gets slower near 94%
      currentPct = currentPct + (94 - currentPct) * 0.03;
      const rounded = Math.min(Math.round(currentPct * 10) / 10, 94);
      setProgressPct(rounded);

      // Update text based on current percentage
      const step = [...PROGRESS_STEPS].reverse().find(s => s.pct <= rounded);
      if (step) setProgressText(step.text);
    }, 500);
  }, []);

  const finishProgress = useCallback(() => {
    if (progressRef.current) clearInterval(progressRef.current);
    setProgressPct(100);
    setProgressText("Fertig!");
    setTimeout(() => setIsGenerating(false), 800);
  }, []);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    if (!isAuthenticated()) {
      setPendingAction("generate");
      setShowPasswordModal(true);
      return;
    }
    // Open preview window NOW (must be synchronous with user click, or browser blocks it)
    localStorage.removeItem("sora_preview_html");
    localStorage.setItem("sora_preview_loading", "1");
    window.open("/web-preview", "_blank");
    generatePreview();
  };

  const generatePreview = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setResultModalOpen(false);
    clearGeneration("web");

    // Clear any previous completed result
    sessionStorage.removeItem("web_completed_html");
    sessionStorage.removeItem("web_completed_prompt");
    sessionStorage.removeItem("web_completed_timestamp");
    sessionStorage.removeItem("web_current_history_id");
    setCurrentHistoryId(null); // Reset history ID for new generation

    startProgress();

    // Auto-scroll to skeleton
    setTimeout(() => {
      document.getElementById("web-skeleton")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);

    const isModify = selectedTemplate >= 0 && !!currentHTML;
    const userMessage = isModify
      ? `Here is the current HTML of the website:\n\n${currentHTML}\n\nThe user wants this change: ${prompt}`
      : prompt;

    try {
      const data = await startGeneration("web", async () => {
        const res = await fetch("/api/generate-website", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userMessage, isModify, model: selectedModel }),
        });
        return await res.json();
      });
      handleWebResult(data as Record<string, string>);
    } catch (err) {
      console.error("Error generating preview:", err);
      finishProgress();
    }
  };

  const handleAIModify = async () => {
    if (!modifyPrompt.trim() || isModifying) return;
    if (!isAuthenticated()) {
      setPendingAction("modify");
      setShowPasswordModal(true);
      return;
    }
    setIsModifying(true);
    setError("");

    let userMessage: string;

    // If editing a specific section, use a much more focused approach
    if (targetSection) {
      // Extract only the user's actual modification request
      const actualPrompt = modifyPrompt.replace(/^NUR\s+"[^"]+"\s+ÄNDERN:\s*/i, '').trim();

      // Format the message to trigger incremental modification in the API
      userMessage = `Change the ${targetSection} section: ${actualPrompt}`;
    } else {
      // General modification
      userMessage = modifyPrompt;
    }

    try {
      const res = await fetch("/api/generate-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage, isModify: true, currentHTML: resultHTMLRef.current, model: selectedModel }),
      });
      const data = await res.json();

      if (data.status === "error") {
        setError(data.message || "Fehler bei der KI-Bearbeitung. Bitte versuche es erneut.");
        return;
      }

      if (data.status === "success" && data.botReply) {
        const html = extractHTML(data.botReply);
        setResultHTML(html);
        setCurrentHTML(html);
        setLastAIHTML(html);
        setHasEdits(true);

        // Update history - use currentHistoryId if available
        if (currentHistoryId) {
          updateHistoryById(currentHistoryId, { html });
          console.log(`💾 AI modification saved to history ID: ${currentHistoryId}`);
        } else {
          updateLatestHistory("web", { html });
          console.log("💾 AI modification saved to latest history");
        }

        // Update sessionStorage
        sessionStorage.setItem("web_completed_html", html);
        sessionStorage.setItem("web_completed_timestamp", Date.now().toString());

        // Log the strategy used (optional)
        if (data.metadata?.strategy === 'incremental') {
          console.log(`✅ Incremental edit: ${data.metadata.sectionsModified.join(', ')}`);
        } else if (data.metadata?.strategy === 'cross-section') {
          console.log('✅ Cross-section edit applied');
        } else {
          console.log('✅ Full regeneration');
        }

        setModifyPrompt("");
        setShowModifyPanel(false);
        setTargetSection(null);
        setEditSidebarOpen(false);
      }
    } catch (err) {
      console.error("AI modify error:", err);
      setError("Netzwerkfehler. Bitte überprüfe deine Verbindung und versuche es erneut.");
    } finally {
      setIsModifying(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const openTemplateModal = (idx: number) => {
    setModalTemplateIdx(idx);
    setModalOpen(true);
  };

  const openTemplateInEditor = (idx: number) => {
    const html = TEMPLATES[idx] ?? "";
    setCurrentHTML(html);
    setResultHTML(html);
    setLastAIHTML(html);
    setHasEdits(false);

    // Save to history
    const templateName = TEMPLATE_NAMES[idx] ?? "";
    const newHistoryId = addToHistory({
      type: "web",
      prompt: `Vorlage: ${templateName}`,
      url: "",
      title: templateName,
      metadata: { html },
    });
    if (newHistoryId) {
      setCurrentHistoryId(newHistoryId);
      sessionStorage.setItem("web_current_history_id", newHistoryId);
      localStorage.setItem("sora_preview_history_id", newHistoryId);
    }
    sessionStorage.setItem("web_completed_html", html);
    sessionStorage.setItem("web_completed_prompt", `Vorlage: ${templateName}`);
    sessionStorage.setItem("web_completed_timestamp", Date.now().toString());

    // Open in new tab (full viewport, no modal)
    localStorage.setItem("sora_preview_html", html);
    localStorage.removeItem("sora_preview_loading");
    window.open("/web-preview", "_blank");
  };

  const selectTemplate = () => {
    setSelectedTemplate(modalTemplateIdx);
    setCurrentHTML(TEMPLATES[modalTemplateIdx] ?? "");
    setModalOpen(false);
  };

  const deselectTemplate = () => {
    setSelectedTemplate(-1);
    setCurrentHTML("");
    setPrompt("");
  };

  // Send style to iframe section
  const sendStyleToIframe = (styles: Record<string, string>) => {
    if (editingSectionIndex === null) return;
    iframeResultRef.current?.contentWindow?.postMessage({
      type: 'sora-apply-style',
      sectionIndex: editingSectionIndex,
      styles,
    }, '*');
    setEditingSectionStyles(prev => ({ ...prev, ...styles }));
  };

  const sendFontToIframe = (fontFamily: string, googleFontUrl: string) => {
    if (editingSectionIndex === null) return;
    iframeResultRef.current?.contentWindow?.postMessage({
      type: 'sora-apply-font',
      sectionIndex: editingSectionIndex,
      fontFamily,
      googleFontUrl,
    }, '*');
    setEditingSectionStyles(prev => ({ ...prev, fontFamily }));
  };

  const COLOR_PRESETS = [
    '#ffffff','#f8f9fa','#e9ecef','#dee2e6','#adb5bd','#6c757d','#495057','#343a40','#212529','#000000',
    '#e3f2fd','#90caf9','#42a5f5','#1e88e5','#1565c0','#0d47a1',
    '#ffebee','#ef9a9a','#ef5350','#e53935','#c62828','#b71c1c',
    '#e8f5e9','#a5d6a7','#66bb6a','#43a047','#2e7d32','#1b5e20',
    '#f3e5f5','#ce93d8','#ab47bc','#8e24aa','#6a1b9a','#4a148c',
    '#fff3e0','#ffcc80','#ffa726','#fb8c00','#e65100','#bf360c',
    '#fff8e1','#ffe082','#ffd54f','#ffc107','#ff8f00','#ff6f00',
  ];

  const FONT_OPTIONS = [
    { name: 'Inter', value: 'Inter, sans-serif', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap' },
    { name: 'Poppins', value: 'Poppins, sans-serif', url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap' },
    { name: 'Montserrat', value: 'Montserrat, sans-serif', url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700&display=swap' },
    { name: 'Playfair Display', value: 'Playfair Display, serif', url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap' },
    { name: 'Roboto', value: 'Roboto, sans-serif', url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap' },
    { name: 'Open Sans', value: 'Open Sans, sans-serif', url: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap' },
    { name: 'Lato', value: 'Lato, sans-serif', url: 'https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap' },
    { name: 'Raleway', value: 'Raleway, sans-serif', url: 'https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;600;700&display=swap' },
    { name: 'Nunito', value: 'Nunito, sans-serif', url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&display=swap' },
    { name: 'DM Sans', value: 'DM Sans, sans-serif', url: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap' },
    { name: 'Merriweather', value: 'Merriweather, serif', url: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&display=swap' },
    { name: 'Source Sans 3', value: 'Source Sans 3, sans-serif', url: 'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;600;700&display=swap' },
  ];

  const PADDING_OPTIONS = [
    { label: 'S', value: '20px 20px' },
    { label: 'M', value: '40px 30px' },
    { label: 'L', value: '60px 40px' },
    { label: 'XL', value: '80px 60px' },
    { label: 'XXL', value: '120px 80px' },
  ];

  const RADIUS_OPTIONS = [
    { label: '0', value: '0px' },
    { label: 'S', value: '8px' },
    { label: 'M', value: '16px' },
    { label: 'L', value: '24px' },
  ];

  const closeSidebar = () => {
    setEditSidebarOpen(false);
    setEditingSectionIndex(null);
    setEditingSectionName("");
    setEditingSectionStyles({});
    setTargetSection(null);
    setModifyPrompt("");
  };

  return (
    <>
      {/* HERO / INPUT */}
      <section className="bg-gradient-to-b from-[#fffbf2] to-[#fffcf5] py-16 max-md:py-10  overflow-x-clip overflow-y-visible">
        <div className="max-w-[1200px] mx-auto px-6 max-md:px-4">
          <div className="text-center max-w-[720px] mx-auto">
            <h1 className="text-[44px] leading-[1.1] font-extrabold tracking-[-0.02em] text-gunpowder-900 mb-6 max-md:text-[30px] max-md:mb-4">
              Beschreibe deine
              <br />
              <span className="text-begonia-400">Traumwebsite</span>
            </h1>
            {selectedTemplate >= 0 ? (
              <p className="text-[20px] leading-relaxed text-gunpowder-500 mb-4 max-md:text-[16px] max-md:mb-3">
                Vorlage ausgewählt — beschreibe hier deine Änderungen und klicke auf Vorschau generieren.
              </p>
            ) : (
              <>
                <p className="text-[15px] leading-relaxed text-gunpowder-400 mb-4 max-md:text-[16px] max-md:mb-3 max-w-[560px] mx-auto">
                  Du brauchst nur eine einfache Webpräsenz für dein Unternehmen? Generiere eine Website, passe Texte und Bilder direkt an und lass die KI Änderungen für dich vornehmen — alles ohne Programmierkenntnisse.
                </p>
                <button
                  type="button"
                  onClick={() => setShowInfo(!showInfo)}
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-cerulean-500 hover:text-cerulean-700 transition-colors mb-4 max-md:mb-3"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                  {showInfo ? "Info ausblenden" : "Wie funktioniert es?"}
                </button>
                {showInfo && (
                  <div className="max-w-[560px] mx-auto mb-8 max-md:mb-5 animate-slideDown">
                    <div className="grid grid-cols-2 max-md:grid-cols-1 gap-2.5">
                      <div className="bg-white rounded-xl border border-gunpowder-100 p-4">
                        <div className="w-8 h-8 rounded-lg bg-cerulean-25 flex items-center justify-center mb-2.5">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#15a0da" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 18l6-6-6-6"/><path d="M8 6l-6 6 6 6"/></svg>
                        </div>
                        <p className="text-[13px] font-bold text-gunpowder-800 mb-0.5">Eine HTML-Datei</p>
                        <p className="text-[12px] text-gunpowder-400 leading-relaxed">HTML, CSS &amp; JavaScript — alles in einem File, sofort einsatzbereit.</p>
                      </div>
                      <div className="bg-white rounded-xl border border-gunpowder-100 p-4">
                        <div className="w-8 h-8 rounded-lg bg-cerulean-25 flex items-center justify-center mb-2.5">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#15a0da" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        </div>
                        <p className="text-[13px] font-bold text-gunpowder-800 mb-0.5">Direkt bearbeiten</p>
                        <p className="text-[12px] text-gunpowder-400 leading-relaxed">Texte, Farben und Bilder direkt im visuellen Editor ändern.</p>
                      </div>
                      <div className="bg-white rounded-xl border border-gunpowder-100 p-4">
                        <div className="w-8 h-8 rounded-lg bg-cerulean-25 flex items-center justify-center mb-2.5">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#15a0da" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8L19 13"/><path d="M15 9h0"/><path d="M17.8 6.2L19 5"/><path d="M3 21l9-9"/><path d="M12.2 6.2L11 5"/></svg>
                        </div>
                        <p className="text-[13px] font-bold text-gunpowder-800 mb-0.5">KI-Änderungen</p>
                        <p className="text-[12px] text-gunpowder-400 leading-relaxed">Beschreibe was du willst — die KI passt den Code an.</p>
                      </div>
                      <div className="bg-white rounded-xl border border-gunpowder-100 p-4">
                        <div className="w-8 h-8 rounded-lg bg-cerulean-25 flex items-center justify-center mb-2.5">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#15a0da" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        </div>
                        <p className="text-[13px] font-bold text-gunpowder-800 mb-0.5">Als .html laden</p>
                        <p className="text-[12px] text-gunpowder-400 leading-relaxed">Fertige Website herunterladen und sofort verwenden.</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="max-w-[640px] mx-auto text-left">
              {/* Attached template badge */}
              {selectedTemplate >= 0 && (
                <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-[rgba(77,211,91,0.08)] border border-[rgba(77,211,91,0.25)] rounded-xl mb-2.5 text-sm max-md:text-[14px] font-semibold text-[#2a8c36]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="12" fill="#4dd35b" />
                    <path d="M7 12.5l3 3 7-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Vorlage: {TEMPLATE_NAMES[selectedTemplate]}</span>
                  <button
                    onClick={deselectTemplate}
                    className="flex items-center justify-center w-[22px] h-[22px] rounded-full border-none bg-black/5 cursor-pointer text-gray-500 hover:bg-black/10 hover:text-gray-700 transition-all ml-1"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M18 6L6 18" />
                      <path d="M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                placeholder={
                  selectedTemplate >= 0
                    ? "z.B. Ändere die Farben zu Blau, ersetze den Namen mit meiner Firma, füge ein Kontaktformular hinzu..."
                    : "z.B. Eine moderne Landing Page für ein Café in Zürich mit warmem, einladendem Design..."
                }
                rows={4}
                className="w-full px-6 py-5 border-2 border-gunpowder-200 rounded-2xl font-jakarta text-base leading-relaxed text-gunpowder-900 bg-white resize-y transition-all duration-200 focus:outline-none focus:border-begonia-400 focus:shadow-[0_0_0_4px_rgba(254,108,117,0.1)] placeholder:text-gunpowder-300 max-md:px-4 max-md:py-4 max-md:rounded-xl"
              />

              {/* Example chips */}
              {selectedTemplate < 0 && (
                <div className="flex flex-wrap gap-2 mt-3.5">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex.label}
                      onClick={() => setPrompt(ex.text)}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] max-md:text-[14px] font-semibold text-gunpowder-500 bg-gunpowder-50 border border-gunpowder-150 cursor-pointer transition-all hover:text-begonia-500 hover:bg-[rgba(254,108,117,0.06)] hover:border-begonia-400"
                    >
                      {ex.label}
                      <span className="text-[11px] max-md:text-[12px] font-medium text-gunpowder-300">
                        {ex.style}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Generate button + model dropdown */}
              {!isGenerating && (() => {
                const AI_MODELS = [
                  { id: "gpt-5.1-codex-mini", label: "GPT-5.1 Codex",    sub: "Präziser, detaillierter Code — etwas langsamer",  tag: "OpenAI",  color: "#10a37f" },
                  { id: "gpt-4o",             label: "GPT-4o",            sub: "Schnell & ausgewogen — ideal für Änderungen",     tag: "OpenAI",  color: "#10a37f" },
                  { id: "gemini-3-pro",        label: "Gemini 3 Pro",      sub: "Googles stärkstes Modell — kreativ & präzise",    tag: "Google",  color: "#4285f4" },
                  { id: "gemini",              label: "Gemini 2.5 Flash",  sub: "Sehr schnell — gut für einfache Seiten",          tag: "Google",  color: "#4285f4" },
                ] as const;
                const active = AI_MODELS.find(m => m.id === selectedModel)!;
                return (
                  <div className="flex flex-col items-center gap-3 mt-5">
                    {/* Model dropdown above button */}
                    <div className="relative">
                      <button
                        onClick={() => setModelDropdownOpen(o => !o)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold border border-gunpowder-200 bg-white text-gunpowder-500 hover:border-gunpowder-300 transition-all cursor-pointer"
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: active.color }} />
                        <span>{active.label}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                          className={`transition-transform ${modelDropdownOpen ? "rotate-180" : ""}`}>
                          <path d="M6 9l6 6 6-6"/>
                        </svg>
                      </button>

                      {modelDropdownOpen && (
                        <div className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 bg-white border border-gunpowder-150 rounded-2xl shadow-xl py-1.5 min-w-[210px] z-50">
                          {AI_MODELS.map(m => (
                            <button
                              key={m.id}
                              onClick={() => { setSelectedModel(m.id); setModelDropdownOpen(false); }}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer border-none ${
                                selectedModel === m.id ? "bg-gunpowder-50" : "bg-white hover:bg-gunpowder-50"
                              }`}
                            >
                              <span className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: m.color }} />
                              <span className="flex-1 min-w-0">
                                <span className="flex items-center gap-2">
                                  <span className="text-[13px] font-semibold text-gunpowder-900">{m.label}</span>
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gunpowder-100 text-gunpowder-400">{m.tag}</span>
                                </span>
                                <span className="block text-[11px] text-gunpowder-400 font-medium leading-tight mt-0.5">{m.sub}</span>
                              </span>
                              {selectedModel === m.id && (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="flex-shrink-0 text-gunpowder-700">
                                  <path d="M20 6L9 17l-5-5"/>
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleGenerate}
                      className="inline-flex items-center justify-center h-[58px] px-8 rounded-full text-[18px] font-semibold bg-begonia-400 text-white shadow-[0_6px_30px_rgba(254,108,117,0.35)] hover:bg-[#ff8a91] hover:shadow-[0_4px_20px_rgba(254,108,117,0.25)] hover:-translate-y-px transition-all cursor-pointer border-none max-md:h-[50px] max-md:px-6 max-md:text-[16px] max-md:w-full"
                    >
                      Vorschau generieren
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* SKELETON - Website being generated */}
      {isGenerating && (
        <section id="web-skeleton" className="flex flex-col items-center justify-center min-h-[500px] bg-white flex-1 px-6 py-16 max-md:px-4 max-md:py-10">
          {/* Progress bar above skeleton */}
          <div className="w-full max-w-[800px] mb-8 max-md:mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-base font-semibold text-gunpowder-700 max-md:text-sm">{progressText}</span>
              <span className="text-base font-bold text-gunpowder-900 max-md:text-sm">{progressPct}%</span>
            </div>
            <div className="h-3 bg-gunpowder-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-begonia-400 to-purple-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Website Skeleton */}
          <div className="w-full max-w-[800px] aspect-video bg-gradient-to-br from-gunpowder-50 via-white to-gunpowder-50 rounded-2xl overflow-hidden shadow-2xl border-2 border-gunpowder-100 relative">
            {/* Animated shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer" />

            {/* Browser chrome */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-gunpowder-100/50 backdrop-blur-sm border-b border-gunpowder-200/50 flex items-center px-3 gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400/40 animate-pulse" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/40 animate-pulse" style={{ animationDelay: "150ms" }} />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400/40 animate-pulse" style={{ animationDelay: "300ms" }} />
            </div>

            {/* Spinner in center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-gunpowder-200 border-t-begonia-400 animate-spin" />
            </div>

            {/* Page structure skeleton */}
            <div className="absolute top-12 left-0 right-0 bottom-0 p-6 space-y-4 opacity-30">
              <div className="h-12 bg-gunpowder-200 rounded-lg animate-pulse" />
              <div className="grid grid-cols-3 gap-4">
                <div className="h-32 bg-gunpowder-200 rounded-lg animate-pulse" style={{ animationDelay: "200ms" }} />
                <div className="h-32 bg-gunpowder-200 rounded-lg animate-pulse" style={{ animationDelay: "400ms" }} />
                <div className="h-32 bg-gunpowder-200 rounded-lg animate-pulse" style={{ animationDelay: "600ms" }} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TEMPLATES */}
      <section className="pb-16 -mt-5 bg-gradient-to-b from-[#fffcf5] to-white max-md:pb-10 overflow-x-clip">
        <div className="max-w-[1200px] mx-auto px-6 max-md:px-4">
          <div className="flex items-center gap-5 mb-8">
            <span className="text-sm max-md:text-[14px] font-bold text-gunpowder-400 uppercase tracking-[0.08em] whitespace-nowrap">
              Oder starte mit einer Vorlage
            </span>
            <div className="flex-1 h-px bg-gunpowder-200" />
          </div>

          {/* Tab navigation */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide max-sm:gap-1.5">
            <button
              onClick={() => setPreviewTab(-1)}
              className="shrink-0 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all cursor-pointer border-2 max-sm:px-3 max-sm:py-2 max-sm:text-[13px]"
              style={{
                borderColor: previewTab === -1 ? "#1a1a2e" : "transparent",
                background: previewTab === -1 ? "#1a1a2e12" : "#f5f3f0",
                color: previewTab === -1 ? "#1a1a2e" : "#6b6b6b",
              }}
            >
              Alle
            </button>
            {myWebsites.length > 0 && (
              <button
                onClick={() => setPreviewTab(999)}
                className="shrink-0 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all cursor-pointer border-2 max-sm:px-3 max-sm:py-2 max-sm:text-[13px]"
                style={{
                  borderColor: previewTab === 999 ? "#7dd3a4" : "transparent",
                  background: previewTab === 999 ? "#7dd3a412" : "#f5f3f0",
                  color: previewTab === 999 ? "#5cb85c" : "#6b6b6b",
                }}
              >
                Meine Websites ({myWebsites.length})
              </button>
            )}
            {TEMPLATE_NAMES.map((name, i) => (
              <button
                key={i}
                onClick={() => setPreviewTab(i)}
                className="shrink-0 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all cursor-pointer border-2 max-sm:px-3 max-sm:py-2 max-sm:text-[13px]"
                style={{
                  borderColor: previewTab === i ? TAB_COLORS[i] : "transparent",
                  background: previewTab === i ? `${TAB_COLORS[i]}12` : "#f5f3f0",
                  color: previewTab === i ? TAB_COLORS[i] : "#6b6b6b",
                }}
              >
                {name}
              </button>
            ))}
          </div>

          {/* All templates grid */}
          {previewTab === -1 && (
            <div className="grid grid-cols-4 gap-5 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
              {TEMPLATE_NAMES.map((name, i) => (
                <div
                  key={i}
                  className="relative rounded-2xl overflow-hidden bg-white shadow-[0_4px_16px_rgba(0,0,0,0.06)] border-2 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
                  style={{ borderColor: TAB_COLORS[i] + "40" }}
                  onClick={() => openTemplateInEditor(i)}
                >
                  <div className="template-thumb relative w-full overflow-hidden" style={{ height: "240px" }}>
                    <iframe
                      srcDoc={TEMPLATES[i]}
                      sandbox="allow-same-origin"
                      title={name}
                      className="absolute top-0 left-0 border-none block pointer-events-none"
                      style={{
                        width: "1280px",
                        height: "960px",
                        transformOrigin: "top left",
                      }}
                    />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white via-white/95 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 flex items-center justify-between">
                    <p
                      className="text-[13px] max-md:text-[14px] font-bold truncate"
                      style={{ color: TAB_COLORS[i] }}
                    >
                      {name}
                    </p>
                    <span
                      className="text-[11px] max-md:text-[12px] font-semibold px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: TAB_COLORS[i] + "15", color: TAB_COLORS[i] }}
                    >
                      Ansehen
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* My Websites grid */}
          {previewTab === 999 && myWebsites.length > 0 && (
            <div className="grid grid-cols-4 gap-5 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
              {myWebsites.map((website) => (
                <div
                  key={website.id}
                  className="relative rounded-2xl overflow-hidden bg-white shadow-[0_4px_16px_rgba(0,0,0,0.06)] border-2 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
                  style={{ borderColor: "rgba(125, 211, 164, 0.3)" }}
                  onClick={() => {
                    setCurrentHTML(website.html);
                    setResultHTML(website.html);
                    setLastAIHTML(website.html);
                    setCurrentHistoryId(website.id);

                    // Save to sessionStorage so edits persist
                    sessionStorage.setItem("web_current_history_id", website.id);
                    sessionStorage.setItem("web_completed_html", website.html);
                    sessionStorage.setItem("web_completed_prompt", website.prompt);
                    sessionStorage.setItem("web_completed_timestamp", Date.now().toString());

                    // Open in new tab (full viewport, no modal)
                    localStorage.setItem("sora_preview_html", website.html);
                    localStorage.setItem("sora_preview_history_id", website.id);
                    localStorage.removeItem("sora_preview_loading");
                    window.open("/web-preview", "_blank");
                    console.log(`📂 Loaded web from history: ${website.id}`);
                  }}
                >
                  <div className="template-thumb relative w-full overflow-hidden" style={{ height: "240px" }}>
                    <iframe
                      srcDoc={website.html}
                      sandbox="allow-same-origin"
                      title={website.prompt}
                      className="absolute top-0 left-0 border-none block pointer-events-none"
                      style={{
                        width: "1280px",
                        height: "960px",
                        transformOrigin: "top left",
                      }}
                    />
                  </div>
                  {/* Delete button - top right corner */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteHistoryById(website.id);
                      setMyWebsites(prev => prev.filter(w => w.id !== website.id));
                    }}
                    className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/50 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer border-none"
                    title="Löschen"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M18 6L6 18"/><path d="M6 6l12 12"/>
                    </svg>
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white via-white/95 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 flex items-center justify-between">
                    <p className="text-[13px] max-md:text-[14px] font-bold truncate" style={{ color: "#5cb85c" }}>
                      {website.prompt.substring(0, 30)}...
                    </p>
                    <span className="text-[11px] max-md:text-[12px] font-semibold px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hidden md:inline" style={{ backgroundColor: "rgba(125, 211, 164, 0.15)", color: "#5cb85c" }}>
                      Bearbeiten
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Single template preview */}
          {previewTab >= 0 && previewTab < TEMPLATE_NAMES.length && (
          <div
            className="relative rounded-[20px] overflow-hidden bg-white shadow-[0_8px_32px_rgba(0,0,0,0.08)] border-2 transition-all duration-300"
            style={{ borderColor: TAB_COLORS[previewTab] }}
          >
            <iframe
              srcDoc={TEMPLATES[previewTab]}
              sandbox="allow-same-origin"
              title={TEMPLATE_NAMES[previewTab]}
              className="w-full h-[520px] border-none block max-md:h-[380px] max-sm:h-[300px]"
            />
            <div className="absolute bottom-0 left-0 right-0 h-[160px] bg-gradient-to-b from-transparent via-white/80 to-white flex items-end justify-center pb-6">
              <button
                onClick={() => openTemplateInEditor(previewTab)}
                className="inline-flex items-center justify-center gap-2 h-[46px] px-7 rounded-full text-[15px] font-semibold text-white shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:-translate-y-px transition-all cursor-pointer border-none"
                style={{ background: TAB_COLORS[previewTab] }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                Vorlage bearbeiten
              </button>
            </div>
          </div>
          )}
        </div>
      </section>

      {/* RESULT MODAL */}
      {resultModalOpen && resultHTML && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[8px]" onClick={closeResultModal} />
          <div className="relative w-[85%] h-[90%] flex flex-col bg-white overflow-hidden rounded-2xl shadow-2xl max-md:w-full max-md:h-full max-md:rounded-none">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-black/5 bg-white shrink-0">
              <button
                onClick={closeResultModal}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-none cursor-pointer transition-all text-[14px] font-semibold ${
                  hasEdits
                    ? "bg-[#e8f5e9] text-[#2e7d32] hover:bg-[#c8e6c9]"
                    : "bg-[#e8f0fe] text-[#1a3a5c] hover:bg-[#d4e4fc]"
                }`}
              >
                {hasEdits ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5" />
                    <path d="M12 19l-7-7 7-7" />
                  </svg>
                )}
                {hasEdits ? "Speichern & zuruck" : "Zurück"}
              </button>

              {/* Page title */}
              <div className="flex items-center gap-2 flex-1 mx-4 min-w-0 max-md:mx-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <input
                  type="text"
                  value={pageTitle}
                  onChange={(e) => setPageTitle(e.target.value)}
                  onBlur={(e) => updatePageTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  placeholder="Seitentitel..."
                  className="flex-1 min-w-0 h-8 px-2.5 text-[13px] font-medium text-gunpowder-700 bg-gunpowder-50 border border-transparent rounded-lg focus:outline-none focus:border-gunpowder-200 focus:bg-white transition-all placeholder:text-gunpowder-300 truncate"
                />
              </div>

              {/* Device toggle */}
              <div className="inline-flex bg-gunpowder-50 rounded-xl p-1 border border-gunpowder-150">
                <button
                  onClick={() => setPreviewDevice("desktop")}
                  className={`flex items-center justify-center w-9 h-8 rounded-lg transition-all ${
                    previewDevice === "desktop"
                      ? "bg-white text-gunpowder-800 shadow-sm"
                      : "text-gunpowder-400 hover:text-gunpowder-600"
                  }`}
                  title="Desktop"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </button>
                <button
                  onClick={() => setPreviewDevice("mobile")}
                  className={`flex items-center justify-center w-9 h-8 rounded-lg transition-all ${
                    previewDevice === "mobile"
                      ? "bg-white text-gunpowder-800 shadow-sm"
                      : "text-gunpowder-400 hover:text-gunpowder-600"
                  }`}
                  title="Mobile"
                >
                  <svg width="16" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                </button>
              </div>

              <button
                onClick={() => {
                  const freshHTML = getIframeHTML() || resultHTML;
                  localStorage.setItem("sora_preview_html", freshHTML);
                  localStorage.setItem("sora_preview_history_id", currentHistoryId || "");
                  window.open("/web-preview", "_blank");
                }}
                className="flex items-center justify-center w-9 h-9 rounded-xl border-none bg-gunpowder-100 cursor-pointer text-gunpowder-500 hover:bg-gunpowder-200 hover:text-gunpowder-700 transition-all mr-1"
                title="Abrir en nueva ventana"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </button>
              <button
                onClick={() => {
                  const freshHTML = getIframeHTML() || resultHTML;
                  const blob = new Blob([freshHTML], { type: "text/html" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "website.html";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center justify-center w-9 h-9 rounded-xl border-none bg-gunpowder-100 cursor-pointer text-gunpowder-500 hover:bg-gunpowder-200 hover:text-gunpowder-700 transition-all"
                title="Herunterladen"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
            </div>
            {/* Iframe + Sidebar */}
            <div className="flex-1 min-h-0 flex overflow-hidden">
              {/* Iframe area */}
              <div className="flex-1 min-h-0 overflow-hidden flex items-start justify-center bg-gunpowder-50/50 relative">
                <iframe
                  key={displayURL}
                  ref={iframeResultRef}
                  src={displayURL}
                  title="Website Vorschau"
                  className={`h-full border-none block bg-white transition-all duration-300 ${
                    previewDevice === "mobile"
                      ? "w-[390px] shadow-[0_0_40px_rgba(0,0,0,0.12)] rounded-xl my-2"
                      : "w-full"
                  }`}
                />
              </div>

              {/* Editor Sidebar */}
              {editSidebarOpen && (
                <div className="w-[320px] max-md:w-[280px] shrink-0 border-l border-gunpowder-100 bg-white overflow-y-auto">
                  {/* Sidebar Header */}
                  <div className="sticky top-0 z-10 px-4 py-3 border-b border-gunpowder-100 bg-gradient-to-r from-purple-50 to-white flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                        </svg>
                      </div>
                      <span className="text-sm font-bold text-gunpowder-700 truncate">{editingSectionName}</span>
                    </div>
                    <button
                      onClick={closeSidebar}
                      className="flex items-center justify-center w-7 h-7 rounded-lg border-none bg-gunpowder-50 cursor-pointer text-gunpowder-400 hover:bg-gunpowder-100 hover:text-gunpowder-600 transition-all shrink-0"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M18 6L6 18" /><path d="M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Colores */}
                  <div className="px-4 py-4 border-b border-gunpowder-50">
                    <div className="flex items-center gap-2 mb-3">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12" r="2.5"/><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12a10 10 0 005.28 8.82"/>
                      </svg>
                      <span className="text-xs font-bold text-gunpowder-600 uppercase tracking-wider">Farben</span>
                    </div>

                    {/* Background color */}
                    <label className="text-[11px] font-semibold text-gunpowder-400 uppercase tracking-wider mb-1.5 block">Hintergrund</label>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {COLOR_PRESETS.map((c) => (
                        <button
                          key={`bg-${c}`}
                          onClick={() => sendStyleToIframe({ backgroundColor: c })}
                          className="w-6 h-6 rounded-md border border-gunpowder-100 cursor-pointer hover:scale-110 transition-transform hover:shadow-md"
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="#hex oder rgb(...)"
                      className="w-full h-8 px-2.5 text-xs border border-gunpowder-150 rounded-lg focus:outline-none focus:border-purple-400 font-mono"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          sendStyleToIframe({ backgroundColor: (e.target as HTMLInputElement).value });
                        }
                      }}
                    />

                    {/* Text color */}
                    <label className="text-[11px] font-semibold text-gunpowder-400 uppercase tracking-wider mb-1.5 block mt-3">Textfarbe</label>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {['#ffffff','#f8f9fa','#dee2e6','#adb5bd','#6c757d','#495057','#343a40','#212529','#000000','#1e88e5','#e53935','#43a047','#8e24aa','#fb8c00'].map((c) => (
                        <button
                          key={`txt-${c}`}
                          onClick={() => sendStyleToIframe({ color: c })}
                          className="w-6 h-6 rounded-md border border-gunpowder-100 cursor-pointer hover:scale-110 transition-transform hover:shadow-md"
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="#hex oder rgb(...)"
                      className="w-full h-8 px-2.5 text-xs border border-gunpowder-150 rounded-lg focus:outline-none focus:border-purple-400 font-mono"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          sendStyleToIframe({ color: (e.target as HTMLInputElement).value });
                        }
                      }}
                    />
                  </div>

                  {/* Tipografia */}
                  <div className="px-4 py-4 border-b border-gunpowder-50">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-bold text-purple-600">Aa</span>
                      <span className="text-xs font-bold text-gunpowder-600 uppercase tracking-wider">Schrift</span>
                    </div>

                    {/* Font family */}
                    <label className="text-[11px] font-semibold text-gunpowder-400 uppercase tracking-wider mb-1.5 block">Schriftart</label>
                    <div className="space-y-1 mb-3 max-h-[200px] overflow-y-auto rounded-lg border border-gunpowder-100 p-1">
                      {FONT_OPTIONS.map((font) => (
                        <button
                          key={font.name}
                          onClick={() => sendFontToIframe(font.value, font.url)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all cursor-pointer border-none ${
                            editingSectionStyles.fontFamily?.includes(font.name)
                              ? 'bg-purple-50 text-purple-700 font-semibold'
                              : 'text-gunpowder-600 hover:bg-gunpowder-50'
                          }`}
                          style={{ fontFamily: font.value }}
                        >
                          {font.name}
                        </button>
                      ))}
                    </div>

                    {/* Font size */}
                    <label className="text-[11px] font-semibold text-gunpowder-400 uppercase tracking-wider mb-1.5 block">Grosse</label>
                    <div className="flex gap-1.5 mb-3">
                      {[
                        { label: 'S', value: '14px' },
                        { label: 'M', value: '16px' },
                        { label: 'L', value: '18px' },
                        { label: 'XL', value: '20px' },
                      ].map((s) => (
                        <button
                          key={s.label}
                          onClick={() => sendStyleToIframe({ fontSize: s.value })}
                          className="flex-1 h-8 rounded-lg border border-gunpowder-150 text-xs font-semibold text-gunpowder-600 bg-white hover:bg-purple-50 hover:border-purple-300 hover:text-purple-600 transition-all cursor-pointer"
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>

                    {/* Font weight */}
                    <label className="text-[11px] font-semibold text-gunpowder-400 uppercase tracking-wider mb-1.5 block">Schriftstärke</label>
                    <div className="flex gap-1.5">
                      {[
                        { label: 'Light', value: '300' },
                        { label: 'Normal', value: '400' },
                        { label: 'Semi', value: '600' },
                        { label: 'Bold', value: '700' },
                      ].map((w) => (
                        <button
                          key={w.label}
                          onClick={() => sendStyleToIframe({ fontWeight: w.value })}
                          className="flex-1 h-8 rounded-lg border border-gunpowder-150 text-xs font-semibold text-gunpowder-600 bg-white hover:bg-purple-50 hover:border-purple-300 hover:text-purple-600 transition-all cursor-pointer"
                        >
                          {w.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Espaciado */}
                  <div className="px-4 py-4 border-b border-gunpowder-50">
                    <div className="flex items-center gap-2 mb-3">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 3H3"/><path d="M21 21H3"/><path d="M12 7v10"/><path d="M8 7l4-4 4 4"/><path d="M8 17l4 4 4-4"/>
                      </svg>
                      <span className="text-xs font-bold text-gunpowder-600 uppercase tracking-wider">Abstand</span>
                    </div>

                    <label className="text-[11px] font-semibold text-gunpowder-400 uppercase tracking-wider mb-1.5 block">Padding</label>
                    <div className="flex gap-1.5 mb-3">
                      {PADDING_OPTIONS.map((p) => (
                        <button
                          key={p.label}
                          onClick={() => sendStyleToIframe({ padding: p.value })}
                          className="flex-1 h-8 rounded-lg border border-gunpowder-150 text-xs font-semibold text-gunpowder-600 bg-white hover:bg-purple-50 hover:border-purple-300 hover:text-purple-600 transition-all cursor-pointer"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    <label className="text-[11px] font-semibold text-gunpowder-400 uppercase tracking-wider mb-1.5 block">Ecken abrunden</label>
                    <div className="flex gap-1.5">
                      {RADIUS_OPTIONS.map((r) => (
                        <button
                          key={r.label}
                          onClick={() => sendStyleToIframe({ borderRadius: r.value })}
                          className="flex-1 h-8 rounded-lg border border-gunpowder-150 text-xs font-semibold text-gunpowder-600 bg-white hover:bg-purple-50 hover:border-purple-300 hover:text-purple-600 transition-all cursor-pointer"
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fondo avanzado */}
                  <div className="px-4 py-4 border-b border-gunpowder-50">
                    <div className="flex items-center gap-2 mb-3">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                      </svg>
                      <span className="text-xs font-bold text-gunpowder-600 uppercase tracking-wider">Hintergrund</span>
                    </div>

                    {/* Background image upload */}
                    <label className="text-[11px] font-semibold text-gunpowder-400 uppercase tracking-wider mb-1.5 block">Hintergrundbild</label>
                    <div className="mb-3">
                      <label className="flex items-center justify-center gap-2 h-9 rounded-lg border border-dashed border-gunpowder-200 text-xs font-semibold text-gunpowder-500 bg-gunpowder-25 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-600 transition-all cursor-pointer">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
                        </svg>
                        Bild hochladen
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file || editingSectionIndex === null) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              iframeResultRef.current?.contentWindow?.postMessage({
                                type: 'sora-apply-bg-image',
                                sectionIndex: editingSectionIndex,
                                dataUrl: ev.target?.result,
                              }, '*');
                            };
                            reader.readAsDataURL(file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>

                    {/* Overlay color */}
                    <label className="text-[11px] font-semibold text-gunpowder-400 uppercase tracking-wider mb-1.5 block">Bild-Overlay</label>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {[
                        { color: 'rgba(0,0,0,0.3)', label: 'Schwarz 30%' },
                        { color: 'rgba(0,0,0,0.5)', label: 'Schwarz 50%' },
                        { color: 'rgba(0,0,0,0.7)', label: 'Schwarz 70%' },
                        { color: 'rgba(0,0,50,0.5)', label: 'Dunkelblau' },
                        { color: 'rgba(100,0,0,0.4)', label: 'Dunkelrot' },
                        { color: 'rgba(0,50,0,0.4)', label: 'Dunkelgrun' },
                        { color: 'rgba(50,0,80,0.5)', label: 'Lila' },
                        { color: 'rgba(0,0,0,0)', label: 'Kein Overlay' },
                      ].map((o) => (
                        <button
                          key={o.color}
                          onClick={() => {
                            if (editingSectionIndex === null) return;
                            iframeResultRef.current?.contentWindow?.postMessage({
                              type: 'sora-apply-overlay',
                              sectionIndex: editingSectionIndex,
                              overlayColor: o.color,
                            }, '*');
                          }}
                          className="w-8 h-8 rounded-lg border border-gunpowder-100 cursor-pointer hover:scale-110 transition-transform hover:shadow-md relative overflow-hidden"
                          title={o.label}
                        >
                          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%228%22%20height%3D%228%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%224%22%20height%3D%224%22%20fill%3D%22%23ccc%22%2F%3E%3Crect%20x%3D%224%22%20y%3D%224%22%20width%3D%224%22%20height%3D%224%22%20fill%3D%22%23ccc%22%2F%3E%3C%2Fsvg%3E')]" />
                          <div className="absolute inset-0" style={{ backgroundColor: o.color }} />
                        </button>
                      ))}
                    </div>

                    {/* Gradient presets */}
                    <label className="text-[11px] font-semibold text-gunpowder-400 uppercase tracking-wider mb-1.5 block">Farbverlaufe</label>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {[
                        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                        'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
                        'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
                        'linear-gradient(135deg, #0c3483 0%, #a2b6df 100%)',
                        'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                        'linear-gradient(135deg, #232526 0%, #414345 100%)',
                      ].map((g, i) => (
                        <button
                          key={`grad-${i}`}
                          onClick={() => sendStyleToIframe({ background: g })}
                          className="w-[52px] h-8 rounded-lg border border-gunpowder-100 cursor-pointer hover:scale-105 transition-transform hover:shadow-md"
                          style={{ background: g }}
                          title="Farbverlauf anwenden"
                        />
                      ))}
                    </div>

                    {/* Custom gradient input */}
                    <input
                      type="text"
                      placeholder="linear-gradient(135deg, #hex, #hex)"
                      className="w-full h-8 px-2.5 text-xs border border-gunpowder-150 rounded-lg focus:outline-none focus:border-purple-400 font-mono"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = (e.target as HTMLInputElement).value;
                          sendStyleToIframe({ background: val });
                        }
                      }}
                    />
                  </div>

                  {/* Editar con IA */}
                  <div className="px-4 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8L19 13"/><path d="M15 9h0"/><path d="M17.8 6.2L19 5"/><path d="M3 21l9-9"/><path d="M12.2 6.2L11 5"/>
                      </svg>
                      <span className="text-xs font-bold text-gunpowder-600 uppercase tracking-wider">Mit KI bearbeiten</span>
                    </div>
                    <textarea
                      value={modifyPrompt}
                      onChange={(e) => setModifyPrompt(e.target.value)}
                      placeholder="z.B. Titel andern, roten Button hinzufugen, Hintergrund dunkler machen..."
                      rows={3}
                      className="w-full px-3 py-2.5 border border-gunpowder-200 rounded-xl text-sm leading-relaxed resize-none focus:outline-none focus:border-purple-400 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.08)] placeholder:text-gunpowder-300"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault();
                          handleAIModify();
                        }
                      }}
                    />
                    <button
                      onClick={handleAIModify}
                      disabled={isModifying || !modifyPrompt.trim()}
                      className="mt-2 w-full h-9 rounded-xl text-sm font-semibold transition-all cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed bg-purple-600 text-white hover:bg-purple-700 shadow-[0_2px_8px_rgba(124,58,237,0.25)]"
                    >
                      {isModifying ? "Wird angewendet..." : "Mit KI anwenden"}
                    </button>
                    {error && (
                      <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
                        {error}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer - hidden on mobile */}
            <div className="px-5 py-3 border-t border-black/5 bg-white hidden md:flex items-center justify-center gap-3 shrink-0">
              <button
                onClick={() => {
                  if (editSidebarOpen) {
                    closeSidebar();
                  } else {
                    setEditSidebarOpen(true);
                    setEditingSectionName("Ganze Seite");
                    setEditingSectionIndex(null);
                  }
                }}
                className={`hidden md:inline-flex items-center justify-center gap-2 h-[44px] px-5 rounded-full text-[14px] font-semibold transition-all cursor-pointer border-2 ${
                  editSidebarOpen
                    ? "bg-purple-100 border-purple-400 text-purple-700"
                    : "bg-white border-purple-300 text-purple-600 hover:bg-purple-50 hover:border-purple-400"
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                {editSidebarOpen ? "Editor schliessen" : "Bearbeiten"}
              </button>
              <a
                href="https://www.lweb.ch/#contact"
                className="inline-flex items-center justify-center gap-2 h-[44px] px-6 rounded-full text-[15px] font-semibold bg-begonia-400 text-white shadow-[0_4px_16px_rgba(254,108,117,0.3)] hover:bg-[#ff8a91] hover:-translate-y-px transition-all border-none max-md:h-[40px] max-md:px-4 max-md:text-[14px]"
              >
                Kontaktiere uns
              </a>
            </div>
          </div>
        </div>
      )}

      {/* TEMPLATE MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[8px]" onClick={() => setModalOpen(false)} />
          <div className="relative w-[80%] h-[85%] flex flex-col bg-white overflow-hidden rounded-2xl shadow-2xl max-md:w-full max-md:h-full max-md:rounded-none">
            <div className="flex items-center justify-between px-5 py-3 border-b border-black/5 bg-white shrink-0">
              <button
                onClick={() => setModalOpen(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-none bg-[#e8f0fe] cursor-pointer text-[#1a3a5c] hover:bg-[#d4e4fc] transition-all text-[14px] font-semibold"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5" />
                  <path d="M12 19l-7-7 7-7" />
                </svg>
                Zurück
              </button>

              <div className="hidden md:flex items-center gap-3">
                <button
                  onClick={() => { setModalOpen(false); openTemplateInEditor(modalTemplateIdx); }}
                  className="inline-flex items-center justify-center gap-2 h-[44px] px-6 rounded-full text-[15px] font-semibold bg-purple-600 text-white shadow-[0_4px_16px_rgba(124,58,237,0.3)] hover:bg-purple-700 hover:-translate-y-px hover:shadow-[0_6px_24px_rgba(124,58,237,0.4)] transition-all cursor-pointer border-none"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                  </svg>
                  Direkt bearbeiten
                </button>
                <button
                  onClick={selectTemplate}
                  className="inline-flex items-center justify-center gap-2 h-[44px] px-6 rounded-full text-[15px] font-semibold bg-[#4dd35b] text-white shadow-[0_4px_16px_rgba(77,211,91,0.3)] hover:bg-[#3ec04e] hover:-translate-y-px hover:shadow-[0_6px_24px_rgba(77,211,91,0.4)] transition-all cursor-pointer border-none"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Mit KI anpassen
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              {modalTemplateIdx >= 0 && (
                <iframe
                  srcDoc={TEMPLATES[modalTemplateIdx]}
                  sandbox="allow-same-origin"
                  title="Vorlage Vorschau"
                  className="w-full h-full border-none block"
                />
              )}
            </div>
          </div>
        </div>
      )}

      <PasswordModal
        open={showPasswordModal}
        onSuccess={() => {
          setShowPasswordModal(false);
          if (pendingAction === "modify") {
            handleAIModify();
          } else {
            // Open preview tab NOW (user gesture from password confirm button)
            localStorage.removeItem("sora_preview_html");
            localStorage.setItem("sora_preview_loading", "1");
            window.open("/web-preview", "_blank");
            generatePreview();
          }
          setPendingAction(null);
        }}
        onCancel={() => { setShowPasswordModal(false); setPendingAction(null); }}
      />
    </>
  );
}
