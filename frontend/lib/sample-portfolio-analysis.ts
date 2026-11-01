import { flattenTiers, type ScoreItem, type ScoresResponse, type PortfolioHolding, type HoldingSignalInfo } from "@/lib/api";
import {
  analyzePortfolio,
  type AnalysisLang,
  type ComputedRow,
  type PortfolioAnalysis,
} from "@/lib/portfolio-analysis";
import type { SamplePortfolio } from "@/lib/sample-portfolios";

function flattenScores(scores: ScoresResponse): Map<string, ScoreItem> {
  return new Map(flattenTiers(scores).map((s) => [s.trading_code.toUpperCase(), s]));
}

/** Sample portfolios carry no Buy more / Sell (2026-11-01): they are free
 *  pages, and the holding signal shows only in the portfolio's Premium
 *  sections. Without it the analysis leaves those lines out by itself. */
function sampleHoldingSignal(_item: ScoreItem | undefined): HoldingSignalInfo | null {
  return null;
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
  lang: AnalysisLang = "en",
): SampleAnalysisResult {
  return analyzeSample(portfolio, flattenScores(scores), lang);
}

/** The same run on a price map a page already holds (the sample pages' full
 *  check, `lib/sample-portfolio-report.ts`). */
export function analyzeSample(
  portfolio: SamplePortfolio,
  priceMap: Map<string, ScoreItem>,
  lang: AnalysisLang = "en",
): SampleAnalysisResult {
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
  const analysis = analyzePortfolio(rows, priceMap, lang);
  return { rows, priceMap, analysis };
}
