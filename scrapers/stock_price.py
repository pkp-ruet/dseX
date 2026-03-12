import logging
from datetime import date
from scrapers.base_scraper import BaseScraper
from db.connection import get_db
from config import DSE_LATEST_PRICE_URL
from utils.parser_helpers import clean_numeric

logger = logging.getLogger(__name__)


class StockPriceScraper(BaseScraper):
    def scrape(self):
        logger.info("Scraping latest share prices from %s", DSE_LATEST_PRICE_URL)
        soup = self.fetch_soup(DSE_LATEST_PRICE_URL)
        if soup is None:
            logger.error("Failed to fetch latest share price page")
            return []

        table = soup.find("table", class_="shares-table")
        if not table:
            logger.error("Could not find shares-table on price page")
            return []

        prices = []
        today = date.today().isoformat()

        for row in table.find_all("tr"):
            cells = row.find_all("td")
            if len(cells) < 11:
                continue

            link = cells[1].find("a")
            if not link:
                continue
            trading_code = link.get_text(strip=True)

            ltp = clean_numeric(cells[2].get_text(strip=True))
            high = clean_numeric(cells[3].get_text(strip=True))
            low = clean_numeric(cells[4].get_text(strip=True))
            close_price = clean_numeric(cells[5].get_text(strip=True))
            ycp = clean_numeric(cells[6].get_text(strip=True))
            change = clean_numeric(cells[7].get_text(strip=True))
            trade_count = clean_numeric(cells[8].get_text(strip=True))
            value_mn = clean_numeric(cells[9].get_text(strip=True))
            volume = clean_numeric(cells[10].get_text(strip=True))

            change_pct = None
            if change is not None and ycp and ycp != 0:
                change_pct = round(change / ycp * 100, 2)

            prices.append({
                "trading_code": trading_code,
                "date": today,
                "ltp": ltp,
                "high": high,
                "low": low,
                "close_price": close_price,
                "ycp": ycp,
                "change": change,
                "change_pct": change_pct,
                "trade_count": trade_count,
                "volume": volume,
                "value_mn": value_mn,
            })

        logger.info("Parsed prices for %d companies", len(prices))
        return prices

    def save(self, prices):
        db = get_db()
        inserted = 0
        updated = 0

        for p in prices:
            result = db.stock_prices.update_one(
                {"trading_code": p["trading_code"], "date": p["date"]},
                {"$set": p},
                upsert=True,
            )
            if result.upserted_id:
                inserted += 1
            elif result.modified_count:
                updated += 1

        logger.info("Stock prices — inserted: %d, updated: %d", inserted, updated)

    def run(self):
        prices = self.scrape()
        if prices:
            self.save(prices)
        return prices
