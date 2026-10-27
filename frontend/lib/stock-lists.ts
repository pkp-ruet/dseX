import { crore, croreShares } from "@/lib/formatters";

/*
 * The FREE stock lists — four plain one-number rankings (market facts, not
 * research). The six Premium research lists live in lib/research-lists.ts.
 * Twelve older lists (EPS, profit, growth, bank / pharma, the score-based
 * "best of 2026 / this month / undervalued" shortlists) were removed
 * 2026-10-24 — too many overlapping lists confused readers; their URLs 301
 * in next.config.ts.
 *
 * One language per page (2026-10-28): every visible string has a Bengali
 * twin. `displayName`, `description` and `keywords` feed metadata / JSON-LD
 * only and stay English.
 */

export interface StockListItem {
  trading_code: string;
  company_name: string | null;
  sector: string | null;
  ltp: number | null;
  metric_value: number | null;
}

export interface StockListsResponse {
  top_dividend: StockListItem[];
  top_market_cap: StockListItem[];
  /** Ranked by money traded (turnover), not share count — the key name is historical. */
  top_volume: StockListItem[];
  /** 1-year return from the close a year ago (dividend / bonus adjusted) — key name is historical. */
  top_52w_return: StockListItem[];
}

export interface StockListDef {
  slug: string;
  /** Search title — metadata, OG and JSON-LD only. */
  displayName: string;
  /** The page h1, sentence case, in each language. */
  heading: string;
  headingBn: string;
  shortName: string;
  shortNameBn: string;
  description: string;
  keywords: string[];
  icon: string;
  metricLabel: string;
  metricLabelBn: string;
  metricFormat: "percent" | "number" | "currency" | "currency_raw" | "volume" | "score";
  apiKey: keyof StockListsResponse;
  intro: string;
  introBn: string;
  faqs: { q: string; a: string; qBn: string; aBn: string }[];
}

export function getStockList(slug: string): StockListDef | undefined {
  return STOCK_LISTS.find((l) => l.slug === slug);
}

export function formatMetric(
  value: number | null,
  format: StockListDef["metricFormat"],
  lang: "en" | "bn" = "en",
): string {
  if (value === null || value === undefined) return "—";
  let out: string;
  switch (format) {
    case "percent":
      out = `${value.toFixed(2)}%`;
      break;
    case "currency":
      // value is in millions of BDT (e.g. net profit) → crore
      out = crore(value);
      break;
    case "currency_raw":
      // value is in raw BDT (e.g. market cap = shares × price) → crore (÷1e6 → millions first)
      out = crore(value / 1e6);
      break;
    case "volume":
      // raw share count → crore
      out = croreShares(value);
      break;
    case "number":
    default:
      out = value.toFixed(2);
  }
  return lang === "bn" ? out.replace(/ Cr$/, " কোটি") : out;
}

