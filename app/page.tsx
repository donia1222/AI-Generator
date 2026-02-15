"use client";

import Link from "next/link";


const tools = [
  {
    title: "KI Web Creator",
    desc: "Beschreibe deine Traumwebsite und unsere KI erstellt sie in Sekunden.",
    href: "/web-creator",
    chip: "mit Gemini",
    gradient: "from-begonia-400 to-rose-500",
    bgImage: "https://images.unsplash.com/photo-1547658719-da2b51169166?w=800&q=80",
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
    chip: "mit Sora",
    gradient: "from-purple-500 to-pink-500",
    bgImage: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&q=80",
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
    chip: "mit Suno",
    gradient: "from-orange-500 to-rose-500",
    bgImage: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&q=80",
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
    bgImage: "https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=800&q=80",
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
    <section className="bg-gradient-to-b from-[#fffbf2] to-white py-20 min-h-[70vh] max-md:py-12 ">
      <div className="max-w-[1000px] mx-auto px-6 max-md:px-4">
        <div className="text-center mb-14 max-md:mb-8">
          <h1 className="text-[64px] leading-[1.1] font-extrabold tracking-[-0.02em] text-gunpowder-900 mb-4 max-md:text-[30px]">
            KI Creator{" "}
            <span className="text-begonia-400">Suite</span>
          </h1>
          <p className="text-[20px] leading-relaxed text-gunpowder-500 max-md:text-[16px]">
            Websites, Videos und Musik — alles mit KI generiert.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6 max-md:grid-cols-1 max-md:gap-4">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group bg-white rounded-2xl border border-gunpowder-150 overflow-hidden shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5"
            >
              <div className="relative px-6 py-5 overflow-hidden">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url('${tool.bgImage}')` }}
                />
                <div className={`absolute inset-0 bg-gradient-to-r ${tool.gradient} opacity-70`} />
                <div className="relative w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white backdrop-blur-sm">
                  {tool.icon}
                </div>
              </div>
              <div className="px-6 py-5">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg max-md:text-[18px] font-bold text-gunpowder-900 group-hover:text-begonia-400 transition-colors">
                    {tool.title}
                  </h3>
                  {tool.chip && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] max-md:text-[13px] font-bold bg-gunpowder-100 text-gunpowder-500">
                      {tool.chip}
                    </span>
                  )}
                </div>
                <p className="text-sm max-md:text-[15px] text-gunpowder-500 leading-relaxed">
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
