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
  /** How far under our fair-price centre, in %. */
  margin_pct: number | null;
  fair: { low: number; high: number; mid: number } | null;
  buy_below: number | null;
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
  question: 4 | 5 | 6;
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
  rules: { margin_pct: number; profit_pct: number; sector_cap: number; financial_cap: number; max_rows: number };
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
      en: "It makes a profit, with no auditor, regulator or meeting warning in a year and no heavy loans. It isn't in category Z and trades enough to buy and sell.",
      bn: "মুনাফায় আছে। এক বছরে নিরীক্ষক, নিয়ন্ত্রক বা সভা নিয়ে কোনো সতর্কতা নেই, ঋণও বেশি নয়। Z ক্যাটাগরিতে নয়, আর কেনাবেচার মতো যথেষ্ট লেনদেন হয়।",
    },
  },
  {
    title: { en: "Is the price well under what it is worth?", bn: "দাম কি ন্যায্য দামের চেয়ে বেশ কম?" },
    line: {
      en: "At least 10% under our fair price, and our ways of working out that price agree.",
      bn: "আমাদের ন্যায্য দামের চেয়ে অন্তত 10% কম, আর সেই দাম হিসাবের আমাদের পদ্ধতিগুলো একমত।",
    },
  },
  {
    title: { en: "Is the profit holding up?", bn: "মুনাফা কি টিকে আছে?" },
    line: {
      en: "The latest results are not down more than 10% on the same months last year.",
      bn: "সর্বশেষ আর্থিক ফলে মুনাফা আগের বছরের একই সময়ের চেয়ে 10%-এর বেশি কমেনি।",
    },
  },
  {
    title: { en: "Has it passed on two closes in a row?", bn: "টানা দুই দিন পাস করেছে কি?" },
    line: {
      en: "One good day isn't enough. It joins after passing at two closes in a row.",
      bn: "এক দিনের ভালো দাম যথেষ্ট নয়। টানা দুই দিন বাজার বন্ধের পর পাস করলে তবেই তালিকায় আসে।",
    },
  },
];

/** "৳13" / "৳4.75": cash a share, two decimals under ৳10 (money() would print ৳4.8). */
export function cashWords(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "";
  if (v >= 10) return `৳${Number.isInteger(v) ? v : v.toFixed(2)}`;
  return `৳${v.toFixed(2)}`;
}
