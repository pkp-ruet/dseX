/**
 * What the dividend calendar's Premium card says (2026-11-04, user: "make the
 * whole dividend calendar page premium. free user will see a promo card like
 * stock and portfolio page"). Pure: built on the server from the calendar the
 * page already fetched, so the card is in the first paint.
 *
 * Counts and dates only — never a company name, a cash figure tied to a
 * company or a safety word tied to a company. The reader's own shares are
 * added in the browser (`DividendPromo`) from `records` / `expected`.
 */
import type { DividendCalendarData } from "@/lib/api";

/** How many declarations the calendar's "Just declared" tab shows. */
export const RECENT_LIMIT = 12;

/** How far ahead the card's "coming up" timeline looks. */
export const PROMO_DAYS = 14;

export type PromoDay = {
  date: string;
  /** Record dates that day. */
  n: number;
  /** The largest cash a share that day (taka), for "up to ৳X a share"; 0 = bonus shares only. */
  maxCash: number;
  risk: number;
  watch: number;
};

/** One record date, for the by-day timeline. */
export type DayInput = { date: string; cash: number; level?: "safe" | "watch" | "risk" | null };

/** Record dates grouped by day, oldest first — the timeline on the calendar's
 *  Premium card, the dashboard's record-dates card and market analysis. */
export function groupDays(rows: DayInput[]): PromoDay[] {
  const byDay = new Map<string, PromoDay>();
  for (const r of rows) {
    const d = byDay.get(r.date) ?? { date: r.date, n: 0, maxCash: 0, risk: 0, watch: 0 };
    d.n += 1;
    d.maxCash = Math.max(d.maxCash, r.cash || 0);
    if (r.level === "risk") d.risk += 1;
    else if (r.level === "watch") d.watch += 1;
    byDay.set(r.date, d);
  }
  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** One cash record date ahead, slim, for the reader's own shares. */
export type PromoRecord = { code: string; date: string; cash: number; buyBy: string | null };

export type CalendarPromo = {
  today: string;
  /** Cash record dates ahead (the backend looks 120 days out). */
  cash: number;
  /** Companies behind them (an interim and a final count once). */
  companies: number;
  thisWeek: number;
  agms: number;
  declared: number;
  topPayers: number;
  /** "Coming next": companies that haven't declared for this year yet. */
  comingNext: number;
  /** How many of those carry an expected cash figure. */
  estimates: number;
  bestYield: number | null;
  /** "Is it safe?" over every cash record date ahead. */
  safety: { safe: number; watch: number; risk: number };
  /** Cash record dates that carry "Worth buying for it?". */
  capture: number;
  days: PromoDay[];
  records: PromoRecord[];
  /** Codes we expect to declare, with their expected record date. */
  expected: { code: string; date: string; cash: number }[];
};

export function buildCalendarPromo(data: DividendCalendarData): CalendarPromo {
  const cashRows = data.record_dates.filter((e) => (e.cash_per_share ?? 0) > 0 && e.record_date);
  const safety = { safe: 0, watch: 0, risk: 0 };
  for (const e of cashRows) {
    const l = e.safety?.level;
    if (l === "safe") safety.safe += 1;
    else if (l === "watch") safety.watch += 1;
    else if (l === "risk") safety.risk += 1;
  }

  const days = groupDays(
    cashRows
      .filter((e) => e.record_days_left != null && e.record_days_left >= 0 && e.record_days_left <= PROMO_DAYS)
      .map((e) => ({ date: e.record_date as string, cash: e.cash_per_share ?? 0, level: e.safety?.level })),
  );

  const forecast = data.forecast ?? [];
  return {
    today: data.today,
    cash: cashRows.length,
    companies: new Set(cashRows.map((e) => e.trading_code.toUpperCase())).size,
    thisWeek: data.stats.record_dates_this_week,
    agms: data.agms.length,
    // The "Just declared" tab shows this many.
    declared: Math.min(data.recent_declarations.length, RECENT_LIMIT),
    topPayers: data.top_cash_dividends.length,
    comingNext: forecast.length,
    estimates: forecast.filter((f) => (f.expected_cash_per_share ?? 0) > 0).length,
    bestYield: data.stats.top_yield_pct,
    safety,
    capture: cashRows.filter((e) => e.capture).length,
    days,
    records: cashRows
      .map((e) => ({
        code: e.trading_code.toUpperCase(),
        date: e.record_date as string,
        cash: e.cash_per_share as number,
        buyBy: e.buy_by,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    expected: forecast
      .filter((f) => f.expected_record && (f.expected_cash_per_share ?? 0) > 0 && (f.expected_record as string) >= data.today)
      .map((f) => ({
        code: f.trading_code.toUpperCase(),
        date: f.expected_record as string,
        cash: f.expected_cash_per_share as number,
      })),
  };
}
