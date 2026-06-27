import { getCompanyDetail, type ValuationContext } from "@/lib/api";
import { pct, formatDate } from "@/lib/formatters";
import type { MessageBlock, StockDetailView, StockFact } from "../types";

export type SingleStockKind = "detail" | "good_buy" | "dividend" | "pe" | "cheap";

/** Coerce a score_row cell (which is loosely typed) to a finite number or null. */
function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

function valueSentence(v: ValuationContext): string | null {
  const pe = v.current_pe;
  if (pe == null) return null;
  const cmp = v.sector_median_pe ?? v.own_avg_pe;
  if (cmp == null || cmp <= 0) return null;
  if (pe < cmp * 0.9) return "Looks cheaper than usual for its industry.";
  if (pe > cmp * 1.15) return "Looks a bit pricey versus its industry.";
  return "Priced about in line with its industry.";
}

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
    facts.push({ label: "Dividend yield", value: dy != null ? pct(dy) : "—", tone: "pos" });
    const dd = d.dividend_declaration;
    if (dd?.dividend_pct != null) {
      facts.push({ label: "Latest cash dividend", value: pct(dd.dividend_pct) });
    }
    if (dd?.record_date) {
      facts.push({ label: "Record date", value: formatDate(dd.record_date) });
    }
  } else if (kind === "pe" || kind === "cheap") {
    const v = d.valuation;
    if (v?.current_pe != null) facts.push({ label: "P/E (price vs profit)", value: v.current_pe.toFixed(1) });
    if (v?.sector_median_pe != null) facts.push({ label: "Industry typical P/E", value: v.sector_median_pe.toFixed(1) });
    if (v?.own_avg_pe != null) facts.push({ label: "Its own 5-yr average", value: v.own_avg_pe.toFixed(1) });
  } else {
    // detail / good_buy — a couple of headline numbers
    const v = d.valuation;
    const dy = num(sr.div_yield_pct);
    if (v?.current_pe != null) facts.push({ label: "P/E", value: v.current_pe.toFixed(1) });
    if (dy != null) facts.push({ label: "Dividend yield", value: pct(dy) });
  }

  let tagline = d.verdict?.tagline ?? null;
  if ((kind === "pe" || kind === "cheap") && d.valuation) {
    tagline = valueSentence(d.valuation) ?? tagline;
  }

  const view: StockDetailView = {
    code: d.profile?.trading_code ?? code.toUpperCase(),
    name: d.profile?.company_name ?? null,
    sector: d.profile?.sector ?? null,
    ltp,
    changePct,
    score,
    tagline,
    green: (d.signal_flags?.green ?? []).slice(0, 2),
    red: (d.signal_flags?.red ?? []).slice(0, 1),
    facts,
    stale,
  };

  return [{ type: "stock-detail", view }];
}
