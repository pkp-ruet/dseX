"use client";

import { useEffect, useRef, useState } from "react";
import { taka } from "@/lib/formatters";

/** Same palette as AllocationChart so the hero donut and the big chart agree. */
const DONUT_COLORS = [
  "var(--primary)", "var(--positive)", "#EA580C", "#6366F1", "#DB2777",
  "#0891B2", "#CA8A04", "#9333EA", "#DC2626", "#0D9488",
];
const OTHERS_COLOR = "var(--text-muted)";

export interface HeroSlice {
  code: string;
  value: number;
}

interface Props {
  /** Sum of buy cost across holdings. */
  totalInvested: number;
  /** Market value (null while prices are missing). */
  totalValue: number | null;
  pnl: number | null;
  pnlPct: number | null;
  todayMove: { delta: number; pct: number } | null;
  /** DSEX index change % today — powers the "ahead of / behind the market" chip. */
  dsexPct: number | null;
  holdingsCount: number;
  /** Per-holding value for the donut (current value, falling back to cost). */
  slices: HeroSlice[];
  privacy: boolean;
  onTogglePrivacy: () => void;
}

/** Animate a number toward `target` with an ease-out curve. Snaps for
 *  prefers-reduced-motion and for the very first paint from cache. */
function useCountUp(target: number, duration = 700): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      fromRef.current = target;
      setDisplay(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = from + (target - from) * eased;
      setDisplay(value);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      fromRef.current = target;
    };
  }, [target, duration]);

  return display;
}

function MovePill({
  label,
  delta,
  pct,
}: {
  label: string;
  delta: number | null;
  pct: number | null;
}) {
  if (delta == null) return null;
  const up = delta > 0;
  const down = delta < 0;
  const accent = up ? "var(--positive)" : down ? "var(--negative)" : "var(--text-muted)";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full pl-2.5 pr-3 py-1 text-xs sm:text-sm font-bold tabular-nums nums whitespace-nowrap"
      style={{ color: accent, background: `color-mix(in srgb, ${accent} 12%, transparent)` }}
    >
      <span className="text-[11px] leading-none" aria-hidden>
        {up ? "▲" : down ? "▼" : "•"}
      </span>
      <span className="font-semibold opacity-80">{label}</span>
      <span className="pv">
        {up ? "+" : ""}
        {taka(delta, 0)}
        {pct != null && (
          <span className="opacity-80 font-semibold">
            {" "}
            ({pct > 0 ? "+" : ""}
            {pct.toFixed(2)}%)
          </span>
        )}
      </span>
    </span>
  );
}

/** "Ahead of / behind the market today" — portfolio's move vs the DSEX index. */
function MarketChip({
  portfolioPct,
  dsexPct,
}: {
  portfolioPct: number | null;
  dsexPct: number | null;
}) {
  if (portfolioPct == null || dsexPct == null) return null;
  const dsexAccent =
    dsexPct > 0 ? "var(--positive)" : dsexPct < 0 ? "var(--negative)" : "var(--text-muted)";
  // A hair's-width tie counts as neither ahead nor behind.
  const diff = portfolioPct - dsexPct;
  const ahead = Math.abs(diff) < 0.05 ? null : diff > 0;
  const verdictAccent =
    ahead == null ? "var(--text-muted)" : ahead ? "var(--positive)" : "var(--negative)";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full pl-2.5 pr-3 py-1 text-xs sm:text-sm font-bold tabular-nums nums whitespace-nowrap border border-[var(--border)]">
      <span className="font-semibold text-[var(--text-muted)]">DSEX</span>
      <span style={{ color: dsexAccent }}>
        {dsexPct > 0 ? "+" : ""}
        {dsexPct.toFixed(2)}%
      </span>
      <span className="font-semibold" style={{ color: verdictAccent }}>
        {ahead == null ? "· level" : ahead ? "· you're ahead" : "· you're behind"}
      </span>
    </span>
  );
}

