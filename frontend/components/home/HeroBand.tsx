import { TIER_LABELS, type TierKey } from "@/lib/constants";

interface Props {
  counts: Record<string, number>;
}

const TIERS: TierKey[] = ["strong_buy", "good_buy", "safe_buy", "cautious_buy", "keep_watching", "avoid"];

const PILL_CLASS: Record<TierKey, string> = {
  strong_buy:    "hero-score-pill hero-pill-top",
  good_buy:      "hero-score-pill hero-pill-good",
  safe_buy:      "hero-score-pill hero-pill-mid",
  cautious_buy:  "hero-score-pill hero-pill-cautious",
  keep_watching: "hero-score-pill hero-pill-watch",
  avoid:         "hero-score-pill hero-pill-danger",
};

export default function HeroBand({ counts }: Props) {
  return (
    <div className="hero-band hero-modern">
      <div className="hero-pills">
        {TIERS.map((tier) => (
          <span key={tier} className={PILL_CLASS[tier]}>
            {counts[tier] ?? 0} {TIER_LABELS[tier]}
          </span>
        ))}
      </div>
    </div>
  );
}
