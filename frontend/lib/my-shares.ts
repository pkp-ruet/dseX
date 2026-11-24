/**
 * My shares (`/my`, rebuilt 2026-11-25, user: "its main job is to give
 * updates on watched and owned shares … both type shares will behave here
 * identical"; mockup https://claude.ai/artifact/5rwddQNhbPqbY6YwNsiP89).
 *
 * The page answers one question, "what is happening with my shares?", for
 * every share the reader owns (main portfolio) or watches, and treats the two
 * the same: no money, no share counts on the rows. Pure: the page builds each
 * share from data it already has — the Updates feed (what happened), the
 * dates ahead (`lib/watch-updates.ts`, the same rules as Updates' "Coming
 * up") and today's prices — then sorts every share into one of three groups.
 */
import type { NotificationItem, ScoreItem } from "@/lib/api";
import type { WatchUpdate } from "@/lib/watch-updates";
import { companyShort } from "@/lib/formatters";
import { daysBetween, toDate, todayDhaka } from "@/lib/dividend-dates";
import { dayShort, type Pair } from "@/components/dividend-calendar/dates";

/** An update this recent puts a share in "New". */
export const NEW_DAYS = 7;
/** A date this close puts a share in "Coming up". */
export const SOON_DAYS = 14;

export interface MyShare {
  code: string;
  name: string;
  owned: boolean;
  /** Shares held in the main portfolio (0 when only watched). */
  qty: number;
  ltp: number | null;
  change: number | null;
  /** Feed rows the reader may see on it (30 days), newest first. */
  news: NotificationItem[];
  /** Of those, the last NEW_DAYS. */
  fresh: NotificationItem[];
  /** Dates ahead, soonest first. */
  coming: WatchUpdate[];
  /** The first date inside SOON_DAYS. */
  next: WatchUpdate | null;
}

export type GroupKey = "new" | "soon" | "rest";

/**
 * Every share once: the main portfolio's (owned), then the watchlist and any
 * share with an armed price alert (watched; an alert is a way of watching).
 */
export function buildMyShares({
  held,
  watched,
  prices,
  feed,
  coming,
  now = Date.now(),
  today = todayDhaka(),
}: {
  /** Shares held per code, upper case (`heldQty`). */
  held: Map<string, number>;
  /** Watched codes (watchlist ∪ armed alerts), any case. */
  watched: string[];
  prices: Map<string, ScoreItem>;
  /** The feed rows the reader may see (`visibleFeed(...).shown`). */
  feed: NotificationItem[];
  /** Every date ahead (`buildWatchUpdates(...).coming`). */
  coming: WatchUpdate[];
  now?: number;
  today?: Date;
}): MyShare[] {
  const newsOf = new Map<string, NotificationItem[]>();
  for (const i of feed) {
    if (!i.code || i.kind === "letter" || i.kind === "brief") continue;
    const c = i.code.toUpperCase();
    newsOf.set(c, [...(newsOf.get(c) ?? []), i]);
  }
  const comingOf = new Map<string, WatchUpdate[]>();
  for (const u of coming) {
    const c = u.code.toUpperCase();
    comingOf.set(c, [...(comingOf.get(c) ?? []), u]);
  }
  const cut = now - NEW_DAYS * 86_400_000;
  const codes: [string, boolean][] = [];
  const seen = new Set<string>();
  for (const c of held.keys()) {
    if (!seen.has(c)) codes.push([c, true]);
    seen.add(c);
  }
  for (const raw of watched) {
    const c = raw.toUpperCase();
    if (!seen.has(c)) codes.push([c, false]);
    seen.add(c);
  }
  return codes.map(([code, owned]) => {
    const s = prices.get(code);
    const news = [...(newsOf.get(code) ?? [])].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    const dates = [...(comingOf.get(code) ?? [])].sort((a, b) => a.date.localeCompare(b.date));
    const next =
      dates.find((u) => {
        const d = toDate(u.date);
        return d != null && daysBetween(today, d) <= SOON_DAYS;
      }) ?? null;
    return {
      code,
      name: companyShort(s?.company_name) || code,
      owned,
      qty: held.get(code) ?? 0,
      ltp: s?.ltp ?? null,
      change: s?.change_pct ?? null,
      news,
      fresh: news.filter((i) => Date.parse(i.at) >= cut),
      coming: dates,
      next,
    };
  });
}

/**
 * The three groups, each share in the first that fits: New (an update in the
 * last 7 days, newest first) · Coming up (a date in the next 14 days, soonest
 * first) · the rest (A to Z).
 */
export function groupShares(list: MyShare[]): Record<GroupKey, MyShare[]> {
  const out: Record<GroupKey, MyShare[]> = { new: [], soon: [], rest: [] };
  for (const s of list) {
    if (s.fresh.length) out.new.push(s);
    else if (s.next) out.soon.push(s);
    else out.rest.push(s);
  }
  out.new.sort((a, b) => Date.parse(b.fresh[0].at) - Date.parse(a.fresh[0].at) || a.name.localeCompare(b.name));
  out.soon.sort((a, b) => a.next!.date.localeCompare(b.next!.date) || a.name.localeCompare(b.name));
  out.rest.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

/** A date line on a row: the day in bold, then what happens. */
export function dateBits(u: WatchUpdate): { when: Pair; what: Pair } {
  switch (u.kind) {
    case "record":
      // `short` is "Buy by 30 Nov" while it can still be bought for, else "Record date 30 Nov".
      return { when: u.short, what: u.title };
    case "board":
      return { when: dayShort(u.date), what: u.title };
    case "agm":
      return { when: dayShort(u.date), what: { en: "Annual general meeting", bn: "বার্ষিক সাধারণ সভা (এজিএম)" } };
    case "alert_near":
      return { when: u.label, what: u.title };
    default:
      return { when: dayShort(u.date), what: u.title };
  }
}
