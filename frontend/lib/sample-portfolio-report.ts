import type { BuyNext, GlanceRow, ScoreItem, ScoresResponse, UpcomingResult } from "@/lib/api";
import { flattenTiers } from "@/lib/api";
import { isoLocal, todayDhaka } from "@/lib/dividend-dates";
import { planFromEngine, type AnalysisLang, type ComputedRow, type PortfolioAnalysis } from "@/lib/portfolio-analysis";
import { buildNextMove, gradeLifts } from "@/lib/portfolio-next";
import { buildProInsights } from "@/lib/portfolio-pro";
import { buildPortfolioReport, type PortfolioReport } from "@/lib/portfolio-report";
import { analyzeSample } from "@/lib/sample-portfolio-analysis";
import type { SamplePortfolio } from "@/lib/sample-portfolios";

/** Rows the sample leaves out: Buy more / Sell is Premium (2026-11-01), and
 *  a sample has no watcher history, so "What changed this week?" would only
 *  ever say "quiet". */
const SKIP_ROWS = new Set(["sell", "changed"]);

export interface SampleReport {
  report: PortfolioReport;
  rows: ComputedRow[];
  analysis: PortfolioAnalysis;
}

/**
 * The full portfolio check on a sample portfolio (2026-11-02, user: "update
 * sample portfolio. its very old version. design the sample portfolio so it
 * shows most of our analysis"). The same `buildPortfolioReport` the
 * portfolio page runs, on the sample's holdings at today's prices, with the
 * glance rows, the results calendar and the recommendation engine's buy
 * ideas for these holdings (`/api/portfolio/sample-plan`).
 *
 * Built once per language and merged (`mergeLang`), because a few lines come
 * out of the analysis in one language only; the page server-renders both.
 */
export function buildSampleReport(
  portfolio: SamplePortfolio,
  scores: ScoresResponse,
  glance: GlanceRow[],
  results: UpcomingResult[],
  buyNext: BuyNext | null,
): SampleReport {
  const priceMap = new Map<string, ScoreItem>(flattenTiers(scores).map((s) => [s.trading_code.toUpperCase(), s]));
  const glanceMap = new Map(glance.map((g) => [g.code.toUpperCase(), g]));
  const today = isoLocal(todayDhaka());
  const run = (lang: AnalysisLang) => {
    const { rows, analysis } = analyzeSample(portfolio, priceMap, lang);
    const plan = planFromEngine(buyNext, lang);
    const planEn = planFromEngine(buyNext, "en");
    const planBn = planFromEngine(buyNext, "bn");
    const report = buildPortfolioReport({
      analysis,
      next: { en: buildNextMove(analysis, planEn, "en"), bn: buildNextMove(analysis, planBn, "bn") },
      plan,
      lifts: gradeLifts(rows, priceMap, analysis, plan, lang),
      pro: buildProInsights(analysis, priceMap, lang),
      priceMap,
      glance: glanceMap,
      results,
      watch: [],
      flips: [],
      today,
    });
    return { rows, analysis, report };
  };
  const en = run("en");
  const bn = run("bn");
  const report = mergeLang(en.report, bn.report);
  report.chapters = report.chapters.map((c) => ({ ...c, rows: c.rows.filter((r) => !SKIP_ROWS.has(r.key)) }));
  report.answered = report.chapters.reduce((a, c) => a + c.rows.length, 0) + 4;
  return { report, rows: en.rows, analysis: en.analysis };
}

type Bi = { en: string; bn: string };
const isBi = (x: unknown): x is Bi =>
  !!x &&
  typeof x === "object" &&
  !Array.isArray(x) &&
  Object.keys(x).length === 2 &&
  typeof (x as Bi).en === "string" &&
  typeof (x as Bi).bn === "string";

/** Two runs of the same report, one per language: every `{en, bn}` pair
 *  takes its English from the first and its Bengali from the second. Where
 *  the two shapes differ the English run wins. */
export function mergeLang<T>(a: T, b: T): T {
  if (isBi(a)) return (isBi(b) ? { en: a.en, bn: b.bn } : a) as T;
  if (Array.isArray(a)) {
    return (Array.isArray(b) && b.length === a.length ? a.map((x, i) => mergeLang(x, b[i])) : a) as T;
  }
  if (a && typeof a === "object") {
    if (!b || typeof b !== "object") return a;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(a as Record<string, unknown>)) out[k] = mergeLang(v, (b as Record<string, unknown>)[k]);
    return out as T;
  }
  return a;
}
