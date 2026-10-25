import type { Metadata } from "next";
import "./globals.css";
import { TopNavigation } from "@/components/hud/TopNavigation";
import { SystemStatusBar } from "@/components/hud/SystemStatusBar";

export const metadata: Metadata = {
  title: "Nexus AI — Futuristic WhatsApp Automation HUD",
  description: "Multi-tenant WhatsApp Automation & Gemini AI Assistant Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col pb-10">
        <TopNavigation />
        <main className="flex-1 max-w-7xl w-full mx-auto p-6">{children}</main>
        <SystemStatusBar />
      </body>
    </html>
  );
}
