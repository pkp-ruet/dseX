# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env   # then edit with your MongoDB URI

# Scrape company list (must run first to populate DB)
python main.py scrape-companies

# Scrape latest stock prices
python main.py scrape-prices

# Scrape detailed financials, dividends, shareholding for all companies
python main.py scrape-details

# Scrape a single company by trading code
python main.py scrape-details --code GP

# Scrape cash flow & extended financials from Amarstock
python main.py scrape-cashflow

# Scrape cashflow for a single company
python main.py scrape-cashflow --code GP

# Scrape news for top N companies
python main.py scrape-news

# Scrape news for a single company
python main.py scrape-news --code GP

# Run all scrapers sequentially (5 steps: companies → prices → details → cashflow → news)
python main.py scrape-all

# Run the Streamlit UI
streamlit run app.py

# Run the CLI score report
python report_scores.py
```

## Architecture

This is a DSE (Dhaka Stock Exchange) stock data pipeline with three output surfaces:

1. **Data collection (`main.py`)** — CLI entrypoint that orchestrates five scrapers in sequence. All scrapers inherit from `scrapers/base_scraper.py:BaseScraper`, which handles HTTP retries, rate limiting (`REQUEST_DELAY`), and user-agent rotation.

2. **Streamlit UI (`app.py`)** — Legacy multi-page dashboard. `app.py` acts as the router: `?code=` loads the detail page, `?view=audit` loads the audit page, and the default loads the homepage. Pages live in `pages/` (`home.py`, `detail.py`, `audit.py`). All DB reads are `@st.cache_data` with 5-min TTL.

3. **Next.js + FastAPI app** — Production web app. FastAPI backend (`backend/`) serves REST API. Next.js frontend (`frontend/`) renders pages with ISR caching.

4. **Scoring (`report_scores.py` and `utils/scoring.py`)** — The dseX Score (0–100) uses the 5-pillar DSEF algorithm with percentile ranking: Value (30%), Quality (20%), Growth (20%), Income (15%), Safety (15%). NaN values fill as 0 in all rank columns.

### Scrapers

| File | Purpose |
|---|---|
| `scrapers/company_list.py` | Scrapes all companies → `companies` collection |
| `scrapers/stock_price.py` | Scrapes daily prices → `stock_prices` collection |
| `scrapers/company_details.py` | Scrapes financials, dividends, shareholding → `financials`, `shareholdings` collections; also updates `reserve_surplus_mn`, `total_loan_mn`, `total_shares` fields on the `companies` document; auto-excludes bonds, debentures, mutual funds, and ETFs |
| `scrapers/cash_flow_scraper.py` | Scrapes financials from Amarstock → `company_financials_ext` collection |
| `scrapers/news.py` | Scrapes news & dividend declarations → `company_news`, `dividend_declarations` collections |

### MongoDB

Connection is a module-level singleton in `db/connection.py` (call `get_db()` / `close_connection()`). Indexes are created via `db/models.py:ensure_indexes()`, called once at startup in `main.py`. Unique indexes:

| Collection | Unique index |
|---|---|
| `companies` | `(trading_code)` |
| `stock_prices` | `(trading_code, date)` |
| `financials` | `(trading_code, year)` |
| `shareholdings` | `(trading_code, as_of_date)` |
| `company_financials_ext` | `(trading_code, year)` |
| `company_news` | `(trading_code, post_date, title)` |
| `dividend_declarations` | `trading_code` |

Scrapers should use upsert logic to avoid duplicates.

### Pages (Legacy Streamlit)

| File | Route | Purpose |
|---|---|---|
| `pages/home.py` | default (`/`) | Homepage ranking all companies by DSEF composite score |
| `pages/detail.py` | `?code=<TICKER>` | Detail page: price history, financials, dividends, shareholding, DCF |
| `pages/audit.py` | `?view=audit` | Data audit view for inspecting scraper coverage and data quality |

### Next.js Frontend (`frontend/`)

**Framework:** Next.js 15 App Router · React 19 · Tailwind CSS · Recharts · TypeScript

**Routes:**

| Route | File | Purpose |
|---|---|---|
| `/` | `app/page.tsx` | Homepage: ticker band, market movers, filterable DSEF rankings, sidebar |
| `/dsestockranking` | `app/dsestockranking/page.tsx` | Full leaderboard: all companies ranked by DSEF score with tier stat cards |
| `/market-intelligence` | `app/market-intelligence/page.tsx` | Market Intelligence: auto-detects falling/rising/sideways, shows signal tables |
| `/stock/[code]` | `app/stock/[code]/page.tsx` | Stock detail: price chart, financials, cash flow, dividends, shareholding, signals, news |

**Navigation (`frontend/components/layout/Navbar.tsx`):**
- Logo → `/`
- "Market Intelligence" button (outlined) → `/market-intelligence`
- "Score Leaderboard" button (filled) → `/dsestockranking`

**Component tree:**

```
components/
├── layout/
│   ├── Navbar.tsx          — fixed header with two nav buttons
│   └── Footer.tsx
├── home/
│   ├── Masthead.tsx
│   ├── SearchBar.tsx
│   ├── TickerBand.tsx      — top 20 ticker scroll band
│   ├── MarketMovers.tsx    — gainers / losers / most-traded strip
│   ├── MarketIntelStrip.tsx — upcoming dividend declarations sidebar strip
│   ├── FilterableRankings.tsx
│   ├── FilterBar.tsx
│   ├── HowWeScoreBox.tsx
│   ├── HomeSidebar.tsx
│   ├── RankRow.tsx
│   ├── TierTableSection.tsx
│   ├── TierDetailsSection.tsx
│   ├── TierHeader.tsx
│   ├── HeroBand.tsx
│   └── sidebar/
│       ├── ScoreOverview.tsx
│       ├── SectorLeaderboard.tsx
│       ├── TopEPS.tsx
│       ├── TopDividends.tsx
│       └── UpcomingEvents.tsx
├── ranking/
│   ├── FullRankTable.tsx
│   └── TierStatCards.tsx
├── market-intelligence/
│   ├── ConditionBanner.tsx — colored banner: falling (red) / rising (green) / sideways (amber)
│   ├── SignalTable.tsx     — reusable 4-col table (code · LTP · chg% · metric)
│   └── SectorMap.tsx      — horizontal bar chart of sector avg change%
├── stock/
│   ├── PriceChart.tsx
│   ├── FinancialCharts.tsx
│   ├── CashFlowPanel.tsx
│   ├── DividendSection.tsx
│   ├── NewsSection.tsx
│   ├── ShareholdingPie.tsx
│   ├── PillarScores.tsx
│   ├── SignalFlags.tsx
│   ├── ValuationCard.tsx
│   └── VerdictBar.tsx
└── ui/
    ├── ScoreBadge.tsx
    ├── TierPill.tsx
    └── SectionLabel.tsx
