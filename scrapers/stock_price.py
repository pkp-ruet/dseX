import logging
from scrapers.base_scraper import BaseScraper
from db.connection import get_db
from config import DSE_LATEST_PRICE_URL
from utils.parser_helpers import clean_numeric
from utils.market_hours import bst_today_iso

logger = logging.getLogger(__name__)


class StockPriceScraper(BaseScraper):
    def scrape(self):
        logger.info("Scraping latest share prices from %s", DSE_LATEST_PRICE_URL)
        # The new dsebd.org (2026-09-24) serves prices as JSON:
        #   {"cols": ["code","ltp","ycp","open","high","low","close","volume",
        #             "value","trades","percent",...], "rows": [[...], ...],
        #    "session": {"tradingDay": bool, ...}}
        # `close` is CLOSEP (0 until the session closes), `value` is in Tk mn.
        resp = self.fetch(DSE_LATEST_PRICE_URL)
        if resp is None:
            logger.error("Failed to fetch latest share prices")
            return []
        try:
            data = resp.json()
            cols = data["cols"]
            rows = data["rows"]
        except (ValueError, KeyError, TypeError) as e:
            logger.error("Unexpected latest-price payload (%s) — API may have changed", e)
            return []

        session = data.get("session") or {}
        if session.get("tradingDay") is False:
            # Not a trading day: the feed still shows the last session, which
            # must not be stamped with today's date.
            logger.warning("DSE reports no trading today — skipping price save")
            return []

        idx = {name: i for i, name in enumerate(cols)}

        def col(row, name):
            i = idx.get(name)
            if i is None or i >= len(row):
                return None
            v = row[i]
            if isinstance(v, (int, float)) and not isinstance(v, bool):
                return float(v)
            return clean_numeric(str(v)) if v is not None else None

        prices = []
        today = bst_today_iso()

        for row in rows:
            trading_code = str(row[idx["code"]]).strip() if "code" in idx else ""
            if not trading_code:
                continue

            ltp = col(row, "ltp")
            high = col(row, "high")
            low = col(row, "low")
            close_price = col(row, "close")
            ycp = col(row, "ycp")
            change = None
            trade_count = col(row, "trades")
            value_mn = col(row, "value")
            volume = col(row, "volume")

            # Trading suspended / no trade (e.g. on a dividend record date):
            # DSE reports 0.00 across the price columns. Treat this as "no price
            # today" rather than a real 0 — null the price fields so the app
            # keeps showing the last valid close instead of a sudden 0.
            suspended = ltp is None or ltp <= 0
            if suspended:
                ltp = high = low = close_price = None
                change = change_pct = None
            else:
                # Intraday, DSE shows CLOSEP as 0.00 until the session closes —
                # the official close doesn't exist yet. `scrape-quick` runs
                # several times during the session, so store "no close yet"
                # (None) rather than a real 0: a 0 close made `change` = -ycp,
                # i.e. -100% for every stock (shipped bug, 2026-08-30).
                # `db_service.use_official_close` no-ops on a None close and
                # the post-close scrape overwrites the row with the real CLOSEP.
                if close_price is not None and close_price <= 0:
                    close_price = None

                # DSE's own CHANGE column is last-trade based (ltp - ycp). Store
                # the official close's change instead, so this row means the same
                # thing as a backfilled one (historical_prices.py) and as every
                # read path in db_service, which all price off CLOSEP. Nothing is
                # lost — DSE's figure is still ltp - ycp, and both are stored.
                # With no close yet, fall back to the LTP so the intraday row
                # still carries a sensible change.
                basis = close_price if close_price is not None else ltp
                if ycp:
                    change = round(basis - ycp, 2)
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
        excluded = {
            d["trading_code"]
            for d in db.companies.find({"excluded": True}, {"trading_code": 1, "_id": 0})
        }
        inserted = 0
        updated = 0

        for p in prices:
            if p["trading_code"] in excluded:
                continue
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
