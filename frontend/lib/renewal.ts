/**
 * Premium end dates, pure. Dates are Dhaka calendar days: Premium ending at
 * 20:00 UTC ends on the next day for the reader.
 *
 * 2026-11-26 (user decision): the renewal banner on every page, its "what
 * you'd lose" list and the renewal push were removed. A reader whose Premium
 * ends within `RENEW_ALERT_DAYS` sees one line under the home page's greeting
 * (`components/home/personalized/RenewAlert.tsx`), nothing else.
 */
import { bnDate } from "@/lib/bn";

/** The home page's renew alert shows in the last this-many days. */
export const RENEW_ALERT_DAYS = 7;
const DAY_MS = 86_400_000;
const DHAKA_MS = 6 * 3_600_000;

/** "2026-11-19": the Dhaka calendar day of an instant. */
export function dhakaDay(at: string | number | Date): string {
  const t = new Date(at).getTime();
  return new Date(t + DHAKA_MS).toISOString().slice(0, 10);
}

/** "19 Nov 2026" / "19 নভেম্বর 2026" for a Dhaka day. */
export function dayWords(day: string): { en: string; bn: string } {
  const d = new Date(`${day}T00:00:00Z`);
  const en = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return { en, bn: bnDate(day) };
}

/** "19 Nov" / "19 নভেম্বর" — the same date without the year. */
export function shortDayWords(day: string): { en: string; bn: string } {
  const w = dayWords(day);
  return { en: w.en.replace(/\s\d{4}$/, ""), bn: w.bn.replace(/\s\d{4}$/, "") };
}

/** Whole Dhaka days from today to the end day: 0 = ends today, 1 = tomorrow. */
export function daysToEnd(untilIso: string, now: number = Date.now()): number {
  const a = Date.parse(`${dhakaDay(now)}T00:00:00Z`);
  const b = Date.parse(`${dhakaDay(untilIso)}T00:00:00Z`);
  return Math.round((b - a) / DAY_MS);
}

/** The end date after one more plan of `days` bought now (the backend rule). */
export function extendedUntil(untilIso: string | null | undefined, days: number, now: number = Date.now()): string {
  const cur = untilIso ? new Date(untilIso).getTime() : NaN;
  const base = Number.isFinite(cur) && cur > now ? cur : now;
  return new Date(base + days * DAY_MS).toISOString();
}

/** Days left when Premium ends within the alert window, else null. */
export function endsSoon(untilIso: string | null | undefined, now: number = Date.now()): number | null {
  if (!untilIso) return null;
  const t = new Date(untilIso).getTime();
  if (!Number.isFinite(t) || t <= now) return null;
  const d = daysToEnd(untilIso, now);
  return d <= RENEW_ALERT_DAYS ? Math.max(0, d) : null;
}
