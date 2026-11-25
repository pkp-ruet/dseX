/**
 * The fuller home (2026-11-25, plan https://claude.ai/artifact/RX71QgzkFto62nrNpZWZjm,
 * "Build all five"): the words and small rules of the five blocks that came
 * back to the home after the four-block home took every door away — recently
 * opened, the shortcuts, this week on the DSE, today's lists, explore. Pure,
 * no JSX: the signed-in home and the guest home read the same rules.
 *
 * Data: `GET /api/home/today` (`HomeToday`, the same for every reader); the
 * reader's own shares are marked here in the browser.
 */
import type { HomeToday, HomeTodayItem } from "@/lib/api";
import { dayShort } from "@/components/dividend-calendar/dates";
import { daysFrom } from "@/lib/home-dates";

export type Bi = { en: string; bn: string };

/** The eight shortcuts, in fixed places, the same for every reader: the pages
 *  readers opened most from the home that have no other door on it
 *  (page-view data 4–25 Nov: Buy List 11 trips in 100, All companies 4,
 *  Lists 4, For you 3, Market today 3, Calendar 2, Compare 1, Results). Keys
 *  of `lib/places.ts`, so each name is the page's one name.
 *  2026-11-25 ("Compare and Builder Homes"): the Portfolio builder took the
 *  Lists icon's place. Lists is a bottom tab on phones and a navbar link on
 *  desktop, so it was the one icon that repeated another door; the builder's
 *  home icon and slide had brought 29 of its first 57 opens and both left the
 *  home that morning. */
export const SHORTCUTS = ["buylist", "companies", "today", "calendar", "results", "foryou", "compare", "builder"] as const;
export type ShortcutKey = (typeof SHORTCUTS)[number];

export interface Badge {
  /** What the icon wears: "3 new", "9". */
  text: Bi;
  /** What a screen reader hears after the page's name. */
  say: Bi;
}

/** At most one number an icon, only when it changes today. */
export function shortcutBadges(d: HomeToday | null | undefined): Partial<Record<ShortcutKey, Badge>> {
  const out: Partial<Record<ShortcutKey, Badge>> = {};
  const joined = d?.buy_list?.week_joined ?? 0;
  if (joined > 0) {
    out.buylist = {
      text: { en: `${joined} new`, bn: `${joined} নতুন` },
      say: { en: `${joined} joined this week`, bn: `এ সপ্তাহে ${joined}টি যোগ হয়েছে` },
    };
  }
  const divs = (d?.days ?? []).reduce((n, day) => n + day.items.filter((i) => i.kind === "dividend").length, 0);
  if (divs > 0) {
    out.calendar = {
      text: { en: `${divs}`, bn: `${divs}` },
      say: { en: `${divs} dividend record dates this week`, bn: `এ সপ্তাহে ${divs}টি ডিভিডেন্ডের রেকর্ড ডেট` },
    };
  }
  const res = d?.results?.total ?? 0;
  if (res > 0) {
    out.results = {
      text: { en: `${res}`, bn: `${res}` },
      say: { en: `${res} results posted in 7 days`, bn: `গত 7 দিনে ${res}টি আর্থিক ফল` },
    };
  }
  return out;
}

/** "৳12.50", "৳21" (no ".00"), like the home's own dates. */
export function cashTk(v: number): string {
  return `৳${v.toFixed(2).replace(/\.00$/, "")}`;
}

const PURPOSE: Record<string, Bi> = {
  q1: { en: "first-quarter results", bn: "প্রথম প্রান্তিকের ফল" },
  q2: { en: "half-year results", bn: "অর্ধবার্ষিক ফল" },
  q3: { en: "third-quarter results", bn: "তৃতীয় প্রান্তিকের ফল" },
  annual: { en: "yearly results", bn: "বার্ষিক ফল" },
};

export type RowTone = "plain" | "soon" | "past";

/** A row of the week strip: the kind word, the line under the name, its tone
 *  and where it opens. A dividend says what it pays and whether there is still
 *  time to buy for it (DSE halts a share on its record date; the last normal
 *  day to buy is three trading days before). */
export function weekRow(it: HomeTodayItem, todayIso: string): { kind: Bi; line: Bi; tone: RowTone; href: string } {
  const code = encodeURIComponent(it.code);
  if (it.kind === "results") {
    const w = (it.purpose && PURPOSE[it.purpose]) || { en: "results", bn: "আর্থিক ফল" };
    return {
      kind: { en: "Results meeting", bn: "ফলের বোর্ড সভা" },
      line: { en: `The board meets on its ${w.en}`, bn: `${w.bn} নিয়ে বোর্ড সভা` },
      tone: "plain",
      href: `/stock/${code}#results`,
    };
  }
  const parts: Bi[] = [];
  if (it.cash_ps && it.cash_ps > 0) parts.push({ en: `${cashTk(it.cash_ps)} a share`, bn: `শেয়ারপ্রতি ${cashTk(it.cash_ps)}` });
  if (it.stock_pct && it.stock_pct > 0) parts.push({ en: `${it.stock_pct}% bonus shares`, bn: `${it.stock_pct}% বোনাস শেয়ার` });
  const pays: Bi = parts.length
    ? { en: parts.map((p) => p.en).join(" + "), bn: parts.map((p) => p.bn).join(" + ") }
    : { en: "Dividend", bn: "ডিভিডেন্ড" };
  let buy: Bi | null = null;
  let tone: RowTone = "plain";
  if (it.buy_by) {
    const d = daysFrom(todayIso, it.buy_by);
    const day = dayShort(it.buy_by);
    if (d < 0) {
      buy = { en: `last day to buy was ${day.en}`, bn: `কেনার শেষ দিন ছিল ${day.bn}` };
      tone = "past";
    } else if (d === 0) {
      buy = { en: "last day to buy: today", bn: "কেনার শেষ দিন: আজ" };
      tone = "soon";
    } else if (d === 1) {
      buy = { en: "last day to buy: tomorrow", bn: "কেনার শেষ দিন: আগামীকাল" };
      tone = "soon";
    } else {
      buy = { en: `last day to buy: ${day.en}`, bn: `কেনার শেষ দিন: ${day.bn}` };
    }
  }
  return {
    kind: { en: "Record date", bn: "রেকর্ড ডেট" },
    line: buy ? { en: `${pays.en} · ${buy.en}`, bn: `${pays.bn} · ${buy.bn}` } : pays,
    tone,
    href: `/stock/${code}#dividends`,
  };
}

