// ---------------------------------------------------------------------------
// Fundamental-strength tiers — describe how strong the company is, nothing
// else. Action advice is the separate Buy/Hold/Sell signal below (computed
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
  good:      "#059669",
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

export function getTier(score: number | null | undefined): TierKey {
  if (score == null) return "weak";
  if (score >= TIER_THRESHOLDS.EXCELLENT) return "excellent";
  if (score >= TIER_THRESHOLDS.GOOD)      return "good";
  if (score >= TIER_THRESHOLDS.AVERAGE)   return "average";
  return "weak";
}

// ---------------------------------------------------------------------------
// Buy / Hold / Sell signal — backend-computed single source of truth
// (backend/services/signal_service.py). The frontend NEVER derives buy/sell
// advice itself; it renders what the API sends.
//   Stock-level:   buy | hold | sell   (null/none = not rated)
//   Holding-level: buy_more | hold | sell (personalized, portfolio API)
// ---------------------------------------------------------------------------

export type StockSignalKind   = "buy" | "hold" | "sell";
export type HoldingSignalKind = "buy_more" | "hold" | "sell";
export type AnySignalKind     = StockSignalKind | HoldingSignalKind;

export const SIGNAL_LABELS: Record<AnySignalKind, string> = {
  buy:      "Buy",
  buy_more: "Buy More",
  hold:     "Hold",
  sell:     "Sell",
};

/** Bengali signal words — mirrors backend SIGNAL_WORDS_BN. */
export const SIGNAL_LABELS_BN: Record<AnySignalKind, string> = {
  buy:      "কেনা যায়",
  buy_more: "আরও কিনুন",
  hold:     "ধরে রাখুন",
  sell:     "বিক্রি করুন",
};

export const SIGNAL_VAR: Record<AnySignalKind, string> = {
  buy:      "var(--positive)",
  buy_more: "var(--positive)",
  hold:     "var(--watch)",
  sell:     "var(--negative)",
};
