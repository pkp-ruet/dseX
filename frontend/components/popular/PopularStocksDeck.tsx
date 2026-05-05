"use client";

import Link from "next/link";
import { taka, pct } from "@/lib/formatters";
import StarButton from "@/components/ui/StarButton";
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
      width="36"
      height="44"
      viewBox="0 0 36 44"
      aria-hidden="true"
      className="ps-medal-svg"
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

export default function PopularStocksDeck({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="popular-empty">
        No visit data yet — check back soon.
      </div>
    );
  }

  return (
    <div className="ps-leaderboard">
      <ol className="ps-list">
        {items.map((item) => {
          const isTop3 = item.rank >= 1 && item.rank <= 3;
          const rowClass =
            "ps-row" + (isTop3 ? ` ps-row-rank-${item.rank}` : "");

          return (
            <li key={item.trading_code} className={rowClass}>
              <Link href={`/stock/${item.trading_code}`} className="ps-row-link">
                <span className="ps-rank-cell">
                  {isTop3 ? (
                    <Medal rank={item.rank as 1 | 2 | 3} />
                  ) : (
                    <span className="ps-rank-plain">{item.rank}</span>
                  )}
                </span>

                <span className="ps-ticker">{item.trading_code}</span>

                <span className="ps-ltp">
                  {item.ltp != null ? taka(item.ltp, 1) : "—"}
                </span>

                <span className="ps-chg" style={{ color: chgColor(item.change_pct) }}>
                  {fmtChg(item.change_pct)}
                </span>
              </Link>

              <span className="ps-star">
                <StarButton code={item.trading_code} size="sm" />
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
