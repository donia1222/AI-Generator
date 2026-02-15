"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import ProgressBar from "@/components/ProgressBar";
import { TEMPLATES, TEMPLATE_NAMES } from "@/lib/prompts";
import { startGeneration, getGeneration, clearGeneration, subscribe } from "@/lib/generation-store";
import { addToHistory } from "@/lib/history";

const TAB_COLORS = [
  "#d4a574", // Restaurant - gold
  "#ff4d4d", // Fitness - red
  "#0071e3", // Portfolio - blue
  "#2a9d8f", // Dentist - teal
  "#7c3aed", // Tech - purple
  "#D4813B", // Bakery - warm orange
  "#c9a84c", // Real Estate - gold
  "#b76e79", // Salon - rose
];

const EXAMPLES = [
  { label: "Restaurant", style: "Dunkel & Gold", text: "Eine elegante Landing Page für ein Restaurant mit dunklem Design, goldenen Akzenten, Speisekarte und Reservierungsbereich" },
  { label: "Fitnessstudio", style: "Energetisch", text: "Eine energetische Website für ein Fitnessstudio mit kräftigen Rot- und Schwarztönen, Hero-Video-Bereich und Kursplan" },
  { label: "Portfolio", style: "Minimalistisch", text: "Ein minimalistisches Portfolio für eine Fotografin mit viel Weissraum, Bildergalerie im Grid und sanften Hover-Animationen" },
  { label: "Arztpraxis", style: "Vertrauensvoll", text: "Eine vertrauenswürdige Website für eine Zahnarztpraxis mit beruhigenden Blau- und Weisstönen, Team-Sektion und Online-Terminbuchung" },
  { label: "Tech Startup", style: "Futuristisch", text: "Eine moderne Website für ein Tech-Startup mit Gradient-Effekten, dunklem Theme, animierten Statistiken und Pricing-Tabelle" },
  { label: "Bäckerei", style: "Warm & Handgemacht", text: "Eine warme Website für eine Bäckerei mit Erdtönen, handgemachtem Feeling, Produktkarten und Über-uns-Geschichte" },
  { label: "Immobilien", style: "Elegant & Seriös", text: "Eine professionelle Website für eine Immobilienagentur mit Objekt-Karussell, Suchfiltern, dunklem Marineblau und Gold-Akzenten" },
  { label: "Yoga Studio", style: "Zen & Natürlich", text: "Eine ruhige Website für ein Yoga-Studio mit sanften Pastellfarben, Atemanimation im Hero, Kurskalender und Lehrerprofile" },
  { label: "Online Shop", style: "Modern & Clean", text: "Eine moderne E-Commerce Landing Page mit Produkt-Grid, Warenkorb-Icon, Kundenbewertungen und Newsletter-Anmeldung in Schwarz-Weiss-Design" },
  { label: "Musikband", style: "Grunge & Retro", text: "Eine retro-inspirierte Website für eine Rockband mit körnigem Hintergrund, Tour-Daten, Albumcover-Galerie und eingebettetem Musikplayer" },
];


const PROGRESS_STEPS = [
  { pct: 8, text: "Analysiere deine Beschreibung..." },
  { pct: 18, text: "Wähle Farbpalette und Schriften..." },
  { pct: 30, text: "Erstelle Header und Navigation..." },
  { pct: 45, text: "Gestalte Hero-Bereich..." },
  { pct: 58, text: "Lade Bilder..." },
  { pct: 70, text: "Erstelle Inhalts-Sektionen..." },
  { pct: 82, text: "Optimiere responsives Design..." },
  { pct: 90, text: "Letzte Feinabstimmungen..." },
];

