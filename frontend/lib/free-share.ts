/**
 * How much of a premium list a free reader sees. A plain module (no
 * "use client") so server components can call it — `lib/premium.ts` is a
 * client module and can't be called during a server render.
 */

/**
 * Dividend calendar: free readers get a glimpse, not a share — the first rows
 * of each list, next to `DividendPromo` saying what the full calendar does.
 * (Was the first 25% of every list until 2026-10-24, which left most of the
 * calendar open.)
 */
export const FREE_CALENDAR_ROWS = {
  recordDates: 2,
  agms: 1,
  topCash: 1,
  declared: 1,
  /** The dashboard's "Money coming" card. */
  dashboard: 2,
} as const;

/** Split a list into the free head (`n` rows) and the locked rest. */
export function splitFree<T>(items: T[], n: number): [T[], T[]] {
  const k = Math.max(0, Math.min(items.length, n));
  return [items.slice(0, k), items.slice(k)];
}
