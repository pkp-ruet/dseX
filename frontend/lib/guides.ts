export type GuideSection = {
  heading: string;
  body: string | string[];
};

export type Guide = {
  slug: string;
  title: string;
  description: string;
  readTime: string;
  icon: string;
  sections: GuideSection[];
};

export const GUIDES: Guide[] = [
  {
    slug: "how-to-start-investing",
    title: "How to Start Investing in Dhaka Stock Market",
    description:
      "A practical first step for anyone looking to invest in the DSE — what you need, how it works, and what to watch out for.",
    readTime: "6 min read",
    icon: "📈",
    sections: [
      {
        heading: "Why invest in the stock market?",
        body: "The Dhaka Stock Exchange (DSE) gives you the opportunity to own a piece of real businesses — banks, pharmaceuticals, textiles, and more. Unlike a savings account, the stock market offers the potential for your money to grow significantly over time through capital appreciation and dividend income.",
      },
      {
        heading: "Who can invest?",
        body: [
          "Any Bangladeshi citizen aged 18 or above",
          "Non-Resident Bangladeshis (NRBs) with a valid NRB BO account",
          "Foreign nationals with BSEC approval",
          "No minimum income requirement — you can start with as little as ৳5,000",
        ],
      },
      {
        heading: "What you need before investing",
        body: [
          "A Beneficiary Owner (BO) account — this is mandatory to hold shares",
          "A bank account linked to your BO account",
          "National ID card (NID) or passport for verification",
          "A registered stockbroker to place buy/sell orders",
        ],
      },
      {
        heading: "The basic flow",
        body: "Open a BO account → Fund it via your broker → Research companies → Place buy orders through your broker → Hold shares and receive dividends → Sell when you decide to exit.",
      },
      {
        heading: "How much money do you need?",
        body: "There is no formal minimum, but practically speaking, ৳10,000–৳20,000 gives you enough to buy a meaningful number of shares in most companies. Remember to keep some cash in reserve — never invest money you cannot afford to keep locked up for at least 1–2 years.",
      },
      {
        heading: "Common mistakes beginners make",
        body: [
          "Buying based on tips from friends or social media without researching",
          "Investing borrowed money or emergency funds",
          "Panic selling when prices dip temporarily",
          "Concentrating all money in one or two stocks",
          "Ignoring company fundamentals and only chasing price movement",
        ],
      },
      {
        heading: "Key DSE facts to know",
        body: [
          "DSE is the main stock exchange in Bangladesh, located in Dhaka",
          "Trading hours: Sunday to Thursday, 10:00 AM – 2:30 PM",
          "Settlement cycle: T+2 (shares/cash transferred 2 working days after trade)",
          "Circuit breaker: individual stocks cannot move more than 10% up or down in a single day",
          "Two main indices: DSEX (broad market) and DS30 (top 30 blue chips)",
        ],
      },
    ],
  },
  {
    slug: "open-bo-account",
    title: "How to Open a BO Account",
    description:
      "Step-by-step guide to opening a Beneficiary Owner (BO) account — the mandatory account you need to hold shares on the DSE.",
    readTime: "5 min read",
    icon: "🏦",
    sections: [
      {
        heading: "What is a BO account?",
        body: "A Beneficiary Owner (BO) account is an electronic account that holds your shares in dematerialized (digital) form. Without a BO account, you cannot buy, sell, or hold any shares on the Dhaka Stock Exchange. It is maintained by a Depository Participant (DP), which is usually your broker.",
      },
      {
        heading: "Types of BO accounts",
        body: [
          "Individual account — for a single person",
          "Joint account — for two people (e.g., husband and wife)",
          "NRB account — for Non-Resident Bangladeshis",
          "Company account — for institutional investors",
        ],
      },
      {
        heading: "Documents required",
        body: [
          "National ID Card (NID) — front and back copy",
          "Two recent passport-size photographs",
          "Bank account details (account number, routing number, bank name)",
          "Bank statement or cheque leaf (some brokers require this)",
          "TIN certificate (Tax Identification Number) — for accounts above a certain investment level",
          "Nominee information with their NID copy and photograph",
        ],
      },
      {
        heading: "Step-by-step process",
        body: [
          "Step 1: Choose a BSEC-registered broker or DP (see the CDBL or DSE website for the full list)",
          "Step 2: Visit the broker's office or use their online portal if available",
          "Step 3: Fill out the BO account opening form with personal and bank details",
          "Step 4: Submit the required documents (originals for verification, photocopies to submit)",
          "Step 5: Pay the one-time account opening fee (typically ৳400–৳600)",
          "Step 6: Receive your BO account number (16-digit) within 1–3 working days",
        ],
      },
      {
        heading: "Choosing a broker",
        body: "Pick a broker registered with the Bangladesh Securities and Exchange Commission (BSEC). Consider: ease of online trading platform, customer support quality, brokerage commission rates (typically 0.25%–0.50% of trade value), and proximity of their office. Some well-known brokerage houses include EBL Securities, LankaBangla Securities, UCB Stock Brokerage, and BRAC EPL.",
      },
      {
        heading: "Annual fees and charges",
        body: [
          "Annual maintenance fee: ৳400–৳600 (charged by CDBL through your broker)",
          "Some brokers waive the first year's fee as a promotion",
          "No charge for holding shares — you only pay when you trade",
        ],
      },
      {
        heading: "After your account is open",
        body: "You will receive a BO ID (your 16-digit account number). Keep this safe — you need it for all transactions, IPO applications, and dividend collection. Link your bank account properly so dividends and sale proceeds are deposited directly.",
      },
    ],
  },
  {
    slug: "buy-sell-shares",
    title: "How to Buy and Sell Shares",
    description:
      "Learn how to place orders, understand trading hours, and know what happens behind the scenes when you trade on the DSE.",
    readTime: "5 min read",
    icon: "🔄",
    sections: [
      {
        heading: "Trading hours",
        body: [
          "Market open: 10:00 AM (Sunday to Thursday)",
          "Market close: 2:30 PM",
          "Pre-opening session: 9:45 AM – 10:00 AM (orders can be placed, no execution)",
          "The DSE is closed on Fridays, Saturdays, and public holidays",
        ],
      },
      {
        heading: "How to place a buy order",
        body: "Log into your broker's trading platform (web or app). Search for the company by its trading code (e.g., GP for Grameenphone, SQURPHARMA for Square Pharmaceuticals). Select 'Buy', enter the quantity of shares and the price you want to pay, then confirm. Your order goes to the DSE order book and executes when a seller matches your price.",
      },
      {
        heading: "Types of orders",
        body: [
          "Market order — buys/sells immediately at the current best available price",
          "Limit order — you set a maximum buy price or minimum sell price; executes only if the market reaches that price",
          "Most retail investors use limit orders to control their entry/exit price",
        ],
      },
      {
        heading: "How to place a sell order",
        body: "Go to your portfolio in the trading platform, select the shares you want to sell, choose 'Sell', enter quantity and your desired price. Once a buyer matches your price, the trade executes. You will see the cash in your trading account after settlement (T+2).",
      },
      {
        heading: "Settlement: T+2 explained",
        body: "DSE follows a T+2 settlement cycle. This means if you buy shares on Sunday, the shares officially appear in your BO account on Tuesday (2 working days later). Similarly, when you sell, you receive the cash in your account 2 working days after the trade. You cannot sell shares you bought today until Tuesday.",
      },
      {
        heading: "Costs when trading",
        body: [
          "Brokerage commission: 0.25%–0.50% of trade value (charged by your broker)",
          "DSE transaction fee: 0.015% of trade value",
          "CDBL charge: 0.015% of trade value (for share transfer)",
          "Capital gains tax: 15% on gains above ৳25 lakh per year (for non-residents, different rates apply)",
          "No tax on dividends received from DSE-listed companies (exempted for individuals)",
        ],
      },
      {
        heading: "Circuit breaker rules",
        body: "A single stock cannot move more than 10% up or 10% down from the previous day's closing price in a single trading session. This prevents extreme volatility. If a stock hits the upper circuit, buyers outnumber sellers and no more buy orders execute that day. If it hits the lower circuit, sellers outnumber buyers.",
      },
      {
        heading: "Tips for new traders",
        body: [
          "Always use limit orders — never let the market decide your price",
          "Do not invest more than you can hold for 1–2 years",
          "Diversify across at least 4–5 different companies or sectors",
          "Check the company's fundamentals before buying, not just the price chart",
          "Avoid buying stocks that have already risen 30–50% in a short time purely on momentum",
        ],
      },
    ],
  },
  {
    slug: "fundamental-analysis",
    title: "Basic Fundamental Knowledge",
    description:
      "Understand the key financial metrics and concepts every DSE investor should know before picking a stock.",
    readTime: "7 min read",
    icon: "📊",
    sections: [
      {
        heading: "What is fundamental analysis?",
        body: "Fundamental analysis means evaluating a company's financial health and business quality to decide if its stock is worth buying at the current price. Instead of looking at price charts (technical analysis), you look at the company's earnings, debt, dividends, and growth — the actual business underneath the stock price.",
      },
      {
        heading: "Earnings Per Share (EPS)",
        body: "EPS = Net Profit ÷ Total Shares Outstanding. It tells you how much profit the company earns for each share. A company with EPS of ৳10 earned ৳10 per share last year. Higher is generally better. More importantly, look for EPS that grows consistently year after year — a company growing EPS from ৳5 to ৳8 to ৳12 over 3 years is a positive sign.",
      },
      {
        heading: "Price-to-Earnings Ratio (P/E)",
        body: "P/E = Current Share Price ÷ EPS. If a stock trades at ৳100 and EPS is ৳10, P/E is 10x. This means you are paying ৳10 for every ৳1 of earnings. A lower P/E suggests the stock may be undervalued; a very high P/E may mean it is overpriced or that investors expect strong future growth. Compare P/E against the company's own historical average and against sector peers — not against the entire market.",
      },
      {
        heading: "Net Asset Value (NAV)",
        body: "NAV = Total Shareholders' Equity ÷ Total Shares. It represents the book value of each share based on the company's assets minus its liabilities. If a stock trades below its NAV, it may be undervalued. If it trades at 5x NAV, the market is pricing in significant future earnings. NAV is especially important for evaluating banks and financial companies.",
      },
      {
        heading: "Dividend yield",
        body: "Dividend Yield = Annual Dividend Per Share ÷ Current Share Price × 100. If a stock pays ৳5 dividend and trades at ৳100, the yield is 5%. DSE-listed companies declare dividends either in cash or as bonus shares (stock dividend). A consistently paying company with a 4–8% yield is often a sign of financial stability.",
      },
      {
        heading: "Debt and financial health",
        body: [
          "Debt-to-Equity ratio: Total Debt ÷ Total Equity. A ratio above 2x means the company is heavily leveraged and vulnerable to interest rate changes",
          "Current ratio: Current Assets ÷ Current Liabilities. Above 1.5 is generally healthy — the company can pay its short-term obligations",
          "Operating cash flow: A company reporting profits but consistently negative operating cash flow is a warning sign",
        ],
      },
      {
        heading: "Return on Equity (ROE)",
        body: "ROE = Net Profit ÷ Shareholders' Equity × 100. It measures how efficiently a company uses shareholders' money to generate profit. An ROE consistently above 15% is considered good for most sectors. Banks and financial companies typically operate with higher ROE due to leverage.",
      },
      {
        heading: "How to read a company's financials on DSE",
        body: [
          "Go to the DSE website (dsebd.org) → 'Company' tab → search by trading code",
          "Financial statements (Income Statement, Balance Sheet, Cash Flow) are published quarterly",
          "Annual reports are published after the fiscal year ends (most DSE companies follow July–June fiscal year)",
          "Look for at least 3–5 years of data to spot trends, not just last year's numbers",
        ],
      },
      {
        heading: "What TopStockBD does for you",
        body: "Our DSEF Score (0–100) aggregates all these metrics — EPS growth, ROE, debt levels, valuation, and dividend consistency — into a single number. Instead of manually calculating each ratio for 300+ companies, you can use the Score Leaderboard to instantly see which companies score highest on fundamentals. It's a starting point, not a final verdict — always do your own research before investing.",
      },
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
