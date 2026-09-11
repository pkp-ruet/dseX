/**
 * Record-date arithmetic for one company's dividend ledger.
 *
 * Mirrors `backend/services/corporate_actions_service.py`: DSE settles the
 * normal market on T+2 and opens a spot window in the last two trading days
 * before a record date, so a normal-market buy needs three Bangladesh trading
 * days (Sun–Thu; holidays not modelled) of headroom to be on the register.
 */

export const SPOT_WINDOW_DAYS = 2;
export const NORMAL_BUY_LEAD_DAYS = SPOT_WINDOW_DAYS + 1;

const WEEKEND = new Set([5, 6]); // JS getDay(): Fri = 5, Sat = 6

export function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(String(value).slice(0, 10) + "T00:00:00");
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Step back `days` Bangladesh trading days. */
export function minusTradingDays(d: Date, days: number): Date {
  const out = new Date(d);
  let left = days;
  while (left > 0) {
    out.setDate(out.getDate() - 1);
    if (!WEEKEND.has(out.getDay())) left -= 1;
  }
  return out;
}

export function todayDhaka(): Date {
  // Bangladesh is UTC+6 with no DST.
  const now = new Date();
  const dhaka = new Date(now.getTime() + (6 * 60 + now.getTimezoneOffset()) * 60_000);
  dhaka.setHours(0, 0, 0, 0);
  return dhaka;
}

/** Local-calendar ISO date (`YYYY-MM-DD`). `toISOString()` would shift a local
 *  midnight east of UTC back to the previous day — never use it for dates here. */
export function isoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Whole days from `from` to `to` (negative when `to` is in the past). */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

export interface RecordDateInfo {
  recordDate: Date;
  /** Last day a normal-market buy still lands on the register. */
  buyBy: Date;
  recordDaysLeft: number;
  buyDaysLeft: number;
}

export function recordDateInfo(recordDate: string | null | undefined, today = todayDhaka()): RecordDateInfo | null {
  const rd = toDate(recordDate);
  if (!rd) return null;
  const buyBy = minusTradingDays(rd, NORMAL_BUY_LEAD_DAYS);
  return {
    recordDate: rd,
    buyBy,
    recordDaysLeft: daysBetween(today, rd),
    buyDaysLeft: daysBetween(today, buyBy),
  };
}
