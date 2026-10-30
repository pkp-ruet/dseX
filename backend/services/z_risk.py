"""The Z-risk watch (2026-10-31, the Premium Desk plan): companies not yet in
category Z that look close to it under DSE's category rules.

DSE moves a company to Z when it misses its AGM or doesn't decide the year's
dividend in time, when its work has stopped, or when its losses so far are
bigger than its paid-up capital. We only read what the data shows, and every
line says "close to", never "will":

- the year's results / dividend decision is overdue: the fiscal year after the
  last one it decided ended `LATE_DAYS` (amber) or `OVERDUE_DAYS` (red) ago,
  with no yearly notice or final dividend for it;
- DSE visited the factory in the last year and found it closed (red);
- the reserve is negative by more than the paid-up capital (red);
- the latest audited accounts are two or more years old (amber) — only ever
  beside one of the reasons above: stale accounts alone are as often our own
  data lagging as the company stopping, so they never list a company.

`/market-analysis` shows how many and which companies (free); the reasons and
what a move to Z means are Premium (screen-only).
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Optional

from backend.services.db_service import _ttl_cache

# Days after a fiscal year end with no decision for that year.
LATE_DAYS = 150
OVERDUE_DAYS = 180
# A factory visit older than this no longer counts.
VISIT_DAYS = 365

_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
_MONTHS_BN = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট",
              "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"]


def _en(d: date) -> str:
    return f"{d.day} {_MONTHS[d.month - 1]} {d.year}"


def _bn(d: date) -> str:
    return f"{d.day} {_MONTHS_BN[d.month - 1]} {d.year}"


def year_after(d: date) -> date:
    """The same day a year later (28 Feb for a 29 Feb year end)."""
    try:
        return d.replace(year=d.year + 1)
    except ValueError:
        return d.replace(year=d.year + 1, day=28)


def _months(days: int) -> int:
    return max(1, round(days / 30.4))


def assess(*, today: date, category: Optional[str], last_decided: Optional[date] = None,
           closed_visit: Optional[date] = None, reserve_mn: Optional[float] = None,
           paid_up_mn: Optional[float] = None, data_age_years: Optional[int] = None,
           last_reported_year: Optional[int] = None) -> Optional[dict]:
    """{level: red|amber, reasons: [{key, level, en, bn}]} for a company that
    looks close to Z, else None. Companies already in Z are skipped."""
    if (category or "").strip().upper() == "Z":
        return None
    reasons: list[dict] = []

    if last_decided is not None:
        due_from = year_after(last_decided)
        late = (today - due_from).days
        if late >= LATE_DAYS:
            m = _months(late)
            red = late >= OVERDUE_DAYS
            reasons.append({
                "key": "late_year", "level": "red" if red else "amber",
                "en": f"Its year ended on {_en(due_from)}, about {m} months ago, and it has not announced "
                      "that year's results or dividend yet. DSE moves a company to Z when it misses the AGM "
                      "or the year's dividend decision.",
                "bn": f"এর বছর শেষ হয়েছে {_bn(due_from)}, প্রায় {m} মাস আগে, কিন্তু সে বছরের আর্থিক ফল বা "
                      "ডিভিডেন্ড এখনো জানায়নি। এজিএম বা বছরের ডিভিডেন্ডের সিদ্ধান্ত না হলে ডিএসই কোম্পানিকে Z "
                      "ক্যাটাগরিতে নেয়।",
            })

    if closed_visit is not None and (today - closed_visit).days <= VISIT_DAYS:
        reasons.append({
            "key": "factory_closed", "level": "red",
            "en": f"DSE visited the factory on {_en(closed_visit)} and found it closed. A company whose work "
                  "has stopped can be moved to Z.",
            "bn": f"{_bn(closed_visit)} ডিএসই কারখানা পরিদর্শন করে তা বন্ধ পেয়েছে। কাজ বন্ধ থাকলে কোম্পানিকে Z "
                  "ক্যাটাগরিতে নেওয়া হতে পারে।",
        })

    if reserve_mn is not None and paid_up_mn and reserve_mn < 0 and -reserve_mn > paid_up_mn:
        reasons.append({
            "key": "losses", "level": "red",
            "en": "Its losses so far are bigger than all the money its shareholders put in. "
                  "That is one of DSE's reasons for category Z.",
            "bn": "এ পর্যন্ত এর লোকসান শেয়ারহোল্ডারদের দেওয়া মোট মূলধনের চেয়েও বেশি। এটি Z ক্যাটাগরির একটি কারণ।",
        })

    if data_age_years is not None and data_age_years >= 2:
        yr = f" are from {last_reported_year}" if last_reported_year else " are two or more years old"
        yr_bn = f" {last_reported_year} সালের" if last_reported_year else " দুই বছরের বেশি পুরোনো"
        reasons.append({
            "key": "old_accounts", "level": "amber",
            "en": f"Its latest audited accounts{yr}. A company that stops reporting usually stops holding AGMs too.",
            "bn": f"এর সর্বশেষ নিরীক্ষিত হিসাব{yr_bn}। যে কোম্পানি হিসাব দেওয়া বন্ধ করে, সাধারণত তার এজিএমও হয় না।",
        })

    if not any(r["level"] == "red" or r["key"] == "late_year" for r in reasons):
        return None
    level = "red" if any(r["level"] == "red" for r in reasons) else "amber"
    return {"level": level, "reasons": sorted(reasons, key=lambda r: r["level"] != "red")}


# What a move to Z means for a holder — the same for every row (Premium).
MEANS = {
    "en": "In Z a share is harder to trade: it can't be bought with a margin loan, trades settle more slowly, "
          "and the price often falls when DSE announces the move.",
    "bn": "Z ক্যাটাগরিতে শেয়ার কেনাবেচা কঠিন হয়: মার্জিন ঋণে কেনা যায় না, লেনদেন নিষ্পত্তিতে বেশি সময় লাগে, "
          "আর ডিএসই ঘোষণা দিলে প্রায়ই দাম কমে যায়।",
}


def _as_date(v) -> Optional[date]:
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


@_ttl_cache(900)
def z_risk_list() -> dict:
    """{as_of, items: [{code, name, sector, level, reasons}]} — red first.
    Cached 900s. Four reads: companies, yearly notices, final dividends and
    a year of factory-visit notices."""
    from backend.services.db_service import get_db, load_companies
    from backend.services.notices import load_annual_results, parse_inspection

    db = get_db()
    today = date.today()
    companies = [c for c in load_companies() if not c.get("is_mutual_fund")]
    annual = load_annual_results()

    decided: dict[str, date] = {}
    for code, a in annual.items():
        d = _as_date(a.get("fy_end"))
        if d:
            decided[code] = d
    for d in db.dividend_declarations.find(
        {"period_end": {"$ne": None}},
        {"_id": 0, "trading_code": 1, "period_end": 1, "dividend_type": 1},
    ).batch_size(1000):
        if "interim" in str(d.get("dividend_type") or "").lower():
            continue
        pe = _as_date(d.get("period_end"))
        code = d.get("trading_code")
        if pe and code and (code not in decided or pe > decided[code]):
            decided[code] = pe

    closed: dict[str, date] = {}
    latest_visit: dict[str, date] = {}
    since = datetime.utcnow() - timedelta(days=VISIT_DAYS)
    for n in db.company_news.find(
        {"title": {"$regex": "inspection", "$options": "i"}, "post_date": {"$gte": since}},
        {"_id": 0, "trading_code": 1, "title": 1, "body": 1, "post_date": 1},
    ):
        r = parse_inspection(n.get("title") or "", n.get("body") or "", n.get("post_date"))
        if not r:
            continue
        code = n.get("trading_code")
        when = _as_date(r.get("visit_date")) or _as_date(r.get("post_date"))
        if not code or not when or (code in latest_visit and when <= latest_visit[code]):
            continue
        latest_visit[code] = when
        if r.get("status") == "closed":
            closed[code] = when
        else:
            closed.pop(code, None)

    try:
        from backend.services.scoring_service import build_scores_df
        df = build_scores_df()
        rows = {str(r["trading_code"]).upper(): r for r in df.to_dict("records")} if df is not None else {}
    except Exception:  # noqa: BLE001
        rows = {}

    items = []
    for c in companies:
        code = c["trading_code"]
        row = rows.get(code) or {}
        age = row.get("data_age_years")
        try:
            age = int(age) if age is not None and age == age else None
        except (TypeError, ValueError):
            age = None
        yr = row.get("last_reported_year")
        try:
            yr = int(yr) if yr is not None and yr == yr else None
        except (TypeError, ValueError):
            yr = None
        res = assess(today=today, category=c.get("market_category"), last_decided=decided.get(code),
                     closed_visit=closed.get(code), reserve_mn=c.get("reserve_surplus_mn"),
                     paid_up_mn=c.get("paid_up_capital_mn"), data_age_years=age, last_reported_year=yr)
        if res:
            items.append({"code": code, "name": c.get("company_name") or code, "sector": c.get("sector"),
                          "category": (c.get("market_category") or "").strip().upper() or None, **res})
    items.sort(key=lambda r: (r["level"] != "red", -len(r["reasons"]), r["code"]))
    return {"as_of": today.isoformat(), "items": items, "means": MEANS}
