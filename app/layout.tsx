import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import SiteShell from "./SiteShell";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
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
        <SiteShell>{children}</SiteShell>
        <Analytics />
      </body>
    </html>
  );
}