"use client";

import RankRow from "./RankRow";
import type { ScoreItem } from "@/lib/api";
import { TIER_LABELS, TIER_SCORE_LABELS } from "@/lib/constants";

interface Props {
  tier: "watch" | "avoid";
  items: ScoreItem[];
}

const DETAILS_CLASS: Record<Props["tier"], string> = {
  watch: "dsex-exp dsex-exp-watch",
  avoid: "dsex-exp dsex-exp-avoid",
};

const TABLE_CLASS: Record<Props["tier"], string> = {
  watch: "rank-table rank-table-watch",
  avoid: "rank-table rank-table-avoid",
};

const BODY_CLASS: Record<Props["tier"], string> = {
  watch: "dsex-exp-body-watch",
  avoid: "dsex-exp-body-avoid",
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
