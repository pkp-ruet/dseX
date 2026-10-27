import type { ScoreItem, PortfolioHolding, HoldingSignalInfo, BuyNext, BuyNextKind } from "@/lib/api";
import { getTier, SIGNAL_LABELS, SIGNAL_LABELS_BN, type TierKey } from "@/lib/constants";

export interface ComputedRow {
  holding: PortfolioHolding;
  ltp: number | null;
  company_name: string | null;
  cost_basis: number;
  current_value: number | null;
  pnl: number | null;
  pnl_pct: number | null;
  /** 52-week high/low, when known — powers the "near its high" awareness check. */
  w52_high?: number | null;
  w52_low?: number | null;
}

/** Language for all user-facing copy the analysis generates. */
export type AnalysisLang = "en" | "bn";

// Numbers inside Bengali prose stay Western (9, 6.1%) — matches the rest of the
// site and avoids webfont glyph issues with Bengali numerals on some devices.

/**
 * Today's change in the portfolio's market value (delta + %), derived from each
 * holding's `change_pct`. `prevClose = ltp / (1 + pct/100)`, so today's value
 * change for a holding is `qty * (ltp - prevClose)`. Returns null when no
 * holding has both a live price and a change figure.
 */
export function portfolioTodayMove(
  holdings: PortfolioHolding[],
  priceMap: Map<string, ScoreItem>,
): { delta: number; pct: number } | null {
  let delta = 0;
  let prevValue = 0;
  let any = false;
  for (const h of holdings) {
    const item = priceMap.get(h.trading_code.toUpperCase());
    const ltp = item?.ltp;
    const pct = item?.change_pct;
    if (ltp == null || pct == null) continue;
    // A -100% (or worse) change means a bad price row (e.g. a zero official
    // close scraped intraday), and would make prevClose = ltp / 0 = Infinity —
    // the hero once rendered "−৳Infinity (NaN%)". Skip the holding instead.
    if (!Number.isFinite(ltp) || !Number.isFinite(pct) || pct <= -100) continue;
    const prevClose = ltp / (1 + pct / 100);
    delta += h.qty * (ltp - prevClose);
    prevValue += h.qty * prevClose;
    any = true;
  }
  if (!any || prevValue <= 0) return null;
  return { delta, pct: (delta / prevValue) * 100 };
}

export type SectorBucket = "BANK" | "NBFI" | "GENERAL" | "OTHER";
export type TierBucket = TierKey | "unscored";
export type QualityWord = "Strong" | "Solid" | "Average" | "Weak" | "Unrated";
/** How the price paid compared with what the company earned — the "did you
 *  overpay?" half of a holding's entry story. Judged on the buy price against
 *  the company's latest yearly EPS, relative to its sector's median P/E. */
export type EntryValuation = "cheap" | "fair" | "expensive" | "unknown";
/** (what you paid) × (how it has gone since): a cheap / fair / expensive entry
 *  crossed with up (≥ +5%), flat, or down (≤ −5%) — plus three "can't judge"
 *  states. */
export type EntryTag =
  | "cheap_up"
  | "cheap_flat"
  | "cheap_down"
  | "fair_up"
  | "fair_flat"
  | "fair_down"
  | "expensive_up"
  | "expensive_flat"
  | "expensive_down"
  | "loss_making"
  | "no_data"
  | "no_price";

export type HoldingSignal = "buy_more" | "sell" | "none";

export interface SignalInfo {
  signal: HoldingSignal;
  /** Display label — English or Bengali depending on the analysis language. Empty for `none`. */
  label: string;
  /** Plain-language one-liner explaining why this signal was given. */
  reason: string;
  /** True when we lack the data to give a real signal — render dimmed. */
  muted?: boolean;
}

export interface HoldingInsight {
  code: string;
  companyName: string | null;
  sector: string | null;
  sectorBucket: SectorBucket;
  weightPct: number;
  qty: number;
  buyPrice: number;
  ltp: number | null;
  pnlPct: number | null;
  /** Position of LTP within the 52-week range (0 = at low, 1 = at high), or null. */
  rangePos: number | null;
  score: number | null;
  tierKey: TierBucket;
  qualityWord: QualityWord;
  entryTag: EntryTag;
  entryLabel: string;
  /** Buy price ÷ latest yearly EPS — what you paid per taka of earnings. */
  entryPe: number | null;
  /** Median P/E of the company's sector (market-wide when the sector is thin). */
  sectorPe: number | null;
  /** Did you overpay? Judged on the buy price — see the Entry block. */
  entryValuation: EntryValuation;
  /** 0–10 entry quality feeding the weighted Entry sub-score; null = can't judge. */
  entryScore: number | null;
  /** Today's valuation from the scoring pillar (cheap ≥ 7, expensive < 4). */
  valuationNow: EntryValuation;
  /** DSE market category (A / B / N / Z), upper-cased. */
  marketCategory: string | null;
  /** Latest accounts are 2+ years old — the score rests on stale numbers. */
  staleData: boolean;
  dataAgeYears: number | null;
  signal: SignalInfo;
  descriptor: string;
  oneLiner: string;
  pillars: {
    p1_biz: number | null;
    p2_health: number | null;
    p3_moat: number | null;
    p4_val: number | null;
    p5_div: number | null;
  };
  flags: {
    weakFinances: boolean;
    weakEarnings: boolean;
    earningsShrinking: boolean;
    expensiveEntry: boolean;
    nearHigh: boolean;
    zCategory: boolean;
    staleData: boolean;
  };
}

export type Grade = "A" | "B" | "C" | "D" | "F";
export type GradeLabel = "Excellent" | "Good" | "Okay" | "Risky" | "Very Risky";

/** What each grade label reads as on screen, in both languages. */
export const GRADE_WORDS: Record<GradeLabel, { en: string; bn: string }> = {
  Excellent: { en: "Excellent", bn: "চমৎকার" },
  Good: { en: "Good", bn: "ভালো" },
  Okay: { en: "Fair", bn: "মোটামুটি" },
  Risky: { en: "Risky", bn: "ঝুঁকিপূর্ণ" },
  "Very Risky": { en: "Very risky", bn: "খুব ঝুঁকিপূর্ণ" },
};

export interface PortfolioAnalysis {
  /** Language all generated copy is written in. */
  lang: AnalysisLang;
  grade: Grade;
  gradeLabel: GradeLabel;
  headline: string;
  /** Plain-language explanation of what the grade means and how it's calculated. */
  gradeExplanation: string;
  good: string[];
  bad: string[];
  consider: string[];
  holdings: HoldingInsight[];
  sectorSpread: { name: string; weightPct: number; count: number }[];
  subScores: { spread: number; quality: number; entry: number; overall: number };
  /** Herfindahl-based "effective number of stocks" — concentration-honest count. */
  effectiveStocks: number;
  /** The inputs behind the three sub-scores, for the page's "How we decide". */
  breakdown: {
    sectorPenalty: number;
    baseQuality: number;
    weakPenalty: number;
    strugglingPenalty: number;
    categoryPenalty: number;
    stalePenalty: number;
    /** Share of the money whose price paid could be judged (has a positive EPS). */
    judgeablePct: number;
  };
  /** Biggest single concentration risk: a large position in a below-good company. */
  topRisk: {
    code: string;
    weightPct: number;
    tierKey: TierBucket;
    qualityWord: QualityWord;
  } | null;
}

// ── helpers ────────────────────────────────────────────────────────────────

/** Banks, NBFIs / leasing and insurers — they move together with interest
 *  rates and regulation, so the analysis treats them as one group. */
export function isFinancialSector(sec: string | null | undefined): boolean {
  return !!sec && /bank|financ|nbfi|leasing|insuranc/.test(sec.toLowerCase());
}

function sectorBucketOf(sector: string | null): SectorBucket {
  if (!sector) return "OTHER";
  const s = sector.toLowerCase();
  if (/non-bank|nbfi|leasing|finance/.test(s)) return "NBFI";
  if (s.includes("bank")) return "BANK";
  return "GENERAL";
}

function tierBucket(score: number | null | undefined): TierBucket {
  if (score == null) return "unscored";
  return getTier(score);
}

const QUALITY_WORD: Record<TierBucket, QualityWord> = {
  excellent: "Strong",
  good: "Solid",
  average: "Average",
  weak: "Weak",
  unscored: "Unrated",
};

// ── Entry (what you paid) ──────────────────────────────────────────────────
//
// "Entry" answers one question: did you overpay when you bought? It is judged
// on the price you PAID, never on today's price — a stock bought cheap that
// then rallied must not be marked "expensive". (The pre-2026-09 version read
// the live valuation pillar here and did exactly that, penalising the user's
// best trades.) Today's valuation still matters for what to do NEXT, so it
// lives in `valuationNow` and drives the "book some profit" / "average down"
// ideas instead.
//
// Method: entry P/E = buy price ÷ the company's latest yearly EPS, compared
// with the median P/E of its sector (market-wide when the sector has too few
// profitable companies). The ratio maps onto the same cheap / fair / expensive
// bands the backend valuation pillar uses (scoring_service._a2_pe_pb_ratio_score),
// so "expensive" means the same thing on the stock page and here. The latest
// EPS stands in for what the company earned when the shares were bought — the
// label says "earned last year" so the approximation is visible.

