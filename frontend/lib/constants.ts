export const TIER_THRESHOLDS = {
  STRONG_BUY:    80,
  GOOD_BUY:      70,
  SAFE_BUY:      60,
  KEEP_WATCHING: 50,
};

export const TIER_LABELS = {
  strong_buy:    "Strong Buy",
  good_buy:      "Good Buy",
  safe_buy:      "Safe Buy",
  keep_watching: "Hold",
  avoid:         "Avoid",
} as const;

export const TIER_COLORS = {
  strong_buy:    "#4ADE80",
  good_buy:      "#34D399",
  safe_buy:      "#60A5FA",
  keep_watching: "#FBBF24",
  avoid:         "#F87171",
} as const;

export type TierKey = keyof typeof TIER_LABELS;

export const TIER_SCORE_LABELS: Record<TierKey, string> = {
  strong_buy:    "Score ≥ 80",
  good_buy:      "Score 70–79",
  safe_buy:      "Score 60–69",
  keep_watching: "Score 50–59",
  avoid:         "Score < 50",
};

export function getTier(score: number | null | undefined): TierKey {
  if (score == null) return "avoid";
  if (score >= TIER_THRESHOLDS.STRONG_BUY)    return "strong_buy";
  if (score >= TIER_THRESHOLDS.GOOD_BUY)      return "good_buy";
  if (score >= TIER_THRESHOLDS.SAFE_BUY)      return "safe_buy";
  if (score >= TIER_THRESHOLDS.KEEP_WATCHING) return "keep_watching";
  return "avoid";
}
