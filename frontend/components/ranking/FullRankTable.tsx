"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { taka, pct } from "@/lib/formatters";
import { TIER_LABELS, type TierKey } from "@/lib/constants";
import FilterBar from "@/components/home/FilterBar";
import type { ScoreItem } from "@/lib/api";

type SortKey = "score" | "change_pct" | "div_yield_pct";

export interface RankedItem extends ScoreItem {
  tier: TierKey;
}

interface Props {
  items: RankedItem[];
}

// Tier visual config
const TIER_PILL_STYLE: Record<TierKey, { bg: string; color: string; border: string }> = {
  strong_buy:    { bg: "rgba(20,83,45,0.10)",    color: "#14532D", border: "1px solid rgba(20,83,45,0.42)"    },
  good_buy:      { bg: "rgba(34,197,94,0.10)",   color: "#166534", border: "1px solid rgba(34,197,94,0.55)"  },
  safe_buy:      { bg: "rgba(30,64,175,0.09)",   color: "#1E40AF", border: "1px solid rgba(30,64,175,0.38)"  },
  cautious_buy:  { bg: "rgba(91,33,182,0.09)",   color: "#5B21B6", border: "1px solid rgba(91,33,182,0.38)"  },
  keep_watching: { bg: "rgba(146,64,14,0.10)",   color: "#92400E", border: "1px solid rgba(146,64,14,0.42)"  },
  avoid:         { bg: "rgba(153,27,27,0.08)",   color: "#991B1B", border: "1px solid rgba(153,27,27,0.38)"  },
};

const TIER_SEP_GRADIENT: Record<TierKey, string> = {
  strong_buy:    "linear-gradient(125deg, #052e16 0%, #14532D 50%, #15803D 100%)",
  good_buy:      "linear-gradient(125deg, #052e16 0%, #166534 50%, #22C55E 100%)",
  safe_buy:      "linear-gradient(125deg, #0c1f6e 0%, #1E40AF 50%, #3B82F6 100%)",
  cautious_buy:  "linear-gradient(125deg, #2e1065 0%, #5B21B6 50%, #7C3AED 100%)",
  keep_watching: "linear-gradient(125deg, #451a03 0%, #92400E 50%, #D97706 100%)",
  avoid:         "linear-gradient(125deg, #3b0606 0%, #991B1B 50%, #DC2626 100%)",
};

const TIER_BAR_COLOR: Record<TierKey, string> = {
  strong_buy:    "#15803D",
  good_buy:      "#22C55E",
  safe_buy:      "#3B82F6",
  cautious_buy:  "#7C3AED",
  keep_watching: "#D97706",
  avoid:         "#EF4444",
};

const TIERS_ORDER: TierKey[] = ["strong_buy", "good_buy", "safe_buy", "cautious_buy", "keep_watching", "avoid"];

function chgColor(val: number | null) {
  if (val == null) return "var(--ink-muted)";
  return val > 0 ? "#059669" : val < 0 ? "#DC2626" : "var(--ink-muted)";
}
function fmtChg(val: number | null) {
  if (val == null) return "—";
  return `${val > 0 ? "+" : ""}${pct(val)}`;
}
function fmtEps(val: number | null) {
  if (val == null) return "—";
  const capped = Math.min(Math.abs(val), 9999);
  return `${val > 0 ? "+" : ""}${capped.toFixed(0)}%`;
}

