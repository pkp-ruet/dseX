/**
 * Premium research reports (2026-11-05): the three market-wide reports on the
 * research hub. Shapes mirror backend/services/research_reports.py — keep the
 * two in step.
 */

export type Bi = { en: string; bn: string };
export type TierKeyOrUnknown = "excellent" | "good" | "average" | "weak" | "unknown";

// ---------------------------------------------------------------- risks

export interface RiskProblem {
  key: string;
  title: Bi;
  en: string;
  bn: string;
}

export interface RiskItem {
  code: string;
  name: string;
  sector: string | null;
  tier: TierKeyOrUnknown;
  price: number | null;
  problems: RiskProblem[];
}

export interface RiskChange {
  code: string;
  name: string;
  key: string;
  date: string;
  title: Bi;
}

export interface RiskRegister {
  as_of: string | null;
  universe: number;
  flagged: number;
  two_or_more: number;
  kinds: { key: string; title: Bi; means: Bi; n: number }[];
  items: RiskItem[];
  week: { since: string | null; added: RiskChange[]; fixed: RiskChange[]; skipped: string[] };
  close_to_z: {
    code: string;
    name: string;
    sector: string | null;
    level: "red" | "amber" | null;
    reasons: { en: string; bn: string; level: string }[];
  }[];
}

// ---------------------------------------------------------------- auditors

export type AuditGroupKey = "going_concern" | "serious" | "minor" | "unknown";

export interface AuditItem {
  code: string;
  name: string;
  sector: string | null;
  tier: TierKeyOrUnknown;
  group: AuditGroupKey;
  year: number | null;
  posted: string | null;
  url: string | null;
  new: boolean;
  reasons: { key: string; serious: boolean; en: string; bn: string }[];
  excerpt: string | null;
  earlier: number[];
}

export interface AuditorTracker {
  as_of: string;
  universe: number | null;
  companies: number;
  counts: Record<AuditGroupKey, number>;
  recent: number;
  repeat: number;
  groups: { key: AuditGroupKey; title: Bi; means: Bi; items: AuditItem[] }[];
  reasons: { key: string; n: number; serious: boolean; en: string; bn: string }[];
  sectors: { sector: string; n: number; of: number | null }[];
}

// ---------------------------------------------------------------- results season

export type ProfitMove = "up" | "same" | "down" | "to_profit" | "to_loss" | "loss";
export type DividendMove = "raised" | "same" | "cut" | "none" | "first" | "bonus_only";

export interface SeasonMeta {
  id: string;
  period_end: string;
  full_year: boolean;
  n: number;
  title: Bi;
}

export interface SeasonRow {
  code: string;
  name: string;
  sector: string | null;
  tier: TierKeyOrUnknown;
  posted: string | null;
  months: number;
  eps: number;
  eps_prev: number;
  move: ProfitMove;
  pct: number | null;
  bucket: "up" | "same" | "down" | "loss";
  cash_out: boolean;
  dividend: { move: DividendMove; cash_pct: number | null; prev_cash_pct: number | null; stock_pct: number | null } | null;
}

export interface ResultsSeason {
  season: SeasonMeta;
  seasons: SeasonMeta[];
  reported: number;
  counts: { up: number; same: number; down: number; loss: number };
  median_pct: number | null;
  to_profit: number;
  to_loss: number;
  sectors: { sector: string; n: number; up: number; same: number; down: number; median_pct: number | null }[];
  top_up: string[];
  top_down: string[];
  turned_profit: string[];
  turned_loss: string[];
  cash_out: string[];
  dividends: Record<DividendMove | "declared", number> | null;
  coming: { code: string; name: string; date: string | null }[];
  rows: SeasonRow[];
}

// ---------------------------------------------------------------- who is buying

export type OwnerGroup = "sponsor" | "institute" | "foreign";

export interface CompanyBase {
  code: string;
  name: string;
  sector: string | null;
  tier: TierKeyOrUnknown;
}

export interface OwnerPerson {
  name: string | null;
  role: string;
  role_en: string;
  role_bn: string;
  side: "buy" | "sell";
  shares: number | null;
  status: "done" | "declared";
  date: string | null;
}

export interface OwnerTradeRow extends CompanyBase {
  net_shares: number;
  net_tk: number | null;
  buys: number;
  sells: number;
  last: string;
  people: OwnerPerson[];
}

