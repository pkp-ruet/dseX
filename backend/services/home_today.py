"""The home's daily public part (2026-11-25, the fuller home plan
https://claude.ai/artifact/RX71QgzkFto62nrNpZWZjm, "Build all five"): the
same answer for every reader, so it is cached once and the browser marks the
reader's own shares. Pure: `home_today_service` reads the data.

  days      the next five DSE trading days (Sun–Thu, holidays not modelled),
            each with its dividend record dates and results meetings. Only
            dividend-paying record dates inside the dividend calendar's free
            week (THE Premium line: `dividend_calendar` = `week` 7), so the
            home never shows what the calendar keeps Premium. AGMs are left
            out for the same reason (the calendar's AGM tab is Premium).
  results   reports posted in the last 7 days, counted by the /results levels,
            with their codes so the browser can count the reader's own.
  ranking   the ranking's top three (highest score first, ties by code — the
            ranking page's and the rank history's order) and the companies
            in the top 50 that climbed most this week.
  buy_list  the Buy List's count, joined this week, top three and today's
            free share (`buy_list_service.home_summary`).
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Iterable, Optional

# Python weekday(): Mon 0 … Fri 4, Sat 5, Sun 6. DSE trades Sun–Thu.
TRADING_WEEKDAYS = {6, 0, 1, 2, 3}
STRIP_DAYS = 5
# The dividend calendar's free week (premium_line AREAS["dividend_calendar"]).
FREE_WEEK_DAYS = 7
RESULTS_DAYS = 7
LEVELS = ("good", "watch", "bad", "neutral")
TOP_N = 3
CLIMB_WITHIN = 50
CLIMBERS = 2


def trading_days(today: date, n: int = STRIP_DAYS) -> list[date]:
    """Today (when DSE trades today) and the trading days after it, `n` in all."""
    out: list[date] = []
    d = today
    while len(out) < n:
        if d.weekday() in TRADING_WEEKDAYS:
            out.append(d)
        d += timedelta(days=1)
    return out


def _iso(v) -> Optional[str]:
    if v is None:
        return None
    if isinstance(v, date):
        return v.isoformat()
    s = str(v)[:10]
    return s if len(s) == 10 else None


def _num(v) -> Optional[float]:
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return f if f == f else None


def dividend_item(e: dict) -> Optional[dict]:
    """One record date as the strip shows it; None for a no-dividend notice."""
    cash = _num(e.get("cash_per_share")) or 0.0
    stock = _num(e.get("stock_pct")) or 0.0
    if e.get("is_no_dividend") or (cash <= 0 and stock <= 0):
        return None
    code = e.get("trading_code")
    rd = _iso(e.get("record_date"))
    if not code or not rd:
        return None
    return {
        "kind": "dividend",
        "code": code,
        "name": e.get("company_name") or code,
        "cash_ps": round(cash, 2) if cash > 0 else None,
        "stock_pct": stock if stock > 0 else None,
        "yield_pct": _num(e.get("yield_pct")),
        "type": e.get("dividend_type"),
        "buy_by": _iso(e.get("buy_by")),
    }


def meeting_item(m: dict, name: Optional[str], label: tuple[str, str]) -> dict:
    return {
        "kind": "results",
        "code": m["code"],
        "name": name or m["code"],
        "purpose": m.get("purpose"),
        "label_en": label[0],
        "label_bn": label[1],
    }


def week_strip(today: date, record_dates: Iterable[dict], meetings: Iterable[dict],
               names: dict, label_of) -> list[dict]:
    """[{date, items}] for the next five trading days. Dividends first (most
    cash a share first), then results meetings (A to Z). A company appears
    once a day per kind."""
    days = trading_days(today)
    last_free = today + timedelta(days=FREE_WEEK_DAYS)
    by_day: dict[str, dict[str, list[dict]]] = {d.isoformat(): {"dividend": [], "results": []} for d in days}
    seen: set[tuple] = set()
    for e in record_dates or ():
        rd = _iso(e.get("record_date"))
        if not rd or rd not in by_day or date.fromisoformat(rd) > last_free:
            continue
        it = dividend_item(e)
        if it is None or (rd, "dividend", it["code"]) in seen:
            continue
        seen.add((rd, "dividend", it["code"]))
        by_day[rd]["dividend"].append(it)
    for m in meetings or ():
        md = _iso(m.get("date"))
        if not md or md not in by_day or not m.get("code"):
            continue
        if (md, "results", m["code"]) in seen:
            continue
        seen.add((md, "results", m["code"]))
        by_day[md]["results"].append(meeting_item(m, names.get(m["code"]), label_of(m.get("purpose"))))
    out = []
    for d in days:
        k = d.isoformat()
        divs = sorted(by_day[k]["dividend"], key=lambda i: (-(i["cash_ps"] or 0), i["code"]))
        res = sorted(by_day[k]["results"], key=lambda i: i["code"])
        out.append({"date": k, "items": divs + res})
    return out


def results_week(rows: Iterable[dict], today: date, days: int = RESULTS_DAYS) -> dict:
    """Reports posted in the last `days` days (today included), by level."""
    since = (today - timedelta(days=days - 1)).isoformat()
    levels = {k: 0 for k in LEVELS}
    codes: list[str] = []
    for r in rows or ():
        pd = _iso(r.get("post_date"))
        if not pd or pd < since or pd > today.isoformat():
            continue
        lv = r.get("level") if r.get("level") in levels else "neutral"
        levels[lv] += 1
        codes.append(r["code"])
    return {"since": since, "total": len(codes), "levels": levels, "codes": codes}


def ranking_part(rows: Iterable[dict], moves: Optional[dict]) -> dict:
    """{total, top: [{rank, code, name}], climbers: [{rank, code, name, places}]}.
    `rows` = score rows (trading_code, company_name, score); `moves` =
    `rank_today.rank_moves` (None on a rule-change week: no climbers)."""
    ranked = sorted(
        ((r["trading_code"], r.get("company_name"), _num(r.get("score"))) for r in rows or ()
         if r.get("trading_code") and _num(r.get("score")) is not None),
        key=lambda t: (-t[2], t[0]),
    )
    rank = {code: i + 1 for i, (code, _n, _s) in enumerate(ranked)}
    names = {code: (name or code) for code, name, _s in ranked}
    top = [{"rank": i + 1, "code": c, "name": names[c]} for i, (c, _n, _s) in enumerate(ranked[:TOP_N])]
    climbers = []
    places = (moves or {}).get("places") or {}
    ups = sorted(((c, p) for c, p in places.items() if p > 0 and rank.get(c, 10**6) <= CLIMB_WITHIN),
                 key=lambda t: (-t[1], rank[t[0]]))
    for c, p in ups[:CLIMBERS]:
        climbers.append({"rank": rank[c], "code": c, "name": names[c], "places": int(p)})
    return {"total": len(ranked), "top": top, "climbers": climbers}


def buy_list_part(summary: Optional[dict]) -> Optional[dict]:
    """The Buy List row: count, joined this week, top three codes, the free share."""
    if not summary:
        return None
    free = summary.get("free_pick") or None
    return {
        "count": int(summary.get("count") or 0),
        "universe": int(summary.get("universe") or 0),
        "week_joined": int(summary.get("week_joined") or 0),
        "top": [{"code": t["code"], "name": t.get("name") or t["code"]} for t in summary.get("top") or [] if t],
        "free_pick": {"code": free["code"], "name": free.get("name") or free["code"]} if free and free.get("code") else None,
    }


def build(today: date, *, record_dates, meetings, names, label_of, results_rows,
          score_rows, moves, buy_summary) -> dict:
    """The whole answer. Each part may be None when its source failed."""
    week = week_strip(today, record_dates or [], meetings or [], names or {}, label_of) \
        if record_dates is not None or meetings is not None else None
    return {
        "as_of": today.isoformat(),
        "days": week,
        "results": results_week(results_rows, today) if results_rows is not None else None,
        "ranking": ranking_part(score_rows, moves) if score_rows is not None else None,
        "buy_list": buy_list_part(buy_summary),
    }
