/**
 * The portfolio report (2026-10-30, plan
 * https://claude.ai/artifact/F7UfEY97wVpR89f5GQVUdg) — the portfolio page in
 * the stock report's shape: ONE answer ("Is your portfolio in good shape?"),
 * four lights, four chapters of plain questions, a plan, and what the full
 * check found on this portfolio, counted (the page's one Premium card). Since
 * 2026-11-02 all of it is Premium; a free reader gets only the findings.
 *
 * Pure and built in the browser from what the page already holds: the same
 * `analyzePortfolio` run that makes the grade (so the answer can never sit
 * above the letter), the buy-next plan, the grade lifts, the glance rows for
 * the shares (warnings, dividend safety, fair value, profit change, next
 * date), the results calendar and the watcher's events.
 *
 * Reading rules (the stock report's, `docs/voice.md`): meaning first in
 * everyday words, at most one familiar number a sentence, no scores out of 10,
 * no ratios, Western digits in Bengali. Every sentence is an `{en, bn}` pair.
 *
 * Rendered by `components/portfolio/report`, all of it Premium. Clean pass
 * 2026-11-04 (user: "too much text"): no chapter reads or lead lines, no
 * "why" under each light (they repeated the rows' first sentences); a row's
 * share-by-share findings ride in `points` (shown open), its general "why it
 * matters" in `meaning` (folded with the figures).
 */
import type { GlanceRow, PortfolioSignalEvent, PortfolioWatchEvent, ScoreItem, UpcomingResult } from "@/lib/api";
import { sectorBn } from "@/lib/bn";
import { companyShort, money, takaGroup } from "@/lib/formatters";
import { getTier, TIER_LABELS, TIER_PILL_BN } from "@/lib/constants";
import {
  BUY_MORE_MAX_PCT,
  FIN_HEAVY_PCT,
  MIN_SHARES,
  ONE_SHARE_BAD_PCT,
  ONE_SHARE_FAIR_PCT,
  SECTOR_BAD_PCT,
  SECTOR_FAIR_PCT,
} from "@/lib/portfolio-limits";
import {
  isFinancialSector,
  type Grade,
  type HoldingInsight,
  type PortfolioAnalysis,
  type RebalancePlan,
} from "@/lib/portfolio-analysis";
import type { GradeLift, GradePath, NextMove, PathStep } from "@/lib/portfolio-next";
import type { ProInsights } from "@/lib/portfolio-pro";
import type { Bi, Tone } from "@/lib/stock-report";

// ── Types ──────────────────────────────────────────────────────────────────

export type LightKey = "companies" | "spread" | "prices" | "watch";
/** `loss` (2026-11-04): the shares below what you paid — only when there are some. */
export type ChapterKey = LightKey | "loss";

export interface PfLight {
  key: LightKey;
  label: Bi;
  word: Bi;
  tone: Tone;
  /** The chapter it opens. */
  href: string;
}

export interface PfAnswer {
  word: Bi;
  tone: Tone;
  /** One free line, built only from the light words. */
  line: Bi;
  grade: Grade;
  /** The light that decided a not-good answer (outlined). */
  blocker: LightKey | null;
  lights: PfLight[];
  /** The first move (Premium). */
  first: { title: Bi; line: Bi; amount: number | null } | null;
}

export type PfPicture =
  | { kind: "split"; label: string; parts: { key: string; value: number; text: Bi; swatch: Swatch }[] }
  | { kind: "bars"; label: string; rows: { key: string; name: Bi; value: number; text: string; me?: boolean }[] }
  | { kind: "dates"; label: string; items: { key: string; name: Bi; when: Bi; tone?: Tone; strong?: boolean }[] };

export type Swatch = "primary" | "good" | "fair" | "bad" | "info" | "gold" | "navy" | "quiet";

export interface PfFigure {
  key: string;
  label: Bi;
  value: Bi;
  tone?: Tone;
  /** Opens this stock's page. */
  code?: string;
}

export interface PfRow {
  key: string;
  title: Bi;
  word: Bi | null;
  tone: Tone;
  /** The answer, one sentence. */
  headline: Bi | null;
  meaning: Bi[];
  watch: Bi | null;
  picture: PfPicture | null;
  /** The figures, folded. */
  figures: PfFigure[];
  /** What this row found, share by share, shown open as a short list:
   *  dates, warnings, the week's updates, the reasons behind a mark. The
   *  general "why it matters" stays in `meaning`, folded (2026-11-04). */
  points: Bi[];
}

export interface PfChapter {
  key: ChapterKey;
  id: string;
  title: Bi;
  head: { word: Bi; tone: Tone; line: Bi };
  rows: PfRow[];
}

/** What the full check found, counted (the Premium card, `#pf-premium`):
 *  `title` carries the count, `line` what Premium shows about it. Never names
 *  a share or gives the answer. */
export interface PfFinding {
  key: "decide" | "warn" | "add" | "weak" | "grade" | "spread" | "moves" | "week" | "paid" | "cash" | "results" | "each" | "strong" | "daily" | "loss";
  title: Bi;
  line: Bi;
}

export interface PfPlanItem {
  key: string;
  title: Bi;
  line: Bi;
  amount?: number | null;
  tag?: Bi;
  tone?: Tone;
  code?: string;
}

export interface PfPlan {
  moves: PfPlanItem[];
  lifts: PfPlanItem[];
  buys: PfPlanItem[];
  each: PfPlanItem[];
  /** One sentence when there is nothing to buy (the engine found no idea). */
  buyNone: Bi | null;
}

/** A row the free reader may open once a month (`PortfolioPromo`): the
 *  answer behind one finding, on their own shares. */
export interface PfTaste {
  finding: PfFinding["key"];
  title: Bi;
  row: PfRow;
}

/** One day of what the watcher flagged, in words without share names. */
export interface PfMissedDay {
  day: string;
  text: Bi;
  tone: Tone;
}

/** What the Premium card leads with (2026-11-04, user: "how can we enrich
 *  portfolio premium promo card so more free user feel urge to buy"): money,
 *  counts, dates and kinds — never which share, never what to do. */
export interface PfPromo {
  /** Money in shares marked Sell, with a serious warning or in weak
   *  companies, each share counted once. */
  atStake: { amount: number; shares: number } | null;
  /** The four areas' tones, worst first — a count, never which area. */
  areas: Tone[];
  /** One dated line when results or a record date on their shares fall in
   *  the next 7 days. */
  soon: Bi | null;
  /** What the watcher flagged in the last 30 days, newest day first. */
  missed: { total: number; days: PfMissedDay[] };
  /** The answers the free reader may open (one a month), most important first. */
  tastes: PfTaste[];
}

/** A share's loss group in "Your way back": only the price fell, in
 *  between, or the company has problems too. */
export type LossKind = "price" | "mixed" | "worse";

/** One share below what was paid (more than 5%), in "Your way back". */
export interface PfWayItem {
  code: string;
  name: string;
  /** Its group word ("Mostly strong"), or null when not graded. */
  tier: Bi | null;
  tierKey: string;
  z: boolean;
  /** Why it sits in its group, one sentence. */
  why: Bi;
  downPct: number;
  /** Taka below what was paid. */
  down: number;
  /** The price that gives the money back after fees both ways (and the cash dividends already received). */
  even: number;
  /** How far the price must rise from today, %. */
  rise: number;
  /** It traded at or above that price in the past year (null = not known). */
  reached: boolean | null;
  /** Cash dividends a year at last year's dividend, after tax. */
  cash: number;
  /** A stronger company the money could move to (problem shares), with the path step that does it. */
  move: { code: string; line: Bi; step: number | null } | null;
  /** What buying more would do (a strong share marked Buy more only). */
  more: Bi | null;
}

export interface PfWayGroup {
  kind: LossKind;
  title: Bi;
  line: Bi;
  down: number;
  items: PfWayItem[];
  /** One summing line under the group (cash while you wait). */
  note: Bi | null;
}

/** "Your way back" (2026-11-11): the money below what was paid, split into
 *  what is only the price and what is the company. Replaces the loss chapter. */
export interface PfWayBack {
  down: number;
  n: number;
  groups: PfWayGroup[];
  watch: Bi | null;
}

export interface PfPathStepView {
  n: number;
  kind: PathStep["kind"];
  code: string;
  title: Bi;
  trades: { side: "sell" | "buy"; text: Bi }[];
  why: Bi;
  /** The profit or loss a sale makes real. */
  note: { text: Bi; tone: Tone } | null;
  from: Grade;
  to: Grade;
}

/** "Three changes to an A" (2026-11-11): `gradePath` in words. */
export interface PfPathView {
  title: Bi;
  line: Bi;
  from: Grade;
  to: Grade;
  steps: PfPathStepView[];
  totals: { sold: number; bought: number; fees: number; left: number };
  /** The engine's other ideas for this portfolio (not used by a step). */
  more: PfPlanItem[];
}

export type PfAction = "switch" | "sell" | "trim" | "review" | "buy_more";

export interface PfEachItem {
  code: string;
  name: string;
  action: PfAction;
  label: Bi;
  tone: Tone;
  line: Bi;
  /** The path step that acts on it. */
  step: number | null;
}

/** "Each of your shares": the ones to act on, then the rest on one line. */
export interface PfEach {
  act: PfEachItem[];
  rest: { code: string; name: string; line: Bi }[];
}

/** The free card (2026-11-11): the outline of the reader's own check, counted. */
export interface PfOutline {
  grade: Grade;
  /** Areas (of 4) that are not good. */
  toLook: number;
  wayBack: { down: number; n: number; groups: { kind: LossKind; count: number; down: number }[] } | null;
  path: { grades: Grade[] } | null;
  act: number;
  n: number;
  /** Answers in "Why we say this". */
  answers: number;
  /** Shares with a serious warning (the stock report's red flags, or Z). */
  warnings: number;
  /** Record dates, AGMs and results meetings on their shares in the next 30 days. */
  dates: number;
  /** What the watcher flagged on their shares in the last 30 days. */
  flagged: number;
}

export interface PortfolioReport {
  answer: PfAnswer;
  /** "Start here": the first step of the path, else the first move. */
  start: { title: Bi; href: string } | null;
  /** The four areas (companies, spread, prices, to watch), in "Why we say this". */
  areas: PfChapter[];
  wayBack: PfWayBack | null;
  path: PfPathView | null;
  each: PfEach;
  plan: PfPlan;
  /** What the full check found, counted (the Premium context, the free answer). */
  findings: PfFinding[];
  outline: PfOutline;
  /** What the Premium card leads with. */
  promo: PfPromo;
  /** How many questions the full check answers (the band). */
  answered: number;
}

export interface ReportInput {
  analysis: PortfolioAnalysis;
  /** `buildNextMove` run in each language. */
  next: { en: { first: NextMove; more: NextMove[] }; bn: { first: NextMove; more: NextMove[] } };
  plan: RebalancePlan;
  /** `gradeLifts` in the page language. */
  lifts: GradeLift[];
  pro: ProInsights;
  priceMap: Map<string, ScoreItem>;
  /** Glance rows for the held codes (may be empty while loading). */
  glance: Map<string, GlanceRow>;
  /** Results meetings in the next two weeks (all companies). */
  results: UpcomingResult[];
  /** The watcher's events on the held codes. */
  watch: PortfolioWatchEvent[];
  /** Buy more / Sell flips on the held codes. */
  flips: PortfolioSignalEvent[];
  /** Today, YYYY-MM-DD (Dhaka) — for "this week". */
  today: string;
  /** The value move since the reader's last visit (an hour or more ago). */
  sinceLast?: { delta: number; since: string } | null;
  /** The reader's fee estimate, % a side (portfolio settings; 0.4 when unset). */
  feePct?: number;
  /** {CODE: cash dividends logged on the holding since it was added} — taken
   *  off the price that gives the money back (the loss chapter). */
  divReceived?: Map<string, number>;
  /** `gradePath` (three changes to an A), or null. */
  path?: GradePath | null;
  /** Tax on cash dividends, % (portfolio settings; 10 when unset). */
  divTaxPct?: number;
}

// ── Words ──────────────────────────────────────────────────────────────────

const B = (en: string, bn: string): Bi => ({ en, bn });
/** A string already in the page language (other helpers write one language). */
const same = (s: string): Bi => ({ en: s, bn: s });
const pct = (v: number) => `${Math.round(v)}%`;
const join = (parts: Bi[], sepEn = " ", sepBn = " "): Bi => ({
  en: parts.map((p) => p.en).filter(Boolean).join(sepEn),
  bn: parts.map((p) => p.bn).filter(Boolean).join(sepBn),
});

/** Plain names for the sectors people talk about. */
const SECTOR_PLAIN: Record<string, string> = {
  Bank: "banks",
  "Financial Institutions": "finance companies",
  NBFI: "finance companies",
  Insurance: "insurers",
  "Life Insurance": "insurers",
  "General Insurance": "insurers",
  "Pharmaceuticals & Chemicals": "medicine",
  Pharmaceuticals: "medicine",
  Telecommunication: "telecom",
  "Food & Allied": "food",
  "Fuel & Power": "power and gas",
  Textile: "textiles",
  Engineering: "engineering",
  Cement: "cement",
  "IT Sector": "IT",
  IT: "IT",
  Ceramics: "ceramics",
  "Ceramics Sector": "ceramics",
  Tannery: "leather",
  "Tannery Industries": "leather",
  "Services & Real Estate": "services and property",
  "Travel & Leisure": "travel",
  Miscellaneous: "other businesses",
};
export const sectorWord = (name: string): Bi => B(SECTOR_PLAIN[name] ?? name.toLowerCase(), sectorBn(name) || name);

/** "BRAC Bank" from the company name, else the code. */
const nameOf = (h: HoldingInsight): string => companyShort(h.companyName) || h.code;
const names = (hs: HoldingInsight[], max = 2): Bi => {
  const ns = hs.map(nameOf);
  if (ns.length <= max) return B(ns.join(" and "), ns.join(" আর "));
  return B(`${ns.slice(0, max).join(", ")} and ${ns.length - max} more`, `${ns.slice(0, max).join(", ")} আর আরও ${ns.length - max}টি`);
};
const shares = (n: number): Bi => B(`${n} share${n === 1 ? "" : "s"}`, `${n}টি শেয়ার`);

const valueOf = (h: HoldingInsight) => h.qty * (h.ltp ?? h.buyPrice);
const GOOD_TIERS = new Set(["excellent", "good"]);

/** Day words for a date ("Tue 4 Nov"). */
function dayWords(iso: string): Bi {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return same(iso);
  const dEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()];
  const dBn = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহস্পতি", "শুক্র", "শনি"][d.getUTCDay()];
  const mEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()];
  const mBn = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"][d.getUTCMonth()];
  return B(`${dEn} ${d.getUTCDate()} ${mEn}`, `${dBn}বার, ${d.getUTCDate()} ${mBn}`);
}

const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

// ── Lights ─────────────────────────────────────────────────────────────────

interface Facts {
  hs: HoldingInsight[];
  total: number;
  n: number;
  goodPct: number;
  weakPct: number;
  /** Money in companies we grade (everything but "not graded"), %. */
  gradedPct: number;
  weak: HoldingInsight[];
  top: HoldingInsight | null;
  topSector: { name: string; pct: number } | null;
  finPct: number;
  finSectors: number;
  sells: HoldingInsight[];
  sellPct: number;
  /** Shares with a serious warning (the stock report's red flags) or in Z. */
  serious: { h: HoldingInsight; lines: Bi[] }[];
  seriousPct: number;
  amber: number;
}

function facts(inp: ReportInput): Facts {
  const hs = inp.analysis.holdings;
  const total = hs.reduce((a, h) => a + valueOf(h), 0) || 1;
  const sum = (pred: (h: HoldingInsight) => boolean) => hs.filter(pred).reduce((a, h) => a + h.weightPct, 0);
  const weak = hs.filter((h) => h.tierKey === "weak").sort((a, b) => b.weightPct - a.weightPct);
  const top = [...hs].sort((a, b) => b.weightPct - a.weightPct)[0] ?? null;
  const sec = inp.analysis.sectorSpread[0];
  const fin = hs.filter((h) => isFinancialSector(h.sector));
  const sells = hs.filter((h) => h.signal.signal === "sell").sort((a, b) => b.weightPct - a.weightPct);
  const serious: Facts["serious"] = [];
  let amber = 0;
  for (const h of hs) {
    const g = inp.glance.get(h.code.toUpperCase());
    const lines: Bi[] = (g?.warnings?.items ?? []).map((i) => B(i.en, i.bn || i.en));
    if (h.flags.zCategory && !lines.length) {
      lines.push(B("It is in Z category, because it skipped a dividend or an AGM.", "এটি Z ক্যাটাগরিতে, কারণ ডিভিডেন্ড দেয়নি বা এজিএম করেনি।"));
    }
    if (lines.length) serious.push({ h, lines });
    amber += g?.warnings?.amber ?? 0;
  }
  return {
    hs,
    total,
    n: hs.length,
    goodPct: sum((h) => GOOD_TIERS.has(h.tierKey)),
    weakPct: sum((h) => h.tierKey === "weak"),
    gradedPct: sum((h) => h.tierKey !== "unscored"),
    weak,
    top,
    topSector: sec && inp.analysis.sectorSpread.length > 1 ? { name: sec.name, pct: sec.weightPct } : sec ? { name: sec.name, pct: 100 } : null,
    finPct: fin.reduce((a, h) => a + h.weightPct, 0),
    finSectors: new Set(fin.map((h) => h.sector)).size,
    sells,
    sellPct: sells.reduce((a, h) => a + h.weightPct, 0),
    serious,
    seriousPct: serious.reduce((a, s) => a + s.h.weightPct, 0),
    amber,
  };
}

type SpreadIssue = { kind: "stock" | "sector" | "finance" | "few" | "none"; tone: Tone };

function spreadIssue(f: Facts): SpreadIssue {
  const issues: SpreadIssue[] = [];
  if (f.n < 3) issues.push({ kind: "few", tone: "bad" });
  if (f.top && f.n > 1) {
    if (f.top.weightPct > ONE_SHARE_BAD_PCT) issues.push({ kind: "stock", tone: "bad" });
    else if (f.top.weightPct > ONE_SHARE_FAIR_PCT) issues.push({ kind: "stock", tone: "fair" });
  }
  if (f.topSector && f.n > 1) {
    if (f.topSector.pct > SECTOR_BAD_PCT) issues.push({ kind: "sector", tone: "bad" });
    else if (f.topSector.pct > SECTOR_FAIR_PCT) issues.push({ kind: "sector", tone: "fair" });
  }
  if (f.finPct > FIN_HEAVY_PCT && f.finSectors >= 2 && !(f.topSector && f.topSector.pct > SECTOR_FAIR_PCT)) issues.push({ kind: "finance", tone: "fair" });
  if (f.n >= 3 && f.n < MIN_SHARES) issues.push({ kind: "few", tone: "fair" });
  const rank = { bad: 0, fair: 1, good: 2, neutral: 3 } as const;
  issues.sort((a, b) => rank[a.tone] - rank[b.tone]);
  return issues[0] ?? { kind: "none", tone: "good" };
}

