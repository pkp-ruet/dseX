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
import { TIER_LABELS, TIER_PILL_BN } from "@/lib/constants";
import {
  isFinancialSector,
  type Grade,
  type HoldingInsight,
  type PortfolioAnalysis,
  type RebalancePlan,
} from "@/lib/portfolio-analysis";
import type { GradeLift, NextMove } from "@/lib/portfolio-next";
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

export interface PortfolioReport {
  answer: PfAnswer;
  chapters: PfChapter[];
  plan: PfPlan;
  /** What the full check found, counted (the Premium card). */
  findings: PfFinding[];
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
    if (f.top.weightPct > 40) issues.push({ kind: "stock", tone: "bad" });
    else if (f.top.weightPct > 25) issues.push({ kind: "stock", tone: "fair" });
  }
  if (f.topSector && f.n > 1) {
    if (f.topSector.pct > 60) issues.push({ kind: "sector", tone: "bad" });
    else if (f.topSector.pct > 40) issues.push({ kind: "sector", tone: "fair" });
  }
  if (f.finPct > 50 && f.finSectors >= 2 && !(f.topSector && f.topSector.pct > 40)) issues.push({ kind: "finance", tone: "fair" });
  if (f.n >= 3 && f.n < 5) issues.push({ kind: "few", tone: "fair" });
  const rank = { bad: 0, fair: 1, good: 2, neutral: 3 } as const;
  issues.sort((a, b) => rank[a.tone] - rank[b.tone]);
  return issues[0] ?? { kind: "none", tone: "good" };
}

