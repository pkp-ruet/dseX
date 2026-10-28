/**
 * The stock report (2026-10-28) — the `report` field of `GET /api/company/:code`,
 * built by `backend/services/stock_report.py` (pure) + `stock_report_service.py`.
 *
 * The page is a dated research report: a cover, an eight-check scorecard, then
 * one section per check (+ a few extra sections), then one offer. The rule:
 * free readers see WHAT we found (every fact, each check's verdict word, every
 * serious red flag); Premium shows WHY, WHAT COMES NEXT and WHAT TO DO.
 *
 * The backend ships every part (locks are screen-only, like everywhere else);
 * each field below says whether the page shows it free or only to Premium.
 * Every sentence is a {en, bn} pair in the calm-advisor voice (docs/voice.md),
 * Western digits, money as "৳1,234" / "৳45.6".
 *
 * Every section is optional: the backend leaves one out when the stock has no
 * data for it, and an older backend sends no `report` at all — the page then
 * falls back to its existing parts.
 */

export type Bi = { en: string; bn: string };

/** Colour by meaning: good = green, fair = amber, bad = red, neutral = grey. */
export type Tone = "good" | "fair" | "bad" | "neutral";

/** The eight scorecard checks, in report order. */
export type CheckKey =
  | "red_flags" | "price" | "dividend" | "this_year"
  | "owners" | "cash" | "safety" | "quality";

/** Every section key (the eight checks + the extra sections). */
export type SectionKey =
  | CheckKey
  | "next" | "risks" | "story" | "sector" | "alternatives";

export interface ScoreCheck {
  key: CheckKey;
  /** "Red flags", "Price today" … (free) */
  label: Bi;
  /** One verdict word: "None", "Low", "Rising", "Fair" … (free) */
  word: Bi;
  tone: Tone;
  /** The number behind the word: "2 things to watch", "7.0× profit, usually 9.8×" (Premium). */
  detail: Bi | null;
}

/** A "Premium shows you" line. `part` names the part of the section's masked
 *  preview it describes (see PREVIEW_PARTS in components/stock/report/preview.tsx),
 *  so the page can number that part to match the line. */
export type InsideLine = Bi & { part?: string };

/** Shared anatomy of every section. */
export interface SectionBase {
  key: SectionKey;
  /** The question, as a reader asks it: "Is the profit real?" (free) */
  title: Bi;
  /** Verdict chip (free). Same word + tone as the scorecard for the eight checks. */
  word: Bi;
  tone: Tone;
  /** A free sentence for the free face — never the Premium answer.
   *  e.g. "We ran 16 checks. No red flags, and 2 things to watch." */
  free_line: Bi | null;
  /** 2–3 "Premium shows you" lines built from counts and kinds, written for
   *  this stock — never the answer itself (free). */
  inside: InsideLine[];
  /** The answer as one sentence with its number (Premium). */
  headline: Bi;
  /** What it means, 1–3 short paragraphs (Premium). */
  meaning: Bi[];
  /** What to watch next, one line (Premium). */
  watch: Bi | null;
  /** "DSE notice of 27 Oct 2026 · audited accounts FY2021 to FY2025" (free). */
  source: Bi;
}

// ---------------------------------------------------------------- red flags

export type FlagLevel = "red" | "amber" | "pass";

export interface FlagCheck {
  key: string;
  /** "Audit opinion", "Factory", "DSE price query", "Category", "Owners' share (30% rule)" … */
  label: Bi;
  level: FlagLevel;
  /** What we found, one line: "Clean audit opinion", "DSE found the factory closed (25 Jun 2026)". */
  detail: Bi;
  /** The notice behind it, when there is one. */
  evidence: { title: string; date: string } | null;
}

export interface RedFlagsSection extends SectionBase {
  key: "red_flags";
  /** Every check, red first, then amber, then pass. Red rows are shown FREE
   *  (label + detail); amber rows and all evidence are Premium. */
  checks: FlagCheck[];
  counts: { checks: number; red: number; amber: number; pass: number };
}

// ---------------------------------------------------------------- price

export interface PriceSection extends SectionBase {
  key: "price";
  /** Today's official close (free). */
  today: number;
  /** Fair range (Premium). Null when estimates disagree or there's no basis. */
  fair: { low: number; high: number; center: number } | null;
  /** Each method's price (Premium). */
  methods: { label: Bi; price: number }[];
  /** Today vs the centre, % (negative = below the centre) (Premium). */
  gap_pct: number | null;
  /** Price that leaves a 20% safety margin under the centre (Premium). */
  buy_below: number | null;
  /** The centre if profit fell 20% (Premium). */
  profit_fall: { pct: number; center: number } | null;
  /** Three "if this, then that" prices, 12 months (Premium). Empty when there
   *  is no positive EPS or no P/E history. Always three or none. */
  scenarios: { label: Bi; price: number }[];
  /** P/E now, its usual (own median), the sector median (free — public numbers). */
  pe: { now: number | null; usual: number | null; sector: number | null };
}

