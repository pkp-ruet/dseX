/**
 * Every word on /premium, in English and everyday Bengali (2026-10-25: the
 * page follows the app-wide language switch — most readers who pay read in
 * Bengali). A plain module so the server page can build its FAQ JSON-LD from
 * the same text the client body shows. Western digits in Bengali copy (the
 * rule in components/i18n/Bn.tsx).
 */
import { LOWEST_PRICE, PAID_PLANS } from "@/lib/premium-plans";

export type Bi = { en: string; bn: string };

const YEARLY = PAID_PLANS.find((p) => p.key === "yearly");
export const PER_MONTH = YEARLY ? Math.round(YEARLY.amount / 12) : LOWEST_PRICE;

export const HERO = {
  eyebrow: { en: "Premium", bn: "প্রিমিয়াম" },
  title: { en: "See the reasons behind every number", bn: "প্রতিটি সংখ্যার পেছনের কারণ দেখুন" },
  lead: {
    en: "Prices and scores stay free for everyone. Premium tells you why — on every stock and on your own portfolio.",
    bn: "দাম আর স্কোর সবার জন্য ফ্রি থাকবে। প্রিমিয়াম বলে দেয় কেন — প্রতিটি শেয়ারে আর আপনার নিজের পোর্টফোলিওতে।",
  },
  from: { en: "From", bn: "মাত্র" },
  perMonth: { en: "a month on the yearly plan", bn: "মাসে, বছরের প্ল্যানে" },
  orMonthly: { en: `or ৳${LOWEST_PRICE} for a single month`, bn: `অথবা এক মাসের জন্য ৳${LOWEST_PRICE}` },
} as const;

export const PROMISES: Bi[] = [
  { en: "Pay by bKash or Nagad", bn: "bKash বা Nagad দিয়ে পেমেন্ট" },
  { en: "No auto-renewal", bn: "নিজে থেকে টাকা কাটে না" },
  { en: "7-day full refund", bn: "7 দিনের মধ্যে পুরো টাকা ফেরত" },
];

// The four things Premium does, in plain words. Every point is a live feature.
export const BENEFITS: { key: "why" | "portfolio" | "research" | "limits"; title: Bi; points: Bi[] }[] = [
  {
    key: "why",
    title: { en: "Know why, not just what", bn: "শুধু স্কোর নয়, তার কারণও জানুন" },
    points: [
      { en: "A fair price for every stock", bn: "প্রতিটি শেয়ারের ন্যায্য দাম" },
      { en: "All five health checks and warnings", bn: "পাঁচটি স্বাস্থ্য পরীক্ষা আর সব সতর্কতা" },
      { en: "The whole in-depth report", bn: "পুরো গভীর বিশ্লেষণ রিপোর্ট" },
    ],
  },
  {
    key: "portfolio",
    title: { en: "Your portfolio, watched daily", bn: "আপনার পোর্টফোলিও, প্রতিদিন পাহারায়" },
    points: [
      { en: "An alert when your stock needs attention", bn: "শেয়ারে নজর দরকার হলে সঙ্গে সঙ্গে জানাবে" },
      { en: "New results and grade changes, explained", bn: "নতুন ফল আর গ্রেড বদল, সহজ ভাষায়" },
      { en: "Full history and a yearly statement", bn: "পুরো ইতিহাস আর বছরের হিসাব" },
    ],
  },
  {
    key: "research",
    title: { en: "Research, done for you", bn: "গবেষণা আমরা করে দিই" },
    points: [
      { en: "Six research lists in full", bn: "ছয়টি গবেষণা তালিকা পুরোটা" },
      { en: "The full stock screener, your screens checked every day", bn: "পুরো স্টক স্ক্রিনার, আপনার স্ক্রিন প্রতিদিন যাচাই" },
      { en: "The complete dividend calendar", bn: "পুরো ডিভিডেন্ড ক্যালেন্ডার" },
    ],
  },
  {
    key: "limits",
    title: { en: "No limits", bn: "কোনো সীমা নেই" },
    points: [
      { en: "Follow any number of stocks", bn: "যত খুশি শেয়ার ফলো করুন" },
      { en: "Set any number of price alerts", bn: "যত খুশি প্রাইস অ্যালার্ট" },
      { en: "Ask TopStock AI anything, any time", bn: "TopStock AI-কে যখন খুশি যা খুশি জিজ্ঞেস করুন" },
    ],
  },
];

