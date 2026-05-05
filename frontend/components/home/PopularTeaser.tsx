"use client";

import Link from "next/link";
import { taka, pct } from "@/lib/formatters";
import type { PopularStockItem } from "@/lib/api";

interface Props {
  items: PopularStockItem[];
}

interface MedalPalette {
  fill: string;
  stroke: string;
  ribbon: string;
  text: string;
}

const MEDAL_PALETTES: Record<1 | 2 | 3, MedalPalette> = {
  1: { fill: "#F5D169", stroke: "#B8860B", ribbon: "#A06D00", text: "#3B2A00" },
  2: { fill: "#E0E0E0", stroke: "#9A9A9A", ribbon: "#7A7A7A", text: "#2A2A2A" },
  3: { fill: "#E0986A", stroke: "#8C4A1F", ribbon: "#6B3A19", text: "#3B1F00" },
};

function Medal({ rank }: { rank: 1 | 2 | 3 }) {
  const p = MEDAL_PALETTES[rank];
  return (
    <svg
      width="32"
      height="38"
      viewBox="0 0 36 44"
      aria-hidden="true"
      className="pt-medal"
    >
      <path d="M9 24 L6 42 L14 36 Z" fill={p.ribbon} />
      <path d="M27 24 L30 42 L22 36 Z" fill={p.ribbon} />
      <circle cx="18" cy="18" r="14" fill={p.fill} stroke={p.stroke} strokeWidth="2" />
      <text
        x="18"
        y="23"
        textAnchor="middle"
        fontSize="14"
        fontWeight="800"
        fill={p.text}
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {rank}
      </text>
    </svg>
  );
}

function chgColor(val: number | null) {
  if (val == null) return "var(--ink-muted)";
  if (val > 0) return "#34D399";
  if (val < 0) return "#F87171";
  return "var(--ink-muted)";
}

function fmtChg(val: number | null) {
  if (val == null) return "—";
  return `${val > 0 ? "+" : ""}${pct(val)}`;
}

function Delta({ delta }: { delta: number | null }) {
  if (delta === null || delta === undefined) {
    return <span className="pt-delta pt-delta-new">NEW</span>;
  }
  if (delta === 0) {
    return <span className="pt-delta pt-delta-flat">—</span>;
  }
  if (delta > 0) {
    return <span className="pt-delta pt-delta-up">▲ {delta}</span>;
  }
  return <span className="pt-delta pt-delta-down">▼ {Math.abs(delta)}</span>;
}

export default function PopularTeaser({ items }: Props) {
  if (items.length === 0) return null;
  const top5 = items.slice(0, 5);

  return (
    <section className="pt-section">
      <div className="pt-header">
        <div className="pt-title-block">
          <div className="pt-title">
            <span className="pt-fire" aria-hidden="true">🔥</span>
            <h2 className="pt-heading">Most Popular This Week</h2>
          </div>
          <p className="pt-subtitle">Top 5 stocks DSE readers are watching right now</p>
        </div>
        <Link href="/dse-popular-stocks" className="pt-cta">
          Explore full list
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
          </svg>
        </Link>
      </div>

      <div className="pt-cards">
        {top5.map((item) => {
          const isTop3 = item.rank >= 1 && item.rank <= 3;
          const cls = "pt-card" + (isTop3 ? ` pt-card-${item.rank}` : "");
          return (
            <Link
              key={item.trading_code}
              href={`/stock/${item.trading_code}`}
              className={cls}
            >
              <div className="pt-rank-row">
                {isTop3 ? (
                  <Medal rank={item.rank as 1 | 2 | 3} />
                ) : (
                  <span className="pt-rank-plain">#{item.rank}</span>
                )}
                <Delta delta={item.delta} />
              </div>

              <div className="pt-ticker">{item.trading_code}</div>
              <div className="pt-name" title={item.company_name ?? ""}>
                {item.company_name ?? " "}
              </div>

              <div className="pt-stats">
                <span className="pt-ltp">
                  {item.ltp != null ? taka(item.ltp, 1) : "—"}
                </span>
                <span className="pt-chg" style={{ color: chgColor(item.change_pct) }}>
                  {fmtChg(item.change_pct)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
