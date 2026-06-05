import type { Metadata } from "next";
import Link from "next/link";
import { STOCK_LISTS } from "@/lib/stock-lists";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const metadata: Metadata = {
  title: "DSE Stock Insights — Top Stocks Bangladesh | TopStockBD",
  description:
    "Plain-English stock stories for the Dhaka Stock Exchange — best stocks 2026, top sectors, undervalued picks, high-growth companies, bank rankings, and more. Updated daily from DSE financial data.",
  keywords: [
    "DSE stock insights",
    "top stocks Bangladesh",
    "best shares DSE",
    "Dhaka Stock Exchange lists",
    "best stocks 2026 Bangladesh",
    "best bank stocks DSE 2026",
    "undervalued stocks Bangladesh",
    "high growth stocks DSE",
    "highest dividend stocks Bangladesh",
    "most profitable companies DSE",
  ],
  alternates: { canonical: `${BASE_URL}/stock-insights` },
  openGraph: {
    title: "DSE Stock Insights — Top Stocks Bangladesh | TopStockBD",
    description:
      "Plain-English stock stories for the Dhaka Stock Exchange — best stocks 2026, sector rankings, value picks, and growth leaders.",
    url: `${BASE_URL}/stock-insights`,
    type: "website",
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "DSE Stock Insights — Top Stocks Bangladesh",
    description:
      "Plain-English stock stories for the Dhaka Stock Exchange, built from real company financials.",
    url: `${BASE_URL}/stock-insights`,
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Stock Picks", item: `${BASE_URL}/stock-insights` },
    ],
  },
];

const insightLists = STOCK_LISTS.filter((l) => l.insightMode);
const classicLists = STOCK_LISTS.filter((l) => !l.insightMode);

const featuredLists = [
  {
    href: "/dse-top-20",
    eyebrow: "7-Day Momentum",
    title: "DSE Top 20 Stocks This Week",
    description:
      "The 20 best-performing names on the exchange this week, ranked by price momentum and trading conviction. Refreshed daily.",
  },
  {
    href: "/dse-popular-stocks",
    eyebrow: "Reader Interest",
    title: "DSE Popular Stocks",
    description:
      "The most-read stocks on TopStockBD over the last seven days, with week-on-week rank changes.",
  },
];

export default function StockInsightsPage() {
  return (
    <main className="ed-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Masthead */}
      <header>
        <div className="ed-kicker">
          <span className="dot" aria-hidden="true" />
          Stock Picks
        </div>
        <h1 className="ed-headline">Best Stocks on the DSE</h1>
        <p className="ed-dek">Simple, clear stock picks from the Dhaka Stock Exchange — updated daily.</p>
      </header>

      {/* Featured */}
      <div className="ed-section-label">Featured this week</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {featuredLists.map((list) => (
          <Link key={list.href} href={list.href} className="ed-hub-feature group">
            <div className="ed-hub-eyebrow">{list.eyebrow}</div>
            <h2 className="ed-hub-title">{list.title}</h2>
            <p className="ed-hub-desc">{list.description}</p>
            <span className="ed-hub-cta">Read the story →</span>
          </Link>
        ))}
      </div>

      {/* Editorial stories */}
      <div className="ed-section-label">The shortlists</div>
      <div className="ed-hub-grid">
        {insightLists.map((list) => (
          <Link key={list.slug} href={`/stock-insights/${list.slug}`} className="ed-hub-card">
            <div className="ed-hub-eyebrow">{list.shortName}</div>
            <h2 className="ed-hub-title">{list.displayName}</h2>
            <p className="ed-hub-desc">{list.description}</p>
            <span className="ed-hub-cta">Read →</span>
          </Link>
        ))}
      </div>

      {/* Rankings */}
      <div className="ed-section-label">The rankings</div>
      <div className="ed-hub-grid">
        {classicLists.map((list) => (
          <Link key={list.slug} href={`/stock-insights/${list.slug}`} className="ed-hub-card">
            <div className="ed-hub-eyebrow">{list.metricLabel}</div>
            <h2 className="ed-hub-title">{list.displayName}</h2>
            <p className="ed-hub-desc">{list.description}</p>
            <span className="ed-hub-cta">Read →</span>
          </Link>
        ))}
      </div>

      {/* Footer CTA */}
      <div className="ed-nav">
        <Link href="/dsestockranking" className="ed-btn ed-btn-primary">
          See the full leaderboard
        </Link>
        <Link href="/" className="ed-btn ed-btn-ghost">
          Back home
        </Link>
      </div>
    </main>
  );
}
