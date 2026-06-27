import StreakBadge from "@/components/home/personalized/StreakBadge";
import AlertsBell from "@/components/home/personalized/AlertsBell";
import type { MarketIndexData } from "@/lib/api";
import type { HomeAlert } from "@/lib/home-alerts";

interface Props {
  name?: string | null;
  dateStr: string;
  marketIndex?: MarketIndexData | null;
  /** Portfolio move today, when the user has holdings — drives the personal subline. */
  todayMove?: { delta: number; pct: number } | null;
  /** Watchlist size — used for the subline when there's no portfolio yet. */
  watchlistCount?: number;
  /** Personalized alerts for the bell (portfolio, movers, dividends, news). */
  alerts?: HomeAlert[];
}

export default function WelcomeHeader({
  name,
  dateStr,
  marketIndex,
  todayMove,
  watchlistCount = 0,
  alerts = [],
}: Props) {
  const dsex = marketIndex?.dsex;
  const chgPct = marketIndex?.dsex_change_pct;
  const up = (chgPct ?? 0) >= 0;
  const color = up ? "var(--positive)" : "var(--negative)";
  const hasSubline = !!todayMove || watchlistCount > 0;

  return (
    <header>
      {/* Date · market — one balanced line */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          {dateStr}
        </span>
        {dsex != null && (
          <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold tabular-nums">
            <span className="text-[var(--text-muted)]">DSEX</span>
            <span className="text-[var(--text)]">
              {dsex.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {chgPct != null && (
              <span style={{ color }}>
                {up ? "▲" : "▼"} {up ? "+" : ""}
                {chgPct.toFixed(2)}%
              </span>
            )}
          </span>
        )}
      </div>

      {/* Greeting + alerts bell (replaces the old wave) */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <h1 className="text-[clamp(1.5rem,6vw,2rem)] font-extrabold tracking-tight text-[var(--text)] leading-tight">
          Welcome back{name ? <>, <span className="text-[var(--primary)]">{name}</span></> : ""}
        </h1>
        <AlertsBell alerts={alerts} />
      </div>

      {/* One quiet subline: follow count + streak */}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-sm text-[var(--text-muted)]">
        {todayMove ? (
          <span className="font-medium">
            Your stocks are{" "}
            <span style={{ color: todayMove.delta >= 0 ? "var(--positive)" : "var(--negative)" }}>
              {todayMove.delta >= 0 ? "up" : "down"} ৳
              {Math.abs(todayMove.delta).toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </span>{" "}
            today
          </span>
        ) : watchlistCount > 0 ? (
          <span className="font-medium">
            Following {watchlistCount} {watchlistCount === 1 ? "stock" : "stocks"}
          </span>
        ) : null}
        <StreakBadge leadingDot={hasSubline} />
      </div>
    </header>
  );
}
