/**
 * How much of a premium list a free reader sees. A plain module (no
 * "use client") so server components can call it — `lib/premium.ts` is a
 * client module and can't be called during a server render.
 */

/**
 * THE free amount (2026-10-29, the Free vs Premium plan): the top 3 of every
 * list of other companies is free — the screener and the research lists.
 * One number a reader learns after one page. Rankings, results and the
 * dividend calendar are open in full since 2026-10-29 (plan step 4); the
 * buy signals list and the dashboard stories since 2026-10-31 (the Premium
 * Desk plan — Premium adds the reasons and the delivery).
 */
export const FREE_LIST_ROWS = 3;

/** `/screener`: the first stocks that pass a screen a free reader sees; none
 *  when the screen uses a power check. The rest is Premium (user decision
 *  2026-10-26). */
export const FREE_SCREENER_ROWS = FREE_LIST_ROWS;

/* The dashboard's "Picked for you" has no free rows since 2026-11-01: the
   whole list is Premium, a free reader gets one Premium card. */

/* The stock report has no free taste since 2026-11-01: the whole report is
   Premium (today's free report and report keys still open it). */

/** Research list pages and the research rows on /market-analysis and the
 *  dashboard: the top three companies are free (was fully locked until
 *  2026-10-29). */
export const FREE_RESEARCH_ROWS = FREE_LIST_ROWS;

/** Split a list into the free head (`n` rows) and the locked rest. */
export function splitFree<T>(items: T[], n: number): [T[], T[]] {
  const k = Math.max(0, Math.min(items.length, n));
  return [items.slice(0, k), items.slice(k)];
}
