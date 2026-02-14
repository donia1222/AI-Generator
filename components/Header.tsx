"use client";

import Link from "next/link";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-white/92 backdrop-blur-[12px] h-[72px] shadow-[0_1px_0_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between h-[72px] max-w-[1200px] mx-auto px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-[22px] font-extrabold text-gunpowder-900 hover:text-begonia-400 transition-colors"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gunpowder-400"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Lweb
        </Link>
        <div className="inline-flex items-center gap-1.5 bg-cerulean-25 border border-cerulean-100 rounded-full px-3.5 py-1.5 text-[13px] font-semibold text-cerulean-500">
          <span className="w-2 h-2 bg-[#4dd35b] rounded-full animate-pulse" />
          KI Creator Suite
        </div>
      </div>
    </header>
  );
}
