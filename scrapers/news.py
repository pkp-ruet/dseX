import logging
from datetime import datetime, timedelta, timezone

from scrapers.base_scraper import BaseScraper
from db.connection import get_db
from config import DSE_NEWS_URL, NEWS_LOOKBACK_DAYS

logger = logging.getLogger(__name__)


class NewsScraper(BaseScraper):

    def scrape_company(self, trading_code: str, cutoff: datetime) -> list[dict]:
        """Fetch and parse all news for one company, filtering to within the cutoff date."""
        soup = self.fetch_soup(DSE_NEWS_URL, params={
            "inst": trading_code,
            "criteria": "3",
            "archive": "news",
        })
        if soup is None:
            logger.error("Failed to fetch news for %s", trading_code)
            return []

        return self._parse_news_tables(soup, trading_code, cutoff)

    def _parse_news_tables(self, soup, trading_code: str, cutoff: datetime) -> list[dict]:
        items = []
        now = datetime.now(tz=timezone.utc)

        tables = soup.find_all("table", class_="table-news")

        # Fallback: if class-based search finds nothing, try any table with a
        # "News Title" header (guards against minor HTML changes on the site)
        if not tables:
            logger.warning(
                "%s: no table.table-news found — trying fallback parser", trading_code
            )
            tables = [
                t for t in soup.find_all("table")
                if t.find(string=lambda s: s and "News Title" in s)
            ]

        for table in tables:
            rows = table.find_all("tr")
            title = None
            body = None
            post_date = None

            for row in rows:
                th = row.find("th")
                td = row.find("td")
                if not th or not td:
                    continue

                header = th.get_text(strip=True)

                if "News Title" in header:
                    title = td.get_text(separator=" ", strip=True)
                elif header == "News":
                    body = td.get_text(separator="\n", strip=True)
                elif "Post Date" in header:
                    raw = td.get_text(strip=True)
                    try:
                        post_date = datetime.strptime(raw, "%Y-%m-%d").replace(
                            tzinfo=timezone.utc
                        )
                    except ValueError:
                        logger.warning(
                            "%s: could not parse post_date %r — skipping item", trading_code, raw
                        )
                        post_date = None

            if not title or not post_date:
                continue

            if post_date < cutoff:
                continue

            items.append({
                "trading_code": trading_code,
                "title": title,
                "body": body or "",
                "post_date": post_date,
                "scraped_at": now,
            })

        return items

    def save(self, news_items: list[dict], cutoff: datetime) -> int:
        """Upsert news items and remove stale records older than cutoff."""
        if not news_items:
            return 0

        db = get_db()
        upserted = 0

        for item in news_items:
            result = db.company_news.update_one(
                {
                    "trading_code": item["trading_code"],
                    "post_date": item["post_date"],
                    "title": item["title"],
                },
                {"$set": item},
                upsert=True,
            )
            if result.upserted_id:
                upserted += 1

        # Purge anything older than the lookback window
        codes = list({item["trading_code"] for item in news_items})
        db.company_news.delete_many({
            "trading_code": {"$in": codes},
            "post_date": {"$lt": cutoff},
        })

        return upserted

    def run(self, trading_codes: list[str]) -> int:
        """Scrape and save news for all given trading codes."""
        cutoff = datetime.now(tz=timezone.utc) - timedelta(days=NEWS_LOOKBACK_DAYS)
        total_saved = 0
        total_codes = len(trading_codes)

        for i, code in enumerate(trading_codes, 1):
            logger.info("[%d/%d] Scraping news for %s", i, total_codes, code)
            try:
                items = self.scrape_company(code, cutoff)
                saved = self.save(items, cutoff)
                logger.info("[%d/%d] %s: %d new items", i, total_codes, code, saved)
                total_saved += saved
            except Exception:
                logger.exception("Error scraping news for %s", code)
                continue

        return total_saved
