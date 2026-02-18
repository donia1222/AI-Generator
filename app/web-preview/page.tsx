"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { injectEditingCapabilities } from "@/lib/iframe-editing";
import { updateHistoryById, updateLatestHistory } from "@/lib/history";

function extractHTML(text: string): string {
  const fenceMatch = text.match(/```(?:html)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  if (text.trim().match(/^<!DOCTYPE|^<html/i)) return text.trim();
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body>${text}</body></html>`;
}

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

export default function WebPreviewPage() {
  const [resultHTML, setResultHTML] = useState("");
  const [lastAIHTML, setLastAIHTML] = useState("");
  const [displayURL, setDisplayURL] = useState("");
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState("");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [editSidebarOpen, setEditSidebarOpen] = useState(false);
  const [editingSectionIndex, setEditingSectionIndex] = useState<number | null>(null);
  const [editingSectionName, setEditingSectionName] = useState("");
  const [editingSectionStyles, setEditingSectionStyles] = useState<Record<string, string>>({});
  const [targetSection, setTargetSection] = useState<string | null>(null);
  const [modifyPrompt, setModifyPrompt] = useState("");
  const [isModifying, setIsModifying] = useState(false);
  const [error, setError] = useState("");
  const [hasEdits, setHasEdits] = useState(false);
  const [selectedModel] = useState<string>("gpt-5.1-codex-mini");
  const [loaded, setLoaded] = useState(false);
  const [undoStack, setUndoStack] = useState<string[]>([]);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const resultHTMLRef = useRef(resultHTML);
  resultHTMLRef.current = resultHTML;
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Push current HTML to undo stack before a change
  const pushUndo = useCallback((currentHtml: string) => {
    setUndoStack(prev => [...prev.slice(-19), currentHtml]); // keep last 20
  }, []);

  const handleUndo = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      const restored = prev[prev.length - 1];
      const next = prev.slice(0, -1);
      setLastAIHTML(restored);
      setResultHTML(restored);
      localStorage.setItem("sora_preview_html", restored);
      if (historyId) updateHistoryById(historyId, { html: restored });
      channelRef.current?.postMessage({ type: "sora-preview-edit", historyId, html: restored });
      return next;
    });
  }, [historyId]);

  const [isLoading, setIsLoading] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressText, setProgressText] = useState("Website wird erstellt...");

  // Load HTML from localStorage on mount, or wait if still generating
  useEffect(() => {
    channelRef.current = new BroadcastChannel("sora-web-preview");

    const loadFromStorage = () => {
      const html = localStorage.getItem("sora_preview_html") || "";
      const hId = localStorage.getItem("sora_preview_history_id") || null;
      if (html) {
        setResultHTML(html);
        setLastAIHTML(html);
        const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        setPageTitle(m ? m[1].trim() : "");
        setIsLoading(false);
      }
      if (hId) setHistoryId(hId);
    };

    const loading = localStorage.getItem("sora_preview_loading");
    if (loading) {
      setIsLoading(true);
    }
    loadFromStorage();
    setLoaded(true);

    // Listen for localStorage changes from the generator tab
    const onStorage = (e: StorageEvent) => {
      if (e.key === "sora_preview_html" && e.newValue) {
        loadFromStorage();
      }
      if (e.key === "sora_preview_progress" && e.newValue) {
        try {
          const { pct, text } = JSON.parse(e.newValue);
          setProgressPct(pct);
          setProgressText(text);
        } catch { /* ignore */ }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      channelRef.current?.close();
    };
  }, []);

  // Create blob URL when HTML changes
  useEffect(() => {
    if (!lastAIHTML) { setDisplayURL(""); return; }
    const origin = window.location.origin;
    const htmlWithAbsolutePaths = lastAIHTML
      .replace(/(src=["'])\/(?!\/)/g, `$1${origin}/`)
      .replace(/(url\(["']?)\/(?!\/)/g, `$1${origin}/`);
    const htmlWithEditing = injectEditingCapabilities(htmlWithAbsolutePaths);
    const blob = new Blob([htmlWithEditing], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    setDisplayURL(url);
    return () => URL.revokeObjectURL(url);
  }, [lastAIHTML]);

  // Listen for messages from iframe (inline text/image edits + section edit requests)
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "sora-edit" && event.data.html) {
        const newHtml = event.data.html;
        pushUndo(resultHTMLRef.current);
        setResultHTML(newHtml);
        setHasEdits(true);
        localStorage.setItem("sora_preview_html", newHtml);
        if (historyId) {
          updateHistoryById(historyId, { html: newHtml });
        } else {
          updateLatestHistory("web", { html: newHtml });
        }
        channelRef.current?.postMessage({ type: "sora-preview-edit", historyId, html: newHtml });
      }
      if (event.data?.type === "sora-edit-section" && event.data.sectionName) {
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
  }, [historyId]);

  const getIframeHTML = useCallback(() => {
    try {
      const iframe = iframeRef.current;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (iframe?.contentWindow && (iframe.contentWindow as any).__soraGetCleanHTML) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (iframe.contentWindow as any).__soraGetCleanHTML() as string;
      }
    } catch { /* cross-origin */ }
    return null;
  }, []);

  const sendStyleToIframe = (styles: Record<string, string>) => {
    if (editingSectionIndex === null) return;
    iframeRef.current?.contentWindow?.postMessage({ type: "sora-apply-style", sectionIndex: editingSectionIndex, styles }, "*");
    setEditingSectionStyles(prev => ({ ...prev, ...styles }));
  };

  const sendFontToIframe = (fontFamily: string, googleFontUrl: string) => {
    if (editingSectionIndex === null) return;
    iframeRef.current?.contentWindow?.postMessage({ type: "sora-apply-font", sectionIndex: editingSectionIndex, fontFamily, googleFontUrl }, "*");
    setEditingSectionStyles(prev => ({ ...prev, fontFamily }));
  };

  const closeSidebar = () => {
    setEditSidebarOpen(false);
    setEditingSectionIndex(null);
    setEditingSectionName("");
    setEditingSectionStyles({});
    setTargetSection(null);
    setModifyPrompt("");
  };

  const updatePageTitle = useCallback((newTitle: string) => {
    setPageTitle(newTitle);
    setResultHTML(prev => {
      let updated: string;
      if (prev.match(/<title[^>]*>[\s\S]*?<\/title>/i)) {
        updated = prev.replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title>${newTitle}</title>`);
      } else if (prev.includes("</head>")) {
        updated = prev.replace("</head>", `<title>${newTitle}</title>\n</head>`);
      } else {
        updated = prev;
      }
      setLastAIHTML(updated);
      setHasEdits(true);
      localStorage.setItem("sora_preview_html", updated);
      if (historyId) updateHistoryById(historyId, { html: updated });
      channelRef.current?.postMessage({ type: "sora-preview-edit", historyId, html: updated });
      return updated;
    });
  }, [historyId]);

  const handleDownload = () => {
    const freshHTML = getIframeHTML() || resultHTML;
    const blob = new Blob([freshHTML], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (pageTitle || "website") + ".html";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAIModify = async () => {
    if (!modifyPrompt.trim() || isModifying) return;
    setIsModifying(true);
    setError("");

    let userMessage: string;
    if (targetSection) {
      const actualPrompt = modifyPrompt.replace(/^NUR\s+"[^"]+"\s+ÄNDERN:\s*/i, "").trim();
      userMessage = `Change the ${targetSection} section: ${actualPrompt}`;
    } else {
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
        setError(data.message || "Error. Please try again.");
        return;
      }
      if (data.status === "success" && data.botReply) {
        const html = extractHTML(data.botReply);
        pushUndo(resultHTMLRef.current);
        setResultHTML(html);
        setLastAIHTML(html);
        setHasEdits(true);
        localStorage.setItem("sora_preview_html", html);
        if (historyId) {
          updateHistoryById(historyId, { html });
        } else {
          updateLatestHistory("web", { html });
        }
        channelRef.current?.postMessage({ type: "sora-preview-edit", historyId, html });
        setModifyPrompt("");
        setTargetSection(null);
        setEditSidebarOpen(false);
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setIsModifying(false);
    }
  };

  if (!loaded) return null;

  if (isLoading || !resultHTML) {
    if (!isLoading) {
      return (
        <div className="flex items-center justify-center h-screen bg-white">
          <div className="text-center">
            <p className="text-gunpowder-500 mb-4">No hay ninguna web generada todavía.</p>
            <a href="/web-creator" className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-all">
              ← Zurück zum Generator
            </a>
          </div>
        </div>
      );
    }

    // Skeleton sections revealed progressively based on progress
    const pct = progressPct;
    const showNav     = pct >= 0;
    const showHero    = pct >= 10;
    const showCards   = pct >= 28;
    const showSection2= pct >= 45;
    const showSection3= pct >= 62;
    const showFooter  = pct >= 80;

    return (
      <div className="h-screen flex flex-col bg-white overflow-hidden">
        {/* Minimal top bar during generation */}
        <div className="flex items-center px-5 py-3 border-b border-black/5 bg-white shrink-0 z-10">
          <button
            onClick={() => {
              const ok = window.confirm("Die Website wird nach der Generierung automatisch in \"Meine Websites\" gespeichert. Möchtest du trotzdem zurück?");
              if (ok) window.location.href = "/web-creator";
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[14px] font-semibold border-none cursor-pointer bg-[#e8f0fe] text-[#1a3a5c] hover:bg-[#d4e4fc] transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
            </svg>
            Zurück
          </button>
        </div>
        {/* Skeleton website + centered progress overlay */}
        <div className="flex-1 overflow-hidden relative" style={{position:'relative'}}>
          <style>{`
            @keyframes sora-shimmer {
              0% { background-position: -600px 0; }
              100% { background-position: 600px 0; }
            }
            .skel {
              background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
              background-size: 600px 100%;
              animation: sora-shimmer 1.6s infinite linear;
              border-radius: 6px;
            }
            .skel-dark {
              background: linear-gradient(90deg, #2a2a2a 25%, #3a3a3a 50%, #2a2a2a 75%);
              background-size: 600px 100%;
              animation: sora-shimmer 1.6s infinite linear;
              border-radius: 6px;
            }
            .skel-fade-in {
              animation: skel-appear 0.6s ease-out forwards;
            }
            @keyframes skel-appear {
              from { opacity: 0; transform: translateY(12px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          {/* Nav */}
          {showNav && (
            <div className="skel-fade-in flex items-center justify-between px-10 py-5 border-b border-gray-100">
              <div className="skel h-6 w-28" />
              <div className="flex gap-4">
                {[60,50,55,50].map((w,i) => <div key={i} className="skel h-4" style={{width:`${w}px`}} />)}
              </div>
              <div className="skel h-9 w-24 rounded-lg" />
            </div>
          )}

          {/* Hero */}
          {showHero && (
            <div className="skel-fade-in relative mx-6 mt-4 rounded-2xl overflow-hidden" style={{height:'260px', background:'#1a1a2e'}}>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8">
                <div className="skel-dark h-10 w-2/3 rounded-lg" />
                <div className="skel-dark h-6 w-1/2 rounded-md" />
                <div className="flex gap-3 mt-2">
                  <div className="skel-dark h-11 w-32 rounded-xl" />
                  <div className="skel-dark h-11 w-28 rounded-xl" />
                </div>
              </div>
            </div>
          )}

          {/* Cards row */}
          {showCards && (
            <div className="skel-fade-in grid grid-cols-3 gap-4 px-6 mt-5">
              {[1,2,3].map(i => (
                <div key={i} className="rounded-xl border border-gray-100 p-4 flex flex-col gap-2.5">
                  <div className="skel h-32 w-full rounded-lg" />
                  <div className="skel h-5 w-3/4" />
                  <div className="skel h-4 w-full" />
                  <div className="skel h-4 w-5/6" />
                  <div className="skel h-9 w-28 rounded-lg mt-1" />
                </div>
              ))}
            </div>
          )}

          {/* Section 2 */}
          {showSection2 && (
            <div className="skel-fade-in flex gap-6 px-6 mt-5">
              <div className="skel flex-1 rounded-xl" style={{height:'120px'}} />
              <div className="flex-1 flex flex-col justify-center gap-3">
                <div className="skel h-6 w-3/4" />
                <div className="skel h-4 w-full" />
                <div className="skel h-4 w-5/6" />
                <div className="skel h-4 w-4/6" />
              </div>
            </div>
          )}

          {/* Section 3: cols */}
          {showSection3 && (
            <div className="skel-fade-in grid grid-cols-4 gap-3 px-6 mt-5">
              {[1,2,3,4].map(i => (
                <div key={i} className="flex flex-col gap-2 items-center">
                  <div className="skel w-12 h-12 rounded-full" />
                  <div className="skel h-4 w-20" />
                  <div className="skel h-3 w-full" />
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          {showFooter && (
            <div className="skel-fade-in mx-6 mt-5 rounded-xl p-5 flex justify-between" style={{background:'#111'}}>
              <div className="skel-dark h-5 w-24" />
              <div className="flex gap-6">
                {[3,3,3].map((n,gi) => (
                  <div key={gi} className="flex flex-col gap-2">
                    {Array.from({length:n}).map((_,i) => <div key={i} className="skel-dark h-3 w-16" />)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Progress overlay — centered over the skeleton */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl px-8 py-6 w-[380px] max-w-[90vw]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gunpowder-800">Website wird erstellt...</span>
              <span className="text-sm font-bold text-purple-600">{Math.round(pct)}%</span>
            </div>
            <div className="w-full h-2.5 bg-gunpowder-100 rounded-full overflow-hidden mb-2">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${pct}%`, background: "linear-gradient(90deg, #7c3aed, #a855f7)" }}
              />
            </div>
            <p className="text-xs text-gunpowder-400">{progressText}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-black/5 bg-white shrink-0 z-10">
        {/* Back button */}
        <a
          href="/web-creator"
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-none cursor-pointer transition-all text-[14px] font-semibold no-underline ${
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
              <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
            </svg>
          )}
          {hasEdits ? "Gespeichert" : "Zurück"}
        </a>

        {/* Page title */}
        <div className="flex items-center gap-2 flex-1 mx-4 min-w-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <input
            type="text"
            value={pageTitle}
            onChange={(e) => setPageTitle(e.target.value)}
            onBlur={(e) => updatePageTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            placeholder="Título de la página..."
            className="flex-1 min-w-0 h-8 px-2.5 text-[13px] font-medium text-gunpowder-700 bg-gunpowder-50 border border-transparent rounded-lg focus:outline-none focus:border-gunpowder-200 focus:bg-white transition-all placeholder:text-gunpowder-300 truncate"
          />
        </div>

        {/* Device toggle */}
        <div className="inline-flex bg-gunpowder-50 rounded-xl p-1 border border-gunpowder-150 mr-2">
          <button
            onClick={() => setPreviewDevice("desktop")}
            className={`flex items-center justify-center w-9 h-8 rounded-lg transition-all ${previewDevice === "desktop" ? "bg-white text-gunpowder-800 shadow-sm" : "text-gunpowder-400 hover:text-gunpowder-600"}`}
            title="Desktop"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </button>
          <button
            onClick={() => setPreviewDevice("mobile")}
            className={`flex items-center justify-center w-9 h-8 rounded-lg transition-all ${previewDevice === "mobile" ? "bg-white text-gunpowder-800 shadow-sm" : "text-gunpowder-400 hover:text-gunpowder-600"}`}
            title="Mobile"
          >
            <svg width="16" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
          </button>
        </div>

        {/* Undo */}
        <button
          onClick={handleUndo}
          disabled={undoStack.length === 0}
          className="flex items-center justify-center w-9 h-9 rounded-xl border-none bg-gunpowder-100 cursor-pointer text-gunpowder-500 hover:bg-gunpowder-200 hover:text-gunpowder-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed mr-1"
          title="Rückgängig (Undo)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7v6h6" /><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
          </svg>
        </button>

        {/* Download */}
        <button
          onClick={handleDownload}
          className="flex items-center justify-center w-9 h-9 rounded-xl border-none bg-gunpowder-100 cursor-pointer text-gunpowder-500 hover:bg-gunpowder-200 hover:text-gunpowder-700 transition-all"
          title="Herunterladen"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
      </div>

      {/* Main area: iframe + sidebar */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Iframe */}
        <div className="flex-1 min-h-0 overflow-hidden flex items-start justify-center bg-gunpowder-50/50 relative">
          {displayURL && (
            <iframe
              key={displayURL}
              ref={iframeRef}
              src={displayURL}
              title="Vista previa"
              className={`h-full border-none block bg-white transition-all duration-300 ${
                previewDevice === "mobile"
                  ? "w-[390px] shadow-[0_0_40px_rgba(0,0,0,0.12)] rounded-xl my-2"
                  : "w-full"
              }`}
            />
          )}
        </div>

        {/* Editor Sidebar */}
        {editSidebarOpen && (
          <div className="w-[320px] shrink-0 border-l border-gunpowder-100 bg-white overflow-y-auto">
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
              <button onClick={closeSidebar} className="flex items-center justify-center w-7 h-7 rounded-lg border-none bg-gunpowder-50 cursor-pointer text-gunpowder-400 hover:bg-gunpowder-100 hover:text-gunpowder-600 transition-all shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18" /><path d="M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Colors */}
            <div className="px-4 py-4 border-b border-gunpowder-50">
              <div className="flex items-center gap-2 mb-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12" r="2.5"/><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12a10 10 0 005.28 8.82"/>
                </svg>
                <span className="text-xs font-bold text-gunpowder-600 uppercase tracking-wider">Colores</span>
              </div>
              <label className="text-[11px] font-semibold text-gunpowder-400 uppercase tracking-wider mb-1.5 block">Fondo</label>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {COLOR_PRESETS.map((c) => (
                  <button key={`bg-${c}`} onClick={() => sendStyleToIframe({ backgroundColor: c })} className="w-6 h-6 rounded-md border border-gunpowder-100 cursor-pointer hover:scale-110 transition-transform hover:shadow-md" style={{ backgroundColor: c }} title={c} />
                ))}
              </div>
              <input type="text" placeholder="#hex o rgb(...)" className="w-full h-8 px-2.5 text-xs border border-gunpowder-150 rounded-lg focus:outline-none focus:border-purple-400 font-mono" onKeyDown={(e) => { if (e.key === 'Enter') sendStyleToIframe({ backgroundColor: (e.target as HTMLInputElement).value }); }} />

              <label className="text-[11px] font-semibold text-gunpowder-400 uppercase tracking-wider mb-1.5 block mt-3">Color de texto</label>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {['#ffffff','#f8f9fa','#dee2e6','#adb5bd','#6c757d','#495057','#343a40','#212529','#000000','#1e88e5','#e53935','#43a047','#8e24aa','#fb8c00'].map((c) => (
                  <button key={`txt-${c}`} onClick={() => sendStyleToIframe({ color: c })} className="w-6 h-6 rounded-md border border-gunpowder-100 cursor-pointer hover:scale-110 transition-transform hover:shadow-md" style={{ backgroundColor: c }} title={c} />
                ))}
              </div>
              <input type="text" placeholder="#hex o rgb(...)" className="w-full h-8 px-2.5 text-xs border border-gunpowder-150 rounded-lg focus:outline-none focus:border-purple-400 font-mono" onKeyDown={(e) => { if (e.key === 'Enter') sendStyleToIframe({ color: (e.target as HTMLInputElement).value }); }} />
            </div>

            {/* Typography */}
            <div className="px-4 py-4 border-b border-gunpowder-50">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-bold text-purple-600">Aa</span>
                <span className="text-xs font-bold text-gunpowder-600 uppercase tracking-wider">Tipografía</span>
              </div>
              <label className="text-[11px] font-semibold text-gunpowder-400 uppercase tracking-wider mb-1.5 block">Fuente</label>
              <div className="space-y-1 mb-3 max-h-[200px] overflow-y-auto rounded-lg border border-gunpowder-100 p-1">
                {FONT_OPTIONS.map((font) => (
                  <button key={font.name} onClick={() => sendFontToIframe(font.value, font.url)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all cursor-pointer border-none ${editingSectionStyles.fontFamily?.includes(font.name) ? 'bg-purple-50 text-purple-700 font-semibold' : 'text-gunpowder-600 hover:bg-gunpowder-50'}`} style={{ fontFamily: font.value }}>
                    {font.name}
                  </button>
                ))}
              </div>
              <label className="text-[11px] font-semibold text-gunpowder-400 uppercase tracking-wider mb-1.5 block">Tamaño</label>
              <div className="flex gap-1.5 mb-3">
                {[{ label: 'S', value: '14px' }, { label: 'M', value: '16px' }, { label: 'L', value: '18px' }, { label: 'XL', value: '20px' }].map((s) => (
                  <button key={s.label} onClick={() => sendStyleToIframe({ fontSize: s.value })} className="flex-1 h-8 rounded-lg border border-gunpowder-150 text-xs font-semibold text-gunpowder-600 bg-white hover:bg-purple-50 hover:border-purple-300 hover:text-purple-600 transition-all cursor-pointer">{s.label}</button>
                ))}
              </div>
              <label className="text-[11px] font-semibold text-gunpowder-400 uppercase tracking-wider mb-1.5 block">Peso</label>
              <div className="flex gap-1.5">
                {[{ label: 'Light', value: '300' }, { label: 'Normal', value: '400' }, { label: 'Semi', value: '600' }, { label: 'Bold', value: '700' }].map((w) => (
                  <button key={w.label} onClick={() => sendStyleToIframe({ fontWeight: w.value })} className="flex-1 h-8 rounded-lg border border-gunpowder-150 text-xs font-semibold text-gunpowder-600 bg-white hover:bg-purple-50 hover:border-purple-300 hover:text-purple-600 transition-all cursor-pointer">{w.label}</button>
                ))}
              </div>
            </div>

            {/* Spacing */}
            <div className="px-4 py-4 border-b border-gunpowder-50">
              <div className="flex items-center gap-2 mb-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 3H3"/><path d="M21 21H3"/><path d="M12 7v10"/><path d="M8 7l4-4 4 4"/><path d="M8 17l4 4 4-4"/>
                </svg>
                <span className="text-xs font-bold text-gunpowder-600 uppercase tracking-wider">Espaciado</span>
              </div>
              <label className="text-[11px] font-semibold text-gunpowder-400 uppercase tracking-wider mb-1.5 block">Padding</label>
              <div className="flex gap-1.5 mb-3">
                {PADDING_OPTIONS.map((p) => (
                  <button key={p.label} onClick={() => sendStyleToIframe({ padding: p.value })} className="flex-1 h-8 rounded-lg border border-gunpowder-150 text-xs font-semibold text-gunpowder-600 bg-white hover:bg-purple-50 hover:border-purple-300 hover:text-purple-600 transition-all cursor-pointer">{p.label}</button>
                ))}
              </div>
              <label className="text-[11px] font-semibold text-gunpowder-400 uppercase tracking-wider mb-1.5 block">Bordes</label>
              <div className="flex gap-1.5">
                {RADIUS_OPTIONS.map((r) => (
                  <button key={r.label} onClick={() => sendStyleToIframe({ borderRadius: r.value })} className="flex-1 h-8 rounded-lg border border-gunpowder-150 text-xs font-semibold text-gunpowder-600 bg-white hover:bg-purple-50 hover:border-purple-300 hover:text-purple-600 transition-all cursor-pointer">{r.label}</button>
                ))}
              </div>
            </div>

            {/* Background */}
            <div className="px-4 py-4 border-b border-gunpowder-50">
              <div className="flex items-center gap-2 mb-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
                <span className="text-xs font-bold text-gunpowder-600 uppercase tracking-wider">Fondo avanzado</span>
              </div>
              <label className="text-[11px] font-semibold text-gunpowder-400 uppercase tracking-wider mb-1.5 block">Imagen de fondo</label>
              <div className="mb-3">
                <label className="flex items-center justify-center gap-2 h-9 rounded-lg border border-dashed border-gunpowder-200 text-xs font-semibold text-gunpowder-500 bg-gunpowder-25 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-600 transition-all cursor-pointer">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
                  </svg>
                  Subir imagen
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file || editingSectionIndex === null) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      iframeRef.current?.contentWindow?.postMessage({ type: 'sora-apply-bg-image', sectionIndex: editingSectionIndex, dataUrl: ev.target?.result }, '*');
                    };
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }} />
                </label>
              </div>
              <label className="text-[11px] font-semibold text-gunpowder-400 uppercase tracking-wider mb-1.5 block">Overlay</label>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {[
                  { color: 'rgba(0,0,0,0.3)', label: 'Negro 30%' },
                  { color: 'rgba(0,0,0,0.5)', label: 'Negro 50%' },
                  { color: 'rgba(0,0,0,0.7)', label: 'Negro 70%' },
                  { color: 'rgba(0,0,50,0.5)', label: 'Azul oscuro' },
                  { color: 'rgba(100,0,0,0.4)', label: 'Rojo oscuro' },
                  { color: 'rgba(0,50,0,0.4)', label: 'Verde oscuro' },
                  { color: 'rgba(50,0,80,0.5)', label: 'Morado' },
                  { color: 'rgba(0,0,0,0)', label: 'Sin overlay' },
                ].map((o) => (
                  <button key={o.color} onClick={() => {
                    if (editingSectionIndex === null) return;
                    iframeRef.current?.contentWindow?.postMessage({ type: 'sora-apply-overlay', sectionIndex: editingSectionIndex, overlayColor: o.color }, '*');
                  }} className="w-8 h-8 rounded-lg border border-gunpowder-100 cursor-pointer hover:scale-110 transition-transform hover:shadow-md relative overflow-hidden" title={o.label}>
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%228%22%20height%3D%228%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%224%22%20height%3D%224%22%20fill%3D%22%23ccc%22%2F%3E%3Crect%20x%3D%224%22%20y%3D%224%22%20width%3D%224%22%20height%3D%224%22%20fill%3D%22%23ccc%22%2F%3E%3C%2Fsvg%3E')]" />
                    <div className="absolute inset-0" style={{ backgroundColor: o.color }} />
                  </button>
                ))}
              </div>
              <label className="text-[11px] font-semibold text-gunpowder-400 uppercase tracking-wider mb-1.5 block">Degradados</label>
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
                  <button key={`grad-${i}`} onClick={() => sendStyleToIframe({ background: g })} className="w-[52px] h-8 rounded-lg border border-gunpowder-100 cursor-pointer hover:scale-105 transition-transform hover:shadow-md" style={{ background: g }} title="Aplicar degradado" />
                ))}
              </div>
              <input type="text" placeholder="linear-gradient(135deg, #hex, #hex)" className="w-full h-8 px-2.5 text-xs border border-gunpowder-150 rounded-lg focus:outline-none focus:border-purple-400 font-mono" onKeyDown={(e) => { if (e.key === 'Enter') sendStyleToIframe({ background: (e.target as HTMLInputElement).value }); }} />
            </div>

            {/* AI Edit */}
            <div className="px-4 py-4">
              <div className="flex items-center gap-2 mb-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8L19 13"/><path d="M15 9h0"/><path d="M17.8 6.2L19 5"/><path d="M3 21l9-9"/><path d="M12.2 6.2L11 5"/>
                </svg>
                <span className="text-xs font-bold text-gunpowder-600 uppercase tracking-wider">Editar con IA</span>
              </div>
              <textarea
                value={modifyPrompt}
                onChange={(e) => setModifyPrompt(e.target.value)}
                placeholder="Ej: cambiar el título, añadir un botón rojo, fondo más oscuro..."
                rows={3}
                className="w-full px-3 py-2.5 border border-gunpowder-200 rounded-xl text-sm leading-relaxed resize-none focus:outline-none focus:border-purple-400 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.08)] placeholder:text-gunpowder-300"
                onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleAIModify(); } }}
              />
              <button
                onClick={handleAIModify}
                disabled={isModifying || !modifyPrompt.trim()}
                className="mt-2 w-full h-9 rounded-xl text-sm font-semibold transition-all cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed bg-purple-600 text-white hover:bg-purple-700 shadow-[0_2px_8px_rgba(124,58,237,0.25)]"
              >
                {isModifying ? "Aplicando..." : "Aplicar con IA"}
              </button>
              {error && <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">{error}</div>}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
