"use client";

import { Fragment, useMemo, useState, type MouseEvent } from "react";
import Link from "next/link";
import { TIER_LABELS, TIER_VAR, type TierKey } from "@/lib/constants";
import StarButton from "@/components/ui/StarButton";
import ScoreBadge from "@/components/ui/ScoreBadge";
import RankRowDetails from "@/components/ranking/RankRowDetails";
import { signed } from "@/lib/formatters";
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

// Tier accent colors — canonical token map (shared with ScoreBadge / TierPill)
const TIER_COLOR = TIER_VAR;

const TIERS_ORDER: TierKey[] = ["excellent", "good", "average", "weak"];

const COL_COUNT = 9;

const CATEGORY_TITLES: Record<string, string> = {
  Z: "Z category — irregular dividends, extra trading restrictions. High risk.",
  B: "B category — dividend record below par.",
};

export default function FullRankTable({ rows }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

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

  const toggle = (code: string) =>
    setExpanded((prev) => (prev === code ? null : code));

  const onRowClick = (e: MouseEvent<HTMLTableRowElement>, code: string) => {
    // Links, star and the toggle button handle themselves.
    if ((e.target as HTMLElement).closest("a, button")) return;
    toggle(code);
  };

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
            <th className="fr-th fr-th-num fr-th-hide-md">Profit Growth</th>
            <th className="fr-th fr-th-num fr-th-hide-md">Dividend</th>
            <th className="fr-th fr-th-score">Score</th>
            <th className="fr-th fr-th-num">LTP</th>
            <th className="fr-th fr-th-toggle" aria-label="Quick view"></th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            if (entry.type === "sep") {
              const tierColor = TIER_COLOR[entry.tier];
              return (
                <tr key={`sep-${entry.tier}`} className="fr-tier-sep-row">
                  <td colSpan={COL_COUNT}>
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
            const tierStyle = { ["--tier-color" as string]: tierColor };
            const open = expanded === item.trading_code;
            const category = item.market_category?.toUpperCase();
            const riskyCategory = category === "Z" || category === "B" ? category : null;
            const chg = item.change_pct;

            return (
              <Fragment key={item.trading_code}>
                <tr
                  className={`fr-row${open ? " is-open" : ""}`}
                  style={tierStyle}
                  onClick={(e) => onRowClick(e, item.trading_code)}
                >
                  <td className="fr-td fr-td-rank">
                    <span className={`fr-rank-pill${rank <= 3 ? ` fr-rank-m${rank}` : ""}`}>
                      {String(rank).padStart(2, "0")}
                    </span>
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
                          {riskyCategory && (
                            <span
                              className={`fr-cat-badge fr-cat-${riskyCategory.toLowerCase()}`}
                              title={CATEGORY_TITLES[riskyCategory]}
                              aria-label={CATEGORY_TITLES[riskyCategory]}
                            >
                              {riskyCategory}
                            </span>
                          )}
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

                  <td className="fr-td fr-td-num fr-td-hide-md">
                    {item.eps_yoy_pct != null ? (
                      <span
                        className={`fr-metric${
                          item.eps_yoy_pct > 0 ? " is-up" : item.eps_yoy_pct < 0 ? " is-down" : ""
                        }`}
                      >
                        {signed(item.eps_yoy_pct, 1)}%
                      </span>
                    ) : (
                      <span className="fr-metric-empty">—</span>
                    )}
                  </td>

                  <td className="fr-td fr-td-num fr-td-hide-md">
                    {item.div_yield_pct != null && item.div_yield_pct > 0 ? (
                      <span className="fr-metric">{item.div_yield_pct.toFixed(1)}%</span>
                    ) : (
                      <span className="fr-metric-empty">—</span>
                    )}
                  </td>

                  <td className="fr-td fr-td-score">
                    <ScoreBadge score={item.score} tier={item.tier} size="sm" />
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
                    {chg != null && (
                      <span
                        className={`fr-chg${chg > 0 ? " is-up" : chg < 0 ? " is-down" : ""}`}
                      >
                        {signed(chg, 2)}%
                      </span>
                    )}
                  </td>

                  <td className="fr-td fr-td-toggle">
                    <button
                      type="button"
                      className={`fr-toggle${open ? " is-open" : ""}`}
                      aria-expanded={open}
                      aria-label={`${open ? "Hide" : "Show"} quick view for ${item.trading_code}`}
                      onClick={() => toggle(item.trading_code)}
                    >
                      <span className="fr-toggle-label">{open ? "Less" : "More"}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path
                          d="m6 9 6 6 6-6"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>

                {open && (
                  <tr className="fr-expand-row" style={tierStyle}>
                    <td colSpan={COL_COUNT} className="fr-expand-td">
                      <RankRowDetails item={item} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
