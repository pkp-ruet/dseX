"use client";

import AddToPortfolioButton from "@/components/stock/AddToPortfolioButton";
import WatchButton from "@/components/watch-rules/WatchButton";
import CompareButton, { type ComparePeer } from "@/components/stock/CompareButton";
import ShareButton from "@/components/stock/ShareButton";

/**
 * The stock page's buttons, under the cover card (2026-11-23, the post-ready
 * cover: a screenshot of the card stops at its edge and carries no buttons).
 * Since 2026-11-25 (one Watch button) there are four: Watch (follow, the
 * rules and the price alert, in one sheet) · Portfolio · Compare · Share.
 * Phones: four equal tiles; from 640px one row.
 */
export default function CoverActions({
  code,
  name,
  ltp,
  score,
  peers = [],
}: {
  code: string;
  name: string;
  ltp: number | null;
  score: number | null;
  /** Similar companies for Compare's sheet (the page's peers). */
  peers?: ComparePeer[];
}) {
  return (
    <div className="cv-acts">
      <WatchButton code={code} name={name} ltp={ltp} />
      <AddToPortfolioButton code={code} ltp={ltp} />
      <CompareButton code={code} name={name} peers={peers} />
      <ShareButton code={code} companyName={name} score={score} ltp={ltp} />
    </div>
  );
}
