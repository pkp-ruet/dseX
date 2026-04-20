import type { ScoresResponse, DividendsUpcoming, ScoreItem } from "@/lib/api";
import { getTier } from "@/lib/constants";
import ScoreOverview from "./sidebar/ScoreOverview";
import UpcomingEvents from "./sidebar/UpcomingEvents";

interface Props {
  scores: ScoresResponse;
  dividends: DividendsUpcoming | null;
}

export default function HomeSidebar({ scores, dividends }: Props) {
  const { tiers, computed_at } = scores;

  const allItems: ScoreItem[] = [
    ...tiers.strong_buy,
    ...tiers.safe_buy,
    ...tiers.watch,
    ...tiers.avoid,
  ];
  const total = allItems.length;

  const counts: Record<string, number> = {};
  for (const item of allItems) {
    const tier = getTier(item.score);
    counts[tier] = (counts[tier] ?? 0) + 1;
  }

  return (
    <>
      <ScoreOverview counts={counts} total={total} computedAt={computed_at} />
      {dividends && <UpcomingEvents data={dividends} />}
    </>
  );
}
