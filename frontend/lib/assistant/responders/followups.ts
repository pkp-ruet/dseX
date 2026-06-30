/**
 * "What next?" chips appended to a bot answer. They teach the assistant's
 * capabilities and remove typing — the biggest barrier for a weak-in-English,
 * mobile-first audience. Each chip is a one-tap action/client call.
 */
import { COPY } from "../copy";
import type { Chip, MessageBlock } from "../types";

const F = COPY.followups;

/** Chips shown under a single-stock answer. */
export function singleStockFollowUps(code: string): Chip[] {
  return [
    { label: F.save.label, labelBn: F.save.bn, emoji: "⭐", client: { kind: "watchlist_toggle", code } },
    { label: F.dividend.label, labelBn: F.dividend.bn, emoji: "💰", action: { intentId: "stock_dividend", entities: { code } } },
    { label: F.value.label, labelBn: F.value.bn, emoji: "🏷️", action: { intentId: "stock_pe", entities: { code } } },
  ];
}

/** Chips shown under a screen / list answer (offers to drill into the top pick). */
export function screenFollowUps(topCode?: string): Chip[] {
  const chips: Chip[] = [];
  if (topCode) {
    chips.push({
      label: `${F.tellMe.label} ${topCode}`,
      labelBn: `${topCode} ${F.tellMe.bn}`,
      emoji: "🔎",
      action: { intentId: "stock_detail", entities: { code: topCode } },
    });
  }
  chips.push({ label: F.top.label, labelBn: F.top.bn, emoji: "🏆", action: { intentId: "screen_top" } });
  chips.push({ label: F.market.label, labelBn: F.market.bn, emoji: "📊", action: { intentId: "market_pulse" } });
  return chips;
}

/** Chips shown under a market / movers answer. */
export function marketFollowUps(): Chip[] {
  return [
    { label: F.gainers.label, labelBn: F.gainers.bn, emoji: "🚀", action: { intentId: "movers_gainers" } },
    { label: F.losers.label, labelBn: F.losers.bn, emoji: "📉", action: { intentId: "movers_losers" } },
    { label: F.top.label, labelBn: F.top.bn, emoji: "🏆", action: { intentId: "screen_top" } },
  ];
}

/** The first stock code in a list of blocks, if any (used to seed "tell me about X"). */
export function firstStockCode(blocks: MessageBlock[]): string | undefined {
  for (const b of blocks) {
    if (b.type === "stock-list" && b.items[0]) return b.items[0].trading_code;
  }
  return undefined;
}
