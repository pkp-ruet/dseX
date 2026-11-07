"""
Buy List — the data side of ``buy_list.py`` (the rules).

``build()`` runs the six questions on the recommendation engine's pool
(``recommend_service.pool()`` = questions 2 and 3 already answered), against
the newest stored day before today (``buy_list_snapshots``: who was on the
list, who passed, since when), and adds what each share's case shows: our
buy-under price, the fair-price range, the next results and dividend dates,
its one thing to watch. Cached 900s; cleared with every cache by the scores
refresh.

``store_snapshot()`` writes one row per trading day (unique ``date``) from
compute-scores and scrape-all, after the stock-report and signal snapshots.
No backfill: on the first day question 6 reads the previous signal day's
Buys, and every share's "since" is that day.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from backend.services import buy_list as bl
from backend.services import recommend as rc
from backend.services.db_service import _ttl_cache, get_db
from backend.services.tiers import tier_key

logger = logging.getLogger(__name__)

COLLECTION = "buy_list_snapshots"

_MONTHS = {"q1": 3, "q2": 6, "q3": 9, "annual": 12}


def _today() -> str:
    from utils.market_hours import bst_today_iso
    return bst_today_iso()


def _col():
    return get_db()[COLLECTION]


def _prev_snapshot(before: str) -> Optional[dict]:
    try:
        return _col().find_one({"date": {"$lt": before}}, {"_id": 0}, sort=[("date", -1)])
    except Exception:  # noqa: BLE001 — the list then starts fresh, question 6 on the signal days
        logger.exception("buy list: previous snapshot failed")
        return None


def _week_members(start: str, before: str) -> set[str]:
    """Every code on the list on any stored day from the newest day before
    the week began up to (not including) today."""
    out: set[str] = set()
    try:
        col = _col()
        base = col.find_one({"date": {"$lt": start}}, {"members": 1}, sort=[("date", -1)])
        if base:
            out |= set(base.get("members") or [])
        for d in col.find({"date": {"$gte": start, "$lt": before}}, {"members": 1}):
            out |= set(d.get("members") or [])
    except Exception:  # noqa: BLE001
        logger.exception("buy list: week snapshots failed")
    return out


def _prev_buys(before: str) -> set[str]:
    from backend.services.signal_service import _previous_signals
    return {c for c, s in _previous_signals(before).items() if s.get("signal") == "buy"}


def _score_rows(codes: list[str]) -> dict[str, dict]:
    from backend.services.scoring_service import build_scores_df

    want = set(codes)
    df = build_scores_df()
    if df is None or df.empty or not want:
        return {}
    out = {}
    for r in df.to_dict("records"):
        code = str(r.get("trading_code") or "").upper()
        if code in want:
            out[code] = {k: (None if isinstance(v, float) and v != v else v) for k, v in r.items()}
    return out


def _buy_below(c: dict, row: Optional[dict]) -> Optional[float]:
    """The stock page's buy price: the highest price at which the Buy rule
    still holds, never above the near-the-top line."""
    if not row:
        return None
    try:
        from backend.services.signal_detail import stop_line
        from backend.services.signal_service import NEAR_HIGH_PCT
        from backend.services.stock_report import buy_price_for

        near = stop_line(c.get("hi52"), c.get("lo52"), NEAR_HIGH_PCT)
        return buy_price_for(row, rc._n(c.get("ltp")), near)
    except Exception:  # noqa: BLE001 — the case then shows no buy-under line
        logger.warning("buy list: buy price failed for %s", c.get("code"), exc_info=True)
        return None


def _meetings(codes: set[str]) -> dict[str, dict]:
    """{code: its next results meeting} (the results calendar's 14 days)."""
    if not codes:
        return {}
    try:
        from backend.services.morning_brief_service import results_calendar
        out: dict[str, dict] = {}
        for m in sorted(results_calendar(codes).get("meetings") or [], key=lambda m: m.get("date") or ""):
            out.setdefault(m["code"], m)
        return out
    except Exception:  # noqa: BLE001
        logger.exception("buy list: results calendar failed")
        return {}


def _record_dates(codes: set[str], today: str) -> dict[str, dict]:
    """{code: its next cash record date whose last day to buy hasn't passed}."""
    if not codes:
        return {}
    try:
        from backend.services.corporate_actions_service import build_dividend_calendar
        out: dict[str, dict] = {}
        for e in build_dividend_calendar().get("record_dates") or []:
            code = e.get("trading_code")
            if code in codes and e.get("cash_per_share") and (e.get("buy_by") or "") >= today:
                out.setdefault(code, e)
        return out
    except Exception:  # noqa: BLE001
        logger.exception("buy list: dividend calendar failed")
        return {}


def _next(code: str, meetings: dict, records: dict, today: str) -> list[dict]:
    """The case's "Coming up": results within the calendar's 14 days and the
    last day to buy for a cash dividend, soonest first."""
    out = []
    m = meetings.get(code)
    if m and (m.get("date") or "") >= today:
        exp_en, exp_bn = (m.get("expect_en") or [None])[0], (m.get("expect_bn") or [None])[0]
        out.append({"kind": "results", "date": m["date"], "months": _MONTHS.get(m.get("purpose") or ""),
                    "line": {"en": exp_en, "bn": exp_bn} if exp_en and exp_bn else None})
    r = records.get(code)
    if r:
        out.append({"kind": "record", "date": r["buy_by"], "record_date": r.get("record_date"),
                    "cash_ps": rc._n(r.get("cash_per_share"))})
    return sorted(out, key=lambda x: x["date"])


def _fair(c: dict) -> Optional[dict]:
    fv = c.get("fair_value") or {}
    lo, hi, mid = rc._n(fv.get("low")), rc._n(fv.get("high")), bl.fair_mid(c)
    if lo is None or hi is None or mid is None or lo <= 0 or hi < lo:
        return None
    return {"low": round(lo, 1), "high": round(hi, 1), "mid": round(mid, 1)}


def _ident(c: dict) -> dict:
    return {"code": c["code"], "name": c.get("name"), "sector": c.get("sector"),
            "sector_bn": c.get("sector_bn") or c.get("sector"),
            "group": rc._pt(*rc.group_words(c)), "tier": tier_key(rc._n(c.get("score")))}


def _item(c: dict, rank: int, since: dict, was: set[str], fresh: bool, rows: dict,
          meetings: dict, records: dict, today: str) -> dict:
    m = bl.margin_pct(c)
    return {
        **_ident(c),
        "rank": rank,
        "price": rc._n(c.get("ltp")), "change_pct": rc._n(c.get("change_pct")),
        "price_word": rc.pick_price_word(c),
        "margin_pct": round(m) if m is not None else None,
        "fair": _fair(c),
        "buy_below": _buy_below(c, rows.get(c["code"])),
        "why": bl.why_line(c),
        "profit": bl.profit_chip(c),
        "facts": rc.case_rows(c),
        "watch": c.get("risk") or None,
        "next": _next(c["code"], meetings, records, today),
        "since": since.get(c["code"]),
        "new": fresh and c["code"] not in was,
        "conviction": rc._n(c.get("conviction")),
    }


def _compute() -> tuple[dict, dict]:
    """(the page's payload, the row to store for today)."""
    from backend.services import recommend_service as rs

    p = rs.pool()
    as_of = p.get("as_of") or _today()
    as_of = str(as_of)[:10]
    today = _today()
    cands, facts = p.get("cands") or [], p.get("facts") or {}

    prev = _prev_snapshot(as_of)
    was = set((prev or {}).get("members") or [])
    res = bl.choose(cands, was, (prev or {}).get("passed") if prev else None,
                    () if prev else _prev_buys(as_of))
    members = res["members"]
    codes = [c["code"] for c in members]
    since = bl.since_map(codes, was, (prev or {}).get("since"), as_of)

    # Almost made it: gate passers that missed question 4 or 5, and those
    # that passed for the first time today (question 6).
    passed = set(res["passed"])
    almost_src = []
    for c in cands:
        if c["code"] in passed:
            continue
        q = bl.first_miss(c, c["code"] in was)
        if q in (4, 5):
            almost_src.append((c, q))
    almost_src += [(c, 6) for c in res["unsettled"]]
    almost_src.sort(key=lambda t: bl._order(t[0]))
    almost_src = almost_src[:bl.ALMOST_ROWS]

    need = set(codes) | {c["code"] for c, q in almost_src if q == 5}
    meetings = _meetings(need)
    records = _record_dates(set(codes), today)
    rows = _score_rows(codes)

    items = [_item(c, i + 1, since, was, prev is not None, rows, meetings, records, today)
             for i, c in enumerate(members)]
    almost = []
    for c, q in almost_src:
        row = bl.almost_row(c, q, meetings.get(c["code"]))
        if row:
            almost.append({**_ident(c), **row})
    also = [{**_ident(c), "margin_pct": round(bl.margin_pct(c) or 0), "why": bl.also_line(c)}
            for c in res["also"]]

    # What changed since the last close, and this week.
    by_code = {c["code"]: c for c in cands}
    left = []
    for code in sorted(was - set(codes)):
        c = by_code.get(code)
        f = facts.get(code) or {}
        q = bl.first_miss(c, True) if c else None
        sig = {"en": f.get("reason_en"), "bn": f.get("reason_bn")} if f.get("signal") != "buy" else None
        left.append({"code": code, "name": f.get("name") or code, "reason": bl.left_reason(c, q, sig)})
    start = bl.week_start(as_of)
    week_left = sorted(_week_members(start, as_of) - set(codes))
    week_joined = [c for c in codes if (since.get(c) or "") >= start]

    payload = {
        "as_of": as_of,
        "universe": (p.get("funnel") or {}).get("rated") or len(facts),
        "count": len(items),
        "items": items,
        "also": also,
        "almost": almost,
        "changes": {
            "first_day": prev is None,
            "joined": [c for c in codes if c not in was] if prev else [],
            "left": left if prev else [],
            "week_joined": week_joined if prev else [],
            "week_left": [{"code": c, "name": (facts.get(c) or {}).get("name") or c} for c in week_left],
        },
        "free_pick": bl.free_pick(codes, as_of),
        "rules": {
            "margin_pct": bl.MARGIN_JOIN_PCT, "profit_pct": abs(bl.PROFIT_JOIN_PCT),
            "sector_cap": bl.SECTOR_CAP, "financial_cap": bl.FINANCIAL_CAP, "max_rows": bl.MAX_ROWS,
        },
    }
    state = {"date": as_of, "members": codes, "passed": res["passed"], "since": since,
             "also": [c["code"] for c in res["also"]]}
    return payload, state


@_ttl_cache(900, max_entries=2)
def build() -> dict:
    return _compute()[0]


_HOME_FIELDS = ("rank", "code", "name", "sector", "sector_bn", "price", "change_pct", "margin_pct",
                "group", "price_word", "why", "new")


def home_summary() -> dict:
    """The dashboard's Buy List card (2026-11-08): the count, the top three,
    today's free pick (the page's free example) and how many joined this
    week. Every name ships to every reader; the card hides them for a free
    reader (screen-only, like every lock)."""
    d = build()
    items = d.get("items") or []

    def slim(it: Optional[dict]) -> Optional[dict]:
        return {k: it.get(k) for k in _HOME_FIELDS} if it else None

    free = next((i for i in items if i["code"] == d.get("free_pick")), None)
    return {
        "as_of": d.get("as_of"),
        "count": d.get("count") or 0,
        "universe": d.get("universe") or 0,
        "week_joined": len((d.get("changes") or {}).get("week_joined") or []),
        "top": [slim(i) for i in items[:3]],
        "free_pick": slim(free),
        "almost": len(d.get("almost") or []),
    }


def store_snapshot() -> dict:
    """Upsert today's list (members in order, every code that passed 1–5,
    since dates). Idempotent per day."""
    _payload, state = _compute()
    col = _col()
    col.create_index("date", unique=True)
    col.update_one({"date": state["date"]},
                   {"$set": {**state, "created_at": datetime.now(timezone.utc)}}, upsert=True)
    return {"date": state["date"], "members": len(state["members"]), "passed": len(state["passed"])}
