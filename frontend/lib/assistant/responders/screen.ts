import { getTop20, getNearExtremes, type ScoreItem } from "@/lib/api";
import { getTier } from "@/lib/constants";
import { pct } from "@/lib/formatters";
import { loadScoreUniverse, indexByCode } from "../company-index";
import { STARTER_CHIPS } from "../chips";
import { COPY } from "../copy";
import type { Entities, IntentId, MessageBlock, StockRow } from "../types";

const LIMIT = 5;

const notAvoid = (s: ScoreItem) => getTier(s.score ?? null) !== "weak";
const bySector = (match?: string) => (s: { sector: string | null }) =>
  !match || (s.sector ?? "").toLowerCase().includes(match);

function rowBase(s: { trading_code: string; company_name: string | null; ltp: number | null; change_pct: number | null }): Omit<StockRow, "metricValue" | "metricTone"> {
  return {
    trading_code: s.trading_code,
    company_name: s.company_name,
    ltp: s.ltp,
    change_pct: s.change_pct,
  };
}

const scoreRow = (s: ScoreItem): StockRow => ({
  ...rowBase(s),
  metricValue: s.score != null ? String(Math.round(s.score)) : "—",
  metricTone: "neutral",
});

function leadText(intent: IntentId, ent: Entities): { text: string; bn?: string } {
  if (intent === "screen_sector") {
    const s = ent.sector ?? "this sector";
    return { text: COPY.sectorLead(s), bn: COPY.sectorLeadBn(ent.sector ?? "এই") };
  }
  if (intent === "screen_price_cap") {
    const cap = ent.priceCap ?? 0;
    return { text: COPY.priceCapLead(cap), bn: COPY.priceCapLeadBn(cap) };
  }
  return { text: COPY.screenLead[intent] ?? "Here's what I found:", bn: COPY.screenLeadBn[intent] };
}

function result(
  intent: IntentId,
  ent: Entities,
  items: StockRow[],
  title: string,
  metricLabel: string,
  seeAllHref: string,
): MessageBlock[] {
  if (!items.length) {
    return [
      { type: "text", text: COPY.empty.text, bn: COPY.empty.bn },
      { type: "chips", chips: STARTER_CHIPS, layout: "wrap" },
    ];
  }
  const lead = leadText(intent, ent);
  return [
    { type: "text", text: lead.text, bn: lead.bn },
    {
      type: "stock-list",
      title,
      metricLabel,
      items,
      seeAllHref,
      seeAllLabel: COPY.seeAll.rankings,
    },
  ];
}

export async function screenResponder(intent: IntentId, ent: Entities): Promise<MessageBlock[]> {
  const match = ent.sectorMatch;

  switch (intent) {
    case "screen_dividend": {
      const u = await loadScoreUniverse();
      const items = u
        .filter((s) => (s.div_yield_pct ?? 0) > 0)
        .filter(notAvoid)
        .filter(bySector(match))
        .sort((a, b) => (b.div_yield_pct ?? 0) - (a.div_yield_pct ?? 0))
        .slice(0, LIMIT)
        .map((s) => ({ ...rowBase(s), metricValue: pct(s.div_yield_pct), metricTone: "pos" as const }));
      return result(intent, ent, items, "Best dividends", "Yield", "/stock-insights");
    }

    case "screen_growth": {
      const u = await loadScoreUniverse();
      const items = u
        .filter((s) => (s.eps_yoy_pct ?? 0) > 0)
        .filter(notAvoid)
        .filter(bySector(match))
        .sort((a, b) => (b.eps_yoy_pct ?? 0) - (a.eps_yoy_pct ?? 0))
        .slice(0, LIMIT)
        .map((s) => ({ ...rowBase(s), metricValue: pct(s.eps_yoy_pct), metricTone: "pos" as const }));
      return result(intent, ent, items, "Fastest growing", "Growth", "/stock-insights");
    }

    case "screen_cheap": {
      const u = await loadScoreUniverse();
      const items = u
        .filter((s) => s.p4_val != null)
        .filter(notAvoid)
        .filter(bySector(match))
        .sort((a, b) => (b.p4_val ?? 0) - (a.p4_val ?? 0))
        .slice(0, LIMIT)
        .map((s) => ({ ...rowBase(s), metricValue: `${(s.p4_val ?? 0).toFixed(1)}/10`, metricTone: "neutral" as const }));
      return result(intent, ent, items, "Good value", "Value", "/dsestockranking");
    }

    case "screen_safe": {
      const u = await loadScoreUniverse();
      const items = u
        .filter((s) => (s.score ?? 0) >= 60)
        .filter(bySector(match))
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, LIMIT)
        .map(scoreRow);
      return result(intent, ent, items, "Steadier picks", "Score", "/dsestockranking");
    }

    case "screen_price_cap": {
      const cap = ent.priceCap ?? 0;
      const u = await loadScoreUniverse();
      const items = u
        .filter((s) => (s.ltp ?? 0) > 0 && (s.ltp ?? Infinity) <= cap)
        .filter(notAvoid)
        .filter(bySector(match))
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, LIMIT)
        .map(scoreRow);
      return result(intent, ent, items, `Under ৳${cap}`, "Score", "/dsestockranking");
    }

    case "screen_momentum": {
      const [top, u] = await Promise.all([getTop20().catch(() => null), loadScoreUniverse()]);
      const map = indexByCode(u);
      const items: StockRow[] = (top?.items ?? [])
        .filter(bySector(match))
        .slice(0, LIMIT)
        .map((t) => ({
          trading_code: t.trading_code,
          company_name: t.company_name,
          ltp: t.ltp,
          change_pct: map.get(t.trading_code.toUpperCase())?.change_pct ?? null,
          metricValue: pct(t.return_7d_pct),
          metricTone: (t.return_7d_pct ?? 0) >= 0 ? "pos" : "neg",
        }));
      return result(intent, ent, items, "Moving the most", "7-day", "/dse-top-20");
    }

    case "screen_near_low": {
      const ne = await getNearExtremes();
      const items: StockRow[] = (ne.near_low ?? [])
        .filter(bySector(match))
        .slice(0, LIMIT)
        .map((x) => ({
          trading_code: x.trading_code,
          company_name: x.company_name,
          ltp: x.ltp,
          change_pct: x.change_pct,
          metricValue: x.gap_pct != null ? `+${pct(x.gap_pct)}` : "—",
          metricTone: "neutral",
        }));
      return result(intent, ent, items, "Near 1-year low", "Above low", "/market-analysis");
    }

    case "screen_sector": {
      const u = await loadScoreUniverse();
      const items = u
        .filter(bySector(match))
        .filter(notAvoid)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, LIMIT)
        .map(scoreRow);
      return result(intent, ent, items, `Top ${ent.sector ?? "sector"}`, "Score", "/dsestockranking");
    }

    case "screen_top": {
      const u = await loadScoreUniverse();
      const items = u
        .filter(notAvoid)
        .filter(bySector(match))
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, LIMIT)
        .map(scoreRow);
      return result(intent, ent, items, "Top quality", "Score", "/dsestockranking");
    }

    default:
      return [];
  }
}