export const STOCK_LISTS: StockListDef[] = [
  {
    slug: "top-dividend-stocks-bangladesh",
    displayName: "Top Dividend Stocks in Bangladesh",
    heading: "Top dividend shares in Bangladesh",
    headingBn: "বাংলাদেশে সবচেয়ে বেশি ডিভিডেন্ড দেওয়া শেয়ার",
    shortName: "Top dividend shares",
    shortNameBn: "সবচেয়ে বেশি ডিভিডেন্ড",
    description:
      "The top 20 highest dividend yield stocks listed on the Dhaka Stock Exchange (DSE), ranked by dividend yield — leaving out category Z, out-of-date accounts and dividends paid out of a loss. Updated from the latest company financials.",
    keywords: [
      "top dividend stocks Bangladesh",
      "highest dividend yield DSE",
      "best dividend paying shares Bangladesh",
      "income stocks DSE",
      "dividend stocks Dhaka Stock Exchange",
    ],
    icon: "💰",
    metricLabel: "Dividend yield",
    metricLabelBn: "ডিভিডেন্ড ইল্ড",
    metricFormat: "percent",
    apiKey: "top_dividend",
    intro:
      "Dividend yield is the yearly cash dividend as a share of today's price. A higher yield means more cash for each taka you put in. On the DSE, a yield above 5% is generally seen as good. Still, check the company's dividend history to make sure the payment is regular, and not a one-off that hides a weak business.",
    introBn:
      "ডিভিডেন্ড ইল্ড হলো আজকের দামের তুলনায় বছরে কত নগদ ডিভিডেন্ড আসে। ইল্ড বেশি মানে প্রতি টাকা বিনিয়োগে বেশি নগদ। ডিএসইতে সাধারণত 5%-এর বেশি ইল্ড ভালো ধরা হয়। তবু কোম্পানির ডিভিডেন্ডের ইতিহাস দেখে নিন, যাতে বোঝা যায় এটি নিয়মিত, দুর্বল ব্যবসা ঢাকার জন্য একবারের দেওয়া নয়।",
    faqs: [
      {
        q: "Which DSE shares pay the highest dividends?",
        a: "The list above ranks DSE companies by their latest dividend yield. It leaves out category Z, out-of-date accounts and dividends paid out of a loss, so what remains is cash a company could afford to pay.",
        qBn: "ডিএসইর কোন শেয়ার সবচেয়ে বেশি ডিভিডেন্ড দেয়?",
        aBn: "ওপরের তালিকা ডিএসইর কোম্পানিগুলোকে সর্বশেষ ডিভিডেন্ড ইল্ড অনুযায়ী সাজায়। Z ক্যাটাগরি, পুরোনো হিসাব আর লোকসানের বছরে দেওয়া ডিভিডেন্ড এখানে বাদ, তাই যা থাকে তা কোম্পানির দেওয়ার সামর্থ্য ছিল এমন নগদ।",
      },
      {
        q: "Is a high dividend yield always a good sign in Bangladesh?",
        a: "Not always. A very high yield can come from a falling share price rather than a large dividend. It is wise to check 3 to 5 years of dividend history, and how steady the company's profit is, before you invest.",
        qBn: "বেশি ডিভিডেন্ড ইল্ড কি সবসময় ভালো লক্ষণ?",
        aBn: "সবসময় নয়। অনেক বেশি ইল্ড বড় ডিভিডেন্ডের কারণে না হয়ে শেয়ারের দাম কমার কারণেও হতে পারে। বিনিয়োগের আগে 3 থেকে 5 বছরের ডিভিডেন্ডের ইতিহাস আর মুনাফা কতটা স্থির, তা দেখে নেওয়া ভালো।",
      },
      {
        q: "How often do DSE companies pay dividends?",
        a: "Most DSE companies declare a dividend once a year, after their annual general meeting (AGM). Some larger companies also declare an interim dividend during the year.",
        qBn: "ডিএসইর কোম্পানিগুলো কত দিন পর পর ডিভিডেন্ড দেয়?",
        aBn: "বেশির ভাগ কোম্পানি বছরে একবার, এজিএমের পর ডিভিডেন্ড ঘোষণা করে। কিছু বড় কোম্পানি বছরের মাঝেও অন্তর্বর্তী ডিভিডেন্ড দেয়।",
      },
    ],
  },
  {
    slug: "largest-companies-dse",
    displayName: "Largest Companies by Market Cap on DSE",
    heading: "Largest companies on the DSE by market value",
    headingBn: "বাজার মূলধনে ডিএসইর সবচেয়ে বড় কোম্পানি",
    shortName: "Largest companies",
    shortNameBn: "সবচেয়ে বড় কোম্পানি",
    description:
      "Ranking of the 20 largest companies listed on the Dhaka Stock Exchange by total market capitalisation. A definitive list of Bangladesh's biggest publicly traded companies.",
    keywords: [
      "largest companies DSE",
      "biggest stocks Bangladesh",
      "highest market cap DSE",
      "large cap stocks Bangladesh",
      "Bangladesh blue chip stocks",
    ],
    icon: "🏦",
    metricLabel: "Market value",
    metricLabelBn: "বাজার মূলধন",
    metricFormat: "currency_raw",
    apiKey: "top_market_cap",
    intro:
      "Market value is the share price times the number of shares: the price of the whole company. The largest companies on the DSE are the backbone of the market. They span banking, telecom, medicine and manufacturing, and they are among the most traded and most widely held shares in the country. Mutual funds and other large investors usually keep most of their money here.",
    introBn:
      "বাজার মূলধন হলো শেয়ারের দাম আর মোট শেয়ারের সংখ্যার গুণফল, অর্থাৎ পুরো কোম্পানির দাম। ডিএসইর সবচেয়ে বড় কোম্পানিগুলো বাজারের মেরুদণ্ড। ব্যাংক, টেলিকম, ওষুধ আর উৎপাদন সেক্টরে এদের দেখা যায়, আর দেশে এগুলোই সবচেয়ে বেশি লেনদেন হওয়া ও সবচেয়ে বেশি মানুষের কাছে থাকা শেয়ারের মধ্যে। মিউচুয়াল ফান্ড আর অন্য বড় বিনিয়োগকারীরা সাধারণত বেশির ভাগ টাকা এখানেই রাখেন।",
    faqs: [
      {
        q: "Which company has the highest market value on the DSE?",
        a: "The largest companies on the DSE usually include Grameenphone, the big medicine makers such as Square Pharma, and the large banks. The order shifts with each day's prices, so the list above shows today's ranking.",
        qBn: "ডিএসইতে কোন কোম্পানির বাজার মূলধন সবচেয়ে বেশি?",
        aBn: "ডিএসইর সবচেয়ে বড় কোম্পানির মধ্যে সাধারণত থাকে গ্রামীণফোন, স্কয়ার ফার্মার মতো বড় ওষুধ কোম্পানি আর বড় ব্যাংকগুলো। প্রতিদিনের দামে ক্রম বদলায়, তাই ওপরের তালিকায় আজকের অবস্থান দেখানো হয়।",
      },
      {
        q: "Are large companies safer in Bangladesh?",
        a: "Generally, yes. Large companies are easier to buy and sell, are watched more closely by regulators and are followed by more analysts. They can still fall a lot when the whole market falls.",
        qBn: "বাংলাদেশে বড় কোম্পানি কি বেশি নিরাপদ?",
        aBn: "সাধারণত হ্যাঁ। বড় কোম্পানির শেয়ার সহজে কেনাবেচা করা যায়, নিয়ন্ত্রকরা বেশি নজর রাখেন, আর বিশ্লেষকরাও বেশি খোঁজ রাখেন। তবে পুরো বাজার পড়লে এগুলোর দামও অনেক কমতে পারে।",
      },
      {
        q: "What is category A on the DSE, and is it linked to size?",
        a: "Category A means the company held its AGM and paid a dividend of at least 10% in the last year. It is about how the company treats shareholders, not its size, though many large companies are also in category A.",
        qBn: "ডিএসইর A ক্যাটাগরি কী, আর এটি কি কোম্পানির আকারের সঙ্গে সম্পর্কিত?",
        aBn: "A ক্যাটাগরি মানে কোম্পানি গত বছর এজিএম করেছে আর অন্তত 10% ডিভিডেন্ড দিয়েছে। এটি শেয়ারহোল্ডারদের প্রতি কোম্পানির আচরণের বিষয়, আকারের নয়, যদিও অনেক বড় কোম্পানিও A ক্যাটাগরিতে আছে।",
      },
    ],
  },
  {
    slug: "most-traded-stocks-dse",
    displayName: "Most Traded Stocks on DSE",
    heading: "Most traded shares on the DSE",
    headingBn: "ডিএসইতে সবচেয়ে বেশি লেনদেন হওয়া শেয়ার",
    shortName: "Most traded shares",
    shortNameBn: "সবচেয়ে বেশি লেনদেন",
    description:
      "The 20 stocks with the most money traded on the Dhaka Stock Exchange on the latest trading day. Heavy trading means better liquidity — you can buy or sell quickly without moving the price much.",
    keywords: [
      "most traded stocks DSE",
      "highest volume stocks Bangladesh",
      "most liquid stocks Dhaka",
      "active stocks DSE",
      "high liquidity shares Bangladesh",
    ],
    icon: "📊",
    metricLabel: "Traded",
    metricLabelBn: "লেনদেন",
    metricFormat: "currency",
    apiKey: "top_volume",
    intro:
      "This list ranks shares by the money traded on the last trading day, not by the number of shares. A ৳5 share traded a million times is less activity than a ৳500 share traded 50,000 times. A heavily traded share is easy to buy and sell at the quoted price without moving it much, so you are less likely to get stuck when you want to sell.",
    introBn:
      "এই তালিকা শেষ কার্যদিবসে কত টাকার লেনদেন হয়েছে, সেই অনুযায়ী সাজানো, শেয়ারের সংখ্যা অনুযায়ী নয়। ৳5 দামের শেয়ার দশ লাখ বার কেনাবেচা হওয়া ৳500 দামের শেয়ার 50,000 বার কেনাবেচা হওয়ার চেয়ে কম লেনদেন। যে শেয়ারে বেশি লেনদেন হয়, তা দেখানো দামে সহজে কেনাবেচা করা যায়, তাই বিক্রি করতে চাইলে আটকে যাওয়ার ঝুঁকি কম।",
    faqs: [
      {
        q: "Why does trading activity matter for DSE investors?",
        a: "It decides how easily you can buy or sell. A share that trades little can have a wide gap between the buying and selling price, and its price can jump without warning, which makes it riskier.",
        qBn: "ডিএসইর বিনিয়োগকারীদের জন্য লেনদেনের পরিমাণ কেন গুরুত্বপূর্ণ?",
        aBn: "কত সহজে কেনাবেচা করা যাবে, তা এর ওপর নির্ভর করে। যে শেয়ারে লেনদেন কম, তার কেনা ও বেচার দামের ব্যবধান বেশি হতে পারে, আর দাম হঠাৎ লাফাতে পারে, তাই ঝুঁকিও বেশি।",
      },
      {
        q: "Are heavily traded shares on the DSE always good investments?",
        a: "Not always. Heavy trading can come from speculation or short-term trading. It is wise to look at the company's profit, its dividend and its price against what it earns as well.",
        qBn: "বেশি লেনদেন হওয়া শেয়ার কি সবসময় ভালো বিনিয়োগ?",
        aBn: "সবসময় নয়। জল্পনা বা স্বল্পমেয়াদি কেনাবেচা থেকেও বেশি লেনদেন হতে পারে। কোম্পানির মুনাফা, ডিভিডেন্ড আর মুনাফার তুলনায় দামও দেখে নেওয়া ভালো।",
      },
      {
        q: "What counts as heavily traded on the DSE?",
        a: "A share trading more than ৳10 crore a day is among the busiest on the DSE. Below ৳10 lakh a day, it can be hard to buy or sell without moving the price.",
        qBn: "ডিএসইতে কতটা লেনদেন হলে বেশি ধরা হয়?",
        aBn: "দিনে ৳10 কোটির বেশি লেনদেন হলে শেয়ারটি ডিএসইর সবচেয়ে ব্যস্তগুলোর একটি। দিনে ৳10 লাখের কম হলে দাম না নড়িয়ে কেনাবেচা করা কঠিন হতে পারে।",
      },
    ],
  },
  {
    slug: "top-performing-stocks-dse",
    displayName: "Top Performing Stocks on DSE",
    heading: "Shares that rose most over a year on the DSE",
    headingBn: "এক বছরে ডিএসইতে সবচেয়ে বেশি বেড়েছে যে শেয়ার",
    shortName: "Best 1-year change",
    shortNameBn: "এক বছরে সবচেয়ে বেশি বেড়েছে",
    description:
      "DSE stocks with the highest 1-year return — the change from the price a year ago to today, adjusted for dividends and bonus shares. The strongest price performers on the Dhaka Stock Exchange over the past year.",
    keywords: [
      "top performing stocks DSE",
      "best stocks last 12 months Bangladesh",
      "highest return stocks DSE",
      "52 week best performers Bangladesh",
      "best price return stocks Dhaka",
    ],
    icon: "⚡",
    metricLabel: "1-year change",
    metricLabelBn: "এক বছরে পরিবর্তন",
    metricFormat: "percent",
    apiKey: "top_52w_return",
    intro:
      "The 1-year change compares today's price with the price a year ago. The old price is adjusted for any dividend or bonus shares since then, so a 20% bonus does not show up as a fall. A strong rise can reflect a business that is doing better, but it can also come from short-term buying, so it is wise to look at the company's results before you invest.",
    introBn:
      "এক বছরের পরিবর্তন হলো আজকের দাম আর এক বছর আগের দামের তুলনা। এর মধ্যে কোনো ডিভিডেন্ড বা বোনাস শেয়ার থাকলে পুরোনো দাম সেই অনুযায়ী ঠিক করা হয়, তাই 20% বোনাস দাম কমা হিসেবে দেখায় না। বড় বৃদ্ধি ব্যবসা ভালো হওয়ার লক্ষণ হতে পারে, আবার স্বল্পমেয়াদি কেনাকাটা থেকেও আসতে পারে, তাই বিনিয়োগের আগে কোম্পানির ফলাফল দেখে নেওয়া ভালো।",
    faqs: [
      {
        q: "Does a strong past year say what comes next on the DSE?",
        a: "Not reliably. A strong year tells you what happened, not what will happen. A rise backed by growing profit stands on firmer ground than a rise without it, which can reverse.",
        qBn: "গত বছর ভালো গেলে কি সামনেও ভালো যাবে?",
        aBn: "নিশ্চিত করে বলা যায় না। ভালো একটি বছর বলে কী হয়েছে, কী হবে তা নয়। মুনাফা বাড়ার সঙ্গে দাম বাড়লে তার ভিত শক্ত, আর মুনাফা ছাড়া দাম বাড়লে তা আবার কমে যেতে পারে।",
      },
      {
        q: "What does the 1-year change mean for a DSE share?",
        a: "It compares today's price with the price a year ago. A share at ৳100 that was ৳50 a year ago has a 100% 1-year change. Dividends and bonus shares in between are adjusted for.",
        qBn: "ডিএসইর শেয়ারের এক বছরের পরিবর্তন মানে কী?",
        aBn: "এটি আজকের দামকে এক বছর আগের দামের সঙ্গে তুলনা করে। এক বছর আগে ৳50 দামের শেয়ার আজ ৳100 হলে পরিবর্তন 100%। মাঝের ডিভিডেন্ড আর বোনাস শেয়ার হিসাবে ধরা হয়।",
      },
      {
        q: "Should I buy the shares that rose most on the DSE?",
        a: "Buying only because a price has risen carries risk. The DSE limits each day's move to 10%, so big moves build up over several days. Check whether the company's profit supports the higher price before you buy.",
        qBn: "যে শেয়ার সবচেয়ে বেশি বেড়েছে, সেগুলো কি কেনা উচিত?",
        aBn: "শুধু দাম বেড়েছে বলে কেনা ঝুঁকির। ডিএসইতে এক দিনে দাম সর্বোচ্চ 10% নড়তে পারে, তাই বড় পরিবর্তন কয়েক দিনে হয়। কেনার আগে দেখুন, কোম্পানির মুনাফা বাড়তি দামের সঙ্গে মানানসই কি না।",
      },
    ],
  },
];

