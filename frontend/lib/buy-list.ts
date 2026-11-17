/**
 * The Buy List (2026-11-08): types for `GET /api/buy-list` (mirror
 * backend/services/buy_list_service.py — keep the two in step) and the page's
 * fixed copy. The rules themselves live in backend/services/buy_list.py.
 */
import type { BiText, ForYouFact } from "@/lib/api";
import type { PriceWordKey } from "@/lib/constants";

export const BUY_LIST_PATH = "/buy-list";
export const BUY_LIST_ANCHOR = "bl-premium";

export interface BuyListNext {
  kind: "results" | "record";
  /** Results: the meeting day. Record: the last day to buy. */
  date: string;
  /** Results: months the report covers (3 / 6 / 9 / 12). */
  months?: number | null;
  /** Results: what it earned in the same months a year ago. */
  line?: BiText | null;
  record_date?: string | null;
  cash_ps?: number | null;
}

export interface BuyListIdent {
  code: string;
  name: string | null;
  sector: string | null;
  sector_bn: string | null;
  group: BiText;
  tier: string;
}

export interface BuyListItem extends BuyListIdent {
  rank: number;
  price: number | null;
  change_pct: number | null;
  price_word: PriceWordKey;
  /** How far under its usual price (its own history), in %. */
  margin_pct: number | null;
  /** Its usual price: the lower and higher of its own two measures (past
   *  prices against its profit and its assets) and the weighted middle. */
  fair: { low: number; high: number; mid: number } | null;
  /** The highest price at which it would join the list today. */
  buy_below: number | null;
  /** On the list by its staying lines, but above the price it would join at. */
  held?: boolean;
  /** Missed one question at the last close; leaves if it misses again. */
  grace?: BiText | null;
  /** ৳ million that changes hands on a normal day (the middle day of 30). */
  trading_mn?: number | null;
  why: BiText;
  profit: BiText & { tone: "good" | "neutral" | "watch" };
  facts: ForYouFact[];
  watch: (BiText & { more?: number; level?: "red" | "amber" }) | null;
  next: BuyListNext[];
  since: string | null;
  new: boolean;
  conviction: number | null;
}

export interface BuyListAlmost extends BuyListIdent {
  question: 3 | 4 | 5 | 6;
  miss: BiText;
  fix: BiText & { date?: string | null };
}

export interface BuyList {
  as_of: string;
  universe: number;
  count: number;
  items: BuyListItem[];
  also: (BuyListIdent & { margin_pct: number; why: BiText })[];
  almost: BuyListAlmost[];
  changes: {
    first_day: boolean;
    joined: string[];
    left: { code: string; name: string; reason: BiText }[];
    week_joined: string[];
    week_left: { code: string; name: string }[];
  };
  free_pick: string | null;
  rules: {
    margin_pct: number;
    profit_pct: number;
    quarter_pct?: number;
    trade_lakh?: number;
    bank_years?: number;
    sector_cap: number;
    financial_cap: number;
    max_rows: number;
  };
  /** Served while DSE is trading: the list from the last close, today's prices. */
  live_prices?: boolean;
}

/** One share on the dashboard's Buy List card. */
export type BuyListHomeItem = Pick<
  BuyListItem,
  "rank" | "code" | "name" | "sector" | "sector_bn" | "price" | "change_pct" | "margin_pct" | "group" | "price_word" | "why" | "new"
>;

/** `/api/user/home` `buy_list` (2026-11-08, `buy_list_service.home_summary`). */
export interface BuyListHome {
  as_of: string | null;
  count: number;
  universe: number;
  week_joined: number;
  top: BuyListHomeItem[];
  /** Today's free example on the page, open for every reader. */
  free_pick: BuyListHomeItem | null;
  almost: number;
}

