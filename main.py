import argparse
import logging
import sys

from db.models import ensure_indexes
from db.connection import close_connection
from scrapers.company_list import CompanyListScraper
from scrapers.stock_price import StockPriceScraper
from scrapers.company_details import CompanyDetailsScraper


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


def cmd_scrape_details(args):
    from db.connection import get_db

    db = get_db()
    if args.code:
        codes = [args.code]
    else:
        codes = [
            doc["trading_code"]
            for doc in db.companies.find({}, {"trading_code": 1, "_id": 0})
        ]
        if not codes:
            print("No companies in database. Run 'scrape-companies' first.")
            return

    print(f"Scraping details for {len(codes)} companies...")
    scraper = CompanyDetailsScraper()
    scraper.run(codes)
    print("Done.")


def cmd_scrape_all(_args):
    print("=== Step 1/3: Scraping company list ===")
    cl = CompanyListScraper()
    companies = cl.run()
    print(f"  {len(companies)} companies found.\n")

    print("=== Step 2/3: Scraping latest prices ===")
    sp = StockPriceScraper()
    prices = sp.run()
    print(f"  Prices for {len(prices)} companies.\n")

    print("=== Step 3/3: Scraping company details ===")
    codes = [c["trading_code"] for c in companies]
    cd = CompanyDetailsScraper()
    cd.run(codes)
    print("  Company details complete.\n")

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

    sub.add_parser("scrape-all", help="Run all scrapers sequentially")

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(1)

    ensure_indexes()

    commands = {
        "scrape-companies": cmd_scrape_companies,
        "scrape-prices": cmd_scrape_prices,
        "scrape-details": cmd_scrape_details,
        "scrape-all": cmd_scrape_all,
    }

    try:
        commands[args.command](args)
    finally:
        close_connection()


if __name__ == "__main__":
    main()
