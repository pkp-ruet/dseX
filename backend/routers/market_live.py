"""
/api/market-live — real-time DSE data via bdshare during trading hours.
Returns consolidated live snapshot: prices, index, movers, sectors, PSN news.
"""
import logging
import math
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from backend.services.market_hours import is_market_open, market_session_info
from backend.services.db_service import load_latest_prices, load_market_index, load_market_movers, load_companies

logger = logging.getLogger(__name__)
router = APIRouter()

BST = timezone(timedelta(hours=6))

# Module-level bdshare client — has built-in TTL cache (30s trades, 1m index, 5m sectors)
_bd = None


def _get_bd():
    global _bd
    if _bd is None:
        try:
            from bdshare import BDShare
            _bd = BDShare()
        except Exception as e:
            logger.error("bdshare init failed: %s", e)
            return None  # don't cache failure — retry on next request
    return _bd


def _scrape_live_prices() -> list[dict]:
    """Tier 2: direct DSE HTML scrape via existing StockPriceScraper (no DB write)."""
    try:
        from scrapers.stock_price import StockPriceScraper
        return StockPriceScraper().scrape()
    except Exception as e:
        logger.warning("Tier 2 DSE scrape failed: %s", e)
        return []


def _prices_from_raw(raw: list[dict], company_names: dict) -> list[dict]:
    """Convert StockPriceScraper dicts to LivePriceItem shape."""
    return [
        {
            "code": p["trading_code"],
            "company_name": company_names.get(p["trading_code"]),
            "ltp": p.get("ltp"),
            "high": p.get("high"),
            "low": p.get("low"),
            "close": p.get("close_price"),
            "ycp": p.get("ycp"),
            "change": p.get("change"),
            "change_pct": p.get("change_pct"),
            "volume": p.get("volume"),
            "value_mn": p.get("value_mn"),
            "trade_count": p.get("trade_count"),
        }
        for p in raw
        if p.get("trading_code")
    ]


def _safe_float(val) -> float | None:
    try:
        v = float(val)
        return None if math.isnan(v) or math.isinf(v) else round(v, 4)
    except (TypeError, ValueError):
        return None


def _safe_int(val) -> int | None:
    try:
        v = float(val)
        return None if math.isnan(v) else int(v)
    except (TypeError, ValueError):
        return None


def _norm_cols(df) -> dict:
    """Return {NORMALIZED_NAME: original_name} mapping."""
    return {c.upper().strip().replace(" ", "_"): c for c in df.columns}


def _parse_prices(df) -> list[dict]:
    if df is None or df.empty:
        return []
    cols = _norm_cols(df)
    out = []
    # Column name guesses for bdshare DataFrame
    code_col = cols.get("TRADING_CODE") or cols.get("CODE") or cols.get("TRADINGCODE")
    ltp_col = cols.get("LTP") or cols.get("LAST_TRADE_PRICE")
    high_col = cols.get("HIGH")
    low_col = cols.get("LOW")
    close_col = cols.get("CLOSE_PRICE") or cols.get("CLOSEP") or cols.get("CLOSE")
    ycp_col = cols.get("YCP") or cols.get("YESTERDAY_CLOSING_PRICE")
    change_col = cols.get("CHANGE")
    pct_col = cols.get("%_CHANGE") or cols.get("CHANGE%") or cols.get("%CHANGE") or cols.get("CHANGE_PCT")
    vol_col = cols.get("VOLUME") or cols.get("VOLUME_(IN_SHARE)")
    val_col = cols.get("VALUE_(MN)") or cols.get("VALUE_MN") or cols.get("VALUE_(MN.)") or cols.get("VALUE")
    trade_col = cols.get("TRADE") or cols.get("TRADE_COUNT") or cols.get("NO._OF_TRADE")

    for _, row in df.iterrows():
        code = str(row[code_col]).strip() if code_col and code_col in df.columns else None
        if not code or code in ("nan", "None", ""):
            continue
        ltp = _safe_float(row[ltp_col]) if ltp_col and ltp_col in df.columns else None
        ycp = _safe_float(row[ycp_col]) if ycp_col and ycp_col in df.columns else None
        change = _safe_float(row[change_col]) if change_col and change_col in df.columns else None
        change_pct = _safe_float(row[pct_col]) if pct_col and pct_col in df.columns else None
        # compute change_pct from change/ycp if not directly available
        if change_pct is None and change is not None and ycp and ycp != 0:
            change_pct = round(change / ycp * 100, 2)
        volume = _safe_int(row[vol_col]) if vol_col and vol_col in df.columns else None
        out.append({
            "code": code,
            "ltp": ltp,
            "high": _safe_float(row[high_col]) if high_col and high_col in df.columns else None,
            "low": _safe_float(row[low_col]) if low_col and low_col in df.columns else None,
            "close": _safe_float(row[close_col]) if close_col and close_col in df.columns else None,
            "ycp": ycp,
            "change": change,
            "change_pct": change_pct,
            "volume": volume,
            "value_mn": _safe_float(row[val_col]) if val_col and val_col in df.columns else None,
            "trade_count": _safe_int(row[trade_col]) if trade_col and trade_col in df.columns else None,
        })
    return out


