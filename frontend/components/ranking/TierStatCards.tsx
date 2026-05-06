import { TIER_LABELS, TIER_SCORE_LABELS, type TierKey } from "@/lib/constants";

interface Props {
  counts: Record<string, number>;
  total: number;
}

const CARD_META: Record<TierKey, { colorClass: string; countColor: string }> = {
  strong_buy:    { colorClass: "tier-stat-card--strong",        countColor: "#4ADE80" },
  good_buy:      { colorClass: "tier-stat-card--good",          countColor: "#34D399" },
  safe_buy:      { colorClass: "tier-stat-card--safe",          countColor: "#60A5FA" },
  keep_watching: { colorClass: "tier-stat-card--keep-watching", countColor: "#FBBF24" },
  avoid:         { colorClass: "tier-stat-card--avoid",         countColor: "#F87171" },
};

const TIERS: TierKey[] = ["strong_buy", "good_buy", "safe_buy", "keep_watching", "avoid"];

export default function TierStatCards({ counts, total }: Props) {
  return (
    <div className="tier-stat-grid">
      {TIERS.map((tier) => {
        const count = counts[tier] ?? 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const { colorClass, countColor } = CARD_META[tier];
        return (
          <div key={tier} className={`tier-stat-card ${colorClass}`}>
            <span className="tier-stat-accent" style={{ background: countColor }} />
            <div className="tier-stat-label">{TIER_LABELS[tier]}</div>
            <div
              className="tier-stat-count"
              style={{ color: countColor, textShadow: `0 6px 20px ${countColor}33` }}
            >
              {count}
            </div>
            <div className="tier-stat-range">{TIER_SCORE_LABELS[tier]}</div>
            <div className="tier-stat-pct">{pct}% of {total}</div>
          </div>
        );
      })}
    </div>
  );
}