export const STEPS: { title: Bi; sub: Bi }[] = [
  { title: { en: "Pick a plan", bn: "প্ল্যান বেছে নিন" }, sub: { en: "1 month, 6 months or 1 year", bn: "1 মাস, 6 মাস বা 1 বছর" } },
  { title: { en: "Send Money", bn: "Send Money করুন" }, sub: { en: "By bKash or Nagad", bn: "bKash বা Nagad দিয়ে" } },
  { title: { en: "Type your number", bn: "নম্বর লিখুন" }, sub: { en: "Premium starts at once", bn: "প্রিমিয়াম সঙ্গে সঙ্গে চালু" } },
];

export const SECTIONS = {
  what: { en: "What Premium does for you", bn: "প্রিমিয়াম আপনার জন্য যা করে" },
  stayFree: {
    en: "Prices, charts, news, scores and the Buy/Sell word stay free for everyone.",
    bn: "দাম, চার্ট, খবর, স্কোর আর কেনা/বেচার সংকেত সবার জন্য ফ্রি থাকবে।",
  },
  how: { en: "Start in three steps", bn: "তিন ধাপে শুরু করুন" },
  plan: { en: "Choose your plan", bn: "আপনার প্ল্যান বেছে নিন" },
  planLead: { en: "The longer the plan, the less you pay a month.", bn: "প্ল্যান যত লম্বা, মাসে খরচ তত কম।" },
  refund: { en: "Refund policy", bn: "রিফান্ড নীতি" },
  help: { en: "Problem with a payment?", bn: "পেমেন্টে কোনো সমস্যা?" },
  helpLead: {
    en: "Sent money but Premium didn't start, paid the wrong amount, or something else? Tell us here or email us.",
    bn: "টাকা পাঠিয়েছেন কিন্তু প্রিমিয়াম চালু হয়নি, ভুল পরিমাণ পাঠিয়েছেন, বা অন্য কিছু? এখানে লিখুন বা ইমেইল করুন।",
  },
  compare: { en: "Free and Premium, side by side", bn: "ফ্রি আর প্রিমিয়াম পাশাপাশি" },
  free: { en: "Free", bn: "ফ্রি" },
  premium: { en: "Premium", bn: "প্রিমিয়াম" },
  faq: { en: "Questions", bn: "সাধারণ প্রশ্ন" },
  closing: { en: "See the reasons on every stock", bn: "প্রতিটি শেয়ারের কারণ দেখুন" },
  closingLead: {
    en: "Pick a plan, pay by bKash or Nagad, and Premium starts straight away.",
    bn: "প্ল্যান বেছে নিন, bKash বা Nagad দিয়ে পেমেন্ট করুন — প্রিমিয়াম সঙ্গে সঙ্গে চালু।",
  },
  feature: { en: "What you get", bn: "যা পাবেন" },
  howWeScore: {
    en: ["Want to see how the score works first? Read ", "how we score", "."],
    bn: ["আগে দেখতে চান স্কোর কীভাবে হয়? পড়ুন ", "আমরা কীভাবে স্কোর করি", "।"],
  },
} as const;

