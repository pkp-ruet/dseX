# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Stack

- **Backend**: Python 3.11 · FastAPI · MongoDB (Atlas) · pymongo
- **Frontend**: Next.js 15 App Router · React 19 · TypeScript · Tailwind CSS · Recharts
- **Scrapers**: Python (requests + BeautifulSoup + lxml)
- **Deployment**: Frontend on Vercel, Backend on Render, DB on MongoDB Atlas

No Streamlit. The app is Next.js + Python only.

## Commands

```bash
# Install Python dependencies
pip install -r requirements.txt
cd backend && pip install -r requirements.txt

# Install frontend dependencies
cd frontend && npm install

# Setup environment
cp .env.example .env   # then edit with your MongoDB URI

# Run backend (FastAPI on :8000)
cd backend && uvicorn main:app --reload

# Run frontend (Next.js on :3001)
cd frontend && npm run dev

# Run both (Makefile shortcut)
make dev

# Scrapers
python main.py scrape-companies      # company list
python main.py scrape-prices         # latest stock prices
python main.py scrape-details        # financials, dividends, shareholding
python main.py scrape-details --code GP
python main.py scrape-cashflow       # extended financials from Amarstock
python main.py scrape-cashflow --code GP
python main.py scrape-news           # news for top N companies
python main.py scrape-news --code GP
python main.py scrape-all            # run all 5 scrapers sequentially
```

## Architecture

DSE (Dhaka Stock Exchange) stock data pipeline with three components:

1. **Scrapers (`scrapers/` + `main.py`)** — CLI entrypoint orchestrating five scrapers in sequence. All scrapers inherit from `scrapers/base_scraper.py:BaseScraper` (HTTP retries, rate limiting via `REQUEST_DELAY`, user-agent rotation).

2. **FastAPI Backend (`backend/`)** — REST API serving the frontend. Cached query layer over MongoDB.

3. **Next.js Frontend (`frontend/`)** — Production web app. ISR caching, server components for data fetching.

4. **Scoring (`utils/scoring.py` + `backend/services/scoring_service.py`)** — DSEF 5-pillar score (0–100) with percentile ranking: Earnings Quality (35%), Financial Health (30%), Operational Efficiency (20%), Valuation (15%), Dividend Sustainability (10%) — bank/financial sector uses adjusted weights. NaN values fill as 0.

### Scrapers

| File | Purpose |
|---|---|
| `scrapers/company_list.py` | All companies → `companies` collection |
| `scrapers/stock_price.py` | Daily prices → `stock_prices` collection |
| `scrapers/company_details.py` | Financials, dividends, shareholding → `financials`, `shareholdings`; updates `reserve_surplus_mn`, `total_loan_mn`, `total_shares` on `companies`; auto-excludes bonds, debentures, mutual funds, ETFs |
| `scrapers/cash_flow_scraper.py` | Extended financials from Amarstock → `company_financials_ext` |
| `scrapers/news.py` | News & dividend declarations → `company_news`, `dividend_declarations` |

### MongoDB

Connection is a module-level singleton in `db/connection.py` (`get_db()` / `close_connection()`). Indexes via `db/models.py:ensure_indexes()`, called at startup in `main.py`.

| Collection | Unique index |
|---|---|
| `companies` | `(trading_code)` |
| `stock_prices` | `(trading_code, date)` |
| `financials` | `(trading_code, year)` |
| `shareholdings` | `(trading_code, as_of_date)` |
| `company_financials_ext` | `(trading_code, year)` |
| `company_news` | `(trading_code, post_date, title)` |
| `dividend_declarations` | `trading_code` |

Scrapers must use upsert logic to avoid duplicates.

### Next.js Frontend (`frontend/`)

**Routes:**

| Route | File | Purpose |
|---|---|---|
| `/` | `app/page.tsx` | Homepage: ticker band, market index, filterable DSEF rankings, sidebar |
| `/dsestockranking` | `app/dsestockranking/page.tsx` | Full leaderboard with tier stat cards |
| `/market-intelligence` | `app/market-intelligence/page.tsx` | Auto-detects falling/rising/sideways, shows signal tables |
| `/stock/[code]` | `app/stock/[code]/page.tsx` | Stock detail: chart, financials, cash flow, dividends, shareholding, signals, news |
| `/watchlist` | `app/watchlist/page.tsx` | User's saved tickers (localStorage, no auth) |

**Navigation (`components/layout/Navbar.tsx`):**
- Logo → `/`
- Watchlist (star icon, badge with count) → `/watchlist`
- "Market Intelligence" (outlined) → `/market-intelligence`
- "Score Leaderboard" (filled) → `/dsestockranking`

**Component tree:**

