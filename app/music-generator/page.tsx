"use client";

import { useState, useRef, useCallback } from "react";
import ProgressBar from "@/components/ProgressBar";

const PROGRESS_STEPS_CREATE = [
  { pct: 5, text: "Sende Anfrage..." },
  { pct: 15, text: "Analysiere Beschreibung..." },
  { pct: 30, text: "Komponiere Melodie..." },
  { pct: 45, text: "Arrangiere Instrumente..." },
  { pct: 60, text: "Generiere Vocals..." },
  { pct: 75, text: "Mische den Track..." },
  { pct: 88, text: "Mastering..." },
  { pct: 93, text: "Fast fertig..." },
];

const GENRE_CHIPS = [
  "Pop",
  "Rock",
  "Hip-Hop / Rap",
  "R&B / Soul",
  "Jazz",
  "Klassik",
  "Electronic / EDM",
  "Lo-Fi",
  "Reggaeton",
  "Country",
  "Metal",
  "Indie",
  "Ambient",
  "Funk",
  "Latin",
  "Schlager",
];

const MOOD_CHIPS = [
  "Fröhlich",
  "Melancholisch",
  "Energetisch",
  "Entspannt",
  "Romantisch",
  "Episch",
  "Düster",
  "Motivierend",
];

type Mode = "create" | "upload";

