import type { ScoreItem, ScoresResponse, PortfolioHolding } from "@/lib/api";
import {
  analyzePortfolio,
  type ComputedRow,
  type PortfolioAnalysis,
} from "@/lib/portfolio-analysis";
import type { SamplePortfolio } from "@/lib/sample-portfolios";

function flattenScores(scores: ScoresResponse): Map<string, ScoreItem> {
  const all = Object.values(scores.tiers).flat();
  return new Map(all.map((s) => [s.trading_code.toUpperCase(), s]));
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
  const rows: ComputedRow[] = portfolio.holdings.map((h, i) =>
    compute(
      {
        id: `sample-${portfolio.slug}-${i}`,
        trading_code: h.trading_code.toUpperCase(),
        buy_price: h.buy_price,
        qty: h.qty,
        added_at: "",
      },
      priceMap,
    ),
  );
  const analysis = analyzePortfolio(rows, priceMap);
  return { rows, priceMap, analysis };
}