function extractHTML(text: string): string {
  const fenceMatch = text.match(/```(?:html)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  if (text.trim().match(/^<!DOCTYPE|^<html/i)) return text.trim();
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

  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const iframeResultRef = useRef<HTMLIFrameElement>(null);

  // Restore state from global store on mount
  useEffect(() => {
    const gen = getGeneration("web");
    if (!gen) return;

    if (gen.status === "pending") {
      setIsGenerating(true);
      startProgress();
      gen.promise.then(() => {
        const updated = getGeneration("web");
        if (updated?.status === "done" && updated.result) {
          handleWebResult(updated.result as Record<string, string>);
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
        setShowResult(true);
      }
    }

    return subscribe("web", () => {
      const g = getGeneration("web");
      if (g?.status !== "pending") setIsGenerating(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleWebResult = (data: Record<string, string>) => {
    finishProgress();
    if (data.status === "success" && data.botReply) {
      const html = extractHTML(data.botReply);
      setCurrentHTML(html);
      setResultHTML(html);
      setShowResult(true);
      setResultModalOpen(true);

      // Save to history
      addToHistory({
        type: "web",
        prompt: prompt || "Web generiert",
        url: "",
        title: prompt?.substring(0, 60) || "Generierte Website",
        metadata: { html },
      });
    }
  };

  const startProgress = useCallback(() => {
    let step = 0;
    setProgressPct(0);
    setProgressText("KI erstellt deine Website...");
    progressRef.current = setInterval(() => {
      if (step < PROGRESS_STEPS.length) {
        setProgressPct(PROGRESS_STEPS[step].pct);
        setProgressText(PROGRESS_STEPS[step].text);
        step++;
      }
    }, 1800);
  }, []);

  const finishProgress = useCallback(() => {
    if (progressRef.current) clearInterval(progressRef.current);
    setProgressPct(100);
    setProgressText("Fertig!");
    setTimeout(() => setIsGenerating(false), 800);
  }, []);

  const generatePreview = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setShowResult(false);
    clearGeneration("web");
    startProgress();

    const isModify = selectedTemplate >= 0 && !!currentHTML;
    const userMessage = isModify
      ? `Here is the current HTML of the website:\n\n${currentHTML}\n\nThe user wants this change: ${prompt}`
      : prompt;

    try {
      const data = await startGeneration("web", async () => {
        const res = await fetch("/api/generate-website", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userMessage, isModify }),
        });
        return await res.json();
      });
      handleWebResult(data as Record<string, string>);
    } catch (err) {
      console.error("Error generating preview:", err);
      finishProgress();
    }
  };

  const openTemplateModal = (idx: number) => {
    setModalTemplateIdx(idx);
    setModalOpen(true);
  };

  const selectTemplate = () => {
    setSelectedTemplate(modalTemplateIdx);
    setCurrentHTML(TEMPLATES[modalTemplateIdx]);
    setModalOpen(false);
  };

  const deselectTemplate = () => {
    setSelectedTemplate(-1);
    setCurrentHTML("");
    setPrompt("");
  };

  return (
    <>
      {/* HERO / INPUT */}
      <section className="bg-gradient-to-b from-[#fffbf2] to-[#fffcf5] py-16 overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center max-w-[720px] mx-auto">
            <h1 className="text-[56px] leading-[1.1] font-extrabold tracking-[-0.02em] text-gunpowder-900 mb-6 max-md:text-[36px]">
              Beschreibe deine
              <br />
              <span className="text-begonia-400">Traumwebsite</span>
            </h1>
            <p className="text-[18px] leading-relaxed text-gunpowder-500 mb-10">
              {selectedTemplate >= 0
                ? "Vorlage ausgewählt — beschreibe hier deine Änderungen und klicke auf Vorschau generieren."
                : "Schreibe, was für eine Website du dir vorstellst, und unsere KI erstellt dir in Sekunden eine Vorschau."}
            </p>

            <div className="max-w-[640px] mx-auto text-left">
              {/* Attached template badge */}
              {selectedTemplate >= 0 && (
                <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-[rgba(77,211,91,0.08)] border border-[rgba(77,211,91,0.25)] rounded-xl mb-2.5 text-sm font-semibold text-[#2a8c36]">
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
                    generatePreview();
                  }
                }}
                placeholder={
                  selectedTemplate >= 0
                    ? "z.B. Ändere die Farben zu Blau, ersetze den Namen mit meiner Firma, füge ein Kontaktformular hinzu..."
                    : "z.B. Eine moderne Landing Page für ein Café in Zürich mit warmem, einladendem Design..."
                }
                rows={4}
                className="w-full px-6 py-5 border-2 border-gunpowder-200 rounded-2xl font-jakarta text-base leading-relaxed text-gunpowder-900 bg-white resize-y transition-all duration-200 focus:outline-none focus:border-begonia-400 focus:shadow-[0_0_0_4px_rgba(254,108,117,0.1)] placeholder:text-gunpowder-300"
              />

              {/* Example chips */}
              {selectedTemplate < 0 && (
                <div className="flex flex-wrap gap-2 mt-3.5">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex.label}
                      onClick={() => setPrompt(ex.text)}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold text-gunpowder-500 bg-gunpowder-50 border border-gunpowder-150 cursor-pointer transition-all hover:text-begonia-500 hover:bg-[rgba(254,108,117,0.06)] hover:border-begonia-400"
                    >
                      {ex.label}
                      <span className="text-[11px] font-medium text-gunpowder-300">
                        {ex.style}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Generate button */}
              {!isGenerating && (
                <div className="flex justify-center mt-5">
                  <button
                    onClick={generatePreview}
                    className="inline-flex items-center justify-center h-[58px] px-8 rounded-full text-[18px] font-semibold bg-begonia-400 text-white shadow-[0_6px_30px_rgba(254,108,117,0.35)] hover:bg-[#ff8a91] hover:shadow-[0_4px_20px_rgba(254,108,117,0.25)] hover:-translate-y-px transition-all cursor-pointer border-none"
                  >
                    Vorschau generieren
                  </button>
                </div>
              )}

              <ProgressBar isActive={isGenerating} percent={progressPct} text={progressText} />
            </div>
          </div>
        </div>
      </section>

      {/* TEMPLATES */}
      <section className="pb-16 -mt-5 bg-gradient-to-b from-[#fffcf5] to-white">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex items-center gap-5 mb-8">
            <span className="text-sm font-bold text-gunpowder-400 uppercase tracking-[0.08em] whitespace-nowrap">
              Oder starte mit einer Vorlage
            </span>
            <div className="flex-1 h-px bg-gunpowder-200" />
          </div>

          {/* Tab navigation */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide max-sm:gap-1.5">
            <button
              onClick={() => setPreviewTab(-1)}
              className="shrink-0 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all cursor-pointer border-2 max-sm:px-3 max-sm:py-2 max-sm:text-[12px]"
              style={{
                borderColor: previewTab === -1 ? "#1a1a2e" : "transparent",
                background: previewTab === -1 ? "#1a1a2e12" : "#f5f3f0",
                color: previewTab === -1 ? "#1a1a2e" : "#6b6b6b",
              }}
            >
              Alle
            </button>
            {TEMPLATE_NAMES.map((name, i) => (
              <button
                key={i}
                onClick={() => setPreviewTab(i)}
                className="shrink-0 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all cursor-pointer border-2 max-sm:px-3 max-sm:py-2 max-sm:text-[12px]"
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
                  onClick={() => openTemplateModal(i)}
                >
                  <div className="relative w-full overflow-hidden" style={{ height: "240px" }}>
                    <iframe
                      srcDoc={TEMPLATES[i]}
                      sandbox="allow-same-origin"
                      title={name}
                      className="absolute top-0 left-0 border-none block pointer-events-none"
                      style={{
                        width: "1280px",
                        height: "960px",
                        transform: "scale(0.22)",
                        transformOrigin: "top left",
                      }}
                    />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white via-white/95 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 flex items-center justify-between">
                    <p
                      className="text-[13px] font-bold truncate"
                      style={{ color: TAB_COLORS[i] }}
                    >
                      {name}
                    </p>
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: TAB_COLORS[i] + "15", color: TAB_COLORS[i] }}
                    >
                      Ansehen
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Single template preview */}
          {previewTab >= 0 && (
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
                onClick={() => openTemplateModal(previewTab)}
                className="inline-flex items-center justify-center gap-2 h-[46px] px-7 rounded-full text-[15px] font-semibold text-white shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:-translate-y-px transition-all cursor-pointer border-none"
                style={{ background: TAB_COLORS[previewTab] }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h6v6" />
                  <path d="M10 14L21 3" />
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                </svg>
                Vorlage ansehen
              </button>
            </div>
          </div>
          )}
        </div>
      </section>

      {/* RESULT MODAL */}
      {resultModalOpen && resultHTML && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[8px]" onClick={() => setResultModalOpen(false)} />
          <div className="relative w-[85%] h-[90%] flex flex-col bg-white overflow-hidden rounded-2xl shadow-2xl max-md:w-full max-md:h-full max-md:rounded-none">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-black/5 bg-white shrink-0">
              <button
                onClick={() => setResultModalOpen(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-none bg-[#e8f0fe] cursor-pointer text-[#1a3a5c] hover:bg-[#d4e4fc] transition-all text-[14px] font-semibold"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5" />
                  <path d="M12 19l-7-7 7-7" />
                </svg>
                Zurück
              </button>
              <span className="text-[15px] font-bold text-gunpowder-700">Deine Vorschau</span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const blob = new Blob([resultHTML], { type: "text/html" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "website.html";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-none bg-gunpowder-100 cursor-pointer text-gunpowder-600 hover:bg-gunpowder-200 transition-all text-[13px] font-semibold"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Herunterladen
                </button>
              </div>
            </div>
            {/* Iframe */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <iframe
                ref={iframeResultRef}
                srcDoc={resultHTML}
                sandbox="allow-same-origin allow-scripts"
                title="Website Vorschau"
                className="w-full h-full border-none block"
              />
            </div>
            {/* Modal footer */}
            <div className="px-5 py-4 border-t border-black/5 bg-white flex items-center justify-center gap-4">
              <a
                href="https://www.lweb.ch/#contact"
                className="inline-flex items-center justify-center gap-2 h-[50px] px-8 rounded-full text-[16px] font-semibold bg-begonia-400 text-white shadow-[0_4px_16px_rgba(254,108,117,0.3)] hover:bg-[#ff8a91] hover:-translate-y-px transition-all border-none"
              >
                Kontaktiere uns für deine Website
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
            <div className="flex items-center px-5 py-3 border-b border-black/5 bg-white shrink-0">
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
            <div className="px-5 py-4 border-t border-black/5 bg-white flex justify-center">
              <button
                onClick={selectTemplate}
                className="inline-flex items-center justify-center gap-2 h-[50px] px-8 rounded-full text-[16px] font-semibold bg-[#4dd35b] text-white shadow-[0_4px_16px_rgba(77,211,91,0.3)] hover:bg-[#3ec04e] hover:-translate-y-px hover:shadow-[0_6px_24px_rgba(77,211,91,0.4)] transition-all cursor-pointer border-none"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Vorlage auswählen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
