import { getMarketMovers } from "@/lib/api";
import { pct, crore } from "@/lib/formatters";
import { COPY } from "../copy";
import type { MessageBlock, StockRow } from "../types";

type Kind = "gainers" | "losers" | "active";

export async function moversResponder(kind: Kind): Promise<MessageBlock[]> {
  const m = await getMarketMovers();
  const src = kind === "gainers" ? m.gainers : kind === "losers" ? m.losers : m.most_traded;

  const items: StockRow[] = src.slice(0, 5).map((x) => ({
    trading_code: x.trading_code,
    company_name: x.company_name,
    ltp: x.ltp,
    change_pct: x.change_pct,
    metricValue:
      kind === "active"
        ? crore(x.value_mn)
        : `${(x.change_pct ?? 0) >= 0 ? "+" : ""}${pct(x.change_pct)}`,
    metricTone: kind === "active" ? "neutral" : (x.change_pct ?? 0) >= 0 ? "pos" : "neg",
  }));

  const title =
    kind === "gainers"
      ? "Today's top gainers"
      : kind === "losers"
        ? "Today's top losers"
        : "Most traded today";
  const metricLabel = kind === "active" ? "Traded" : "Change";

  return [
    {
      type: "stock-list",
      title,
      metricLabel,
      items,
      seeAllHref: "/dse-today",
      seeAllLabel: COPY.seeAll.market,
    },
  ];
}
