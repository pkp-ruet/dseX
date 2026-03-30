export const TIER_THRESHOLDS = {
  STRONG_BUY: 75,
  SAFE_BUY: 55,
  WATCH: 35,
};

export const TIER_LABELS = {
  strong_buy: "Strong Buy",
  safe_buy: "Safe Buy",
  watch: "Watch",
  avoid: "Avoid",
} as const;

export const TIER_COLORS = {
  strong_buy: "#2D6A3F",
  safe_buy: "#1A4D6B",
  watch: "#7A5C00",
  avoid: "#8B2020",
} as const;

export const SCORE_BG_COLORS = {
  strong: "#D4EDDA",
  safe: "#CCE5F5",
  watch: "#FFF3CD",
  avoid: "#F8D7DA",
} as const;

export type TierKey = keyof typeof TIER_LABELS;

/** Score band labels (matches views/home.py tier headers) */
export const TIER_SCORE_LABELS: Record<TierKey, string> = {
  strong_buy: "Score ≥ 75",
  safe_buy: "Score 55–74",
  watch: "Score 35–54",
  avoid: "Score < 35",
};

export function getTier(score: number | null | undefined): TierKey {
  if (score == null) return "avoid";
  if (score >= TIER_THRESHOLDS.STRONG_BUY) return "strong_buy";
  if (score >= TIER_THRESHOLDS.SAFE_BUY) return "safe_buy";
  if (score >= TIER_THRESHOLDS.WATCH) return "watch";
  return "avoid";
}
