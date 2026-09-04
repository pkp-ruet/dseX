import type { ScoreItem, PortfolioHolding, HoldingSignalInfo } from "@/lib/api";
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
  /** Biggest single concentration risk: a large position in a below-good company. */
  topRisk: {
    code: string;
    weightPct: number;
    tierKey: TierBucket;
    qualityWord: QualityWord;
  } | null;
}

// ── helpers ────────────────────────────────────────────────────────────────

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
      "This company isn't making a profit right now, so there are no earnings to judge your buying price against. Be extra careful with it — a loss-making company can look cheap for a very long time.",
    cheap_up:
      "That was a cheap price, and it has paid off — you're up {n}%. Nothing to fix here; let the company keep working for you.",
    cheap_flat:
      "That was a cheap price. The market hasn't rewarded it yet, but you didn't overpay — give it time.",
    cheap_down:
      "That was a cheap price, yet the stock still fell {n}%. The price wasn't the problem — check whether something changed in the business before you decide anything.",
    fair_up:
      "That's a fair price, and you're up {n}%. A good, ordinary result — hold and let the business grow.",
    fair_flat:
      "That's a fair price. Nothing urgent to do — hold and let the business grow.",
    fair_down:
      "That's a fair price, so this {n}% loss isn't from overpaying. Don't panic-sell — give the company time to recover.",
    expensive_up:
      "That was a high price, but it has worked out so far — you're up {n}%. This gain leans on the market staying generous, so think about booking part of it.",
    expensive_flat:
      "That was a high price, and the stock hasn't moved. The company has to grow a lot just to justify what you paid, so keep your expectations modest.",
    expensive_down:
      "That was a high price, and the stock has fallen {n}%. This is the classic overpaying mistake. Look at today's valuation on the stock page before deciding to hold, add, or exit.",
  },
  bn: {
    no_price:
      "এই শেয়ারের লাইভ দাম এখন আমাদের কাছে নেই, তাই আপনার কেনাটা কেমন চলছে এখনই বলা যাচ্ছে না। বাজার খুললে আবার দেখুন।",
    no_data:
      "এই কোম্পানির যথেষ্ট আর্থিক তথ্য আমাদের কাছে নেই, তাই আপনার কেনা দাম ঠিক ছিল কি না বলা কঠিন। আরও তথ্য না আসা পর্যন্ত এটি নিয়ে একটু সাবধানে থাকুন।",
    loss_making:
      "এই কোম্পানি এখন মুনাফা করছে না, তাই আপনার কেনার দাম যাচাই করার মতো কোনো আয় নেই। এটি নিয়ে বাড়তি সাবধান থাকুন — লোকসানি কোম্পানি অনেক দিন সস্তা দেখাতে পারে।",
    cheap_up:
      "এটা সস্তা দাম ছিল, আর তার ফলও পেয়েছেন — {n}% লাভে আছেন। এখানে কিছু করার নেই; কোম্পানিকে আপনার জন্য কাজ করতে দিন।",
    cheap_flat:
      "এটা সস্তা দাম ছিল। বাজার এখনো এর দাম দেয়নি, তবে আপনি বাড়তি দাম দেননি — সময় দিন।",
    cheap_down:
      "এটা সস্তা দাম ছিল, তবু শেয়ারটি {n}% পড়েছে। দাম সমস্যা ছিল না — কিছু ঠিক করার আগে দেখুন ব্যবসায় কিছু বদলেছে কি না।",
    fair_up:
      "এটা ন্যায্য দাম, আর আপনি {n}% লাভে আছেন। ভালো, স্বাভাবিক ফল — ধরে রাখুন, ব্যবসাকে বাড়তে দিন।",
    fair_flat:
      "এটা ন্যায্য দাম। জরুরি কিছু করার নেই — ধরে রাখুন, ব্যবসাকে বাড়তে দিন।",
    fair_down:
      "এটা ন্যায্য দাম, তাই এই {n}% লোকসান বাড়তি দাম দেওয়ার জন্য নয়। ভয়ে বিক্রি করবেন না — কোম্পানিকে ঘুরে দাঁড়ানোর সময় দিন।",
    expensive_up:
      "এটা বেশি দাম ছিল, তবু এখন পর্যন্ত কাজে লেগেছে — {n}% লাভে আছেন। এই লাভ বাজারের উদারতার ওপর দাঁড়িয়ে, তাই কিছুটা লাভ তুলে নেওয়ার কথা ভাবুন।",
    expensive_flat:
      "এটা বেশি দাম ছিল, আর শেয়ারটি নড়েনি। আপনার দেওয়া দামের যোগ্য হতেই কোম্পানিকে অনেক বাড়তে হবে, তাই আশা কমই রাখুন।",
    expensive_down:
      "এটা বেশি দাম ছিল, আর শেয়ারটি {n}% পড়েছে। এটাই বাড়তি দাম দেওয়ার চেনা ভুল। ধরে রাখবেন, আরও কিনবেন, না সরে আসবেন — সিদ্ধান্তের আগে শেয়ারের পাতায় আজকের দাম-মূল্যায়ন দেখুন।",
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
          ? "এই শেয়ারের সংকেত এখনো তৈরি হয়নি — পরের আপডেটে চলে আসবে।"
          : "No signal for this holding yet — it arrives with the next data update.",
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
  const sectorPart = insight.sector ?? (lang === "bn" ? "অজানা খাত" : "Unknown sector");
  const weightStr = `${insight.weightPct.toFixed(0)}%`;
  return `${insight.code} — ${sectorPart} · ${weightStr} · ${insight.descriptor}`;
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
        ? `${pct}% আছে ${args.maxSectorName} খাতে`
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
        : `${args.expensiveCount} stock${args.expensiveCount === 1 ? "" : "s"} bought too expensive`,
    );
  }
  const issueStr = issues.slice(0, 2).join(bnMode ? " আর " : " and ");

  if (bnMode) {
    if (args.grade === "A") {
      return "আপনার পোর্টফোলিও সুন্দরভাবে সাজানো — আপনার টাকা শক্তিশালী কোম্পানিগুলোতে ছড়ানো, আর কিনেছেনও ন্যায্য দামে। যেভাবে চলছেন সেভাবেই চলুন, কয়েক মাস পর পর একবার দেখে নিন।";
    }
    if (args.grade === "B") {
      if (!issueStr)
        return "আপনার পোর্টফোলিও ভালো অবস্থায় আছে, শুধু ছোটখাটো কিছু বিষয় নজরে রাখুন। জরুরি কোনো বদল দরকার নেই — নিচের পয়েন্টগুলো দেখে রাখুন।";
      return `আপনার পোর্টফোলিও ভালো অবস্থায় আছে, তবে খেয়াল রাখুন: ${issueStr}। এই ছোট বিষয়গুলো ঠিক করলেই আপনি শক্ত অবস্থানে।`;
    }
    if (args.grade === "C") {
      if (!issueStr)
        return "আপনার পোর্টফোলিও মোটামুটি ঠিক আছে, তবে কিছু দুর্বল জায়গা আছে। নিচের পয়েন্টগুলো পড়ুন — এখনই ছোট ছোট বদল আনলে পরে বড় লোকসান থেকে বাঁচতে পারেন।";
      return `আপনার পোর্টফোলিও মোটামুটি চলছে, কিন্তু ${issueStr} — এগুলো আপনার লাভ কমিয়ে দিচ্ছে। ঝুঁকিটা আরেকটু ছড়িয়ে দিলে আপনার টাকা বেশি নিরাপদ থাকবে।`;
    }
    if (args.grade === "D") {
      return `আপনার পোর্টফোলিও নড়বড়ে — ${issueStr || "টাকা এক জায়গায় জমে আছে আর ভাগটাও অসম"}। এখনই সাজিয়ে না নিলে বাজারের একটা খারাপ সময় আপনাকে বড় ধাক্কা দিতে পারে।`;
    }
    return `আপনার পোর্টফোলিও খুবই ঝুঁকিপূর্ণ — ${issueStr || "এটিকে নতুন করে সাজানো দরকার"}। নতুন টাকা ঢালার আগে একটু থামুন, নিচের পরামর্শগুলো মেনে শক্ত ভিতের ওপর আবার সাজান।`;
  }

  if (args.grade === "A") {
    return "Your portfolio is well-built — your money is spread across strong companies that you bought at fair prices. Keep doing what you're doing and check back every few months.";
  }
  if (args.grade === "B") {
    if (!issueStr)
      return "Your portfolio is in good shape, with just a few small things to watch. No urgent changes needed — keep an eye on the points below.";
    return `Your portfolio is in good shape, but watch out for ${issueStr}. Fix these small issues and you're on solid ground.`;
  }
  if (args.grade === "C") {
    if (!issueStr)
      return "Your portfolio is okay but has a few weak spots. Read the points below — small adjustments now can save you from bigger losses later.";
    return `Your portfolio is okay, but ${issueStr} are pulling your returns down. Spreading the risk a bit more will make your money safer.`;
  }
  if (args.grade === "D") {
    return `Your portfolio is shaky — ${issueStr || "your money is too concentrated and the mix is uneven"}. Without a rebalance, one bad stretch in the market could hurt you a lot.`;
  }
  return `Your portfolio is very risky — ${issueStr || "it needs a serious rebalance"}. Step back, follow the actions below, and rebuild on a stronger base before adding any more money.`;
}

