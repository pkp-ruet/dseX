"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { type PortfolioHolding, type ScoreItem, type MarketIndexData } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { analyzePortfolio, portfolioTodayMove, type ComputedRow, type Grade } from "@/lib/portfolio-analysis";
import { bdGroup, takaGroup } from "@/lib/formatters";
import { marketSession, formatBstDateLabel } from "@/lib/market-hours";
import { bnDate } from "@/lib/bn";
import { t, gradeLabel } from "@/lib/home-copy";
import Stat from "@/components/ui/Stat";

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

/** Show `target` immediately on first paint (a returning user should be able
 *  to read their money at once — no count-up from 0), then ease between values
 *  when a background refetch changes the price. */
function useCountUp(target: number, duration = 700): number {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);
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
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
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

/** Dashboard money card: total portfolio value (animated) beside the A–F
 *  grade, then three numbers — today, since you bought, vs DSEX today. The
 *  greeting + daily brief sit above it on the canvas (PersonalizedHome). */
export default function MoneyHero({
  holdings,
  priceMap,
  marketIndex,
  lang = "en",
}: {
  holdings: PortfolioHolding[];
  priceMap: Map<string, ScoreItem>;
  marketIndex: MarketIndexData | null;
  lang?: Lang;
}) {
  const bn = lang === "bn";
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

  const analysis = analyzePortfolio(rows, priceMap, lang);
  const gradeColor = GRADE_COLOR[analysis.grade];

  const shownValue = useCountUp(hasPrice ? value : 0);

  const dsexPct = marketIndex?.dsex_change_pct ?? null;
  const vsDsex = today && dsexPct != null ? today.pct - dsexPct : null;

  const freshness =
    marketSession() === "open"
      ? t(lang, "updatingLive")
      : marketIndex?.date
        ? t(lang, "asOfClose", { date: bn ? bnDate(marketIndex.date) : formatBstDateLabel(marketIndex.date) })
        : t(lang, "latestPrices");

  return (
    <section
      className={`soft-card dash-box overflow-hidden ${bn ? "font-bn" : ""}`}
      lang={bn ? "bn" : undefined}
    >
      <div className="px-4 pb-4 pt-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text-muted">{t(lang, "yourMoneyToday")}</p>
            <div className="nums mt-1 text-3xl font-bold leading-tight text-text-main sm:text-4xl">
              {hasPrice ? takaGroup(shownValue) : "—"}
            </div>
            {/* Freshness — is this number live or last close? */}
            <p className="mt-1 text-xs font-medium text-text-muted">{freshness}</p>
          </div>

          <Link
            href="/portfolio"
            aria-label={`Portfolio grade ${analysis.grade} — ${analysis.gradeLabel}. See full analysis`}
            className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border-2 bg-surface-2 transition active:scale-95"
            style={{ color: gradeColor, borderColor: gradeColor }}
          >
            <span className="text-2xl font-bold leading-none">{analysis.grade}</span>
            <span className="px-1 text-center text-xs font-bold leading-none">
              {gradeLabel(lang, analysis.gradeLabel)}
            </span>
          </Link>
        </div>

        {/* Three numbers, label under each — they were three coloured pills. */}
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-3">
          <Stat
            size="sm"
            value={today ? `${todayUp ? "+" : "−"}৳${bdGroup(Math.abs(today.delta))}` : "—"}
            tone={today ? (todayUp ? "positive" : "negative") : "muted"}
            label={t(lang, "heroToday")}
            sub={today ? `${todayUp ? "+" : ""}${today.pct.toFixed(2)}%` : undefined}
            subTone={today ? (todayUp ? "positive" : "negative") : "muted"}
          />
          <Stat
            size="sm"
            value={pnl != null ? `${up ? "+" : "−"}৳${bdGroup(Math.abs(pnl))}` : "—"}
            tone={pnl != null ? (up ? "positive" : "negative") : "muted"}
            label={t(lang, "heroTotal")}
            sub={pnlPct != null ? `${up ? "+" : ""}${pnlPct.toFixed(1)}%` : undefined}
            subTone={pnl != null ? (up ? "positive" : "negative") : "muted"}
          />
          <Stat
            size="sm"
            value={
              vsDsex == null
                ? "—"
                : Math.abs(vsDsex) < 0.1
                  ? "="
                  : `${vsDsex > 0 ? "+" : "−"}${Math.abs(vsDsex).toFixed(2)}%`
            }
            tone={vsDsex == null || Math.abs(vsDsex) < 0.1 ? "muted" : vsDsex > 0 ? "positive" : "negative"}
            label={t(lang, "heroVsDsex")}
          />
        </div>

        <p className="mt-3 text-sm leading-relaxed text-text-muted">{analysis.headline}</p>
      </div>

      <Link
        href="/portfolio"
        className="flex min-h-10 items-center justify-center border-t border-border px-4 py-3 text-sm font-semibold text-primary-ink transition-colors hover:bg-surface-2 active:bg-surface-2"
      >
        {t(lang, "seeFullPortfolio")} →
      </Link>
    </section>
  );
}

/**
 * Same footprint as MoneyHero — shown while the portfolio fetch is still in
 * flight (holdings unknown) so the sections below don't jump when it resolves.
 */
export function MoneyHeroSkeleton() {
  return (
    <section className="soft-card dash-box overflow-hidden">
      <div className="px-4 sm:px-5 pt-4 pb-4" aria-hidden>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="h-3 w-24 animate-pulse rounded-full bg-surface-2" />
            <div className="h-8 w-40 animate-pulse rounded-lg bg-surface-2" />
            <div className="h-4 w-32 animate-pulse rounded-full bg-surface-2" />
            <div className="h-3 w-28 animate-pulse rounded-full bg-surface-2" />
          </div>
          <div className="h-16 w-16 shrink-0 animate-pulse rounded-lg bg-surface-2" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-3">
          <div className="h-10 animate-pulse rounded-md bg-surface-2" />
          <div className="h-10 animate-pulse rounded-md bg-surface-2" />
          <div className="h-10 animate-pulse rounded-md bg-surface-2" />
        </div>
        <div className="mt-3 h-4 w-full max-w-xs animate-pulse rounded-full bg-surface-2" />
      </div>
      <div className="h-11 border-t border-border" />
    </section>
  );
}
