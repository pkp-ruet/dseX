import { crore, croreShares } from "@/lib/formatters";

export interface StockListItem {
  trading_code: string;
  company_name: string | null;
  sector: string | null;
  ltp: number | null;
  metric_value: number | null;
}

export interface StockListsResponse {
  top_dividend: StockListItem[];
  top_eps: StockListItem[];
  top_profitable: StockListItem[];
  top_market_cap: StockListItem[];
  top_eps_growth: StockListItem[];
  top_volume: StockListItem[];
  top_52w_return: StockListItem[];
  bank_stocks: StockListItem[];
  pharma_stocks: StockListItem[];
  it_stocks: StockListItem[];
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
  apiKey?: keyof StockListsResponse;
  /** If true, page fetches from /api/scores and renders InsightCards */
  insightMode?: boolean;
  /** If true, page renders sector aggregation instead of stock cards */
  isSectorPage?: boolean;
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
      "The top 20 highest dividend yield stocks listed on the Dhaka Stock Exchange (DSE). Ranked by dividend yield percentage, updated from latest company financials. Ideal for investors seeking regular income from Bangladesh equities.",
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
    slug: "highest-eps-stocks-bangladesh",
    displayName: "Highest EPS Stocks in Bangladesh",
    shortName: "Highest EPS Stocks",
    description:
      "Top 20 companies on the Dhaka Stock Exchange ranked by Earnings Per Share (EPS). Higher EPS means more profit generated per share — a key indicator of company quality and profitability in Bangladesh.",
    keywords: [
      "highest EPS stocks Bangladesh",
      "best EPS stocks DSE",
      "top earning stocks Dhaka",
      "earnings per share Bangladesh",
      "most profitable shares DSE",
    ],
    icon: "📈",
    metricLabel: "EPS (৳)",
    metricFormat: "number",
    apiKey: "top_eps",
    intro:
      "Earnings Per Share (EPS) = net profit divided by total shares outstanding. It tells you how much profit a company generates for each share you hold. Companies with consistently high and growing EPS are generally the strongest businesses on the DSE. Use this list as a starting point, then check whether EPS has been growing or declining over the past 3–5 years.",
    faqs: [
      {
        q: "What is a good EPS for DSE stocks?",
        a: "For most DSE sectors, an EPS above ৳5 is considered decent, above ৳15 is strong, and above ৳30 is exceptional. Banks and pharmaceuticals tend to have higher EPS than other sectors.",
      },
      {
        q: "Does higher EPS always mean a better investment?",
        a: "EPS shows profitability but not valuation. A high EPS stock can still be overpriced if the P/E ratio is too high. Compare EPS with the share price (P/E ratio) to judge whether the stock is fairly valued.",
      },
      {
        q: "How is EPS calculated for DSE companies?",
        a: "EPS = Net Profit After Tax ÷ Total Number of Shares. DSE companies report EPS in their annual financial statements, typically disclosed at the AGM and published in the DSE website.",
      },
    ],
  },
  {
    slug: "most-profitable-companies-bangladesh",
    displayName: "Most Profitable Companies in Bangladesh",
    shortName: "Most Profitable Companies",
    description:
      "Top 20 most profitable companies listed on the Dhaka Stock Exchange, ranked by net profit (in million BDT). These are the companies generating the most absolute profit from their operations in Bangladesh.",
    keywords: [
      "most profitable companies Bangladesh",
      "highest profit companies DSE",
      "top profit stocks Bangladesh",
      "best performing companies Bangladesh",
      "largest profit DSE stocks",
    ],
    icon: "🏆",
    metricLabel: "Net Profit (Cr)",
    metricFormat: "currency",
    apiKey: "top_profitable",
    intro:
      "Net profit (in million BDT) measures the absolute rupee-value profit a company earned in its latest fiscal year after all taxes and expenses. Unlike EPS, net profit isn't affected by share count — making it the best way to compare the raw earnings power of large vs. small companies on the DSE. The companies on this list are the real profit engines of Bangladesh's listed market.",
    faqs: [
      {
        q: "Which companies make the most profit in Bangladesh?",
        a: "Typically, the largest banks, telecom companies, and pharmaceutical firms dominate the top-profit list on the DSE. Their scale and recurring revenue make them consistently profitable.",
      },
      {
        q: "Is net profit different from EPS?",
        a: "Yes. Net profit is the total profit in taka, while EPS divides that profit by the number of shares. A company with high net profit but many shares may have a low EPS. Both metrics matter for a complete picture.",
      },
      {
        q: "Where can I verify these profit figures?",
        a: "All figures are sourced from official DSE-disclosed financial statements. You can cross-check on the DSE website (dse.com.bd) under each company's financial data section.",
      },
    ],
  },
  {
    slug: "top-stocks-bangladesh-2025",
    displayName: "Top Stocks in Bangladesh 2025",
    shortName: "Top Stocks 2025",
    description:
      "The biggest companies on the Dhaka Stock Exchange in 2025, ranked by market capitalisation. Market cap = share price × total shares — the most widely used measure of a company's overall size and stock market value.",
    keywords: [
      "top stocks Bangladesh 2025",
      "best shares to buy Bangladesh 2025",
      "largest stocks DSE 2025",
      "biggest companies Bangladesh stock market",
      "top DSE stocks 2025",
    ],
    icon: "🇧🇩",
    metricLabel: "Market Cap (Cr)",
    metricFormat: "currency_raw",
    apiKey: "top_market_cap",
    intro:
      "Market capitalisation (market cap) = current share price × total shares outstanding. It represents the total market value of a company. Large-cap stocks on the DSE are generally more liquid, more stable, and more widely covered by analysts. This list shows the 20 largest publicly listed companies in Bangladesh by market cap as of 2025.",
    faqs: [
      {
        q: "What are the top stocks to buy in Bangladesh in 2025?",
        a: "The largest companies by market cap — shown above — tend to be the most stable investments. However, 'top' depends on your goals: income investors look at dividend yield, growth investors look at EPS growth, and value investors look at P/E ratio.",
      },
      {
        q: "What is considered a large-cap stock on the DSE?",
        a: "On the DSE, companies with market cap above BDT 5,000 crore (৳50 billion) are generally considered large-cap. These are typically blue-chip companies with long track records.",
      },
      {
        q: "How often does market cap change?",
        a: "Market cap changes every trading day because it is tied to the current share price. This list is updated daily based on the latest traded price from the DSE.",
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
    slug: "best-growth-stocks-bangladesh",
    displayName: "Best Growth Stocks in Bangladesh",
    shortName: "Best Growth Stocks",
    description:
      "Top 20 DSE-listed companies ranked by year-over-year EPS growth percentage. These are the fastest-growing companies in Bangladesh's stock market — ideal for growth-oriented investors.",
    keywords: [
      "best growth stocks Bangladesh",
      "fastest growing stocks DSE",
      "EPS growth stocks Bangladesh",
      "high growth shares Dhaka",
      "growth investing Bangladesh stock market",
    ],
    icon: "🚀",
    metricLabel: "EPS Growth (YoY)",
    metricFormat: "percent",
    apiKey: "top_eps_growth",
    intro:
      "EPS growth (year-over-year) shows how fast a company's earnings are growing compared to the previous year. Companies with consistently high EPS growth tend to command premium valuations — and deliver strong long-term returns. This list identifies the top 20 DSE-listed companies with the highest EPS growth in the most recent reporting period.",
    faqs: [
      {
        q: "What makes a good growth stock on the DSE?",
        a: "Look for companies with 3+ years of positive EPS growth, low debt, and expanding margins. A single year of high growth can be misleading — consistency matters more than a one-year spike.",
      },
      {
        q: "What EPS growth rate is considered strong in Bangladesh?",
        a: "EPS growth above 15% year-over-year is considered strong on the DSE. Above 30% is exceptional, though it's often hard to sustain at that pace for multiple years.",
      },
      {
        q: "How is EPS growth calculated in this list?",
        a: "EPS growth % = (Latest Year EPS − Previous Year EPS) ÷ |Previous Year EPS| × 100. Companies with negative EPS in either year are excluded from this ranking.",
      },
    ],
  },
  {
    slug: "most-traded-stocks-dse",
    displayName: "Most Traded Stocks on DSE",
    shortName: "Most Traded Stocks",
    description:
      "Top 20 highest volume stocks on the Dhaka Stock Exchange. High trading volume means better liquidity — you can buy or sell shares quickly without moving the price significantly.",
    keywords: [
      "most traded stocks DSE",
      "highest volume stocks Bangladesh",
      "most liquid stocks Dhaka",
      "active stocks DSE",
      "high liquidity shares Bangladesh",
    ],
    icon: "📊",
    metricLabel: "Volume",
    metricFormat: "volume",
    apiKey: "top_volume",
    intro:
      "Trading volume is the number of shares bought and sold on the most recent trading day. High-volume stocks are more liquid — meaning you can enter and exit positions at the quoted price without causing significant price impact. For retail investors in Bangladesh, trading in liquid stocks reduces the risk of being stuck in a position you can't exit easily.",
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
        q: "What is considered high volume on the DSE?",
        a: "On the DSE, stocks trading above 1 million shares per day are considered highly liquid. The most active stocks can trade 5–20 million shares on a single day.",
      },
    ],
  },
  {
    slug: "best-bank-stocks-bangladesh",
    displayName: "Best Bank Stocks in Bangladesh",
    shortName: "Best Bank Stocks",
    description:
      "Top 20 banking sector stocks listed on the Dhaka Stock Exchange, ranked by Earnings Per Share (EPS). Bangladesh's banking sector is one of the largest on the DSE — find the fundamentally strongest banks here.",
    keywords: [
      "best bank stocks Bangladesh",
      "top banking stocks DSE",
      "Bangladesh bank shares analysis",
      "highest EPS bank stocks Dhaka",
      "which bank stock to buy Bangladesh",
    ],
    icon: "🏛️",
    metricLabel: "EPS (৳)",
    metricFormat: "number",
    apiKey: "bank_stocks",
    intro:
      "Bangladesh's banking sector is the largest by number of companies on the DSE. Banks earn from the spread between lending and deposit rates, plus fee income. When evaluating bank stocks, EPS is a key starting metric — but also look at Non-Performing Loans (NPL ratio), Capital Adequacy Ratio (CAR), and Return on Equity (ROE) for a complete picture of financial health.",
    faqs: [
      {
        q: "Which bank stocks are the best on the DSE?",
        a: "Based on EPS, the top bank stocks are ranked in the table above. For a fuller analysis, also consider return on equity (ROE) and dividend history — both strong indicators of a well-managed bank.",
      },
      {
        q: "Why do bank stocks on the DSE tend to underperform?",
        a: "Many DSE banks carry high levels of non-performing loans (NPLs) and operate under political lending pressure. Look for banks with NPL ratios below 5% and strong capital adequacy ratios.",
      },
      {
        q: "Are bank stocks risky in Bangladesh?",
        a: "Compared to pharma or telecom, bank stocks carry higher credit risk — especially smaller private commercial banks. Larger, well-capitalised banks like BRAC Bank or Dutch-Bangla Bank are generally more stable.",
      },
    ],
  },
  {
    slug: "best-pharma-stocks-bangladesh",
    displayName: "Best Pharma Stocks in Bangladesh",
    shortName: "Best Pharma Stocks",
    description:
      "Top 20 pharmaceutical and chemical sector stocks on the Dhaka Stock Exchange, ranked by EPS. Bangladesh's pharma sector is export-oriented and consistently one of the best performing on the DSE.",
    keywords: [
      "best pharma stocks Bangladesh",
      "pharmaceutical stocks DSE",
      "top medicine company shares Bangladesh",
      "Square Pharma Beximco analysis",
      "healthcare stocks Bangladesh stock market",
    ],
    icon: "💊",
    metricLabel: "EPS (৳)",
    metricFormat: "number",
    apiKey: "pharma_stocks",
    intro:
      "Bangladesh's pharmaceutical sector is globally competitive — the country exports medicines to over 150 countries. DSE-listed pharma companies typically show strong EPS, consistent dividends, and export-driven revenue growth. This sector has historically outperformed the broader DSE index and is often recommended as a core holding for long-term investors.",
    faqs: [
      {
        q: "Why are pharma stocks considered safe on the DSE?",
        a: "Pharmaceutical demand is inelastic — people need medicine regardless of economic conditions. Bangladesh pharma companies also benefit from low-cost manufacturing and growing export revenue, providing steady earnings.",
      },
      {
        q: "What are the top pharmaceutical companies listed on the DSE?",
        a: "Square Pharmaceuticals, Beximco Pharma, Renata, ACME Laboratories, and ACI are among the most well-known DSE-listed pharma companies, though rankings by EPS can change year to year.",
      },
      {
        q: "How do I evaluate a pharma stock beyond EPS?",
        a: "Look at revenue growth (export vs. domestic mix), R&D investment, dividend consistency, and debt levels. Companies with growing export revenue and low debt tend to be the strongest long-term holds.",
      },
    ],
  },
  {
    slug: "top-performing-stocks-dse",
    displayName: "Top Performing Stocks on DSE",
    shortName: "Top Performing Stocks",
    description:
      "DSE stocks with the highest 52-week return — calculated as percentage gain from the 52-week low to the current price. Identifies the strongest price performers on the Dhaka Stock Exchange over the past year.",
    keywords: [
      "top performing stocks DSE",
      "best stocks last 12 months Bangladesh",
      "highest return stocks DSE",
      "52 week best performers Bangladesh",
      "best price return stocks Dhaka",
    ],
    icon: "⚡",
    metricLabel: "52W Return",
    metricFormat: "percent",
    apiKey: "top_52w_return",
    intro:
      "52-week return = (current price − 52-week low) ÷ 52-week low × 100. This shows how much a stock has recovered or surged from its lowest point over the past year. Strong 52-week performers often reflect improving business fundamentals, but can also indicate speculative momentum — always combine price performance with fundamental analysis before investing.",
    faqs: [
      {
        q: "Does strong past performance predict future returns on the DSE?",
        a: "Not reliably. Past performance is a useful signal but not a guarantee. Stocks with strong fundamentals AND strong price momentum tend to continue outperforming — but speculative rallies without earnings backing often reverse.",
      },
      {
        q: "What does 52-week return mean for a DSE stock?",
        a: "It measures the percentage gain from the lowest price in the past year to the current price. A stock trading at ৳100 that was at ৳50 a year ago has a 100% 52-week return.",
      },
      {
        q: "Should I chase high-performing stocks on the DSE?",
        a: "Chasing momentum is risky. The DSE has circuit breaker rules (10% daily limit), so large moves happen gradually. Always check if the earnings justify the price run-up before buying a high-momentum stock.",
      },
    ],
  },

  // ── Insight-mode lists (use /api/scores + pillar-based insight text) ─────────

  {
    slug: "best-dse-stocks-2026",
    displayName: "Best DSE Stocks to Buy in 2026",
    shortName: "Best DSE Stocks 2026",
    description:
      "The strongest stocks on the Dhaka Stock Exchange for 2026 — companies that combine steady earnings, healthy finances, a fair price, and dependable dividends. Plain-English picks, updated daily from real company filings.",
    keywords: [
      "best DSE stocks 2026",
      "top stocks to buy Bangladesh 2026",
      "best shares DSE 2026",
      "highest rated DSE stocks 2026",
      "top DSEF score stocks Bangladesh",
      "best stocks Dhaka Stock Exchange 2026",
    ],
    icon: "🏆",
    metricLabel: "Overall strength",
    metricFormat: "score",
    insightMode: true,
    intro:
      "To build this list, we look at five things that matter for any company: are profits growing, is the balance sheet healthy, does it hold a strong position in its market, is the price fair, and does it pay a reliable dividend. Only the companies that score well across the board make the cut. Everything comes straight from official company filings and is refreshed every day.",
    faqs: [
      {
        q: "What makes a stock one of the 'best' on the DSE in 2026?",
        a: "We weigh five things together: growing profits, a healthy balance sheet, a strong market position, a fair share price, and dependable dividends. A company has to do well on most of these — not just one — to land near the top.",
      },
      {
        q: "How often does this list update?",
        a: "It refreshes daily as new prices and company filings come in. During earnings season the order can shift noticeably as fresh profit and dividend figures land.",
      },
      {
        q: "Are these stocks safe to buy?",
        a: "These are fundamentally strong companies, but no stock is risk-free. Always do your own research, spread your money across sectors, and consider how much risk you're comfortable with before investing.",
      },
    ],
  },

  {
    slug: "best-bank-stocks-2026",
    displayName: "Best Bank Stocks in Bangladesh 2026",
    shortName: "Best Bank Stocks 2026",
    description:
      "The strongest banks and lenders on the Dhaka Stock Exchange for 2026 — judged on the things that actually matter for a bank: steady earnings, sound finances, loan quality, and reliable dividends.",
    keywords: [
      "best bank stocks Bangladesh 2026",
      "top banking stocks DSE 2026",
      "best NBFI stocks Bangladesh 2026",
      "bank shares to buy 2026",
      "highest rated bank stocks DSE 2026",
      "which bank stock to invest Bangladesh 2026",
    ],
    icon: "🏛️",
    metricLabel: "Overall strength",
    metricFormat: "score",
    insightMode: true,
    intro:
      "Banks are the biggest group of companies on the Dhaka Stock Exchange — but they're not all built the same. A bank doesn't make money the way a factory does, so we judge them differently: how steady their earnings are, how strong their capital cushion is, how clean their loan book is, and how reliably they pay dividends. The names here are the soundest banks and lenders on the exchange.",
    faqs: [
      {
        q: "Why are bank stocks judged differently?",
        a: "A bank earns from lending, not from selling products — so the usual yardsticks don't fit. We lean more on its capital strength and the quality of its loans (how many are going bad) than on ordinary debt or margin measures. That gives a truer read on how solid the bank really is.",
      },
      {
        q: "What are the risks of investing in DSE bank stocks?",
        a: "Key risks include high NPL ratios, interest rate sensitivity, regulatory changes, and political lending pressure. Look for banks with NPL below 5%, strong CAR (Capital Adequacy Ratio), and consistent dividend history.",
      },
      {
        q: "Which DSE bank stocks have the best fundamentals?",
        a: "The list above ranks them for you. As a rule, the strongest are private banks with fewer bad loans, consistent returns, and a steady habit of paying dividends.",
      },
    ],
  },

  {
    slug: "best-stocks-this-month",
    displayName: "Best Stocks to Buy This Month",
    shortName: "Best Stocks This Month",
    description:
      "This month's top picks from the Dhaka Stock Exchange — companies that are both fundamentally strong and showing fresh earnings momentum right now. Updated continuously to reflect today's market.",
    keywords: [
      "best stocks to buy this month Bangladesh",
      "top DSE stocks this month",
      "monthly stock picks Bangladesh",
      "best shares to buy now DSE",
      "top performing stocks Bangladesh monthly",
    ],
    icon: "📅",
    metricLabel: "Overall strength",
    metricFormat: "score",
    insightMode: true,
    intro:
      "This month's picks blend two things: lasting quality (does the company have strong, steady fundamentals?) and fresh momentum (are its earnings improving right now?). A company that's both solid and on the up rises to the top — a mix that a pure quality screen or a pure momentum screen would each miss on its own.",
    faqs: [
      {
        q: "How is this different from the 'best stocks 2026' list?",
        a: "The annual list is about lasting quality. This monthly one adds a timing layer — it rewards companies whose earnings are picking up right now, so a stock can rank higher this month if its recent results just got stronger.",
      },
      {
        q: "How often does this list update?",
        a: "The prices update through every trading day, and the earnings figures update as companies publish new results — usually during quarterly reporting season.",
      },
      {
        q: "Should I buy all the stocks on this list?",
        a: "No — this is a screening list, not investment advice. Use it to identify candidates for deeper research. Check each company's recent news, financial statements, and valuation before making any investment decision.",
      },
    ],
  },

  {
    slug: "best-sector-this-month",
    displayName: "Best Sectors on DSE This Month",
    shortName: "Best Sectors This Month",
    description:
      "Which corners of the Dhaka Stock Exchange are healthiest right now — ranked by the overall strength of the companies inside each sector, plus where earnings growth is strongest this month.",
    keywords: [
      "best sector DSE this month",
      "top sectors Bangladesh stock market",
      "which sector to invest DSE",
      "strongest sectors Dhaka Stock Exchange",
      "best performing sectors Bangladesh",
    ],
    icon: "🗺️",
    metricLabel: "Sector strength",
    metricFormat: "score",
    insightMode: true,
    isSectorPage: true,
    intro:
      "Looking at sectors helps you spot where the good companies are clustered. When a whole sector is healthy — full of firms with steady earnings, sound finances, and fair prices — there are simply more good options to choose from. This page shows where those tailwinds are strongest right now.",
    faqs: [
      {
        q: "Why does the sector matter when picking stocks?",
        a: "Companies in the same sector rise and fall together on the big forces — interest rates move banks, raw-material prices move pharma, global demand moves textiles. Knowing which sectors are strongest tells you where to look first.",
      },
      {
        q: "How is a sector ranked here?",
        a: "We take the overall strength of every company in the sector and average it. Sectors with more top-rated names rank higher. A sector needs at least two companies to appear.",
      },
      {
        q: "Does a top sector mean every stock in it is good?",
        a: "No. A strong sector just has a better average — individual companies still vary a lot. Use it to decide where to look, then check each stock on its own.",
      },
    ],
  },

  {
    slug: "undervalued-stocks-2026",
    displayName: "Undervalued DSE Stocks 2026",
    shortName: "Undervalued Stocks 2026",
    description:
      "Solid Dhaka Stock Exchange companies that look cheap right now in 2026 — trading below what their earnings and assets suggest they're worth, both versus their own history and versus their peers.",
    keywords: [
      "undervalued stocks Bangladesh 2026",
      "cheap stocks DSE 2026",
      "value stocks Bangladesh 2026",
      "low PE stocks DSE 2026",
      "best value shares Dhaka Stock Exchange 2026",
      "discounted stocks Bangladesh stock market",
    ],
    icon: "🔍",
    metricLabel: "Overall strength",
    metricFormat: "score",
    insightMode: true,
    intro:
      "Price matters — even a great company is a poor buy if you overpay. A stock lands on this list when it looks cheap on two counts at once: cheaper than its own track record, and cheaper than similar companies. When both line up, the discount is more believable. We also screen out genuinely broken businesses, so what's left is good companies on sale rather than cheap-for-a-reason traps.",
    faqs: [
      {
        q: "What counts as 'undervalued' here?",
        a: "A company makes the list when its share price looks low both against its own history and against its peers. Needing both keeps out businesses that only look cheap because they're quietly falling apart.",
      },
      {
        q: "Are undervalued stocks always a good buy?",
        a: "Not automatically. A stock can be cheap for a good reason — a fading business. That's why we only include companies whose fundamentals are still sound, so you're looking at genuine bargains, not value traps.",
      },
      {
        q: "How often do valuations change on the DSE?",
        a: "Valuations change with every price move and every new earnings disclosure. This list is recomputed daily. During earnings season, both prices and EPS shift rapidly — check back frequently.",
      },
    ],
  },

  {
    slug: "high-growth-stocks-2026",
    displayName: "High Growth Stocks Bangladesh 2026",
    shortName: "High Growth Stocks 2026",
    description:
      "The fastest-compounding companies on the Dhaka Stock Exchange in 2026 — names with the most reliable, year-after-year earnings growth, not just one lucky year.",
    keywords: [
      "high growth stocks Bangladesh 2026",
      "best growth stocks DSE 2026",
      "fastest growing companies Bangladesh 2026",
      "high EPS growth stocks 2026",
      "best growth shares Dhaka Stock Exchange 2026",
    ],
    icon: "🚀",
    metricLabel: "Overall strength",
    metricFormat: "score",
    insightMode: true,
    intro:
      "Real growth investing is about finding businesses that keep getting bigger — not ones that had a single good year. We look for companies with several years of steady profit growth, strong returns on the money they put to work, and improving margins. The names at the top are the genuine compounders of Bangladesh's market.",
    faqs: [
      {
        q: "What makes a stock a 'high-growth' name here?",
        a: "We look for profits that have grown consistently over several years (not one fluke year), strong returns on capital, and margins that are widening rather than shrinking. Those together point to a real growth business.",
      },
      {
        q: "How is growth investing different from value investing?",
        a: "Value investing is about buying cheap. Growth investing is about buying quality businesses whose earnings keep rising, even at a fair price. This list is about the quality of the business, not how cheap it is today.",
      },
      {
        q: "Do growth stocks pay dividends on the DSE?",
        a: "Some do, some don't. High-growth businesses often reinvest profits for expansion rather than paying dividends. A low dividend yield on a growth stock is not a negative — it reflects capital allocation priorities, not financial weakness.",
      },
    ],
  },
];
