import TierTableSection from "./TierTableSection";
import TierDetailsSection from "./TierDetailsSection";
import type { FrontendTiers } from "@/lib/api";

interface Props {
  tiers: FrontendTiers;
}

export default function FilterableRankings({ tiers }: Props) {
  return (
    <>
      <TierTableSection tier="strong_buy"    items={tiers.strong_buy}    initialVisible={5} />
      <TierTableSection tier="good_buy"      items={tiers.good_buy}      initialVisible={5} />
      <TierTableSection tier="safe_buy"      items={tiers.safe_buy}      initialVisible={5} />
      <TierDetailsSection tier="cautious_buy"  items={tiers.cautious_buy} />
      <TierDetailsSection tier="keep_watching" items={tiers.keep_watching} />
      <TierDetailsSection tier="avoid"         items={tiers.avoid} />
    </>
  );
}
