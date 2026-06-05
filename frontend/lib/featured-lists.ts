import type { ScoreItem } from "@/lib/api";
import type { StockListsResponse, StockListDef } from "@/lib/stock-lists";
import { STOCK_LISTS } from "@/lib/stock-lists";
import { filterInsightItems } from "@/lib/insight-utils";

export interface FeaturedListEntry {
  def: StockListDef;
  rank: number;   // 1-based position within the list
  total: number;  // list size
}

/**
 * Reverse-lookup: which curated pick lists does `code` appear in?
 * Reuses the EXACT selection logic the list pages use (filterInsightItems for
 * insight shortlists, the pre-computed /api/stock-lists arrays for classic
 * rankings) so a badge can never disagree with the actual list page.
 *
 * Returns insight shortlists first (more meaningful), then classic rankings,
 * each sorted by rank (best placement first). Classic lists are de-duped by
 * apiKey so a single underlying ranking shows at most once.
 */
export function computeFeaturedIn(
  code: string,
  scores: ScoreItem[],
  stockLists: StockListsResponse | null,
): FeaturedListEntry[] {
  const up = code.toUpperCase();
  const insight: FeaturedListEntry[] = [];
  const classic: FeaturedListEntry[] = [];
  const seenApiKeys = new Set<string>();

  for (const def of STOCK_LISTS) {
    if (def.isSectorPage) continue;

    if (def.insightMode) {
      const members = filterInsightItems(scores, def.slug);
      const idx = members.findIndex((m) => m.trading_code?.toUpperCase() === up);
      if (idx >= 0) insight.push({ def, rank: idx + 1, total: members.length });
    } else if (def.apiKey && stockLists) {
      if (seenApiKeys.has(def.apiKey)) continue;
      const members = stockLists[def.apiKey] ?? [];
      const idx = members.findIndex((m) => m.trading_code?.toUpperCase() === up);
      if (idx >= 0) {
        seenApiKeys.add(def.apiKey);
        classic.push({ def, rank: idx + 1, total: members.length });
      }
    }
  }

  insight.sort((a, b) => a.rank - b.rank);
  classic.sort((a, b) => a.rank - b.rank);
  return [...insight, ...classic];
}
