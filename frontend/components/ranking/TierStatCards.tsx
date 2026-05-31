import { TIER_LABELS, TIER_SCORE_LABELS, type TierKey } from "@/lib/constants";

interface Props {
  counts: Record<string, number>;
  total: number;
}

const CARD_META: Record<TierKey, { colorClass: string; countColor: string }> = {
  strong_buy:    { colorClass: "tier-stat-card--strong",        countColor: "var(--strong-buy)" },
  buy:           { colorClass: "tier-stat-card--good",          countColor: "var(--positive)" },
  keep_watching: { colorClass: "tier-stat-card--keep-watching", countColor: "var(--watch)" },
  avoid:         { colorClass: "tier-stat-card--avoid",         countColor: "var(--negative)" },
};

const TIERS: TierKey[] = ["strong_buy", "buy", "keep_watching", "avoid"];

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
              style={{ color: countColor }}
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
