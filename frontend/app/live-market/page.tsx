import type { Metadata } from "next";
import LiveMarketClient from "@/components/live-market/LiveMarketClient";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const metadata: Metadata = {
  title: "Live DSE Market | Real-Time Stock Prices & Index | TopStockBD",
  description:
    "Track real-time Dhaka Stock Exchange prices, DSEX index, top gainers/losers, sector performance, and market breadth during trading hours.",
  keywords: [
    "DSE live market", "Dhaka Stock Exchange live prices", "DSEX index today",
    "DSE stock prices today", "Bangladesh stock market live", "DSE gainers losers",
    "DSE trading today", "share price Bangladesh",
  ],
  alternates: { canonical: `${BASE_URL}/live-market` },
  openGraph: {
    title: "Live DSE Market — Real-Time Prices & Index",
    description:
      "Real-time Dhaka Stock Exchange data: DSEX/DS30 index, live prices, top movers, sector heatmap, and market breadth.",
    url: `${BASE_URL}/live-market`,
    type: "website",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Live DSE Market",
  url: `${BASE_URL}/live-market`,
  description:
    "Real-time Dhaka Stock Exchange market data including live stock prices, index values, and sector performance.",
  isPartOf: { "@type": "WebSite", url: BASE_URL, name: "TopStockBD" },
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Live Market", item: `${BASE_URL}/live-market` },
    ],
  },
};

export default function LiveMarketPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <LiveMarketClient />
      </div>
    </>
  );
}
