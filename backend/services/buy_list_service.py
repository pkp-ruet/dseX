"""
Buy List — the data side of ``buy_list.py`` (the rules).

``build()`` runs the five questions on the recommendation engine's pool
(``recommend_service.pool()`` = questions 2 and 3 already answered), against
the newest stored day before today (``buy_list_snapshots``: who was on the
list, who passed, who is on grace, since when), and adds what each share's
case shows: the price it would join under, our fair price, the next results
and dividend dates, its one thing to watch. Cached 900s; cleared with every
cache by the scores refresh.

While DSE is trading (today's prices are in but the official close isn't),
``build()`` serves the list stored at the last close with today's prices
laid over it (2026-11-18): the page says "checked after the close", and the
list was being re-worked every 15 minutes on half-day prices.

``store_snapshot()`` writes one row per trading day (unique ``date``) from
compute-scores and scrape-all, after the stock-report and signal snapshots,
with the page's payload. No backfill: on the first day question 5 reads the
previous signal day's Buys, and every share's "since" is that day.
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

# Today counts as "still trading" until this many shares traded and this
# share of them carry DSE's official close (main._close_is_final's lines).
CLOSE_MIN_TRADED = 200
CLOSE_MIN_SHARE = 0.9


def _today() -> str:
    from utils.market_hours import bst_today_iso
    return bst_today_iso()


def _col():
    return get_db()[COLLECTION]


def _prev_snapshot(before: str) -> Optional[dict]:
    try:
        return _col().find_one({"date": {"$lt": before}}, {"_id": 0, "payload": 0}, sort=[("date", -1)])
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


def _signal_buy_price(c: dict, row: Optional[dict]) -> Optional[float]:
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
    except Exception:  # noqa: BLE001 — no buy price then
        logger.warning("buy list: buy price failed for %s", c.get("code"), exc_info=True)
        return None


def _add_cash_years(cands: list[dict]) -> None:
    """Each bank's / finance company's last ``BANK_CASH_YEARS`` years of cash
    dividends ([[year, cash %], …], the years we have a record of), on the
    candidate (question 3)."""
    lenders = [c for c in cands if (c.get("sector_class") or "") in bl._LENDERS]
    if not lenders:
        return
    try:
        from backend.services.research_reports_service import _dividend_years
        years = _dividend_years()
    except Exception:  # noqa: BLE001 — unknown years never count against a share
        logger.exception("buy list: dividend years failed")
        return
    for c in lenders:
        last = rc._n(c.get("last_reported_year"))
        recs = years.get(c["code"]) or {}
        if last is None or not recs:
            continue
        span = range(int(last), int(last) - bl.BANK_CASH_YEARS, -1)
        c["cash_years"] = [[y, (recs[y] or {}).get("cash_pct")] for y in span if y in recs]


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
    """Our fair price as the case's range (the stock page's figure)."""
    f = bl.fair_price(c)
    if not f:
        return None
    from backend.services.fair_context import confidence_words
    fv = c.get("fair_value") or {}
    out = {"low": bl.round_price(f["low"]), "high": bl.round_price(f["high"]), "mid": bl.round_price(f["mid"])}
    sure = confidence_words(fv.get("confidence"), fv.get("confidence_why"))
    if sure:
        out["sure"] = sure
    return out


def _leave_price(row: Optional[dict]) -> Optional[float]:
    """The price over which the Buy signal, and so the list, lets it go."""
    if not row:
        return None
    try:
        from backend.services.stock_report import leave_price_for
        return leave_price_for(row)
    except Exception:  # noqa: BLE001
        return None


def _ident(c: dict) -> dict:
    return {"code": c["code"], "name": c.get("name"), "sector": c.get("sector"),
            "sector_bn": c.get("sector_bn") or c.get("sector"),
            "group": rc._pt(*rc.group_words(c)), "tier": tier_key(rc._n(c.get("score")))}


def _watch(c: dict) -> Optional[dict]:
    """Its one thing to watch: the stock report's first, unless its dividend
    isn't "Looks steady" — an "At risk" dividend always leads, a "Worth a
    check" one fills an empty spot."""
    watch = c.get("risk") or None
    dw = bl.dividend_watch(c)
    if dw and (dw["level"] == "red" or not watch):
        more = ((watch.get("more") or 0) + 1) if watch else 0
        watch = {"en": dw["en"], "bn": dw["bn"], "level": dw["level"], "more": more, "key": "dividend"}
    if not watch:
        # Nothing else to watch: say so when it trades slowly (2026-11-22, the
        # floor came down to ৳15 lakh a day, so a few on the list trade little).
        t = bl.trading_mn(c)
        if t is not None and t < bl.TRADE_SLOW_MN:
            return {"en": f"It trades slowly: about {bl._lakh(t)} a day. Buying or selling a lot of it can take a few days.",
                    "bn": f"এর লেনদেন ধীর: দিনে প্রায় {bl._lakh_bn(t)}র। বেশি পরিমাণে কেনা বা বেচায় কয়েক দিন লাগতে পারে।",
                    "level": "note", "more": 0,
                    "short": {"en": "Trades slowly", "bn": "লেনদেন ধীর"}}
        return None
    # The row's tag names it (2026-11-22); a smaller auditor note is quiet.
    label = bl.watch_label(watch.get("key"), watch.get("level"))
    out = {k: v for k, v in watch.items() if k != "key"}
    if label:
        out["short"] = {"en": label["en"], "bn": label["bn"]}
        out["level"] = label["level"]
    return out


