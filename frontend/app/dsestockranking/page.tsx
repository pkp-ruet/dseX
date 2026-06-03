import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getScores } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import { getTier } from "@/lib/constants";
import RankingExplorer from "@/components/ranking/RankingExplorer";
import type { RankedItem } from "@/components/ranking/FullRankTable";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const metadata: Metadata = {
  title: "DSE Stock Rankings by Fundamental Score",
  description:
    "All Dhaka Stock Exchange (DSE) listed companies ranked 1–N by DSEF fundamental score. View Strong Buy, Buy, Wait & Watch, and Risky tiers with price, EPS growth, and dividend yield.",
  alternates: { canonical: "/dsestockranking" },
  openGraph: {
    title: "DSE Stock Rankings by Fundamental Score",
    description: "All DSE companies ranked by DSEF fundamental score.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DSE Stock Rankings by Fundamental Score",
    description: "All DSE listed companies ranked 1–N by DSEF fundamental score with price, EPS growth, and dividend yield.",
  },
};

export default async function DseStockRankingPage() {
  const scores = await getScores().catch(() => null);

  if (!scores) {
    return (
      <div className="text-center py-20 text-[var(--text-muted)]">
        Unable to load rankings. Please try again shortly.
      </div>
    );
  }

  const { tiers, computed_at } = scores;

  // Flatten all API tiers and re-classify into 6 frontend tiers
  const allRanked: RankedItem[] = [
    ...tiers.strong_buy,
    ...tiers.safe_buy,
    ...tiers.watch,
    ...tiers.avoid,
  ].map((i) => ({ ...i, tier: getTier(i.score) }));

  // Build counts from re-classified tiers
  const counts: Record<string, number> = {};
  for (const item of allRanked) {
    counts[item.tier] = (counts[item.tier] ?? 0) + 1;
  }

  // Unique sector list for the sector filter
  const sectors = Array.from(
    new Set(allRanked.map((i) => i.sector).filter((s): s is string => Boolean(s)))
  ).sort((a, b) => a.localeCompare(b));

  const dateLabel = computed_at ? formatDate(computed_at.slice(0, 10)) : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${BASE_URL}/dsestockranking`,
        url: `${BASE_URL}/dsestockranking`,
        name: "DSE Stock Rankings by Fundamental Score",
        description:
          "All Dhaka Stock Exchange (DSE) listed companies ranked by DSEF fundamental score with price, EPS growth, and dividend yield.",
        inLanguage: "en",
        isPartOf: { "@id": BASE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "DSE Stock Rankings", item: `${BASE_URL}/dsestockranking` },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
      {/* Page header — editorial */}
      <header className="rank-page-header">
        <div className="rank-page-eyebrow">
          <span className="rank-page-eyebrow-ico" aria-hidden>🏆</span>
          Fundamental Rankings
        </div>
        <h1 className="rank-page-title font-display">
          DSE Stock <span className="rank-title-accent">Rankings</span>
        </h1>
        <p className="rank-page-lead">
          Every Dhaka Stock Exchange company ranked by fundamental score — strongest to
          riskiest, grouped into clear tiers.
        </p>
        <div className="rank-page-meta-row">
          {dateLabel && (
            <span className="rank-page-meta">Updated {dateLabel}</span>
          )}
          <Link href="/dse-top-20" className="rank-page-aside">
            You may also like: <strong>DSE Top 20 This Week</strong>
            <span aria-hidden> →</span>
          </Link>
        </div>
      </header>

      {/* Filters + ranked table */}
      <Suspense>
        <RankingExplorer
          items={allRanked}
          counts={counts}
          total={allRanked.length}
          sectors={sectors}
        />
      </Suspense>
      </div>
    </>
  );
}