/** The free list's opening line, built from its first name. */
export function classicLede(def: StockListDef, items: StockListItem[]): { en: string; bn: string } {
  const top = items[0]?.company_name?.trim() || items[0]?.trading_code || "the leader";
  switch (def.apiKey) {
    case "top_dividend":
      return {
        en: `These companies pay the most cash to shareholders for their price, ranked by dividend yield, with ${top} first. A high yield is only as good as the company paying it.`,
        bn: `দামের তুলনায় এই কোম্পানিগুলো শেয়ারহোল্ডারদের সবচেয়ে বেশি নগদ দেয়, ডিভিডেন্ড ইল্ড অনুযায়ী সাজানো, প্রথমে ${top}। বেশি ইল্ড ততটাই ভালো, যতটা ভালো কোম্পানিটি।`,
      };
    case "top_52w_return":
      return {
        en: `The shares whose price rose most over the past year, led by ${top}. A strong rise can continue or fade, so look at the business, not only the chart, before you buy.`,
        bn: `গত এক বছরে যে শেয়ারগুলোর দাম সবচেয়ে বেশি বেড়েছে, প্রথমে ${top}। বড় বৃদ্ধি চলতেও পারে, থেমেও যেতে পারে, তাই কেনার আগে শুধু চার্ট নয়, ব্যবসাটিও দেখুন।`,
      };
    case "top_volume":
      return {
        en: `The shares with the most money traded on the last trading day, led by ${top}. They are easy to buy and sell, but heavy trading alone does not make a share a good buy.`,
        bn: `শেষ কার্যদিবসে যে শেয়ারগুলোতে সবচেয়ে বেশি টাকার লেনদেন হয়েছে, প্রথমে ${top}। এগুলো সহজে কেনাবেচা করা যায়, তবে শুধু বেশি লেনদেন কোনো শেয়ারকে ভালো কেনা বানায় না।`,
      };
    case "top_market_cap":
    default:
      return {
        en: `The largest companies on the Dhaka Stock Exchange by total market value, with ${top} at the top. Large companies tend to be steadier and easier to trade.`,
        bn: `মোট বাজার মূলধন অনুযায়ী ডিএসইর সবচেয়ে বড় কোম্পানিগুলো, শীর্ষে ${top}। বড় কোম্পানি সাধারণত বেশি স্থির আর কেনাবেচাও সহজ।`,
      };
  }
}

