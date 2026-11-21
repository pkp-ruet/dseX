/**
 * THE Premium line (2026-11-22, plan https://claude.ai/artifact/T2ca745okDEF7YUutwAWM1):
 *
 *   The market is free to look at. Your shares and our judgement are Premium.
 *
 * Mirror of backend `services/premium_line.py` — `AREAS` here must equal its
 * `AREAS` (backend/tests/test_agreement.py parses the literal below as JSON,
 * so keep it plain JSON: double quotes, no comments or trailing commas
 * inside it). A plain module (no "use client") so server pages can read it.
 * Step 1 is behaviour-neutral: each area says what a free reader sees today;
 * the later steps change one area at a time, with its pages.
 */

export type Layer = "market" | "money" | "shares" | "judgement";
export type Shape = "open" | "limit" | "meter" | "week" | "count_one" | "count" | "locked";
export type Period = "day" | "week" | "month" | null;
export type Area = { layer: Layer; free: Shape; n: number | null; per: Period };

export const LINE_RULE = {
  en: "The market is free to look at. Your shares and our judgement are Premium.",
  bn: "বাজার দেখা ফ্রি। আপনার শেয়ার আর আমাদের বিচার প্রিমিয়ামে।",
};

export const LAYER_WORDS: Record<Layer, { en: string; bn: string }> = {
  market: { en: "The market", bn: "বাজার" },
  money: { en: "Your money", bn: "আপনার টাকা" },
  shares: { en: "Your shares", bn: "আপনার শেয়ার" },
  judgement: { en: "Our judgement", bn: "আমাদের বিচার" },
};

export const AREAS = {
  "market_today": { "layer": "market", "free": "open", "n": null, "per": null },
  "results": { "layer": "market", "free": "open", "n": null, "per": null },
  "ranking": { "layer": "market", "free": "open", "n": null, "per": null },
  "sectors": { "layer": "market", "free": "open", "n": null, "per": null },
  "dividend_calendar": { "layer": "market", "free": "week", "n": 7, "per": null },
  "compare": { "layer": "market", "free": "limit", "n": 10, "per": null },
  "screener": { "layer": "market", "free": "open", "n": null, "per": null },
  "portfolio": { "layer": "money", "free": "open", "n": null, "per": null },
  "portfolios": { "layer": "money", "free": "limit", "n": 1, "per": null },
  "watchlist": { "layer": "money", "free": "open", "n": null, "per": null },
  "your_dividends": { "layer": "shares", "free": "count", "n": null, "per": null },
  "updates": { "layer": "shares", "free": "count_one", "n": 1, "per": "week" },
  "stories": { "layer": "shares", "free": "count_one", "n": 1, "per": null },
  "pushes": { "layer": "shares", "free": "limit", "n": 1, "per": "week" },
  "brief": { "layer": "shares", "free": "locked", "n": null, "per": null },
  "watch_rules": { "layer": "shares", "free": "limit", "n": 3, "per": null },
  "reminders": { "layer": "shares", "free": "locked", "n": null, "per": null },
  "analysis": { "layer": "judgement", "free": "meter", "n": 10, "per": "month" },
  "portfolio_check": { "layer": "judgement", "free": "count", "n": null, "per": null },
  "compare_analysis": { "layer": "judgement", "free": "locked", "n": null, "per": null },
  "screener_lists": { "layer": "judgement", "free": "count", "n": null, "per": null },
  "saved_screens": { "layer": "judgement", "free": "locked", "n": null, "per": null },
  "buy_list": { "layer": "judgement", "free": "count_one", "n": 1, "per": null },
  "for_you": { "layer": "judgement", "free": "count", "n": null, "per": null },
  "research": { "layer": "judgement", "free": "count", "n": null, "per": null },
  "ai": { "layer": "judgement", "free": "limit", "n": 10, "per": "day" }
} satisfies Record<string, Area>;

export type AreaKey = keyof typeof AREAS;

/** The showcase (step 6): five household names whose full analysis is open to
 *  everyone and to search engines. Mirror of backend `premium_line.SHOWCASE`. */
export const SHOWCASE = ["GP", "SQURPHARMA", "BRACBANK", "BATBC", "WALTONHIL"];

export function isShowcase(code: string | null | undefined): boolean {
  return !!code && SHOWCASE.includes(code.toUpperCase());
}

/** How many a free reader gets, in the `limits` sense: null = no cap (open),
 *  0 = none (locked, or only a count). Same rule as backend `free_n`. */
export function freeN(key: AreaKey): number | null {
  const a: Area = AREAS[key];
  if (a.free === "open") return null;
  if (a.free === "locked" || a.free === "count") return 0;
  return a.n;
}

/** What this reader sees of an area: Premium sees everything. */
export function lineView(key: AreaKey, premium: boolean): Area {
  const a: Area = AREAS[key];
  return premium ? { layer: a.layer, free: "open", n: null, per: null } : a;
}
