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

/**
 * Hex twins of the `--tier-*` tokens in `app/globals.css :root` — for the
 * Satori OG-image routes ONLY (the opengraph-image.tsx routes), which cannot read
 * CSS variables. Every UI component uses `TIER_VAR` or the `text-tier-*`
 * utilities instead. Keep these four values in step with globals.css.
 */
export const TIER_COLORS: Record<TierKey, string> = {
  excellent: "#047857", // Satori OG image only
  good:      "#46687F", // Satori OG image only
  average:   "#5A6577", // Satori OG image only
  weak:      "#B91C1C", // Satori OG image only
};

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

/** One-line plain-English meaning of each tier, in plain words. */
export const TIER_MEANINGS: Record<TierKey, string> = {
  excellent: "Among the strongest companies",
  good:      "A sound, healthy company",
  average:   "Mixed results, worth a closer look",
  weak:      "Higher risk than most",
};

/** Bengali meaning line — mirrors TIER_MEANINGS. */
export const TIER_MEANINGS_BN: Record<TierKey, string> = {
  excellent: "সবচেয়ে শক্ত কোম্পানিগুলোর একটি",
  good:      "ভালো ও সুস্থ কোম্পানি",
  average:   "ফল মিশ্র, ভালো করে দেখে নেওয়া দরকার",
  weak:      "অন্যদের চেয়ে ঝুঁকি বেশি",
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
  buy_more: "Buy more",
  sell:     "Sell",
};

/** Bengali signal words — mirrors backend SIGNAL_WORDS_BN. */
export const SIGNAL_LABELS_BN: Record<AnySignalKind, string> = {
  buy:      "কেনা যায়",
  buy_more: "আরও কেনা যায়",
  sell:     "বিক্রি করুন",
};

export const SIGNAL_VAR: Record<AnySignalKind, string> = {
  buy:      "var(--positive)",
  buy_more: "var(--positive)",
  sell:     "var(--negative)",
};

// The price word on a Buy (2026-10-31: "Strong buy" was retired — what made a
// Buy "strong" was only the price, so the price says it). The backend's
// `strength: "strong"` (deeply cheap AND low in its yearly range) reads
// "Very low price", an Excellent company at a middle price "Fair price", every
// other Buy "Low price". Mirrors backend `signal_service.price_word`.
export type PriceWordKey = "very_low" | "low" | "fair";

export const PRICE_WORDS: Record<PriceWordKey, { en: string; bn: string; short: { en: string; bn: string } }> = {
  very_low: { en: "Very low price", bn: "খুব কম দাম", short: { en: "Very low", bn: "খুব কম" } },
  low:      { en: "Low price", bn: "কম দাম", short: { en: "Low", bn: "কম" } },
  fair:     { en: "Fair price", bn: "ন্যায্য দাম", short: { en: "Fair", bn: "ন্যায্য" } },
};

/** The price word of a Buy signal; null for anything that isn't a Buy. */
export function priceWordKey(
  sig: { signal?: string | null; strength?: string | null; reason_key?: string | null } | null | undefined,
): PriceWordKey | null {
  if (!sig || sig.signal !== "buy") return null;
  if (sig.strength === "strong") return "very_low";
  if (sig.reason_key === "excellent_fair_price") return "fair";
  return "low";
}
