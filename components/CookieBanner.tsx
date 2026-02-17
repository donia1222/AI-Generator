"use client";

import { useState, useEffect } from "react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("cookies-ok")) {
      const t = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("cookies-ok", "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-[380px] z-[90] animate-slideDown">
      <div className="bg-gunpowder-900 text-white rounded-2xl px-5 py-4 shadow-[0_8px_30px_rgba(0,0,0,0.25)] border border-gunpowder-700">
        <p className="text-[13px] leading-relaxed text-gunpowder-300">
          Wir verwenden nur technisch notwendige Cookies für den Betrieb der Website.{" "}
          <a href="/datenschutz" className="text-cerulean-400 underline hover:text-cerulean-300 transition-colors">Mehr erfahren</a>
        </p>
        <button
          type="button"
          onClick={accept}
          className="mt-3 w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 text-[13px] font-semibold text-white transition-all active:scale-[0.98]"
        >
          Verstanden
        </button>
      </div>
    </div>
  );
}
