"use client";

import { useMemo, type CSSProperties } from "react";
import Link from "next/link";
import { TIER_LABELS, type TierKey } from "@/lib/constants";
import StarButton from "@/components/ui/StarButton";
import type { ScoreItem } from "@/lib/api";

export interface RankedItem extends ScoreItem {
  tier: TierKey;
}

export interface RankedRow {
  item: RankedItem;
  rank: number;
}

interface Props {
  /** Already filtered + globally-ranked rows. Grouping by tier happens here. */
  rows: RankedRow[];
}

// Tier accent colors — tokenized, used as restrained accents (not fills)
const TIER_COLOR: Record<TierKey, string> = {
  strong_buy:    "#059669",             // vibrant emerald — most impactful
  buy:           "#15803D",             // deep green — calmer, sits below strong buy
  keep_watching: "var(--watch)",        // amber
  avoid:         "var(--negative)",     // red
};

// Matte medals for the top 3 — soft, editorial (no gloss/glow)
const MEDAL_COLORS: Record<1 | 2 | 3, { bg: string; ring: string; text: string }> = {
  1: { bg: "#FBF1D2", ring: "#D9B65A", text: "#7A5A12" },
  2: { bg: "#EEF1F5", ring: "#C2CAD4", text: "#5A6573" },
  3: { bg: "#F6E5D8", ring: "#D6A883", text: "#8A5326" },
};

const TIERS_ORDER: TierKey[] = ["strong_buy", "buy", "keep_watching", "avoid"];

export default function FullRankTable({ rows }: Props) {
  type RowEntry =
    | { type: "sep"; tier: TierKey; count: number }
    | { type: "row"; item: RankedItem; rank: number };

  const entries = useMemo((): RowEntry[] => {
    const result: RowEntry[] = [];
    for (const tier of TIERS_ORDER) {
      const group = rows.filter((r) => r.item.tier === tier);
      if (group.length === 0) continue;
      result.push({ type: "sep", tier, count: group.length });
      for (const r of group) {
        result.push({ type: "row", item: r.item, rank: r.rank });
      }
    }
    return result;
  }, [rows]);

  if (rows.length === 0) {
    return (
      <div className="full-rank-wrap full-rank-empty">
        <p className="fr-empty-title">No companies match your filters</p>
        <p className="fr-empty-sub">Try clearing the search or choosing a different sector.</p>
      </div>
    );
  }

  return (
    <div className="full-rank-wrap">
      <table className="full-rank-table">
        <thead className="fr-thead">
          <tr>
            <th className="fr-th fr-th-rank">#</th>
            <th className="fr-th fr-th-star" aria-label="Watchlist"></th>
            <th className="fr-th fr-th-code">Code</th>
            <th className="fr-th fr-th-sector fr-th-hide-sm">Sector</th>
            <th className="fr-th fr-th-score fr-th-hide-sm">Score</th>
            <th className="fr-th fr-th-num">LTP</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, idx) => {
            if (entry.type === "sep") {
              const tierColor = TIER_COLOR[entry.tier];
              return (
                <tr key={`sep-${entry.tier}`} className="fr-tier-sep-row">
                  <td colSpan={6}>
                    <div
                      className="fr-tier-sep"
                      style={{ ["--tier-color" as string]: tierColor }}
                    >
                      <span className="fr-tier-sep-dot" style={{ background: tierColor }} />
                      <span className="fr-tier-sep-label">{TIER_LABELS[entry.tier]}</span>
                      <span className="fr-tier-sep-count">{entry.count}</span>
                    </div>
                  </td>
                </tr>
              );
            }

            const { item, rank } = entry;
            const tierColor = TIER_COLOR[item.tier];
            const medal = rank <= 3 ? MEDAL_COLORS[rank as 1 | 2 | 3] : null;
            const rankPillStyle: CSSProperties = medal
              ? { background: medal.bg, borderColor: medal.ring, color: medal.text }
              : {};
            const scorePct = item.score != null ? Math.max(0, Math.min(100, item.score)) : 0;

            return (
              <tr
                key={item.trading_code + idx}
                className="fr-row"
                style={{ ["--tier-color" as string]: tierColor }}
              >
                <td className="fr-td fr-td-rank">
                  <span className="fr-rank-pill" style={rankPillStyle}>{rank}</span>
                </td>

                <td className="fr-td fr-td-star">
                  <StarButton code={item.trading_code} />
                </td>

                <td className="fr-td fr-td-code">
                  <Link
                    prefetch={false} href={`/stock/${item.trading_code}`}
                    className="fr-stock-btn"
                    aria-label={`View ${item.trading_code} details`}
                  >
                    <span className="fr-stock-btn-text">
                      <span className="fr-stock-btn-code">
                        {item.trading_code}
                        {item.stale_data && (
                          <span
                            title={`Last reported: ${item.last_reported_year ?? "?"}${
                              item.data_age_years != null ? ` (${item.data_age_years}y old)` : ""
                            }`}
                            aria-label="Stale financial data"
                            className="fr-stale-flag"
                          >
                            ⚠️
                          </span>
                        )}
                      </span>
                      {item.company_name && (
                        <span className="fr-stock-btn-name">{item.company_name}</span>
                      )}
                    </span>
                    <span className="fr-stock-btn-chevron" aria-hidden>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path
                          d="m9 6 6 6-6 6"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </Link>
                </td>

                <td className="fr-td fr-td-sector fr-td-hide-sm">
                  {item.sector ?? "—"}
                </td>

                <td className="fr-td fr-td-score fr-td-hide-sm">
                  <div className="fr-score">
                    <span className="fr-score-meter">
                      <span
                        className="fr-score-meter-fill"
                        style={{ width: `${scorePct}%`, background: tierColor }}
                      />
                    </span>
                    <span className="fr-score-num" style={{ color: tierColor }}>
                      {item.score != null ? item.score.toFixed(1) : "—"}
                    </span>
                  </div>
                </td>

                <td className="fr-td fr-td-num">
                  {item.ltp != null ? (
                    <span className="fr-price">
                      <span className="fr-price-cur">৳</span>
                      <span className="fr-price-val">{item.ltp.toFixed(2)}</span>
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
