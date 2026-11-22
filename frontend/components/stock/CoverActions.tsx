"use client";

import { useState } from "react";
import WatchlistButton from "@/components/stock/WatchlistButton";
import AddToPortfolioButton from "@/components/stock/AddToPortfolioButton";
import PriceAlertButton from "@/components/stock/PriceAlertButton";
import WatchRulesButton from "@/components/watch-rules/WatchRulesButton";
import CompareButton from "@/components/stock/CompareButton";
import ShareButton from "@/components/stock/ShareButton";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";

/**
 * The stock page's buttons, under the cover card (2026-11-23, the post-ready
 * cover: a screenshot of the card stops at its edge and carries no buttons).
 * Phones: Follow · Portfolio · Alert · More, four equal tiles; More opens
 * Watch rules · Compare · Share in place (not a sheet: the watch rules button
 * keeps its own sheet, which would close with a parent one). From 640px all
 * six sit in one row and More is gone.
 */
export default function CoverActions({
  code,
  name,
  ltp,
  w52High,
  w52Low,
  score,
}: {
  code: string;
  name: string;
  ltp: number | null;
  w52High: number | null | undefined;
  w52Low: number | null | undefined;
  score: number | null;
}) {
  const [more, setMore] = useState(false);
  const { bn } = useLang();
  return (
    <div className="cv-acts" data-more={more ? "1" : undefined}>
      <WatchlistButton code={code} />
      <AddToPortfolioButton code={code} ltp={ltp} />
      <PriceAlertButton code={code} ltp={ltp} w52High={w52High ?? null} w52Low={w52Low ?? null} />
      <button
        type="button"
        className="btn-quiet btn-sm cv-acts-more"
        aria-expanded={more}
        aria-label={bn ? (more ? "কম দেখান" : "আরও দেখান") : more ? "Show fewer" : "Show more"}
        onClick={() => setMore((m) => !m)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
        <span>{more ? <T en="Less" bn="কম" /> : <T en="More" bn="আরও" />}</span>
      </button>
      <div className="cv-acts-extra">
        <WatchRulesButton code={code} name={name} />
        <CompareButton code={code} />
        <ShareButton code={code} companyName={name} score={score} ltp={ltp} />
      </div>
    </div>
  );
}
