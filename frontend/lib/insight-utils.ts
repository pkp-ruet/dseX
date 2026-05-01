import type { ScoreItem } from "@/lib/api";
import { getTier, TIER_LABELS } from "@/lib/constants";

// ── Dynamic month/year helpers ───────────────────────────────────────────────

export function getCurrentMonthYear(): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date());
}

export function getCurrentMonthKeywords(): string[] {
  const my = getCurrentMonthYear(); // e.g. "May 2026"
  const [month, year] = my.split(" ");
  return [
    `best stocks to buy ${my}`,
    `best DSE stocks ${month} ${year}`,
    `top shares Bangladesh ${month} ${year}`,
    `DSE picks ${month} ${year}`,
    `best sector ${month} ${year}`,
  ];
}

// ── Filter / sort helpers ────────────────────────────────────────────────────

function compositeMonthScore(item: ScoreItem): number {
  const s = ((item.score ?? 0) / 100) * 0.6;
  const eps = (Math.max(-50, Math.min(100, item.eps_yoy_pct ?? 0)) / 100) * 0.4;
  return s + eps;
}

export function filterInsightItems(items: ScoreItem[], slug: string): ScoreItem[] {
  switch (slug) {
    case "best-dse-stocks-2026":
      return items
        .filter((s) => (s.score ?? 0) >= 55)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 20);

    case "best-bank-stocks-2026":
      return items
        .filter((s) => /bank|nbfi|leasing|finance/i.test(s.sector ?? ""))
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 15);

    case "best-stocks-this-month":
      return items
        .filter((s) => s.score != null)
        .sort((a, b) => compositeMonthScore(b) - compositeMonthScore(a))
        .slice(0, 20);

    case "undervalued-stocks-2026":
      return items
        .filter((s) => s.p4_val != null && (s.score ?? 0) >= 35)
        .sort((a, b) => (b.p4_val ?? 0) - (a.p4_val ?? 0))
        .slice(0, 15);

    case "high-growth-stocks-2026":
      return items
        .filter((s) => s.p1_biz != null && (s.score ?? 0) >= 35)
        .sort((a, b) => (b.p1_biz ?? 0) - (a.p1_biz ?? 0))
        .slice(0, 15);

    default:
      return items
        .filter((s) => s.score != null)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 20);
  }
}

// ── Per-stock insight generation ─────────────────────────────────────────────

type PillarKey = "p1_biz" | "p2_health" | "p3_moat" | "p4_val" | "p5_div";

const PILLAR_LABELS: Record<PillarKey, string> = {
  p1_biz:    "Business Quality",
  p2_health: "Financial Health",
  p3_moat:   "Competitive Moat",
  p4_val:    "Valuation",
  p5_div:    "Dividend",
};

function getPillarSentence(key: PillarKey, item: ScoreItem): string {
  const name = item.company_name ?? item.trading_code;
  switch (key) {
    case "p1_biz": {
      const epsStr =
        item.eps_yoy_pct != null
          ? ` (EPS ${item.eps_yoy_pct > 0 ? "+" : ""}${item.eps_yoy_pct.toFixed(1)}% YoY)`
          : "";
      return `${name} demonstrates consistent earnings growth${epsStr}, ranking among the strongest businesses on the DSEF business quality pillar.`;
    }
    case "p2_health":
      return `The company maintains a healthy balance sheet with manageable debt and positive operating cash flow, a key indicator of financial resilience.`;
    case "p3_moat":
      return `${name} holds a strong competitive position within its sector, reflected in stable revenue and above-average operating margins.`;
    case "p4_val":
      return `At current prices, ${name} trades at a discount relative to both its own historical valuation and sector peers — offering an attractive entry point.`;
    case "p5_div": {
      const divStr =
        item.div_yield_pct != null && item.div_yield_pct > 0
          ? ` (${item.div_yield_pct.toFixed(1)}% yield)`
          : "";
      return `Reliable dividend history${divStr}, consistently returning cash to shareholders over multiple years.`;
    }
    default:
      return "";
  }
}

