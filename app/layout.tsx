import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import TabNav from "@/components/TabNav";

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
        <main className="flex-1">{children}</main>
        <footer className="bg-gunpowder-900 text-white py-8">
          <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between">
            <p className="text-[13px] text-gunpowder-500">
              &copy; 2026{" "}
              <a href="/" className="text-gunpowder-400 hover:text-white transition-colors">
                Lweb
              </a>{" "}
              — KI Creator Suite
            </p>
            <p className="text-[13px] text-gunpowder-500">
              Powered by Gemini & OpenAI Sora
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
