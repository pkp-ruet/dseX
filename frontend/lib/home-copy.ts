import type { Lang } from "@/context/LangContext";

/**
 * Every fixed string on the logged-in dashboard, English and everyday Bengali.
 * Components call `t(lang, "key")`. Sentences that carry data (the brief, the
 * alerts, the pick reasons) are built in their own lib files; this is only the
 * card chrome — titles, chips, links, empty states.
 *
 * Bengali rules (see feedback memory): Western digits inside Bengali text,
 * plain everyday words, no finance terms.
 */
const COPY = {
  // Greeting / hero
  goodMorning: ["Good morning", "সুপ্রভাত"],
  goodAfternoon: ["Good afternoon", "শুভ অপরাহ্ন"],
  goodEvening: ["Good evening", "শুভ সন্ধ্যা"],
  welcome: ["Welcome to TopStockBD", "TopStockBD-এ স্বাগতম"],
  yourMoneyToday: ["Your money today", "আজ আপনার টাকা"],
  today: ["today", "আজ"],
  updatingLive: ["Updating live through the day", "সারাদিন লাইভ আপডেট হচ্ছে"],
  asOfClose: ["As of {date} close", "{date} বাজার শেষের হিসাব"],
  latestPrices: ["Latest available prices", "সর্বশেষ পাওয়া দাম"],
  trackingDsex: ["Tracking DSEX today", "আজ বাজারের সাথে সমান"],
  beatingDsex: ["Beating DSEX by +{n}%", "বাজারের চেয়ে {n}% এগিয়ে"],
  trailingDsex: ["Trailing DSEX by {n}%", "বাজারের চেয়ে {n}% পিছিয়ে"],
  total: ["Total", "মোট"],
  seeFullPortfolio: ["See full portfolio analysis", "পোর্টফোলিওর পুরো বিশ্লেষণ দেখুন"],
  seeYourMoneyHere: ["See your money here", "এখানে আপনার টাকার হিসাব দেখুন"],
  ghostBlurb: [
    "Add the stocks you own to track live profit & loss and get your portfolio graded A–F.",
    "আপনার কেনা শেয়ারগুলো যোগ করুন — লাভ-ক্ষতি লাইভ দেখুন, আর পোর্টফোলিওর গ্রেড (A–F) জানুন।",
  ],
  addHoldings: ["Add your holdings", "শেয়ার যোগ করুন"],
  gradeExcellent: ["Excellent", "চমৎকার"],
  gradeGood: ["Good", "ভালো"],
  gradeOkay: ["Okay", "মোটামুটি"],
  gradeRisky: ["Risky", "ঝুঁকিপূর্ণ"],
  gradeVeryRisky: ["Very Risky", "খুব ঝুঁকিপূর্ণ"],

  // Your stocks
  yourStocksToday: ["Your stocks today", "আজ আপনার শেয়ারগুলো"],
  viewAll: ["View all {n}", "সব {n}টি দেখুন"],
  near52wHigh: ["Near 52W high", "বছরের সর্বোচ্চের কাছে"],
  near52wLow: ["Near 52W low", "বছরের সর্বনিম্নের কাছে"],
  dividendSoon: ["Dividend soon", "ডিভিডেন্ড আসছে"],
  alertAt: ["Alert at ৳{n}", "৳{n}-এ অ্যালার্ট"],
  fullReport: ["Full report", "পুরো রিপোর্ট"],
  inPortfolio: ["In your portfolio", "আপনার পোর্টফোলিওতে"],
  onWatchlist: ["On your watchlist", "আপনার ওয়াচলিস্টে"],

  // Attention
  needsAttention: ["Needs your attention", "আজ খেয়াল করুন"],
  moreOnYourStocks: ["+{n} more on your stocks today", "আপনার শেয়ারে আরও {n}টি"],

  // News
  newsOnYourStocks: ["News on your stocks", "আপনার শেয়ারের খবর"],
  allNewsYourStocks: ["All news on your stocks", "আপনার শেয়ারের সব খবর"],
  allMarketNews: ["All market news", "বাজারের সব খবর"],

  // Ideas
  ideasTitle: ["3 stocks worth a look today", "আজ দেখার মতো 3টি শেয়ার"],
  ideasTitleTuned: ["3 stocks picked for you today", "আজ আপনার জন্য বাছাই 3টি শেয়ার"],
  ideasExplainer: [
    "Strong companies at a fair price, refreshed every day. Not advice — a place to start looking.",
    "ভালো কোম্পানি, ঠিকঠাক দামে — প্রতিদিন নতুন। এটা পরামর্শ নয়, দেখা শুরু করার জায়গা।",
  ],
  ideasSeeAll: ["More ideas", "আরও আইডিয়া"],
  ideasFooter: ["Tap a stock to see its full checkup.", "পুরো যাচাই দেখতে শেয়ারে ট্যাপ করুন।"],
  kindYouFollow: ["You follow this", "আপনি ফলো করেন"],
  kindMatched: ["Matched to you", "আপনার পছন্দের মতো"],
  kindGoodPrice: ["Good price now", "এখন দাম ভালো"],
  kindStrongBuy: ["Very good price now", "এখন দাম খুব ভালো"],
  kindPaysCash: ["Pays cash", "নগদ ডিভিডেন্ড দেয়"],
  kindGrowing: ["Profits growing", "মুনাফা বাড়ছে"],
  kindSteady: ["Steady earner", "নিয়মিত মুনাফা"],
  kindCheap: ["Cheaper than peers", "অন্যদের চেয়ে সস্তা"],
  kindNearLow: ["Near yearly low", "বছরের সর্বনিম্নের কাছে"],
  kindStrong: ["Strong company", "শক্তিশালী কোম্পানি"],
  kindTip: ["Worth knowing", "জানার মতো"],
  newTag: ["New", "নতুন"],

  // Market today
  marketToday: ["Market today", "আজকের বাজার"],
  fullPicture: ["Full picture", "পুরো ছবি"],
  todaysMarketBn: ["Today's market, in Bengali", "আজকের শেয়ার বাজার"],
  advancing: ["{n} advancing", "{n}টি বেড়েছে"],
  unchanged: ["{n} unchanged", "{n}টি অপরিবর্তিত"],
  declining: ["{n} declining", "{n}টি কমেছে"],
  cheapNormal: ["Normal", "স্বাভাবিক"],
  cheapCheap: ["Cheap", "সস্তা"],
  cheapExpensive: ["Expensive", "দামি"],
  sharePricesVsUsual: ["share prices vs usual", "স্বাভাবিকের তুলনায় দাম"],
  lookHealthy: ["of {total} look healthy", "{total}টির মধ্যে ভালো অবস্থায়"],
  companiesHealthy: ["companies healthy", "কোম্পানি ভালো অবস্থায়"],
  dividendsComingUp: ["dividends coming up", "ডিভিডেন্ড আসছে"],
  turnoverVsLastDay: ["trading vs last day", "গতকালের তুলনায় লেনদেন"],
  sinceYesterday: ["Since yesterday", "গতকাল থেকে"],
  moodUp: ["The market is going up today.", "আজ বাজার উপরের দিকে।"],
  moodDown: ["The market is going down today.", "আজ বাজার নিচের দিকে।"],
  moodSteady: ["The market is steady today.", "আজ বাজার স্থির।"],
  moodWeak: ["The market is weak today.", "আজ বাজার দুর্বল।"],
  moodFallback: ["See how the whole market is doing today.", "আজ পুরো বাজারের অবস্থা দেখুন।"],

  // Explore
  exploreMarket: ["Explore the market", "বাজার ঘুরে দেখুন"],
  seeMore: ["More", "আরও"],
  seeFewer: ["Fewer", "কম"],

  // Start here
  startHere: ["New to shares? Start here", "শেয়ার বাজারে নতুন? এখান থেকে শুরু করুন"],
  startHereSub: [
    "Three short guides in everyday Bengali.",
    "সহজ বাংলায় তিনটি ছোট গাইড।",
  ],
  allGuides: ["All guides", "সব গাইড"],

  // Misc
  lookUpAnyStock: ["Look up any stock", "যে কোনো শেয়ার খুঁজুন"],
  seeWhy: ["See why", "কারণ দেখুন"],
} as const;

export type CopyKey = keyof typeof COPY;

/** `t("bn", "viewAll", { n: 12 })` → "সব 12টি দেখুন". Missing vars are left as-is. */
export function t(lang: Lang, key: CopyKey, vars?: Record<string, string | number>): string {
  const pair = COPY[key];
  let s: string = lang === "bn" ? pair[1] : pair[0];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  }
  return s;
}

/** Portfolio grade word in the reader's language. */
export function gradeLabel(lang: Lang, label: string): string {
  const map: Record<string, CopyKey> = {
    Excellent: "gradeExcellent",
    Good: "gradeGood",
    Okay: "gradeOkay",
    Risky: "gradeRisky",
    "Very Risky": "gradeVeryRisky",
  };
  const key = map[label];
  return key ? t(lang, key) : label;
}

/** Bengali needs `lang="bn"` + `.font-bn` or it renders as boxes. */
export function bnAttrs(lang: Lang): { lang?: string; className: string } {
  return lang === "bn" ? { lang: "bn", className: "font-bn" } : { className: "" };
}
