"use client";

import { useState } from "react";
import TierHeader from "./TierHeader";
import RankRow from "./RankRow";
import type { ScoreItem } from "@/lib/api";

type TableTier = "strong_buy" | "good_buy" | "safe_buy";

interface Props {
  tier: TableTier;
  items: ScoreItem[];
  initialVisible?: number;
  defaultOpen?: boolean;
}

const TABLE_WRAP: Record<TableTier, string> = {
  strong_buy: "rank-table rank-table-strong",
  good_buy:   "rank-table rank-table-good",
  safe_buy:   "rank-table rank-table-safe",
};

export default function TierTableSection({
  tier,
  items,
  initialVisible = 10,
  defaultOpen = false,
}: Props) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const visible = expanded ? items : items.slice(0, initialVisible);
  const hasMore = items.length > initialVisible;

  return (
    <section className="mb-7 last:mb-2">
      <TierHeader tier={tier} />
      {items.length === 0 ? (
        <p className="text-xs text-[var(--ink-muted)] py-3 px-1.5">None at this time.</p>
      ) : (
        <div className="tier-table-wrap">
          <div className={`${TABLE_WRAP[tier]}${hasMore ? " tier-table-no-bottom-radius" : ""}`}>
            {visible.map((item, i) => (
              <RankRow key={item.trading_code} item={item} rank={i + 1} tier={tier} />
            ))}
          </div>
          {hasMore && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="tier-show-more-btn"
            >
              {expanded ? "▴ Show less" : `▾ Show ${items.length - initialVisible} more`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