function companiesLight(f: Facts): { word: Bi; tone: Tone } {
  // Judged on the money in companies we grade: an ungraded share is not a weak
  // one (2026-11-05 — it used to pull "strong" down and read as "weak").
  if (f.gradedPct < 50) return { word: B("Can't tell yet", "এখনো বলা যায় না"), tone: "neutral" };
  const good = (f.goodPct / f.gradedPct) * 100;
  const weak = (f.weakPct / f.gradedPct) * 100;
  if (weak > 30 || good < 40) return { word: B("Weak", "দুর্বল"), tone: "bad" };
  if (good >= 80 && weak === 0) return { word: B("Strong", "শক্তিশালী"), tone: "good" };
  if (good >= 60 && weak <= 10) return { word: B("Mostly strong", "বেশিরভাগ শক্তিশালী"), tone: "good" };
  return { word: B("Mixed", "মিশ্র"), tone: "fair" };
}

function spreadLight(f: Facts, s: SpreadIssue): { word: Bi; tone: Tone } {
  switch (s.kind) {
    case "stock":
      return { word: B(`Leans on ${f.top!.code}`, `${f.top!.code}-এর ওপর বেশি ভর`), tone: s.tone };
    case "sector": {
      const w = sectorWord(f.topSector!.name);
      return { word: B(`Leans on ${w.en}`, `${w.bn}-এর ওপর বেশি ভর`), tone: s.tone };
    }
    case "finance":
      return { word: B("Leans on banks", "ব্যাংকের ওপর বেশি ভর"), tone: s.tone };
    case "few":
      return { word: B("Too few shares", "শেয়ার খুব কম"), tone: s.tone };
    default:
      return { word: B("Well spread", "ভালোভাবে ছড়ানো"), tone: "good" };
  }
}

/** Today's prices (2026-11-05, was "prices you paid"): the stock page's
 *  valuation score weighted by money, read on its own bands (7 low, 4 fair). */
function pricesLight(a: PortfolioAnalysis): { word: Bi; tone: Tone } {
  if (a.breakdown.judgeablePct < 30) return { word: B("Can't tell yet", "এখনো বলা যায় না"), tone: "neutral" };
  const p = a.subScores.price;
  if (p >= 7) return { word: B("Low", "কম"), tone: "good" };
  if (p >= 4) return { word: B("Fair", "ন্যায্য"), tone: "good" };
  if (p >= 3) return { word: B("A bit high", "একটু বেশি"), tone: "fair" };
  return { word: B("High", "বেশি"), tone: "bad" };
}

function watchLight(f: Facts): { word: Bi; tone: Tone; count: number } {
  const codes = new Set([...f.sells.map((h) => h.code), ...f.serious.map((s) => s.h.code)]);
  const n = codes.size;
  if (n === 0) return { word: B("Nothing urgent", "জরুরি কিছু নেই"), tone: "good", count: 0 };
  const bad = f.sellPct > 10 || f.seriousPct > 10;
  return { word: B(`${n} to decide on`, `${n}টি নিয়ে সিদ্ধান্ত`), tone: bad ? "bad" : "fair", count: n };
}

// ── Builder ────────────────────────────────────────────────────────────────

export function buildPortfolioReport(inp: ReportInput): PortfolioReport {
  const a = inp.analysis;
  const f = facts(inp);
  const issue = spreadIssue(f);

  const cl = companiesLight(f);
  const sl = spreadLight(f, issue);
  const pl = pricesLight(a);
  const wl = watchLight(f);

  const companies = companiesChapter(inp, f, cl);
  const spread = spreadChapter(inp, f, issue, sl);
  const prices = pricesChapter(inp, f, pl);
  const lf = lossFacts(inp, f);
  const loss = lf ? lossChapter(inp, f, lf) : null;
  const watch = watchChapter(inp, f, wl);
  const chapters = [companies, spread, prices, ...(loss ? [loss] : []), watch];

  const lights: PfLight[] = [
    { key: "companies", label: B("Your companies", "আপনার কোম্পানি"), ...cl, href: "#ch-companies" },
    { key: "spread", label: B("Your spread", "টাকার বণ্টন"), ...sl, href: "#ch-spread" },
    { key: "prices", label: B("Prices today", "আজকের দাম"), ...pl, href: "#ch-prices" },
    { key: "watch", label: B("To watch", "নজর রাখুন"), word: wl.word, tone: wl.tone, href: "#ch-watch" },
  ];

  const answer = buildAnswer(inp, f, lights, issue);
  const plan = buildPlan(inp);
  const findings = buildFindings(inp, f, lights, issue, plan, lf);
  // The chapters above (loss chapter and Sell row included) still feed the
  // free answer a month; the page shows the four areas (2026-11-11): the loss
  // chapter became "Your way back", the Sell row "Each of your shares".
  const promo = buildPromo(inp, f, issue, chapters, findings, lights);
  const areas = [companies, spread, prices, { ...watch, rows: watch.rows.filter((r) => r.key !== "sell") }];

  const path = buildPathView(inp, f);
  const wayBack = lf ? buildWayBack(inp, f, lf, path) : null;
  const each = buildEach(inp, f, lf, path);
  const start: PortfolioReport["start"] = path
    ? { title: B(`Step 1: ${path.steps[0].title.en}`, `ধাপ 1: ${path.steps[0].title.bn}`), href: "#pf-path" }
    : answer.first
      ? { title: answer.first.title, href: "#pf-each" }
      : null;
  const answers = areas.reduce((acc, c) => acc + c.rows.length, 0);
  const outline: PfOutline = {
    grade: a.grade,
    toLook: lights.filter((l) => l.tone === "bad" || l.tone === "fair").length,
    wayBack: wayBack
      ? { down: wayBack.down, n: wayBack.n, groups: wayBack.groups.map((g) => ({ kind: g.kind, count: g.items.length, down: g.down })) }
      : null,
    path: path ? { grades: [path.from, ...path.steps.map((s) => s.to)] } : null,
    act: each.act.length,
    n: f.n,
    answers,
    warnings: f.serious.length,
    dates: datesAhead(inp, f),
    flagged: promo.missed.total,
  };
  // The verdict, the plan's parts and the areas' questions.
  const answered = answers + 1 + (wayBack ? 1 : 0) + (path ? 1 : 0) + 1;

  return { answer, start, areas, wayBack, path, each, plan, findings, outline, promo, answered };
}

function buildAnswer(inp: ReportInput, f: Facts, lights: PfLight[], issue: SpreadIssue): PfAnswer {
  const a = inp.analysis;
  const bad = lights.filter((l) => l.tone === "bad");
  const fair = lights.filter((l) => l.tone === "fair");
  let word: Bi;
  let tone: Tone;
  if (bad.length >= 2 || f.seriousPct > 10) {
    word = B("At risk", "ঝুঁকিতে");
    tone = "bad";
  } else if (bad.length === 1 || a.grade === "D" || a.grade === "F") {
    word = B("Needs work", "কাজ দরকার");
    tone = "bad";
  } else if (fair.length > 0 || a.grade === "C") {
    word = B("Mostly fine", "মোটামুটি ঠিক আছে");
    tone = "fair";
  } else {
    word = B("In good shape", "ভালো অবস্থায়");
    tone = "good";
  }
  const blocker = tone === "good" ? null : (bad[0] ?? fair[0])?.key ?? null;

  const decide = new Set([...f.sells.map((h) => h.code), ...f.serious.map((s) => s.h.code)]).size;
  // The free line: what the light words say, worst first, in two sentences at most.
  const say: Record<LightKey, Bi | null> = {
    companies:
      lights[0].tone === "good"
        ? B("Your money is mostly in strong companies.", "আপনার টাকার বেশিরভাগ শক্তিশালী কোম্পানিতে।")
        : lights[0].tone === "neutral"
          ? B("We can't grade most of your companies yet.", "আপনার বেশিরভাগ কোম্পানির গ্রেড এখনো দেওয়া যায়নি।")
        : lights[0].tone === "fair"
          ? B("Your companies are a mix of strong and weak.", "আপনার কোম্পানিগুলো শক্তিশালী আর দুর্বলের মিশেল।")
          : B("Too much of your money is in weak companies.", "আপনার টাকার অনেকটা দুর্বল কোম্পানিতে।"),
    spread:
      issue.kind === "stock"
        ? B(`Too much rides on ${f.top!.code}.`, `${f.top!.code}-এর ওপর বেশি টাকা নির্ভর করছে।`)
        : issue.kind === "sector"
          ? B(`Too much sits in ${sectorWord(f.topSector!.name).en}.`, `${sectorWord(f.topSector!.name).bn} সেক্টরে বেশি টাকা।`)
          : issue.kind === "finance"
            ? B("More than half sits in banks and finance.", "অর্ধেকের বেশি টাকা ব্যাংক ও আর্থিক প্রতিষ্ঠানে।")
            : issue.kind === "few"
              ? B(`It rests on only ${f.n} share${f.n === 1 ? "" : "s"}.`, `মাত্র ${f.n}টি শেয়ারের ওপর নির্ভর করছে।`)
              : B("It is spread well.", "টাকা ভালোভাবে ছড়ানো।"),
    prices:
      lights[2].tone === "good"
        ? B("Today's prices are fair for what they earn.", "তাদের আয়ের তুলনায় আজকের দাম ন্যায্য।")
        : lights[2].tone === "neutral"
          ? null
          : lights[2].tone === "fair"
            ? B("Some of your shares cost a lot today for what they earn.", "আপনার কিছু শেয়ারের দাম আজ তাদের আয়ের তুলনায় বেশি।")
            : B("Most of your money is in shares that cost a lot today.", "আপনার বেশিরভাগ টাকা এমন শেয়ারে, যাদের দাম আজ বেশি।"),
    watch:
      lights[3].tone === "good"
        ? null
        : decide === 1
          ? B("One share needs a decision.", "একটি শেয়ার নিয়ে সিদ্ধান্ত নিতে হবে।")
          : B(`${decide} shares need a decision.`, `${decide}টি শেয়ার নিয়ে সিদ্ধান্ত নিতে হবে।`),
  };
  let line: Bi;
  if (tone === "good") {
    line = B(
      "Strong companies, spread well and at fair prices today. Nothing needs you today.",
      "শক্তিশালী কোম্পানি, ভালোভাবে ছড়ানো, আজকের দামও ন্যায্য। আজ আপনার কিছু করার নেই।",
    );
  } else {
    const order = [...lights].sort((x, y) => ({ bad: 0, fair: 1, neutral: 2, good: 3 })[x.tone] - ({ bad: 0, fair: 1, neutral: 2, good: 3 })[y.tone]);
    const worst = order.filter((l) => l.tone !== "good").slice(0, 2).map((l) => say[l.key]).filter(Boolean) as Bi[];
    const good = order.find((l) => l.tone === "good");
    const lead = good ? say[good.key] : null;
    line = join([...(lead ? [lead] : []), ...worst].slice(0, 2));
  }

  const firstEn = inp.next.en.first;
  const firstBn = inp.next.bn.first;
  const first =
    firstEn.kind === "none"
      ? null
      : { title: B(firstEn.title, firstBn.title), line: B(firstEn.line, firstBn.line), amount: firstEn.amount };

  return { word, tone, line, grade: a.grade, blocker, lights, first };
}

// ── Chapter 1 · companies ──────────────────────────────────────────────────

function companiesChapter(inp: ReportInput, f: Facts, light: { word: Bi; tone: Tone }): PfChapter {
  const hs = f.hs;
  const goodCount = hs.filter((h) => GOOD_TIERS.has(h.tierKey)).length;
  const w = (k: string) => hs.filter((h) => h.tierKey === k).reduce((s, h) => s + h.weightPct, 0);

  // How strong are they? (the free sample)
  const weakNames = f.weak;
  const strength: PfRow = {
    key: "strength",
    title: B("How strong are they?", "কোম্পানিগুলো কতটা শক্তিশালী?"),
    word: light.word,
    tone: light.tone,
    headline:
      f.weakPct === 0 && f.n === 1
        ? f.goodPct >= 60
          ? B(`${nameOf(f.hs[0])} is a strong company.`, `${nameOf(f.hs[0])} একটি শক্তিশালী কোম্পানি।`)
          : B(`${nameOf(f.hs[0])} is not weak, but it is only average.`, `${nameOf(f.hs[0])} দুর্বল নয়, তবে মাঝারি মানের।`)
        : f.weakPct === 0
        ? f.goodPct >= 60
          ? B("Most of your money is in strong companies, and none of them is weak.", "আপনার টাকার বেশিরভাগ শক্তিশালী কোম্পানিতে, আর কোনোটিই দুর্বল নয়।")
          : B("None of your companies is weak, but many are only average.", "আপনার কোনো কোম্পানি দুর্বল নয়, তবে অনেকগুলো মাঝারি মানের।")
        : weakNames.length === 1
          ? B(
              `${f.goodPct >= 60 ? "Most of your money is in strong companies. " : ""}Only ${nameOf(weakNames[0])} is weak, and it holds ${takaGroup(valueOf(weakNames[0]))}.`,
              `${f.goodPct >= 60 ? "আপনার টাকার বেশিরভাগ শক্তিশালী কোম্পানিতে। " : ""}শুধু ${nameOf(weakNames[0])} দুর্বল, আর এতে আছে ${takaGroup(valueOf(weakNames[0]))}।`,
            )
          : B(
              `${weakNames.length} of your companies are weak: ${names(weakNames).en}. Together they hold ${pct(f.weakPct)} of your money.`,
              `আপনার ${weakNames.length}টি কোম্পানি দুর্বল: ${names(weakNames).bn}। এগুলোতে আপনার টাকার ${pct(f.weakPct)}।`,
            ),
    meaning: [
      B(
        "Strong companies tend to recover faster after a bad month, and they are the ones that keep paying dividends.",
        "শক্তিশালী কোম্পানি খারাপ সময়ের পর দ্রুত ঘুরে দাঁড়ায়, আর এরাই নিয়মিত ডিভিডেন্ড দেয়।",
      ),
    ],
    watch: weakNames.length
      ? B(`Watch ${nameOf(weakNames[0])}: a weak company can stay cheap for years.`, `${nameOf(weakNames[0])}-এ নজর রাখুন: দুর্বল কোম্পানির দাম বছরের পর বছর কম থাকতে পারে।`)
      : null,
    picture: {
      kind: "split",
      label: `Money by group: strong all round ${pct(w("excellent"))}, mostly strong ${pct(w("good"))}, mixed ${pct(w("average"))}, mostly weak ${pct(w("weak"))}`,
      parts: [
        { key: "ex", value: w("excellent"), text: B(`${GRADE_PAIR.excellent.en} ${pct(w("excellent"))}`, `${GRADE_PAIR.excellent.bn} ${pct(w("excellent"))}`), swatch: "good" as Swatch },
        { key: "gd", value: w("good"), text: B(`${GRADE_PAIR.good.en} ${pct(w("good"))}`, `${GRADE_PAIR.good.bn} ${pct(w("good"))}`), swatch: "info" as Swatch },
        { key: "av", value: w("average"), text: B(`${GRADE_PAIR.average.en} ${pct(w("average"))}`, `${GRADE_PAIR.average.bn} ${pct(w("average"))}`), swatch: "quiet" as Swatch },
        { key: "wk", value: w("weak"), text: B(`${GRADE_PAIR.weak.en} ${pct(w("weak"))}`, `${GRADE_PAIR.weak.bn} ${pct(w("weak"))}`), swatch: "bad" as Swatch },
        { key: "un", value: w("unscored"), text: B(`Not graded ${pct(w("unscored"))}`, `গ্রেড নেই ${pct(w("unscored"))}`), swatch: "navy" as Swatch },
      ].filter((p) => p.value > 0.5),
    },
    figures: [...hs]
      .sort((x, y) => (y.score ?? -1) - (x.score ?? -1))
      .map((h) => ({
        key: h.code,
        code: h.code,
        label: same(nameOf(h)),
        value: GRADE_PAIR[h.tierKey],
        tone: TIER_TONE[h.tierKey],
      })),
    points: [],
  };

  // Is their profit growing?
  const trend = hs.map((h) => {
    const g = inp.glance.get(h.code.toUpperCase());
    const v = g?.profit_change_pct ?? inp.priceMap.get(h.code)?.eps_yoy_pct ?? null;
    return { h, v };
  });
  const known = trend.filter((t) => t.v != null) as { h: HoldingInsight; v: number }[];
  const up = known.filter((t) => t.v > 5);
  const down = known.filter((t) => t.v < -5);
  const flat = known.length - up.length - down.length;
  const profitTone: Tone = !known.length ? "neutral" : up.length > known.length / 2 ? "good" : down.length > known.length / 2 ? "bad" : "fair";
  const profit: PfRow = {
    key: "profit",
    title: B("Is their profit growing?", "তাদের মুনাফা কি বাড়ছে?"),
    word: !known.length
      ? B("No data yet", "এখনো তথ্য নেই")
      : profitTone === "good"
        ? B("Mostly", "বেশিরভাগের")
        : profitTone === "bad"
          ? B("Mostly falling", "বেশিরভাগের কমছে")
          : B("Mixed", "মিশ্র"),
    tone: profitTone,
    headline: !known.length
      ? null
      : join([
          known.length === 1
            ? up.length
              ? B("It made more profit this year than last.", "এ বছর গত বছরের চেয়ে বেশি মুনাফা করেছে।")
              : down.length
                ? B("It made less profit this year than last.", "এ বছর গত বছরের চেয়ে কম মুনাফা করেছে।")
                : B("Its profit is about the same as last year.", "এর মুনাফা গত বছরের প্রায় সমান।")
            : B(
                `${up.length} of your ${known.length} companies made more profit this year than last.`,
                `আপনার ${known.length}টি কোম্পানির ${up.length}টি গত বছরের চেয়ে এ বছর বেশি মুনাফা করেছে।`,
              ),
          known.length === 1
            ? B("", "")
            : down.length
            ? B(`${names(down.map((t) => t.h)).en} made less.`, `${names(down.map((t) => t.h)).bn} কম করেছে।`)
            : B("None made noticeably less.", "কোনোটিরই মুনাফা চোখে পড়ার মতো কমেনি।"),
        ]),
    meaning: [
      B(
        "Over the years a share's price follows its profit. Growing profit is what lets a price, and a dividend, rise.",
        "বছরের পর বছর শেয়ারের দাম মুনাফার পথ ধরে চলে। মুনাফা বাড়লেই দাম আর ডিভিডেন্ড বাড়ার সুযোগ থাকে।",
      ),
    ],
    watch: down.length
      ? B(`If ${nameOf(down[0].h)}'s next results are weaker again, its grade can fall.`, `${nameOf(down[0].h)}-এর পরের ফলও দুর্বল হলে এর গ্রেড কমতে পারে।`)
      : null,
    picture: known.length
      ? {
          kind: "bars",
          label: `${up.length} profit up, ${flat} about the same, ${down.length} profit down`,
          rows: [
            { key: "up", name: B("Profit up", "মুনাফা বেড়েছে"), value: up.length, text: String(up.length), me: true },
            { key: "flat", name: B("About the same", "প্রায় একই"), value: flat, text: String(flat) },
            { key: "down", name: B("Profit down", "মুনাফা কমেছে"), value: down.length, text: String(down.length) },
          ],
        }
      : null,
    figures: known
      .sort((x, y) => y.v - x.v)
      .map((t) => ({
        key: t.h.code,
        code: t.h.code,
        label: same(nameOf(t.h)),
        value: t.v > 5 ? B("Up", "বেড়েছে") : t.v < -5 ? B("Down", "কমেছে") : B("About the same", "প্রায় একই"),
        tone: (t.v > 5 ? "good" : t.v < -5 ? "bad" : "neutral") as Tone,
      })),
    points: [],
  };

  // Will they keep paying you?
  const safe = hs
    .map((h) => ({ h, s: inp.glance.get(h.code.toUpperCase())?.safety ?? null }))
    .filter((x) => x.s) as { h: HoldingInsight; s: NonNullable<GlanceRow["safety"]> }[];
  const risky = safe.filter((x) => x.s.level === "risk");
  const check = safe.filter((x) => x.s.level === "watch");
  const steady = safe.filter((x) => x.s.level === "safe");
  const cash = inp.pro.income.yearlyCash;
  const payTone: Tone = !safe.length ? (cash ? "good" : "neutral") : risky.length ? "bad" : check.length > steady.length ? "fair" : "good";
  const worry = risky[0] ?? check[0] ?? null;
  const pay: PfRow = {
    key: "pay",
    title: B("Will they keep paying you?", "তারা কি ডিভিডেন্ড দিয়ে যাবে?"),
    word: !safe.length
      ? cash
        ? B("Pays you cash", "নগদ দেয়")
        : B("No dividends yet", "ডিভিডেন্ড নেই")
      : risky.length
        ? B(`${risky.length} at risk`, `${risky.length}টি ঝুঁকিতে`)
        : check.length
          ? B(`${check.length} worth a check`, `${check.length}টি যাচাই করুন`)
          : B("Looks steady", "স্থির মনে হচ্ছে"),
    tone: payTone,
    headline: !safe.length
      ? cash
        ? f.n === 1
          ? B(`At today's price it pays you about ${takaGroup(cash)} a year in cash.`, `আজকের দামে এটি বছরে আপনাকে প্রায় ${takaGroup(cash)} নগদ দেয়।`)
          : B(`At today's prices they pay you about ${takaGroup(cash)} a year in cash.`, `আজকের দামে তারা বছরে আপনাকে প্রায় ${takaGroup(cash)} নগদ দেয়।`)
        : B("None of your companies pays a regular cash dividend.", "আপনার কোনো কোম্পানি নিয়মিত নগদ ডিভিডেন্ড দেয় না।")
      : join([
          B(
            `${steady.length} of your companies look able to keep paying.`,
            `আপনার ${steady.length}টি কোম্পানি ডিভিডেন্ড দিয়ে যেতে পারবে বলে মনে হচ্ছে।`,
          ),
          worry
            ? B(`${nameOf(worry.h)} is ${worry.s.level === "risk" ? "at risk" : "worth a check"}: ${lowerFirst(worry.s.line_en)}`, `${nameOf(worry.h)} ${worry.s.level === "risk" ? "ঝুঁকিতে" : "যাচাই করার মতো"}: ${worry.s.line_bn}`)
            : B("None looks at risk.", "কোনোটিই ঝুঁকিতে মনে হচ্ছে না।"),
        ]),
    meaning: cash && safe.length
      ? [B(`At today's prices they pay you about ${takaGroup(cash)} a year in cash.`, `আজকের দামে তারা বছরে আপনাকে প্রায় ${takaGroup(cash)} নগদ দেয়।`)]
      : [],
    watch: null,
    picture: safe.length
      ? {
          kind: "split",
          label: `${steady.length} steady, ${check.length} worth a check, ${risky.length} at risk`,
          parts: [
            { key: "ok", value: steady.length, text: B(`Looks steady ${steady.length}`, `স্থির ${steady.length}`), swatch: "good" as Swatch },
            { key: "ck", value: check.length, text: B(`Worth a check ${check.length}`, `যাচাই করুন ${check.length}`), swatch: "fair" as Swatch },
            { key: "rk", value: risky.length, text: B(`At risk ${risky.length}`, `ঝুঁকিতে ${risky.length}`), swatch: "bad" as Swatch },
          ]
            .filter((p) => p.value > 0)
            .map((p) => ({ ...p, value: (p.value / safe.length) * 100 })),
        }
      : null,
    figures: safe.map((x) => ({
      key: x.h.code,
      code: x.h.code,
      label: same(nameOf(x.h)),
      value: B(x.s.word_en, x.s.word_bn),
      tone: (x.s.level === "safe" ? "good" : x.s.level === "watch" ? "fair" : "bad") as Tone,
    })),
    points: [],
  };

  const rows = [strength, profit, pay];
  return {
    key: "companies",
    id: "ch-companies",
    title: B("Are your companies good?", "আপনার কোম্পানিগুলো কি ভালো?"),
    head: {
      word: light.word,
      tone: light.tone,
      line:
        f.n === 1
          ? goodCount
            ? B("Mostly strong or better on our checks", "আমাদের যাচাইয়ে বেশিরভাগ দিকে শক্তিশালী বা তার বেশি")
            : B("Not mostly strong yet on our checks", "আমাদের যাচাইয়ে এখনো বেশিরভাগ দিকে শক্তিশালী নয়")
          : B(`${goodCount} of ${f.n} are mostly strong or better`, `${f.n}টির মধ্যে ${goodCount}টি বেশিরভাগ দিকে শক্তিশালী বা তার বেশি`),
    },
    rows,
  };
}

