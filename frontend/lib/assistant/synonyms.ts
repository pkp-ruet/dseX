/**
 * Lexicons the parser uses to match free text → intents/entities.
 * Everything is lower-case; matching is word-aware (see parser.ts).
 */
import type { MetricGoal } from "./types";

/**
 * Words that signal each screening goal. English + light Bengali (script and
 * common transliterations) so users can type in বাংলা too.
 */
export const METRIC_WORDS: Record<MetricGoal, string[]> = {
  dividend: ["dividend", "dividends", "income", "payout", "yield", "labangsho", "cash dividend", "লভ্যাংশ", "লাভ্যাংশ", "ডিভিডেন্ড"],
  cheap: ["cheap", "cheapest", "undervalued", "value", "bargain", "discount", "sasta", "underpriced", "low priced", "সস্তা", "কম দাম", "কম দামি", "সস্তা শেয়ার"],
  growth: ["growth", "growing", "fast growing", "high growth", "rising profit", "expanding", "বাড়ছে", "দ্রুত বাড়ছে", "মুনাফা বাড়ছে", "বাড়ন্ত"],
  momentum: ["momentum", "hot", "trending", "moving", "best performing", "top performer", "rising fast", "running", "ট্রেন্ডিং", "আলোচনায়", "গরম", "দ্রুত বাড়ছে এমন"],
  safe: ["safe", "safest", "low risk", "stable", "steady", "secure", "reliable", "blue chip", "bluechip", "defensive", "নিরাপদ", "স্থিতিশীল", "কম ঝুঁকি", "নিরাপদ শেয়ার"],
};

/** Verbs/phrases that mean "recommend something for me". */
export const SUGGEST_WORDS = [
  "suggest", "recommend", "recommendation", "find me", "find stocks", "pick for me",
  "what should i buy", "what to buy", "which stock", "which stocks", "give me ideas",
  "stock ideas", "help me find", "best stock for me", "good stocks to buy",
  "সাজেস্ট", "কোনটা কিনবো", "কী কিনবো", "কোন শেয়ার কিনবো", "আমার জন্য খুঁজুন", "ভালো শেয়ার খুঁজে দিন",
];

/** "How is the market" phrases. */
export const MARKET_WORDS = [
  "market", "dsex", "index", "overall market", "market mood", "market today",
  "how is the market", "how's the market", "market update", "bazar", "today's market",
  "বাজার", "বাজার কেমন", "আজ বাজার", "বাজার আজ", "সূচক", "ডিএসই", "মার্কেট",
];

export const GAINER_WORDS = ["gainer", "gainers", "top gainers", "up today", "rising today", "best today", "winners", "বাড়তি", "আজ বেড়েছে", "শীর্ষ বাড়তি", "সবচেয়ে বেড়েছে"];
export const LOSER_WORDS = ["loser", "losers", "top losers", "down today", "falling today", "worst today", "decliners", "পতন", "কমেছে", "পড়েছে", "শীর্ষ পতন", "সবচেয়ে কমেছে"];
export const ACTIVE_WORDS = ["most traded", "active", "most active", "volume leaders", "turnover", "busiest", "বেশি লেনদেন", "সবচেয়ে লেনদেন"];

export const NEAR_LOW_WORDS = ["near low", "52 week low", "52-week low", "near its low", "yearly low", "bottom", "near bottom", "lowest", "সর্বনিম্নের কাছে", "তলানিতে", "নিচের দিকে"];

/** Words hinting "is this a good buy" for a single stock. */
export const GOOD_BUY_WORDS = ["good buy", "worth buying", "should i buy", "worth it", "good investment", "invest in", "is it good", "buy", "কেনা ভালো", "কিনবো কি", "কেনা উচিত", "ভালো বিনিয়োগ"];

/** P/E lookup words. */
export const PE_WORDS = ["pe", "p/e", "p e", "price earnings", "earnings ratio", "valuation", "পিই", "মূল্যায়ন"];

export const GREETING_WORDS = ["hi", "hii", "hello", "hey", "salam", "assalamu", "good morning", "good evening", "yo", "start", "আসসালামু", "সালাম", "হ্যালো", "হাই", "শুরু"];
export const HELP_WORDS = ["help", "what can you do", "options", "menu", "how does this work", "what do you do", "সাহায্য", "কী করতে পারো", "কি করতে পারো", "মেনু"];

