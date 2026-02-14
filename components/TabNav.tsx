"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "KI Web Creator", href: "/web-creator" },
  { label: "Sora Video", href: "/video-generator" },
  { label: "KI Musik", href: "/music-generator" },
];

export default function TabNav() {
  const pathname = usePathname();

  return (
    <div className="flex justify-center pt-[84px] pb-4 bg-gradient-to-b from-white to-[#fffbf2]">
      <div className="inline-flex bg-gunpowder-50 rounded-full p-1 border border-gunpowder-150">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-6 py-2.5 rounded-full text-[15px] font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-begonia-400 text-white shadow-[0_4px_16px_rgba(254,108,117,0.35)]"
                  : "text-gunpowder-500 hover:text-gunpowder-700"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
