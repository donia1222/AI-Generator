"use client";

import { useRef, useEffect, useState } from "react";
import { TEMPLATE_NAMES } from "@/lib/prompts";

const TEMPLATE_COLORS = [
  ["#1a1a2e", "#d4a574", "#f5f0eb", "#8b6914"],
  ["#0f0f0f", "#ff4d4d", "#00d4aa", "#ffffff"],
  ["#ffffff", "#1d1d1f", "#0071e3", "#f5f5f7"],
  ["#f0faf7", "#2a9d8f", "#264653", "#e9c46a"],
];

const TEMPLATE_DESCRIPTIONS = [
  "Elegantes dunkles Design mit warmen Goldakzenten",
  "Energetisches Design mit kräftigen Farben",
  "Minimalistisch mit viel Weissraum und Typografie",
  "Vertrauenswürdig mit beruhigenden sanften Tönen",
];

interface TemplateCardProps {
  index: number;
  html: string;
  isSelected: boolean;
  onClick: () => void;
}

export default function TemplateCard({ index, html, isSelected, onClick }: TemplateCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.24);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScale = () => {
      const containerWidth = container.offsetWidth;
      setScale(containerWidth / 1200);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Inject CSS to shrink hero and sections for thumbnail view
  const thumbCSS = `<style>
    .hero{min-height:auto !important;padding:60px 24px 40px !important}
    nav{position:relative !important;padding:10px 0 !important}
    .section{padding:40px 24px !important}
  </style>`;
  const thumbHTML = html.replace("</head>", thumbCSS + "</head>");

  return (
    <div
      onClick={onClick}
      className={`relative bg-white rounded-[20px] overflow-hidden cursor-pointer transition-all duration-300 shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:border-begonia-400 hover:-translate-y-1.5 hover:shadow-[0_16px_40px_rgba(0,0,0,0.12)] border-2 ${
        isSelected ? "border-[#4dd35b]" : "border-transparent"
      }`}
    >
      {isSelected && (
        <div className="absolute top-2.5 right-2.5 z-10 drop-shadow-[0_2px_6px_rgba(0,0,0,0.2)]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="12" fill="#4dd35b" />
            <path d="M7 12.5l3 3 7-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      <div ref={containerRef} className="template-preview">
        <iframe
          srcDoc={thumbHTML}
          sandbox="allow-same-origin"
          title={TEMPLATE_NAMES[index]}
          style={{ transform: `scale(${scale})` }}
        />
      </div>

      <div className="p-5">
        <h3 className="text-[16px] font-extrabold text-gunpowder-900 mb-1">
          {TEMPLATE_NAMES[index]}
        </h3>
        <p className="text-[13px] text-gunpowder-400 leading-snug mb-3">
          {TEMPLATE_DESCRIPTIONS[index]}
        </p>
        <div className="flex gap-1.5">
          {TEMPLATE_COLORS[index].map((color, j) => (
            <span
              key={j}
              className="w-5 h-5 rounded-full border-2 border-black/5"
              style={{ background: color }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
