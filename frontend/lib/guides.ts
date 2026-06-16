export type GuideSection = {
  heading: string;
  body: string | string[];
};

export type GuideCategory =
  | "Getting Started"
  | "IPOs"
  | "Dividends"
  | "Market Rules & Categories"
  | "Tax & Money Rules"
  | "Understanding Companies";

export type Guide = {
  slug: string;
  title: string;
  description: string;
  readTime: string;
  icon: string;
  category: GuideCategory;
  sections: GuideSection[];
};

// Order in which category sections appear on the /learn page.
export const GUIDE_CATEGORY_ORDER: GuideCategory[] = [
  "Getting Started",
  "Understanding Companies",
  "IPOs",
  "Dividends",
  "Market Rules & Categories",
  "Tax & Money Rules",
];

export const GUIDE_CATEGORY_BLURB: Record<GuideCategory, string> = {
  "Getting Started": "Brand new? Start here. Open your account and make your first trade.",
  IPOs: "How to apply for new shares — the part everyone asks about.",
  Dividends: "The money companies pay you for holding their shares.",
  "Market Rules & Categories": "How the market is organised and the rules that protect you.",
  "Tax & Money Rules": "Save on tax and know what the government takes (and gives back).",
  "Understanding Companies": "How to tell a strong company from a weak one before you buy.",
};