/** "Give me a tip" style requests. */
export const TIP_WORDS = ["tip", "tips", "advice", "stock tip", "any tips", "today's tip", "টিপস", "পরামর্শ", "আজকের টিপস"];

/** Highest-rated / best-quality requests (no specific metric). */
export const TOP_QUALITY_WORDS = [
  "top quality", "top-quality", "top rated", "top-rated", "best rated", "best-rated",
  "best companies", "best stocks", "strongest", "strong companies", "highest rated",
  "best overall", "quality stocks", "top stocks",
  "সেরা শেয়ার", "ভালো শেয়ার", "সেরা মানের", "সবচেয়ে ভালো", "সেরা কোম্পানি",
];

/**
 * Personalized requests about the signed-in user's own holdings. Bare
 * "watchlist"/"portfolio" count too — inside the chat they always mean "mine".
 */
export const MY_WATCHLIST_WORDS = [
  "my watchlist", "watchlist", "my watch list", "amar watchlist", "my list", "my stocks",
  "stocks i follow", "stocks im watching", "stocks i am watching",
  "ওয়াচলিস্ট", "আমার ওয়াচলিস্ট", "আমার তালিকা", "আমার শেয়ারগুলো",
];
export const MY_PORTFOLIO_WORDS = [
  "my portfolio", "portfolio", "my holdings", "holdings", "stocks i own", "what i own",
  "my shares", "profit and loss", "p&l", "pnl", "my profit", "my loss", "how am i doing",
  "পোর্টফোলিও", "আমার পোর্টফোলিও", "আমার শেয়ার", "লাভ ক্ষতি", "লাভ-ক্ষতি",
];
/** Possessive markers used (with "news"/"dividend") to scope to the user. */
export const MINE_CONTEXT = ["my", "mine", "i own", "i follow", "watchlist", "portfolio", "holding", "holdings", "আমার", "ওয়াচলিস্ট", "পোর্টফোলিও"];
export const NEWS_WORDS = ["news", "headline", "headlines", "update", "updates", "খবর", "সংবাদ"];

/** Phrases that mean "the dividend calendar" rather than "high-dividend stocks". */
export const UPCOMING_DIV_PHRASES = [
  "record date", "ex dividend", "ex-dividend", "upcoming dividend", "dividend date",
  "dividend calendar", "dividend schedule",
];
export const UPCOMING_DIV_CONTEXT = ["upcoming", "coming", "soon", "schedule", "calendar", "next"];

/**
 * Sector aliases → a lower-case substring tested against the raw DSE sector
 * string, plus a friendly display label. Short/ambiguous aliases (e.g. "it")
 * require a nearby context word — see needsContext.
 */
export interface SectorAlias {
  aliases: string[];
  match: string;
  label: string;
  /** Aliases here only count when next to "stock(s)/share(s)/sector/company". */
  needsContext?: boolean;
}

export const SECTOR_ALIASES: SectorAlias[] = [
  { aliases: ["bank", "banks", "banking"], match: "bank", label: "Bank" },
  { aliases: ["pharma", "pharmaceutical", "pharmaceuticals", "medicine", "drug", "drugs"], match: "pharma", label: "Pharma" },
  { aliases: ["insurance", "insurer", "insurers"], match: "insurance", label: "Insurance" },
  { aliases: ["telecom", "telco", "telecommunication", "mobile operator"], match: "telecom", label: "Telecom" },
  { aliases: ["fuel", "power", "energy", "electricity"], match: "fuel", label: "Fuel & Power" },
  { aliases: ["food", "fmcg", "consumer"], match: "food", label: "Food & Allied" },
  { aliases: ["textile", "textiles", "garments", "rmg", "spinning"], match: "textile", label: "Textile" },
  { aliases: ["cement"], match: "cement", label: "Cement" },
  { aliases: ["engineering", "engineer"], match: "engineering", label: "Engineering" },
  { aliases: ["ceramic", "ceramics"], match: "ceramic", label: "Ceramics" },
  { aliases: ["tannery", "leather"], match: "tannery", label: "Tannery" },
  { aliases: ["financial institution", "nbfi", "leasing", "finance company"], match: "financial", label: "Financial Institutions" },
  { aliases: ["it", "tech", "technology", "software", "information technology"], match: "it", label: "IT", needsContext: true },
];

export const SECTOR_CONTEXT_WORDS = ["stock", "stocks", "share", "shares", "sector", "company", "companies", "industry"];