// The grade names (lib/constants TIER_LABELS, the ranking's groups).
const GRADE_PAIR: Record<string, Bi> = {
  excellent: B(TIER_LABELS.excellent, TIER_PILL_BN.excellent),
  good: B(TIER_LABELS.good, TIER_PILL_BN.good),
  average: B(TIER_LABELS.average, TIER_PILL_BN.average),
  weak: B(TIER_LABELS.weak, TIER_PILL_BN.weak),
  unscored: B("Not graded", "গ্রেড নেই"),
};
const TIER_TONE: Record<string, Tone> = { excellent: "good", good: "good", average: "neutral", weak: "bad", unscored: "neutral" };

const lowerFirst = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);

// ── Chapter 2 · spread ─────────────────────────────────────────────────────

function spreadChapter(inp: ReportInput, f: Facts, issue: SpreadIssue, light: { word: Bi; tone: Tone }): PfChapter {
  const byWeight = [...f.hs].sort((a, b) => b.weightPct - a.weightPct);
  const top = f.top;
  const oneTone: Tone = !top || f.n < 2 ? "neutral" : top.weightPct > ONE_SHARE_BAD_PCT ? "bad" : top.weightPct > ONE_SHARE_FAIR_PCT ? "fair" : "good";
  const one: PfRow = {
    key: "one",
    title: B("How much rides on one share?", "একটি শেয়ারের ওপর কতটা নির্ভর?"),
    word: oneTone === "good" ? B("Fine", "ঠিক আছে") : oneTone === "neutral" ? B("Only one share", "মাত্র একটি শেয়ার") : B("Too much", "বেশি"),
    tone: oneTone,
    headline: top
      ? oneTone === "good"
        ? B(
            `Your biggest share, ${nameOf(top)}, holds ${pct(top.weightPct)} of your money. Under a quarter is a comfortable size.`,
            `আপনার সবচেয়ে বড় শেয়ার ${nameOf(top)}, এতে টাকার ${pct(top.weightPct)}। এক-চতুর্থাংশের কম হলে তা নিরাপদ।`,
          )
        : B(
            `${nameOf(top)} holds ${pct(top.weightPct)} of your money. One bad result from this one company would hurt the whole portfolio.`,
            `${nameOf(top)}-এ আপনার টাকার ${pct(top.weightPct)}। এই এক কোম্পানির একটি খারাপ ফল পুরো পোর্টফোলিওতে লাগবে।`,
          )
      : null,
    meaning: [B("Keeping each share under a quarter of your money means no single company can sink you.", "প্রতিটি শেয়ার টাকার এক-চতুর্থাংশের নিচে রাখলে কোনো এক কোম্পানি একা বড় ক্ষতি করতে পারে না।")],
    watch:
      top && top.weightPct > ONE_SHARE_FAIR_PCT
        ? top.signal.signal === "trim"
          ? B(
              `Its price is high now: bringing ${top.code} down to a quarter frees about ${takaGroup(((top.weightPct - ONE_SHARE_FAIR_PCT) / 100) * f.total)}.`,
              `এর দাম এখন বেশি: ${top.code} এক-চতুর্থাংশে নামালে প্রায় ${takaGroup(((top.weightPct - ONE_SHARE_FAIR_PCT) / 100) * f.total)} খালি হয়।`,
            )
          : B(
              `Putting your next buys into other shares brings ${top.code} down toward a quarter.`,
              `পরের কেনাগুলো অন্য শেয়ারে করলে ${top.code}-এর ভাগ এক-চতুর্থাংশের দিকে নামে।`,
            )
        : null,
    picture: {
      kind: "bars",
      label: byWeight.slice(0, 3).map((h) => `${h.code} ${pct(h.weightPct)}`).join(", "),
      rows: byWeight.slice(0, 3).map((h, i) => ({ key: h.code, name: same(nameOf(h)), value: h.weightPct, text: pct(h.weightPct), me: i === 0 })),
    },
    figures: byWeight.map((h) => ({ key: h.code, code: h.code, label: same(nameOf(h)), value: same(`${pct(h.weightPct)} · ${takaGroup(valueOf(h))}`) })),
    points: [],
  };

  const secs = inp.analysis.sectorSpread;
  const ts = secs[0];
  const secTone: Tone = !ts || secs.length < 2 ? (f.n > 1 ? "bad" : "neutral") : ts.weightPct > SECTOR_BAD_PCT ? "bad" : ts.weightPct > SECTOR_FAIR_PCT || issue.kind === "finance" ? "fair" : "good";
  const move = ts && ts.weightPct > SECTOR_FAIR_PCT ? ((ts.weightPct - SECTOR_FAIR_PCT) / 100) * f.total : f.finPct > FIN_HEAVY_PCT ? ((f.finPct - FIN_HEAVY_PCT) / 100) * f.total : null;
  const sector: PfRow = {
    key: "sector",
    title: B("Is one business too big?", "একটি ব্যবসায় কি বেশি টাকা?"),
    word: !ts
      ? null
      : secTone === "good"
        ? B("No", "না")
        : issue.kind === "finance"
          ? B("Yes, banks", "হ্যাঁ, ব্যাংক")
          : B(`Yes, ${sectorWord(ts.name).en}`, `হ্যাঁ, ${sectorWord(ts.name).bn}`),
    tone: secTone,
    headline: !ts
      ? null
      : secs.length < 2
        ? B(`All your money is in ${sectorWord(ts.name).en}.`, `আপনার সব টাকা ${sectorWord(ts.name).bn} সেক্টরে।`)
        : issue.kind === "finance"
          ? B(
              `Banks and finance hold ${takaGroup((f.finPct / 100) * f.total)}, more than half your money.${move ? ` Moving about ${takaGroup(move)} brings them under half.` : ""}`,
              `ব্যাংক ও আর্থিক প্রতিষ্ঠানে আছে ${takaGroup((f.finPct / 100) * f.total)}, আপনার অর্ধেকের বেশি টাকা।${move ? ` প্রায় ${takaGroup(move)} সরালে অর্ধেকের নিচে আসে।` : ""}`,
            )
          : ts.weightPct > SECTOR_FAIR_PCT
            ? B(
                `Your ${sectorWord(ts.name).en} shares hold ${takaGroup((ts.weightPct / 100) * f.total)}, ${pct(ts.weightPct)} of your money.${move ? ` Moving about ${takaGroup(move)} brings it under 40%.` : ""}`,
                `${sectorWord(ts.name).bn} সেক্টরে আছে ${takaGroup((ts.weightPct / 100) * f.total)}, আপনার টাকার ${pct(ts.weightPct)}।${move ? ` প্রায় ${takaGroup(move)} সরালে 40%-এর নিচে আসে।` : ""}`,
              )
            : B(
                `Your money sits in ${secs.length} different businesses. The biggest, ${sectorWord(ts.name).en}, holds ${pct(ts.weightPct)}.`,
                `আপনার টাকা ${secs.length}টি আলাদা ব্যবসায়। সবচেয়ে বড়টি ${sectorWord(ts.name).bn}, এতে ${pct(ts.weightPct)}।`,
              ),
    meaning: [
      B(
        "Companies in one business rise and fall together: new rules or a bad year for that business hit all of them at once. Banks and finance companies move together too.",
        "একই ব্যবসার কোম্পানিগুলো একসঙ্গে ওঠে-নামে: নতুন নিয়ম বা সেই ব্যবসার খারাপ বছর সবগুলোকে একসঙ্গে আঘাত করে। ব্যাংক আর আর্থিক প্রতিষ্ঠানও একসঙ্গে চলে।",
      ),
    ],
    watch: null,
    picture: ts
      ? {
          kind: "bars",
          label: secs.slice(0, 4).map((s) => `${s.name} ${pct(s.weightPct)}`).join(", "),
          rows: secs.slice(0, 4).map((s, i) => ({ key: s.name, name: sectorWord(s.name), value: s.weightPct, text: pct(s.weightPct), me: i === 0 && secTone !== "good" })),
        }
      : null,
    figures: secs.map((s) => ({ key: s.name, label: sectorWord(s.name), value: same(`${pct(s.weightPct)} · ${s.count}`) })),
    points: [],
  };

  const eff = Math.max(1, Math.round(inp.analysis.effectiveStocks));
  const effTone: Tone = f.n < 2 ? "neutral" : eff >= MIN_SHARES ? "good" : eff >= 3 ? "fair" : "bad";
  const carry: PfRow = {
    key: "carry",
    title: B("How many shares really carry your money?", "আসলে কয়টি শেয়ার আপনার টাকা বহন করছে?"),
    word: f.n < 2 ? null : B(`Like ${Math.min(eff, f.n)}`, `${Math.min(eff, f.n)}টির মতো`),
    tone: effTone,
    headline:
      f.n < 2
        ? null
        : eff >= f.n - 0.5
          ? B(`Your ${f.n} shares each carry a fair part of your money.`, `আপনার ${f.n}টি শেয়ারের প্রতিটিতে টাকার একটি ন্যায্য অংশ আছে।`)
          : B(
              `Your ${f.n} shares count like ${eff}, because the money isn't split evenly between them.`,
              `আপনার ${f.n}টি শেয়ার ${eff}টির মতো কাজ করে, কারণ টাকা সমানভাবে ভাগ হয়নি।`,
            ),
    meaning: [B("Five or more shares that each carry a fair part is a safer spread.", "5টি বা বেশি শেয়ারে টাকা মোটামুটি সমান ভাগ হলে ঝুঁকি কম।")],
    watch: null,
    picture:
      f.n < 2
        ? null
        : {
            kind: "bars",
            label: `${f.n} shares, count like ${eff}`,
            rows: [
              { key: "own", name: B("Shares you own", "আপনার শেয়ার"), value: f.n, text: String(f.n) },
              { key: "count", name: B("They count like", "কাজ করে যেন"), value: Math.min(eff, f.n), text: String(Math.min(eff, f.n)), me: true },
            ],
          },
    figures: [],
    points: [],
  };

  const rows = [one, sector, carry];
  return {
    key: "spread",
    id: "ch-spread",
    title: B("Is your money spread well?", "আপনার টাকা কি ভালোভাবে ছড়ানো?"),
    head: {
      word: light.word,
      tone: light.tone,
      line:
        issue.kind === "finance"
          ? B("Banks and finance: more than half", "ব্যাংক ও আর্থিক প্রতিষ্ঠান: অর্ধেকের বেশি")
          : B(`${shares(f.n).en} in ${secs.length} business${secs.length === 1 ? "" : "es"}`, `${secs.length}টি ব্যবসায় ${f.n}টি শেয়ার`),
    },
    rows,
  };
}

// ── Chapter 3 · prices ─────────────────────────────────────────────────────

