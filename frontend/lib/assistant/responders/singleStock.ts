import { getCompanyDetail, type ValuationContext } from "@/lib/api";
import { pct, formatDate } from "@/lib/formatters";
import { COPY } from "../copy";
import type { MessageBlock, StockDetailView, StockFact } from "../types";

export type SingleStockKind = "detail" | "good_buy" | "dividend" | "pe" | "cheap";

/** Coerce a score_row cell (which is loosely typed) to a finite number or null. */
function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

function valueSentence(v: ValuationContext): { en: string; bn: string } | null {
  const pe = v.current_pe;
  if (pe == null) return null;
  const cmp = v.sector_median_pe ?? v.own_avg_pe;
  if (cmp == null || cmp <= 0) return null;
  const S = COPY.stock;
  if (pe < cmp * 0.9) return { en: S.cheaper, bn: S.cheaperBn };
  if (pe > cmp * 1.15) return { en: S.pricier, bn: S.pricierBn };
  return { en: S.inLine, bn: S.inLineBn };
}

const fact = (k: keyof typeof COPY.facts, value: string, tone?: StockFact["tone"]): StockFact => ({
  label: COPY.facts[k].text,
  labelBn: COPY.facts[k].bn,
  value,
  tone,
});

export async function singleStockResponder(
  code: string,
  kind: SingleStockKind,
): Promise<MessageBlock[]> {
  const d = await getCompanyDetail(code);
  const sr = (d.score_row ?? {}) as Record<string, unknown>;
  const score = num(sr.score);
  const ltp = d.latest_price?.ltp ?? null;
  const changePct = d.latest_price?.change_pct ?? null;
  const stale = Boolean(sr.stale_data);
  const facts: StockFact[] = [];

  if (kind === "dividend") {
    const dy = num(sr.div_yield_pct);
    facts.push(fact("yield", dy != null ? pct(dy) : "—", "pos"));
    const dd = d.dividend_declaration;
    if (dd?.dividend_pct != null) facts.push(fact("lastCash", pct(dd.dividend_pct)));
    if (dd?.record_date) facts.push(fact("recordDate", formatDate(dd.record_date)));
  } else if (kind === "pe" || kind === "cheap") {
    const v = d.valuation;
    if (v?.current_pe != null) facts.push(fact("pe", v.current_pe.toFixed(1)));
    if (v?.sector_median_pe != null) facts.push(fact("sectorPe", v.sector_median_pe.toFixed(1)));
    if (v?.own_avg_pe != null) facts.push(fact("ownPe", v.own_avg_pe.toFixed(1)));
  } else {
    // detail / good_buy — a couple of headline numbers
    const v = d.valuation;
    const dy = num(sr.div_yield_pct);
    if (v?.current_pe != null) facts.push(fact("pe", v.current_pe.toFixed(1)));
    if (dy != null) facts.push(fact("yield", pct(dy)));
  }

  let tagline: { en: string; bn: string } | null = d.verdict?.tagline
    ? { en: d.verdict.tagline, bn: d.verdict.tagline_bn || d.verdict.tagline }
    : null;
  if ((kind === "pe" || kind === "cheap") && d.valuation) {
    tagline = valueSentence(d.valuation) ?? tagline;
  }

  // Good signs / watch-outs: the bilingual items when the backend sends them,
  // else the older English-only lists.
  const items = d.signal_flags?.items;
  const green = items
    ? items.filter((i) => i.tone === "good").map((i) => ({ en: i.en, bn: i.bn }))
    : (d.signal_flags?.green ?? []).map((g) => ({ en: g, bn: g }));
  const red = items
    ? items.filter((i) => i.tone === "watch").map((i) => ({ en: i.en, bn: i.bn }))
    : (d.signal_flags?.red ?? []).map((r) => ({ en: r, bn: r }));

  const view: StockDetailView = {
    code: d.profile?.trading_code ?? code.toUpperCase(),
    name: d.profile?.company_name ?? null,
    sector: d.profile?.sector ?? null,
    ltp,
    changePct,
    score,
    tagline: tagline?.en ?? null,
    taglineBn: tagline?.bn ?? null,
    green: green.slice(0, 2),
    red: red.slice(0, 1),
    facts,
    stale,
  };

  return [{ type: "stock-detail", view }];
}