const GRADE_EXPLANATION: Record<AnalysisLang, { intro: string; byGrade: Record<Grade, string> }> = {
  en: {
    intro:
      "We grade your portfolio on three simple things: how well you've spread your money so one bad stock doesn't sink everything, how strong the companies you own actually are, and whether you bought at a fair price. ",
    byGrade: {
      A: "An 'A' means all three are in good shape — this is what a healthy long-term portfolio looks like.",
      B: "A 'B' means most things are working, with a few small things to watch — nothing urgent.",
      C: "A 'C' means at least one of these three is weak. Fix it now while the issue is still small.",
      D: "A 'D' means two of these three are weak. Don't add more money until you sort out the issues below.",
      F: "An 'F' means all three are weak. This is a high-risk setup — read the action points below before doing anything else.",
    },
  },
  bn: {
    intro:
      "আমরা আপনার পোর্টফোলিওকে তিনটি সহজ বিষয় দিয়ে মাপি: আপনার টাকা কতটা ছড়িয়ে আছে (যাতে একটা খারাপ শেয়ার সব ডুবিয়ে না দেয়), আপনার কোম্পানিগুলো আসলে কতটা শক্তিশালী, আর আপনি ন্যায্য দামে কিনেছেন কি না। ",
    byGrade: {
      A: "'A' মানে তিনটিই ভালো অবস্থায় আছে — লম্বা সময়ের জন্য স্বাস্থ্যকর পোর্টফোলিও দেখতে এমনই হয়।",
      B: "'B' মানে বেশিরভাগ জিনিস ঠিক চলছে, শুধু ছোট কিছু বিষয় নজরে রাখতে হবে — জরুরি কিছু নয়।",
      C: "'C' মানে এই তিনটির মধ্যে অন্তত একটি দুর্বল। সমস্যা ছোট থাকতে থাকতেই ঠিক করে ফেলুন।",
      D: "'D' মানে তিনটির মধ্যে দুটিই দুর্বল। নিচের সমস্যাগুলো না মেটানো পর্যন্ত নতুন টাকা যোগ করবেন না।",
      F: "'F' মানে তিনটিই দুর্বল। এটি বেশ ঝুঁকির অবস্থা — অন্য কিছু করার আগে নিচের পরামর্শগুলো পড়ুন।",
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
  // Up nicely AND expensive today → "book some profit" idea.
  const upExpensiveItems = insights.filter(
    (i) => i.pnlPct != null && i.pnlPct >= 5 && i.valuationNow === "expensive",
  );
  // Down, cheap today, and still a good/excellent business → "average down" idea.
  const averageDownCandidates = insights.filter(
    (i) =>
      i.pnlPct != null &&
      i.pnlPct <= -5 &&
      i.valuationNow === "cheap" &&
      (i.tierKey === "good" || i.tierKey === "excellent"),
  );
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
  const winners = performersWithPnl.filter((i) => (i.pnlPct as number) > 0);
  const winRatePct =
    performersWithPnl.length > 0 ? (winners.length / performersWithPnl.length) * 100 : null;
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
  const isFinancial = (sec: string | null) =>
    !!sec && /bank|financ|nbfi|leasing|insuranc/.test(sec.toLowerCase());
  const financialInsights = insights.filter((i) => isFinancial(i.sector));
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
        ? `আপনার কাছে ${distinctSectors}টি খাতের ${holdingCount}টি আলাদা শেয়ার আছে — এটা স্বাস্থ্যকর বণ্টন। একটি খাতের সময় খারাপ গেলেও বাকিগুলো আপনার পোর্টফোলিও ধরে রাখতে পারে। লম্বা সময়ের বিনিয়োগকারীরা ঠিক এই নিরাপত্তাই চান।`
        : `You own ${holdingCount} different stocks across ${distinctSectors} sectors — that's a healthy spread. If one sector goes through a rough patch, the others can still hold your portfolio up. This is exactly the safety net long-term investors aim for.`,
    );
  }
  if (scored.length >= 2) {
    const strongCount = scored.filter((i) => (i.score as number) >= 70).length;
    if (strongCount / scored.length >= 0.6) {
      good.push(
        bnMode
          ? `আপনার বেশিরভাগ কোম্পানিই শক্তিশালী বাছাই (${scored.length}টির মধ্যে ${strongCount}টি)। এগুলোর আয় ভালো আর আর্থিক অবস্থাও মজবুত — বাজার খারাপ হলেও এই ধরনের শেয়ার তুলনামূলক ভালো টিকে থাকে।`
          : `Most of the companies you own are strong picks (${strongCount} out of ${scored.length}). These are businesses with solid earnings and healthy finances — the kind of stocks that hold up better when the market gets rough.`,
      );
    }
  }
  if (best && (best.pnlPct as number) >= 20) {
    const upPct = (best.pnlPct as number).toFixed(1);
    good.push(
      bnMode
        ? `${best.code} দারুণ বাছাই ছিল — কেনার পর থেকে ${upPct}% বেড়েছে। শুধু দাম বেড়েছে বলেই বিক্রি করবেন না; কোম্পানিটি এখনো শক্তিশালী কি না দেখুন, আর দাম ব্যবসার চেয়ে অনেক এগিয়ে গেলে তবেই কিছু লাভ তুলুন।`
        : `${best.code} has been a great pick — it's up ${upPct}% since you bought it. Don't sell just because it's up; check whether the company is still strong, and only book profit if the price has run far ahead of the business.`,
    );
  }
  if (judgeableEntryCount > 0 && goodEntryCount / judgeableEntryCount >= 0.6) {
    good.push(
      bnMode
        ? `আপনার বেশিরভাগ শেয়ারই ন্যায্য দামে কেনা (${judgeableEntryCount}টির মধ্যে ${goodEntryCount}টি)। শেয়ারবাজারে ন্যায্য দামে কেনাটাই অর্ধেক জেতা — আপনি বাড়তি দাম দেননি, তাই পরে দুশ্চিন্তাও অনেক কম।`
        : `You paid a fair price for most of your stocks (${goodEntryCount} out of ${judgeableEntryCount}). Buying at a fair price is half the battle in the stock market — you've avoided overpaying, which means a lot less stress later.`,
    );
  }
  if (reliableDividend.length >= 2) {
    good.push(
      bnMode
        ? `আপনার ${reliableDividend.length}টি কোম্পানি নিয়মিত ডিভিডেন্ড দেয়। মানে দাম বাড়ার লাভের পাশাপাশি প্রতি বছর নগদ টাকাও আপনার হাতে আসছে — অনেকটা নিজের সম্পত্তির ভাড়ার মতো। এই ডিভিডেন্ড আবার বিনিয়োগ করলে পোর্টফোলিও চুপচাপ বড় হতে থাকে।`
        : `You earn reliable dividends from ${reliableDividend.length} of your companies. That means cash returning to you every year on top of any price gains — like rent from a property you own. Reinvesting these dividends quietly grows your portfolio over time.`,
    );
  }
  if (winRatePct != null && winRatePct >= 70 && performersWithPnl.length >= 3) {
    good.push(
      bnMode
        ? `আপনার বেশিরভাগ শেয়ার এখন লাভে আছে (${performersWithPnl.length}টির মধ্যে ${winners.length}টি)। এটা বোঝায় আপনার শেয়ার বাছাই কাজ করছে — যেভাবে বাছছেন সেভাবেই বাছুন, আর লাভের শেয়ার খুব তাড়াতাড়ি বিক্রির লোভ সামলান।`
        : `Most of your stocks are currently in profit (${winners.length} out of ${performersWithPnl.length}). That's a sign your stock-picking is working — keep your process the same and resist the urge to sell winners too quickly.`,
    );
  }

  // Bad
  if (holdingCount === 1) {
    bad.push(
      bnMode
        ? "আপনার কাছে মাত্র 1টি শেয়ার আছে, মানে আপনার পুরো টাকা একটি কোম্পানির সাথে বাঁধা। সেই কোম্পানির একটা বছর খারাপ গেলেই — দুর্বল ফলাফল, কোনো কেলেঙ্কারি, যা-ই হোক — আপনার পুরো পোর্টফোলিও পড়ে যাবে। যত তাড়াতাড়ি পারেন, আলাদা আলাদা খাত থেকে আরও 4–7টি শেয়ার যোগ করুন।"
        : "You only own 1 stock, which means your entire money is tied to a single company. If that one company has a bad year — weak results, a scandal, anything — your whole portfolio falls with it. Add 4–7 more stocks from different sectors as soon as you can.",
    );
  } else if (holdingCount === 2) {
    bad.push(
      bnMode
        ? "আপনার কাছে মাত্র 2টি শেয়ার — এখনো খুব বেশি এক জায়গায় জমা। যেকোনো একটির একটা খারাপ দিন আপনার পোর্টফোলিওতে বড় ধাক্কা দেয়, কারণ আপনার অর্ধেক টাকা প্রতিটি শেয়ারের সাথে ওঠানামা করে। অন্তত 3টি খাতে 5টি শেয়ার রাখার চেষ্টা করুন।"
        : "You only own 2 stocks — that's still too concentrated. A bad day for either one hits your portfolio hard, because half your money moves with each stock. Aim for at least 5 stocks across 3 different sectors.",
    );
  }
  if (topRiskInsight) {
    const w = topRiskInsight.weightPct.toFixed(0);
    const qBn = QUALITY_WORD_BN[topRiskInsight.qualityWord];
    bad.push(
      bnMode
        ? `${topRiskInsight.code} আপনার পোর্টফোলিওর ${w}%, অথচ এর মান ${qBn} — এটাই আপনার সবচেয়ে বড় ঝুঁকি। দুর্বল কোম্পানিতে বড় বাজি রাখলে বাকি সব শেয়ারের লাভ এক ধাক্কায় মুছে যেতে পারে। এটি কমিয়ে 10%-এর কাছাকাছি আনার কথা ভাবুন, বা কিছু টাকা আরও শক্তিশালী কোনো শেয়ারে সরান।`
        : `${topRiskInsight.code} is ${w}% of your portfolio but only rated ${topRiskInsight.qualityWord.toLowerCase()} — that's your single biggest risk. A large bet on a weaker company can wipe out the gains from everything else you own. Consider trimming it toward 10%, or moving some of that money into a stronger name.`,
    );
  }
  if (zItems.length > 0) {
    const pct = zWeightPct.toFixed(0);
    const codes = zItems.map((i) => i.code);
    if (codes.length === 1) {
      bad.push(
        bnMode
          ? `${codes[0]} একটি Z ক্যাটাগরির শেয়ার — আপনার টাকার ${pct}%। কোম্পানি এজিএম না করলে বা ডিভিডেন্ড না দিলে ডিএসই তাকে Z-এ পাঠায় — এটা স্টক এক্সচেঞ্জের নিজের সতর্ক সংকেত। Z শেয়ারের লেনদেন নিষ্পত্তিও দেরিতে হয়, তাড়াহুড়োয় বেচা কঠিন। আর কিনবেন না, আর ধরে রাখার একটা স্পষ্ট কারণ থাকা চাই।`
          : `${codes[0]} is a Z-category share — ${pct}% of your money. DSE puts a company in Z when it skips its AGM or pays no dividend, so this is the exchange's own warning label. Z shares also settle slowly and are hard to sell in a hurry. Don't add more, and have a clear reason for keeping it.`,
      );
    } else {
      bad.push(
        bnMode
          ? `${nameList(codes, 2, "bn")} Z ক্যাটাগরির শেয়ার — একসাথে আপনার টাকার ${pct}%। কোম্পানি এজিএম না করলে বা ডিভিডেন্ড না দিলে ডিএসই তাকে Z-এ পাঠায় — এটা স্টক এক্সচেঞ্জের নিজের সতর্ক সংকেত। Z শেয়ারের লেনদেন নিষ্পত্তিও দেরিতে হয়, তাড়াহুড়োয় বেচা কঠিন। আর কিনবেন না, আর প্রতিটি ধরে রাখার একটা স্পষ্ট কারণ থাকা চাই।`
          : `${nameList(codes)} are Z-category shares — ${pct}% of your money together. DSE puts a company in Z when it skips its AGM or pays no dividend, so this is the exchange's own warning label. Z shares also settle slowly and are hard to sell in a hurry. Don't add more, and have a clear reason for keeping each one.`,
      );
    }
  }
  if (maxSectorPct > 50 && distinctSectors > 1) {
    const pct = maxSectorPct.toFixed(0);
    bad.push(
      bnMode
        ? `আপনার টাকার ${pct}% আছে ${maxSectorName} খাতের শেয়ারে। এই খাতের একটা কোয়ার্টার খারাপ গেলে — সুদের হার বদল, নতুন নিয়ম, দুর্বল আয় — আপনার পোর্টফোলিওর বড় অংশ একসাথে পড়বে। ঝুঁকি ছড়াতে কিছু টাকা অন্য খাতে সরানোর চেষ্টা করুন।`
        : `${pct}% of your money is sitting in ${maxSectorName} stocks. If that sector has a bad quarter — interest-rate changes, regulation, weak earnings — most of your portfolio falls together. Try moving some money into a different sector to spread the risk.`,
    );
  } else if (distinctSectors === 1 && holdingCount >= 2) {
    bad.push(
      bnMode
        ? `আপনার সব শেয়ার একটি খাতেই (${maxSectorName}), তাই আপনার পোর্টফোলিও ওই একটি শিল্পের সাথেই ওঠে আর নামে। ওই খাত বিপদে পড়লে লোকসান সামলানোর আর কিছু থাকে না। এটা ঠিক করতে অন্তত আরও 2টি খাত থেকে শেয়ার যোগ করুন।`
        : `All your stocks are in one sector (${maxSectorName}), so your portfolio rises and falls with that single industry. When that sector is in trouble, you have nothing else to balance the loss. Add stocks from at least 2 other sectors to fix this.`,
    );
  }
  if (financialsOverweight && maxSectorPct <= 50) {
    const pct = financialsWeight.toFixed(0);
    bad.push(
      bnMode
        ? `আপনার প্রায় ${pct}% টাকা আর্থিক খাতের কোম্পানিতে — ব্যাংক, এনবিএফআই আর বিমা মিলিয়ে। এগুলো আলাদা খাত মনে হলেও বেশিরভাগ সময় একসাথেই ওঠানামা করে (সুদের হার আর নিয়মকানুন বদলালে)। আর্থিক খাতে বড় ধাক্কা এলে আপনার পোর্টফোলিওর বেশিরভাগ একসাথে পড়বে। ভারসাম্যের জন্য অন্তত একটি অ-আর্থিক খাত (ওষুধ, খাদ্য, টেলিকম) যোগ করুন।`
        : `About ${pct}% of your money is in financial companies — banks, NBFIs, and insurers combined. They may look like different sectors, but they mostly move together with interest rates and regulation. A shock to the financial sector would hit most of your portfolio at once. Adding a non-financial sector (pharma, food, telecom) would balance this.`,
    );
  }
  if (largestPos && largestPos.weightPct > 40 && holdingCount > 1 && largestPos.code !== topRiskCode) {
    const w = largestPos.weightPct.toFixed(0);
    const hit = (largestPos.weightPct * 0.2).toFixed(0);
    bad.push(
      bnMode
        ? `শুধু ${largestPos.code}-ই আপনার পোর্টফোলিওর ${w}%। এই একটি শেয়ার 20% পড়লে আপনার পুরো পোর্টফোলিও প্রায় ${hit}% পড়ে যাবে — একটা কোম্পানির জন্য এটা বড় ধাক্কা। এটি কিছুটা কমান বা অন্য শেয়ারগুলো বাড়ান, যাতে কোনো একটি শেয়ার একাই সব না হয়ে যায়।`
        : `${largestPos.code} alone is ${w}% of your portfolio. If that one stock drops 20%, your whole portfolio drops nearly ${hit}% — that's a big hit from a single company. Trim it down or grow your other positions so no one stock dominates.`,
    );
  }
  if (strugglingNames.length === 1) {
    bad.push(
      bnMode
        ? `${strugglingNames[0]}-এর আর্থিক অবস্থা দুর্বল দেখাচ্ছে — সম্ভবত বেশি ঋণ বা দুর্বল নগদ প্রবাহ। এমন অবস্থার কোম্পানি ডিভিডেন্ড দিতে, এমনকি খারাপ সময় টিকে থাকতেও হিমশিম খায়। পরের কোয়ার্টারের ফলাফল ভালো করে দেখুন, উন্নতি না হলে সরে আসার জন্য তৈরি থাকুন।`
        : `${strugglingNames[0]}'s finances look weak — likely heavy debt or weak cash flow. Companies in this shape can struggle to pay dividends or even survive a downturn. Watch the next quarterly result closely and be ready to step out if things don't improve.`,
    );
  } else if (strugglingNames.length > 1) {
    bad.push(
      bnMode
        ? `${nameList(strugglingNames, 2, "bn")}-এর আর্থিক অবস্থা দুর্বল — সম্ভবত বেশি ঋণ বা দুর্বল নগদ প্রবাহ। এমন কোম্পানি ডিভিডেন্ড দিতে, এমনকি খারাপ সময় টিকে থাকতেও কষ্ট পায়। এদের পরের কোয়ার্টারের ফলাফল ভালো করে দেখুন।`
        : `${nameList(strugglingNames)} have weak finances — likely heavy debt or weak cash flow. Companies in this shape can struggle to pay dividends or even survive a downturn. Watch their next quarterly results closely.`,
    );
  }
  if (staleItems.length === 1) {
    const s = staleItems[0];
    const yrs = s.dataAgeYears != null ? `${s.dataAgeYears}` : "2+";
    bad.push(
      bnMode
        ? `${s.code}-এর সর্বশেষ হিসাব ${yrs} বছরের পুরোনো, তাই এর স্কোর পুরোনো সংখ্যার ওপর দাঁড়িয়ে — আজকের ব্যবসার ছবি এতে না-ও থাকতে পারে। যে কোম্পানি হিসাব প্রকাশে চুপ হয়ে যায়, তার ভেতরে প্রায়ই কোনো সমস্যা থাকে। রেটিংয়ে ভরসা করার আগে শেয়ারের পাতায় সাম্প্রতিক খবর দেখুন।`
        : `${s.code}'s latest accounts are ${yrs} years old, so its score rests on stale numbers and may not reflect the business today. Companies that go quiet on reporting are often hiding a problem. Check the stock page for recent news before trusting the rating.`,
    );
  } else if (staleItems.length > 1) {
    const codes = staleItems.map((i) => i.code);
    bad.push(
      bnMode
        ? `${nameList(codes, 2, "bn")} 2 বছরের বেশি নতুন হিসাব প্রকাশ করেনি — এদের স্কোর পুরোনো সংখ্যার ওপর দাঁড়িয়ে, আজকের ব্যবসার ছবি এতে না-ও থাকতে পারে। যে কোম্পানি হিসাব প্রকাশে চুপ হয়ে যায়, তার ভেতরে প্রায়ই সমস্যা থাকে। রেটিংয়ে ভরসার আগে এদের পাতায় সাম্প্রতিক খবর দেখুন।`
        : `${nameList(codes)} haven't published fresh accounts in 2 or more years — their scores rest on stale numbers and may not reflect the businesses today. Companies that go quiet on reporting are often hiding a problem. Check their pages for recent news before trusting the ratings.`,
    );
  }
  // The top-risk name is already called out above (big-and-weak) — don't repeat it here.
  // …and Z-category names already have their own bullet above.
  const zCodes = new Set(zItems.map((i) => i.code));
  const avoidForBullet = avoidNames.filter((c) => c !== topRiskCode && !zCodes.has(c));
  if (avoidForBullet.length === 1) {
    bad.push(
      bnMode
        ? `${avoidForBullet[0]} সার্বিক মানে কম স্কোর পেয়েছে, মানে মৌলিক দিকগুলো সব মিলিয়ে দুর্বল। দুর্বল কোম্পানি ধরে রাখলে সময়ের সাথে সাধারণত হতাশ হতে হয়। নিজেকে সৎভাবে জিজ্ঞেস করুন কেন এটি ধরে রেখেছেন — শক্ত কারণ না থাকলে ভালো রেটিংয়ের শেয়ারে বদলে নেওয়ার কথা ভাবুন।`
        : `${avoidForBullet[0]} is rated low on overall quality, meaning weak fundamentals across the board. Holding weak companies usually leads to disappointing returns over time. Honestly ask yourself why you're holding it — and if there's no strong reason, consider switching to a better-rated stock.`,
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
        ? `${shrinkingItems[0].code}-এর আয় গত বছরের চেয়ে ${dropPct ? dropPct : "অনেকটা"} কমেছে — ব্যবসাটা ছোট হচ্ছে। কোম্পানির লাভ কমলে শেয়ারের দামও সাধারণত পিছু পিছু কমে। পরের কোয়ার্টারের ফলাফল দেখুন; আয় কমতেই থাকলে সরে আসার সময় হতে পারে।`
        : `${shrinkingItems[0].code}'s earnings have dropped ${dropPct ?? "double digits"} from last year — the business is shrinking. When a company's profit shrinks, the share price usually follows. Watch the next quarterly result; if earnings keep falling, it may be time to step out.`,
    );
  } else if (shrinkingItems.length > 1) {
    bad.push(
      bnMode
        ? `${nameList(shrinkingItems.map((s) => s.code), 2, "bn")} — সবগুলোরই আয় কমছে, ব্যবসাগুলো ছোট হচ্ছে। লাভ কমলে শেয়ারের দামও সময়ের সাথে নামে, তাই এটা এড়িয়ে যাবেন না। এদের পরের ফলাফল মন দিয়ে দেখুন আর পদক্ষেপ নিতে তৈরি থাকুন।`
        : `${nameList(shrinkingItems.map((s) => s.code))} have all seen falling earnings — these businesses are shrinking. Share prices usually follow profits down over time, so don't ignore this. Watch their next quarterly results carefully and be ready to act.`,
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
        `আপনি ${head}${more} বেশি দামে কিনেছেন — সে সময় কোম্পানির আয় এত দামের সমর্থন করত না। শেয়ারবাজারে সবচেয়ে বেশি ক্ষতি করে এই বাড়তি দাম দেওয়াটাই, কারণ ভালো কোম্পানিরও বেশি দামের যোগ্য হতে বছরের পর বছর লাগে। ধরে রাখবেন, আরও কিনবেন, না সরে আসবেন — সিদ্ধান্তের আগে শেয়ারের পাতায় আজকের দাম-মূল্যায়ন দেখে নিন।`,
      );
    } else {
      const more = extra > 0 ? ` and ${extra} more` : "";
      bad.push(
        `You paid a high price for ${head}${more} — more than the company's earnings justified at the time. Overpaying is the mistake that hurts most on the DSE, because even a good company needs years to grow into a high price. Check today's valuation on the stock page before deciding to hold, add, or exit.`,
      );
    }
  }

  // Consider
  if (holdingCount < 5) {
    const need = Math.max(5 - holdingCount, 1);
    consider.push(
      bnMode
        ? `আলাদা খাত থেকে আরও ${need}টি শেয়ার যোগ করুন। মাত্র কয়েকটি শেয়ার রাখা মানে সব সঞ্চয় একটা দোকানে ঢালা — দোকানটার বছর খারাপ গেলে ভরসার আর কিছু থাকে না। অন্তত 3টি খাতে 5–8টি শেয়ার রাখুন, যাতে কোনো একটি কোম্পানি বা শিল্প আপনাকে বেশি কষ্ট দিতে না পারে।`
        : `Add ${need} more stock${need === 1 ? "" : "s"} from different sectors. Owning just a couple of stocks is like putting all your savings into one shop — if that shop has a bad year, you have nothing else to fall back on. Aim for 5–8 stocks across at least 3 sectors so no single company or industry can hurt you too much.`,
    );
  }
  if (maxSectorPct > 50 && holdingCount > 1) {
    const pct = maxSectorPct.toFixed(0);
    consider.push(
      bnMode
        ? `${maxSectorName} খাতে ভর কমান — এখন এটি আপনার পোর্টফোলিওর ${pct}%। সবচেয়ে সহজ উপায়: এই খাতে নতুন করে আর টাকা না ঢেলে পরের বিনিয়োগগুলো অন্য খাতে করুন। সময়ের সাথে ভারসাম্য এমনিতেই ঠিক হয়ে যাবে, কিছু বিক্রিও করতে হবে না।`
        : `Trim your ${maxSectorName} exposure — it's currently ${pct}% of your portfolio. The simplest fix is to stop adding to it and direct your next investments into a different sector. Over time the balance will even out without you having to sell anything.`,
    );
  }
  if (averageDownCandidates.length > 0) {
    const c = averageDownCandidates[0];
    consider.push(
      bnMode
        ? `${c.code}-এর দাম কমেছে, কিন্তু কোম্পানিটি এখনো শক্তিশালী আর দাম এখন আপনার কেনার সময়ের চেয়েও সস্তা। হাতে বাড়তি টাকা থাকলে আর ব্যবসায় ভরসা থাকলে এখানে আরেকটু কিনলে আপনার গড় খরচ কমবে — দাম ফিরলে লোকসানও তাড়াতাড়ি উঠে আসবে।`
        : `${c.code} is down, but the company is still strong and the price is now cheaper than when you bought. If you have spare money and still believe in the business, buying a little more here lowers your average cost — so when it recovers, you make back the loss faster.`,
    );
  }
  // Sell advice is hidden from the UI for now (we only surface Buy / Strong Buy).
  // The logic is kept here, commented out, to restore easily when Sell returns.
  // const sellCandidates = insights.filter(
  //   (i) => i.tierKey === "weak" && i.entryTag === "expensive_expensive",
  // );
  // if (sellCandidates.length > 0) {
  //   consider.push(
  //     bnMode
  //       ? `${nameList(sellCandidates.map((s) => s.code), 2, "bn")} বিক্রি বা কমানোর কথা ভাবুন — ...`
  //       : `Consider selling or reducing ${nameList(sellCandidates.map((s) => s.code))} — ...`,
  //   );
  // }
  if (upExpensiveItems.length > 0) {
    const c = upExpensiveItems[0];
    consider.push(
      bnMode
        ? `${c.code} অনেকটা বেড়ে গেছে — কোম্পানির আসল আয়ের তুলনায় দাম এখন বেশি মনে হচ্ছে। কিছু লাভ তুলে নিলে (অংশ বিক্রি করলে) লাভটা নিরাপদ হয়, আবার বাকিটা রেখে দিলে দাম আরও বাড়ার সুযোগও থাকে। পুরোটা বিক্রি করতে হবে না।`
        : `${c.code} has run up sharply — the stock now looks expensive compared to what the company actually earns. Booking some profit (selling part of your position) lets you lock in your gains while still keeping some shares for further upside. You don't have to sell all of it.`,
    );
  }
  if (nearHighItems.length > 0) {
    const codes = nearHighItems.map((i) => i.code);
    if (codes.length === 1) {
      consider.push(
        bnMode
          ? `${codes[0]} তার গত 52 সপ্তাহের সর্বোচ্চ দামের কাছাকাছি চলছে। এটা শক্তির লক্ষণ, তবে এখান থেকে আরও ওপরে যাওয়ার জায়গা কম আর একটু পিছিয়ে আসার ঝুঁকি বেশি। ভালো কোম্পানি বিক্রি করার দরকার নেই — শুধু এই দামে আরও কেনার আগে দুবার ভাবুন।`
          : `${codes[0]} is trading near its 52-week high. That's a sign of strength, but it also means limited room left to run and a higher chance of a pullback. No need to sell a good company — just think twice before buying more at this level.`,
      );
    } else {
      consider.push(
        bnMode
          ? `${nameList(codes, 2, "bn")} তাদের 52 সপ্তাহের সর্বোচ্চ দামের কাছাকাছি — আরও ওপরে ওঠার জায়গা কম আর পিছিয়ে আসার ঝুঁকি বেশি। ভালোগুলো ধরে রাখুন, তবে এই দামে নতুন করে কেনায় সাবধান।`
          : `${nameList(codes)} are trading near their 52-week highs — limited room left to run and more prone to a pullback. Hold your good ones, but be cautious about buying more at these levels.`,
      );
    }
  }
  if (bWeightPct >= 30) {
    const pct = bWeightPct.toFixed(0);
    consider.push(
      bnMode
        ? `আপনার টাকার ${pct}% আছে B ক্যাটাগরির শেয়ারে — যে কোম্পানিগুলো গত বছর 10%-এর কম ডিভিডেন্ড দিয়েছে। এটা নিজে থেকে বিপদ সংকেত নয়, তবে এই ব্যবসাগুলো এখনো আপনার সাথে মুনাফা তেমন ভাগ করছে না। নিয়মিত ডিভিডেন্ড দেয় এমন কয়েকটি A ক্যাটাগরির শেয়ার দিয়ে ভারসাম্য আনুন।`
        : `${pct}% of your money is in B-category shares — companies that paid less than a 10% dividend last year. Not a red flag by itself, but these businesses aren't sharing much profit with you yet. Balance them with a few A-category names that pay regular dividends.`,
    );
  }
  if (reliableDividend.length === 0 && holdingCount >= 3) {
    consider.push(
      bnMode
        ? "আপনার কোনো শেয়ারই শক্ত, নিয়মিত ডিভিডেন্ড দেয় না। 1–2টি ভালো ডিভিডেন্ড শেয়ার যোগ করলে প্রতি বছর নগদ টাকা হাতে আসে — দাম বাড়ার লাভের ওপর যেন বাড়তি ভাড়া। লম্বা সময়ের বৃদ্ধির পাশাপাশি নিয়মিত আয় চাইলে এটা খুব কাজের।"
        : "None of your stocks pay a strong, reliable dividend. Adding 1–2 good dividend stocks gives you cash returning to you every year, which feels like rent on top of any price gains. This is especially useful if you want steady income alongside long-term growth.",
    );
  }
  if (good.length === 0 && bad.length === 0 && consider.length === 0) {
    consider.push(
      bnMode
        ? "আপনার পোর্টফোলিও ভালো অবস্থায় আছে, জরুরি ঠিক করার কিছু নেই। কোয়ার্টারে একবার, কোম্পানির ফলাফল বের হলে, একবার দেখে নিন — শেয়ার পর্যালোচনার জন্য ওটাই স্বাভাবিক সময়।"
        : "Your portfolio looks healthy and there's nothing urgent to fix. Check back once a quarter when company results come out — that's the natural time to review your holdings.",
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
  const qualityScore = clamp(
    baseQuality -
      2 * avoidNames.length -
      1 * strugglingNames.length -
      categoryPenalty -
      stalePenalty,
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

export interface RebalancePick {
  code: string;
  companyName: string | null;
  sector: string | null;
  score: number | null;
  ltp: number | null;
  divYieldPct: number | null;
  why: string;
}

export interface RebalancePlan {
  /** Plain-English gaps this plan addresses; empty = portfolio looks balanced. */
  gaps: string[];
  picks: RebalancePick[];
}

/**
 * Turn the analysis' diversification gaps into concrete next-buy ideas from the
 * rankings: strong companies (score ≥ 65) the user doesn't own, preferring
 * sectors missing from the portfolio and skipping the overweight sector.
 * Returns no picks when the portfolio already looks balanced.
 */
export function buildRebalancePlan(
  analysis: PortfolioAnalysis,
  priceMap: Map<string, ScoreItem>,
  maxPicks = 3,
): RebalancePlan {
  const held = new Set(analysis.holdings.map((h) => h.code.toUpperCase()));
  const heldSectors = new Set(
    analysis.holdings.map((h) => h.sector).filter((s): s is string => !!s),
  );
  const holdingCount = analysis.holdings.length;
  const maxSector = analysis.sectorSpread[0];
  const overweightSector =
    maxSector && maxSector.weightPct > 40 && holdingCount > 1 ? maxSector.name : null;
  const avoidHoldings = analysis.holdings.filter((h) => h.tierKey === "weak");
  const lang = analysis.lang ?? "en";
  const bnMode = lang === "bn";

  const gaps: string[] = [];
  if (holdingCount > 0 && holdingCount < 5) {
    gaps.push(
      bnMode
        ? `আপনার কাছে ${holdingCount}টি শেয়ার আছে — 5–8টি রাখার চেষ্টা করুন, যাতে একটি খারাপ কোম্পানি পুরো পোর্টফোলিও টেনে নামাতে না পারে।`
        : `You own ${holdingCount} stock${holdingCount === 1 ? "" : "s"} — aim for 5–8 so one bad company can't drag your whole portfolio down.`,
    );
  }
  if (overweightSector) {
    const pct = maxSector!.weightPct.toFixed(0);
    gaps.push(
      bnMode
        ? `আপনার টাকার ${pct}% আছে ${overweightSector} খাতে — পরের কেনাটা অন্য কোনো খাত থেকে হওয়া উচিত।`
        : `${pct}% of your money is in ${overweightSector} — your next buy should come from a different sector.`,
    );
  }
  if (avoidHoldings.length > 0) {
    gaps.push(
      bnMode
        ? `${nameList(avoidHoldings.map((h) => h.code), 2, "bn")} ঝুঁকিপূর্ণ রেটিং পেয়েছে — সেই টাকা আরও শক্তিশালী কোনো শেয়ারে কাজে লাগতে পারে।`
        : `${nameList(avoidHoldings.map((h) => h.code))} ${avoidHoldings.length === 1 ? "is" : "are"} rated Risky — a stronger stock could take that money instead.`,
    );
  }

  if (gaps.length === 0) return { gaps, picks: [] };

  const candidates = Array.from(priceMap.values()).filter(
    (s) =>
      s.score != null &&
      s.score >= 65 &&
      s.ltp != null &&
      s.sector != null &&
      !held.has(s.trading_code.toUpperCase()) &&
      (overweightSector == null || s.sector !== overweightSector),
  );
  // Sectors the user doesn't own yet come first; within a group, best score wins.
  candidates.sort((a, b) => {
    const aNew = heldSectors.has(a.sector!) ? 0 : 1;
    const bNew = heldSectors.has(b.sector!) ? 0 : 1;
    if (aNew !== bNew) return bNew - aNew;
    return (b.score ?? 0) - (a.score ?? 0);
  });

  const picks: RebalancePick[] = [];
  const usedSectors = new Set<string>();
  for (const c of candidates) {
    if (picks.length >= maxPicks) break;
    if (usedSectors.has(c.sector!)) continue; // one idea per sector
    usedSectors.add(c.sector!);
    const isNewSector = !heldSectors.has(c.sector!);
    const cheap = (c.p4_val ?? 0) >= 7;
    const why = bnMode
      ? isNewSector
        ? `এমন একটি খাত যোগ করে যা আপনার এখনো নেই (${c.sector})।`
        : cheap
          ? "শক্তিশালী কোম্পানি, আর দামও এখন সস্তা মনে হচ্ছে।"
          : "আপনার সবচেয়ে বড় খাতের বাইরের অন্যতম শক্তিশালী কোম্পানি।"
      : isNewSector
        ? `Adds a sector you don't own yet (${c.sector}).`
        : cheap
          ? "Strong company, and the price looks cheap right now."
          : "One of the strongest companies outside your biggest sector.";
    picks.push({
      code: c.trading_code,
      companyName: c.company_name,
      sector: c.sector,
      score: c.score,
      ltp: c.ltp,
      divYieldPct: c.div_yield_pct,
      why,
    });
  }
  return { gaps, picks };
}
