"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { type PortfolioHolding, type ScoreItem, type MarketIndexData } from "@/lib/api";
import { analyzePortfolio, portfolioTodayMove, type ComputedRow, type Grade } from "@/lib/portfolio-analysis";
import { bdGroup, takaGroup } from "@/lib/formatters";
import { marketSession, formatBstDateLabel } from "@/lib/market-hours";
import Card from "@/components/ui/Card";

const GRADE_COLOR: Record<Grade, string> = {
  A: "var(--positive)",
  B: "var(--positive)",
  C: "var(--watch)",
  D: "var(--watch)",
  F: "var(--negative)",
};

function compute(holding: PortfolioHolding, priceMap: Map<string, ScoreItem>): ComputedRow {
  const item = priceMap.get(holding.trading_code.toUpperCase());
  const ltp = item?.ltp ?? null;
  const cost_basis = holding.qty * holding.buy_price;
  const current_value = ltp != null ? holding.qty * ltp : null;
  const pnl = current_value != null ? current_value - cost_basis : null;
  const pnl_pct = pnl != null && cost_basis > 0 ? (pnl / cost_basis) * 100 : null;
  return { holding, ltp, company_name: item?.company_name ?? null, cost_basis, current_value, pnl, pnl_pct };
}

/** Tween the displayed number toward `target` — counts up from 0 on first paint,
 *  then eases between values when a background refetch updates prices. */
function useCountUp(target: number, duration = 700): number {
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      displayRef.current = target;
      setDisplay(target);
      return;
    }
    const from = displayRef.current;
    if (from === target) return;
    const t0 = performance.now();
    let raf: number;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = from + (target - from) * eased;
      displayRef.current = v;
      setDisplay(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return display;
}

const CHIP_CLS = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.68rem] font-bold";

/** Dashboard hero: total portfolio value (animated), today's move, how it
 *  compares to DSEX, and the A–F grade — the "your money today" headline. */
