const API_URL = process.env.API_URL || "http://localhost:8000";

export interface ScoreItem {
  trading_code: string;
  company_name: string | null;
  sector: string | null;
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

export interface AuditCompanyRow {
  trading_code: string;
  company_name: string | null;
  eps_years: number;
  profit_years: number;
  dividend_years: number;
  nav_years: number;
  cf_years: number;
  ebit_years: number;
  revenue_years: number;
  news_count: number;
  has_price: boolean;
  has_shareholding: boolean;
}

export interface AuditResponse {
  summary: { total: number; has_financials: number; has_cf: number; missing_price: number };
  companies: AuditCompanyRow[];
}

export interface PricePoint {
  date: string;
  ltp: number | null;
  volume: number | null;
  change_pct: number | null;
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

export async function getDividendsUpcoming(): Promise<DividendsUpcoming> {
  return apiFetch<DividendsUpcoming>("/api/dividends/upcoming", 3600);
}

export async function getAudit(): Promise<AuditResponse> {
  return apiFetch<AuditResponse>("/api/audit", 0);
}

/** Client-side price history fetch (no Next.js cache) */
export async function getPriceHistory(code: string, range: "1y" | "2y" | "all" = "1y"): Promise<PricePoint[]> {
  const res = await fetch(`${API_URL}/api/company/${code.toUpperCase()}/prices?range=${range}`);
  if (!res.ok) throw new Error(`Price history fetch failed: ${res.status}`);
  return res.json() as Promise<PricePoint[]>;
}
