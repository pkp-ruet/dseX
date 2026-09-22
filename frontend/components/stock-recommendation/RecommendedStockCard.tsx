"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { type RecommendedStock } from "@/lib/api";
import StarButton from "@/components/ui/StarButton";
import StockRow, { StockPill, StockRank, StockRowValue } from "@/components/ui/StockRow";

/** Podium colours from the role palette (gold · muted steel · amber). */
const RANK = [
  { label: "Top match", color: "var(--gold)" },
  { label: "2nd match", color: "var(--text-muted)" },
  { label: "3rd match", color: "var(--watch)" },
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
  /** Tight, space-saving layout for the homepage teaser and the assistant. */
  compact?: boolean;
  /** Pick wasn't in the user's previous feed — shows a small "New" chip. */
  isNew?: boolean;
}) {
  const r = RANK[rank] ?? { label: `Match ${rank + 1}`, color: "var(--primary)" };
  const color = r.color;
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
      <div className="rec-rise soft-card overflow-hidden" style={{ animationDelay: `${revealDelay}ms` }}>
        <StockRow
          as="div"
          code={stock.trading_code}
          name={stock.company_name}
          leading={<StockRank n={rank + 1} accent={color} solid={rank < 3} />}
          tags={
            <>
              <StockPill tone="primary">{match}% match</StockPill>
              {isNew && <StockPill tone="positive">New</StockPill>}
            </>
          }
          sub={topReason || undefined}
          subClamp
          price={stock.ltp}
          change={stock.change_pct}
          action={<StarButton code={stock.trading_code} size="sm" />}
        />
      </div>
    );
  }

  return (
    <div
      className="rec-rise soft-card relative overflow-hidden"
      style={{ animationDelay: `${revealDelay}ms`, "--acc": color } as CSSProperties}
    >
      {/* Rank accent strip */}
      <span
        className="absolute bottom-0 left-0 top-0 w-1"
        style={{ background: `linear-gradient(180deg, ${color}, color-mix(in srgb, ${color} 50%, transparent))` }}
        aria-hidden
      />

      <div className="p-4 pl-5 sm:p-5 sm:pl-6">
        {/* Rank pill */}
        <span
          className="rec-pop inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-[0.06em]"
          style={{
            background: `color-mix(in srgb, ${color} 14%, var(--surface))`,
            color,
            border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
            animationDelay: `${revealDelay + 120}ms`,
          }}
        >
          <StockRank n={rank + 1} accent={color} solid className="h-5 w-5 rounded-full" />
          {r.label}
        </span>

        {/* Identity + price — the app-wide row */}
        <div className="-mx-2 mt-2">
          <StockRow
            as="div"
            inset="none"
            className="rounded-md px-2"
            code={stock.trading_code}
            name={stock.company_name}
            tags={
              <>
                {stock.sector && <span className="shrink-0 text-xs text-text-muted">{stock.sector}</span>}
                {isNew && <StockPill tone="positive">New</StockPill>}
              </>
            }
            price={stock.ltp}
            change={stock.change_pct}
            trailing={<StockRowValue value={`${match}%`} sub="match" tone="primary" />}
          />
        </div>

        {/* Match strength bar */}
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs font-semibold">
            <span className="text-text-muted">How well it fits you</span>
            <span className="tabular-nums nums" style={{ color }}>
              {match}% match
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: grown ? `${match}%` : "0%",
                background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 65%, var(--surface)))`,
              }}
            />
          </div>
        </div>

        {/* Reasons */}
        {stock.reasons.length > 0 && (
          <ul className="mt-3.5 space-y-1.5">
            {stock.reasons.map((reason, i) => (
              <li key={i} className="flex gap-2 text-sm leading-snug text-text-main">
                <span
                  className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-xs"
                  style={{ background: color, color: "var(--surface)" }}
                  aria-hidden
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
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
                  liked
                    ? "border-positive bg-positive/10 text-positive"
                    : "border-border bg-surface text-text-muted hover:border-positive hover:text-positive"
                }`}
              >
                {liked ? "More like this ✓" : "More like this"}
              </button>
            )}
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-muted transition hover:border-negative hover:text-negative active:scale-95"
              >
                ✕ Skip
              </button>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-end gap-2 border-t border-border pt-3">
          <StarButton code={stock.trading_code} size="md" />
          <Link prefetch={false} href={`/stock/${stock.trading_code}`} className="btn-primary btn-sm">
            Analysis →
          </Link>
        </div>
      </div>
    </div>
  );
}