function companiesLight(f: Facts): { word: Bi; tone: Tone } {
  if (f.weakPct > 30 || f.goodPct < 40) return { word: B("Weak", "দুর্বল"), tone: "bad" };
  if (f.goodPct >= 80 && f.weakPct === 0) return { word: B("Strong", "শক্তিশালী"), tone: "good" };
  if (f.goodPct >= 60 && f.weakPct <= 10) return { word: B("Mostly strong", "বেশিরভাগ শক্তিশালী"), tone: "good" };
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

function pricesLight(a: PortfolioAnalysis): { word: Bi; tone: Tone } {
  if (a.breakdown.judgeablePct < 30) return { word: B("Can't tell yet", "এখনো বলা যায় না"), tone: "neutral" };
  const e = a.subScores.entry;
  if (e >= 7) return { word: B("Low", "কম"), tone: "good" };
  if (e >= 5) return { word: B("Fair", "ন্যায্য"), tone: "good" };
  if (e >= 3.5) return { word: B("A bit high", "একটু বেশি"), tone: "fair" };
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
    { key: "prices", label: B("Prices you paid", "কেনার দাম"), ...pl, href: "#ch-prices" },
    { key: "watch", label: B("To watch", "নজর রাখুন"), word: wl.word, tone: wl.tone, href: "#ch-watch" },
  ];

  const answer = buildAnswer(inp, f, lights, issue);
  const plan = buildPlan(inp);
  const findings = buildFindings(inp, f, lights, issue, plan, lf);
  const promo = buildPromo(inp, f, issue, chapters, findings, lights);
  const answered = chapters.reduce((acc, c) => acc + c.rows.length, 0) + 4;

  return { answer, chapters, plan, findings, promo, answered };
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
        ? B("You paid fair prices.", "ন্যায্য দামে কিনেছেন।")
        : lights[2].tone === "neutral"
          ? null
          : lights[2].tone === "fair"
            ? B("You paid a bit much for some shares.", "কিছু শেয়ারে একটু বেশি দাম দিয়েছেন।")
            : B("You paid high prices for most of it.", "বেশিরভাগ শেয়ারে বেশি দাম দিয়েছেন।"),
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
      "Strong companies, spread well and bought at fair prices. Nothing needs you today.",
      "শক্তিশালী কোম্পানি, ভালোভাবে ছড়ানো, ন্যায্য দামে কেনা। আজ আপনার কিছু করার নেই।",
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
  const oneTone: Tone = !top || f.n < 2 ? "neutral" : top.weightPct > 40 ? "bad" : top.weightPct > 25 ? "fair" : "good";
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
      top && top.weightPct > 25
        ? B(
            `Bringing ${top.code} down to a quarter frees about ${takaGroup(((top.weightPct - 25) / 100) * f.total)}.`,
            `${top.code} এক-চতুর্থাংশে নামালে প্রায় ${takaGroup(((top.weightPct - 25) / 100) * f.total)} খালি হয়।`,
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
  const secTone: Tone = !ts || secs.length < 2 ? (f.n > 1 ? "bad" : "neutral") : ts.weightPct > 60 ? "bad" : ts.weightPct > 40 || issue.kind === "finance" ? "fair" : "good";
  const move = ts && ts.weightPct > 40 ? ((ts.weightPct - 40) / 100) * f.total : f.finPct > 50 ? ((f.finPct - 50) / 100) * f.total : null;
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
          : ts.weightPct > 40
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
  const effTone: Tone = f.n < 2 ? "neutral" : eff >= 5 ? "good" : eff >= 3 ? "fair" : "bad";
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
  const judged = f.hs.filter((h) => h.entryPe != null && h.sectorPe != null && h.entryPe > 0 && h.entryValuation !== "unknown");
  const jw = judged.reduce((a, h) => a + h.weightPct, 0);
  const youPaid = jw > 0 ? judged.reduce((a, h) => a + (h.entryPe as number) * h.weightPct, 0) / jw : null;
  const similar = jw > 0 ? judged.reduce((a, h) => a + (h.sectorPe as number) * h.weightPct, 0) / jw : null;
  const over = judged.filter((h) => h.entryValuation === "expensive").sort((a, b) => b.weightPct - a.weightPct);
  const cheap = judged.filter((h) => h.entryValuation === "cheap");
  const paidTone: Tone = youPaid == null ? "neutral" : light.tone;
  const paid: PfRow = {
    key: "paid",
    title: B("Did you buy at fair prices?", "কি ন্যায্য দামে কিনেছেন?"),
    word: youPaid == null ? B("Can't tell yet", "এখনো বলা যায় না") : light.tone === "good" ? B("Yes", "হ্যাঁ") : light.word,
    tone: paidTone,
    headline:
      youPaid == null || similar == null
        ? null
        : join([
            B(
              `You paid about ${Math.round(youPaid)} years of their profit. Similar companies cost about ${Math.round(similar)}.`,
              `আপনি তাদের প্রায় ${Math.round(youPaid)} বছরের মুনাফার সমান দাম দিয়েছেন। একই ধরনের কোম্পানির দাম প্রায় ${Math.round(similar)} বছরের।`,
            ),
            over.length ? B(`You paid more than usual for ${names(over).en}.`, `${names(over).bn}-এ স্বাভাবিকের চেয়ে বেশি দিয়েছেন।`) : B("", ""),
          ]),
    meaning: [
      B(
        "The fewer years of profit you pay for, the more room the price has to grow, and the less a bad year hurts.",
        "যত কম বছরের মুনাফার সমান দাম দেবেন, দাম বাড়ার জায়গা তত বেশি, আর খারাপ বছরে ক্ষতি তত কম।",
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
          ? B("Bought cheap", "কম দামে কেনা")
          : h.entryValuation === "expensive"
            ? B("Paid more than usual", "স্বাভাবিকের চেয়ে বেশি দাম")
            : B("Fair price", "ন্যায্য দাম"),
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

  const rows = [paid, worth, topRow];
  return {
    key: "prices",
    id: "ch-prices",
    title: B("Did you pay fair prices?", "কি ন্যায্য দাম দিয়েছেন?"),
    head: {
      word: light.word,
      tone: light.tone,
      line:
        judged.length === 0
          ? B("Not enough profit figures to judge", "বিচার করার মতো মুনাফার হিসাব নেই")
          : over.length === 0
            ? B(`None of ${judged.length} was bought above its usual price`, `${judged.length}টির কোনোটিই স্বাভাবিকের চেয়ে বেশি দামে কেনা নয়`)
            : B(`${cheap.length + (judged.length - cheap.length - over.length)} of ${judged.length} bought at a fair price or less`, `${judged.length}টির ${cheap.length + (judged.length - cheap.length - over.length)}টি ন্যায্য বা কম দামে কেনা`),
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
/** A buy-more example never takes one share past this much of the money. */
const MORE_MAX_PCT = 25;

type LossKind = "price" | "mixed" | "worse";

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
  /** The price that gives the money back after fees, both sides. */
  even: number;
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
    const even = breakEven(h.buyPrice, fee);
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
            `${nameOf(one.h)} needs to rise ${pct(one.rise)}, to ${money(one.even)}, to give your money back after fees.`,
            `ফি দেওয়ার পর টাকা ফেরাতে ${nameOf(one.h)}-এর দাম ${pct(one.rise)} বাড়তে হবে, ${money(one.even)} পর্যন্ত।`,
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
  // example is half of what is in it, capped so the share stays under a quarter.
  const cap = MORE_MAX_PCT / 100;
  const examples = items
    .filter((x) => x.kind !== "worse")
    .map((x) => {
      const ltp = x.h.ltp as number;
      // Spending s keeps the share under the cap when (value + s) ≤ cap × (total + s).
      const room = (cap * f.total - x.value) / (1 - cap);
      const q = Math.floor(Math.min(x.cost * 0.5, Math.max(0, room)) / ltp);
      if (q < 1) return null;
      const avg = (x.cost + q * ltp) / (x.h.qty + q);
      return { x, q, spend: q * ltp, avg, rise: Math.max(0, (breakEven(avg, lf.fee) / ltp - 1) * 100) };
    })
    .filter(Boolean) as { x: LossItem; q: number; spend: number; avg: number; rise: number }[];
  const ex = examples[0] ?? null;
  const more: PfRow = {
    key: "more",
    title: B("What would buying more do?", "আরও কিনলে কী হবে?"),
    word: ex ? B("Lowers your price", "গড় দাম কমে") : worse.length === n ? B("Not on these", "এগুলোতে নয়") : B("No room", "জায়গা নেই"),
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
        : B(
            "These shares already hold a big part of your money, so buying more would lean on them too much.",
            "এই শেয়ারগুলোতে আগেই আপনার টাকার বড় অংশ আছে, তাই আরও কিনলে এগুলোর ওপর বেশি নির্ভরতা তৈরি হবে।",
          ),
    meaning: [
      B(
        "Buying more lowers your average price, but it also puts more of your money on one share. Our examples keep each share under a quarter of your money.",
        "আরও কিনলে গড় দাম কমে, কিন্তু একটি শেয়ারে আরও টাকা জমে। আমাদের উদাহরণে প্রতিটি শেয়ার আপনার টাকার এক-চতুর্থাংশের নিচে থাকে।",
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
          ? B(`${takaGroup(cash)} is coming on your ${h.qty} shares.`, `আপনার ${h.qty}টি শেয়ারে আসছে ${takaGroup(cash)}।`)
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
      B(`You paid more than usual for ${over} of your shares.`, `আপনার ${over}টি শেয়ার স্বাভাবিকের চেয়ে বেশি দামে কেনা।`),
      B("Which ones, against what similar companies cost, and what they are worth today.", "কোনগুলো, একই ধরনের কোম্পানির দামের পাশে, আর আজ সেগুলোর ন্যায্য দাম কত।"),
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
      B(`${takaGroup(cash)} in dividends is coming to you in the next 30 days.`, `আগামী 30 দিনে আপনার কাছে ${takaGroup(cash)} ডিভিডেন্ড আসছে।`),
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
