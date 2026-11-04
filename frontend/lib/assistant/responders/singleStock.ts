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

/** The years of profit you pay for today against its own usual, as a plain
 *  fact — the same figures and the same ±10% band as the stock page's data
 *  room (2026-11-04, audit EL4). The AI used its own "cheap" rule (P/E vs the
 *  sector at 0.9 / 1.15), which disagreed with the page for 107 of 227
 *  companies; whether the price is right is our answer, in the full report. */
function yearsSentence(v: ValuationContext): { en: string; bn: string } | null {
  const now = v.current_pe;
  if (now == null || now <= 0) {
    return { en: COPY.stock.noProfit, bn: COPY.stock.noProfitBn };
  }
  const usual = v.own_avg_pe;
  const n = Math.round(now);
  if (usual == null || usual <= 0) return { en: COPY.stock.years(n), bn: COPY.stock.yearsBn(n) };
  const u = Math.round(usual);
  return { en: COPY.stock.yearsVsUsual(n, u), bn: COPY.stock.yearsVsUsualBn(n, u) };
}

const fact = (k: keyof typeof COPY.facts, value: string, tone?: StockFact["tone"]): StockFact => ({
  label: COPY.facts[k].text,
  labelBn: COPY.facts[k].bn,
  value,
  tone,
});

const years = (v: number) => `${v.toFixed(1)}`;

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
  const v = d.valuation;

  if (kind === "dividend") {
    // The year's cash on today's price, before tax — the stock page's yield.
    const dy = num(sr.div_yield_pct);
    facts.push(fact("yield", dy != null ? pct(dy) : "—", "pos"));
    const dps = num(sr.div_latest_dps);
    if (dps != null) facts.push(fact("yearCash", `৳${dps.toFixed(2)}`));
    const dd = d.dividend_declaration;
    if (dd?.record_date) facts.push(fact("recordDate", formatDate(dd.record_date)));
  } else if (kind === "pe" || kind === "cheap") {
    if (v?.current_pe != null) facts.push(fact("pe", years(v.current_pe)));
    if (v?.own_avg_pe != null) facts.push(fact("ownPe", years(v.own_avg_pe)));
    if (v?.sector_median_pe != null) facts.push(fact("sectorPe", years(v.sector_median_pe)));
  } else {
    const dy = num(sr.div_yield_pct);
    if (v?.current_pe != null) facts.push(fact("pe", years(v.current_pe)));
    if (dy != null) facts.push(fact("yield", pct(dy)));
  }

  // One plain fact, then where our answer lives. Whether to buy it, our price
  // and its warnings are the stock report's (Premium on the page since
  // 2026-11-01), so the AI no longer gives its own verdict, good signs or
  // watch-outs for free.
  const lead = (kind === "pe" || kind === "cheap") && v ? yearsSentence(v) : null;
  const tagline = lead
    ? { en: `${lead.en} ${COPY.stock.answerOnPage}`, bn: `${lead.bn} ${COPY.stock.answerOnPageBn}` }
    : { en: COPY.stock.answerOnPage, bn: COPY.stock.answerOnPageBn };

  const view: StockDetailView = {
    code: d.profile?.trading_code ?? code.toUpperCase(),
    name: d.profile?.company_name ?? null,
    sector: d.profile?.sector ?? null,
    ltp,
    changePct,
    score,
    tagline: tagline.en,
    taglineBn: tagline.bn,
    green: [],
    red: [],
    facts,
    stale,
  };

  return [{ type: "stock-detail", view }];
}
