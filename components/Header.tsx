"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { isGenerating, subscribe, type GenType } from "@/lib/generation-store";

const tabs: { label: string; href: string; genType?: GenType; icon: React.ReactNode }[] = [
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
    href: "/video-generator",
    genType: "video",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
  },
  {
    label: "KI Musik",
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

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const [generating, setGenerating] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const update = () => {
      setGenerating({
        video: isGenerating("video"),
        music: isGenerating("music"),
        web: isGenerating("web"),
      });
    };
    update();
    const unsubs = [
      subscribe("video", update),
      subscribe("music", update),
      subscribe("web", update),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  // Close modal on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) setMenuOpen(false);
  }, []);

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 backdrop-blur-[12px] h-[72px]" style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.5) 70%, rgba(255,255,255,0) 100%)" }}>
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

          {/* Desktop: chip */}
          <div className="inline-flex items-center gap-1.5 bg-cerulean-25 border border-cerulean-100 rounded-full px-3.5 py-1.5 text-[13px] font-semibold text-cerulean-500 max-md:hidden">
            <span className="w-2 h-2 bg-[#4dd35b] rounded-full animate-pulse" />
            KI Creator Suite
          </div>

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
                    {tab.label}
                    {isGen && (
                      <span className="ml-auto w-2.5 h-2.5 bg-[#4dd35b] rounded-full animate-pulse" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gunpowder-100 bg-gunpowder-50/50">
              <p className="text-[12px] text-gunpowder-400 text-center font-medium">
                KI Creator Suite — Powered by Gemini, Suno & Sora
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
