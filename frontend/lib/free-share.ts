/**
 * How much of a premium list a free reader sees. A plain module (no
 * "use client") so server components can call it — `lib/premium.ts` is a
 * client module and can't be called during a server render.
 */

/** Dividend calendar: free readers see the first quarter of each list. */
export const FREE_CALENDAR_SHARE = 0.25;

/** Rows a free reader sees out of `n` — at least one, so no list opens empty. */
export function freeCount(n: number, share = FREE_CALENDAR_SHARE): number {
  if (n <= 0) return 0;
  return Math.min(n, Math.max(1, Math.ceil(n * share)));
}

/** Split a list into the free head and the locked rest. */
export function splitFree<T>(items: T[], share = FREE_CALENDAR_SHARE): [T[], T[]] {
  const n = freeCount(items.length, share);
  return [items.slice(0, n), items.slice(n)];
}