// ---------------------------------------------------------------- dividend

export interface DividendSection extends SectionBase {
  key: "dividend";
  /** The latest declaration (free facts, same as the dividend calendar). */
  latest: {
    fy: number | null;
    cash_ps: number | null;
    cash_pct: number | null;
    stock_pct: number | null;
    /** "Final" / "Interim" */
    kind: Bi;
    record_date: string | null;
    buy_by: string | null;
    agm_date: string | null;
    yield_pct: number | null;
    /** True when the record date is still ahead. */
    upcoming: boolean;
  } | null;
  /** Cash dividend ÷ EPS for the latest year, % (Premium). */
  payout_pct: number | null;
  /** Cash from the business ÷ cash dividend, × (Premium). */
  cash_cover: number | null;
  /** Up to 11 years, oldest first: cash dividend ৳ a share (Premium). */
  history: { year: number; cash_ps: number }[];
  /** Next year's likely cash dividend range at the usual payout (Premium). */
  next_range: { low: number; high: number } | null;
  /** What ৳10,000 at today's price gets (Premium). */
  on_10k: { shares: number; gross: number; net: number } | null;
  /** Tax on cash dividends used in the sums, % (10). */
  tax_pct: number;
  /** Past record dates and what a dividend-only buyer kept (Premium), newest first. */
  record_dates: {
    date: string;
    cash_ps: number;
    net_ps: number;
    price_before: number;
    price_after: number;
    /** price_after − price_before */
    move: number;
    /** net_ps + move, plus the bonus shares' value at the new price when there were any. */
    kept_ps: number;
    /** Bonus shares given on that record date, % (null when none). */
    bonus_pct: number | null;
    /** Buy + sell fees at 0.4% a side. */
    fees_ps: number;
  }[];
}

// ---------------------------------------------------------------- this year

export interface QuarterBar {
  /** 1–4 (4 = the rest of the year, from the yearly notice or audited year). */
  q: number;
  /** "Jul–Sep" / "জুলাই–সেপ্টেম্বর" */
  label: Bi;
  /** EPS of that quarter this year and last year. */
  cur: number | null;
  prev: number | null;
}

export interface ThisYearSection extends SectionBase {
  key: "this_year";
  /** "FY2026" / "2026 অর্থবছর" — the year the bars belong to. */
  fy_label: Bi;
  /** The latest results headline + when it was posted (free). */
  latest: { headline: Bi; posted: string | null } | null;
  /** Quarter by quarter, this year vs last (Premium). */
  quarters: QuarterBar[];
  /** Cash from the business so far this year vs last, ৳ a share (Premium). */
  cash_ytd: { cur: number | null; prev: number | null; label: Bi } | null;
  /** The next results and the number to beat (Premium; the date is free in `next`). */
  next: { what: Bi; date: string | null; approx: boolean; beat: number | null } | null;
}

// ---------------------------------------------------------------- owners

export interface InsiderTrade {
  side: "buy" | "sell";
  /** "Chairman", "Managing director", "A director", "A sponsor", "A corporate director" */
  role: Bi;
  /** The person or company named in the notice, as DSE wrote it. */
  name: string | null;
  shares: number;
  declared: string | null;
  done: string | null;
  status: "declared" | "done";
  /** Price range on DSE between declaration and completion. */
  price_low: number | null;
  price_high: number | null;
  /** shares × the middle of that range, ৳ million. */
  value_mn: number | null;
}

export interface OwnersSection extends SectionBase {
  key: "owners";
  /** Today's split (free). */
  split: {
    as_of: string | null;
    sponsor: number | null;
    institute: number | null;
    foreign: number | null;
    govt: number | null;
    public: number | null;
  } | null;
  /** How many insider trades in the last 12 months (free). */
  trade_counts: { buys: number; sells: number };
  /** The trades, newest first (Premium). */
  trades: InsiderTrade[];
  /** How each group moved (Premium). */
  trend: { group: Bi; from_pct: number; to_pct: number; from_date: string; to_date: string }[];
  /** Sponsors + directors against the 30% rule (free). */
  rule30: { pct: number; ok: boolean } | null;
}