```
components/
├── layout/
│   ├── Navbar.tsx
│   └── Footer.tsx
├── home/
│   ├── Masthead.tsx, SearchBar.tsx
│   ├── TickerBand.tsx          — top-20 ticker scroll
│   ├── MarketMovers.tsx        — gainers / losers / most-traded strip
│   ├── MarketIntelStrip.tsx    — upcoming dividend declarations
│   ├── FilterableRankings.tsx, FilterBar.tsx
│   ├── HowWeScoreBox.tsx, HomeSidebar.tsx
│   ├── RankRow.tsx             — single ranked row (with star button)
│   ├── TierTableSection.tsx, TierDetailsSection.tsx, TierHeader.tsx
│   ├── HeroBand.tsx
│   └── sidebar/
│       ├── ScoreOverview.tsx, SectorLeaderboard.tsx
│       ├── TopEPS.tsx, TopDividends.tsx, UpcomingEvents.tsx
├── ranking/
│   ├── FullRankTable.tsx       — full sortable rank table (with star column)
│   └── TierStatCards.tsx
├── market-intelligence/
│   ├── ConditionBanner.tsx     — falling (red) / rising (green) / sideways (amber)
│   ├── SignalTable.tsx         — 4-col table (code · LTP · chg% · metric)
│   └── SectorMap.tsx           — horizontal bar chart of sector avg change%
├── stock/
│   ├── HeroSection.tsx, QuickSummary.tsx, MetricStrip.tsx, SectionNav.tsx
│   ├── PriceChart.tsx, FinancialCharts.tsx, CashFlowPanel.tsx
│   ├── DividendSection.tsx, NewsSection.tsx, NewsCard.tsx
│   ├── ShareholdingPie.tsx, CompanyFundamentals.tsx
│   ├── PillarScores.tsx, ValuationCard.tsx, SignalFlags.tsx, VerdictBar.tsx
├── watchlist/
│   └── WatchlistTable.tsx
└── ui/
    ├── ScoreBadge.tsx, TierPill.tsx, SectionLabel.tsx
    └── StarButton.tsx          — toggleable watchlist star
```

**Watchlist (`lib/watchlist.ts`):**
- localStorage key: `dsex.watchlist` (string[] of trading codes, uppercase)
- API: `getWatchlist()`, `isWatched(code)`, `addToWatchlist(code)`, `removeFromWatchlist(code)`, `toggleWatchlist(code)`, `subscribeWatchlist(cb)`
- Custom event `dsex:watchlist-change` fires on every mutation; navbar badge + StarButton state listen to it
- No auth, no backend storage

**Market Intelligence layout by condition:**

| Condition | Row 1 | Row 2 |
|---|---|---|
| Falling 🔴 | Accumulation Radar · Sector Fortress | Resilience Leaders · Floor Watch |
| Rising 🟢 | Volume Breakouts (full width) | Momentum Leaders · Quality Laggards |
| Sideways ➡️ | Volume Divergence (full width) | Hidden Gems · Dividend Capture |
| All | — | Sector Map (full width, bottom) — except falling |

**API client (`frontend/lib/api.ts`):**
- `getScores()` → `/api/scores` (3600s)
- `getMarketMovers()` → `/api/market-movers` (3600s)
- `getMarketIndex()` → `/api/market-index` (900s)
- `getDividendsUpcoming()` → `/api/dividends/upcoming` (3600s)
- `getMarketIntelligence()` → `/api/market-intelligence` (900s)
- `getCompanyDetail(code)` → `/api/company/:code` (3600s)
- `getAllCodes()` → `/api/companies/codes` (3600s)
- `getPriceHistory(code, range)` → client-side, no cache

### FastAPI Backend (`backend/`)

**Routers:**

| File | Endpoint | Purpose |
|---|---|---|
| `routers/scores.py` | `GET /api/scores`, `POST /api/scores/refresh` | DSEF tiers; refresh clears cache |
| `routers/companies.py` | `GET /api/companies/codes`, `GET /api/company/:code` | Company list + detail |
| `routers/prices.py` | `GET /api/company/:code/prices?range=` | Price history |
| `routers/market_movers.py` | `GET /api/market-movers` | Top 5 gainers / losers / most-traded |
| `routers/market_index.py` | `GET /api/market-index` | DSEX / DSES / DS30 + totals |
| `routers/market_intelligence.py` | `GET /api/market-intelligence` | Market condition + signal tables |
| `routers/dividends.py` | `GET /api/dividends/upcoming` | Upcoming declarations + record dates |
| `routers/audit.py` | `GET /api/audit` | Data coverage report |

**Service layer (`backend/services/db_service.py`):**
All query helpers use `@_ttl_cache(300)` (5-min in-memory TTL).
Key functions: `load_companies()`, `load_latest_prices()`, `load_price_history(code)`, `load_market_movers()`, `compute_market_intelligence()`, `compute_signal_flags()`.

**Market intelligence logic (`compute_market_intelligence`):**
- Latest day: `avg_change < -0.3%` or `loser_ratio > 60%` → falling; `> +0.3%` or `gainer_ratio > 60%` → rising; else sideways
- 7-day avg volume per stock from the 7 trading days before latest date
- Falls back to "unknown" (with date populated) when `change_pct` missing for all stocks

### Utils

| File | Purpose |
|---|---|
| `utils/parser_helpers.py` | Shared HTML/text parsing utilities for scrapers |
| `utils/sector.py` | Sector classification + normalization |
| `utils/scoring.py` | DSEF scoring (CLI-friendly version) |

### Non-equity exclusion

`scrapers/company_details.py` skips bonds, debentures, mutual funds, ETFs during detail scraping (identified by DSE category markers, excluded before any DB write).

### Configuration

Tunables live in `config.py`, sourced from `.env` via `python-dotenv`.

| Variable | Default | Purpose |
|---|---|---|
| `MONGODB_URI` | — | MongoDB connection string |
| `MONGODB_DB_NAME` | — | Database name |
| `REQUEST_DELAY` | 1.5s | HTTP request delay |
| `REQUEST_TIMEOUT` | — | HTTP timeout |
| `MAX_RETRIES` | — | Retry attempts |
| `NEWS_LOOKBACK_DAYS` | 365 | News lookback window |
| `NEWS_TOP_N` | 50 | Companies to scrape news for |
| `AMARSTOCK_BASE_URL` | — | Amarstock base URL |
| `DISCOUNT_RATE` | — | DCF discount rate |
| `TERMINAL_GROWTH_RATE` | — | DCF terminal growth |

DSE URL constants also live in `config.py`.
