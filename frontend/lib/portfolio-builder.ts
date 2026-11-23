/**
 * Portfolio builder (2026-11-23): the page's types, words and the grade.
 * Backend rules: `backend/services/portfolio_builder.py` (keys and lines here
 * mirror it; `backend/tests/test_agreement.py` checks the keys). Plan +
 * mockup: https://claude.ai/artifact/17PPMcRFtJd3S841YC97BM.
 *
 * Signed in only. A free reader's first plan is open in full; Build again
 * (a new answer, "Not for me") is Premium; Premium builds as often as it likes.
 */
import type { PortfolioHolding, ScoreItem } from "@/lib/api";
import { analyzePortfolio, type ComputedRow } from "@/lib/portfolio-analysis";

export type Bi = { en: string; bn: string };

export const BUILDER_PATH = "/portfolio-builder";

export const PURPOSES = ["income", "growth", "safe", "mix"] as const;
/** Phase 2: "mine" = add the money to the main portfolio (the lines hold on the whole). */
export const STARTS = ["fresh", "mine"] as const;
export const HORIZONS = ["lt1", "1to3", "gt3"] as const;
export const LIKES = ["big", "cash", "no_loans", "growing", "low_price"] as const;
export const LEAVE_OUT = ["banks", "insurers", "tobacco"] as const;
export const JOBS = ["hold", "cash", "grow", "low"] as const;

export type Purpose = (typeof PURPOSES)[number];
export type Start = (typeof STARTS)[number];
export type Horizon = (typeof HORIZONS)[number];
export type Like = (typeof LIKES)[number];
export type LeaveOut = (typeof LEAVE_OUT)[number];
export type Job = (typeof JOBS)[number];

/** Mirrors backend MIN_AMOUNT / MAX_AMOUNT / MAX_LIKES. */
export const MIN_AMOUNT = 10_000;
export const MAX_AMOUNT = 100_000_000;
export const MAX_LIKES = 2;

/** Mirrors backend `share_count`. */
export function shareCount(amount: number): number {
  if (amount < 25_000) return 3;
  if (amount < 75_000) return 5;
  if (amount < 300_000) return 7;
  if (amount < 1_000_000) return 8;
  return 10;
}

export const AMOUNT_CHIPS: { value: number; label: Bi }[] = [
  { value: 25_000, label: { en: "৳25,000", bn: "৳25,000" } },
  { value: 50_000, label: { en: "৳50,000", bn: "৳50,000" } },
  { value: 100_000, label: { en: "৳1 lakh", bn: "৳1 লাখ" } },
  { value: 500_000, label: { en: "৳5 lakh", bn: "৳5 লাখ" } },
];

export const PURPOSE_WORDS: Record<Purpose, { name: Bi; line: Bi; chip: Bi }> = {
  income: {
    name: { en: "Regular income", bn: "নিয়মিত আয়" },
    line: { en: "Cash dividends every year", bn: "প্রতি বছর নগদ ডিভিডেন্ড" },
    chip: { en: "Regular income", bn: "নিয়মিত আয়" },
  },
  growth: {
    name: { en: "Grow over the years", bn: "বছরে বছরে বাড়ুক" },
    line: { en: "Companies whose profit is rising", bn: "যেসব কোম্পানির মুনাফা বাড়ছে" },
    chip: { en: "Grow over the years", bn: "বছরে বছরে বাড়ুক" },
  },
  safe: {
    name: { en: "Keep it safe", bn: "নিরাপদে রাখুন" },
    line: { en: "Big, steady companies with few loans", bn: "বড়, স্থির কোম্পানি, ঋণ কম" },
    chip: { en: "Keep it safe", bn: "নিরাপদে রাখুন" },
  },
  mix: {
    name: { en: "A bit of everything", bn: "সবকিছু একটু করে" },
    line: { en: "Some of each. A good place to start.", bn: "প্রতিটি থেকে কিছুটা। শুরুর জন্য ভালো।" },
    chip: { en: "A bit of everything", bn: "সবকিছু একটু করে" },
  },
};

export const HORIZON_WORDS: Record<Horizon, Bi> = {
  lt1: { en: "Within a year", bn: "1 বছরের মধ্যে" },
  "1to3": { en: "In 1 to 3 years", bn: "1–3 বছরে" },
  gt3: { en: "After 3 years", bn: "3 বছর পরে" },
};

export const LIKE_WORDS: Record<Like, Bi> = {
  big: { en: "Big and well known", bn: "বড়, পরিচিত কোম্পানি" },
  cash: { en: "Pays cash every year", bn: "প্রতি বছর নগদ দেয়" },
  no_loans: { en: "Almost no loans", bn: "প্রায় কোনো ঋণ নেই" },
  growing: { en: "Profit going up", bn: "মুনাফা বাড়ছে" },
  low_price: { en: "Low price for its profit", bn: "মুনাফার তুলনায় দাম কম" },
};

export const LEAVE_WORDS: Record<LeaveOut, Bi> = {
  banks: { en: "Banks and finance", bn: "ব্যাংক ও আর্থিক প্রতিষ্ঠান" },
  insurers: { en: "Insurers", bn: "বিমা" },
  tobacco: { en: "Tobacco", bn: "তামাক" },
};

export const JOB_WORDS: Record<Job, Bi> = {
  hold: { en: "Hold steady", bn: "স্থির ভিত্তি" },
  cash: { en: "Pays cash", bn: "নগদ দেয়" },
  grow: { en: "Grows", bn: "বাড়ছে" },
  low: { en: "Low price", bn: "কম দামে" },
};

export interface BuilderAnswers {
  amount: number;
  purpose: Purpose;
  horizon: Horizon;
  likes: Like[];
  leave_out: LeaveOut[];
  exclude: string[];
  start: Start;
}

