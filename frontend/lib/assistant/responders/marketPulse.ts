import { getMarketIndex, getMarketIntelligence } from "@/lib/api";
import { isMarketOpen, secondsToOpen, formatCountdown } from "@/lib/market-hours";
import { COPY } from "../copy";
import type { MarketSummaryView, MessageBlock } from "../types";

export async function marketPulseResponder(): Promise<MessageBlock[]> {
  const [idx, intel] = await Promise.all([
    getMarketIndex(),
    getMarketIntelligence().catch(() => null),
  ]);

  const open = isMarketOpen();
  const condition: MarketSummaryView["condition"] = intel?.market_condition ?? "unknown";
  const countdown = open ? "" : formatCountdown(secondsToOpen());
  const line = COPY.marketLine[condition] ?? COPY.marketLine.unknown;

  const view: MarketSummaryView = {
    date: idx.date,
    dsex: idx.dsex,
    dsexChangePct: idx.dsex_change_pct,
    condition,
    up: idx.up_count,
    down: idx.down_count,
    neutral: idx.neutral_count,
    marketOpen: open,
    closedNote: open ? undefined : COPY.marketClosed(countdown),
    closedNoteBn: open ? undefined : COPY.marketClosedBn(countdown),
    line: line.text,
    lineBn: line.bn,
  };

  return [{ type: "market-summary", view }];
}
