import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { flattenTiers, getScores } from "@/lib/api";
import { getTier } from "@/lib/constants";
import RankingExplorer from "@/components/ranking/RankingExplorer";
import type { RankedItem } from "@/components/ranking/FullRankTable";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const metadata: Metadata = {
  title: "DSE Stock Rankings by Fundamental Score",
  description:
    "All Dhaka Stock Exchange (DSE) listed companies ranked 1–N by fundamental score. View Strong Buy, Buy, Wait & Watch, and Risky tiers with price, profit growth, and dividend yield.",
  alternates: { canonical: "/dsestockranking" },
  openGraph: {
    title: "DSE Stock Rankings by Fundamental Score",
    description: "All DSE companies ranked by fundamental score.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DSE Stock Rankings by Fundamental Score",
    description: "All DSE listed companies ranked 1–N by fundamental score with price, profit growth, and dividend yield.",
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

  const { tiers } = scores;

  const updated = scores.computed_at
    ? new Date(scores.computed_at).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  // Flatten all API tiers and re-classify client-side via getTier
  const allRanked: RankedItem[] = flattenTiers(scores).map((i) => ({
    ...i,
    tier: getTier(i.score),
  }));

  // Build counts from re-classified tiers
  const counts: Record<string, number> = {};
  for (const item of allRanked) {
    counts[item.tier] = (counts[item.tier] ?? 0) + 1;
  }

  // Unique sector list for the sector filter
  const sectors = Array.from(
    new Set(allRanked.map((i) => i.sector).filter((s): s is string => Boolean(s)))
  ).sort((a, b) => a.localeCompare(b));

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${BASE_URL}/dsestockranking`,
        url: `${BASE_URL}/dsestockranking`,
        name: "DSE Stock Rankings by Fundamental Score",
        description:
          "All Dhaka Stock Exchange (DSE) listed companies ranked by fundamental score with price, profit growth, and dividend yield.",
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
          Powered by TopStockBD
        </div>
        <h1 className="rank-page-title font-display">
          DSE Stock <span className="rank-title-accent">Rankings</span>
        </h1>
        <p className="rank-page-lead">
          All DSE stocks, ranked from strongest to weakest.
        </p>
        <div className="rank-page-meta-row">
          <span className="rank-page-meta">{allRanked.length} companies ranked</span>
          {updated && <span className="rank-page-meta">Updated {updated}</span>}
          <Link prefetch={false} href="/stocks" className="rank-page-aside">
            Browse the full <strong>A–Z list</strong> →
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