function pricesChapter(inp: ReportInput, f: Facts, light: { word: Bi; tone: Tone }): PfChapter {
  // What does each share cost today? The stock page's own price word on each
  // share (its valuation score, 7 low / 4 fair) — the grade's third part since
  // 2026-11-05, so the grade is the same whatever the reader paid.
  type NowWord = "low" | "fair" | "high" | "none";
  const nowWord = (h: HoldingInsight): NowWord => {
    const eps = inp.priceMap.get(h.code)?.eps ?? null;
    if (eps == null || eps <= 0 || h.valuationNow === "unknown") return "none";
    return h.valuationNow === "cheap" ? "low" : h.valuationNow === "expensive" ? "high" : "fair";
  };
  const NOW_WORD: Record<NowWord, Bi> = {
    low: B("Low price", "কম দাম"),
    fair: B("Fair price", "ন্যায্য দাম"),
    high: B("High price", "বেশি দাম"),
    none: B("Can't judge", "বিচার করা যায় না"),
  };
  const NOW_TONE: Record<NowWord, Tone> = { low: "good", fair: "neutral", high: "fair", none: "neutral" };
  const now = f.hs.map((h) => ({ h, w: nowWord(h) })).sort((a, b) => b.h.weightPct - a.h.weightPct);
  const nowOf = (w: NowWord) => now.filter((x) => x.w === w);
  const nowPct = (w: NowWord) => nowOf(w).reduce((a, x) => a + x.h.weightPct, 0);
  const judgedNow = now.filter((x) => x.w !== "none");
  const dear = nowOf("high");
  const lowOrFair = nowOf("low").length + nowOf("fair").length;
  const todayRow: PfRow = {
    key: "today",
    title: B("What does each share cost today?", "প্রতিটি শেয়ারের দাম আজ কেমন?"),
    word: light.word,
    tone: light.tone,
    headline: !judgedNow.length
      ? null
      : join([
          B(
            `${lowOrFair} of your ${judgedNow.length} shares ${judgedNow.length === 1 ? "is" : "are"} at a low or fair price today, for what ${judgedNow.length === 1 ? "it earns" : "they earn"}.`,
            `আপনার ${judgedNow.length}টি শেয়ারের ${lowOrFair}টির দাম আজ আয়ের তুলনায় কম বা ন্যায্য।`,
          ),
          dear.length
            ? B(
                `${names(dear.map((x) => x.h)).en} ${dear.length === 1 ? "costs" : "cost"} a lot.`,
                `${names(dear.map((x) => x.h)).bn}-এর দাম বেশি।`,
              )
            : B("", ""),
        ]),
    meaning: [
      B(
        "This is the same price check as on each stock page: the price against the company's profit and what it owns, next to its own usual price and similar companies.",
        "প্রতিটি শেয়ারের পেজের মতো একই যাচাই: কোম্পানির মুনাফা আর সম্পদের তুলনায় দাম, এর নিজের স্বাভাবিক দাম আর একই ধরনের কোম্পানির পাশে।",
      ),
      B(
        "It is the third part of your grade, so two people holding the same shares get the same grade, whatever each of them paid.",
        "এটি আপনার গ্রেডের তৃতীয় অংশ, তাই একই শেয়ার যার কাছেই থাকুক, কে কত দামে কিনেছেন তাতে গ্রেড বদলায় না।",
      ),
    ],
    watch: dear.length
      ? B(
          `Buying more of ${nameOf(dear[0].h)} today would add to a share that already costs a lot.`,
          `আজ ${nameOf(dear[0].h)} আরও কিনলে এমন শেয়ারে টাকা বাড়বে, যার দাম এরই মধ্যে বেশি।`,
        )
      : null,
    picture: judgedNow.length
      ? {
          kind: "split",
          label: `Money by today's price: low ${pct(nowPct("low"))}, fair ${pct(nowPct("fair"))}, high ${pct(nowPct("high"))}, can't judge ${pct(nowPct("none"))}`,
          parts: [
            { key: "low", value: nowPct("low"), text: B(`Low ${pct(nowPct("low"))}`, `কম ${pct(nowPct("low"))}`), swatch: "good" as Swatch },
            { key: "fair", value: nowPct("fair"), text: B(`Fair ${pct(nowPct("fair"))}`, `ন্যায্য ${pct(nowPct("fair"))}`), swatch: "quiet" as Swatch },
            { key: "high", value: nowPct("high"), text: B(`High ${pct(nowPct("high"))}`, `বেশি ${pct(nowPct("high"))}`), swatch: "fair" as Swatch },
            { key: "none", value: nowPct("none"), text: B(`Can't judge ${pct(nowPct("none"))}`, `বিচার করা যায় না ${pct(nowPct("none"))}`), swatch: "navy" as Swatch },
          ].filter((x) => x.value > 0.5),
        }
      : null,
    figures: now.map((x) => ({
      key: x.h.code,
      code: x.h.code,
      label: same(nameOf(x.h)),
      value: NOW_WORD[x.w],
      tone: NOW_TONE[x.w],
    })),
    points: [],
  };

  // Did you buy at fair prices? Information, not part of the grade. With the
  // glance's price lines the price paid runs through the stock page's rule.
  // "Years of profit you paid" is total cost / total yearly profit, weighted by
  // the money put in — an average of P/Es put equal money in a P/E 3 and a
  // P/E 126 share at 65 years when it is 7 (2026-11-05).
  const judged = f.hs.filter((h) => h.entryPe != null && h.entryPe > 0 && h.entryValuation !== "unknown");
  const costOf = (h: HoldingInsight) => h.qty * h.buyPrice;
  const paidOn = (hs: HoldingInsight[], pe: (h: HoldingInsight) => number | null) => {
    const use = hs.filter((h) => (pe(h) ?? 0) > 0);
    const cost = use.reduce((a, h) => a + costOf(h), 0);
    const earn = use.reduce((a, h) => a + costOf(h) / (pe(h) as number), 0);
    return cost > 0 && earn > 0 ? cost / earn : null;
  };
  const youPaid = paidOn(judged, (h) => h.entryPe);
  const similar = paidOn(judged, (h) => h.sectorPe);
  const over = judged.filter((h) => h.entryValuation === "expensive").sort((a, b) => b.weightPct - a.weightPct);
  const judgedCost = judged.reduce((a, h) => a + costOf(h), 0);
  const overShare = judgedCost > 0 ? (over.reduce((a, h) => a + costOf(h), 0) / judgedCost) * 100 : 0;
  const paidTone: Tone = !judged.length ? "neutral" : over.length === 0 ? "good" : "fair";
  const paid: PfRow = {
    key: "paid",
    title: B("Did you buy at fair prices?", "কি ন্যায্য দামে কিনেছেন?"),
    word: !judged.length
      ? B("Can't tell yet", "এখনো বলা যায় না")
      : over.length === 0
        ? B("Yes", "হ্যাঁ")
        : overShare < 30
          ? B("Mostly", "বেশিরভাগ")
          : B("Some paid high", "কিছু বেশি দামে"),
    tone: paidTone,
    headline: !judged.length
      ? null
      : join([
          youPaid != null && similar != null
            ? B(
                `You paid about ${Math.round(youPaid)} years of their profit. Similar companies cost about ${Math.round(similar)} today.`,
                `আপনি তাদের প্রায় ${Math.round(youPaid)} বছরের মুনাফার সমান দাম দিয়েছেন। একই ধরনের কোম্পানির দাম আজ প্রায় ${Math.round(similar)} বছরের।`,
              )
            : B("", ""),
          over.length
            ? B(`You paid a high price for ${names(over).en}.`, `${names(over).bn}-এ বেশি দাম দিয়েছেন।`)
            : B("None was bought at a high price.", "কোনোটিই বেশি দামে কেনা নয়।"),
        ]),
    meaning: [
      B(
        "The fewer years of profit you pay for, the more room the price has to grow, and the less a bad year hurts.",
        "যত কম বছরের মুনাফার সমান দাম দেবেন, দাম বাড়ার জায়গা তত বেশি, আর খারাপ বছরে ক্ষতি তত কম।",
      ),
      B(
        "We measure it on each company's latest profit. It does not change your grade: the grade looks at today's price.",
        "এটি প্রতিটি কোম্পানির সর্বশেষ মুনাফা ধরে মাপা। এতে আপনার গ্রেড বদলায় না: গ্রেড দেখে আজকের দাম।",
      ),
    ],
    watch: null,
    picture:
      youPaid == null || similar == null
        ? null
        : {
            kind: "bars",
            label: `You paid ${Math.round(youPaid)} years of profit, similar companies ${Math.round(similar)}`,
            rows: [
              { key: "you", name: B("You paid", "আপনি দিয়েছেন"), value: youPaid, text: `${Math.round(youPaid)}`, me: true },
              { key: "sim", name: B("Similar companies", "একই ধরনের কোম্পানি"), value: similar, text: `${Math.round(similar)}` },
            ],
          },
    figures: judged.map((h) => ({
      key: h.code,
      code: h.code,
      label: same(nameOf(h)),
      value:
        h.entryValuation === "cheap"
          ? B("Bought at a low price", "কম দামে কেনা")
          : h.entryValuation === "expensive"
            ? B("Bought at a high price", "বেশি দামে কেনা")
            : B("Bought at a fair price", "ন্যায্য দামে কেনা"),
      tone: (h.entryValuation === "cheap" ? "good" : h.entryValuation === "expensive" ? "fair" : "neutral") as Tone,
    })),
    points: [],
  };

  // What are they worth today? (the stock page's fair value)
  const fv = f.hs
    .map((h) => ({ h, gap: inp.glance.get(h.code.toUpperCase())?.fair?.gap_pct ?? null }))
    .filter((x) => x.gap != null) as { h: HoldingInsight; gap: number }[];
  const below = fv.filter((x) => x.gap < -10);
  const above = fv.filter((x) => x.gap > 10);
  const near = fv.length - below.length - above.length;
  const worthTone: Tone = !fv.length ? "neutral" : above.length > below.length ? "fair" : "good";
  const worth: PfRow = {
    key: "worth",
    title: B("What are they worth today?", "আজ এগুলোর ন্যায্য দাম কত?"),
    word: !fv.length
      ? B("Not enough data", "যথেষ্ট তথ্য নেই")
      : below.length
        ? B(`${below.length} below fair`, `${below.length}টি ন্যায্যের নিচে`)
        : above.length
          ? B(`${above.length} above fair`, `${above.length}টি ন্যায্যের ওপরে`)
          : B("Near fair", "ন্যায্যের কাছে"),
    tone: worthTone,
    headline: !fv.length
      ? null
      : B(
          `${below.length} of your shares ${below.length === 1 ? "is" : "are"} below our fair price, ${near} near it${above.length ? `, and ${names(above.map((x) => x.h)).en} above it` : ""}.`,
          `আপনার ${below.length}টি শেয়ার আমাদের ন্যায্য দামের নিচে, ${near}টি কাছাকাছি${above.length ? `, আর ${names(above.map((x) => x.h)).bn} ওপরে` : ""}।`,
        ),
    meaning: [
      B(
        "Our fair price comes from each company's profit, assets and dividends, worked out four ways, as on each stock page.",
        "প্রতিটি কোম্পানির মুনাফা, সম্পদ আর ডিভিডেন্ড থেকে চারভাবে ন্যায্য দাম বের করা হয়, শেয়ারের পেজের মতোই।",
      ),
    ],
    watch: above.length ? B(`${nameOf(above[0].h)} already costs more than we think it is worth.`, `${nameOf(above[0].h)}-এর দাম আমাদের হিসাবের ন্যায্য দামের চেয়ে বেশি।`) : null,
    picture: fv.length
      ? {
          kind: "split",
          label: `${below.length} below fair, ${near} near, ${above.length} above`,
          parts: [
            { key: "b", value: (below.length / fv.length) * 100, text: B(`Below fair ${below.length}`, `ন্যায্যের নিচে ${below.length}`), swatch: "good" as Swatch },
            { key: "n", value: (near / fv.length) * 100, text: B(`Near fair ${near}`, `কাছাকাছি ${near}`), swatch: "quiet" as Swatch },
            { key: "a", value: (above.length / fv.length) * 100, text: B(`Above fair ${above.length}`, `ন্যায্যের ওপরে ${above.length}`), swatch: "fair" as Swatch },
          ].filter((p) => p.value > 0),
        }
      : null,
    figures: fv
      .sort((x, y) => x.gap - y.gap)
      .map((x) => ({
        key: x.h.code,
        code: x.h.code,
        label: same(nameOf(x.h)),
        value:
          x.gap < -10
            ? B(`${pct(-x.gap)} below fair`, `ন্যায্যের ${pct(-x.gap)} নিচে`)
            : x.gap > 10
              ? B(`${pct(x.gap)} above fair`, `ন্যায্যের ${pct(x.gap)} ওপরে`)
              : B("Near fair", "ন্যায্যের কাছে"),
        tone: (x.gap < -10 ? "good" : x.gap > 10 ? "fair" : "neutral") as Tone,
      })),
    points: [],
  };

  // Which are near their yearly top?
  const high = f.hs.filter((h) => h.flags.nearHigh).sort((a, b) => b.weightPct - a.weightPct);
  const topRow: PfRow = {
    key: "top",
    title: B("Which are near their yearly top?", "কোনগুলো বছরের সর্বোচ্চ দামের কাছে?"),
    word: high.length === 0 ? B("None", "কোনোটি নয়") : high.length === 1 ? same(high[0].code) : B(`${high.length} shares`, `${high.length}টি শেয়ার`),
    tone: high.length ? "fair" : "good",
    headline: high.length
      ? B(
          `${names(high).en} ${high.length === 1 ? "is" : "are"} near the highest price of the past year. A dip there would not be a surprise.`,
          `${names(high).bn} গত এক বছরের সর্বোচ্চ দামের কাছে। সেখানে দাম কিছুটা কমলে অবাক হওয়ার কিছু নেই।`,
        )
      : B("None of your shares is near its highest price of the past year.", "আপনার কোনো শেয়ার গত এক বছরের সর্বোচ্চ দামের কাছে নেই।"),
    meaning: high.length
      ? [B("Near the top is a good moment to decide whether to book some profit, not a reason to buy more.", "সর্বোচ্চের কাছে থাকলে কিছু লাভ তুলবেন কি না ভাবার সময়, আরও কেনার নয়।")]
      : [],
    watch: null,
    picture: null,
    figures: high.map((h) => ({
      key: h.code,
      code: h.code,
      label: same(nameOf(h)),
      value: h.pnlPct != null ? B(`${h.pnlPct >= 0 ? "+" : ""}${Math.round(h.pnlPct)}% since you bought`, `কেনার পর ${h.pnlPct >= 0 ? "+" : ""}${Math.round(h.pnlPct)}%`) : B("Near its top", "সর্বোচ্চের কাছে"),
    })),
    points: [],
  };

  const rows = [todayRow, worth, topRow, paid];
  return {
    key: "prices",
    id: "ch-prices",
    title: B("Is the price right today?", "আজকের দাম কি ঠিক আছে?"),
    head: {
      word: light.word,
      tone: light.tone,
      line:
        judgedNow.length === 0
          ? B("Not enough profit figures to judge", "বিচার করার মতো মুনাফার হিসাব নেই")
          : B(`${lowOrFair} of ${judgedNow.length} at a low or fair price today`, `${judgedNow.length}টির ${lowOrFair}টির দাম আজ কম বা ন্যায্য`),
    },
    rows,
  };
}

// ── Chapter · shares in a loss (2026-11-04) ───────────────────────────────
//
// "What about your shares in a loss?" — for every share more than 5% below
// what the reader paid: how far down, whether the company got weaker or only
// the price fell, the price that gives their money back after fees, what
// buying more would do to their average (never on a weaker company), and what
// the money pays them while they wait. The day one of them closes back at
// their price after a month under it, the watcher says so (`breakeven`).

/** A share counts as "in a loss" here from this far below the price paid. */
const LOSS_PCT = -5;
/** A buy-more example never takes one share past this much of the money (the
 *  backend's Buy more line, lib/portfolio-limits). */
const MORE_MAX_PCT = BUY_MORE_MAX_PCT;


interface LossItem {
  h: HoldingInsight;
  cost: number;
  value: number;
  /** Taka below what was paid. */
  down: number;
  downPct: number;
  kind: LossKind;
  /** Why it sits in its group, one clause. */
  why: Bi;
  /** The price that gives the money back after fees, both sides, net of the
   *  cash dividends it has already paid. */
  even: number;
  /** Cash dividends logged on it since it was added. */
  div: number;
  /** How far it must rise from today to get there, %. */
  rise: number;
  hi52: number | null;
  /** Cash dividends a year at today's price (last year's dividend). */
  cash: number;
}

interface LossFacts {
  items: LossItem[];
  down: number;
  cost: number;
  value: number;
  fee: number;
  /** What strong companies that pay steadily yield in cash at today's prices, % (median). */
  steadyYield: number | null;
}

const breakEven = (avg: number, fee: number) => (avg * (1 + fee)) / (1 - fee);
/** The price that gives back what was put in, after fees both sides and the
 *  cash dividends already received on these shares. */
const breakEvenNet = (cost: number, qty: number, div: number, fee: number) =>
  qty > 0 ? breakEven(Math.max(0, cost - div) / qty, fee) : 0;

function lossFacts(inp: ReportInput, f: Facts): LossFacts | null {
  const fee = Math.max(0, inp.feePct ?? 0.4) / 100;
  const items: LossItem[] = [];
  for (const h of f.hs) {
    if (h.ltp == null || h.ltp <= 0 || h.pnlPct == null || h.pnlPct > LOSS_PCT || h.buyPrice <= 0) continue;
    const g = inp.glance.get(h.code.toUpperCase());
    const cost = h.qty * h.buyPrice;
    const value = h.qty * h.ltp;
    const profit = g?.profit_change_pct ?? inp.priceMap.get(h.code)?.eps_yoy_pct ?? null;
    const serious = f.serious.find((x) => x.h.code === h.code);
    let kind: LossKind;
    let why: Bi;
    if (serious) {
      kind = "worse";
      why = B(lowerFirst(serious.lines[0].en).replace(/\.$/, ""), serious.lines[0].bn.replace(/।$/, ""));
    } else if (h.tierKey === "weak") {
      kind = "worse";
      why = B("it is weak on our checks now", "এখন এটি আমাদের যাচাইয়ে দুর্বল");
    } else if (profit != null && profit <= -25) {
      kind = "worse";
      why = B("its profit fell by a quarter or more", "এর মুনাফা এক-চতুর্থাংশ বা তার বেশি কমেছে");
    } else if (h.signal.signal === "sell") {
      kind = "worse";
      why = B("it is marked Sell", "এতে বিক্রির সংকেত");
    } else if (GOOD_TIERS.has(h.tierKey) && (profit == null || profit > -10)) {
      kind = "price";
      why = B("it is still a strong company", "কোম্পানিটি এখনো শক্তিশালী");
    } else {
      kind = "mixed";
      why =
        profit != null && profit <= -10
          ? B("its profit is slipping", "এর মুনাফা কিছুটা কমছে")
          : h.tierKey === "unscored"
            ? B("we can't grade it yet", "এখনো এর গ্রেড দেওয়া যায়নি")
            : B("it is an average company", "এটি মাঝারি মানের কোম্পানি");
    }
    const div = Math.max(0, inp.divReceived?.get(h.code.toUpperCase()) ?? 0);
    const even = breakEvenNet(cost, h.qty, div, fee);
    const y = inp.priceMap.get(h.code)?.div_yield_pct ?? 0;
    items.push({
      h,
      cost,
      value,
      down: cost - value,
      downPct: -h.pnlPct,
      kind,
      why,
      even,
      div,
      rise: (even / h.ltp - 1) * 100,
      hi52: g?.hi52 ?? null,
      cash: y > 0 ? (value * y) / 100 : 0,
    });
  }
  if (!items.length) return null;
  items.sort((a, b) => b.down - a.down);

  // What strong companies that pay steadily pay at today's prices.
  const ys = [...inp.priceMap.values()]
    .filter((s) => (s.score ?? 0) >= 60 && (s.p5_div ?? 0) >= 7 && (s.div_yield_pct ?? 0) > 0 && s.market_category !== "Z")
    .map((s) => s.div_yield_pct as number)
    .sort((a, b) => a - b);
  const steadyYield = ys.length >= 5 ? ys[Math.floor(ys.length / 2)] : null;

  return {
    items,
    down: items.reduce((a, x) => a + x.down, 0),
    cost: items.reduce((a, x) => a + x.cost, 0),
    value: items.reduce((a, x) => a + x.value, 0),
    fee,
    steadyYield,
  };
}

interface MoreExample {
  x: LossItem;
  q: number;
  spend: number;
  avg: number;
  rise: number;
}

/** Buying more of a share in a loss: half of what is in it, capped so the
 *  share stays under the Buy more line. Null when there is no room. */
function moreExample(x: LossItem, total: number, fee: number): MoreExample | null {
  const cap = MORE_MAX_PCT / 100;
  const ltp = x.h.ltp as number;
  // Spending s keeps the share under the cap when (value + s) ≤ cap × (total + s).
  const room = (cap * total - x.value) / (1 - cap);
  const q = Math.floor(Math.min(x.cost * 0.5, Math.max(0, room)) / ltp);
  if (q < 1) return null;
  const avg = (x.cost + q * ltp) / (x.h.qty + q);
  const even = breakEvenNet(x.cost + q * ltp, x.h.qty + q, x.div, fee);
  return { x, q, spend: q * ltp, avg, rise: Math.max(0, (even / ltp - 1) * 100) };
}

