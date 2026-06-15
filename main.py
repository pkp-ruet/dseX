import argparse
import logging
import sys

from db.models import ensure_indexes
from db.connection import close_connection
from scrapers.company_list import CompanyListScraper
from scrapers.stock_price import StockPriceScraper
from scrapers.historical_prices import HistoricalPriceScraper
from scrapers.company_details import CompanyDetailsScraper
from scrapers.news import NewsScraper
from scrapers.cash_flow_scraper import CashFlowScraper
from scrapers.market_summary import MarketSummaryScraper


def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def cmd_scrape_companies(_args):
    scraper = CompanyListScraper()
    companies = scraper.run()
    print(f"Done. {len(companies)} companies scraped.")


def cmd_scrape_prices(_args):
    scraper = StockPriceScraper()
    prices = scraper.run()
    print(f"Done. Prices scraped for {len(prices)} companies.")


def cmd_scrape_historical_prices(args):
    from db.connection import get_db

    db = get_db()
    if args.code:
        codes = [args.code]
    else:
        codes = [
            doc["trading_code"]
            for doc in db.companies.find({"excluded": {"$ne": True}}, {"trading_code": 1, "_id": 0})
        ]

    if not codes:
        print("No companies found. Run 'scrape-companies' first.")
        return

    print(f"Backfilling {args.years} year(s) of historical prices for {len(codes)} companies...")
    scraper = HistoricalPriceScraper(years=args.years)
    inserted, modified = scraper.run(codes)
    print(f"Done. {inserted} new rows, {modified} updated.")


def _get_scored_codes(db):
    """Return trading codes that have at least one financials record."""
    return db.financials.distinct("trading_code")


def cmd_scrape_details(args):
    from db.connection import get_db

    db = get_db()
    if args.code:
        codes = [args.code]
    elif getattr(args, "full", False):
        codes = [
            doc["trading_code"]
            for doc in db.companies.find({"excluded": {"$ne": True}}, {"trading_code": 1, "_id": 0})
        ]
    else:
        codes = _get_scored_codes(db)

    if not codes:
        print("No companies found. Run 'scrape-companies' first, or use --full.")
        return

    mode = "ALL" if getattr(args, "full", False) else "scored-only"
    print(f"Scraping details for {len(codes)} companies ({mode})...")
    scraper = CompanyDetailsScraper()
    scraper.run(codes)
    print("Done.")


def cmd_scrape_cashflow(args):
    from db.connection import get_db

    db = get_db()
    if args.code:
        codes = [args.code]
    else:
        codes = [
            d["trading_code"]
            for d in db.companies.find({"excluded": {"$ne": True}}, {"trading_code": 1, "_id": 0})
        ]

    if not codes:
        print("No companies found. Run 'scrape-companies' first.")
        return

    print(f"Scraping cash flow data for {len(codes)} companies...")
    scraper = CashFlowScraper()
    total = scraper.run(codes)
    print(f"Done. {total} year-records saved.")


def cmd_scrape_news(args):
    from db.connection import get_db

    db = get_db()
    if args.code:
        codes = [args.code]
    else:
        codes = [
            d["trading_code"]
            for d in db.companies.find(
                {"excluded": {"$ne": True}}, {"trading_code": 1, "_id": 0}
            )
        ]

    if not codes:
        print("No companies found. Run 'scrape-companies' first.")
        return

    label = args.code if args.code else "all non-excluded"
    print(f"Scraping news for {len(codes)} companies ({label})...")
    scraper = NewsScraper()
    new_items = scraper.run(codes)
    print(f"Done. {new_items} new news items saved.")


def cmd_scrape_market_summary(_args):
    scraper = MarketSummaryScraper()
    doc = scraper.run()
    if doc:
        print(f"Done. DSEX={doc.get('dsex')}, DSES={doc.get('dses')}, DS30={doc.get('ds30')}")
    else:
        print("Failed to scrape market summary.")


def cmd_compute_scores(_args):
    """Recompute the DSEF 5-pillar scores and persist them to `scores_snapshot`.

    Heavy (full table scans + per-company pandas). Run once daily so the API
    only READS the snapshot instead of recomputing per request."""
    from backend.services.scoring_service import compute_and_store_scores

    df = compute_and_store_scores()
    n = 0 if df is None or df.empty else len(df)
    print(f"Done. Scored {n} companies into scores_snapshot.")


