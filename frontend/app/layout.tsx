import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import MobileBottomBar from "@/components/layout/MobileBottomBar";
import GlobalSearch from "@/components/layout/GlobalSearch";
import { GoogleAnalytics } from "@next/third-parties/google";
import { AuthProvider } from "@/context/AuthContext";
import GoogleAuthProvider from "@/components/auth/GoogleAuthProvider";
import PingTracker from "@/components/analytics/PingTracker";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com"),
  title: {
    default: "TopStockBD | DSE Stock Analysis, Rankings & Share Price",
    template: "%s | TopStockBD",
  },
  description:
    "Free fundamental analysis and DSEF scores for all Dhaka Stock Exchange (DSE) listed companies. Find Strong Buy, Safe Buy, Watch, and Avoid tier rankings.",
  keywords: [
    "DSE", "Dhaka Stock Exchange", "DSEX", "Bangladesh stock market",
    "share market Bangladesh", "BD stock market", "DSE share price",
    "DSE share price list", "DSE today", "DSE live", "DSE news",
    "DSEF score", "stock analysis", "DSE stock screener",
    "Bangladesh stock analysis", "DSE undervalued stocks", "top stocks Bangladesh",
    "how to invest in DSE", "how to invest in stock market Bangladesh",
    "how to buy shares in Bangladesh", "how to open BO account Bangladesh",
    "fundamental analysis Bangladesh", "DSE fundamental analysis",
    "PE ratio Bangladesh", "DSE PE ratio",
    "best stocks in Bangladesh", "top stocks DSE",
    "dividend stocks Bangladesh", "high dividend DSE",
    "blue chip stocks Bangladesh", "undervalued stocks DSE",
    "DSE top gainers", "DSE top losers today",
    "Bangladesh stock market guide",
  ],
  openGraph: {
    siteName: "TopStockBD",
    type: "website",
  },
  verification: {
    google: "IEdSLL4EJwfqeGpnYWMoAS3v7Kgx05grQIapfE9f0CQ",
  },
};

const ORG_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "TopStockBD",
  url: "https://www.topstockbd.com",
  description:
    "Free DSE share price live data, Dhaka Stock Exchange (DSEX) rankings, Bangladesh stock market news, DSE share price list, BD stock market signals, and DSE news — fundamental analysis for every DSE-listed company.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSON_LD) }}
        />
        <AuthProvider>
          <GoogleAuthProvider>
            <PingTracker />
            <Navbar />
            <main className="flex-1 max-w-5xl mx-auto w-full min-w-0 px-4 sm:px-6 py-6 sm:py-8 pt-14 sm:pt-14 pb-20 md:pb-10">
              {children}
            </main>
            <Footer />
            <MobileBottomBar />
            <GlobalSearch />
          </GoogleAuthProvider>
        </AuthProvider>
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
      </body>
    </html>
  );
}