const KIND_WORD: Record<LossKind, Bi> = {
  price: B("Only the price fell", "শুধু দাম কমেছে"),
  mixed: B("In between", "মাঝামাঝি"),
  worse: B("Weaker too", "কোম্পানিও দুর্বল হয়েছে"),
};
const KIND_TONE: Record<LossKind, Tone> = { price: "good", mixed: "fair", worse: "bad" };
const KIND_SWATCH: Record<LossKind, Swatch> = { price: "good", mixed: "fair", worse: "bad" };
const signedPct = (v: number) => `+${Math.max(0, Math.round(v))}%`;

function lossChapter(inp: ReportInput, f: Facts, lf: LossFacts): PfChapter {
  const { items } = lf;
  const n = items.length;
  const one = n === 1 ? items[0] : null;
  const price = items.filter((x) => x.kind === "price");
  const mixed = items.filter((x) => x.kind === "mixed");
  const worse = items.filter((x) => x.kind === "worse");
  const hsOf = (xs: LossItem[]) => xs.map((x) => x.h);
  const downPct = lf.cost > 0 ? (lf.down / lf.cost) * 100 : 0;
  const worsePct = worse.reduce((a, x) => a + x.h.weightPct, 0);

  // How far down are they?
  const down: PfRow = {
    key: "down",
    title: B("How far down are they?", "কতটা লোকসানে আছে?"),
    word: B(`${pct(downPct)} down`, `${pct(downPct)} কম`),
    tone: downPct >= 25 ? "bad" : "fair",
    headline: one
      ? B(
          `${nameOf(one.h)} is ${pct(one.downPct)} below what you paid. That is ${takaGroup(one.down)} less than you put in.`,
          `${nameOf(one.h)} আপনার কেনা দামের চেয়ে ${pct(one.downPct)} কম। আপনি যা রেখেছিলেন, তার চেয়ে ${takaGroup(one.down)} কম।`,
        )
      : B(
          `${n} of your ${f.n} shares are below what you paid. Together they are ${takaGroup(lf.down)} down.`,
          `আপনার ${f.n}টি শেয়ারের ${n}টি কেনা দামের নিচে। সব মিলিয়ে ${takaGroup(lf.down)} কম।`,
        ),
    meaning: [
      B(
        "A loss only becomes real when you sell. What matters now is whether the company behind each share is still worth waiting for.",
        "বিক্রি না করা পর্যন্ত লোকসান কাগজে-কলমেই থাকে। এখন আসল প্রশ্ন, প্রতিটি শেয়ারের পেছনের কোম্পানির জন্য অপেক্ষা করা ঠিক হবে কি না।",
      ),
    ],
    watch: null,
    picture: {
      kind: "bars",
      label: items.slice(0, 4).map((x) => `${x.h.code} ${takaGroup(x.down)} down`).join(", "),
      rows: items.slice(0, 4).map((x, i) => ({ key: x.h.code, name: same(nameOf(x.h)), value: x.down, text: takaGroup(x.down), me: i === 0 })),
    },
    figures: items.map((x) => ({
      key: x.h.code,
      code: x.h.code,
      label: same(nameOf(x.h)),
      value: B(`${pct(x.downPct)} down · ${takaGroup(x.down)}`, `${pct(x.downPct)} কম · ${takaGroup(x.down)}`),
      tone: (x.downPct >= 25 ? "bad" : "fair") as Tone,
    })),
    points: [],
  };

  // Is it the company, or only the price?
  const priceLine = price.length
    ? price.length === 1
      ? B(`For ${nameOf(price[0].h)} only the price fell: it is still a strong company.`, `${nameOf(price[0].h)}-এর শুধু দাম কমেছে: কোম্পানিটি এখনো শক্তিশালী।`)
      : B(`For ${names(hsOf(price)).en} only the price fell: they are still strong companies.`, `${names(hsOf(price)).bn}-এর শুধু দাম কমেছে: কোম্পানিগুলো এখনো শক্তিশালী।`)
    : null;
  const worseLine = worse.length
    ? B(`${nameOf(worse[0].h)} got weaker too: ${worse[0].why.en}.`, `${nameOf(worse[0].h)} কোম্পানিও দুর্বল হয়েছে: ${worse[0].why.bn}।`)
    : null;
  const mixedLine = mixed.length
    ? B(`${nameOf(mixed[0].h)} is in between: ${mixed[0].why.en}.`, `${nameOf(mixed[0].h)} মাঝামাঝি অবস্থায়: ${mixed[0].why.bn}।`)
    : null;
  const whyLines = [priceLine, worseLine, mixedLine].filter(Boolean) as Bi[];
  const whyTone: Tone = worse.length === 0 ? (mixed.length === 0 ? "good" : "fair") : worse.length === n ? "bad" : "fair";
  const why: PfRow = {
    key: "why",
    title: B("Is it the company, or only the price?", "সমস্যা কোম্পানিতে, নাকি শুধু দামে?"),
    word:
      worse.length === 0 && mixed.length === 0
        ? B("Only the price", "শুধু দাম")
        : worse.length === n
          ? B("The company too", "কোম্পানিও")
          : worse.length
            ? B(`${worse.length} weaker too`, `${worse.length}টি দুর্বলও হয়েছে`)
            : B(`${mixed.length} in between`, `${mixed.length}টি মাঝামাঝি`),
    tone: whyTone,
    headline: join(whyLines.slice(0, 2)),
    meaning: [
      B(
        "A strong company whose price fell can climb back as its profit grows. A company that got weaker gives its price less reason to come back.",
        "শক্তিশালী কোম্পানির দাম কমলে মুনাফা বাড়ার সঙ্গে সঙ্গে আবার উঠতে পারে। কোম্পানি নিজেই দুর্বল হলে দাম ফেরার কারণ কমে যায়।",
      ),
    ],
    watch: worse.length
      ? B(`Adding more to ${nameOf(worse[0].h)} puts more of your money on a weaker company.`, `${nameOf(worse[0].h)}-এ আরও কিনলে দুর্বল কোম্পানিতে আরও টাকা আটকাবে।`)
      : null,
    picture: {
      kind: "split",
      label: `${price.length} only the price fell, ${mixed.length} in between, ${worse.length} weaker too`,
      parts: (["price", "mixed", "worse"] as LossKind[])
        .map((k) => ({ k, count: items.filter((x) => x.kind === k).length }))
        .filter((p) => p.count > 0)
        .map((p) => ({
          key: p.k,
          value: (p.count / n) * 100,
          text: B(`${KIND_WORD[p.k].en} ${p.count}`, `${KIND_WORD[p.k].bn} ${p.count}`),
          swatch: KIND_SWATCH[p.k],
        })),
    },
    figures: items.map((x) => ({ key: x.h.code, code: x.h.code, label: same(nameOf(x.h)), value: KIND_WORD[x.kind], tone: KIND_TONE[x.kind] })),
    // The other shares' reasons, open (2026-11-04).
    points: [...whyLines.slice(2), ...worse.slice(1, 3).map((x) => B(`${nameOf(x.h)}: ${x.why.en}.`, `${nameOf(x.h)}: ${x.why.bn}।`))],
  };

  // What price gets your money back?
  const byRise = [...items].sort((a, b) => a.rise - b.rise);
  const near = byRise.filter((x) => x.rise <= 10);
  const reached = items.filter((x) => x.hi52 != null && x.hi52 >= x.even);
  const closest = byRise[0];
  const furthest = byRise[byRise.length - 1];
  const even: PfRow = {
    key: "even",
    title: B("What price gets your money back?", "কোন দামে আপনার টাকা ফিরবে?"),
    word: near.length ? B(`${near.length} within 10%`, `${near.length}টি 10%-এর মধ্যে`) : B("All need 10% or more", "সবগুলোর 10%-এর বেশি দরকার"),
    tone: near.length ? "fair" : "bad",
    headline: one
      ? join([
          B(
            `${nameOf(one.h)} needs to rise ${pct(one.rise)}, to ${money(one.even)}, to give your money back after fees${one.div >= 1 ? ` and the ${takaGroup(one.div)} in dividends it has paid you` : ""}.`,
            `ফি${one.div >= 1 ? ` আর এ পর্যন্ত পাওয়া ${takaGroup(one.div)} ডিভিডেন্ড` : ""} ধরে টাকা ফেরাতে ${nameOf(one.h)}-এর দাম ${pct(one.rise)} বাড়তে হবে, ${money(one.even)} পর্যন্ত।`,
          ),
          one.hi52 != null
            ? one.hi52 >= one.even
              ? B("It was above that price within the past year.", "গত এক বছরের মধ্যে দাম এর ওপরে ছিল।")
              : B(`Its highest price this past year was ${money(one.hi52)}.`, `গত এক বছরে এর সর্বোচ্চ দাম ছিল ${money(one.hi52)}।`)
            : B("", ""),
        ])
      : join([
          B(
            `${nameOf(closest.h)} is closest: it needs to rise ${pct(closest.rise)} to give your money back after fees.`,
            `${nameOf(closest.h)} সবচেয়ে কাছে: ফি দেওয়ার পর টাকা ফেরাতে এর দাম ${pct(closest.rise)} বাড়তে হবে।`,
          ),
          B(`${nameOf(furthest.h)} is furthest: it needs ${pct(furthest.rise)}.`, `${nameOf(furthest.h)} সবচেয়ে দূরে: এর দরকার ${pct(furthest.rise)}।`),
        ]),
    meaning: [
      ...(reached.length && !one
        ? [
            B(
              `${reached.length} of them traded at that price within the past year, so it is not out of reach.`,
              `এর ${reached.length}টি গত এক বছরের মধ্যে ওই দামে লেনদেন হয়েছে, তাই দামটি নাগালের বাইরে নয়।`,
            ),
          ]
        : []),
      B(
        "When a share that has been under your price for a month closes back at it, we tell you that evening.",
        "এক মাস কেনা দামের নিচে থাকা কোনো শেয়ার আবার আপনার কেনা দামে ফিরলে, সেদিন সন্ধ্যাতেই আপনাকে জানাই।",
      ),
    ],
    watch: null,
    picture: {
      kind: "bars",
      label: byRise.slice(0, 4).map((x) => `${x.h.code} needs ${pct(x.rise)}`).join(", "),
      rows: byRise.slice(0, 4).map((x, i) => ({ key: x.h.code, name: same(nameOf(x.h)), value: Math.max(1, x.rise), text: signedPct(x.rise), me: i === 0 })),
    },
    figures: byRise.map((x) => ({
      key: x.h.code,
      code: x.h.code,
      label: same(nameOf(x.h)),
      value: B(
        `${money(x.even)} · ${signedPct(x.rise)} from today${x.hi52 != null ? ` · this year's high ${money(x.hi52)}` : ""}`,
        `${money(x.even)} · আজ থেকে ${signedPct(x.rise)}${x.hi52 != null ? ` · এ বছরের সর্বোচ্চ ${money(x.hi52)}` : ""}`,
      ),
      tone: (x.rise <= 10 ? "fair" : "bad") as Tone,
    })),
    points: [],
  };

  // What would buying more do? Only on a company that is not weaker; the
  // example is half of what is in it, capped so the share stays under a fifth.
  // Only a share whose own advice is Buy more (signal_service.holding_signal):
  // an average or ungraded company the signal wouldn't buy gets no
  // "lower your average" example (2026-11-05).
  const buyable = items.filter((x) => x.kind !== "worse" && x.h.signal.signal === "buy_more");
  const examples = buyable.map((x) => moreExample(x, f.total, lf.fee)).filter(Boolean) as MoreExample[];
  const ex = examples[0] ?? null;
  const more: PfRow = {
    key: "more",
    title: B("What would buying more do?", "আরও কিনলে কী হবে?"),
    word: ex
      ? B("Lowers your price", "গড় দাম কমে")
      : worse.length === n
        ? B("Not on these", "এগুলোতে নয়")
        : buyable.length
          ? B("No room", "জায়গা নেই")
          : B("None marked Buy more", "আরও কেনার সংকেত নেই"),
    tone: ex ? "neutral" : worse.length === n ? "bad" : "neutral",
    headline: ex
      ? join([
          B(
            `Buying ${takaGroup(ex.spend)} more of ${nameOf(ex.x.h)} at today's price lowers your average to ${money(ex.avg)}.`,
            `আজকের দামে ${nameOf(ex.x.h)}-এর আরও ${takaGroup(ex.spend)}-এর শেয়ার কিনলে আপনার গড় দাম নামবে ${money(ex.avg)}-এ।`,
          ),
          B(
            `It would then need to rise ${pct(ex.rise)} instead of ${pct(ex.x.rise)} to give your money back.`,
            `তখন টাকা ফেরাতে দাম ${pct(ex.x.rise)}-এর বদলে ${pct(ex.rise)} বাড়লেই হবে।`,
          ),
        ])
      : worse.length === n
        ? B(
            "Each of these companies got weaker, so buying more would put more money on a weaker company.",
            "এই কোম্পানিগুলো সবই দুর্বল হয়েছে, তাই আরও কিনলে দুর্বল কোম্পানিতে আরও টাকা যাবে।",
          )
        : buyable.length
          ? B(
              "These shares already hold a big part of your money, so buying more would lean on them too much.",
              "এই শেয়ারগুলোতে আগেই আপনার টাকার বড় অংশ আছে, তাই আরও কিনলে এগুলোর ওপর বেশি নির্ভরতা তৈরি হবে।",
            )
          : B(
              "We only show what buying more would do for a share marked Buy more, and none of these is today.",
              "আরও কিনলে কী হবে, তা শুধু আরও কেনার সংকেত থাকা শেয়ারের জন্য দেখাই, আর আজ এগুলোর কোনোটিতে তা নেই।",
            ),
    meaning: [
      B(
        `Buying more lowers your average price, but it also puts more of your money on one share. Our examples are only for shares marked Buy more, and keep each under ${MORE_MAX_PCT}% of your money.`,
        `আরও কিনলে গড় দাম কমে, কিন্তু একটি শেয়ারে আরও টাকা জমে। আমাদের উদাহরণ শুধু আরও কেনার সংকেত থাকা শেয়ারের জন্য, আর প্রতিটি শেয়ার আপনার টাকার ${MORE_MAX_PCT}%-এর নিচে থাকে।`,
      ),
      ...(ex && worse.length
        ? [B(`We leave ${names(hsOf(worse)).en} out: the company got weaker too.`, `${names(hsOf(worse)).bn} বাদ রাখা হয়েছে: কোম্পানিও দুর্বল হয়েছে।`)]
        : []),
    ],
    watch: null,
    picture: ex
      ? {
          kind: "bars",
          label: `${ex.x.h.code}: needs ${pct(ex.x.rise)} now, ${pct(ex.rise)} after buying more`,
          rows: [
            { key: "now", name: B("Needs to rise now", "এখন যত বাড়তে হবে"), value: Math.max(1, ex.x.rise), text: signedPct(ex.x.rise) },
            { key: "after", name: B("After buying more", "আরও কেনার পর"), value: Math.max(1, ex.rise), text: signedPct(ex.rise), me: true },
          ],
        }
      : null,
    figures: examples.map((e) => ({
      key: e.x.h.code,
      code: e.x.h.code,
      label: same(nameOf(e.x.h)),
      value: B(
        `${takaGroup(e.spend)} more (${e.q.toLocaleString("en-US")} shares) · average ${money(e.avg)} · needs ${signedPct(e.rise)}`,
        `আরও ${takaGroup(e.spend)} (${e.q.toLocaleString("en-US")}টি শেয়ার) · গড় ${money(e.avg)} · দরকার ${signedPct(e.rise)}`,
      ),
    })),
    points: [],
  };

  // What does the money earn while you wait?
  const cash = items.reduce((a, x) => a + x.cash, 0);
  const steadyCash = lf.steadyYield != null ? (lf.value * lf.steadyYield) / 100 : null;
  const payTone: Tone = cash <= 0 ? "bad" : steadyCash != null && cash < steadyCash * 0.6 ? "fair" : "good";
  const wait: PfRow = {
    key: "wait",
    title: B("What does the money earn while you wait?", "অপেক্ষার সময় টাকাটা কী আয় করছে?"),
    word: cash <= 0 ? B("Pays nothing", "কিছু দেয় না") : payTone === "good" ? B("Pays you to wait", "অপেক্ষার মধ্যেও দেয়") : B("Pays a little", "অল্প দেয়"),
    tone: payTone,
    headline: join([
      B(`These shares are worth ${takaGroup(lf.value)} today.`, `এই শেয়ারগুলোর আজকের দাম ${takaGroup(lf.value)}।`),
      cash > 0
        ? B(`At last year's dividends they pay you about ${takaGroup(cash)} a year in cash.`, `গত বছরের ডিভিডেন্ড ধরলে এগুলো বছরে প্রায় ${takaGroup(cash)} নগদ দেয়।`)
        : B("They pay you no cash dividend while you wait.", "অপেক্ষার সময় এগুলো কোনো নগদ ডিভিডেন্ড দেয় না।"),
    ]),
    meaning: [
      ...(steadyCash != null && steadyCash > cash * 1.2
        ? [
            B(
              `Strong companies that pay steadily would pay about ${takaGroup(steadyCash)} a year on the same money, at today's prices.`,
              `নিয়মিত ডিভিডেন্ড দেওয়া শক্তিশালী কোম্পানিতে একই টাকায় আজকের দামে বছরে প্রায় ${takaGroup(steadyCash)} আসত।`,
            ),
          ]
        : []),
      B(
        "A share that pays a dividend pays you while you wait for its price. One that pays nothing has only its price to give back.",
        "যে শেয়ার ডিভিডেন্ড দেয়, দাম ফেরার অপেক্ষার মধ্যেও সেটি কিছু দেয়। যেটি কিছুই দেয় না, তার কাছে ফেরত পাওয়ার একমাত্র পথ দাম।",
      ),
    ],
    watch: null,
    picture:
      steadyCash != null
        ? {
            kind: "bars",
            label: `Your shares in a loss pay ${takaGroup(cash)} a year, strong steady payers ${takaGroup(steadyCash)}`,
            rows: [
              { key: "mine", name: B("Your shares in a loss", "আপনার লোকসানের শেয়ার"), value: Math.max(cash, 0), text: takaGroup(cash), me: true },
              { key: "steady", name: B("Strong, steady payers", "নিয়মিত দেওয়া শক্তিশালী কোম্পানি"), value: steadyCash, text: takaGroup(steadyCash) },
            ],
          }
        : null,
    figures: items.map((x) => ({
      key: x.h.code,
      code: x.h.code,
      label: same(nameOf(x.h)),
      value: x.cash > 0 ? B(`${takaGroup(x.cash)} a year`, `বছরে ${takaGroup(x.cash)}`) : B("No cash dividend", "নগদ ডিভিডেন্ড নেই"),
      tone: (x.cash > 0 ? "good" : "neutral") as Tone,
    })),
    points: [],
  };

  const rows = [down, why, even, more, wait];
  return {
    key: "loss",
    id: "ch-loss",
    title: B("What about your shares in a loss?", "লোকসানে থাকা শেয়ারগুলোর কী হবে?"),
    head: {
      word: n === 1 ? B("1 share in a loss", "1টি শেয়ার লোকসানে") : B(`${n} shares in a loss`, `${n}টি শেয়ার লোকসানে`),
      tone: worsePct > 10 ? "bad" : "fair",
      line: B(`${takaGroup(lf.down)} below what you paid`, `কেনা দামের চেয়ে ${takaGroup(lf.down)} কম`),
    },
    rows,
  };
}