def _parse_index(df) -> dict | None:
    if df is None or df.empty:
        return None
    cols = _norm_cols(df)
    index_col = cols.get("INDEX") or cols.get("INDEX_NAME")
    val_col = cols.get("CURRENT_VALUE") or cols.get("VALUE") or cols.get("CURRENT")
    chg_col = cols.get("CHANGE")
    pct_col = cols.get("%_CHANGE") or cols.get("CHANGE%") or cols.get("%CHANGE")

    result = {}
    for _, row in df.iterrows():
        name = str(row[index_col]).upper().strip() if index_col and index_col in df.columns else ""
        val = _safe_float(row[val_col]) if val_col and val_col in df.columns else None
        chg = _safe_float(row[chg_col]) if chg_col and chg_col in df.columns else None
        pct = _safe_float(row[pct_col]) if pct_col and pct_col in df.columns else None
        if "DSEX" in name:
            result["dsex"] = val
            result["dsex_change"] = chg
            result["dsex_change_pct"] = pct
        elif "DS30" in name:
            result["ds30"] = val
            result["ds30_change"] = chg
        elif "DSES" in name:
            result["dses"] = val
            result["dses_change"] = chg
    return result if result else None


def _parse_movers(df, top_n: int = 10) -> tuple[list, list]:
    if df is None or df.empty:
        return [], []
    prices = _parse_prices(df)
    if not prices:
        return [], []
    valid = [p for p in prices if p.get("change_pct") is not None]
    gainers = sorted(valid, key=lambda x: x["change_pct"] or 0, reverse=True)[:top_n]
    losers = sorted(valid, key=lambda x: x["change_pct"] or 0)[:top_n]
    return gainers, losers


def _parse_sectors(df) -> list[dict]:
    if df is None or df.empty:
        return []
    cols = _norm_cols(df)
    sec_col = cols.get("SECTOR") or cols.get("CATEGORY")
    pct_col = (
        cols.get("AVG_CHANGE_%") or cols.get("AVG_CHANGE_PCT")
        or cols.get("CHANGE_%") or cols.get("AVG_%_CHANGE")
        or cols.get("AVERAGE_%_CHANGE") or cols.get("%_CHANGE")
    )
    count_col = cols.get("COUNT") or cols.get("TOTAL") or cols.get("NO._OF_COMPANY")
    out = []
    for _, row in df.iterrows():
        sec = str(row[sec_col]).strip() if sec_col and sec_col in df.columns else None
        if not sec or sec in ("nan", "None", ""):
            continue
        pct = _safe_float(row[pct_col]) if pct_col and pct_col in df.columns else None
        count = _safe_int(row[count_col]) if count_col and count_col in df.columns else None
        out.append({"sector": sec, "avg_change_pct": pct, "count": count})
    return out


