import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import Header from "@/components/Header";
import TabNav from "@/components/TabNav";
import MiniPlayer from "@/components/MiniPlayer";
import CookieBanner from "@/components/CookieBanner";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};


export const metadata: Metadata = {
  title: "KI Creator Suite | Lweb",
  description:
    "Beschreibe deine Traumwebsite oder generiere Videos mit KI — alles in einem Tool.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="font-jakarta antialiased min-h-screen flex flex-col">
        <Header />
        <TabNav />
        <main className="flex-1 max-md:pt-[60px] overflow-x-clip">{children}</main>
        <MiniPlayer />
        <footer className="bg-gunpowder-900 text-white py-8 max-md:py-6">
          <div className="max-w-[1200px] mx-auto px-6 max-md:px-4">
            <div className="flex items-center justify-between max-md:flex-col max-md:gap-3">
              <p className="text-[13px] text-gunpowder-500">
                &copy; 2026{" "}
                <a href="/" className="text-gunpowder-400 hover:text-white transition-colors">
                  Lweb
                </a>{" "}
                — KI Creator Suite
              </p>
              <nav className="flex items-center gap-2 text-[14px]">
                <a href="/impressum" className="text-gunpowder-500 hover:text-white transition-colors">Impressum</a>
                <span className="text-gunpowder-700">·</span>
                <a href="/datenschutz" className="text-gunpowder-500 hover:text-white transition-colors">Datenschutz</a>
                <span className="text-gunpowder-700">·</span>
                <a href="/agb" className="text-gunpowder-500 hover:text-white transition-colors">AGB</a>
                <span className="text-gunpowder-700">·</span>
                <a href="/kontakt" className="text-gunpowder-500 hover:text-white transition-colors">Kontakt</a>
                <span className="text-gunpowder-700">·</span>
                <a href="/produkt" className="text-gunpowder-500 hover:text-white transition-colors">Code</a>
              </nav>
            </div>
            <p className="text-[12px] text-gunpowder-600 mt-3 max-md:text-center">
              Powered by Gemini &amp; OpenAI Sora
            </p>
          </div>
        </footer>
        <CookieBanner />
        <Analytics />
      </body>
    </html>
  );
}