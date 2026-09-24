import logging
from datetime import datetime

from config import DSE_LIVE_MARKET_URL
from db.connection import get_db
from scrapers.base_scraper import BaseScraper
from utils.parser_helpers import clean_numeric
from utils.market_hours import bst_today_iso

logger = logging.getLogger(__name__)


class MarketSummaryScraper(BaseScraper):
    """DSE index values (DSEX/DSES/DS30) and daily market totals.

    Source: the relaunched dsebd.org's JSON feed `/api/live/market` (the old
    homepage `div.midrow` markup is gone since 2026-09-24):
      {"indices": [{"key": "DSEX", "value", "change", "percent", "prev"}, ...],
       "totals":  {"trades", "volume", "turnover" (Tk mn), "marketCap", ...},
       "session": {"tradingDay": bool, ...}}
    """

    def scrape(self) -> dict | None:
        resp = self.fetch(DSE_LIVE_MARKET_URL)
        if resp is None:
            logger.error("Failed to fetch DSE live market feed")
            return None
        try:
            data = resp.json()
        except ValueError as e:
            logger.error("DSE live market feed is not JSON (%s) — API may have changed", e)
            return None

        session = data.get("session") or {}
        if session.get("tradingDay") is False:
            logger.warning("DSE reports no trading today — skipping market summary")
            return None

        doc = {
            "date": bst_today_iso(),
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

        def num(v):
            if isinstance(v, (int, float)) and not isinstance(v, bool):
                return float(v)
            return clean_numeric(str(v)) if v is not None else None

        for ix in data.get("indices") or []:
            key = str(ix.get("key", "")).upper()
            v = num(ix.get("value"))
            # DSE indices are never legitimately 0 — treat 0 as missing
            if v == 0:
                v = None
            c = num(ix.get("change"))
            if key == "DSEX":
                p = num(ix.get("percent"))
                doc["dsex"], doc["dsex_change"] = v, c
                doc["dsex_change_pct"] = round(p, 2) if p is not None else None
            elif key == "DSES":
                doc["dses"], doc["dses_change"] = v, c
            elif key == "DS30":
                doc["ds30"], doc["ds30_change"] = v, c

        totals = data.get("totals") or {}
        doc["total_trades"] = num(totals.get("trades"))
        doc["total_volume"] = num(totals.get("volume"))
        # "turnover" is Total Value in Taka (mn) — already in millions
        doc["total_value_mn"] = num(totals.get("turnover"))

        if doc["dsex"] is None:
            logger.error("Could not read DSEX from DSE live market feed — API may have changed.")
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
