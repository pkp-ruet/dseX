/**
 * Starter / fallback suggestion chips. Kept in their own module so both the
 * responders and the screen builder can import them without a cycle.
 */
import type { Chip } from "./types";

export const STARTER_CHIPS: Chip[] = [
  { label: "Suggest stocks for me", emoji: "✨", action: { intentId: "suggest_stocks" } },
  { label: "How's the market today?", emoji: "📊", action: { intentId: "market_pulse" } },
  { label: "High dividend stocks", emoji: "💰", action: { intentId: "screen_dividend" } },
  { label: "Cheap stocks", emoji: "🏷️", action: { intentId: "screen_cheap" } },
  { label: "Today's top gainers", emoji: "🚀", action: { intentId: "movers_gainers" } },
];

export const FALLBACK_CHIPS: Chip[] = STARTER_CHIPS;
