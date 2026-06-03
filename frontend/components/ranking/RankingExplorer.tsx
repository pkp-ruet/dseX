"use client";

import { useMemo, useState } from "react";
import { TIER_LABELS, TIER_SCORE_LABELS, type TierKey } from "@/lib/constants";
import FullRankTable, { type RankedItem, type RankedRow } from "@/components/ranking/FullRankTable";

const TIERS_ORDER: TierKey[] = ["strong_buy", "buy", "keep_watching", "avoid"];

const TIER_COLOR: Record<TierKey, string> = {
  strong_buy:    "#059669",             // vibrant emerald — most impactful
  buy:           "#15803D",             // deep green — calmer, sits below strong buy
  keep_watching: "var(--watch)",        // amber
  avoid:         "var(--negative)",     // red
};

interface Props {
  items: RankedItem[];
  counts: Record<string, number>;
  total: number;
  sectors: string[];
}

export default function RankingExplorer({ items, counts, total, sectors }: Props) {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("all");
  const [activeTiers, setActiveTiers] = useState<Set<TierKey>>(
    () => new Set(TIERS_ORDER)
  );

  // Assign each company its stable global rank once (tier order → by score).
  const ranked = useMemo<RankedRow[]>(() => {
    const rows: RankedRow[] = [];
    let rank = 1;
    for (const tier of TIERS_ORDER) {
      for (const item of items.filter((i) => i.tier === tier)) {
        rows.push({ item, rank: rank++ });
      }
    }
    return rows;
  }, [items]);

  const filtered = useMemo<RankedRow[]>(() => {
    const q = query.trim().toUpperCase();
    return ranked.filter(({ item }) => {
      if (!activeTiers.has(item.tier)) return false;
      if (sector !== "all" && item.sector !== sector) return false;
      if (q) {
        const code = item.trading_code.toUpperCase();
        const name = (item.company_name ?? "").toUpperCase();
        if (!code.includes(q) && !name.includes(q)) return false;
      }
      return true;
    });
  }, [ranked, query, sector, activeTiers]);

  const toggleTier = (tier: TierKey) => {
    setActiveTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) {
        // Don't allow turning the last tier off — keep at least one active.
        if (next.size > 1) next.delete(tier);
      } else {
        next.add(tier);
      }
      return next;
    });
  };

  const isFiltered =
    query.trim() !== "" || sector !== "all" || activeTiers.size !== TIERS_ORDER.length;

  const reset = () => {
    setQuery("");
    setSector("all");
    setActiveTiers(new Set(TIERS_ORDER));
  };

  return (
    <div className="rank-explorer">
      {/* Tier filter chips (double as the at-a-glance summary) */}
      <div className="rank-chips" role="group" aria-label="Filter by tier">
        {TIERS_ORDER.map((tier) => {
          const count = counts[tier] ?? 0;
          const share = total > 0 ? Math.round((count / total) * 100) : 0;
          const active = activeTiers.has(tier);
          return (
            <button
              key={tier}
              type="button"
              onClick={() => toggleTier(tier)}
              aria-pressed={active}
              className={`rank-chip${active ? " is-active" : ""}`}
              style={{ ["--tier-color" as string]: TIER_COLOR[tier] }}
            >
              <span className="rank-chip-top">
                <span className="rank-chip-dot" />
                <span className="rank-chip-label">{TIER_LABELS[tier]}</span>
              </span>
              <span className="rank-chip-count">{count}</span>
              <span className="rank-chip-meta">
                {share}% · {TIER_SCORE_LABELS[tier]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + sector controls */}
      <div className="rank-controls">
        <div className="rank-search">
          <svg
            className="rank-search-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            className="rank-search-input"
            placeholder="Search code or company…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search companies"
          />
        </div>

        <select
          className="rank-sector-select"
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          aria-label="Filter by sector"
        >
          <option value="all">All sectors</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <div className="rank-showing">
          <span>
            Showing <strong>{filtered.length}</strong> of {total}
          </span>
          {isFiltered && (
            <button type="button" className="rank-reset" onClick={reset}>
              Reset
            </button>
          )}
        </div>
      </div>

      <FullRankTable rows={filtered} />
    </div>
  );
}
