"""The market-wide inputs of the fair-value estimate (fair_context), gathered
once and cached: how far strong companies were re-priced since each year-end,
and the pool of clean peers. Every caller of ``estimate_fair_value`` passes
``market_context()`` so the stock page, the watchlist, the Buy List and the
recommendation engine show one figure."""
from __future__ import annotations

import logging
from typing import Optional

from backend.services import fair_context as fc
from backend.services.db_service import _ttl_cache, get_db

logger = logging.getLogger(__name__)

_STRONG = {"good", "excellent"}
_FINANCIAL = {"BANK", "NBFI", "INSURANCE"}
# Year-ends further back than this are never in anyone's window.
_YEARS_BACK = 7


def _f(v) -> Optional[float]:
    return fc._num(v)


@_ttl_cache(900, max_entries=2)
def market_context() -> Optional[dict]:
    """``{"pe_factors", "pb_factors", "pool"}`` or None when the scores can't
    be read (callers then fall back to the score row's own figures)."""
    try:
        return _build()
    except Exception:  # noqa: BLE001 — the estimate still works without it
        logger.exception("fair value: market context failed")
        return None


def _build() -> Optional[dict]:
    from backend.services.scoring_service import build_scores_df
    from backend.services.tiers import tier_key
    from utils.sector import normalize_sector

    df = build_scores_df()
    if df is None or df.empty:
        return None
    rows = df.to_dict("records")
    months = _year_end_months()

    # Strong, non-Z companies: the yardstick for how the market re-priced.
    strong = {}
    for r in rows:
        if tier_key(_f(r.get("score"))) not in _STRONG:
            continue
        if str(r.get("market_cat") or "").upper() == "Z":
            continue
        month = _f(r.get("ye_month")) or months.get(r["trading_code"])
        if not month:
            month = 12 if normalize_sector(r.get("sector") or "") in _FINANCIAL else 6
        strong[r["trading_code"]] = (int(month), _f(r.get("current_pe")), _f(r.get("current_pb")))

    pe_pts, pb_pts = [], []
    if strong:
        docs = get_db().financials.find(
            {"trading_code": {"$in": list(strong)}},
            {"_id": 0, "trading_code": 1, "year": 1, "pe_ratio_basic": 1,
             "eps_cont_basic": 1, "eps_basic": 1, "nav_per_share": 1},
        )
        last_year = None
        rows_by: dict[str, list[dict]] = {}
        for d in docs:
            if d.get("year") is None:
                continue
            rows_by.setdefault(d["trading_code"], []).append(d)
            last_year = max(last_year or 0, int(d["year"]))
        for code, fin in rows_by.items():
            month, pe_now, pb_now = strong[code]
            for d in fin:
                year = int(d["year"])
                if last_year and year < last_year - _YEARS_BACK:
                    continue
                pe = _f(d.get("pe_ratio_basic"))
                if not pe or pe <= 0:
                    continue
                if pe_now:
                    pe_pts.append((year, month, pe, pe_now))
                eps = _f(d.get("eps_cont_basic"))
                eps = eps if eps is not None else _f(d.get("eps_basic"))
                nav = _f(d.get("nav_per_share"))
                if pb_now and eps and eps > 0 and nav and nav > 0:
                    pb_pts.append((year, month, pe * eps / nav, pb_now))

    turnover = None
    try:
        from backend.services.top20_service import compute_momentum_all
        mom = compute_momentum_all()
        turnover = {c: (m.get("med_turnover_30d_mn") if m.get("med_turnover_30d_mn") is not None
                        else m.get("avg_turnover_7d_mn")) for c, m in (mom or {}).items()}
    except Exception:  # noqa: BLE001 — peers are then not filtered on trading
        logger.warning("fair value: trading figures unavailable for peers")

    return {
        "pe_factors": fc.market_factors(pe_pts),
        "pb_factors": fc.market_factors(pb_pts),
        "pool": fc.peer_pool(rows, turnover),
        "strong": len(strong),
        "ye_month": months,
    }


def _year_end_months() -> dict[str, int]:
    """{code: year-end month} from the dividend ledger — the score's own rule
    (scoring_service), so the estimate knows a December company before the
    score rows carry ``ye_month``."""
    from utils.dividend_years import group_by_code, own_rows, year_end_month
    try:
        docs = get_db().dividend_declarations.find(
            {"cash_pct": {"$ne": None}, "period_end": {"$ne": None}},
            {"_id": 0, "trading_code": 1, "period_end": 1, "dividend_type": 1, "title": 1, "cash_pct": 1},
        )
        out = {}
        for code, rows in group_by_code(docs).items():
            m = year_end_month(own_rows(rows))
            if m:
                out[code] = int(m)
        return out
    except Exception:  # noqa: BLE001
        logger.warning("fair value: year-end months unavailable")
        return {}
