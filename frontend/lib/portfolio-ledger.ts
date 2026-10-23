/**
 * Money made so far, from the portfolio log (`/api/user/portfolio` → `log`) and
 * today's holdings. Pure — the page, the statement and the what-if tool share it.
 *
 *   on paper   today's value − what the shares still held cost
 *   sold       profit locked in by sales: qty × (sale price − average cost)
 *   dividends  cash dividends the holdings earned (applied rows only)
 *
 * "Net" figures take the reader's own settings: brokerage `fee_pct` on each
 * side of a trade, and `div_tax_pct` withheld on cash dividends. Gross figures
 * are free; the net lines are Premium (screen-only lock).
 */

import type { PortfolioHolding, PortfolioLogEntry, PortfolioSettings } from "@/lib/api";

export const DEFAULT_PORTFOLIO_SETTINGS: PortfolioSettings = { fee_pct: 0.4, div_tax_pct: 10 };

type Sell = Extract<PortfolioLogEntry, { kind: "sell" }>;
type Buy = Extract<PortfolioLogEntry, { kind: "buy" }>;
type Bonus = Extract<PortfolioLogEntry, { kind: "bonus" }>;
type Dividend = Extract<PortfolioLogEntry, { kind: "dividend" }>;

export const isSell = (e: PortfolioLogEntry): e is Sell => e.kind === "sell";
export const isBuy = (e: PortfolioLogEntry): e is Buy => e.kind === "buy";
export const isAppliedBonus = (e: PortfolioLogEntry): e is Bonus =>
  e.kind === "bonus" && e.status === "applied" && (e.shares_added ?? 0) > 0;
export const isAppliedDividend = (e: PortfolioLogEntry): e is Dividend =>
  e.kind === "dividend" && e.status === "applied" && (e.amount ?? 0) > 0;

export const sellProfit = (e: Sell): number => e.qty * (e.price - e.avg_cost);
const fee = (amount: number, s: PortfolioSettings) => (Math.abs(amount) * s.fee_pct) / 100;

export interface MoneyMade {
  invested: number;
  value: number | null;
  onPaper: number | null;
  sold: number;
  dividends: number;
  total: number | null;
  /** Sold + dividends exist at all — otherwise the card only repeats the hero. */
  hasHistory: boolean;
  net: {
    /** On paper, after the fee you'd pay to sell everything today (the buy-side fee is already in the price you entered). */
    onPaper: number | null;
    /** Sales, after both sides' fees. */
    sold: number;
    /** Dividends after the tax withheld. */
    dividends: number;
    total: number | null;
    fees: number;
    tax: number;
  };
  sales: number;
  dividendPayments: number;
}

export function moneyMade(
  holdings: PortfolioHolding[],
  prices: Map<string, { ltp: number | null }>,
  log: PortfolioLogEntry[],
  settings: PortfolioSettings = DEFAULT_PORTFOLIO_SETTINGS,
): MoneyMade {
  let invested = 0;
  let value = 0;
  let priced = false;
  for (const h of holdings) {
    const cost = h.qty * h.buy_price;
    invested += cost;
    const ltp = prices.get(h.trading_code)?.ltp ?? null;
    if (ltp != null) {
      value += h.qty * ltp;
      priced = true;
    } else {
      value += cost;
    }
  }
  const onPaper = priced ? value - invested : null;

  const sells = log.filter(isSell);
  const divs = log.filter(isAppliedDividend);
  const sold = sells.reduce((a, e) => a + sellProfit(e), 0);
  const dividends = divs.reduce((a, e) => a + (e.amount ?? 0), 0);

  const sellFees = sells.reduce((a, e) => a + fee(e.qty * e.price, settings) + fee(e.qty * e.avg_cost, settings), 0);
  const exitFee = priced ? fee(value, settings) : 0;
  const tax = (dividends * settings.div_tax_pct) / 100;
  const netOnPaper = onPaper != null ? onPaper - exitFee : null;
  const netSold = sold - sellFees;
  const netDiv = dividends - tax;

  return {
    invested,
    value: priced ? value : null,
    onPaper,
    sold,
    dividends,
    total: onPaper != null ? onPaper + sold + dividends : null,
    hasHistory: sells.length > 0 || divs.length > 0,
    net: {
      onPaper: netOnPaper,
      sold: netSold,
      dividends: netDiv,
      total: netOnPaper != null ? netOnPaper + netSold + netDiv : null,
      fees: sellFees + exitFee,
      tax,
    },
    sales: sells.length,
    dividendPayments: divs.length,
  };
}

/** Bonus / dividend rows the reader can still undo — applied in the last `days`. */
export function recentCorrections(log: PortfolioLogEntry[], days = 60): (Bonus | Dividend)[] {
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  return log
    .filter((e): e is Bonus | Dividend =>
      (e.kind === "bonus" || e.kind === "dividend") && e.status === "applied" && e.date >= since)
    .filter((e) => (e.kind === "bonus" ? (e.shares_added ?? 0) > 0 : (e.amount ?? 0) > 0))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Newest first, applied rows and trades only (dismissed / undone rows are bookkeeping). */
export function visibleLog(log: PortfolioLogEntry[]): PortfolioLogEntry[] {
  return log
    .filter((e) => e.kind === "buy" || e.kind === "sell" || isAppliedBonus(e) || isAppliedDividend(e))
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));
}

