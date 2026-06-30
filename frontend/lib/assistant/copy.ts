/**
 * All of TopStock AI's words live here — one place to keep the voice consistent:
 * simple, everyday English, warm and encouraging, zero finance jargon, with a
 * Bengali (বাংলা) twin for every line so the helper speaks to a bilingual,
 * often weak-in-English audience. No promises, always "for learning".
 */
import { PERSONA } from "./persona";

export const COPY = {
  greeting: {
    text: `Hi! I'm ${PERSONA.name} 👋 — your stock helper. Tap a button below or just type what you're looking for.`,
    bn: "আমি TopStock AI — আপনার শেয়ার সহকারী। নিচের যেকোনো একটাতে চাপ দিন, অথবা যা খুঁজছেন সহজ ভাষায় লিখুন।",
  },

  help: {
    text: "I can help you three ways — find stocks that fit you, tell you how the market is doing today, and answer quick questions about any single stock. Try one of these:",
    bn: "আমি তিনভাবে সাহায্য করতে পারি — আপনার জন্য মানানসই শেয়ার খুঁজে দেওয়া, আজ বাজার কেমন চলছে বলা, আর যেকোনো একটি শেয়ার নিয়ে ছোট প্রশ্নের উত্তর দেওয়া। নিচের একটা বেছে নিন:",
  },

  fallback: {
    text: "Sorry, I didn't quite catch that. I'm best at these — pick one and we'll go from there:",
    bn: "দুঃখিত, ঠিক বুঝতে পারিনি। এই কাজগুলো আমি ভালো পারি — একটা বেছে নিন:",
  },

  thinking: "TopStock AI is typing…",

  disclaimer:
    "These are ideas to learn from — not financial advice. Always do your own research.",

  // --- Suggest-stocks slot flow ---
  suggest: {
    intro: "Let's find stocks that fit you. A couple of quick taps 👇",
    introBn: "চলুন আপনার জন্য মানানসই শেয়ার খুঁজি। কয়েকটা ছোট প্রশ্ন 👇",
    done: "Darun! Here are a few that fit what you told me:",
    doneBn: "দারুন! আপনার পছন্দ অনুযায়ী কয়েকটা শেয়ার:",
    none: "I couldn't find a clean match. Here's the closest I've got:",
    noneBn: "একদম মিল পাইনি। কাছাকাছি যেগুলো পেলাম:",
    relaxedPrefix: "To find enough options, I widened a few of your choices:",
  },

  // --- Market ---
  marketClosed: (countdown: string) =>
    `The market is closed right now — it opens in ${countdown}. Here's the last trading day:`,

  // --- Single stock ---
  stock: {
    notFound: (q: string) =>
      `I couldn't find a stock called "${q}". Try its trading code (like GP or BEXIMCO), or pick one:`,
    askWhich: "Which stock? Type its name or trading code (like GP, SQURPHARMA).",
    askWhichBn: "কোন শেয়ার? এর নাম বা ট্রেডিং কোড লিখুন (যেমন GP, SQURPHARMA)।",
    didYouMean: "Did you mean one of these?",
    didYouMeanBn: "এগুলোর কোনো একটা বলতে চেয়েছেন?",
    fullAnalysis: "Full analysis →",
  },

  // --- Screen result framing (short lead-ins) ---
  screenLead: {
    screen_dividend: "Stocks that pay the best dividends right now:",
    screen_cheap: "Stocks that look good value at today's price:",
    screen_safe: "Steadier, higher-quality names to start with:",
    screen_growth: "Companies growing their profit the fastest:",
    screen_momentum: "Trending stocks — the biggest movers lately:",
    screen_near_low:
      "Stocks trading near their 1-year low — possible bargains, but check why:",
    screen_top: "Our highest-rated stocks on the numbers right now:",
  } as Record<string, string>,
  screenLeadBn: {
    screen_dividend: "এখন সবচেয়ে ভালো লভ্যাংশ দেয় এমন শেয়ার:",
    screen_cheap: "আজকের দামে সস্তা মনে হচ্ছে এমন শেয়ার:",
    screen_safe: "শুরুর জন্য বেশি স্থিতিশীল, ভালো মানের শেয়ার:",
    screen_growth: "যাদের মুনাফা সবচেয়ে দ্রুত বাড়ছে এমন শেয়ার:",
    screen_momentum: "এখন সবচেয়ে বেশি নড়াচড়া করছে এমন শেয়ার:",
    screen_near_low: "১ বছরের সর্বনিম্নের কাছে — সস্তা হতে পারে, তবে কারণ যাচাই করুন:",
    screen_top: "সংখ্যার বিচারে আমাদের সবচেয়ে ভালো রেটিং পাওয়া শেয়ার:",
  } as Record<string, string>,
  sectorLead: (sector: string) => `Top ${sector} stocks by overall quality:`,
  sectorLeadBn: (sector: string) => `${sector} খাতের সেরা মানের শেয়ার:`,
  priceCapLead: (cap: number) => `Decent stocks priced under ৳${cap}:`,
  priceCapLeadBn: (cap: number) => `৳${cap} টাকার নিচে ভালো শেয়ার:`,

  empty: {
    text: "Nothing matches that right now. Want to try something else?",
    bn: "এই মুহূর্তে মিল পাইনি। অন্য কিছু চেষ্টা করবেন?",
  },

  error: {
    text: "I'm having trouble reaching the data right now. Mind trying again?",
    bn: "এই মুহূর্তে তথ্য আনতে সমস্যা হচ্ছে। একটু পরে আবার চেষ্টা করবেন?",
  },

  tips: {
    intro: "A few quick things worth knowing today 👇",
    introBn: "আজ জানার মতো কয়েকটা ছোট কথা 👇",
    none: "No fresh tips right now — check back a little later.",
    seeAll: "See all tips",
  },

  dividends: {
    intro: "Dividends coming up soon:",
    introBn: "শীঘ্রই আসছে এমন লভ্যাংশ:",
    none: "No upcoming dividend dates to show right now.",
  },

  // --- Daily brief (opening message for a returning user) ---
  brief: {
    headline: "Here's your quick brief for today 👋",
    headlineBn: "আজকের সংক্ষিপ্ত খবর — আপনার জন্য 👋",
    streak: (n: number) => `Day ${n} 🔥 — nice, you've checked in ${n} days running.`,
    streakBn: (n: number) => `${n} দিন 🔥 — বাহ, টানা ${n} দিন এসেছেন।`,
    nothingPersonal:
      "Your watchlist and portfolio are quiet today — nothing big moved. Here's the market instead:",
    nothingPersonalBn:
      "আজ আপনার ওয়াচলিস্ট ও পোর্টফোলিও শান্ত — বড় কোনো নড়াচড়া নেই। বদলে বাজারের খবর:",
    loggedOut:
      "Sign in to track your own stocks and get a personal brief every day.",
    loggedOutBn:
      "নিজের শেয়ার ট্র্যাক করতে আর প্রতিদিন ব্যক্তিগত খবর পেতে সাইন ইন করুন।",
    setup:
      "Add a few stocks to your watchlist and I'll keep an eye on them for you every day.",
    setupBn:
      "ওয়াচলিস্টে কয়েকটা শেয়ার যোগ করুন, আমি প্রতিদিন সেগুলোর খবর রাখব।",
    signIn: "Sign in",
  },

  // --- Personalized (the user's own watchlist / portfolio) ---
  mine: {
    watchlistLead: "Here's how your watchlist is doing today:",
    watchlistLeadBn: "আজ আপনার ওয়াচলিস্ট কেমন চলছে:",
    watchlistEmpty: "Your watchlist is empty. Add some stocks and I'll track them here.",
    watchlistEmptyBn: "আপনার ওয়াচলিস্ট খালি। কিছু শেয়ার যোগ করুন, এখানে দেখাব।",
    portfolioLead: "A quick look at your portfolio:",
    portfolioLeadBn: "আপনার পোর্টফোলিও-র দ্রুত একটা চিত্র:",
    portfolioEmpty:
      "You haven't added any holdings yet. Add them to see live profit & loss.",
    portfolioEmptyBn:
      "এখনো কোনো শেয়ার যোগ করেননি। যোগ করলে লাভ-ক্ষতি দেখাব।",
    newsLead: "Latest news on your stocks:",
    newsLeadBn: "আপনার শেয়ারের সর্বশেষ খবর:",
    newsNone: "No fresh news on your stocks right now.",
    newsNoneBn: "এই মুহূর্তে আপনার শেয়ারে নতুন খবর নেই।",
    divLead: "Dividends coming up for your stocks:",
    divLeadBn: "আপনার শেয়ারের জন্য আসছে এমন লভ্যাংশ:",
    divNone: "No upcoming dividends for your watchlist right now.",
    divNoneBn: "এই মুহূর্তে আপনার ওয়াচলিস্টে আসন্ন লভ্যাংশ নেই।",
    signIn:
      "Sign in to build a watchlist and portfolio I can track for you.",
    signInBn:
      "আমি ট্র্যাক করতে পারি এমন ওয়াচলিস্ট ও পোর্টফোলিও বানাতে সাইন ইন করুন।",
  },

  // --- In-chat actions ---
  actions: {
    added: (code: string) => `Added ${code} to your watchlist ⭐`,
    addedBn: (code: string) => `${code} আপনার ওয়াচলিস্টে যোগ হয়েছে ⭐`,
    removed: (code: string) => `Removed ${code} from your watchlist.`,
    removedBn: (code: string) => `${code} ওয়াচলিস্ট থেকে সরানো হয়েছে।`,
    signInToSave: "Sign in to save stocks to your watchlist.",
    signInToSaveBn: "ওয়াচলিস্টে শেয়ার রাখতে সাইন ইন করুন।",
  },

  // --- Follow-up ("what next") chip labels ---
  followups: {
    save: { label: "Save to watchlist", bn: "ওয়াচলিস্টে রাখুন" },
    dividend: { label: "See dividend", bn: "লভ্যাংশ দেখুন" },
    value: { label: "Is it cheap?", bn: "দাম কি সস্তা?" },
    tellMe: { label: "Tell me about", bn: "নিয়ে বলুন" },
    market: { label: "How's the market?", bn: "বাজার কেমন?" },
    top: { label: "Top quality", bn: "সেরা মানের" },
    gainers: { label: "Top gainers", bn: "শীর্ষ বাড়তি" },
    losers: { label: "Top losers", bn: "শীর্ষ পতন" },
    myPortfolio: { label: "My portfolio", bn: "আমার পোর্টফোলিও" },
    myWatchlist: { label: "My watchlist", bn: "আমার ওয়াচলিস্ট" },
    myNews: { label: "News on my stocks", bn: "আমার শেয়ারের খবর" },
  },

  // --- Slot questions (labels mirror the recommendation quiz wording) ---
  slots: {
    strategy: {
      q: "How do you like to pick stocks?",
      qBn: "আপনি কীভাবে শেয়ার বাছাই করতে পছন্দ করেন?",
      chips: [
        { label: "Strong businesses", bn: "শক্তিশালী কোম্পানি", value: "fundamental_strong" },
        { label: "What's moving now", bn: "এখন যা নড়ছে", value: "market_trending" },
      ],
    },
    dividend: {
      q: "Do you want steady dividend income?",
      qBn: "নিয়মিত লভ্যাংশ আয় চান?",
      chips: [
        { label: "Yes, dividends matter", bn: "হ্যাঁ, লভ্যাংশ জরুরি", value: "income_focused" },
        { label: "Not important", bn: "তেমন জরুরি না", value: "doesnt_matter" },
      ],
    },
    risk: {
      q: "Okay with price ups and downs?",
      qBn: "দাম ওঠা-নামায় আপনি স্বাচ্ছন্দ্য?",
      chips: [
        { label: "Keep it steady", bn: "স্থিতিশীল রাখুন", value: "steady" },
        { label: "A balanced mix", bn: "ভারসাম্যপূর্ণ", value: "balanced" },
        { label: "Go for bigger gains", bn: "বেশি লাভের জন্য", value: "aggressive" },
      ],
    },
    sectors: {
      q: "Any industry you prefer? (or skip)",
      qBn: "কোনো খাত পছন্দ আছে? (বা বাদ দিন)",
      anyLabel: "Any industry",
      anyLabelBn: "যেকোনো খাত",
    },
  },

  composerPlaceholder: "Ask in English or বাংলা…",
  seeAll: {
    market: "See full market",
    rankings: "See all rankings",
    insights: "See more",
  },
} as const;

/** Sentinel value for the "Any industry" sector chip. */
export const ANY_SECTOR = "__any__";
