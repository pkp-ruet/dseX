import type { Metadata } from "next";
import Link from "next/link";
import { STOCK_LISTS } from "@/lib/stock-lists";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const metadata: Metadata = {
  title: "DSE Stock Insights — Top Stocks Bangladesh | TopStockBD",
  description:
    "Curated stock insights for the Dhaka Stock Exchange — best stocks 2026, top sectors, undervalued picks, high-growth companies, bank rankings, and more. Updated daily from DSE financial data.",
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
      "Curated stock insights for the Dhaka Stock Exchange — best stocks 2026, sector rankings, value picks, and growth leaders.",
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
      "Curated stock insights for the Dhaka Stock Exchange based on actual financial metrics and DSEF scoring.",
    url: `${BASE_URL}/stock-insights`,
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Stock Insights", item: `${BASE_URL}/stock-insights` },
    ],
  },
];

const insightLists = STOCK_LISTS.filter((l) => l.insightMode);
const classicLists = STOCK_LISTS.filter((l) => !l.insightMode);

export default function StockInsightsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 space-y-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="text-center space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--ink)]">DSE Stock Insights</h1>
        <p className="text-[var(--ink-muted)] text-base leading-relaxed max-w-xl mx-auto">
          Curated rankings and editorial picks from the Dhaka Stock Exchange — powered by real financial data
          and the DSEF 5-pillar scoring system. Updated daily.
        </p>
      </section>

      {/* Editorial Picks — insight mode */}
      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-[var(--ink)]">Editorial Picks</h2>
          <span className="text-xs border border-[var(--primary)] text-[var(--primary)] rounded-full px-2.5 py-0.5 uppercase tracking-wider font-semibold">
            Auto-updated
          </span>
        </div>
        <p className="text-sm text-[var(--ink-muted)]">
          Each page includes per-stock analysis explaining why it ranked — powered by the DSEF 5-pillar score.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {insightLists.map((list) => (
            <Link
              key={list.slug}
              href={`/stock-insights/${list.slug}`}
              className="group flex flex-col gap-4 p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl" aria-hidden="true">{list.icon}</span>
                <span className="text-sm text-[var(--ink-muted)] font-medium">
                  Insight · {list.metricLabel}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-[var(--ink)] text-lg leading-snug group-hover:text-[var(--primary)] transition-colors">
                  {list.displayName}
                </h3>
                <p className="mt-2 text-sm text-[var(--ink-muted)] leading-relaxed line-clamp-2">
                  {list.description}
                </p>
              </div>
              <span className="mt-auto text-sm font-semibold text-[var(--primary)] group-hover:underline">
                Read insights →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Data Lists — classic metric tables */}
      <section className="space-y-5">
        <h2 className="text-lg font-bold text-[var(--ink)]">Data Lists</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {classicLists.map((list) => (
            <Link
              key={list.slug}
              href={`/stock-insights/${list.slug}`}
              className="group flex flex-col gap-4 p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl" aria-hidden="true">{list.icon}</span>
                <span className="text-sm text-[var(--ink-muted)] font-medium">Top 20 · {list.metricLabel}</span>
              </div>
              <div>
                <h3 className="font-bold text-[var(--ink)] text-lg leading-snug group-hover:text-[var(--primary)] transition-colors">
                  {list.displayName}
                </h3>
                <p className="mt-2 text-sm text-[var(--ink-muted)] leading-relaxed line-clamp-2">
                  {list.description}
                </p>
              </div>
              <span className="mt-auto text-sm font-semibold text-[var(--primary)] group-hover:underline">
                View list →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="text-center space-y-4 pt-2">
        <p className="text-[var(--ink-muted)] text-sm">
          Want scores and tier analysis alongside raw data?
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/dsestockranking"
            className="px-5 py-2.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            View Score Leaderboard
          </Link>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-lg border border-[var(--border)] text-[var(--ink)] text-sm font-medium hover:bg-[var(--surface)] transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </section>
    </main>
  );
}
