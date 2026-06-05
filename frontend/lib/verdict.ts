import type { CompanyDetail } from "@/lib/api";
import { getTier, TIER_LABELS } from "@/lib/constants";

/**
 * Generate a plain-English verdict sentence for general users.
 */
export function generateVerdictSentence(detail: CompanyDetail): string {
  const { profile, score_row } = detail;
  const name = profile.company_name ?? profile.trading_code;
  const score = score_row?.score as number | null;
  const tier = getTier(score);
  const tierLabel = TIER_LABELS[tier];

  if (score == null) {
    return `${name} does not have enough data for a full analysis score yet.`;
  }

  const parts: string[] = [];
  parts.push(`${name} scores ${score.toFixed(1)}/100 \u2014 rated ${tierLabel}.`);

  // Pillar-based qualifiers
  const positives: string[] = [];
  const concerns: string[] = [];

  const p1 = score_row?.p1_biz as number | null;
  const p2 = score_row?.p2_health as number | null;
  const p3 = score_row?.p3_moat as number | null;
  const p4 = score_row?.p4_val as number | null;
  const p5 = score_row?.p5_div as number | null;

  if (p1 != null) {
    if (p1 >= 7) positives.push("makes profit year after year");
    else if (p1 < 4) concerns.push("profits are weak or uneven");
  }

  if (p2 != null) {
    if (p2 >= 7) positives.push("has a healthy balance sheet");
    else if (p2 < 4) concerns.push("the balance sheet has some weak spots");
  }

  if (p3 != null) {
    if (p3 >= 7) positives.push("has a strong position over its competitors");
    else if (p3 < 4) concerns.push("has little advantage over competitors");
  }

  if (p5 != null) {
    if (p5 >= 7) positives.push("pays dividends regularly");
    else if (p5 < 4) concerns.push("has not paid dividends regularly");
  }

  if (positives.length > 0) {
    parts.push(`It ${joinNatural(positives)}.`);
  }
  if (concerns.length > 0) {
    parts.push(`However, ${joinNatural(concerns)}.`);
  }

  // Valuation context
  if (p4 != null) {
    if (p4 >= 7) parts.push("The share price looks cheap right now.");
    else if (p4 < 4) parts.push("The share price looks expensive compared to past years.");
  }

  return parts.join(" ");
}

function joinNatural(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/**
 * Return a plain-English interpretation for a pillar score.
 */
export function pillarInterpretation(pillarKey: string, score: number | null): string {
  if (score == null) return "Insufficient data to assess.";

  const s = score; // 0-10 scale
  const map: Record<string, [string, string, string]> = {
    p1_biz: [
      "Makes strong profits every year",
      "Profits are okay but uneven from year to year",
      "Profits are weak or falling",
    ],
    p2_health: [
      "Healthy balance sheet, plenty of cash",
      "Balance sheet is acceptable",
      "Too much debt — financial health is a worry",
    ],
    p3_moat: [
      "Has strong advantages over competitors",
      "Has some advantage over competitors",
      "Has little advantage over competitors — hard to raise prices",
    ],
    p4_val: [
      "Cheaper than its own past price",
      "Priced fairly at the current level",
      "Looks expensive compared to its own past",
    ],
    p5_div: [
      "Pays growing dividends every year",
      "Pays dividends sometimes, not every year",
      "Rarely or never pays dividends",
    ],
  };

  const labels = map[pillarKey];
  if (!labels) return "";

  if (s >= 7) return labels[0];
  if (s >= 4) return labels[1];
  return labels[2];
}

/** Tooltip explanations for sub-metrics */
export const SUB_METRIC_TOOLTIPS: Record<string, string> = {
  p1_eps_consist: "How many of the last 5 years had positive EPS",
  p1_eps_cagr: "Compound annual growth rate of EPS over 5 years",
  p1_roe: "Average return on equity over 3 years",
  p1_npm_trend: "Net profit margin trend direction",
  p2_de: "Debt-to-equity ratio (lower is better)",
  p2_ic: "Interest coverage ratio (higher is better)",
  p2_cfo: "Operating cash flow vs net profit quality",
  p2_cash: "Cash & equivalents as % of total assets",
  p3_margin: "Gross margin (or net interest margin for banks)",
  p3_rev_vol: "Revenue stability and growth consistency",
  p3_sector_rank: "Revenue rank within the sector",
  p3_capex: "Capital expenditure relative to revenue",
  p4_pe: "P/E ratio vs own history and sector peers",
  p4_pb: "P/B ratio vs own history and sector peers",
  p5_dps_cagr: "Dividend per share growth rate",
  p5_consist: "Number of years dividends were paid",
  p5_yield: "Current dividend yield score",
};
