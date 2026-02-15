"use client";

import Link from "next/link";


const tools = [
  {
    title: "KI Web Creator",
    desc: "Beschreibe deine Traumwebsite und unsere KI erstellt sie in Sekunden.",
    href: "/web-creator",
    gradient: "from-begonia-400 to-rose-500",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    title: "Sora Video",
    desc: "Beschreibe dein Video und Sora generiert es für dich in Minuten.",
    href: "/video-generator",
    gradient: "from-purple-500 to-pink-500",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
  },
  {
    title: "KI Musik",
    desc: "Erstelle Songs, lade Audio hoch oder mixe Stimme mit KI-Instrumentals.",
    href: "/music-generator",
    gradient: "from-orange-500 to-rose-500",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
  },
  {
    title: "Verlauf",
    desc: "Deine letzten 10 Generierungen — Videos, Songs und Websites.",
    href: "/history",
    gradient: "from-gunpowder-600 to-gunpowder-800",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
];

export default function Home() {
  return (
    <section className="bg-gradient-to-b from-[#fffbf2] to-white py-20 min-h-[70vh]">
      <div className="max-w-[1000px] mx-auto px-6">
        <div className="text-center mb-14">
          <h1 className="text-[56px] leading-[1.1] font-extrabold tracking-[-0.02em] text-gunpowder-900 mb-4 max-md:text-[36px]">
            KI Creator{" "}
            <span className="text-begonia-400">Suite</span>
          </h1>
          <p className="text-[18px] leading-relaxed text-gunpowder-500">
            Websites, Videos und Musik — alles mit KI generiert.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6 max-md:grid-cols-1">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group bg-white rounded-2xl border border-gunpowder-150 overflow-hidden shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5"
            >
              <div className={`bg-gradient-to-r ${tool.gradient} px-6 py-5`}>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white backdrop-blur-sm">
                  {tool.icon}
                </div>
              </div>
              <div className="px-6 py-5">
                <h3 className="text-lg font-bold text-gunpowder-900 mb-1 group-hover:text-begonia-400 transition-colors">
                  {tool.title}
                </h3>
                <p className="text-sm text-gunpowder-500 leading-relaxed">
                  {tool.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
