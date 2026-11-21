/**
 * What the dividend calendar's Premium card says (2026-11-04; made simple
 * 2026-11-05; THE Premium line step 2, 2026-11-22: the next 7 days of record
 * dates are free for everyone above the card, so the card no longer carries a
 * free example — it counts what lies past the week, and the reader's own
 * dividends are worked out in the browser). Pure: built on the server from
 * the calendar the page already fetched, so the card is in the first paint.
 */
import type { CorporateActionEvent, DividendCalendarData } from "@/lib/api";
import { freeN } from "@/lib/premium-line";

/** Days of record dates a free reader sees in full (THE Premium line: the
 *  calendar's `week` shape). */
export const FREE_WEEK_DAYS = freeN("dividend_calendar") || 7;

/** The free week: dividend-paying record dates from today to `FREE_WEEK_DAYS` ahead. */
export function weekEvents(events: CorporateActionEvent[]): CorporateActionEvent[] {
  return events.filter(
    (e) => !e.is_no_dividend && e.record_days_left != null && e.record_days_left >= 0 && e.record_days_left <= FREE_WEEK_DAYS,
  );
}

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
  /** Dividend-paying record dates after the free week. */
  after: number;
};

export function buildCalendarPromo(data: DividendCalendarData): CalendarPromo {
  const cashRows = data.record_dates.filter((e) => (e.cash_per_share ?? 0) > 0 && e.record_date);
  const ahead = cashRows.filter((e) => e.record_days_left == null || e.record_days_left >= 0);

  const days = groupDays(
    ahead
      .filter((e) => e.record_days_left != null && e.record_days_left <= PROMO_DAYS)
      .map((e) => ({ date: e.record_date as string, cash: e.cash_per_share ?? 0 })),
  );

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
    after: data.record_dates.filter(
      (e) => !e.is_no_dividend && e.record_days_left != null && e.record_days_left > FREE_WEEK_DAYS,
    ).length,
  };
}
