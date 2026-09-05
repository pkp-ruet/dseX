import type { TierKey } from "@/lib/constants";

/**
 * Backend base URL (no trailing slash).
 * On Vercel, set **`API_URL`** for server-side fetching (recommended for prod).
 * **`NEXT_PUBLIC_API_URL`** is used in the browser and as a server fallback.
 *
 * If neither env var is set, this auto-detects localhost (browser hostname or
 * `NODE_ENV=development` on the server) and points to `http://localhost:8000`.
 * Falls back to the production Render backend otherwise.
 */
export function getApiUrl(): string {
  const raw =
    typeof window === "undefined"
      ? process.env.API_URL || process.env.NEXT_PUBLIC_API_URL
      : process.env.NEXT_PUBLIC_API_URL;
  const explicit = raw?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  // No env var set — pick a sensible default.
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:8000";
    }
  } else if (process.env.NODE_ENV === "development") {
    return "http://localhost:8000";
  }
  return "https://dsex.onrender.com";
}

/** Canonical backend Buy/Sell signal (backend/services/signal_service.py).
 *  The single source of truth for action advice — the frontend only renders it.
 *  There is no "Hold": anything neutral arrives as `none` (no chip). */
export interface StockSignalInfo {
  signal: "buy" | "sell" | "none";
  /** Conviction, only meaningful when signal === "buy": "strong" | "normal". */
  strength?: "strong" | "normal" | null;
  reason_key: string;
  reason_en: string;
  reason_bn: string;
  tier: string | null;           // excellent|good|average|weak|unknown
  momentum_grade: string | null; // hot|warm|flat|cold|weak_liquidity|unknown
}

/** Personalized per-holding overlay on GET /api/user/portfolio (else `none`). */
export interface HoldingSignalInfo {
  signal: "buy_more" | "sell" | "none";
  reason_key: string;
  reason_en: string;
  reason_bn: string;
}

export interface ScoreItem {
  trading_code: string;
  company_name: string | null;
  sector: string | null;
  market_category: string | null;
  score: number | null;
  ltp: number | null;
  change_pct: number | null;
  eps_yoy_pct: number | null;
  eps: number | null;
  div_yield_pct: number | null;
  p1_biz?: number | null;
  p2_health?: number | null;
  p3_moat?: number | null;
  p4_val?: number | null;
  p5_div?: number | null;
  last_reported_year?: number | null;
  data_age_years?: number | null;
  stale_data?: boolean | null;
  signal?: StockSignalInfo | null;
}

export interface ScoreTiers {
  excellent?: ScoreItem[];
  good?: ScoreItem[];
  average?: ScoreItem[];
  weak?: ScoreItem[];
  /** Legacy keys served by pre-rename backends — tolerated during rollout;
   *  flattenTiers() is key-agnostic so either generation renders. */
  strong_buy?: ScoreItem[];
  buy?: ScoreItem[];
  keep_watching?: ScoreItem[];
  avoid?: ScoreItem[];
  safe_buy?: ScoreItem[];
  watch?: ScoreItem[];
}

export interface ScoresResponse {
  algorithm: string;
  computed_at: string;
  tiers: ScoreTiers;
  counts: Record<string, number>;
}

/** Flatten all tier buckets into one array, regardless of the backend's key names.
 *  Use this instead of spreading named buckets — tier grouping belongs to getTier(). */
export function flattenTiers(res: ScoresResponse): ScoreItem[] {
  return Object.values(res.tiers ?? {}).flatMap((bucket) => bucket ?? []);
}

export interface CompanyProfile {
  trading_code: string;
  company_name: string | null;
  sector: string | null;
  market_category: string | null;
  face_value: number | null;
  total_shares: number | null;
  reserve_surplus_mn: number | null;
  total_loan_mn: number | null;
  paid_up_capital_mn: number | null;
}

export interface LatestPrice {
  ltp: number | null;
  change: number | null;
  change_pct: number | null;
  date: string | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  avg_volume_7d?: number | null;
  ycp: number | null;
  w52_high: number | null;
  w52_low: number | null;
}

export interface SignalFlags {
  green: string[];
  red: string[];
}

export interface DividendDeclaration {
  declaration_date: string | null;
  record_date: string | null;
  dividend_pct: number | null;
  dividend_type: string | null;
}

export interface RelatedStock {
  trading_code: string;
  company_name: string | null;
  sector: string | null;
  score: number | null;
  ltp: number | null;
  change_pct: number | null;
  pe?: number | null;
  pb?: number | null;
  div_yield_pct?: number | null;
  roe_pct?: number | null;
  eps_yoy_pct?: number | null;
}

export interface ValuationContext {
  current_pe: number | null;
  current_pb: number | null;
  own_avg_pe: number | null;
  own_avg_pb: number | null;
  sector_median_pe: number | null;
  sector_median_pb: number | null;
  eps: number | null;
  sector_implied_price: number | null;
}

export interface SectorContext {
  sector: string | null;
  peer_count: number | null;
  rank_in_sector: number | null;
  sector_avg_score: number | null;
  sector_median_pe: number | null;
}

export interface MomentumSnapshot {
  return_7d_pct: number | null;
  rs_vs_dsex_pct: number | null;
  volume_ratio: number | null;
  avg_turnover_7d_mn: number | null;
  up_days_7d: number | null;
  days_counted: number | null;
  pct_in_52w_range: number | null;
  momentum_grade: string;
}

export interface StockVerdict {
  /** Descriptive prose only — action advice lives in CompanyDetail.signal. */
  headline: string;
  tagline: string;
  sentences: string[];
}

/** Live "value today" box — grounded, price-relative (backend/services/fair_value.py).
 *  Deliberately NOT part of the stored report, so the durable prose never goes stale. */
export interface FairValueMethod {
  name: string;
  label_en: string;
  label_bn: string;
  price: number | null;
}

export interface FairValue {
  low: number | null;
  high: number | null;
  center: number | null;
  today: number | null;
  stance: "cheap" | "fair" | "expensive" | null;
  confidence: "low" | "medium" | "high" | null;
  methods: FairValueMethod[];
  basis_en: string | null;
  basis_bn: string | null;
}

/** Light hook shown on the main stock page; full sections load from the sub-page. */
export interface DeepAnalysisTeaser {
  available: boolean;
  trading_code: string | null;
  headline_en: string | null;
  headline_bn: string | null;
  bottom_line_en: string | null;
  bottom_line_bn: string | null;
  as_of_date: string | null;
  data_note_en: string | null;
  data_note_bn: string | null;
}

/** One durable narrative section (bilingual). `body_*` is markdown. */
export interface DeepAnalysisSection {
  key: string;
  title_en: string;
  takeaway_en: string;
  body_en: string;
  title_bn: string;
  takeaway_bn: string;
  body_bn: string;
}

/** Full durable bilingual narrative (deep_analysis collection). */
export interface DeepAnalysisReport {
  trading_code: string;
  company_name: string | null;
  lang: string | null;
  headline_en: string;
  headline_bn: string;
  bottom_line_en: string;
  bottom_line_bn: string;
  sections: DeepAnalysisSection[];
  disclaimer_en: string | null;
  disclaimer_bn: string | null;
  as_of_date: string | null;
  data_note_en: string | null;
  data_note_bn: string | null;
  data_completeness: number | null;
  schema_version: number | null;
  model: string | null;
  generated_at: string | null;
}

/** Sub-page bundle: the durable narrative + the live value box beside it. */
export interface DeepAnalysisResponse {
  report: DeepAnalysisReport;
  fair_value: FairValue | null;
}

