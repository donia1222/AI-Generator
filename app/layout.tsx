import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import Header from "@/components/Header";
import TabNav from "@/components/TabNav";
import MiniPlayer from "@/components/MiniPlayer";

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
        <main className="flex-1 max-md:pt-[84px] overflow-x-clip">{children}</main>
        <MiniPlayer />
        <footer className="bg-gunpowder-900 text-white py-8 max-md:py-6">
          <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between max-md:flex-col max-md:gap-2 max-md:px-4">
            <p className="text-[13px] text-gunpowder-500">
              &copy; 2026{" "}
              <a href="/" className="text-gunpowder-400 hover:text-white transition-colors">
                Lweb
              </a>{" "}
              — KI Creator Suite
            </p>
            <p className="text-[13px] text-gunpowder-500">
              Bilder von{" "}
              <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="text-gunpowder-400 hover:text-white transition-colors">
                Unsplash
              </a>{" "}
              · Powered by Gemini & OpenAI Sora
            </p>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}