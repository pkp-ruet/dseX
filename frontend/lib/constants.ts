export const TIER_THRESHOLDS = {
  STRONG_BUY:    75,
  BUY:           60,
  KEEP_WATCHING: 45,
};

export const TIER_LABELS = {
  strong_buy:    "Strong Buy",
  buy:           "Buy",
  keep_watching: "Wait & Watch",
  avoid:         "Risky",
} as const;

export const TIER_COLORS = {
  strong_buy:    "#047857",
  buy:           "#059669",
  keep_watching: "#B45309",
  avoid:         "#DC2626",
} as const;

export type TierKey = keyof typeof TIER_LABELS;

/** Canonical tier → CSS-token color. Use this everywhere (badges, pills,
 *  tables, charts) so tier coloring stays consistent with the palette. */
export const TIER_VAR: Record<TierKey, string> = {
  strong_buy:    "var(--strong-buy)",
  buy:           "var(--np-good)",
  keep_watching: "var(--watch)",
  avoid:         "var(--negative)",
};

export const TIER_SCORE_LABELS: Record<TierKey, string> = {
  strong_buy:    "Score 75–100",
  buy:           "Score 60–74",
  keep_watching: "Score 45–59",
  avoid:         "Score < 45",
};

export function getTier(score: number | null | undefined): TierKey {
  if (score == null) return "avoid";
  if (score >= TIER_THRESHOLDS.STRONG_BUY)    return "strong_buy";
  if (score >= TIER_THRESHOLDS.BUY)           return "buy";
  if (score >= TIER_THRESHOLDS.KEEP_WATCHING) return "keep_watching";
  return "avoid";
}
