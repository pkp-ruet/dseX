"""`GET /api/signals/today` — the buy signals page in one request (2026-10-31).
Rules live in `signal_today.py` (pure); this module reads what they need.

Cached 900s like `signal_details`; both are cleared with every other cache
after a scrape. Every piece is guarded: a failure degrades to an empty value,
never a 500, because the page's primary data (`/api/scores`) is separate.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta

from backend.services.db_service import _ttl_cache
from backend.services import signal_today as st

log = logging.getLogger(__name__)


def _prev_snapshot(as_of: str | None) -> tuple[str | None, dict[str, str]]:
    """(day, {code: signal}) — the newest `signal_snapshots` day before today's
    trading day (the snapshot for today itself, when written, is skipped)."""
    from backend.services.db_service import get_db

    col = get_db()["signal_snapshots"]
    q = {"date": {"$lt": as_of}} if as_of else {}
    top = col.find_one(q, {"date": 1}, sort=[("date", -1)])
    if not top:
        return None, {}
    day = str(top["date"])[:10]
    rows = col.find({"date": top["date"]}, {"_id": 0, "trading_code": 1, "signal": 1})
    return day, {str(r["trading_code"]).upper(): r.get("signal") for r in rows if r.get("trading_code")}


def _report_rows(codes: list[str]) -> dict[str, dict]:
    """{code: newest report snapshot in 10 days} — buy price + red lines."""
    from backend.services.db_service import get_db

    if not codes:
        return {}
    since = (datetime.utcnow() - timedelta(days=10)).strftime("%Y-%m-%d")
    out: dict[str, dict] = {}
    for d in get_db()["stock_report_snapshots"].find(
        {"trading_code": {"$in": codes}, "date": {"$gte": since}},
        {"_id": 0, "trading_code": 1, "date": 1, "buy_below": 1, "red_lines": 1},
    ).sort("date", -1):
        out.setdefault(d["trading_code"], d)
    return out


@_ttl_cache(900)
def signals_today() -> dict:
    """{as_of, funnel, changes, buys: {CODE: {...}}, almost: [...]} — see
    frontend `lib/api.ts` `SignalsToday` for the exact shape."""
    from backend.services.db_service import load_52w_ranges
    from backend.services.dividend_safety import dividend_safety
    from backend.services.scoring_service import build_scores_df
    from backend.services.signal_detail import signal_details, stop_line
    from backend.services.signal_service import NEAR_HIGH_PCT, build_signals
    from backend.services.top20_service import _market_window_raw, compute_momentum_all
    from utils.sector import normalize_sector

    signals = build_signals() or {}
    try:
        as_of = str(_market_window_raw().get("as_of_date") or "")[:10] or None
    except Exception:  # noqa: BLE001
        as_of = None

    out: dict = {"as_of": as_of, "funnel": st.funnel(signals), "changes": None, "buys": {}, "almost": []}

    try:
        prev_day, prev = _prev_snapshot(as_of)
        out["changes"] = st.changes(signals, prev, prev_day)
    except Exception:  # noqa: BLE001
        log.exception("signals_today: changes failed")

    df = build_scores_df()
    rows = {str(r["trading_code"]).upper(): r for r in df.to_dict("records")} if df is not None and not df.empty else {}
    try:
        momentum = compute_momentum_all()
    except Exception:  # noqa: BLE001
        momentum = {}
    try:
        detail = (signal_details() or {}).get("items") or {}
    except Exception:  # noqa: BLE001
        log.exception("signals_today: detail failed")
        detail = {}

    for code, sig in signals.items():
        if (sig or {}).get("signal") != "buy":
            continue
        row = rows.get(code) or {}
        sc = normalize_sector(row.get("sector") or "")
        try:
            facts = st.why_facts(row, sig, sc, dividend_safety(row, sc))
        except Exception:  # noqa: BLE001
            log.exception("signals_today: why failed for %s", code)
            facts = []
        rng = (momentum.get(code) or {}).get("pct_in_52w_range")
        out["buys"][code] = {
            "price_word": st.price_word(sig),
            "range_pct": round(float(rng), 1) if rng is not None else None,
            "why": facts,
            **(detail.get(code) or {}),
        }

    try:
        good = [c for c, s in signals.items() if st._good(s) and s.get("signal") != "buy"]
        reports = _report_rows(good)
        ranges = load_52w_ranges()
        almost = []
        for c in good:
            rng = ranges.get(c) or {}
            rep = reports.get(c) or {}
            sig = signals[c]
            red = None
            if st.group_key(sig.get("reason_key")) == "red_flag":
                lines = rep.get("red_lines") or {}
                red = next(iter(lines.values()), None) if lines else None
            almost.append(st.almost_row(
                c, sig, rows.get(c) or {}, (rows.get(c) or {}).get("ltp"),
                rep.get("buy_below"), stop_line(rng.get("hi"), rng.get("lo"), NEAR_HIGH_PCT), red,
            ))
        out["almost"] = st.sort_almost(almost)
    except Exception:  # noqa: BLE001
        log.exception("signals_today: almost failed")

    return out
