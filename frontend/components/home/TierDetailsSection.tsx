"use client";

import RankRow from "./RankRow";
import type { ScoreItem } from "@/lib/api";
import { TIER_LABELS, TIER_SCORE_LABELS } from "@/lib/constants";

type DetailsTier = "cautious_buy" | "keep_watching" | "avoid";

interface Props {
  tier: DetailsTier;
  items: ScoreItem[];
}

const DETAILS_CLASS: Record<DetailsTier, string> = {
  cautious_buy:  "dsex-exp dsex-exp-cautious",
  keep_watching: "dsex-exp dsex-exp-keep-watching",
  avoid:         "dsex-exp dsex-exp-avoid",
};

const TABLE_CLASS: Record<DetailsTier, string> = {
  cautious_buy:  "rank-table rank-table-cautious",
  keep_watching: "rank-table rank-table-keep-watching",
  avoid:         "rank-table rank-table-avoid",
};

const BODY_CLASS: Record<DetailsTier, string> = {
  cautious_buy:  "dsex-exp-body-cautious",
  keep_watching: "dsex-exp-body-keep-watching",
  avoid:         "dsex-exp-body-avoid",
};

export default function TierDetailsSection({ tier, items }: Props) {
  if (items.length === 0) return null;

  const n = items.length;
  const w = n === 1 ? "company" : "companies";

  return (
    <details className={`${DETAILS_CLASS[tier]} mb-3`}>
      <summary>
        <span className="dsex-exp-title">{TIER_LABELS[tier]}</span>
        <span className="dsex-exp-sep">·</span>
        <span className="dsex-exp-pill">{TIER_SCORE_LABELS[tier]}</span>
        <span className="dsex-exp-sep">·</span>
        <span className="dsex-exp-count">
          {n} {w}
        </span>
      </summary>
      <div className={`px-0 pt-0 pb-1 ${BODY_CLASS[tier]}`}>
        <div className={TABLE_CLASS[tier]}>
          {items.map((item, i) => (
            <RankRow key={item.trading_code} item={item} rank={i + 1} tier={tier} />
          ))}
        </div>
      </div>
    </details>
  );
}