def _item(c: dict, rank: int, since: dict, was: set[str], fresh: bool, rows: dict,
          meetings: dict, records: dict, today: str) -> dict:
    m = bl.margin_pct(c)
    px = rc._n(c.get("ltp"))
    row = rows.get(c["code"])
    buy = bl.join_price(c, _signal_buy_price(c, row))
    trade = bl.trading_mn(c)
    return {
        **_ident(c),
        "rank": rank,
        "price": px, "change_pct": rc._n(c.get("change_pct")),
        "price_word": rc.pick_price_word(c),
        "margin_pct": round(m) if m is not None else None,
        "fair": _fair(c),
        "buy_below": buy,
        # On the list by its staying lines, but above the price it would join at.
        "held": bool(buy and px and px > buy),
        # The price over which it leaves (the Buy signal's leave line).
        "leave_above": _leave_price(row),
        "grace": bl.grace_line(c.get("grace")),
        "trading_mn": round(trade, 1) if trade is not None else None,
        "why": bl.why_line(c),
        "why_short": bl.why_short(c),
        "profit": bl.profit_chip(c),
        "facts": rc.case_rows(c),
        "watch": _watch(c),
        "next": _next(c["code"], meetings, records, today),
        "since": since.get(c["code"]),
        "new": fresh and c["code"] not in was,
        "conviction": rc._n(c.get("conviction")),
    }


_ALMOST_KEYS = {"trading", "profit", "quarter"}
# Strong companies outside the engine's pool that miss only on the Buy
# signal's price or profit line: the "Close, not yet" rows for questions 2 / 4.
_ALMOST_SIGNAL = {"good_wait_price": 2, "profit_slipping": 4}
# A price row shows only when the joining price is within this much of today's.
ALMOST_PRICE_PCT = 10.0


def _outside_almost(pool_codes: set[str]) -> list[tuple[dict, int, Optional[str]]]:
    """Strong companies held off the list only by the price (question 2) or
    the profit check (question 4), with the price that brings them in."""
    from backend.services import recommend_service as rs
    from backend.services.signal_service import build_signals
    from backend.services.signal_today import entry_price

    try:
        sigs = build_signals()
    except Exception:  # noqa: BLE001
        logger.exception("buy list: signals failed")
        return []
    want = [code for code, sg in sigs.items()
            if code not in pool_codes and sg.get("tier") in ("good", "excellent")
            and sg.get("reason_key") in _ALMOST_SIGNAL]
    if not want:
        return []
    try:
        cands = rs.candidates(want)
    except Exception:  # noqa: BLE001
        logger.exception("buy list: almost candidates failed")
        return []
    rows = _score_rows(list(cands))
    out = []
    for code, c in cands.items():
        if (c.get("failed") or []) != ["buy"] or not bl.strong_today(c) or not bl.trading_ok(c):
            continue
        q = _ALMOST_SIGNAL[sigs[code]["reason_key"]]
        if q == 2:
            line, px = entry_price(rows.get(code) or {}, sigs[code].get("tier")), rc._n(c.get("ltp"))
            if not line or not px or line >= px or (px - line) / px * 100 > ALMOST_PRICE_PCT:
                continue
            c = {**c, "entry_price": line}
            out.append((c, 2, None))
        else:
            out.append((c, 4, "quarter" if bl.quarter_change(c) is not None
                         and not bl.quarter_ok(c) and bl.profit_ok(c) else "profit"))
    return out