export default function FullRankTable({ items }: Props) {
  const [activeSector, setActiveSector] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSort, setActiveSort] = useState<SortKey>("score");

  const sectors = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.sector) set.add(item.sector);
    }
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    let result = [...items];
    if (activeSector) result = result.filter((i) => i.sector === activeSector);
    if (activeCategory) result = result.filter((i) => i.market_category === activeCategory);
    if (activeSort !== "score") {
      result = [...result].sort((a, b) => {
        const av = a[activeSort] ?? -Infinity;
        const bv = b[activeSort] ?? -Infinity;
        return (bv as number) - (av as number);
      });
    }
    return result;
  }, [items, activeSector, activeCategory, activeSort]);

  const isFiltered = !!activeSector || !!activeCategory || activeSort !== "score";

  // Build rows with tier separators when not filtered
  type RowEntry =
    | { type: "sep"; tier: TierKey; count: number }
    | { type: "row"; item: RankedItem; rank: number };

  const rows = useMemo((): RowEntry[] => {
    if (isFiltered) {
      return filtered.map((item, i) => ({ type: "row", item, rank: i + 1 }));
    }
    const result: RowEntry[] = [];
    let rank = 1;
    for (const tier of TIERS_ORDER) {
      const group = filtered.filter((i) => i.tier === tier);
      if (group.length === 0) continue;
      result.push({ type: "sep", tier, count: group.length });
      for (const item of group) {
        result.push({ type: "row", item, rank: rank++ });
      }
    }
    return result;
  }, [filtered, isFiltered]);

  return (
    <div>
      <FilterBar
        sectors={sectors}
        activeSector={activeSector}
        activeCategory={activeCategory}
        activeSort={activeSort}
        onSectorChange={setActiveSector}
        onCategoryChange={setActiveCategory}
        onSortChange={setActiveSort}
      />

      {isFiltered && (
        <div className="filtered-summary">{filtered.length} companies</div>
      )}

      <div className="full-rank-wrap">
        <table className="full-rank-table">
          <thead className="fr-thead">
            <tr>
              <th className="fr-th fr-th-rank">#</th>
              <th className="fr-th fr-th-code">Code</th>
              <th className="fr-th fr-th-company">Company</th>
              <th className="fr-th fr-th-sector">Sector</th>
              <th className="fr-th fr-th-score">Score</th>
              <th className="fr-th fr-th-num">LTP</th>
              <th className="fr-th fr-th-num">Chg%</th>
              <th className="fr-th fr-th-num fr-th-hide-sm">EPS YoY</th>
              <th className="fr-th fr-th-num fr-th-hide-md">Div Yield</th>
              <th className="fr-th fr-th-tier">Tier</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((entry, idx) => {
              if (entry.type === "sep") {
                return (
                  <tr key={`sep-${entry.tier}`} className="fr-tier-sep-row">
                    <td colSpan={10}>
                      <div
                        className="fr-tier-sep"
                        style={{ background: TIER_SEP_GRADIENT[entry.tier] }}
                      >
                        <span className="fr-tier-sep-label">{TIER_LABELS[entry.tier]}</span>
                        <span className="fr-tier-sep-count">{entry.count} companies</span>
                      </div>
                    </td>
                  </tr>
                );
              }

              const { item, rank } = entry;
              const pill = TIER_PILL_STYLE[item.tier];
              const barColor = TIER_BAR_COLOR[item.tier];
              const score = item.score ?? 0;

              return (
                <tr key={item.trading_code + idx} className="fr-row">
                  <td className="fr-td fr-td-rank">{rank}</td>

                  <td className="fr-td fr-td-code">
                    <Link
                      href={`/stock/${item.trading_code}`}
                      className="fr-ticker-pill"
                      style={{ background: pill.bg, color: pill.color, border: pill.border }}
                    >
                      {item.trading_code}
                    </Link>
                  </td>

                  <td className="fr-td fr-td-company">
                    <Link href={`/stock/${item.trading_code}`} className="fr-company-link">
                      {item.company_name ?? item.trading_code}
                    </Link>
                  </td>

                  <td className="fr-td fr-td-sector">
                    {item.sector ? (
                      <span className="fr-sector-badge">{item.sector}</span>
                    ) : "—"}
                  </td>

                  <td className="fr-td fr-td-score">
                    <div className="fr-score-bar">
                      <span className="fr-score-num" style={{ color: pill.color }}>
                        {item.score != null ? item.score.toFixed(1) : "—"}
                      </span>
                      <span className="fr-score-track">
                        <span
                          className="fr-score-fill"
                          style={{ width: `${score}%`, background: barColor }}
                        />
                      </span>
                    </div>
                  </td>

                  <td className="fr-td fr-td-num">
                    {item.ltp != null ? taka(item.ltp) : "—"}
                  </td>

                  <td className="fr-td fr-td-num" style={{ color: chgColor(item.change_pct) }}>
                    {fmtChg(item.change_pct)}
                  </td>

                  <td className="fr-td fr-td-num fr-td-hide-sm" style={{ color: chgColor(item.eps_yoy_pct) }}>
                    {fmtEps(item.eps_yoy_pct)}
                  </td>

                  <td className="fr-td fr-td-num fr-td-hide-md">
                    {item.div_yield_pct != null ? pct(item.div_yield_pct, 1) : "—"}
                  </td>

                  <td className="fr-td fr-td-tier">
                    <span
                      className="fr-tier-badge"
                      style={{ background: pill.bg, color: pill.color, border: pill.border }}
                    >
                      {TIER_LABELS[item.tier]}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
