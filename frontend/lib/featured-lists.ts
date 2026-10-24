import type { StockListsResponse, StockListDef } from "@/lib/stock-lists";
import { STOCK_LISTS } from "@/lib/stock-lists";

export interface FeaturedListEntry {
  def: StockListDef;
  rank: number;   // 1-based position within the list
  total: number;  // list size
}

/**
 * Reverse-lookup: which free stock lists does `code` appear in? Reads the
 * same pre-computed /api/stock-lists arrays the list pages render, so a badge
 * can never disagree with the list. Best placement first. The Premium research
 * lists are deliberately not shown here — their members are locked.
 */
export function computeFeaturedIn(
  code: string,
  stockLists: StockListsResponse | null,
): FeaturedListEntry[] {
  if (!stockLists) return [];
  const up = code.toUpperCase();
  const out: FeaturedListEntry[] = [];
  for (const def of STOCK_LISTS) {
    const members = stockLists[def.apiKey] ?? [];
    const idx = members.findIndex((m) => m.trading_code?.toUpperCase() === up);
    if (idx >= 0) out.push({ def, rank: idx + 1, total: members.length });
  }
  return out.sort((a, b) => a.rank - b.rank);
}