def _compute() -> tuple[dict, dict]:
    """(the page's payload, the row to store for today)."""
    from backend.services import recommend_service as rs

    p = rs.pool()
    as_of = p.get("as_of") or _today()
    as_of = str(as_of)[:10]
    today = _today()
    # Copies: the pool is a shared cache, and the list adds its own fields.
    cands = [dict(c) for c in p.get("cands") or []]
    facts = p.get("facts") or {}

    prev = _prev_snapshot(as_of)
    was = set((prev or {}).get("members") or [])
    prev_grace = set((prev or {}).get("grace") or [])

    # Yesterday's members that left the engine's pool: one that only lost its
    # Buy on the price or trading gets a second close (``soft_fail``); the
    # rest are kept for the line that says why they left.
    pool_codes = {c["code"] for c in cands}
    outside: dict[str, dict] = {}
    missing = sorted(was - pool_codes)
    if missing:
        try:
            outside = rs.candidates(missing)
        except Exception:  # noqa: BLE001 — they then just leave, as before
            logger.exception("buy list: members outside the pool failed")
    for code, c in outside.items():
        if bl.soft_signal_miss(c.get("failed") or [], c.get("reason_key")):
            cands.append({**c, "soft_fail": True})
    _add_cash_years(cands)

    res = bl.choose(cands, was, (prev or {}).get("passed") if prev else None,
                    () if prev else _prev_buys(as_of), prev_grace)
    members = res["members"]
    codes = [c["code"] for c in members]
    since = bl.since_map(codes, was, (prev or {}).get("since"), as_of)

    # Almost made it: gate passers (not on the list) that missed exactly one
    # part of questions 3–5, and those that passed for the first time today
    # (question 6).
    passed = set(res["passed"]) | set(codes)
    almost_src = []
    for c in cands:
        if c["code"] in passed or c.get("soft_fail"):
            continue
        keys = bl.miss_keys(c, c["code"] in was)
        if len(keys) == 1 and keys[0] in _ALMOST_KEYS:
            almost_src.append((c, bl.MISS_QUESTION[keys[0]], keys[0]))
    almost_src += [(c, bl.TWO_CLOSES_Q, None) for c in res["unsettled"]]
    almost_src += _outside_almost(pool_codes)
    almost_src.sort(key=lambda t: bl._order(t[0]))
    almost_src = almost_src[:bl.ALMOST_ROWS]

    need = set(codes) | {c["code"] for c, q, _k in almost_src if q == 4}
    meetings = _meetings(need)
    records = _record_dates(set(codes), today)
    rows = _score_rows(codes)

    items = [_item(c, i + 1, since, was, prev is not None, rows, meetings, records, today)
             for i, c in enumerate(members)]
    almost = []
    for c, q, key in almost_src:
        row = bl.almost_row(c, q, meetings.get(c["code"]), key)
        if row:
            almost.append({**_ident(c), **row})
    also = [{**_ident(c), "margin_pct": round(bl.margin_pct(c) or 0), "why": bl.also_line(c)}
            for c in res["also"]]

    # What changed since the last close, and this week.
    by_code = {c["code"]: c for c in cands}
    left = []
    for code in sorted(was - set(codes)):
        f = facts.get(code) or {}
        sig = {"en": f.get("reason_en"), "bn": f.get("reason_bn")} if f.get("signal") != "buy" else None
        if code not in by_code and code in outside:
            # Left the engine's pool on a warning, a loss, loans, the grade …
            o = outside[code]
            sig = {"en": o.get("reason_en"), "bn": o.get("reason_bn")} if "buy" in (o.get("failed") or []) else None
            reason = bl.left_reason(None, None, sig, [k for k in o.get("failed") or [] if k != "buy"])
        else:
            c = by_code.get(code)
            keys = bl.miss_keys(c, True) if c else []
            key = keys[0] if keys else None
            if c is not None and c.get("soft_fail"):
                sig = {"en": c.get("reason_en"), "bn": c.get("reason_bn")}
            reason = bl.left_reason(c, key, sig, None, second=code in prev_grace and key in bl.SOFT_MISSES)
        left.append({"code": code, "name": f.get("name") or code, "reason": reason})
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
            "profit_pct": abs(bl.PROFIT_JOIN_PCT),
            "quarter_pct": abs(bl.QUARTER_JOIN_PCT), "trade_lakh": round(bl.TRADE_JOIN_MN * 10),
            "bank_years": bl.BANK_CASH_YEARS,
            "sector_cap": bl.SECTOR_CAP, "financial_cap": bl.FINANCIAL_CAP, "max_rows": bl.MAX_ROWS,
        },
    }
    state = {"date": as_of, "members": codes, "passed": res["passed"], "since": since,
             "also": [c["code"] for c in res["also"]], "grace": res["grace"]}
    return payload, state