/** Lightweight SVG donut of the portfolio split (top 5 + rest). */
function HeroDonut({ slices, holdingsCount }: { slices: HeroSlice[]; holdingsCount: number }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total <= 0 || slices.length === 0) return null;

  const sorted = [...slices].sort((a, b) => b.value - a.value);
  const TOP = 5;
  const shown = sorted.slice(0, TOP).map((s, i) => ({ ...s, color: DONUT_COLORS[i % DONUT_COLORS.length] }));
  const rest = sorted.slice(TOP);
  if (rest.length > 0) {
    shown.push({ code: "rest", value: rest.reduce((s, x) => s + x.value, 0), color: OTHERS_COLOR });
  }

  const R = 42;
  const STROKE = 13;
  const C = 2 * Math.PI * R;
  const GAP = shown.length > 1 ? 2.5 : 0; // px gap between segments
  let offset = 0;

  return (
    <div className="relative shrink-0" style={{ width: 118, height: 118 }} aria-hidden>
      <svg width={118} height={118} viewBox="0 0 118 118" style={{ transform: "rotate(-90deg)" }}>
        {shown.map((s) => {
          const frac = s.value / total;
          const len = Math.max(0, frac * C - GAP);
          const el = (
            <circle
              key={s.code}
              cx={59}
              cy={59}
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={-offset}
              style={{ transition: "stroke-dasharray 600ms ease, stroke-dashoffset 600ms ease" }}
            />
          );
          offset += frac * C;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-xl font-black text-[var(--text)] leading-none nums">{holdingsCount}</span>
        <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-bold mt-0.5">
          {holdingsCount === 1 ? "stock" : "stocks"}
        </span>
      </div>
    </div>
  );
}

/** Value-first portfolio hero — the "how am I doing" answer in one glance. */
export default function PortfolioHero({
  totalInvested,
  totalValue,
  pnl,
  pnlPct,
  todayMove,
  dsexPct,
  holdingsCount,
  slices,
  privacy,
  onTogglePrivacy,
}: Props) {
  const hasValue = totalValue != null;
  const headline = hasValue ? totalValue : totalInvested;
  const animated = useCountUp(headline);

  const up = pnl != null && pnl > 0;
  const down = pnl != null && pnl < 0;
  const accent = up ? "var(--positive)" : down ? "var(--negative)" : "var(--primary)";

  return (
    <section
      className="pf-rise soft-card relative overflow-hidden p-5 sm:p-7"
      style={{
        background: `
          radial-gradient(120% 130% at 0% 0%, color-mix(in srgb, ${accent} 9%, transparent) 0%, transparent 55%),
          radial-gradient(110% 120% at 100% 100%, color-mix(in srgb, ${accent} 5%, transparent) 0%, transparent 50%),
          var(--surface)`,
        borderColor: `color-mix(in srgb, ${accent} 22%, var(--border))`,
      }}
    >
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0 flex-1">
          {/* Label + privacy toggle */}
          <div className="flex items-center gap-2">
            <p className="text-[11px] sm:text-xs uppercase tracking-[0.16em] font-bold text-[var(--text-muted)]">
              {hasValue ? "Portfolio Value" : "Invested So Far"}
            </p>
            <button
              type="button"
              onClick={onTogglePrivacy}
              className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors p-1 -my-1"
              aria-label={privacy ? "Show amounts" : "Hide amounts"}
              aria-pressed={privacy}
              title={privacy ? "Show amounts" : "Hide amounts"}
            >
              {privacy ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78 3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                </svg>
              )}
            </button>
          </div>

          {/* Big value */}
          <p className="pv font-display text-4xl sm:text-5xl font-bold text-[var(--text)] nums tracking-tight mt-1.5 leading-none">
            {taka(animated, 0)}
          </p>

          {/* Move pills */}
          <div className="flex items-center gap-2 flex-wrap mt-3.5">
            <MovePill label="Today" delta={todayMove?.delta ?? null} pct={todayMove?.pct ?? null} />
            <MovePill label="Total" delta={pnl} pct={pnlPct} />
            <MarketChip portfolioPct={todayMove?.pct ?? null} dsexPct={dsexPct} />
          </div>

          {/* Secondary line */}
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-3">
            {hasValue ? (
              <>
                Invested <span className="pv font-semibold text-[var(--text)] nums">{taka(totalInvested, 0)}</span>
                {" · "}
                {holdingsCount} stock{holdingsCount === 1 ? "" : "s"}
              </>
            ) : (
              <>
                {holdingsCount} stock{holdingsCount === 1 ? "" : "s"} · live prices arrive when the
                market updates
              </>
            )}
          </p>
        </div>

        {/* Allocation donut */}
        <div className="hidden sm:block">
          <HeroDonut slices={slices} holdingsCount={holdingsCount} />
        </div>
      </div>
    </section>
  );
}
