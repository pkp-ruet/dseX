const API_URL = process.env.API_URL || "https://dsex.onrender.com";

export interface ScoreItem {
  trading_code: string;
  company_name: string | null;
  sector: string | null;
  market_category: string | null;
  score: number | null;
  ltp: number | null;
  change_pct: number | null;
  eps_yoy_pct: number | null;
  div_yield_pct: number | null;
}

export interface ScoreTiers {
  strong_buy: ScoreItem[];
  safe_buy: ScoreItem[];
  watch: ScoreItem[];
  avoid: ScoreItem[];
}

export interface FrontendTiers {
  strong_buy:    ScoreItem[];
  good_buy:      ScoreItem[];
  safe_buy:      ScoreItem[];
  cautious_buy:  ScoreItem[];
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

export interface CompanyDetail {
  profile: CompanyProfile;
  latest_price: LatestPrice;
  score_row: Record<string, number | string | null> | null;
  signal_flags: SignalFlags;
  financials: Record<string, unknown>[];
  extended_financials: Record<string, unknown>[];
  shareholding: Record<string, unknown> | null;
  dividend_declaration: DividendDeclaration | null;
  news: { title: string; post_date: string; body: string }[];
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

// ---- Fetch helpers ----

async function apiFetch<T>(path: string, revalidate?: number): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    next: revalidate !== undefined ? { revalidate } : { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`API ${path} returned ${res.status}`);
  return res.json() as Promise<T>;
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

/** Client-side price history fetch (no Next.js cache) */
export async function getPriceHistory(code: string, range: "1y" | "2y" | "all" = "1y"): Promise<PricePoint[]> {
  const res = await fetch(`${API_URL}/api/company/${code.toUpperCase()}/prices?range=${range}`);
  if (!res.ok) throw new Error(`Price history fetch failed: ${res.status}`);
  return res.json() as Promise<PricePoint[]>;
}
