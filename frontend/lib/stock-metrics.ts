// Centralized, null-safe financial-ratio + chart-series math for the stock detail page.
//
// IMPORTANT unit convention:
//   - `extended_financials.*` are RAW BDT (divide by 1e6 for millions).
//   - `financials.profit_mn` and `profile.*_mn` are already in MILLIONS.
// All functions guard against null / zero / negative denominators and return
// `null` (never NaN / Infinity) so callers can render "—" and Recharts draws gaps.

export function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Divide; null if either side null, or denominator is 0 (or non-positive when requirePositiveDen). */
export function safeDiv(
  num: number | null,
  den: number | null,
  requirePositiveDen = false,
): number | null {
  if (num == null || den == null) return null;
  if (den === 0) return null;
  if (requirePositiveDen && den <= 0) return null;
  const r = num / den;
  return Number.isFinite(r) ? r : null;
}

/** Percentage change from `from` → `to`. Null if from is null/<=0. */
export function pctChange(from: number | null, to: number | null): number | null {
  if (from == null || to == null || from <= 0) return null;
  return ((to - from) / from) * 100;
}

/** CAGR (%) over `years`. Null if signs invalid (need positive endpoints) or years<=0. */
export function cagr(first: number | null, last: number | null, years: number): number | null {
  if (first == null || last == null || first <= 0 || last <= 0 || years <= 0) return null;
  const r = Math.pow(last / first, 1 / years) - 1;
  return Number.isFinite(r) ? r * 100 : null;
}

/** Average of the non-null values; null if none. */
export function avgIgnoringNulls(vals: (number | null)[]): number | null {
  const clean = vals.filter((v): v is number => v != null && Number.isFinite(v));
  if (!clean.length) return null;
  return clean.reduce((a, b) => a + b, 0) / clean.length;
}

// ---------------------------------------------------------------------------
// Extended-financials normalization
// ---------------------------------------------------------------------------

export interface ExtRow {
  year: number;
  net_profit: number | null;
  total_equity: number | null;
  revenue: number | null;
  net_interest_income: number | null;
  ebit: number | null;
  interest_expense: number | null;
  operating_cf: number | null;
  gross_profit: number | null;
  total_debt: number | null;
  total_assets: number | null;
  cash_and_equivalents: number | null;
  earning_assets: number | null;
  capex: number | null;
}

/** toNum every field and sort ascending by year. Rows without a usable year are dropped. */
export function normalizeExtFinancials(rows: Record<string, unknown>[]): ExtRow[] {
  return rows
    .map((r) => {
      const year = toNum(r.year);
      if (year == null) return null;
      return {
        year,
        net_profit: toNum(r.net_profit),
        total_equity: toNum(r.total_equity),
        revenue: toNum(r.revenue),
        net_interest_income: toNum(r.net_interest_income),
        ebit: toNum(r.ebit),
        interest_expense: toNum(r.interest_expense),
        operating_cf: toNum(r.operating_cf),
        gross_profit: toNum(r.gross_profit),
        total_debt: toNum(r.total_debt),
        total_assets: toNum(r.total_assets),
        cash_and_equivalents: toNum(r.cash_and_equivalents),
        earning_assets: toNum(r.earning_assets),
        capex: toNum(r.capex),
      } as ExtRow;
    })
    .filter((r): r is ExtRow => r != null)
    .sort((a, b) => a.year - b.year);
}

// ---------------------------------------------------------------------------
// Point-in-time ratios (units cancel, so raw-BDT vs millions is irrelevant)
// ---------------------------------------------------------------------------

/** Return on equity (%). */
export function roe(netProfit: number | null, totalEquity: number | null): number | null {
  const r = safeDiv(netProfit, totalEquity, true);
  return r == null ? null : r * 100;
}

/** Debt-to-equity (x). */
export function debtToEquity(totalDebt: number | null, totalEquity: number | null): number | null {
  return safeDiv(totalDebt, totalEquity, true);
}

/** Interest coverage (x). */
export function interestCoverage(ebit: number | null, interestExpense: number | null): number | null {
  return safeDiv(ebit, interestExpense, true);
}

/** Gross margin (%). */
export function grossMargin(grossProfit: number | null, revenue: number | null): number | null {
  const r = safeDiv(grossProfit, revenue, true);
  return r == null ? null : r * 100;
}

