/**
 * What the dividend calendar's Premium card says (2026-11-04; made simple
 * 2026-11-05, user: the card should be about finding the dividends coming
 * next, "more simple and easy to understand", no risk check). Pure: built on
 * the server from the calendar the page already fetched, so the card is in
 * the first paint.
 *
 * Counts and dates, plus ONE free example: the next cash record date in full
 * (company, cash a share, last day to buy) so a free reader sees exactly what
 * the calendar is.
 */
import type { DividendCalendarData } from "@/lib/api";

/** How many declarations the calendar's "Just declared" tab shows. */
export const RECENT_LIMIT = 12;

/** How far ahead the card's "coming up" timeline looks. */
export const PROMO_DAYS = 14;

/** The card's headline window ("… in the next 30 days"). */
export const SOON_DAYS = 30;

export type PromoDay = {
  date: string;
  /** Record dates that day. */
  n: number;
  /** The largest cash a share that day (taka), for "up to ৳X a share"; 0 = bonus shares only. */
  maxCash: number;
};

/** One record date, for the by-day timeline. */
export type DayInput = { date: string; cash: number };

/** Record dates grouped by day, oldest first — the timeline on the calendar's
 *  Premium card and the dashboard's record-dates card. */
export function groupDays(rows: DayInput[]): PromoDay[] {
  const byDay = new Map<string, PromoDay>();
  for (const r of rows) {
    const d = byDay.get(r.date) ?? { date: r.date, n: 0, maxCash: 0 };
    d.n += 1;
    d.maxCash = Math.max(d.maxCash, r.cash || 0);
    byDay.set(r.date, d);
  }
  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** The card's free example: the next cash record date, in full. */
export type PromoSample = {
  code: string;
  name: string;
  date: string;
  daysLeft: number | null;
  buyBy: string | null;
  buyDaysLeft: number | null;
  cash: number;
  yieldPct: number | null;
  type: string | null;
};

export type CalendarPromo = {
  today: string;
  /** Cash record dates ahead (the backend looks 120 days out). */
  cash: number;
  /** Companies behind them (an interim and a final count once). */
  companies: number;
  /** Companies with a cash record date in the next `SOON_DAYS`. */
  soon: number;
  thisWeek: number;
  /** "Coming next": companies that haven't declared for this year yet. */
  comingNext: number;
  bestYield: number | null;
  days: PromoDay[];
  sample: PromoSample | null;
};

export function buildCalendarPromo(data: DividendCalendarData): CalendarPromo {
  const cashRows = data.record_dates.filter((e) => (e.cash_per_share ?? 0) > 0 && e.record_date);
  const ahead = cashRows.filter((e) => e.record_days_left == null || e.record_days_left >= 0);

  const days = groupDays(
    ahead
      .filter((e) => e.record_days_left != null && e.record_days_left <= PROMO_DAYS)
      .map((e) => ({ date: e.record_date as string, cash: e.cash_per_share ?? 0 })),
  );

  // The example: the soonest record date whose last day to buy is still open,
  // else the soonest one ahead.
  const byDate = [...ahead].sort((a, b) => (a.record_date as string).localeCompare(b.record_date as string));
  const pick = byDate.find((e) => e.buy_days_left != null && e.buy_days_left >= 0) ?? byDate[0] ?? null;

  return {
    today: data.today,
    cash: cashRows.length,
    companies: new Set(cashRows.map((e) => e.trading_code.toUpperCase())).size,
    soon: new Set(
      ahead
        .filter((e) => e.record_days_left != null && e.record_days_left <= SOON_DAYS)
        .map((e) => e.trading_code.toUpperCase()),
    ).size,
    thisWeek: data.stats.record_dates_this_week,
    comingNext: (data.forecast ?? []).length,
    bestYield: data.stats.top_yield_pct,
    days,
    sample: pick
      ? {
          code: pick.trading_code.toUpperCase(),
          name: pick.company_name || pick.trading_code,
          date: pick.record_date as string,
          daysLeft: pick.record_days_left,
          buyBy: pick.buy_by,
          buyDaysLeft: pick.buy_days_left,
          cash: pick.cash_per_share as number,
          yieldPct: pick.yield_pct,
          type: pick.dividend_type,
        }
      : null,
  };
}
