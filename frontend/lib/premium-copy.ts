/**
 * Every word on /premium, in English and everyday Bengali. A plain module so
 * the server page can build its FAQ JSON-LD from the same English the body
 * shows. One language per page (2026-10-28): the body renders each pair with
 * `<T>`, so the reader sees only their language. Western digits in Bengali.
 */
import { LOWEST_PRICE, PAID_PLANS } from "@/lib/premium-plans";

export type Bi = { en: string; bn: string };

const YEARLY = PAID_PLANS.find((p) => p.key === "yearly");
export const PER_MONTH = YEARLY ? Math.round(YEARLY.amount / 12) : LOWEST_PRICE;

export const HERO = {
  eyebrow: { en: "Premium", bn: "প্রিমিয়াম" },
  title: { en: "See the reasons behind every number", bn: "প্রতিটি সংখ্যার পেছনের কারণ দেখুন" },
  lead: {
    en: "Prices and scores stay free for everyone. Premium explains the reasons behind them, on every share and on your own portfolio.",
    bn: "দাম আর স্কোর সবার জন্য ফ্রি থাকবে। প্রিমিয়াম এর পেছনের কারণ বুঝিয়ে বলে, প্রতিটি শেয়ারে আর আপনার নিজের পোর্টফোলিওতে।",
  },
  from: { en: "From", bn: "মাত্র" },
  perMonth: { en: "a month on the yearly plan", bn: "মাসে, বছরের প্ল্যানে" },
  orMonthly: { en: `or ৳${LOWEST_PRICE} for a single month`, bn: `অথবা এক মাসের জন্য ৳${LOWEST_PRICE}` },
} as const;

export const PROMISES: Bi[] = [
  { en: "Pay by bKash or Nagad", bn: "বিকাশ বা নগদে পেমেন্ট" },
  { en: "It never renews by itself", bn: "নিজে থেকে নবায়ন হয় না" },
  { en: "Full refund within 7 days", bn: "7 দিনের মধ্যে পুরো টাকা ফেরত" },
];

// The four things Premium does, in plain words. Every point is a live feature.
export const BENEFITS: { key: "why" | "portfolio" | "research" | "limits"; title: Bi; points: Bi[] }[] = [
  {
    key: "why",
    title: { en: "Know why, not just what", bn: "শুধু স্কোর নয়, তার কারণও জানুন" },
    points: [
      { en: "A fair price for every share", bn: "প্রতিটি শেয়ারের ন্যায্য দাম" },
      { en: "All five checks and every warning, explained", bn: "পাঁচটি যাচাই আর প্রতিটি সতর্কতার ব্যাখ্যা" },
      { en: "The whole in-depth report", bn: "পুরো বিস্তারিত রিপোর্ট" },
    ],
  },
  {
    key: "portfolio",
    title: { en: "Your portfolio, checked every day", bn: "আপনার পোর্টফোলিও, প্রতিদিন যাচাই করা" },
    points: [
      { en: "An alert when one of your shares needs attention", bn: "কোনো শেয়ারে নজর দেওয়া দরকার হলে অ্যালার্ট" },
      { en: "New results and grade changes, explained", bn: "নতুন ফল আর গ্রেড বদলের সহজ ব্যাখ্যা" },
      { en: "Your full history and a yearly statement", bn: "পুরো ইতিহাস আর বার্ষিক হিসাব" },
    ],
  },
  {
    key: "research",
    title: { en: "Research, done for you", bn: "গবেষণা আমরা করে দিই" },
    points: [
      { en: "All six research lists in full", bn: "ছয়টি গবেষণা তালিকা পুরোটা" },
      { en: "The full stock screener, with your screens checked every day", bn: "পুরো স্টক স্ক্রিনার, আর আপনার স্ক্রিন প্রতিদিন যাচাই" },
      { en: "The complete dividend calendar", bn: "পুরো ডিভিডেন্ড ক্যালেন্ডার" },
    ],
  },
  {
    key: "limits",
    title: { en: "No limits", bn: "কোনো সীমা নেই" },
    points: [
      { en: "Follow as many shares as you like", bn: "যত খুশি শেয়ার অনুসরণ করুন" },
      { en: "Set as many price alerts as you like", bn: "যত খুশি প্রাইস অ্যালার্ট দিন" },
      { en: "Ask TopStock AI anything, at any time", bn: "TopStock AI-কে যেকোনো সময় যেকোনো প্রশ্ন করুন" },
    ],
  },
];

