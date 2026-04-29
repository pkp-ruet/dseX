"use client";

import { useMemo } from "react";
import Link from "next/link";
import { taka, pct } from "@/lib/formatters";
import { TIER_LABELS, type TierKey } from "@/lib/constants";
import StarButton from "@/components/ui/StarButton";
import type { ScoreItem } from "@/lib/api";

export interface RankedItem extends ScoreItem {
  tier: TierKey;
}

interface Props {
  items: RankedItem[];
}

// Tier text colors — bright shades for strong visibility on dark bg
const TIER_COLOR: Record<TierKey, string> = {
  strong_buy:    "#4ADE80",
  good_buy:      "#34D399",
  safe_buy:      "#60A5FA",
  keep_watching: "#FBBF24",
  avoid:         "#F87171",
};

const TIERS_ORDER: TierKey[] = ["strong_buy", "good_buy", "safe_buy", "keep_watching", "avoid"];

function chgColor(val: number | null) {
  if (val == null) return "var(--ink-muted)";
  return val > 0 ? "#34D399" : val < 0 ? "#F87171" : "var(--ink-muted)";
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
  type RowEntry =
    | { type: "sep"; tier: TierKey; count: number }
    | { type: "row"; item: RankedItem; rank: number };

  const rows = useMemo((): RowEntry[] => {
    const result: RowEntry[] = [];
    let rank = 1;
    for (const tier of TIERS_ORDER) {
      const group = items.filter((i) => i.tier === tier);
      if (group.length === 0) continue;
      result.push({ type: "sep", tier, count: group.length });
      for (const item of group) {
        result.push({ type: "row", item, rank: rank++ });
      }
    }
    return result;
  }, [items]);

  return (
    <div>
      <div className="full-rank-wrap">
        <table className="full-rank-table">
          <thead className="fr-thead">
            <tr>
              <th className="fr-th fr-th-rank">#</th>
              <th className="fr-th fr-th-star fr-th-hide-sm" aria-label="Watchlist"></th>
              <th className="fr-th fr-th-code">Code</th>
              <th className="fr-th fr-th-sector fr-th-hide-sm">Sector</th>
              <th className="fr-th fr-th-score">Score</th>
              <th className="fr-th fr-th-num fr-th-hide-sm">LTP</th>
              <th className="fr-th fr-th-num">Chg%</th>
              <th className="fr-th fr-th-num fr-th-hide-sm">EPS YoY</th>
              <th className="fr-th fr-th-num fr-th-hide-md">Div Yield</th>
              <th className="fr-th fr-th-tier fr-th-hide-sm">Tier</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((entry, idx) => {
              if (entry.type === "sep") {
                const tierColor = TIER_COLOR[entry.tier];
                return (
                  <tr key={`sep-${entry.tier}`} className="fr-tier-sep-row">
                    <td colSpan={10}>
                      <div
                        className="fr-tier-sep"
                        style={{ borderLeftColor: tierColor }}
                      >
                        <span className="fr-tier-sep-dot" style={{ background: tierColor }} />
                        <span className="fr-tier-sep-label" style={{ color: tierColor }}>
                          {TIER_LABELS[entry.tier]}
                        </span>
                        <span className="fr-tier-sep-count">{entry.count} companies</span>
                      </div>
                    </td>
                  </tr>
                );
              }

              const { item, rank } = entry;
              const tierColor = TIER_COLOR[item.tier];

              return (
                <tr key={item.trading_code + idx} className="fr-row">
                  <td className="fr-td fr-td-rank">{rank}</td>

                  <td className="fr-td fr-td-star fr-td-hide-sm">
                    <StarButton code={item.trading_code} />
                  </td>

                  <td className="fr-td fr-td-code">
                    <Link
                      href={`/stock/${item.trading_code}`}
                      className="fr-code-link"
                      style={{ color: tierColor }}
                    >
                      {item.trading_code}
                    </Link>
                    <span className="fr-code-sub">{item.company_name ?? ""}</span>
                  </td>

                  <td className="fr-td fr-td-sector fr-td-hide-sm">
                    {item.sector ?? "—"}
                  </td>

                  <td className="fr-td fr-td-score">
                    <span className="fr-score-num" style={{ color: tierColor }}>
                      {item.score != null ? item.score.toFixed(1) : "—"}
                    </span>
                  </td>

                  <td className="fr-td fr-td-num fr-td-hide-sm">
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

                  <td className="fr-td fr-td-tier fr-td-hide-sm" style={{ color: tierColor }}>
                    {TIER_LABELS[item.tier]}
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
