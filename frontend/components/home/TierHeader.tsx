import { TIER_LABELS, TIER_SCORE_LABELS } from "@/lib/constants";

type TableTier = "strong_buy" | "good_buy" | "safe_buy";

const HEADER_CLASS: Record<TableTier, string> = {
  strong_buy: "np-col-header np-col-strong",
  good_buy:   "np-col-header np-col-good",
  safe_buy:   "np-col-header np-col-safe",
};

function CrownIcon() {
  return (
    <svg
      className="np-col-crown-icon"
      width="16" height="13"
      viewBox="0 0 13 11"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M0.5 10L2 3.5L5.5 7.5L6.5 0.5L7.5 7.5L11 3.5L12.5 10H0.5Z" strokeLinejoin="round"/>
      <circle cx="6.5" cy="0.5" r="1.1"/>
      <circle cx="2"   cy="3.5" r="0.85"/>
      <circle cx="11"  cy="3.5" r="0.85"/>
    </svg>
  );
}

interface Props {
  tier: TableTier;
}

export default function TierHeader({ tier }: Props) {
  return (
    <div className={HEADER_CLASS[tier]}>
      <span className="np-col-label">
        {tier === "strong_buy" && <CrownIcon />}
        {TIER_LABELS[tier]}
      </span>
      <div className="np-col-header-right">
        {tier === "strong_buy" && (
          <span className="np-col-best-badge">★ Best Picks</span>
        )}
        <span className="np-col-score-label">{TIER_SCORE_LABELS[tier]}</span>
      </div>
    </div>
  );
}
