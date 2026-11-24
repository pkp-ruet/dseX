/**
 * The one feed of news on a reader's shares (2026-11-25, step 2 of the
 * simplify review — "one feed, told once"). Updates (`/notifications`) is
 * the feed; the home shows its newest rows. Both read these words and rules,
 * so the home never says something Updates doesn't, in a different shape.
 * Rows render with `components/feed/FeedRow.tsx` (the `nt-*` styles).
 */
import type { NotificationItem } from "@/lib/api";
import { dayShort } from "@/components/dividend-calendar/dates";

export type Pair = { en: string; bn: string };

/** What each row is, in two words. */
export const FEED_KIND: Record<string, Pair> = {
  results: { en: "Results", bn: "আর্থিক ফল" },
  grade: { en: "Grade change", bn: "গ্রেড বদল" },
  red_flag: { en: "Warning", bn: "সতর্কতা" },
  record: { en: "Record date", bn: "রেকর্ড ডেট" },
  category: { en: "Category change", bn: "ক্যাটাগরি বদল" },
  drop: { en: "Big fall", bn: "বড় দরপতন" },
  low52: { en: "Yearly low", bn: "বছরের সর্বনিম্ন" },
  breakeven: { en: "Back to your price", bn: "কেনা দামে ফেরা" },
  price_view: { en: "Our price view", bn: "দাম নিয়ে মত" },
  alert: { en: "Price alert", bn: "প্রাইস অ্যালার্ট" },
  brief: { en: "9 AM brief", bn: "সকাল 9টার খবর" },
  letter: { en: "Friday letter", bn: "শুক্রবারের চিঠি" },
  screen: { en: "Saved screen", bn: "সেভ করা স্ক্রিন" },
  rule: { en: "Your rule", bn: "আপনার নিয়ম" },
  plan: { en: "Your plan", bn: "আপনার পরিকল্পনা" },
};

/** The watcher's kinds: the "your shares" layer of THE Premium line. A free
 *  reader sees the week's one marked `free`; the rest are counted. `plan` =
 *  the portfolio builder's plan watch (2026-11-23). */
export const WATCH_KINDS = new Set(["results", "grade", "red_flag", "record", "category", "drop", "low52", "breakeven", "plan", "price_view"]);

/** Counted words: [one, many, Bengali]. */
const COUNT_WORDS: Record<string, [string, string, string]> = {
  results: ["results report", "results reports", "আর্থিক ফল"],
  grade: ["grade change", "grade changes", "গ্রেড বদল"],
  red_flag: ["warning", "warnings", "সতর্কতা"],
  record: ["record date", "record dates", "রেকর্ড ডেট"],
  category: ["category change", "category changes", "ক্যাটাগরি বদল"],
  drop: ["big fall", "big falls", "বড় দরপতন"],
  low52: ["yearly low", "yearly lows", "বছরের সর্বনিম্ন দাম"],
  breakeven: ["return to your price", "returns to your price", "কেনা দামে ফেরা"],
  price_view: ["change in our view of a price", "changes in our view of the price", "দাম নিয়ে আমাদের মতে বদল"],
  plan: ["change in your portfolio plan", "changes in your portfolio plan", "পরিকল্পনায় বদল"],
};

/** "2 results reports, 1 warning and 1 big fall" in both languages. */
export function kindsPhrase(items: NotificationItem[]): Pair {
  const by = new Map<string, number>();
  for (const i of items) by.set(i.kind, (by.get(i.kind) ?? 0) + 1);
  const top = [...by.entries()].sort((a, b) => b[1] - a[1]);
  const en = top.map(([k, n]) => `${n} ${(COUNT_WORDS[k] ?? ["update", "updates"])[n === 1 ? 0 : 1]}`);
  const bn = top.map(([k, n]) => `${n}টি ${(COUNT_WORDS[k] ?? ["", "", "খবর"])[2]}`);
  const join = (xs: string[], and: string) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ${and} ${xs[xs.length - 1]}`);
  return { en: join(en, "and"), bn: join(bn, "ও") };
}

const DHAKA_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" });
const DHAKA_TIME = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", hour: "numeric", minute: "2-digit" });
const DHAKA_HOUR = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", hour12: false });

export function dhakaDay(iso: string): string {
  return DHAKA_DAY.format(new Date(iso));
}

/** "4:05 PM" / "বিকেল 4:05". */
export function timeWords(iso: string): Pair {
  const d = new Date(iso);
  const en = DHAKA_TIME.format(d);
  const h = Number(DHAKA_HOUR.format(d));
  const part = h < 5 ? "রাত" : h < 12 ? "সকাল" : h < 15 ? "দুপুর" : h < 18 ? "বিকেল" : h < 20 ? "সন্ধ্যা" : "রাত";
  return { en, bn: `${part} ${en.replace(/\s?[AP]M$/, "")}` };
}

/** "Today" / "Yesterday" / "Tue 4 Nov". */
export function dayHead(day: string): Pair {
  const today = DHAKA_DAY.format(new Date());
  const yest = DHAKA_DAY.format(new Date(Date.now() - 86_400_000));
  if (day === today) return { en: "Today", bn: "আজ" };
  if (day === yest) return { en: "Yesterday", bn: "গতকাল" };
  return dayShort(day);
}

/**
 * What a reader may see of the feed (THE Premium line, step 3): a free
 * reader's watcher rows are counted by kind (`hidden`), the week's one marked
 * `free` stays open; a paused rule that fires is told once a day at most
 * (step 6). Screen-only, like every lock: the API sends every row.
 */
export function visibleFeed(items: NotificationItem[], premium: boolean): { shown: NotificationItem[]; hidden: NotificationItem[] } {
  const hidden = premium ? [] : items.filter((i) => WATCH_KINDS.has(i.kind) && !i.free);
  const hiddenIds = new Set(hidden.map((i) => i.id));
  const pausedDays = new Set<string>();
  const shown = items.filter((i) => {
    if (hiddenIds.has(i.id)) return false;
    if (!premium && i.kind === "rule" && i.paused) {
      const d = dhakaDay(i.at);
      if (pausedDays.has(d)) return false;
      pausedDays.add(d);
    }
    return true;
  });
  return { shown, hidden };
}
