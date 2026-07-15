# CLAUDE.md

Guidance for Claude Code when working in this repository.

## TESTING — HARD RULE

**NEVER use preview tools.** No `preview_start`, `preview_screenshot`, `preview_snapshot`, `preview_eval`, `preview_console_logs`, or any `preview_*` tool. No browser/Chrome MCP tools for testing. User tests manually in their own browser. After edits: report what changed, stop.

## Stack

- **Backend**: Python 3.11 · FastAPI · MongoDB (Atlas) · pymongo
- **Frontend**: Next.js 15 App Router · React 19 · TypeScript · Tailwind CSS · Recharts
- **Scrapers**: Python (requests + BeautifulSoup + lxml)
- **Auth**: JWT (HS256) via `python-jose` · `bcrypt` for password hashing · Google Sign-In via `google-auth` (backend ID-token verification) and `@react-oauth/google` (frontend)
- **Theme**: **light-only, mobile-first** (no dark mode). All colors are CSS custom properties in `app/globals.css :root` (`--bg`, `--surface`, `--surface-2`, `--text`, `--text-muted`, `--border`, `--primary` #2563EB, `--accent`, `--positive` #15803D, `--negative` #DC2626, tier vars `--strong-buy`/`--safe-buy`/`--watch`/`--avoid` + `--np-*`). Dark mode + `ThemeToggle` were removed. Use tokens (never hardcoded dark hex); components target ~360px first, enhance with `sm:`/`md:`.
- **Fonts**: Latin UI fonts (Inter / Playfair / Space Grotesk) are loaded in `app/layout.tsx` with the `latin` subset only — they carry **no Bengali glyphs**. Bengali (বাংলা) content uses **Hind Siliguri** (`--font-bengali`), opted into via the `.font-bn` utility class (sets the font + comfortable line-height). Wrap any Bengali page/region in `.font-bn` and set `lang="bn"` (see `/blog`).
- **Deployment**: Frontend on Vercel, Backend on Render, DB on MongoDB Atlas

No Streamlit. The app is Next.js + Python only.

## SEO Rules (mandatory for every new page/route/section)

Every new page must include all of the following — no exceptions, no reminders needed:

1. **`metadata` export** — `title`, `description`, `keywords` (Bangladesh/DSE-relevant terms), `alternates: { canonical }`, `openGraph` (title, description, url, type)
2. **JSON-LD structured data** — `Article` + `BreadcrumbList` for content pages; `WebPage` or `Organization` for hub/listing pages. Injected via `<script type="application/ld+json">` in the component.
3. **`sitemap.ts` entry** — add the new route(s) with appropriate `changeFrequency` and `priority`. Dynamic routes (like `/learn/[slug]`) must be expanded from their data source, not hardcoded.

Pattern for content pages (articles, guides):
- OG type: `"article"`
- JSON-LD types: `Article` + `BreadcrumbList`

Pattern for listing/hub pages:
- OG type: `"website"`
- JSON-LD type: `BreadcrumbList` (if nested) or omit if top-level

This applies to: new app routes, new dynamic route segments, new standalone sections.

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
python main.py scrape-companies        # company list
python main.py scrape-prices           # latest stock prices
python main.py scrape-details          # financials, dividends, shareholding
python main.py scrape-details --code GP
python main.py scrape-cashflow         # extended financials from Amarstock
python main.py scrape-cashflow --code GP
python main.py scrape-news             # news for all non-excluded companies
python main.py scrape-news --code GP
python main.py scrape-market-summary   # DSE index values + daily totals
python main.py scrape-all              # run all 6 scrapers sequentially (POSTs to VERCEL_DEPLOY_HOOK_URL on success if set)
```

## Architecture

DSE (Dhaka Stock Exchange) stock data pipeline with four components:

1. **Scrapers (`scrapers/` + `main.py`)** — CLI entrypoint orchestrating six scrapers in sequence. All scrapers inherit from `scrapers/base_scraper.py:BaseScraper` (HTTP retries, rate limiting via `REQUEST_DELAY`, user-agent rotation).

2. **FastAPI Backend (`backend/`)** — REST API serving the frontend. Cached query layer over MongoDB. Exposes a JWT-authenticated user surface (`/api/auth/*`, `/api/user/*`, `/api/admin/*`).

3. **Next.js Frontend (`frontend/`)** — Production web app. ISR caching, server components for data fetching, client components for auth-gated views (portfolio, profile, admin).

4. **Scoring (`backend/services/scoring_service.py`)** — DSEF 5-pillar score (0–100): Earnings Quality (30%), Financial Health (20%), Operational Efficiency / Moat (20%), Valuation (15%), Dividend Sustainability (15%). Sector classes via `utils/sector.py:normalize_sector` (BANK / NBFI — incl. DSE's "Financial Institutions" — / INSURANCE / GENERAL): banks+NBFIs get financial D/E anchors, NIM margin, CFO-positivity fallback; banks+insurers skip cash/assets; insurers fall back to net margin when no gross-profit line. Sector medians for valuation exclude the company being scored. CAGR / trend computations are year-aware (handle missing-year gaps correctly).
   - **Missing-data policy**: a sub-metric whose *inputs* were never scraped is `None` and its weight renormalizes across present metrics with a 0.60 floor (`_weighted_pillar`, max boost 1.67×); present-but-bad data still scores 0. EPS (P1 m1/m2) and the whole dividend pillar stay 0-filled — absence there is the signal. Per-pillar `pN_coverage` + row-level `data_completeness` are exposed.
   - **Final-score multipliers**: staleness (2/3/4+ yr-old reports → ×0.8/0.5/0.25) and DSE market category (`_CATEGORY_MULT`: Z ×0.65, B ×0.90, A/N ×1.0, unknown ×0.95); `category_mult` is exposed on the row.
   - **Tiers (canonical, `backend/services/tiers.py`)**: excellent ≥75, good ≥60, average ≥45, weak <45 — labels "Excellent/Good/Average/Weak" (+ Bengali `TIER_WORDS_BN`), mirrored by frontend `lib/constants.ts`. Tiers describe fundamental strength ONLY — action advice lives in the signal service below. All consumers import `tier_key()`; the pre-2026-07 recommendation-language keys (`strong_buy`/`buy`/`keep_watching`/`avoid`) are gone (`LEGACY_TIER_KEYS` maps them at read time for old stored picks).
   - **Buy/Sell signal (canonical, `backend/services/signal_service.py`)**: single source of truth for action advice everywhere — `/api/scores` rows, company detail, recommendation/daily picks, portfolio, push sweep. The signal is only ever **buy** or **sell**; anything neutral is `none` (empty — the UI shows no chip). There is no "Hold". Rules: unrated→none; weak→sell; average→none; good/excellent blocked from buy by Z category, stale financials, thin trading (<Tk 1mn avg 7d turnover), or a latest-year EPS drop ≥25% YoY (`EARNINGS_DROP_PCT` value-trap guard — "cheap for a reason"; backtest-validated 2026-07) → none; else valuation forks it — p4_val ≥7 (cheap) → buy, <4 (expensive) → none, mid/unknown → buy only for excellent; ≥85% of the 52w range dampens any buy to none. Momentum comes from `top20_service.compute_momentum_all()` (shared bulk `_market_window_raw`). Every signal carries `reason_en`+`reason_bn` (kept even for `none`, so the stock's verdict prose can still explain the neutral stance). `holding_signal()` layers the owner's entry picture (buy_more/sell, else none — `portfolio_signals` enum stores `none` for neutral; the sell set is unchanged so no spurious "changed to Sell" pushes); portfolio GET returns it per holding and the frontend never derives buy/sell advice itself (old TS `computeHoldingSignal` deleted). Cached 300s; cleared via `invalidate_scores_cache()`.
   - **Regression harness**: `py scripts/score_regression.py` (read-only) diffs working-tree scores vs the live `scores_snapshot` (or `--dump`/`--baseline` pickles) — tier transition matrix, top-30 turnover, movers with pillar attribution, coverage, downstream-gate counts. Run it before deploying any scoring change, then `POST /api/scores/refresh` after deploy.

### Scrapers

| File | Purpose |
|---|---|
| `scrapers/company_list.py` | All companies → `companies` collection |
| `scrapers/stock_price.py` | Daily prices → `stock_prices` collection |
| `scrapers/company_details.py` | Financials, dividends, shareholding → `financials`, `shareholdings`; updates `reserve_surplus_mn`, `total_loan_mn`, `total_shares` on `companies`; auto-excludes bonds, debentures, mutual funds, ETFs |
| `scrapers/cash_flow_scraper.py` | Extended financials from Amarstock → `company_financials_ext` |
| `scrapers/news.py` | News & dividend declarations → `company_news`, `dividend_declarations` |
| `scrapers/market_summary.py` | DSE index values (DSEX/DSES/DS30) + daily totals → `dse_market_summary` (consumed by `/api/market-index` and `/api/dse-today`) |

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
| `dse_market_summary` | `(date)` |
| `users` | `(user_id)`, `(email)`, `(phone)` — created at backend startup by `auth_service.ensure_users_indexes()` |

Scrapers must use upsert logic to avoid duplicates.

### Next.js Frontend (`frontend/`)

**Routes:**

| Route | File | Purpose |
|---|---|---|
| `/` | `app/page.tsx` | Two-mode homepage (see **Homepage** below). Logged-out = light marketing landing; logged-in = personalized dashboard |
| `/dsestockranking` | `app/dsestockranking/page.tsx` | Full DSEF leaderboard with tier stat cards |
| `/stocks` | `app/stocks/page.tsx` | Full A–Z stock table |
| `/stock/[code]` | `app/stock/[code]/page.tsx` | Stock detail: chart, financials, cash flow, dividends, shareholding, signals, news |
| `/market-intelligence` | `app/market-intelligence/page.tsx` | Auto-detects falling/rising/sideways, shows signal tables |
| `/market-analysis` | `app/market-analysis/page.tsx` | Pulse, sentiment, near-extremes, trending, top picks |
| `/dse-today` | `app/dse-today/page.tsx` | Today's market header + table + news (single-bundle endpoint) |
| `/stock-insights`, `/stock-insights/[slug]` | `app/stock-insights/...` | Curated insight cards (SEO content) |
| `/learn`, `/learn/[slug]` | `app/learn/...` | Educational guides (SEO content, English, data from `lib/guides.ts`) |
| `/blog`, `/blog/[slug]` | `app/blog/...` | Bengali (বাংলা) blog — beginner guides in everyday Bengali (SEO content, data from `lib/blog-bn.ts`). Reuses `components/learn/CategoryNav.tsx`. Content opts into the Bengali webfont via the `.font-bn` utility + `lang="bn"` |
| `/watchlist` | `app/watchlist/page.tsx` | Saved tickers + watchlist news |
| `/portfolio` | `app/portfolio/page.tsx` | Holdings tracker (auth-gated) |
| `/login`, `/register`, `/profile` | `app/{login,register,profile}/page.tsx` | Auth flow |
| `/admin/analytics` | `app/admin/analytics/page.tsx` | Admin user analytics (admin-only, gated by `ADMIN_EMAILS`) |
| `/about`, `/contact`, `/disclaimer`, `/privacy-policy` | static legal/info pages |

**Navigation (`components/layout/Navbar.tsx`):**
- Brand → `/` (TopStockBD)
- Watchlist (star icon) → `/watchlist`
- Rankings → `/dsestockranking`
- Market Analysis → `/market-analysis`
- DSE Today → `/dse-today`
- Browse Stocks → `/stocks`
- Stock Insights → `/stock-insights`
- Blogs → `/learn`
- About → `/about`
- Portfolio → `/portfolio`
- When logged in: Profile pill (avatar + display name) → `/profile`
- When logged out: Sign In → `/login`, Sign Up → `/register`
- Mobile: hamburger drawer + portfolio shortcut; standalone `MobileBottomBar.tsx` is also rendered on small screens

**Homepage (`app/page.tsx`) — two modes, one SSR page:**

`app/page.tsx` is a server component that renders the **light marketing landing** (SSR for SEO) wrapped in `<HomePersonalizationGate>` (client). The gate reads `useAuth()`: logged-out (and crawlers / first paint) see the marketing children; logged-in users get `<PersonalizedHome>` instead (client, no SEO need) — no hydration mismatch since the server always renders the marketing markup.

- **Marketing landing** (logged-out): `HomeHero` (headline + dual CTA via `SignupCtas` — Google block only renders when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` set — + live fundamental-score ranking preview) → `SearchSection` (reuses `SearchBar` → `/stock/[code]`) → `FeatureShowcase` (4 pillars: Stock Analysis w/ `SampleAnalysisCard` + global-search CTA, Rankings w/ `LiveRankingPreview`, Watchlist w/ `WatchlistMockup`, Portfolio w/ `PortfolioMockup`) → `DataScaleStats` → discovery (`Top20MomentumTeaser`, `PopularTeaser`, `StockListPreview` A–Z, `InsightsTeaserStrip`) → `FinalCTA`.
- **Personalized dashboard** (`PersonalizedHome`, logged-in): `DailyBriefing` onboarding checklist (only while setup incomplete — two steps, build-watchlist + personalize; adding a portfolio is sold by the money hero itself, so it's not a step). Then a bento (main column + "Explore" aside on desktop; single column on mobile). **Chapter 1 — Your money** (money-first so a returning user's value is above the fold): the money hero with `HeroGreeting` (date + time-of-day greeting + live `MarketStatusPill` + follow-count/streak) folded into its top — `MoneyHero` (animated portfolio value + today's ৳/% move + beating/trailing-DSEX chip + total-P/L chip + A–F grade via `analyzePortfolio`), `MoneyHeroGhost` when no holdings, `MoneyHeroSkeleton` while the portfolio fetch is in flight → `AttentionStrip` (**the single home for "what happened on your stocks today"** — an alerts list from `buildHomeAlerts`, else one calm daily-brief line from `buildDailyBrief`; replaces the old header bell + Alerts stat-tile + brief line) → `StatTiles` (three non-overlapping glances: watchlist pulse w/ advancing bar, then two of {next dividend, DSEX today, best mover}; dynamic columns) → `MyStocksToday` (holdings ∪ watchlist merged, sorted by |move|, H/★ tags + 52w/dividend chips) → `NewsPeek` (stacked latest-3 headlines, no auto-rotate) → `InstallHomeBanner` → `SearchBar` (demoted below the money block). **Chapter 2 — Ideas for you**: `SectionHeader` (title "Your ideas today", or "Ideas for you today" when untuned; date + "N new" chips fed by `daily_picks.new_codes`) + `IdeasCard` (one card, **Picks / Buys / Tips** segmented tabs merging daily picks, whole-market buy signals, and daily tips; personalize nudge when untuned; per-tab "See all" + Tune; last tab in localStorage). **Explore aside** under a quiet `SectionLabel`: `MarketTodayCard` (merged index band + market-analysis snapshot: mood headline, DSEX/DSES/DS30, breadth bar, deep-linked tiles, one CTA), `DiscoverCard` (chip-tabbed Top ranked / Top 20 / Insights previews with in-row watchlist stars and New/▲ day-delta tags via `lib/daily-delta.ts`), `CoreFeatureTiles` (Browse A–Z + Bengali blog quick-links row).

**Component tree:**

```
components/
├── layout/
│   ├── Navbar.tsx, Footer.tsx, MobileBottomBar.tsx
├── home/                          — current (light) homepage
│   ├── HomePersonalizationGate.tsx, PersonalizedHome.tsx
│   ├── HomeHero.tsx, SignupCtas.tsx, SearchBar.tsx, LiveMarketBand.tsx
│   ├── FeatureShowcase.tsx, SampleAnalysisCard.tsx, LiveRankingPreview.tsx
│   ├── WatchlistMockup.tsx, PortfolioMockup.tsx, DataScaleStats.tsx, FinalCTA.tsx
│   ├── StockListPreview.tsx, InsightsTeaserStrip.tsx
│   ├── Top20MomentumTeaser.tsx, PopularTeaser.tsx
│   ├── personalized/
│   │   ├── HeroGreeting.tsx, MoneyHero.tsx (+ MoneyHeroGhost, MoneyHeroSkeleton), AttentionStrip.tsx
│   │   ├── DailyBriefing.tsx, StatTiles.tsx, MyStocksToday.tsx, NewsPeek.tsx
│   │   ├── IdeasCard.tsx, MarketTodayCard.tsx, DiscoverCard.tsx, CoreFeatureTiles.tsx
│   │   ├── StreakBadge.tsx, MarketStatusPill.tsx, PullToRefresh.tsx, SetupCard.tsx
│   │   └── (legacy, unused: WelcomeHeader, AlertsBell, ForYouCard, BuySignalsCard, NewsSlider,
│   │        DailyPicksCard, MarketAnalysisCard, InsightsPreview, Top20Preview, ForYouTeaser)
│   └── (legacy, unused on `/`: Masthead, NavHighlights, TickerBand,
│        MarketIndexBanner [still used by market-analysis + dse-today], MarketMovers,
│        MarketIntelStrip, TopRankings, FilterBar, HowWeScoreBox, HomeSidebar,
│        PortfolioTeaserCTA, GradeAnyStockHero, TodaysTopPicks, sidebar/*,
│        DailyTipsCard, PromoPill, LiveMarketBand)
├── ranking/
│   ├── FullRankTable.tsx, TierStatCards.tsx
├── market-intelligence/
│   ├── ConditionBanner.tsx, SignalTable.tsx, SectorMap.tsx
├── market-analysis/
│   ├── MarketPulseStrip.tsx, SentimentGauge.tsx, CatalystStrip.tsx
│   ├── NearExtremesPanel.tsx, TrendingStocksGrid.tsx
│   ├── TopPicksTabs.tsx, VolumeSurgeList.tsx
├── market/
│   ├── SectorHeatmap.tsx (shared treemap, consumed by dse-today + market-analysis)
├── dse-today/
│   ├── DseTodayHeader.tsx, DseTodayTable.tsx, DseTodayNews.tsx
├── stocks/
│   └── StocksTable.tsx
├── stock-insights/
│   └── InsightCard.tsx
├── stock/
│   ├── HeroSection.tsx, QuickSummary.tsx, MetricStrip.tsx, SectionNav.tsx
│   ├── PriceChart.tsx, FinancialCharts.tsx, CashFlowPanel.tsx
│   ├── DividendSection.tsx, NewsSection.tsx, NewsCard.tsx
│   ├── ShareholdingPie.tsx, CompanyFundamentals.tsx
│   ├── PillarScores.tsx, ValuationCard.tsx, SignalFlags.tsx, VerdictBar.tsx
├── watchlist/
│   ├── WatchlistTable.tsx, WatchlistNews.tsx (accepts `limit`/`compact`)
│   ├── WatchlistQuickAdd.tsx (search any stock → add), EmptyStateActions.tsx
├── portfolio/
│   └── PortfolioClient.tsx
├── admin/
│   └── AdminAnalyticsClient.tsx
├── analytics/
│   └── PingTracker.tsx          — fires apiAuthPing on page transitions
└── ui/
    ├── ScoreBadge.tsx, TierPill.tsx, SignalChip.tsx, SectionLabel.tsx
    ├── StarButton.tsx          (ThemeToggle removed — light-only)
```

**Watchlist (`lib/watchlist.ts`):**
- localStorage key: `dsex.watchlist` (string[] of trading codes, uppercase)
- API: `getWatchlist()`, `isWatched(code)`, `addToWatchlist(code)`, `removeFromWatchlist(code)`, `toggleWatchlist(code)`, `subscribeWatchlist(cb)`
- Custom event `dsex:watchlist-change` fires on every mutation; navbar badge + StarButton state listen to it
- When the user is logged in, the same set is also synced to the server via `apiGetWatchlist` / `apiSetWatchlist` / `apiAddToWatchlist` / `apiRemoveFromWatchlist`. localStorage remains the source of truth for unauthenticated users.

**Market Intelligence layout by condition:**

| Condition | Row 1 | Row 2 |
|---|---|---|
| Falling 🔴 | Accumulation Radar · Sector Fortress | Resilience Leaders · Floor Watch |
| Rising 🟢 | Volume Breakouts (full width) | Momentum Leaders · Quality Laggards |
| Sideways ➡️ | Volume Divergence (full width) | Hidden Gems · Dividend Capture |
| All | — | Sector Map (full width, bottom) — except falling |

**API client (`frontend/lib/api.ts`):**

Public / cached (Next ISR):
- `getScores()` → `/api/scores` (3600s)
- `getMarketMovers()` → `/api/market-movers` (3600s)
- `getMarketIndex()` → `/api/market-index` (900s)
- `getDividendsUpcoming()` → `/api/dividends/upcoming` (3600s)
- `getMarketIntelligence()` → `/api/market-intelligence` (900s)
- `getCompanyDetail(code)` → `/api/company/:code` (3600s)
- `getAllCodes()` → `/api/companies/codes` (3600s)
- `getDseToday()` → `/api/dse-today` (900s)
- `getStockLists()` → `/api/stock-lists` (3600s)
- `getNearExtremes()` → `/api/market/near-extremes` (900s)
- `getInsightScores()` — flattens all tiers from `/api/scores`

Client-side, no cache:
- `getPriceHistory(code, range)` → `/api/company/:code/prices?range=`
- `getWatchlistNews(codes)` → `/api/news/multi?codes=...`
- `apiAuthPing()` → `/api/auth/ping` (fire-and-forget visit tracking)

Auth (Bearer token via `lib/auth.ts`):
- `apiRegister`, `apiLogin`, `apiGetMe` → `/api/auth/{register,login,me}`
- `apiGetWatchlist`, `apiSetWatchlist`, `apiAddToWatchlist`, `apiRemoveFromWatchlist` → `/api/user/watchlist*`
- `apiGetPortfolio`, `apiAddHolding`, `apiUpdateHolding`, `apiDeleteHolding` → `/api/user/portfolio*`
- `apiGetAdminAnalytics` → `/api/admin/analytics`

A 401 response from `apiAuthFetch` triggers `logout()` and throws `AUTH_EXPIRED`.

**Other lib utilities (`frontend/lib/`):**
- `auth.ts` — `AuthUser` type, `getToken()`, `logout()`; token persisted in localStorage
- `stock-lists.ts` — curated list definitions consumed by `/stock-insights` (large file, ~34 KB)
- `guides.ts` — learn-page content (~14 KB)
- `insight-utils.ts`, `verdict.ts` — shared insight / verdict helpers
- `formatters.ts`, `constants.ts`, `market-hours.ts` — formatting + market-open utilities
- `daily-delta.ts` — per-device localStorage diff of the homepage discovery lists (powers the New/▲ "since your last visit" tags)

**Frontend env vars:**
- `API_URL` (server-side fetching, recommended for prod) and `NEXT_PUBLIC_API_URL` (browser + server fallback) — both default to `https://dsex.onrender.com`

### FastAPI Backend (`backend/`)

**Routers** (all registered in `backend/main.py`):

| File | Endpoint(s) | Purpose |
|---|---|---|
| `routers/scores.py` | `GET /api/scores`, `POST /api/scores/refresh` | DSEF tiers; refresh clears cache |
| `routers/companies.py` | `GET /api/companies/codes`, `GET /api/company/:code`, `GET /api/news/multi?codes=` | Company list + detail + multi-code news |
| `routers/prices.py` | `GET /api/company/:code/prices?range=` | Price history |
| `routers/market_movers.py` | `GET /api/market-movers` | Top 5 gainers / losers / most-traded |
| `routers/market_index.py` | `GET /api/market-index` | DSEX / DSES / DS30 + totals |
| `routers/market_intelligence.py` | `GET /api/market-intelligence` | Market condition + signal tables |
| `routers/market_analysis.py` | `GET /api/market/near-extremes` | Stocks within 5% of 52-week high/low |
| `routers/dividends.py` | `GET /api/dividends/upcoming` | Upcoming declarations + record dates |
| `routers/audit.py` | `GET /api/audit` | Data coverage report |
| `routers/stock_lists.py` | `GET /api/stock-lists` | Pre-computed top-20 lists (dividend, EPS, profit, market cap, growth, volume, 52w return, sector slices) |
| `routers/dse_today.py` | `GET /api/dse-today` | Bundle: header + movers + intelligence + table + news |
| `routers/auth.py` | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/google`, `GET /api/auth/me`, `POST /api/auth/ping` | Account creation, login, Google sign-in, current user, visit ping |
| `routers/user.py` | `GET/PUT /api/user/watchlist`, `PATCH /api/user/watchlist/add`, `PATCH /api/user/watchlist/remove`, `PATCH /api/user/profile` | User watchlist + profile updates |
| `routers/portfolio.py` | `GET /api/user/portfolio`, `POST /api/user/portfolio/holdings`, `PUT/DELETE /api/user/portfolio/holdings/:id` | Portfolio CRUD |
| `routers/admin.py` | `GET /api/admin/analytics` | User analytics (admin-only via `ADMIN_EMAILS`) |

App-level: `GET /health` (DB ping + JSON), `HEAD /health` (uptime monitor short-circuit), CORS allowlist via `ALLOWED_ORIGINS` plus a regex for `*.vercel.app`.

**Auth dependency chain:** `routers/auth.py` exports `get_current_user` (Bearer → JWT decode → `users` lookup) and `get_current_admin_user` (additional `ADMIN_EMAILS` check). All `/api/user/*`, `/api/admin/*` endpoints depend on these.

**Google sign-in:** `POST /api/auth/google` accepts `{id_token}` from `@react-oauth/google`'s `<GoogleLogin>` button, verifies it server-side with `google.oauth2.id_token.verify_oauth2_token` (validates `aud=GOOGLE_CLIENT_ID`, `iss`, `exp`, signature), then resolves the user via `auth_service.create_or_link_google_user`:
- Match by `google_id` → return existing user.
- Else match by email → silently link (sets `google_id`, `oauth_provider="google"`, `email_verified=true`); the existing `password_hash` is preserved so the user can still log in either way.
- Else create a new user with no `password_hash` (Google email is treated as verified).
- Conflict (email already linked to a different `google_id`) → 409.

Returns the same `{access_token, token_type, user}` envelope as `/login`, so frontend `useAuth().login(token, user)` works unchanged. **All successful logins (Google or password) redirect to `/`.** The `users` collection has new optional fields: `google_id` (sparse-unique index), `oauth_provider`, `email_verified`, `picture_url`. Phone-only users (no email) cannot be merged with a Google account by email match — a separate Google-only account will be created; merging those is out of scope.

**Service layer (`backend/services/`):**

- `db_service.py` — cached query layer (`@_ttl_cache(300)`, 5-min in-memory TTL).
  Key functions: `load_companies`, `load_latest_prices`, `load_price_history`, `load_financials`, `load_extended_financials`, `load_shareholdings`, `load_company_news`, `load_dividend_declarations`, `load_market_movers`, `load_market_index`, `load_dse_today_table`, `load_market_news`, `load_news_for_codes`, `load_all_company_codes`, `compute_market_intelligence`, `compute_signal_flags`, `compute_52w_range`.
- `scoring_service.py` — DSEF scoring pipeline (`build_scores_df`), used by `scores.py` and `stock_lists.py`.
- `signal_service.py` — canonical Buy/Sell signal, else `none` — never Hold (`build_signals`, `get_signal`, `holding_signal`) — see the scoring section above for the rule order.
- `auth_service.py` — bcrypt password hashing, JWT issue/verify, `create_user`, `authenticate_user`, `get_user_by_id`, `get_user_watchlist`, `update_user_watchlist`, `sanitize_user`, `ensure_users_indexes()` (called at FastAPI startup).

**Models (`backend/models/responses.py`):** Pydantic response schemas — `ScoreItem`, `ScoreTiers`, `ScoresResponse`, `LatestPrice`, `CompanyProfile`, `CompanyDetailResponse`, `MarketMoversResponse`, `DseTodayResponse`, etc. Used as `response_model=` on the relevant router endpoints.

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

Two `config.py` files exist:

- `config.py` (root) — scrapers, MongoDB, DSE URLs, news + request tunables, DCF rates.
- `backend/config.py` — JWT settings, admin emails. Loads `.env` from the project root.

Both are sourced from `.env` via `python-dotenv`.

| Variable | Default | Purpose |
|---|---|---|
| `MONGODB_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `MONGODB_DB_NAME` | `dsex` | Database name |
| `REQUEST_DELAY` | 1.5s | HTTP request delay (scrapers) |
| `REQUEST_TIMEOUT` | — | HTTP timeout |
| `MAX_RETRIES` | — | Retry attempts |
| `NEWS_LOOKBACK_DAYS` | 365 | News lookback window |
| `AMARSTOCK_BASE_URL` | — | Amarstock base URL |
| `DISCOUNT_RATE` | — | DCF discount rate |
| `TERMINAL_GROWTH_RATE` | — | DCF terminal growth |
| `ALLOWED_ORIGINS` | localhost:3000, vercel, dsex.app, topstockbd.com (CSV) | Backend CORS allowlist |
| `JWT_SECRET` | random per process restart | JWT signing secret — **set explicitly on Render**, otherwise tokens invalidate on every redeploy |
| `JWT_ALGORITHM` | `HS256` | JWT algorithm |
| `JWT_EXPIRE_MINUTES` | 10080 (7 days) | Token lifetime |
| `ADMIN_EMAILS` | empty | CSV of emails granted access to `/api/admin/*` |
| `GOOGLE_CLIENT_ID` | empty | Google OAuth Web Client ID. Required for `/api/auth/google`; backend uses it to verify the `aud` claim of incoming Google ID tokens. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | empty | Same value as `GOOGLE_CLIENT_ID`, exposed to the browser so `@react-oauth/google` can request the ID token. Public per Google's design. |
| `VERCEL_DEPLOY_HOOK_URL` | unset | Optional — `scrape-all` POSTs here on success to trigger a Vercel rebuild |
| `FRONTEND_REVALIDATE_URL` | unset | Frontend `/api/revalidate` URL (e.g. `https://www.topstockbd.com/api/revalidate`). When set with `REVALIDATE_SECRET`, `scrape-all` purges the Next.js `market-data` tag so ISR pages (rankings + stock detail) refetch on the next request. Preferred over the deploy hook because Vercel's data cache survives rebuilds. |
| `REVALIDATE_SECRET` | unset | Shared secret for `/api/revalidate`. Set the same value on the Next.js host and on whatever runs `scrape-all`. |
| `API_URL` / `NEXT_PUBLIC_API_URL` | `https://dsex.onrender.com` | Frontend → backend base URL (server-side / browser) |

DSE URL constants also live in the root `config.py`.

### Backend dependencies

`backend/requirements.txt` adds these beyond the scraper baseline:
- `python-jose[cryptography]==3.3.0` — JWT issue/verify
- `bcrypt==4.0.1` — password hashing
- `google-auth==2.35.0` — Google ID-token verification (`/api/auth/google`)
- `requests>=2.31.0` — **required** by `google.auth.transport.requests` for token verification. The backend has its own requirements file, so scraper deps don't carry over — google-auth's transport will `ImportError` without `requests`.