/** Linear interpolation across (x, y) anchors, clamped at both ends. */
function piecewise(x: number, anchors: [number, number][]): number {
  if (x <= anchors[0][0]) return anchors[0][1];
  for (let i = 1; i < anchors.length; i++) {
    const [x1, y1] = anchors[i];
    if (x <= x1) {
      const [x0, y0] = anchors[i - 1];
      return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return anchors[anchors.length - 1][1];
}

/** Entry P/E ÷ sector median P/E → 0–10. Paying the sector's going rate scores
 *  8.5 (a fair price is a good outcome, not a shortfall); 1.2× the sector is the
 *  edge of "expensive" (6); 2× or worse bottoms out at 1. */
const ENTRY_SCORE_ANCHORS: [number, number][] = [
  [0.5, 10], [0.85, 10], [1.0, 8.5], [1.2, 6], [1.5, 3], [2.0, 1],
];
/** Ratio bands — mirror the valuation pillar's cheap (p4 ≥ 7 ≈ ≤0.9×) and
 *  expensive (p4 < 4 ≈ ≥1.2×) cut-offs. */
const ENTRY_CHEAP_RATIO = 0.9;
const ENTRY_EXPENSIVE_RATIO = 1.2;
/** Absolute guard: on the DSE a P/E above ~30 is expensive whatever the sector
 *  median says (five barely-profitable names can post an absurd median).
 *  Implemented as ratio ≥ entryPe / 25, so P/E 30 → ≥1.2× (expensive). */
const ENTRY_ABS_PE_DIVISOR = 25;
/** A sector needs this many profitable companies before its own median is used. */
const SECTOR_PE_MIN_SAMPLES = 5;

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Median trailing P/E per sector from the whole-market scores payload, plus a
 * market-wide median as the fallback for thin sectors. Only profitable
 * companies (EPS > 0) count — a loss-maker has no P/E.
 */
function sectorMedianPeMap(priceMap: Map<string, ScoreItem>): {
  bySector: Map<string, number>;
  market: number | null;
} {
  const perSector = new Map<string, number[]>();
  const all: number[] = [];
  for (const s of priceMap.values()) {
    if (s.eps == null || s.eps <= 0 || s.ltp == null || s.ltp <= 0) continue;
    const pe = s.ltp / s.eps;
    all.push(pe);
    if (s.sector) {
      const arr = perSector.get(s.sector) ?? [];
      arr.push(pe);
      perSector.set(s.sector, arr);
    }
  }
  const bySector = new Map<string, number>();
  for (const [sector, pes] of perSector) {
    if (pes.length < SECTOR_PE_MIN_SAMPLES) continue;
    const m = median(pes);
    if (m != null) bySector.set(sector, m);
  }
  return { bySector, market: all.length >= SECTOR_PE_MIN_SAMPLES ? median(all) : null };
}

interface EntryJudgement {
  entryPe: number | null;
  sectorPe: number | null;
  valuation: EntryValuation;
  /** 0–10 entry quality, or null when it can't be judged. */
  score: number | null;
  /** True when the company has no positive EPS to judge against. */
  lossMaking: boolean;
}

function judgeEntry(
  buyPrice: number,
  eps: number | null | undefined,
  sectorPe: number | null,
): EntryJudgement {
  const none: EntryJudgement = {
    entryPe: null, sectorPe, valuation: "unknown", score: null, lossMaking: false,
  };
  if (eps == null || !Number.isFinite(eps) || buyPrice <= 0) return none;
  if (eps <= 0) return { ...none, lossMaking: true };
  const entryPe = buyPrice / eps;
  if (sectorPe == null || sectorPe <= 0) return { ...none, entryPe };
  const ratio = Math.max(entryPe / sectorPe, entryPe / ENTRY_ABS_PE_DIVISOR);
  const valuation: EntryValuation =
    ratio <= ENTRY_CHEAP_RATIO ? "cheap" : ratio < ENTRY_EXPENSIVE_RATIO ? "fair" : "expensive";
  return {
    entryPe,
    sectorPe,
    valuation,
    score: piecewise(ratio, ENTRY_SCORE_ANCHORS),
    lossMaking: false,
  };
}

/** Today's valuation from the scoring pillar — the same bands the signal uses. */
function valuationNowOf(p4: number | null | undefined): EntryValuation {
  if (p4 == null) return "unknown";
  if (p4 >= 7) return "cheap";
  if (p4 >= 4) return "fair";
  return "expensive";
}

/** "9" for 9.03, "8.5" for 8.46, "15" for 15.3 — a P/E rounded the way a
 *  person would say it (one decimal only below 10, and never a trailing ".0"). */
function fmtPe(pe: number): string {
  return pe >= 10 ? pe.toFixed(0) : String(Math.round(pe * 10) / 10);
}

/** The P/E in plain words: what you paid for every taka the company earned
 *  last year, next to what similar companies cost. */
function entryNumbersSentence(entryPe: number, sectorPe: number, lang: AnalysisLang): string {
  const paid = fmtPe(entryPe);
  const peers = fmtPe(sectorPe);
  return lang === "bn"
    ? `এই কোম্পানি গত বছর যে 1 টাকা আয় করেছে, তার জন্য আপনি দিয়েছেন প্রায় ${paid} টাকা; একই ধরনের কোম্পানিতে লাগে প্রায় ${peers} টাকা।`
    : `For every 1 taka this company earned last year, you paid about ${paid} taka; similar companies cost about ${peers} taka.`;
}

/** Long, plain-language entry explanations per tag, in both languages. `{n}`
 *  is replaced with the holding's gain/loss percentage (absolute value). */
const ENTRY_SITUATION: Record<AnalysisLang, Record<EntryTag, string>> = {
  en: {
    no_price:
      "We don't have a live price for this stock right now, so we can't tell yet how your purchase is doing. Check back when the market reopens.",
    no_data:
      "We don't have enough financial data on this company to judge whether the price you paid was fair. Be a bit more careful with this one until more numbers are available.",
    loss_making:
      "This company isn't making a profit right now, so there are no earnings to judge your buying price against. Be extra careful with it, because a company making a loss can look cheap for a very long time.",
    cheap_up:
      "You bought at a low price, and it has paid off: you are up {n}%. There is nothing to fix here.",
    cheap_flat:
      "You bought at a low price. The market has not rewarded it yet, but you did not overpay, so give it time.",
    cheap_down:
      "You bought at a low price, yet the share has fallen {n}%. The price was not the problem. Check whether something has changed in the business before you decide.",
    fair_up:
      "You paid a fair price, and you are up {n}%. That is a sound result. Holding on lets the business keep growing.",
    fair_flat:
      "You paid a fair price. There is nothing urgent to do; holding on lets the business grow.",
    fair_down:
      "You paid a fair price, so this {n}% loss is not from overpaying. Selling in a hurry is rarely wise; give the company time to recover.",
    expensive_up:
      "You paid a high price, but it has worked out so far: you are up {n}%. This gain depends on the market staying generous, so you may want to take part of it.",
    expensive_flat:
      "You paid a high price, and the share has not moved. The company has to grow a lot to justify that price, so keep your expectations modest.",
    expensive_down:
      "You paid a high price, and the share has fallen {n}%. Overpaying is a common mistake. Before you decide to hold, buy more or sell, check today's price verdict on the share's page.",
  },
  bn: {
    no_price:
      "এই শেয়ারের লাইভ দাম এখন আমাদের কাছে নেই, তাই আপনার কেনাটা কেমন চলছে এখনই বলা যাচ্ছে না। বাজার খুললে আবার দেখুন।",
    no_data:
      "এই কোম্পানির যথেষ্ট আর্থিক তথ্য আমাদের কাছে নেই, তাই আপনার কেনা দাম ঠিক ছিল কি না বলা কঠিন। আরও তথ্য না আসা পর্যন্ত এটি নিয়ে একটু সাবধানে থাকুন।",
    loss_making:
      "এই কোম্পানি এখন মুনাফা করছে না, তাই আপনার কেনার দাম যাচাই করার মতো কোনো মুনাফা নেই। এটি নিয়ে বাড়তি সাবধান থাকুন, কারণ লোকসানি কোম্পানি অনেক দিন সস্তা দেখাতে পারে।",
    cheap_up:
      "আপনি কম দামে কিনেছিলেন, আর তার ফলও পেয়েছেন: {n}% লাভে আছেন। এখানে কিছু ঠিক করার নেই।",
    cheap_flat:
      "আপনি কম দামে কিনেছিলেন। বাজার এখনো তার মূল্য দেয়নি, তবে আপনি বাড়তি দাম দেননি, তাই সময় দিন।",
    cheap_down:
      "আপনি কম দামে কিনেছিলেন, তবু শেয়ারটির দাম {n}% কমেছে। সমস্যা দামে ছিল না। সিদ্ধান্তের আগে দেখুন ব্যবসায় কিছু বদলেছে কি না।",
    fair_up:
      "আপনি ন্যায্য দামে কিনেছেন, আর {n}% লাভে আছেন। এটি ভালো ফল। ধরে রাখলে ব্যবসা বাড়ার সুযোগ পায়।",
    fair_flat:
      "আপনি ন্যায্য দামে কিনেছেন। জরুরি কিছু করার নেই; ধরে রাখলে ব্যবসা বাড়ার সুযোগ পায়।",
    fair_down:
      "আপনি ন্যায্য দামে কিনেছেন, তাই এই {n}% লোকসান বাড়তি দাম দেওয়ার কারণে নয়। তাড়াহুড়ো করে বিক্রি করা খুব কমই ভালো হয়; কোম্পানিকে ঘুরে দাঁড়ানোর সময় দিন।",
    expensive_up:
      "আপনি বেশি দামে কিনেছিলেন, তবু এখন পর্যন্ত ভালো গেছে: {n}% লাভে আছেন। এই লাভ বাজার চাঙা থাকার ওপর নির্ভর করছে, তাই কিছুটা লাভ তুলে নেওয়ার কথা ভাবতে পারেন।",
    expensive_flat:
      "আপনি বেশি দামে কিনেছিলেন, আর শেয়ারটির দাম তেমন নড়েনি। এই দামের যোগ্য হতে কোম্পানিকে অনেক বাড়তে হবে, তাই প্রত্যাশা সীমিত রাখুন।",
    expensive_down:
      "আপনি বেশি দামে কিনেছিলেন, আর শেয়ারটির দাম {n}% কমেছে। বাড়তি দামে কেনা একটি সাধারণ ভুল। ধরে রাখবেন, আরও কিনবেন, নাকি বিক্রি করবেন, তা ঠিক করার আগে শেয়ারের পেজে আজকের দামের মূল্যায়ন দেখুন।",
  },
};

function classifyEntry(
  pnlPct: number | null,
  judgement: EntryJudgement,
  lang: AnalysisLang = "en",
): { tag: EntryTag; label: string } {
  const withLabel = (tag: EntryTag) => {
    const situation = ENTRY_SITUATION[lang][tag].replace(
      "{n}",
      pnlPct != null ? Math.abs(pnlPct).toFixed(1) : "",
    );
    const numbers =
      judgement.entryPe != null && judgement.sectorPe != null && judgement.valuation !== "unknown"
        ? `${entryNumbersSentence(judgement.entryPe, judgement.sectorPe, lang)} `
        : "";
    return { tag, label: numbers + situation };
  };
  if (pnlPct == null) return withLabel("no_price");
  if (judgement.lossMaking) return withLabel("loss_making");
  if (judgement.valuation === "unknown") return withLabel("no_data");
  const outcome = pnlPct >= 5 ? "up" : pnlPct <= -5 ? "down" : "flat";
  return withLabel(`${judgement.valuation}_${outcome}` as EntryTag);
}

/**
 * Adapter: turn the backend-computed per-holding signal (single source of
 * truth — backend/services/signal_service.py, delivered on GET
 * /api/user/portfolio) into the SignalInfo shape the portfolio UI renders.
 * The frontend never derives Buy/Sell advice itself. A neutral holding comes
 * through as `none` and renders no chip.
 */
export function signalInfoFromApi(
  sig: HoldingSignalInfo | null | undefined,
  lang: AnalysisLang = "en",
): SignalInfo {
  if (!sig || sig.signal === "none") {
    return {
      signal: "none",
      label: "",
      reason: sig
        ? (lang === "bn" ? sig.reason_bn : sig.reason_en) || sig.reason_en
        : lang === "bn"
          ? "এই শেয়ারের সংকেত এখনো তৈরি হয়নি। পরের আপডেটে চলে আসবে।"
          : "There is no signal for this share yet. It will arrive with the next data update.",
      muted: true,
    };
  }
  return {
    signal: sig.signal,
    label: lang === "bn" ? SIGNAL_LABELS_BN[sig.signal] : SIGNAL_LABELS[sig.signal],
    reason: (lang === "bn" ? sig.reason_bn : sig.reason_en) || sig.reason_en,
  };
}

const ENTRY_SHORT: Record<AnalysisLang, Record<EntryTag, string>> = {
  en: {
    cheap_up: "bought cheap",
    cheap_flat: "bought cheap",
    cheap_down: "bought cheap",
    fair_up: "fair price",
    fair_flat: "fair price",
    fair_down: "fair price",
    expensive_up: "paid too much",
    expensive_flat: "paid too much",
    expensive_down: "paid too much",
    loss_making: "no profit to judge by",
    no_data: "price unclear",
    no_price: "no live price",
  },
  bn: {
    cheap_up: "সস্তায় কেনা",
    cheap_flat: "সস্তায় কেনা",
    cheap_down: "সস্তায় কেনা",
    fair_up: "ন্যায্য দামে কেনা",
    fair_flat: "ন্যায্য দামে কেনা",
    fair_down: "ন্যায্য দামে কেনা",
    expensive_up: "বেশি দামে কেনা",
    expensive_flat: "বেশি দামে কেনা",
    expensive_down: "বেশি দামে কেনা",
    loss_making: "মুনাফা নেই",
    no_data: "দাম যাচাই করা যাচ্ছে না",
    no_price: "লাইভ দাম নেই",
  },
};

function shortPnl(pnlPct: number | null, lang: AnalysisLang = "en"): string {
  if (pnlPct == null) return lang === "bn" ? "লাইভ দাম নেই" : "no live price";
  const abs = Math.abs(pnlPct).toFixed(1);
  if (pnlPct >= 0.5) return lang === "bn" ? `${abs}% লাভে` : `up ${abs}%`;
  if (pnlPct <= -0.5) return lang === "bn" ? `${abs}% লোকসানে` : `down ${abs}%`;
  return lang === "bn" ? "অপরিবর্তিত" : "flat";
}

function nameList(names: string[], cap = 2, lang: AnalysisLang = "en"): string {
  const and = lang === "bn" ? "এবং" : "and";
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} ${and} ${names[1]}`;
  if (names.length <= cap + 1) {
    return `${names.slice(0, -1).join(", ")} ${and} ${names[names.length - 1]}`;
  }
  const rest = names.length - cap;
  return lang === "bn"
    ? `${names.slice(0, cap).join(", ")} এবং আরও ${rest}টি`
    : `${names.slice(0, cap).join(", ")} and ${rest} more`;
}

function isLow(v: number | null | undefined, threshold: number): boolean {
  return v != null && v < threshold;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function gradeFromAvg(avg: number): { grade: Grade; label: GradeLabel } {
  if (avg >= 8) return { grade: "A", label: "Excellent" };
  if (avg >= 6.5) return { grade: "B", label: "Good" };
  if (avg >= 5) return { grade: "C", label: "Okay" };
  if (avg >= 3.5) return { grade: "D", label: "Risky" };
  return { grade: "F", label: "Very Risky" };
}

/** Bengali equivalents of the canonical QualityWord keys, for prose. */
const QUALITY_WORD_BN: Record<QualityWord, string> = {
  Strong: "শক্তিশালী",
  Solid: "ভালো",
  Average: "মাঝারি",
  Weak: "দুর্বল",
  Unrated: "রেটিং নেই",
};

function buildDescriptor(insight: HoldingInsight, lang: AnalysisLang = "en"): string {
  if (lang === "bn") {
    if (insight.tierKey === "unscored") return "এখনো যথেষ্ট তথ্য নেই।";
    const qualityBn = QUALITY_WORD_BN[insight.qualityWord];
    if (insight.entryTag === "no_price") return `${qualityBn} কোম্পানি, লাইভ দাম এখনো নেই।`;
    return `${qualityBn} কোম্পানি, ${ENTRY_SHORT.bn[insight.entryTag]}, ${shortPnl(insight.pnlPct, "bn")}।`;
  }
  if (insight.tierKey === "unscored") return "Not enough data yet.";
  if (insight.entryTag === "no_price") return `${insight.qualityWord} company, no live price yet.`;
  const entryShort = ENTRY_SHORT.en[insight.entryTag];
  const pnl = shortPnl(insight.pnlPct);
  return `${insight.qualityWord} company, ${entryShort}, ${pnl}.`;
}

function buildOneLiner(insight: HoldingInsight, lang: AnalysisLang = "en"): string {
  const sectorPart = insight.sector ?? (lang === "bn" ? "অজানা সেক্টর" : "Unknown sector");
  const weightStr = `${insight.weightPct.toFixed(0)}%`;
  return `${insight.code} · ${sectorPart} · ${weightStr} · ${insight.descriptor}`;
}

function composeHeadline(
  args: {
    grade: Grade;
    holdingCount: number;
    maxSectorPct: number;
    maxSectorName: string;
    strugglingCount: number;
    avoidCount: number;
    zCount: number;
    expensiveCount: number;
  },
  lang: AnalysisLang = "en",
): string {
  const bnMode = lang === "bn";
  const issues: string[] = [];
  if (args.holdingCount === 1) {
    issues.push(bnMode ? "সব টাকা একটি শেয়ারেই আছে" : "everything is in one stock");
  } else if (args.holdingCount === 2) {
    issues.push(bnMode ? "মাত্র দুটি শেয়ার" : "only two stocks");
  }
  if (args.maxSectorPct > 50 && args.holdingCount > 1) {
    const pct = args.maxSectorPct.toFixed(0);
    issues.push(
      bnMode
        ? `${pct}% আছে ${args.maxSectorName} সেক্টরে`
        : `${pct}% is in ${args.maxSectorName}`,
    );
  }
  if (args.strugglingCount > 0) {
    issues.push(
      bnMode
        ? `${args.strugglingCount}টি আর্থিকভাবে দুর্বল কোম্পানি`
        : `${args.strugglingCount} financially weak compan${args.strugglingCount === 1 ? "y" : "ies"}`,
    );
  }
  if (args.avoidCount > 0) {
    issues.push(
      bnMode
        ? `${args.avoidCount}টি কম মানের শেয়ার`
        : `${args.avoidCount} low-quality holding${args.avoidCount === 1 ? "" : "s"}`,
    );
  }
  if (args.zCount > 0) {
    issues.push(
      bnMode
        ? `${args.zCount}টি Z ক্যাটাগরির শেয়ার`
        : `${args.zCount} Z-category share${args.zCount === 1 ? "" : "s"}`,
    );
  }
  if (args.expensiveCount > 0) {
    issues.push(
      bnMode
        ? `${args.expensiveCount}টি শেয়ার বেশি দামে কেনা`
        : `${args.expensiveCount} stock${args.expensiveCount === 1 ? "" : "s"} bought at a high price`,
    );
  }
  const issueStr = issues.slice(0, 2).join(bnMode ? " আর " : " and ");

  if (bnMode) {
    if (args.grade === "A") {
      return "আপনার পোর্টফোলিও ভালোভাবে সাজানো। টাকা শক্তিশালী কোম্পানিগুলোতে ছড়ানো, আর কিনেছেনও ন্যায্য দামে। এভাবেই চালিয়ে যান, আর কয়েক মাস পর পর একবার দেখে নিন।";
    }
    if (args.grade === "B") {
      if (!issueStr)
        return "আপনার পোর্টফোলিও ভালো অবস্থায় আছে, শুধু ছোটখাটো কিছু বিষয় নজরে রাখুন। জরুরি কোনো বদল দরকার নেই, শুধু নিচের বিষয়গুলো দেখে রাখুন।";
      return `আপনার পোর্টফোলিও ভালো অবস্থায় আছে, তবে খেয়াল রাখুন: ${issueStr}। এই ছোট বিষয়গুলো ঠিক করলে অবস্থান আরও শক্ত হবে।`;
    }
    if (args.grade === "C") {
      if (!issueStr)
        return "আপনার পোর্টফোলিও মোটামুটি ঠিক আছে, তবে কিছু দুর্বল জায়গা আছে। নিচের বিষয়গুলো পড়ুন। এখন ছোট কিছু বদল আনলে পরে বড় লোকসান এড়ানো যায়।";
      return `আপনার পোর্টফোলিও মোটামুটি চলছে, তবে কিছু দুর্বলতা আছে: ${issueStr}। এগুলো আপনার লাভ কমিয়ে দিচ্ছে। ঝুঁকি আরেকটু ছড়িয়ে দিলে টাকা বেশি নিরাপদ থাকবে।`;
    }
    if (args.grade === "D") {
      return `আপনার পোর্টফোলিও দুর্বল অবস্থায় আছে: ${issueStr || "টাকা অল্প কয়েক জায়গায় জমে আছে আর ভাগটাও অসম"}। এখনই সাজিয়ে না নিলে বাজারের একটি খারাপ সময় বড় ক্ষতি করতে পারে।`;
    }
    return `আপনার পোর্টফোলিও বেশ ঝুঁকিতে আছে: ${issueStr || "এটিকে নতুন করে সাজানো দরকার"}। নতুন টাকা দেওয়ার আগে নিচের পরামর্শগুলো দেখে পোর্টফোলিওটি নতুন করে সাজানোর কথা ভাবুন।`;
  }

  if (args.grade === "A") {
    return "Your portfolio is well built. Your money is spread across strong companies, bought at fair prices. Carry on as you are and review it every few months.";
  }
  if (args.grade === "B") {
    if (!issueStr)
      return "Your portfolio is in good shape, with just a few small things to watch. No urgent change is needed; just keep an eye on the points below.";
    return `Your portfolio is in good shape. A few things are worth watching: ${issueStr}. Sorting these out will make it stronger.`;
  }
  if (args.grade === "C") {
    if (!issueStr)
      return "Your portfolio is in fair shape but has a few weak spots. Small changes now, using the points below, can prevent bigger losses later.";
    return `Your portfolio is in fair shape, but a few things are holding it back: ${issueStr}. Spreading the risk a little more would make your money safer.`;
  }
  if (args.grade === "D") {
    return `Your portfolio is in a weak position: ${issueStr || "your money sits in too few places and the mix is uneven"}. Without some changes, one bad stretch in the market could hurt it a lot.`;
  }
  return `Your portfolio carries a lot of risk: ${issueStr || "it needs to be rebuilt"}. Before you add more money, read the points below and consider rebuilding it on a stronger base.`;
}

const GRADE_EXPLANATION: Record<AnalysisLang, { intro: string; byGrade: Record<Grade, string> }> = {
  en: {
    intro:
      "We grade your portfolio on three things: how well your money is spread, so one bad share cannot sink everything; how strong the companies you own are; and whether you bought at a fair price. ",
    byGrade: {
      A: "An A means all three are in good shape. This is what a healthy long-term portfolio looks like.",
      B: "A B means most things are working well, with a few small points to watch. Nothing is urgent.",
      C: "A C means at least one of the three is weak. It is easier to fix while the problem is still small.",
      D: "A D means two of the three are weak. It is wise to sort out the points below before adding more money.",
      F: "An F means all three are weak. This carries high risk, so please read the points below before doing anything else.",
    },
  },
  bn: {
    intro:
      "আমরা তিনটি বিষয় দেখে আপনার পোর্টফোলিওর গ্রেড দিই: টাকা কতটা ছড়িয়ে আছে, যাতে একটি খারাপ শেয়ার সব ডুবিয়ে দিতে না পারে; কোম্পানিগুলো কতটা শক্তিশালী; আর আপনি ন্যায্য দামে কিনেছেন কি না। ",
    byGrade: {
      A: "'A' মানে তিনটিই ভালো অবস্থায় আছে। দীর্ঘমেয়াদের জন্য একটি ভালো পোর্টফোলিও এমনই হয়।",
      B: "'B' মানে বেশিরভাগ জিনিস ঠিক চলছে, শুধু ছোট কিছু বিষয় নজরে রাখতে হবে। জরুরি কিছু নেই।",
      C: "'C' মানে এই তিনটির মধ্যে অন্তত একটি দুর্বল। সমস্যা ছোট থাকতে থাকতেই ঠিক করে ফেলুন।",
      D: "'D' মানে তিনটির মধ্যে দুটিই দুর্বল। নতুন টাকা যোগ করার আগে নিচের বিষয়গুলো ঠিক করে নেওয়াই ভালো।",
      F: "'F' মানে তিনটিই দুর্বল। এটি বেশ ঝুঁকির অবস্থা, তাই অন্য কিছু করার আগে নিচের পরামর্শগুলো পড়ুন।",
    },
  },
};

function composeGradeExplanation(grade: Grade, lang: AnalysisLang = "en"): string {
  const t = GRADE_EXPLANATION[lang];
  return t.intro + t.byGrade[grade];
}

// ── main ───────────────────────────────────────────────────────────────────

export function analyzePortfolio(
  rows: ComputedRow[],
  priceMap: Map<string, ScoreItem>,
  lang: AnalysisLang = "en",
): PortfolioAnalysis {
  const bnMode = lang === "bn";
  const weightBasisOf = (r: ComputedRow): number => r.current_value ?? r.cost_basis;
  const totalBasis = rows.reduce((acc, r) => acc + weightBasisOf(r), 0) || 1;

  // Sector P/E medians come from the whole-market payload the page already holds.
  const peMap = sectorMedianPeMap(priceMap);

  const insights: HoldingInsight[] = rows.map((row) => {
    const code = row.holding.trading_code;
    const item = priceMap.get(code);
    const score = item?.score ?? null;
    const tk = tierBucket(score);
    const sectorPe =
      (item?.sector ? peMap.bySector.get(item.sector) : undefined) ?? peMap.market;
    const judgement = judgeEntry(row.holding.buy_price, item?.eps, sectorPe);
    const entry = classifyEntry(row.pnl_pct, judgement, lang);
    const valuationNow = valuationNowOf(item?.p4_val);
    const marketCategory = item?.market_category?.trim().toUpperCase() || null;
    const dataAgeYears = item?.data_age_years ?? null;
    // Mirrors the scoring service: the staleness multiplier kicks in at 2 years.
    const staleData = item?.stale_data === true || (dataAgeYears != null && dataAgeYears >= 2);
    const weightPct = (weightBasisOf(row) / totalBasis) * 100;
    const w52h = row.w52_high ?? null;
    const w52l = row.w52_low ?? null;
    const rangePos =
      row.ltp != null && w52h != null && w52l != null && w52h > w52l
        ? Math.max(0, Math.min(1, (row.ltp - w52l) / (w52h - w52l)))
        : null;
    const flags = {
      weakFinances: isLow(item?.p2_health, 4),
      weakEarnings: isLow(item?.p1_biz, 4),
      earningsShrinking: isLow(item?.eps_yoy_pct, -10),
      expensiveEntry: judgement.valuation === "expensive",
      // Mirrors the signal service's ≥85%-of-range dampening.
      nearHigh: rangePos != null && rangePos >= 0.85,
      zCategory: marketCategory === "Z",
      staleData,
    };
    const insight: HoldingInsight = {
      code,
      companyName: row.company_name ?? item?.company_name ?? null,
      sector: item?.sector ?? null,
      sectorBucket: sectorBucketOf(item?.sector ?? null),
      weightPct,
      qty: row.holding.qty,
      buyPrice: row.holding.buy_price,
      ltp: row.ltp,
      pnlPct: row.pnl_pct,
      rangePos,
      score,
      tierKey: tk,
      qualityWord: QUALITY_WORD[tk],
      entryTag: entry.tag,
      entryLabel: entry.label,
      entryPe: judgement.entryPe,
      sectorPe: judgement.sectorPe,
      entryValuation: judgement.valuation,
      entryScore: judgement.score,
      valuationNow,
      marketCategory,
      staleData,
      dataAgeYears,
      signal: signalInfoFromApi(row.holding.signal, lang),
      descriptor: "",
      oneLiner: "",
      pillars: {
        p1_biz: item?.p1_biz ?? null,
        p2_health: item?.p2_health ?? null,
        p3_moat: item?.p3_moat ?? null,
        p4_val: item?.p4_val ?? null,
        p5_div: item?.p5_div ?? null,
      },
      flags,
    };
    insight.descriptor = buildDescriptor(insight, lang);
    insight.oneLiner = buildOneLiner(insight, lang);
    return insight;
  });

  // Sector spread
  const sectorMap = new Map<string, { weight: number; count: number }>();
  for (const ins of insights) {
    const key = ins.sector ?? (bnMode ? "অন্যান্য" : "Other");
    const cur = sectorMap.get(key) ?? { weight: 0, count: 0 };
    cur.weight += ins.weightPct;
    cur.count += 1;
    sectorMap.set(key, cur);
  }
  const sectorSpread = Array.from(sectorMap.entries())
    .map(([name, v]) => ({ name, weightPct: v.weight, count: v.count }))
    .sort((a, b) => b.weightPct - a.weightPct);

  const distinctSectors = sectorSpread.length;
  const maxSector = sectorSpread[0];
  const maxSectorPct = maxSector?.weightPct ?? 0;
  const maxSectorName = maxSector?.name ?? "";

  // Aggregates
  const holdingCount = insights.length;
  const scored = insights.filter((i) => i.score != null);
  const totalScoredWeight = scored.reduce((acc, i) => acc + i.weightPct, 0) || 1;
  const weightedAvgScore =
    scored.length > 0
      ? scored.reduce((acc, i) => acc + (i.score as number) * i.weightPct, 0) / totalScoredWeight
      : null;

  const avoidNames = insights.filter((i) => i.tierKey === "weak").map((i) => i.code);
  const strugglingNames = insights.filter((i) => i.flags.weakFinances).map((i) => i.code);
  const shrinkingItems = insights
    .filter((i) => i.flags.earningsShrinking)
    .map((i) => ({ code: i.code, epsYoy: priceMap.get(i.code)?.eps_yoy_pct ?? null }));
  const reliableDividend = insights.filter((i) => (priceMap.get(i.code)?.p5_div ?? 0) >= 7);

  // Entry (what you paid) and today's valuation (what to do next) are separate
  // questions — see the Entry block above.
  const expensiveItems = insights.filter((i) => i.entryValuation === "expensive");
  const judgeableEntryCount = insights.filter((i) => i.entryValuation !== "unknown").length;
  const goodEntryCount = insights.filter(
    (i) => i.entryValuation === "cheap" || i.entryValuation === "fair",
  ).length;
  // Up nicely AND expensive today → "book some profit" idea (never on a stock
  // its own signal says to buy more of, nor one already marked Sell).
  const upExpensiveItems = insights.filter(
    (i) =>
      i.pnlPct != null &&
      i.pnlPct >= 5 &&
      i.valuationNow === "expensive" &&
      i.signal.signal === "none",
  );
  // The per-holding signal (backend `holding_signal`) is THE buy-more / sell
  // advice — the lists read it instead of re-deriving their own, so a list can
  // never say "buy more" about a stock whose card shows no Buy (2026-10-26).
  const sellItems = insights.filter((i) => i.signal.signal === "sell");
  const sellWeightPct = sellItems.reduce((acc, i) => acc + i.weightPct, 0);
  const buyMoreItems = insights.filter((i) => i.signal.signal === "buy_more");
  // DSE market category — Z is the exchange's own warning label.
  const zItems = insights.filter((i) => i.flags.zCategory);
  const zWeightPct = zItems.reduce((acc, i) => acc + i.weightPct, 0);
  const bWeightPct = insights
    .filter((i) => i.marketCategory === "B")
    .reduce((acc, i) => acc + i.weightPct, 0);
  // Stale accounts — the score rests on numbers 2+ years old.
  const staleItems = insights.filter((i) => i.flags.staleData);
  const staleWeightPct = staleItems.reduce((acc, i) => acc + i.weightPct, 0);

  const performersWithPnl = insights.filter((i) => i.pnlPct != null);
  const best =
    performersWithPnl.length > 0
      ? [...performersWithPnl].sort((a, b) => (b.pnlPct as number) - (a.pnlPct as number))[0]
      : null;

  const sortedByWeight = [...insights].sort((a, b) => b.weightPct - a.weightPct);
  const largestPos = sortedByWeight[0];

  // Concentration — Herfindahl "effective number of stocks". A portfolio of 8
  // names with one at 60% behaves like far fewer than 8; this says how many.
  const hhi = insights.reduce((acc, i) => acc + (i.weightPct / 100) ** 2, 0);
  const effectiveStocks = hhi > 0 ? 1 / hhi : 0;

  // Biggest single risk: a large position (≥15%) in a below-good company
  // (score < 60). Ranked by weight × how far short of top quality it is.
  const topRiskInsight =
    insights
      .filter((i) => i.score != null && (i.score as number) < 60 && i.weightPct >= 15)
      .map((i) => ({ insight: i, risk: i.weightPct * (10 - (i.score as number) / 10) }))
      .sort((a, b) => b.risk - a.risk)[0]?.insight ?? null;
  const topRiskCode = topRiskInsight?.code ?? null;

  // Financials (banks + NBFIs + insurers) move together with rates/regulation,
  // so a heavy combined weight is a hidden concentration even when it's split
  // across those sub-sectors.
  const financialInsights = insights.filter((i) => isFinancialSector(i.sector));
  const financialsWeight = financialInsights.reduce((acc, i) => acc + i.weightPct, 0);
  const financialSectorCount = new Set(financialInsights.map((i) => i.sector)).size;
  const financialsOverweight =
    financialsWeight > 55 && financialSectorCount >= 2;

  const nearHighItems = insights.filter((i) => i.flags.nearHigh);

  // ── Bullets ────────────────────────────────────────────────────────────
  const good: string[] = [];
  const bad: string[] = [];
  const consider: string[] = [];

  // Good
  if (holdingCount >= 5 && distinctSectors >= 3) {
    good.push(
      bnMode
        ? `আপনার কাছে ${distinctSectors}টি সেক্টরের ${holdingCount}টি আলাদা শেয়ার আছে, যা ভালোভাবে ছড়ানো। একটি সেক্টরের সময় খারাপ গেলেও বাকিগুলো পোর্টফোলিওকে ধরে রাখতে পারে।`
        : `You own ${holdingCount} different stocks across ${distinctSectors} sectors. That is a healthy spread: if one sector has a hard time, the others can hold your portfolio up.`,
    );
  }
  if (scored.length >= 2) {
    const strongCount = scored.filter((i) => (i.score as number) >= 70).length;
    if (strongCount / scored.length >= 0.6) {
      good.push(
        bnMode
          ? `আপনার ${scored.length}টি কোম্পানির মধ্যে ${strongCount}টির স্কোর 70 বা তার বেশি। এদের মুনাফা আর আর্থিক অবস্থা দুটোই ভালো।`
          : `${strongCount} of the ${scored.length} companies you own score 70 or more. Their profits and finances both look healthy.`,
      );
    }
  }
  if (best && (best.pnlPct as number) >= 20) {
    const upPct = (best.pnlPct as number).toFixed(1);
    good.push(
      bnMode
        ? `${best.code} কেনার পর থেকে ${upPct}% বেড়েছে। শুধু দাম বেড়েছে বলেই বিক্রি করতে হবে না; কোম্পানিটি এখনো শক্তিশালী কি না আর দাম ব্যবসার চেয়ে অনেক এগিয়ে গেছে কি না, সেটা দেখুন।`
        : `${best.code} is up ${upPct}% since you bought it. Being up is not a reason to sell by itself; check whether the company is still strong and whether the price has run far ahead of the business.`,
    );
  }
  if (judgeableEntryCount > 0 && goodEntryCount / judgeableEntryCount >= 0.6) {
    good.push(
      bnMode
        ? `আজকের মুনাফার হিসাবে আপনার ${judgeableEntryCount}টির মধ্যে ${goodEntryCount}টি শেয়ার ন্যায্য দামে কেনা। একই সেক্টরের অন্য কোম্পানির চেয়ে বেশি দাম দেননি।`
        : `Measured on today's profits, you paid a fair price for ${goodEntryCount} of your ${judgeableEntryCount} shares, no more than similar companies cost.`,
    );
  }
  if (reliableDividend.length >= 2) {
    good.push(
      bnMode
        ? `আপনার ${reliableDividend.length}টি কোম্পানি নিয়মিত ডিভিডেন্ড দেয়। মানে দাম বাড়ার লাভের পাশাপাশি প্রতি বছর নগদ টাকাও আপনার হাতে আসছে, অনেকটা নিজের বাড়ির ভাড়ার মতো। এই ডিভিডেন্ড আবার বিনিয়োগ করলে পোর্টফোলিও ধীরে ধীরে বড় হয়।`
        : `You earn reliable dividends from ${reliableDividend.length} of your companies. That is cash coming to you every year on top of any rise in price, much like rent from a property you own. Reinvesting it grows your portfolio steadily over time.`,
    );
  }
  // Bad
  if (sellItems.length > 0) {
    const pct = sellWeightPct.toFixed(0);
    const first = sellItems[0];
    if (sellItems.length === 1) {
      bad.push(
        bnMode
          ? `${first.code}-এ এখন বিক্রির সংকেত আছে, আর এতে আপনার টাকার ${pct}%। কারণ: ${first.signal.reason} সিদ্ধান্তের আগে শেয়ারের পেজে পুরো কারণটি দেখুন।`
          : `${first.code} is marked Sell, and it holds ${pct}% of your money. Why: ${first.signal.reason} Please read the full reason on its page before you decide.`,
      );
    } else {
      bad.push(
        bnMode
          ? `${nameList(sellItems.map((i) => i.code), 2, "bn")} -এ এখন বিক্রির সংকেত আছে, আর এগুলোতে একসঙ্গে আপনার টাকার ${pct}%। প্রতিটির কারণ তার কার্ডে আর শেয়ারের পেজে আছে; একটি একটি করে দেখে সিদ্ধান্ত নিন।`
          : `${nameList(sellItems.map((i) => i.code))} are marked Sell, and together they hold ${pct}% of your money. Each card and share page explains why; it is best to go through them one by one before you decide.`,
      );
    }
  }
  if (holdingCount === 1) {
    bad.push(
      bnMode
        ? "আপনার কাছে মাত্র 1টি শেয়ার আছে, তাই আপনার সব টাকা একটি কোম্পানির ওপর নির্ভর করছে। যেকোনো কারণে সেই কোম্পানির একটি খারাপ বছর গেলে পুরো পোর্টফোলিওর দাম কমে যাবে। সুযোগমতো আলাদা সেক্টর থেকে আরও 4–7টি শেয়ার যোগ করার কথা ভাবুন।"
        : "You own only 1 share, so all your money depends on a single company. If that company has a bad year, for any reason, your whole portfolio falls with it. When you can, consider adding 4–7 more shares from different sectors.",
    );
  } else if (holdingCount === 2) {
    bad.push(
      bnMode
        ? "আপনার কাছে মাত্র 2টি শেয়ার আছে, যা এখনো খুব কম। যেকোনো একটির খারাপ দিন পোর্টফোলিওতে বড় ধাক্কা দেয়, কারণ আপনার অর্ধেক টাকা প্রতিটি শেয়ারের সঙ্গে ওঠানামা করে। অন্তত 3টি সেক্টরে 5টি শেয়ার রাখার চেষ্টা করুন।"
        : "You own only 2 shares, which is still too few. A bad day for either one hits your portfolio hard, because half your money moves with each. Aim for at least 5 shares across 3 different sectors.",
    );
  }
  if (topRiskInsight) {
    const w = topRiskInsight.weightPct.toFixed(0);
    const qBn = QUALITY_WORD_BN[topRiskInsight.qualityWord];
    bad.push(
      bnMode
        ? `${topRiskInsight.code} আপনার পোর্টফোলিওর ${w}%, অথচ এর মান ${qBn}। এটিই আপনার সবচেয়ে বড় ঝুঁকি। দুর্বল কোম্পানিতে বেশি টাকা রাখলে বাকি শেয়ারের লাভ একবারেই মুছে যেতে পারে। এটি কমিয়ে 10%-এর কাছাকাছি আনা, বা কিছু টাকা আরও শক্তিশালী কোনো শেয়ারে সরানোর কথা ভাবুন।`
        : `${topRiskInsight.code} is ${w}% of your portfolio but is rated only ${topRiskInsight.qualityWord.toLowerCase()}. That is your biggest single risk: a large amount in a weaker company can wipe out the gains from everything else you own. Consider bringing it down toward 10%, or moving some of that money into a stronger company.`,
    );
  }
  if (zItems.length > 0) {
    const pct = zWeightPct.toFixed(0);
    const codes = zItems.map((i) => i.code);
    if (codes.length === 1) {
      bad.push(
        bnMode
          ? `${codes[0]} একটি Z ক্যাটাগরির শেয়ার, আর এতে আপনার টাকার ${pct}%। কোম্পানি এজিএম না করলে বা ডিভিডেন্ড না দিলে ডিএসই তাকে Z ক্যাটাগরিতে পাঠায়। এটি স্টক এক্সচেঞ্জের নিজের সতর্কবার্তা। Z শেয়ারের লেনদেন নিষ্পত্তিও দেরিতে হয়, তাই দ্রুত বিক্রি করা কঠিন। এতে আর টাকা না বাড়ানোই ভালো, আর ধরে রাখার একটি স্পষ্ট কারণ থাকা দরকার।`
          : `${codes[0]} is a Z category share, and it holds ${pct}% of your money. DSE moves a company to Z when it skips its AGM or pays no dividend, so this is the exchange's own warning. Z shares also settle slowly and are hard to sell in a hurry. It is safer not to add more, and to have a clear reason for keeping it.`,
      );
    } else {
      bad.push(
        bnMode
          ? `${nameList(codes, 2, "bn")} Z ক্যাটাগরির শেয়ার, আর এগুলোতে একসঙ্গে আপনার টাকার ${pct}%। কোম্পানি এজিএম না করলে বা ডিভিডেন্ড না দিলে ডিএসই তাকে Z ক্যাটাগরিতে পাঠায়। এটি স্টক এক্সচেঞ্জের নিজের সতর্কবার্তা। Z শেয়ারের লেনদেন নিষ্পত্তিও দেরিতে হয়, তাই দ্রুত বিক্রি করা কঠিন। এতে আর টাকা না বাড়ানোই ভালো, আর প্রতিটি ধরে রাখার একটি স্পষ্ট কারণ থাকা দরকার।`
          : `${nameList(codes)} are Z category shares, and together they hold ${pct}% of your money. DSE moves a company to Z when it skips its AGM or pays no dividend, so this is the exchange's own warning. Z shares also settle slowly and are hard to sell in a hurry. It is safer not to add more, and to have a clear reason for keeping each one.`,
      );
    }
  }
  if (maxSectorPct > 50 && distinctSectors > 1) {
    const pct = maxSectorPct.toFixed(0);
    bad.push(
      bnMode
        ? `আপনার টাকার ${pct}% আছে ${maxSectorName} সেক্টরের শেয়ারে। সুদের হার, নতুন নিয়ম বা দুর্বল মুনাফার কারণে এই সেক্টরের একটি প্রান্তিক খারাপ গেলে পোর্টফোলিওর বড় অংশের দাম একসঙ্গে কমবে। ঝুঁকি ছড়াতে কিছু টাকা অন্য সেক্টরে সরানোর কথা ভাবুন।`
        : `${pct}% of your money is in ${maxSectorName} shares. If that sector has a bad quarter, from interest rates, new rules or weak profits, most of your portfolio falls together. Moving some money into a different sector would spread the risk.`,
    );
  } else if (distinctSectors === 1 && holdingCount >= 2) {
    bad.push(
      bnMode
        ? `আপনার সব শেয়ার একটি সেক্টরেই (${maxSectorName}), তাই আপনার পোর্টফোলিও ওই একটি শিল্পের সাথেই ওঠে আর নামে। ওই সেক্টর বিপদে পড়লে লোকসান সামলানোর আর কিছু থাকে না। এটা ঠিক করতে অন্তত আরও 2টি সেক্টর থেকে শেয়ার যোগ করুন।`
        : `All your stocks are in one sector (${maxSectorName}), so your portfolio rises and falls with that single industry. When that sector is in trouble, you have nothing else to balance the loss. Add stocks from at least 2 other sectors to fix this.`,
    );
  }
  if (financialsOverweight && maxSectorPct <= 50) {
    const pct = financialsWeight.toFixed(0);
    bad.push(
      bnMode
        ? `ব্যাংক, এনবিএফআই আর বিমা মিলিয়ে আপনার প্রায় ${pct}% টাকা আর্থিক কোম্পানিতে। এগুলো আলাদা সেক্টর মনে হলেও সুদের হার আর নিয়মকানুন বদলালে সাধারণত একসঙ্গে ওঠানামা করে। আর্থিক সেক্টরে বড় ধাক্কা এলে পোর্টফোলিওর বেশির ভাগের দাম একসঙ্গে কমবে। ভারসাম্যের জন্য ওষুধ, খাদ্য বা টেলিকমের মতো অন্তত একটি অ-আর্থিক সেক্টর যোগ করার কথা ভাবুন।`
        : `About ${pct}% of your money is in banks, finance companies and insurers. They look like different sectors, but they mostly move together when interest rates or rules change. A shock to the financial sector would hit most of your portfolio at once. Adding a non-financial sector, such as medicine, food or telecom, would balance this.`,
    );
  }
  const largestIsTheSector =
    !!largestPos && maxSectorPct > 50 && largestPos.sector === maxSectorName && largestPos.weightPct >= maxSectorPct - 1;
  if (
    largestPos &&
    largestPos.weightPct > 40 &&
    holdingCount > 1 &&
    largestPos.code !== topRiskCode &&
    !largestIsTheSector
  ) {
    const w = largestPos.weightPct.toFixed(0);
    const hit = (largestPos.weightPct * 0.2).toFixed(0);
    bad.push(
      bnMode
        ? `শুধু ${largestPos.code}-ই আপনার পোর্টফোলিওর ${w}%। এই একটি শেয়ারের দাম 20% কমলে পুরো পোর্টফোলিও প্রায় ${hit}% কমবে, যা একটি কোম্পানির জন্য বড় ধাক্কা। এটি কিছুটা কমানো বা অন্য শেয়ারগুলো বাড়ানোর কথা ভাবুন, যাতে একটি শেয়ার একাই বেশি প্রভাব না ফেলে।`
        : `${largestPos.code} alone is ${w}% of your portfolio. If that one share drops 20%, your whole portfolio drops nearly ${hit}%. That is a big hit from a single company. Consider trimming it, or growing your other shares, so that no one share dominates.`,
    );
  }
  if (strugglingNames.length === 1) {
    bad.push(
      bnMode
        ? `${strugglingNames[0]}-এর আর্থিক অবস্থা দুর্বল, সম্ভবত বেশি ঋণ বা কম নগদ প্রবাহের কারণে। এমন কোম্পানির ডিভিডেন্ড দিতে, এমনকি খারাপ সময়ে টিকে থাকতেও কষ্ট হয়। পরের প্রান্তিকের ফলাফল ভালো করে দেখুন, আর উন্নতি না হলে বিক্রির কথা ভাবতে পারেন।`
        : `${strugglingNames[0]}'s finances look weak, most likely from heavy loans or little cash coming in. Companies like this can struggle to pay dividends, or even to get through a downturn. Watch the next quarterly result closely, and consider selling if things do not improve.`,
    );
  } else if (strugglingNames.length > 1) {
    bad.push(
      bnMode
        ? `${nameList(strugglingNames, 2, "bn")}-এর আর্থিক অবস্থা দুর্বল, সম্ভবত বেশি ঋণ বা কম নগদ প্রবাহের কারণে। এমন কোম্পানির ডিভিডেন্ড দিতে, এমনকি খারাপ সময়ে টিকে থাকতেও কষ্ট হয়। এদের পরের প্রান্তিকের ফলাফল ভালো করে দেখুন।`
        : `${nameList(strugglingNames)} have weak finances, most likely from heavy loans or little cash coming in. Companies like this can struggle to pay dividends, or even to get through a downturn. Watch their next quarterly results closely.`,
    );
  }
  if (staleItems.length === 1) {
    const s = staleItems[0];
    const yrs = s.dataAgeYears != null ? `${s.dataAgeYears}` : "2+";
    bad.push(
      bnMode
        ? `${s.code}-এর সর্বশেষ আর্থিক হিসাব ${yrs} বছরের পুরোনো, তাই এর স্কোর পুরোনো সংখ্যার ওপর নির্ভর করে এবং আজকের ব্যবসার ছবি না-ও দেখাতে পারে। এ কারণেই আমরা এর স্কোর কমিয়ে রাখি। রেটিংয়ের ওপর ভরসা করার আগে শেয়ারের পেজে সাম্প্রতিক খবর দেখুন।`
        : `${s.code}'s latest accounts are ${yrs} years old, so its score rests on old numbers and may not reflect the business today. That is why we mark its score down. Check the share's page for recent news before relying on the rating.`,
    );
  } else if (staleItems.length > 1) {
    const codes = staleItems.map((i) => i.code);
    bad.push(
      bnMode
        ? `${nameList(codes, 2, "bn")} 2 বছরের বেশি সময় নতুন আর্থিক হিসাব প্রকাশ করেনি। এদের স্কোর পুরোনো সংখ্যার ওপর নির্ভর করে, তাই আমরা তা কমিয়ে রাখি। রেটিংয়ের ওপর ভরসা করার আগে এদের পেজে সাম্প্রতিক খবর দেখুন।`
        : `${nameList(codes)} have not published new accounts in 2 or more years. Their scores rest on old numbers, which is why we mark them down. Check their pages for recent news before relying on the ratings.`,
    );
  }
  // The top-risk name is already called out above (big-and-weak) — don't repeat it here.
  // …and Z-category names already have their own bullet above.
  const zCodes = new Set(zItems.map((i) => i.code));
  const avoidForBullet = avoidNames.filter((c) => c !== topRiskCode && !zCodes.has(c));
  if (avoidForBullet.length === 1) {
    bad.push(
      bnMode
        ? `${avoidForBullet[0]}-এর সার্বিক স্কোর কম, অর্থাৎ ব্যবসার মূল দিকগুলো সব মিলিয়ে দুর্বল। দুর্বল কোম্পানি ধরে রাখলে সময়ের সঙ্গে সাধারণত আশানুরূপ ফল পাওয়া যায় না। কেন এটি ধরে রেখেছেন, তা একবার ভেবে দেখুন। শক্ত কারণ না থাকলে ভালো রেটিংয়ের কোনো শেয়ারে বদলে নেওয়ার কথা ভাবতে পারেন।`
        : `${avoidForBullet[0]} is rated low overall, which means the business is weak on most counts. Weak companies usually disappoint over time. It is worth asking yourself why you hold it. If there is no strong reason, consider moving to a better-rated share.`,
    );
  } else if (avoidForBullet.length > 1) {
    bad.push(
      bnMode
        ? `${nameList(avoidForBullet, 2, "bn")} সার্বিক মানে কম স্কোর পেয়েছে, মানে মৌলিক দিকগুলো সব মিলিয়ে দুর্বল। দুর্বল কোম্পানি ধরে রাখলে সাধারণত হতাশ হতে হয়। সুযোগ পেলেই এগুলো ভালো রেটিংয়ের শেয়ার দিয়ে বদলে নিন।`
        : `${nameList(avoidForBullet)} are rated low on overall quality, meaning weak fundamentals across the board. Holding weak companies usually leads to disappointing returns over time. Replace them with better-rated stocks when you get the chance.`,
    );
  }
  if (shrinkingItems.length === 1) {
    const dropPct =
      shrinkingItems[0].epsYoy != null
        ? `${Math.abs(shrinkingItems[0].epsYoy as number).toFixed(0)}%`
        : null;
    bad.push(
      bnMode
        ? `${shrinkingItems[0].code}-এর মুনাফা গত বছরের চেয়ে ${dropPct ? dropPct : "অনেকটা"} কমেছে, অর্থাৎ ব্যবসাটি ছোট হচ্ছে। মুনাফা কমলে শেয়ারের দামও সাধারণত কমে। পরের প্রান্তিকের ফলাফল দেখুন; মুনাফা কমতেই থাকলে বিক্রির কথা ভাবার সময় হতে পারে।`
        : `${shrinkingItems[0].code}'s profit has dropped ${dropPct ?? "sharply"} from last year, which means the business is shrinking. When profit shrinks, the share price usually follows. Watch the next quarterly result; if profit keeps falling, it may be time to sell.`,
    );
  } else if (shrinkingItems.length > 1) {
    bad.push(
      bnMode
        ? `${nameList(shrinkingItems.map((s) => s.code), 2, "bn")}-এর মুনাফা কমছে, অর্থাৎ ব্যবসাগুলো ছোট হচ্ছে। মুনাফা কমলে সময়ের সঙ্গে শেয়ারের দামও সাধারণত কমে, তাই বিষয়টি নজরে রাখুন। এদের পরের ফলাফল মন দিয়ে দেখুন।`
        : `${nameList(shrinkingItems.map((s) => s.code))} have all seen profit fall, which means these businesses are shrinking. Share prices usually follow profit down over time, so this is worth watching. Look closely at their next quarterly results.`,
    );
  }
  if (expensiveItems.length > 0) {
    const heads = expensiveItems
      .slice(0, 2)
      .map((i) => `${i.code} (${shortPnl(i.pnlPct, lang)})`);
    const head = heads.join(bnMode ? " আর " : " and ");
    const extra = expensiveItems.length - 2;
    if (bnMode) {
      const more = extra > 0 ? ` এবং আরও ${extra}টি` : "";
      bad.push(
        `কোম্পানিগুলোর সর্বশেষ বার্ষিক মুনাফার হিসাবে ${head}${more}-এর কেনার দাম বেশি, একই সেক্টরের কোম্পানির চেয়ে অনেক বেশি। বেশি দামে কেনা শেয়ারের সেই দামের যোগ্য হতে সময় লাগে। ধরে রাখবেন, আরও কিনবেন, নাকি বিক্রি করবেন, তা ঠিক করার আগে শেয়ারের পেজে আজকের দামের মূল্যায়ন দেখে নিন।`,
      );
    } else {
      const more = extra > 0 ? ` and ${extra} more` : "";
      bad.push(
        `Measured against the companies' latest yearly profit, the price you paid for ${head}${more} looks high, well above what similar companies cost. A share bought at a high price needs time to grow into it. Before you decide to hold, buy more or sell, check today's price verdict on the share's page.`,
      );
    }
  }

  // Consider
  if (holdingCount < 5) {
    const need = Math.max(5 - holdingCount, 1);
    consider.push(
      bnMode
        ? `আলাদা সেক্টর থেকে আরও ${need}টি শেয়ার যোগ করার কথা ভাবুন। মাত্র কয়েকটি শেয়ার রাখা মানে সব সঞ্চয় একটি দোকানে রাখা; দোকানটির বছর খারাপ গেলে আর কোনো ভরসা থাকে না। অন্তত 3টি সেক্টরে 5–8টি শেয়ার রাখুন, যাতে কোনো একটি কোম্পানি বা সেক্টর বেশি ক্ষতি করতে না পারে।`
        : `Consider adding ${need} more share${need === 1 ? "" : "s"} from different sectors. Owning only a few shares is like putting all your savings into one shop: if that shop has a bad year, there is nothing else to fall back on. Aim for 5–8 shares across at least 3 sectors, so no single company or sector can hurt you too much.`,
    );
  }
  if (maxSectorPct > 50 && holdingCount > 1) {
    const pct = maxSectorPct.toFixed(0);
    consider.push(
      bnMode
        ? `${maxSectorName} সেক্টর এখন আপনার পোর্টফোলিওর ${pct}%, যা কমানো ভালো। সবচেয়ে সহজ উপায় হলো এই সেক্টরে আর টাকা না বাড়িয়ে পরের বিনিয়োগগুলো অন্য সেক্টরে করা। সময়ের সঙ্গে ভারসাম্য এমনিতেই ঠিক হয়ে যাবে, কিছু বিক্রিও করতে হবে না।`
        : `${maxSectorName} is now ${pct}% of your portfolio, which is worth bringing down. The simplest way is to stop adding to it and put your next investments into a different sector. Over time the balance evens out without your having to sell anything.`,
    );
  }
  if (buyMoreItems.length > 0) {
    const c = buyMoreItems[0];
    const others = buyMoreItems.length - 1;
    consider.push(
      bnMode
        ? `${c.code}-এ এখন "আরও কেনা যায়" সংকেত আছে${others > 0 ? ` (আরও ${others}টিও)` : ""}। কারণ: ${c.signal.reason} হাতে বাড়তি টাকা থাকলে এখানে আরেকটু কেনা যায়, তবে কোনো একটি শেয়ার যেন আপনার টাকার 25%-এর বেশি না হয়।`
        : `${c.code} is marked Buy more${others > 0 ? ` (and ${others} more)` : ""}. Why: ${c.signal.reason} If you have spare money, adding a little here makes sense. Just keep any one share under about 25% of your money.`,
    );
  }
  if (upExpensiveItems.length > 0) {
    const c = upExpensiveItems[0];
    consider.push(
      bnMode
        ? `${c.code}-এর দাম অনেকটা বেড়েছে, আর কোম্পানির আসল মুনাফার তুলনায় এখন বেশি মনে হচ্ছে। কিছু শেয়ার বিক্রি করে লাভ তুলে নিলে সেই লাভ নিরাপদ হয়, আর বাকিগুলো রাখলে দাম আরও বাড়ার সুযোগও থাকে। পুরোটা বিক্রি করতে হবে না।`
        : `${c.code} has risen sharply, and the price now looks high next to what the company earns. Selling part of it locks in some of the gain, while the shares you keep can still rise further. You do not have to sell all of it.`,
    );
  }
  if (nearHighItems.length > 0) {
    const codes = nearHighItems.map((i) => i.code);
    if (codes.length === 1) {
      consider.push(
        bnMode
          ? `${codes[0]} গত এক বছরের সর্বোচ্চ দামের কাছাকাছি আছে। এটি শক্তির লক্ষণ, তবে এখান থেকে আরও বাড়ার জায়গা কম আর কিছুটা কমে আসার ঝুঁকি বেশি। ভালো কোম্পানি বিক্রি করার দরকার নেই, তবে এই দামে আরও কেনার আগে ভালো করে ভেবে নিন।`
          : `${codes[0]} is trading near its highest price of the past year. That is a sign of strength, but it leaves less room to rise and a higher chance of a fall back. There is no need to sell a good company; just think carefully before buying more at this level.`,
      );
    } else {
      consider.push(
        bnMode
          ? `${nameList(codes, 2, "bn")} গত এক বছরের সর্বোচ্চ দামের কাছাকাছি আছে, তাই আরও বাড়ার জায়গা কম আর কিছুটা কমে আসার ঝুঁকি বেশি। ভালোগুলো ধরে রাখতে পারেন, তবে এই দামে নতুন করে কেনার আগে সাবধান থাকুন।`
          : `${nameList(codes)} are trading near their highest prices of the past year, so they have less room to rise and a higher chance of falling back. You can keep the good ones, but be careful about buying more at these levels.`,
      );
    }
  }
  if (bWeightPct >= 30) {
    const pct = bWeightPct.toFixed(0);
    consider.push(
      bnMode
        ? `আপনার টাকার ${pct}% আছে B ক্যাটাগরির শেয়ারে, অর্থাৎ যে কোম্পানিগুলো গত বছর 10%-এর কম ডিভিডেন্ড দিয়েছে। এটি নিজে বিপদের সংকেত নয়, তবে এই কোম্পানিগুলো এখনো আপনার সঙ্গে মুনাফা তেমন ভাগ করছে না। নিয়মিত ডিভিডেন্ড দেয় এমন কয়েকটি A ক্যাটাগরির শেয়ার দিয়ে ভারসাম্য আনার কথা ভাবুন।`
        : `${pct}% of your money is in B category shares, companies that paid less than a 10% dividend last year. That is not a warning by itself, but these companies are not sharing much of their profit with you yet. A few A category shares that pay regular dividends would balance them.`,
    );
  }
  if (reliableDividend.length === 0 && holdingCount >= 3) {
    consider.push(
      bnMode
        ? "আপনার কোনো শেয়ারই নিয়মিত ভালো ডিভিডেন্ড দেয় না। নিয়মিত ডিভিডেন্ড দেয় এমন 1–2টি শেয়ার যোগ করলে দাম বাড়ার লাভের পাশাপাশি প্রতি বছর নগদ টাকাও হাতে আসে। দীর্ঘমেয়াদি বৃদ্ধির সঙ্গে নিয়মিত আয় চাইলে এটি বেশ কাজের।"
        : "None of your shares pays a strong, reliable dividend. Adding 1–2 shares that do would bring cash to you every year, on top of any rise in price. This is especially useful if you want steady income alongside long-term growth.",
    );
  }
  if (good.length === 0 && bad.length === 0 && consider.length === 0) {
    consider.push(
      bnMode
        ? "আপনার পোর্টফোলিও ভালো অবস্থায় আছে, জরুরি ঠিক করার কিছু নেই। প্রতি প্রান্তিকে কোম্পানির ফলাফল বের হলে একবার দেখে নিন। শেয়ারগুলো যাচাই করার জন্য সেটিই স্বাভাবিক সময়।"
        : "Your portfolio looks healthy and there's nothing urgent to fix. Check back once a quarter, when company results come out. That is the natural time to review your shares.",
    );
  }

  // ── Grade ──────────────────────────────────────────────────────────────
  let sectorPenalty = 0;
  if (distinctSectors === 1 && holdingCount >= 1) sectorPenalty = Math.max(sectorPenalty, 2);
  if (maxSectorPct > 50) sectorPenalty = Math.max(sectorPenalty, 4);
  // Financials move together — a heavy combined weight is a concentration even
  // when it's split across banks / NBFIs / insurers.
  if (financialsOverweight) sectorPenalty = Math.max(sectorPenalty, 3);
  // Effective (concentration-honest) count, not a raw holding count: 8 names
  // with one at 60% behaves like far fewer than 8. Equal-weight portfolios are
  // unaffected (effectiveStocks === holdingCount there).
  const spreadScore = clamp(Math.min(effectiveStocks, 10) - sectorPenalty, 0, 10);

  const baseQuality = weightedAvgScore != null ? weightedAvgScore / 10 : 5;
  // Z-category and stale-accounts exposure dent Quality by portfolio weight,
  // capped so they nudge rather than dominate (the backend's category and
  // staleness multipliers have already pulled those companies' own scores down).
  const categoryPenalty = Math.min(2, zWeightPct / 15);
  const stalePenalty = Math.min(2, staleWeightPct / 15);
  // Weak-rated and weak-finance holdings dent Quality by the money in them
  // (2026-10-26: it used to be 2 points per name, so a 1% position cost as
  // much as a 40% one). A third of the portfolio in weak names costs the full 3.
  const weakWeightPct = insights.filter((i) => i.tierKey === "weak").reduce((acc, i) => acc + i.weightPct, 0);
  const strugglingWeightPct = insights.filter((i) => i.flags.weakFinances).reduce((acc, i) => acc + i.weightPct, 0);
  const weakPenalty = weakWeightPct > 0 ? Math.min(3, 0.5 + weakWeightPct / 12) : 0;
  const strugglingPenalty = strugglingWeightPct > 0 ? Math.min(2, 0.3 + strugglingWeightPct / 20) : 0;
  const qualityScore = clamp(
    baseQuality - weakPenalty - strugglingPenalty - categoryPenalty - stalePenalty,
    0,
    10,
  );

  // Entry = weight-averaged "did you overpay?" across the holdings we can judge
  // (see judgeEntry). A 40% position bought dear costs far more than a 2% one;
  // holdings with no EPS to judge against are left out; nothing judgeable → a
  // neutral 5, the same fallback Quality uses.
  const judgeable = insights.filter((i) => i.entryScore != null);
  const judgeableWeight = judgeable.reduce((acc, i) => acc + i.weightPct, 0);
  const entryScore =
    judgeableWeight > 0
      ? clamp(
          judgeable.reduce((acc, i) => acc + (i.entryScore as number) * i.weightPct, 0) /
            judgeableWeight,
          0,
          10,
        )
      : 5;

  const overall = (spreadScore + qualityScore + entryScore) / 3;
  const { grade, label: gradeLabel } = gradeFromAvg(overall);

  const headline = composeHeadline(
    {
      grade,
      holdingCount,
      maxSectorPct,
      maxSectorName,
      strugglingCount: strugglingNames.length,
      avoidCount: avoidNames.length,
      zCount: zItems.length,
      expensiveCount: expensiveItems.length,
    },
    lang,
  );
  const gradeExplanation = composeGradeExplanation(grade, lang);

  return {
    lang,
    grade,
    gradeLabel,
    headline,
    gradeExplanation,
    good: good.slice(0, 5),
    bad: bad.slice(0, 5),
    consider: consider.slice(0, 5),
    holdings: insights,
    sectorSpread,
    subScores: { spread: spreadScore, quality: qualityScore, entry: entryScore, overall },
    effectiveStocks,
    breakdown: {
      sectorPenalty,
      baseQuality,
      weakPenalty,
      strugglingPenalty,
      categoryPenalty,
      stalePenalty,
      judgeablePct: judgeableWeight,
    },
    topRisk: topRiskInsight
      ? {
          code: topRiskInsight.code,
          weightPct: topRiskInsight.weightPct,
          tierKey: topRiskInsight.tierKey,
          qualityWord: topRiskInsight.qualityWord,
        }
      : null,
  };
}

