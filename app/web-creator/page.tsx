"use client";

import { useState, useRef, useCallback } from "react";
import ProgressBar from "@/components/ProgressBar";
import TemplateCard from "@/components/TemplateCard";
import { TEMPLATES, TEMPLATE_NAMES } from "@/lib/prompts";

const EXAMPLES = [
  { label: "Restaurant", text: "Eine elegante Landing Page für ein Restaurant mit dunklem Design und goldenen Akzenten" },
  { label: "Fitnessstudio", text: "Eine energetische Website für ein Fitnessstudio mit kräftigen Farben und modernem Look" },
  { label: "Portfolio", text: "Ein minimalistisches Portfolio für eine Fotografin mit viel Weissraum" },
  { label: "Arztpraxis", text: "Eine vertrauenswürdige Website für eine Zahnarztpraxis mit beruhigenden Farben" },
  { label: "Tech Startup", text: "Eine moderne Website für ein Tech-Startup mit Gradient-Effekten und dunklem Theme" },
  { label: "Bäckerei", text: "Eine warme Website für eine Bäckerei mit Erdtönen und handgemachtem Feeling" },
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
  const [showResult, setShowResult] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTemplateIdx, setModalTemplateIdx] = useState(-1);

  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

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
    startProgress();

    const isModify = selectedTemplate >= 0 && !!currentHTML;

    try {
      const res = await fetch("/api/generate-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: isModify
            ? `Here is the current HTML of the website:\n\n${currentHTML}\n\nThe user wants this change: ${prompt}`
            : prompt,
          isModify,
        }),
      });
      const data = await res.json();
      finishProgress();

      if (data.status === "success" && data.botReply) {
        const html = extractHTML(data.botReply);
        setCurrentHTML(html);
        setResultHTML(html);
        setShowResult(true);
        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        }, 100);
      }
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
                      className="inline-block px-4 py-1.5 rounded-full text-[13px] font-semibold text-gunpowder-500 bg-gunpowder-50 border border-gunpowder-150 cursor-pointer transition-all hover:text-begonia-500 hover:bg-[rgba(254,108,117,0.06)] hover:border-begonia-400"
                    >
                      {ex.label}
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
          <div className="flex items-center gap-5 mb-10">
            <span className="text-sm font-bold text-gunpowder-400 uppercase tracking-[0.08em] whitespace-nowrap">
              Oder starte mit einer Vorlage
            </span>
            <div className="flex-1 h-px bg-gunpowder-200" />
          </div>

          <div className="grid grid-cols-4 gap-6 max-lg:grid-cols-2 max-sm:grid-cols-1">
            {TEMPLATES.map((tmpl, i) => (
              <TemplateCard
                key={i}
                index={i}
                html={tmpl}
                isSelected={selectedTemplate === i}
                onClick={() => openTemplateModal(i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* RESULT */}
      {showResult && (
        <section ref={resultRef} className="py-16 bg-gunpowder-50 flex-1">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="flex items-center justify-between mb-8 max-md:flex-col max-md:items-start max-md:gap-3">
              <h2 className="text-[44px] font-extrabold text-gunpowder-900 max-md:text-[28px]">
                Deine Vorschau
              </h2>
              <button
                onClick={generatePreview}
                className="inline-flex items-center justify-center h-12 px-6 rounded-full text-base font-semibold bg-transparent text-gunpowder-700 border-2 border-gunpowder-200 hover:border-gunpowder-400 transition-all cursor-pointer"
              >
                Neu generieren
              </button>
            </div>
            <div className="relative rounded-[20px] overflow-hidden bg-white border border-black/10 shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
              <iframe
                srcDoc={resultHTML}
                sandbox="allow-same-origin"
                title="Website Vorschau"
                className="w-full h-[700px] border-none block max-md:h-[500px] max-sm:h-[400px]"
              />
              <div className="absolute bottom-0 left-0 right-0 h-[280px] bg-gradient-to-b from-transparent via-white/85 to-white flex items-end justify-center pb-10">
                <div className="text-center">
                  <p className="text-base font-semibold text-gunpowder-600 mb-2">
                    Gefällt dir das Design? Wir erstellen deine komplette Website.
                  </p>
                  <a
                    href="https://www.lweb.ch/#contact"
                    className="inline-flex items-center justify-center h-[58px] px-8 rounded-full text-[18px] font-semibold bg-begonia-400 text-white shadow-[0_6px_30px_rgba(254,108,117,0.35)] hover:bg-[#ff8a91] hover:-translate-y-px transition-all"
                  >
                    Kontaktiere uns für deine Website
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TEMPLATE MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[8px]" onClick={() => setModalOpen(false)} />
          <div className="relative w-full h-full flex flex-col bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-black/5 bg-white shrink-0">
              <span className="text-[15px] font-bold text-gunpowder-900">Vorschau</span>
              <button
                onClick={() => setModalOpen(false)}
                className="w-9 h-9 rounded-full border-none bg-gunpowder-50 cursor-pointer flex items-center justify-center text-gunpowder-600 hover:bg-gunpowder-150 hover:text-gunpowder-900 transition-all"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
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
            <div className="px-5 py-4 border-t border-black/5 bg-white">
              <button
                onClick={selectTemplate}
                className="w-full inline-flex items-center justify-center gap-2 h-[58px] px-8 rounded-full text-[18px] font-semibold bg-[#4dd35b] text-white shadow-[0_4px_16px_rgba(77,211,91,0.3)] hover:bg-[#3ec04e] hover:-translate-y-px hover:shadow-[0_6px_24px_rgba(77,211,91,0.4)] transition-all cursor-pointer border-none"
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
