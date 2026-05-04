"""
Historical price backfill — one-shot.

Uses bdshare.get_historical_data() to fetch multi-year daily OHLCV per stock
and upserts into the existing `stock_prices` collection. The collection's
unique index on (trading_code, date) makes re-runs idempotent.
"""
import logging
import math
from datetime import date, timedelta

from db.connection import get_db

logger = logging.getLogger(__name__)


def _safe_float(val) -> float | None:
    try:
        v = float(val)
        return None if math.isnan(v) or math.isinf(v) else v
    except (TypeError, ValueError):
        return None


def _safe_int(val) -> int | None:
    try:
        v = float(val)
        return None if math.isnan(v) else int(v)
    except (TypeError, ValueError):
        return None


class HistoricalPriceScraper:
    def __init__(self, years: int = 4):
        self.years = years
        self.end_date = date.today()
        self.start_date = self.end_date - timedelta(days=years * 365)

    def _fetch(self, code: str):
        from bdshare import get_historical_data
        return get_historical_data(
            start=self.start_date.isoformat(),
            end=self.end_date.isoformat(),
            code=code,
        )

    def _row_to_doc(self, code: str, date_str: str, row: dict) -> dict:
        ltp = _safe_float(row.get("ltp"))
        high = _safe_float(row.get("high"))
        low = _safe_float(row.get("low"))
        close_price = _safe_float(row.get("close"))
        ycp = _safe_float(row.get("ycp"))
        volume = _safe_int(row.get("volume"))
        trade_count = _safe_int(row.get("trade"))
        value_mn = _safe_float(row.get("value"))

        change = None
        change_pct = None
        if close_price is not None and ycp is not None:
            change = round(close_price - ycp, 4)
            if ycp != 0:
                change_pct = round(change / ycp * 100, 2)

        return {
            "trading_code": code,
            "date": date_str,
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
        }

    def _save(self, code: str, df) -> tuple[int, int]:
        if df is None or df.empty:
            return (0, 0)
        db = get_db()
        inserted = 0
        modified = 0
        for date_idx, row in df.iterrows():
            date_str = str(date_idx)[:10]
            doc = self._row_to_doc(code, date_str, row.to_dict())
            result = db.stock_prices.update_one(
                {"trading_code": code, "date": date_str},
                {"$set": doc},
                upsert=True,
            )
            if result.upserted_id:
                inserted += 1
            elif result.modified_count:
                modified += 1
        return (inserted, modified)

    def run(self, codes: list[str]) -> tuple[int, int]:
        db = get_db()
        excluded = {
            d["trading_code"]
            for d in db.companies.find({"excluded": True}, {"trading_code": 1, "_id": 0})
        }

        total_inserted = 0
        total_modified = 0
        ok_count = 0
        skip_count = 0
        fail_count = 0

        logger.info(
            "Historical backfill: %d codes, range %s → %s",
            len(codes), self.start_date.isoformat(), self.end_date.isoformat(),
        )

        for i, code in enumerate(codes, 1):
            if code in excluded:
                logger.info("[%d/%d] SKIP %s: excluded", i, len(codes), code)
                skip_count += 1
                continue

            try:
                df = self._fetch(code)
            except Exception as e:
                logger.warning("[%d/%d] FAIL %s: %s", i, len(codes), code, e)
                fail_count += 1
                continue

            if df is None or df.empty:
                logger.info("[%d/%d] SKIP %s: no data", i, len(codes), code)
                skip_count += 1
                continue

            try:
                inserted, modified = self._save(code, df)
            except Exception as e:
                logger.warning("[%d/%d] FAIL %s save: %s", i, len(codes), code, e)
                fail_count += 1
                continue

            logger.info(
                "[%d/%d] OK %s: %d new, %d updated (returned %d rows)",
                i, len(codes), code, inserted, modified, len(df),
            )
            total_inserted += inserted
            total_modified += modified
            ok_count += 1

        logger.info(
            "Backfill complete — ok=%d skip=%d fail=%d new=%d updated=%d",
            ok_count, skip_count, fail_count, total_inserted, total_modified,
        )
        return (total_inserted, total_modified)