export function generateStockInsight(item: ScoreItem): string {
  const pillarKeys: PillarKey[] = ["p1_biz", "p2_health", "p3_moat", "p4_val", "p5_div"];

  const pillarValues = pillarKeys.map((k) => ({ key: k, val: item[k] ?? null }));
  const strong = pillarValues
    .filter((p) => p.val != null && p.val >= 6.5)
    .sort((a, b) => (b.val ?? 0) - (a.val ?? 0));
  const weak = pillarValues.filter((p) => p.val != null && p.val < 4);

  const parts: string[] = [];

  if (strong.length > 0) {
    parts.push(getPillarSentence(strong[0].key, item));
    if (strong[1]) parts.push(getPillarSentence(strong[1].key, item));
  } else {
    parts.push(
      `${item.company_name ?? item.trading_code} presents balanced characteristics across the DSEF pillars with room for growth.`
    );
  }

  if (weak.some((p) => p.key === "p4_val")) {
    parts.push("Note: current valuation appears elevated relative to historical and sector peers.");
  }

  const tier = TIER_LABELS[getTier(item.score)];
  parts.push(`Overall DSEF score: ${item.score?.toFixed(1) ?? "—"}/100 (${tier}).`);

  return parts.join(" ");
}

// ── Sector aggregation ───────────────────────────────────────────────────────

export interface SectorSummary {
  sector: string;
  avgScore: number;
  topStock: ScoreItem;
  stockCount: number;
  strongBuyCount: number;
  avgEpsYoy: number | null;
  insight: string;
}

export function getSectorInsights(items: ScoreItem[]): SectorSummary[] {
  const bySector = new Map<string, ScoreItem[]>();
  for (const item of items) {
    const sec = item.sector?.trim() || "Other";
    if (!bySector.has(sec)) bySector.set(sec, []);
    bySector.get(sec)!.push(item);
  }

  const summaries: SectorSummary[] = [];

  for (const [sector, stocks] of bySector) {
    if (stocks.length < 2) continue;
    const scored = stocks.filter((s) => s.score != null);
    if (scored.length === 0) continue;

    const avgScore = scored.reduce((acc, s) => acc + (s.score ?? 0), 0) / scored.length;
    const topStock = scored.reduce((a, b) => ((a.score ?? 0) > (b.score ?? 0) ? a : b));
    const strongBuyCount = scored.filter((s) => (s.score ?? 0) >= 75).length;

    const epsVals = stocks
      .filter((s) => s.eps_yoy_pct != null)
      .map((s) => s.eps_yoy_pct as number);
    const avgEpsYoy =
      epsVals.length > 0 ? epsVals.reduce((a, b) => a + b, 0) / epsVals.length : null;

    const topName = topStock.company_name ?? topStock.trading_code;
    const epsLine =
      avgEpsYoy != null
        ? ` Sector EPS growth averages ${avgEpsYoy > 0 ? "+" : ""}${avgEpsYoy.toFixed(1)}% YoY.`
        : "";
    const insight =
      `${sector} ranks with an average DSEF score of ${avgScore.toFixed(1)}/100 across ${scored.length} stocks. ` +
      `Top performer: ${topName} (score ${topStock.score?.toFixed(1)}). ` +
      `${strongBuyCount} stock${strongBuyCount !== 1 ? "s" : ""} in the Strong Buy tier.` +
      epsLine;

    summaries.push({ sector, avgScore, topStock, stockCount: stocks.length, strongBuyCount, avgEpsYoy, insight });
  }

  return summaries.sort((a, b) => b.avgScore - a.avgScore).slice(0, 12);
}

// ── Pillar display metadata (for InsightCard bars) ───────────────────────────

export const PILLAR_META: { key: PillarKey; label: string; short: string }[] = [
  { key: "p1_biz",    label: "Business Quality", short: "P1" },
  { key: "p2_health", label: "Financial Health",  short: "P2" },
  { key: "p3_moat",   label: "Competitive Moat",  short: "P3" },
  { key: "p4_val",    label: "Valuation",          short: "P4" },
  { key: "p5_div",    label: "Dividend",           short: "P5" },
];

export function pillarColor(val: number | null | undefined): string {
  if (val == null) return "#4B5563";
  if (val >= 7) return "#4ADE80";
  if (val >= 4) return "#FBBF24";
  return "#F87171";
}

export { PILLAR_LABELS };
