/**
 * Starter / fallback suggestion chips. Kept in their own module so both the
 * responders and the screen builder can import them without a cycle.
 * Ordered by usefulness — the first ones stay visible before the bar scrolls.
 * Each chip shows one language, following the navbar switch.
 */
import type { Chip } from "./types";

export const STARTER_CHIPS: Chip[] = [
  { label: "Suggest shares for me", labelBn: "আমার জন্য শেয়ার বাছুন", action: { intentId: "suggest_stocks" } },
  { label: "How is the market today?", labelBn: "আজ বাজার কেমন?", action: { intentId: "market_pulse" } },
  { label: "Highest-rated shares", labelBn: "সেরা রেটিংয়ের শেয়ার", action: { intentId: "screen_top" } },
  { label: "High dividend shares", labelBn: "বেশি ডিভিডেন্ডের শেয়ার", action: { intentId: "screen_dividend" } },
  { label: "Moving now", labelBn: "এখন যা নড়ছে", action: { intentId: "screen_momentum" } },
  { label: "Good value shares", labelBn: "ভালো মূল্যের শেয়ার", action: { intentId: "screen_cheap" } },
  { label: "Today's tips", labelBn: "আজকের টিপস", action: { intentId: "tips" } },
  { label: "Today's biggest risers", labelBn: "আজ সবচেয়ে বেশি বেড়েছে", action: { intentId: "movers_gainers" } },
  { label: "Upcoming dividends", labelBn: "আসন্ন ডিভিডেন্ড", action: { intentId: "dividends" } },
];

export const FALLBACK_CHIPS: Chip[] = STARTER_CHIPS;
