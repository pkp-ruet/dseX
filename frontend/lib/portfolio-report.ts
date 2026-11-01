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
 * Free / Premium, whole or nothing (rendered by `components/portfolio/report`):
 * free = the answer word, the grade, one line, the four light words, each
 * chapter's answer, one sample row ("How strong are they?"), one answer word
 * ("How much rides on one share?") and the watch chapter's answers. Premium =
 * why each light, the first move, the chapter reads, every other row, the plan.
 */
import type { GlanceRow, PortfolioSignalEvent, PortfolioWatchEvent, ScoreItem, UpcomingResult } from "@/lib/api";
import { sectorBn } from "@/lib/bn";
import { companyShort, takaGroup } from "@/lib/formatters";
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
export type ChapterKey = LightKey;

export interface PfLight {
  key: LightKey;
  label: Bi;
  word: Bi;
  tone: Tone;
  /** The chapter it opens. */
  href: string;
  /** Why the light is what it is (Premium). */
  why: Bi | null;
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
  /** Facts under the answer (dates, the week's updates). */
  freeFacts: Bi[];
}

export interface PfChapter {
  key: ChapterKey;
  id: string;
  title: Bi;
  lead: Bi;
  head: { word: Bi; tone: Tone; line: Bi };
  /** The chapter's written read (Premium). */
  read: Bi | null;
  rows: PfRow[];
}

/** What the full check found, counted (the Premium card, `#pf-premium`):
 *  `title` carries the count, `line` what Premium shows about it. Never names
 *  a share or gives the answer. */
export interface PfFinding {
  key: "decide" | "warn" | "add" | "weak" | "grade" | "spread" | "moves" | "week" | "paid" | "cash" | "results" | "each" | "strong" | "daily";
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

export interface PortfolioReport {
  answer: PfAnswer;
  chapters: PfChapter[];
  plan: PfPlan;
  /** What the full check found, counted (the Premium card). */
  findings: PfFinding[];
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
const firstSentence = (s: string) => {
  const m = s.match(/^.*?[.।!?](\s|$)/);
  return (m ? m[0] : s).trim();
};

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
const sectorWord = (name: string): Bi => B(SECTOR_PLAIN[name] ?? name.toLowerCase(), sectorBn(name) || name);

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
  const watch = watchChapter(inp, f, wl);
  const chapters = [companies, spread, prices, watch];

  const lights: PfLight[] = [
    { key: "companies", label: B("Your companies", "আপনার কোম্পানি"), ...cl, href: "#ch-companies", why: companies.rows[0]?.headline ?? null },
    { key: "spread", label: B("Your spread", "টাকার বণ্টন"), ...sl, href: "#ch-spread", why: spread.rows.find((r) => r.tone === sl.tone)?.headline ?? spread.rows[0]?.headline ?? null },
    { key: "prices", label: B("Prices you paid", "কেনার দাম"), ...pl, href: "#ch-prices", why: prices.rows[0]?.headline ?? null },
    { key: "watch", label: B("To watch", "নজর রাখুন"), word: wl.word, tone: wl.tone, href: "#ch-watch", why: watch.rows[0]?.headline ?? null },
  ];

  const answer = buildAnswer(inp, f, lights, issue);
  const plan = buildPlan(inp);
  const findings = buildFindings(inp, f, lights, issue, plan);
  const answered = chapters.reduce((acc, c) => acc + c.rows.length, 0) + 4;

  return { answer, chapters, plan, findings, answered };
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
    freeFacts: [],
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
    freeFacts: [],
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
    freeFacts: [],
  };

  const rows = [strength, profit, pay];
  return {
    key: "companies",
    id: "ch-companies",
    title: B("Are your companies good?", "আপনার কোম্পানিগুলো কি ভালো?"),
    lead: B("What you own matters more than anything else on this page.", "আপনি কী কিনেছেন, এই পেজে সেটিই সবচেয়ে জরুরি।"),
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
    read: readOf(rows),
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

/** A chapter's read: the first sentence of its first three answers. */
function readOf(rows: PfRow[]): Bi | null {
  const hs = rows.map((r) => r.headline).filter(Boolean) as Bi[];
  if (!hs.length) return null;
  return {
    en: hs.slice(0, 3).map((h) => firstSentence(h.en)).join(" "),
    bn: hs.slice(0, 3).map((h) => firstSentence(h.bn)).join(" "),
  };
}

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
    freeFacts: [],
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
    freeFacts: [],
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
    freeFacts: [],
  };

  const rows = [one, sector, carry];
  return {
    key: "spread",
    id: "ch-spread",
    title: B("Is your money spread well?", "আপনার টাকা কি ভালোভাবে ছড়ানো?"),
    lead: B("Too much in one place means one bad event can hurt most of your money.", "এক জায়গায় বেশি টাকা থাকলে একটি খারাপ ঘটনায় বেশিরভাগ টাকার ক্ষতি হয়।"),
    head: {
      word: light.word,
      tone: light.tone,
      line:
        issue.kind === "finance"
          ? B("Banks and finance: more than half", "ব্যাংক ও আর্থিক প্রতিষ্ঠান: অর্ধেকের বেশি")
          : B(`${shares(f.n).en} in ${secs.length} business${secs.length === 1 ? "" : "es"}`, `${secs.length}টি ব্যবসায় ${f.n}টি শেয়ার`),
    },
    read: readOf(rows),
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
    freeFacts: [],
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
    freeFacts: [],
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
    freeFacts: [],
  };