```

**Market Intelligence page layout by condition:**

| Condition | Row 1 | Row 2 |
|---|---|---|
| Falling 🔴 | Accumulation Radar · Sector Fortress | Resilience Leaders · Floor Watch |
| Rising 🟢 | Volume Breakouts (full width) | Momentum Leaders · Quality Laggards |
| Sideways ➡️ | Volume Divergence (full width) | Hidden Gems · Dividend Capture |
| All | — | Sector Map (full width, bottom) — except falling |

**API client (`frontend/lib/api.ts`):**
- `getScores()` → `/api/scores` (3600s)
- `getMarketMovers()` → `/api/market-movers` (3600s)
- `getDividendsUpcoming()` → `/api/dividends/upcoming` (3600s)
- `getMarketIntelligence()` → `/api/market-intelligence` (900s)
- `getCompanyDetail(code)` → `/api/company/:code` (3600s)
- `getPriceHistory(code, range)` → client-side fetch, no cache

### FastAPI Backend (`backend/`)

**Routers:**

| Router file | Endpoint | Purpose |
|---|---|---|
| `routers/scores.py` | `GET /api/scores` | DSEF scored tiers; `POST /api/scores/refresh` clears cache |
| `routers/companies.py` | `GET /api/companies/codes`, `GET /api/company/:code` | Company list and detail |
| `routers/prices.py` | `GET /api/company/:code/prices?range=` | Price history |
| `routers/market_movers.py` | `GET /api/market-movers` | Top 5 gainers/losers/most-traded |
| `routers/market_intelligence.py` | `GET /api/market-intelligence` | Market condition + signal tables |
| `routers/dividends.py` | `GET /api/dividends/upcoming` | Upcoming declarations & record dates |
| `routers/audit.py` | `GET /api/audit` | Data coverage report |

**Service layer (`backend/services/db_service.py`):**
All query helpers use `@_ttl_cache(300)` (5-min in-memory TTL).
Key functions: `load_companies()`, `load_latest_prices()`, `load_price_history(code)`,
`load_market_movers()`, `compute_market_intelligence()`, `compute_signal_flags()`.

**Market intelligence logic (`compute_market_intelligence`):**
- Detects condition from latest day: avg_change < -0.3% or loser_ratio > 60% → falling; > +0.3% or gainer_ratio > 60% → rising; else sideways
- Computes 7-day avg volume per stock from the 7 trading days before the latest date
- Falls back to "unknown" (with date populated) when change_pct is missing for all stocks

### Utils

| File | Purpose |
|---|---|
| `utils/parser_helpers.py` | Shared HTML/text parsing utilities used across scrapers |
| `utils/sector.py` | Sector classification and normalization helpers |
| `utils/scoring.py` | DSEF 5-pillar scoring engine (shared by `app.py` and `report_scores.py`) |

### Non-equity exclusion

`scrapers/company_details.py` automatically skips bonds, debentures, mutual funds, and ETFs during detail scraping. These instrument types are identified by category markers on the DSE company page and excluded before any DB write.

### Configuration

All tunables live in `config.py`, sourced from `.env` via `python-dotenv`. Key vars:

| Variable | Default | Purpose |
|---|---|---|
| `MONGODB_URI` | — | MongoDB connection string |
| `MONGODB_DB_NAME` | — | Database name |
| `REQUEST_DELAY` | 1.5s | Delay between HTTP requests |
| `REQUEST_TIMEOUT` | — | HTTP request timeout |
| `MAX_RETRIES` | — | Retry attempts on failure |
| `NEWS_LOOKBACK_DAYS` | 365 | How far back to fetch news |
| `NEWS_TOP_N` | 50 | Number of top companies to scrape news for |
| `AMARSTOCK_BASE_URL` | — | Base URL for Amarstock scraper |
| `DISCOUNT_RATE` | — | DCF discount rate |
| `TERMINAL_GROWTH_RATE` | — | DCF terminal growth rate |

DSE URL constants are also defined in `config.py`.
