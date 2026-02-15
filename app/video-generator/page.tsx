"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import ProgressBar from "@/components/ProgressBar";
import VideoPlayer from "@/components/VideoPlayer";
import { addToHistory } from "@/lib/history";
import { startGeneration, getGeneration, clearGeneration, subscribe } from "@/lib/generation-store";
import PasswordModal, { isAuthenticated } from "@/components/PasswordModal";

const PROGRESS_STEPS = [
  { pct: 5, text: "Sende Anfrage an Sora..." },
  { pct: 15, text: "Video wird vorbereitet..." },
  { pct: 30, text: "Szene wird aufgebaut..." },
  { pct: 50, text: "Rendern der Frames..." },
  { pct: 70, text: "Bewegungen werden berechnet..." },
  { pct: 85, text: "Feinschliff & Qualitätskontrolle..." },
  { pct: 92, text: "Fast fertig..." },
];

const STYLE_CHIPS = [
  "Cinematic",
  "Drohne",
  "Zeitraffer",
  "Slow Motion",
  "Analog Film",
  "Neon / Cyberpunk",
  "Minimalistisch",
  "Natur / Landschaft",
  "Schwarzweiss",
  "3D Render",
  "Anime",
  "Vintage / Retro",
];

export default function VideoGeneratorPage() {
  const [prompt, setPrompt] = useState(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("video_prompt") || "";
    return "";
  });
  const [selectedStyles, setSelectedStyles] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try { return JSON.parse(sessionStorage.getItem("video_styles") || "[]"); } catch { return []; }
    }
    return [];
  });
  const [duration, setDuration] = useState(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("video_duration") || "4";
    return "4";
  });
  const [orientation, setOrientation] = useState(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("video_orientation") || "landscape";
    return "landscape";
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist form fields to sessionStorage
  useEffect(() => { sessionStorage.setItem("video_prompt", prompt); }, [prompt]);
  useEffect(() => { sessionStorage.setItem("video_styles", JSON.stringify(selectedStyles)); }, [selectedStyles]);
  useEffect(() => { sessionStorage.setItem("video_duration", duration); }, [duration]);
  useEffect(() => { sessionStorage.setItem("video_orientation", orientation); }, [orientation]);

  // Restore state from global store on mount
  useEffect(() => {
    const gen = getGeneration("video");
    if (!gen) return;

    if (gen.status === "pending") {
      setIsGenerating(true);
      // Resume progress from elapsed time
      const elapsed = Date.now() - gen.startedAt;
      const stepsPassed = Math.min(Math.floor(elapsed / 3000), PROGRESS_STEPS.length - 1);
      setProgressPct(PROGRESS_STEPS[stepsPassed].pct);
      setProgressText(PROGRESS_STEPS[stepsPassed].text);
      let step = stepsPassed + 1;
      progressRef.current = setInterval(() => {
        if (step < PROGRESS_STEPS.length) {
          setProgressPct(PROGRESS_STEPS[step].pct);
          setProgressText(PROGRESS_STEPS[step].text);
          step++;
        }
      }, 3000);
      gen.promise.then(() => {
        const updated = getGeneration("video");
        if (updated?.status === "done" && updated.result) {
          handleResult(updated.result as Record<string, string>);
        } else if (updated?.status === "error") {
          finishProgress();
          setError(updated.error || "Ein Fehler ist aufgetreten.");
        }
      });
    } else if (gen.status === "done" && gen.result) {
      const r = gen.result as Record<string, string>;
      if (r.videoUrl) setVideoUrl(r.videoUrl);
    } else if (gen.status === "error") {
      setError(gen.error || "Ein Fehler ist aufgetreten.");
    }

    return subscribe("video", () => {
      const g = getGeneration("video");
      if (g?.status !== "pending") setIsGenerating(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResult = (data: Record<string, string>) => {
    finishProgress();
    if (data.status === "success" && data.videoUrl) {
      setVideoUrl(data.videoUrl);
      addToHistory({
        type: "video",
        prompt: data._prompt || prompt,
        url: data.videoUrl,
        metadata: {
          duration: data._duration || duration,
          orientation: data._orientation || orientation,
          styles: data._styles || selectedStyles.join(", "),
        },
      });
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    } else {
      setError(data.message || "Ein Fehler ist aufgetreten. Bitte versuche es erneut.");
    }
  };

  const handleImageAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setAttachedImage(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleStyle = (style: string) => {
    setSelectedStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  };

  const startProgress = useCallback(() => {
    if (progressRef.current) clearInterval(progressRef.current);
    let step = 0;
    setProgressPct(0);
    setProgressText("Starte Videogenerierung...");
    progressRef.current = setInterval(() => {
      if (step < PROGRESS_STEPS.length) {
        setProgressPct(PROGRESS_STEPS[step].pct);
        setProgressText(PROGRESS_STEPS[step].text);
        step++;
      }
    }, 3000);
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
      setShowPasswordModal(true);
      return;
    }
    generateVideo();
  };

  const generateVideo = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError("");
    setVideoUrl("");
    clearGeneration("video");
    startProgress();

    let fullPrompt = prompt.trim();
    if (selectedStyles.length > 0) {
      fullPrompt += `. Style: ${selectedStyles.join(", ")}`;
    }

    const formData = new FormData();
    formData.append("prompt", fullPrompt);
    formData.append("duration", String(parseInt(duration)));
    formData.append("size", orientation === "portrait" ? "720x1280" : "1280x720");
    if (attachedImage) {
      formData.append("image", attachedImage);
    }

    // Store metadata in the result for history
    const meta = {
      _prompt: fullPrompt,
      _duration: duration,
      _orientation: orientation,
      _styles: selectedStyles.join(", "),
    };

    try {
      const data = await startGeneration("video", async () => {
        const res = await fetch("/api/generate-video", {
          method: "POST",
          body: formData,
        });
        const json = await res.json();
        return { ...json, ...meta };
      });
      handleResult(data as Record<string, string>);
    } catch (err) {
      console.error("Error generating video:", err);
      finishProgress();
      setError("Netzwerkfehler. Bitte überprüfe deine Verbindung.");
    }
  };

  return (
    <>
      {/* HERO / INPUT */}
      <section className="bg-gradient-to-b from-[#f8f0ff] to-[#fdf8ff] py-16 max-md:py-10 max-md:pt-24 overflow-x-clip overflow-y-visible">
        <div className="max-w-[1200px] mx-auto px-6 max-md:px-4">
          <div className="text-center max-w-[720px] mx-auto">
            <h1 className="text-[64px] leading-[1.1] font-extrabold tracking-[-0.02em] text-gunpowder-900 mb-6 max-md:text-[30px] max-md:mb-4">
              Erstelle ein{" "}
              <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                KI-Video
              </span>
            </h1>
            <p className="text-[20px] leading-relaxed text-gunpowder-500 mb-10 max-md:text-[16px] max-md:mb-6">
              Beschreibe dein Video und Sora generiert es für dich in wenigen Minuten.
            </p>

            <div className="max-w-[640px] mx-auto text-left">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                placeholder="z.B. Ein majestätischer Adler fliegt über verschneite Berge bei Sonnenuntergang..."
                rows={4}
                className="w-full px-6 py-5 border-2 border-gunpowder-200 rounded-2xl font-jakarta text-base leading-relaxed text-gunpowder-900 bg-white resize-y transition-all duration-200 focus:outline-none focus:border-purple-400 focus:shadow-[0_0_0_4px_rgba(168,85,247,0.1)] placeholder:text-gunpowder-300 max-md:px-4 max-md:py-4 max-md:rounded-xl"
              />

              {/* Image attachment */}
              <div className="mt-3">
                <label className="block text-sm max-md:text-[14px] font-semibold text-gunpowder-600 mb-2">
                  Bild anhängen (optional) — z.B. Logo, Banner oder Referenzbild
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageAttach}
                  className="hidden"
                />
                {!imagePreview ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gunpowder-200 rounded-xl text-sm max-md:text-[14px] font-medium text-gunpowder-400 bg-white hover:border-purple-300 hover:text-purple-500 hover:bg-purple-50/30 transition-all cursor-pointer w-full justify-center"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    Bild auswählen
                  </button>
                ) : (
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Angehängtes Bild"
                      className="h-20 rounded-xl border-2 border-purple-300 object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md hover:bg-red-600 transition-colors cursor-pointer"
                    >
                      &times;
                    </button>
                  </div>
                )}
              </div>

              {/* Style chips */}
              <div className="mt-3">
                <label className="block text-sm max-md:text-[14px] font-semibold text-gunpowder-600 mb-2">
                  Stil (optional, mehrere wählbar)
                </label>
                <div className="flex flex-wrap gap-2">
                  {STYLE_CHIPS.map((style) => {
                    const isSelected = selectedStyles.includes(style);
                    return (
                      <button
                        key={style}
                        onClick={() => toggleStyle(style)}
                        className={`inline-block px-3.5 py-1.5 rounded-full text-[13px] max-md:text-[14px] font-semibold border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-purple-500 text-white border-purple-500 shadow-[0_2px_8px_rgba(168,85,247,0.3)]"
                            : "text-gunpowder-500 bg-white border-gunpowder-150 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50/30"
                        }`}
                      >
                        {style}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Options */}
              <div className="flex gap-4 mt-4 max-sm:flex-col">
                <div className="flex-1">
                  <label className="block text-sm max-md:text-[14px] font-semibold text-gunpowder-600 mb-1.5">
                    Dauer
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: "4", label: "4s" },
                      { value: "8", label: "8s" },
                      { value: "12", label: "12s" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setDuration(opt.value)}
                        className={`flex-1 flex items-center justify-center px-4 py-3 border-2 rounded-xl text-sm max-md:text-[14px] font-semibold transition-all cursor-pointer ${
                          duration === opt.value
                            ? "border-purple-500 bg-purple-50 text-purple-700"
                            : "border-gunpowder-200 bg-white text-gunpowder-500 hover:border-purple-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-sm max-md:text-[14px] font-semibold text-gunpowder-600 mb-1.5">
                    Orientierung
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOrientation("landscape")}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 rounded-xl text-sm max-md:text-[14px] font-semibold transition-all cursor-pointer ${
                        orientation === "landscape"
                          ? "border-purple-500 bg-purple-50 text-purple-700"
                          : "border-gunpowder-200 bg-white text-gunpowder-500 hover:border-purple-300"
                      }`}
                    >
                      <svg width="20" height="14" viewBox="0 0 20 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="1" width="18" height="12" rx="2" />
                      </svg>
                      <span>16:9<br /><span className="text-[11px] max-md:text-[12px] font-normal opacity-70">1280x720</span></span>
                    </button>
                    <button
                      onClick={() => setOrientation("portrait")}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 rounded-xl text-sm max-md:text-[14px] font-semibold transition-all cursor-pointer ${
                        orientation === "portrait"
                          ? "border-purple-500 bg-purple-50 text-purple-700"
                          : "border-gunpowder-200 bg-white text-gunpowder-500 hover:border-purple-300"
                      }`}
                    >
                      <svg width="14" height="20" viewBox="0 0 14 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="1" width="12" height="18" rx="2" />
                      </svg>
                      <span>9:16<br /><span className="text-[11px] max-md:text-[12px] font-normal opacity-70">720x1280</span></span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Generate button */}
              {!isGenerating && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={handleGenerate}
                    className="inline-flex items-center justify-center gap-2 h-[58px] px-8 rounded-full text-[18px] font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-[0_6px_30px_rgba(168,85,247,0.35)] hover:shadow-[0_4px_20px_rgba(168,85,247,0.45)] hover:-translate-y-px transition-all cursor-pointer border-none max-md:h-[50px] max-md:px-6 max-md:text-[16px] max-md:w-full"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Video generieren
                  </button>
                </div>
              )}

              <ProgressBar isActive={isGenerating} percent={progressPct} text={progressText} />

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm max-md:text-[14px] text-red-600 font-medium">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* RESULT */}
      {videoUrl && (
        <section ref={resultRef} className="py-16 bg-gunpowder-50 flex-1 max-md:py-10">
          <div className="max-w-[800px] mx-auto px-6 max-md:px-4">
            <div className="flex items-center justify-between mb-8 max-md:mb-5 max-md:flex-col max-md:items-start max-md:gap-3">
              <h2 className="text-[42px] font-extrabold text-gunpowder-900 max-md:text-[20px]">
                Dein Video
              </h2>
              <button
                onClick={handleGenerate}
                className="inline-flex items-center justify-center h-12 px-6 rounded-full text-base font-semibold bg-transparent text-gunpowder-700 border-2 border-gunpowder-200 hover:border-gunpowder-400 transition-all cursor-pointer max-md:h-10 max-md:px-4 max-md:text-sm"
              >
                Neu generieren
              </button>
            </div>
            <VideoPlayer url={videoUrl} orientation={orientation as "landscape" | "portrait"} />
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = videoUrl;
                  link.download = `sora-video-${Date.now()}.mp4`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="inline-flex items-center justify-center gap-2 h-[52px] px-8 rounded-full text-[16px] font-semibold bg-gunpowder-900 text-white shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:bg-gunpowder-800 hover:-translate-y-px transition-all cursor-pointer border-none max-md:h-[46px] max-md:px-6 max-md:text-[14px] max-md:w-full"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                MP4 herunterladen
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Examples of generated videos */}
      <section className="py-16 bg-gradient-to-b from-white to-[#fdf8ff] max-md:py-10">
        <div className="max-w-[800px] mx-auto px-6 max-md:px-4">
          <h3 className="text-[42px] font-extrabold text-gunpowder-900 mb-3 max-md:text-[20px]">
            Beispiele{" "}
            <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
              generierter Videos
            </span>
          </h3>
          <p className="text-[16px] text-gunpowder-500 mb-8 max-md:text-[14px]">
            Schau dir an, was Sora bereits erstellt hat.
          </p>
          <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
            {[
              "/images/videos/efa20efa-3dee-41fc-893d-edc92f366d3b.mp4",
              "/images/videos/sora-video-1771028858761.mp4",
              "/images/videos/sora-video-1771029951935.mp4",
              "/images/videos/sora-video-1771056893067.mp4",
            ].map((src, i) => (
              <div
                key={i}
                onClick={() => setPreviewVideo(src)}
                className="bg-white rounded-2xl border border-gunpowder-150 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="aspect-video bg-gunpowder-100 relative">
                  <video
                    src={src}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
                    <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Example prompts */}
      {!videoUrl && !isGenerating && (
        <section className="py-16 bg-gradient-to-b from-[#fdf8ff] to-white max-md:py-10">
          <div className="max-w-[800px] mx-auto px-6 max-md:px-4">
            <h3 className="text-sm max-md:text-[14px] font-bold text-gunpowder-400 uppercase tracking-[0.08em] mb-6">
              Beispiel-Prompts
            </h3>
            <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
              {[
                "Ein Zeitraffer einer Stadt bei Nacht mit leuchtenden Lichtern und Verkehr",
                "Unterwasser-Szene mit bunten Korallen und tropischen Fischen in kristallklarem Wasser",
                "Eine dampfende Tasse Kaffee auf einem Holztisch, Morgenlicht strömt durch das Fenster",
                "Nordlichter tanzen über einer verschneiten Landschaft in Norwegen, Sternenhimmel",
              ].map((example, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(example)}
                  className="text-left p-4 bg-white rounded-2xl border border-gunpowder-150 text-sm max-md:text-[14px] text-gunpowder-600 leading-relaxed hover:border-purple-300 hover:bg-purple-50/30 transition-all cursor-pointer"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Video preview modal */}
      {previewVideo && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[8px]" onClick={() => setPreviewVideo(null)} />
          <div className="relative w-[85%] max-w-[900px] flex flex-col bg-black overflow-hidden rounded-2xl shadow-2xl max-md:w-full max-md:h-full max-md:rounded-none">
            <div className="flex items-center justify-between px-5 py-3 bg-gunpowder-900 shrink-0">
              <button
                onClick={() => setPreviewVideo(null)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-none bg-white/10 cursor-pointer text-white hover:bg-white/20 transition-all text-[14px] font-semibold"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5" />
                  <path d="M12 19l-7-7 7-7" />
                </svg>
                Zurück
              </button>
              <a
                href={previewVideo}
                download={`sora-example-${Date.now()}.mp4`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-none bg-white/10 cursor-pointer text-white hover:bg-white/20 transition-all text-[13px] font-semibold"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Herunterladen
              </a>
            </div>
            <div className="flex-1 min-h-0 flex items-center justify-center p-4 max-md:p-0">
              <video
                src={previewVideo}
                controls
                autoPlay
                muted
                playsInline
                className="w-full max-h-[75vh] rounded-lg max-md:rounded-none"
              />
            </div>
          </div>
        </div>
      )}

      <PasswordModal
        open={showPasswordModal}
        onSuccess={() => { setShowPasswordModal(false); generateVideo(); }}
        onCancel={() => setShowPasswordModal(false)}
      />
    </>
  );
}
