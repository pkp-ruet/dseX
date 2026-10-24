import { crore, croreShares } from "@/lib/formatters";

/*
 * The FREE stock lists — four plain one-number rankings (market facts, not
 * research). The six Premium research lists live in lib/research-lists.ts.
 * Twelve older lists (EPS, profit, growth, bank / pharma, the score-based
 * "best of 2026 / this month / undervalued" shortlists) were removed
 * 2026-10-24 — too many overlapping lists confused readers; their URLs 301
 * in next.config.ts.
 */

export interface StockListItem {
  trading_code: string;
  company_name: string | null;
  sector: string | null;
  ltp: number | null;
  metric_value: number | null;
}

export interface StockListsResponse {
  top_dividend: StockListItem[];
  top_market_cap: StockListItem[];
  /** Ranked by money traded (turnover), not share count — the key name is historical. */
  top_volume: StockListItem[];
  /** 1-year return from the close a year ago (dividend / bonus adjusted) — key name is historical. */
  top_52w_return: StockListItem[];
}

export interface StockListDef {
  slug: string;
  displayName: string;
  shortName: string;
  description: string;
  keywords: string[];
  icon: string;
  metricLabel: string;
  metricFormat: "percent" | "number" | "currency" | "currency_raw" | "volume" | "score";
  apiKey: keyof StockListsResponse;
  intro: string;
  faqs: { q: string; a: string }[];
}

export function getStockList(slug: string): StockListDef | undefined {
  return STOCK_LISTS.find((l) => l.slug === slug);
}

export function formatMetric(value: number | null, format: StockListDef["metricFormat"]): string {
  if (value === null || value === undefined) return "—";
  switch (format) {
    case "percent":
      return `${value.toFixed(2)}%`;
    case "currency":
      // value is in millions of BDT (e.g. net profit) → crore
      return crore(value);
    case "currency_raw":
      // value is in raw BDT (e.g. market cap = shares × price) → crore (÷1e6 → millions first)
      return crore(value / 1e6);
    case "volume":
      // raw share count → crore
      return croreShares(value);
    case "number":
    default:
      return value.toFixed(2);
  }
}