/** Record dates and AGMs within 30 days, and results meetings within 14, on
 *  the held shares (the watch area's "What's coming up?", counted). */
function datesAhead(inp: ReportInput, f: Facts): number {
  const held = new Set(f.hs.map((h) => h.code.toUpperCase()));
  let n = 0;
  for (const code of held) {
    const ev = inp.glance.get(code)?.event;
    if (ev && ev.days_left != null && ev.days_left >= 0 && ev.days_left <= 30) n++;
  }
  for (const m of inp.results) if (held.has(m.code.toUpperCase()) && m.days >= 0 && m.days <= 14) n++;
  return n;
}

// ── Your plan (2026-11-11) ─────────────────────────────────────────────────
//
// Three parts in reading order: "Your way back" (the money below what was
// paid, split into only the price and the company), "Three changes to an A"
// (`gradePath` in words) and "Each of your shares". One decision per share
// across all three: the way back's "could move to", the path's swap and the
// share's "Switch" always name the same company (the engine's swap idea).

const lowerTier = (k: string): Bi => {
  const p = GRADE_PAIR[k] ?? GRADE_PAIR.unscored;
  return B(p.en.toLowerCase(), p.bn);
};

/** Today's price in one word, from the stock page's valuation score (7 low, 4 fair). */
function priceWord(item: ScoreItem | undefined): Bi | null {
  if (!item || item.eps == null || item.eps <= 0 || item.p4_val == null) return null;
  if (item.p4_val >= 7) return B("low", "কম");
  if (item.p4_val >= 4) return B("fair", "ন্যায্য");
  return B("high", "বেশি");
}

/** Why a share is a problem, one sentence (the worst thing first). */
function problemSentence(h: HoldingInsight, item: ScoreItem | undefined): Bi {
  const c = h.code;
  const loss = item?.eps != null && item.eps <= 0;
  if (h.flags.zCategory && loss) return B(`${c} is in DSE's Z category and making a loss.`, `${c} DSE-এর Z ক্যাটাগরিতে আছে, আর লোকসানে চলছে।`);
  if (h.flags.zCategory) return B(`${c} is in DSE's Z category.`, `${c} DSE-এর Z ক্যাটাগরিতে আছে।`);
  if (loss) return B(`${c} made a loss in its latest results.`, `সর্বশেষ ফলে ${c} লোকসান করেছে।`);
  if (h.signal.signal === "sell") return B(`${c} is marked Sell.`, `${c}-এ বিক্রির সংকেত।`);
  if (h.tierKey === "weak") return B(`${c} is mostly weak on our checks.`, `আমাদের যাচাইয়ে ${c} বেশ দুর্বল।`);
  return B(`${c} is weaker than other companies in its business.`, `${c} নিজের ব্যবসার অন্য কোম্পানির চেয়ে দুর্বল।`);
}

/** The company the money would go to, one or two sentences. */
function pickSentence(code: string, item: ScoreItem | undefined, where: "same" | "new" | "any"): Bi {
  const tier = lowerTier(getTier(item?.score ?? null));
  const pw = priceWord(item);
  const y = item?.div_yield_pct ?? 0;
  const whereEn = where === "same" ? ", in the same business" : where === "new" ? ", in a business you don't own" : "";
  const whereBn = where === "same" ? ", একই ব্যবসায়" : where === "new" ? ", এমন ব্যবসায় যা আপনার নেই" : "";
  return join([
    B(
      `${code} is ${tier.en}${whereEn}${pw ? `, and its price is ${pw.en} today` : ""}.`,
      `${code} ${tier.bn}${whereBn}${pw ? `, আর আজ এর দাম ${pw.bn}` : ""}।`,
    ),
    y >= 1 ? B(`It pays about ${y.toFixed(1)}% a year in cash.`, `বছরে নগদ প্রায় ${y.toFixed(1)}% দেয়।`) : B("", ""),
  ]);
}

const WAY_TITLE: Record<LossKind, Bi> = {
  price: B("Only the price fell", "শুধু দাম কমেছে"),
  mixed: B("Worth a closer look", "ভালো করে দেখা দরকার"),
  worse: B("The company has problems", "কোম্পানিতেও সমস্যা"),
};
const WAY_LINE: Record<LossKind, Bi> = {
  price: B(
    "These companies are still strong. A strong company's price can climb back as its profit grows.",
    "কোম্পানিগুলো এখনো শক্তিশালী। শক্তিশালী কোম্পানির মুনাফা বাড়লে দামও আবার উঠতে পারে।",
  ),
  mixed: B(
    "Not weak, but not strong either, or the profit is slipping. Look at each one before you add to it.",
    "দুর্বল নয়, আবার শক্তিশালীও নয়, বা মুনাফা কিছুটা কমছে। আরও কেনার আগে প্রতিটি ভালো করে দেখুন।",
  ),
  worse: B(
    "A weaker company gives its price less reason to come back. The question is where this money works better from today.",
    "কোম্পানি দুর্বল হলে দাম ফেরার কারণও কমে। প্রশ্ন হলো, আজ থেকে এই টাকা কোথায় বেশি কাজে আসবে।",
  ),
};

/** The engine's swap idea for a share, if any. */
const swapFor = (inp: ReportInput, code: string) =>
  inp.plan.picks.find((p) => p.kind === "swap" && p.suggest && (p.replaces ?? "").toUpperCase() === code.toUpperCase()) ?? null;
/** The path step that acts on a share (sells, trims or swaps it), 1-based. */
const stepFor = (path: PfPathView | null, code: string) => {
  const i = path?.steps.findIndex((s) => s.kind !== "add" && s.code.toUpperCase() === code.toUpperCase()) ?? -1;
  return i >= 0 ? i + 1 : null;
};

function buildWayBack(inp: ReportInput, f: Facts, lf: LossFacts, path: PfPathView | null): PfWayBack {
  const tax = Math.min(Math.max(inp.divTaxPct ?? 10, 0), 100) / 100;
  const heldSectors = new Set(f.hs.map((h) => h.sector));
  // A problem share with no same-business idea gets one of the engine's other
  // ideas, each idea used once (a business they don't own first).
  const spare = inp.plan.picks
    .filter((p) => p.kind !== "swap" && p.kind !== "add_more" && p.suggest)
    .sort((a, b) => Number(heldSectors.has(a.sector)) - Number(heldSectors.has(b.sector)));
  const usedSpare = new Set<string>();

  const itemOf = (x: LossItem): PfWayItem => {
    const code = x.h.code;
    let move: PfWayItem["move"] = null;
    if (x.kind !== "price") {
      const swap = swapFor(inp, code);
      if (swap) {
        move = { code: swap.code, line: pickSentence(swap.code, inp.priceMap.get(swap.code.toUpperCase()), "same"), step: stepFor(path, code) };
      } else if (x.kind === "worse") {
        const p = spare.find((s) => !usedSpare.has(s.code));
        if (p) {
          usedSpare.add(p.code);
          const add = path?.steps.findIndex((st) => st.kind === "add" && st.code.toUpperCase() === p.code.toUpperCase()) ?? -1;
          move = {
            code: p.code,
            line: pickSentence(p.code, inp.priceMap.get(p.code.toUpperCase()), heldSectors.has(p.sector) ? "any" : "new"),
            step: add >= 0 ? add + 1 : null,
          };
        }
      }
    }
    const ex = x.kind === "price" && x.h.signal.signal === "buy_more" ? moreExample(x, f.total, lf.fee) : null;
    const whyLine =
      x.kind === "worse" && (x.h.flags.zCategory || (inp.priceMap.get(code.toUpperCase())?.eps ?? 1) <= 0)
        ? problemSentence(x.h, inp.priceMap.get(code.toUpperCase()))
        : B(`${upperFirst(x.why.en)}.`, `${x.why.bn}।`);
    return {
      code,
      name: nameOf(x.h),
      tier: x.h.tierKey !== "unscored" ? GRADE_PAIR[x.h.tierKey] ?? null : null,
      tierKey: x.h.tierKey,
      z: x.h.flags.zCategory,
      why: whyLine,
      downPct: x.downPct,
      down: x.down,
      even: x.even,
      rise: x.rise,
      reached: x.hi52 != null ? x.hi52 >= x.even : null,
      cash: x.cash * (1 - tax),
      move,
      more: ex
        ? B(
            `Buying ${ex.q.toLocaleString("en-IN")} more at today's price brings it down to ${money(breakEvenNet(ex.x.cost + ex.spend, ex.x.h.qty + ex.q, ex.x.div, lf.fee))} (${signedPct(ex.rise)}), and keeps it under a fifth of your money.`,
            `আজকের দামে আরও ${ex.q.toLocaleString("en-IN")}টি কিনলে এটি নামে ${money(breakEvenNet(ex.x.cost + ex.spend, ex.x.h.qty + ex.q, ex.x.div, lf.fee))}-এ (${signedPct(ex.rise)}), আর শেয়ারটি আপনার টাকার এক-পঞ্চমাংশের নিচে থাকে।`,
          )
        : null,
    };
  };

  const groups: PfWayGroup[] = (["price", "mixed", "worse"] as LossKind[])
    .map((kind) => {
      const xs = lf.items.filter((x) => x.kind === kind);
      if (!xs.length) return null;
      const items = xs.map(itemOf);
      const cash = items.reduce((acc, it) => acc + it.cash, 0);
      const value = xs.reduce((acc, x) => acc + x.value, 0);
      const steady = lf.steadyYield != null ? ((value * lf.steadyYield) / 100) * (1 - tax) : null;
      let note: Bi | null = null;
      if (kind === "price") {
        note =
          cash >= 1
            ? B(
                `While you wait, ${xs.length === 1 ? "it pays" : `these ${xs.length} pay`} you about ${takaGroup(cash)} a year in cash, after tax. The money-back price counts broker fees both ways.`,
                `অপেক্ষার সময় ${xs.length === 1 ? "এটি" : `এই ${xs.length}টি`} কর কাটার পর বছরে প্রায় ${takaGroup(cash)} নগদ দেয়। টাকা ফেরার দামে কেনা-বেচা দুই দিকের ব্রোকার ফি ধরা আছে।`,
              )
            : B("The money-back price counts broker fees both ways.", "টাকা ফেরার দামে কেনা-বেচা দুই দিকের ব্রোকার ফি ধরা আছে।");
      } else if (kind === "worse" && steady != null && steady > cash * 1.2) {
        note = B(
          `${xs.length === 1 ? "It pays" : "They pay"} ${cash >= 1 ? `about ${takaGroup(cash)}` : "nothing"} a year in cash. Strong companies that pay steadily would pay about ${takaGroup(steady)} on the same money, after tax.`,
          `${xs.length === 1 ? "এটি" : "এগুলো"} বছরে ${cash >= 1 ? `প্রায় ${takaGroup(cash)}` : "কিছুই"} নগদ দেয়। নিয়মিত ডিভিডেন্ড দেওয়া শক্তিশালী কোম্পানি একই টাকায় কর কাটার পর প্রায় ${takaGroup(steady)} দিত।`,
        );
      }
      return { kind, title: WAY_TITLE[kind], line: WAY_LINE[kind], down: xs.reduce((acc, x) => acc + x.down, 0), items, note };
    })
    .filter(Boolean) as PfWayGroup[];

  const worse = groups.find((g) => g.kind === "worse");
  return {
    down: lf.down,
    n: lf.items.length,
    groups,
    watch: worse
      ? B(
          `Selling turns a paper loss into a real one. Buying more of ${worse.items[0].code} lowers its money-back price, but puts more of your money in a weaker company.`,
          `বিক্রি করলে কাগজে-কলমের লোকসান আসল লোকসান হয়ে যায়। ${worse.items[0].code} আরও কিনলে টাকা ফেরার দাম কমে, কিন্তু দুর্বল কোম্পানিতে আপনার আরও টাকা আটকায়।`,
        )
      : null,
  };
}

function buildPathView(inp: ReportInput, f: Facts): PfPathView | null {
  const gp = inp.path;
  if (!gp || !gp.steps.length) return null;
  const fee = Math.max(0, inp.feePct ?? 0.4) / 100;
  const qty = (n: number) => n.toLocaleString("en-IN");
  const holdingOf = (code: string) => f.hs.find((h) => h.code.toUpperCase() === code.toUpperCase());
  let sold = 0;
  let bought = 0;

  const steps: PfPathStepView[] = gp.steps.map((s, i) => {
    const h = holdingOf(s.code);
    const pick = s.pick ? inp.priceMap.get(s.pick.toUpperCase()) : undefined;
    let title: Bi;
    let why: Bi;
    if (s.kind === "sell") {
      title = B(`Sell ${s.code}`, `${s.code} বিক্রি করুন`);
      const g = inp.glance.get(s.code.toUpperCase())?.signal;
      why = join([
        h ? problemSentence(h, inp.priceMap.get(s.code.toUpperCase())) : B("", ""),
        g?.reason_en && h?.signal.signal === "sell" ? B(g.reason_en, g.reason_bn || g.reason_en) : B("", ""),
      ]);
    } else if (s.kind === "trim") {
      title = B(`Bring ${s.code} down to a quarter of your money`, `${s.code} কমিয়ে আপনার টাকার এক-চতুর্থাংশে আনুন`);
      const sw = s.sector ? sectorWord(s.sector.name) : null;
      why = join([
        B(`It is ${pct(s.weight)} of your money, and its price is high or near its top this year.`, `এটি আপনার টাকার ${pct(s.weight)}, আর এর দাম এখন বেশি বা বছরের সর্বোচ্চের কাছে।`),
        sw && s.sector && s.sector.before > SECTOR_FAIR_PCT && Math.round(s.sector.after) < Math.round(s.sector.before)
          ? B(`Money in ${sw.en} drops from ${pct(s.sector.before)} to ${pct(s.sector.after)}.`, `${sw.bn} সেক্টরে টাকা ${pct(s.sector.before)} থেকে নেমে ${pct(s.sector.after)} হয়।`)
          : B("", ""),
      ]);
    } else if (s.kind === "swap") {
      title = B(`Swap ${s.code} for ${s.pick}`, `${s.code}-এর বদলে ${s.pick}`);
      why = join([h ? problemSentence(h, inp.priceMap.get(s.code.toUpperCase())) : B("", ""), pickSentence(s.pick as string, pick, "same")]);
    } else {
      title = s.newSector
        ? B(`Add a business you don't own: ${s.pick}`, `নতুন একটি ব্যবসা যোগ করুন: ${s.pick}`)
        : s.pickKind === "dividend"
          ? B(`Add a steady dividend payer: ${s.pick}`, `নিয়মিত ডিভিডেন্ড দেয় এমন শেয়ার যোগ করুন: ${s.pick}`)
          : B(`Add ${s.pick}`, `${s.pick} যোগ করুন`);
      why = join([
        pickSentence(s.pick as string, pick, s.newSector ? "new" : "any"),
        s.topAfter <= ONE_SHARE_FAIR_PCT && (f.top?.weightPct ?? 0) > ONE_SHARE_FAIR_PCT
          ? B("After this no share is over a quarter of your money.", "এরপর কোনো শেয়ারে আপনার টাকার এক-চতুর্থাংশের বেশি থাকে না।")
          : B("", ""),
      ]);
    }

    const trades = s.trades.map((t) => {
      if (t.side === "buy") {
        bought += t.amount;
        return { side: t.side, text: B(`Buy ${qty(t.qty)} ${t.code}, about ${takaGroup(t.amount)}`, `${t.code}-এর ${qty(t.qty)}টি কিনুন, প্রায় ${takaGroup(t.amount)}`) };
      }
      sold += t.amount;
      return {
        side: t.side,
        text:
          t.held != null && t.qty < t.held
            ? B(`Sell ${qty(t.qty)} of your ${qty(t.held)} ${t.code}, about ${takaGroup(t.amount)}`, `আপনার ${qty(t.held)}টি ${t.code}-এর ${qty(t.qty)}টি বিক্রি করুন, প্রায় ${takaGroup(t.amount)}`)
            : B(`Sell all ${qty(t.qty)} ${t.code}, about ${takaGroup(t.amount)}`, `${t.code}-এর সব ${qty(t.qty)}টি বিক্রি করুন, প্রায় ${takaGroup(t.amount)}`),
      };
    });

    // The profit or loss the sale makes real.
    const sale = s.trades.find((t) => t.side === "sell" && t.avgCost != null);
    const pl = sale ? (sale.price - (sale.avgCost as number)) * sale.qty : 0;
    const note: PfPathStepView["note"] =
      pl <= -1
        ? { text: B(`This turns a ${takaGroup(-pl)} paper loss into a real one.`, `এতে কাগজে-কলমের ${takaGroup(-pl)} লোকসান আসল লোকসান হয়ে যায়।`), tone: "fair" }
        : pl >= 1
          ? { text: B(`You keep about ${takaGroup(pl)} of profit on these.`, `এগুলোতে প্রায় ${takaGroup(pl)} লাভ হাতে আসে।`), tone: "good" }
          : null;

    return { n: i + 1, kind: s.kind, code: s.code, title, trades, why, note, from: s.from, to: s.to };
  });

  const n = steps.length;
  const toEn = gp.to === "A" ? "an A" : `a ${gp.to}`;
  const countEn = ["One change", "Two changes", "Three changes"][n - 1] ?? `${n} changes`;
  const fees = (sold + bought) * fee;
  const usedCodes = new Set(gp.steps.flatMap((s) => [s.code.toUpperCase(), (s.pick ?? "").toUpperCase()]));
  return {
    title: B(`${countEn} to ${toEn}`, `${n}টি বদলে গ্রেড ${gp.to}`),
    line: B(
      `Your grade is ${gp.from}. ${n === 1 ? "This change takes" : `These ${n === 2 ? "two" : "three"} changes take`} it to ${gp.to}.`,
      `আপনার গ্রেড এখন ${gp.from}। ${n === 1 ? "এই বদলে" : `এই ${n}টি বদলে`} তা ${gp.to} হয়।`,
    ),
    from: gp.from,
    to: gp.to,
    steps,
    totals: { sold, bought, fees, left: sold - bought - fees },
    more: buildPlan(inp).buys.filter((b) => !usedCodes.has((b.code ?? "").toUpperCase())),
  };
}

const ACTION_WORD: Record<PfAction, Bi> = {
  switch: B("Switch", "বদলান"),
  sell: B("Sell", "বিক্রি"),
  trim: B("Trim", "কিছুটা কমান"),
  review: B("Read the warning", "সতর্কতাটি পড়ুন"),
  buy_more: B("Buy more", "আরও কেনা যায়"),
};
const ACTION_TONE: Record<PfAction, Tone> = { switch: "bad", sell: "bad", trim: "fair", review: "fair", buy_more: "good" };
const ACTION_ORDER: Record<PfAction, number> = { switch: 0, sell: 1, trim: 2, review: 3, buy_more: 4 };

