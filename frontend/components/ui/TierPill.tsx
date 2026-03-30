import { TIER_LABELS, TIER_COLORS, type TierKey } from "@/lib/constants";

interface Props {
  tier: TierKey;
  count?: number;
}

export default function TierPill({ tier, count }: Props) {
  const color = TIER_COLORS[tier];
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ color, background: `${color}18`, border: `1px solid ${color}40` }}
    >
      {TIER_LABELS[tier]}
      {count !== undefined && (
        <span className="font-normal opacity-75">({count})</span>
      )}
    </span>
  );
}