export const GUIDES: Guide[] = [
  {
    slug: "how-to-start-investing",
    title: "How to Start Investing in Dhaka Stock Market",
    description:
      "A practical first step for anyone looking to invest in the DSE — what you need, how it works, and what to watch out for.",
    readTime: "6 min read",
    icon: "📈",
    category: "Getting Started",
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
    category: "Getting Started",
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
    category: "Getting Started",
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
    category: "Understanding Companies",
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
        body: "Our stock score (0–100) brings all these numbers together — profit growth, returns, debt levels, price value, and dividend history — into one easy number. Instead of doing the maths yourself for 300+ companies, you can open the ranking page and instantly see which companies look strongest. Think of it as a helpful starting point, not the final word — always look into a company yourself before you invest.",
      },
    ],
  },
  {
    slug: "apply-for-ipo",
    title: "How to Apply for an IPO in Bangladesh",
    description:
      "An IPO is your chance to buy shares of a company on the very first day it joins the market. Here's how applying works, in plain words.",
    readTime: "7 min read",
    icon: "🎫",
    category: "IPOs",
    sections: [
      {
        heading: "What is an IPO, really?",
        body: "IPO stands for Initial Public Offering. In simple words, it is the first time a private company opens its doors and invites ordinary people like you to become part-owners by buying its shares. Before the IPO, only the founders and a few big investors owned the company. After the IPO, anyone with a share account can own a piece of it. The company does this to raise money — to build a new factory, pay off loans, or grow the business.",
      },
      {
        heading: "Why so many people chase IPOs",
        body: "IPO shares are sold at a fixed, often modest price. Many of these shares jump in price on their first day of trading, so investors who get them can make a quick profit. That is why IPOs are one of the most talked-about things in the Bangladeshi share market. But be careful — not every IPO goes up, and chasing them blindly can also lose you money. Treat it as one opportunity among many, not a guaranteed win.",
      },
      {
        heading: "What you need before you apply",
        body: [
          "A BO account (the account that holds your shares) — if you don't have one yet, open it first",
          "Some money kept ready in the bank account linked to your BO account",
          "Your BO account must have a small minimum investment in other listed shares (the rule changes from time to time, so ask your broker the current amount)",
          "Your mobile number and bank details should be correctly linked, so you get updates and any refund",
        ],
      },
      {
        heading: "How to apply — step by step",
        body: [
          "Step 1: Watch for the IPO announcement. The company and your broker will share the dates when applications open and close",
          "Step 2: Make sure you have enough money in your linked bank account to cover the shares you want",
          "Step 3: Apply during the open window — through your broker's app or website, or your bank's app if it supports IPO applications",
          "Step 4: Enter your BO account number and confirm the amount. The money is held aside until the result comes out",
          "Step 5: Wait for the result. If you are selected, the shares come to your BO account. If not, your money is returned",
        ],
      },
      {
        heading: "Lottery or sure shares? How allotment works",
        body: "Sometimes far more people apply than there are shares available. In that case, shares are given out by a lottery — a fair, random draw — so not everyone who applies will get shares. Other times, every applicant gets a set number of shares (this is called allotment). Your broker will tell you which method an IPO is using. If you don't win the lottery, don't worry — your full application money is returned to your account.",
      },
      {
        heading: "What happens after you get the shares",
        body: "Once shares land in your BO account, you simply wait for the listing day — the day the company starts trading on the market. From that day, you can sell your shares whenever you like, just like any other stock. Many people sell on the first day to take an early profit, while others hold on, hoping the company grows over the years. There is no single right choice — it depends on the company and your own plan.",
      },
      {
        heading: "A friendly word of caution",
        body: [
          "Read the company's offer document — it explains what the business does and how it plans to use your money",
          "A popular IPO is not always a good company. Check if it actually earns steady profit",
          "Never borrow money just to apply for an IPO",
          "If you get shares and the price jumps unrealistically on day one, be careful — quick spikes can fall just as fast",
        ],
      },
    ],
  },
  {
    slug: "cash-vs-bonus-dividend",
    title: "Cash Dividend vs Bonus Share — What's the Difference?",
    description:
      "When a company makes a profit, it shares some with you. But it can do this in two very different ways. Here's what each one means for your wallet.",
    readTime: "6 min read",
    icon: "💵",
    category: "Dividends",
    sections: [
      {
        heading: "First, what is a dividend?",
        body: "When a company earns a profit, it can keep all of it to grow the business, or it can give a part of that profit back to its owners — the shareholders. That share of the profit handed back to you is called a dividend. It is the company's way of saying thank you for trusting it with your money. A company can pay this reward in two ways: as cash, or as extra shares.",
      },
      {
        heading: "Cash dividend — money in your hand",
        body: "A cash dividend is exactly what it sounds like: real money sent straight to your bank account. Say you own 100 shares and the company declares a cash dividend of ৳2 per share. You receive ৳200, deposited to the bank account linked to your BO account. You can spend it, save it, or buy more shares with it. Your number of shares stays the same — only your bank balance goes up.",
      },
      {
        heading: "Bonus share — more shares instead of money",
        body: "A bonus share (also called a stock dividend) means the company gives you extra free shares instead of cash. If you own 100 shares and the company declares a 10% bonus, you receive 10 more shares — now you hold 110. No money lands in your bank account. Instead, you simply own a slightly bigger slice of the company. The company keeps its cash to invest in growing the business.",
      },
      {
        heading: "The simple difference",
        body: [
          "Cash dividend: you get money, your share count stays the same",
          "Bonus share: you get more shares, but no money right now",
          "Cash is useful if you want income you can spend today",
          "Bonus shares suit you if you are happy to wait and let your holding grow over time",
        ],
      },
      {
        heading: "So which one is better?",
        body: "Neither is automatically better — it depends on you and the company. A steady cash dividend often signals a stable, mature company that earns more than enough money. Bonus shares are common with growing companies that prefer to reinvest their cash. One thing to watch: when a company gives bonus shares, the price usually adjusts down a little to balance the extra shares, so your total value doesn't magically double. Focus on companies that reward shareholders consistently, year after year, in whatever form.",
      },
      {
        heading: "The record date — the day that decides who gets paid",
        body: "To receive a dividend, you must own the shares on a specific cut-off day set by the company. This is called the record date. If your shares are sitting in your BO account on that day, you qualify — even if you bought them just a few days earlier. If you buy after that day, you miss this round of dividend (the seller gets it instead). So if a dividend matters to you, make sure you are holding the shares before the record date passes.",
      },
      {
        heading: "How and when the reward reaches you",
        body: "After the record date, it takes some time for the company to process everything. A cash dividend is usually sent to your linked bank account within a few weeks. Bonus shares appear directly in your BO account, again after a short processing period. You don't need to do anything to claim them — as long as your bank and BO details are correct and up to date, the reward comes to you automatically.",
      },
    ],
  },
  {
    slug: "share-categories-explained",
    title: "A, B, Z, N Share Categories Explained",
    description:
      "Every stock on the market carries a letter — A, B, Z, or N. That single letter tells you a lot about the company's health. Here's how to read it.",
    readTime: "5 min read",
    icon: "🏷️",
    category: "Market Rules & Categories",
    sections: [
      {
        heading: "What are share categories?",
        body: "Think of share categories as a simple report card the market gives every listed company. With one letter — A, B, Z, or N — you can quickly tell whether a company is doing well, doing okay, or struggling. The category mainly depends on whether the company holds its yearly meeting on time and how regularly it pays dividends to shareholders. Knowing the category before you buy can save you from a lot of trouble.",
      },
      {
        heading: "A category — the well-behaved ones",
        body: "These are the healthiest companies. They hold their yearly general meeting on time and have paid a dividend of at least 10% in the last year. When you see an 'A', it means the company is regular, active, and rewarding its shareholders. Most well-known, trusted companies sit in this group. This is the safest category to start exploring as a beginner.",
      },
      {
        heading: "B category — paying, but a little less",
        body: "These companies also hold their yearly meeting on time, but they paid a smaller dividend — less than 10% in the last year. They are not in trouble, but they are rewarding shareholders more modestly. A 'B' company can still be a fine investment, but it's worth looking a little closer to understand why the dividend was on the smaller side.",
      },
      {
        heading: "Z category — handle with care",
        body: "This is the warning category. A 'Z' company may have skipped its yearly meeting, failed to pay any dividend, or stopped running its business properly. Some have not produced profit for a long time. Prices of Z-category shares can swing wildly and trap your money. Beginners should generally stay away from Z-category stocks until they fully understand the risks — these are where many new investors get burned.",
      },
      {
        heading: "N category — the newcomers",
        body: "The 'N' stands for newly listed. These are companies that have just joined the market through an IPO and haven't completed a full year yet, so they don't have a track record to be graded on. After they complete their first year and hold their first yearly meeting, they get moved into A, B, or Z based on how they performed. Until then, treat them as fresh faces you're still getting to know.",
      },
      {
        heading: "How to check a stock's category",
        body: "Every stock's category is shown right next to its name on the official market website and in your broker's trading app, usually as a small letter or tag. Make it a habit: before you buy any share, glance at its category first. It takes two seconds and instantly tells you whether you're looking at a steady company or a risky one.",
      },
      {
        heading: "What this means for you",
        body: [
          "A category: healthy and regular — the comfortable place to begin",
          "B category: fine, but pays smaller dividends — look a little closer",
          "Z category: risky — best avoided until you really know what you're doing",
          "N category: brand new — no track record yet, so go slow",
          "The category is a quick health check, not the whole story — still study the company before investing",
        ],
      },
    ],
  },
  {
    slug: "tax-rebate-on-shares",
    title: "How to Save Tax by Investing in Shares",
    description:
      "Few investors know this: buying shares can quietly shrink your yearly tax bill. Here's how the investment rebate works, in plain words.",
    readTime: "6 min read",
    icon: "💸",
    category: "Tax & Money Rules",
    sections: [
      {
        heading: "A reward most investors never claim",
        body: "Here is something many people in Bangladesh miss: the government actually encourages you to invest. When you put money into approved places — and listed shares are one of them — you can get a slice of your income tax back at the end of the year. It is completely legal, it is built into the tax law, and yet most small investors never claim it. This guide explains how it works without the confusing tax language.",
      },
      {
        heading: "What is a tax rebate?",
        body: "Think of a rebate as a discount on the tax you owe. Normally you calculate your tax for the year and pay it. But if you have invested in approved things during that year, the government lets you subtract a set amount from your tax bill as a thank-you for saving and investing. So you end up paying less tax than you otherwise would have — just because you invested.",
      },
      {
        heading: "How buying shares lowers your tax",
        body: "Buying shares of companies listed on the stock market counts as an approved investment for this rebate. So do a few other things like a DPS (deposit scheme), life insurance premiums, and government savings certificates. When tax time comes, you add up how much you put into these approved places during the year, and a portion of that amount is taken off your tax bill.",
      },
      {
        heading: "How much can you actually save?",
        body: [
          "The rebate is a percentage of the money you invested in approved places during the year",
          "There is a limit — you cannot count an unlimited amount; it is capped based on your income",
          "The exact percentage and the cap are set by the government and can change from one year to the next",
          "Because the rules change yearly, always check the current year's rate, or ask a tax person, before you count on a specific number",
        ],
      },
      {
        heading: "A simple way to picture it",
        body: "Imagine your tax bill for the year is a certain amount. During that year you also bought shares and paid into a DPS. At tax time, you list those investments. The government applies the rebate percentage to your eligible investment and knocks that figure straight off your tax. The money you would have handed over as tax instead stays invested and working for you. That is the whole idea — you are rewarded for building your savings.",
      },
      {
        heading: "What you need to claim it",
        body: [
          "A TIN (Tax Identification Number) — free to get, and needed to file a tax return",
          "Proof of your investment — for shares, your broker can give you a statement showing what you bought and held",
          "You claim the rebate when you file your yearly income tax return",
          "Keep your investment records safe through the year so claiming is easy at tax time",
        ],
      },
      {
        heading: "Things to keep in mind",
        body: "The rebate is a genuine benefit, but do not buy shares only to save tax — buy good companies first, and treat the tax saving as a bonus on top. Also remember the rules (the percentage and the cap) are reviewed by the government most years, so the figure that was true last year may be different this year. When in doubt, confirm the current rules or sit with a tax adviser for a few minutes — it is worth it.",
      },
    ],
  },
  {
    slug: "tax-on-stock-profits",
    title: "Do You Pay Tax on Your Stock Market Profit?",
    description:
      "When you make money on shares, does the government take a cut? Here's the simple answer for everyday investors in Bangladesh.",
    readTime: "6 min read",
    icon: "🧾",
    category: "Tax & Money Rules",
    sections: [
      {
        heading: "The question on every new investor's mind",
        body: "You bought a share, it went up, you sold it and made a profit. Or a company paid you a dividend. The natural worry follows: do I now owe tax on this? It is a fair question, and the good news is that for most small, everyday investors the answer is gentler than people fear. Let us walk through the two ways you make money from shares and what happens to each.",
      },
      {
        heading: "Profit when you sell a share",
        body: "When you sell a share for more than you paid, that gain is called a capital gain. For ordinary individual investors trading normal amounts in listed shares, this profit has generally not been taxed in Bangladesh — which is one reason the share market is attractive to small savers. Very large investors and company sponsors can face different rules. Because budgets sometimes revisit this, it is wise to confirm the current year's position, but as a regular retail investor you have usually been able to keep your selling profit.",
      },
      {
        heading: "Tax on dividends",
        body: "Dividends are treated a little differently. When a company pays you a cash dividend, a small slice of tax is usually taken out automatically before the money reaches your account — you receive the rest. Having a TIN matters here: investors with a TIN typically have a lower amount deducted than those without one. A certain small amount of dividend income each year may also be exempt for individuals. The key point: you do not have to chase anything — the deduction happens at the source.",
      },
      {
        heading: "The small fees on every trade",
        body: [
          "These are not income tax, but they are deductions, so it helps to know them",
          "Your broker takes a small commission on each buy and sell",
          "There are tiny exchange and settlement charges on each trade",
          "A small source tax is also collected on transactions",
          "Together these are minor, but they are why your profit is always a little less than the headline price difference",
        ],
      },
      {
        heading: "So who really needs to worry?",
        body: "If you are a regular person investing your own savings into listed companies, the tax burden on your share profits is light — usually nothing on the selling profit, and only a small automatic deduction on dividends. The investors who need careful tax planning are those dealing in very large sums, company insiders, or businesses. For most readers of this guide, the system is friendlier than the rumours suggest.",
      },
      {
        heading: "Keep simple records anyway",
        body: "Even when little or no tax is due, it pays to keep a simple record of what you bought, when, and for how much. Your broker's statements do most of this for you. Good records make filing your yearly return easy, help you claim the investment rebate, and settle any question quickly if it ever comes up.",
      },
      {
        heading: "The bottom line",
        body: "For everyday investors: selling profits on listed shares have generally been tax-free, and dividends have a small tax taken out automatically before you are paid. Tax rules do get reviewed by the government from time to time, so check the current year's rules or ask a tax adviser if you are dealing with large amounts. For normal saving and investing, tax should not be the thing that scares you off the market.",
      },
    ],
  },
  {
    slug: "why-you-need-tin",
    title: "What Is a TIN, and Do You Need One?",
    description:
      "A TIN is a free tax ID number — and for an investor, having one quietly saves money. Here's what it is and how to get it.",
    readTime: "4 min read",
    icon: "🪪",
    category: "Tax & Money Rules",
    sections: [
      {
        heading: "What is a TIN?",
        body: "TIN stands for Tax Identification Number. It is simply a unique number the tax authority gives you, like an ID for tax matters. You get it once and keep it for life. Getting one is free, and these days you can do it online from home in a few minutes. Many people imagine a TIN is only for the wealthy or for business owners — but as an investor, it is genuinely useful to have.",
      },
      {
        heading: "Having a TIN is not the same as paying tax",
        body: "This is the biggest misunderstanding, so let us clear it up. Owning a TIN does not mean you suddenly owe tax. A TIN is just an identity number. Whether you actually pay any tax depends on how much you earn — if your income is below the taxable level, you owe nothing, TIN or not. The number simply lets the system recognise you when you do need it.",
      },
      {
        heading: "Why an investor benefits from a TIN",
        body: [
          "Lower dividend deduction: companies usually take out less tax from your cash dividends when you have a TIN",
          "Claim the investment rebate: you need a TIN to file a return and claim back tax for investing in shares",
          "Smoother paperwork: some financial and account-opening steps go more easily with a TIN on file",
          "Peace of mind: your records are clean and you are ready if your income ever crosses the taxable line",
        ],
      },
      {
        heading: "How to get one",
        body: "You can register for a TIN online through the National Board of Revenue's e-TIN website. You will need basic details like your National ID information and a mobile number. The system walks you through a short form, and you receive your TIN certificate immediately to download and save. There is no fee. Keep a copy with your other important documents.",
      },
      {
        heading: "Do you then have to file a tax return?",
        body: "Having a TIN can come with a responsibility to file a yearly tax return, even a simple one, in many cases. Filing is not the same as paying — if you owe nothing, you simply file a return showing that. Think of it as a yearly form rather than a bill. If you are unsure whether you must file, a tax adviser can confirm your situation in a few minutes.",
      },
      {
        heading: "Quick recap",
        body: "A TIN is a free, lifelong tax ID. It does not mean you owe tax. For an investor it lowers the tax taken from your dividends and lets you claim money back for investing. Getting one online is quick. If you are putting money into the share market, it is a small, sensible step worth taking early.",
      },
    ],
  },
  {
    slug: "floor-price-circuit-breaker",
    title: "Floor Price and Circuit Breaker, Explained Simply",
    description:
      "Two safety rules decide how far a share price can move in a single day — and sometimes why it can't move at all. Here's what they mean for you.",
    readTime: "5 min read",
    icon: "🛑",
    category: "Market Rules & Categories",
    sections: [
      {
        heading: "Why the market has speed limits",
        body: "Imagine a road with no speed limit — exciting, but dangerous. The share market is similar. To stop prices from crashing or shooting up too violently in a single day, the market uses safety rules. Two you will hear about often are the circuit breaker and the floor price. Both exist to protect ordinary investors from wild, panicky swings. Knowing how they work means you will never be confused when a price suddenly seems stuck.",
      },
      {
        heading: "The circuit breaker — the daily limit",
        body: "A circuit breaker sets how far a single share's price can move in one day, up or down, from where it closed the day before. On the Dhaka market, a stock generally cannot rise or fall more than about 10% in a single session. So if a share closed at 100 yesterday, it can usually only travel within roughly 90 to 110 today. This stops a single rumour from doubling or destroying a price in an afternoon.",
      },
      {
        heading: "What 'hitting the circuit' means",
        body: "When a stock reaches its allowed limit for the day, people say it has hit the circuit. If it hits the upper limit, it means buyers are desperate and there are few sellers — the price simply stops climbing for the day. If it hits the lower limit, sellers are rushing out and there are few buyers — the price stops falling. Trading can still happen at that limit price, but it cannot go beyond it until the next day.",
      },
      {
        heading: "The floor price — a price that cannot go lower",
        body: "A floor price is a special rule the regulator sometimes sets during very nervous market times. It is a fixed minimum price for a share below which it is not allowed to be traded at all. The idea is to stop a frightening, never-ending slide. It has been used on the Dhaka market in difficult periods to calm panic and protect investors from steep losses.",
      },
      {
        heading: "The catch with floor prices",
        body: "A floor price sounds protective, and in the short term it can be. But there is a downside. If buyers think a share is still too expensive at the floor, they simply will not buy — and because it cannot be sold any lower, it gets stuck. No buyers, no sellers, no trades. Your money can sit frozen in that share until the floor is lifted. That is why floor prices are debated: they stop the fall, but they can also trap people.",
      },
      {
        heading: "What this means for you",
        body: [
          "If a stock is not moving, check whether it has hit a circuit limit or a floor price",
          "A share stuck at its floor can be hard to sell — buyers may simply stay away",
          "Circuit limits reset each day, so a stock can keep moving over several sessions",
          "These rules reduce panic, but they cannot make a weak company strong — fundamentals still matter most",
        ],
      },
    ],
  },
  {
    slug: "dse-indices",
    title: "DSEX, DS30 and DSES: What the Market Numbers Mean",
    description:
      "Every headline says 'the index rose' or 'the index fell.' Here's what those numbers actually are — and which one to watch.",
    readTime: "5 min read",
    icon: "📉",
    category: "Market Rules & Categories",
    sections: [
      {
        heading: "What is a market index?",
        body: "You cannot judge the mood of the whole market by staring at one company. So the exchange bundles many companies together into a single number called an index. When that number goes up, it means most of those companies gained value that day; when it falls, most lost value. An index is like a thermometer for the market's health — one quick reading instead of checking hundreds of stocks one by one.",
      },
      {
        heading: "DSEX — the whole-market thermometer",
        body: "DSEX is the main, broad index of the Dhaka Stock Exchange. It tracks a very large group of listed companies, so it gives you the big-picture mood of the entire market. When the news says the market was up or down today, they almost always mean DSEX. If you only ever watch one number, this is the one — it tells you whether the market overall is having a good day or a bad one.",
      },
      {
        heading: "DS30 — the big, blue-chip companies",
        body: "DS30 follows just 30 of the largest, most actively traded, well-established companies — the household names. Because these are the heavyweights, DS30 tells you how the strongest, most stable part of the market is doing. Sometimes the big companies move differently from the crowd, so comparing DS30 with DSEX can hint at whether investors are favouring safe giants or smaller names.",
      },
      {
        heading: "DSES — the Shariah index",
        body: "DSES is the Shariah index. It tracks only the companies that meet Islamic finance principles — for example, businesses that are not built on interest-based earnings. If you prefer to invest in a way that follows Shariah guidelines, DSES shows you how that slice of the market is performing. It is a helpful reference for faith-conscious investors.",
      },
      {
        heading: "Why the index moves up or down",
        body: "An index rises when, overall, more money is flowing into shares than out — buyers are confident. It falls when sellers dominate and confidence dips. News, interest rates, company results, and the general economic mood all push it around. A single day's move is just noise; what tells a real story is the direction over weeks and months.",
      },
      {
        heading: "How to use the index as an investor",
        body: [
          "Use DSEX to gauge the overall market mood before making decisions",
          "Do not panic over one red day — look at the trend over time instead",
          "A falling index does not mean every company is bad; strong businesses can still shine",
          "The index sets the weather, but you still choose which specific company to own",
        ],
      },
    ],
  },
  {
    slug: "dividend-yield",
    title: "Dividend Yield: How to Know if a Dividend Is Really Good",
    description:
      "A big dividend is not always a good dividend. Here's the simple number that tells you what a payout is truly worth.",
    readTime: "6 min read",
    icon: "📈",
    category: "Dividends",
    sections: [
      {
        heading: "A big number can fool you",
        body: "Two companies both announce a dividend. One sounds generous, the other modest. But the headline dividend alone does not tell you which is the better deal for your money — because it ignores how much you had to pay for the share in the first place. To compare fairly, investors use one simple number called the dividend yield. Once you understand it, you will never be fooled by a flashy announcement again.",
      },
      {
        heading: "What is dividend yield?",
        body: "Dividend yield answers a simple question: for every taka I put into this share, how much cash am I getting back each year as dividend? It turns the dividend into a percentage of the price you pay, so you can compare any two companies on equal footing — and even compare a share against the return you would get from a bank deposit.",
      },
      {
        heading: "How to work it out",
        body: "The formula is gentle: yearly cash dividend per share, divided by the current share price, times 100. Say a share costs 100 taka and pays a 5 taka cash dividend in a year. That is 5 divided by 100, times 100 — a 5% yield. If another share also pays 5 taka but costs 200, its yield is only 2.5%. Same dividend, very different value, because the price was different.",
      },
      {
        heading: "What counts as a good yield",
        body: [
          "A steady yield in the mid single digits is often a sign of a stable, paying company",
          "Compare the yield to what a safe bank deposit would give you over the same year",
          "A company that pays a similar or growing dividend year after year is more reassuring than a one-time big payout",
          "Always look at several years, not just this year's number",
        ],
      },
      {
        heading: "The trap of a yield that looks too high",
        body: "If a yield looks unusually high — far above everything else — be careful rather than excited. A sky-high yield often happens because the share price has crashed, which drags the percentage up. It can be a sign that investors have lost faith in the company. A very high yield can also be a one-off special dividend that will not repeat. When something looks too good, ask why the price fell before you celebrate the yield.",
      },
      {
        heading: "Do not confuse the dividend with the yield",
        body: "Remember the difference. The dividend is the cash amount the company pays per share. The yield is that cash measured against the price you pay. A company can raise its dividend, but if its share price rises faster, the yield can still drop. As a buyer, the yield is what tells you the real income value of putting your money in today.",
      },
      {
        heading: "How to use yield when picking stocks",
        body: "If your goal is regular income, lean towards companies with a healthy, steady yield and a long habit of paying. If your goal is growth, you might accept a smaller yield from a company reinvesting to expand. Either way, treat yield as one clue among many — pair it with the company's profit, debt, and overall health before you decide. A good yield on a weak company is not a bargain.",
      },
    ],
  },
  {
    slug: "check-before-ipo",
    title: "Is This IPO Worth Applying For?",
    description:
      "Not every new share is a good buy. Here's a simple checklist to size up an IPO before you put your money in.",
    readTime: "6 min read",
    icon: "🔍",
    category: "IPOs",
    sections: [
      {
        heading: "The myth that every IPO is a winner",
        body: "Because some IPO shares jump on their first day, a belief has spread that applying for any IPO is free money. It is not. Some new companies do well; others disappoint and drift below their offer price. The difference between a smart application and a gamble is doing a few minutes of homework first. This guide gives you a simple checklist anyone can follow — no accounting degree needed.",
      },
      {
        heading: "Read the company's story",
        body: "Before an IPO, the company publishes a document explaining who they are, what they do, and how they plan to use your money. You do not need to read every page, but skim it. What business are they actually in? Is it something you understand? A company you can explain to a friend in one sentence is easier to judge than one wrapped in confusing language.",
      },
      {
        heading: "Does it actually make money?",
        body: [
          "Look for whether the company has earned a profit in recent years, not just promises of future profit",
          "Steady, growing profit is far more reassuring than a single good year",
          "Be cautious if the company has been losing money or its profit jumps around wildly",
          "A business that already earns is safer than one that only hopes to earn later",
        ],
      },
      {
        heading: "What will they do with your money?",
        body: "The offer document explains why the company is raising money. There is a big difference between a company raising funds to build a new factory or grow the business, and one raising funds mainly to pay off old loans or let early owners cash out. Money used to grow the business can come back to you as future profit. Money used just to fill holes is a weaker reason to invest.",
      },
      {
        heading: "Is the price fair?",
        body: "An IPO share has an offer price. Ask whether that price looks reasonable compared with the company's earnings and with similar companies already on the market. You do not need precise maths — even a rough sense helps. If a company is being offered at a price far higher than comparable, already-proven companies, the easy first-day gain may be smaller or riskier than people assume.",
      },
      {
        heading: "Who else is backing it?",
        body: "It can help to notice whether experienced, respected institutions are investing alongside ordinary applicants, and whether early owners are locked in from selling immediately. When the people who know the company best are committed to holding, it is a quiet vote of confidence. When insiders seem eager to sell as soon as possible, treat that as a yellow flag.",
      },
      {
        heading: "A simple gut-check before you apply",
        body: [
          "Do I understand what this company actually does?",
          "Has it earned real, steady profit — not just promises?",
          "Is my money going to grow the business, or just plug holes?",
          "Does the offer price look sensible next to similar companies?",
          "If two or more answers worry you, it is perfectly fine to skip this one",
        ],
      },
    ],
  },
  {
    slug: "read-financial-statements",
    title: "The Three Money Reports Every Company Shares",
    description:
      "Every company tells its money story in three reports. Once you know what each one is for, you can size up a business in minutes.",
    readTime: "7 min read",
    icon: "📊",
    category: "Understanding Companies",
    sections: [
      {
        heading: "Three reports, one full story",
        body: "Every listed company publishes its results in three connected reports. People find them intimidating, but together they simply answer three everyday questions: Did the company make money? What does it own and owe? And is real cash actually coming in? Learn what each report is for and you can understand any company — no accounting background needed. Let us take them one at a time.",
      },
      {
        heading: "Report 1: the income statement — did it make money?",
        body: "The income statement (sometimes called the profit and loss account) covers a period of time, like a year. It starts with the money the company earned from selling its products or services, subtracts all the costs of running the business, and ends with what is left over — the profit. If sales are growing and profit is growing alongside, that is healthy. If sales rise but profit shrinks, costs may be getting out of control.",
      },
      {
        heading: "Report 2: the balance sheet — what it owns and owes",
        body: "The balance sheet is a snapshot taken on a single day. On one side it lists everything the company owns — cash, buildings, machinery, stock to sell. On the other side it lists what it owes — loans, bills, money due to suppliers. Whatever is left after you subtract what it owes from what it owns belongs to the shareholders. A company that owns far more than it owes is on solid ground.",
      },
      {
        heading: "Report 3: the cash flow statement — is real cash coming in?",
        body: "The cash flow statement tracks actual money moving in and out during the period. It matters because a company can report a profit on paper while real cash is draining away. This report shows whether the day-to-day business is genuinely generating cash, how much is spent on growth, and how much goes to loans or dividends. Healthy, positive cash from regular operations is one of the most reassuring signs of all.",
      },
      {
        heading: "Why profit and cash are not the same thing",
        body: "This trips up many beginners, so it is worth slowing down. A company might sell goods on credit and record the sale as profit — even though the customer has not paid yet. On paper there is profit, but no cash has arrived. That is exactly why the cash flow statement exists: it strips away the paper and shows the real money. A company with steady profit but weak cash flow deserves a closer, more careful look.",
      },
      {
        heading: "What to glance at first in each",
        body: [
          "Income statement: are sales and profit both growing over several years?",
          "Balance sheet: does the company owe a lot compared with what it owns?",
          "Cash flow: is the regular business bringing in positive cash, year after year?",
          "Always look at three to five years, not a single year, to see the real trend",
        ],
      },
      {
        heading: "Reading all three together",
        body: "No single report tells the whole truth — their power is in how they fit together. Profit on the income statement should be backed by real cash on the cash flow statement, and supported by a balance sheet that is not drowning in debt. When all three point the same healthy direction, you are likely looking at a genuinely strong business. When they disagree, that disagreement is the story worth investigating.",
      },
    ],
  },
  {
    slug: "read-annual-report",
    title: "How to Read an Annual Report Without Getting Lost",
    description:
      "An annual report looks thick and scary, but you only need a handful of pages. Here's how to find the parts that actually matter.",
    readTime: "7 min read",
    icon: "📑",
    category: "Understanding Companies",
    sections: [
      {
        heading: "What is an annual report?",
        body: "Once a year, every listed company publishes a detailed booklet about itself called the annual report. It tells you how the business performed over the past year, what its leaders are thinking, and includes the full financial numbers. It is the single most honest, official place to learn about a company — far more reliable than a tip from a friend. The catch is that it can run to a hundred pages. The skill is knowing which pages to actually read.",
      },
      {
        heading: "You do not need to read all of it",
        body: "Take a breath — nobody reads an annual report cover to cover, not even professionals. Most of it is legal wording and repeated detail. You only need a handful of sections to understand whether a company is healthy and worth your money. Below are the parts that reward a few minutes of attention, in the order it makes sense to read them.",
      },
      {
        heading: "Start with the chairman's message",
        body: "Near the front you will find a letter from the chairman or managing director. Written in plain language, it summarises how the year went, what challenges the company faced, and what the leaders plan next. Read it like a story. Does it sound honest and specific, or vague and full of excuses? A leader who clearly explains both the good and the bad is usually more trustworthy than one who only celebrates.",
      },
      {
        heading: "Find the financial highlights",
        body: "Most reports include a short summary page — often called financial highlights — showing the key numbers across several years side by side: sales, profit, earnings per share, and dividends. This is gold for a beginner. In one glance you can see whether the company is growing steadily, standing still, or sliding. A neat row of rising numbers over five years tells you a lot very quickly.",
      },
      {
        heading: "Glance at the auditor's note",
        body: "An independent auditor checks the company's accounts and writes a short opinion. You are looking for one calm phrase that means the accounts give a true and fair view — that is the clean, normal result. If the auditor instead raises doubts, adds heavy warnings, or questions whether the company can continue, treat that as a serious red flag, no matter how good the other pages look.",
      },
      {
        heading: "Check the dividend and the shareholding",
        body: "Two more quick checks. First, what dividend did the company declare, and how does that compare with previous years? A steady or growing dividend is a good sign. Second, look at who owns the company — the shareholding pattern. Seeing the founders and sponsors holding a healthy chunk of their own company is reassuring, because their interests line up with yours.",
      },
      {
        heading: "Red flags to watch for",
        body: [
          "Profit that jumps around wildly with no clear explanation",
          "Debt growing much faster than the business itself",
          "An auditor who adds warnings or doubts",
          "A leader's letter full of excuses and short on specifics",
          "Sponsors quietly reducing their own shareholding year after year",
        ],
      },
      {
        heading: "A ten-minute reading plan",
        body: "Pressed for time? Do this. Read the chairman's message (three minutes). Study the multi-year financial highlights (three minutes). Check the auditor's opinion is clean (one minute). Look at the dividend history and shareholding (two minutes). In about ten minutes you will understand a company better than most people who buy its shares on a rumour. That is a powerful head start.",
      },
    ],
  },
  {
    slug: "understanding-sectors",
    title: "Understanding the Sectors of the Stock Market",
    description:
      "Companies group into families called sectors — banks, pharma, textiles and more. Knowing them helps you spread your risk wisely.",
    readTime: "5 min read",
    icon: "🏭",
    category: "Understanding Companies",
    sections: [
      {
        heading: "What is a sector?",
        body: "A sector is simply a family of companies that do similar work. All the banks form one family, all the medicine makers another, all the clothing makers another. Grouping companies this way helps you make sense of the market. Instead of seeing 300 random names, you start to see neat neighbourhoods — and you can compare a company against its true neighbours rather than against the whole city.",
      },
      {
        heading: "Why sectors matter to you",
        body: "Sectors matter for two big reasons. First, fair comparison: a bank should be judged against other banks, not against a textile mill, because they earn money in completely different ways. Second, safety: if all your money sits in one sector and that sector hits hard times, you feel the full blow. Knowing the sectors lets you compare wisely and spread your risk sensibly.",
      },
      {
        heading: "The main sectors on the Dhaka market",
        body: [
          "Banks and financial companies — they lend money and earn from interest and fees",
          "Pharmaceuticals — they make medicines; often steady, defensive businesses",
          "Textiles and garments — a huge part of Bangladesh's economy, but competitive",
          "Food and consumer goods — everyday products people buy in any weather",
          "Fuel and power — electricity and energy companies",
          "Telecom — mobile and internet providers",
          "Cement, engineering, insurance and more — each with its own rhythm",
        ],
      },
      {
        heading: "Each sector marches to its own drum",
        body: "Different sectors react differently to the same news. When interest rates rise, banks may benefit while heavily borrowed companies feel the squeeze. When people tighten their budgets, food and medicine companies often hold up better than luxury goods, because people still need to eat and stay healthy. Understanding these rhythms helps you see why two companies can move in opposite directions on the very same day.",
      },
      {
        heading: "Spreading across sectors protects you",
        body: "Here is the practical payoff. If you put every taka into bank shares and the banking sector struggles, your whole savings struggle with it. But if your money is spread across, say, a bank, a medicine maker, and a food company, a bad spell in one is cushioned by the others. This simple habit — not keeping all your eggs in one basket — is one of the easiest ways to lower your risk.",
      },
      {
        heading: "How to use sectors when you invest",
        body: "When you consider a company, first ask which sector it belongs to, then compare it against others in that same family — not against unrelated businesses. As you build your holdings, try to own strong companies from a few different sectors rather than several from just one. You are not trying to own everything; you are simply making sure one stumble cannot knock over your whole basket.",
      },
    ],
  },
  {
    slug: "judge-a-bank-stock",
    title: "How to Judge a Bank Stock (Banks Are Different)",
    description:
      "Banks don't earn money the way a factory does, so the usual checks can mislead you. Here's what to look at instead.",
    readTime: "6 min read",
    icon: "🏦",
    category: "Understanding Companies",
    sections: [
      {
        heading: "Why banks need their own rulebook",
        body: "When you study most companies, you look at the products they sell and the profit they keep. Banks are different animals. Their whole business is money itself — taking it in and lending it out. Because of this, some of the usual checks can mislead you, and a few special ones matter far more. If you plan to own bank shares (and many investors do), it is worth learning the handful of things that truly count.",
      },
      {
        heading: "What a bank actually does",
        body: "In plain terms, a bank gathers money from people who deposit savings, and lends that money to others who need it. It pays a small amount of interest to depositors and charges a larger amount to borrowers. The gap between the two is its core earnings. So a bank's health depends on two things above all: are its loans being repaid, and does it have enough of its own money set aside for safety?",
      },
      {
        heading: "Book value matters more here",
        body: "For a bank, the book value per share — what each share is worth based on the bank's own money after subtracting what it owes — is an especially useful guide. Many investors compare a bank's share price against its book value to judge whether it looks cheap or expensive. It is not the only number, but for banks it carries more weight than it does for, say, a factory whose real value sits in machines and brands.",
      },
      {
        heading: "The big danger: loans that go bad",
        body: "Here is the single most important thing to check in a bank. When borrowers stop repaying, those become bad loans (you will often hear them called non-performing loans). A bank swimming in bad loans is like a bucket with holes — money leaks out no matter how busy it looks. Look for the share of loans that have gone bad: a low, stable figure is healthy; a high or rising one is a serious warning sign.",
      },
      {
        heading: "Does the bank have a safety cushion?",
        body: "Banks are required to keep a cushion of their own money in reserve, so they can absorb losses without collapsing. The stronger this cushion, the safer the bank in hard times. You do not need to master the technical measures — just look for reassurance, in the annual report or the news, that the bank comfortably meets the required safety levels rather than scraping by at the minimum.",
      },
      {
        heading: "Steady earnings and dividends",
        body: "Good banks tend to earn steadily and reward shareholders with regular dividends. Wild swings in profit from one year to the next are less common in a well-run bank and can hint at trouble or risky lending. A bank with calm, growing earnings and a dependable dividend habit is usually a more comfortable hold than one chasing rapid, lumpy growth.",
      },
      {
        heading: "A simple checklist for a bank share",
        body: [
          "Are bad loans low and stable, not high or rising?",
          "Does the bank comfortably meet its required safety cushion?",
          "How does the share price compare with the bank's book value?",
          "Are earnings steady rather than wildly up and down?",
          "Does it pay a regular, dependable dividend?",
        ],
      },
    ],
  },
  {
    slug: "read-a-price-chart",
    title: "How to Read a Stock Price Chart for the First Time",
    description:
      "Those wiggly lines and coloured bars are simpler than they look. Here's how to make sense of a price chart without the jargon.",
    readTime: "6 min read",
    icon: "📈",
    category: "Understanding Companies",
    sections: [
      {
        heading: "What a price chart shows",
        body: "A price chart is just a picture of a share's price over time. Time runs along the bottom, from left (older) to right (newer), and the price runs up the side. That is the whole foundation. Everything else is detail layered on top. A chart will not tell you whether a company is good — only its financial reports do that — but it shows you the story of how its price has travelled, which is useful for choosing your moment.",
      },
      {
        heading: "The simple line chart",
        body: "The easiest chart is a single line connecting the closing price of each day. When the line climbs, the price has been rising; when it falls, the price has been dropping. For a beginner, a line chart is often all you need to see the big picture: is this share generally heading up over the months, drifting down, or going sideways? Start here before worrying about anything fancier.",
      },
      {
        heading: "Candlesticks — more detail in each bar",
        body: "You will often see charts made of little coloured bars called candlesticks. Each candle usually covers one day and packs in four facts: the price at the start of the day, the price at the end, and the highest and lowest points reached. A candle coloured one way means the price finished higher than it started; the other colour means it finished lower. You do not need to memorise patterns — just know each candle is one day's mood in a single shape.",
      },
      {
        heading: "Volume — the crowd beneath the price",
        body: "Beneath the price you will usually see vertical bars called volume. Volume is simply how many shares changed hands that day — how busy the crowd was. It matters because a price move on heavy volume means many people agreed and is taken more seriously, while a move on thin volume can be a fluke. Big price moves backed by big volume carry more weight than quiet ones.",
      },
      {
        heading: "Spotting the trend",
        body: "The most useful thing a chart shows is the trend — the general direction over time. An uptrend makes higher peaks and higher dips as it climbs. A downtrend makes lower peaks and lower dips as it slides. A sideways trend just drifts within a range, going nowhere in particular. Always step back and ask which of these three you are looking at before reading anything else into the wiggles.",
      },
      {
        heading: "Floors and ceilings (support and resistance)",
        body: "Often a price keeps bouncing up from a certain level, as if there is an invisible floor — buyers step in there. That floor is called support. Likewise, a price may keep getting pushed back down from a certain level, like an invisible ceiling where sellers appear. That ceiling is called resistance. These levels are not magic, but they show where the crowd has changed its mind before, which can be handy when timing a buy or sell.",
      },
      {
        heading: "A gentle warning",
        body: "Charts are helpful, but they are not a crystal ball. A pretty rising line cannot promise the price will keep rising, and patterns that worked yesterday can fail tomorrow. Use a chart to understand where a price has been and to choose your timing — but base your real decision on whether the company underneath is genuinely strong. Price tells you the mood; the business tells you the value.",
      },
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