export default function MoneyHero({
  holdings,
  priceMap,
  marketIndex,
}: {
  holdings: PortfolioHolding[];
  priceMap: Map<string, ScoreItem>;
  marketIndex: MarketIndexData | null;
}) {
  const rows = holdings.map((h) => compute(h, priceMap));
  let invested = 0;
  let value = 0;
  let hasPrice = false;
  for (const r of rows) {
    invested += r.cost_basis;
    if (r.current_value != null) {
      value += r.current_value;
      hasPrice = true;
    }
  }
  const pnl = hasPrice ? value - invested : null;
  const pnlPct = pnl != null && invested > 0 ? (pnl / invested) * 100 : null;
  const up = (pnl ?? 0) >= 0;

  const today = portfolioTodayMove(holdings, priceMap);
  const todayUp = (today?.delta ?? 0) >= 0;

  const analysis = analyzePortfolio(rows, priceMap);
  const gradeColor = GRADE_COLOR[analysis.grade];

  const shownValue = useCountUp(hasPrice ? value : 0);

  const dsexPct = marketIndex?.dsex_change_pct ?? null;
  const vsDsex = today && dsexPct != null ? today.pct - dsexPct : null;

  return (
    <Card as="section" padding="none" className="overflow-hidden">
      <div className="px-4 sm:px-5 pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-[var(--primary)]">
              Your money today
            </p>
            <div className="mt-1 text-[clamp(1.6rem,7vw,2rem)] font-extrabold tabular-nums nums text-[var(--text)] leading-tight">
              {hasPrice ? takaGroup(shownValue) : "—"}
            </div>
            {today && (
              <div
                className="mt-0.5 text-[0.85rem] sm:text-sm font-bold tabular-nums nums leading-tight"
                style={{ color: todayUp ? "var(--positive)" : "var(--negative)" }}
              >
                {todayUp ? "▲" : "▼"} {todayUp ? "+" : "−"}৳
                {bdGroup(Math.abs(today.delta))} ({todayUp ? "+" : ""}
                {today.pct.toFixed(2)}%) today
              </div>
            )}
            {/* Freshness — is this number live or last close? */}
            <p className="mt-1 text-[0.68rem] font-medium text-[var(--text-muted)]">
              {marketSession() === "open"
                ? "Updating live through the day"
                : marketIndex?.date
                  ? `As of ${formatBstDateLabel(marketIndex.date)} close`
                  : "Latest available prices"}
            </p>
          </div>

          <Link
            href="/portfolio"
            aria-label={`Portfolio grade ${analysis.grade} — ${analysis.gradeLabel}. See full analysis`}
            className="flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 shrink-0 transition active:scale-95"
            style={{ color: gradeColor, borderColor: gradeColor, background: "var(--surface-2)" }}
          >
            <span className="text-2xl sm:text-3xl font-black leading-none">{analysis.grade}</span>
            <span className="text-[0.5rem] font-bold uppercase tracking-wide">{analysis.gradeLabel}</span>
          </Link>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {vsDsex != null &&
            (Math.abs(vsDsex) < 0.1 ? (
              <span
                className={CHIP_CLS}
                style={{ color: "var(--text-muted)", background: "var(--surface-2)", border: "1px solid var(--border)" }}
              >
                Tracking DSEX today
              </span>
            ) : vsDsex > 0 ? (
              <span
                className={CHIP_CLS}
                style={{
                  color: "var(--positive)",
                  background: "color-mix(in srgb, var(--positive) 12%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--positive) 28%, var(--border))",
                }}
              >
                ▲ Beating DSEX by +{vsDsex.toFixed(2)}%
              </span>
            ) : (
              <span
                className={CHIP_CLS}
                style={{
                  color: "var(--negative)",
                  background: "color-mix(in srgb, var(--negative) 9%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--negative) 24%, var(--border))",
                }}
              >
                Trailing DSEX by {Math.abs(vsDsex).toFixed(2)}%
              </span>
            ))}
          {pnl != null && pnlPct != null && (
            <span
              className={`${CHIP_CLS} tabular-nums nums`}
              style={{
                color: up ? "var(--positive)" : "var(--negative)",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
              }}
            >
              Total {up ? "+" : "−"}৳{bdGroup(Math.abs(pnl))} ({up ? "+" : ""}
              {pnlPct.toFixed(1)}%)
            </span>
          )}
        </div>

        <p className="mt-3 text-[0.8rem] leading-relaxed text-[var(--text-muted)]">{analysis.headline}</p>
      </div>

      <Link
        href="/portfolio"
        className="block text-center px-4 py-3 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--surface-2)] border-t border-[var(--border)] transition-colors"
      >
        See full portfolio analysis →
      </Link>
    </Card>
  );
}

/**
 * Same footprint as MoneyHero — shown while the portfolio fetch is still in
 * flight (holdings unknown) so the sections below don't jump when it resolves.
 */
export function MoneyHeroSkeleton() {
  return (
    <Card as="section" padding="none" className="overflow-hidden" aria-hidden>
      <div className="px-4 sm:px-5 pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="h-3 w-24 animate-pulse rounded-full bg-[var(--surface-2)]" />
            <div className="h-8 w-40 animate-pulse rounded-lg bg-[var(--surface-2)]" />
            <div className="h-4 w-32 animate-pulse rounded-full bg-[var(--surface-2)]" />
            <div className="h-3 w-28 animate-pulse rounded-full bg-[var(--surface-2)]" />
          </div>
          <div className="h-14 w-14 shrink-0 animate-pulse rounded-2xl bg-[var(--surface-2)] sm:h-16 sm:w-16" />
        </div>
        <div className="mt-3 flex gap-1.5">
          <div className="h-6 w-32 animate-pulse rounded-full bg-[var(--surface-2)]" />
          <div className="h-6 w-24 animate-pulse rounded-full bg-[var(--surface-2)]" />
        </div>
        <div className="mt-3 h-4 w-full max-w-xs animate-pulse rounded-full bg-[var(--surface-2)]" />
      </div>
      <div className="h-11 border-t border-[var(--border)]" />
    </Card>
  );
}
