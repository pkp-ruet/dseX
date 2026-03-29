"use client";
import { useState } from "react";
import RankRow from "./RankRow";
import TierPill from "@/components/ui/TierPill";
import type { ScoreItem } from "@/lib/api";
import type { TierKey } from "@/lib/constants";

interface Props {
  tier: TierKey;
  items: ScoreItem[];
  initialVisible?: number;
  defaultOpen?: boolean;
}

export default function TierSection({ tier, items, initialVisible = 10, defaultOpen = false }: Props) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const visible = expanded ? items : items.slice(0, initialVisible);
  const hasMore = items.length > initialVisible;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        <TierPill tier={tier} />
        <span className="text-xs text-[var(--text-muted)]">{items.length} companies</span>
      </div>

      <div>
        {visible.map((item, i) => (
          <RankRow key={item.trading_code} item={item} rank={i + 1} />
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs text-[var(--primary)] hover:underline font-medium"
        >
          {expanded ? "Show less" : `Show ${items.length - initialVisible} more`}
        </button>
      )}
    </div>
  );
}