/** A day's rows with the reader's own shares first (owned, then watched),
 *  the backend's order kept inside each group. */
export function mineFirst(items: HomeTodayItem[], held: ReadonlySet<string>, watched: ReadonlySet<string>): HomeTodayItem[] {
  const rank = (c: string) => (held.has(c) ? 0 : watched.has(c) ? 1 : 2);
  return items
    .map((it, i) => ({ it, i }))
    .sort((a, b) => rank(a.it.code.toUpperCase()) - rank(b.it.code.toUpperCase()) || a.i - b.i)
    .map((x) => x.it);
}

/** The day the strip opens on: today when anything happens today, else the
 *  first day with something on it. */
export function firstDay(days: { items: HomeTodayItem[] }[]): number {
  const i = days.findIndex((d) => d.items.length > 0);
  return i < 0 ? 0 : i;
}

/** One short read a day in the Learn card: the guides and lessons that exist in
 *  both languages (`lib/i18n-pairs.ts`), titled plainly here so the home doesn't
 *  load the guide files. */
export const DAILY_READS: { learn: string; blog: string; title: Bi }[] = [
  { learn: "how-the-share-market-works", blog: "how-the-share-market-works", title: { en: "How the share market works", bn: "শেয়ার বাজার যেভাবে কাজ করে" } },
  { learn: "trading-or-investing", blog: "why-long-term-investing-wins", title: { en: "Trading or investing: which is right for you?", bn: "ট্রেডিং নাকি বিনিয়োগ: আপনার জন্য কোনটি?" } },
  { learn: "read-the-market-each-day", blog: "understand-market-momentum", title: { en: "How to read the market each day", bn: "প্রতিদিন বাজার বুঝবেন যেভাবে" } },
  { learn: "fundamental-analysis", blog: "good-stock-key-numbers", title: { en: "How to tell a good company in 10 minutes", bn: "10 মিনিটে ভালো কোম্পানি চিনবেন যেভাবে" } },
  { learn: "cheap-or-expensive", blog: "cheap-or-expensive", title: { en: "Cheap or expensive? How to judge a share's price", bn: "সস্তা নাকি দামি? শেয়ারের দাম যাচাই" } },
  { learn: "how-many-shares-to-own", blog: "how-many-shares-to-own", title: { en: "How many shares should you own?", bn: "কয়টি শেয়ার রাখা উচিত?" } },
  { learn: "investing-every-month", blog: "power-of-compounding", title: { en: "Buying in parts: how to invest every month", bn: "ভাগে ভাগে কেনা: প্রতি মাসে বিনিয়োগ" } },
  { learn: "when-to-sell-shares", blog: "when-to-sell-shares", title: { en: "When to sell a share", bn: "কখন শেয়ার বিক্রি করবেন" } },
  { learn: "when-the-market-falls", blog: "master-fear-and-greed", title: { en: "What to do when the market falls", bn: "বাজার পড়লে কী করবেন" } },
  { learn: "rumour-shares", blog: "ignore-rumors-do-research", title: { en: "Rumour shares: how to stay safe", bn: "গুজবের শেয়ার: নিরাপদ থাকবেন যেভাবে" } },
  { learn: "open-bo-account", blog: "open-bo-account", title: { en: "How to open a BO account", bn: "বিও অ্যাকাউন্ট খুলবেন যেভাবে" } },
  { learn: "buy-sell-shares", blog: "buy-sell-shares", title: { en: "How to add money and buy your first share", bn: "টাকা জমা দিয়ে প্রথম শেয়ার কিনবেন যেভাবে" } },
  { learn: "cash-vs-bonus-dividend", blog: "cash-vs-bonus-dividend", title: { en: "Cash dividend or bonus shares: what is the difference?", bn: "ক্যাশ ডিভিডেন্ড আর বোনাস শেয়ারের পার্থক্য" } },
  { learn: "dividend-yield", blog: "dividend-yield", title: { en: "How to tell if a dividend is really good", bn: "একটি ডিভিডেন্ড আসলেই ভালো কিনা বুঝবেন যেভাবে" } },
  { learn: "share-categories-explained", blog: "share-categories", title: { en: "What the A, B, N and Z categories mean", bn: "A, B, N আর Z ক্যাটাগরির মানে" } },
  { learn: "read-financial-statements", blog: "three-financial-reports", title: { en: "The three money reports every company shares", bn: "প্রতিটি কোম্পানির তিনটি আর্থিক রিপোর্ট" } },
];

/** Today's read: a different guide each Dhaka day, the same for every reader. */
export function dailyRead(todayIso: string) {
  const day = Math.floor(Date.parse(`${todayIso.slice(0, 10)}T00:00:00Z`) / 86_400_000);
  const n = DAILY_READS.length;
  return DAILY_READS[(((Number.isFinite(day) ? day : 0) % n) + n) % n];
}
