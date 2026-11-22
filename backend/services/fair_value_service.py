"""The market-wide inputs of the fair-value estimate (fair_context), gathered
once and cached: how far strong companies were re-priced since each year-end,
and the pool of clean peers. Every caller of ``estimate_fair_value`` passes
``market_context()`` so the stock page, the watchlist, the Buy List and the
recommendation engine show one figure — and since 2026-11-22 the nightly
scoring run prices the valuation score with the same copy
(``context_for_scoring``)."""
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

# One copy a week (2026-11-22, phase 1): the re-pricing factors and the peer
# pool are read from today's P/Es, so built every day they moved the fair
# price with the market's daily noise. Frozen for the week, a fair price moves
# on results, a bonus or a new week — and the stock page, the watchlist and
# the nightly scoring run read the very same copy.
_STORE = "fair_market_context"


def _f(v) -> Optional[float]:
    return fc._num(v)


def week_key(day: Optional[str] = None) -> str:
    """The Sunday (DSE's first trading day) of ``day``'s week, ISO."""
    from datetime import date, timedelta
    from utils.market_hours import bst_today_iso
    d = date.fromisoformat((day or bst_today_iso())[:10])
    return (d - timedelta(days=(d.weekday() + 1) % 7)).isoformat()


@_ttl_cache(900, max_entries=2)
def market_context() -> Optional[dict]:
    """``{"pe_factors", "pb_factors", "pool", "strong", "ye_month", "week"}`` or
    None when the scores can't be read (callers then fall back to the score
    row's own figures). This week's stored copy when there is one."""
    try:
        got = load_week()
        if got:
            return got
        ctx = _build()
        if ctx:
            save_week(ctx)
        return ctx
    except Exception:  # noqa: BLE001 — the estimate still works without it
        logger.exception("fair value: market context failed")
        return None


def context_for_scoring(rows: list[dict], fin_by_code: dict[str, list[dict]],
                        backtest: bool = False) -> Optional[dict]:
    """The context the nightly scoring run prices with: this week's stored
    copy, else one built from the rows it has just scored (and stored). A
    backtest builds its own from the rows as of its day and stores nothing."""
    try:
        if not backtest:
            got = load_week()
            if got:
                return got
        months = {} if backtest else _year_end_months()
        turnover = None if backtest else _turnover()
        ctx = build_context(rows, fin_by_code, months, turnover)
        if ctx and not backtest:
            save_week(ctx)
        return ctx
    except Exception:  # noqa: BLE001 — scoring then uses the ratios
        logger.exception("fair value: scoring context failed")
        return None


def _pack(ctx: dict) -> dict:
    def factors(f):
        return {"by_month": [[y, m, v] for (y, m), v in (f or {}).get("by_month", {}).items()],
                "by_year": [[y, v] for y, v in (f or {}).get("by_year", {}).items()]}
    return {"pe_factors": factors(ctx.get("pe_factors")), "pb_factors": factors(ctx.get("pb_factors")),
            "pool": [[k, v] for k, v in (ctx.get("pool") or {}).items()],
            "strong": ctx.get("strong"), "ye_month": ctx.get("ye_month") or {}}


def _unpack(doc: dict) -> dict:
    def factors(f):
        return {"by_month": {(int(y), (int(m) if m is not None else None)): float(v)
                             for y, m, v in (f or {}).get("by_month", [])},
                "by_year": {int(y): float(v) for y, v in (f or {}).get("by_year", [])}}
    return {"pe_factors": factors(doc.get("pe_factors")), "pb_factors": factors(doc.get("pb_factors")),
            "pool": {k: v for k, v in doc.get("pool") or []},
            "strong": doc.get("strong"), "ye_month": doc.get("ye_month") or {}, "week": doc.get("_id")}


def load_week(day: Optional[str] = None) -> Optional[dict]:
    doc = get_db()[_STORE].find_one({"_id": week_key(day)})
    return _unpack(doc) if doc else None


def save_week(ctx: dict, day: Optional[str] = None) -> None:
    """Store the week's copy once (the first one built wins, so every reader
    of the week prices with the same figures)."""
    from datetime import datetime, timezone
    try:
        key = week_key(day)
        get_db()[_STORE].update_one(
            {"_id": key},
            {"$setOnInsert": {**_pack(ctx), "built_at": datetime.now(timezone.utc)}},
            upsert=True)
        ctx["week"] = key
    except Exception:  # noqa: BLE001 — the next caller builds it again
        logger.warning("fair value: could not store the week's context")


def _turnover() -> Optional[dict]:
    try:
        from backend.services.top20_service import compute_momentum_all
        mom = compute_momentum_all()
        return {c: (m.get("med_turnover_30d_mn") if m.get("med_turnover_30d_mn") is not None
                    else m.get("avg_turnover_7d_mn")) for c, m in (mom or {}).items()}
    except Exception:  # noqa: BLE001 — peers are then not filtered on trading
        logger.warning("fair value: trading figures unavailable for peers")
        return None


def build_context(rows: list[dict], fin_by_code: dict[str, list[dict]],
                  months: Optional[dict] = None, turnover: Optional[dict] = None) -> Optional[dict]:
    """The context from score rows and each company's yearly rows (``year``,
    ``pe_ratio_basic``, ``eps`` or ``eps_cont_basic`` / ``eps_basic``,
    ``nav_per_share``)."""
    from backend.services.tiers import tier_key
    from utils.sector import normalize_sector

    months = months or {}
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

    years = [int(y) for fin in fin_by_code.values() for d in fin
             if (y := _f(d.get("year"))) is not None and d.get("provisional") is not True]
    last_year = max(years) if years else None
    pe_pts, pb_pts = [], []
    for code, (month, pe_now, pb_now) in strong.items():
        for d in fin_by_code.get(code) or []:
            y = _f(d.get("year"))
            if y is None or d.get("provisional") is True:
                continue
            year = int(y)
            if last_year and year < last_year - _YEARS_BACK:
                continue
            pe = _f(d.get("pe_ratio_basic"))
            if not pe or pe <= 0:
                continue
            if pe_now:
                pe_pts.append((year, month, pe, pe_now))
            eps = _f(d.get("eps"))
            if eps is None:
                eps = _f(d.get("eps_cont_basic"))
            if eps is None:
                eps = _f(d.get("eps_basic"))
            nav = _f(d.get("nav_per_share"))
            if pb_now and eps and eps > 0 and nav and nav > 0:
                pb_pts.append((year, month, pe * eps / nav, pb_now))

    return {
        "pe_factors": fc.market_factors(pe_pts),
        "pb_factors": fc.market_factors(pb_pts),
        "pool": fc.peer_pool(rows, turnover),
        "strong": len(strong),
        "ye_month": months,
    }


def _build() -> Optional[dict]:
    from backend.services.scoring_service import build_scores_df

    df = build_scores_df()
    if df is None or df.empty:
        return None
    rows = df.to_dict("records")
    codes = [r["trading_code"] for r in rows]
    fin_by_code: dict[str, list[dict]] = {}
    for d in get_db().financials.find(
            {"trading_code": {"$in": codes}},
            {"_id": 0, "trading_code": 1, "year": 1, "pe_ratio_basic": 1,
             "eps_cont_basic": 1, "eps_basic": 1, "nav_per_share": 1}):
        fin_by_code.setdefault(d["trading_code"], []).append(d)
    return build_context(rows, fin_by_code, _year_end_months(), _turnover())


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