// ── Rebalance helper ("what to buy next") ──────────────────────────────────
//
// Since 2026-10-28 the ideas come from the backend recommendation engine
// (`GET /api/user/portfolio/buy-next`, services/recommend.py) — the same
// gated, ranked pool as the dashboard's "Picked for you", so the two never
// name different stocks for the same reader. What it guarantees:
// - every idea has today's Buy signal AND passes the engine's safety checks
//   (profit, no auditor / regulator warnings, loans under savings, enough data);
// - each gap gets its own kind of idea: a stronger company in the same sector
//   for a weak / Z holding (swap), a steady payer when nothing pays (dividend),
//   a sector the reader doesn't own (new_sector), or anything outside the
//   heavy sector and outside banks + finance + insurers when those hold over
//   half the money (spread); with no gaps, the reader's best-fitting picks
//   (fit, or add_more on a Buy More holding under a fifth of the money);
// - every idea carries its number lines, the signal's own reason, one
//   watch-out and an example amount (about 10% of the money, whole shares).
// When gaps exist but nothing passes, it says so instead of lowering the bar.
// This adapter keeps the plan's old shape so `RebalanceHelper`,
// `buildNextMove` and `gradeLifts` read it unchanged.

export type RebalanceKind = BuyNextKind;

export interface RebalancePick {
  code: string;
  companyName: string | null;
  sector: string | null;
  score: number | null;
  ltp: number | null;
  divYieldPct: number | null;
  kind: RebalanceKind;
  /** The kind word the engine gave it ("Instead of X", "New sector", "Like GP"). */
  tag: string;
  /** The holding this one could replace (swap ideas only). */
  replaces: string | null;
  /** The headline reason — what gap it fills. */
  why: string;
  /** Plain number lines: grade, price vs its usual or its sector, dividend, profit. */
  evidence: string[];
  /** The Buy signal's own reason, in the reader's language. */
  signalReason: string | null;
  /** Strong buy (the signal's conviction). */
  strong: boolean;
  /** One honest thing to watch, or null. */
  watch: string | null;
  /** Example size: whole shares at today's price. */
  suggest: { shares: number; amount: number; targetPct: number } | null;
}

