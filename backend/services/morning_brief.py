"""
Before the bell (2026-10-29) — the results calendar and the morning brief. Pure.

The results calendar reads DSE's board-meeting notices ("The Board of
Directors … will be held on November 03, 2026 … to consider the un-audited
financial statements for the third quarter (Q3) period ended September 30,
2026", parsed by `notices.parse_board_meeting`) into the meetings still to
come. A results meeting is the day the numbers come out, so the calendar is
the "when". What to expect is built from the company's own posts: the same
report a year earlier (the bar this one is measured against), how the year
has gone so far, and the lines our /results levels use — profit up 10% or more
reads Better, down 25% or more (or a loss) reads Weaker
(`results_explainer.explain`). Dates are free; what to expect is Premium.

The morning brief is what a reader needs to know before DSE opens at 10 AM
about the shares they hold or follow: results posted since yesterday's close,
a results meeting today, the last day to buy before a record date, a record
date today on shares they hold, and the week's results meetings. Built per
reader by `morning_brief_service.run_brief` (Premium readers, push or email).
No advice: it never says buy or sell.

Storage, loaders and senders live in `morning_brief_service.py`; tests in
`backend/tests/test_morning_brief.py`.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Iterable, Optional

# The calendar looks this far ahead; the brief's "this week" line less far.
BOARD_DAYS = 14
WEEK_DAYS = 7
# The /results levels (results_explainer.explain): Better from +10%, Weaker
# from -25% (the signal's value-trap line) or a loss.
BETTER_PCT = 10.0
WEAKER_PCT = -25.0
RESULT_PURPOSES = ("q1", "q2", "q3", "annual")

_MONTHS = {"q1": 3, "q2": 6, "q3": 9, "annual": 12}
_LABEL = {
    "q1": ("Q1 results", "প্রথম প্রান্তিকের ফল"),
    "q2": ("Q2 results", "দ্বিতীয় প্রান্তিকের ফল"),
    "q3": ("Q3 results", "তৃতীয় প্রান্তিকের ফল"),
    "annual": ("Yearly results", "বার্ষিক ফল"),
}
_SHORT = {"q1": "Q1", "q2": "Q2", "q3": "Q3", "annual": "yearly"}
_SHORT_BN = {"q1": "প্রথম প্রান্তিক", "q2": "দ্বিতীয় প্রান্তিক", "q3": "তৃতীয় প্রান্তিক", "annual": "বার্ষিক"}
_WEEKDAY = ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
_WEEKDAY_BN = ("সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার", "রবিবার")


def _d(v) -> Optional[date]:
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    if isinstance(v, str) and len(v) >= 10:
        try:
            return date.fromisoformat(v[:10])
        except ValueError:
            return None
    return None


def label(purpose: str) -> tuple[str, str]:
    return _LABEL.get(purpose, ("Results", "আর্থিক ফল"))


def tk(v: float) -> str:
    """৳ with two decimals — EPS figures are small. A loss reads −৳1.37."""
    return f"−৳{abs(v):,.2f}" if v < 0 else f"৳{v:,.2f}"


def pct(v: float) -> str:
    return f"{abs(v):.0f}%"


# --------------------------------------------------------------------------- #
# The calendar
# --------------------------------------------------------------------------- #

def scheduled_meetings(meetings_by_code: dict[str, list[dict]], today: date,
                       horizon: int = BOARD_DAYS) -> list[dict]:
    """Results meetings from `today` to `today + horizon`, soonest first.

    `meetings_by_code` = {code: [parse_board_meeting records]}. The newest
    notice for a (purpose, period) wins — a company that moved its meeting
    posts a second notice. A postponement cancels every earlier notice of the
    same meeting (same date, or same purpose and period) until a newer notice
    sets a date again.
    """
    out = []
    for code, rows in meetings_by_code.items():
        rows = [r for r in rows or [] if isinstance(r, dict)]
        live: dict[tuple, dict] = {}
        for r in rows:
            if r.get("postponed") or (r.get("purpose") or "other") not in RESULT_PURPOSES:
                continue
            md = _d(r.get("meeting_date"))
            if md is None:
                continue
            key = (r["purpose"], _d(r.get("period_end")))
            have = live.get(key)
            if have is None or (_d(r.get("post_date")) or date.min) >= (_d(have.get("post_date")) or date.min):
                live[key] = r
        for key, r in live.items():
            md = _d(r["meeting_date"])
            posted = _d(r.get("post_date")) or date.min
            called_off = any(
                p.get("postponed")
                and (_d(p.get("post_date")) or date.min) >= posted
                and (_d(p.get("meeting_date")) == md
                     or (p.get("purpose") == key[0] and _d(p.get("period_end")) in (None, key[1])))
                for p in rows
            )
            days = (md - today).days
            if called_off or not 0 <= days <= horizon:
                continue
            out.append({"code": code, "date": md, "days": days, "purpose": key[0], "period_end": key[1]})
    out.sort(key=lambda m: (m["date"], m["code"]))
    return out


def _yoy(cur, prev) -> Optional[float]:
    if cur is None or prev is None or prev <= 0:
        return None
    return (cur - prev) / prev * 100.0


def expectation(meeting: dict, interims: list[dict], annuals: list[dict],
                annual_eps: Optional[dict[int, float]] = None) -> Optional[dict]:
    """What the coming report is measured against.

    `base_eps` = the same months a year earlier (last year's post of this
    quarter, or last year's full-year EPS); `so_far_pct` = profit so far this
    year against the same months last year (the newest report of the year in
    progress — for a Q1 meeting, last full year's growth instead);
    `better_above` / `weaker_below` = the EPS where the /results level would
    flip, only when the base is a profit. None when nothing can be said.
    """
    purpose = meeting.get("purpose")
    months = _MONTHS.get(purpose)
    if months is None:
        return None
    pe = _d(meeting.get("period_end"))
    md = _d(meeting.get("date")) or date.today()
    target = pe or (md - timedelta(days=45))  # meetings come ~1-2 months after the period
    year_ago = target.replace(year=target.year - 1) if not (target.month == 2 and target.day == 29) \
        else target.replace(year=target.year - 1, day=28)

    def near(a: Optional[date], b: date, slack: int = 40) -> bool:
        return a is not None and abs((a - b).days) <= slack

    base = None
    base_kind = None
    if purpose == "annual":
        for a in annuals or []:
            if near(_d(a.get("fy_end")), year_ago) and a.get("eps") is not None:
                base, base_kind = float(a["eps"]), "annual"
                break
        if base is None and annual_eps:
            v = annual_eps.get(year_ago.year)
            if v is not None:
                base, base_kind = float(v), "table"
    else:
        for r in interims or []:
            if int(r.get("months") or 0) == months and near(_d(r.get("period_end")), year_ago) \
                    and r.get("eps_cum") is not None:
                base, base_kind = float(r["eps_cum"]), "interim"
                break

    so_far = so_far_months = None
    so_far_kind = None
    # The newest report of the year in progress: ended after last year's same
    # report and before this one.
    progress = [r for r in interims or []
                if _d(r.get("period_end")) and year_ago + timedelta(days=40) < _d(r["period_end"]) < target - timedelta(days=40)
                and int(r.get("months") or 0) < months]
    if progress:
        latest = max(progress, key=lambda r: (_d(r["period_end"]), int(r.get("months") or 0)))
        so_far_months = int(latest.get("months") or 0) or None
        cur = latest.get("eps_cum")
        if cur is not None and cur < 0:
            so_far_kind = "loss"
        else:
            so_far = _yoy(cur, latest.get("eps_cum_prev"))
            so_far_kind = "ytd" if so_far is not None else None
    elif purpose == "q1":
        # No report of the new year yet: last full year's growth (that year
        # ended about three months before this quarter did).
        for a in annuals or []:
            if near(_d(a.get("fy_end")), target - timedelta(days=92), slack=60):
                g = _yoy(a.get("eps"), a.get("eps_prev"))
                if g is not None:
                    so_far, so_far_months, so_far_kind = g, 12, "year"
                break

    if base is None and so_far is None and so_far_kind != "loss":
        return None
    out = {"months": months, "base_eps": base, "base_kind": base_kind,
           "so_far_pct": round(so_far, 1) if so_far is not None else None,
           "so_far_months": so_far_months, "so_far_kind": so_far_kind,
           "better_above": None, "weaker_below": None}
    if base is not None and base > 0:
        out["better_above"] = round(base * (1 + BETTER_PCT / 100), 2)
        out["weaker_below"] = round(base * (1 + WEAKER_PCT / 100), 2)
    return out


def expect_lines(meeting: dict, exp: Optional[dict]) -> tuple[list[str], list[str]]:
    """The expectation as two or three plain sentences, English + Bengali."""
    if not exp:
        return [], []
    en, bn = [], []
    m = exp["months"]
    base = exp.get("base_eps")
    span_en = "the full year" if m == 12 else f"the same {m} months"
    span_bn = "পুরো বছরে" if m == 12 else f"একই {m} মাসে"
    if base is not None:
        if base < 0:
            en.append(f"A year ago it made a loss over {span_en}, {tk(abs(base))} a share.")
            bn.append(f"গত বছর {span_bn} শেয়ারপ্রতি {tk(abs(base))} লোকসান ছিল।")
        else:
            en.append(f"A year ago, over {span_en}, it earned {tk(base)} a share.")
            bn.append(f"গত বছর {span_bn} শেয়ারপ্রতি আয় ছিল {tk(base)}।")
    sf = exp.get("so_far_pct")
    if exp.get("so_far_kind") == "loss":
        en.append(f"It is in a loss so far this year ({exp.get('so_far_months')} months).")
        bn.append(f"এ বছর এ পর্যন্ত ({exp.get('so_far_months')} মাসে) লোকসানে আছে।")
    elif sf is not None:
        if exp.get("so_far_kind") == "year":
            if abs(sf) < 1:
                en.append("Last year's profit was about the same as the year before.")
                bn.append("গত বছরের মুনাফা তার আগের বছরের প্রায় সমান ছিল।")
            else:
                en.append(f"Last year profit was {'up' if sf > 0 else 'down'} {pct(sf)} on the year before.")
                bn.append(f"গত বছর মুনাফা আগের বছরের চেয়ে {pct(sf)} {'বেড়েছিল' if sf > 0 else 'কমেছিল'}।")
        else:
            n = exp.get("so_far_months")
            if abs(sf) < 1:
                en.append(f"So far this year ({n} months) profit is about the same as last year.")
                bn.append(f"এ বছর এ পর্যন্ত ({n} মাসে) মুনাফা গত বছরের প্রায় সমান।")
            else:
                en.append(f"So far this year ({n} months) profit is {'up' if sf > 0 else 'down'} {pct(sf)} on last year.")
                bn.append(f"এ বছর এ পর্যন্ত ({n} মাসে) মুনাফা গত বছরের চেয়ে {pct(sf)} {'বেশি' if sf > 0 else 'কম'}।")
    hi, lo = exp.get("better_above"), exp.get("weaker_below")
    if hi is not None and lo is not None:
        en.append(f"EPS of {tk(hi)} or more would read Better; under {tk(lo)} would read Weaker.")
        bn.append(f"ইপিএস {tk(hi)} বা তার বেশি হলে ফল ভালো, {tk(lo)}-এর কম হলে দুর্বল ধরা হবে।")
    elif base is not None and base < 0:
        en.append("A profit this time would read Better.")
        bn.append("এবার মুনাফা হলে ফল ভালো ধরা হবে।")
    return en, bn


def day_words(d: date, today: date) -> tuple[str, str]:
    """"today" / "tomorrow" / "Thu 30 Oct"."""
    days = (d - today).days
    if days == 0:
        return "today", "আজ"
    if days == 1:
        return "tomorrow", "আগামীকাল"
    return f"{_WEEKDAY[d.weekday()]} {d.day} {d.strftime('%b')}", f"{_WEEKDAY_BN[d.weekday()]}, {d.day} {_BN_MONTH[d.month - 1]}"


_BN_MONTH = ("জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট",
             "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর")


def calendar_row(meeting: dict, name: Optional[str], exp: Optional[dict]) -> dict:
    """One meeting as the API ships it (dates as ISO strings)."""
    en, bn = expect_lines(meeting, exp)
    lab_en, lab_bn = label(meeting["purpose"])
    pe = meeting.get("period_end")
    return {
        "code": meeting["code"],
        "name": name or meeting["code"],
        "date": meeting["date"].isoformat(),
        "days": meeting["days"],
        "purpose": meeting["purpose"],
        "period_end": pe.isoformat() if isinstance(pe, date) else None,
        "label_en": lab_en,
        "label_bn": lab_bn,
        "expect_en": en,
        "expect_bn": bn,
        "better_above": (exp or {}).get("better_above"),
        "weaker_below": (exp or {}).get("weaker_below"),
    }


# --------------------------------------------------------------------------- #
# The brief
# --------------------------------------------------------------------------- #

# Order inside a brief: what changed overnight, then what happens today.
_ORDER = {"results": 0, "board_today": 1, "buy_by": 2, "record": 3, "board_week": 4}
# Kinds that are news for today — a brief made only of the week's meetings is
# sent on the week's first trading day only.
TODAY_KINDS = ("results", "board_today", "buy_by", "record")
MAX_ITEMS = 8


def build_brief(held: dict[str, int], watched: Iterable[str], *, today: date,
                meetings: list[dict], record_rows: list[dict],
                results: list[dict], names: dict[str, str]) -> list[dict]:
    """The reader's brief: a list of items, most important first.

    `held` = {code: shares}; `watched` = followed codes not held; `meetings` =
    `scheduled_meetings` rows; `record_rows` = the dividend calendar's record
    dates (`buy_by`, `record_date`, `cash_per_share`); `results` = watcher
    `results` events for this reader (title_en / title_bn / code).
    """
    watched = {c for c in watched if c not in held}
    mine = set(held) | watched
    iso = today.isoformat()
    items: list[dict] = []

    for e in results or []:
        code = e.get("code")
        if code not in mine:
            continue
        items.append({"kind": "results", "code": code, "level": e.get("level") or "info",
                      "title_en": e.get("title_en") or "", "title_bn": e.get("title_bn") or "",
                      "url": f"/stock/{code}#results"})

    week = []
    for m in meetings or []:
        code = m["code"]
        if code not in mine:
            continue
        lab_en, lab_bn = label(m["purpose"])
        if m["days"] == 0:
            items.append({
                "kind": "board_today", "code": code, "level": "info",
                "title_en": f"{code}: board meets today on its {lab_en if lab_en.startswith('Q') else lab_en.lower()}",
                "title_bn": f"{code}: আজ {lab_bn} নিয়ে পর্ষদ সভা",
                "url": f"/stock/{code}#results",
            })
        elif m["days"] <= WEEK_DAYS:
            week.append(m)

    for r in record_rows or []:
        code = (r.get("trading_code") or "").upper()
        if code not in mine:
            continue
        cps = r.get("cash_per_share") or 0
        if r.get("buy_by") == iso and cps > 0:
            if code in held:
                t_en = f"{code}: last day to buy more before the record date (৳{cps:,.2f} a share)"
                t_bn = f"{code}: রেকর্ড ডেটের আগে আরও কেনার শেষ দিন আজ (শেয়ারপ্রতি ৳{cps:,.2f})"
            else:
                t_en = f"{code}: last day to buy and get its ৳{cps:,.2f} dividend"
                t_bn = f"{code}: ৳{cps:,.2f} ডিভিডেন্ড পেতে কেনার শেষ দিন আজ"
            items.append({"kind": "buy_by", "code": code, "level": "info",
                          "title_en": t_en, "title_bn": t_bn, "url": f"/stock/{code}#dividends"})
        elif r.get("record_date") == iso and code in held and cps > 0:
            cash = cps * held[code]
            items.append({
                "kind": "record", "code": code, "level": "good",
                "title_en": f"{code}: record date today, ৳{cash:,.0f} on your {held[code]:,} shares",
                "title_bn": f"{code}: আজ রেকর্ড ডেট, আপনার {held[code]:,}টি শেয়ারে ৳{cash:,.0f}",
                "url": f"/stock/{code}#dividends",
            })

    if week:
        parts_en, parts_bn = [], []
        for m in week[:4]:
            d_en, d_bn = day_words(m["date"], today)
            parts_en.append(f"{m['code']} ({_SHORT[m['purpose']]}, {d_en})")
            parts_bn.append(f"{m['code']} ({_SHORT_BN[m['purpose']]}, {d_bn})")
        more = len(week) - 4
        items.append({
            "kind": "board_week", "code": None, "level": "info",
            "title_en": "Results due this week: " + ", ".join(parts_en) + (f" and {more} more" if more > 0 else ""),
            "title_bn": "এই সপ্তাহে ফল আসবে: " + ", ".join(parts_bn) + (f" আরও {more}টি" if more > 0 else ""),
            "url": "/results#coming",
        })

    items.sort(key=lambda i: _ORDER.get(i["kind"], 9))
    # A brief is read in a minute: the first MAX_ITEMS, the week's line kept.
    week_item = [i for i in items if i["kind"] == "board_week"]
    rest = [i for i in items if i["kind"] != "board_week"]
    if len(rest) + len(week_item) > MAX_ITEMS:
        rest = rest[:MAX_ITEMS - len(week_item)]
    return rest + week_item


def worth_sending(items: list[dict], today: date) -> bool:
    """Something happened or happens today — or it is the week's first trading
    day (Sunday) and results are due this week."""
    if any(i["kind"] in TODAY_KINDS for i in items):
        return True
    return today.weekday() == 6 and any(i["kind"] == "board_week" for i in items)


def tagged(url: str, src: str = "brief") -> str:
    """`url` with `src=` in its query, before any `#hash`."""
    path, _, frag = url.partition("#")
    path += ("&" if "?" in path else "?") + f"src={src}"
    return f"{path}#{frag}" if frag else path


def push_payload(items: list[dict], lang: str = "bn") -> Optional[dict]:
    """One notification: "Before the bell" + the first two or three items. A
    lone item opens its own page; several open the dashboard, whose Today
    story starts with the brief."""
    if not items:
        return None
    bn = lang != "en"
    k = "title_bn" if bn else "title_en"
    if len(items) == 1:
        title = "বাজার খোলার আগে" if bn else "Before the bell"
        body = items[0][k]
        url = items[0]["url"]
    else:
        n = len(items)
        title = f"বাজার খোলার আগে: আপনার শেয়ারে {n}টি খবর" if bn else f"Before the bell: {n} things on your shares"
        body = " · ".join(i[k] for i in items[:3])
        url = "/"
    return {"title": title, "body": body, "url": tagged(url), "tag": "brief"}