export const STEPS: { title: Bi; sub: Bi }[] = [
  { title: { en: "Choose a plan", bn: "প্ল্যান বেছে নিন" }, sub: { en: "1 month, 6 months or 1 year", bn: "1 মাস, 6 মাস বা 1 বছর" } },
  { title: { en: "Send Money", bn: "Send Money করুন" }, sub: { en: "By bKash or Nagad", bn: "বিকাশ বা নগদে" } },
  { title: { en: "Type your number", bn: "আপনার নম্বর লিখুন" }, sub: { en: "Premium starts at once", bn: "প্রিমিয়াম সঙ্গে সঙ্গে চালু হয়" } },
];

export const SECTIONS = {
  what: { en: "What Premium does for you", bn: "প্রিমিয়াম আপনার জন্য যা করে" },
  stayFree: {
    en: "Prices, charts, news, scores and the Buy or Sell signal stay free for everyone.",
    bn: "দাম, চার্ট, খবর, স্কোর আর কেনা বা বিক্রির সংকেত সবার জন্য ফ্রি থাকবে।",
  },
  how: { en: "Start in three steps", bn: "তিন ধাপে শুরু করুন" },
  plan: { en: "Choose your plan", bn: "আপনার প্ল্যান বেছে নিন" },
  planLead: { en: "The longer the plan, the less you pay each month.", bn: "প্ল্যান যত লম্বা, প্রতি মাসের খরচ তত কম।" },
  refund: { en: "Refund policy", bn: "রিফান্ড নীতি" },
  help: { en: "A problem with a payment?", bn: "পেমেন্টে কোনো সমস্যা?" },
  helpLead: {
    en: "Sent money but Premium did not start, or sent the wrong amount? Tell us here, or email us.",
    bn: "টাকা পাঠিয়েছেন কিন্তু প্রিমিয়াম চালু হয়নি, বা ভুল পরিমাণ পাঠিয়েছেন? এখানে জানান, বা ইমেইল করুন।",
  },
  compare: { en: "Free and Premium, side by side", bn: "ফ্রি আর প্রিমিয়াম, পাশাপাশি" },
  free: { en: "Free", bn: "ফ্রি" },
  premium: { en: "Premium", bn: "প্রিমিয়াম" },
  faq: { en: "Common questions", bn: "সাধারণ প্রশ্ন" },
  closing: { en: "See the reasons on every share", bn: "প্রতিটি শেয়ারের কারণ দেখুন" },
  closingLead: {
    en: "Choose a plan and pay by bKash or Nagad. Premium starts straight away.",
    bn: "প্ল্যান বেছে নিন আর বিকাশ বা নগদে পেমেন্ট করুন। প্রিমিয়াম সঙ্গে সঙ্গে চালু হবে।",
  },
  feature: { en: "What you get", bn: "যা পাবেন" },
  promises: { en: "Our promises", bn: "আমাদের প্রতিশ্রুতি" },
  howWeScore: {
    en: ["Would you like to see how the score works first? Read ", "how we score", "."],
    bn: ["আগে দেখতে চান স্কোর কীভাবে হয়? পড়ুন ", "আমরা কীভাবে স্কোর করি", "।"],
  },
} as const;

