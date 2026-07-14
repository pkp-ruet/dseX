import StreakBadge from "@/components/home/personalized/StreakBadge";
import AlertsBell from "@/components/home/personalized/AlertsBell";
import MarketStatusPill from "@/components/home/personalized/MarketStatusPill";
import { bstHour } from "@/lib/market-hours";
import type { MarketIndexData } from "@/lib/api";
import type { HomeAlert } from "@/lib/home-alerts";
import type { BriefSegment } from "@/lib/daily-brief";

interface Props {
  name?: string | null;
  dateStr: string;
  marketIndex?: MarketIndexData | null;
  /** Watchlist size — used for the meta line. */
  watchlistCount?: number;
  /** Personalized alerts for the bell (portfolio, movers, dividends, news). */
  alerts?: HomeAlert[];
  /** First render right after signup — greet as new instead of the time-of-day line. */
  isNew?: boolean;
  /** The synthesized one-line "daily brief" (coloured segments). */
  brief?: BriefSegment[];
}

const TONE_COLOR: Record<NonNullable<BriefSegment["tone"]>, string> = {
  pos: "var(--positive)",
  neg: "var(--negative)",
  accent: "var(--primary)",
};

/** Time-of-day greeting on the BST wall clock (client-rendered subtree). */
function greetingForHour(h: number): string {
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function WelcomeHeader({
  name,
  dateStr,
  marketIndex,
  watchlistCount = 0,
  alerts = [],
  isNew = false,
  brief = [],
}: Props) {
  const dsex = marketIndex?.dsex;
  const chgPct = marketIndex?.dsex_change_pct;
  const up = (chgPct ?? 0) >= 0;
  const color = up ? "var(--positive)" : "var(--negative)";
  const greeting = isNew ? "Welcome to TopStockBD" : greetingForHour(bstHour());

  return (
    <header>
      {/* Date · live status · market — one balanced, wrap-friendly line */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="mr-auto text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          {dateStr}
        </span>
        <MarketStatusPill />
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

      {/* Greeting + alerts bell */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <h1 className="text-[clamp(1.5rem,6vw,2rem)] font-extrabold tracking-tight text-[var(--text)] leading-tight">
          {greeting}
          {name ? <>, <span className="text-[var(--primary)]">{name}</span></> : ""}
          {isNew ? " 👋" : ""}
        </h1>
        <AlertsBell alerts={alerts} />
      </div>

      {/* Daily brief — the synthesized concierge sentence */}
      {brief.length > 0 && (
        <p className="mt-1.5 text-[0.95rem] leading-relaxed text-[var(--text-muted)]">
          {brief.map((s, i) => (
            <span
              key={i}
              className={s.tone ? "font-bold" : undefined}
              style={s.tone ? { color: TONE_COLOR[s.tone] } : undefined}
            >
              {s.text}
            </span>
          ))}
        </p>
      )}

      {/* One quiet meta line: follow count + streak */}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-sm text-[var(--text-muted)]">
        {watchlistCount > 0 && (
          <span className="font-medium">
            Following {watchlistCount} {watchlistCount === 1 ? "stock" : "stocks"}
          </span>
        )}
        <StreakBadge leadingDot={watchlistCount > 0} />
      </div>
    </header>
  );
}
