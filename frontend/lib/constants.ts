export const TIER_THRESHOLDS = {
  STRONG_BUY:    80,
  GOOD_BUY:      70,
  SAFE_BUY:      65,
  CAUTIOUS_BUY:  60,
  KEEP_WATCHING: 50,
};

export const TIER_LABELS = {
  strong_buy:    "Strong Buy",
  good_buy:      "Good Buy",
  safe_buy:      "Safe Buy",
  cautious_buy:  "Cautious Buy",
  keep_watching: "Keep Watching",
  avoid:         "Avoid",
} as const;

export const TIER_COLORS = {
  strong_buy:    "#065F46",
  good_buy:      "#0F766E",
  safe_buy:      "#1E40AF",
  cautious_buy:  "#5B21B6",
  keep_watching: "#92400E",
  avoid:         "#991B1B",
} as const;

export type TierKey = keyof typeof TIER_LABELS;

export const TIER_SCORE_LABELS: Record<TierKey, string> = {
  strong_buy:    "Score ≥ 80",
  good_buy:      "Score 70–79",
  safe_buy:      "Score 65–69",
  cautious_buy:  "Score 60–64",
  keep_watching: "Score 50–59",
  avoid:         "Score < 50",
};

export function getTier(score: number | null | undefined): TierKey {
  if (score == null) return "avoid";
  if (score >= TIER_THRESHOLDS.STRONG_BUY)    return "strong_buy";
  if (score >= TIER_THRESHOLDS.GOOD_BUY)      return "good_buy";
  if (score >= TIER_THRESHOLDS.SAFE_BUY)      return "safe_buy";
  if (score >= TIER_THRESHOLDS.CAUTIOUS_BUY)  return "cautious_buy";
  if (score >= TIER_THRESHOLDS.KEEP_WATCHING) return "keep_watching";
  return "avoid";
}
