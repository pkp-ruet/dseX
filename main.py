import argparse
import logging
import sys

from db.models import ensure_indexes
from db.connection import close_connection
from scrapers.company_list import CompanyListScraper
from scrapers.stock_price import StockPriceScraper
from scrapers.company_details import CompanyDetailsScraper
from scrapers.news import NewsScraper
from utils.scoring import get_top_n_codes
from config import NEWS_TOP_N


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


def cmd_scrape_news(args):
    from db.connection import get_db

    db = get_db()
    if args.code:
        codes = [args.code]
    else:
        codes = get_top_n_codes(db, n=NEWS_TOP_N)

    if not codes:
        print("No scored companies found. Run 'scrape-details' first.")
        return

    label = args.code if args.code else f"top {NEWS_TOP_N}"
    print(f"Scraping news for {len(codes)} companies ({label})...")
    scraper = NewsScraper()
    new_items = scraper.run(codes)
    print(f"Done. {new_items} new news items saved.")


def cmd_scrape_all(args):
    print("=== Step 1/4: Scraping company list ===")
    cl = CompanyListScraper()
    companies = cl.run()
    print(f"  {len(companies)} companies found.\n")

    print("=== Step 2/4: Scraping latest prices ===")
    sp = StockPriceScraper()
    prices = sp.run()
    print(f"  Prices for {len(prices)} companies.\n")

    print("=== Step 3/4: Scraping company details ===")
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

    print(f"=== Step 4/4: Scraping news for top {NEWS_TOP_N} companies ===")
    news_codes = get_top_n_codes(get_db(), n=NEWS_TOP_N)
    if news_codes:
        ns = NewsScraper()
        new_items = ns.run(news_codes)
        print(f"  {new_items} new news items saved.\n")
    else:
        print("  Skipped — no scored companies found.\n")

    print("All done.")


def main():
    setup_logging()

    parser = argparse.ArgumentParser(
        description="dseX — DSE Stock Market Data Collector"
    )
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("scrape-companies", help="Scrape the list of all DSE companies")
    sub.add_parser("scrape-prices", help="Scrape latest stock prices for all companies")

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
        help=f"Scrape last 1-year news for top {NEWS_TOP_N} companies",
    )
    news_parser.add_argument(
        "--code",
        default=None,
        help="Scrape news for a single company by trading code (e.g. GP)",
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
        "scrape-companies": cmd_scrape_companies,
        "scrape-prices": cmd_scrape_prices,
        "scrape-details": cmd_scrape_details,
        "scrape-news": cmd_scrape_news,
        "scrape-all": cmd_scrape_all,
    }

    try:
        commands[args.command](args)
    finally:
        close_connection()


if __name__ == "__main__":
    main()
