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

# Run all scrapers sequentially
python main.py scrape-all

# Run the Streamlit UI
streamlit run app.py

# Run the CLI score report
python report_scores.py
```

## Architecture

This is a DSE (Dhaka Stock Exchange) stock data pipeline with two output surfaces:

1. **Data collection (`main.py`)** — CLI entrypoint that orchestrates three scrapers in sequence. All scrapers inherit from `scrapers/base_scraper.py:BaseScraper`, which handles HTTP retries, rate limiting (`REQUEST_DELAY`), and user-agent rotation.

2. **Streamlit UI (`app.py`)** — Single-file dashboard with two views routed via `?code=` query param: a homepage ranking all companies by composite score, and a detail page showing price history, financials, dividends, and shareholding charts. All DB reads are `@st.cache_data` with 5-min TTL.

3. **Scoring (`report_scores.py` and `app.py:compute_composite_scores`)** — The dseX Score (0–100) is computed identically in both places using percentile ranking across three value factors: P/E ratio (50% weight, lower=better), Reserve per Share (25%, higher=better), Loan-to-Reserve ratio (25%, lower=better). NaN values fill as 0 in all rank columns.

### Scrapers

| File | Purpose |
|---|---|
| `scrapers/company_list.py` | Scrapes all companies → `companies` collection |
| `scrapers/stock_price.py` | Scrapes daily prices → `stock_prices` collection |
| `scrapers/company_details.py` | Scrapes financials, dividends, shareholding → `financials`, `shareholdings` collections; also updates `reserve_surplus_mn`, `total_loan_mn`, `total_shares` fields on the `companies` document |

### MongoDB

Connection is a module-level singleton in `db/connection.py` (call `get_db()` / `close_connection()`). Indexes are created via `db/models.py:ensure_indexes()`, called once at startup in `main.py`. Unique indexes exist on `(trading_code)` for companies, and `(trading_code, date/year/as_of_date)` for the other three collections — scrapers should use upsert logic to avoid duplicates.

### Configuration

All tunables live in `config.py`, sourced from `.env` via `python-dotenv`. Key vars: `MONGODB_URI`, `MONGODB_DB_NAME`, `REQUEST_DELAY` (default 1.5s between requests), `REQUEST_TIMEOUT`, `MAX_RETRIES`. DSE URL constants are also defined there.
