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
  onLike,
  onSkip,
  liked = false,
  compact = false,
  isNew = false,
}: {
  stock: RecommendedStock;
  rank: number;
  /** When provided, renders "More like this" / "Skip" feedback controls. */
  onLike?: () => void;
  onSkip?: () => void;
  liked?: boolean;
  /** Tight, space-saving layout for the homepage teaser. */
  compact?: boolean;
  /** Pick wasn't in the user's previous feed — shows a small "New" chip. */
  isNew?: boolean;
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

  if (compact) {
    const topReason = stock.reasons[0];
    return (
      <div
        className="rec-rise soft-card relative overflow-hidden"
        style={{ animationDelay: `${revealDelay}ms` }}
      >
        <span
          className="absolute left-0 top-0 bottom-0 w-[4px]"
          style={{ background: `linear-gradient(180deg, ${color}, color-mix(in srgb, ${color} 50%, transparent))` }}
        />

        <div className="p-3 pl-4">
          {/* Header: identity + price */}
          <div className="flex items-center gap-2">
            <span className="text-base leading-none shrink-0">{r.medal}</span>
            <Link prefetch={false} href={`/stock/${stock.trading_code}`} className="group min-w-0 flex-1">
              <span className="flex items-baseline gap-1.5">
                <span className="font-mono text-base font-extrabold tracking-[0.02em] text-[var(--text)] group-hover:text-[var(--primary)] transition-colors">
                  {stock.trading_code}
                </span>
                <span className="tabular-nums text-[0.68rem] font-bold" style={{ color }}>
                  {match}% match
                </span>
                {isNew && (
                  <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--positive)_14%,transparent)] px-1.5 py-0.5 text-[0.68rem] font-extrabold uppercase tracking-[0.06em] text-[var(--positive)]">
                    New
                  </span>
                )}
              </span>
              {stock.company_name && (
                <span className="block text-[0.72rem] text-[var(--text-muted)] truncate leading-tight">
                  {stock.company_name}
                </span>
              )}
            </Link>
            <span className="shrink-0 text-right">
              <span className="block text-[0.92rem] font-bold tabular-nums text-[var(--text)]">
                ৳{stock.ltp != null ? stock.ltp.toFixed(2) : "--"}
              </span>
              {change != null && (
                <span className="block text-[0.72rem] tabular-nums font-semibold" style={{ color: changeColor }}>
                  {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
                </span>
              )}
            </span>
          </div>

          {/* Match bar */}
          <div className="mt-2 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: grown ? `${match}%` : "0%",
                background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 65%, #fff))`,
              }}
            />
          </div>

          {/* Top reason + actions */}
          <div className="mt-2 flex items-center justify-between gap-2">
            {topReason ? (
              <span className="flex min-w-0 items-center gap-1.5 text-[0.74rem] leading-snug text-[var(--text-muted)]">
                <span
                  className="shrink-0 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[0.68rem] text-white"
                  style={{ background: color }}
                >
                  ✓
                </span>
                <span className="truncate">{topReason}</span>
              </span>
            ) : (
              <span />
            )}
            <div className="flex shrink-0 items-center gap-1.5">
              <StarButton code={stock.trading_code} size="sm" />
              <Link
                prefetch={false}
                href={`/stock/${stock.trading_code}`}
                className="inline-flex items-center min-h-[32px] px-3 rounded-lg text-[0.72rem] font-bold text-white transition hover:brightness-110"
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
          className="rec-pop inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.68rem] font-bold uppercase tracking-[0.06em]"
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
        <Link prefetch={false} href={`/stock/${stock.trading_code}`} className="block group mt-2.5">
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
          <span className="mt-2 inline-block px-2 py-0.5 rounded-full text-[0.68rem] bg-[var(--surface-2)] text-[var(--text-muted)]">
            {stock.sector}
          </span>
        )}

        {/* Match strength bar */}
        <div className="mt-3.5">
          <div className="flex items-center justify-between text-[0.68rem] font-semibold mb-1">
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
                  className="mt-[0.05rem] shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-full text-[0.68rem] text-white"
                  style={{ background: color }}
                >
                  ✓
                </span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Feedback — only on the daily feed (boost-only like + skip) */}
        {(onLike || onSkip) && (
          <div className="mt-3.5 flex items-center gap-2">
            {onLike && (
              <button
                type="button"
                onClick={onLike}
                aria-pressed={liked}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.72rem] font-semibold transition active:scale-95"
                style={{
                  borderColor: liked ? "var(--positive)" : "var(--border)",
                  background: liked ? "color-mix(in srgb, var(--positive) 12%, var(--surface))" : "var(--surface)",
                  color: liked ? "var(--positive)" : "var(--text-muted)",
                }}
              >
                <span>{liked ? "👍" : "👍"}</span>
                {liked ? "More like this ✓" : "More like this"}
              </button>
            )}
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[0.72rem] font-semibold text-[var(--text-muted)] transition hover:border-[var(--negative)] hover:text-[var(--negative)] active:scale-95"
              >
                ✕ Skip
              </button>
            )}
          </div>
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
              prefetch={false} href={`/stock/${stock.trading_code}`}
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
