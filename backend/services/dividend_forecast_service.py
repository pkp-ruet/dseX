"""Loaders for the dividend calendar's Premium parts (rules in
`dividend_forecast.py`).

- `build_forecast()` (cached 900s): "Coming next" — every scored company that
  paid cash for its last fiscal year and has not declared for the next one,
  with when we expect it and how much.
- `captures(events, today)`: "Worth buying for the dividend?" for the upcoming
  cash record dates — one `stock_prices` read per company around its past
  record dates in the ledger.

Both are read by `corporate_actions_service.build_dividend_calendar`.
"""
from __future__ import annotations

import logging
import math
from datetime import date, datetime, timedelta
from typing import Any, Optional

from backend.services import dividend_forecast as df_rules
from backend.services.db_service import (
    _ttl_cache,
    get_db,
    load_companies,
    load_dividend_history,
    use_official_close,
)

log = logging.getLogger("dividend_forecast")

DEFAULT_FACE_VALUE = 10.0
# A yearly board meeting this far ahead pins the expected date.
MEETING_DAYS = 45
# Closes read on each side of a past record date.
PRICE_PAD_DAYS = 12


def _d(v: Any) -> Optional[date]:
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    try:
        return date.fromisoformat(str(v)[:10])
    except ValueError:
        return None


def _f(v: Any) -> Optional[float]:
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(f) else f


def _cash_pct(decl: dict) -> float:
    v = _f(decl.get("declared_total_cash_pct"))
    if v is None:
        v = _f(decl.get("cash_pct"))
    if v is None:
        v = _f(decl.get("dividend_pct"))
    return v or 0.0


def _faces() -> dict[str, float]:
    return {c["trading_code"]: (_f(c.get("face_value")) or DEFAULT_FACE_VALUE) for c in load_companies()}


def _yearly_meetings(today: date) -> dict[str, date]:
    """{code: date} of a yearly-results board meeting DSE has posted."""
    try:
        from backend.services import morning_brief as mb
        from backend.services.morning_brief_service import _meetings_by_code

        out: dict[str, date] = {}
        for m in mb.scheduled_meetings(_meetings_by_code(today), today, MEETING_DAYS):
            if m.get("purpose") == "annual" and m["code"] not in out:
                out[m["code"]] = m["date"]
        return out
    except Exception:  # noqa: BLE001 — the forecast works without meetings
        log.warning("board meetings failed", exc_info=True)
        return {}


def _score_rows() -> dict[str, dict]:
    from backend.services.scoring_service import build_scores_df

    df = build_scores_df()
    if df is None or df.empty:
        return {}
    keep = ["trading_code", "company_name", "eps", "eps_basis", "fy_eps", "fy_eps_year",
            "interim_period_end", "div_latest_fy"]
    cols = [c for c in keep if c in df.columns]
    return {r["trading_code"]: r for r in df[cols].to_dict("records")}


def _dhaka_today() -> date:
    from backend.services.corporate_actions_service import _today_dhaka

    return _today_dhaka()


