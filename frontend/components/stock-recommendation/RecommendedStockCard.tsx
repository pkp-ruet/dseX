"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type RecommendedStock } from "@/lib/api";
import StarButton from "@/components/ui/StarButton";

const RANK = [
  { medal: "🥇", label: "Top match", color: "#D97706" }, // gold
  { medal: "🥈", label: "2nd match", color: "#64748B" }, // silver
  { medal: "🥉", label: "3rd match", color: "#B45309" }, // bronze
];

export default function RecommendedStockCard({
  stock,
  rank,
}: {
  stock: RecommendedStock;
  rank: number;
}) {
  const r = RANK[rank] ?? { medal: "⭐", label: `Match ${rank + 1}`, color: "var(--primary)" };
  const color = r.color;
  const change = stock.change_pct;
  const changeColor =
    change == null ? "var(--text-muted)" : change >= 0 ? "var(--positive)" : "var(--negative)";
  const match = Math.max(0, Math.min(100, Math.round(stock.match_score)));
  const revealDelay = rank * 120;

  // Grow the match bar shortly after the card reveals.
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGrown(true), 300 + revealDelay);
    return () => clearTimeout(t);
  }, [revealDelay]);

  return (
    <div
      className="rec-rise soft-card relative overflow-hidden"
      style={{ animationDelay: `${revealDelay}ms` }}
    >
      {/* Rank accent strip */}
      <span
        className="absolute left-0 top-0 bottom-0 w-[5px]"
        style={{ background: `linear-gradient(180deg, ${color}, color-mix(in srgb, ${color} 50%, transparent))` }}
      />

      <div className="p-4 sm:p-5 pl-5 sm:pl-6">
        {/* Rank pill */}
        <span
          className="rec-pop inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.64rem] font-bold uppercase tracking-[0.06em]"
          style={{
            background: `color-mix(in srgb, ${color} 14%, var(--surface))`,
            color,
            border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
            animationDelay: `${revealDelay + 120}ms`,
          }}
        >
          <span className="text-sm leading-none">{r.medal}</span>
          {r.label}
        </span>

        {/* Identity */}
        <Link href={`/stock/${stock.trading_code}`} className="block group mt-2.5">
          <span className="font-mono text-lg font-extrabold tracking-[0.02em] text-[var(--text)] group-hover:text-[var(--primary)] transition-colors">
            {stock.trading_code}
          </span>
          {stock.company_name && (
            <span className="block text-[0.78rem] text-[var(--text-muted)] truncate">
              {stock.company_name}
            </span>
          )}
        </Link>

        {stock.sector && (
          <span className="mt-2 inline-block px-2 py-0.5 rounded-full text-[0.66rem] bg-[var(--surface-2)] text-[var(--text-muted)]">
            {stock.sector}
          </span>
        )}

        {/* Match strength bar */}
        <div className="mt-3.5">
          <div className="flex items-center justify-between text-[0.66rem] font-semibold mb-1">
            <span className="text-[var(--text-muted)]">How well it fits you</span>
            <span className="tabular-nums" style={{ color }}>
              {match}% match
            </span>
          </div>
          <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: grown ? `${match}%` : "0%",
                background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 65%, #fff))`,
              }}
            />
          </div>
        </div>

        {/* Reasons */}
        {stock.reasons.length > 0 && (
          <ul className="mt-3.5 space-y-1.5">
            {stock.reasons.map((reason, i) => (
              <li key={i} className="flex gap-2 text-[0.82rem] leading-snug text-[var(--text)]">
                <span
                  className="mt-[0.05rem] shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-full text-[0.6rem] text-white"
                  style={{ background: color }}
                >
                  ✓
                </span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between gap-3">
          <span className="inline-flex items-baseline gap-1.5 font-bold text-[var(--text)]">
            <span className="text-[var(--text-muted)] text-sm">৳</span>
            <span className="text-base tabular-nums">{stock.ltp != null ? stock.ltp.toFixed(2) : "--"}</span>
            {change != null && (
              <span className="text-[0.78rem] tabular-nums font-semibold" style={{ color: changeColor }}>
                {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
              </span>
            )}
          </span>
          <div className="flex items-center gap-2">
            <StarButton code={stock.trading_code} size="md" />
            <Link
              href={`/stock/${stock.trading_code}`}
              className="inline-flex items-center min-h-[36px] px-3.5 rounded-lg text-[0.74rem] font-bold text-white transition hover:brightness-110"
              style={{ background: "var(--primary)" }}
            >
              Analysis →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