export default function MusicGeneratorPage() {
  const [mode, setMode] = useState<Mode>("create");
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [vocal, setVocal] = useState<"male" | "female" | "none">("male");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [audioTitle, setAudioTitle] = useState("");
  const [error, setError] = useState("");
  const [originalAudioUrl, setOriginalAudioUrl] = useState("");
  const [mixedAudioUrl, setMixedAudioUrl] = useState("");
  const [isMixing, setIsMixing] = useState(false);
  const [vocalVol, setVocalVol] = useState(1.0);
  const [instVol, setInstVol] = useState(0.45);

  // Upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const instrumentalRef = useRef<HTMLAudioElement>(null);
  const originalRef = useRef<HTMLAudioElement>(null);
  const [playingBoth, setPlayingBoth] = useState(false);
  const mixedRef = useRef<HTMLAudioElement>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const mixAudio = async (instrumentalUrl: string, vocalFile: File, vVol: number, iVol: number) => {
    setIsMixing(true);
    try {
      const vocalBase64 = await fileToBase64(vocalFile);
      const res = await fetch("/api/mix-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instrumentalUrl: instrumentalUrl,
          vocalBase64,
          vocalVolume: vVol,
          instrumentalVolume: iVol,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || "Mix failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setMixedAudioUrl(url);
    } catch (err) {
      console.error("Mix error:", err);
      setError("Fehler beim Mixen. Du kannst die Tracks trotzdem einzeln abspielen.");
    } finally {
      setIsMixing(false);
    }
  };

  const remixAudio = async () => {
    if (!audioUrl || !uploadedFile) return;
    if (mixedAudioUrl) URL.revokeObjectURL(mixedAudioUrl);
    await mixAudio(audioUrl, uploadedFile, vocalVol, instVol);
  };

  const playBoth = () => {
    const inst = instrumentalRef.current;
    const orig = originalRef.current;
    if (!inst || !orig) return;

    if (playingBoth) {
      inst.pause();
      orig.pause();
      setPlayingBoth(false);
    } else {
      inst.currentTime = 0;
      orig.currentTime = 0;
      inst.play();
      orig.play();
      setPlayingBoth(true);
    }
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const toggleMood = (mood: string) => {
    setSelectedMoods((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood]
    );
  };

  const startProgress = useCallback(() => {
    let step = 0;
    const steps = PROGRESS_STEPS_CREATE;
    setProgressPct(0);
    setProgressText("Starte Musikgenerierung...");
    progressRef.current = setInterval(() => {
      if (step < steps.length) {
        setProgressPct(steps[step].pct);
        setProgressText(steps[step].text);
        step++;
      }
    }, 4000);
  }, []);

  const finishProgress = useCallback(() => {
    if (progressRef.current) clearInterval(progressRef.current);
    setProgressPct(100);
    setProgressText("Fertig!");
    setTimeout(() => setIsGenerating(false), 800);
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setUploadedUrl("");
    setError("");
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload-audio", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.status === "success" && data.url) {
        setUploadedUrl(data.url);
      } else {
        setError(data.message || "Fehler beim Hochladen der Datei.");
        setUploadedFile(null);
      }
    } catch {
      setError("Netzwerkfehler beim Hochladen.");
      setUploadedFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setUploadedUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const generateMusic = async () => {
    if (mode === "create" && !prompt.trim() && selectedGenres.length === 0) return;
    if (mode === "upload" && !uploadedFile) return;

    setIsGenerating(true);
    setError("");
    setAudioUrl("");
    setOriginalAudioUrl("");
    setMixedAudioUrl("");
    startProgress();

    const styleParts = [...selectedGenres, ...selectedMoods];
    if (vocal === "male") styleParts.push("male vocals");
    if (vocal === "female") styleParts.push("female vocals");
    const style = styleParts.join(", ") || "pop";

    const instrumental = vocal === "none";

    try {
      let lyrics: string | undefined;

      // Step 1: If upload mode, try to transcribe audio with Whisper (optional)
      if (mode === "upload" && uploadedFile) {
        setProgressText("Transkribiere dein Audio mit Whisper...");
        setProgressPct(5);

        try {
          const transcribeForm = new FormData();
          transcribeForm.append("file", uploadedFile);

          const transcribeRes = await fetch("/api/transcribe-audio", {
            method: "POST",
            body: transcribeForm,
          });
          const transcribeData = await transcribeRes.json();

          if (transcribeData.status === "success" && transcribeData.text) {
            lyrics = transcribeData.text;
            console.log("Transcribed lyrics:", lyrics);
            setProgressText("Lyrics erkannt! Generiere Instrumental...");
            setProgressPct(15);
          } else {
            console.warn("Transcription failed, continuing without lyrics");
            setProgressText("Generiere Instrumental basierend auf Stil...");
            setProgressPct(15);
          }
        } catch (transcribeErr) {
          console.warn("Whisper transcription failed, continuing without lyrics:", transcribeErr);
          setProgressText("Generiere Instrumental basierend auf Stil...");
          setProgressPct(15);
        }
      }

      // Step 2: Generate music
      // In upload mode, always generate instrumental (no AI voice)
      const isUploadMode = mode === "upload";
      const body: Record<string, unknown> = {
        prompt: prompt.trim(),
        style,
        title: title.trim() || "Untitled",
        instrumental: isUploadMode ? true : instrumental,
        vocal: isUploadMode ? "none" : vocal,
      };

      if (lyrics) {
        body.lyrics = lyrics;
      }

      const res = await fetch("/api/generate-music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.status === "success" && data.audioUrl) {
        setAudioUrl(data.audioUrl);
        setAudioTitle(data.title || title || "KI-Song");

        // Step 3: If upload mode, auto-mix voice + instrumental with FFmpeg
        if (mode === "upload" && uploadedFile) {
          setOriginalAudioUrl(URL.createObjectURL(uploadedFile));
          setProgressText("Mische Stimme + Instrumental mit FFmpeg...");
          setProgressPct(90);
          await mixAudio(data.audioUrl, uploadedFile, vocalVol, instVol);
        }

        finishProgress();
        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 200);
      } else {
        finishProgress();
        setError(data.message || "Ein Fehler ist aufgetreten. Bitte versuche es erneut.");
      }
    } catch (err) {
      console.error("Error generating music:", err);
      finishProgress();
      setError(err instanceof Error ? err.message : "Netzwerkfehler. Bitte überprüfe deine Verbindung.");
    }
  };

  return (
    <>
      {/* HERO / INPUT */}
      <section className="bg-gradient-to-b from-[#fff5f0] to-[#fff8f5] py-16 overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center max-w-[720px] mx-auto">
            <h1 className="text-[56px] leading-[1.1] font-extrabold tracking-[-0.02em] text-gunpowder-900 mb-6 max-md:text-[36px]">
              Erstelle deine{" "}
              <span className="bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent">
                KI-Musik
              </span>
            </h1>
            <p className="text-[18px] leading-relaxed text-gunpowder-500 mb-10">
              Beschreibe deinen Song, wähle Genre und Stimmung — oder lade einen Audio-Track hoch.
            </p>

            {/* Mode Toggle */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex bg-white border-2 border-gunpowder-150 rounded-2xl p-1">
                <button
                  onClick={() => setMode("create")}
                  className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    mode === "create"
                      ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-md"
                      : "text-gunpowder-500 hover:text-gunpowder-700"
                  }`}
                >
                  Neu erstellen
                </button>
                <button
                  onClick={() => setMode("upload")}
                  className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    mode === "upload"
                      ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-md"
                      : "text-gunpowder-500 hover:text-gunpowder-700"
                  }`}
                >
                  Audio hochladen
                </button>
              </div>
            </div>

            <div className="max-w-[640px] mx-auto text-left">
              {/* Upload Section */}
              {mode === "upload" && (
                <div className="mb-5">
                  <label className="block text-sm font-semibold text-gunpowder-600 mb-2">
                    Audio-Datei hochladen
                  </label>
                  <p className="text-xs text-gunpowder-400 mb-3">
                    Sube tu audio cantando (max. 8 min). La IA genera un instrumental/beat en el estilo que elijas basado en tu melodía. Tu voz se conserva — luego puedes mezclar ambos.
                  </p>

                  {!uploadedFile ? (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-gunpowder-200 rounded-2xl p-8 flex flex-col items-center gap-3 hover:border-orange-400 hover:bg-orange-50/30 transition-all cursor-pointer bg-white"
                    >
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gunpowder-300">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <span className="text-sm font-semibold text-gunpowder-500">
                        Klicke hier, um eine Audio-Datei auszuwählen
                      </span>
                      <span className="text-xs text-gunpowder-300">MP3, WAV, M4A, OGG</span>
                    </button>
                  ) : (
                    <div className="w-full border-2 border-gunpowder-200 rounded-2xl p-4 bg-white flex items-center gap-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500">
                          <path d="M9 18V5l12-2v13" />
                          <circle cx="6" cy="18" r="3" />
                          <circle cx="18" cy="16" r="3" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gunpowder-800 truncate">{uploadedFile.name}</p>
                        <p className="text-xs text-gunpowder-400">
                          {isUploading
                            ? "Wird hochgeladen..."
                            : uploadedUrl
                            ? "Bereit"
                            : "Fehler beim Hochladen"}
                        </p>
                      </div>
                      {isUploading ? (
                        <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <button
                          onClick={removeFile}
                          className="text-gunpowder-400 hover:text-red-500 transition-colors cursor-pointer p-1"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              )}

              {/* Title */}
              <div className="mb-3">
                <label className="block text-sm font-semibold text-gunpowder-600 mb-1.5">
                  Songtitel (optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="z.B. Sommernacht"
                  className="w-full px-5 py-3.5 border-2 border-gunpowder-200 rounded-xl font-jakarta text-base text-gunpowder-900 bg-white transition-all duration-200 focus:outline-none focus:border-orange-400 focus:shadow-[0_0_0_4px_rgba(249,115,22,0.1)] placeholder:text-gunpowder-300"
                />
              </div>

              {/* Prompt */}
              <div className="mb-3">
                <label className="block text-sm font-semibold text-gunpowder-600 mb-1.5">
                  {mode === "upload" ? "Beschreibung / Anweisungen" : "Beschreibung / Lyrics"}
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      generateMusic();
                    }
                  }}
                  placeholder={
                    mode === "upload"
                      ? "z.B. Genera un beat de hip-hop con bajos potentes para acompañar mi voz..."
                      : "z.B. Ein fröhlicher Sommersong über das Leben am Strand, mit eingängigem Refrain..."
                  }
                  rows={4}
                  maxLength={5000}
                  className="w-full px-6 py-5 border-2 border-gunpowder-200 rounded-2xl font-jakarta text-base leading-relaxed text-gunpowder-900 bg-white resize-y transition-all duration-200 focus:outline-none focus:border-orange-400 focus:shadow-[0_0_0_4px_rgba(249,115,22,0.1)] placeholder:text-gunpowder-300"
                />
                <div className="text-right text-xs text-gunpowder-300 mt-1">
                  {prompt.length}/5000
                </div>
              </div>

              {/* Vocal gender - solo en modo crear (en upload se conserva tu voz) */}
              {mode === "create" && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gunpowder-600 mb-1.5">
                    Stimme
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: "male" as const, label: "Männlich", icon: "♂" },
                      { value: "female" as const, label: "Weiblich", icon: "♀" },
                      { value: "none" as const, label: "Instrumental", icon: "♪" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setVocal(opt.value)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                          vocal === opt.value
                            ? "border-orange-500 bg-orange-50 text-orange-700"
                            : "border-gunpowder-200 bg-white text-gunpowder-500 hover:border-orange-300"
                        }`}
                      >
                        <span className="text-lg">{opt.icon}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Genre chips */}
              <div className="mb-3">
                <label className="block text-sm font-semibold text-gunpowder-600 mb-2">
                  Genre (mehrere wählbar)
                </label>
                <div className="flex flex-wrap gap-2">
                  {GENRE_CHIPS.map((genre) => {
                    const isSelected = selectedGenres.includes(genre);
                    return (
                      <button
                        key={genre}
                        onClick={() => toggleGenre(genre)}
                        className={`inline-block px-3.5 py-1.5 rounded-full text-[13px] font-semibold border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-orange-500 text-white border-orange-500 shadow-[0_2px_8px_rgba(249,115,22,0.3)]"
                            : "text-gunpowder-500 bg-white border-gunpowder-150 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50/30"
                        }`}
                      >
                        {genre}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mood chips */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gunpowder-600 mb-2">
                  Stimmung (optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {MOOD_CHIPS.map((mood) => {
                    const isSelected = selectedMoods.includes(mood);
                    return (
                      <button
                        key={mood}
                        onClick={() => toggleMood(mood)}
                        className={`inline-block px-3.5 py-1.5 rounded-full text-[13px] font-semibold border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-rose-500 text-white border-rose-500 shadow-[0_2px_8px_rgba(244,63,94,0.3)]"
                            : "text-gunpowder-500 bg-white border-gunpowder-150 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50/30"
                        }`}
                      >
                        {mood}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Generate button */}
              {!isGenerating && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={generateMusic}
                    disabled={mode === "upload" && (!uploadedFile || isUploading)}
                    className="inline-flex items-center justify-center gap-2 h-[58px] px-8 rounded-full text-[18px] font-semibold bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-[0_6px_30px_rgba(249,115,22,0.35)] hover:shadow-[0_4px_20px_rgba(249,115,22,0.45)] hover:-translate-y-px transition-all cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                    {mode === "upload" ? "Musik aus Audio generieren" : "Musik generieren"}
                  </button>
                </div>
              )}

              <ProgressBar isActive={isGenerating} percent={progressPct} text={progressText} />

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* RESULT */}
      {audioUrl && (
        <section ref={resultRef} className="py-16 bg-gunpowder-50 flex-1">
          <div className="max-w-[640px] mx-auto px-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-[36px] font-extrabold text-gunpowder-900">
                Dein Song
              </h2>
              <button
                onClick={generateMusic}
                className="inline-flex items-center justify-center h-12 px-6 rounded-full text-base font-semibold bg-transparent text-gunpowder-700 border-2 border-gunpowder-200 hover:border-gunpowder-400 transition-all cursor-pointer"
              >
                Neu generieren
              </button>
            </div>

            {/* Mixed Audio - Primary Player (upload mode) */}
            {originalAudioUrl && (
              <>
                {isMixing ? (
                  <div className="bg-white rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-black/5 overflow-hidden mb-4 p-8 text-center">
                    <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gunpowder-600 font-semibold">Mische Stimme + Instrumental...</p>
                    <p className="text-gunpowder-400 text-sm mt-1">FFmpeg verarbeitet die Audiodateien</p>
                  </div>
                ) : mixedAudioUrl ? (
                  <div className="bg-white rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-black/5 overflow-hidden mb-4">
                    <div className="bg-gradient-to-r from-orange-500 to-rose-500 px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18V5l12-2v13" />
                            <circle cx="6" cy="18" r="3" />
                            <circle cx="18" cy="16" r="3" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-white font-bold text-xl">{audioTitle}</h3>
                          <p className="text-white/70 text-sm">Gemischt: Stimme + Instrumental</p>
                        </div>
                      </div>
                    </div>
                    <div className="px-8 py-6">
                      <audio ref={mixedRef} controls className="w-full" src={mixedAudioUrl}>
                        Dein Browser unterstützt kein Audio.
                      </audio>
                    </div>

                    {/* Volume Controls + Remix */}
                    <div className="px-8 pb-6 border-t border-gunpowder-100 pt-4">
                      <p className="text-sm font-semibold text-gunpowder-600 mb-3">Lautstärke anpassen</p>
                      <div className="flex gap-6 mb-4">
                        <div className="flex-1">
                          <label className="text-xs text-gunpowder-500 mb-1 block">
                            Stimme: {Math.round(vocalVol * 100)}%
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="1.5"
                            step="0.05"
                            value={vocalVol}
                            onChange={(e) => setVocalVol(parseFloat(e.target.value))}
                            className="w-full accent-purple-500"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-gunpowder-500 mb-1 block">
                            Instrumental: {Math.round(instVol * 100)}%
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="1.5"
                            step="0.05"
                            value={instVol}
                            onChange={(e) => setInstVol(parseFloat(e.target.value))}
                            className="w-full accent-orange-500"
                          />
                        </div>
                      </div>
                      <button
                        onClick={remixAudio}
                        disabled={isMixing}
                        className="w-full h-11 rounded-xl text-sm font-semibold bg-gunpowder-100 text-gunpowder-700 hover:bg-gunpowder-200 transition-all cursor-pointer border-none disabled:opacity-50"
                      >
                        Neu mixen mit diesen Einstellungen
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            )}

            {/* Audio Player Card - Instrumental (standalone in create mode, or collapsible in upload mode) */}
            {(!originalAudioUrl || !mixedAudioUrl) && (
              <div className="bg-white rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-black/5 overflow-hidden mb-4">
                <div className="bg-gradient-to-r from-orange-500 to-rose-500 px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18V5l12-2v13" />
                        <circle cx="6" cy="18" r="3" />
                        <circle cx="18" cy="16" r="3" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-xl">{audioTitle}</h3>
                      <p className="text-white/70 text-sm">KI-generiert</p>
                    </div>
                  </div>
                </div>
                <div className="px-8 py-6">
                  <audio ref={instrumentalRef} controls className="w-full" src={audioUrl}>
                    Dein Browser unterstützt kein Audio.
                  </audio>
                </div>
              </div>
            )}

            {/* Individual tracks (collapsed) in upload mode when mixed exists */}
            {originalAudioUrl && mixedAudioUrl && (
              <details className="mb-4">
                <summary className="text-sm font-semibold text-gunpowder-500 cursor-pointer hover:text-gunpowder-700 mb-2">
                  Einzelne Tracks anzeigen
                </summary>
                <div className="space-y-3">
                  <div className="bg-white rounded-xl border border-gunpowder-150 p-4">
                    <p className="text-xs font-semibold text-gunpowder-500 mb-2">Instrumental</p>
                    <audio ref={instrumentalRef} controls className="w-full" src={audioUrl} />
                  </div>
                  <div className="bg-white rounded-xl border border-gunpowder-150 p-4">
                    <p className="text-xs font-semibold text-gunpowder-500 mb-2">Deine Stimme (Original)</p>
                    <audio ref={originalRef} controls className="w-full" src={originalAudioUrl} />
                  </div>
                </div>

                {/* Play Both Button */}
                <div className="flex justify-center mt-3">
                  <button
                    onClick={playBoth}
                    className={`inline-flex items-center justify-center gap-2 h-10 px-6 rounded-full text-sm font-semibold shadow-sm transition-all cursor-pointer border-none ${
                      playingBoth
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "bg-gradient-to-r from-orange-500 to-purple-500 text-white hover:shadow-md"
                    }`}
                  >
                    {playingBoth ? "Stoppen" : "Beide einzeln abspielen"}
                  </button>
                </div>
              </details>
            )}

            {/* Download button */}
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = mixedAudioUrl || audioUrl;
                  link.download = `${audioTitle || "ki-song"}-${Date.now()}.mp3`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="inline-flex items-center justify-center gap-2 h-[52px] px-8 rounded-full text-[16px] font-semibold bg-gunpowder-900 text-white shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:bg-gunpowder-800 hover:-translate-y-px transition-all cursor-pointer border-none"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Als MP3 herunterladen
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Example prompts */}
      {!audioUrl && !isGenerating && (
        <section className="py-16 bg-gradient-to-b from-[#fff8f5] to-white">
          <div className="max-w-[800px] mx-auto px-6">
            <h3 className="text-sm font-bold text-gunpowder-400 uppercase tracking-[0.08em] mb-6">
              Beispiel-Ideen
            </h3>
            <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
              {[
                { title: "Sommerhit", desc: "Ein fröhlicher Pop-Song über den Sommer am See, mit eingängigem Refrain und guter Laune" },
                { title: "Chill Lo-Fi", desc: "Entspannte Lo-Fi Beats zum Studieren, mit sanftem Piano und warmen Klängen" },
                { title: "Rap Track", desc: "Ein energetischer Hip-Hop Beat mit harten Bässen und selbstbewussten Lyrics über Erfolg" },
                { title: "Ballade", desc: "Eine emotionale Liebesballade mit Klavierbegleitung und gefühlvoller Stimme" },
              ].map((example, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setPrompt(example.desc);
                    setTitle(example.title);
                  }}
                  className="text-left p-4 bg-white rounded-2xl border border-gunpowder-150 hover:border-orange-300 hover:bg-orange-50/30 transition-all cursor-pointer"
                >
                  <span className="block text-sm font-bold text-gunpowder-800 mb-1">{example.title}</span>
                  <span className="block text-[13px] text-gunpowder-500 leading-relaxed">{example.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