def _parse_news(df) -> list[dict]:
    if df is None or df.empty:
        return []
    cols = _norm_cols(df)
    title_col = cols.get("TITLE") or cols.get("SUBJECT") or cols.get("HEADLINE")
    code_col = cols.get("TRADING_CODE") or cols.get("CODE") or cols.get("COMPANY")
    date_col = cols.get("DATE") or cols.get("POST_DATE") or cols.get("PUBLISH_DATE")
    out = []
    for _, row in df.iterrows():
        title = str(row[title_col]).strip() if title_col and title_col in df.columns else ""
        if not title or title in ("nan", "None"):
            continue
        out.append({
            "title": title,
            "code": str(row[code_col]).strip() if code_col and code_col in df.columns else None,
            "date": str(row[date_col]).strip() if date_col and date_col in df.columns else None,
        })
    return out[:30]


def _build_closed_response(session: dict) -> dict:
    """Build response using last-known MongoDB data when market is closed."""
    base = {
        "is_open": False,
        "is_trading_day": session["is_trading_day"],
        "opens_in_seconds": session["opens_in_seconds"],
        "server_time_bst": session["server_time_bst"],
    }

    try:
        raw_prices = load_latest_prices()
        company_names = {c["trading_code"]: c.get("company_name") for c in load_companies()}
        prices = []
        as_of_date = None
        for code, p in raw_prices.items():
            date_val = p.get("date")
            if date_val and as_of_date is None:
                as_of_date = str(date_val)
            change_pct = p.get("change_pct")
            prices.append({
                "code": code,
                "company_name": company_names.get(code),
                "ltp": p.get("ltp"),
                "high": p.get("high"),
                "low": p.get("low"),
                "close": p.get("close_price"),
                "ycp": p.get("ycp"),
                "change": p.get("change"),
                "change_pct": change_pct,
                "volume": p.get("volume"),
                "value_mn": p.get("value_mn"),
                "trade_count": p.get("trade_count"),
            })

        base["as_of"] = as_of_date
        base["prices"] = prices

        # Gainers / losers from prices
        valid = [p for p in prices if p.get("change_pct") is not None]
        base["top_gainers"] = sorted(valid, key=lambda x: x["change_pct"] or 0, reverse=True)[:10]
        base["top_losers"] = sorted(valid, key=lambda x: x["change_pct"] or 0)[:10]

        # Volume leaders
        base["volume_leaders"] = sorted(
            [p for p in prices if p.get("volume") is not None],
            key=lambda x: x["volume"] or 0, reverse=True
        )[:10]

        # Breadth
        advances = sum(1 for p in prices if (p.get("change_pct") or 0) > 0)
        declines = sum(1 for p in prices if (p.get("change_pct") or 0) < 0)
        base["breadth"] = {
            "advances": advances,
            "declines": declines,
            "unchanged": len(prices) - advances - declines,
            "total": len(prices),
        }

        # Whats hot from last session
        base["whats_hot"] = sorted(
            [p for p in prices if p.get("volume") and p.get("change_pct") and p["change_pct"] > 0],
            key=lambda x: (x["volume"] or 0) * abs(x["change_pct"] or 0),
            reverse=True,
        )[:8]
    except Exception as e:
        logger.warning("closed response: prices load failed: %s", e)
        base["prices"] = []

    try:
        idx = load_market_index()
        base["index"] = {
            "dsex": idx.get("dsex"),
            "dsex_change": idx.get("dsex_change"),
            "dsex_change_pct": idx.get("dsex_change_pct"),
            "ds30": idx.get("ds30"),
            "ds30_change": idx.get("ds30_change"),
            "dses": idx.get("dses"),
            "dses_change": idx.get("dses_change"),
        }
        if not base.get("as_of"):
            base["as_of"] = idx.get("date")
    except Exception as e:
        logger.warning("closed response: index load failed: %s", e)

    return base