def _trigger_post_scrape_hooks(*, fire_deploy_hook: bool = False):
    """Purge the Next.js market-data tag (and optionally fire the Vercel deploy hook).

    Called by `scrape-all` (full daily refresh) and `scrape-quick` (fast price/index
    refresh at market close), so each ISR page is rewritten at most twice daily on the
    next request. `fire_deploy_hook=True` also triggers a full Vercel rebuild.
    """
    import os
    import urllib.request

    revalidate_url = os.getenv("FRONTEND_REVALIDATE_URL")
    revalidate_secret = os.getenv("REVALIDATE_SECRET")
    if revalidate_url and revalidate_secret:
        try:
            req = urllib.request.Request(
                f"{revalidate_url.rstrip('/')}?tag=market-data",
                method="POST",
                headers={
                    "x-revalidate-secret": revalidate_secret,
                    # The frontend is fronted by Cloudflare, whose Bot Fight Mode
                    # 403s the default `Python-urllib/x.y` User-Agent *before* the
                    # request reaches the Next.js /api/revalidate route — so the
                    # purge silently fails and ISR pages serve stale prices until
                    # the 24h passive expiry. Send a browser-like UA so the POST
                    # gets through. The principled fix is a Cloudflare WAF skip
                    # rule for /api/revalidate; this keeps it working without one.
                    "User-Agent": (
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/120.0 Safari/537.36"
                    ),
                },
            )
            urllib.request.urlopen(req, timeout=10)
            print("Frontend revalidate triggered (tag=market-data).")
        except Exception as e:
            print(f"Warning: frontend revalidate failed: {e}")

    if fire_deploy_hook:
        hook = os.getenv("VERCEL_DEPLOY_HOOK_URL")
        if hook:
            try:
                urllib.request.urlopen(urllib.request.Request(hook, method="POST"), timeout=10)
                print("Vercel deploy hook triggered.")
            except Exception as e:
                print(f"Warning: Vercel deploy hook failed: {e}")


def cmd_scrape_quick(_args):
    """Fast market-close refresh — latest prices + DSE market summary only.

    Skips the heavy details/news/cashflow steps so it finishes in well under a
    minute. Updates the data behind every price/index/movers/market-analysis view,
    then purges the Next.js `market-data` tag so those pages refetch. Scores are NOT
    recomputed (fundamentals don't change intraday) — `scrape-all` handles those.
    """
    print("=== Quick step 1/2: Latest prices ===")
    sp = StockPriceScraper()
    prices = sp.run()
    print(f"  Prices for {len(prices)} companies.\n")

    print("=== Quick step 2/2: DSE market summary ===")
    ms = MarketSummaryScraper()
    ms_doc = ms.run()
    if ms_doc:
        print(f"  DSEX={ms_doc.get('dsex')}, DSES={ms_doc.get('dses')}, DS30={ms_doc.get('ds30')}")
    else:
        print("  Warning: market summary scrape failed.")

    # Only purge the cache when the price scrape actually produced data — a parser
    # break that silently returns 0 rows must not invalidate every ISR page.
    if len(prices) >= 200:
        _trigger_post_scrape_hooks(fire_deploy_hook=False)
    else:
        print(f"Skipping revalidate — only {len(prices)} prices scraped (expected >=200).")


def cmd_scrape_all(args):
    # Track per-step outcomes so the deploy hook only fires when the upstream
    # scrape actually produced data. Without this, a parser break that
    # silently returns 0 rows would still purge the Vercel cache and
    # publish stale data.
    print("=== Step 1/6: Scraping company list ===")
    cl = CompanyListScraper()
    companies = cl.run()
    print(f"  {len(companies)} companies found.\n")

    print("=== Step 2/6: Scraping latest prices ===")
    sp = StockPriceScraper()
    prices = sp.run()
    print(f"  Prices for {len(prices)} companies.\n")

    print("=== Step 3/6: Scraping DSE market summary (index values) ===")
    ms = MarketSummaryScraper()
    ms_doc = ms.run()
    if ms_doc:
        print(f"  DSEX={ms_doc.get('dsex')}, DSES={ms_doc.get('dses')}, DS30={ms_doc.get('ds30')}\n")
    else:
        print("  Warning: market summary scrape failed.\n")

    print("=== Step 4/6: Scraping company details ===")
    from db.connection import get_db
    full = getattr(args, "full", False)
    db = get_db()
    if full:
        codes = [
            doc["trading_code"]
            for doc in db.companies.find({"excluded": {"$ne": True}}, {"trading_code": 1, "_id": 0})
        ]
    else:
        codes = _get_scored_codes(db)
    mode = "ALL" if full else "scored-only"
    print(f"  Scraping details for {len(codes)} companies ({mode})...")
    cd = CompanyDetailsScraper()
    cd.run(codes)
    print("  Company details complete.\n")

    print("=== Step 5/6: Scraping cash flow data (amarstock) ===")
    cf_codes = [
        d["trading_code"]
        for d in get_db().companies.find({"excluded": {"$ne": True}}, {"trading_code": 1, "_id": 0})
    ]
    cf = CashFlowScraper()
    cf_total = cf.run(cf_codes)
    print(f"  {cf_total} year-records saved.\n")

    print("=== Step 6/6: Scraping news for all non-excluded companies ===")
    news_codes = [
        d["trading_code"]
        for d in get_db().companies.find(
            {"excluded": {"$ne": True}}, {"trading_code": 1, "_id": 0}
        )
    ]
    news_saved = 0
    if news_codes:
        ns = NewsScraper()
        news_saved = ns.run(news_codes)
        print(f"  {news_saved} new news items saved.\n")
    else:
        print("  Skipped — no companies found.\n")

    # Recompute the DSEF scores snapshot now that financials/prices are fresh,
    # so API requests read up-to-date precomputed scores. Runs regardless of the
    # deploy-hook health gate below (scores mostly depend on financials, which
    # persist across runs even if today's price scrape hiccupped).
    print("=== Post-scrape: Recomputing DSEF scores snapshot ===")
    try:
        from backend.services.scoring_service import compute_and_store_scores
        sdf = compute_and_store_scores()
        print(f"  Scored {0 if sdf is None or sdf.empty else len(sdf)} companies.\n")
    except Exception as e:
        print(f"  Warning: score recompute failed: {e}\n")

    # Regenerate the "TopStockBD Tips" homepage bullets from the fresh snapshot.
    print("=== Post-scrape: Regenerating TopStockBD Tips ===")
    try:
        from backend.services.daily_tips_service import compute_and_store_daily_tips
        tdoc = compute_and_store_daily_tips()
        print(f"  Generated {len(tdoc.get('tips') or [])} tips.\n")
    except Exception as e:
        print(f"  Warning: daily tips regen failed: {e}\n")

    # Gate the deploy hook on the two scrapes most visible to users:
    # company list (drives the universe) and prices (drives every chart/table).
    # If either looks empty, a parser broke — keep yesterday's cache rather
    # than purging it and serving stale-but-fresh data.
    healthy = len(companies) >= 200 and len(prices) >= 200
    if not healthy:
        print(
            f"WARNING: scrape-all looks unhealthy (companies={len(companies)}, "
            f"prices={len(prices)}). Skipping deploy/revalidate hooks — "
            f"investigate parser before re-running."
        )
        print("All done.")
        return

    print("All done.")
    _trigger_post_scrape_hooks(fire_deploy_hook=True)


