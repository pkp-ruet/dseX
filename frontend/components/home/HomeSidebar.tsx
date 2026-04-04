import type { ScoresResponse, DividendsUpcoming, ScoreItem } from "@/lib/api";
import ScoreOverview from "./sidebar/ScoreOverview";
import TopDividends from "./sidebar/TopDividends";
import TopEPS from "./sidebar/TopEPS";
import SectorLeaderboard from "./sidebar/SectorLeaderboard";
import UpcomingEvents from "./sidebar/UpcomingEvents";

interface Props {
  scores: ScoresResponse;
  dividends: DividendsUpcoming | null;
}

export default function HomeSidebar({ scores, dividends }: Props) {
  const { tiers, counts, computed_at } = scores;

  const allItems: ScoreItem[] = [
    ...tiers.strong_buy,
    ...tiers.safe_buy,
    ...tiers.watch,
    ...tiers.avoid,
  ];
  const total = allItems.length;

  // Widget: Top Dividend Yield
  const topDividends = allItems
    .filter((i) => i.div_yield_pct != null)
    .sort((a, b) => (b.div_yield_pct ?? 0) - (a.div_yield_pct ?? 0))
    .slice(0, 5);

  // Widget: Top EPS Growth
  const topEPS = allItems
    .filter((i) => i.eps_yoy_pct != null && i.eps_yoy_pct > 0)
    .sort((a, b) => (b.eps_yoy_pct ?? 0) - (a.eps_yoy_pct ?? 0))
    .slice(0, 5);

  // Widget: Sector Leaderboard (avg DSEF score per sector)
  const sectorMap = new Map<string, number[]>();
  for (const item of allItems) {
    if (!item.sector || item.score == null) continue;
    const scoreArr = sectorMap.get(item.sector) ?? [];
    scoreArr.push(item.score);
    sectorMap.set(item.sector, scoreArr);
  }
  const sectors = Array.from(sectorMap.entries())
    .map(([name, scoreArr]) => ({
      name,
      avgScore: scoreArr.reduce((a, b) => a + b, 0) / scoreArr.length,
      count: scoreArr.length,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 6);

  return (
    <>
      <ScoreOverview counts={counts} total={total} computedAt={computed_at} />
      <TopDividends items={topDividends} />
      <TopEPS items={topEPS} />
      <SectorLeaderboard sectors={sectors} />
      {dividends && <UpcomingEvents data={dividends} />}
    </>
  );
}
