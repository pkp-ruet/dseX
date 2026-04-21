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
    return _bd


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


@router.get("/api/market-live")
def get_market_live():
    session = market_session_info()

    headers = {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
    }

    if not session["is_open"]:
        return JSONResponse(
            content={
                "is_open": False,
                "is_trading_day": session["is_trading_day"],
                "opens_in_seconds": session["opens_in_seconds"],
                "server_time_bst": session["server_time_bst"],
                "message": "Market closed",
            },
            headers=headers,
        )

    bd = _get_bd()
    if bd is None:
        return JSONResponse(
            content={"is_open": True, "error": "data_source_unavailable"},
            status_code=503,
            headers=headers,
        )

    as_of = datetime.now(BST).isoformat(timespec="seconds")
    prices_df = index_df = movers_df = sectors_df = news_df = None

    try:
        prices_df = bd.get_current_trades()
    except Exception as e:
        logger.warning("bdshare get_current_trades failed: %s", e)

    try:
        index_df = bd.get_dsex_index()
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
    index_data = _parse_index(index_df)

    # Use movers_df if available, else compute from prices
    if movers_df is not None and not movers_df.empty:
        gainers, losers = _parse_movers(movers_df, top_n=10)
    else:
        gainers, losers = _parse_movers(prices_df, top_n=10)

    # Breadth from prices
    advances = sum(1 for p in prices if (p.get("change_pct") or 0) > 0)
    declines = sum(1 for p in prices if (p.get("change_pct") or 0) < 0)
    unchanged = len(prices) - advances - declines

    # Volume leaders
    volume_leaders = sorted(
        [p for p in prices if p.get("volume") is not None],
        key=lambda x: x["volume"] or 0,
        reverse=True,
    )[:10]

    # Whats hot: volume × |change_pct| momentum score
    whats_hot = sorted(
        [p for p in prices if p.get("volume") and p.get("change_pct") and p["change_pct"] > 0],
        key=lambda x: (x["volume"] or 0) * abs(x["change_pct"] or 0),
        reverse=True,
    )[:8]

    return JSONResponse(
        content={
            "is_open": True,
            "as_of": as_of,
            "closes_in_seconds": session["closes_in_seconds"],
            "index": index_data,
            "prices": prices,
            "top_gainers": gainers[:10],
            "top_losers": losers[:10],
            "volume_leaders": volume_leaders,
            "whats_hot": whats_hot,
            "sector_performance": _parse_sectors(sectors_df),
            "breadth": {
                "advances": advances,
                "declines": declines,
                "unchanged": unchanged,
                "total": len(prices),
            },
            "psn_news": _parse_news(news_df),
        },
        headers=headers,
    )
