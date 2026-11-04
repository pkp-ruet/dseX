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
}

export function toLandingStock(s: ScoreItem): LandingStock {
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
  };
}

/** Household names a Bangladeshi visitor will recognise on sight. The hero
 *  opens on one of these so the first thing on screen is a real report for a
 *  company they know — not a stock they have to look up to care about. */
export const FAMILIAR = [
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

/**
 * The one-tap chips under the hero lookup: up to `n` household names that are
 * in the payload with a score, in FAMILIAR order. Most visitors won't type — a
 * chip swaps the report card on tap, same as picking from the list.
 */
export function pickQuickCodes(stocks: LandingStock[], n = 5): LandingStock[] {
  const byCode = new Map(
    stocks.filter((s) => s.score != null && s.ltp != null).map((s) => [s.code, s]),
  );
  const out: LandingStock[] = [];
  for (const code of FAMILIAR) {
    const s = byCode.get(code);
    if (s) out.push(s);
    if (out.length >= n) break;
  }
  return out;
}

/** "Square Pharmaceuticals PLC." → "Square Pharmaceuticals" — for a chip label. */
export function shortName(s: LandingStock): string {
  const name = (s.name ?? "").replace(/\s+(Limited|Ltd\.?|PLC\.?|Company)\s*$/i, "").trim();
  return name || s.code;
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
  bn: string;
  /** One word, for the narrow five-bar strip on the standout cards. */
  short: string;
  shortBn: string;
}

export const PILLARS: PillarMeta[] = [
  { key: "p1_biz", en: "Profit", bn: "মুনাফা", short: "Profit", shortBn: "মুনাফা" },
  { key: "p2_health", en: "Finances", bn: "আর্থিক অবস্থা", short: "Finances", shortBn: "আর্থিক" },
  { key: "p3_moat", en: "Business", bn: "ব্যবসার শক্তি", short: "Business", shortBn: "ব্যবসা" },
  { key: "p4_val", en: "Price", bn: "দাম", short: "Price", shortBn: "দাম" },
  { key: "p5_div", en: "Dividend", bn: "ডিভিডেন্ড", short: "Dividend", shortBn: "ডিভিডেন্ড" },
];

// Pillar bar colour lives in ONE place: `pillarColor()` in lib/insight-utils.ts
// (tier tokens). The old `pillarBand` / `PILLAR_BAND_COLOR` green/amber/red scale
// was removed 2026-09-22.

// ---------------------------------------------------------------------------
// The company card (2026-10-31 landing redesign; since 2026-11-01 it answers
// "How strong is this company?" — Buy / Sell signals live only inside the
// stock report and the portfolio's Premium sections). Worked out from the
// /api/scores row alone.
// ---------------------------------------------------------------------------

export type WordTone = "good" | "watch" | "bad" | "neutral";

export interface Word {
  en: string;
  bn: string;
  tone: WordTone;
}

const TIER_TONE: Record<string, WordTone> = { excellent: "good", good: "good", average: "neutral", weak: "bad" };

/** The grade as the card's one-word answer, in its tone. */
export function landingGrade(tier: string, tierEn: string, tierBn: string): Word {
  return { en: tierEn, bn: tierBn, tone: TIER_TONE[tier] ?? "neutral" };
}

/** "Strong: profit, finances · Weak: dividend" from the grade's four business
 *  checks (strong ≥ 7, weak < 4). The price is not one of them since
 *  2026-11-05 — it has its own light. */
export function landingChecksLine(s: LandingStock): { en: string; bn: string } | null {
  const isGrade = (p: PillarMeta) => p.key !== "p4_val";
  const strong = PILLARS.filter((p, i) => isGrade(p) && (s.pillars[i] ?? -1) >= 7);
  const weak = PILLARS.filter((p, i) => isGrade(p) && s.pillars[i] != null && (s.pillars[i] as number) < 4);
  if (!strong.length && !weak.length) return null;
  const en: string[] = [];
  const bn: string[] = [];
  if (strong.length) {
    en.push(`Strong: ${strong.map((p) => p.short.toLowerCase()).join(", ")}`);
    bn.push(`শক্তিশালী: ${strong.map((p) => p.shortBn).join(", ")}`);
  }
  if (weak.length) {
    en.push(`Weak: ${weak.map((p) => p.short.toLowerCase()).join(", ")}`);
    bn.push(`দুর্বল: ${weak.map((p) => p.shortBn).join(", ")}`);
  }
  return { en: en.join(" · "), bn: bn.join(" · ") };
}

export interface Light {
  key: "company" | "price" | "dividend";
  label: { en: string; bn: string };
  word: Word;
}

/** The three lights under the grade: the company, the price, the dividend. */
export function landingLights(s: LandingStock, tier: string, tierEn: string, tierBn: string): Light[] {
  const p4 = s.pillars[3];
  const p5 = s.pillars[4];
  const price: Word =
    p4 == null ? { en: "Not known", bn: "জানা নেই", tone: "neutral" }
    : p4 >= 7 ? { en: "Low", bn: "কম", tone: "good" }
    : p4 >= 4 ? { en: "Fair", bn: "ন্যায্য", tone: "neutral" }
    : { en: "High", bn: "বেশি", tone: "bad" };
  const dividend: Word =
    p5 == null ? { en: "Not known", bn: "জানা নেই", tone: "neutral" }
    : !s.divY ? { en: "None lately", bn: "সম্প্রতি নেই", tone: "bad" }
    : p5 >= 7 ? { en: "Steady", bn: "নিয়মিত", tone: "good" }
    : p5 >= 4 ? { en: "Some years", bn: "কিছু বছর", tone: "neutral" }
    : { en: "Patchy", bn: "অনিয়মিত", tone: "watch" };
  return [
    { key: "company", label: { en: "The company", bn: "কোম্পানি" }, word: landingGrade(tier, tierEn, tierBn) },
    { key: "price", label: { en: "The price", bn: "দাম" }, word: price },
    { key: "dividend", label: { en: "Cash dividend", bn: "নগদ ডিভিডেন্ড" }, word: dividend },
  ];
}

export interface PlainQuestion {
  q: { en: string; bn: string };
  a: Word;
}

/** Four of the stock report's plain questions, answered from the pillars —
 *  the "Understand any share" card on the landing page. */
export function plainQuestions(s: LandingStock): PlainQuestion[] {
  const [p1, p2, , p4, p5] = s.pillars;
  const out: PlainQuestion[] = [];
  if (p1 != null) {
    out.push({
      q: { en: "Does it make money?", bn: "মুনাফা করছে কি?" },
      a: s.eps != null && s.eps <= 0 ? { en: "No", bn: "না", tone: "bad" }
        : p1 >= 6 ? { en: "Yes", bn: "হ্যাঁ", tone: "good" }
        : { en: "A little", bn: "অল্প", tone: "watch" },
    });
  }
  if (p2 != null) {
    out.push({
      q: { en: "Can it handle its loans?", bn: "ঋণ সামলাতে পারবে?" },
      a: p2 >= 7 ? { en: "Easily", bn: "সহজেই", tone: "good" }
        : p2 >= 4 ? { en: "Watch this", bn: "খেয়াল রাখুন", tone: "watch" }
        : { en: "Risky", bn: "ঝুঁকি আছে", tone: "bad" },
    });
  }
  if (p4 != null) {
    out.push({
      q: { en: "Is the price right?", bn: "দাম কি ঠিক আছে?" },
      a: p4 >= 7 ? { en: "Low", bn: "কম", tone: "good" }
        : p4 >= 4 ? { en: "Fair", bn: "ন্যায্য", tone: "neutral" }
        : { en: "High", bn: "বেশি", tone: "bad" },
    });
  }
  if (p5 != null) {
    out.push({
      q: { en: "Does it pay a dividend?", bn: "ডিভিডেন্ড দেয় কি?" },
      a: p5 >= 6 ? { en: "Yes", bn: "হ্যাঁ", tone: "good" }
        : p5 >= 3 ? { en: "A little", bn: "অল্প", tone: "watch" }
        : { en: "No", bn: "না", tone: "bad" },
    });
  }
  return out;
}

/** "Strong" / "Good" / "Fair" / "Weak" for a 0–10 check (same cut-offs as the
 *  stock page's five bars). */
export function checkWord(v: number): { en: string; bn: string } {
  return v >= 8 ? { en: "Strong", bn: "শক্তিশালী" }
    : v >= 6 ? { en: "Good", bn: "ভালো" }
    : v >= 4 ? { en: "Fair", bn: "মোটামুটি" }
    : { en: "Weak", bn: "দুর্বল" };
}