export const STOCK_LISTS: StockListDef[] = [
  {
    slug: "top-dividend-stocks-bangladesh",
    displayName: "Top Dividend Stocks in Bangladesh",
    shortName: "Top Dividend Stocks",
    description:
      "The top 20 highest dividend yield stocks listed on the Dhaka Stock Exchange (DSE), ranked by dividend yield — leaving out category Z, out-of-date accounts and dividends paid out of a loss. Updated from the latest company financials.",
    keywords: [
      "top dividend stocks Bangladesh",
      "highest dividend yield DSE",
      "best dividend paying shares Bangladesh",
      "income stocks DSE",
      "dividend stocks Dhaka Stock Exchange",
    ],
    icon: "💰",
    metricLabel: "Div Yield",
    metricFormat: "percent",
    apiKey: "top_dividend",
    intro:
      "Dividend yield measures how much a company pays out in dividends relative to its current share price. A higher yield means more income per taka invested. On the DSE, yields above 5% are generally considered attractive — but always cross-check the company's payout history to ensure the dividend is sustainable and not a one-time distribution masking weak fundamentals.",
    faqs: [
      {
        q: "Which DSE stocks pay the highest dividends?",
        a: "The table above ranks all DSE-listed companies by their latest dividend yield. The top companies consistently return 8–15% annually to shareholders through cash dividends.",
      },
      {
        q: "Is a high dividend yield always a good sign in Bangladesh?",
        a: "Not necessarily. A very high yield can result from a falling share price rather than a large dividend. Always check 3–5 years of dividend history and the company's earnings stability before investing.",
      },
      {
        q: "How often do DSE companies pay dividends?",
        a: "Most DSE-listed companies declare dividends once a year after their annual general meeting (AGM). Some larger companies declare interim dividends mid-year as well.",
      },
    ],
  },
  {
    slug: "largest-companies-dse",
    displayName: "Largest Companies by Market Cap on DSE",
    shortName: "Largest Companies DSE",
    description:
      "Ranking of the 20 largest companies listed on the Dhaka Stock Exchange by total market capitalisation. A definitive list of Bangladesh's biggest publicly traded companies.",
    keywords: [
      "largest companies DSE",
      "biggest stocks Bangladesh",
      "highest market cap DSE",
      "large cap stocks Bangladesh",
      "Bangladesh blue chip stocks",
    ],
    icon: "🏦",
    metricLabel: "Market Cap (Cr)",
    metricFormat: "currency_raw",
    apiKey: "top_market_cap",
    intro:
      "The largest companies on the DSE by market cap represent the backbone of Bangladesh's stock market. These blue-chip companies span banking, telecom, pharmaceutical, and manufacturing sectors — and are the most heavily traded and widely held stocks in the country. Institutional investors, mutual funds, and index trackers typically concentrate their exposure here.",
    faqs: [
      {
        q: "Which company has the highest market cap on the DSE?",
        a: "The largest companies by market cap on the DSE typically include major banks (like BRAC Bank, Dutch-Bangla Bank), telecom companies (like Grameenphone), and pharmaceuticals (like Square Pharma). Rankings shift with daily price changes.",
      },
      {
        q: "Are large-cap stocks safer in Bangladesh?",
        a: "Generally yes — large-cap stocks have more liquidity, better regulatory scrutiny, and more analyst coverage. However, they can still decline significantly during broader market downturns.",
      },
      {
        q: "What is the A-category on the DSE and does it relate to market cap?",
        a: "Category A on the DSE means the company has held an AGM and paid a dividend of at least 10% in the last year. It relates to governance, not market cap — though many large-cap companies are also Category A.",
      },
    ],
  },
  {
    slug: "most-traded-stocks-dse",
    displayName: "Most Traded Stocks on DSE",
    shortName: "Most Traded Stocks",
    description:
      "The 20 stocks with the most money traded on the Dhaka Stock Exchange on the latest trading day. Heavy trading means better liquidity — you can buy or sell quickly without moving the price much.",
    keywords: [
      "most traded stocks DSE",
      "highest volume stocks Bangladesh",
      "most liquid stocks Dhaka",
      "active stocks DSE",
      "high liquidity shares Bangladesh",
    ],
    icon: "📊",
    metricLabel: "Traded today",
    metricFormat: "currency",
    apiKey: "top_volume",
    intro:
      "This list ranks stocks by the money traded (turnover) on the most recent trading day, not the number of shares — a ৳5 share trading a million times is less activity than a ৳500 share trading 50,000 times. Heavily traded stocks are more liquid — meaning you can enter and exit positions at the quoted price without causing significant price impact. For retail investors in Bangladesh, trading in liquid stocks reduces the risk of being stuck in a position you can't exit easily.",
    faqs: [
      {
        q: "Why does trading volume matter for DSE investors?",
        a: "Volume determines how easily you can buy or sell a stock. Low-volume stocks can have wide bid-ask spreads and unpredictable price movements, making them riskier for retail investors.",
      },
      {
        q: "Are high-volume stocks on the DSE always good investments?",
        a: "Not necessarily. High volume can be driven by speculation or day-trading activity. Always combine volume analysis with fundamental metrics like EPS, dividend yield, and P/E ratio.",
      },
      {
        q: "What counts as heavily traded on the DSE?",
        a: "A stock trading more than ৳10 crore a day is among the busiest on the DSE. Below ৳10 lakh a day it can be hard to buy or sell without moving the price.",
      },
    ],
  },
  {
    slug: "top-performing-stocks-dse",
    displayName: "Top Performing Stocks on DSE",
    shortName: "Top Performing Stocks",
    description:
      "DSE stocks with the highest 1-year return — the change from the price a year ago to today, adjusted for dividends and bonus shares. The strongest price performers on the Dhaka Stock Exchange over the past year.",
    keywords: [
      "top performing stocks DSE",
      "best stocks last 12 months Bangladesh",
      "highest return stocks DSE",
      "52 week best performers Bangladesh",
      "best price return stocks Dhaka",
    ],
    icon: "⚡",
    metricLabel: "1-year return",
    metricFormat: "percent",
    apiKey: "top_52w_return",
    intro:
      "1-year return = (today's price − the price a year ago) ÷ the price a year ago × 100. The old price is adjusted for any dividend or bonus shares since, so a 20% bonus doesn't show up as a fall. Strong 52-week performers often reflect improving business fundamentals, but can also indicate speculative momentum — always combine price performance with fundamental analysis before investing.",
    faqs: [
      {
        q: "Does strong past performance predict future returns on the DSE?",
        a: "Not reliably. Past performance is a useful signal but not a guarantee. Stocks with strong fundamentals AND strong price momentum tend to continue outperforming — but speculative rallies without earnings backing often reverse.",
      },
      {
        q: "What does 1-year return mean for a DSE stock?",
        a: "It measures the change from the price a year ago to today's price. A stock at ৳100 that was ৳50 a year ago has a 100% 1-year return. Dividends and bonus shares in between are adjusted for.",
      },
      {
        q: "Should I chase high-performing stocks on the DSE?",
        a: "Chasing momentum is risky. The DSE has circuit breaker rules (10% daily limit), so large moves happen gradually. Always check if the earnings justify the price run-up before buying a high-momentum stock.",
      },
    ],
  },
];