@router.get("/api/market-live")
def get_market_live():
    session = market_session_info()

    headers = {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
    }

    if not session["is_open"]:
        return JSONResponse(
            content=_build_closed_response(session),
            headers=headers,
        )

    bd = _get_bd()
    as_of = datetime.now(BST).isoformat(timespec="seconds")
    prices: list[dict] = []
    index_data = None
    sectors_df = news_df = movers_df = None
    data_source = "live"

    # ── Tier 1: bdshare ────────────────────────────────────────────────────
    if bd is not None:
        prices_df = None
        try:
            prices_df = bd.get_current_trades()
        except Exception as e:
            logger.warning("bdshare get_current_trades failed: %s", e)

        try:
            index_data = _parse_index(bd.get_dsex_index())
        except Exception as e:
            logger.warning("bdshare get_dsex_index failed: %s", e)

        try:
            movers_df = bd.get_top_movers(limit=20)
        except Exception as e:
            logger.warning("bdshare get_top_movers failed: %s", e)

        try:
            sectors_df = bd.get_sector_performance()
        except Exception as e:
            logger.warning("bdshare get_sector_performance failed: %s", e)

        try:
            news_df = bd.get_news(news_type="psn")
        except Exception as e:
            logger.warning("bdshare get_news failed: %s", e)

        prices = _parse_prices(prices_df)
        try:
            company_names = {c["trading_code"]: c.get("company_name") for c in load_companies()}
            for p in prices:
                p["company_name"] = company_names.get(p["code"])
        except Exception:
            pass

    # ── Tier 2: direct DSE scrape (bdshare unavailable or returned nothing) ─
    if not prices:
        logger.info("Tier 1 empty — trying Tier 2 direct DSE scrape")
        try:
            company_names = {c["trading_code"]: c.get("company_name") for c in load_companies()}
        except Exception:
            company_names = {}
        raw = _scrape_live_prices()
        if raw:
            prices = _prices_from_raw(raw, company_names)
            logger.info("Tier 2 DSE scrape: %d prices", len(prices))

    # ── Tier 3: MongoDB last-known (both live sources failed) ───────────────
    if not prices:
        logger.warning("Tiers 1+2 failed — falling back to MongoDB cache")
        fallback = _build_closed_response(session)
        fallback["is_open"] = True
        fallback["as_of"] = as_of
        fallback["data_source"] = "cache"
        return JSONResponse(content=fallback, headers=headers)

    # ── Index fallback to MongoDB if bdshare index failed ──────────────────
    if index_data is None:
        try:
            idx = load_market_index()
            index_data = {
                "dsex": idx.get("dsex"), "dsex_change": idx.get("dsex_change"),
                "dsex_change_pct": idx.get("dsex_change_pct"),
                "ds30": idx.get("ds30"), "ds30_change": idx.get("ds30_change"),
                "dses": idx.get("dses"), "dses_change": idx.get("dses_change"),
            }
        except Exception:
            pass

    # ── Compute derived fields ──────────────────────────────────────────────
    gainers, losers = _parse_movers(movers_df, top_n=10) if movers_df is not None else ([], [])
    if not gainers and not losers:
        valid = [p for p in prices if p.get("change_pct") is not None]
        gainers = sorted(valid, key=lambda x: x["change_pct"] or 0, reverse=True)[:10]
        losers = sorted(valid, key=lambda x: x["change_pct"] or 0)[:10]

    advances = sum(1 for p in prices if (p.get("change_pct") or 0) > 0)
    declines = sum(1 for p in prices if (p.get("change_pct") or 0) < 0)

    volume_leaders = sorted(
        [p for p in prices if p.get("volume") is not None],
        key=lambda x: x["volume"] or 0, reverse=True,
    )[:10]

    whats_hot = sorted(
        [p for p in prices if p.get("volume") and p.get("change_pct") and p["change_pct"] > 0],
        key=lambda x: (x["volume"] or 0) * abs(x["change_pct"] or 0), reverse=True,
    )[:8]

    return JSONResponse(
        content={
            "is_open": True,
            "data_source": data_source,
            "as_of": as_of,
            "closes_in_seconds": session["closes_in_seconds"],
            "index": index_data,
            "prices": prices,
            "top_gainers": gainers,
            "top_losers": losers,
            "volume_leaders": volume_leaders,
            "whats_hot": whats_hot,
            "sector_performance": _parse_sectors(sectors_df),
            "breadth": {
                "advances": advances,
                "declines": declines,
                "unchanged": len(prices) - advances - declines,
                "total": len(prices),
            },
            "psn_news": _parse_news(news_df),
        },
        headers=headers,
    )
