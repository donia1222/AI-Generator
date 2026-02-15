"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getHistory, clearHistory, type HistoryItem, type HistoryType } from "@/lib/history";
import { injectEditingCapabilities } from "@/lib/iframe-editing";

const TABS: { label: string; type: HistoryType }[] = [
  { label: "Videos", type: "video" },
  { label: "Musik", type: "music" },
  { label: "Webs", type: "web" },
];

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function VideoCard({ item }: { item: HistoryItem }) {
  return (
    <div className="bg-white rounded-2xl border border-gunpowder-150 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="aspect-video bg-gunpowder-100 relative">
        <video
          src={item.url}
          className="w-full h-full object-cover"
          preload="metadata"
          muted
          playsInline
          onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
          onMouseLeave={(e) => {
            const v = e.target as HTMLVideoElement;
            v.pause();
            v.currentTime = 0;
          }}
        />
        {item.metadata?.duration && (
          <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-semibold px-2 py-0.5 rounded-md">
            {item.metadata.duration}s
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="text-sm text-gunpowder-700 leading-relaxed line-clamp-2 mb-2">
          {item.prompt}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gunpowder-400">{formatDate(item.createdAt)}</span>
          {item.metadata?.styles && (
            <span className="text-xs text-purple-500 font-medium truncate max-w-[120px]">
              {item.metadata.styles}
            </span>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-semibold bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Abspielen
          </a>
          <a
            href={item.url}
            download={`video-${item.id}.mp4`}
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-gunpowder-50 text-gunpowder-500 hover:bg-gunpowder-100 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

function MusicCard({ item }: { item: HistoryItem }) {
  return (
    <div className="bg-white rounded-2xl border border-gunpowder-150 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="bg-gradient-to-r from-orange-500 to-rose-500 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <div className="min-w-0">
            <h4 className="text-white font-bold text-sm truncate">{item.title || "KI-Song"}</h4>
            {item.metadata?.mode && (
              <p className="text-white/60 text-xs capitalize">{item.metadata.mode}</p>
            )}
          </div>
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm text-gunpowder-700 leading-relaxed line-clamp-2 mb-2">
          {item.prompt}
        </p>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gunpowder-400">{formatDate(item.createdAt)}</span>
          {item.metadata?.genres && (
            <span className="text-xs text-orange-500 font-medium truncate max-w-[120px]">
              {item.metadata.genres}
            </span>
          )}
        </div>
        <audio controls className="w-full h-10" src={item.url} preload="none" />
        <div className="mt-2 flex justify-end">
          <a
            href={item.url}
            download={`song-${item.id}.mp3`}
            className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-gunpowder-50 text-gunpowder-500 hover:bg-gunpowder-100 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Herunterladen
          </a>
        </div>
      </div>
    </div>
  );
}

function WebCard({ item, onPreview }: { item: HistoryItem; onPreview: (html: string) => void }) {
  const html = item.metadata?.html as string | undefined;
  return (
    <div className="bg-white rounded-2xl border border-gunpowder-150 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      {html && (
        <div
          className="relative w-full overflow-hidden cursor-pointer"
          style={{ height: "160px" }}
          onClick={() => onPreview(html)}
        >
          <iframe
            srcDoc={html}
            sandbox="allow-same-origin"
            title={item.title || "Web"}
            className="absolute top-0 left-0 border-none block pointer-events-none"
            style={{
              width: "1280px",
              height: "960px",
              transform: "scale(0.22)",
              transformOrigin: "top left",
            }}
          />
        </div>
      )}
      <div className="p-4">
        <h4 className="font-bold text-sm text-gunpowder-800 truncate mb-1">{item.title || "Web"}</h4>
        <p className="text-sm text-gunpowder-500 leading-relaxed line-clamp-2 mb-2">
          {item.prompt}
        </p>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gunpowder-400">{formatDate(item.createdAt)}</span>
        </div>
        {html && (
          <button
            onClick={() => onPreview(html)}
            className="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer border-none"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6" />
              <path d="M10 14L21 3" />
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            </svg>
            Ansehen
          </button>
        )}
      </div>
    </div>
  );
}

function WebPreviewModal({ html, onClose, onUpdate }: { html: string; onClose: () => void; onUpdate: (html: string) => void }) {
  // Only inject editing on initial open, not on every inline edit
  const [displayHTML] = useState(() => injectEditingCapabilities(html));
  const htmlRef = useRef(html);

  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "sora-edit" && event.data.html) {
        htmlRef.current = event.data.html;
        onUpdateRef.current(event.data.html);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[8px]" onClick={onClose} />
      <div className="relative w-[85%] h-[90%] flex flex-col bg-white overflow-hidden rounded-2xl shadow-2xl max-md:w-full max-md:h-full max-md:rounded-none">
        <div className="flex items-center justify-between px-5 py-3 border-b border-black/5 bg-white shrink-0">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-none bg-[#e8f0fe] cursor-pointer text-[#1a3a5c] hover:bg-[#d4e4fc] transition-all text-[14px] font-semibold"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            Zurück
          </button>
          <button
            onClick={() => {
              const blob = new Blob([htmlRef.current], { type: "text/html" });
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
        <div className="flex-1 min-h-0 overflow-hidden">
          <iframe
            srcDoc={displayHTML}
            sandbox="allow-same-origin allow-scripts"
            title="Web Vorschau"
            className="w-full h-full border-none block"
          />
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState<HistoryType>("video");
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [previewHTML, setPreviewHTML] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<HistoryType, number>>({ video: 0, music: 0, web: 0 });

  useEffect(() => {
    setItems(getHistory(activeTab));
    setCounts({
      video: getHistory("video").length,
      music: getHistory("music").length,
      web: getHistory("web").length,
    });
  }, [activeTab]);

  const previewHTMLRef = useRef(previewHTML);
  previewHTMLRef.current = previewHTML;

  const handleWebEdit = useCallback((newHtml: string) => {
    // Save to localStorage without re-rendering the modal
    const webItems = getHistory("web");
    const oldHtml = previewHTMLRef.current;
    const idx = webItems.findIndex((i) => i.metadata?.html === oldHtml);
    if (idx >= 0) {
      webItems[idx].metadata = { ...webItems[idx].metadata, html: newHtml };
      localStorage.setItem("history_web", JSON.stringify(webItems));
    }
    previewHTMLRef.current = newHtml;
  }, []);

  const handleClear = () => {
    clearHistory(activeTab);
    setItems([]);
  };

  const tabColors: Record<HistoryType, string> = {
    video: "from-purple-500 to-pink-500",
    music: "from-orange-500 to-rose-500",
    web: "from-cerulean-400 to-blue-500",
  };

  return (
    <>
      <section className="bg-gradient-to-b from-[#f8f5ff] to-[#fdf8ff] py-16 max-md:py-10 overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-6 max-md:px-4">
          <div className="text-center max-w-[720px] mx-auto mb-10 max-md:mb-6">
            <h1 className="text-[56px] leading-[1.1] font-extrabold tracking-[-0.02em] text-gunpowder-900 mb-4 max-md:text-[28px]">
              Dein{" "}
              <span className={`bg-gradient-to-r ${tabColors[activeTab]} bg-clip-text text-transparent`}>
                Verlauf
              </span>
            </h1>
            <p className="text-[18px] leading-relaxed text-gunpowder-500">
              Die letzten 10 Generierungen pro Kategorie.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex bg-white border-2 border-gunpowder-150 rounded-2xl p-1">
              {TABS.map((tab) => {
                const count = counts[tab.type];
                return (
                  <button
                    key={tab.type}
                    onClick={() => setActiveTab(tab.type)}
                    className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                      activeTab === tab.type
                        ? `bg-gradient-to-r ${tabColors[tab.type]} text-white shadow-md`
                        : "text-gunpowder-500 hover:text-gunpowder-700"
                    }`}
                  >
                    {tab.label}
                    <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.type
                        ? "bg-white/25 text-white"
                        : "bg-gunpowder-100 text-gunpowder-400"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          {items.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-gunpowder-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gunpowder-300">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gunpowder-700 mb-2">Noch kein Verlauf</h3>
              <p className="text-gunpowder-400 text-sm">
                {activeTab === "video" && "Generiere dein erstes Video, um es hier zu sehen."}
                {activeTab === "music" && "Generiere deinen ersten Song, um ihn hier zu sehen."}
                {activeTab === "web" && "Generiere deine erste Website, um sie hier zu sehen."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-6 max-md:grid-cols-1">
                {items.map((item) => {
                  if (item.type === "video") return <VideoCard key={item.id} item={item} />;
                  if (item.type === "music") return <MusicCard key={item.id} item={item} />;
                  return <WebCard key={item.id} item={item} onPreview={setPreviewHTML} />;
                })}
              </div>

              <div className="flex justify-center mt-10">
                <button
                  onClick={handleClear}
                  className="inline-flex items-center gap-2 h-10 px-5 rounded-full text-sm font-semibold text-red-500 bg-red-50 border border-red-200 hover:bg-red-100 transition-all cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Verlauf löschen
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Web Preview Modal */}
      {previewHTML && (
        <WebPreviewModal
          html={previewHTML}
          onClose={() => {
            setPreviewHTML(null);
            // Refresh items to show updated thumbnails
            setItems(getHistory(activeTab));
          }}
          onUpdate={handleWebEdit}
        />
      )}
    </>
  );
}
