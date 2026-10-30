/**
 * How much of a premium list a free reader sees. A plain module (no
 * "use client") so server components can call it — `lib/premium.ts` is a
 * client module and can't be called during a server render.
 */

/**
 * THE free amount (2026-10-29, the Free vs Premium plan): the top 3 of every
 * list of other companies is free — signals, the screener, Picked for you,
 * the research lists, stories. One number a
 * reader learns after one page. Rankings, results and the dividend calendar
 * are open in full since 2026-10-29 (plan step 4).
 */
export const FREE_LIST_ROWS = 3;

/** `/buy-sell-signals`: the first buy signals of the current view a free
 *  reader sees (Strong buys lead the default order); the rest is Premium
 *  (user decision 2026-10-25). */
export const FREE_SIGNAL_ROWS = FREE_LIST_ROWS;

/** `/screener`: the first stocks that pass a screen a free reader sees; none
 *  when the screen uses a power check. The rest is Premium (user decision
 *  2026-10-26). */
export const FREE_SCREENER_ROWS = FREE_LIST_ROWS;

/** The dashboard's "Picked for you": the picks a free reader sees in full;
 *  the rest of the 15 sits blurred behind one lock (user decision 2026-10-27). */
export const FREE_FORYOU_ROWS = FREE_LIST_ROWS;

/** The dashboard's stories: a free reader opens the first three (the "Today"
 *  story counts as one), in importance order; the rest sit behind one
 *  Premium ring with their count and kinds (user decision 2026-10-28, first
 *  five, then three the same day). Seen stories stay in the row and replay
 *  any number of times. */
export const FREE_STORIES = FREE_LIST_ROWS;

/* The stock report's free taste is a whole chapter since 2026-10-30
   (`FREE_CHAPTER` in lib/stock-report.ts, the full report plan): it replaced
   three scattered sample sections (red flags, this year, cash). */

/** Research list pages and the research rows on /market-analysis and the
 *  dashboard: the top three companies are free (was fully locked until
 *  2026-10-29). */
export const FREE_RESEARCH_ROWS = FREE_LIST_ROWS;

/** Split a list into the free head (`n` rows) and the locked rest. */
export function splitFree<T>(items: T[], n: number): [T[], T[]] {
  const k = Math.max(0, Math.min(items.length, n));
  return [items.slice(0, k), items.slice(k)];
}