export interface OwnerDeclRow extends CompanyBase {
  side: "buy" | "sell";
  shares: number | null;
  tk: number | null;
  declared: string;
  by: string | null;
  name_of: string | null;
  role_en: string;
  role_bn: string;
}

export interface MoneyRow extends CompanyBase {
  pp: number;
  tk: number | null;
  from_pct: number;
  to_pct: number;
  since: string | null;
  date: string;
  jump: boolean;
}

export interface AgreeRow extends CompanyBase {
  groups: OwnerGroup[];
  pp: Record<OwnerGroup, number | null>;
  since: string | null;
}

export interface Under30Row extends CompanyBase {
  pct: number;
  year_pp: number | null;
  since: string | null;
  trend: "up" | "down" | "flat" | null;
}

export interface OwnersReport {
  as_of: string;
  month: string | null;
  trades: {
    buying: OwnerTradeRow[];
    selling: OwnerTradeRow[];
    pending: OwnerDeclRow[];
    lapsed: OwnerDeclRow[];
    buy_tk: number;
    sell_tk: number;
  };
  institute: { in: MoneyRow[]; out: MoneyRow[] };
  foreign: { in: MoneyRow[]; out: MoneyRow[] };
  agree: { buying: AgreeRow[]; selling: AgreeRow[] };
  under30: Under30Row[];
  groups: Record<OwnerGroup, Bi>;
  totals: {
    trade_buyers: number;
    trade_sellers: number;
    inst_in: number;
    inst_out: number;
    inst_in_tk: number;
    inst_out_tk: number;
    foreign_in: number;
    foreign_out: number;
    agree_buy: number;
    agree_sell: number;
    under30: number;
  };
}

// ---------------------------------------------------------------- is the profit real

export type CashLabel = "backed" | "partly" | "paper" | "none" | "loss";

export interface QualityItem extends CompanyBase {
  label: CashLabel;
  cash_per_100: number | null;
  core_per_100: number | null;
  flags: ("paper" | "outside" | "dividend_unfunded" | "debt_up")[];
  from: number;
  to: number;
  n_years: number;
  profit_cr: number;
  cash_cr: number;
  free_cr: number;
  dividends_cr: number;
  debt_from_cr: number | null;
  debt_to_cr: number | null;
  debt_growth_pct?: number;
  sales_growth_pct?: number;
}

export interface EarningsQuality {
  years: { to: number | null; window: number };
  universe: number;
  skipped: { lenders: number; stale: number; thin: number; doubtful: number };
  counts: Record<CashLabel, number>;
  labels: Record<Exclude<CashLabel, "loss">, { title: Bi; means: Bi }>;
  sectors: { sector: string; n: number; backed: number; paper: number; median_cash_per_100: number }[];
  lists: { paper: string[]; outside: string[]; dividend_unfunded: string[]; debt_up: string[]; best: string[] };
  items: QualityItem[];
}

// ---------------------------------------------------------------- dividends you can count on

export type DivMove = "raised" | "same" | "cut" | "skipped" | "back" | "none";

export interface DividendItem extends CompanyBase {
  record: { year: number; cash_pct: number; stock_pct: number }[];
  paid_years: number;
  n_years: number;
  move: DivMove | null;
  latest_cash_pct: number;
  prev_cash_pct: number;
  year: number;
  per_original: { year: number; tk: number }[];
  bonus_instead: boolean;
  yield_after_tax: number | null;
  safety: { level: "safe" | "watch" | "risk"; word_en: string; word_bn: string; line_en: string; line_bn: string } | null;
  cash_label: CashLabel | null;
}

export interface DividendReliability {
  universe: number;
  counts: {
    paying: number;
    every_year: number;
    steady: number;
    at_risk: number;
    cut: number;
    skipped: number;
    raised: number;
    bonus_instead: number;
  };
  lists: { steady: string[]; at_risk: string[]; cut: string[]; skipped: string[]; raised: string[]; bonus_instead: string[] };
  moves: Record<DivMove, Bi>;
  tax_pct: number;
  items: DividendItem[];
}

// ---------------------------------------------------------------- the hub

