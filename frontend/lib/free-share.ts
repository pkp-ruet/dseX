/**
 * How much of a premium list a free reader sees. A plain module (no
 * "use client") so server components can call it — `lib/premium.ts` is a
 * client module and can't be called during a server render.
 */

/**
 * THE free amount (2026-10-29, the Free vs Premium plan): the top 3 of every
 * list of other companies is free (the research lists used it until they
 * were removed 2026-11-05). (The screener is
 * free in full since 2026-11-01: it filters public figures; only our own
 * view as a filter is Premium.)
 * One number a reader learns after one page. Rankings, results and the
 * dividend calendar are open in full since 2026-10-29 (plan step 4); the
 * buy signals list and the dashboard stories since 2026-10-31 (the Premium
 * Desk plan — Premium adds the reasons and the delivery).
 */
export const FREE_LIST_ROWS = 3;

/**
 * Discover (was "Picked for you", all Premium 2026-11-01 → 11-08): since
 * 2026-11-08 (user: "Open list, lock depth") a free reader sees the top 5
 * companies, each with its name and why it fits them; Premium opens the
 * rest of the list and the full case under every company (the four facts,
 * the one thing to watch, the checks it passed). The dashboard's three
 * tiles are open for everyone.
 */
export const FREE_DISCOVER_ROWS = 5;

/* The stock report has no free taste since 2026-11-01: the whole report is
   Premium (a free reader's 10 free analyses a month still open it). */

/** Split a list into the free head (`n` rows) and the locked rest. */
export function splitFree<T>(items: T[], n: number): [T[], T[]] {
  const k = Math.max(0, Math.min(items.length, n));
  return [items.slice(0, k), items.slice(k)];
}
