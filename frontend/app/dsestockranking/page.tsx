import type { Metadata } from "next";
import { Suspense } from "react";
import { getScores } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import { getTier } from "@/lib/constants";
import TierStatCards from "@/components/ranking/TierStatCards";
import FullRankTable from "@/components/ranking/FullRankTable";
import type { RankedItem } from "@/components/ranking/FullRankTable";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "DSE Stock Rankings by Fundamental Score",
  description:
    "All Dhaka Stock Exchange (DSE) listed companies ranked 1–N by DSEF fundamental score. View Strong Buy, Good Buy, Safe Buy, Cautious Buy, Keep Watching, and Avoid tiers with price, EPS growth, and dividend yield.",
  openGraph: {
    title: "DSE Stock Rankings by Fundamental Score",
    description: "All DSE companies ranked by DSEF fundamental score.",
    type: "website",
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

  const dateLabel = computed_at ? formatDate(computed_at.slice(0, 10)) : null;

  return (
    <>
      {/* Page header */}
      <div className="rank-page-header">
        <div className="rank-page-eyebrow">DSEF Fundamental Rankings</div>
        <h1 className="rank-page-title">DSE Stock Rankings</h1>
        <p className="rank-page-meta">
          {allRanked.length} companies scored
          {dateLabel ? ` · Updated ${dateLabel}` : ""}
        </p>
      </div>

      {/* Tier stat cards */}
      <TierStatCards counts={counts} total={allRanked.length} />

      {/* Full ranked table */}
      <Suspense>
        <FullRankTable items={allRanked} />
      </Suspense>
    </>
  );
}