def main():
    setup_logging()

    parser = argparse.ArgumentParser(
        description="dseX — DSE Stock Market Data Collector"
    )
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("scrape-companies", help="Scrape the list of all DSE companies")
    sub.add_parser("scrape-prices", help="Scrape latest stock prices for all companies")

    hist_parser = sub.add_parser(
        "scrape-historical-prices",
        help="Backfill multi-year daily OHLCV history into stock_prices (one-shot)",
    )
    hist_parser.add_argument(
        "--code",
        default=None,
        help="Backfill a single company by trading code (e.g. GP)",
    )
    hist_parser.add_argument(
        "--years",
        type=int,
        default=4,
        help="Number of years of history to backfill (default: 4)",
    )

    cashflow_parser = sub.add_parser(
        "scrape-cashflow",
        help="Scrape cash flow & financial statement data from amarstock.com",
    )
    cashflow_parser.add_argument(
        "--code",
        default=None,
        help="Scrape a single company by trading code (e.g. GP)",
    )

    details_parser = sub.add_parser(
        "scrape-details",
        help="Scrape detailed financials, dividends, shareholding",
    )
    details_parser.add_argument(
        "--code",
        default=None,
        help="Scrape a single company by trading code (e.g. GP)",
    )
    details_parser.add_argument(
        "--full",
        action="store_true",
        help="Scrape all companies (default: only companies with financial data)",
    )

    news_parser = sub.add_parser(
        "scrape-news",
        help="Scrape last 1-year news for all non-excluded companies",
    )
    news_parser.add_argument(
        "--code",
        default=None,
        help="Scrape news for a single company by trading code (e.g. GP)",
    )

    sub.add_parser("scrape-market-summary", help="Scrape DSE index values and daily market totals")

    sub.add_parser(
        "scrape-quick",
        help="Fast market-close refresh: latest prices + market summary, then purge ISR cache",
    )

    sub.add_parser(
        "compute-scores",
        help="Recompute DSEF 5-pillar scores and store them in scores_snapshot",
    )

    all_parser = sub.add_parser("scrape-all", help="Run all scrapers sequentially")
    all_parser.add_argument(
        "--full",
        action="store_true",
        help="Scrape details for all companies (default: only scored companies)",
    )

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(1)

    ensure_indexes()

    commands = {
        "scrape-companies":      cmd_scrape_companies,
        "scrape-prices":         cmd_scrape_prices,
        "scrape-historical-prices": cmd_scrape_historical_prices,
        "scrape-details":        cmd_scrape_details,
        "scrape-cashflow":       cmd_scrape_cashflow,
        "scrape-news":           cmd_scrape_news,
        "scrape-market-summary": cmd_scrape_market_summary,
        "scrape-quick":          cmd_scrape_quick,
        "compute-scores":        cmd_compute_scores,
        "scrape-all":            cmd_scrape_all,
    }

    try:
        commands[args.command](args)
    finally:
        close_connection()


if __name__ == "__main__":
    main()
