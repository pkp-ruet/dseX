import TierPill from "@/components/ui/TierPill";
import type { TierKey } from "@/lib/constants";

interface Props {
  counts: Record<string, number>;
}

const TIERS: TierKey[] = ["strong_buy", "safe_buy", "watch", "avoid"];

export default function HeroBand({ counts }: Props) {
  return (
    <div className="flex flex-wrap gap-2 my-4">
      {TIERS.map((tier) => (
        <TierPill key={tier} tier={tier} count={counts[tier] ?? 0} />
      ))}
    </div>
  );
}