// Line-by-line, for readers who want every detail. Only features that are live.
export const ROWS: { what: Bi; free: Bi; premium: Bi }[] = [
  {
    what: { en: "Stock page analysis", bn: "শেয়ারের পাতার বিশ্লেষণ" },
    free: {
      en: "Prices, charts, financials, dividends, owners, news + the score, grade and Buy/Sell word",
      bn: "দাম, চার্ট, আর্থিক হিসাব, লভ্যাংশ, মালিকানা, খবর + স্কোর, গ্রেড আর কেনা/বেচার সংকেত",
    },
    premium: {
      en: "Also the reasons: fair-value estimate, all five health checks, every good sign and watch-out, price verdict, sector standing",
      bn: "সাথে কারণগুলোও: ন্যায্য দাম, পাঁচটি স্বাস্থ্য পরীক্ষা, সব ভালো লক্ষণ ও সতর্কতা, দাম নিয়ে রায়, খাতে অবস্থান",
    },
  },
  {
    what: { en: "In-depth reports", bn: "গভীর বিশ্লেষণ রিপোর্ট" },
    free: { en: "Headline, bottom line and the first section", bn: "শিরোনাম, মূল কথা আর প্রথম অংশ" },
    premium: { en: "The whole report", bn: "পুরো রিপোর্ট" },
  },
  {
    what: { en: "Results day, explained", bn: "ত্রৈমাসিক ফল, সহজ ভাষায়" },
    free: {
      en: "The headline and the profit figures of each stock's latest quarterly report, and the newest 5 reports on the results page",
      bn: "প্রতিটি শেয়ারের সর্বশেষ ত্রৈমাসিক ফলের শিরোনাম ও মুনাফা, আর ফলের পাতায় নতুন 5টি রিপোর্ট",
    },
    premium: {
      en: "Every company's latest results in one list, and on each stock the latest quarter alone, cash from the business, what the price costs on the last 12 months' profit, how our score moved, and what it means — plus a phone alert the day results come out for a stock you own or follow",
      bn: "সব কোম্পানির সর্বশেষ ফল এক তালিকায়, আর প্রতিটি শেয়ারে শুধু শেষ প্রান্তিক, ব্যবসা থেকে নগদ, গত 12 মাসের মুনাফায় দাম কত, স্কোর কতটা বদলাল আর এর মানে কী — সাথে আপনার শেয়ারের ফল বের হলে সেদিনই ফোনে নোটিফিকেশন",
    },
  },
  {
    what: { en: "Score history", bn: "স্কোরের ইতিহাস" },
    free: { en: "Today's score and how many times the grade changed", bn: "আজকের স্কোর আর গ্রেড কতবার বদলেছে" },
    premium: {
      en: "The score on every trading day, each grade change with the reason behind it, and a phone alert when the grade of a stock you own or follow changes",
      bn: "প্রতিটি কার্যদিবসের স্কোর, প্রতিটি গ্রেড বদল ও তার কারণ, আর আপনার শেয়ারের গ্রেড বদলালে ফোনে নোটিফিকেশন",
    },
  },
  {
    what: { en: "Portfolio check", bn: "পোর্টফোলিও পরীক্ষা" },
    free: {
      en: "Grade, its three scores, the first point of what's working, and your spread by company and sector",
      bn: "গ্রেড, তার তিনটি স্কোর, কী ভালো চলছে তার প্রথম কথা, আর কোম্পানি ও খাত ধরে আপনার বিনিয়োগের ভাগ",
    },
    premium: {
      en: "Every point, including what needs your attention and what to consider, plus what to do with each stock, what to buy next, each holding's full read, a risk check, the price you paid, cash income and you vs the market",
      bn: "সব কথা — কোথায় নজর দরকার আর কী ভাবা উচিত সহ — সাথে প্রতিটি শেয়ার নিয়ে কী করবেন, এরপর কী কিনবেন, প্রতিটি শেয়ারের পুরো বিশ্লেষণ, ঝুঁকি যাচাই, কেনা দাম, নগদ আয় আর বাজারের সাথে আপনার তুলনা",
    },
  },
  {
    what: { en: "Portfolio watcher", bn: "পোর্টফোলিও পাহারা" },
    free: {
      en: "How many things we spotted on your stocks, and what kind — plus the first one each week in full, with a phone note",
      bn: "আপনার শেয়ারে কতগুলো জিনিস ধরা পড়েছে আর কী ধরনের — সাথে প্রতি সপ্তাহের প্রথমটি পুরোটা, ফোনে নোটিফিকেশনসহ",
    },
    premium: {
      en: "What every one was, plus a phone alert the same day: record date coming, new results, category change, a big fall, a yearly low",
      bn: "সেগুলো কী, আর প্রতিটির জন্য ফোনে নোটিফিকেশন: রেকর্ড ডেট আসছে, নতুন ফল, ক্যাটাগরি বদল, বড় পতন, বছরের সর্বনিম্ন দাম",
    },
  },
  {
    what: { en: "Portfolio history", bn: "পোর্টফোলিওর ইতিহাস" },
    free: {
      en: "Your value over time next to DSEX, and money made from sales and dividends — before and after fees and tax",
      bn: "সময়ের সাথে আপনার মূল্য, DSEX-এর পাশে, আর বিক্রি ও লভ্যাংশ থেকে আয় — ফি ও কর বাদের আগে ও পরে",
    },
    premium: { en: "The same, plus a yearly statement (below)", bn: "একই, সাথে বছরের হিসাব (নিচে)" },
  },
  {
    what: { en: "What-if check", bn: "যদি এমন করি" },
    free: { en: "—", bn: "—" },
    premium: {
      en: "Try a sale or a buy and see your portfolio grade before you act",
      bn: "কেনা বা বেচার আগে দেখে নিন পোর্টফোলিওর গ্রেড কী হবে",
    },
  },
  {
    what: { en: "Yearly statement", bn: "বার্ষিক হিসাব" },
    free: { en: "—", bn: "—" },
    premium: {
      en: "Every buy, sale, cash dividend and bonus share for the year — print it or download it",
      bn: "বছরের সব কেনা, বেচা, নগদ লভ্যাংশ আর বোনাস শেয়ার — প্রিন্ট বা ডাউনলোড করুন",
    },
  },
  {
    what: { en: "Portfolios", bn: "পোর্টফোলিও সংখ্যা" },
    free: { en: "One", bn: "একটি" },
    premium: {
      en: "Up to six — keep a parent's or spouse's BO account apart from yours",
      bn: "ছয়টি পর্যন্ত — মা-বাবা বা স্বামী/স্ত্রীর BO অ্যাকাউন্ট আলাদা রাখুন",
    },
  },
  {
    what: { en: "Research lists", bn: "গবেষণা তালিকা" },
    free: {
      en: "What each of the six lists looks for, and how many companies pass its checks",
      bn: "ছয়টি তালিকা কী খোঁজে, আর কতগুলো কোম্পানি তার পরীক্ষায় পাস করে",
    },
    premium: {
      en: "Every stock on all six lists: a research card with its fair-value range and main risk, all of them side by side, and who joined or left this month",
      bn: "ছয়টি তালিকার প্রতিটি শেয়ার: ন্যায্য দামের সীমা আর মূল ঝুঁকিসহ গবেষণা কার্ড, সব পাশাপাশি, আর এই মাসে কে এল বা গেল",
    },
  },
  {
    what: { en: "Stock screener", bn: "স্টক স্ক্রিনার" },
    free: {
      en: "Every check and goal, how many companies pass, and the first 3 stocks",
      bn: "সব শর্ত আর লক্ষ্য, কতগুলো কোম্পানি পাস করে, আর প্রথম 3টি শেয়ার",
    },
    premium: {
      en: "Every stock that passes, the power checks (a Buy today, a better quarter, owners buying …), and up to 5 saved screens checked every trading day — with a phone alert when a new stock passes",
      bn: "পাস করা প্রতিটি শেয়ার, পাওয়ার শর্ত (আজ 'কিনুন', ভালো প্রান্তিক, উদ্যোক্তারা কিনছেন …), আর 5টি পর্যন্ত স্ক্রিন সেভ করে প্রতিদিন যাচাই — নতুন শেয়ার এলে ফোনে নোটিফিকেশন",
    },
  },
  {
    what: { en: "Dividend calendar", bn: "ডিভিডেন্ড ক্যালেন্ডার" },
    free: {
      en: "A few rows of each list: record dates, AGMs, biggest cash dividends, just declared",
      bn: "প্রতিটি তালিকার কয়েকটি সারি: রেকর্ড ডেট, AGM, সবচেয়ে বড় নগদ লভ্যাংশ, সদ্য ঘোষিত",
    },
    premium: { en: "Every list in full", bn: "সব তালিকা পুরোটা" },
  },
  {
    what: { en: "Watchlist", bn: "ওয়াচলিস্ট" },
    free: {
      en: "10 stocks, and how many trade under fair value, have a record date soon or carry a risk flag",
      bn: "10টি শেয়ার, আর কতগুলো ন্যায্য দামের নিচে, কতগুলোর রেকর্ড ডেট কাছে বা ঝুঁকি আছে",
    },
    premium: {
      en: "No limit, and a board with every stock's price against its fair value, what stops a Buy, its next record date or AGM, and its risk flags",
      bn: "কোনো সীমা নেই, আর প্রতিটি শেয়ারের দাম বনাম ন্যায্য দাম, কেনার পথে বাধা, পরের রেকর্ড ডেট বা AGM আর ঝুঁকি এক বোর্ডে",
    },
  },
  {
    what: { en: "Price alerts", bn: "প্রাইস অ্যালার্ট" },
    free: { en: "3 at a time", bn: "একসাথে 3টি" },
    premium: { en: "No limit", bn: "কোনো সীমা নেই" },
  },
  {
    what: { en: "TopStock AI", bn: "TopStock AI" },
    free: { en: "10 questions a day", bn: "দিনে 10টি প্রশ্ন" },
    premium: { en: "No limit", bn: "কোনো সীমা নেই" },
  },
];