export interface CompanyDetail {
  profile: CompanyProfile;
  latest_price: LatestPrice;
  score_row: Record<string, number | string | boolean | null> | null;
  signal_flags: SignalFlags;
  financials: Record<string, unknown>[];
  extended_financials: Record<string, unknown>[];
  shareholding: Record<string, unknown> | null;
  shareholding_prev?: Record<string, unknown> | null;
  dividend_declaration: DividendDeclaration | null;
  news: { title: string; post_date: string; body: string }[];
  related_stocks: RelatedStock[];
  momentum: MomentumSnapshot | null;
  verdict: StockVerdict | null;
  signal?: StockSignalInfo | null;
  valuation?: ValuationContext | null;
  sector_context?: SectorContext | null;
  bengali_summary?: string | null;
  /** Live "value today" box (may be null when there's no sensible basis). */
  fair_value?: FairValue | null;
  /** Deep-analysis teaser (null when no report exists for this code). */
  deep_analysis?: DeepAnalysisTeaser | null;
}

export interface UpcomingDividend {
  trading_code: string;
  company_name: string | null;
  projected_date: string | null;
  record_date: string | null;
  dividend_pct: number | null;
}

export interface DividendsUpcoming {
  upcoming_declarations: UpcomingDividend[];
  upcoming_record_dates: UpcomingDividend[];
}

/** One declared dividend — priced off the latest close. `kind`/`event_date` are
 *  only set inside the month buckets, where record dates and AGMs share a
 *  timeline. */
export interface CorporateActionEvent {
  trading_code: string;
  company_name: string | null;
  sector: string | null;
  market_category: string | null;
  ltp: number | null;
  change_pct: number | null;
  score: number | null;
  tier: TierKey | null;
  dividend_type: string | null;
  /** Cash dividend as a % of face value (DSE convention: 25% of Tk 10 = Tk 2.50). */
  cash_pct: number | null;
  /** Bonus/stock dividend as a % — new shares, not money. */
  stock_pct: number | null;
  cash_per_share: number | null;
  /** Gross cash dividend as a % of today's price. Before tax. */
  yield_pct: number | null;
  face_value: number | null;
  declaration_date: string | null;
  record_date: string | null;
  agm_date: string | null;
  /** Financial period the dividend is for (e.g. year ended 30 Jun 2025). */
  period_end: string | null;
  /** True when a later DSE notice corrected this declaration's dates. */
  amended: boolean;
  is_no_dividend: boolean;
  record_days_left: number | null;
  agm_days_left: number | null;
  /** Last normal-market buy day that still settles before the record date. */
  buy_by: string | null;
  buy_days_left: number | null;
  spot_starts: string | null;
  kind?: "record" | "agm";
  event_date?: string;
}

// ---- Sectors ----

/** One company inside a sector page. */
export interface SectorStockRow {
  trading_code: string;
  company_name: string | null;
  market_category: string | null;
  score: number | null;
  tier: TierKey | null;
  ltp: number | null;
  change_pct: number | null;
  pe: number | null;
  pb: number | null;
  eps: number | null;
  eps_yoy_pct: number | null;
  roe_pct: number | null;
  div_yield_pct: number | null;
  mcap_mn: number | null;
  return_7d_pct: number | null;
  /** 7-day return minus DSEX's — positive means it beat the index. */
  rs_vs_dsex_pct: number | null;
  p1_biz: number | null;
  p2_health: number | null;
  p3_moat: number | null;
  p4_val: number | null;
  p5_div: number | null;
  stale_data: boolean | null;
  signal: StockSignalInfo | null;
}

export interface SectorBrief {
  trading_code: string;
  company_name: string | null;
  score: number | null;
  tier: TierKey | null;
  ltp: number | null;
  change_pct: number | null;
}

/** Group-level figures for one sector. Valuation uses medians, not averages. */
export interface SectorSummary {
  sector: string;
  slug: string;
  /** Scoring class: BANK | NBFI | INSURANCE | GENERAL. */
  sector_class: string;
  company_count: number;
  total_mcap_mn: number | null;
  median_score: number | null;
  median_pe: number | null;
  median_pb: number | null;
  median_yield_pct: number | null;
  median_roe_pct: number | null;
  avg_change_pct: number | null;
  avg_return_7d_pct: number | null;
  avg_rs_vs_dsex_pct: number | null;
  buy_signals: number;
  sell_signals: number;
  tier_counts: Record<string, number>;
  top_ranked: SectorBrief | null;
  best_today: SectorBrief | null;
  worst_today: SectorBrief | null;
}

export interface MarketMedians {
  company_count: number;
  median_score: number | null;
  median_pe: number | null;
  median_pb: number | null;
  median_yield_pct: number | null;
  median_roe_pct: number | null;
  avg_change_pct: number | null;
  avg_return_7d_pct: number | null;
  sector_count: number;
}

export interface SectorComparisonRow {
  metric: string;
  label: string;
  sector: number | null;
  market: number | null;
  /** Positive means the sector reads higher than the market median. */
  gap_pct: number | null;
  higher_is_better: boolean;
}

export interface SectorsListData {
  market: MarketMedians;
  sectors: SectorSummary[];
}

export interface SectorDetailData {
  summary: SectorSummary;
  market: MarketMedians;
  comparison: SectorComparisonRow[];
  scoring_note: { label: string; en: string; bn: string };
  stocks: SectorStockRow[];
  top_dividend: SectorStockRow[];
  gainers: SectorStockRow[];
  losers: SectorStockRow[];
  week_leaders: SectorStockRow[];
  related_sectors: SectorSummary[];
}

/** A row of the `dividend_declarations` ledger, as stored. */
export interface DividendDeclarationRecord {
  trading_code: string;
  declaration_date: string | null;
  record_date: string | null;
  agm_date: string | null;
  period_end: string | null;
  dividend_type: string | null;
  dividend_pct: number | null;
  cash_pct: number | null;
  stock_pct: number | null;
  title: string | null;
  amended_at?: string | null;
}

export interface DividendCalendarMonth {
  key: string;
  label: string;
  events: CorporateActionEvent[];
}

export interface DividendCalendarData {
  today: string;
  note_en: string;
  note_bn: string;
  settlement: {
    normal_buy_lead_trading_days: number;
    spot_window_trading_days: number;
  };
  stats: {
    upcoming_record_dates: number;
    record_dates_this_week: number;
    upcoming_agms: number;
    recent_declarations: number;
    cash_payers_upcoming: number;
    top_yield_pct: number | null;
    declarations_tracked: number;
  };
  record_dates: CorporateActionEvent[];
  agms: CorporateActionEvent[];
  recent_declarations: CorporateActionEvent[];
  top_cash_dividends: CorporateActionEvent[];
  months: DividendCalendarMonth[];
}

export interface PricePoint {
  date: string;
  ltp: number | null;
  volume: number | null;
  change_pct: number | null;
}

export interface MarketMoverItem {
  trading_code: string;
  company_name: string | null;
  ltp: number | null;
  change: number | null;
  change_pct: number | null;
  volume: number | null;
  value_mn: number | null;
}

export interface MarketMoversData {
  date: string | null;
  gainers: MarketMoverItem[];
  losers: MarketMoverItem[];
  most_traded: MarketMoverItem[];
}

export interface MarketIndexData {
  date: string | null;
  dsex: number | null;
  dsex_change: number | null;
  dsex_change_pct: number | null;
  dses: number | null;
  dses_change: number | null;
  ds30: number | null;
  ds30_change: number | null;
  total_volume: number | null;
  total_value_mn: number | null;
  total_trades: number | null;
  volume_change_pct: number | null;
  turnover_change_pct: number | null;
  up_count: number | null;
  down_count: number | null;
  neutral_count: number | null;
}

// ---- Fetch helpers ----

export class ApiNotFoundError extends Error {
  readonly path: string;
  constructor(path: string) {
    super(`API ${path} returned 404`);
    this.name = "ApiNotFoundError";
    this.path = path;
  }
}

function apiFetchSignal(): AbortSignal | undefined {
  if (typeof AbortSignal === "undefined") return undefined;
  const ctor = AbortSignal as unknown as { timeout?: (ms: number) => AbortSignal };
  return typeof ctor.timeout === "function" ? ctor.timeout(60_000) : undefined;
}

