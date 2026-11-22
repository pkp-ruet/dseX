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
  /** How far under our fair price's middle, in % (2026-11-22; it was its
   *  usual price from its own history before). */
  margin_pct: number | null;
  /** Our fair price: the range and its middle (the stock page's figure),
   *  and how sure we are of it. */
  fair: { low: number; high: number; mid: number; sure?: { level: "high" | "medium" | "low"; word: BiText; line: BiText } } | null;
  /** The price over which it leaves the list (the Buy signal's leave line). */
  leave_above?: number | null;
  /** The highest price at which it would join the list today. */
  buy_below: number | null;
  /** On the list by its staying lines, but above the price it would join at. */
  held?: boolean;
  /** Missed one question at the last close; leaves if it misses again. */
  grace?: BiText | null;
  /** ৳ million that changes hands on a normal day (the middle day of 30). */
  trading_mn?: number | null;
  why: BiText;
  /** The row's one short reason: the figure that stands out ("Pays 6.2% a
   *  year in cash"). Absent from an older backend: the row then uses `why`. */
  why_short?: BiText | null;
  profit: BiText & { tone: "good" | "neutral" | "watch" };
  facts: ForYouFact[];
  /** The one thing to watch. `short` names it for the row's tag ("Auditor's
   *  note"); `note` = a smaller thing shown quiet, not amber. */
  watch: (BiText & { more?: number; level?: "red" | "amber" | "note"; short?: BiText }) | null;
  next: BuyListNext[];
  since: string | null;
  new: boolean;
  conviction: number | null;
}

export interface BuyListAlmost extends BuyListIdent {
  /** 2 the price · 3 trading · 4 profit · 5 two closes in a row. */
  question: 2 | 3 | 4 | 5;
  miss: BiText;
  /** `price`: the price that brings it in (question 2), for the row's figure
   *  and its price-alert bell. */
  fix: BiText & { date?: string | null; price?: number | null };
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

/** The five questions, in order. Every share on the list says yes to all five.
 *  `short` = the name on the strip at the top of the page; `plain` = the one
 *  line under the question in "How we choose"; `line` = the full rule, folded
 *  under it; `miss` = the tag on an "Almost made it" row that missed it. */
export const QUESTIONS: { short: BiText; title: BiText; plain: BiText; line: BiText; miss: BiText }[] = [
  {
    short: { en: "Strong company", bn: "শক্তিশালী কোম্পানি" },
    title: { en: "Is it a strong company?", bn: "কোম্পানি কি শক্তিশালী?" },
    plain: {
      en: "Mostly strong or strong all round on our four business checks.",
      bn: "ব্যবসার চারটি যাচাইয়ে বেশিরভাগ দিকে বা সব দিকে শক্তিশালী।",
    },
    miss: { en: "a strong company", bn: "শক্তিশালী কোম্পানি" },
    line: {
      en: "Mostly strong or strong all round on our four business checks, on today's own figures.",
      bn: "ব্যবসার চারটি যাচাইয়ে আজকের হিসাবেই বেশিরভাগ দিকে বা সব দিকে শক্তিশালী।",
    },
  },
  {
    short: { en: "Under our fair price", bn: "ন্যায্য দামের নিচে" },
    title: { en: "Is today's price under our fair price?", bn: "আজকের দাম কি আমাদের ন্যায্য দামের নিচে?" },
    plain: {
      en: "Under the middle of what we work out it is worth, and not near its high of the year.",
      bn: "আমাদের হিসাবের ন্যায্য দামের মাঝামাঝির নিচে, আর বছরের সর্বোচ্চ দামের কাছে নয়।",
    },
    miss: { en: "today's price", bn: "আজকের দাম" },
    line: {
      en: "Today's price is under the middle of what we work out the company is worth, and it isn't near its highest of the year. A price far under that, while profit isn't growing, doesn't count: a gap that big is usually there for a reason.",
      bn: "আজকের দাম আমাদের হিসাবের ন্যায্য দামের মাঝামাঝির নিচে, আর বছরের সর্বোচ্চের কাছে নয়। মুনাফা না বাড়লে ন্যায্য দামের চেয়ে অনেক কম দাম গোনা হয় না: এত বড় ফারাক সাধারণত কোনো কারণে থাকে।",
    },
  },
  {
    short: { en: "Nothing seriously wrong", bn: "গুরুতর সমস্যা নেই" },
    title: { en: "Is anything seriously wrong?", bn: "গুরুতর কোনো সমস্যা আছে কি?" },
    plain: {
      en: "It makes a profit, with no warnings, no heavy loans and enough trading.",
      bn: "মুনাফায় আছে, কোনো সতর্কতা নেই, ঋণ বেশি নয়, আর যথেষ্ট লেনদেন হয়।",
    },
    miss: { en: "our safety checks", bn: "নিরাপত্তা যাচাই" },
    line: {
      en: "It makes a profit, with no auditor, regulator or meeting warning in a year and no heavy loans. It isn't in category Z, and at least ৳15 lakh of it changes hands on a normal day (under ৳30 lakh, the row says it trades slowly). A bank or finance company paid a cash dividend in each of its last 3 years.",
      bn: "মুনাফায় আছে। এক বছরে নিরীক্ষক, নিয়ন্ত্রক বা সভা নিয়ে কোনো সতর্কতা নেই, ঋণও বেশি নয়। Z ক্যাটাগরিতে নয়, আর সাধারণ একটি দিনে অন্তত 15 লাখ টাকার লেনদেন হয় (30 লাখের কম হলে তালিকায় লেখা থাকে যে লেনদেন ধীর)। ব্যাংক বা আর্থিক প্রতিষ্ঠান হলে গত 3 বছরের প্রতি বছর নগদ ডিভিডেন্ড দিয়েছে।",
    },
  },
  {
    short: { en: "Profit holding up", bn: "মুনাফা টিকে আছে" },
    title: { en: "Is the profit holding up?", bn: "মুনাফা কি টিকে আছে?" },
    plain: {
      en: "Profit in its latest results hasn't fallen much.",
      bn: "সর্বশেষ আর্থিক ফলে মুনাফা তেমন কমেনি।",
    },
    miss: { en: "profit", bn: "মুনাফা" },
    line: {
      en: "The latest results are not down more than 10% on the same months last year, and the latest quarter alone not more than 20%.",
      bn: "সর্বশেষ আর্থিক ফলে মুনাফা আগের বছরের একই সময়ের চেয়ে 10%-এর বেশি কমেনি, আর শুধু সর্বশেষ প্রান্তিকে 20%-এর বেশি কমেনি।",
    },
  },
  {
    short: { en: "Passed two days in a row", bn: "টানা দুই দিন পাস" },
    title: { en: "Has it passed on two closes in a row?", bn: "টানা দুই দিন পাস করেছে কি?" },
    plain: {
      en: "It joins only after passing at two closes in a row.",
      bn: "টানা দুই দিন বাজার বন্ধের পর পাস করলে তবেই তালিকায় আসে।",
    },
    miss: { en: "two days in a row", bn: "টানা দুই দিন" },
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