export interface ResearchSummary {
  risks: { flagged: number; universe: number; two_or_more: number; added: number; fixed: number; as_of: string | null } | null;
  auditors: { companies: number; universe: number | null; counts: Record<AuditGroupKey, number>; recent: number } | null;
  season: { title: Bi; id: string; reported: number; counts: ResultsSeason["counts"]; coming: number } | null;
  owners: ({ month: string | null } & OwnersReport["totals"]) | null;
  quality: { universe: number; counts: Record<CashLabel, number>; to: number | null } | null;
  dividends: ({ universe: number } & DividendReliability["counts"]) | null;
}

export type ReportSlug =
  | "risk-register"
  | "auditor-warnings"
  | "results-season"
  | "who-is-buying"
  | "is-the-profit-real"
  | "dividends-you-can-count-on";

export interface ReportDef {
  slug: ReportSlug;
  title: Bi;
  /** The question the report answers. */
  question: Bi;
  /** One line on what it is built from. */
  source: Bi;
}

/** The three reports, in the hub's order. */
export const REPORTS: ReportDef[] = [
  {
    slug: "risk-register",
    title: { en: "Companies in trouble", bn: "সমস্যায় থাকা কোম্পানি" },
    question: {
      en: "Companies with a big problem today, and what the problem is.",
      bn: "যেসব কোম্পানিতে এখন বড় সমস্যা আছে, আর সমস্যাটা কী।",
    },
    source: {
      en: "From DSE notices, auditors' reports and each company's accounts. Checked after every close.",
      bn: "ডিএসইর নোটিশ, নিরীক্ষকের প্রতিবেদন আর প্রতিটি কোম্পানির হিসাব থেকে। প্রতিদিন বাজার বন্ধের পর যাচাই করা।",
    },
  },
  {
    slug: "auditor-warnings",
    title: { en: "Auditor warnings", bn: "নিরীক্ষকের আপত্তি" },
    question: {
      en: "Companies whose accounts the auditor did not fully accept, and why.",
      bn: "যেসব কোম্পানির হিসাবে নিরীক্ষক আপত্তি তুলেছেন, আর কেন।",
    },
    source: {
      en: "We read every auditor's report DSE posted in the last year and sort the reasons.",
      bn: "গত এক বছরে ডিএসইতে আসা প্রতিটি নিরীক্ষক প্রতিবেদন আমরা পড়েছি আর কারণগুলো সাজিয়েছি।",
    },
  },
  {
    slug: "results-season",
    title: { en: "Latest results", bn: "সর্বশেষ আর্থিক ফল" },
    question: {
      en: "Which companies made more profit than last year, and which made less.",
      bn: "কোন কোম্পানির মুনাফা গত বছরের চেয়ে বেড়েছে, আর কোনটির কমেছে।",
    },
    source: {
      en: "Every results report companies posted on DSE for the period, compared with a year earlier.",
      bn: "এই সময়ের জন্য কোম্পানিগুলো ডিএসইতে যে ফল দিয়েছে, প্রতিটি, এক বছর আগের সঙ্গে তুলনা করে।",
    },
  },
  {
    slug: "who-is-buying",
    title: { en: "Who is buying, who is selling", bn: "কে কিনছে, কে বেচছে" },
    question: {
      en: "What company owners and big investors bought and sold.",
      bn: "কোম্পানির মালিক আর বড় বিনিয়োগকারীরা কী কিনলেন, কী বেচলেন।",
    },
    source: {
      en: "From every founder and director trade notice of the last year, and DSE's monthly ownership reports.",
      bn: "গত এক বছরের প্রতিটি উদ্যোক্তা ও পরিচালকের লেনদেনের নোটিশ, আর ডিএসইর মাসিক মালিকানা প্রতিবেদন থেকে।",
    },
  },
  {
    slug: "is-the-profit-real",
    title: { en: "Is the profit real?", bn: "মুনাফা কি আসল?" },
    question: {
      en: "Whose profit comes in as real cash, and whose stays on paper.",
      bn: "কার মুনাফা আসল নগদে আসে, আর কারটা শুধু কাগজে থাকে।",
    },
    source: {
      en: "From five years of each company's cash-flow statements and yearly results.",
      bn: "প্রতিটি কোম্পানির পাঁচ বছরের নগদ প্রবাহের হিসাব আর বার্ষিক ফল থেকে।",
    },
  },
  {
    slug: "dividends-you-can-count-on",
    title: { en: "Reliable dividends", bn: "নিয়মিত ডিভিডেন্ড" },
    question: {
      en: "Companies that pay every year, and dividends that may stop.",
      bn: "যেসব কোম্পানি প্রতি বছর দেয়, আর যাদের ডিভিডেন্ড বন্ধ হতে পারে।",
    },
    source: {
      en: "From five years of cash and bonus dividends, with our dividend safety check.",
      bn: "পাঁচ বছরের নগদ ও বোনাস ডিভিডেন্ড আর আমাদের ডিভিডেন্ড নিরাপত্তা যাচাই থেকে।",
    },
  },
];

