import re
import logging
from datetime import datetime, timedelta, timezone

from scrapers.base_scraper import BaseScraper
from db.connection import get_db
from config import DSE_NEWS_URL, NEWS_LOOKBACK_DAYS

_PCT_RE = re.compile(r"(\d+(?:\.\d+)?)%")
_RECORD_DATE_RE = re.compile(r"Record\s+Date\s*:\s*(.+?)(?:\.(?:\s|$)|;|\n|$)", re.IGNORECASE)
_DATE_FORMATS = ["%d.%m.%Y", "%B %d, %Y", "%d/%m/%Y", "%Y-%m-%d"]

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
        if not tables:
            logger.warning("%s: no table.table-news found", trading_code)
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
                    # Flush previous item before starting a new one
                    if title and post_date and post_date >= cutoff:
                        items.append({
                            "trading_code": trading_code,
                            "title": title,
                            "body": body or "",
                            "post_date": post_date,
                            "scraped_at": now,
                        })
                    title = td.get_text(separator=" ", strip=True)
                    body = None
                    post_date = None
                elif "News" in header and "Title" not in header:
                    body = td.get_text(separator="\n", strip=True)
                elif "Post Date" in header or "Date" in header:
                    raw = td.get_text(strip=True)
                    try:
                        post_date = datetime.strptime(raw, "%Y-%m-%d").replace(
                            tzinfo=timezone.utc
                        )
                    except ValueError:
                        logger.warning(
                            "%s: could not parse date %r", trading_code, raw
                        )
                        post_date = None

            # Flush the last item
            if title and post_date and post_date >= cutoff:
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

        # Extract dividend declarations into separate collection
        self._save_dividend_declarations(db, news_items)

        return upserted

    @staticmethod
    def _parse_record_date(text: str):
        """Try multiple date formats to parse record date from news body."""
        m = _RECORD_DATE_RE.search(text)
        if not m:
            return None
        raw = m.group(1).strip().rstrip(".")
        for fmt in _DATE_FORMATS:
            try:
                return datetime.strptime(raw, fmt).replace(tzinfo=timezone.utc)
            except ValueError:
                continue
        return None

    @staticmethod
    def _parse_dividend_pct(body: str) -> float:
        """Extract dividend percentage from body text. Returns 0 for 'No Dividend'."""
        if "no dividend" in body.lower():
            return 0.0
        m = _PCT_RE.search(body)
        return float(m.group(1)) if m else 0.0

    def _save_dividend_declarations(self, db, news_items: list[dict]):
        """Upsert dividend declarations — one doc per company, latest only."""
        declarations = [
            item for item in news_items
            if "Dividend Declaration" in item.get("title", "")
        ]
        if not declarations:
            return

        for item in declarations:
            title = item["title"]
            body = item["body"]

            dividend_type = "Interim" if "Interim" in title else "Final"
            dividend_pct = self._parse_dividend_pct(body)
            record_date = self._parse_record_date(body)

            doc = {
                "trading_code": item["trading_code"],
                "declaration_date": item["post_date"],
                "dividend_pct": dividend_pct,
                "record_date": record_date,
                "dividend_type": dividend_type,
                "title": title,
                "scraped_at": item["scraped_at"],
            }

            # Only replace if this declaration is newer than what's stored
            existing = db.dividend_declarations.find_one(
                {"trading_code": item["trading_code"]}
            )
            if existing and existing["declaration_date"].replace(tzinfo=timezone.utc) > item["post_date"]:
                continue  # skip older declaration

            db.dividend_declarations.update_one(
                {"trading_code": item["trading_code"]},
                {"$set": doc},
                upsert=True,
            )
            logger.info(
                "%s: saved dividend declaration (%s, %s%%)",
                item["trading_code"], dividend_type, dividend_pct,
            )

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
