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

/** The four grades, named by what the company is like on our five checks
 *  (2026-10-31, after the company ranking redesign): THE label for a grade
 *  everywhere a reader sees one. The old words (Excellent / Good / Average /
 *  Weak) are retired from the screen; the keys stay. Mirrors backend
 *  tiers.TIER_WORDS. */
export const TIER_LABELS = {
  excellent: "Strong all round",
  good:      "Mostly strong",
  average:   "Mixed",
  weak:      "Mostly weak",
} as const;

export type TierKey = keyof typeof TIER_LABELS;

/** Bengali grade names — mirrors backend TIER_WORDS_BN. */
export const TIER_LABELS_BN: Record<TierKey, string> = {
  excellent: "সব দিকে শক্তিশালী",
  good:      "বেশিরভাগ দিকে শক্তিশালী",
  average:   "মিশ্র",
  weak:      "বেশিরভাগ দিকে দুর্বল",
};

/** Shorter Bengali names for the pill only (table rows, the sticky bar),
 *  where the full name would wrap. Sentences use TIER_LABELS_BN. */
export const TIER_PILL_BN: Record<TierKey, string> = {
  excellent: "সব দিকে শক্তিশালী",
  good:      "বেশ শক্তিশালী",
  average:   "মিশ্র",
  weak:      "বেশ দুর্বল",
};

/** A grade name for running text, lower-case in English ("is mostly strong"). */
export function tierWords(t: TierKey): { en: string; bn: string } {
  return { en: TIER_LABELS[t].toLowerCase(), bn: TIER_LABELS_BN[t] };
}

/** "Mostly strong or better": the two top grades together, for counts. */
export const GOOD_OR_BETTER = { en: "mostly strong or better", bn: "বেশিরভাগ দিকে শক্তিশালী বা তার বেশি" };

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

/** What each grade means on our five checks — the line under its name. */
export const TIER_MEANINGS: Record<TierKey, string> = {
  excellent: "Strong on 4 or 5 of our 5 checks",
  good:      "Strong on 2 or 3 checks, weak on none",
  average:   "Strong on 1 or 2 checks, weak on some",
  weak:      "Weak on several checks",
};

/** Bengali meaning line — mirrors TIER_MEANINGS. */
export const TIER_MEANINGS_BN: Record<TierKey, string> = {
  excellent: "আমাদের 5টি যাচাইয়ের 4 বা 5টিতে শক্তিশালী",
  good:      "2 বা 3টি যাচাইয়ে শক্তিশালী, কোনোটিতে দুর্বল নয়",
  average:   "1 বা 2টি যাচাইয়ে শক্তিশালী, কয়েকটিতে দুর্বল",
  weak:      "কয়েকটি যাচাইয়ে দুর্বল",
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
