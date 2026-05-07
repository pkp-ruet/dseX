import logging
from datetime import date, datetime

from config import DSE_BASE_URL
from db.connection import get_db
from scrapers.base_scraper import BaseScraper
from utils.parser_helpers import clean_numeric

logger = logging.getLogger(__name__)


class MarketSummaryScraper(BaseScraper):
    """Scrapes DSE homepage for index values (DSEX/DSES/DS30) and daily market totals.

    Page structure (dsebd.org homepage):
      Each index is a div.midrow with children:
        div.m_col-1  — "DSEX Index" / "DSES Index" / "DS30 Index"  (font tag inside)
        div.m_col-2  — index value
        div.m_col-3  — change
        div.m_col-4  — change % (includes "%" suffix)

      Market totals are two consecutive div.midrow blocks:
        Header row:  m_col-wid="Total Trade", m_col-wid1="Total Volume", m_col-wid2="Total Value in Taka (mn)"
        Values row:  m_col-wid=222205, m_col-wid1=279933066, m_col-wid2=7934.264
    """

    def scrape(self) -> dict | None:
        soup = self.fetch_soup(DSE_BASE_URL)
        if soup is None:
            logger.error("Failed to fetch DSE homepage")
            return None

        doc = {
            "date": date.today().isoformat(),
            "dsex": None,
            "dsex_change": None,
            "dsex_change_pct": None,
            "dses": None,
            "dses_change": None,
            "ds30": None,
            "ds30_change": None,
            "total_volume": None,
            "total_value_mn": None,
            "total_trades": None,
            "scraped_at": datetime.utcnow(),
        }

        midrows = soup.find_all("div", class_="midrow")

        for i, row in enumerate(midrows):
            # ---- Index rows (m_col-1 / m_col-2 / m_col-3 / m_col-4) ----
            label_el = row.find("div", class_="m_col-1")
            if label_el:
                label = label_el.get_text(strip=True).upper()
                val_el  = row.find("div", class_="m_col-2")
                chg_el  = row.find("div", class_="m_col-3")
                pct_el  = row.find("div", class_="m_col-4")

                v = clean_numeric(val_el.get_text(strip=True)) if val_el else None
                c = clean_numeric(chg_el.get_text(strip=True)) if chg_el else None
                p = clean_numeric(pct_el.get_text(strip=True)) if pct_el else None

                # DSE indices are never legitimately 0 — treat 0 as missing
                # (the homepage shows 0.00 transiently in pre-market state)
                if v == 0:
                    v = None

                if "DSEX" in label and doc["dsex"] is None:
                    doc["dsex"], doc["dsex_change"], doc["dsex_change_pct"] = v, c, p

                elif "DSES" in label and doc["dses"] is None:
                    doc["dses"], doc["dses_change"] = v, c

                elif "DS30" in label and doc["ds30"] is None:
                    doc["ds30"], doc["ds30_change"] = v, c

            # ---- Totals header row → next sibling row has the values ----
            wid_el = row.find("div", class_="m_col-wid")
            if wid_el and "TOTAL TRADE" in wid_el.get_text(strip=True).upper():
                # The very next midrow contains the numeric values
                if i + 1 < len(midrows):
                    val_row = midrows[i + 1]
                    t_el = val_row.find("div", class_="m_col-wid")
                    v_el = val_row.find("div", class_="m_col-wid1")
                    vl_el = val_row.find("div", class_="m_col-wid2")
                    if doc["total_trades"] is None:
                        doc["total_trades"]   = clean_numeric(t_el.get_text(strip=True)) if t_el else None
                    if doc["total_volume"] is None:
                        doc["total_volume"]   = clean_numeric(v_el.get_text(strip=True)) if v_el else None
                    if doc["total_value_mn"] is None:
                        # DSE reports "Total Value in Taka (mn)" — already in millions
                        doc["total_value_mn"] = clean_numeric(vl_el.get_text(strip=True)) if vl_el else None

        if doc["dsex"] is None:
            logger.error("Could not parse DSEX from DSE homepage — page structure may have changed.")
            return None

        logger.info(
            "Scraped market summary: DSEX=%.2f change=%s, vol=%s, val_mn=%s",
            doc["dsex"] or 0,
            doc["dsex_change"],
            doc["total_volume"],
            doc["total_value_mn"],
        )
        return doc

    def save(self, doc: dict) -> None:
        db = get_db()
        db.dse_market_summary.update_one(
            {"date": doc["date"]},
            {"$set": doc},
            upsert=True,
        )
        logger.info("Saved market summary for %s", doc["date"])

    def run(self):
        doc = self.scrape()
        if doc:
            self.save(doc)
        return doc