function buildEach(inp: ReportInput, f: Facts, lf: LossFacts | null, path: PfPathView | null): PfEach {
  const reasonOf = new Map(inp.pro.actions.map((a) => [a.code.toUpperCase(), a.reason]));
  const worse = new Set((lf?.items ?? []).filter((x) => x.kind === "worse").map((x) => x.h.code.toUpperCase()));
  const act: PfEachItem[] = [];
  const rest: PfEach["rest"] = [];
  for (const h of f.hs) {
    const code = h.code.toUpperCase();
    const sig = h.signal.signal;
    const swap = swapFor(inp, code);
    const problem = sig === "sell" || h.tierKey === "weak" || h.flags.zCategory || worse.has(code);
    const action: PfAction | null =
      swap && problem ? "switch" : sig === "sell" ? "sell" : sig === "trim" ? "trim" : sig === "review" ? "review" : sig === "buy_more" ? "buy_more" : null;
    if (!action) {
      rest.push({ code: h.code, name: nameOf(h), line: same(reasonOf.get(code) ?? h.descriptor) });
      continue;
    }
    const step = stepFor(path, code);
    const stepLine = step ? B(`Step ${step} of your path.`, `আপনার পথের ধাপ ${step}।`) : B("", "");
    const line =
      action === "switch" && swap
        ? join([
            problemSentence(h, inp.priceMap.get(code)),
            B(`${swap.code} is a stronger company in the same business.`, `একই ব্যবসায় ${swap.code} বেশি শক্তিশালী কোম্পানি।`),
            stepLine,
          ])
        : join([same(reasonOf.get(code) ?? h.signal.reason), stepLine]);
    act.push({ code: h.code, name: nameOf(h), action, label: ACTION_WORD[action], tone: ACTION_TONE[action], line, step });
  }
  act.sort((a, b) => ACTION_ORDER[a.action] - ACTION_ORDER[b.action] || (a.step ?? 9) - (b.step ?? 9));
  return { act, rest };
}

// ── Chapter 4 · watch ──────────────────────────────────────────────────────

function watchChapter(inp: ReportInput, f: Facts, light: { word: Bi; tone: Tone; count: number }): PfChapter {
  // Is any share marked Sell? Premium since 2026-11-01: Buy more / Sell shows
  // only in the portfolio's Premium sections (the holding cards dropped the chip).
  const sell: PfRow = {
    key: "sell",
    title: B("Is any share marked Sell?", "কোনো শেয়ারে কি বিক্রির সংকেত?"),
    word: f.sells.length === 0 ? B("None", "কোনোটিতে নয়") : f.sells.length === 1 ? same(f.sells[0].code) : B(`${f.sells.length} shares`, `${f.sells.length}টি শেয়ার`),
    tone: f.sells.length ? "bad" : "good",
    headline:
      f.sells.length === 0
        ? B("None of your shares is marked Sell today.", "আজ আপনার কোনো শেয়ারে বিক্রির সংকেত নেই।")
        : B(
            `${names(f.sells).en} ${f.sells.length === 1 ? "is" : "are"} marked Sell, with ${takaGroup(f.sells.reduce((a, h) => a + valueOf(h), 0))} in ${f.sells.length === 1 ? "it" : "them"}.`,
            `${names(f.sells).bn}-এ বিক্রির সংকেত, এতে আছে ${takaGroup(f.sells.reduce((a, h) => a + valueOf(h), 0))}।`,
          ),
    meaning: f.sells.length
      ? [
          B(
            "A Sell mark goes away when the company climbs back to “Mixed” or better on our checks. Selling is always your call.",
            "কোম্পানি আমাদের যাচাইয়ে আবার “মিশ্র” বা তার ওপরে উঠলে বিক্রির সংকেত চলে যায়। বিক্রি করবেন কি না, সিদ্ধান্ত সবসময় আপনার।",
          ),
        ]
      : [],
    watch: null,
    picture: null,
    figures: f.hs
      .filter((h) => h.signal.signal !== "none")
      .map((h) => ({
        key: h.code,
        code: h.code,
        label: same(nameOf(h)),
        value: h.signal.signal === "sell" ? B("Sell", "বিক্রি")
          : h.signal.signal === "trim" ? B("Trim", "কিছুটা কমান")
          : h.signal.signal === "review" ? B("Read the warning", "সতর্কতাটি পড়ুন")
          : B("Buy more", "আরও কেনা যায়"),
        tone: (h.signal.signal === "sell" ? "bad" : h.signal.signal === "buy_more" ? "good" : "fair") as Tone,
      })),
    // Why each share is marked Sell, shown open (2026-11-04).
    points: f.sells.slice(0, 3).map((h) => {
      const g = inp.glance.get(h.code.toUpperCase())?.signal;
      return g?.reason_en ? B(`${nameOf(h)}: ${g.reason_en}`, `${nameOf(h)}: ${g.reason_bn || g.reason_en}`) : same(`${nameOf(h)}: ${h.signal.reason}`);
    }),
  };

  // Any warning signs? (the stock report's red flags on each share)
  const risks = f.hs.flatMap((h) =>
    (inp.glance.get(h.code.toUpperCase())?.risks ?? []).map((r) => ({ h, r })),
  );
  const warn: PfRow = {
    key: "warn",
    title: B("Any warning signs?", "কোনো সতর্কসংকেত?"),
    word: f.serious.length
      ? B(`${f.serious.length} serious`, `${f.serious.length}টি গুরুতর`)
      : f.amber > 0
        ? B(`${f.amber} small thing${f.amber === 1 ? "" : "s"}`, `${f.amber}টি ছোট বিষয়`)
        : B("Nothing serious", "গুরুতর কিছু নেই"),
    tone: f.serious.length ? "bad" : f.amber > 0 ? "fair" : "good",
    headline: f.serious.length
      ? join(f.serious.slice(0, 3).map((s) => B(`${nameOf(s.h)}: ${lowerFirst(s.lines[0].en)}`, `${nameOf(s.h)}: ${s.lines[0].bn}`)))
      : f.amber > 0
        ? B(`Nothing seriously wrong. We found ${f.amber} smaller thing${f.amber === 1 ? "" : "s"} worth a look.`, `গুরুতর কিছু নেই। দেখার মতো ${f.amber}টি ছোট বিষয় পেয়েছি।`)
        : B("Nothing seriously wrong on any of your shares.", "আপনার কোনো শেয়ারে গুরুতর কিছু নেই।"),
    meaning: [],
    watch: null,
    picture: null,
    figures: [],
    points: risks.slice(0, 5).map(({ h, r }) => B(`${nameOf(h)}: ${r.en}.`, `${nameOf(h)}: ${r.bn}।`)),
  };

  // What changed this week?
  const weekAgo = new Date(Date.parse(`${inp.today}T00:00:00Z`) - 7 * 86_400_000).toISOString().slice(0, 10);
  const week = inp.watch.filter((e) => e.day >= weekAgo);
  const flips = inp.flips.filter((e) => (e.changed_at ?? "").slice(0, 10) >= weekAgo);
  const open = week.filter((e) => e.free);
  const closed = week.filter((e) => !e.free);
  const changed: PfRow = {
    key: "changed",
    title: B("What changed this week?", "এ সপ্তাহে কী বদলেছে?"),
    word: week.length + flips.length === 0 ? B("Quiet week", "শান্ত সপ্তাহ") : B(`${week.length + flips.length} update${week.length + flips.length === 1 ? "" : "s"}`, `${week.length + flips.length}টি আপডেট`),
    tone: "neutral",
    headline:
      week.length + flips.length === 0
        ? B("Nothing new on your shares in the last 7 days.", "গত 7 দিনে আপনার শেয়ারে নতুন কিছু নেই।")
        : null,
    meaning: [],
    watch: null,
    picture: null,
    figures: [],
    // One list, at most six lines (2026-11-04): the move since the last
    // visit, then the week's updates and mark changes.
    points: [
      ...(inp.sinceLast && Math.abs(inp.sinceLast.delta) >= 1
        ? [
            inp.sinceLast.delta > 0
              ? B(`Since your last visit, your money rose ${takaGroup(inp.sinceLast.delta)}.`, `আগের বার আসার পর আপনার টাকা বেড়েছে ${takaGroup(inp.sinceLast.delta)}।`)
              : B(`Since your last visit, your money fell ${takaGroup(-inp.sinceLast.delta)}.`, `আগের বার আসার পর আপনার টাকা কমেছে ${takaGroup(-inp.sinceLast.delta)}।`),
          ]
        : []),
      ...open.filter((e) => e.kind !== "answer" && e.kind !== "buylist").map((e) => B(`${e.title_en}. ${e.body_en}`, `${e.title_bn}। ${e.body_bn}`)),
      ...flips.slice(0, 3).map((e) =>
        e.signal === "sell"
          ? B(`${e.trading_code} is now marked Sell.`, `${e.trading_code}-এ এখন বিক্রির সংকেত।`)
          : e.signal === "buy_more"
            ? B(`${e.trading_code} is now marked Buy more.`, `${e.trading_code}-এ এখন আরও কেনার সংকেত।`)
            : e.signal === "trim"
              ? B(`${e.trading_code} is now marked Trim.`, `${e.trading_code}-এ এখন কিছুটা কমানোর সংকেত।`)
              : e.signal === "review"
                ? B(`${e.trading_code} now has a warning to read.`, `${e.trading_code}-এ এখন একটি সতর্কতা পড়ার আছে।`)
            : B(`${e.trading_code} no longer has a signal.`, `${e.trading_code}-এ এখন কোনো সংকেত নেই।`),
      ),
      ...closed.map((e) => B(`${e.title_en}. ${e.body_en}`, `${e.title_bn}। ${e.body_bn}`)),
    ].slice(0, 6),
  };

  // What's coming up? (dates are public; what results must show is Premium)
  const held = new Map(f.hs.map((h) => [h.code.toUpperCase(), h]));
  type Date_ = { key: string; date: string; name: Bi; line: Bi; locked: Bi | null };
  const dates: Date_[] = [];
  for (const h of f.hs) {
    const ev = inp.glance.get(h.code.toUpperCase())?.event;
    if (!ev || ev.days_left == null || ev.days_left < 0 || ev.days_left > 30) continue;
    if (ev.kind === "record") {
      const cash = ev.cash_per_share ? ev.cash_per_share * h.qty : null;
      dates.push({
        key: `r-${h.code}`,
        date: ev.date,
        name: B(`${h.code} record date`, `${h.code} রেকর্ড ডেট`),
        line: cash
          ? B(`${takaGroup(cash)} before tax is coming on your ${h.qty} shares.`, `আপনার ${h.qty}টি শেয়ারে কর কাটার আগে আসছে ${takaGroup(cash)}।`)
          : ev.stock_pct
            ? B(`${ev.stock_pct}% bonus shares.`, `${ev.stock_pct}% বোনাস শেয়ার।`)
            : B("Dividend record date.", "ডিভিডেন্ডের রেকর্ড ডেট।"),
        locked: null,
      });
    } else {
      dates.push({ key: `a-${h.code}`, date: ev.date, name: B(`${h.code} AGM`, `${h.code} এজিএম`), line: B("The yearly meeting, where the dividend is voted on.", "বার্ষিক সভা, যেখানে ডিভিডেন্ড অনুমোদন হয়।"), locked: null });
    }
  }
  for (const m of inp.results) {
    const h = held.get(m.code.toUpperCase());
    if (!h || m.days < 0 || m.days > 14) continue;
    const exp =
      m.better_above != null && m.weaker_below != null
        ? B(
            `Profit above ৳${m.better_above.toFixed(2)} a share reads better; under ৳${m.weaker_below.toFixed(2)} reads weaker.`,
            `শেয়ারপ্রতি মুনাফা ৳${m.better_above.toFixed(2)}-এর বেশি হলে ভালো, ৳${m.weaker_below.toFixed(2)}-এর কম হলে দুর্বল।`,
          )
        : m.expect_en.length
          ? B(m.expect_en[0], m.expect_bn[0] || m.expect_en[0])
          : null;
    // "GP Q3 results · Thu 6 Nov · what it must show" (2026-11-04)
    dates.push({ key: `m-${h.code}`, date: m.date, name: B(`${h.code} ${m.label_en}`, `${h.code} ${m.label_bn || m.label_en}`), line: B("", ""), locked: exp });
  }
  dates.sort((x, y) => x.date.localeCompare(y.date));
  const coming: PfRow = {
    key: "coming",
    title: B("What's coming up?", "সামনে কী আছে?"),
    word: dates.length ? B(`${dates.length} date${dates.length === 1 ? "" : "s"}`, `${dates.length}টি তারিখ`) : B("Nothing soon", "শিগগিরই কিছু নেই"),
    tone: "neutral",
    headline: dates.length ? null : B("No record dates, meetings or results on your shares in the next 30 days.", "আগামী 30 দিনে আপনার শেয়ারে কোনো রেকর্ড ডেট, সভা বা ফল নেই।"),
    meaning: [],
    watch: null,
    // The dates are the list itself (2026-11-04: the date-line picture
    // repeated them); what a results day must show rides on its own line.
    picture: null,
    figures: [],
    points: dates.slice(0, 6).map((d) => {
      const tail = d.line.en ? d.line : d.locked;
      return join([d.name, B("·", "·"), dayWords(d.date), ...(tail ? [B("·", "·"), tail] : [])]);
    }),
  };

  const rows = [sell, warn, changed, coming];
  return {
    key: "watch",
    id: "ch-watch",
    title: B("What should you watch?", "কোথায় নজর রাখবেন?"),
    head: {
      word: light.word,
      tone: light.tone,
      line:
        // No Sell marks named here: the head is free (2026-11-01).
        f.serious.length
          ? B(`${names(f.serious.map((s) => s.h)).en}: a serious warning`, `${names(f.serious.map((s) => s.h)).bn}: গুরুতর সতর্কতা`)
          : light.count
            ? B(`${light.count} share${light.count === 1 ? "" : "s"} to decide on`, `${light.count}টি শেয়ার নিয়ে সিদ্ধান্ত নিতে হবে`)
            : B("No serious warnings", "গুরুতর সতর্কতা নেই"),
    },
    rows,
  };
}

// ── The plan ───────────────────────────────────────────────────────────────

function buildPlan(inp: ReportInput): PfPlan {
  const en = [inp.next.en.first, ...inp.next.en.more];
  const bn = [inp.next.bn.first, ...inp.next.bn.more];
  const moves: PfPlanItem[] = en
    .map((m, i) => ({ m, b: bn[i] ?? m }))
    .filter(({ m }) => m.kind !== "none")
    .map(({ m, b }) => ({
      key: m.kind,
      title: B(m.title, b.title),
      line: B(m.line, b.line),
      amount: m.amount,
      tone: (m.kind === "sell" || m.kind === "weak" ? "bad" : "fair") as Tone,
    }));
  const lifts: PfPlanItem[] = inp.lifts.slice(0, 3).map((l, i) => ({
    key: `lift-${i}`,
    title: same(l.label),
    line: B(`Your grade goes from ${l.fromGrade} to ${l.toGrade}.`, `আপনার গ্রেড ${l.fromGrade} থেকে ${l.toGrade} হয়।`),
    tag: same(`${l.fromGrade} → ${l.toGrade}`),
    tone: "good" as Tone,
  }));
  const buys: PfPlanItem[] = inp.plan.picks.slice(0, 3).map((p) => ({
    key: p.code,
    code: p.code,
    title: same(companyShort(p.companyName) || p.code),
    line: same(p.why),
    tag: same(p.tag),
    amount: p.suggest?.amount ?? null,
    tone: "good" as Tone,
  }));
  const each: PfPlanItem[] = inp.pro.actions.map((a) => ({
    key: a.code,
    code: a.code,
    title: same(companyShort(a.companyName) || a.code),
    line: same(a.reason),
    tag: same(a.label),
    tone: (a.kind === "sell" ? "bad" : a.kind === "trim" ? "fair" : a.kind === "buy_more" ? "good" : "neutral") as Tone,
  }));
  return {
    moves,
    lifts,
    buys,
    each,
    buyNone: buys.length ? null : inp.plan.noneReason ? same(inp.plan.noneReason) : null,
  };
}

// ── The Premium card's findings ────────────────────────────────────────────

/** What the full check found on this portfolio, as counts (2026-11-02, user:
 *  "use sentence like: found 4 stocks you can add to make your portfolio
 *  strong / found 5 risk factor"). Each finding says how many and what
 *  Premium shows about it, never which share or what to do. Most important
 *  first, at most six; a healthy portfolio still gets three. */
