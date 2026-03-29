import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: {
    default: "dseX — DSE Stock Rankings & DSEF Scores",
    template: "%s | dseX",
  },
  description:
    "Free fundamental analysis and DSEF scores for all Dhaka Stock Exchange (DSE) listed companies. Find Strong Buy, Safe Buy, Watch, and Avoid tier rankings.",
  keywords: ["DSE", "Dhaka Stock Exchange", "Bangladesh stock market", "DSEF score", "stock analysis"],
  openGraph: {
    siteName: "dseX",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 pt-14">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
