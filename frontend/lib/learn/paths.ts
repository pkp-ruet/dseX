import type { L, PathKey } from "./types";

/**
 * The three sections of the Learn page (2026-11-25; plan
 * https://claude.ai/artifact/Q7TxTX1WzkbxGvgcocYEig, reshaped the same day:
 * plain names, Getting started as three step posts, Investing basics as ten
 * posts, Advanced as Premium). Plain data, safe for client components.
 */
export type PathMeta = {
  key: PathKey;
  /** Anchor on the hub. */
  anchor: string;
  /** 1–3, drawn as level marks. */
  level: number;
  name: L;
  /** Who it is for, one line. */
  who: L;
  /** What the section covers. */
  outcome: L;
  /** Premium posts (the first part free, the rest for members). */
  premium?: boolean;
};

export const PATHS: PathMeta[] = [
  {
    key: "start",
    anchor: "getting-started",
    level: 1,
    name: { en: "Getting started", bn: "শুরু করুন" },
    who: {
      en: "Never bought a share? Three steps, from opening your account to selling.",
      bn: "কখনো শেয়ার কেনেননি? অ্যাকাউন্ট খোলা থেকে বিক্রি পর্যন্ত, তিনটি ধাপে।",
    },
    outcome: {
      en: "Follow them in order: open a BO account, buy your first share, then sell and take your money out.",
      bn: "ক্রম মেনে এগোন: বিও অ্যাকাউন্ট খুলুন, প্রথম শেয়ার কিনুন, তারপর বিক্রি করে টাকা তুলুন।",
    },
  },
  {
    key: "basics",
    anchor: "investing-basics",
    level: 2,
    name: { en: "Investing basics", bn: "বিনিয়োগের মূল কথা" },
    who: {
      en: "You can buy and sell. Now learn how the market works and how to invest with a plan.",
      bn: "কেনাবেচা জানেন। এবার জানুন বাজার কীভাবে চলে, আর পরিকল্পনা করে কীভাবে বিনিয়োগ করবেন।",
    },
    outcome: {
      en: "Trading or investing, reading the market, judging a company and its price, building and looking after a portfolio, and staying calm when prices fall.",
      bn: "ট্রেডিং নাকি বিনিয়োগ, বাজার বোঝা, কোম্পানি আর তার দাম যাচাই, পোর্টফোলিও গড়া ও দেখাশোনা, আর দাম পড়লে শান্ত থাকা।",
    },
  },
  {
    key: "advanced",
    anchor: "advanced",
    level: 3,
    premium: true,
    name: { en: "Advanced", bn: "অ্যাডভান্সড" },
    who: {
      en: "For investors who want to judge companies on their own, with real DSE companies as examples.",
      bn: "যাঁরা নিজে কোম্পানি যাচাই করতে চান, তাঁদের জন্য, ডিএসইর আসল কোম্পানির উদাহরণসহ।",
    },
    outcome: {
      en: "Read reports and results, check whether profit is real, work out a fair price, spot warning signs and judge each kind of business.",
      bn: "রিপোর্ট আর ফল পড়া, মুনাফা আসল কি না যাচাই, ন্যায্য দাম বের করা, বিপদের সংকেত চেনা, আর প্রতিটি ধরনের ব্যবসা যাচাই।",
    },
  },
];

export function pathMeta(key: PathKey): PathMeta {
  return PATHS.find((p) => p.key === key)!;
}

/** Advanced posts still to come (shown as a list until they are live). */
export const ADVANCED_PLANNED: L[] = [
  { en: "Company of the month: a real DSE company, checked step by step", bn: "মাসের কোম্পানি: ডিএসইর একটি আসল কোম্পানি, ধাপে ধাপে যাচাই" },
];

/**
 * The short look-up guides kept from before the sections (dividends, IPOs,
 * rules, tax, the three money reports). English slugs live under /learn,
 * Bengali ones under /blog.
 */
export const MORE_GUIDES: { en: string[]; bn: string[] } = {
  en: [
    "read-financial-statements",
    "cash-vs-bonus-dividend",
    "dividend-yield",
    "apply-for-ipo",
    "check-before-ipo",
    "share-categories-explained",
    "floor-price-circuit-breaker",
    "dse-indices",
    "read-a-price-chart",
    "tax-rebate-on-shares",
    "tax-on-stock-profits",
    "why-you-need-tin",
  ],
  bn: [
    "three-financial-reports",
    "cash-vs-bonus-dividend",
    "dividend-record-date",
    "dividend-yield",
    "apply-for-ipo",
    "is-this-ipo-worth-it",
    "ipo-listing-day",
    "share-categories",
    "floor-price-circuit-breaker",
    "market-indices",
    "read-price-chart",
  ],
};
