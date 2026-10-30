/**
 * All of TopStock AI's words live here, so the voice stays consistent: calm,
 * plain and measured (docs/voice.md), with a Bengali twin for every line. The
 * chat shows one language at a time, following the navbar switch. No promises,
 * always "for learning".
 */
import { PERSONA } from "./persona";

export const COPY = {
  greeting: {
    text: `Hello, I am ${PERSONA.name}, your share helper. Tap a button below, or type what you are looking for.`,
    bn: `আমি ${PERSONA.name}, আপনার শেয়ার সহকারী। নিচের একটি বোতামে চাপ দিন, অথবা যা খুঁজছেন তা লিখুন।`,
  },

  help: {
    text: "I can help in three ways: find shares that suit you, tell you how the market is doing today, and answer short questions about any one share. Choose one of these:",
    bn: "আমি তিনভাবে সাহায্য করতে পারি: আপনার উপযোগী শেয়ার খুঁজে দেওয়া, আজ বাজার কেমন চলছে তা বলা, আর যেকোনো একটি শেয়ার নিয়ে ছোট প্রশ্নের উত্তর দেওয়া। নিচের একটি বেছে নিন:",
  },

  fallback: {
    text: "Sorry, I did not understand that. These are the things I can help with. Please choose one:",
    bn: "দুঃখিত, বিষয়টি বুঝতে পারিনি। আমি এই কাজগুলোতে সাহায্য করতে পারি। একটি বেছে নিন:",
  },

  thinking: { text: `${PERSONA.name} is typing…`, bn: `${PERSONA.name} লিখছে…` },

  disclaimer: {
    text: "These are ideas to learn from, not financial advice. Please check for yourself before you decide.",
    bn: "এগুলো শেখার জন্য, বিনিয়োগ পরামর্শ নয়। সিদ্ধান্তের আগে নিজে যাচাই করে নিন।",
    link: "Read the disclaimer",
    linkBn: "সতর্কবার্তা পড়ুন",
  },

  // --- Suggest-shares slot flow ---
  suggest: {
    intro: "Let us find shares that suit you. Please answer a few short questions.",
    introBn: "চলুন আপনার উপযোগী শেয়ার খুঁজি। কয়েকটি ছোট প্রশ্নের উত্তর দিন।",
    done: "Here are a few shares that match your answers:",
    doneBn: "আপনার উত্তরের সঙ্গে মেলে এমন কয়েকটি শেয়ার:",
    none: "No share matched every answer. These are the closest:",
    noneBn: "সব উত্তরের সঙ্গে মেলে এমন শেয়ার পাওয়া যায়নি। সবচেয়ে কাছেরগুলো:",
    relaxedPrefix: "To find enough shares, a few of your answers were widened:",
    relaxedBn: "যথেষ্ট শেয়ার পেতে আপনার কয়েকটি উত্তর একটু শিথিল করা হয়েছে।",
    continue: "Please tap one of these to continue.",
    continueBn: "চালিয়ে যেতে নিচের একটিতে চাপ দিন।",
    startOver: "Start over",
    startOverBn: "আবার শুরু করুন",
  },

  // --- Market ---
  marketClosed: (countdown: string) =>
    `The market is closed now and opens in ${countdown}. Here is the last trading day:`,
  marketClosedBn: (countdown: string) =>
    `বাজার এখন বন্ধ, খুলবে ${countdown} পরে। শেষ লেনদেনের দিনের চিত্র:`,
  marketLine: {
    rising: {
      text: "More shares rose than fell today. Buyers were stronger.",
      bn: "আজ যত শেয়ারের দাম কমেছে, বেড়েছে তার চেয়ে বেশি। ক্রেতারা বেশি সক্রিয় ছিলেন।",
    },
    falling: {
      text: "More shares fell than rose today. It was a weak day.",
      bn: "আজ যত শেয়ারের দাম বেড়েছে, কমেছে তার চেয়ে বেশি। দিনটি দুর্বল ছিল।",
    },
    sideways: {
      text: "The day was quiet and mixed, with no clear direction.",
      bn: "দিনটি শান্ত ও মিশ্র ছিল, কোনো স্পষ্ট দিক ছিল না।",
    },
    unknown: {
      text: "Here is the latest picture of the market.",
      bn: "বাজারের সর্বশেষ চিত্র:",
    },
  },
  marketCondition: {
    rising: { text: "Rising", bn: "বাড়ছে" },
    falling: { text: "Falling", bn: "কমছে" },
    sideways: { text: "Flat", bn: "স্থির" },
    unknown: { text: "Latest", bn: "সর্বশেষ" },
  },
  marketIndex: { text: "DSEX index", bn: "ডিএসইএক্স সূচক" },
  marketFull: { text: "See the full market today →", bn: "আজকের পুরো বাজার দেখুন →" },

  // --- Single share ---
  stock: {
    notFound: (q: string) =>
      `I could not find a share called "${q}". Please try its trading code, such as GP or BEXIMCO, or choose one below:`,
    notFoundBn: (q: string) =>
      `"${q}" নামে কোনো শেয়ার পাওয়া যায়নি। এর ট্রেডিং কোড লিখে দেখুন, যেমন GP বা BEXIMCO, অথবা নিচে থেকে বেছে নিন:`,
    askWhich: "Which share? Please type its name or trading code, such as GP or SQURPHARMA.",
    askWhichBn: "কোন শেয়ার? এর নাম বা ট্রেডিং কোড লিখুন, যেমন GP বা SQURPHARMA।",
    didYouMean: "Did you mean one of these?",
    didYouMeanBn: "আপনি কি এগুলোর কোনো একটির কথা বলছেন?",
    fullAnalysis: "See the full page →",
    fullAnalysisBn: "পুরো পেজ দেখুন →",
    stale: "This is based on older accounts.",
    staleBn: "এটি পুরোনো আর্থিক হিসাবের ওপর ভিত্তি করে।",
    cheaper: "It costs less than usual for its sector.",
    cheaperBn: "এর দাম সেক্টরের স্বাভাবিকের চেয়ে কম।",
    pricier: "It costs a little more than usual for its sector.",
    pricierBn: "এর দাম সেক্টরের স্বাভাবিকের চেয়ে একটু বেশি।",
    inLine: "Its price is about in line with its sector.",
    inLineBn: "এর দাম সেক্টরের সঙ্গে মোটামুটি মিলে যায়।",
  },
  facts: {
    yield: { text: "Dividend yield", bn: "ডিভিডেন্ড ইল্ড" },
    lastCash: { text: "Latest cash dividend", bn: "সর্বশেষ নগদ ডিভিডেন্ড" },
    recordDate: { text: "Record date", bn: "রেকর্ড ডেট" },
    pe: { text: "P/E", bn: "পিই" },
    sectorPe: { text: "Usual P/E in its sector", bn: "সেক্টরের সাধারণ পিই" },
    ownPe: { text: "Its own usual P/E", bn: "এর নিজের সাধারণ পিই" },
  },

  // --- Screen result framing (short lead-ins) ---
  screenLead: {
    screen_dividend: "Shares that pay the highest dividends right now:",
    screen_cheap: "Shares that look good value at today's price:",
    screen_safe: "Steadier, higher-quality shares to start with:",
    screen_growth: "Companies whose profit is growing fastest:",
    screen_momentum: "Shares that have moved the most lately:",
    screen_near_low:
      "Shares near their lowest price of the past year. They may be good value, but please check why they fell:",
    screen_top: "Our highest-rated shares right now:",
  } as Record<string, string>,
  screenLeadBn: {
    screen_dividend: "এখন সবচেয়ে বেশি ডিভিডেন্ড দেয় এমন শেয়ার:",
    screen_cheap: "আজকের দামে ভালো মূল্যের মনে হচ্ছে এমন শেয়ার:",
    screen_safe: "শুরুর জন্য বেশি স্থির, ভালো মানের শেয়ার:",
    screen_growth: "যেসব কোম্পানির মুনাফা সবচেয়ে দ্রুত বাড়ছে:",
    screen_momentum: "সম্প্রতি যেসব শেয়ারের দাম সবচেয়ে বেশি নড়েছে:",
    screen_near_low:
      "গত এক বছরের সর্বনিম্ন দামের কাছে থাকা শেয়ার। এগুলো ভালো মূল্যের হতে পারে, তবে দাম কেন কমেছে তা যাচাই করুন:",
    screen_top: "এখন আমাদের সবচেয়ে ভালো রেটিংয়ের শেয়ার:",
  } as Record<string, string>,
  screenFound: { text: "Here is what I found:", bn: "যা পেলাম:" },
  sectorLead: (sector: string) => `The strongest ${sector} shares by overall quality:`,
  sectorLeadBn: (sector: string) => `সার্বিক মানে ${sector} সেক্টরের সবচেয়ে শক্তিশালী শেয়ার:`,
  priceCapLead: (cap: number) => `Sound shares priced under ৳${cap}:`,
  priceCapLeadBn: (cap: number) => `৳${cap}-এর কম দামের ভালো শেয়ার:`,

  // Stock-list chrome
  list: {
    code: { text: "Code", bn: "কোড" },
    price: { text: "Price", bn: "দাম" },
    change: { text: "Today", bn: "আজ" },
    seeAll: { text: "See all", bn: "সব দেখুন" },
  },

  empty: {
    text: "Nothing matches that right now. Would you like to try something else?",
    bn: "এই মুহূর্তে কিছু মেলেনি। অন্য কিছু চেষ্টা করবেন?",
  },

  error: {
    text: "I cannot reach the data right now. Please try again in a moment.",
    bn: "এই মুহূর্তে তথ্য আনা যাচ্ছে না। একটু পরে আবার চেষ্টা করুন।",
  },

  tips: {
    intro: "A few things worth knowing today:",
    introBn: "আজ জেনে রাখার মতো কয়েকটি বিষয়:",
    none: "There are no new tips right now. Please check again a little later.",
    noneBn: "এই মুহূর্তে নতুন কোনো টিপস নেই। একটু পরে আবার দেখুন।",
    seeAll: "See all tips",
    seeAllBn: "সব টিপস দেখুন",
  },

  dividends: {
    intro: "Dividends coming up soon:",
    introBn: "শিগগির আসছে এমন ডিভিডেন্ড:",
    none: "There are no upcoming dividend dates to show right now.",
    noneBn: "এই মুহূর্তে দেখানোর মতো কোনো আসন্ন ডিভিডেন্ডের তারিখ নেই।",
    line: (name: string, code: string, cash: string | null, date: string | null) =>
      `${name} (${code})${cash ? `: ${cash} cash` : ""}${date ? `${cash ? "," : ":"} record date ${date}` : ""}`,
    lineBn: (name: string, code: string, cash: string | null, date: string | null) =>
      `${name} (${code})${cash ? `: ${cash} নগদ` : ""}${date ? `${cash ? "," : ":"} রেকর্ড ডেট ${date}` : ""}`,
  },

  // --- Daily brief (opening message for a returning user) ---
  brief: {
    headline: "Here is your short update for today.",
    headlineBn: "আজকের জন্য আপনার ছোট আপডেট।",
    nothingPersonal:
      "Your watchlist and portfolio are quiet today, with no big moves. Here is the market instead:",
    nothingPersonalBn:
      "আজ আপনার ওয়াচলিস্ট ও পোর্টফোলিও শান্ত, বড় কোনো ওঠানামা নেই। তার বদলে বাজারের চিত্র:",
    loggedOut:
      "Sign in to follow your own shares and get a personal update every day.",
    loggedOutBn:
      "নিজের শেয়ার অনুসরণ করতে আর প্রতিদিন নিজের জন্য আপডেট পেতে সাইন ইন করুন।",
    setup:
      "Add a few shares to your watchlist, and I will keep an eye on them for you every day.",
    setupBn:
      "ওয়াচলিস্টে কয়েকটি শেয়ার যোগ করুন, আমি প্রতিদিন সেগুলোর ওপর নজর রাখব।",
    signIn: "Sign in",
    signInBn: "সাইন ইন",
    tipPrefix: "Tip:",
    tipPrefixBn: "টিপস:",
  },

  // --- Personalized (the user's own watchlist / portfolio) ---
  mine: {
    watchlistLead: "Here is how your watchlist is doing today:",
    watchlistLeadBn: "আজ আপনার ওয়াচলিস্ট কেমন চলছে:",
    watchlistTitle: "Your watchlist",
    watchlistTitleBn: "আপনার ওয়াচলিস্ট",
    watchlistSub: (up: number, down: number) => `${up} rose and ${down} did not rise today`,
    watchlistSubBn: (up: number, down: number) => `আজ ${up}টির দাম বেড়েছে, ${down}টির বাড়েনি`,
    score: "Score",
    scoreBn: "স্কোর",
    openWatchlist: "Open the watchlist",
    openWatchlistBn: "ওয়াচলিস্ট খুলুন",
    watchlistEmpty: "Your watchlist is empty. Add some shares and I will follow them here.",
    watchlistEmptyBn: "আপনার ওয়াচলিস্ট খালি। কিছু শেয়ার যোগ করুন, আমি এখানে সেগুলোর খবর দেখাব।",
    portfolioLead: "A short look at your portfolio:",
    portfolioLeadBn: "আপনার পোর্টফোলিওর একটি সংক্ষিপ্ত চিত্র:",
    portfolioValue: (value: string, profit: boolean, amount: string, pctText: string) =>
      `Worth ${value}. ${profit ? "Profit" : "Loss"} since you bought: ${amount} (${pctText}).`,
    portfolioValueBn: (value: string, profit: boolean, amount: string, pctText: string) =>
      `মোট মূল্য ${value}। কেনার পর থেকে ${profit ? "লাভ" : "লোকসান"}: ${amount} (${pctText})।`,
    portfolioToday: (up: boolean, amount: string, pctText: string) =>
      `Today it is ${up ? "up" : "down"} ${amount} (${pctText}).`,
    portfolioTodayBn: (up: boolean, amount: string, pctText: string) =>
      `আজ ${amount} ${up ? "বেড়েছে" : "কমেছে"} (${pctText})।`,
    portfolioGrade: (grade: string, word: string) => `Overall grade: ${grade}, ${word}.`,
    portfolioGradeBn: (grade: string, word: string) => `সার্বিক গ্রেড: ${grade}, ${word}।`,
    openPortfolio: "Open the portfolio",
    openPortfolioBn: "পোর্টফোলিও খুলুন",
    addHoldings: "Add your shares",
    addHoldingsBn: "শেয়ার যোগ করুন",
    portfolioEmpty:
      "You have not added any shares yet. Add them to see your profit and loss.",
    portfolioEmptyBn:
      "এখনো কোনো শেয়ার যোগ করেননি। যোগ করলে আপনার লাভ-লোকসান দেখতে পাবেন।",
    newsLead: "Latest news on your shares:",
    newsLeadBn: "আপনার শেয়ারের সর্বশেষ খবর:",
    newsNone: "There is no new news on your shares right now.",
    newsNoneBn: "এই মুহূর্তে আপনার শেয়ারের নতুন কোনো খবর নেই।",
    divLead: "Dividends coming up on your shares:",
    divLeadBn: "আপনার শেয়ারে আসন্ন ডিভিডেন্ড:",
    divNone: "There are no upcoming dividends on your watchlist right now.",
    divNoneBn: "এই মুহূর্তে আপনার ওয়াচলিস্টে আসন্ন কোনো ডিভিডেন্ড নেই।",
    signIn:
      "Sign in to build a watchlist and a portfolio that I can follow for you.",
    signInBn:
      "এমন ওয়াচলিস্ট ও পোর্টফোলিও তৈরি করতে সাইন ইন করুন, যা আমি আপনার হয়ে অনুসরণ করতে পারি।",
  },

  // --- Guest daily limit (not signed in) ---
  guestLimit: {
    text: "You have used today's 5 free questions. Create a free account to keep asking. You will also get a watchlist, portfolio tracking and a daily update.",
    bn: "আজকের 5টি ফ্রি প্রশ্ন শেষ হয়েছে। আরও প্রশ্ন করতে ফ্রি অ্যাকাউন্ট খুলুন। সঙ্গে ওয়াচলিস্ট, পোর্টফোলিও ট্র্যাকিং আর প্রতিদিনের আপডেটও পাবেন।",
    bar: "Today's free questions are used up.",
    barBn: "আজকের ফ্রি প্রশ্ন শেষ হয়েছে।",
    cta: "Sign up free",
    ctaBn: "ফ্রি অ্যাকাউন্ট খুলুন",
  },

  // --- Signed-in free account daily limit (Premium has none) ---
  freeLimit: {
    text: (n: number) => `You have used today's ${n} free questions. Premium has no daily limit.`,
    bn: (n: number) => `আজকের ${n}টি ফ্রি প্রশ্ন শেষ হয়েছে। প্রিমিয়ামে কোনো দৈনিক সীমা নেই।`,
    bar: "Today's free questions are used up.",
    barBn: "আজকের ফ্রি প্রশ্ন শেষ হয়েছে।",
    cta: "See Premium",
    ctaBn: "প্রিমিয়াম দেখুন",
  },

  // --- In-chat actions ---
  actions: {
    added: (code: string) => `${code} is now on your watchlist.`,
    addedBn: (code: string) => `${code} আপনার ওয়াচলিস্টে যোগ হয়েছে।`,
    removed: (code: string) => `${code} was removed from your watchlist.`,
    removedBn: (code: string) => `${code} ওয়াচলিস্ট থেকে সরানো হয়েছে।`,
    signInToSave: "Please sign in to save shares to your watchlist.",
    signInToSaveBn: "ওয়াচলিস্টে শেয়ার রাখতে সাইন ইন করুন।",
    watchLimit: "A free account can follow 5 shares. Premium has no limit.",
    watchLimitBn: "ফ্রি অ্যাকাউন্টে 5টি শেয়ার অনুসরণ করা যায়। প্রিমিয়ামে কোনো সীমা নেই।",
  },

  // --- Follow-up ("what next") chip labels ---
  followups: {
    save: { label: "Save to watchlist", bn: "ওয়াচলিস্টে রাখুন" },
    dividend: { label: "Its dividend", bn: "এর ডিভিডেন্ড" },
    value: { label: "Is the price low?", bn: "দাম কি কম?" },
    tellMe: { label: "Tell me about", bn: "সম্পর্কে বলুন" },
    market: { label: "How is the market?", bn: "বাজার কেমন?" },
    top: { label: "Highest rated", bn: "সেরা রেটিং" },
    gainers: { label: "Biggest risers", bn: "সবচেয়ে বেশি বেড়েছে" },
    losers: { label: "Biggest fallers", bn: "সবচেয়ে বেশি কমেছে" },
    myPortfolio: { label: "My portfolio", bn: "আমার পোর্টফোলিও" },
    myWatchlist: { label: "My watchlist", bn: "আমার ওয়াচলিস্ট" },
    myNews: { label: "News on my shares", bn: "আমার শেয়ারের খবর" },
  },

  // --- Slot questions ---
  slots: {
    strategy: {
      q: "How do you prefer to choose shares?",
      qBn: "আপনি কীভাবে শেয়ার বাছাই করতে চান?",
      chips: [
        { label: "Strong businesses", bn: "শক্তিশালী কোম্পানি", value: "fundamental_strong" },
        { label: "What is moving now", bn: "এখন যা নড়ছে", value: "market_trending" },
      ],
    },
    dividend: {
      q: "Do you want a steady dividend income?",
      qBn: "নিয়মিত ডিভিডেন্ড আয় চান?",
      chips: [
        { label: "Yes, dividends matter", bn: "হ্যাঁ, ডিভিডেন্ড জরুরি", value: "income_focused" },
        { label: "Not important", bn: "জরুরি নয়", value: "doesnt_matter" },
      ],
    },
    risk: {
      q: "How much price movement are you comfortable with?",
      qBn: "দামের কতটা ওঠানামায় আপনি স্বচ্ছন্দ?",
      chips: [
        { label: "Keep it steady", bn: "স্থির থাকুক", value: "steady" },
        { label: "A balanced mix", bn: "ভারসাম্যপূর্ণ", value: "balanced" },
        { label: "Aim for bigger gains", bn: "বেশি লাভের চেষ্টা", value: "aggressive" },
      ],
    },
    sectors: {
      q: "Do you prefer a sector? You can also skip this.",
      qBn: "কোনো সেক্টর পছন্দ আছে? চাইলে এটি বাদ দিতে পারেন।",
      anyLabel: "Any sector",
      anyLabelBn: "যেকোনো সেক্টর",
    },
  },

  composerPlaceholder: "Ask in English or বাংলা…",
  composerPlaceholderBn: "বাংলা বা ইংরেজিতে লিখুন…",
  seeAll: {
    market: "See the full market",
    marketBn: "পুরো বাজার দেখুন",
    rankings: "See all rankings",
    rankingsBn: "সব র‍্যাঙ্কিং দেখুন",
  },
} as const;

/** Sentinel value for the "Any sector" chip. */
export const ANY_SECTOR = "__any__";
