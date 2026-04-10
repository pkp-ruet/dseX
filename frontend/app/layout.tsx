import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com"),
  title: {
    default: "TopStockBD — DSE Stock Rankings & DSEF Scores",
    template: "%s | TopStockBD",
  },
  description:
    "Free fundamental analysis and DSEF scores for all Dhaka Stock Exchange (DSE) listed companies. Find Strong Buy, Safe Buy, Watch, and Avoid tier rankings.",
  keywords: [
    "DSE", "Dhaka Stock Exchange", "Bangladesh stock market", "DSEF score",
    "stock analysis", "DSE stock screener", "Bangladesh stock analysis",
    "DSE undervalued stocks", "top stocks Bangladesh",
  ],
  openGraph: {
    siteName: "TopStockBD",
    type: "website",
  },
};

const ORG_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "TopStockBD",
  url: "https://www.topstockbd.com",
  description:
    "Free fundamental analysis and DSEF scores for all Dhaka Stock Exchange (DSE) listed companies. Rankings, market intelligence, and stock signals for Bangladesh investors.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSON_LD) }}
        />
        <Navbar />
        <main className="flex-1 max-w-5xl mx-auto w-full min-w-0 px-4 sm:px-6 py-6 sm:py-8 pt-14 pb-10">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
