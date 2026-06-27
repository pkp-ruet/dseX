import { getMarketIndex, getMarketIntelligence } from "@/lib/api";
import { isMarketOpen, secondsToOpen, formatCountdown } from "@/lib/market-hours";
import { COPY } from "../copy";
import type { MarketSummaryView, MessageBlock } from "../types";

function summaryLine(condition: MarketSummaryView["condition"]): string {
  switch (condition) {
    case "rising":
      return "Buyers are in control — most stocks are up today. 🟢";
    case "falling":
      return "A soft day — more stocks are down than up. 🔴";
    case "sideways":
      return "A quiet, mixed day — no strong direction either way.";
    default:
      return "Here's the latest market snapshot.";
  }
}

export async function marketPulseResponder(): Promise<MessageBlock[]> {
  const [idx, intel] = await Promise.all([
    getMarketIndex(),
    getMarketIntelligence().catch(() => null),
  ]);

  const open = isMarketOpen();
  const condition = intel?.market_condition ?? "unknown";

  const view: MarketSummaryView = {
    date: idx.date,
    dsex: idx.dsex,
    dsexChangePct: idx.dsex_change_pct,
    condition,
    up: idx.up_count,
    down: idx.down_count,
    neutral: idx.neutral_count,
    marketOpen: open,
    closedNote: open ? undefined : COPY.marketClosed(formatCountdown(secondsToOpen())),
    line: summaryLine(condition),
  };

  return [{ type: "market-summary", view }];
}