export interface RebalancePlan {
  /** Plain-English gaps this plan addresses; empty = portfolio looks balanced. */
  gaps: string[];
  picks: RebalancePick[];
  /** How many stocks carry a Buy signal today. */
  buyPool: number;
  /** …and how many of those pass every safety check (the pool the ideas come from). */
  passed: number;
  /** Set when there are gaps but no stock passed every check today. */
  noneReason: string | null;
}

export const EMPTY_PLAN: RebalancePlan = { gaps: [], picks: [], buyPool: 0, passed: 0, noneReason: null };

/** The engine's answer in the reader's language (null → no card). */
export function planFromEngine(res: BuyNext | null, lang: AnalysisLang = "en"): RebalancePlan {
  if (!res) return EMPTY_PLAN;
  const bn = lang === "bn";
  const L = (t: { en: string; bn: string }) => (bn ? t.bn : t.en);
  return {
    gaps: res.gaps.map(L),
    picks: res.picks.map((p) => ({
      code: p.code,
      companyName: p.name,
      sector: p.sector,
      score: p.score,
      ltp: p.price,
      divYieldPct: p.div_yield_pct,
      kind: p.kind,
      tag: bn ? p.tag_bn : p.tag_en,
      replaces: p.replaces,
      why: bn ? p.why_bn : p.why_en,
      evidence: p.points.map(L),
      signalReason: (bn ? p.signal_reason_bn : p.signal_reason_en) || p.signal_reason_en,
      strong: p.strong,
      watch: p.watch ? L(p.watch) : null,
      suggest: p.suggest ? { shares: p.suggest.shares, amount: p.suggest.amount, targetPct: p.suggest.target_pct } : null,
    })),
    buyPool: res.buys,
    passed: res.passed,
    noneReason: res.none_reason ? L(res.none_reason) : null,
  };
}
