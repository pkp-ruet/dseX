// ---------------------------------------------------------------------------
// Fundamental-strength tiers — describe how strong the company is, nothing
// else. Action advice is the separate Buy/Sell signal below (computed
// by the backend signal service; the frontend only renders it).
// Mirrors backend/services/tiers.py — keep the two in sync.
// ---------------------------------------------------------------------------

export const TIER_THRESHOLDS = {
  EXCELLENT: 75,
  GOOD:      60,
  AVERAGE:   45,
};

export const TIER_LABELS = {
  excellent: "Excellent",
  good:      "Good",
  average:   "Average",
  weak:      "Weak",
} as const;

export type TierKey = keyof typeof TIER_LABELS;

/** Bengali tier words — mirrors backend TIER_WORDS_BN. */
export const TIER_LABELS_BN: Record<TierKey, string> = {
  excellent: "চমৎকার",
  good:      "ভালো",
  average:   "মাঝারি",
  weak:      "দুর্বল",
};

export const TIER_COLORS = {
  excellent: "#047857",
  good:      "#185FA5",   // true blue — distinct from emerald Excellent + indigo primary
  average:   "#B45309",
  weak:      "#DC2626",
} as const;

/** Canonical tier → CSS-token color. Use this everywhere (badges, pills,
 *  tables, charts) so tier coloring stays consistent with the palette. */
export const TIER_VAR: Record<TierKey, string> = {
  excellent: "var(--tier-excellent)",
  good:      "var(--tier-good)",
  average:   "var(--tier-average)",
  weak:      "var(--tier-weak)",
};

export const TIER_SCORE_LABELS: Record<TierKey, string> = {
  excellent: "Score 75–100",
  good:      "Score 60–74",
  average:   "Score 45–59",
  weak:      "Score < 45",
};

/** Letter grade per tier — instantly readable, language-independent (A best → D worst). */
export const TIER_GRADES: Record<TierKey, string> = {
  excellent: "A",
  good:      "B",
  average:   "C",
  weak:      "D",
};

/** One-line plain-English meaning of each tier — no finance jargon. */
export const TIER_MEANINGS: Record<TierKey, string> = {
  excellent: "Financially strongest",
  good:      "Solid and healthy",
  average:   "Mixed — look closer",
  weak:      "High risk",
};

/** Bengali meaning line — mirrors TIER_MEANINGS. */
export const TIER_MEANINGS_BN: Record<TierKey, string> = {
  excellent: "সবচেয়ে মজবুত ব্যবসা",
  good:      "ভালো ও সুস্থ",
  average:   "মিশ্র — দেখে নিন",
  weak:      "ঝুঁকি বেশি",
};

export function getTier(score: number | null | undefined): TierKey {
  if (score == null) return "weak";
  if (score >= TIER_THRESHOLDS.EXCELLENT) return "excellent";
  if (score >= TIER_THRESHOLDS.GOOD)      return "good";
  if (score >= TIER_THRESHOLDS.AVERAGE)   return "average";
  return "weak";
}

// ---------------------------------------------------------------------------
// Buy / Sell signal — backend-computed single source of truth
// (backend/services/signal_service.py). The frontend NEVER derives buy/sell
// advice itself; it renders what the API sends. There is no "Hold": anything
// neutral arrives as `none` and renders no chip.
//   Stock-level:   buy | sell   (null/none = no signal)
//   Holding-level: buy_more | sell   (personalized, portfolio API; else none)
// ---------------------------------------------------------------------------

export type StockSignalKind   = "buy" | "sell";
export type HoldingSignalKind = "buy_more" | "sell";
export type AnySignalKind     = StockSignalKind | HoldingSignalKind;

export const SIGNAL_LABELS: Record<AnySignalKind, string> = {
  buy:      "Buy",
  buy_more: "Buy More",
  sell:     "Sell",
};

/** Bengali signal words — mirrors backend SIGNAL_WORDS_BN. */
export const SIGNAL_LABELS_BN: Record<AnySignalKind, string> = {
  buy:      "কেনা যায়",
  buy_more: "আরও কিনুন",
  sell:     "বিক্রি করুন",
};

export const SIGNAL_VAR: Record<AnySignalKind, string> = {
  buy:      "var(--positive)",
  buy_more: "var(--positive)",
  sell:     "var(--negative)",
};

// Conviction — the backend upgrades a cheap Buy to "strong" when the stock is
// deeply cheap AND still low in its 52-week range. The UI shows only Buy or
// Strong Buy (Sell is computed but hidden for now).
export const STRONG_BUY_LABEL = "Strong Buy";
export const STRONG_BUY_LABEL_BN = "জোরালো কেনা যায়";
