"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { isGenerating, subscribe, type GenType } from "@/lib/generation-store";

const tabs: { label: string; href: string; genType?: GenType }[] = [
  { label: "Alle", href: "/" },
  { label: "KI Web Creator", href: "/web-creator", genType: "web" },
  { label: "Sora Video", href: "/video-generator", genType: "video" },
  { label: "KI Bilder", href: "/image-editor", genType: "image" },
  { label: "KI Musik", href: "/music-generator", genType: "music" },
  { label: "Verlauf", href: "/history" },
];

export default function TabNav() {
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

  return (
    <div className="flex justify-center pt-[84px] pb-4 bg-gradient-to-b from-white to-[#fffbf2] max-md:hidden">
      <div className="inline-flex bg-gunpowder-50 rounded-full p-1 border border-gunpowder-150">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          const isGen = tab.genType ? generating[tab.genType] : false;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative px-6 py-2.5 rounded-full text-[15px] font-semibold transition-all duration-200 whitespace-nowrap ${
                isActive
                  ? "bg-begonia-400 text-white shadow-[0_4px_16px_rgba(254,108,117,0.35)]"
                  : "text-gunpowder-500 hover:text-gunpowder-700"
              }`}
            >
              {tab.label}
              {isGen && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#4dd35b] rounded-full animate-pulse border-2 border-white" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