# ---------------------------------------------------------------------------
# While DSE is trading: the list from the last close, today's prices
# ---------------------------------------------------------------------------

def close_pending(prices: dict, today: str) -> bool:
    """True while today's prices are in but DSE's official close isn't (the
    after-close jobs' own test, ``main._close_is_final``). False on a day
    with no prices for today (a holiday, the evening before a trading day).
    Pure."""
    traded = [p for p in prices.values()
              if str(p.get("date") or "")[:10] == today and (p.get("ltp") or 0) > 0]
    if not traded:
        return False
    closed = sum(1 for p in traded if (p.get("close_price") or 0) > 0)
    return not (len(traded) >= CLOSE_MIN_TRADED and closed >= CLOSE_MIN_SHARE * len(traded))


def with_prices(payload: dict, prices: dict) -> dict:
    """The stored payload with each share's price, today's move, the gap to
    our fair price and "held" brought up to the latest prices. Pure."""
    for it in payload.get("items") or []:
        p = prices.get(it.get("code")) or {}
        px = rc._n(p.get("ltp"))
        if not px or px <= 0:
            continue
        it["price"], it["change_pct"] = px, rc._n(p.get("change_pct"))
        mid = rc._n((it.get("fair") or {}).get("mid"))
        if mid and mid > 0:
            it["margin_pct"] = round((1 - px / mid) * 100)
        buy = rc._n(it.get("buy_below"))
        it["held"] = bool(buy and px > buy)
    payload["live_prices"] = True
    return payload


def _stored_while_trading() -> Optional[dict]:
    from backend.services.db_service import load_latest_prices

    try:
        prices = load_latest_prices()
        today = _today()
        if not close_pending(prices, today):
            return None
        snap = _col().find_one({"date": {"$lt": today}, "payload": {"$exists": True}},
                               {"_id": 0, "payload": 1}, sort=[("date", -1)])
    except Exception:  # noqa: BLE001 — then the list is worked out as before
        logger.exception("buy list: stored list failed")
        return None
    if not snap or not snap.get("payload"):
        return None
    return with_prices(snap["payload"], prices)


@_ttl_cache(900, max_entries=2)
def build() -> dict:
    return _stored_while_trading() or _compute()[0]


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
    who is on grace, since dates, and the page's payload, which the page
    serves while the next day is trading). Idempotent per day."""
    payload, state = _compute()
    col = _col()
    col.create_index("date", unique=True)
    col.update_one({"date": state["date"]},
                   {"$set": {**state, "payload": payload, "created_at": datetime.now(timezone.utc)}}, upsert=True)
    return {"date": state["date"], "members": len(state["members"]), "passed": len(state["passed"]),
            "grace": len(state["grace"])}
