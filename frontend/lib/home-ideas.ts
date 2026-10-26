import type { CopyKey } from "@/lib/home-copy";
import type { StockRowTone } from "@/components/ui/StockRow";

/**
 * The plain "kind" words the dashboard's discovery rail puts on a row, and
 * their tones. This file also built the "3 stocks worth a look / picked for
 * you today" card (`TodaysIdeas`), removed from the dashboard 2026-10-26.
 */

export const TIP_KIND: Record<string, CopyKey> = {
  dividend_yield: "kindPaysCash",
  dividend_streak: "kindPaysCash",
  div_catalyst: "kindPaysCash",
  profit_growth: "kindGrowing",
  profit_streak: "kindSteady",
  cheap_pe: "kindCheap",
  below_book: "kindCheap",
  near_52w_low: "kindNearLow",
  high_roe: "kindStrong",
  rel_strength: "kindStrong",
};

/** Plain "kind" word → row tone. Market semantics stay locked: green = growth,
 *  amber = cash, primary = personal / structural. */
export const KIND_TONE: Record<string, StockRowTone> = {
  kindYouFollow: "primary",
  kindMatched: "primary",
  kindGoodPrice: "positive",
  kindStrongBuy: "positive",
  kindGrowing: "positive",
  kindPaysCash: "watch",
  kindSteady: "primary",
  kindCheap: "primary",
  kindNearLow: "primary",
  kindStrong: "positive",
  kindTip: "muted",
};
