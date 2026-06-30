/**
 * Starter / fallback suggestion chips. Kept in their own module so both the
 * responders and the screen builder can import them without a cycle.
 * Ordered by usefulness — the first ones stay visible before the bar scrolls.
 */
import type { Chip } from "./types";

export const STARTER_CHIPS: Chip[] = [
  { label: "Suggest stocks for me", labelBn: "আমার জন্য শেয়ার বাছুন", emoji: "✨", action: { intentId: "suggest_stocks" } },
  { label: "How's the market today?", labelBn: "আজ বাজার কেমন?", emoji: "📊", action: { intentId: "market_pulse" } },
  { label: "Top quality stocks", labelBn: "সেরা মানের শেয়ার", emoji: "🏆", action: { intentId: "screen_top" } },
  { label: "High dividend stocks", labelBn: "বেশি লভ্যাংশের শেয়ার", emoji: "💰", action: { intentId: "screen_dividend" } },
  { label: "Trending now", labelBn: "এখন আলোচনায়", emoji: "🔥", action: { intentId: "screen_momentum" } },
  { label: "Cheap stocks", labelBn: "সস্তা শেয়ার", emoji: "🏷️", action: { intentId: "screen_cheap" } },
  { label: "Today's tips", labelBn: "আজকের টিপস", emoji: "💡", action: { intentId: "tips" } },
  { label: "Today's top gainers", labelBn: "আজকের শীর্ষ বাড়তি", emoji: "🚀", action: { intentId: "movers_gainers" } },
  { label: "Upcoming dividends", labelBn: "আসছে লভ্যাংশ", emoji: "📅", action: { intentId: "dividends" } },
];

export const FALLBACK_CHIPS: Chip[] = STARTER_CHIPS;