  const rows = [paid, worth, topRow];
  return {
    key: "prices",
    id: "ch-prices",
    title: B("Did you pay fair prices?", "কি ন্যায্য দাম দিয়েছেন?"),
    lead: B("A good company bought too dear can still lose you money.", "ভালো কোম্পানিও বেশি দামে কিনলে লোকসান হতে পারে।"),
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
    read: readOf(rows),
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
    meaning: f.sells.slice(0, 3).map((h) => {
      const g = inp.glance.get(h.code.toUpperCase())?.signal;
      return g?.reason_en ? B(`${nameOf(h)}: ${g.reason_en}`, `${nameOf(h)}: ${g.reason_bn || g.reason_en}`) : same(`${nameOf(h)}: ${h.signal.reason}`);
    }),
    watch: f.sells.length
      ? B(
          "A Sell mark goes away when the company climbs back to “Mixed” or better on our checks. Selling is always your call.",
          "কোম্পানি আমাদের যাচাইয়ে আবার “মিশ্র” বা তার ওপরে উঠলে বিক্রির সংকেত চলে যায়। বিক্রি করবেন কি না, সিদ্ধান্ত সবসময় আপনার।",
        )
      : null,
    picture: null,
    figures: f.hs
      .filter((h) => h.signal.signal !== "none")
      .map((h) => ({
        key: h.code,
        code: h.code,
        label: same(nameOf(h)),
        value: h.signal.signal === "sell" ? B("Sell", "বিক্রি") : B("Buy more", "আরও কেনা যায়"),
        tone: (h.signal.signal === "sell" ? "bad" : "good") as Tone,
      })),
    freeFacts: [],
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
    meaning: risks.slice(0, 5).map(({ h, r }) => B(`${nameOf(h)}: ${r.en}.`, `${nameOf(h)}: ${r.bn}।`)),
    watch: null,
    picture: null,
    figures: [],
    freeFacts: [],
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
    meaning: [
      ...flips.slice(0, 3).map((e) =>
        e.signal === "sell"
          ? B(`${e.trading_code} is now marked Sell.`, `${e.trading_code}-এ এখন বিক্রির সংকেত।`)
          : e.signal === "buy_more"
            ? B(`${e.trading_code} is now marked Buy more.`, `${e.trading_code}-এ এখন আরও কেনার সংকেত।`)
            : B(`${e.trading_code} no longer has a signal.`, `${e.trading_code}-এ এখন কোনো সংকেত নেই।`),
      ),
      ...closed.slice(0, 6).map((e) => B(`${e.title_en}. ${e.body_en}`, `${e.title_bn}। ${e.body_bn}`)),
    ],
    watch: null,
    picture: null,
    figures: [],
    freeFacts: [
      ...(inp.sinceLast && Math.abs(inp.sinceLast.delta) >= 1
        ? [
            inp.sinceLast.delta > 0
              ? B(`Since your last visit, your money rose ${takaGroup(inp.sinceLast.delta)}.`, `আগের বার আসার পর আপনার টাকা বেড়েছে ${takaGroup(inp.sinceLast.delta)}।`)
              : B(`Since your last visit, your money fell ${takaGroup(-inp.sinceLast.delta)}.`, `আগের বার আসার পর আপনার টাকা কমেছে ${takaGroup(-inp.sinceLast.delta)}।`),
          ]
        : []),
      ...open.filter((e) => e.kind !== "answer" && e.kind !== "buylist").map((e) => B(`${e.title_en}. ${e.body_en}`, `${e.title_bn}। ${e.body_bn}`)),
    ],
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
    dates.push({ key: `m-${h.code}`, date: m.date, name: B(`${h.code} results`, `${h.code} আর্থিক ফল`), line: B(m.label_en, m.label_bn || m.label_en), locked: exp });
  }
  dates.sort((x, y) => x.date.localeCompare(y.date));
  const coming: PfRow = {
    key: "coming",
    title: B("What's coming up?", "সামনে কী আছে?"),
    word: dates.length ? B(`${dates.length} date${dates.length === 1 ? "" : "s"}`, `${dates.length}টি তারিখ`) : B("Nothing soon", "শিগগিরই কিছু নেই"),
    tone: "neutral",
    headline: dates.length ? null : B("No record dates, meetings or results on your shares in the next 30 days.", "আগামী 30 দিনে আপনার শেয়ারে কোনো রেকর্ড ডেট, সভা বা ফল নেই।"),
    meaning: dates.filter((d) => d.locked).map((d) => B(`${d.name.en}: ${d.locked!.en}`, `${d.name.bn}: ${d.locked!.bn}`)),
    watch: null,
    picture: dates.length
      ? {
          kind: "dates",
          label: dates.slice(0, 4).map((d) => `${d.name.en} ${d.date}`).join(", "),
          items: dates.slice(0, 4).map((d, i) => ({ key: d.key, name: d.name, when: dayWords(d.date), strong: i === 0 })),
        }
      : null,
    figures: [],
    freeFacts: dates.slice(0, 6).map((d) => join([d.name, B("·", "·"), dayWords(d.date), B("·", "·"), d.line])),
  };

  const rows = [sell, warn, changed, coming];
  return {
    key: "watch",
    id: "ch-watch",
    title: B("What should you watch?", "কোথায় নজর রাখবেন?"),
    lead: B("Warnings, changes and dates on the shares you own.", "আপনার শেয়ারের সতর্কতা, পরিবর্তন আর তারিখ।"),
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
    read: null,
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
function buildFindings(inp: ReportInput, f: Facts, lights: PfLight[], issue: SpreadIssue, plan: PfPlan): PfFinding[] {
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