// Line by line, for readers who want every detail. Only features that are live.
export const ROWS: { what: Bi; free: Bi; premium: Bi }[] = [
  {
    what: { en: "Share page analysis", bn: "শেয়ারের পেজের বিশ্লেষণ" },
    free: {
      en: "Prices, charts, financials, dividends, owners and news, plus the score, the grade and the Buy or Sell signal.",
      bn: "দাম, চার্ট, আর্থিক হিসাব, ডিভিডেন্ড, মালিকানা আর খবর, সঙ্গে স্কোর, গ্রেড আর কেনা বা বিক্রির সংকেত।",
    },
    premium: {
      en: "The reasons as well: the fair price, all five checks, every good sign and warning, whether the price is high or low, and where the company stands in its sector.",
      bn: "সঙ্গে কারণগুলোও: ন্যায্য দাম, পাঁচটি যাচাই, প্রতিটি ভালো দিক ও সতর্কতা, দাম বেশি না কম, আর সেক্টরে কোম্পানির অবস্থান।",
    },
  },
  {
    what: { en: "In-depth reports", bn: "বিস্তারিত রিপোর্ট" },
    free: { en: "The headline, the main point and the first section.", bn: "শিরোনাম, মূল কথা আর প্রথম অংশ।" },
    premium: { en: "The whole report.", bn: "পুরো রিপোর্ট।" },
  },
  {
    what: { en: "Quarterly results, explained", bn: "প্রান্তিকের ফল, সহজ ব্যাখ্যায়" },
    free: {
      en: "The headline and profit figures of each share's latest quarterly report, and the newest 5 reports on the results page.",
      bn: "প্রতিটি শেয়ারের সর্বশেষ প্রান্তিকের ফলের শিরোনাম ও মুনাফার হিসাব, আর ফলের পেজে নতুন 5টি রিপোর্ট।",
    },
    premium: {
      en: "Every company's latest results in one list. On each share: the latest quarter on its own, cash from the business, the price against the last 12 months' profit, how our score moved, and what it means. You also get a phone alert on the day results come out for a share you own or follow.",
      bn: "সব কোম্পানির সর্বশেষ ফল এক তালিকায়। প্রতিটি শেয়ারে: শুধু শেষ প্রান্তিক, ব্যবসা থেকে আসা নগদ, গত 12 মাসের মুনাফার তুলনায় দাম, আমাদের স্কোর কতটা বদলেছে, আর এর মানে কী। আপনার কেনা বা অনুসরণ করা শেয়ারের ফল বের হলে সেদিনই ফোনে নোটিফিকেশনও পাবেন।",
    },
  },
  {
    what: { en: "Score history", bn: "স্কোরের ইতিহাস" },
    free: { en: "Today's score, and how many times the grade has changed.", bn: "আজকের স্কোর, আর গ্রেড কতবার বদলেছে।" },
    premium: {
      en: "The score on every trading day, each grade change with its reason, and a phone alert when the grade of a share you own or follow changes.",
      bn: "প্রতিটি লেনদেনের দিনের স্কোর, প্রতিটি গ্রেড বদল ও তার কারণ, আর আপনার কেনা বা অনুসরণ করা শেয়ারের গ্রেড বদলালে ফোনে নোটিফিকেশন।",
    },
  },
  {
    what: { en: "Portfolio check", bn: "পোর্টফোলিও যাচাই" },
    free: {
      en: "Your grade and its three scores, the first point on what is going well, and how your money is split by company and sector.",
      bn: "আপনার গ্রেড ও তার তিনটি স্কোর, কী ভালো চলছে তার প্রথম কথা, আর কোম্পানি ও সেক্টর অনুযায়ী টাকার ভাগ।",
    },
    premium: {
      en: "Every point, including what needs your attention and what to consider. Also what to do with each share, what to buy next, a risk check, the price you paid, your cash income, and how you compare with the market.",
      bn: "প্রতিটি কথা, কোথায় নজর দরকার আর কী ভেবে দেখার মতো তা সহ। সঙ্গে প্রতিটি শেয়ার নিয়ে কী করবেন, এরপর কী কিনবেন, ঝুঁকি যাচাই, কেনার দাম, নগদ আয়, আর বাজারের সঙ্গে আপনার তুলনা।",
    },
  },
  {
    what: { en: "Daily check on your shares", bn: "আপনার শেয়ারের প্রতিদিনের যাচাই" },
    free: {
      en: "How many things we found on your shares and what kind they are, plus the first one each week in full, with a phone notification.",
      bn: "আপনার শেয়ারে কতগুলো বিষয় পাওয়া গেছে আর সেগুলো কী ধরনের, সঙ্গে প্রতি সপ্তাহের প্রথমটি পুরোটা, ফোনে নোটিফিকেশনসহ।",
    },
    premium: {
      en: "What each one was, with a phone alert the same day: a record date coming, new results, a category change, a big fall, or a fall to the yearly low.",
      bn: "প্রতিটি কী ছিল, আর একই দিনে ফোনে নোটিফিকেশন: রেকর্ড ডেট আসছে, নতুন ফল, ক্যাটাগরি বদল, বড় দরপতন, বা বছরের সর্বনিম্ন দামে নেমে আসা।",
    },
  },
  {
    what: { en: "Portfolio history", bn: "পোর্টফোলিওর ইতিহাস" },
    free: {
      en: "Your portfolio's value over time beside DSEX, and the money made from sales and dividends, before and after fees and tax.",
      bn: "সময়ের সঙ্গে আপনার পোর্টফোলিওর মূল্য, DSEX-এর পাশে, আর বিক্রি ও ডিভিডেন্ড থেকে আয়, খরচ ও করের আগে ও পরে।",
    },
    premium: { en: "The same, plus a yearly statement (see below).", bn: "একই, সঙ্গে বার্ষিক হিসাব (নিচে দেখুন)।" },
  },
  {
    what: { en: "What-if check", bn: "\"যদি এমন করি\" যাচাই" },
    free: { en: "—", bn: "—" },
    premium: {
      en: "Try a sale or a buy and see your portfolio grade before you act.",
      bn: "কেনা বা বেচার আগে দেখে নিন পোর্টফোলিওর গ্রেড কী হবে।",
    },
  },
  {
    what: { en: "Yearly statement", bn: "বার্ষিক হিসাব" },
    free: { en: "—", bn: "—" },
    premium: {
      en: "Every buy, sale, cash dividend and bonus share in the year, ready to print or download.",
      bn: "বছরের প্রতিটি কেনা, বেচা, নগদ ডিভিডেন্ড আর বোনাস শেয়ার, প্রিন্ট বা ডাউনলোডের জন্য তৈরি।",
    },
  },
  {
    what: { en: "Portfolios", bn: "পোর্টফোলিও" },
    free: { en: "One.", bn: "একটি।" },
    premium: {
      en: "Up to six, so you can keep a parent's or spouse's BO account apart from yours.",
      bn: "ছয়টি পর্যন্ত, যাতে মা-বাবা বা স্বামী/স্ত্রীর বিও অ্যাকাউন্ট আপনার থেকে আলাদা রাখতে পারেন।",
    },
  },
  {
    what: { en: "Research lists", bn: "গবেষণা তালিকা" },
    free: {
      en: "What each of the six lists looks for, and how many companies pass its checks.",
      bn: "ছয়টি তালিকার প্রতিটি কী খোঁজে, আর কতগুলো কোম্পানি তার যাচাইয়ে পাস করে।",
    },
    premium: {
      en: "Every share on all six lists: a research card with its fair price range and main risk, all of them side by side, and who joined or left this month.",
      bn: "ছয়টি তালিকার প্রতিটি শেয়ার: ন্যায্য দামের সীমা আর মূল ঝুঁকিসহ গবেষণা কার্ড, সবগুলো পাশাপাশি, আর এই মাসে কে যোগ হলো বা বাদ পড়ল।",
    },
  },
  {
    what: { en: "Stock screener", bn: "স্টক স্ক্রিনার" },
    free: {
      en: "The six quick picks, the count under every answer, the first 3 shares, and which answer holds back the most.",
      bn: "ছয়টি দ্রুত বাছাই, প্রতিটি উত্তরের নিচের সংখ্যা, প্রথম 3টি শেয়ার, আর কোন উত্তরে সবচেয়ে বেশি শেয়ার আটকে যায়।",
    },
    premium: {
      en: "Your own answers to the six questions, one or more sectors, every share that passes, and the shares that miss by one answer. You can change the exact rules, add extra checks (a Buy today, a better quarter, owners buying, and more), and save up to 5 screens that are checked every trading day, with a phone alert when a new share passes.",
      bn: "ছয়টি প্রশ্নে নিজের উত্তর, এক বা একাধিক সেক্টর, পাস করা প্রতিটি শেয়ার, আর মাত্র একটি উত্তরে বাদ পড়া শেয়ার। নিয়ম বদলাতে পারবেন, বাড়তি যাচাই যোগ করতে পারবেন (আজ কেনা যায়, ভালো প্রান্তিক, উদ্যোক্তা-পরিচালকরা কিনছেন, আরও কিছু), আর 5টি পর্যন্ত স্ক্রিন সেভ করতে পারবেন, যা প্রতি লেনদেনের দিনে যাচাই হয়। নতুন শেয়ার পাস করলে ফোনে নোটিফিকেশন পাবেন।",
    },
  },
  {
    what: { en: "Dividend calendar", bn: "ডিভিডেন্ড ক্যালেন্ডার" },
    free: {
      en: "A few rows of each list: record dates, AGMs, the biggest cash dividends and the newest announcements.",
      bn: "প্রতিটি তালিকার কয়েকটি সারি: রেকর্ড ডেট, এজিএম, সবচেয়ে বড় নগদ ডিভিডেন্ড আর নতুন ঘোষণা।",
    },
    premium: { en: "Every list in full.", bn: "সব তালিকা পুরোটা।" },
  },
  {
    what: { en: "Watchlist", bn: "ওয়াচলিস্ট" },
    free: {
      en: "10 shares, and how many of them trade under fair value, have a record date soon, or carry a risk flag.",
      bn: "10টি শেয়ার, আর এর কতগুলো ন্যায্য দামের নিচে, কতগুলোর রেকর্ড ডেট কাছে, বা কতগুলোতে ঝুঁকির সতর্কতা আছে।",
    },
    premium: {
      en: "No limit, and one board with each share's price against its fair value, what stops a Buy, its next record date or AGM, and its risk flags.",
      bn: "কোনো সীমা নেই, আর এক বোর্ডে প্রতিটি শেয়ারের দাম বনাম ন্যায্য দাম, কেনার পথে কী বাধা, পরের রেকর্ড ডেট বা এজিএম, আর ঝুঁকির সতর্কতা।",
    },
  },
  {
    what: { en: "Price alerts", bn: "প্রাইস অ্যালার্ট" },
    free: { en: "3 at a time.", bn: "একসঙ্গে 3টি।" },
    premium: { en: "No limit.", bn: "কোনো সীমা নেই।" },
  },
  {
    what: { en: "TopStock AI", bn: "TopStock AI" },
    free: { en: "10 questions a day.", bn: "দিনে 10টি প্রশ্ন।" },
    premium: { en: "No limit.", bn: "কোনো সীমা নেই।" },
  },
];

