import re
import logging
from scrapers.base_scraper import BaseScraper
from db.connection import get_db
from config import DSE_COMPANY_LIST_URL

logger = logging.getLogger(__name__)


class CompanyListScraper(BaseScraper):
    def scrape(self):
        logger.info("Scraping company list from %s", DSE_COMPANY_LIST_URL)
        soup = self.fetch_soup(DSE_COMPANY_LIST_URL)
        if soup is None:
            logger.error("Failed to fetch company listing page")
            return []

        companies = []
        seen = set()

        # The alphabetical section uses <a class="ab1"> links followed by
        # <span>(Full Company Name)</span>
        for link in soup.find_all("a", class_="ab1"):
            href = link.get("href", "")
            match = re.search(r"name=([^&]+)", href)
            if not match:
                continue

            code = match.group(1).strip()
            if code in seen:
                continue
            seen.add(code)

            full_name = None
            span = link.find_next_sibling("span")
            if span:
                raw = span.get_text(strip=True)
                full_name = raw.strip("()")

            companies.append({
                "trading_code": code,
                "company_name": full_name,
            })

        logger.info("Found %d unique companies", len(companies))
        return companies

    def save(self, companies):
        db = get_db()
        inserted = 0
        updated = 0

        for comp in companies:
            result = db.companies.update_one(
                {"trading_code": comp["trading_code"]},
                {"$set": comp},
                upsert=True,
            )
            if result.upserted_id:
                inserted += 1
            elif result.modified_count:
                updated += 1

        logger.info("Companies — inserted: %d, updated: %d", inserted, updated)

    def run(self):
        companies = self.scrape()
        if companies:
            self.save(companies)
        return companies
