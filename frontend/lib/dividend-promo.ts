/**
 * The dividend calendar's Premium counts (the card, 2026-11-04; since
 * 2026-11-25 the locked calendar and its Premium sheet read them; made simple
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

/* ---- The locked calendar (2026-11-25, one way to show Premium) ----
 * Since step 5 of the "One job, one place" review a free reader no longer
 * gets a Premium card under the free week: the rest of the calendar shows
 * with its dates and counts, and a gold lock where each company and amount
 * would be. This is that view's data, built on the server: dates, counts and
 * each grey bar's width (from the name's length), never a name or an amount. */

/** Rows a locked list shows before its "And N more" lock. */
export const LOCKED_ROWS = 8;
/** Rows the two lists without dates (coming next, just declared) show. */
export const LOCKED_LIST_ROWS = 6;

/** A grey bar's width from the hidden name's length (MaskedName's rule). */
function barWidth(name: string | null | undefined): number {
  return Math.max(96, Math.min(190, (name ?? "").length * 6));
}

export type LockedDay = {
  date: string;
  days: number | null;
  /** The date's last day to buy (the same for every company on it). */
  buy_by: string | null;
  buy_days_left: number | null;
  /** Companies on this date in all. */
  n: number;
  /** Grey-bar widths of the rows shown. */
  rows: number[];
};

export type LockedDays = {
  /** Events in all, and on how many dates. */
  total: number;
  dates: number;
  days: LockedDay[];
  /** Events past the rows shown. */
  more: number;
};

export type LockedList = {
  total: number;
  rows: { w: number; date: string | null }[];
  more: number;
};

export type LockedCalendar = {
  record: LockedDays;
  coming: LockedList;
  recent: LockedList;
  agms: LockedDays;
};

function lockedDays(events: CorporateActionEvent[], kind: "record" | "agm"): LockedDays {
  const key = kind === "agm" ? "agm_date" : "record_date";
  const sorted = [...events].sort((a, b) => (a[key] as string).localeCompare(b[key] as string));
  const byDate: { date: string; items: CorporateActionEvent[] }[] = [];
  for (const e of sorted) {
    const d = e[key] as string;
    const last = byDate[byDate.length - 1];
    if (last && last.date === d) last.items.push(e);
    else byDate.push({ date: d, items: [e] });
  }
  const days: LockedDay[] = [];
  let shown = 0;
  for (const g of byDate) {
    if (shown >= LOCKED_ROWS) break;
    const take = g.items.slice(0, LOCKED_ROWS - shown);
    shown += take.length;
    const first = g.items[0];
    days.push({
      date: g.date,
      days: kind === "agm" ? first.agm_days_left : first.record_days_left,
      buy_by: kind === "record" ? first.buy_by : null,
      buy_days_left: kind === "record" ? first.buy_days_left : null,
      n: g.items.length,
      rows: take.map((e) => barWidth(e.company_name ?? e.trading_code)),
    });
  }
  return { total: sorted.length, dates: byDate.length, days, more: sorted.length - shown };
}

export function buildLockedCalendar(data: DividendCalendarData): LockedCalendar {
  // Past the free week: dividend-paying record dates (the week's own rule).
  const record = data.record_dates.filter(
    (e) => !e.is_no_dividend && e.record_date && e.record_days_left != null && e.record_days_left > FREE_WEEK_DAYS,
  );
  const agms = data.agms.filter((e) => e.agm_date && (e.agm_days_left == null || e.agm_days_left >= 0));
  const forecast = data.forecast ?? [];
  const recent = data.recent_declarations.slice(0, RECENT_LIMIT);
  return {
    record: lockedDays(record, "record"),
    agms: lockedDays(agms, "agm"),
    coming: {
      total: forecast.length,
      rows: forecast.slice(0, LOCKED_LIST_ROWS).map((f) => ({ w: barWidth(f.company_name ?? f.trading_code), date: null })),
      more: Math.max(0, forecast.length - LOCKED_LIST_ROWS),
    },
    recent: {
      total: recent.length,
      rows: recent.slice(0, LOCKED_LIST_ROWS).map((e) => ({ w: barWidth(e.company_name ?? e.trading_code), date: e.declaration_date })),
      more: Math.max(0, recent.length - LOCKED_LIST_ROWS),
    },
  };
}
