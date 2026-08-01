import type { ScoreItem } from "@/lib/api";

/**
 * Landing-page data shapes.
 *
 * The hero's stock lookup runs entirely off the /api/scores payload the page
 * already fetches — no per-keystroke network call, so an answer appears the
 * instant a visitor picks a company. That speed is part of the pitch, so keep
 * this projection lean: it is serialized into the SSR payload for every stock.
 */

export interface LandingStock {
  code: string;
  name: string | null;
  sector: string | null;
  /** DSE market category (A / B / N / Z). */
  category: string | null;
  score: number | null;
  ltp: number | null;
  /** Day change, percent. */
  chg: number | null;
  eps: number | null;
  /** Latest-year EPS change vs the year before, percent. */
  epsG: number | null;
  divY: number | null;
  /** The five pillars, 0–10, in P1..P5 order. */
  pillars: (number | null)[];
  /** Financial year the latest report covers. */
  year: number | null;
  stale: boolean;
  sig: "buy" | "sell" | "none";
  strong: boolean;
  reasonBn: string | null;
  reasonEn: string | null;
}

export function toLandingStock(s: ScoreItem): LandingStock {
  const sig = s.signal?.signal;
  return {
    code: s.trading_code,
    name: s.company_name,
    sector: s.sector,
    category: s.market_category,
    score: s.score,
    ltp: s.ltp,
    chg: s.change_pct,
    eps: s.eps,
    epsG: s.eps_yoy_pct,
    divY: s.div_yield_pct,
    pillars: [
      s.p1_biz ?? null,
      s.p2_health ?? null,
      s.p3_moat ?? null,
      s.p4_val ?? null,
      s.p5_div ?? null,
    ],
    year: s.last_reported_year ?? null,
    stale: Boolean(s.stale_data),
    sig: sig === "buy" || sig === "sell" ? sig : "none",
    strong: s.signal?.strength === "strong",
    reasonBn: s.signal?.reason_bn ?? null,
    reasonEn: s.signal?.reason_en ?? null,
  };
}

/** Household names a Bangladeshi visitor will recognise on sight. The hero
 *  opens on one of these so the first thing on screen is a real report for a
 *  company they know — not a stock they have to look up to care about. */
const FAMILIAR = [
  "GP", "SQURPHARMA", "BATBC", "BRACBANK", "BEXIMCO", "WALTONHIL",
  "ROBI", "LHBL", "RENATA", "CITYBANK", "OLYMPIC", "BSCCL", "TITASGAS",
];

/**
 * Which stock the hero shows before the visitor types anything.
 *
 * Prefers a familiar name that has both a score and enough pillar data to make
 * the card look like the real thing, then falls back to the highest-scored
 * company with data. Never invents a code that isn't in the payload.
 */
export function pickHeroCode(stocks: LandingStock[]): string | null {
  if (stocks.length === 0) return null;
  const usable = stocks.filter(
    (s) => s.score != null && s.pillars.some((p) => p != null) && s.ltp != null,
  );
  if (usable.length === 0) return stocks[0].code;

  const byCode = new Map(usable.map((s) => [s.code, s]));
  for (const code of FAMILIAR) {
    if (byCode.has(code)) return code;
  }
  return [...usable].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0].code;
}

// ---------------------------------------------------------------------------
// The five pillars — plain-language names for the hero report card's bars, in
// P1..P5 order. Names only: the written-out method (weights, what each pillar
// asks, the adjustments) lives on /about, which owns its own copy. The landing
// page deliberately no longer explains the scoring in prose.
// ---------------------------------------------------------------------------

export interface PillarMeta {
  key: string;
  en: string;
  /** One word, for the narrow five-bar strip on the standout cards. */
  short: string;
}

export const PILLARS: PillarMeta[] = [
  { key: "p1_biz", en: "Profit quality", short: "Profit" },
  { key: "p2_health", en: "Financial health", short: "Health" },
  { key: "p3_moat", en: "Business strength", short: "Strength" },
  { key: "p4_val", en: "Is the price fair", short: "Price" },
  { key: "p5_div", en: "Dividend reliability", short: "Dividend" },
];

/** 0–10 pillar score → plain verdict. Thresholds match plain-language.ts. */
export function pillarBand(v: number | null): "strong" | "fair" | "weak" | "none" {
  if (v == null) return "none";
  if (v >= 7) return "strong";
  if (v >= 4) return "fair";
  return "weak";
}

export const PILLAR_BAND_COLOR: Record<string, string> = {
  strong: "var(--positive)",
  fair: "var(--np-cautious)",
  weak: "var(--negative)",
  none: "var(--text-muted)",
};