export function reportDef(slug: ReportSlug): ReportDef {
  return REPORTS.find((r) => r.slug === slug)!;
}

/** "৳2.10" — a figure a share, always two decimals. */
export function perShare(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "–";
  const sign = v < 0 ? "−" : "";
  return `${sign}৳${Math.abs(v).toFixed(2)}`;
}

/** "+17%" / "−8%" */
export function signedPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "";
  const r = Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10;
  return `${r > 0 ? "+" : r < 0 ? "−" : ""}${Math.abs(r)}%`;
}

const MON_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MON_BN = ["জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টে", "অক্টো", "নভে", "ডিসে"];

/** "5 Nov 2026" / "5 নভে 2026" (Western digits in both, docs/voice.md). */
export function dayWords(iso: string | null | undefined, withYear = true): Bi {
  if (!iso) return { en: "", bn: "" };
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return { en: iso, bn: iso };
  const yr = withYear ? ` ${y}` : "";
  return { en: `${d} ${MON_EN[m - 1]}${yr}`, bn: `${d} ${MON_BN[m - 1]}${yr}` };
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

/** WebPage (with the paywall markup) + BreadcrumbList for a report page. */
export function reportJsonLd(slug: ReportSlug, title: string, description: string, asOf: string | null) {
  const url = `${BASE_URL}/stock-insights/${slug}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: title,
        headline: title,
        description,
        url,
        inLanguage: ["en", "bn"],
        ...(asOf ? { dateModified: asOf } : {}),
        isAccessibleForFree: false,
        hasPart: { "@type": "WebPageElement", isAccessibleForFree: false, cssSelector: ".premium-locked" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Premium research", item: `${BASE_URL}/stock-insights` },
          { "@type": "ListItem", position: 3, name: title, item: url },
        ],
      },
    ],
  };
}

export function reportMetadata(slug: ReportSlug, title: string, description: string, keywords: string[]) {
  const url = `${BASE_URL}/stock-insights/${slug}`;
  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: { title: `${title} | TopStockBD`, description, url, type: "website" as const },
  };
}

/** "৳13.5 crore" / "৳45 lakh" / "৳9,000" — a taka amount in the words BD readers use. */
export function tkWords(tk: number | null | undefined): Bi {
  if (tk == null || !Number.isFinite(tk)) return { en: "", bn: "" };
  const v = Math.abs(tk);
  if (v >= 1e7) {
    const n = v >= 1e9 ? Math.round(v / 1e7).toLocaleString("en-US") : (Math.round(v / 1e6) / 10).toString();
    return { en: `৳${n} crore`, bn: `৳${n} কোটি` };
  }
  if (v >= 1e5) {
    const n = (Math.round(v / 1e4) / 10).toString();
    return { en: `৳${n} lakh`, bn: `৳${n} লাখ` };
  }
  const n = Math.round(v).toLocaleString("en-US");
  return { en: `৳${n}`, bn: `৳${n}` };
}

/** "৳1,234 crore" from a figure already in crore. */
export function croreWords(cr: number | null | undefined): Bi {
  return tkWords(cr == null ? null : cr * 1e7);
}

/** "September 2026" / "সেপ্টেম্বর 2026" from "2026-09". */
export function monthWords(ym: string | null | undefined): Bi {
  if (!ym) return { en: "", bn: "" };
  const [y, m] = ym.split("-").map(Number);
  const EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const BN = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
  if (!y || !m) return { en: ym, bn: ym };
  return { en: `${EN[m - 1]} ${y}`, bn: `${BN[m - 1]} ${y}` };
}
