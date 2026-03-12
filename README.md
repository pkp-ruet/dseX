# dseX - DSE Stock Market Data Collector

Scrapes Dhaka Stock Exchange (dsebd.org) for stock prices, financial performance, dividends, and shareholding data. Stores everything in MongoDB.

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env   # edit with your MongoDB URI
```

## Usage

```bash
# Scrape company list (run first)
python main.py scrape-companies

# Scrape latest stock prices
python main.py scrape-prices

# Scrape detailed financials, dividends, shareholding for all companies
python main.py scrape-details

# Run all scrapers sequentially
python main.py scrape-all
```

## MongoDB Collections

| Collection | Description |
|---|---|
| `companies` | Company info: trading code, name, sector, capital |
| `stock_prices` | Daily price snapshots: LTP, high, low, volume |
| `financials` | Year-wise: EPS, profit, NAV, P/E, dividends |
| `shareholdings` | Periodic: director, public, govt, foreign % |
