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
}

export interface ScoreTiers {
  strong_buy: ScoreItem[];
  safe_buy: ScoreItem[];
  watch: ScoreItem[];
  avoid: ScoreItem[];
}

export interface FrontendTiers {
  strong_buy:    ScoreItem[];
  buy:           ScoreItem[];
  keep_watching: ScoreItem[];
  avoid:         ScoreItem[];
}

export interface ScoresResponse {
  algorithm: string;
  computed_at: string;
  tiers: ScoreTiers;
  counts: Record<string, number>;
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
  headline: string;
  tagline: string;
  sentences: string[];
  stance: string;
  horizon_hint: string;
}

export interface CompanyDetail {
  profile: CompanyProfile;
  latest_price: LatestPrice;
  score_row: Record<string, number | string | boolean | null> | null;
  signal_flags: SignalFlags;
  financials: Record<string, unknown>[];
  extended_financials: Record<string, unknown>[];
  shareholding: Record<string, unknown> | null;
  dividend_declaration: DividendDeclaration | null;
  news: { title: string; post_date: string; body: string }[];
  related_stocks: RelatedStock[];
  momentum: MomentumSnapshot | null;
  verdict: StockVerdict | null;
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
  return apiFetch<ScoresResponse>("/api/scores", 3600);
}

export async function getAllCodes(): Promise<string[]> {
  return apiFetch<string[]>("/api/companies/codes", 3600);
}

export async function getCompanyDetail(code: string): Promise<CompanyDetail> {
  return apiFetch<CompanyDetail>(`/api/company/${code.toUpperCase()}`, 3600);
}

export async function getMarketMovers(): Promise<MarketMoversData> {
  return apiFetch<MarketMoversData>("/api/market-movers", 3600);
}

export async function getMarketIndex(): Promise<MarketIndexData> {
  return apiFetch<MarketIndexData>("/api/market-index", 60);
}

export async function getDividendsUpcoming(): Promise<DividendsUpcoming> {
  return apiFetch<DividendsUpcoming>("/api/dividends/upcoming", 3600);
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
  return apiFetch<MarketIntelligenceData>("/api/market-intelligence", 900);
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
  return apiFetch<DseTodayData>("/api/dse-today", 900);
}

export async function getStockLists(): Promise<import("@/lib/stock-lists").StockListsResponse> {
  return apiFetch("/api/stock-lists", 3600);
}

/** Flatten all tiers into a single array, including pillar scores. Used by insight pages. */
export async function getInsightScores(): Promise<ScoreItem[]> {
  const res = await apiFetch<ScoresResponse>("/api/scores", 3600);
  return [
    ...res.tiers.strong_buy,
    ...res.tiers.safe_buy,
    ...res.tiers.watch,
    ...res.tiers.avoid,
  ];
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
  return apiFetch<NearExtremesData>("/api/market/near-extremes", 900);
}

/** Client-side price history fetch (no Next.js cache) */
export async function getPriceHistory(code: string, range: "1y" | "2y" | "3y" | "all" = "1y"): Promise<PricePoint[]> {
  const res = await fetch(`${getApiUrl()}/api/company/${code.toUpperCase()}/prices?range=${range}`);
  if (!res.ok) throw new Error(`Price history fetch failed: ${res.status}`);
  return res.json() as Promise<PricePoint[]>;
}

// ---- Live Market ----

export interface LivePriceItem {
  code: string;
  company_name?: string | null;
  ltp: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  ycp: number | null;
  change: number | null;
  change_pct: number | null;
  volume: number | null;
  value_mn: number | null;
  trade_count: number | null;
}

export interface LiveIndexData {
  dsex: number | null;
  dsex_change: number | null;
  dsex_change_pct: number | null;
  ds30: number | null;
  ds30_change: number | null;
  dses: number | null;
  dses_change: number | null;
}

export interface LiveBreadth {
  advances: number;
  declines: number;
  unchanged: number;
  total: number;
}

export interface LiveSectorItem {
  sector: string;
  avg_change_pct: number | null;
  count: number | null;
}

export interface LiveNewsItem {
  title: string;
  code: string | null;
  date: string | null;
}

export interface MarketLiveData {
  is_open: boolean;
  data_source?: "live" | "cache";
  as_of?: string;
  closes_in_seconds?: number | null;
  opens_in_seconds?: number | null;
  is_trading_day?: boolean;
  server_time_bst?: string;
  message?: string;
  index?: LiveIndexData | null;
  prices?: LivePriceItem[];
  top_gainers?: LivePriceItem[];
  top_losers?: LivePriceItem[];
  volume_leaders?: LivePriceItem[];
  whats_hot?: LivePriceItem[];
  sector_performance?: LiveSectorItem[];
  breadth?: LiveBreadth;
  psn_news?: LiveNewsItem[];
}

