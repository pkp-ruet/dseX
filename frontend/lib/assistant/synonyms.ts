/**
 * Lexicons the parser uses to match free text → intents/entities.
 * Everything is lower-case; matching is word-aware (see parser.ts).
 */
import type { MetricGoal } from "./types";

/** Words that signal each screening goal. */
export const METRIC_WORDS: Record<MetricGoal, string[]> = {
  dividend: ["dividend", "dividends", "income", "payout", "yield", "labangsho", "cash dividend"],
  cheap: ["cheap", "cheapest", "undervalued", "value", "bargain", "discount", "sasta", "underpriced", "low priced"],
  growth: ["growth", "growing", "fast growing", "high growth", "rising profit", "expanding"],
  momentum: ["momentum", "hot", "trending", "moving", "best performing", "top performer", "rising fast", "running"],
  safe: ["safe", "safest", "low risk", "stable", "steady", "secure", "reliable", "blue chip", "bluechip", "defensive"],
};

/** Verbs/phrases that mean "recommend something for me". */
export const SUGGEST_WORDS = [
  "suggest", "recommend", "recommendation", "find me", "find stocks", "pick for me",
  "what should i buy", "what to buy", "which stock", "which stocks", "give me ideas",
  "stock ideas", "help me find", "best stock for me", "good stocks to buy",
];

/** "How is the market" phrases. */
export const MARKET_WORDS = [
  "market", "dsex", "index", "overall market", "market mood", "market today",
  "how is the market", "how's the market", "market update", "bazar", "today's market",
];

export const GAINER_WORDS = ["gainer", "gainers", "top gainers", "up today", "rising today", "best today", "winners"];
export const LOSER_WORDS = ["loser", "losers", "top losers", "down today", "falling today", "worst today", "decliners"];
export const ACTIVE_WORDS = ["most traded", "active", "most active", "volume leaders", "turnover", "busiest"];

export const NEAR_LOW_WORDS = ["near low", "52 week low", "52-week low", "near its low", "yearly low", "bottom", "near bottom", "lowest"];

/** Words hinting "is this a good buy" for a single stock. */
export const GOOD_BUY_WORDS = ["good buy", "worth buying", "should i buy", "worth it", "good investment", "invest in", "is it good", "buy"];

/** P/E lookup words. */
export const PE_WORDS = ["pe", "p/e", "p e", "price earnings", "earnings ratio", "valuation"];

export const GREETING_WORDS = ["hi", "hii", "hello", "hey", "salam", "assalamu", "good morning", "good evening", "yo", "start"];
export const HELP_WORDS = ["help", "what can you do", "options", "menu", "how does this work", "what do you do"];

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