/** One plain sentence on a company's place in a free list. */
export function classicLine(item: StockListItem, def: StockListDef): { en: string; bn: string } {
  const v = item.metric_value;
  if (v == null) return { en: "One of the names in this group.", bn: "এই দলের একটি নাম।" };
  const f = formatMetric(v, def.metricFormat);
  const fb = formatMetric(v, def.metricFormat, "bn");
  switch (def.apiKey) {
    case "top_dividend":
      return {
        en: `Pays a ${f} dividend yield, among the highest on the market.`,
        bn: `${fb} ডিভিডেন্ড ইল্ড দেয়, যা বাজারে সবচেয়ে বেশিগুলোর একটি।`,
      };
    case "top_52w_return":
      return {
        en: `Up ${f} on a year ago, one of the year's biggest rises.`,
        bn: `এক বছর আগের চেয়ে ${fb} বেশি, এ বছরের সবচেয়ে বড় বৃদ্ধিগুলোর একটি।`,
      };
    case "top_volume":
      return {
        en: `${f} traded on the last trading day, so it is easy to buy and sell without moving the price.`,
        bn: `শেষ কার্যদিবসে ${fb} লেনদেন হয়েছে, তাই দাম না নড়িয়ে সহজে কেনাবেচা করা যায়।`,
      };
    case "top_market_cap":
    default:
      return {
        en: `Worth ${f} in total, one of the largest companies on the exchange.`,
        bn: `মোট মূল্য ${fb}, বাজারের সবচেয়ে বড় কোম্পানিগুলোর একটি।`,
      };
  }
}
