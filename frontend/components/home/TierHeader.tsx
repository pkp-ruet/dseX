import { TIER_LABELS, TIER_SCORE_LABELS } from "@/lib/constants";

type TableTier = "strong_buy" | "good_buy" | "safe_buy";

const HEADER_CLASS: Record<TableTier, string> = {
  strong_buy: "np-col-header np-col-strong",
  good_buy:   "np-col-header np-col-good",
  safe_buy:   "np-col-header np-col-safe",
};

interface Props {
  tier: TableTier;
}

export default function TierHeader({ tier }: Props) {
  return (
    <div className={HEADER_CLASS[tier]}>
      <span className="np-col-label">{TIER_LABELS[tier]}</span>
      <span className="np-col-score-label">{TIER_SCORE_LABELS[tier]}</span>
    </div>
  );
}