// ── Yearly statement ─────────────────────────────────────────────────────────

export interface YearStatement {
  year: number;
  buys: Buy[];
  sells: Sell[];
  dividends: Dividend[];
  bonuses: Bonus[];
  bought: number;
  soldValue: number;
  profit: number;
  fees: number;
  dividendsGross: number;
  dividendsTax: number;
  dividendsNet: number;
  bonusShares: number;
}

export function statementYears(log: PortfolioLogEntry[]): number[] {
  const years = new Set<number>([new Date().getFullYear()]);
  for (const e of log) {
    const y = Number(e.date.slice(0, 4));
    if (Number.isFinite(y) && y > 2000) years.add(y);
  }
  return [...years].sort((a, b) => b - a);
}

export function yearStatement(
  log: PortfolioLogEntry[],
  year: number,
  settings: PortfolioSettings = DEFAULT_PORTFOLIO_SETTINGS,
): YearStatement {
  const inYear = (e: PortfolioLogEntry) => e.date.startsWith(String(year));
  const buys = log.filter(isBuy).filter(inYear);
  const sells = log.filter(isSell).filter(inYear);
  const dividends = log.filter(isAppliedDividend).filter(inYear);
  const bonuses = log.filter(isAppliedBonus).filter(inYear);
  const bought = buys.reduce((a, e) => a + e.qty * e.price, 0);
  const soldValue = sells.reduce((a, e) => a + e.qty * e.price, 0);
  const profit = sells.reduce((a, e) => a + sellProfit(e), 0);
  const fees =
    buys.reduce((a, e) => a + fee(e.qty * e.price, settings), 0) +
    sells.reduce((a, e) => a + fee(e.qty * e.price, settings), 0);
  const dividendsGross = dividends.reduce((a, e) => a + (e.amount ?? 0), 0);
  const dividendsTax = (dividendsGross * settings.div_tax_pct) / 100;
  return {
    year, buys, sells, dividends, bonuses,
    bought, soldValue, profit, fees,
    dividendsGross, dividendsTax, dividendsNet: dividendsGross - dividendsTax,
    bonusShares: bonuses.reduce((a, e) => a + (e.shares_added ?? 0), 0),
  };
}

/** The statement as CSV (one row per log entry + a totals block). */
export function statementCsv(st: YearStatement, holdings: PortfolioHolding[], portfolioName: string): string {
  const q = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows: (string | number)[][] = [
    [`${portfolioName} — statement for ${st.year}`],
    [],
    ["Date", "Type", "Stock", "Shares", "Price (Tk)", "Amount (Tk)", "Profit (Tk)"],
  ];
  const all = [...st.buys, ...st.sells, ...st.dividends, ...st.bonuses].sort((a, b) => a.date.localeCompare(b.date));
  for (const e of all) {
    if (e.kind === "buy") rows.push([e.date, "Buy", e.code, e.qty, e.price.toFixed(2), (e.qty * e.price).toFixed(2), ""]);
    else if (e.kind === "sell")
      rows.push([e.date, "Sell", e.code, e.qty, e.price.toFixed(2), (e.qty * e.price).toFixed(2), sellProfit(e).toFixed(2)]);
    else if (e.kind === "dividend")
      rows.push([e.record_date, "Cash dividend", e.code, e.qty ?? "", e.cash_ps.toFixed(2), (e.amount ?? 0).toFixed(2), ""]);
    else rows.push([e.record_date, `Bonus shares (${e.pct}%)`, e.code, e.shares_added ?? 0, "", "", ""]);
  }
  rows.push(
    [],
    ["Bought", "", "", "", "", st.bought.toFixed(2)],
    ["Sold", "", "", "", "", st.soldValue.toFixed(2), st.profit.toFixed(2)],
    ["Estimated fees", "", "", "", "", st.fees.toFixed(2)],
    ["Cash dividends (gross)", "", "", "", "", st.dividendsGross.toFixed(2)],
    ["Tax withheld (estimate)", "", "", "", "", st.dividendsTax.toFixed(2)],
    ["Cash dividends (net)", "", "", "", "", st.dividendsNet.toFixed(2)],
    ["Bonus shares received", "", "", st.bonusShares],
    [],
    ["Holdings today", "", "Stock", "Shares", "Average cost (Tk)", "Cost (Tk)"],
    ...holdings.map((h) => ["", "", h.trading_code, h.qty, h.buy_price.toFixed(2), (h.qty * h.buy_price).toFixed(2)]),
  );
  return rows.map((r) => r.map(q).join(",")).join("\n");
}
