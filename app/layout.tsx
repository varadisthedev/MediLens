import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const serif = Newsreader({ variable: "--font-serif", subsets: ["latin"], weight: ["400", "500"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "MediLens — Understand your prescription. Privately.",
  description: "Turn a prescription into a clear medication plan, reminders, and daily check-ins, with sensitive information processed locally first.",
};

export const viewport: Viewport = { themeColor: "#F7F5F0" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${serif.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <Nav />
        <main className="flex-1 pb-24 md:pb-0">{children}</main>
        <footer className="hidden md:block border-t border-line py-8 text-center text-xs text-muted">
          MediLens helps you understand what your clinician prescribed. It does not diagnose or give medical advice.
        </footer>
      </body>
    </html>
  );
}