/** Net margin (%). Banks: pass net_interest_income as the revenue fallback. */
export function netMargin(netProfit: number | null, revenueOrNII: number | null): number | null {
  const r = safeDiv(netProfit, revenueOrNII, true);
  return r == null ? null : r * 100;
}

/** Cash-flow quality = operating CF / net profit (x). Both raw BDT, units cancel. */
export function cashFlowQuality(operatingCf: number | null, netProfit: number | null): number | null {
  return safeDiv(operatingCf, netProfit, true);
}

/** Capex intensity (%) = capex / revenue. */
export function capexIntensity(capex: number | null, revenue: number | null): number | null {
  const r = safeDiv(capex == null ? null : Math.abs(capex), revenue, true);
  return r == null ? null : r * 100;
}

/** Market cap in MILLIONS of BDT (total_shares × ltp / 1e6). */
export function marketCapMn(totalShares: number | null, ltp: number | null): number | null {
  if (totalShares == null || ltp == null || totalShares <= 0 || ltp <= 0) return null;
  return (totalShares * ltp) / 1e6;
}

/** P/E — prefer a stored positive value, else LTP/EPS (needs positive EPS). */
export function peRatio(ltp: number | null, eps: number | null, stored?: number | null): number | null {
  if (stored != null && stored > 0) return stored;
  return safeDiv(ltp, eps, true);
}

/** P/B = LTP / NAV per share. */
export function pbRatio(ltp: number | null, navPerShare: number | null): number | null {
  return safeDiv(ltp, navPerShare, true);
}

/** Average ROE over the most recent up-to-3 valid years. */
export function roe3yAvg(rows: ExtRow[]): number | null {
  const last3 = rows.slice(-3);
  const vals = last3.map((r) => roe(r.net_profit, r.total_equity));
  return avgIgnoringNulls(vals);
}

// ---------------------------------------------------------------------------
// Chart series (nulls preserved so Recharts draws breaks, not zero-spikes)
// ---------------------------------------------------------------------------

export interface YearValue {
  year: string;
  value: number | null;
}

/** Revenue in MILLIONS (raw → /1e6). Bank fallback: net_interest_income. */
export function revenueSeries(rows: ExtRow[]): YearValue[] {
  return rows.map((r) => {
    const raw = r.revenue ?? r.net_interest_income;
    return { year: String(r.year), value: raw == null ? null : raw / 1e6 };
  });
}

export interface MarginPoint {
  year: string;
  gross: number | null;
  net: number | null;
}

export function marginSeries(rows: ExtRow[]): MarginPoint[] {
  return rows.map((r) => {
    const rev = r.revenue ?? r.net_interest_income;
    return {
      year: String(r.year),
      gross: grossMargin(r.gross_profit, rev),
      net: netMargin(r.net_profit, rev),
    };
  });
}

export interface DebtEquityPoint {
  year: string;
  debt: number | null;   // millions
  equity: number | null; // millions
  de: number | null;     // ratio
}

export function debtEquitySeries(rows: ExtRow[]): DebtEquityPoint[] {
  return rows.map((r) => ({
    year: String(r.year),
    debt: r.total_debt == null ? null : r.total_debt / 1e6,
    equity: r.total_equity == null ? null : r.total_equity / 1e6,
    de: debtToEquity(r.total_debt, r.total_equity),
  }));
}

/** operating CF / net profit ratio per year. */
export function cashQualitySeries(rows: ExtRow[]): YearValue[] {
  return rows.map((r) => ({
    year: String(r.year),
    value: cashFlowQuality(r.operating_cf, r.net_profit),
  }));
}

export interface PePoint {
  year: string;
  pe: number | null;
}

/** P/E per reported year, preferring stored pe_ratio_*; fallback ltp/eps for the latest year only. */
export function peHistory(financials: Record<string, unknown>[], ltp: number | null): PePoint[] {
  const sorted = [...financials].sort((a, b) => (toNum(a.year) ?? 0) - (toNum(b.year) ?? 0));
  return sorted.map((r, i) => {
    const stored = toNum(r.pe_ratio_cont_basic) ?? toNum(r.pe_ratio_basic);
    let pe = stored != null && stored > 0 ? stored : null;
    // Only the most recent year falls back to live LTP/EPS.
    if (pe == null && i === sorted.length - 1) {
      pe = peRatio(ltp, toNum(r.eps));
    }
    return { year: String(r.year), pe };
  });
}