@_ttl_cache(900, max_entries=2)
def build_forecast() -> list[dict]:
    today = _dhaka_today()
    rows = _score_rows()
    if not rows:
        return []
    faces = _faces()
    meetings = _yearly_meetings(today)

    by_code: dict[str, list[dict]] = {}
    for d in load_dividend_history():
        c = (d.get("trading_code") or "").upper()
        if c:
            by_code.setdefault(c, []).append(d)

    out = []
    for code, decls in by_code.items():
        row = rows.get(code)
        if row is None:
            continue
        finals = [d for d in decls if (d.get("dividend_type") or "Final") != "Interim" and _d(d.get("period_end"))]
        if not finals:
            continue
        last = max(finals, key=lambda d: (_d(d["period_end"]), _d(d.get("declaration_date")) or date.min))
        pe = _d(last["period_end"])
        # Anything posted for a later year — a declaration, a "no dividend",
        # an interim — means this year is no longer a guess.
        if any((_d(d.get("period_end")) or date.min) > pe for d in decls):
            continue
        # The year's results already out (the dividend notice adds a
        # provisional year) or a dividend in the audited table for a later year.
        fy_year = _f(row.get("fy_eps_year"))
        div_fy = _f(row.get("div_latest_fy"))
        if (fy_year and fy_year > pe.year) or (div_fy and div_fy > pe.year):
            continue
        cash_pct = _cash_pct(last)
        if cash_pct <= 0:
            continue
        # The next fiscal year must be over before its dividend can come.
        if df_rules.one_year_on(pe) > today + timedelta(days=df_rules.AHEAD_DAYS):
            continue

        base_eps = _f(row.get("fy_eps")) if fy_year and int(fy_year) == pe.year else None
        now_eps = None
        ip = _d(row.get("interim_period_end"))
        if row.get("eps_basis") == "ttm" and ip and ip > pe:
            now_eps = _f(row.get("eps"))
        try:
            item = df_rules.forecast_row(
                code=code, name=row.get("company_name"),
                last={"declaration_date": _d(last.get("declaration_date")),
                      "record_date": _d(last.get("record_date")),
                      "cash_pct": cash_pct, "stock_pct": _f(last.get("stock_pct"))},
                face_value=faces.get(code, DEFAULT_FACE_VALUE),
                base_eps=base_eps, now_eps=now_eps, now_months=12,
                meeting=meetings.get(code), today=today,
            )
        except Exception:  # noqa: BLE001 — one company never drops the list
            log.warning("forecast failed for %s", code, exc_info=True)
            continue
        if item:
            item["period_end"] = pe.isoformat()
            item["next_period_end"] = df_rules.one_year_on(pe).isoformat()
            out.append(item)
    return df_rules.sort_forecast(out)


def captures(events: list[dict], today: date) -> dict[str, dict]:
    """{code: capture} for the upcoming cash record dates in `events`."""
    want = {e["trading_code"]: e for e in events if (e.get("cash_per_share") or 0) > 0}
    if not want:
        return {}
    faces = _faces()
    past: dict[str, list[dict]] = {}
    iso_today = today.isoformat()
    for d in load_dividend_history():
        c = (d.get("trading_code") or "").upper()
        rd = _d(d.get("record_date"))
        if c not in want or rd is None or rd.isoformat() >= iso_today:
            continue
        # What was paid on that record date (an "including interim" final is
        # stored as the remainder), so not the year's total.
        cash = (_f(d.get("cash_pct")) or 0.0) / 100.0 * faces.get(c, DEFAULT_FACE_VALUE)
        if cash > 0:
            past.setdefault(c, []).append({"record_date": rd.isoformat(), "cash": cash})

    prices = get_db().stock_prices
    out: dict[str, dict] = {}
    for code, evs in past.items():
        evs = sorted({e["record_date"]: e for e in evs}.values(), key=lambda e: e["record_date"],
                     reverse=True)[:df_rules.CAPTURE_EVENTS]
        lo = (date.fromisoformat(evs[-1]["record_date"]) - timedelta(days=PRICE_PAD_DAYS)).isoformat()
        hi = (date.fromisoformat(evs[0]["record_date"]) + timedelta(days=PRICE_PAD_DAYS)).isoformat()
        closes = []
        for doc in prices.find({"trading_code": code, "date": {"$gte": lo, "$lte": hi}},
                               {"_id": 0, "date": 1, "ltp": 1, "close_price": 1, "ycp": 1}):
            doc = use_official_close(doc)
            v = _f(doc.get("ltp"))
            if v and v > 0:
                closes.append((str(doc["date"])[:10], v))
        for e in evs:
            mv = df_rules.price_move(closes, e["record_date"])
            if mv:
                e["before"], e["after"] = mv
        ev = want[code]
        try:
            cap = df_rules.capture(evs, ev["cash_per_share"], ev.get("ltp"))
        except Exception:  # noqa: BLE001
            log.warning("capture failed for %s", code, exc_info=True)
            cap = None
        if cap:
            out[code] = cap
    return out