export const DEFAULT_ANSWERS: BuilderAnswers = {
  amount: 100_000,
  purpose: "mix",
  horizon: "gt3",
  likes: [],
  leave_out: [],
  exclude: [],
  start: "fresh",
};

export interface PlanItem {
  code: string;
  name: string;
  sector: string | null;
  sector_bn: string | null;
  financial: boolean;
  tier: string;
  group: Bi;
  job: Job;
  state: "now" | "wait";
  price: number | null;
  change_pct: number | null;
  wait_under: number | null;
  qty: number;
  amount: number;
  weight_pct: number;
  cash_year: number;
  why: Bi;
  wait_why: Bi | null;
  watch: (Bi & { level?: string; more?: number }) | null;
  hi52: number | null;
  lo52: number | null;
  /** "Start from my shares": this adds to a share the reader already owns. */
  adds_to?: boolean;
}

/** A share the reader already owns ("start from my shares"). */
export interface HeldRow {
  code: string;
  name: string;
  qty: number;
  buy_price: number | null;
  price: number | null;
  value: number;
  sector: string | null;
  sector_bn: string | null;
}

/** What the plan watch noticed on a share since the plan was built. */
export interface PlanChange {
  kind: "price" | "out" | "red";
  level: "good" | "watch" | "bad";
  day: string;
  en: string;
  bn: string;
  body_en?: string;
  body_bn?: string;
}

export interface BuilderPlan {
  answers: BuilderAnswers;
  as_of: string | null;
  target: number;
  items: PlanItem[];
  jobs: (Bi & { job: Job; amount: number; pct: number })[];
  totals: {
    amount: number;
    now: number;
    kept: number;
    fee: number;
    left: number;
    cash_year: number;
    shares: number;
    now_count: number;
    wait_count: number;
    businesses: number;
    financial_pct: number;
    /** "Start from my shares" only. */
    held?: number;
    total_after?: number;
    businesses_after?: number;
    shares_after?: number;
    cash_year_held?: number;
  };
  pool: { strong: number; fit: number };
  notes: (Bi & { key: string })[];
  /** What the reader already owns ("start from my shares"), else null. */
  held?: HeldRow[] | null;
}

export interface BuilderState {
  free_used: boolean;
  count: number;
}

export interface BuildResult {
  plan: BuilderPlan;
  id: string | null;
  created_at?: string;
  builder: BuilderState;
}

export interface PlanSummary {
  id: string;
  created_at: string;
  answers: BuilderAnswers;
  shares: number;
  cash_year: number;
  codes: string[];
}

export interface KeptPlan {
  id: string;
  created_at: string;
  plan: BuilderPlan;
  /** {code: change} — the plan watch's news since it was built (phase 2). */
  changes?: Record<string, PlanChange>;
}

export interface KeptPlans {
  plans: PlanSummary[];
  latest: KeptPlan | null;
  builder: BuilderState;
}

type Line = { code: string; name: string; qty: number; buy: number; price: number | null };

function gradeOf(lines: Line[], priceMap: Map<string, ScoreItem>) {
  const rows: ComputedRow[] = lines
    .filter((l) => l.qty > 0)
    .map((l, i) => {
      const item = priceMap.get(l.code);
      const ltp = item?.ltp ?? l.price ?? null;
      const holding = {
        id: `plan-${i}`,
        trading_code: l.code,
        buy_price: l.buy,
        qty: l.qty,
        added_at: "",
        signal: null,
      } as PortfolioHolding;
      const cost = l.qty * l.buy;
      const value = ltp != null ? l.qty * ltp : null;
      return {
        holding,
        ltp,
        company_name: l.name,
        cost_basis: cost,
        current_value: value,
        pnl: value != null ? value - cost : null,
        pnl_pct: value != null && cost > 0 ? ((value - cost) / cost) * 100 : null,
      };
    });
  if (!rows.length) return null;
  return analyzePortfolio(rows, priceMap, "en").grade;
}

/** The plan through the portfolio page's own check: the same grade a reader
 *  would see after adding these shares (waiting shares count at the price
 *  they wait for). "Start from my shares" gives the grade before and after. */
export function planGrade(plan: BuilderPlan, priceMap: Map<string, ScoreItem>) {
  const plan_lines: Line[] = plan.items.map((it) => ({
    code: it.code,
    name: it.name,
    qty: it.qty,
    buy: it.wait_under ?? it.price ?? 0,
    price: it.price,
  }));
  const held: Line[] = (plan.held ?? []).map((h) => ({
    code: h.code,
    name: h.name,
    qty: h.qty,
    buy: h.buy_price ?? h.price ?? 0,
    price: h.price,
  }));
  if (!held.length) return { after: gradeOf(plan_lines, priceMap), before: null };
  return { before: gradeOf(held, priceMap), after: gradeOf([...held, ...plan_lines], priceMap) };
}

/** "৳1,00,000" in the Bangladeshi grouping (lakh / crore), whole taka. */
export function taka(v: number): string {
  const n = Math.round(Math.abs(v));
  const s = String(n);
  let out = s;
  if (s.length > 3) {
    const tail = s.slice(-3);
    let head = s.slice(0, -3);
    const parts: string[] = [];
    while (head.length > 2) {
      parts.unshift(head.slice(-2));
      head = head.slice(0, -2);
    }
    if (head) parts.unshift(head);
    out = `${parts.join(",")},${tail}`;
  }
  return `${v < 0 ? "-" : ""}৳${out}`;
}

/** A share's price as the plan prints it: two decimals under ৳100. */
export function unitPrice(v: number | null | undefined): string {
  if (v == null) return "–";
  return v >= 100 ? taka(v) : `৳${v.toFixed(v < 10 ? 2 : 1)}`;
}
