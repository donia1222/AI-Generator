import Link from "next/link";

export const metadata = { title: "Produkt | Lweb KI Creator Suite" };

const modules = [
  {
    name: "KI Web Creator",
    api: "Google Gemini 2.5 Flash",
    desc: "Komplette Webseiten generieren und bearbeiten — HTML, CSS & JavaScript in Echtzeit.",
    route: "/web-creator",
  },
  {
    name: "Sora Video Generator",
    api: "OpenAI Sora",
    desc: "KI-Videos aus Text-Prompts generieren — bis zu 1080p Auflösung.",
    route: "/video-generator",
  },
  {
    name: "KI Bilder Generator",
    api: "OpenAI ChatGPT Imagen",
    desc: "Fotorealistische Bilder und Grafiken per Prompt erstellen.",
    route: "/image-editor",
  },
  {
    name: "KI Musik Generator",
    api: "Suno AI",
    desc: "Songs mit Gesang, Instrumentals und Lyrics generieren — verschiedene Genres.",
    route: "/music-generator",
  },
];

const techStack = [
  { label: "Framework", value: "Next.js 14 (App Router)" },
  { label: "Sprache", value: "TypeScript" },
  { label: "Frontend", value: "React 18" },
  { label: "Styling", value: "Tailwind CSS 3.4" },
  { label: "Hosting", value: "Vercel" },
  { label: "Analytics", value: "Vercel Analytics" },
  { label: "Bildverarbeitung", value: "Sharp" },
  { label: "APIs", value: "OpenAI, Google GenAI, Suno" },
];

export default function Produkt() {
  return (
    <div className="max-w-[700px] mx-auto px-6 py-16 max-md:py-10">
      <Link href="/" className="text-[13px] text-gunpowder-400 hover:text-gunpowder-700 transition-colors">&larr; Zurück</Link>
      <h1 className="text-[28px] font-extrabold text-gunpowder-900 mt-4 mb-2">KI Creator Suite</h1>
      <p className="text-[15px] text-gunpowder-400 mb-10">Alles, was Sie für KI-gestützte Content-Erstellung brauchen — in einer Web-App.</p>

      {/* Modules */}
      <div className="space-y-8">
        <div>
          <p className="text-[12px] font-bold text-gunpowder-400 uppercase tracking-wider mb-4">4 Module inklusive</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {modules.map((m) => (
              <div key={m.route} className="p-4 rounded-2xl border border-gunpowder-100 hover:border-cerulean-200 hover:bg-cerulean-25/50 transition-all">
                <p className="text-[15px] font-bold text-gunpowder-900">{m.name}</p>
                <p className="text-[12px] font-semibold text-cerulean-500 mt-0.5">{m.api}</p>
                <p className="text-[13px] text-gunpowder-400 mt-1.5 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        <div>
          <p className="text-[12px] font-bold text-gunpowder-400 uppercase tracking-wider mb-4">Tech-Stack</p>
          <div className="bg-gunpowder-50 rounded-2xl overflow-hidden">
            {techStack.map((item, i) => (
              <div key={item.label} className={`flex items-center justify-between px-5 py-3 ${i < techStack.length - 1 ? "border-b border-gunpowder-100" : ""}`}>
                <span className="text-[13px] font-semibold text-gunpowder-500">{item.label}</span>
                <span className="text-[13px] font-bold text-gunpowder-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* API Routes */}
        <div>
          <p className="text-[12px] font-bold text-gunpowder-400 uppercase tracking-wider mb-4">API-Endpunkte (9 Routes)</p>
          <div className="bg-gunpowder-900 rounded-2xl p-5 space-y-1.5">
            {[
              "POST /api/generate-website",
              "POST /api/generate-video",
              "GET  /api/video-status",
              "POST /api/generate-image",
              "POST /api/generate-music",
              "POST /api/upload-audio",
              "POST /api/transcribe-audio",
              "POST /api/mix-audio",
              "POST /api/verify-password",
            ].map((route) => (
              <p key={route} className="text-[13px] font-mono text-cerulean-400">{route}</p>
            ))}
          </div>
        </div>

        {/* Components */}
        <div>
          <p className="text-[12px] font-bold text-gunpowder-400 uppercase tracking-wider mb-4">Komponenten (7)</p>
          <div className="flex flex-wrap gap-2">
            {["Header", "TabNav", "MiniPlayer", "VideoPlayer", "ProgressBar", "TemplateCard", "PasswordModal"].map((c) => (
              <span key={c} className="px-3 py-1.5 rounded-full bg-gunpowder-50 border border-gunpowder-100 text-[13px] font-semibold text-gunpowder-700">{c}</span>
            ))}
          </div>
        </div>

        {/* Features */}
        <div>
          <p className="text-[12px] font-bold text-gunpowder-400 uppercase tracking-wider mb-4">Features</p>
          <ul className="space-y-2">
            {[
              "Responsive Design — optimiert für Desktop, Tablet & Mobile",
              "Vollständig in Deutsch — UI & Prompts für den DACH-Markt",
              "Verlauf — alle Generierungen lokal gespeichert",
              "Mini-Player für Musik — spielt im Hintergrund weiter",
              "Live-Generierungsstatus im Header & Navigation",
              "Passwortschutz — optional aktivierbar",
              "Eigene API-Keys — volle Kontrolle über Kosten",
              "Vercel-ready — direkt deployen, keine Server-Konfiguration",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-[14px] text-gunpowder-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4dd35b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5"><polyline points="20 6 9 17 4 12"/></svg>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Pricing */}
        <div>
          <p className="text-[12px] font-bold text-gunpowder-400 uppercase tracking-wider mb-4">Preise — Einmalzahlung</p>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-4 rounded-2xl border border-gunpowder-100">
              <div>
                <p className="text-[15px] font-bold text-gunpowder-900">Web Generierung</p>
                <p className="text-[12px] text-gunpowder-400">1 Modul</p>
              </div>
              <p className="text-[22px] font-extrabold text-gunpowder-900">1&apos;500 <span className="text-[13px] font-semibold text-gunpowder-400">CHF</span></p>
            </div>
            <div className="relative flex items-center justify-between p-4 rounded-2xl border-2 border-begonia-300 bg-begonia-25/50">
              <span className="absolute -top-2.5 left-4 bg-begonia-400 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">Beliebt</span>
              <div>
                <p className="text-[15px] font-bold text-gunpowder-900">Web + Bilder + Musik</p>
                <p className="text-[12px] text-gunpowder-400">3 Module</p>
              </div>
              <p className="text-[22px] font-extrabold text-gunpowder-900">3&apos;500 <span className="text-[13px] font-semibold text-gunpowder-400">CHF</span></p>
            </div>
            <div className="flex items-center justify-between p-4 rounded-2xl border border-gunpowder-100">
              <div>
                <p className="text-[15px] font-bold text-gunpowder-900">Komplett-Paket</p>
                <p className="text-[12px] text-gunpowder-400">Alle 4 Module</p>
              </div>
              <p className="text-[22px] font-extrabold text-gunpowder-900">4&apos;900 <span className="text-[13px] font-semibold text-gunpowder-400">CHF</span></p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="pt-2">
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
  );
}
