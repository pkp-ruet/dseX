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
  /** The signal's reason key (`signal_service.REASONS`), so the answer card can
   *  name what is holding a good company back. */
  rk: string | null;
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
    rk: s.signal?.reason_key ?? null,
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
// The answer card (2026-10-31 landing redesign): the stock page's "Should you
// buy it today?" read, worked out from the /api/scores row alone. It follows
// the backend signal (never derives buy / sell itself) and only names a
// problem the signal itself found, so it can't disagree with the stock page.
// ---------------------------------------------------------------------------

export type WordTone = "good" | "watch" | "bad" | "neutral";

export interface Word {
  en: string;
  bn: string;
  tone: WordTone;
}

/** The one-word answer: the signal, worded the way the stock page words it. */
export function landingAnswer(s: LandingStock): Word {
  if (s.sig === "buy") return { en: "Buy", bn: "কেনা যায়", tone: "good" };
  if (s.sig === "sell") return { en: "Avoid", bn: "এড়িয়ে চলুন", tone: "bad" };
  if (s.rk === "not_rated" || s.score == null) return { en: "Not rated yet", bn: "এখনো রেটিং নেই", tone: "neutral" };
  if (s.rk === "average_fundamentals") return { en: "No reason to buy", bn: "কেনার কারণ নেই", tone: "neutral" };
  return { en: "Not yet", bn: "এখনই নয়", tone: "watch" };
}

/** The problems the signal checks for, named in a few words. */
const PROBLEM: Record<string, Word> = {
  red_flag: { en: "A serious warning", bn: "গুরুতর সতর্কতা", tone: "bad" },
  z_category: { en: "Z category", bn: "Z ক্যাটাগরি", tone: "bad" },
  heavy_debt: { en: "Heavy loans", bn: "ঋণ অনেক বেশি", tone: "bad" },
  stale_financials: { en: "Old accounts", bn: "পুরোনো হিসাব", tone: "bad" },
  earnings_dropped: { en: "Profit fell sharply", bn: "মুনাফা অনেক কমেছে", tone: "watch" },
  thin_trading: { en: "Hard to sell", bn: "বিক্রি করা কঠিন", tone: "watch" },
};

const TIER_TONE: Record<string, WordTone> = { excellent: "good", good: "good", average: "neutral", weak: "bad" };

export interface Light {
  key: "company" | "price" | "wrong";
  label: { en: string; bn: string };
  word: Word;
}

/** The three lights under the answer: the company, the price, anything wrong. */
export function landingLights(s: LandingStock, tier: string, tierEn: string, tierBn: string): Light[] {
  const p4 = s.pillars[3];
  const price: Word =
    s.rk === "near_52w_high" ? { en: "Near its yearly top", bn: "বছরের সর্বোচ্চের কাছে", tone: "watch" }
    : s.sig === "buy" && s.strong ? { en: "Very low", bn: "খুব কম", tone: "good" }
    : p4 == null ? { en: "Not known", bn: "জানা নেই", tone: "neutral" }
    : p4 >= 7 ? { en: "Low", bn: "কম", tone: "good" }
    : p4 >= 4 ? { en: "Fair", bn: "ন্যায্য", tone: "neutral" }
    : { en: "High", bn: "বেশি", tone: "bad" };
  const wrong: Word =
    (s.rk ? PROBLEM[s.rk] : undefined)
    ?? (s.sig === "buy"
      ? { en: "Nothing serious", bn: "গুরুতর কিছু নেই", tone: "good" }
      : { en: "See the report", bn: "রিপোর্টে দেখুন", tone: "neutral" });
  return [
    { key: "company", label: { en: "The company", bn: "কোম্পানি" }, word: { en: tierEn, bn: tierBn, tone: TIER_TONE[tier] ?? "neutral" } },
    { key: "price", label: { en: "The price", bn: "দাম" }, word: price },
    { key: "wrong", label: { en: "Anything wrong", bn: "কোনো সমস্যা" }, word: wrong },
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