/**
 * Tag every cached fetch that depends on scraped market data so we can purge
 * them all together via `revalidateTag('market-data')` after a scrape run.
 * Endpoints that aren't market-data dependent (none currently) should pass
 * `tags: []` explicitly.
 */
const MARKET_DATA_TAG = "market-data";

async function apiFetch<T>(
  path: string,
  revalidate?: number,
  tags: string[] = [MARKET_DATA_TAG],
): Promise<T> {
  const url = `${getApiUrl()}${path}`;
  const nextOpts: { revalidate: number; tags?: string[] } = {
    revalidate: revalidate !== undefined ? revalidate : 3600,
  };
  if (tags.length) nextOpts.tags = tags;

  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { signal: apiFetchSignal(), next: nextOpts });
      if (res.status === 404) throw new ApiNotFoundError(path);
      if (!res.ok) {
        // 5xx and other non-ok statuses are transient — eligible for retry
        throw new Error(`API ${path} returned ${res.status}`);
      }
      return res.json() as Promise<T>;
    } catch (err) {
      // Real 404s are terminal — never retry, never mask
      if (err instanceof ApiNotFoundError) throw err;
      lastErr = err;
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`API ${path} failed`);
}

export async function getScores(): Promise<ScoresResponse> {
  return apiFetch<ScoresResponse>("/api/scores", 86400);
}

export async function getAllCodes(): Promise<string[]> {
  return apiFetch<string[]>("/api/companies/codes", 86400);
}

export async function getCompanyDetail(code: string): Promise<CompanyDetail> {
  return apiFetch<CompanyDetail>(`/api/company/${code.toUpperCase()}`, 86400);
}

/** Full durable deep-analysis narrative + live value box for the /analysis sub-page.
 *  Throws ApiNotFoundError (404) when no report has been written for the code. */
export async function getDeepAnalysis(code: string): Promise<DeepAnalysisResponse> {
  return apiFetch<DeepAnalysisResponse>(`/api/company/${code.toUpperCase()}/analysis`, 86400);
}

/** Every trading code that has a deep-analysis report (for static params + sitemap). */
export async function getDeepAnalysisCodes(): Promise<string[]> {
  return apiFetch<string[]>("/api/deep-analysis/codes", 86400);
}

export async function getMarketMovers(): Promise<MarketMoversData> {
  return apiFetch<MarketMoversData>("/api/market-movers", 86400);
}

export async function getMarketIndex(): Promise<MarketIndexData> {
  return apiFetch<MarketIndexData>("/api/market-index", 86400);
}

export async function getDividendsUpcoming(): Promise<DividendsUpcoming> {
  return apiFetch<DividendsUpcoming>("/api/dividends/upcoming", 86400);
}

/** Sector hub: one summary per sector + market-wide medians. */
export async function getSectors(): Promise<SectorsListData> {
  return apiFetch<SectorsListData>("/api/sectors", 86400);
}

/** Slugs that have a sector page — for generateStaticParams and the sitemap. */
export async function getSectorSlugs(): Promise<string[]> {
  return apiFetch<string[]>("/api/sectors/slugs", 86400);
}

/** One sector's detail. Throws ApiNotFoundError (404) for an unknown slug. */
export async function getSectorDetail(slug: string): Promise<SectorDetailData> {
  return apiFetch<SectorDetailData>(`/api/sector/${slug}`, 86400);
}

/** Record dates, AGMs and recent declarations for /dividend-calendar. */
export async function getDividendCalendar(): Promise<DividendCalendarData> {
  return apiFetch<DividendCalendarData>("/api/dividend-calendar", 86400);
}

/** Every declaration stored for one company, newest first (raw ledger rows —
 *  no price/score enrichment, unlike the calendar's events). */
export async function getDividendHistory(code: string): Promise<DividendDeclarationRecord[]> {
  return apiFetch<DividendDeclarationRecord[]>(
    `/api/company/${code.toUpperCase()}/dividend-history`,
    86400,
  );
}

// ---- Market Intelligence ----

export interface MarketSignalItem {
  trading_code: string;
  company_name: string | null;
  sector: string | null;
  ltp: number | null;
  change_pct: number | null;
  volume: number | null;
  value_mn: number | null;
  avg_volume_7d: number | null;
  volume_ratio: number | null;
  score: number | null;
}

export interface SectorStrengthItem {
  sector: string;
  avg_change_pct: number;
  count: number;
}

export interface MarketSummary {
  date: string | null;
  avg_change_pct: number | null;
  gainers: number;
  losers: number;
  flat: number;
  total: number;
}

export interface MarketIntelSignals {
  accumulation_radar?: MarketSignalItem[];
  resilience_leaders?: MarketSignalItem[];
  floor_watch?: MarketSignalItem[];
  volume_breakouts?: MarketSignalItem[];
  momentum_leaders?: MarketSignalItem[];
  quality_laggards?: MarketSignalItem[];
  volume_divergence?: MarketSignalItem[];
  dividend_capture?: MarketSignalItem[];
  hidden_gems?: MarketSignalItem[];
  sector_strength?: SectorStrengthItem[];
}

export interface MarketIntelligenceData {
  market_condition: "falling" | "rising" | "sideways" | "unknown";
  market_summary: MarketSummary;
  signals: MarketIntelSignals;
}

export async function getMarketIntelligence(): Promise<MarketIntelligenceData> {
  return apiFetch<MarketIntelligenceData>("/api/market-intelligence", 86400);
}

// ---- DSE Today ----

export interface DseTodayTableItem {
  trading_code: string;
  company_name: string | null;
  sector: string | null;
  ltp: number | null;
  change_pct: number | null;
  volume: number | null;
  value_mn: number | null;
}

export interface DseTodayNewsItem {
  trading_code: string;
  company_name: string | null;
  title: string;
  body: string | null;
  post_date: string | null;
}

export interface DseTodayIntelligence {
  market_condition: "falling" | "rising" | "sideways" | "unknown";
  sector_strength: SectorStrengthItem[];
}

export interface DseTodayData {
  header: MarketIndexData;
  movers: MarketMoversData;
  intelligence: DseTodayIntelligence;
  table: DseTodayTableItem[];
  news: DseTodayNewsItem[];
}

export async function getDseToday(): Promise<DseTodayData> {
  return apiFetch<DseTodayData>("/api/dse-today", 86400);
}

/** Every story from the latest news day, market-wide (same item shape as the
 *  dse-today bundle). Powers the /todays-news page. */
export async function getTodaysNews(): Promise<DseTodayNewsItem[]> {
  return apiFetch<DseTodayNewsItem[]>("/api/news/today", 900);
}

export async function getStockLists(): Promise<import("@/lib/stock-lists").StockListsResponse> {
  return apiFetch("/api/stock-lists", 86400);
}

/** Flatten all tiers into a single array, including pillar scores. Used by insight pages. */
export async function getInsightScores(): Promise<ScoreItem[]> {
  const res = await apiFetch<ScoresResponse>("/api/scores", 86400);
  return flattenTiers(res);
}

export interface WatchlistNewsItem {
  trading_code: string;
  title: string;
  post_date: string;
  body: string;
}

export async function getWatchlistNews(codes: string[]): Promise<WatchlistNewsItem[]> {
  if (!codes.length) return [];
  const res = await fetch(`${getApiUrl()}/api/news/multi?codes=${encodeURIComponent(codes.join(","))}`);
  if (!res.ok) return [];
  return res.json() as Promise<WatchlistNewsItem[]>;
}

// ---- Market Analysis ----

export interface NearExtremeItem {
  trading_code: string;
  company_name: string | null;
  sector: string | null;
  ltp: number | null;
  w52_high: number | null;
  w52_low: number | null;
  gap_pct: number | null;
  change_pct: number | null;
}

export interface NearExtremesData {
  near_high: NearExtremeItem[];
  near_low: NearExtremeItem[];
  date: string | null;
}

export async function getNearExtremes(): Promise<NearExtremesData> {
  return apiFetch<NearExtremesData>("/api/market/near-extremes", 86400);
}

