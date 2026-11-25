"""`GET /api/home/today` — the home's daily public part (rules in
`home_today.py`). One answer for every reader, cached 15 minutes; every
source is already cached by its own page (the dividend calendar, the results
calendar, /results, the ranking, the Buy List), so a warm build is cheap.
Each part is guarded: a failing source leaves that part None."""
from __future__ import annotations

import logging
from datetime import date
from typing import Callable, Optional, TypeVar

from backend.services import home_today as ht
from backend.services.db_service import _ttl_cache

log = logging.getLogger(__name__)
T = TypeVar("T")


def _safe(label: str, fn: Callable[[], T]) -> Optional[T]:
    try:
        return fn()
    except Exception:  # noqa: BLE001 — one failing part must not blank the rest
        log.warning("home today: %s failed", label, exc_info=True)
        return None


def _today() -> date:
    from utils.market_hours import bst_today_iso

    return date.fromisoformat(bst_today_iso())


def _record_dates() -> list[dict]:
    from backend.services.corporate_actions_service import build_dividend_calendar

    return build_dividend_calendar().get("record_dates") or []


def _meetings(today: date) -> tuple[list[dict], dict]:
    from backend.services import morning_brief_service as mbs

    return mbs._meetings(today.isoformat())


def _score_rows() -> list[dict]:
    from backend.services.db_service import load_companies
    from backend.services.scoring_service import build_scores_df

    df = build_scores_df()
    if df is None or df.empty or "score" not in df.columns:
        return []
    rows = df[df["score"].notna()][["trading_code", "score"]].to_dict("records")
    try:
        names = {c.get("trading_code"): c.get("company_name") for c in load_companies() or []}
    except Exception:  # noqa: BLE001 — codes stand in for names
        names = {}
    for r in rows:
        r["company_name"] = names.get(r["trading_code"])
    return rows


def _moves() -> Optional[dict]:
    from backend.services.rank_today_service import week_rank_moves

    return week_rank_moves()


def _results_rows() -> list[dict]:
    from backend.services.results_explainer import all_results

    return all_results()


def _buy_summary() -> Optional[dict]:
    from backend.services.buy_list_service import home_summary

    return home_summary()


@_ttl_cache(900, max_entries=2)
def home_today() -> dict:
    from backend.services.morning_brief import label

    today = _today()
    record_dates = _safe("record dates", _record_dates)
    met = _safe("results meetings", lambda: _meetings(today))
    meetings, names = (met if met else (None, {}))
    return ht.build(
        today,
        record_dates=record_dates,
        meetings=meetings,
        names=names,
        label_of=label,
        results_rows=_safe("results", _results_rows),
        score_rows=_safe("ranking", _score_rows),
        moves=_safe("rank moves", _moves),
        buy_summary=_safe("buy list", _buy_summary),
    )
