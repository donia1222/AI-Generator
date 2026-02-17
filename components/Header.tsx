"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { isGenerating, subscribe, type GenType } from "@/lib/generation-store";

const tabs: { label: string; subtitle?: string; href: string; genType?: GenType; icon: React.ReactNode }[] = [
  {
    label: "Alle",
    href: "/",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    label: "KI Web Creator",
    subtitle: "mit Gemini 2.5 Flash",
    href: "/web-creator",
    genType: "web",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    label: "Sora Video",
    subtitle: "mit Sora von OpenAI",
    href: "/video-generator",
    genType: "video",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
  },
  {
    label: "KI Bilder",
    subtitle: "mit ChatGPT Imagen-1",
    href: "/image-editor",
    genType: "image",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
      </svg>
    ),
  },
  {
    label: "KI Musik",
    subtitle: "mit Suno",
    href: "/music-generator",
    genType: "music",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
      </svg>
    ),
  },
  {
    label: "Verlauf",
    href: "/history",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
];

const headerBgByRoute: Record<string, string> = {
  "/": "#fffbf2",
  "/web-creator": "#fffbf2",
  "/video-generator": "#f8f0ff",
  "/image-editor": "#f0f8ff",
  "/music-generator": "#fff5f0",
  "/history": "#f8f5ff",
};

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const pathname = usePathname();
  const [generating, setGenerating] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const update = () => {
      setGenerating({
        video: isGenerating("video"),
        music: isGenerating("music"),
        web: isGenerating("web"),
        image: isGenerating("image"),
      });
    };
    update();
    const unsubs = [
      subscribe("video", update),
      subscribe("music", update),
      subscribe("web", update),
      subscribe("image", update),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  // Close modal on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Set body background to match page color
  useEffect(() => {
    document.body.style.backgroundColor = headerBgByRoute[pathname] || "#fffbf2";
  }, [pathname]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (menuOpen || buyOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen, buyOpen]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) setMenuOpen(false);
  }, []);

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 h-[72px]" style={{ background: headerBgByRoute[pathname] || "#fffbf2" }}>
        <div className="flex items-center justify-between h-[72px] max-w-[1200px] mx-auto px-8 max-md:px-5">
          <Link
            href={pathname === "/" ? "https://www.lweb.ch" : "/"}
            className="group flex items-center gap-2.5 text-[22px] max-md:text-[17px] font-extrabold text-gunpowder-900 transition-colors"
          >
            <span className="flex items-center justify-center w-9 h-9 max-md:w-8 max-md:h-8 rounded-full bg-gunpowder-50 border border-gunpowder-150 transition-all group-hover:bg-begonia-50 group-hover:border-begonia-200 group-active:scale-95">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gunpowder-500 transition-colors group-hover:text-begonia-400"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[23px] max-md:text-[21px] font-extrabold">Lweb</span>
              <span className="flex items-center gap-1 mt-0.5">
                <svg width="16" height="16" viewBox="0 0 16 16" className="flex-shrink-0">
                  <rect width="16" height="16" rx="3" fill="#EE0000" />
                  <rect x="7" y="3" width="2" height="10" fill="#fff" />
                  <rect x="3" y="7" width="10" height="2" fill="#fff" />
                </svg>
                <span className="text-[13px] max-md:text-[13px] font-semibold text-gunpowder-400">Schweiz</span>
              </span>
            </span>
          </Link>

          {/* Desktop: contact/buy button */}
          <button
            type="button"
            onClick={() => setBuyOpen(true)}
            className="inline-flex items-center gap-1.5 bg-begonia-400 hover:bg-begonia-500 border border-begonia-400 rounded-full px-4 py-1.5 text-[13px] font-semibold text-white transition-all active:scale-95 max-md:hidden cursor-pointer"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            KI Suite erwerben
          </button>

          {/* Mobile: hamburger button */}
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="hidden max-md:flex relative z-[70] items-center justify-center w-10 h-10 rounded-xl bg-gunpowder-50 border border-gunpowder-150 transition-all active:scale-95"
            aria-label="Menü öffnen"
          >
            <div className="flex flex-col gap-[5px] pointer-events-none">
              <span className={`block w-5 h-[2px] bg-gunpowder-700 rounded-full transition-all duration-300 ${menuOpen ? "rotate-45 translate-y-[7px]" : ""}`} />
              <span className={`block w-5 h-[2px] bg-gunpowder-700 rounded-full transition-all duration-300 ${menuOpen ? "opacity-0 scale-0" : ""}`} />
              <span className={`block w-5 h-[2px] bg-gunpowder-700 rounded-full transition-all duration-300 ${menuOpen ? "-rotate-45 -translate-y-[7px]" : ""}`} />
            </div>
          </button>
        </div>
      </header>

      {/* Mobile modal overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm md:hidden animate-fadeIn"
          onClick={handleBackdropClick}
        >
          <div className="absolute top-[80px] left-4 right-4 bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-gunpowder-100 overflow-hidden animate-slideDown">
            {/* Header */}
            <div className="px-5 pt-5 pb-3 border-b border-gunpowder-100">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-bold text-gunpowder-400 uppercase tracking-wider">Navigation</p>
                <div className="inline-flex items-center gap-1.5 bg-cerulean-25 border border-cerulean-100 rounded-full px-2.5 py-1 text-[11px] font-semibold text-cerulean-500">
                  <span className="w-1.5 h-1.5 bg-[#4dd35b] rounded-full animate-pulse" />
                  Online
                </div>
              </div>
            </div>

            {/* Tab links */}
            <nav className="p-3">
              {tabs.map((tab) => {
                const isActive = pathname === tab.href;
                const isGen = tab.genType ? generating[tab.genType] : false;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    onClick={() => setMenuOpen(false)}
                    className={`relative flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-[15px] font-semibold transition-all duration-200 ${
                      isActive
                        ? "bg-begonia-400 text-white shadow-[0_4px_16px_rgba(254,108,117,0.25)]"
                        : "text-gunpowder-600 hover:bg-gunpowder-50"
                    }`}
                  >
                    <span className={`flex-shrink-0 ${isActive ? "text-white" : "text-gunpowder-400"}`}>
                      {tab.icon}
                    </span>
                    <span className="flex flex-col">
                      <span>{tab.label}</span>
                      {tab.subtitle && (
                        <span className={`text-[11px] font-medium ${isActive ? "text-white/70" : "text-gunpowder-400"}`}>
                          {tab.subtitle}
                        </span>
                      )}
                    </span>
                    {isGen && (
                      <span className="ml-auto w-2.5 h-2.5 bg-[#4dd35b] rounded-full animate-pulse" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Buy button */}
            <div className="px-3 pb-3">
              <button
                type="button"
                onClick={() => { setMenuOpen(false); setTimeout(() => setBuyOpen(true), 200); }}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-begonia-400 hover:bg-begonia-500 text-white text-[15px] font-bold transition-all active:scale-[0.98] shadow-[0_4px_16px_rgba(254,108,117,0.25)]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                KI Suite erwerben
              </button>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gunpowder-100 bg-gunpowder-50/50">
              <p className="text-[12px] text-gunpowder-400 text-center font-medium">
                KI Generator ist ein Produkt von Lweb Schweiz 🇨🇭
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Buy / Contact modal */}
      {buyOpen && (
        <div
          className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={(e) => { if (e.target === e.currentTarget) setBuyOpen(false); }}
        >
          <div className="relative w-full max-w-[620px] bg-white rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,0.2)] overflow-hidden animate-slideDown">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setBuyOpen(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gunpowder-100 hover:bg-gunpowder-200 transition-colors"
              aria-label="Schliessen"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>

            {/* Header */}
            <div className="px-8 pt-8 pb-5 border-b border-gunpowder-100 bg-gradient-to-br from-gunpowder-900 to-gunpowder-800 text-white">
              <div className="flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 16 16" className="flex-shrink-0">
                  <rect width="16" height="16" rx="3" fill="#EE0000" />
                  <rect x="7" y="3" width="2" height="10" fill="#fff" />
                  <rect x="3" y="7" width="10" height="2" fill="#fff" />
                </svg>
                <span className="text-[13px] font-semibold text-white/60">Lweb Schweiz</span>
              </div>
              <h2 className="text-[24px] max-md:text-[20px] font-extrabold leading-tight">KI Creator Suite kaufen</h2>
              <p className="text-[14px] text-white/70 mt-2 leading-relaxed">
                Die komplette KI-Suite — fertig für Agenturen, Freelancer und Content Creator.
                Einfach Ihre eigenen API-Keys einsetzen und sofort produktiv arbeiten.
              </p>
              <p className="text-[13px] text-white/50 mt-1">
                Optimiert für den DACH-Markt (Schweiz, Deutschland, Österreich)
              </p>
            </div>

            {/* Pricing plans */}
            <div className="px-8 py-6 space-y-3">
              <p className="text-[12px] font-bold text-gunpowder-400 uppercase tracking-wider mb-3">Pakete — Einmalzahlung</p>

              {/* Plan 1 */}
              <div className="flex items-center justify-between p-4 rounded-2xl border border-gunpowder-100 hover:border-cerulean-200 hover:bg-cerulean-25/50 transition-all">
                <div>
                  <p className="text-[15px] font-bold text-gunpowder-900">Web Generierung</p>
                  <p className="text-[13px] text-gunpowder-400 mt-0.5">Webseiten erstellen &amp; bearbeiten mit KI</p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-[22px] font-extrabold text-gunpowder-900">1&apos;500 <span className="text-[14px] font-semibold text-gunpowder-400">CHF</span></p>
                </div>
              </div>

              {/* Plan 2 */}
              <div className="relative flex items-center justify-between p-4 rounded-2xl border-2 border-begonia-300 bg-begonia-25/50">
                <span className="absolute -top-2.5 left-4 bg-begonia-400 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">Beliebt</span>
                <div>
                  <p className="text-[15px] font-bold text-gunpowder-900">Web + Bilder + Musik</p>
                  <p className="text-[13px] text-gunpowder-400 mt-0.5">Webseiten, Bildgenerierung &amp; Musik mit KI</p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-[22px] font-extrabold text-gunpowder-900">3&apos;500 <span className="text-[14px] font-semibold text-gunpowder-400">CHF</span></p>
                </div>
              </div>

              {/* Plan 3 */}
              <div className="flex items-center justify-between p-4 rounded-2xl border border-gunpowder-100 hover:border-cerulean-200 hover:bg-cerulean-25/50 transition-all">
                <div>
                  <p className="text-[15px] font-bold text-gunpowder-900">Komplett-Paket</p>
                  <p className="text-[13px] text-gunpowder-400 mt-0.5">Webseiten, Bilder, Musik &amp; Video — alles inklusive</p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-[22px] font-extrabold text-gunpowder-900">4&apos;900 <span className="text-[14px] font-semibold text-gunpowder-400">CHF</span></p>
                </div>
              </div>
            </div>

            {/* Info + CTA */}
            <div className="px-8 pb-8">
              <div className="bg-gunpowder-50 rounded-2xl p-4 mb-3">
                <p className="text-[13px] text-gunpowder-500 leading-relaxed">
                  <span className="font-bold text-gunpowder-700">So funktioniert es:</span> Sie erhalten die komplette Web-App genau so, wie Sie sie hier sehen. Sie müssen nur Ihre eigenen API-Keys hinterlegen — fertig. Kein weiterer Aufwand nötig.
                </p>
              </div>
              <div className="bg-cerulean-25 border border-cerulean-100 rounded-2xl p-4 mb-5">
                <p className="text-[13px] text-gunpowder-500 leading-relaxed">
                  <span className="font-bold text-cerulean-600">API-Keys günstig erhalten:</span> Alle benötigten API-Keys (OpenAI, Gemini, Suno) können Sie über{" "}
                  <a href="https://kie.ai" target="_blank" rel="noopener noreferrer" className="font-bold text-cerulean-500 underline hover:text-cerulean-700 transition-colors">kie.ai</a>
                  {" "}zu einem sehr guten Preis beziehen — deutlich günstiger als direkt bei den einzelnen Anbietern.
                </p>
              </div>
              <a
                href="https://wa.me/41765608645?text=Hallo%20Lweb%2C%20ich%20interessiere%20mich%20f%C3%BCr%20die%20KI%20Creator%20Suite.%20K%C3%B6nnte%20ich%20bitte%20einen%20Probecode%20erhalten%3F"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[#25D366] hover:bg-[#1fb855] text-white text-[15px] font-bold transition-all active:scale-[0.98] shadow-[0_4px_16px_rgba(37,211,102,0.3)]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp — Probecode anfordern
              </a>
              <p className="text-[12px] text-gunpowder-400 text-center mt-3">
                +41 76 560 86 45 · Alle Preise in CHF, einmalig, inkl. Source-Code &amp; Lizenz
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