export interface Range52wItem {
  trading_code: string;
  w52_high: number | null;
  w52_low: number | null;
}

/** Client-side bulk 52-week ranges for a small set of codes (portfolio rows). */
export async function getRange52w(codes: string[]): Promise<Range52wItem[]> {
  if (!codes.length) return [];
  try {
    const res = await fetch(`${getApiUrl()}/api/market/52w?codes=${encodeURIComponent(codes.join(","))}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: Range52wItem[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

/** Client-side bulk Bengali "এক নজরে" summaries → {code: summary}. */
export async function getBengaliSummaries(codes: string[]): Promise<Record<string, string>> {
  if (!codes.length) return {};
  try {
    const res = await fetch(`${getApiUrl()}/api/summaries/multi?codes=${encodeURIComponent(codes.join(","))}`);
    if (!res.ok) return {};
    return (await res.json()) as Record<string, string>;
  } catch {
    return {};
  }
}

// ---- Market State (the "complete picture of the market right now" page) ----

export type MoodTone = "up" | "down" | "weak" | "steady";
export type CellTone = "pos" | "neg" | "neutral";

export interface MarketMoodChip {
  label: string;
  value: string;
}

export interface MarketMood {
  label: string;
  tone: MoodTone;
  sentence: string;
  sentence2: string;
  best_lens: string;
  chips: MarketMoodChip[];
}

export interface MarketQuestion {
  q: string;
  a: string;
  extra?: string | null;
  tone: CellTone;
}

export interface MarketSectorRow {
  name: string;
  status: string;
  tone: CellTone;
  ret_1w: number;
  ret_1m: number | null;
  count: number;
}

export interface MarketQuality {
  total: number;
  strong: number;
  good: number;
  soso: number;
  risky: number;
  median_score: number | null;
}

export interface MarketTrendPoint {
  date: string | null;
  cheap_pct: number | null;
  median_pe: number | null;
}

export interface MarketTurningStock {
  trading_code: string;
  company_name: string | null;
  sector?: string | null;
  gap_pct: number;
  last_price?: number | null;
}

export interface MarketDividendEvent {
  trading_code: string;
  company_name: string | null;
  sector?: string | null;
  date: string;
  dividend_pct: number | null;
  kind: "record" | "declared";
  last_price?: number | null;
}

export interface MarketUnusualStock {
  trading_code: string;
  company_name: string | null;
  sector?: string | null;
  volume_ratio: number;
  change_pct: number | null;
  last_price?: number | null;
}

export interface MarketChanceStock {
  trading_code: string;
  company_name: string | null;
  sector: string;
  score?: number;
  pe?: number;
  div_yield_pct?: number;
  ret_1w?: number;
  ret_1m?: number | null;
  last_price?: number | null;
}

export interface MarketStateData {
  date: string | null;
  /** Plain-Bangla "আজকের বাজার এক নজরে" paragraph (template-rendered on the backend). */
  summary_bn?: string | null;
  mood: MarketMood;
  now: {
    questions: MarketQuestion[];
    sectors: MarketSectorRow[];
    quality: MarketQuality;
  };
  trend: {
    points: MarketTrendPoint[];
    has_history: boolean;
  };
  next: {
    unusual: MarketUnusualStock[];
    near_high: MarketTurningStock[];
    near_low: MarketTurningStock[];
    dividends: MarketDividendEvent[];
  };
  chances: {
    best: string;
    on_sale: MarketChanceStock[];
    income: MarketChanceStock[];
    rising: MarketChanceStock[];
    fallen: MarketChanceStock[];
  };
  stats: {
    advancing_pct: number | null;
    price_pos_pct: number | null;
    cheap_pct: number | null;
    median_pe: number | null;
    week_change_pct: number | null;
    feeling_score: number;
  };
}

export async function getMarketState(revalidate = 900): Promise<MarketStateData> {
  return apiFetch<MarketStateData>("/api/market/state", revalidate);
}

/** Client-side price history fetch (no Next.js cache) */
export async function getPriceHistory(code: string, range: "1y" | "2y" | "3y" | "5y" | "all" = "1y"): Promise<PricePoint[]> {
  const res = await fetch(`${getApiUrl()}/api/company/${code.toUpperCase()}/prices?range=${range}`);
  if (!res.ok) throw new Error(`Price history fetch failed: ${res.status}`);
  return res.json() as Promise<PricePoint[]>;
}

// ---------------------------------------------------------------------------
// Auth types & helpers (client-side only)
// ---------------------------------------------------------------------------

import { type AuthUser, getToken, logout } from "@/lib/auth";

export interface RegisterPayload {
  email?: string;
  phone?: string;
  password: string;
  display_name?: string;
}

export interface LoginPayload {
  email?: string;
  phone?: string;
  password: string;
}

export interface AuthApiResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

async function apiAuthFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${getApiUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (res.status === 401) {
    logout();
    throw new Error("AUTH_EXPIRED");
  }
  if (!res.ok) {
    let detail = `API ${path} returned ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {}
    const err = new Error(detail) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

export async function apiRegister(payload: RegisterPayload): Promise<AuthApiResponse> {
  return apiAuthFetch<AuthApiResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiLogin(payload: LoginPayload): Promise<AuthApiResponse> {
  return apiAuthFetch<AuthApiResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiGoogleSignIn(idToken: string): Promise<AuthApiResponse> {
  return apiAuthFetch<AuthApiResponse>("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ id_token: idToken }),
  });
}

export async function apiGetMe(): Promise<{ user: AuthUser }> {
  return apiAuthFetch<{ user: AuthUser }>("/api/auth/me");
}

/** Per-code watchlist metadata: when the user followed it and the official
 *  close that day. Codes followed before this existed have no entry. */
export interface WatchlistMetaEntry {
  added_at: string;
  price_at_add: number | null;
}
export type WatchlistMeta = Record<string, WatchlistMetaEntry>;

export interface WatchlistResponse {
  codes: string[];
  meta?: WatchlistMeta;
}

export async function apiGetWatchlist(): Promise<WatchlistResponse> {
  return apiAuthFetch<WatchlistResponse>("/api/user/watchlist");
}

export async function apiSetWatchlist(codes: string[]): Promise<WatchlistResponse> {
  return apiAuthFetch<WatchlistResponse>("/api/user/watchlist", {
    method: "PUT",
    body: JSON.stringify({ codes }),
  });
}

/** `restore` carries the meta of codes being re-added after an undo so the
 *  server keeps the original "added on" date + price instead of re-stamping. */
export async function apiAddToWatchlist(
  codes: string[],
  restore?: WatchlistMeta,
): Promise<WatchlistResponse> {
  return apiAuthFetch<WatchlistResponse>("/api/user/watchlist/add", {
    method: "PATCH",
    body: JSON.stringify(restore ? { codes, meta: restore } : { codes }),
  });
}

export async function apiRemoveFromWatchlist(codes: string[]): Promise<WatchlistResponse> {
  return apiAuthFetch<WatchlistResponse>("/api/user/watchlist/remove", {
    method: "PATCH",
    body: JSON.stringify({ codes }),
  });
}

export async function apiVisitWatchlist(): Promise<{ previous_visit_at: string | null }> {
  return apiAuthFetch<{ previous_visit_at: string | null }>("/api/user/watchlist/visit", {
    method: "POST",
  });
}

// ---------------------------------------------------------------------------
// Notifications (web push)
// ---------------------------------------------------------------------------

export interface NotificationPrefs {
  daily_digest: boolean;
  watchlist_alerts: boolean;
  dividends: boolean;
  price_extremes: boolean;
  /** Present on newer backends: price-target hits + portfolio signal flips. */
  price_alerts?: boolean;
  portfolio_signals?: boolean;
  /** Digest copy language — Bengali by default. */
  language?: "bn" | "en";
}

export interface NotificationState {
  push_enabled: boolean;
  notification_prefs: NotificationPrefs;
  this_device_registered: boolean;
  configured: boolean;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function apiGetNotificationState(endpoint?: string): Promise<NotificationState> {
  const q = endpoint ? `?endpoint=${encodeURIComponent(endpoint)}` : "";
  return apiAuthFetch<NotificationState>(`/api/notifications/me${q}`);
}

export async function apiSubscribePush(sub: PushSubscriptionPayload): Promise<NotificationState> {
  return apiAuthFetch<NotificationState>("/api/notifications/subscribe", {
    method: "POST",
    body: JSON.stringify(sub),
  });
}

export async function apiUnsubscribePush(endpoint: string): Promise<NotificationState> {
  return apiAuthFetch<NotificationState>("/api/notifications/unsubscribe", {
    method: "POST",
    body: JSON.stringify({ endpoint }),
  });
}

export async function apiUpdateNotificationPrefs(
  prefs?: Partial<NotificationPrefs>,
  pushEnabled?: boolean,
): Promise<NotificationState> {
  return apiAuthFetch<NotificationState>("/api/notifications/prefs", {
    method: "POST",
    body: JSON.stringify({ prefs, push_enabled: pushEnabled }),
  });
}

/** Result of fanning a push out to a user's devices. */
export interface PushSendResult {
  sent: number;
  expired: number;
  failed: number;
}

/** Fire a real test push to all of the current user's registered devices. */
export async function apiSendTestPush(): Promise<PushSendResult> {
  return apiAuthFetch<PushSendResult>("/api/notifications/test", { method: "POST" });
}

// ---------------------------------------------------------------------------
// Stock recommendation
// ---------------------------------------------------------------------------

export interface RecommendationAnswers {
  timeline: "short" | "long";
  strategy: "fundamental_strong" | "market_trending";
  sectors: string[];
  dividend: "income_focused" | "doesnt_matter";
  valuation: "value" | "growth" | "any";
  budget: "under_50" | "50_to_200" | "any";
  risk: "steady" | "balanced" | "aggressive";
  size: "large" | "any" | "small";
}

export interface RecommendedStock {
  trading_code: string;
  company_name: string | null;
  sector: string | null;
  score: number | null;
  tier: string | null;
  ltp: number | null;
  change_pct: number | null;
  div_yield_pct: number | null;
  eps_yoy_pct: number | null;
  p1_biz?: number | null;
  p3_moat?: number | null;
  p4_val?: number | null;
  p5_div?: number | null;
  match_score: number;
  reasons: string[];
}

export interface RecommendationResponse {
  generated_at: string;
  answers_echo: Record<string, unknown>;
  relaxations: string[];
  saved: boolean;
  picks: RecommendedStock[];
}

/** Public POST — works logged-out or logged-in. When a token is present the
 *  backend also saves the result to the user. */
export async function getStockRecommendations(
  answers: RecommendationAnswers,
): Promise<RecommendationResponse> {
  return apiAuthFetch<RecommendationResponse>("/api/recommendations", {
    method: "POST",
    body: JSON.stringify(answers),
  });
}

export async function apiGetLastRecommendation(): Promise<{
  recommendation:
    | (Omit<RecommendationResponse, "answers_echo" | "saved"> & {
        answers: RecommendationAnswers;
        saved_at?: string;
      })
    | null;
}> {
  return apiAuthFetch("/api/user/last-recommendation");
}

export async function apiDeleteLastRecommendation(): Promise<{ ok: boolean }> {
  return apiAuthFetch("/api/user/last-recommendation", { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Daily personalized picks ("Picked for you today")
// ---------------------------------------------------------------------------

export interface DailyPicksResponse {
  date: string;
  generated_at: string;
  personalized: boolean;
  /** True only when the user actually took the quiz (vs watchlist-inferred). */
  tuned?: boolean;
  picks: RecommendedStock[];
  /** Codes new since the user's previous feed (absent on the first-ever feed). */
  new_codes?: string[];
}

/** Auth-only. Returns 5 daily-rotating picks tuned to the user's taste. */
export async function getDailyPicks(): Promise<DailyPicksResponse> {
  return apiAuthFetch<DailyPicksResponse>("/api/user/daily-picks");
}

export interface PickFeedbackResponse {
  feedback: { liked: string[]; disliked: string[] };
  /** Present on a "down" (skip) vote: the next-best pick to backfill the slot. */
  replacement: RecommendedStock | null;
}

/** Like (up = boost only) / skip (down = drop + backfill) / clear a daily pick. */
export async function apiPickFeedback(
  code: string,
  vote: "up" | "down" | "clear",
): Promise<PickFeedbackResponse> {
  return apiAuthFetch<PickFeedbackResponse>("/api/user/picks/feedback", {
    method: "POST",
    body: JSON.stringify({ code, vote }),
  });
}

// ---------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------

export interface PortfolioHolding {
  id: string;
  trading_code: string;
  buy_price: number;
  qty: number;
  added_at: string;
  /** Server-computed Buy More / Sell (else none) — present on GET /api/user/portfolio
   *  (mutation responses return bare holdings; refetch after edits). */
  signal?: HoldingSignalInfo | null;
}

export interface PortfolioResponse {
  holdings: PortfolioHolding[];
}

export async function apiGetPortfolio(): Promise<PortfolioResponse> {
  return apiAuthFetch<PortfolioResponse>("/api/user/portfolio");
}

export async function apiAddHolding(data: {
  trading_code: string;
  buy_price: number;
  qty: number;
}): Promise<{ holding: PortfolioHolding; holdings: PortfolioHolding[] }> {
  return apiAuthFetch("/api/user/portfolio/holdings", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function apiUpdateHolding(
  id: string,
  data: { buy_price?: number; qty?: number },
): Promise<{ holding: PortfolioHolding; holdings: PortfolioHolding[] }> {
  return apiAuthFetch(`/api/user/portfolio/holdings/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function apiDeleteHolding(id: string): Promise<{ holdings: PortfolioHolding[] }> {
  return apiAuthFetch(`/api/user/portfolio/holdings/${id}`, {
    method: "DELETE",
  });
}

export interface PortfolioSignalEvent {
  trading_code: string;
  signal: "buy_more" | "sell" | "none";
  prev_signal: string | null;
  changed_at: string | null;
}

/** Recent Buy More / Sell flips on the user's holdings (in-app bell). */
export async function apiGetSignalEvents(): Promise<{ events: PortfolioSignalEvent[] }> {
  return apiAuthFetch<{ events: PortfolioSignalEvent[] }>("/api/user/portfolio/signal-events");
}

// ---------------------------------------------------------------------------
// Price alerts
// ---------------------------------------------------------------------------

export interface PriceAlert {
  id: string;
  trading_code: string;
  target_price: number;
  direction: "above" | "below";
  is_active: boolean;
  created_at: string | null;
  triggered_at: string | null;
  triggered_price: number | null;
}

export interface AlertsResponse {
  alerts: PriceAlert[];
}

export async function apiGetAlerts(): Promise<AlertsResponse> {
  return apiAuthFetch<AlertsResponse>("/api/user/alerts");
}

export async function apiCreateAlert(data: {
  trading_code: string;
  target_price: number;
}): Promise<{ alert: PriceAlert; alerts: PriceAlert[] }> {
  return apiAuthFetch("/api/user/alerts", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function apiUpdateAlert(
  id: string,
  data: { target_price: number },
): Promise<{ alert: PriceAlert; alerts: PriceAlert[] }> {
  return apiAuthFetch(`/api/user/alerts/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function apiRearmAlert(
  id: string,
): Promise<{ alert: PriceAlert; alerts: PriceAlert[] }> {
  return apiAuthFetch(`/api/user/alerts/${id}/rearm`, {
    method: "POST",
  });
}

export async function apiDeleteAlert(id: string): Promise<{ alerts: PriceAlert[] }> {
  return apiAuthFetch(`/api/user/alerts/${id}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// Visit tracking
// ---------------------------------------------------------------------------

export interface StreakInfo {
  current_streak: number;
  longest_streak: number;
  milestone_hit: number | null; // 7 / 30 / 100 when a milestone is reached this check-in
}

export async function apiAuthPing(
  path?: string,
  extra?: { standalone?: boolean; platform?: string },
): Promise<{ streak: StreakInfo | null } | null> {
  const token = getToken();
  if (!token) return null;
  const body: Record<string, unknown> = {};
  if (path) body.path = path;
  if (extra?.standalone) body.standalone = true;
  if (extra?.platform) body.platform = extra.platform;
  const hasBody = Object.keys(body).length > 0;
  try {
    const res = await fetch(`${getApiUrl()}/api/auth/ping`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
      },
      ...(hasBody ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) return null;
    return (await res.json()) as { streak: StreakInfo | null };
  } catch {
    // fire-and-forget
    return null;
  }
}

/**
 * Mark that the signed-in user sent a message to TopStock AI. Fire-and-forget;
 * no-ops for logged-out users (so the assistant stays usable anonymously and
 * adoption is counted against registered users only).
 */
export async function apiMarkAiUsed(): Promise<void> {
  const token = getToken();
  if (!token) return;
  try {
    await fetch(`${getApiUrl()}/api/user/ai-used`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // fire-and-forget
  }
}

export async function apiTrackStockVisit(code: string): Promise<void> {
  if (!code) return;
  try {
    await fetch(`${getApiUrl()}/api/stock-visit/${code.toUpperCase()}`, {
      method: "POST",
      keepalive: true,
    });
  } catch {
    // fire-and-forget
  }
}

// ---------------------------------------------------------------------------
// Popular stocks
// ---------------------------------------------------------------------------

export interface PopularStockItem {
  rank: number;
  trading_code: string;
  company_name: string | null;
  sector: string | null;
  visits_total: number;
  ltp: number | null;
  change_pct: number | null;
  score: number | null;
  tier: string | null;
}

export interface PopularStocksResponse {
  as_of: string;
  items: PopularStockItem[];
}

export async function getPopularStocks(): Promise<PopularStocksResponse> {
  return apiFetch<PopularStocksResponse>("/api/popular-stocks", 86400);
}

// ---------------------------------------------------------------------------
// Trending Stocks (7-day momentum composite; endpoint remains /api/top-20)
// ---------------------------------------------------------------------------

export interface Top20Item {
  rank: number;
  trading_code: string;
  company_name: string | null;
  sector: string | null;
  ltp: number | null;
  return_7d_pct: number | null;
  rs_vs_dsex_pct: number | null;
  volume_ratio: number | null;
  avg_turnover_7d_mn: number | null;
  up_days_7d: number;
  days_counted: number;
  pct_in_52w_range: number | null;
  composite_score: number;
  rationale: string;
}

export interface Top20Response {
  generated_at: string;
  as_of_date: string | null;
  market_condition: "rising" | "falling" | "sideways" | "unknown" | string;
  dsex_7d_change_pct: number | null;
  universe_size: number;
  items: Top20Item[];
}

export async function getTop20(): Promise<Top20Response> {
  return apiFetch<Top20Response>("/api/top-20", 86400);
}

// ---------------------------------------------------------------------------
// Daily Picks — "Today's Top Picks" (3 per day)
// ---------------------------------------------------------------------------

export type DailyPickSource = "dsef" | "dse_top20";

export interface DailyPickItem {
  slot: number;                // 1, 2, or 3
  source: DailyPickSource;
  source_label: string;        // plain-English: "Trending" or "Top Quality"
  trading_code: string;
  company_name: string | null;
  sector: string | null;
  score: number | null;
  ltp: number | null;
  change_pct: number | null;
  return_7d_pct: number | null;
  reasons: string[];
}

export interface DailyPickYesterdayItem {
  slot: number;
  trading_code: string;
  company_name: string | null;
  next_day_return_pct: number | null;
}

export interface DailyPickYesterday {
  date: string;
  picks: DailyPickYesterdayItem[];
}

export interface DailyPickResponse {
  date: string;
  picks: DailyPickItem[];
  yesterday: DailyPickYesterday | null;
}

export async function getDailyPick(): Promise<DailyPickResponse> {
  return apiFetch<DailyPickResponse>("/api/daily-pick", 86400);
}

export interface DailyPickHistoryDayItem {
  slot: number;
  source: DailyPickSource;
  source_label: string;
  trading_code: string;
  company_name: string | null;
  sector: string | null;
  score: number | null;
  ltp_at_pick: number | null;
  return_7d_pct: number | null;
  next_day_return_pct: number | null;
  reasons: string[];
}

export interface DailyPickHistoryDay {
  date: string;
  picks: DailyPickHistoryDayItem[];
}

export interface DailyPickHistoryResponse {
  days: DailyPickHistoryDay[];
}

export async function getDailyPickHistory(days = 30): Promise<DailyPickHistoryResponse> {
  return apiFetch<DailyPickHistoryResponse>(`/api/daily-pick/history?days=${days}`, 86400);
}

// ---------------------------------------------------------------------------
// TopStockBD Tips — ~10 plain-English fundamental tips, refreshed daily
// ---------------------------------------------------------------------------

export interface DailyTipFact {
  label: string;
  value: string;
}

export interface DailyTip {
  category: string;
  text: string;
  facts?: DailyTipFact[];
  why?: string | null;
  conviction?: number;
  trading_code: string;
  company_name: string | null;
  sector: string | null;
  metric_label: string | null;
  metric_value: number | null;
  ltp: number | null;
}

export interface DailyTipsResponse {
  date: string | null;
  tips: DailyTip[];
}

export async function getDailyTips(): Promise<DailyTipsResponse> {
  return apiFetch<DailyTipsResponse>("/api/daily-tips", 86400);
}

// ---------------------------------------------------------------------------
// Feedback (reviews)
// ---------------------------------------------------------------------------

export interface FeedbackSubmit {
  rating?: number; // 1-5, optional — comment-only feedback is allowed
  comment?: string;
  source?: "homepage" | "popup";
  page?: string;
}

/** Public — works logged-in or logged-out. Sends the bearer token when present
 *  so the admin view can attribute the review to a user. */
export async function apiSubmitFeedback(
  payload: FeedbackSubmit,
): Promise<{ ok: boolean; id?: string }> {
  const token = getToken();
  const res = await fetch(`${getApiUrl()}/api/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = `Feedback failed: ${res.status}`;
    try {
      const b = await res.json();
      if (typeof b?.detail === "string") detail = b.detail;
    } catch {}
    throw new Error(detail);
  }
  return res.json() as Promise<{ ok: boolean; id?: string }>;
}

export interface AdminFeedbackItem {
  id: string;
  rating: number | null;
  comment: string | null;
  source: string;
  page: string | null;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  /** Approved for public display on the landing page. */
  featured: boolean;
  created_at: string;
}

export interface AdminFeedbackStats {
  total: number;
  average: number | null;
  distribution: Record<string, number>; // "1".."5" -> count
  with_comment: number;
  featured: number;
}

export interface AdminFeedbackResponse {
  stats: AdminFeedbackStats;
  items: AdminFeedbackItem[];
}

export async function apiGetAdminFeedback(): Promise<AdminFeedbackResponse> {
  return apiAuthFetch<AdminFeedbackResponse>("/api/admin/feedback");
}

/** Approve / un-approve one review for public display on the landing page.
 *  Nothing a user writes goes public until it is featured here. */
export async function apiFeatureFeedback(
  id: string,
  featured: boolean,
): Promise<{ ok: boolean; id: string; featured: boolean }> {
  return apiAuthFetch(`/api/admin/feedback/${id}/feature`, {
    method: "POST",
    body: JSON.stringify({ featured }),
  });
}

// ---------------------------------------------------------------------------
// Public trust signals (landing page)
// ---------------------------------------------------------------------------

export interface Testimonial {
  name: string | null;
  rating: number | null;
  comment: string;
  date: string | null;
}

export interface TrustStats {
  user_count: number;
  review_count: number;
  review_average: number | null;
  testimonials: Testimonial[];
}

/** Real, checkable numbers for the landing page's trust block. Carries no
 *  performance or accuracy claim — by design.
 *
 *  Revalidates daily to keep the landing page on its own 1-day ISR cadence (the
 *  route inherits the shortest revalidate among its fetches). It also carries
 *  the `market-data` tag, so the scraper's revalidate hook refreshes it with
 *  everything else, and an admin publishing a review can purge it the same way. */
export async function getTrust(): Promise<TrustStats> {
  return apiFetch<TrustStats>("/api/trust", 86400);
}

// ---------------------------------------------------------------------------
// Admin analytics
// ---------------------------------------------------------------------------

export type EngagementSegment = "new" | "active" | "at_risk" | "dormant";
export type SignupSource = "google" | "password";

export interface AdminUserRow {
  user_id: string;
  email: string | null;
  phone: string | null;
  display_name: string | null;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  last_seen_at: string | null;
  total_visits: number;
  has_portfolio: boolean;
  // enriched
  signup_source: SignupSource;
  email_verified: boolean;
  watchlist_count: number;
  portfolio_count: number;
  watchlist_last_visit_at: string | null;
  updated_at: string | null;
  segment: EngagementSegment;
  // power-feature flags
  push_enabled: boolean;
  app_installed: boolean;
  ai_used: boolean;
  has_price_alert: boolean;
  // engagement streaks
  current_streak: number;
  longest_streak: number;
}

export interface AdminAnalyticsStats {
  total_users: number;
  new_today: number;
  new_this_week: number;
  new_this_month: number;
  active_today: number;
  active_last_7d: number;
  with_portfolio: number;
}

export interface AdminSegments {
  new: number;
  active: number;
  at_risk: number;
  dormant: number;
}

export interface AdminAdoption {
  watchlist_only: number;
  portfolio_only: number;
  both: number;
  neither: number;
}

export interface AdminSignupSource {
  google: number;
  password: number;
}

export interface AdminGrowthPoint {
  date: string;     // YYYY-MM-DD
  signups: number;
  active: number;
}

export interface AdminPopularStock {
  code: string;
  count: number;
  total_qty?: number;
}

export interface AdminPopularStocks {
  most_watched: AdminPopularStock[];
  most_held: AdminPopularStock[];
}

export interface AdminFeatureReach {
  total_users: number;
  push: { users: number; devices: number };
  install: { users: number; platforms: Record<string, number> };
  alerts: { users: number; active: number };
  ai: { users: number; messages: number };
}

export interface AdminVisitBand {
  label: string;
  count: number;
}

export interface AdminVisitDistribution {
  bands: AdminVisitBand[];
  under_100: number;
  total_users: number;
}

export interface AdminDauWauMau {
  dau: number;
  wau: number;
  mau: number;
  stickiness: number; // DAU/MAU %
}

export interface AdminActivation {
  signed_up: number;
  returned: number;
  built_watchlist: number;
  added_portfolio: number;
  power_feature: number;
}

export interface AdminRouteToday {
  category: string;
  views: number;
  users: number;
}

export interface AdminAnalyticsResponse {
  stats: AdminAnalyticsStats;
  segments: AdminSegments;
  adoption: AdminAdoption;
  signup_source: AdminSignupSource;
  dau_wau_mau: AdminDauWauMau;
  activation: AdminActivation;
  top_routes_today: AdminRouteToday[];
  feature_reach: AdminFeatureReach;
  visit_distribution: AdminVisitDistribution;
  popular_stocks: AdminPopularStocks;
  growth: AdminGrowthPoint[];
  users: AdminUserRow[];
}

// --- Behavior tab (lazy) ---
export interface AdminCategoryStat {
  category: string;
  views: number;
  users: number;
}
export interface AdminTopPage {
  path: string;
  views: number;
}
export interface AdminStockViewed {
  code: string;
  views: number;
  users: number;
}
export interface AdminAttribution {
  src: string;
  views: number;
  users: number;
}
export interface AdminBehaviorResponse {
  window_days: number;
  active_users: number;
  total_views: number;
  category_mix: AdminCategoryStat[];
  top_pages: AdminTopPage[];
  top_stocks_viewed: AdminStockViewed[];
  attribution: AdminAttribution[];
}

// --- Retention tab (lazy) ---
export interface AdminRetentionStat {
  eligible: number;
  retained: number;
  pct: number;
}
export interface AdminCohortCell {
  week: number;
  count: number;
  pct: number;
}
export interface AdminCohortRow {
  cohort: string; // YYYY-MM-DD (Monday of signup week)
  size: number;
  cells: AdminCohortCell[];
}
export interface AdminActiveHours {
  matrix: number[][]; // [weekday 0=Sun..6=Sat][hour 0..23]
  max: number;
}
export interface AdminRetentionResponse {
  new_user_retention: { d1: AdminRetentionStat; d7: AdminRetentionStat; d30: AdminRetentionStat };
  cohort_grid: AdminCohortRow[];
  active_hours: AdminActiveHours;
}

export interface AdminUserEvent {
  path: string;
  ts: string;
  count: number;
}

export interface AdminPortfolioHolding {
  id: string;
  trading_code: string;
  buy_price: number;
  qty: number;
  added_at: string | null;
}

export interface AdminUserDetail {
  user_id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  signup_source: SignupSource;
  email_verified: boolean;
  created_at: string | null;
  last_login_at: string | null;
  last_seen_at: string | null;
  watchlist_last_visit_at: string | null;
  total_visits: number;
  segment: EngagementSegment;
  watchlist: string[];
  portfolio: AdminPortfolioHolding[];
  recent_events: AdminUserEvent[];
}

export async function apiGetAdminAnalytics(): Promise<AdminAnalyticsResponse> {
  return apiAuthFetch<AdminAnalyticsResponse>("/api/admin/analytics");
}

export async function apiGetAdminUser(userId: string): Promise<AdminUserDetail> {
  return apiAuthFetch<AdminUserDetail>(`/api/admin/users/${encodeURIComponent(userId)}`);
}

export async function apiGetAdminBehavior(days = 30): Promise<AdminBehaviorResponse> {
  return apiAuthFetch<AdminBehaviorResponse>(`/api/admin/analytics/behavior?days=${days}`);
}

export async function apiGetAdminRetention(): Promise<AdminRetentionResponse> {
  return apiAuthFetch<AdminRetentionResponse>("/api/admin/analytics/retention");
}

// ---------------------------------------------------------------------------
// Admin — Email campaigns (re-engagement)
// ---------------------------------------------------------------------------

export type CampaignSegment = "portfolio" | "watchlist" | "cold";

export interface CampaignAudience {
  inactive_days: number;
  eligible: number;
  by_segment: Record<CampaignSegment, number>;
  opted_out: number;
  no_email: number;
}

export async function apiGetCampaignAudience(inactiveDays: number): Promise<CampaignAudience> {
  return apiAuthFetch<CampaignAudience>(`/api/admin/campaigns/audience?inactive_days=${inactiveDays}`);
}

/** Returns the rendered email HTML (text) for an in-iframe preview. */
export async function apiPreviewCampaign(segment: CampaignSegment): Promise<string> {
  const token = getToken();
  const res = await fetch(
    `${getApiUrl()}/api/admin/campaigns/preview?segment=${encodeURIComponent(segment)}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  );
  if (res.status === 401) { logout(); throw new Error("AUTH_EXPIRED"); }
  if (!res.ok) throw new Error(`Preview failed: ${res.status}`);
  return res.text();
}

export interface CampaignTestResult { ok: boolean; to: string; message_id: string; }

export async function apiSendTestEmail(
  segment: CampaignSegment,
  toEmail?: string,
): Promise<CampaignTestResult> {
  return apiAuthFetch<CampaignTestResult>("/api/admin/campaigns/test", {
    method: "POST",
    body: JSON.stringify({ segment, to_email: toEmail || undefined }),
  });
}

export interface CampaignSendResult { campaign_id: string; eligible: number; started: boolean; }

export async function apiSendCampaign(payload: {
  name?: string;
  segments?: CampaignSegment[];
  inactive_days: number;
  limit?: number;
}): Promise<CampaignSendResult> {
  return apiAuthFetch<CampaignSendResult>("/api/admin/campaigns/send", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface CampaignStats {
  campaign_id: string;
  status: string;
  eligible: number | null;
  sent: number;
  failed: number;
  opened: number;
}

export async function apiGetCampaignStats(campaignId: string): Promise<CampaignStats> {
  return apiAuthFetch<CampaignStats>(`/api/admin/campaigns/${encodeURIComponent(campaignId)}/stats`);
}

// ---------------------------------------------------------------------------
// Admin — Daily market email (one shared email, auto-selected audience)
// ---------------------------------------------------------------------------

export interface DailyBuy {
  code: string;
  name: string | null;
  change_pct: number | null;
  strength: string | null;
  /** True when this code wasn't on yesterday's buy list. */
  is_new: boolean;
}

/** One block of today's mail and whether it found anything to say. */
export interface DailyBlock {
  key: string;
  label: string;
  detail: string;
  ok: boolean;
}

export interface DailyAudience {
  eligible: number;
  in_cooldown: number;
  ready: number;
  selected: number;
  cap: number;
  lapsed_days: number;
  cooldown_days: number;
}

export interface DailyOverview {
  campaign_id: string;
  date_label: string;
  subject: string;
  preheader: string;
  mood: string;
  buys: DailyBuy[];
  buys_total: number;
  blocks: DailyBlock[];
  audience: DailyAudience;
  already_sent: number;
}

export async function apiGetDailyEmail(cap = 300): Promise<DailyOverview> {
  return apiAuthFetch<DailyOverview>(`/api/admin/campaigns/daily?cap=${cap}`);
}

/** Returns the rendered daily-email HTML (text) for an in-iframe preview. */
export async function apiPreviewDailyEmail(): Promise<string> {
  const token = getToken();
  const res = await fetch(`${getApiUrl()}/api/admin/campaigns/daily/preview`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) { logout(); throw new Error("AUTH_EXPIRED"); }
  if (!res.ok) throw new Error(`Preview failed: ${res.status}`);
  return res.text();
}

export async function apiSendDailyTest(toEmail?: string): Promise<CampaignTestResult> {
  return apiAuthFetch<CampaignTestResult>("/api/admin/campaigns/daily/test", {
    method: "POST",
    body: JSON.stringify({ to_email: toEmail || undefined }),
  });
}

export interface DailySendResult { campaign_id: string; will_send: number; started: boolean; }

export async function apiSendDailyEmail(payload: { subject?: string; cap?: number }): Promise<DailySendResult> {
  return apiAuthFetch<DailySendResult>("/api/admin/campaigns/daily/send", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// Admin — Score Adjustments
// ---------------------------------------------------------------------------

export interface ScoreAdjustment {
  trading_code: string;
  pct: number;
  reason: string | null;
  updated_by: string | null;
  updated_at: string | null;
}

export async function apiAdminListScoreAdjustments(): Promise<{ adjustments: ScoreAdjustment[] }> {
  return apiAuthFetch<{ adjustments: ScoreAdjustment[] }>("/api/admin/score-adjustments");
}

export interface AdminScoreRow {
  trading_code: string;
  company_name: string | null;
  sector: string | null;
  score: number | null;
  base_score: number | null;
  adjustment_pct: number;
  reason: string | null;
  updated_by: string | null;
  updated_at: string | null;
}

export async function apiAdminListScores(): Promise<{ items: AdminScoreRow[] }> {
  return apiAuthFetch<{ items: AdminScoreRow[] }>("/api/admin/scores");
}

async function adminMutate<T>(path: string, init: RequestInit): Promise<T> {
  const token = getToken();
  if (!token) throw new Error("AUTH_EXPIRED");
  const res = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 401) {
    logout();
    throw new Error("AUTH_EXPIRED");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail || body?.error || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function apiAdminUpsertScoreAdjustment(payload: {
  trading_code: string;
  pct: number;
  reason?: string | null;
}): Promise<{ adjustment: ScoreAdjustment }> {
  return adminMutate<{ adjustment: ScoreAdjustment }>("/api/admin/score-adjustment", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiAdminDeleteScoreAdjustment(trading_code: string): Promise<{ deleted: boolean }> {
  return adminMutate<{ deleted: boolean }>(
    `/api/admin/score-adjustment?trading_code=${encodeURIComponent(trading_code)}`,
    { method: "DELETE" },
  );
}

// ---------------------------------------------------------------------------
// Admin — Daily Picks controls
// ---------------------------------------------------------------------------

export interface AdminDailyPickSkip {
  trading_code: string;
  company_name: string | null;
  score_when_skipped: number | null;
  from_slot: number | null;
  skipped_at: string | null;
  skipped_by: string | null;
}

export interface AdminDailyPickItem extends DailyPickItem {
  picked_at: string | null;
}

export interface AdminDailyPickState {
  date: string;
  picks: AdminDailyPickItem[];        // ordered by slot (1, 2, 3) — NOT randomized
  skips_today: AdminDailyPickSkip[];
  yesterday: DailyPickYesterday | null;
}

export async function apiAdminGetDailyPick(): Promise<AdminDailyPickState> {
  return apiAuthFetch<AdminDailyPickState>("/api/admin/daily-pick");
}

export interface AdminRefreshSlotResponse {
  skipped: string | null;
  new_code: string | null;
  slot: number;
  state: AdminDailyPickState;
}

/** Refresh a single slot. Calls the Next.js proxy route which forwards to the
 *  backend and revalidates the homepage's `market-data` ISR cache so the new
 *  pick is visible to all visitors immediately. */
export async function apiAdminRefreshDailyPickSlot(slot: number): Promise<AdminRefreshSlotResponse> {
  const token = getToken();
  if (!token) throw new Error("AUTH_EXPIRED");
  const res = await fetch("/api/admin/refresh-pick", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ slot }),
  });
  if (res.status === 401) {
    logout();
    throw new Error("AUTH_EXPIRED");
  }
  if (res.status === 409) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail || "No remaining candidates for that slot today");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail || body?.error || `Refresh failed: ${res.status}`);
  }
  return res.json() as Promise<AdminRefreshSlotResponse>;
}

// ---------------------------------------------------------------------------
// Admin — Daily Tips curation (remove / restore a stock from the tip list)
// ---------------------------------------------------------------------------

export interface AdminTipExclude {
  trading_code: string;
  company_name: string | null;
  reason: string | null;
  updated_by: string | null;
  updated_at: string | null;
}

export interface AdminDailyTipsState {
  date: string | null;
  tips: DailyTip[];
  excludes: AdminTipExclude[];
}

export async function apiAdminGetDailyTips(): Promise<AdminDailyTipsState> {
  return apiAuthFetch<AdminDailyTipsState>("/api/admin/daily-tips");
}

async function adminEditTips(
  method: "POST" | "DELETE",
  path: string,
  body?: unknown,
): Promise<AdminDailyTipsState> {
  const token = getToken();
  if (!token) throw new Error("AUTH_EXPIRED");
  const res = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (res.status === 401) {
    logout();
    throw new Error("AUTH_EXPIRED");
  }
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error(b?.detail || b?.error || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<AdminDailyTipsState>;
}

/** Remove a stock from the tips (blacklist + regenerate). Revalidates homepage. */
export async function apiAdminExcludeTip(trading_code: string, reason?: string): Promise<AdminDailyTipsState> {
  return adminEditTips("POST", "/api/admin/edit-tips", { trading_code, reason: reason || null });
}

/** Restore a previously-excluded stock. Revalidates homepage. */
export async function apiAdminRestoreTip(trading_code: string): Promise<AdminDailyTipsState> {
  return adminEditTips("DELETE", `/api/admin/edit-tips?trading_code=${encodeURIComponent(trading_code)}`);
}
