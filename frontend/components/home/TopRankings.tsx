"use client";

import Link from "next/link";
import { taka, pct } from "@/lib/formatters";
import type { ScoreItem } from "@/lib/api";
import { getTier } from "@/lib/constants";
import StarButton from "@/components/ui/StarButton";

const SCORE_CLASS: Record<string, string> = {
  excellent: "rr-score-top",
  good:      "rr-score-good",
  average:   "rr-score-watch",
  weak:      "rr-score-danger",
};

function sortedTop(scores: ScoreItem[]): ScoreItem[] {
  return [...scores]
    .filter(s => s.score != null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 10);
}

function ChgBadge({ v }: { v: number | null | undefined }) {
  if (v == null) return <span className="rr-chg rr-chg-flat">—</span>;
  if (v > 0) return <span className="rr-chg rr-chg-up">▲{v.toFixed(1)}%</span>;
  if (v < 0) return <span className="rr-chg rr-chg-dn">▼{Math.abs(v).toFixed(1)}%</span>;
  return <span className="rr-chg rr-chg-flat">0.0%</span>;
}

function EpsBadge({ v }: { v: number | null | undefined }) {
  if (v == null) return <span className="rr-chg-flat tr-metric">—</span>;
  const capped = Math.min(Math.abs(v), 999);
  if (v > 0) return <span className="rr-chg-up tr-metric">▲{capped.toFixed(0)}%</span>;
  if (v < 0) return <span className="rr-chg-dn tr-metric">▼{capped.toFixed(0)}%</span>;
  return <span className="rr-chg-flat tr-metric">0%</span>;
}

interface Props {
  scores: ScoreItem[];
}

export default function TopRankings({ scores }: Props) {
  const rows = sortedTop(scores);

  return (
    <section className="tr-wrap">
      <div className="tr-header">
        <div className="tr-heading">
          <div className="section-label tr-section-label">TopStockBD Ranking</div>
          <div className="tr-subtitle">Based on Deep Fundamental Analysis</div>
        </div>
      </div>

      <div className="tr-table-wrap">
        <div className="tr-col-header">
          <span className="tr-ch-rank">#</span>
          <span />
          <span>Code</span>
          <span className="tr-ch-r">Price</span>
          <span className="tr-ch-r tr-hide-mobile">Chg%</span>
          <span className="tr-ch-r">Score</span>
          <span className="tr-ch-r tr-hide-mobile">Yield</span>
          <span className="tr-ch-r tr-hide-mobile">EPS YoY</span>
        </div>

        {rows.map((item, i) => {
          const tier = getTier(item.score);
          const rankClass =
            i === 0 ? "tr-rank tr-rank--gold"
            : i === 1 ? "tr-rank tr-rank--silver"
            : i === 2 ? "tr-rank tr-rank--bronze"
            : "tr-rank";
          return (
            <Link
              key={item.trading_code}
              prefetch={false} href={`/stock/${item.trading_code}`}
              className="tr-row"
            >
              <span className={rankClass}>{i + 1}</span>
              <span className="tr-star">
                <StarButton code={item.trading_code} size="md" />
              </span>
              <span className="tr-code">
                <span className={`tr-ticker-pill tr-ticker-pill--${tier}`}>
                  {item.trading_code}
                </span>
                {item.stale_data && (
                  <span
                    title={`Last reported: ${item.last_reported_year ?? "?"}${
                      item.data_age_years != null ? ` (${item.data_age_years}y old)` : ""
                    }`}
                    aria-label="Stale financial data"
                    style={{ marginLeft: 4, fontSize: "0.85em", color: "var(--watch)" }}
                  >
                    ⚠️
                  </span>
                )}
                {item.company_name && (
                  <span className="tr-code-sub">{item.company_name}</span>
                )}
              </span>
              <span className="tr-price">
                {item.ltp != null ? taka(item.ltp, 1) : "—"}
              </span>
              <span className="tr-chg tr-hide-mobile">
                <ChgBadge v={item.change_pct} />
              </span>
              <span className={`tr-score ${SCORE_CLASS[tier]}`}>
                {item.score != null ? item.score.toFixed(1) : "—"}
              </span>
              <span className="tr-div tr-hide-mobile">
                {(item.div_yield_pct ?? 0) > 0 ? pct(item.div_yield_pct!, 1) : "—"}
              </span>
              <span className="tr-eps tr-hide-mobile">
                <EpsBadge v={item.eps_yoy_pct} />
              </span>
            </Link>
          );
        })}
      </div>

      <div className="tr-footer">
        <Link href="/dsestockranking" className="tr-see-all">
          View full ranking →
        </Link>
      </div>
    </section>
  );
}
