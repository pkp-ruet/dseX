import { getMarketMovers } from "@/lib/api";
import { pct, crore } from "@/lib/formatters";
import { croreBn } from "@/lib/bn";
import { COPY } from "../copy";
import type { MessageBlock, StockRow } from "../types";

type Kind = "gainers" | "losers" | "active";

const TITLES: Record<Kind, { en: string; bn: string }> = {
  gainers: { en: "Today's biggest risers", bn: "আজ সবচেয়ে বেশি বেড়েছে" },
  losers: { en: "Today's biggest fallers", bn: "আজ সবচেয়ে বেশি কমেছে" },
  active: { en: "Most traded today", bn: "আজ সবচেয়ে বেশি লেনদেন" },
};

export async function moversResponder(kind: Kind): Promise<MessageBlock[]> {
  const m = await getMarketMovers();
  const src = kind === "gainers" ? m.gainers : kind === "losers" ? m.losers : m.most_traded;

  const items: StockRow[] = src.slice(0, 5).map((x) => {
    const change = `${(x.change_pct ?? 0) >= 0 ? "+" : ""}${pct(x.change_pct)}`;
    return {
      trading_code: x.trading_code,
      company_name: x.company_name,
      ltp: x.ltp,
      change_pct: x.change_pct,
      metricValue: kind === "active" ? crore(x.value_mn) : change,
      metricValueBn: kind === "active" ? croreBn(x.value_mn) : change,
      metricTone: kind === "active" ? "neutral" : (x.change_pct ?? 0) >= 0 ? "pos" : "neg",
    };
  });

  return [
    {
      type: "stock-list",
      title: TITLES[kind].en,
      titleBn: TITLES[kind].bn,
      metricLabel: kind === "active" ? "Traded" : "Change",
      metricLabelBn: kind === "active" ? "লেনদেন" : "পরিবর্তন",
      items,
      seeAllHref: "/dse-today",
      seeAllLabel: COPY.seeAll.market,
      seeAllLabelBn: COPY.seeAll.marketBn,
    },
  ];
}
