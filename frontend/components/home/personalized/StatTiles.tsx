"use client";

import { useState } from "react";
import Link from "next/link";
import {
  type ScoreItem,
  type DividendsUpcoming,
  type UpcomingDividend,
  type MarketIndexData,
  type PortfolioHolding,
} from "@/lib/api";
import { analyzeWatchlist } from "@/lib/watchlist-analysis";
import type { HomeAlert } from "@/lib/home-alerts";
import { signed } from "@/lib/formatters";

const TILE_CLS =
  "soft-card hover-lift group relative flex h-full w-full flex-col items-start gap-1 overflow-hidden p-3 text-left transition";

/** Per-tile accent chrome: flat tint + tinted border — clean, no gradients. */
function tileStyle(accent: string): React.CSSProperties {
  return {
    background: `color-mix(in srgb, ${accent} 7%, var(--surface))`,
    borderColor: `color-mix(in srgb, ${accent} 28%, var(--border))`,
  };
}

function Tile({
  href,
  onClick,
  expanded,
  ariaLabel,
  accent = "var(--primary)",
  icon,
  children,
}: {
  href?: string;
  onClick?: () => void;
  expanded?: boolean;
  ariaLabel?: string;
  /** Color identity of the tile (CSS color token). */
  accent?: string;
  /** Small icon rendered in a gradient chip, top-right. */
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const style = tileStyle(accent);
  const body = (
    <>
      {icon && (
        <span
          className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-lg text-white transition-transform group-hover:scale-110"
          style={{ background: accent }}
          aria-hidden
        >
          {icon}
        </span>
      )}
      {children}
    </>
  );
  if (href) {
    return (
      <Link prefetch={false} href={href} aria-label={ariaLabel} className={TILE_CLS} style={style}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-expanded={expanded}
        aria-label={ariaLabel}
        className={TILE_CLS}
        style={style}
      >
        {body}
      </button>
    );
  }
  return (
    <div className={TILE_CLS} style={style}>
      {body}
    </div>
  );
}

function Label({ accent, children }: { accent?: string; children: React.ReactNode }) {
  return (
    <span
      className="pr-9 text-[0.6rem] font-extrabold uppercase tracking-[0.12em]"
      style={{ color: accent ?? "var(--text-muted)" }}
    >
      {children}
    </span>
  );
}

const MAIN_CLS = "flex w-full items-center gap-1.5 text-[0.95rem] font-extrabold text-[var(--text)] leading-tight";
const SUB_CLS = "mt-auto pt-1 text-[0.65rem] font-semibold text-[var(--text-muted)] leading-snug";

/** Short label for an alert's kind, derived from its id prefix (see buildHomeAlerts). */
const KIND_LABEL: Record<string, string> = {
  pa: "price target",
  sg: "signal",
  pf: "portfolio",
  mv: "big mover",
  hi: "52-week",
  lo: "52-week",
  dv: "dividend",
  nw: "news",
};

function alertKinds(alerts: HomeAlert[]): string {
  const seen: string[] = [];
  for (const a of alerts) {
    const label = KIND_LABEL[a.id.split(":")[0]];
    if (label && !seen.includes(label)) seen.push(label);
    if (seen.length === 3) break;
  }
  return seen.join(" · ");
}

interface DivPick {
  code: string;
  date: Date | null;
  kind: "record" | "declaration";
}

/** Earliest upcoming dividend event among the user's stocks (record dates and
 *  projected declarations); dated entries first, undated last. */
function nextDividend(dividends: DividendsUpcoming | null, universe: Set<string>): DivPick | null {
  if (!dividends) return null;
  const picks: DivPick[] = [];
  const push = (d: UpcomingDividend, kind: DivPick["kind"], raw: string | null) => {
    if (!universe.has(d.trading_code.toUpperCase())) return;
    let date: Date | null = null;
    if (raw) {
      const t = new Date(raw);
      if (!Number.isNaN(t.getTime())) date = t;
    }
    picks.push({ code: d.trading_code, date, kind });
  };
  for (const d of dividends.upcoming_record_dates ?? []) push(d, "record", d.record_date);
  for (const d of dividends.upcoming_declarations ?? []) push(d, "declaration", d.projected_date);
  if (picks.length === 0) return null;
  picks.sort((a, b) => (a.date?.getTime() ?? Infinity) - (b.date?.getTime() ?? Infinity));
  return picks[0];
}

function relDays(date: Date): string {
  const days = Math.ceil((date.getTime() - Date.now()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

function fmtShort(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const BELL = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const STAR_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" aria-hidden="true">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
const NOTE_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
  </svg>
);
const CHART_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 20V10M12 20V4M19 20v-6" />
  </svg>
);
const TREND_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="3 17 9 11 13 15 21 7" />
    <polyline points="15 7 21 7 21 13" />
  </svg>
);

/** Glance row of the money dashboard: watchlist pulse, alerts (tap to expand
 *  the feed inline), next dividend (falls back to DSEX), best mover today. */
export default function StatTiles({
  codes,
  holdings,
  priceMap,
  dividends,
  marketIndex,
  alerts,
}: {
  codes: string[];
  holdings: PortfolioHolding[];
  priceMap: Map<string, ScoreItem>;
  dividends: DividendsUpcoming | null;
  marketIndex: MarketIndexData | null;
  alerts: HomeAlert[];
}) {
  const [alertsOpen, setAlertsOpen] = useState(false);

  const held = new Set(holdings.map((h) => h.trading_code.toUpperCase()));
  const universe = new Set([...held, ...codes.map((c) => c.toUpperCase())]);

  const wl = codes.length > 0 ? analyzeWatchlist(codes, priceMap, dividends) : null;
  const wlUp = (wl?.avgChange ?? 0) >= 0;
  const wlColor =
    wl?.avgChange == null || Math.abs(wl.avgChange) < 0.05
      ? "var(--text)"
      : wl.avgChange > 0
        ? "var(--positive)"
        : "var(--negative)";

  const div = nextDividend(dividends, universe);

  // Biggest mover among the user's stocks — best gainer, or (all-red days) worst drop.
  const movers = Array.from(universe)
    .map((c) => priceMap.get(c))
    .filter((x): x is ScoreItem => !!x && x.change_pct != null)
    .sort((a, b) => (b.change_pct as number) - (a.change_pct as number));
  const best = movers.length
    ? (movers[0].change_pct as number) >= 0
      ? movers[0]
      : movers[movers.length - 1]
    : null;
  const bestUp = best != null && (best.change_pct as number) >= 0;

  const dsexChg = marketIndex?.dsex_change_pct ?? null;
  const dsexUp = (dsexChg ?? 0) >= 0;

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* 1 — Watchlist pulse (blue) */}
        <Tile href="/watchlist" ariaLabel="Watchlist today — view all" accent="var(--primary)" icon={STAR_ICON}>
          <Label accent="var(--primary)">Watchlist today</Label>
          {codes.length === 0 ? (
            <>
              <span className={MAIN_CLS} style={{ color: "var(--primary)" }}>
                + Build one
              </span>
              <span className={SUB_CLS}>track stocks you&apos;re eyeing</span>
            </>
          ) : wl?.avgChange != null ? (
            <>
              <span className={`${MAIN_CLS} tabular-nums nums`} style={{ color: wlColor }}>
                {wlUp ? "▲" : "▼"} {wlUp ? "+" : ""}
                {wl.avgChange.toFixed(2)}%
              </span>
              {wl.total > 0 && (
                <span
                  className="mt-0.5 block h-1.5 w-full overflow-hidden rounded-full"
                  style={{ background: "color-mix(in srgb, var(--negative) 16%, var(--surface-2))" }}
                  aria-hidden
                >
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${(wl.upCount / wl.total) * 100}%`, background: "var(--positive)" }}
                  />
                </span>
              )}
              <span className={SUB_CLS}>
                {wl.upCount} of {wl.total} advancing
              </span>
            </>
          ) : (
            <>
              <span className={MAIN_CLS}>—</span>
              <span className={SUB_CLS}>no price data yet</span>
            </>
          )}
        </Tile>

        {/* 2 — Alerts (violet; expands the feed below) */}
        <Tile
          onClick={() => setAlertsOpen((o) => !o)}
          expanded={alertsOpen}
          ariaLabel={alerts.length > 0 ? `${alerts.length} new alerts — tap to ${alertsOpen ? "hide" : "view"}` : "Alerts — all quiet today"}
          accent="var(--np-cautious)"
          icon={BELL}
        >
          <Label accent="var(--np-cautious)">Alerts</Label>
          <span className={MAIN_CLS}>
            {alerts.length > 0 ? `${alerts.length} new` : "All quiet"}
            {alerts.length > 0 && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--negative)]" aria-hidden />}
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`shrink-0 text-[var(--text-muted)] transition-transform ${alertsOpen ? "rotate-180" : ""}`}
              aria-hidden
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
          <span className={SUB_CLS}>{alerts.length > 0 ? alertKinds(alerts) : "nothing new on your stocks"}</span>
        </Tile>

        {/* 3 — Next dividend (amber), falling back to the DSEX benchmark (indigo) */}
        {div ? (
          <Tile href={`/stock/${div.code}`} ariaLabel={`Next dividend: ${div.code}`} accent="var(--watch)" icon={NOTE_ICON}>
            <Label accent="var(--watch)">Next dividend</Label>
            <span className={`${MAIN_CLS} block truncate pr-7`}>
              {div.code}
              {div.date ? ` · ${fmtShort(div.date)}` : ""}
            </span>
            <span className={SUB_CLS}>
              {div.kind === "record"
                ? div.date
                  ? `record date ${relDays(div.date)}`
                  : "record date soon"
                : div.date
                  ? `declaration expected ${relDays(div.date)}`
                  : "declaration expected"}
            </span>
          </Tile>
        ) : marketIndex?.dsex != null ? (
          <Tile href="/dse-today" ariaLabel="DSEX today" accent="var(--np-safe)" icon={CHART_ICON}>
            <Label accent="var(--np-safe)">DSEX today</Label>
            <span className={`${MAIN_CLS} tabular-nums nums`}>
              {marketIndex.dsex.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span
              className={`${SUB_CLS} tabular-nums nums`}
              style={dsexChg != null ? { color: dsexUp ? "var(--positive)" : "var(--negative)" } : undefined}
            >
              {dsexChg != null ? `${dsexUp ? "▲" : "▼"} ${dsexUp ? "+" : ""}${dsexChg.toFixed(2)}% today` : "market benchmark"}
            </span>
          </Tile>
        ) : (
          <Tile accent="var(--watch)" icon={NOTE_ICON}>
            <Label accent="var(--watch)">Next dividend</Label>
            <span className={MAIN_CLS}>—</span>
            <span className={SUB_CLS}>none upcoming on your stocks</span>
          </Tile>
        )}

        {/* 4 — Best mover today (green, or red on all-red days) */}
        {best ? (
          <Tile
            href={`/stock/${best.trading_code}`}
            ariaLabel={`${bestUp ? "Best today" : "Biggest drop"}: ${best.trading_code}`}
            accent={bestUp ? "var(--positive)" : "var(--negative)"}
            icon={TREND_ICON}
          >
            <Label accent={bestUp ? "var(--positive)" : "var(--negative)"}>
              {bestUp ? "Best today" : "Biggest drop"}
            </Label>
            <span className="w-full truncate pr-7 font-mono text-[0.9rem] font-extrabold tracking-wide text-[var(--text)]">
              {best.trading_code}
            </span>
            <span
              className="text-[0.8rem] font-bold tabular-nums nums leading-tight"
              style={{ color: bestUp ? "var(--positive)" : "var(--negative)" }}
            >
              {signed(best.change_pct as number)}%
            </span>
            <span className={SUB_CLS}>{held.has(best.trading_code.toUpperCase()) ? "you hold it" : "on your watchlist"}</span>
          </Tile>
        ) : (
          <Tile accent="var(--positive)" icon={TREND_ICON}>
            <Label accent="var(--positive)">Best today</Label>
            <span className={MAIN_CLS}>—</span>
            <span className={SUB_CLS}>no moves yet today</span>
          </Tile>
        )}
      </div>

      {/* Inline alert feed — the bell's content, surfaced on the dashboard. */}
      {alertsOpen && (
        <div className="soft-card mt-3 overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
            <h3 className="text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
              Today on your stocks
            </h3>
            <button
              type="button"
              onClick={() => setAlertsOpen(false)}
              className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              Hide
            </button>
          </div>
          {alerts.length === 0 ? (
            <p className="px-4 py-4 text-sm text-[var(--text-muted)]">
              You&apos;re all caught up — no new alerts on your stocks today.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-[var(--cell-rule)]">
                {alerts.slice(0, 8).map((a) => {
                  const toneColor =
                    a.tone === "positive"
                      ? "var(--positive)"
                      : a.tone === "negative"
                        ? "var(--negative)"
                        : "var(--text-muted)";
                  const inner = (
                    <>
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--surface-2)] text-sm" aria-hidden>
                        {a.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[var(--text)]">{a.title}</span>
                        {a.detail && (
                          <span className="block truncate text-xs font-medium" style={{ color: toneColor }}>
                            {a.detail}
                          </span>
                        )}
                      </span>
                      {a.href && (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--text-muted)]" aria-hidden>
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      )}
                    </>
                  );
                  return (
                    <li key={a.id}>
                      {a.href ? (
                        <Link
                          prefetch={false}
                          href={a.href}
                          className="flex items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-[var(--surface-2)]"
                        >
                          {inner}
                        </Link>
                      ) : (
                        <div className="flex items-center gap-2.5 px-4 py-2.5">{inner}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
              {alerts.length > 8 && (
                <p className="border-t border-[var(--border)] px-4 py-2 text-[0.68rem] font-semibold text-[var(--text-muted)]">
                  +{alerts.length - 8} more in the bell above
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
