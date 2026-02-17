"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import VideoPlayer from "@/components/VideoPlayer";
import { addToHistory, getHistory } from "@/lib/history";
import PasswordModal, { isAuthenticated } from "@/components/PasswordModal";

const STYLE_CHIPS = [
  "Fotorealistisch",
  "Illustration",
  "3D Render",
  "Aquarell",
  "Ölgemälde",
  "Pixel Art",
  "Anime / Manga",
  "Skizze",
  "Pop Art",
  "Minimalistisch",
  "Surreal",
  "Vintage / Retro",
];

type Mode = "generate" | "edit" | "video";

export default function ImageEditorPage() {
  const [mode, setMode] = useState<Mode>("generate");
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [quality, setQuality] = useState("high");
  const [imageModel, setImageModel] = useState("gpt-image-1");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [resultImage, setResultImage] = useState("");
  const [error, setError] = useState("");

  // Upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Video mode state
  const [videoUrl, setVideoUrl] = useState("");
  const [videoDuration, setVideoDuration] = useState("4");
  const [videoOrientation, setVideoOrientation] = useState("landscape");
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Image preview modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Recent images from history
  const [recentImages, setRecentImages] = useState<
    Array<{ id: string; url: string; prompt: string; createdAt: string }>
  >([]);
  const [isMounted, setIsMounted] = useState(false);

  const resultRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Restore form from sessionStorage
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      const savedMode = sessionStorage.getItem("image_mode") as Mode;
      if (savedMode) setMode(savedMode);
      setPrompt(sessionStorage.getItem("image_prompt") || "");
      setSize(sessionStorage.getItem("image_size") || "1024x1024");
      setQuality(sessionStorage.getItem("image_quality") || "high");
      setImageModel(sessionStorage.getItem("image_model") || "gpt-image-1");
      try {
        setSelectedStyles(
          JSON.parse(sessionStorage.getItem("image_styles") || "[]")
        );
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Persist form fields
  useEffect(() => {
    sessionStorage.setItem("image_mode", mode);
  }, [mode]);
  useEffect(() => {
    sessionStorage.setItem("image_prompt", prompt);
  }, [prompt]);
  useEffect(() => {
    sessionStorage.setItem("image_size", size);
  }, [size]);
  useEffect(() => {
    sessionStorage.setItem("image_quality", quality);
  }, [quality]);
  useEffect(() => {
    sessionStorage.setItem("image_model", imageModel);
  }, [imageModel]);
  useEffect(() => {
    sessionStorage.setItem("image_styles", JSON.stringify(selectedStyles));
  }, [selectedStyles]);

  // Load recent images
  useEffect(() => {
    if (!isMounted) return;
    const imageHistory = getHistory("image").slice(0, 8);
    setRecentImages(
      imageHistory
        .map((item) => ({
          id: item.id,
          url: item.url || item.metadata?.imageUrl || "",
          prompt: item.prompt,
          createdAt: item.createdAt,
        }))
        .filter((m) => m.url)
    );
  }, [isMounted, resultImage]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setUploadPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeUploadedImage = () => {
    setUploadedFile(null);
    setUploadPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setUploadPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const toggleStyle = (style: string) => {
    setSelectedStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  };

  const finishProgress = useCallback(() => {
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
    setProgressPct(100);
    setProgressText("Fertig!");
    setTimeout(() => setIsGenerating(false), 600);
  }, []);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    if (mode === "edit" && !uploadedFile) return;
    if (mode === "video" && !uploadedFile && !resultImage) return;
    if (!isAuthenticated()) {
      setShowPasswordModal(true);
      return;
    }
    if (mode === "video") {
      generateVideo();
    } else {
      generateImage();
    }
  };

  const generateImage = async () => {
    setIsGenerating(true);
    setError("");
    setResultImage("");
    setVideoUrl("");
    setProgressPct(5);
    setProgressText(
      mode === "edit"
        ? "Bild wird bearbeitet..."
        : "Bild wird generiert..."
    );

    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);

    // Simulate progress
    let pct = 5;
    progressRef.current = setInterval(() => {
      pct += Math.random() * 8;
      if (pct > 90) pct = 90;
      setProgressPct(Math.round(pct));
      if (pct < 30) setProgressText(mode === "edit" ? "Bild wird analysiert..." : "Prompt wird verarbeitet...");
      else if (pct < 60) setProgressText("KI generiert das Bild...");
      else if (pct < 85) setProgressText("Details werden verfeinert...");
      else setProgressText("Fast fertig...");
    }, 800);

    let fullPrompt = prompt.trim();
    if (selectedStyles.length > 0) {
      fullPrompt += `. Stil: ${selectedStyles.join(", ")}`;
    }

    const formData = new FormData();
    formData.append("mode", mode === "edit" ? "edit" : "generate");
    formData.append("prompt", fullPrompt);
    formData.append("size", size);
    formData.append("quality", quality);
    formData.append("model", imageModel);
    if (mode === "edit" && uploadedFile) {
      formData.append("image", uploadedFile);
    }

    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.status === "error") {
        finishProgress();
        setError(data.message || "Ein Fehler ist aufgetreten.");
        return;
      }

      finishProgress();
      setResultImage(data.image);

      // Save to history
      addToHistory({
        type: "image",
        prompt: fullPrompt,
        url: data.image,
        title: prompt.substring(0, 60),
        metadata: {
          size,
          quality,
          mode,
          styles: selectedStyles.join(", "),
        },
      });

      setTimeout(() => {
        resultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 200);
    } catch (err) {
      console.error("Error generating image:", err);
      finishProgress();
      setError("Netzwerkfehler. Bitte überprüfe deine Verbindung.");
    }
  };

  const generateVideo = async () => {
    setIsGenerating(true);
    setError("");
    setVideoUrl("");
    setProgressPct(5);
    setProgressText("Sende Anfrage an Sora...");

    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);

    // Use the uploaded file or the generated result image
    const formData = new FormData();
    let fullPrompt = prompt.trim();
    if (selectedStyles.length > 0) {
      fullPrompt += `. Stil: ${selectedStyles.join(", ")}`;
    }
    formData.append("prompt", fullPrompt);
    formData.append("duration", videoDuration);
    formData.append(
      "size",
      videoOrientation === "portrait" ? "720x1280" : "1280x720"
    );

    // Attach the image
    if (uploadedFile) {
      formData.append("image", uploadedFile);
    } else if (resultImage) {
      // Convert base64/URL to file
      const response = await fetch(resultImage);
      const blob = await response.blob();
      formData.append("image", blob, "image.png");
    }

    try {
      const res = await fetch("/api/generate-video", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.status === "error") {
        finishProgress();
        setError(data.message || "Ein Fehler ist aufgetreten.");
        return;
      }

      if (data.status === "pending" && data.jobId) {
        pollVideoStatus(data.jobId, fullPrompt);
      } else {
        finishProgress();
        setError("Unerwartete Antwort vom Server.");
      }
    } catch (err) {
      console.error("Error generating video:", err);
      finishProgress();
      setError("Netzwerkfehler. Bitte überprüfe deine Verbindung.");
    }
  };

  const pollVideoStatus = async (jobId: string, fullPrompt: string) => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

    const pollInterval = setInterval(async () => {
      try {
        const statusRes = await fetch(`/api/video-status?jobId=${jobId}`);
        const statusData = await statusRes.json();

        if (statusData.status === "error" || !statusRes.ok) {
          clearInterval(pollInterval);
          finishProgress();
          setError(statusData.message || "Ein Fehler ist aufgetreten.");
          return;
        }

        if (statusData.status === "queued") {
          setProgressPct(Math.max(5, statusData.progress || 0));
          setProgressText("In der Warteschlange...");
        } else if (statusData.status === "in_progress") {
          const progress = statusData.progress || 0;
          setProgressPct(Math.max(10, progress));
          if (progress < 30) setProgressText("Video wird vorbereitet...");
          else if (progress < 60) setProgressText("Rendern der Frames...");
          else if (progress < 90) setProgressText("Feinschliff...");
          else setProgressText("Fast fertig...");
        }

        if (statusData.status === "completed" && statusData.videoUrl) {
          clearInterval(pollInterval);
          pollingIntervalRef.current = null;
          finishProgress();
          setVideoUrl(statusData.videoUrl);

          addToHistory({
            type: "video",
            prompt: fullPrompt,
            url: statusData.videoUrl,
            metadata: {
              duration: videoDuration,
              orientation: videoOrientation,
              source: "image-to-video",
            },
          });

          setTimeout(() => {
            resultRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }, 200);
        } else if (statusData.status === "failed") {
          clearInterval(pollInterval);
          pollingIntervalRef.current = null;
          finishProgress();
          setError(
            statusData.error ||
              "Ein Fehler ist aufgetreten. Bitte versuche es erneut."
          );
        }
      } catch (err) {
        console.error("Error polling video status:", err);
        clearInterval(pollInterval);
        pollingIntervalRef.current = null;
        finishProgress();
        setError("Netzwerkfehler beim Abrufen des Status.");
      }
    }, 3000);

    pollingIntervalRef.current = pollInterval;
  };

  const downloadImage = () => {
    if (!resultImage) return;
    const link = document.createElement("a");
    link.href = resultImage;
    link.download = `ki-bild-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const useImageForVideo = () => {
    if (!resultImage) return;
    setMode("video");
  };
  
  return (
    <>
      {/* HERO / INPUT */}
      <section className="bg-gradient-to-b from-[#f0f8ff] to-[#f8fcff] py-16 max-md:py-10 overflow-x-clip overflow-y-visible">
        <div className="max-w-[1200px] mx-auto px-6 max-md:px-4">
          <div className="text-center max-w-[720px] mx-auto">
            <h1 className="text-[44px] leading-[1.1] font-extrabold tracking-[-0.02em] text-gunpowder-900 mb-6 max-md:text-[30px] max-md:mb-4">
              KI{" "}
              <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
                Bild-Editor
              </span>
            </h1>
            <p className="text-[20px] leading-relaxed text-gunpowder-500 mb-10 max-md:text-[16px] max-md:mb-6">
              Erstelle, bearbeite und animiere Bilder mit künstlicher Intelligenz.
            </p>

            {/* Mode Switcher */}
            <div className="inline-flex bg-gunpowder-50 rounded-full p-1 border border-gunpowder-150 mb-8">
              {(
                [
                  { key: "generate", label: "Erstellen" },
                  { key: "edit", label: "Bearbeiten" },
                  { key: "video", label: "Bild → Video" },
                ] as const
              ).map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  className={`px-6 py-2.5 rounded-full text-[15px] font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer ${
                    mode === m.key
                      ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-[0_4px_16px_rgba(6,182,212,0.35)]"
                      : "text-gunpowder-500 hover:text-gunpowder-700"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="max-w-[640px] mx-auto text-left">
              {/* Prompt */}
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
                  mode === "generate"
                    ? "z.B. Ein majestätischer Löwe in einer futuristischen Stadt bei Nacht..."
                    : mode === "edit"
                    ? "z.B. Füge einen Sonnenuntergang im Hintergrund hinzu..."
                    : "z.B. Die Kamera fliegt langsam über die Szene..."
                }
                rows={4}
                className="w-full px-6 py-5 border-2 border-gunpowder-200 rounded-2xl font-jakarta text-base leading-relaxed text-gunpowder-900 bg-white resize-y transition-all duration-200 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_0_4px_rgba(6,182,212,0.1)] placeholder:text-gunpowder-300 max-md:px-4 max-md:py-4 max-md:rounded-xl"
              />

              {/* Image upload area (for edit + video modes) */}
              {(mode === "edit" || mode === "video") && (
                <div className="mt-3">
                  <label className="block text-sm max-md:text-[14px] font-semibold text-gunpowder-600 mb-2">
                    {mode === "edit"
                      ? "Bild zum Bearbeiten hochladen"
                      : "Bild für Video hochladen"}
                    {mode === "video" && resultImage && (
                      <span className="text-cyan-500 font-normal ml-2">
                        (oder das generierte Bild verwenden)
                      </span>
                    )}
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  {!uploadPreview ? (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center gap-2 px-4 py-8 border-2 border-dashed border-gunpowder-200 rounded-xl text-sm max-md:text-[14px] font-medium text-gunpowder-400 bg-white hover:border-cyan-300 hover:text-cyan-500 hover:bg-cyan-50/30 transition-all cursor-pointer"
                    >
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      <span>
                        Bild hierher ziehen oder <span className="underline">durchsuchen</span>
                      </span>
                      <span className="text-xs text-gunpowder-300">
                        PNG, JPEG oder WebP
                      </span>
                    </div>
                  ) : (
                    <div className="relative inline-block">
                      <img
                        src={uploadPreview}
                        alt="Hochgeladenes Bild"
                        className="h-32 rounded-xl border-2 border-cyan-300 object-cover"
                      />
                      <button
                        type="button"
                        onClick={removeUploadedImage}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md hover:bg-red-600 transition-colors cursor-pointer"
                      >
                        &times;
                      </button>
                    </div>
                  )}

                  {/* Option to use generated image for video */}
                  {mode === "video" && resultImage && !uploadPreview && (
                    <div className="mt-3 flex items-center gap-3 p-3 bg-cyan-50 border border-cyan-200 rounded-xl">
                      <img
                        src={resultImage}
                        alt="Generiertes Bild"
                        className="h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gunpowder-700">
                          Generiertes Bild verwenden
                        </p>
                        <p className="text-xs text-gunpowder-400">
                          Dieses Bild wird als Basis für das Video verwendet.
                        </p>
                      </div>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                  )}
                </div>
              )}

              {/* Style chips */}
              {mode !== "video" && (
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
                              ? "bg-cyan-500 text-white border-cyan-500 shadow-[0_2px_8px_rgba(6,182,212,0.3)]"
                              : "text-gunpowder-500 bg-white border-gunpowder-150 hover:border-cyan-300 hover:text-cyan-600 hover:bg-cyan-50/30"
                          }`}
                        >
                          {style}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Options row */}
              <div className="flex gap-4 mt-4 max-sm:flex-col">
                {mode !== "video" ? (
                  <>
                    {/* Size selector */}
                    <div className="flex-1">
                      <label className="block text-sm max-md:text-[14px] font-semibold text-gunpowder-600 mb-1.5">
                        Format
                      </label>
                      <div className="flex gap-2">
                        {[
                          {
                            value: "1024x1024",
                            label: "1:1",
                            sub: "1024×1024",
                            icon: (
                              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="1" y="1" width="16" height="16" rx="2" />
                              </svg>
                            ),
                          },
                          {
                            value: "1024x1536",
                            label: "Hoch",
                            sub: "1024×1536",
                            icon: (
                              <svg width="14" height="20" viewBox="0 0 14 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="1" y="1" width="12" height="18" rx="2" />
                              </svg>
                            ),
                          },
                          {
                            value: "1536x1024",
                            label: "Quer",
                            sub: "1536×1024",
                            icon: (
                              <svg width="20" height="14" viewBox="0 0 20 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="1" y="1" width="18" height="12" rx="2" />
                              </svg>
                            ),
                          },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setSize(opt.value)}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 border-2 rounded-xl text-sm max-md:text-[14px] font-semibold transition-all cursor-pointer ${
                              size === opt.value
                                ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                                : "border-gunpowder-200 bg-white text-gunpowder-500 hover:border-cyan-300"
                            }`}
                          >
                            {opt.icon}
                            <span className="flex flex-col items-start leading-tight">
                              {opt.label}
                              <span className="text-[11px] max-md:text-[12px] font-normal opacity-70">
                                {opt.sub}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quality selector */}
                    <div className="flex-1">
                      <label className="block text-sm max-md:text-[14px] font-semibold text-gunpowder-600 mb-1.5">
                        Qualität
                      </label>
                      <div className="flex gap-2">
                        {[
                          { value: "low", label: "Schnell" },
                          { value: "medium", label: "Standard" },
                          { value: "high", label: "Hoch" },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setQuality(opt.value)}
                            className={`flex-1 flex items-center justify-center px-3 py-3 border-2 rounded-xl text-sm max-md:text-[14px] font-semibold transition-all cursor-pointer ${
                              quality === opt.value
                                ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                                : "border-gunpowder-200 bg-white text-gunpowder-500 hover:border-cyan-300"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              {/* Model selector */}
              {mode !== "video" && (
                <div className="mt-4">
                  <label className="block text-sm max-md:text-[14px] font-semibold text-gunpowder-600 mb-1.5">
                    Modell
                  </label>
                  <div className="flex gap-2">
                    {[
                      {
                        value: "gpt-image-1",
                        label: "GPT Image 1",
                        desc: "Beste Qualität",
                        icon: (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                          </svg>
                        ),
                      },
                      {
                        value: "gpt-image-1-mini",
                        label: "GPT Image Mini",
                        desc: "Günstiger & schneller",
                        icon: (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                          </svg>
                        ),
                      },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setImageModel(opt.value)}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 border-2 rounded-xl text-sm max-md:text-[14px] font-semibold transition-all cursor-pointer ${
                          imageModel === opt.value
                            ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                            : "border-gunpowder-200 bg-white text-gunpowder-500 hover:border-cyan-300"
                        }`}
                      >
                        {opt.icon}
                        <span className="flex flex-col items-start leading-tight">
                          {opt.label}
                          <span className="text-[11px] max-md:text-[12px] font-normal opacity-70">
                            {opt.desc}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mode === "video" && (
                <div className="flex gap-4 mt-4 max-sm:flex-col">
                    {/* Video Duration */}
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
                            onClick={() => setVideoDuration(opt.value)}
                            className={`flex-1 flex items-center justify-center px-4 py-3 border-2 rounded-xl text-sm max-md:text-[14px] font-semibold transition-all cursor-pointer ${
                              videoDuration === opt.value
                                ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                                : "border-gunpowder-200 bg-white text-gunpowder-500 hover:border-cyan-300"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Video Orientation */}
                    <div className="flex-1">
                      <label className="block text-sm max-md:text-[14px] font-semibold text-gunpowder-600 mb-1.5">
                        Orientierung
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setVideoOrientation("landscape")}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 rounded-xl text-sm max-md:text-[14px] font-semibold transition-all cursor-pointer ${
                            videoOrientation === "landscape"
                              ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                              : "border-gunpowder-200 bg-white text-gunpowder-500 hover:border-cyan-300"
                          }`}
                        >
                          <svg
                            width="20"
                            height="14"
                            viewBox="0 0 20 14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <rect x="1" y="1" width="18" height="12" rx="2" />
                          </svg>
                          16:9
                        </button>
                        <button
                          onClick={() => setVideoOrientation("portrait")}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 rounded-xl text-sm max-md:text-[14px] font-semibold transition-all cursor-pointer ${
                            videoOrientation === "portrait"
                              ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                              : "border-gunpowder-200 bg-white text-gunpowder-500 hover:border-cyan-300"
                          }`}
                        >
                          <svg
                            width="14"
                            height="20"
                            viewBox="0 0 14 20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <rect x="1" y="1" width="12" height="18" rx="2" />
                          </svg>
                          9:16
                        </button>
                      </div>
                    </div>
                </div>
              )}

              {/* Generate button */}
              {!isGenerating && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={handleGenerate}
                    disabled={
                      !prompt.trim() ||
                      (mode === "edit" && !uploadedFile) ||
                      (mode === "video" && !uploadedFile && !resultImage)
                    }
                    className={`inline-flex items-center justify-center gap-2 h-[58px] px-8 rounded-full text-[18px] font-semibold text-white shadow-[0_6px_30px_rgba(6,182,212,0.35)] hover:shadow-[0_4px_20px_rgba(6,182,212,0.45)] hover:-translate-y-px transition-all cursor-pointer border-none max-md:h-[50px] max-md:px-6 max-md:text-[16px] max-md:w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${
                      mode === "video"
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 shadow-[0_6px_30px_rgba(168,85,247,0.35)]"
                        : "bg-gradient-to-r from-cyan-500 to-blue-500"
                    }`}
                  >
                    {mode === "generate" && (
                      <>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 3v18M3 12h18" />
                        </svg>
                        Bild generieren
                      </>
                    )}
                    {mode === "edit" && (
                      <>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Bild bearbeiten
                      </>
                    )}
                    {mode === "video" && (
                      <>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                        Video generieren
                      </>
                    )}
                  </button>
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm max-md:text-[14px] text-red-600 font-medium">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SKELETON - Generating */}
      {isGenerating && (mode === "video" ? !videoUrl : !resultImage) && (
        <section
          ref={resultRef}
          className="flex flex-col items-center justify-center min-h-[500px] bg-gunpowder-50 flex-1 px-6 py-16 max-md:px-4 max-md:py-10"
        >
          <div className="w-full max-w-[800px] mb-8 max-md:mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-base font-semibold text-gunpowder-700 max-md:text-sm">
                {progressText}
              </span>
              <span className="text-base font-bold text-gunpowder-900 max-md:text-sm">
                {progressPct}%
              </span>
            </div>
            <div className="h-3 bg-gunpowder-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  mode === "video"
                    ? "bg-gradient-to-r from-purple-500 to-pink-500"
                    : "bg-gradient-to-r from-cyan-500 to-blue-500"
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div
            className={`relative w-full max-w-[600px] bg-gradient-to-br from-gunpowder-100 via-gunpowder-50 to-gunpowder-100 rounded-2xl overflow-hidden shadow-2xl ${
              size === "1024x1536"
                ? "aspect-[2/3]"
                : size === "1536x1024"
                ? "aspect-[3/2]"
                : "aspect-square"
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className={`w-20 h-20 rounded-full border-4 border-white/20 animate-spin ${
                  mode === "video"
                    ? "border-t-purple-400"
                    : "border-t-cyan-400"
                }`}
              />
            </div>
          </div>
        </section>
      )}

      {/* RESULT - Image */}
      {resultImage && !isGenerating && mode !== "video" && (
        <section
          ref={resultRef}
          className="py-16 bg-gunpowder-50 flex-1 max-md:py-10"
        >
          <div className="max-w-[800px] mx-auto px-6 max-md:px-4">
            <div className="flex items-center justify-between mb-8 max-md:mb-5 max-md:flex-col max-md:items-start max-md:gap-3">
              <h2 className="text-[42px] font-extrabold text-gunpowder-900 max-md:text-[20px]">
                Dein Bild
              </h2>
              <button
                onClick={() => {
                  setResultImage("");
                  setError("");
                }}
                className="inline-flex items-center justify-center h-12 px-6 rounded-full text-base font-semibold bg-transparent text-gunpowder-700 border-2 border-gunpowder-200 hover:border-gunpowder-400 transition-all cursor-pointer max-md:h-10 max-md:px-4 max-md:text-sm"
              >
                Neu generieren
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-gunpowder-150 overflow-hidden shadow-lg">
              <img
                src={resultImage}
                alt="Generiertes KI-Bild"
                className="w-full h-auto cursor-pointer"
                onClick={() => setPreviewImage(resultImage)}
              />
            </div>

            <div className="mt-6 flex justify-center gap-3 max-sm:flex-col">
              <button
                onClick={downloadImage}
                className="inline-flex items-center justify-center gap-2 h-[52px] px-8 rounded-full text-[16px] font-semibold bg-gunpowder-900 text-white shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:bg-gunpowder-800 hover:-translate-y-px transition-all cursor-pointer border-none max-md:h-[46px] max-md:px-6 max-md:text-[14px]"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Bild herunterladen
              </button>
              <button
                onClick={useImageForVideo}
                className="inline-flex items-center justify-center gap-2 h-[52px] px-8 rounded-full text-[16px] font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-[0_4px_16px_rgba(168,85,247,0.25)] hover:shadow-[0_4px_20px_rgba(168,85,247,0.4)] hover:-translate-y-px transition-all cursor-pointer border-none max-md:h-[46px] max-md:px-6 max-md:text-[14px]"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Als Video animieren
              </button>
            </div>
          </div>
        </section>
      )}

      {/* RESULT - Video */}
      {videoUrl && !isGenerating && (
        <section
          ref={resultRef}
          className="py-16 bg-gunpowder-50 flex-1 max-md:py-10"
        >
          <div className="max-w-[800px] mx-auto px-6 max-md:px-4">
            <div className="flex items-center justify-between mb-8 max-md:mb-5 max-md:flex-col max-md:items-start max-md:gap-3">
              <h2 className="text-[42px] font-extrabold text-gunpowder-900 max-md:text-[20px]">
                Dein Video
              </h2>
              <button
                onClick={() => {
                  setVideoUrl("");
                  setError("");
                }}
                className="inline-flex items-center justify-center h-12 px-6 rounded-full text-base font-semibold bg-transparent text-gunpowder-700 border-2 border-gunpowder-200 hover:border-gunpowder-400 transition-all cursor-pointer max-md:h-10 max-md:px-4 max-md:text-sm"
              >
                Neu generieren
              </button>
            </div>
            <VideoPlayer
              url={videoUrl}
              orientation={
                videoOrientation as "landscape" | "portrait"
              }
            />
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = videoUrl;
                  link.download = `ki-video-${Date.now()}.mp4`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="inline-flex items-center justify-center gap-2 h-[52px] px-8 rounded-full text-[16px] font-semibold bg-gunpowder-900 text-white shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:bg-gunpowder-800 hover:-translate-y-px transition-all cursor-pointer border-none max-md:h-[46px] max-md:px-6 max-md:text-[14px] max-md:w-full"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
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

      {/* Recent images gallery */}
      {isMounted && recentImages.length > 0 && !isGenerating && (
        <section className="py-16 bg-gradient-to-b from-white to-[#f0f8ff] max-md:py-10">
          <div className="max-w-[800px] mx-auto px-6 max-md:px-4">
            <h3 className="text-[42px] font-extrabold text-gunpowder-900 mb-3 max-md:text-[20px]">
              Letzte{" "}
              <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
                Bilder
              </span>
            </h3>
            <p className="text-[16px] text-gunpowder-500 mb-8 max-md:text-[14px]">
              Deine zuletzt generierten Bilder.
            </p>
            <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-2">
              {recentImages.map((img) => (
                <div
                  key={img.id}
                  onClick={() => setPreviewImage(img.url)}
                  className="bg-white rounded-2xl border border-gunpowder-150 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5"
                >
                  <div className="aspect-square bg-gunpowder-100">
                    <img
                      src={img.url}
                      alt={img.prompt}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="px-3 py-2">
                    <p className="text-xs text-gunpowder-500 truncate">
                      {img.prompt}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Example generated images */}
      {!resultImage && !videoUrl && !isGenerating && (
        <section className="py-16 bg-gradient-to-b from-white to-[#f0f8ff] max-md:py-10">
          <div className="max-w-[800px] mx-auto px-6 max-md:px-4">
            <h3 className="text-[42px] font-extrabold text-gunpowder-900 mb-3 max-md:text-[20px]">
              Beispiele{" "}
              <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
                generierter Bilder
              </span>
            </h3>
            <p className="text-[16px] text-gunpowder-500 mb-8 max-md:text-[14px]">
              Schau dir an, was mit KI bereits erstellt wurde.
            </p>
            <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
              {[
                "/images/bild/Unknocwn-1.png",
                   "/images/bild/promo.png",
                "/images/bild/IMG_6256.jpeg",
                "/images/bild/berg.png",
                "/images/bild/Imagen JPEG-4B55-B176-E2-0.jpeg",
                "/images/bild/snacks_1767696301406.jpg",
              ].map((src, i) => (
                <div
                  key={i}
                  onClick={() => setPreviewImage(src)}
                  className="bg-white rounded-2xl border border-gunpowder-150 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5"
                >
                  <div className="aspect-square bg-gunpowder-100">
                    <img
                      src={src}
                      alt={`Beispiel ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Example prompts */}
      {!resultImage && !videoUrl && !isGenerating && (
        <section className="py-16 bg-gradient-to-b from-[#f0f8ff] to-white max-md:py-10">
          <div className="max-w-[800px] mx-auto px-6 max-md:px-4">
            <h3 className="text-sm max-md:text-[14px] font-bold text-gunpowder-400 uppercase tracking-[0.08em] mb-6">
              Beispiel-Prompts
            </h3>
            <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
              {mode === "generate"
                ? [
                    "Ein futuristisches Stadtbild bei Nacht mit Neonlichtern und fliegenden Autos",
                    "Ein fotorealistisches Porträt einer Katze, die als König auf einem Thron sitzt",
                    "Ein impressionistisches Gemälde von einem Schweizer Bergsee bei Sonnenaufgang",
                    "Ein minimalistisches Logo für eine Technologie-Firma in blau und weiss",
                  ].map((example, i) => (
                    <button
                      key={i}
                      onClick={() => setPrompt(example)}
                      className="text-left p-4 bg-white rounded-2xl border border-gunpowder-150 text-sm max-md:text-[14px] text-gunpowder-600 leading-relaxed hover:border-cyan-300 hover:bg-cyan-50/30 transition-all cursor-pointer"
                    >
                      {example}
                    </button>
                  ))
                : mode === "edit"
                ? [
                    "Füge einen dramatischen Sonnenuntergang im Hintergrund hinzu",
                    "Ändere die Farben zu einem warmen Herbstton",
                    "Entferne den Hintergrund und ersetze ihn mit einer Berglandschaft",
                    "Füge Schnee und Winteratmosphäre hinzu",
                  ].map((example, i) => (
                    <button
                      key={i}
                      onClick={() => setPrompt(example)}
                      className="text-left p-4 bg-white rounded-2xl border border-gunpowder-150 text-sm max-md:text-[14px] text-gunpowder-600 leading-relaxed hover:border-cyan-300 hover:bg-cyan-50/30 transition-all cursor-pointer"
                    >
                      {example}
                    </button>
                  ))
                : [
                    "Langsame Kamerafahrt nach vorn mit sanfter Bewegung in der Szene",
                    "Dramatischer Zoom mit Partikeleffekten und Lichtveränderungen",
                    "Sanfte Drehung um das Motiv mit weichem Bokeh-Effekt",
                    "Zeitraffer-Effekt mit sich veränderndem Himmel und Wolken",
                  ].map((example, i) => (
                    <button
                      key={i}
                      onClick={() => setPrompt(example)}
                      className="text-left p-4 bg-white rounded-2xl border border-gunpowder-150 text-sm max-md:text-[14px] text-gunpowder-600 leading-relaxed hover:border-cyan-300 hover:bg-cyan-50/30 transition-all cursor-pointer"
                    >
                      {example}
                    </button>
                  ))}
            </div>
          </div>
        </section>
      )}

      {/* Image preview modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-[8px]"
            onClick={() => setPreviewImage(null)}
          />
          <div className="relative max-w-[90vw] max-h-[90vh] flex flex-col bg-white overflow-hidden rounded-2xl shadow-2xl max-md:w-full max-md:h-full max-md:rounded-none max-md:max-w-none max-md:max-h-none">
            <div className="flex items-center justify-between px-5 py-3 bg-gunpowder-900 shrink-0">
              <button
                onClick={() => setPreviewImage(null)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-none bg-white/10 cursor-pointer text-white hover:bg-white/20 transition-all text-[14px] font-semibold"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 12H5" />
                  <path d="M12 19l-7-7 7-7" />
                </svg>
                Zurück
              </button>
              <a
                href={previewImage}
                download={`ki-bild-${Date.now()}.png`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-none bg-white/10 cursor-pointer text-white hover:bg-white/20 transition-all text-[13px] font-semibold"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Herunterladen
              </a>
            </div>
            <div className="flex-1 min-h-0 flex items-center justify-center p-4 max-md:p-0 bg-gunpowder-50">
              <img
                src={previewImage}
                alt="Vorschau"
                className="max-w-full max-h-[80vh] object-contain rounded-lg max-md:rounded-none"
              />
            </div>
          </div>
        </div>
      )}

      <PasswordModal
        open={showPasswordModal}
        onSuccess={() => {
          setShowPasswordModal(false);
          if (mode === "video") {
            generateVideo();
          } else {
            generateImage();
          }
        }}
        onCancel={() => setShowPasswordModal(false)}
      />
    </>
  );
}
