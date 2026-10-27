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
  dseTodayLink: ["DSE Today", "আজকের DSE"],
  dseTodayLinkSub: ["Every stock's price and today's news", "সব শেয়ারের দাম আর আজকের খবর"],
  marketAnalysisLink: ["Market Analysis", "বাজার বিশ্লেষণ"],
  marketAnalysisLinkSub: ["The whole market in plain words", "পুরো বাজার সহজ কথায়"],
  chIdeas: ["Find stocks", "শেয়ার খুঁজুন"],
  chIdeasSub: [
    "Ready-made ways to find stocks today. Pick one, see the names, tap for the full list.",
    "আজ শেয়ার খোঁজার তৈরি উপায়। একটি বেছে নিন, নামগুলো দেখুন, পুরো তালিকার জন্য ট্যাপ করুন।",
  ],
  chDividends: ["Money coming", "টাকা আসছে"],
  chLearn: ["Learn", "শিখুন"],

  // Your stocks
  yourStocksToday: ["Your stocks today", "আজ আপনার শেয়ারগুলো"],
  showAll: ["Show all {n}", "সব {n}টি দেখান"],
  showFewer: ["Show fewer", "কম দেখান"],
  stocksDay: ["{up} of these {n} stocks rose today, {down} fell.", "আজ এই {n}টি শেয়ারের {up}টি বেড়েছে, {down}টি কমেছে।"],
  stocksDayLast: [
    "On the last trading day {up} of these {n} stocks rose, {down} fell.",
    "শেষ লেনদেনের দিনে এই {n}টি শেয়ারের {up}টি বেড়েছে, {down}টি কমেছে।",
  ],
  secPortfolio: ["Your portfolio", "আপনার পোর্টফোলিও"],
  secWatchlist: ["Your watchlist", "আপনার ওয়াচলিস্ট"],
  nStocks: ["{n} stocks", "{n}টি শেয়ার"],
  oneStock: ["1 stock", "1টি শেয়ার"],
  alsoOwned: ["{n} you also own are under Your portfolio", "আপনার কেনা {n}টি পোর্টফোলিও অংশে আছে"],
  alsoOwnedOne: ["1 you also own is under Your portfolio", "আপনার কেনা 1টি পোর্টফোলিও অংশে আছে"],
  nothingHere: ["Nothing stands out here right now.", "এখানে এখন বিশেষ কিছু নেই।"],
  otherPoints: ["Other updates", "অন্যান্য আপডেট"],
  bestToday: ["Rose most", "সবচেয়ে বেড়েছে"],
  worstToday: ["Fell most", "সবচেয়ে কমেছে"],
  whatHappened: ["What happened", "যা ঘটেছে"],
  rightNow: ["Right now", "এই মুহূর্তে"],
  nowBuy: ["Buy signal", "কেনার সংকেত"],
  nowSell: ["Marked Sell", "বিক্রির সংকেত"],
  nowGood: ["Good grade or better", "ভালো বা তার বেশি গ্রেড"],
  nowNone: ["None today", "আজ নেই"],
  nowWeak: ["{n} weak", "{n}টি দুর্বল"],
  nowOf: ["{a} of {b}", "{b}টির {a}টি"],
  upFlatDown: ["{up} up · {flat} same · {down} down", "{up}টি বেড়েছে · {flat}টি একই · {down}টি কমেছে"],
  showMorePoints: ["Show {n} more", "আরও {n}টি দেখুন"],
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

  // The updates line under the greeting (= the key points in "Your stocks today")
  updatesOne: ["1 update on your stocks", "আপনার শেয়ারে 1টি আপডেট"],
  updatesMany: ["{n} updates on your stocks", "আপনার শেয়ারে {n}টি আপডেট"],
  allQuiet: ["All quiet on your stocks", "আপনার শেয়ারে নতুন কিছু নেই"],

  // News
  resultsPromoTitle: ["Quarterly results, in plain words", "ত্রৈমাসিক ফল, সহজ ভাষায়"],
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
  // Research lists (homepage rail — full for Premium, a promotion card for everyone else)
  researchTitle: ["Research lists", "গবেষণা তালিকা"],
  researchSub: ["Six ideas, each tested on every company with plain checks.", "ছয়টি আইডিয়া — প্রতিটি কোম্পানিকে সহজ যাচাইয়ে পরীক্ষা করা।"],
  // Screener card
  screenerTitle: ["Find stocks your way", "নিজের মতো শেয়ার খুঁজুন"],
  screenerSub: ["Tap a quick pick: see what it asks and which stocks pass today.", "একটি দ্রুত বাছাই চাপুন: এটি কী দেখে আর আজ কোন শেয়ার পাস করছে দেখুন।"],
  screenerAsks: ["What this pick asks", "এই বাছাই যা দেখে"],
  screenerPassToday: ["{n} stocks pass today", "আজ {n}টি শেয়ার পাস করেছে"],
  screenerHidden: ["Among the other {n}", "বাকি {n}টির মধ্যে"],
  screenerBuys: ["{n} have a Buy signal", "{n}টিতে 'কিনুন' সংকেত"],
  screenerMarked: ["{n} marked \"{tag}\"", "{n}টি \"{tag}\""],
  screenerFollow: ["{n} you follow", "{n}টি আপনার"],
  screenerOpen: ["Screener", "স্ক্রিনার"],
  screenerSeeAll: ["See all {n} in the screener", "স্ক্রিনারে সব {n}টি দেখুন"],
  screenerChange: ["Open in the screener", "স্ক্রিনারে খুলুন"],
  screenerNone: ["None pass today. Try another goal.", "আজ কোনোটি পাস করেনি। অন্য লক্ষ্য দেখুন।"],
  screenerYours: ["Your screens", "আপনার স্ক্রিন"],
  screenerNew: ["{n} new", "{n}টি নতুন"],
  screenerPass: ["{n} pass", "{n}টি পাস"],
  allLists: ["All lists", "সব তালিকা"],
  researchSeeAll: ["See all {n}", "সব {n}টি দেখুন"],
  topN: ["Top {n}", "সেরা {n}টি"],
  researchPromoHead: ["Six lists that do the research for you", "আপনার হয়ে গবেষণা করা ছয়টি তালিকা"],
  researchPromoSub: [
    "Every company goes through the same plain checks. Premium shows each stock that passes, with its numbers and its main risk.",
    "প্রতিটি কোম্পানি একই সহজ যাচাই পার হয়। প্রিমিয়ামে দেখবেন কোন শেয়ার পাস করেছে — তার সংখ্যা আর মূল ঝুঁকিসহ।",
  ],
  researchPass: ["{n} stocks pass today", "আজ {n}টি শেয়ার পাস"],
  researchCtaFree: ["See Premium plans", "প্রিমিয়াম প্ল্যান দেখুন"],
  researchCtaGuest: ["Sign up free, then see Premium", "ফ্রি অ্যাকাউন্ট খুলে প্রিমিয়াম দেখুন"],

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
  tipsSub: ["One fact worth knowing on each", "প্রতিটির একটি জানার মতো তথ্য"],
  trendingSub: ["Moved the most in the last 7 days", "গত 7 দিনে সবচেয়ে বেশি নড়েছে"],
  popularSub: ["Most opened by readers this week", "এ সপ্তাহে পাঠকেরা সবচেয়ে বেশি দেখছেন"],
  discoverTitle: ["More ways to find stocks", "শেয়ার খোঁজার আরও উপায়"],
  discoverSub: ["Short lists from today's market — three names each.", "আজকের বাজারের ছোট তালিকা — প্রতিটিতে তিনটি নাম।"],

  // Glance strip
  glanceDsex: ["DSEX", "DSEX"],
  glanceBreadth: ["Up · down today", "আজ বেড়েছে · কমেছে"],
  glanceBreadthLast: ["Up · down last day", "শেষ দিনে বেড়েছে · কমেছে"],
  glanceYourDay: ["Of your stocks rose today", "আপনার শেয়ার আজ বেড়েছে"],
  glanceYourDayLast: ["Of your stocks rose last day", "আপনার শেয়ার শেষ দিনে বেড়েছে"],
  glanceNextDividend: ["Next record date", "পরের রেকর্ড ডেট"],
  glanceDaysLeft: ["in {n} days", "{n} দিন পর"],
  glanceTomorrow: ["tomorrow", "আগামীকাল"],
  glanceTodayWord: ["today", "আজ"],

  // Money hero numbers
  heroToday: ["Today", "আজ"],
  heroTotal: ["Since you bought", "কেনার পর থেকে"],
  heroVsDsex: ["Vs DSEX today", "আজ বাজারের তুলনায়"],
  allTips: ["All tips", "সব টিপস"],

  // Plain "kind" words (DiscoverRail rows)
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
  divBoardTitle: ["Next 2 weeks", "আগামী 2 সপ্তাহ"],
  perShare: ["per share", "শেয়ারপ্রতি"],
  yieldWord: ["yield", "দামের তুলনায়"],
  buyBy: ["Buy by {date}", "{date}-এর মধ্যে কিনুন"],
  recordOn: ["Record date {date}", "রেকর্ড ডেট {date}"],
  daysLeft: ["{n} days left", "{n} দিন বাকি"],
  oneDayLeft: ["1 day left", "1 দিন বাকি"],
  todayLast: ["Today", "আজ"],
  fullCalendar: ["Full calendar", "পুরো ক্যালেন্ডার"],
  justDeclared: ["Just declared", "সদ্য ঘোষিত"],
  divPromoMore: ["{n} more record dates in the next 2 weeks", "আগামী 2 সপ্তাহে আরও {n}টি রেকর্ড ডেট"],
  divPromoMine: ["{n} of your stocks are on the list", "এর মধ্যে আপনার {n}টি শেয়ার আছে"],
  divPromoDeclared: ["{n} new dividend declarations", "{n}টি নতুন লভ্যাংশ ঘোষণা"],
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

/** `t("bn", "showAll", { n: 12 })` → "সব 12টি দেখান". Missing vars are left as-is. */
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
