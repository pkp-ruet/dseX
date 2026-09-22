import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, Space_Grotesk, Hind_Siliguri } from "next/font/google";
import "./globals.css";
// Page-area styles, layered AFTER globals.css so an equal-specificity rule here
// wins. One file per area; globals.css holds tokens + shared primitives only.
import "./styles/page-shell.css";
import "./styles/tables.css";
import "./styles/lists.css";
import "./styles/stock.css";
import "./styles/nav.css";
import "./styles/states.css";
import "./styles/misc.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

// Bengali web font for the বাংলা ব্লগ (/blog). Latin-only fonts above carry no
// Bengali glyphs, so Bengali text is opted into this via the `.font-bn` utility.
const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-bengali",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-grotesk",
  display: "swap",
});
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import MobileBottomBar from "@/components/layout/MobileBottomBar";
import GlobalSearch from "@/components/layout/GlobalSearch";
import MarketDataBanner from "@/components/layout/MarketDataBanner";
import ConditionalAnalytics from "@/components/analytics/ConditionalAnalytics";
import { AuthProvider } from "@/context/AuthContext";
import { LangProvider } from "@/context/LangContext";
import GoogleAuthProvider from "@/components/auth/GoogleAuthProvider";
import Toaster from "@/components/ui/Toaster";
import PingTracker from "@/components/analytics/PingTracker";
import FeedbackPrompt from "@/components/feedback/FeedbackPrompt";
import PushOptInPrompt from "@/components/push/PushOptInPrompt";
import PushAlertBanner from "@/components/push/PushAlertBanner";
import InstallPrompt from "@/components/pwa/InstallPrompt";

// Same navy as the manifest theme_color so the browser chrome matches the navbar
// in a normal tab too, not only when installed.
export const viewport: Viewport = {
  themeColor: "#2A3644",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com"),
  title: {
    default: "TopStockBD | DSE Stock Analysis, Rankings & Share Price",
    template: "%s | TopStockBD",
  },
  description:
    "Free fundamental analysis, stock scores, and daily Buy / Sell signals for every Dhaka Stock Exchange (DSE) listed company. See which stocks rate Excellent, Good, Average, or Weak before you invest.",
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
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TopStockBD",
  },
  verification: {
    google: "IEdSLL4EJwfqeGpnYWMoAS3v7Kgx05grQIapfE9f0CQ",
  },
  other: {
    "google-adsense-account": "ca-pub-5290023077207312",
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
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} ${hindSiliguri.variable}`}>
      <body className="min-h-screen flex flex-col">
        <a href="#main" className="skip-link">Skip to content</a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSON_LD) }}
        />
        <AuthProvider>
          <LangProvider>
          <GoogleAuthProvider>
            <PingTracker />
            <Navbar />
            {/* Spacer occupies the fixed navbar's 56px so the banner sits just below it */}
            <div aria-hidden="true" className="h-14 shrink-0" />
            <MarketDataBanner />
            <PushAlertBanner />
            {/* Bottom-bar clearance lives on the Footer (it is the last thing on the page) */}
            <main id="main" tabIndex={-1} className="flex-1 max-w-5xl mx-auto w-full min-w-0 px-4 sm:px-6 pb-8 md:pb-10">
              {children}
            </main>
            <Footer />
            <MobileBottomBar />
            <GlobalSearch />
            <Toaster />
            <FeedbackPrompt />
            <PushOptInPrompt />
            <InstallPrompt />
          </GoogleAuthProvider>
          </LangProvider>
        </AuthProvider>
        {process.env.NEXT_PUBLIC_GA_ID && (
          <ConditionalAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
        {process.env.NODE_ENV === "production" && (
          <Script
            id="adsense-loader"
            src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5290023077207312"
            strategy="afterInteractive"
            crossOrigin="anonymous"
          />
        )}
      </body>
    </html>
  );
}