/** The six questions, in order. Every share on the list says yes to all six. */
export const QUESTIONS: { title: BiText; line: BiText }[] = [
  {
    title: { en: "Is it a strong company?", bn: "কোম্পানি কি শক্তিশালী?" },
    line: {
      en: "Mostly strong or strong all round on our four business checks, on today's own figures.",
      bn: "ব্যবসার চারটি যাচাইয়ে আজকের হিসাবেই বেশিরভাগ দিকে বা সব দিকে শক্তিশালী।",
    },
  },
  {
    title: { en: "Is today's price good?", bn: "আজকের দাম কি ভালো?" },
    line: {
      en: "Our price check says low, or fair for a company strong all round, and the price isn't near its highest of the year.",
      bn: "আমাদের দাম যাচাইয়ে দাম কম, বা সব দিকে শক্তিশালী কোম্পানির জন্য ন্যায্য। আর দাম বছরের সর্বোচ্চের কাছে নয়।",
    },
  },
  {
    title: { en: "Is anything seriously wrong?", bn: "গুরুতর কোনো সমস্যা আছে কি?" },
    line: {
      en: "It makes a profit, with no auditor, regulator or meeting warning in a year and no heavy loans. It isn't in category Z, and at least ৳30 lakh of it changes hands on a normal day. A bank or finance company paid a cash dividend in each of its last 3 years.",
      bn: "মুনাফায় আছে। এক বছরে নিরীক্ষক, নিয়ন্ত্রক বা সভা নিয়ে কোনো সতর্কতা নেই, ঋণও বেশি নয়। Z ক্যাটাগরিতে নয়, আর সাধারণ একটি দিনে অন্তত 30 লাখ টাকার লেনদেন হয়। ব্যাংক বা আর্থিক প্রতিষ্ঠান হলে গত 3 বছরের প্রতি বছর নগদ ডিভিডেন্ড দিয়েছে।",
    },
  },
  {
    title: { en: "Is the price well under its usual price?", bn: "দাম কি এর স্বাভাবিক দামের চেয়ে বেশ কম?" },
    line: {
      en: "Its usual price comes from its own past: what it has traded at for its profit, and for what it owns. Today's price is at least 10% under it, and under both of the two.",
      bn: "স্বাভাবিক দাম আসে এর নিজের অতীত থেকে: মুনাফার তুলনায় আর সম্পদের তুলনায় এটি কোন দামে কেনাবেচা হয়েছে। আজকের দাম তার চেয়ে অন্তত 10% কম, আর দুটির চেয়েই কম।",
    },
  },
  {
    title: { en: "Is the profit holding up?", bn: "মুনাফা কি টিকে আছে?" },
    line: {
      en: "The latest results are not down more than 10% on the same months last year, and the latest quarter alone not more than 20%.",
      bn: "সর্বশেষ আর্থিক ফলে মুনাফা আগের বছরের একই সময়ের চেয়ে 10%-এর বেশি কমেনি, আর শুধু সর্বশেষ প্রান্তিকে 20%-এর বেশি কমেনি।",
    },
  },
  {
    title: { en: "Has it passed on two closes in a row?", bn: "টানা দুই দিন পাস করেছে কি?" },
    line: {
      en: "One good day isn't enough. It joins after passing at two closes in a row. A share on the list that misses on its price or trading gets one more close before it leaves; a serious problem takes it off at once.",
      bn: "এক দিনের ভালো দাম যথেষ্ট নয়। টানা দুই দিন বাজার বন্ধের পর পাস করলে তবেই তালিকায় আসে। তালিকার কোনো শেয়ার দাম বা লেনদেনের কারণে আটকালে বাদ পড়ার আগে আরও এক দিন সময় পায়; গুরুতর সমস্যা হলে সঙ্গে সঙ্গে বাদ।",
    },
  },
];

/** "৳13" / "৳4.75": cash a share, two decimals under ৳10 (money() would print ৳4.8). */
export function cashWords(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "";
  if (v >= 10) return `৳${Number.isInteger(v) ? v : v.toFixed(2)}`;
  return `৳${v.toFixed(2)}`;
}

/** ৳ million → "৳22 lakh" / "৳1.2 crore" (and the Bengali "22 লাখ টাকা"). */
export function tradeWords(mn: number): { en: string; bn: string } {
  if (mn >= 10) return { en: `৳${(mn / 10).toFixed(1)} crore`, bn: `${(mn / 10).toFixed(1)} কোটি টাকা` };
  const lakh = Math.max(1, Math.round(mn * 10));
  return { en: `৳${lakh} lakh`, bn: `${lakh} লাখ টাকা` };
}
