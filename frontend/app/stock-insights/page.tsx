import type { Metadata } from "next";
import Link from "next/link";
import { STOCK_LISTS } from "@/lib/stock-lists";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const metadata: Metadata = {
  title: "DSE Stock Insights — Top Stocks Bangladesh | TopStockBD",
  description:
    "Curated top-20 stock insights for the Dhaka Stock Exchange — best dividend stocks, highest EPS, most profitable companies, largest by market cap, and more. Updated daily from DSE financial data.",
  keywords: [
    "DSE stock insights",
    "top stocks Bangladesh",
    "best shares DSE",
    "Dhaka Stock Exchange lists",
    "highest dividend stocks Bangladesh",
    "most profitable companies DSE",
    "best EPS stocks Bangladesh",
    "largest companies Bangladesh stock market",
  ],
  alternates: { canonical: `${BASE_URL}/stock-insights` },
  openGraph: {
    title: "DSE Stock Insights — Top Stocks Bangladesh | TopStockBD",
    description:
      "Curated top-20 stock insights for the Dhaka Stock Exchange — best dividend stocks, highest EPS, most profitable companies, and more.",
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
      "Curated top-20 stock insights for the Dhaka Stock Exchange based on actual financial metrics.",
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

export default function StockInsightsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 space-y-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-[var(--ink)]">
          DSE Stock Insights
        </h1>
        <p className="text-[var(--ink-muted)] text-base leading-relaxed max-w-xl mx-auto">
          Curated top-20 rankings based on actual financial data from the Dhaka Stock Exchange —
          dividends, earnings, profitability, market cap, and more. Updated daily.
        </p>
      </section>

      {/* List cards */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {STOCK_LISTS.map((list) => (
            <Link
              key={list.slug}
              href={`/stock-insights/${list.slug}`}
              className="group flex flex-col gap-3 p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">{list.icon}</span>
                <span className="text-xs text-[var(--ink-muted)] font-medium">Top 20 · {list.metricLabel}</span>
              </div>
              <div>
                <h2 className="font-semibold text-[var(--ink)] text-base leading-snug group-hover:text-[var(--primary)] transition-colors">
                  {list.displayName}
                </h2>
                <p className="mt-1.5 text-sm text-[var(--ink-muted)] leading-relaxed line-clamp-2">
                  {list.description}
                </p>
              </div>
              <span className="mt-auto text-xs font-medium text-[var(--primary)] group-hover:underline">
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
