import { TIER_LABELS, TIER_SCORE_LABELS } from "@/lib/constants";

const HEADER_CLASS: Record<"strong_buy" | "safe_buy", string> = {
  strong_buy: "np-col-header np-col-strong",
  safe_buy: "np-col-header np-col-safe",
};

interface Props {
  tier: "strong_buy" | "safe_buy";
}

export default function TierHeader({ tier }: Props) {
  return (
    <div className={HEADER_CLASS[tier]}>
      <span className="np-col-label">{TIER_LABELS[tier]}</span>
      <span className="np-col-score-label">{TIER_SCORE_LABELS[tier]}</span>
    </div>
  );
}
