"use client";

import { useState } from "react";
import Link from "next/link";
import { taka, pct } from "@/lib/formatters";
import type { ScoreItem } from "@/lib/api";
import { getTier } from "@/lib/constants";
import StarButton from "@/components/ui/StarButton";

type Tab = "score" | "dividend" | "momentum" | "rising";

const TABS: { key: Tab; label: string; hint: string }[] = [
  { key: "score",    label: "Top Picks", hint: "Ranked by DSEF score" },
  { key: "dividend", label: "Dividend",  hint: "Ranked by dividend yield" },
  { key: "momentum", label: "Momentum",  hint: "Ranked by EPS growth YoY" },
  { key: "rising",   label: "Rising",    hint: "Ranked by today's price change" },
];

const SCORE_CLASS: Record<string, string> = {
  strong_buy:    "rr-score-top",
  good_buy:      "rr-score-good",
  safe_buy:      "rr-score-mid",
  cautious_buy:  "rr-score-cautious",
  keep_watching: "rr-score-watch",
  avoid:         "rr-score-danger",
};

function sortedTop(scores: ScoreItem[], tab: Tab): ScoreItem[] {
  switch (tab) {
    case "score":
      return [...scores]
        .filter(s => s.score != null)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 20);
    case "dividend":
      return [...scores]
        .filter(s => (s.div_yield_pct ?? 0) > 0)
        .sort((a, b) => (b.div_yield_pct ?? 0) - (a.div_yield_pct ?? 0))
        .slice(0, 20);
    case "momentum":
      return [...scores]
        .filter(s => s.eps_yoy_pct != null)
        .sort((a, b) => (b.eps_yoy_pct ?? 0) - (a.eps_yoy_pct ?? 0))
        .slice(0, 20);
    case "rising":
      return [...scores]
        .filter(s => s.change_pct != null)
        .sort((a, b) => (b.change_pct ?? 0) - (a.change_pct ?? 0))
        .slice(0, 20);
  }
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
  const [tab, setTab] = useState<Tab>("score");
  const rows = sortedTop(scores, tab);

  return (
    <section className="tr-wrap">
      <div className="tr-header">
        <div className="section-label">Rankings</div>
        <div className="tr-tabs" role="tablist">
          {TABS.map(t => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              title={t.hint}
              className={`tr-tab${tab === t.key ? " tr-tab--active" : ""}`}
            >
              {t.label}
            </button>
          ))}
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
          return (
            <Link
              key={item.trading_code}
              href={`/stock/${item.trading_code}`}
              className="tr-row"
            >
              <span className="tr-rank">{i + 1}</span>
              <span className="tr-star">
                <StarButton code={item.trading_code} />
              </span>
              <span className="tr-code">
                <span className={`tr-ticker-pill tr-ticker-pill--${tier}`}>
                  {item.trading_code}
                </span>
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
          View full leaderboard →
        </Link>
      </div>
    </section>
  );
}
