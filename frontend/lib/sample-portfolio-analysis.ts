import { flattenTiers, type ScoreItem, type ScoresResponse, type PortfolioHolding, type HoldingSignalInfo } from "@/lib/api";
import {
  analyzePortfolio,
  type ComputedRow,
  type PortfolioAnalysis,
} from "@/lib/portfolio-analysis";
import type { SamplePortfolio } from "@/lib/sample-portfolios";

function flattenScores(scores: ScoresResponse): Map<string, ScoreItem> {
  return new Map(flattenTiers(scores).map((s) => [s.trading_code.toUpperCase(), s]));
}

/** Demo pages have no per-user portfolio API, so approximate the holding
 *  signal from the stock's market-level signal (buy ≈ buy more). */
function sampleHoldingSignal(item: ScoreItem | undefined): HoldingSignalInfo | null {
  const sig = item?.signal;
  if (!sig || sig.signal === "none") return null;
  return {
    signal: sig.signal === "buy" ? "buy_more" : sig.signal,
    reason_key: sig.reason_key,
    reason_en: sig.reason_en,
    reason_bn: sig.reason_bn,
  };
}

function compute(holding: PortfolioHolding, priceMap: Map<string, ScoreItem>): ComputedRow {
  const item = priceMap.get(holding.trading_code);
  const ltp = item?.ltp ?? null;
  const cost_basis = holding.qty * holding.buy_price;
  const current_value = ltp != null ? holding.qty * ltp : null;
  const pnl = current_value != null ? current_value - cost_basis : null;
  const pnl_pct = pnl != null && cost_basis > 0 ? (pnl / cost_basis) * 100 : null;
  return {
    holding,
    ltp,
    company_name: item?.company_name ?? null,
    cost_basis,
    current_value,
    pnl,
    pnl_pct,
  };
}

export interface SampleAnalysisResult {
  rows: ComputedRow[];
  priceMap: Map<string, ScoreItem>;
  analysis: PortfolioAnalysis;
}

export function buildSampleAnalysis(
  portfolio: SamplePortfolio,
  scores: ScoresResponse,
): SampleAnalysisResult {
  const priceMap = flattenScores(scores);
  const rows: ComputedRow[] = portfolio.holdings.map((h, i) => {
    const code = h.trading_code.toUpperCase();
    return compute(
      {
        id: `sample-${portfolio.slug}-${i}`,
        trading_code: code,
        buy_price: h.buy_price,
        qty: h.qty,
        added_at: "",
        signal: sampleHoldingSignal(priceMap.get(code)),
      },
      priceMap,
    );
  });
  const analysis = analyzePortfolio(rows, priceMap);
  return { rows, priceMap, analysis };
}