/** Client-side live market fetch — always bypasses cache */
export async function getMarketLive(): Promise<MarketLiveData> {
  const res = await fetch(`${getApiUrl()}/api/market-live`, { cache: "no-store" });
  if (!res.ok) throw new Error(`market-live returned ${res.status}`);
  return res.json() as Promise<MarketLiveData>;
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

export async function apiGetWatchlist(): Promise<{ codes: string[] }> {
  return apiAuthFetch<{ codes: string[] }>("/api/user/watchlist");
}

export async function apiSetWatchlist(codes: string[]): Promise<{ codes: string[] }> {
  return apiAuthFetch<{ codes: string[] }>("/api/user/watchlist", {
    method: "PUT",
    body: JSON.stringify({ codes }),
  });
}

export async function apiAddToWatchlist(codes: string[]): Promise<{ codes: string[] }> {
  return apiAuthFetch<{ codes: string[] }>("/api/user/watchlist/add", {
    method: "PATCH",
    body: JSON.stringify({ codes }),
  });
}

export async function apiRemoveFromWatchlist(codes: string[]): Promise<{ codes: string[] }> {
  return apiAuthFetch<{ codes: string[] }>("/api/user/watchlist/remove", {
    method: "PATCH",
    body: JSON.stringify({ codes }),
  });
}

export async function apiVisitWatchlist(): Promise<{ previous_visit_at: string | null }> {
  return apiAuthFetch<{ previous_visit_at: string | null }>("/api/user/watchlist/visit", {
    method: "POST",
  });
}

export async function apiGetWatchlistNotes(): Promise<{ notes: Record<string, string> }> {
  return apiAuthFetch<{ notes: Record<string, string> }>("/api/user/watchlist/notes");
}

export async function apiSetWatchlistNote(code: string, text: string): Promise<{ notes: Record<string, string> }> {
  return apiAuthFetch<{ notes: Record<string, string> }>("/api/user/watchlist/notes", {
    method: "PUT",
    body: JSON.stringify({ code, text }),
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
}

export async function apiGetPortfolio(): Promise<{ holdings: PortfolioHolding[] }> {
  return apiAuthFetch<{ holdings: PortfolioHolding[] }>("/api/user/portfolio");
}

export async function apiAddHolding(data: {
  trading_code: string;
  buy_price: number;
  qty: number;
}): Promise<{ holding: PortfolioHolding }> {
  return apiAuthFetch<{ holding: PortfolioHolding }>("/api/user/portfolio/holdings", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function apiUpdateHolding(
  id: string,
  data: { buy_price?: number; qty?: number },
): Promise<{ holding: PortfolioHolding }> {
  return apiAuthFetch<{ holding: PortfolioHolding }>(`/api/user/portfolio/holdings/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function apiDeleteHolding(id: string): Promise<void> {
  const token = getToken();
  const res = await fetch(`${getApiUrl()}/api/user/portfolio/holdings/${id}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) {
    logout();
    throw new Error("AUTH_EXPIRED");
  }
  if (!res.ok && res.status !== 204) {
    throw new Error(`Delete failed: ${res.status}`);
  }
}

// ---------------------------------------------------------------------------
// Visit tracking
// ---------------------------------------------------------------------------

export async function apiAuthPing(): Promise<void> {
  const token = getToken();
  if (!token) return;
  try {
    await fetch(`${getApiUrl()}/api/auth/ping`, {
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
  return apiFetch<PopularStocksResponse>("/api/popular-stocks", 600);
}

// ---------------------------------------------------------------------------
// DSE Top 20 (7-day momentum composite)
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
  return apiFetch<Top20Response>("/api/top-20", 1800);
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
  return apiFetch<DailyPickResponse>("/api/daily-pick", 3600);
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
  return apiFetch<DailyPickHistoryResponse>(`/api/daily-pick/history?days=${days}`, 3600);
}

// ---------------------------------------------------------------------------
// Admin analytics
// ---------------------------------------------------------------------------

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

export interface AdminAnalyticsResponse {
  stats: AdminAnalyticsStats;
  users: AdminUserRow[];
}

export async function apiGetAdminAnalytics(): Promise<AdminAnalyticsResponse> {
  return apiAuthFetch<AdminAnalyticsResponse>("/api/admin/analytics");
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