export const FAQS: { q: Bi; a: Bi }[] = [
  {
    q: { en: "How much does Premium cost?", bn: "প্রিমিয়ামের দাম কত?" },
    a: {
      en: "৳199 for 1 month. For a limited time, 6 months cost ৳999 instead of ৳1,149, and a year costs ৳1,899 instead of ৳2,199, which is about ৳158 a month.",
      bn: "1 মাস ৳199। সীমিত সময়ের অফারে 6 মাস ৳1,149-এর বদলে ৳999, আর 1 বছর ৳2,199-এর বদলে ৳1,899, অর্থাৎ মাসে প্রায় ৳158।",
    },
  },
  {
    q: { en: "How do I pay?", bn: "কীভাবে পেমেন্ট করব?" },
    a: {
      en: "By bKash or Nagad. Choose a plan, use Send Money to send the amount to the number shown on this page, then type the number you sent it from and tap the button. Premium starts straight away.",
      bn: "বিকাশ বা নগদে। একটি প্ল্যান বেছে নিন, এই পেজে দেখানো নম্বরে Send Money করে টাকা পাঠান, তারপর যে নম্বর থেকে পাঠিয়েছেন সেটি লিখে বোতাম চাপুন। প্রিমিয়াম সঙ্গে সঙ্গে চালু হবে।",
    },
  },
  {
    q: { en: "What if you cannot find my payment?", bn: "আমার পেমেন্ট খুঁজে না পেলে কী হবে?" },
    a: {
      en: "We check every payment against our bKash and Nagad statements. If no money came from the number you typed, Premium is switched off and the days are taken back. If you typed the wrong number by mistake, please contact us and we will sort it out.",
      bn: "প্রতিটি পেমেন্ট আমরা বিকাশ ও নগদের হিসাবের সঙ্গে মিলিয়ে দেখি। আপনার লেখা নম্বর থেকে টাকা না এলে প্রিমিয়াম বন্ধ হয় আর দিনগুলো ফিরিয়ে নেওয়া হয়। ভুল করে অন্য নম্বর লিখে থাকলে আমাদের জানান, আমরা ঠিক করে দেব।",
    },
  },
  {
    q: { en: "Does it renew by itself?", bn: "নিজে থেকে কি নবায়ন হয়?" },
    a: {
      en: "No. Nothing is ever taken from your account automatically. A few days before your plan ends, we remind you and tell you what Premium found on your shares that month. You pay again only if you want to continue.",
      bn: "না। আপনার অ্যাকাউন্ট থেকে নিজে থেকে কখনো টাকা কাটা হয় না। প্ল্যান শেষ হওয়ার কয়েক দিন আগে আমরা মনে করিয়ে দিই, আর জানাই সেই মাসে প্রিমিয়াম আপনার শেয়ারে কী কী পেয়েছে। চালিয়ে যেতে চাইলে তবেই আবার পেমেন্ট করবেন।",
    },
  },
  {
    q: { en: "Can I see it before I pay?", bn: "পেমেন্টের আগে কি দেখে নিতে পারি?" },
    a: {
      en: "Yes. Every day, one well-known company's share page is fully open for everyone, with the fair price, every check and all the reasons. Look for \"Today's free full report\" on the homepage.",
      bn: "হ্যাঁ। প্রতিদিন একটি পরিচিত কোম্পানির শেয়ারের পেজ সবার জন্য পুরো খোলা থাকে, ন্যায্য দাম, প্রতিটি যাচাই আর সব কারণসহ। হোমপেজে \"আজকের ফ্রি পূর্ণ রিপোর্ট\" দেখুন।",
    },
  },
  {
    q: { en: "Can I get my money back?", bn: "টাকা কি ফেরত পাব?" },
    a: {
      en: "Yes. Ask within 7 days of paying, and we send the full amount back to the number you paid from. The refund policy has the details.",
      bn: "হ্যাঁ। পেমেন্টের 7 দিনের মধ্যে জানালে যে নম্বর থেকে পেমেন্ট করেছেন, সেখানে পুরো টাকা ফেরত পাঠাই। বিস্তারিত রিফান্ড নীতিতে আছে।",
    },
  },
  {
    q: { en: "What happens when my plan ends?", bn: "মেয়াদ শেষ হলে কী হবে?" },
    a: {
      en: "Your account goes back to the free plan by itself. The shares you follow and the alerts you set stay. You just cannot add more than the free limits.",
      bn: "অ্যাকাউন্ট নিজে থেকেই ফ্রি প্ল্যানে ফিরে যায়। আপনার অনুসরণ করা শেয়ার আর দেওয়া অ্যালার্ট থেকে যায়, শুধু ফ্রি সীমার বেশি যোগ করা যাবে না।",
    },
  },
  {
    q: { en: "What stays free?", bn: "কী কী ফ্রি থাকবে?" },
    a: {
      en: "Prices, charts, financials, dividends, news, the score and grade of every share, the Buy or Sell signal, the rankings and the market pages. Premium adds the reasons and the tools on top.",
      bn: "দাম, চার্ট, আর্থিক হিসাব, ডিভিডেন্ড, খবর, প্রতিটি শেয়ারের স্কোর ও গ্রেড, কেনা বা বিক্রির সংকেত, র‍্যাঙ্কিং আর বাজারের পেজগুলো। প্রিমিয়াম এর ওপর কারণ আর টুল যোগ করে।",
    },
  },
  {
    q: { en: "Is this investment advice?", bn: "এটি কি বিনিয়োগ পরামর্শ?" },
    a: {
      en: "No. Everything on TopStockBD is educational information built from company figures. Please check a share yourself before you buy or sell.",
      bn: "না। TopStockBD-র সবকিছু কোম্পানির হিসাব থেকে তৈরি শিক্ষামূলক তথ্য। কেনা বা বেচার আগে নিজে যাচাই করে নিন।",
    },
  },
];
