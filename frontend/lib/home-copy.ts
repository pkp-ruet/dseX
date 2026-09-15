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

  // Chapters
  chMoney: ["Your money", "আপনার টাকা"],
  chMarket: ["Market today", "আজকের বাজার"],
  chIdeas: ["Worth a look", "দেখার মতো"],
  chDividends: ["Money coming", "টাকা আসছে"],
  chLearn: ["Learn", "শিখুন"],

  // Your stocks
  yourStocksToday: ["Your stocks today", "আজ আপনার শেয়ারগুলো"],
  viewAll: ["View all {n}", "সব {n}টি দেখুন"],
  showAll: ["Show all {n}", "সব {n}টি দেখান"],
  showFewer: ["Show fewer", "কম দেখান"],
  near52wHigh: ["Near 52W high", "বছরের সর্বোচ্চের কাছে"],
  near52wLow: ["Near 52W low", "বছরের সর্বনিম্নের কাছে"],
  dividendSoon: ["Dividend soon", "ডিভিডেন্ড আসছে"],
  alertAt: ["Alert at ৳{n}", "৳{n}-এ অ্যালার্ট"],
  fullReport: ["Full report", "পুরো রিপোর্ট"],
  inPortfolio: ["In your portfolio", "আপনার পোর্টফোলিওতে"],
  onWatchlist: ["On your watchlist", "আপনার ওয়াচলিস্টে"],

  // Portfolio at a glance
  glanceTitle: ["Your portfolio at a glance", "আপনার পোর্টফোলিও এক নজরে"],
  goodLabel: ["Going well", "ভালো দিক"],
  badLabel: ["Watch out", "সাবধান"],
  considerLabel: ["Consider", "ভেবে দেখুন"],
  cashComing: ["Cash coming to you", "আপনার কাছে টাকা আসছে"],
  cashComingSub: ["{n} dividends in the next month", "আগামী মাসে {n}টি ডিভিডেন্ড"],
  cashComingOne: ["1 dividend in the next month", "আগামী মাসে 1টি ডিভিডেন্ড"],
  noCashSoon: ["No dividend due in the next month", "আগামী মাসে কোনো ডিভিডেন্ড নেই"],
  spread: ["Where your money sits", "আপনার টাকা কোথায় আছে"],
  fullAnalysis: ["Full analysis", "পুরো বিশ্লেষণ"],
  others: ["Others", "অন্যান্য"],

  // Attention
  needsAttention: ["Needs your attention", "আজ খেয়াল করুন"],
  moreOnYourStocks: ["+{n} more on your stocks today", "আপনার শেয়ারে আরও {n}টি"],

  // News
  newsOnYourStocks: ["News on your stocks", "আপনার শেয়ারের খবর"],
  allNewsYourStocks: ["All news on your stocks", "আপনার শেয়ারের সব খবর"],
  allMarketNews: ["All market news", "বাজারের সব খবর"],
  marketNewsTitle: ["Today's market news", "আজকের বাজারের খবর"],
  allNews: ["All news", "সব খবর"],

  // Movers
  moversTitle: ["Today's movers", "আজকের বড় ওঠানামা"],
  gainers: ["Gainers", "বেড়েছে"],
  losers: ["Losers", "কমেছে"],
  // Tab labels sit in a 3-column strip ~90px wide on a 360px phone — keep
  // them short enough not to wrap there.
  mostTraded: ["Most traded", "বেশি লেনদেন"],
  allMovers: ["Whole market", "পুরো বাজার"],
  traded: ["traded", "লেনদেন"],

  // Sectors
  sectorsTitle: ["Sectors this week", "এই সপ্তাহে খাতগুলো"],
  week: ["week", "সপ্তাহ"],
  month: ["month", "মাস"],
  allSectors: ["All sectors", "সব খাত"],
  companiesN: ["{n} companies", "{n}টি কোম্পানি"],
  weekDotLegend: ["Bar = this week · dot = this month", "বার = এই সপ্তাহ · বিন্দু = এই মাস"],

  // Bengali snapshot
  snapshotTitle: ["আজকের বাজার এক নজরে", "আজকের বাজার এক নজরে"],
  readFull: ["পুরোটা পড়ুন", "পুরোটা পড়ুন"],

  // Turning points
  turningTitle: ["Worth watching", "নজর রাখার মতো"],
  nearHigh: ["Near yearly high", "বছরের সর্বোচ্চের কাছে"],
  nearLow: ["Near yearly low", "বছরের সর্বনিম্নের কাছে"],
  unusual: ["Unusual buying", "অস্বাভাবিক কেনাকাটা"],
  fromHigh: ["{n}% below its high", "সর্বোচ্চের {n}% নিচে"],
  aboveLow: ["{n}% above its low", "সর্বনিম্নের {n}% উপরে"],
  volumeX: ["{n}× usual trading", "স্বাভাবিকের {n}× লেনদেন"],
  whyItMatters: ["Why this matters", "কেন গুরুত্বপূর্ণ"],

  // Buys
  buysTitle: ["Buy signals today", "আজ কেনার সংকেত"],
  buysCount: ["{n} companies look like a Buy today.", "আজ {n}টি কোম্পানি কেনার মতো দেখাচ্ছে।"],
  buysOne: ["1 company looks like a Buy today.", "আজ 1টি কোম্পানি কেনার মতো দেখাচ্ছে।"],
  buysNone: ["No company is a clear Buy today.", "আজ কোনো কোম্পানি স্পষ্টভাবে কেনার মতো নয়।"],
  allBuys: ["All buy signals", "সব কেনার সংকেত"],
  strongTag: ["Strong", "জোরালো"],
  buysNote: ["Strong companies at a fair price. Not advice — a place to start.", "ভালো কোম্পানি, ঠিকঠাক দামে। পরামর্শ নয় — শুরু করার জায়গা।"],

  // Top ranked
  rankedTitle: ["Top ranked companies", "সেরা নম্বর পাওয়া কোম্পানি"],
  fullRanking: ["Full ranking", "পুরো তালিকা"],
  ofN: ["of {n} companies scored", "{n}টি কোম্পানির মধ্যে"],
  outOf100: ["/100", "/100"],

  // Lists rail
  listsTitle: ["Ready-made lists", "তৈরি তালিকা"],
  lensOnSale: ["On sale", "কম দামে"],
  lensOnSaleSub: ["Strong companies, cheap right now", "ভালো কোম্পানি, এখন দাম কম"],
  lensIncome: ["Pays the most cash", "সবচেয়ে বেশি নগদ দেয়"],
  lensIncomeSub: ["Highest dividends among strong companies", "ভালো কোম্পানির মধ্যে সর্বোচ্চ ডিভিডেন্ড"],
  lensRising: ["Rising", "বাড়ছে"],
  lensRisingSub: ["Best week among quality names", "ভালো কোম্পানির মধ্যে সপ্তাহের সেরা"],
  lensFallen: ["Fallen, still strong", "পড়েছে, তবু শক্ত"],
  lensFallenSub: ["Down this month, business still solid", "এ মাসে কমেছে, ব্যবসা এখনও ঠিক"],
  seeList: ["See list", "তালিকা দেখুন"],
  bestToday: ["Best today", "আজ সেরা"],
  allLists: ["All lists", "সব তালিকা"],

  // Trending / popular / tips
  trendingTitle: ["Trending this week", "এই সপ্তাহে আলোচনায়"],
  sevenDay: ["7 days", "7 দিন"],
  allTrending: ["All trending", "সব আলোচিত"],
  upLastWeek: ["Up {n}% in the last week", "গত সপ্তাহে {n}% বেড়েছে"],
  downLastWeek: ["Down {n}% in the last week", "গত সপ্তাহে {n}% কমেছে"],
  popularTitle: ["What others are looking at", "অন্যরা কী দেখছে"],
  views: ["{n} views", "{n} বার দেখা"],
  seeAll: ["See all", "সব দেখুন"],
  tipsTitle: ["Today's tips", "আজকের টিপস"],
  allTips: ["All tips", "সব টিপস"],

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

  // Dividend board
  divBoardTitle: ["Dividends in the next 2 weeks", "আগামী 2 সপ্তাহের ডিভিডেন্ড"],
  perShare: ["per share", "শেয়ারপ্রতি"],
  yieldWord: ["yield", "দামের তুলনায়"],
  buyBy: ["Buy by {date}", "{date}-এর মধ্যে কিনুন"],
  recordOn: ["Record date {date}", "রেকর্ড ডেট {date}"],
  daysLeft: ["{n} days left", "{n} দিন বাকি"],
  oneDayLeft: ["1 day left", "1 দিন বাকি"],
  todayLast: ["Today", "আজ"],
  fullCalendar: ["Full calendar", "পুরো ক্যালেন্ডার"],
  justDeclared: ["Just declared", "সদ্য ঘোষিত"],
  bonus: ["{n}% bonus shares", "{n}% বোনাস শেয়ার"],
  cashPct: ["{n}% cash", "{n}% নগদ"],
  noDividendSoon: ["No record dates in the next two weeks.", "আগামী দুই সপ্তাহে কোনো রেকর্ড ডেট নেই।"],
  declaredOn: ["Declared {date}", "ঘোষণা {date}"],

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
  thisYear: ["DSEX this year", "এ বছরের DSEX"],

  // Explore / learn
  exploreMarket: ["Explore the market", "বাজার ঘুরে দেখুন"],
  seeMore: ["More", "আরও"],
  seeFewer: ["Fewer", "কম"],
  startHere: ["New to shares? Start here", "শেয়ার বাজারে নতুন? এখান থেকে শুরু করুন"],
  startHereSub: ["Three short guides in everyday Bengali.", "সহজ বাংলায় তিনটি ছোট গাইড।"],
  learnTitle: ["Learn something today", "আজ কিছু শিখুন"],
  learnSub: ["Two short reads, new every day.", "দুটি ছোট লেখা, প্রতিদিন নতুন।"],
  guideBn: ["In Bengali", "বাংলায়"],
  guideEn: ["In English", "ইংরেজিতে"],
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
