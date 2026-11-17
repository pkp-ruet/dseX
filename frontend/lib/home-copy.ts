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


  // Your stocks (the story viewer reads upFlatDown; the row reads allQuiet)
  showAll: ["Show all {n}", "সব {n}টি দেখুন"],
  showFewer: ["Show fewer", "কম দেখুন"],
  upFlatDown: ["{up} up, {flat} unchanged, {down} down", "{up}টি বেড়েছে, {flat}টি অপরিবর্তিত, {down}টি কমেছে"],
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

  // The stories row: its label (a reader with no stocks gets market stories),
  // the hint beside it, and the line on a day with nothing new on their stocks
  storiesTitle: ["Your shares today", "আজ আপনার শেয়ার"],
  storiesMarket: ["Today's market stories", "আজকের বাজারের স্টোরি"],
  storiesHint: ["Tap to watch", "দেখতে ট্যাপ করুন"],
  allQuiet: ["Nothing new on your stocks", "আপনার শেয়ারে নতুন কিছু নেই"],

  // News
  resultsLinkWeek: ["Results this week", "এই সপ্তাহের আর্থিক ফল"],
  resultsLink: ["Quarterly results", "প্রান্তিকের ফল"],
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
  divBoardTitle: ["Record dates, next 2 weeks", "আগামী 2 সপ্তাহের রেকর্ড ডেট"],
  divLead: ["{n} companies pay a dividend with a record date in the next 2 weeks.", "আগামী 2 সপ্তাহে রেকর্ড ডেট, ডিভিডেন্ড দিচ্ছে {n}টি কোম্পানি।"],
  divLeadOne: ["1 company pays a dividend with a record date in the next 2 weeks.", "আগামী 2 সপ্তাহে রেকর্ড ডেট, ডিভিডেন্ড দিচ্ছে 1টি কোম্পানি।"],
  divLeadMine: ["{n} of them are your stocks.", "এর {n}টি আপনার শেয়ার।"],
  divLeadMineOne: ["1 of them is your stock.", "এর 1টি আপনার শেয়ার।"],
  fullCalendar: ["Full calendar", "পুরো ক্যালেন্ডার"],
  justDeclared: ["Just declared", "সদ্য ঘোষিত"],
  noDividendSoon: ["No record dates in the next two weeks.", "আগামী দুই সপ্তাহে কোনো রেকর্ড ডেট নেই।"],

  // Market today
  marketToday: ["Market today", "আজকের বাজার"],
  marketMood: ["Market mood: {mood}", "বাজারের মেজাজ: {mood}"],
  valueTraded: ["Value traded", "লেনদেনের পরিমাণ"],
  sharesTraded: ["Shares traded", "শেয়ার হাতবদল"],
  vsLastDay: ["{pct} vs the last day", "আগের দিনের চেয়ে {pct}"],
  seeMarketToday: ["See the full market today", "আজকের পুরো বাজার দেখুন"],
  moodUp: ["The market is rising today.", "আজ বাজার বাড়ছে।"],
  moodDown: ["The market is falling today.", "আজ বাজার কমছে।"],
  moodSteady: ["The market is steady today.", "আজ বাজার স্থির।"],
  moodWeak: ["The market is weak today.", "আজ বাজার দুর্বল।"],
  moodFallback: ["See how the whole market is doing today.", "আজ পুরো বাজারের অবস্থা দেখুন।"],

  // The recommendation engine's rows (RecoRow: the portfolio's "What to buy next").
  forYouNew: ["New", "নতুন"],
  forYouWatch: ["Watch:", "খেয়াল রাখুন:"],

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