export const FAQS: { q: Bi; a: Bi }[] = [
  {
    q: { en: "How much does Premium cost?", bn: "প্রিমিয়ামের দাম কত?" },
    a: {
      en: "৳199 for 1 month. For a limited time, 6 months are ৳999 instead of ৳1,149, and a year is ৳1,899 instead of ৳2,199 (about ৳158 a month).",
      bn: "1 মাস ৳199। সীমিত সময়ের অফারে 6 মাস ৳1,149-এর বদলে ৳999, আর 1 বছর ৳2,199-এর বদলে ৳1,899 (মাসে প্রায় ৳158)।",
    },
  },
  {
    q: { en: "How do I pay?", bn: "কীভাবে পেমেন্ট করব?" },
    a: {
      en: "With bKash or Nagad. Pick a plan, use Send Money to send the amount to the number shown on this page, then type the number you sent it from and tap the button. Premium starts straight away.",
      bn: "bKash বা Nagad দিয়ে। প্ল্যান বেছে নিন, এই পাতার নম্বরে Send Money করে টাকা পাঠান, তারপর যে নম্বর থেকে পাঠিয়েছেন সেটি লিখে বোতাম চাপুন। প্রিমিয়াম সঙ্গে সঙ্গে চালু হবে।",
    },
  },
  {
    q: { en: "What if you can't find my payment?", bn: "আমার পেমেন্ট খুঁজে না পেলে?" },
    a: {
      en: "We check every payment against our bKash and Nagad statements. If no money came from the number you typed, Premium is switched off and the days are taken back. Typed the wrong number by mistake? Contact us and we'll sort it out.",
      bn: "প্রতিটি পেমেন্ট আমরা bKash ও Nagad-এর হিসাবের সাথে মিলিয়ে দেখি। আপনার লেখা নম্বর থেকে টাকা না এলে প্রিমিয়াম বন্ধ হবে। ভুল নম্বর লিখে ফেললে আমাদের সাথে যোগাযোগ করুন।",
    },
  },
  {
    q: { en: "Does it renew by itself?", bn: "নিজে থেকে কি নবায়ন হয়?" },
    a: {
      en: "No. Nothing is taken from your account automatically. A few days before your plan ends we remind you — with what Premium caught on your stocks that month — and you pay again only if you want to keep it.",
      bn: "না। আপনার অ্যাকাউন্ট থেকে নিজে থেকে কোনো টাকা কাটা হয় না। প্ল্যান শেষ হওয়ার কয়েক দিন আগে মনে করিয়ে দেব — সেই মাসে প্রিমিয়াম আপনার শেয়ারে কী কী ধরেছে তা সহ; চাইলে আবার পেমেন্ট করবেন।",
    },
  },
  {
    q: { en: "Can I see it before I pay?", bn: "পেমেন্টের আগে কি দেখে নিতে পারি?" },
    a: {
      en: "Yes. Every day one familiar company's stock page is fully open for everyone — fair value, every check, the reasons. Look for \"Today's free full report\" on the homepage.",
      bn: "হ্যাঁ। প্রতিদিন একটি পরিচিত কোম্পানির শেয়ারের পাতা সবার জন্য পুরো খোলা থাকে — ন্যায্য দাম, সব পরীক্ষা, সব কারণ। হোমপেজে \"আজকের ফ্রি পূর্ণ রিপোর্ট\" দেখুন।",
    },
  },
  {
    q: { en: "Can I get my money back?", bn: "টাকা কি ফেরত পাব?" },
    a: {
      en: "Yes — ask within 7 days of paying and we send the full amount back to the number you paid from. See the refund policy for the details.",
      bn: "হ্যাঁ — পেমেন্টের 7 দিনের মধ্যে জানালে পুরো টাকা যে নম্বর থেকে দিয়েছেন সেখানে ফেরত দেব। বিস্তারিত রিফান্ড নীতিতে।",
    },
  },
  {
    q: { en: "What happens when my plan ends?", bn: "মেয়াদ শেষ হলে কী হবে?" },
    a: {
      en: "Your account goes back to free on its own. Stocks you already follow and alerts you already set stay — you just can't add more than the free limits.",
      bn: "মেয়াদ শেষে অ্যাকাউন্ট নিজে থেকেই ফ্রি হয়ে যাবে। আগের ওয়াচলিস্ট আর অ্যালার্ট থেকে যাবে, শুধু ফ্রি সীমার বেশি যোগ করা যাবে না।",
    },
  },
  {
    q: { en: "What stays free?", bn: "কী কী ফ্রি থাকবে?" },
    a: {
      en: "Prices, charts, financials, dividends, news, the score and grade of every stock, the Buy/Sell word, rankings and the market pages. Premium adds the reasons and the tools on top.",
      bn: "দাম, চার্ট, আর্থিক হিসাব, লভ্যাংশ, খবর, প্রতিটি শেয়ারের স্কোর ও গ্রেড, কেনা/বেচার সংকেত, র‍্যাংকিং আর বাজারের পাতা — সব ফ্রি। প্রিমিয়াম তার উপরে কারণ আর টুল যোগ করে।",
    },
  },
  {
    q: { en: "Is this investment advice?", bn: "এটা কি বিনিয়োগ পরামর্শ?" },
    a: {
      en: "No. Everything on TopStockBD is educational information built from company numbers. Always check a stock yourself before you buy or sell.",
      bn: "না। TopStockBD-র সবকিছু কোম্পানির হিসাব থেকে তৈরি শিক্ষামূলক তথ্য। কেনা-বেচার আগে নিজে যাচাই করুন।",
    },
  },
];