function buildFindings(inp: ReportInput, f: Facts, lights: PfLight[], issue: SpreadIssue, plan: PfPlan, lf: LossFacts | null): PfFinding[] {
  const out: (PfFinding & { weight: number })[] = [];
  const add = (key: PfFinding["key"], weight: number, title: Bi, line: Bi) => out.push({ key, weight, title, line });
  const s = (n: number) => (n === 1 ? "" : "s");

  const decide = new Set([...f.sells.map((h) => h.code), ...f.serious.map((x) => x.h.code)]).size;
  if (decide) {
    add(
      "decide",
      f.sellPct > 10 || f.seriousPct > 10 ? 95 : 86,
      B(
        `${decide} of your shares ${decide === 1 ? "needs" : "need"} a decision: keep, buy more or sell.`,
        `আপনার ${decide}টি শেয়ার নিয়ে সিদ্ধান্ত নিতে হবে: রাখবেন, আরও কিনবেন, নাকি বিক্রি করবেন।`,
      ),
      B("Our call on each one, and the reason in plain words.", "প্রতিটি নিয়ে আমাদের মত, আর তার কারণ সহজ ভাষায়।"),
    );
  }

  const serious = f.serious.reduce((a, x) => a + x.lines.length, 0);
  const warnings = serious + f.amber;
  if (warnings) {
    add(
      "warn",
      serious ? 90 : 62,
      serious === warnings
        ? B(`We found ${serious} serious warning${s(serious)} on your shares.`, `আপনার শেয়ারে ${serious}টি গুরুতর সতর্কসংকেত পেয়েছি।`)
        : serious
          ? B(`We found ${warnings} warnings on your shares, ${serious} of them serious.`, `আপনার শেয়ারে ${warnings}টি সতর্কসংকেত পেয়েছি, এর ${serious}টি গুরুতর।`)
          : B(`We found ${warnings} smaller warning${s(warnings)} on your shares.`, `আপনার শেয়ারে ${warnings}টি ছোট সতর্কসংকেত পেয়েছি।`),
      B("Which share each one is on, and what it means for your money.", "কোনটি কোন শেয়ারে, আর তাতে আপনার টাকার কী হতে পারে।"),
    );
  }

  if (lf) {
    const n = lf.items.length;
    const worse = lf.items.filter((x) => x.kind === "worse").length;
    add(
      "loss",
      worse ? 85 : 80,
      n === 1
        ? B(`One of your shares is below what you paid, ${takaGroup(lf.down)} in all.`, `আপনার একটি শেয়ার কেনা দামের নিচে, মোট ${takaGroup(lf.down)} কম।`)
        : B(`${n} of your shares are below what you paid, ${takaGroup(lf.down)} in all.`, `আপনার ${n}টি শেয়ার কেনা দামের নিচে, সব মিলিয়ে ${takaGroup(lf.down)} কম।`),
      B(
        "Whether it's the company or only the price, the price that gets your money back, and what buying more would do.",
        "সমস্যা কোম্পানিতে নাকি শুধু দামে, কোন দামে টাকা ফিরবে, আর আরও কিনলে কী হবে।",
      ),
    );
  }

  const picks = inp.plan.picks.length;
  if (picks) {
    add(
      "add",
      inp.plan.gaps.length ? 87 : 78,
      B(
        `We found ${picks} share${s(picks)} you can add to make your portfolio stronger.`,
        `আপনার পোর্টফোলিও আরও শক্তিশালী করতে ${picks}টি শেয়ার পেয়েছি, যেগুলো কিনতে পারেন।`,
      ),
      B("Each one passed our safety checks, with how much to put in.", "প্রতিটি আমাদের নিরাপত্তা যাচাই পেরিয়েছে, সঙ্গে কত টাকা রাখবেন তাও।"),
    );
  }

  if (f.weak.length) {
    const n = f.weak.length;
    const money = takaGroup(f.weak.reduce((a, h) => a + valueOf(h), 0));
    add(
      "weak",
      84,
      B(
        `${n} of your companies ${n === 1 ? "is" : "are"} weak on our checks, with ${money} of your money in ${n === 1 ? "it" : "them"}.`,
        `আপনার ${n}টি কোম্পানি আমাদের যাচাইয়ে দুর্বল, এগুলোতে আছে আপনার ${money}।`,
      ),
      B("Which ones, and a stronger company in the same business.", "কোনগুলো, আর একই ব্যবসার কোন কোম্পানি বেশি শক্তিশালী।"),
    );
  }

  const lift = inp.analysis.grade !== "A" ? inp.lifts[0] : undefined;
  if (lift) {
    add(
      "grade",
      82,
      B(`One change can lift your grade from ${lift.fromGrade} to ${lift.toGrade}.`, `একটি বদলেই আপনার গ্রেড ${lift.fromGrade} থেকে ${lift.toGrade} হতে পারে।`),
      B("Which change, and what it does to your money.", "কোন বদল, আর তাতে আপনার টাকার কী হয়।"),
    );
  }

  if (issue.kind !== "none") {
    const title =
      issue.kind === "stock"
        ? B("Too much of your money rides on one share.", "আপনার টাকার বড় অংশ একটি শেয়ারের ওপর নির্ভর করছে।")
        : issue.kind === "sector"
          ? B("Too much of your money sits in one kind of business.", "আপনার টাকার বড় অংশ একই ধরনের ব্যবসায়।")
          : issue.kind === "finance"
            ? B("Too much of your money sits in banks and finance companies.", "আপনার টাকার বড় অংশ ব্যাংক আর আর্থিক প্রতিষ্ঠানে।")
            : B(`Your money is in only ${f.n} share${s(f.n)}, too few to be safe.`, `আপনার টাকা মাত্র ${f.n}টি শেয়ারে, নিরাপদ থাকার জন্য যা খুব কম।`);
    add("spread", issue.tone === "bad" ? 83 : 70, title, B("How much to move, and where to.", "কত টাকা সরাবেন, আর কোথায়।"));
  }

  if (plan.moves.length) {
    const n = plan.moves.length;
    const first = plan.moves[0].amount;
    add(
      "moves",
      66,
      first != null
        ? B(
            `Your plan has ${n} step${s(n)} to take first. The first one is about ${takaGroup(first)} of your money.`,
            `আপনার পরিকল্পনায় প্রথমে করার মতো ${n}টি পদক্ষেপ। প্রথমটি আপনার প্রায় ${takaGroup(first)} নিয়ে।`,
          )
        : B(`Your plan has ${n} step${s(n)} to take first.`, `আপনার পরিকল্পনায় প্রথমে করার মতো ${n}টি পদক্ষেপ।`),
      B("Each step in order, starting where the most money is at stake.", "প্রতিটি পদক্ষেপ ক্রম অনুযায়ী, যেখানে টাকা বেশি সেখান থেকে শুরু।"),
    );
  }

  const weekAgo = new Date(Date.parse(`${inp.today}T00:00:00Z`) - 7 * 86_400_000).toISOString().slice(0, 10);
  const week =
    inp.watch.filter((e) => e.day >= weekAgo).length + inp.flips.filter((e) => (e.changed_at ?? "").slice(0, 10) >= weekAgo).length;
  if (week) {
    add(
      "week",
      60,
      B(`We flagged ${week} thing${s(week)} on your shares in the last 7 days.`, `গত 7 দিনে আপনার শেয়ারে ${week}টি বিষয় চিহ্নিত করেছি।`),
      B("Each one, and what it means for you.", "প্রতিটি কী, আর আপনার জন্য তার মানে কী।"),
    );
  }

  const over = f.hs.filter((h) => h.entryPe != null && h.entryPe > 0 && h.entryValuation === "expensive").length;
  if (over) {
    add(
      "paid",
      58,
      B(`You paid a high price for ${over} of your shares.`, `আপনার ${over}টি শেয়ার বেশি দামে কেনা।`),
      B("Which ones, what each costs today, and what they are worth.", "কোনগুলো, আজ প্রতিটির দাম কেমন, আর সেগুলোর ন্যায্য দাম কত।"),
    );
  }

  const cash = f.hs.reduce((a, h) => {
    const ev = inp.glance.get(h.code.toUpperCase())?.event;
    const soon = ev?.kind === "record" && ev.cash_per_share && ev.days_left != null && ev.days_left >= 0 && ev.days_left <= 30;
    return soon ? a + (ev.cash_per_share as number) * h.qty : a;
  }, 0);
  if (cash >= 1) {
    add(
      "cash",
      52,
      B(`${takaGroup(cash)} in dividends, before tax, is coming to you in the next 30 days.`, `আগামী 30 দিনে কর কাটার আগে আপনার কাছে ${takaGroup(cash)} ডিভিডেন্ড আসছে।`),
      B("Whether each company can keep paying it.", "প্রতিটি কোম্পানি এভাবে দিয়ে যেতে পারবে কি না।"),
    );
  }

  const held = new Set(f.hs.map((h) => h.code.toUpperCase()));
  const results = inp.results.filter((m) => held.has(m.code.toUpperCase()) && m.days >= 0 && m.days <= 7).length;
  if (results) {
    add(
      "results",
      50,
      B(`${results} of your shares ${results === 1 ? "posts" : "post"} results this week.`, `এ সপ্তাহে আপনার ${results}টি শেয়ারের আর্থিক ফল আসছে।`),
      B("What each result must show to read better or weaker.", "কত মুনাফা হলে ফল ভালো, কত হলে দুর্বল।"),
    );
  }

  add(
    "each",
    40,
    f.n === 1
      ? B("We wrote what to do with your share.", "আপনার শেয়ারটি নিয়ে কী করবেন, তা লিখেছি।")
      : B(`We wrote what to do with each of your ${f.n} shares.`, `আপনার ${f.n}টি শেয়ারের প্রতিটি নিয়ে কী করবেন, তা লিখেছি।`),
    B("Keep, buy more, take some profit or sell, share by share.", "রাখবেন, আরও কিনবেন, কিছু লাভ তুলবেন, নাকি বিক্রি করবেন, প্রতিটি শেয়ার ধরে।"),
  );
  const companies = lights.find((l) => l.key === "companies");
  if (out.length < 3 && companies?.tone === "good" && f.n > 1) {
    const good = f.hs.filter((h) => GOOD_TIERS.has(h.tierKey)).length;
    add(
      "strong",
      35,
      B(`${good} of your ${f.n} companies are strong on our checks.`, `আপনার ${f.n}টি কোম্পানির ${good}টি আমাদের যাচাইয়ে শক্তিশালী।`),
      B("What keeps each one strong, and what would change it.", "প্রতিটি কেন শক্তিশালী, আর কী হলে তা বদলাবে।"),
    );
  }
  if (out.length < 3) {
    add(
      "daily",
      30,
      B(`We check your ${f.n === 1 ? "share" : `${f.n} shares`} every day after the close.`, `প্রতিদিন বাজার বন্ধের পর আপনার ${f.n}টি শেয়ার যাচাই করি।`),
      B("What changed and what it means, the same day.", "কী বদলাল আর তার মানে কী, সেদিনই।"),
    );
  }

  return out
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6)
    .map(({ weight: _w, ...x }) => x);
}

// ── The Premium card's lead (2026-11-04) ───────────────────────────────────

/** A record-date event's taka on the reader's shares ("৳1,240 cash on your …"). */
const recordCash = (e: PortfolioWatchEvent): number => {
  const m = e.body_en.match(/৳([\d,]+(?:\.\d+)?) cash on your/);
  return m ? Number(m[1].replace(/,/g, "")) || 0 : 0;
};

/** The kinds of one day, in words: counts and taka, never a share's name. */
function kindPhrase(kind: PortfolioWatchEvent["kind"] | "flip", n: number, cash: number): Bi {
  const one = n === 1;
  switch (kind) {
    case "results":
      return B(`results on ${n} of your shares`, `আপনার ${n}টি শেয়ারের আর্থিক ফল`);
    case "record":
      return cash >= 1
        ? one
          ? B(`a record date, ${takaGroup(cash)} coming to you`, `রেকর্ড ডেট, আপনার কাছে আসছে ${takaGroup(cash)}`)
          : B(`${n} record dates, ${takaGroup(cash)} coming to you`, `${n}টি রেকর্ড ডেট, আপনার কাছে আসছে ${takaGroup(cash)}`)
        : one
          ? B("a record date", "রেকর্ড ডেট")
          : B(`${n} record dates`, `${n}টি রেকর্ড ডেট`);
    case "red_flag":
      return one ? B("a serious warning", "একটি গুরুতর সতর্কতা") : B(`${n} serious warnings`, `${n}টি গুরুতর সতর্কতা`);
    case "grade":
      return one ? B("a grade change", "একটি গ্রেড বদল") : B(`${n} grade changes`, `${n}টি গ্রেড বদল`);
    case "category":
      return one ? B("a DSE category change", "একটি ক্যাটাগরি বদল") : B(`${n} DSE category changes`, `${n}টি ক্যাটাগরি বদল`);
    case "drop":
      return one ? B("a big one-day fall", "একদিনে বড় দরপতন") : B(`big one-day falls on ${n} shares`, `${n}টি শেয়ারে একদিনে বড় দরপতন`);
    case "low52":
      return one ? B("a fall to the yearly low", "বছরের সর্বনিম্ন দামে নামা") : B(`${n} shares at their yearly low`, `${n}টি শেয়ার বছরের সর্বনিম্ন দামে`);
    case "answer":
      return one ? B("a change in our answer", "আমাদের উত্তরে একটি বদল") : B(`${n} changes in our answer`, `আমাদের উত্তরে ${n}টি বদল`);
    case "buylist":
      return one ? B("a change on the buy list", "কেনার তালিকায় একটি বদল") : B(`${n} changes on the buy list`, `কেনার তালিকায় ${n}টি বদল`);
    case "breakeven":
      return one ? B("a share back to your price", "একটি শেয়ার কেনা দামে ফিরেছে") : B(`${n} shares back to your price`, `${n}টি শেয়ার কেনা দামে ফিরেছে`);
    default:
      return one ? B("a new call on one of your shares", "আপনার একটি শেয়ারে নতুন সিদ্ধান্ত") : B(`new calls on ${n} of your shares`, `আপনার ${n}টি শেয়ারে নতুন সিদ্ধান্ত`);
  }
}

const upperFirst = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const LEVEL_TONE: Record<PortfolioWatchEvent["level"], Tone> = { good: "good", watch: "fair", bad: "bad" };
const TONE_RANK: Record<Tone, number> = { bad: 0, fair: 1, neutral: 2, good: 3 };

/** Which answer opens for each finding (the free answer, once a month). */
function tasteRow(key: PfFinding["key"], f: Facts, issue: SpreadIssue, rowOf: (c: ChapterKey, r: string) => PfRow | null): PfRow | null {
  switch (key) {
    case "decide":
      return f.sells.length ? rowOf("watch", "sell") : rowOf("watch", "warn");
    case "warn":
      return rowOf("watch", "warn");
    case "loss":
      return rowOf("loss", "why");
    case "weak":
    case "strong":
    case "each":
    case "daily":
      return rowOf("companies", "strength");
    case "spread":
      return issue.kind === "stock" ? rowOf("spread", "one") : issue.kind === "few" ? rowOf("spread", "carry") : rowOf("spread", "sector");
    case "week":
      return rowOf("watch", "changed");
    case "paid":
      return rowOf("prices", "paid");
    case "cash":
      return rowOf("companies", "pay");
    case "results":
      return rowOf("watch", "coming");
    default:
      // "add", "grade", "moves" live in the plan, not in a question row.
      return null;
  }
}

function buildPromo(
  inp: ReportInput,
  f: Facts,
  issue: SpreadIssue,
  chapters: PfChapter[],
  findings: PfFinding[],
  lights: PfLight[],
): PfPromo {
  // Money that needs a look: Sell marks, serious warnings, weak companies.
  const stake = new Map<string, HoldingInsight>();
  for (const h of [...f.sells, ...f.serious.map((s) => s.h), ...f.weak]) stake.set(h.code, h);
  const stakeAmount = [...stake.values()].reduce((a, h) => a + valueOf(h), 0);
  const atStake = stakeAmount >= 1 ? { amount: stakeAmount, shares: stake.size } : null;

  const areas = lights.map((l) => l.tone).sort((x, y) => TONE_RANK[x] - TONE_RANK[y]);

  // The nearest real deadline in the next 7 days: results, or a record date.
  const held = new Set(f.hs.map((h) => h.code.toUpperCase()));
  const results = inp.results.filter((m) => held.has(m.code.toUpperCase()) && m.days >= 0 && m.days <= 7);
  const records = f.hs
    .map((h) => {
      const ev = inp.glance.get(h.code.toUpperCase())?.event;
      return ev?.kind === "record" && ev.days_left != null && ev.days_left >= 0 && ev.days_left <= 7
        ? { date: ev.date, cash: (ev.cash_per_share ?? 0) * h.qty }
        : null;
    })
    .filter(Boolean) as { date: string; cash: number }[];
  const firstResult = results.map((m) => m.date).sort()[0] ?? null;
  const firstRecord = records.map((r) => r.date).sort()[0] ?? null;
  let soon: Bi | null = null;
  if (firstResult && (!firstRecord || firstResult <= firstRecord)) {
    const last = dayWords(results.map((m) => m.date).sort().slice(-1)[0]);
    soon =
      results.length === 1
        ? B(`One of your shares posts results on ${last.en}. What it needs to show is in Premium.`, `${last.bn} আপনার একটি শেয়ারের আর্থিক ফল আসছে। কত মুনাফা হলে ফল ভালো, তা প্রিমিয়ামে।`)
        : B(`${results.length} of your shares post results by ${last.en}. What they need to show is in Premium.`, `${last.bn}-এর মধ্যে আপনার ${results.length}টি শেয়ারের আর্থিক ফল আসছে। কত মুনাফা হলে ফল ভালো, তা প্রিমিয়ামে।`);
  } else if (firstRecord) {
    const cash = records.reduce((a, r) => a + r.cash, 0);
    const when = dayWords(firstRecord);
    const money = cash >= 1 ? B(`, ${takaGroup(cash)} coming to you`, `, আপনার কাছে আসছে ${takaGroup(cash)}`) : B("", "");
    soon =
      records.length === 1
        ? B(
            `A record date on one of your shares falls on ${when.en}${money.en}. Whether the company can keep paying is in Premium.`,
            `${when.bn} আপনার একটি শেয়ারের রেকর্ড ডেট${money.bn}। কোম্পানিটি এভাবে দিয়ে যেতে পারবে কি না, তা প্রিমিয়ামে।`,
          )
        : B(
            `${records.length} of your shares have a record date from ${when.en}${money.en}. Whether each company can keep paying is in Premium.`,
            `${when.bn} থেকে আপনার ${records.length}টি শেয়ারের রেকর্ড ডেট${money.bn}। প্রতিটি কোম্পানি এভাবে দিয়ে যেতে পারবে কি না, তা প্রিমিয়ামে।`,
          );
  }

  // What the watcher flagged in the last 30 days, by day.
  const since = new Date(Date.parse(`${inp.today}T00:00:00Z`) - 30 * 86_400_000).toISOString().slice(0, 10);
  type Item = { kind: PortfolioWatchEvent["kind"] | "flip"; tone: Tone; cash: number };
  const byDay = new Map<string, Item[]>();
  const push = (day: string, it: Item) => byDay.set(day, [...(byDay.get(day) ?? []), it]);
  for (const e of inp.watch) {
    if (e.day < since) continue;
    push(e.day, { kind: e.kind, tone: LEVEL_TONE[e.level] ?? "neutral", cash: e.kind === "record" ? recordCash(e) : 0 });
  }
  for (const e of inp.flips) {
    const day = (e.changed_at ?? "").slice(0, 10);
    if (!day || day < since) continue;
    push(day, { kind: "flip", tone: e.signal === "sell" ? "bad" : "fair", cash: 0 });
  }
  const days: PfMissedDay[] = [...byDay.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([day, items]) => {
      const kinds = new Map<Item["kind"], { n: number; cash: number }>();
      for (const it of items) {
        const k = kinds.get(it.kind) ?? { n: 0, cash: 0 };
        kinds.set(it.kind, { n: k.n + 1, cash: k.cash + it.cash });
      }
      const parts = [...kinds.entries()].map(([k, v]) => kindPhrase(k, v.n, v.cash));
      const text = join(parts, ", ", ", ");
      return {
        day,
        text: { en: upperFirst(text.en), bn: text.bn },
        tone: items.map((i) => i.tone).sort((x, y) => TONE_RANK[x] - TONE_RANK[y])[0] ?? "neutral",
      };
    });
  const total = [...byDay.values()].reduce((a, xs) => a + xs.length, 0);

  // The answers a free reader may open, one a month, in the findings' order.
  const rowOf = (c: ChapterKey, r: string) => chapters.find((ch) => ch.key === c)?.rows.find((x) => x.key === r) ?? null;
  const seen = new Set<string>();
  const tastes: PfTaste[] = [];
  for (const fi of findings) {
    const row = tasteRow(fi.key, f, issue, rowOf);
    if (!row || seen.has(row.key) || (!row.headline && !row.points.length)) continue;
    seen.add(row.key);
    tastes.push({ finding: fi.key, title: fi.title, row });
  }

  return { atStake, areas, soon, missed: { total, days }, tastes };
}
