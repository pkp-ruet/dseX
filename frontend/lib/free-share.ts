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

/**
 * The locked rows a free reader still sees as a preview, with every figure
 * but the company hidden (`DividendRow masked`, 2026-10-28) — so the lock
 * shows what Premium holds instead of a blur.
 */
export const CALENDAR_PREVIEW_ROWS = {
  recordDates: 2,
  agms: 1,
  topCash: 2,
  declared: 1,
  dashboard: 1,
} as const;

/** `/results`: the newest reports a free reader sees (of whichever filter is
 *  on); the rest of every company's results is Premium (user decision
 *  2026-10-25 — "free user can also see the full page"). */
export const FREE_RESULTS_ROWS = 5;

/** `/buy-sell-signals`: the first buy signals of the current view a free
 *  reader sees (Strong buys lead the default order); the rest is Premium
 *  (user decision 2026-10-25). */
export const FREE_SIGNAL_ROWS = 3;

/** `/dsestockranking`: the first rows of the current view a free reader
 *  sees; the rest of the leaderboard is Premium (user decision 2026-10-25). */
export const FREE_RANKING_ROWS = 5;

/** `/screener`: the first stocks that pass a screen a free reader sees; none
 *  when the screen uses a power check. The rest is Premium (user decision
 *  2026-10-26). */
export const FREE_SCREENER_ROWS = 3;

/** The dashboard's "Picked for you": the picks a free reader sees in full;
 *  the rest of the 15 sits blurred behind one lock (user decision 2026-10-27). */
export const FREE_FORYOU_ROWS = 3;

/** The dashboard's stories: a free reader opens the first three (the "Today"
 *  story counts as one), in importance order; the rest sit behind one
 *  Premium ring with their count and kinds (user decision 2026-10-28, first
 *  five, then three the same day). Seen stories stay in the row and replay
 *  any number of times. */
export const FREE_STORIES = 3;

/** Split a list into the free head (`n` rows) and the locked rest. */
export function splitFree<T>(items: T[], n: number): [T[], T[]] {
  const k = Math.max(0, Math.min(items.length, n));
  return [items.slice(0, k), items.slice(k)];
}
