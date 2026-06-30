/**
 * TopStock AI assistant — shared types for the rule-based chat screener.
 * Pure TS, no React. The "brain" (parser/responders) and the UI both import these.
 */
import type { RecommendationAnswers, RecommendedStock } from "@/lib/api";

export type Sender = "bot" | "user";

/** Every thing the bot can resolve a message to. */
export type IntentId =
  | "greeting"
  | "help"
  | "fallback"
  | "market_pulse"
  | "movers_gainers"
  | "movers_losers"
  | "movers_active"
  | "stock_detail"
  | "stock_good_buy"
  | "stock_dividend"
  | "stock_pe"
  | "stock_cheap"
  | "screen_cheap"
  | "screen_dividend"
  | "screen_safe"
  | "screen_growth"
  | "screen_momentum"
  | "screen_near_low"
  | "screen_sector"
  | "screen_price_cap"
  | "screen_top"
  | "tips"
  | "dividends"
  | "suggest_stocks"
  // Personalized — read the signed-in user's own watchlist / portfolio.
  | "my_watchlist"
  | "my_portfolio"
  | "my_news"
  | "my_dividends";

export interface CompanyRef {
  trading_code: string;
  company_name: string | null;
}

export type MetricGoal = "dividend" | "cheap" | "growth" | "momentum" | "safe";

export interface Entities {
  /** Resolved trading code (single, confident match). */
  code?: string;
  /** When a ticker/name is ambiguous, the closest matches for "did you mean". */
  candidates?: CompanyRef[];
  /** A sector the user named — the display label (e.g. "Bank", "Pharma"). */
  sector?: string;
  /** Lower-cased substring used to match the raw DSE sector string. */
  sectorMatch?: string;
  /** Price ceiling parsed from e.g. "under 50". */
  priceCap?: number;
  /** Screening goal extracted from the text. */
  metric?: MetricGoal;
}

export interface ParseResult {
  intent: IntentId;
  entities: Entities;
  /** 0–1 rough confidence — low values fall through to chips. */
  confidence: number;
  raw: string;
}

export type MetricTone = "pos" | "neg" | "neutral";

/** A single row in a stock-list block (reuses the .intel-row visual language). */
export interface StockRow {
  trading_code: string;
  company_name?: string | null;
  ltp: number | null;
  change_pct: number | null;
  /** Pre-formatted metric string shown in the right column. */
  metricValue: string;
  metricTone?: MetricTone;
}

export interface MarketSummaryView {
  date: string | null;
  dsex: number | null;
  dsexChangePct: number | null;
  condition: "rising" | "falling" | "sideways" | "unknown";
  up: number | null;
  down: number | null;
  neutral: number | null;
  marketOpen: boolean;
  closedNote?: string;
  /** One plain-English sentence summing up the day. */
  line: string;
}

export interface StockFact {
  label: string;
  value: string;
  tone?: MetricTone;
}

/** One tappable line in the daily-brief block (mirrors the home "what's new" bell). */
export interface BriefRow {
  emoji: string;
  title: string;
  detail?: string;
  href?: string;
  tone?: MetricTone;
}

export interface StockDetailView {
  code: string;
  name: string | null;
  sector: string | null;
  ltp: number | null;
  changePct: number | null;
  score: number | null;
  /** verdict.tagline — already plain English. */
  tagline: string | null;
  green: string[];
  red: string[];
  facts: StockFact[];
  stale?: boolean;
}

/** A tappable suggestion. Exactly one of send/slot/action/client drives behavior. */
export interface Chip {
  label: string;
  /** Optional Bengali label shown beneath the English one (audience is bilingual). */
  labelBn?: string;
  emoji?: string;
  /** Re-enter the parser as if the user typed this. */
  send?: string;
  /** Answer a slot question in the "suggest stocks" flow. */
  slot?: { key: SlotKey; value: string };
  /** Jump straight to an intent, skipping the parser. */
  action?: { intentId: IntentId; entities?: Entities };
  /** Perform a client-side action (e.g. add/remove watchlist) without the parser. */
  client?: { kind: "watchlist_toggle"; code: string };
}

/** Slots collected by the guided "suggest stocks" flow. */
export type SlotKey = "strategy" | "dividend" | "risk" | "sectors";

export type MessageBlock =
  | { type: "text"; text: string; bn?: string; link?: { href: string; label: string } }
  | { type: "chips"; chips: Chip[]; layout?: "wrap" | "scroll" }
  | {
      type: "stock-list";
      title: string;
      subtitle?: string;
      metricLabel: string;
      items: StockRow[];
      seeAllHref?: string;
      seeAllLabel?: string;
    }
  | { type: "recommended-list"; picks: RecommendedStock[]; relaxations: string[] }
  | { type: "market-summary"; view: MarketSummaryView }
  | { type: "stock-detail"; view: StockDetailView }
  | { type: "brief"; rows: BriefRow[] }
  | { type: "loading" }
  | { type: "disclaimer" };

export interface Message {
  id: string;
  sender: Sender;
  blocks: MessageBlock[];
  ts: number;
}

/** Guided "suggest stocks" conversation state. */
export interface SuggestState {
  active: boolean;
  stepIndex: number;
  collected: Partial<RecommendationAnswers>;
}

export const EMPTY_SUGGEST: SuggestState = {
  active: false,
  stepIndex: 0,
  collected: {},
};
