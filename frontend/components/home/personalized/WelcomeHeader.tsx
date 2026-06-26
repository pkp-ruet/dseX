import StreakBadge from "@/components/home/personalized/StreakBadge";
import type { MarketIndexData } from "@/lib/api";

interface Props {
  name?: string | null;
  dateStr: string;
  marketIndex?: MarketIndexData | null;
  /** Portfolio move today, when the user has holdings — drives the personal subline. */
  todayMove?: { delta: number; pct: number } | null;
  /** Watchlist size — used for the subline when there's no portfolio yet. */
  watchlistCount?: number;
}

export default function WelcomeHeader({
  name,
  dateStr,
  marketIndex,
  todayMove,
  watchlistCount = 0,
}: Props) {
  const dsex = marketIndex?.dsex;
  const chg = marketIndex?.dsex_change;
  const chgPct = marketIndex?.dsex_change_pct;
  const up = (chg ?? 0) >= 0;
  const color = up ? "var(--positive)" : "var(--negative)";

  return (
    <header className="pt-6 sm:pt-8 pb-1">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">{dateStr}</p>
        {dsex != null && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[0.72rem] font-bold tabular-nums">
            <span className="text-[var(--text-muted)]">DSEX</span>
            <span className="text-[var(--text)]">
              {dsex.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {chg != null && chgPct != null && (
              <span style={{ color }}>
                {up ? "▲" : "▼"} {up ? "+" : ""}
                {chg.toFixed(2)} ({up ? "+" : ""}
                {chgPct.toFixed(2)}%)
              </span>
            )}
          </span>
        )}
      </div>
      <h1 className="mt-1 text-[clamp(1.5rem,5vw,2.1rem)] font-extrabold tracking-tight text-[var(--text)] leading-tight">
        Welcome back{name ? <>, <span className="text-[var(--primary)]">{name}</span></> : ""} 👋
      </h1>
      {todayMove ? (
        <p className="mt-1 text-sm font-semibold text-[var(--text-muted)]">
          Your stocks are{" "}
          <span style={{ color: todayMove.delta >= 0 ? "var(--positive)" : "var(--negative)" }}>
            {todayMove.delta >= 0 ? "up" : "down"} ৳
            {Math.abs(todayMove.delta).toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </span>{" "}
          today
        </p>
      ) : watchlistCount > 0 ? (
        <p className="mt-1 text-sm font-semibold text-[var(--text-muted)]">
          You&apos;re following {watchlistCount} {watchlistCount === 1 ? "stock" : "stocks"}.
        </p>
      ) : null}
      <StreakBadge />
    </header>
  );
}