// ---------------------------------------------------------------- cash

export interface CashSection extends SectionBase {
  key: "cash";
  /** Cash from the business for every ৳100 of profit, oldest first (Premium).
   *  basis: "accounts" (audited cash-flow statement) or "notice" (DSE NOCFPS ÷ EPS). */
  years: { year: number; ratio: number; basis: "accounts" | "notice" }[];
  /** Median of the years, ৳ per ৳100 (Premium). */
  usual: number | null;
}

// ---------------------------------------------------------------- safety

export interface SafetySection extends SectionBase {
  key: "safety";
  /** "Loans", "Loans against saved profit", "Interest cover", "Credit rating", "Category" (Premium values). */
  facts: { label: Bi; value: Bi; tone: Tone }[];
  /** Latest rating notice (free — a public fact). */
  rating: { agency: string; long_term: string; short_term: string | null; outlook: string | null; date: string } | null;
}

// ---------------------------------------------------------------- quality

export interface QualitySection extends SectionBase {
  key: "quality";
  score: number | null;
  rank: number | null;
  total: number | null;
  /** How many of the five checks score 6 or more. */
  healthy: number;
  checks: number;
}

// ---------------------------------------------------------------- extra sections

export interface NextSection extends SectionBase {
  key: "next";
  /** Dates are free; `expect` is Premium. Soonest first. */
  items: {
    date: string | null;
    /** The date is our estimate from last year's (shown as "around"). */
    approx: boolean;
    kind: "results" | "record" | "agm" | "rating" | "board" | "spot";
    label: Bi;
    expect: Bi | null;
  }[];
}

export interface RisksSection extends SectionBase {
  key: "risks";
  /** Count free; the risks and their triggers Premium. */
  items: { text: Bi; trigger: Bi | null }[];
}

export interface StorySection extends SectionBase {
  key: "story";
  /** Oldest first. Money in ৳ crore. The numbers are free (public accounts). */
  years: { year: number; revenue_cr: number | null; profit_cr: number | null; margin_pct: number | null; roe_pct: number | null }[];
  /** Yearly growth rates over the span (Premium reading uses them). */
  growth: { years: number; sales_pct: number | null; profit_pct: number | null } | null;
}

export interface SectorSection extends SectionBase {
  key: "sector";
  sector: string;
  peers: number;
  /** Rank 1 = best. The ranks are free; the reading (headline/meaning) Premium. */
  ranks: { label: Bi; rank: number; of: number; value: Bi }[];
}

export interface AlternativesSection extends SectionBase {
  key: "alternatives";
  /** How many (free). */
  count: number;
  /** Names + comparison (Premium). */
  items: { code: string; name: string | null; score: number | null; pe: number | null; why: Bi }[];
}

/** Free banner on the cover when a price run looks rumour-driven. */
export interface RallyWarning {
  level: "red" | "amber";
  /** The warning itself (free). */
  headline: Bi;
  /** The evidence lines (Premium). */
  lines: Bi[];
}

export interface ChartEvent {
  date: string;
  kind: "results" | "dividend" | "record" | "insider_buy" | "insider_sell" | "category" | "rating";
  label: Bi;
  /** For insider trades: completion date, so the chart can shade the span. */
  end?: string | null;
}

export interface StockReport {
  version: 1;
  /** Date of the data (latest price day). */
  as_of: string;
  /** Dateline: when the report last changed and why (free). */
  updated: { date: string; reason: Bi } | null;
  /** Three lines: a strength, a price read, a watch-out (Premium). */
  summary: Bi[];
  /** Free description of the summary: "A strength, a price read and a watch-out". */
  summary_kinds: Bi;
  scorecard: ScoreCheck[];
  warning: RallyWarning | null;
  events: ChartEvent[];
  sections: {
    red_flags?: RedFlagsSection;
    price?: PriceSection;
    dividend?: DividendSection;
    this_year?: ThisYearSection;
    owners?: OwnersSection;
    cash?: CashSection;
    safety?: SafetySection;
    quality?: QualitySection;
    next?: NextSection;
    risks?: RisksSection;
    story?: StorySection;
    sector?: SectorSection;
    alternatives?: AlternativesSection;
  };
  /** The offer's lines: what Premium shows on THIS share, from counts (free). */
  offer: Bi[];
}

/** Report order on the page (the scorecard keeps the first eight). */
export const SECTION_ORDER: SectionKey[] = [
  "red_flags", "price", "dividend", "this_year", "next",
  "owners", "cash", "safety", "quality", "story", "sector", "risks", "alternatives",
];
