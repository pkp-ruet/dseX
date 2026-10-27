import type { Lang } from "@/context/LangContext";

/**
 * Every fixed string on the logged-in dashboard (and the landing cards it
 * shares), English and Bengali, in the voice of docs/voice.md. Visible text
 * renders both through `tt("key")` (components/home/tt.tsx → `<T>`), so the
 * navbar switch flips it without a re-render; `t(lang, "key")` is for
 * attributes and logic. Sentences that carry data are built in their own lib
 * files; this is only the card chrome — titles, chips, links, empty states.
 *
 * Western digits inside Bengali text.
 */
const COPY = {
  // Greeting / hero
  goodMorning: ["Good morning", "সুপ্রভাত"],
  goodAfternoon: ["Good afternoon", "শুভ অপরাহ্ন"],
  goodEvening: ["Good evening", "শুভ সন্ধ্যা"],
  welcome: ["Welcome to TopStockBD", "TopStockBD-এ স্বাগতম"],
  yourMoneyToday: ["Your money today", "আজ আপনার টাকা"],
  today: ["today", "আজ"],
  updatingLive: ["Prices update through the day", "সারা দিন দাম হালনাগাদ হচ্ছে"],
  asOfClose: ["As of the {date} close", "{date} বাজার বন্ধের হিসাবে"],
  latestPrices: ["Latest prices we have", "আমাদের কাছে থাকা সর্বশেষ দাম"],
  trackingDsex: ["In line with DSEX today", "আজ DSEX-এর সঙ্গে সমান তালে"],
  beatingDsex: ["Ahead of DSEX by {n}%", "DSEX-এর চেয়ে {n}% এগিয়ে"],
  trailingDsex: ["Behind DSEX by {n}%", "DSEX-এর চেয়ে {n}% পিছিয়ে"],
  total: ["Total", "মোট"],
  seeFullPortfolio: ["See the full portfolio analysis", "পোর্টফোলিওর পূর্ণ বিশ্লেষণ দেখুন"],
  seeYourMoneyHere: ["See your money here", "এখানে আপনার টাকার হিসাব দেখুন"],
  ghostBlurb: [
    "Add the shares you own to follow your profit or loss each day and get your portfolio graded from A to F.",
    "আপনার কেনা শেয়ারগুলো যোগ করুন। প্রতিদিনের মুনাফা বা লোকসান দেখতে পাবেন, আর পোর্টফোলিওর গ্রেড (A থেকে F) জানতে পারবেন।",
  ],
  addHoldings: ["Add your shares", "আপনার শেয়ার যোগ করুন"],
  gradeExcellent: ["Excellent", "চমৎকার"],
  gradeGood: ["Good", "ভালো"],
  gradeOkay: ["Okay", "মোটামুটি"],
  gradeRisky: ["Risky", "ঝুঁকিপূর্ণ"],
  gradeVeryRisky: ["Very risky", "খুব ঝুঁকিপূর্ণ"],

  marketLive: ["Open", "চালু"],
  marketPre: ["Opening soon", "শিগগির খুলবে"],
  marketClosed: ["Closed", "বন্ধ"],
  marketClosesIn: ["closes in {t}", "{t} পরে বন্ধ হবে"],
  marketOpensIn: ["opens in {t}", "{t} পরে খুলবে"],

  // Chapters
  chMoney: ["Your money", "আপনার টাকা"],
  chMarket: ["Market today", "আজকের বাজার"],
  dseTodayLink: ["DSE today", "আজকের DSE"],
  dseTodayLinkSub: ["Every share's price and today's news", "সব শেয়ারের দাম আর আজকের খবর"],
  marketAnalysisLink: ["Market analysis", "বাজার বিশ্লেষণ"],
  marketAnalysisLinkSub: ["The whole market in plain words", "সহজ ভাষায় পুরো বাজার"],
  chIdeas: ["Find stocks", "শেয়ার খুঁজুন"],
  chIdeasSub: [
    "Ready-made ways to find shares today. Pick one to see the names, then open the full list.",
    "আজ শেয়ার খোঁজার তৈরি কিছু উপায়। একটি বেছে নিলে নামগুলো দেখবেন, তারপর পুরো তালিকা খুলুন।",
  ],
  chDividends: ["Dividends coming", "আসন্ন ডিভিডেন্ড"],
  chLearn: ["Learn", "শিখুন"],

  // Your stocks
  yourStocksToday: ["Your stocks today", "আজ আপনার শেয়ার"],
  showAll: ["Show all {n}", "সব {n}টি দেখুন"],
  showFewer: ["Show fewer", "কম দেখুন"],
  stocksDay: [
    "{up} of these {n} shares rose today and {down} fell.",
    "আজ এই {n}টি শেয়ারের {up}টির দাম বেড়েছে, {down}টির কমেছে।",
  ],
  stocksDayLast: [
    "On the last trading day, {up} of these {n} shares rose and {down} fell.",
    "শেষ লেনদেনের দিনে এই {n}টি শেয়ারের {up}টির দাম বেড়েছে, {down}টির কমেছে।",
  ],
  secPortfolio: ["Your portfolio", "আপনার পোর্টফোলিও"],
  secWatchlist: ["Your watchlist", "আপনার ওয়াচলিস্ট"],
  nStocks: ["{n} stocks", "{n}টি শেয়ার"],
  oneStock: ["1 stock", "1টি শেয়ার"],
  alsoOwned: [
    "{n} that you also own are listed under Your portfolio",
    "আপনার কেনা {n}টি শেয়ার পোর্টফোলিও অংশে দেখানো হয়েছে",
  ],
  alsoOwnedOne: [
    "1 that you also own is listed under Your portfolio",
    "আপনার কেনা 1টি শেয়ার পোর্টফোলিও অংশে দেখানো হয়েছে",
  ],
  nothingHere: ["Nothing stands out here right now.", "এখানে এখন উল্লেখ করার মতো কিছু নেই।"],
  otherPoints: ["Other updates", "অন্যান্য আপডেট"],
  bestToday: ["Rose the most", "সবচেয়ে বেশি বেড়েছে"],
  worstToday: ["Fell the most", "সবচেয়ে বেশি কমেছে"],
  whatHappened: ["What happened", "যা ঘটেছে"],
  rightNow: ["Right now", "এই মুহূর্তে"],
  nowBuy: ["Buy signal", "কেনার সংকেত"],
  nowSell: ["Marked Sell", "বিক্রির সংকেত"],
  nowGood: ["Grade Good or better", "গ্রেড ভালো বা তার বেশি"],
  nowNone: ["None today", "আজ নেই"],
  nowWeak: ["{n} weak", "{n}টি দুর্বল"],
  nowOf: ["{a} of {b}", "{b}টির মধ্যে {a}টি"],
  upFlatDown: ["{up} up, {flat} unchanged, {down} down", "{up}টি বেড়েছে, {flat}টি অপরিবর্তিত, {down}টি কমেছে"],
  showMorePoints: ["Show {n} more", "আরও {n}টি দেখুন"],
  inPortfolio: ["In your portfolio", "আপনার পোর্টফোলিওতে"],
  onWatchlist: ["On your watchlist", "আপনার ওয়াচলিস্টে"],

  // Portfolio at a glance
  glanceTitle: ["Your portfolio at a glance", "আপনার পোর্টফোলিও এক নজরে"],
  goodLabel: ["Going well", "ভালো দিক"],
  badLabel: ["Needs attention", "মনোযোগ দরকার"],
  considerLabel: ["Worth considering", "ভেবে দেখার মতো"],
  cashComing: ["Dividends coming to you", "আপনার কাছে ডিভিডেন্ড আসছে"],
  cashComingSub: ["{n} dividends in the next month", "আগামী এক মাসে {n}টি ডিভিডেন্ড"],
  cashComingOne: ["1 dividend in the next month", "আগামী এক মাসে 1টি ডিভিডেন্ড"],
  noCashSoon: ["No dividend is due in the next month", "আগামী এক মাসে কোনো ডিভিডেন্ড নেই"],
  spread: ["Where your money sits", "আপনার টাকা কোথায় আছে"],
  fullAnalysis: ["Full analysis", "পূর্ণ বিশ্লেষণ"],
  others: ["Others", "অন্যান্য"],

  // The updates line under the greeting (= the key points in "Your stocks today")
  updatesOne: ["1 update on your stocks", "আপনার শেয়ারে 1টি আপডেট"],
  updatesMany: ["{n} updates on your stocks", "আপনার শেয়ারে {n}টি আপডেট"],
  allQuiet: ["Nothing new on your stocks", "আপনার শেয়ারে নতুন কিছু নেই"],

  // News
  resultsPromoTitle: ["Quarterly results, in plain words", "প্রান্তিকের ফল, সহজ ভাষায়"],
  allMarketNews: ["All market news", "বাজারের সব খবর"],
  marketNewsTitle: ["Today's market news", "আজকের বাজারের খবর"],
  allNews: ["All news", "সব খবর"],

  // Movers
  moversTitle: ["Biggest moves today", "আজকের বড় ওঠানামা"],
  gainers: ["Rose most", "বেশি বেড়েছে"],
  losers: ["Fell most", "বেশি কমেছে"],
  // Tab labels sit in a 3-column strip ~90px wide on a 360px phone — keep
  // them short enough not to wrap there.
  mostTraded: ["Most traded", "বেশি লেনদেন"],
  allMovers: ["Whole market", "পুরো বাজার"],
  traded: ["traded", "লেনদেন"],

  // Bengali snapshot
  snapshotTitle: ["Today's market at a glance", "আজকের বাজার এক নজরে"],
  readFull: ["Read the full report", "পুরোটা পড়ুন"],

  // Turning points
  turningTitle: ["Worth watching", "নজর রাখার মতো"],
  nearHigh: ["Close to this year's high", "এ বছরের সর্বোচ্চের কাছে"],
  nearLow: ["Close to this year's low", "এ বছরের সর্বনিম্নের কাছে"],
  unusual: ["Unusually busy trading", "অস্বাভাবিক বেশি লেনদেন"],
  fromHigh: ["{n}% below its high", "সর্বোচ্চ দামের {n}% নিচে"],
  aboveLow: ["{n}% above its low", "সর্বনিম্ন দামের {n}% ওপরে"],
  volumeX: ["{n} times its usual trading", "স্বাভাবিকের {n} গুণ লেনদেন"],
  whyItMatters: ["Why this matters", "কেন গুরুত্বপূর্ণ"],

  // Buys
  buysTitle: ["Buy signals today", "আজকের কেনার সংকেত"],
  buysCount: ["{n} companies have a Buy signal today.", "আজ {n}টি কোম্পানিতে কেনার সংকেত আছে।"],
  buysOne: ["1 company has a Buy signal today.", "আজ 1টি কোম্পানিতে কেনার সংকেত আছে।"],
  buysNone: ["No company has a clear Buy signal today.", "আজ কোনো কোম্পানিতে স্পষ্ট কেনার সংকেত নেই।"],
  allBuys: ["All buy signals", "সব কেনার সংকেত"],
  strongTag: ["Strong", "জোরালো"],
  buysNote: [
    "Strong companies at a fair price. This is a starting point, not advice.",
    "ন্যায্য দামে শক্তিশালী কোম্পানি। এটি শুরু করার জায়গা, পরামর্শ নয়।",
  ],

  // Top ranked
  rankedTitle: ["Highest-scoring companies", "সর্বোচ্চ স্কোরের কোম্পানি"],
  fullRanking: ["Full ranking", "পুরো র‍্যাঙ্কিং"],
  ofN: ["of {n} companies scored", "{n}টি কোম্পানির মধ্যে"],
  outOf100: ["/100", "/100"],

  // Lists rail
  // Research lists (homepage rail — full for Premium, a promotion card for everyone else)
  researchTitle: ["Research lists", "গবেষণা তালিকা"],
  researchSub: [
    "Six ideas, each tested on every company with the same plain checks.",
    "ছয়টি ধারণা, প্রতিটি কোম্পানিকে একই সহজ যাচাইয়ে পরীক্ষা করা।",
  ],
  // Screener card
  screenerTitle: ["Find stocks your way", "নিজের মতো শেয়ার খুঁজুন"],
  screenerSub: [
    "Tap a quick pick to see what it looks for and which shares pass today.",
    "একটি দ্রুত বাছাই চাপুন। এটি কী দেখে আর আজ কোন শেয়ার পাস করছে, তা দেখবেন।",
  ],
  screenerAsks: ["What this pick looks for", "এই বাছাই যা দেখে"],
  screenerPassToday: ["{n} shares pass today", "আজ {n}টি শেয়ার পাস করেছে"],
  screenerHidden: ["Among the other {n}", "বাকি {n}টির মধ্যে"],
  screenerBuys: ["{n} have a Buy signal", "{n}টিতে কেনার সংকেত"],
  screenerMarked: ["{n} marked \"{tag}\"", "{n}টি \"{tag}\""],
  screenerFollow: ["{n} you follow", "{n}টি আপনি অনুসরণ করেন"],
  screenerOpen: ["Screener", "স্ক্রিনার"],
  screenerSeeAll: ["See all {n} in the screener", "স্ক্রিনারে সব {n}টি দেখুন"],
  screenerChange: ["Open in the screener", "স্ক্রিনারে খুলুন"],
  screenerNone: ["None pass today. Try another pick.", "আজ কোনোটি পাস করেনি। অন্য বাছাই দেখুন।"],
  screenerYours: ["Your saved screens", "আপনার সেভ করা স্ক্রিন"],
  screenerNew: ["{n} new", "{n}টি নতুন"],
  screenerPass: ["{n} pass", "{n}টি পাস"],
  allLists: ["All lists", "সব তালিকা"],
  researchSeeAll: ["See all {n}", "সব {n}টি দেখুন"],
  topN: ["Top {n}", "সেরা {n}টি"],
  researchPromoHead: ["Six lists that do the research for you", "আপনার হয়ে গবেষণা করা ছয়টি তালিকা"],
  researchPromoSub: [
    "Every company goes through the same plain checks. Premium shows each share that passes, with its figures and its main risk.",
    "প্রতিটি কোম্পানি একই সহজ যাচাইয়ের মধ্য দিয়ে যায়। প্রিমিয়ামে দেখবেন কোন শেয়ার পাস করেছে, তার হিসাব আর প্রধান ঝুঁকিসহ।",
  ],
  researchPass: ["{n} shares pass today", "আজ {n}টি শেয়ার পাস করেছে"],
  researchCtaFree: ["See Premium plans", "প্রিমিয়াম প্ল্যান দেখুন"],
  researchCtaGuest: ["Create a free account, then see Premium", "ফ্রি অ্যাকাউন্ট খুলে প্রিমিয়াম দেখুন"],

  // Trending / popular / tips
  trendingTitle: ["Trending this week", "এ সপ্তাহের আলোচিত শেয়ার"],
  sevenDay: ["7 days", "7 দিন"],
  allTrending: ["All trending", "সব আলোচিত"],
  upLastWeek: ["Up {n}% over the past week", "গত এক সপ্তাহে {n}% বেড়েছে"],
  downLastWeek: ["Down {n}% over the past week", "গত এক সপ্তাহে {n}% কমেছে"],
  popularTitle: ["What other readers are looking at", "অন্য পাঠকেরা যা দেখছেন"],
  views: ["{n} views", "{n} বার দেখা হয়েছে"],
  seeAll: ["See all", "সব দেখুন"],
  tipsTitle: ["Today's tips", "আজকের টিপস"],
  tipsSub: ["One useful fact about each", "প্রতিটি নিয়ে একটি কাজের তথ্য"],
  trendingSub: ["Moved the most over the past 7 days", "গত 7 দিনে সবচেয়ে বেশি ওঠানামা করেছে"],
  popularSub: ["Opened most by readers this week", "এ সপ্তাহে পাঠকেরা সবচেয়ে বেশি দেখেছেন"],
  discoverTitle: ["More ways to find stocks", "শেয়ার খোঁজার আরও উপায়"],
  discoverSub: [
    "Short lists from today's market, three names each.",
    "আজকের বাজার থেকে ছোট তালিকা, প্রতিটিতে তিনটি নাম।",
  ],

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
  heroVsDsex: ["Against DSEX today", "আজ DSEX-এর তুলনায়"],
  allTips: ["All tips", "সব টিপস"],

  // Plain "kind" words (DiscoverRail rows)
  kindYouFollow: ["You follow this", "আপনি এটি অনুসরণ করেন"],
  kindMatched: ["Fits what you like", "আপনার পছন্দের সঙ্গে মেলে"],
  kindGoodPrice: ["Good price now", "এখন দাম ভালো"],
  kindStrongBuy: ["Very good price now", "এখন দাম খুবই ভালো"],
  kindPaysCash: ["Pays a cash dividend", "নগদ ডিভিডেন্ড দেয়"],
  kindGrowing: ["Profit growing", "মুনাফা বাড়ছে"],
  kindSteady: ["Steady profit", "নিয়মিত মুনাফা"],
  kindCheap: ["Cheaper than similar companies", "একই ধরনের কোম্পানির চেয়ে দাম কম"],
  kindNearLow: ["Close to this year's low", "এ বছরের সর্বনিম্নের কাছে"],
  kindStrong: ["Strong company", "শক্তিশালী কোম্পানি"],
  kindTip: ["Worth knowing", "জানার মতো"],
  newTag: ["New", "নতুন"],

  // Dividend board
  divBoardTitle: ["Next 2 weeks", "আগামী 2 সপ্তাহ"],
  perShare: ["a share", "শেয়ারপ্রতি"],
  yieldWord: ["yield", "ইল্ড"],
  buyBy: ["Buy by {date}", "{date}-এর মধ্যে কিনতে হবে"],
  recordOn: ["Record date: {date}", "রেকর্ড ডেট: {date}"],
  daysLeft: ["{n} days left", "{n} দিন বাকি"],
  oneDayLeft: ["1 day left", "1 দিন বাকি"],
  todayLast: ["Today", "আজ"],
  fullCalendar: ["Full calendar", "পুরো ক্যালেন্ডার"],
  justDeclared: ["Just declared", "সদ্য ঘোষিত"],
  divPromoMore: ["{n} more record dates in the next 2 weeks", "আগামী 2 সপ্তাহে আরও {n}টি রেকর্ড ডেট"],
  divPromoMine: ["{n} of your stocks are on the list", "এর মধ্যে আপনার {n}টি শেয়ার আছে"],
  divPromoDeclared: ["{n} new dividend declarations", "{n}টি নতুন ডিভিডেন্ড ঘোষণা"],
  bonus: ["{n}% bonus shares", "{n}% বোনাস শেয়ার"],
  cashPct: ["{n}% cash", "{n}% নগদ"],
  noDividendSoon: ["No record dates in the next two weeks.", "আগামী দুই সপ্তাহে কোনো রেকর্ড ডেট নেই।"],
  declaredOn: ["Declared {date}", "ঘোষণা: {date}"],

  // Market today
  marketToday: ["Market today", "আজকের বাজার"],
  fullPicture: ["Full picture", "পুরো ছবি"],
  todaysMarketBn: ["Today's market in Bangla", "আজকের শেয়ার বাজার"],
  advancing: ["{n} rose", "{n}টির দাম বেড়েছে"],
  unchanged: ["{n} unchanged", "{n}টি অপরিবর্তিত"],
  declining: ["{n} fell", "{n}টির দাম কমেছে"],
  cheapNormal: ["Normal", "স্বাভাবিক"],
  cheapCheap: ["Low", "কম"],
  cheapExpensive: ["High", "বেশি"],
  sharePricesVsUsual: ["prices compared with usual", "স্বাভাবিকের তুলনায় দাম"],
  lookHealthy: ["of {total} look healthy", "{total}টির মধ্যে ভালো অবস্থায়"],
  companiesHealthy: ["companies in good health", "কোম্পানি ভালো অবস্থায়"],
  dividendsComingUp: ["dividends coming up", "আসন্ন ডিভিডেন্ড"],
  turnoverVsLastDay: ["trading compared with the last day", "আগের দিনের তুলনায় লেনদেন"],
  sinceYesterday: ["Since yesterday", "গতকাল থেকে"],
  moodUp: ["The market is rising today.", "আজ বাজার বাড়ছে।"],
  moodDown: ["The market is falling today.", "আজ বাজার কমছে।"],
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
  learnSub: ["Two short reads, new each day.", "দুটি ছোট লেখা, প্রতিদিন নতুন।"],
  guideBn: ["In Bengali", "বাংলায়"],
  guideEn: ["In English", "ইংরেজিতে"],
  allGuides: ["All guides", "সব গাইড"],

  // Misc
  lookUpAnyStock: ["Look up any share", "যেকোনো শেয়ার খুঁজুন"],
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

/**
 * Legacy: containers used to opt Bengali into its font here. The global font
 * stack and `<T>` now handle it, so this no longer sets anything.
 */
export function bnAttrs(_lang: Lang): { lang?: string; className: string } {
  return { className: "" };
}
