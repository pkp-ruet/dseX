"""
The stock report (2026-10-28) — the ``report`` field of ``GET /api/company/:code``.

The stock page reads as a dated research report: a cover (dateline + three-line
summary), an eight-check scorecard, one section per check plus a few extra
sections, and one offer. The JSON shape is ``frontend/lib/stock-report.ts`` —
keep the two in step.

Free readers see WHAT we found (every fact, each check's verdict word, every
serious red flag); Premium shows WHY, WHAT COMES NEXT and WHAT TO DO. Every part
ships (the locks are screen-only); the contract says which part is which.

Everything here is pure: ``build_report(inp)`` takes one plain dict of inputs
(``stock_report_service`` gathers them) and returns the report. Every sentence
is an {en, bn} pair in the calm-advisor voice (docs/voice.md): plain full
sentences, the fact first and then what it means, Western digits, money as
``৳1,234`` / ``৳45.6``, per-share dividends and EPS with two decimals.

No performance or track-record claims anywhere: the record-date sums describe
what the price did around a past record date, never what our signals did.
"""
from __future__ import annotations

import math
import statistics
from datetime import date, datetime, timedelta
from typing import Any, Optional

# ---------------------------------------------------------------- thresholds

# BSEC rule: sponsors + directors of a listed company must hold 30% together.
SPONSOR_MIN_PCT = 30.0
# A government holding this large is a controlling owner; the 30% rule is not
# the useful test there (stock_facts.GOVT_CONTROL_PCT).
GOVT_CONTROL_PCT = 50.0
# Accounts this many years behind the reference year are stale (scoring's
# staleness multiplier starts at 2 years).
STALE_YEARS = 2
# Thin trading: under ৳10 lakh a day, the Buy signal's own line (signal_service).
THIN_TURNOVER_MN = 1.0
# A big investor leaving: foreign or institutional share down more than this
# many points within ~6 months.
OWNER_EXIT_PP = 1.0
OWNER_EXIT_DAYS = 200
# Ownership trend lines only for groups that moved at least this much.
OWNER_MOVE_PP = 0.3
# How far back the ownership trend looks (~16 monthly reports).
OWNER_TREND_DAYS = 490
# Cash from the business under half of profit is "far below".
CASH_WEAK_RATIO = 50.0
# ... and at or above this is a strong year.
CASH_STRONG_RATIO = 80.0
# "Cash fell while profit rose" only counts when profit rose at least this much.
CASH_GAP_PROFIT_RISE_PCT = 10.0
# Notices older than this don't raise a flag (governance_items uses a year too).
NOTICE_DAYS = 365
# A DSE price query this recent counts towards the rally warning.
QUERY_DAYS = 60
# Rumour-rally lines: up this much over 20 / 60 trading days with no news.
RALLY_20D_PCT = 30.0
RALLY_60D_PCT = 50.0
# Under this share in public hands a few buyers can move the price.
FREE_FLOAT_LOW_PCT = 20.0
# Fair-price extras.
BUY_BELOW_MARGIN = 0.20          # buy-below = centre less a 20% safety margin
PROFIT_FALL = 0.20               # the profit-fall test
SCEN_BEAR_EPS = -0.10            # bear case: profit falls 10%
SCEN_GROWTH_CAP = 0.15           # growth used in the scenarios, clamped 0–15%
MIN_PE_YEARS = 3                 # year-end P/E history needed for scenarios
# Dividend sums.
DIV_TAX_PCT = 10.0               # tax on cash dividends with a TIN
FEE_PCT = 0.4                    # broker fee + charges, each side
DIV_HISTORY_YEARS = 11
RECORD_HISTORY = 4               # past record dates shown
# A results meeting held this recently means the results are due now.
RESULTS_DUE_DAYS = 45
# Words for the yearly trend.
GROWING_PCT = 5.0
# Rating grades at or above BBB- are investment grade.
_RATING_ORDER = ["AAA", "AA+", "AA", "AA-", "A+", "A", "A-", "BBB+", "BBB", "BBB-",
                 "BB+", "BB", "BB-", "B+", "B", "B-", "CCC+", "CCC", "CCC-", "CC", "C", "D"]
INVESTMENT_GRADE_LAST = "BBB-"
STRONG_RATING_LAST = "AA-"

# A lender's own money as a share of its assets (scoring_service._a2_capital_score
# anchors: 5% scores 5, 7% scores 8, 9% scores 10 out of 10).
BANK_CUSHION_STRONG = 9.0
BANK_CUSHION_SAFE = 7.0
BANK_CUSHION_WATCH = 5.0

_LENDERS = {"BANK", "NBFI"}
_FINANCIALS = {"BANK", "NBFI", "INSURANCE"}

# ---------------------------------------------------------------- formatting

_MON_EN = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
_MON_FULL_EN = ["", "January", "February", "March", "April", "May", "June", "July", "August",
                "September", "October", "November", "December"]
_MON_BN = ["", "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট",
           "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"]

TIER_WORDS = {"excellent": "Excellent", "good": "Good", "average": "Average", "weak": "Weak"}
TIER_WORDS_BN = {"excellent": "চমৎকার", "good": "ভালো", "average": "মাঝারি", "weak": "দুর্বল"}

# The five checks, in the names the stock page uses (components/stock/HealthCheck.tsx).
PILLARS = [
    ("p1_biz", "Profit", "মুনাফা"),
    ("p2_health", "Finances", "আর্থিক অবস্থা"),
    ("p3_moat", "Business", "ব্যবসার শক্তি"),
    ("p4_val", "Price", "দাম"),
    ("p5_div", "Dividend", "ডিভিডেন্ড"),
]


def bi(en: str, bn: str) -> dict:
    return {"en": en, "bn": bn}


def _f(v) -> Optional[float]:
    if v is None or isinstance(v, bool):
        return None
    try:
        x = float(v)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(x) or math.isinf(x) else x


def _pos(v) -> bool:
    x = _f(v)
    return x is not None and x > 0


def _d(v) -> Optional[date]:
    """date / datetime / 'YYYY-MM-DD…' / 'Mar 31, 2026' → date."""
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    s = str(v).strip()
    if not s:
        return None
    try:
        return datetime.fromisoformat(s[:10]).date()
    except ValueError:
        pass
    for fmt in ("%b %d, %Y", "%B %d, %Y", "%d %b %Y", "%d %B %Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _iso(v) -> Optional[str]:
    d = _d(v)
    return d.isoformat() if d else None


def money(v: Optional[float]) -> str:
    """৳1,234 at 100 and above, ৳45.6 below (formatters.money)."""
    x = _f(v)
    if x is None:
        return "—"
    a = abs(x)
    s = f"{a:,.0f}" if a >= 100 else f"{a:,.1f}"
    return ("-" if x < 0 else "") + "৳" + s


def tk2(v: Optional[float]) -> str:
    """Per-share figures (EPS, dividend): ৳13.00."""
    x = _f(v)
    if x is None:
        return "—"
    return ("-" if x < 0 else "") + f"৳{abs(x):,.2f}"


def _tk_est(v: float) -> str:
    """An estimate: whole taka from ৳10, else two decimals."""
    return f"৳{v:,.0f}" if abs(v) >= 10 else f"৳{v:,.2f}"


def _crore(mn: Optional[float]) -> tuple[str, str]:
    """৳ million → ("৳107 crore", "৳107 কোটি"); under a crore in lakh."""
    x = _f(mn) or 0.0
    cr = x / 10.0
    if abs(cr) < 1:
        lakh = x * 10.0
        s = f"{lakh:,.0f}"
        return f"৳{s} lakh", f"৳{s} লাখ"
    s = f"{cr:,.0f}" if abs(cr) >= 100 else f"{cr:,.1f}"
    return f"৳{s} crore", f"৳{s} কোটি"


def _cr_of(taka: Optional[float]) -> Optional[float]:
    x = _f(taka)
    return round(x / 1e7, 1) if x is not None else None


def _pct(v: float, nd: int = 0) -> str:
    return f"{v:.{nd}f}%"


def _x(v: float) -> str:
    return f"{v:.1f}"


def _day(v) -> tuple[str, str]:
    d = _d(v)
    if not d:
        return "", ""
    return f"{d.day} {_MON_EN[d.month]} {d.year}", f"{d.day} {_MON_BN[d.month]} {d.year}"


def _day_short(v) -> tuple[str, str]:
    d = _d(v)
    if not d:
        return "", ""
    return f"{d.day} {_MON_EN[d.month]}", f"{d.day} {_MON_BN[d.month]}"


def _mon(v) -> tuple[str, str]:
    d = _d(v)
    if not d:
        return "", ""
    return f"{_MON_EN[d.month]} {d.year}", f"{_MON_BN[d.month]} {d.year}"


def _lc(s: str) -> str:
    """Lower-case the first letter unless it starts a code or acronym (DSE, Q1, AGM)."""
    if not s:
        return s
    if len(s) > 1 and (s[1].isupper() or s[1].isdigit()):
        return s
    return s[0].lower() + s[1:]


def _ordinal(n: int) -> str:
    if 10 <= n % 100 <= 20:
        suf = "th"
    else:
        suf = {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    return f"{n}{suf}"


def _join_en(items: list[str]) -> str:
    items = [i for i in items if i]
    if len(items) <= 1:
        return "".join(items)
    return ", ".join(items[:-1]) + " and " + items[-1]


def _join_bn(items: list[str]) -> str:
    items = [i for i in items if i]
    if len(items) <= 1:
        return "".join(items)
    return ", ".join(items[:-1]) + " ও " + items[-1]


def _round_price(x: Optional[float]) -> Optional[float]:
    v = _f(x)
    if v is None:
        return None
    return round(v) if abs(v) >= 100 else round(v, 1)


def _cagr(first: Optional[float], last: Optional[float], years: int) -> Optional[float]:
    if not _pos(first) or not _pos(last) or years <= 0:
        return None
    return ((last / first) ** (1.0 / years) - 1.0) * 100.0


def _rating_rank(grade: Optional[str]) -> Optional[int]:
    g = (grade or "").strip().upper().replace(" ", "")
    return _RATING_ORDER.index(g) if g in _RATING_ORDER else None


def _section(key: str, title: dict, word: dict, tone: str, headline: dict, source: dict, *,
             free_line: Optional[dict] = None, inside: Optional[list] = None,
             meaning: Optional[list] = None, watch: Optional[dict] = None, **extra) -> dict:
    out = {
        "key": key, "title": title, "word": word, "tone": tone,
        "free_line": free_line, "inside": [i for i in (inside or []) if i][:3],
        "headline": headline, "meaning": [m for m in (meaning or []) if m],
        "watch": watch, "source": source,
    }
    out.update(extra)
    return out


# ---------------------------------------------------------------- shared reads

def _sorted_fin(financials: list[dict]) -> list[dict]:
    rows = []
    for r in financials or []:
        try:
            y = int(r.get("year"))
        except (TypeError, ValueError):
            continue
        rows.append({**r, "_year": y})
    rows.sort(key=lambda r: r["_year"])
    return rows


def _fin_eps(r: dict) -> Optional[float]:
    for k in ("eps", "eps_cont_basic", "eps_basic"):
        v = _f(r.get(k))
        if v is not None:
            return v
    return None


def _annuals(notices: dict) -> list[dict]:
    """Yearly results from the dividend notice, newest first, each with `year`."""
    raw = (notices or {}).get("annual")
    if not raw:
        return []
    items = raw if isinstance(raw, list) else [raw]
    out = []
    for a in items:
        if not isinstance(a, dict):
            continue
        end = _d(a.get("fy_end") or a.get("period_end"))
        year = a.get("fy_year") or a.get("year") or (end.year if end else None)
        try:
            year = int(year)
        except (TypeError, ValueError):
            continue
        out.append({**a, "year": year, "fy_end": end, "post_date": _d(a.get("post_date"))})
    out.sort(key=lambda a: a["year"], reverse=True)
    return out


def _interims(notices: dict) -> list[dict]:
    out = []
    for r in (notices or {}).get("interims") or []:
        if not isinstance(r, dict):
            continue
        s, e = _d(r.get("period_start")), _d(r.get("period_end"))
        if not s or not e or not r.get("quarter"):
            continue
        out.append({**r, "period_start": s, "period_end": e, "post_date": _d(r.get("post_date"))})
    out.sort(key=lambda r: (r["period_end"], r.get("months") or 0), reverse=True)
    return out


def _fy_end_of(interim: dict) -> date:
    """The fiscal-year end an interim belongs to: 12 months after its start."""
    s = interim["period_start"]
    m = s.month + 11
    y = s.year + (m - 1) // 12
    m = (m - 1) % 12 + 1
    import calendar
    return date(y, m, calendar.monthrange(y, m)[1])


def _fy_label(fy_end: date) -> dict:
    return bi(f"FY{fy_end.year}", f"{fy_end.year} অর্থবছর")


def _quarter_months(fy_end: date, q: int) -> tuple[int, int]:
    """(first month, last month) of quarter q of the fiscal year ending fy_end."""
    start = (fy_end.month % 12) + 1  # first month of the year
    m1 = (start - 1 + (q - 1) * 3) % 12 + 1
    m3 = (m1 - 1 + 2) % 12 + 1
    return m1, m3


def _quarter_label(fy_end: date, q: int) -> dict:
    m1, m3 = _quarter_months(fy_end, q)
    return bi(f"{_MON_EN[m1]}–{_MON_EN[m3]}", f"{_MON_BN[m1]}–{_MON_BN[m3]}")


def _quarter_words(fy_end: date, q: int) -> dict:
    m1, m3 = _quarter_months(fy_end, q)
    return bi(f"{_MON_FULL_EN[m1]} to {_MON_FULL_EN[m3]}", f"{_MON_BN[m1]} থেকে {_MON_BN[m3]}")


def _news_titles(news: list[dict], since: Optional[date] = None) -> list[tuple[Optional[date], str, str]]:
    out = []
    for n in news or []:
        d = _d(n.get("post_date"))
        if since and d and d < since:
            continue
        out.append((d, n.get("title") or "", n.get("body") or n.get("news") or ""))
    return out


def _lt(r: Optional[dict]) -> Optional[float]:
    if not r:
        return None
    for k in ("ltp", "close_price", "close"):
        v = _f(r.get(k))
        if v is not None and v > 0:
            return v
    return None


def _price_series(prices: list[dict]) -> list[tuple[date, float]]:
    out = []
    for r in prices or []:
        d, p = _d(r.get("date")), _lt(r)
        if d and p:
            out.append((d, p))
    out.sort(key=lambda t: t[0])
    return out


def _range_between(series: list[tuple[date, float]], start: Optional[date], end: Optional[date]):
    if not start:
        return None, None
    end = end or (start + timedelta(days=30))
    vals = [p for d, p in series if start <= d <= end]
    if not vals:
        return None, None
    return min(vals), max(vals)


# ---------------------------------------------------------------- this year

def _quarter_table(interims: list[dict], annuals: list[dict], fin: list[dict]) -> Optional[dict]:
    """The latest fiscal year's quarters against last year's.

    Q1–Q3 come from the quarterly notices (the post's own 3-month figure, else
    the difference of two year-to-date figures). Q4 = the full year less nine
    months, from the yearly notice or the audited table."""
    by_fy: dict[date, dict[int, dict]] = {}
    for r in interims:
        fe = _fy_end_of(r)
        by_fy.setdefault(fe, {})
        q = int(r["quarter"])
        if q not in by_fy[fe] or (r.get("post_date") or date.min) > (by_fy[fe][q].get("post_date") or date.min):
            by_fy[fe][q] = r

    annual_by_year = {a["year"]: a for a in annuals}
    fin_eps = {r["_year"]: _fin_eps(r) for r in fin}

    # The newest fiscal year we have anything for.
    candidates = set(by_fy)
    for a in annuals:
        if a.get("fy_end"):
            candidates.add(a["fy_end"])
    if not candidates:
        return None
    fy_end = max(candidates)
    quarters = by_fy.get(fy_end, {})
    # Last year's posts: where a quarter this year hasn't been posted yet, its
    # own figure then is the number this year's has to beat.
    last_fy = max((fe for fe in by_fy if fe < fy_end - timedelta(days=300)), default=None)
    last_quarters = by_fy.get(last_fy, {}) if last_fy else {}
    annual = annual_by_year.get(fy_end.year)

    def cum(q: int, prev: bool, qs: Optional[dict] = None) -> Optional[float]:
        r = (quarters if qs is None else qs).get(q)
        if not r:
            return None
        return _f(r.get("eps_cum_prev" if prev else "eps_cum"))

    def standalone(q: int, prev: bool, qs: Optional[dict] = None) -> Optional[float]:
        qs = quarters if qs is None else qs
        r = qs.get(q)
        if q == 1:
            return cum(1, prev, qs)
        if r:
            months = r.get("months") or q * 3
            own = _f(r.get("eps_q_prev" if prev else "eps_q"))
            whole = _f(r.get("eps_cum_prev" if prev else "eps_cum"))
            if own is not None and (months == 3 or own != whole):
                return own
        a, b = cum(q, prev, qs), cum(q - 1, prev, qs)
        if a is not None and b is not None:
            return round(a - b, 2)
        return None

    def full_year(prev: bool) -> Optional[float]:
        if annual:
            v = _f(annual.get("eps_prev" if prev else "eps"))
            if v is not None:
                return v
        return fin_eps.get(fy_end.year - (1 if prev else 0))

    bars = []
    for q in (1, 2, 3, 4):
        if q < 4:
            cur, prv = standalone(q, False), standalone(q, True)
            if q not in quarters:
                cur = None
                prv = standalone(q, False, last_quarters) if q in last_quarters else None
        else:
            fy, fyp = full_year(False), full_year(True)
            n9, n9p = cum(3, False), cum(3, True)
            if n9p is None and 3 in last_quarters:
                n9p = cum(3, False, last_quarters)
            cur = round(fy - n9, 2) if (annual or fin_eps.get(fy_end.year) is not None) and fy is not None and n9 is not None else None
            prv = round(fyp - n9p, 2) if fyp is not None and n9p is not None else None
        bars.append({"q": q, "label": _quarter_label(fy_end, q), "cur": cur, "prev": prv})

    done = 4 if annual or fin_eps.get(fy_end.year) is not None else max(quarters) if quarters else 0
    latest_q = quarters.get(max(quarters)) if quarters else None
    return {"fy_end": fy_end, "bars": bars, "done": done, "annual": annual, "quarters": quarters,
            "latest_q": latest_q}


def _next_results(table: dict, notices: dict, today: date) -> Optional[dict]:
    """The next results due after the latest one we have: (quarter, date, approx)."""
    fy_end = table["fy_end"]
    done = table["done"]
    if done >= 4:
        next_q, next_fy = 1, date(fy_end.year + 1, fy_end.month, fy_end.day) if not (fy_end.month == 2 and fy_end.day == 29) else date(fy_end.year + 1, 2, 28)
    else:
        next_q, next_fy = done + 1, fy_end
    purpose = "annual" if next_q == 4 else f"q{next_q}"

    meetings = [m for m in (notices or {}).get("board_meetings") or [] if isinstance(m, dict)]
    scheduled = None
    last_cycle = None
    for m in meetings:
        md = _d(m.get("meeting_date"))
        if not md or (m.get("purpose") or "") != purpose:
            continue
        if md >= today and not m.get("postponed"):
            if scheduled is None or md < scheduled:
                scheduled = md
        elif (today - md).days <= 800 and (last_cycle is None or md > last_cycle):
            last_cycle = md
    if last_cycle is None:
        # No meeting notice: the newest post of the same report.
        if next_q < 4:
            posts = [_d(r.get("post_date")) for r in (notices or {}).get("interims") or []
                     if int(r.get("quarter") or 0) == next_q]
        else:
            posts = [a.get("post_date") for a in _annuals(notices)]
        posts = [p for p in posts if p and (today - p).days <= 800]
        last_cycle = max(posts) if posts else None

    when, approx, basis = None, True, None
    if scheduled:
        when, approx = scheduled, False
    elif last_cycle and (today - last_cycle).days < RESULTS_DUE_DAYS:
        when = None  # this cycle's meeting has just been held: the results are due
    elif last_cycle:
        basis = last_cycle
        when = last_cycle
        while when < today:
            try:
                when = when.replace(year=when.year + 1)
            except ValueError:
                when = when + timedelta(days=365)
    return {"q": next_q, "fy_end": next_fy, "date": when, "approx": approx, "basis": basis}


def _profit_change_line(pct: float, when_en: str, when_bn: str) -> dict:
    """"It made 16% more profit this year." — the one plain way the report says
    a profit change (2026-10-30)."""
    if abs(pct) < GROWING_PCT:
        return bi(f"It made about the same profit {when_en} as a year before.",
                  f"{when_bn} মুনাফা আগের বছরের প্রায় সমান।")
    if pct > 0:
        if pct >= 95:
            return bi(f"It made about {pct / 100 + 1:.0f} times as much profit {when_en} as a year before.",
                      f"{when_bn} মুনাফা আগের বছরের প্রায় {pct / 100 + 1:.0f} গুণ।")
        return bi(f"It made {pct:.0f}% more profit {when_en} than a year before.",
                  f"{when_bn} মুনাফা আগের বছরের চেয়ে {pct:.0f}% বেশি।")
    return bi(f"It made {abs(pct):.0f}% less profit {when_en} than a year before.",
              f"{when_bn} মুনাফা আগের বছরের চেয়ে {abs(pct):.0f}% কম।")


def build_this_year(inp: dict) -> Optional[dict]:
    notices = inp.get("notices") or {}
    today = inp["today"]
    fin = _sorted_fin(inp.get("financials") or [])
    annuals = _annuals(notices)
    interims = _interims(notices)
    table = _quarter_table(interims, annuals, fin)

    fy_eps_cur = fy_eps_prev = None
    headline_latest = None
    posted = None
    word, tone, pct = None, "neutral", None
    cash_ytd = None

    if table:
        fy_end = table["fy_end"]
        fyl = _fy_label(fy_end)
        annual = table["annual"]
        if table["done"] >= 4 and annual:
            cur, prev = _f(annual.get("eps")), _f(annual.get("eps_prev"))
            posted = annual.get("post_date")
            period_en, period_bn = fyl["en"], fyl["bn"]
            nc, ncp = _f(annual.get("nocfps")), _f(annual.get("nocfps_prev"))
            cash_label = bi(f"Cash from the business, {fyl['en']}", f"ব্যবসা থেকে আসা নগদ টাকা, {fyl['bn']}")
        else:
            lq = table["latest_q"]
            if lq is None:
                cur = prev = None
            else:
                cur, prev = _f(lq.get("eps_cum")), _f(lq.get("eps_cum_prev"))
                posted = lq.get("post_date")
            months = (lq or {}).get("months") or 0
            end = (lq or {}).get("period_end")
            period_en = f"the {months} months to {_mon(end)[0]}" if lq else fyl["en"]
            period_bn = f"{_mon(end)[1]} পর্যন্ত {months} মাসে" if lq else fyl["bn"]
            nc, ncp = (_f((lq or {}).get("nocfps_cum")), _f((lq or {}).get("nocfps_cum_prev")))
            cash_label = bi(f"Cash from the business, {period_en}", f"ব্যবসা থেকে আসা নগদ টাকা, {period_bn}")
        fy_eps_cur, fy_eps_prev = cur, prev
        if nc is not None or ncp is not None:
            cash_ytd = {"cur": nc, "prev": ncp, "label": cash_label}
        if cur is not None:
            if cur <= 0:
                word, tone = bi("Loss", "লোকসান"), "bad"
            elif prev is not None and prev != 0:
                pct = (cur - prev) / abs(prev) * 100.0
                if prev < 0:
                    word, tone = bi("Growing", "বাড়ছে"), "good"
                elif pct >= GROWING_PCT:
                    word, tone = bi("Growing", "বাড়ছে"), "good"
                elif pct <= -GROWING_PCT:
                    word, tone = bi("Slipping", "কমছে"), "fair" if pct > -25 else "bad"
                else:
                    word, tone = bi("Flat", "একই রকম"), "neutral"
            else:
                word, tone = bi("Growing", "বাড়ছে"), "good"
            # Plain words (2026-10-30): what happened, one familiar number.
            full = table["done"] >= 4 and annual
            when_en = f"in the year to {_mon(fy_end)[0]}" if full else f"in {period_en}"
            when_bn = f"{_mon(fy_end)[1]}-এ শেষ হওয়া বছরে" if full else period_bn
            if pct is not None and prev and prev > 0 and cur > 0:
                headline_latest = _profit_change_line(pct, when_en, when_bn)
            elif cur <= 0:
                headline_latest = bi(f"It made a loss {when_en}.", f"{when_bn} লোকসান হয়েছে।")
            else:
                headline_latest = bi(f"It made a profit {when_en}.", f"{when_bn} মুনাফা হয়েছে।")

    if word is None:
        # No notice we can read: the latest audited year against the one before.
        eps_rows = [(r["_year"], _fin_eps(r)) for r in fin if _fin_eps(r) is not None]
        if len(eps_rows) >= 2:
            (y0, e0), (y1, e1) = eps_rows[-2], eps_rows[-1]
            fy_eps_cur, fy_eps_prev = e1, e0
            if e1 <= 0:
                word, tone = bi("Loss", "লোকসান"), "bad"
            elif e0 and e0 > 0:
                pct = (e1 - e0) / e0 * 100.0
                if pct >= GROWING_PCT:
                    word, tone = bi("Growing", "বাড়ছে"), "good"
                elif pct <= -GROWING_PCT:
                    word, tone = bi("Slipping", "কমছে"), "fair" if pct > -25 else "bad"
                else:
                    word, tone = bi("Flat", "একই রকম"), "neutral"
            else:
                word, tone = bi("Growing", "বাড়ছে"), "good"
            if pct is not None and e0 and e0 > 0 and e1 > 0:
                headline_latest = _profit_change_line(pct, f"in its {y1} accounts", f"{y1} সালের হিসাবে")
            elif e1 <= 0:
                headline_latest = bi(f"It made a loss in its {y1} accounts.", f"{y1} সালের হিসাবে লোকসান হয়েছে।")
        if word is None:
            return None
        fb_year = eps_rows[-1][0]
    else:
        fb_year = None

    bars = (table or {}).get("bars") or []
    both = [b for b in bars if b["cur"] is not None and b["prev"] is not None]
    beat = [b for b in both if b["cur"] > b["prev"]]
    slip = [b for b in both if b["cur"] < b["prev"]]
    fy_end = (table or {}).get("fy_end")

    # The answer, in plain words (2026-10-30): is it making more money than a
    # year ago, then one short line on the parts of the year.
    full_year = bool(table and table["done"] >= 4 and table.get("annual")) or bool(fb_year)
    if fy_eps_cur is not None and fy_eps_cur <= 0:
        lead = bi("It is making a loss right now.", "এখন এটি লোকসানে আছে।")
    elif pct is not None:
        lead = _profit_change_line(pct, "this year" if full_year else "so far this year",
                                   "এ বছর" if full_year else "এ বছর এ পর্যন্ত")
    else:
        lead = bi("It is making a profit.", "এটি মুনাফায় আছে।")
    head = lead
    if both and fy_end:
        n = len(both)
        if n >= 2 and not slip:
            more = bi("Every part of the year so far beat the same months last year.",
                      "বছরের প্রতিটি অংশেই মুনাফা আগের বছরের একই সময়ের চেয়ে বেশি।")
        elif n >= 2 and not beat:
            more = bi("Every part of the year so far was weaker than the same months last year.",
                      "বছরের প্রতিটি অংশেই মুনাফা আগের বছরের একই সময়ের চেয়ে কম।")
        elif slip and beat:
            names_en = _join_en([_quarter_words(fy_end, b["q"])["en"] for b in slip])
            names_bn = _join_bn([_quarter_words(fy_end, b["q"])["bn"] for b in slip])
            small = len(slip) == 1 and slip[0]["prev"] and abs(slip[0]["cur"] - slip[0]["prev"]) / abs(slip[0]["prev"]) < 0.05
            more = bi(f"Only {names_en} was {'a little ' if small else ''}weaker than last year.",
                      f"শুধু {names_bn} আগের বছরের চেয়ে {'সামান্য ' if small else ''}কম ছিল।")
        else:
            more = None
        if more:
            head = bi(f"{lead['en']} {more['en']}", f"{lead['bn']} {more['bn']}")

    # P/E on the new year's profit against last year's.
    meaning = []
    ltp = _f(inp.get("ltp"))
    if ltp and fy_eps_cur and fy_eps_cur > 0 and fy_eps_prev and fy_eps_prev > 0 and table and table["done"] >= 4:
        if fy_eps_cur > fy_eps_prev:
            meaning.append(bi("With more profit behind each share, today's price now looks cheaper than it did on last year's profit.",
                              "প্রতিটি শেয়ারের পেছনে মুনাফা বাড়ায়, আগের বছরের তুলনায় আজকের দাম এখন সস্তা দেখাচ্ছে।"))
        elif fy_eps_cur < fy_eps_prev:
            meaning.append(bi("With less profit behind each share, today's price now looks dearer than it did on last year's profit.",
                              "প্রতিটি শেয়ারের পেছনে মুনাফা কমায়, আগের বছরের তুলনায় আজকের দাম এখন বেশি দেখাচ্ছে।"))
    if cash_ytd and cash_ytd["cur"] is not None and cash_ytd["prev"] is not None:
        c, p = cash_ytd["cur"], cash_ytd["prev"]
        if c < 0:
            meaning.append(bi("More cash went out of the business than came in. That is worth watching.",
                              "ব্যবসায় যত নগদ এসেছে, তার চেয়ে বেশি বেরিয়ে গেছে। এটি নজরে রাখার মতো।"))
        elif p > 0 and c >= p * 1.05:
            meaning.append(bi("More real cash came into the business than a year earlier.",
                              "আগের বছরের চেয়ে ব্যবসায় বেশি নগদ টাকা এসেছে।"))
        elif p > 0 and c <= p * 0.95:
            meaning.append(bi("Less real cash came into the business than a year earlier.",
                              "আগের বছরের চেয়ে ব্যবসায় কম নগদ টাকা এসেছে।"))
        else:
            meaning.append(bi("About the same real cash came into the business as a year earlier.",
                              "আগের বছরের মতোই নগদ টাকা ব্যবসায় এসেছে।"))

    nxt = None
    name_en = name_bn = ""
    next_info = _next_results(table, notices, today) if table else None
    if next_info:
        q = next_info["q"]
        nfe = next_info["fy_end"]
        qwords = _quarter_words(nfe, q) if q < 4 else bi("the full year", "পুরো বছর")
        name_en = f"Results for {qwords['en']}" if q < 4 else "Results for the full year"
        name_bn = f"{qwords['bn']}-এর ফল" if q < 4 else "পুরো বছরের ফল"
        # The bar to clear: last year's same quarter (= this table's bar for a
        # new year's Q1, else this year's `prev`).
        bar = None
        if table["done"] >= 4:
            b = next((b for b in bars if b["q"] == q), None)
            bar = (b or {}).get("cur")
        elif q < 4:
            b = next((b for b in bars if b["q"] == q), None)
            bar = (b or {}).get("prev")
        else:
            bar = next((_fin_eps(r) for r in fin if r["_year"] == table["fy_end"].year - 1), None)
            prev_ann = next((a for a in annuals if a["year"] == table["fy_end"].year - 1), None)
            if bar is None and prev_ann:
                bar = _f(prev_ann.get("eps"))
        d_en, d_bn = _day_short(next_info["date"])
        if next_info["date"]:
            when_en = f"The next results, for {qwords['en']}, should come {'around' if next_info['approx'] else 'on'} {d_en}"
            when_bn = f"পরের ফল, {qwords['bn']}-এর, আসার কথা {d_bn}{'-এর কাছাকাছি' if next_info['approx'] else ''}"
        else:
            when_en = f"The next results, for {qwords['en']}, can come any day"
            when_bn = f"পরের ফল, {qwords['bn']}-এর, যেকোনো দিন আসতে পারে"
        if bar is not None and bar > 0:
            what = bi(
                f"{when_en}. To keep growing, profit has to beat the same months last year.",
                f"{when_bn}। মুনাফা বাড়তে থাকলে তা আগের বছরের একই সময়ের চেয়ে বেশি হতে হবে।",
            )
        else:
            what = bi(f"{when_en}.", f"{when_bn}।")
        nxt = {"what": what, "date": _iso(next_info["date"]), "approx": bool(next_info["approx"]),
               "beat": round(bar, 2) if bar is not None else None}

    inside = []
    if both:
        inside.append(bi("How each part of the year compares with last year",
                         "বছরের প্রতিটি অংশ আগের বছরের তুলনায় কেমন"))
    if cash_ytd:
        inside.append(bi("Whether real cash came in with the profit", "মুনাফার সঙ্গে আসল নগদ এসেছে কি না"))
    if nxt:
        inside.append(bi("When the next results come, and what they need to show",
                         "পরের ফল কবে আসবে, আর তাতে কী দেখা দরকার"))
    if not inside:
        inside.append(bi("What the latest results mean for this share", "সর্বশেষ ফল এই শেয়ারের জন্য কী বোঝায়"))

    src_bits_en, src_bits_bn = [], []
    qposts = sorted([r.get("post_date") for r in ((table or {}).get("quarters") or {}).values() if r.get("post_date")])
    if qposts:
        a_en, a_bn = _mon(qposts[0])
        b_en, b_bn = _mon(qposts[-1])
        src_bits_en.append(f"DSE quarterly notices {a_en}{' to ' + b_en if b_en != a_en else ''}")
        src_bits_bn.append(f"ডিএসইর প্রান্তিক নোটিশ, {a_bn}{' থেকে ' + b_bn if b_bn != a_bn else ''}")
    if table and table.get("annual") and table["annual"].get("post_date"):
        e, b = _day(table["annual"]["post_date"])
        src_bits_en.append(f"yearly notice of {e}")
        src_bits_bn.append(f"{b}-এর বার্ষিক নোটিশ")
    if not src_bits_en:
        src_bits_en.append("audited accounts")
        src_bits_bn.append("নিরীক্ষিত বার্ষিক হিসাব")
    src = bi(" · ".join(src_bits_en)[0].upper() + " · ".join(src_bits_en)[1:], " · ".join(src_bits_bn))

    fy_label = (_fy_label(fy_end) if fy_end
                else bi(f"FY{fb_year}", f"{fb_year} অর্থবছর") if fb_year else bi("This year", "এ বছর"))
    return _section(
        "this_year",
        bi("How is this year going?", "এ বছর কেমন যাচ্ছে?"),
        word, tone, head, src,
        free_line=bi("We compare its profit with the same months last year.",
                     "আমরা এর মুনাফাকে আগের বছরের একই সময়ের সঙ্গে তুলনা করি।"),
        inside=inside, meaning=meaning, watch=(nxt or {}).get("what"),
        fy_label=fy_label,
        latest={"headline": headline_latest, "posted": _iso(posted)} if headline_latest else None,
        quarters=[{"q": b["q"], "label": b["label"], "cur": b["cur"], "prev": b["prev"]} for b in bars],
        cash_ytd=cash_ytd,
        next=nxt,
        _pct=pct, _eps=fy_eps_cur, _fy_year=fy_end.year if fy_end else fb_year,
        _full_year=bool((table and table["done"] >= 4 and table.get("annual")) or fb_year),
        _next_label=(bi(name_en, name_bn) if nxt else None),
    )


# ---------------------------------------------------------------- cash

# Cash for every ৳100 of profit is kept within ±৳300: a tiny profit makes the
# ratio meaningless past that (ACTIVEFINE's FY2022 read ৳1,436).
CASH_RATIO_CAP = 300


def _clamp_ratio(v: float) -> int:
    return int(max(-CASH_RATIO_CAP, min(CASH_RATIO_CAP, round(v))))


def build_cash(inp: dict, this_year: Optional[dict] = None) -> Optional[dict]:
    if inp.get("sector_class") in _FINANCIALS:
        return None
    notices = inp.get("notices") or {}
    years: dict[int, tuple[float, str]] = {}
    for r in inp.get("extended_financials") or []:
        try:
            y = int(r.get("year"))
        except (TypeError, ValueError):
            continue
        np_, ocf = _f(r.get("net_profit")), _f(r.get("operating_cf"))
        if np_ and np_ > 0 and ocf is not None:
            years[y] = (_clamp_ratio(ocf / np_ * 100.0), "accounts")
    for a in _annuals(notices):
        eps, nc = _f(a.get("eps")), _f(a.get("nocfps"))
        if a["year"] not in years and eps and eps > 0 and nc is not None:
            years[a["year"]] = (_clamp_ratio(nc / eps * 100.0), "notice")
    if len(years) < 2:
        return None
    ys = sorted(years)[-6:]
    rows = [{"year": y, "ratio": years[y][0], "basis": years[y][1]} for y in ys]
    latest = rows[-1]
    earlier = [r["ratio"] for r in rows[:-1]]
    usual = round(statistics.median(earlier)) if earlier else None

    lat = latest["ratio"]
    # The question is "Is the profit real cash?", so the word answers it.
    if lat < 0:
        word, tone = bi("No", "না"), "bad"
    elif lat < CASH_WEAK_RATIO:
        word, tone = (bi("Partly", "আংশিক"), "fair") if (usual or 0) >= CASH_STRONG_RATIO else (bi("Not much", "খুব একটা না"), "bad")
    elif lat < CASH_STRONG_RATIO:
        word, tone = bi("Mostly", "বেশির ভাগ"), "fair"
    else:
        word, tone = bi("Yes", "হ্যাঁ"), "good"

    # Plain words (2026-10-30): how much of the profit came in as money, in
    # words people use, then how that compares with its usual year.
    if lat < 0:
        head = bi("More cash went out of the business than came in this year, even though it showed a profit.",
                  "এ বছর মুনাফা দেখালেও ব্যবসায় যত নগদ এসেছে, তার চেয়ে বেশি বেরিয়ে গেছে।")
    else:
        part_en, part_bn = (
            ("all of the profit it showed came in as real money", "দেখানো পুরো মুনাফাই আসল নগদ টাকা হয়ে এসেছে") if lat >= 100
            else ("almost all of the profit it showed came in as real money", "দেখানো মুনাফার প্রায় পুরোটাই আসল নগদ টাকা হয়ে এসেছে") if lat >= 80
            else ("most of the profit it showed came in as real money", "দেখানো মুনাফার বেশির ভাগ আসল নগদ টাকা হয়ে এসেছে") if lat >= 60
            else ("about half of the profit it showed came in as real money", "দেখানো মুনাফার প্রায় অর্ধেক আসল নগদ টাকা হয়ে এসেছে") if lat >= 45
            else ("less than half of the profit it showed came in as real money", "দেখানো মুনাফার অর্ধেকেরও কম আসল নগদ টাকা হয়ে এসেছে") if lat >= 25
            else ("only a small part of the profit it showed came in as real money", "দেখানো মুনাফার সামান্য অংশই আসল নগদ টাকা হয়ে এসেছে")
        )
        cmp_en = cmp_bn = ""
        if usual is not None and lat < usual - 10:
            cmp_en, cmp_bn = " That is less than in its usual year.", " সাধারণ বছরের চেয়ে এটি কম।"
        elif usual is not None and lat > usual + 10 and lat < 100:
            cmp_en, cmp_bn = " That is better than in its usual year.", " সাধারণ বছরের চেয়ে এটি ভালো।"
        head = bi(f"This year {part_en}.{cmp_en}", f"এ বছর {part_bn}।{cmp_bn}")

    meaning = []
    gap_rise: Optional[float] = None
    # The latest year from the yearly notice: profit up while cash per share down.
    ann = _annuals(notices)
    a0 = ann[0] if ann else None
    if a0 and a0["year"] == latest["year"]:
        e, ep, c, cp = (_f(a0.get(k)) for k in ("eps", "eps_prev", "nocfps", "nocfps_prev"))
        if e and ep and ep > 0 and c is not None and cp and cp > 0:
            pr = (e - ep) / ep * 100.0
            cr = (c - cp) / cp * 100.0
            if pr > 0 and cr < 0:
                gap_rise = pr
                meaning.append(bi(
                    "Profit went up, but the cash coming in went down. This happens when goods pile up unsold or customers pay late.",
                    "মুনাফা বেড়েছে, কিন্তু নগদ আসা কমেছে। পণ্য বিক্রি না হয়ে জমে থাকলে বা গ্রাহক দেরিতে টাকা দিলে এমন হয়।",
                ))
                # Where the gap opened: the last quarter (full year less nine months).
                q3 = next((r for r in _interims(notices) if int(r.get("quarter") or 0) == 3
                           and _fy_end_of(r).year == latest["year"]), None)
                if q3:
                    n9, n9p = _f(q3.get("nocfps_cum")), _f(q3.get("nocfps_cum_prev"))
                    if n9 is not None and n9p is not None:
                        q4, q4p = c - n9, cp - n9p
                        if q4 < q4p:
                            fe = _fy_end_of(q3)
                            qw = _quarter_words(fe, 4)
                            meaning.append(bi(
                                f"Most of the drop came in {qw['en']}.",
                                f"কমার বেশির ভাগটা হয়েছে {qw['bn']} সময়ে।",
                            ))
            elif pr > 0 and cr >= 0:
                meaning.append(bi(
                    "Profit and the cash coming in both went up. That is a healthy sign.",
                    "মুনাফা আর নগদ আসা, দুটোই বেড়েছে। এটি ভালো লক্ষণ।",
                ))
    if tone in ("fair", "bad"):
        meaning.append(bi(
            "A company can show a profit before the money reaches it. If this happens two years in a row, we treat it as a red flag.",
            "টাকা হাতে আসার আগেই কোম্পানি মুনাফা দেখাতে পারে। পরপর দুই বছর এমন হলে আমরা এটিকে বড় সতর্কতা ধরি।",
        ))
    else:
        meaning.append(bi(
            "Real cash is much harder to fake than profit on paper, so this backs up the profit it shows.",
            "কাগজের মুনাফার চেয়ে আসল নগদ টাকা সাজিয়ে দেখানো অনেক কঠিন, তাই এটি দেখানো মুনাফাকে সমর্থন করে।",
        ))

    watch = None
    nxt = (this_year or {}).get("next") if this_year else None
    if nxt and nxt.get("date"):
        d_en, d_bn = _day_short(nxt["date"])
        watch = bi(f"We check this again when the next results come, around {d_en}.",
                   f"পরের ফল এলে, {d_bn}-এর কাছাকাছি, আমরা এটি আবার দেখব।")

    acc = [r["year"] for r in rows if r["basis"] == "accounts"]
    note = [r["year"] for r in rows if r["basis"] == "notice"]
    src_en, src_bn = [], []
    if acc:
        src_en.append(f"Audited accounts FY{acc[0]}" + (f" to FY{acc[-1]}" if acc[-1] != acc[0] else ""))
        src_bn.append(f"নিরীক্ষিত বার্ষিক হিসাব {acc[0]}" + (f" থেকে {acc[-1]}" if acc[-1] != acc[0] else ""))
    if note:
        src_en.append("DSE notice for FY" + ", FY".join(str(y) for y in note))
        src_bn.append("ডিএসই নোটিশ, " + ", ".join(f"{y} অর্থবছর" for y in note))

    return _section(
        "cash",
        bi("Is the profit real?", "মুনাফা কি আসল?"),
        word, tone, head, bi(" · ".join(src_en), " · ".join(src_bn)),
        free_line=bi("We check whether the profit it shows comes in as real money.",
                     "কোম্পানি যে মুনাফা দেখায়, তা আসল নগদ টাকা হয়ে আসছে কি না, আমরা তা দেখি।"),
        inside=[
            bi(f"How much of its profit came in as real money, year by year for {len(rows)} years",
               f"{len(rows)} বছর ধরে প্রতি বছর মুনাফার কতটা আসল নগদ হয়ে এসেছে"),
            bi("Whether this year is better or worse than usual", "এ বছর সাধারণ বছরের চেয়ে ভালো না খারাপ"),
            bi("What would make it a red flag", "কী হলে এটি বড় সতর্কতা হবে"),
        ],
        meaning=meaning, watch=watch,
        years=rows, usual=usual,
        _gap_rise=gap_rise,
    )


# ---------------------------------------------------------------- price

def _pe_history(fin: list[dict]) -> list[float]:
    return [v for v in (_f(r.get("pe_ratio_basic")) for r in fin) if v is not None and 0 < v < 200]


def _eps_growth(fin: list[dict], eps_now: Optional[float]) -> float:
    """Recent EPS growth a year, as a fraction clamped to 0–15%."""
    rows = [(r["_year"], _fin_eps(r)) for r in fin if _fin_eps(r) is not None]
    g = None
    if len(rows) >= 3:
        (y0, e0), (y1, e1) = rows[0], rows[-1]
        c = _cagr(e0, e1, y1 - y0)
        if c is not None:
            g = c / 100.0
    if g is None and len(rows) >= 2:
        (_, e0), (_, e1) = rows[-2], rows[-1]
        if _pos(e0) and _pos(e1):
            g = e1 / e0 - 1.0
    g = 0.0 if g is None else g
    return max(0.0, min(SCEN_GROWTH_CAP, g))


# The signal's near-the-top line (signal_service.NEAR_HIGH_PCT): past this
# share of its yearly range a Buy turns to "not yet".
NEAR_HIGH_PCT = 85.0


def _near_top(inp: dict) -> Optional[float]:
    """The near-the-top line as a price, from the yearly range."""
    rng = inp.get("range52") or {}
    hi, lo = _f(rng.get("hi")), _f(rng.get("lo"))
    return _round_price(lo + (hi - lo) * NEAR_HIGH_PCT / 100.0) if (hi and lo and hi > lo) else None


def build_price(inp: dict) -> Optional[dict]:
    from backend.services.stock_facts import valuation_verdict

    row = inp.get("score_row") or {}
    ltp = _f(inp.get("ltp"))
    if not ltp:
        return None
    fv = inp.get("fair_value") or None
    fall = inp.get("fair_value_fall") or None
    fin = _sorted_fin(inp.get("financials") or [])

    verdict = valuation_verdict(row.get("p4_val"))
    if verdict == "cheap":
        word, tone = bi("Low", "কম"), "good"
        free = bi(f"At {money(ltp)} today, we think the share costs less than the company is worth.",
                  f"আজকের {money(ltp)} দামে আমাদের মতে শেয়ারটির দাম কোম্পানির মূল্যের চেয়ে কম।")
    elif verdict == "expensive":
        word, tone = bi("High", "বেশি"), "fair"
        free = bi(f"At {money(ltp)} today, we think the share costs more than the company is worth.",
                  f"আজকের {money(ltp)} দামে আমাদের মতে শেয়ারটির দাম কোম্পানির মূল্যের চেয়ে বেশি।")
    elif verdict == "fair":
        word, tone = bi("Fair", "ঠিকঠাক"), "neutral"
        free = bi(f"At {money(ltp)} today, we think the price is about right for the company.",
                  f"আজকের {money(ltp)} দামে আমাদের মতে দামটি কোম্পানির জন্য মোটামুটি ঠিক।")
    else:
        word, tone = bi("Not rated", "রেটিং নেই"), "neutral"
        free = bi(f"Today {money(ltp)}.", f"আজকের দাম {money(ltp)}।")

    fair = None
    methods = []
    gap = buy_below = None
    profit_fall = None
    if fv and fv.get("center") and not fv.get("estimates_disagree"):
        fair = {"low": _f(fv["low"]), "high": _f(fv["high"]), "center": _f(fv["center"])}
        methods = [{"label": bi(m.get("label_en") or "", m.get("label_bn") or m.get("label_en") or ""),
                    "price": _f(m.get("price"))} for m in fv.get("methods") or [] if _f(m.get("price"))]
        methods.sort(key=lambda m: m["price"])
        gap = round((ltp - fair["center"]) / fair["center"] * 100.0)
        buy_below = _round_price(fair["center"] * (1 - BUY_BELOW_MARGIN))
        # Never above the price where the signal stops saying Buy (2026-10-30:
        # "buy under ৳234" sat beside "past ৳227 we'd stop calling it a Buy").
        top = _near_top(inp)
        if top and buy_below and buy_below > top:
            buy_below = top
        if fall and _f(fall.get("center")):
            profit_fall = {"pct": round(PROFIT_FALL * 100), "center": _f(fall["center"])}

    pe_now = _f(row.get("current_pe"))
    pe_now = pe_now if pe_now and pe_now > 0 else None
    usual = _f(row.get("own_avg_pe"))
    usual = usual if usual and usual > 0 else None
    sector_pe = _f(row.get("sector_median_pe"))
    sector_pe = sector_pe if sector_pe and sector_pe > 0 else None

    # Three "if this, then that" prices. Never one target.
    scenarios = []
    eps = _f(row.get("eps"))
    hist = _pe_history(fin)
    if eps and eps > 0 and len(hist) >= MIN_PE_YEARS:
        today_pe = ltp / eps
        g = _eps_growth(fin, eps)
        gp = round(g * 100)
        bear_pe = min(today_pe, min(hist))
        usual_pe = usual or statistics.median(hist)
        bull_pe = usual_pe if usual_pe > today_pe * 1.05 else max(hist)
        if bull_pe > today_pe * 1.02:
            bear = eps * (1 + SCEN_BEAR_EPS) * bear_pe
            base = eps * (1 + g) * today_pe
            bull = eps * (1 + g) * bull_pe
            grow_en = f"If profit grows {gp}%" if gp > 0 else "If profit stays the same"
            grow_bn = f"মুনাফা {gp}% বাড়লে" if gp > 0 else "মুনাফা একই থাকলে"
            bull_is_usual = abs(bull_pe - usual_pe) < 1e-9
            # Plain words (2026-10-30): "if this happens", never "P/E".
            fall_pct = abs(round(SCEN_BEAR_EPS * 100))
            scenarios = [
                {"label": bi(f"If profit falls {fall_pct}%", f"মুনাফা {fall_pct}% কমলে"),
                 "price": _round_price(bear)},
                {"label": bi(f"{grow_en} and the price keeps pace", f"{grow_bn}, আর দামও সেই হারে বাড়লে"),
                 "price": _round_price(base)},
                {"label": bi(f"{grow_en} and the share goes back to its usual price" if bull_is_usual
                             else f"{grow_en} and the share reaches its best price of recent years",
                             f"{grow_bn}, আর শেয়ারটি তার স্বাভাবিক দামে ফিরলে" if bull_is_usual
                             else f"{grow_bn}, আর শেয়ারটি সাম্প্রতিক বছরের সেরা দামে উঠলে"),
                 "price": _round_price(bull)},
            ]

    # Plain words (2026-10-30). "P/E" is said as "years of its profit you pay
    # for": a P/E of 7.5 means today's price equals about 7.5 years of profit.
    def vs(a: float, b: float) -> Optional[tuple[str, str]]:
        r = a / b
        return (("much cheaper", "অনেক সস্তা") if r < 0.77 else ("cheaper", "সস্তা") if r < 0.92
                else ("much dearer", "অনেক দামি") if r > 1.3 else ("dearer", "দামি") if r > 1.08 else None)

    cmp_usual = vs(pe_now, usual) if (pe_now and usual) else None
    cmp_sector = vs(pe_now, sector_pe) if (pe_now and sector_pe) else None
    if pe_now and (usual or sector_pe):
        bits_en, bits_bn = [], []
        if usual:
            bits_en.append(f"{cmp_usual[0]} than it usually is" if cmp_usual else "about its usual price")
            bits_bn.append(f"সাধারণ সময়ের চেয়ে {cmp_usual[1]}" if cmp_usual else "সাধারণ সময়ের মতোই")
        if sector_pe:
            bits_en.append(f"{cmp_sector[0]} than similar companies" if cmp_sector else "about the same as similar companies")
            bits_bn.append(f"একই ধরনের কোম্পানির চেয়ে {cmp_sector[1]}" if cmp_sector else "একই ধরনের কোম্পানির মতোই")
        compare = bi(f"For the profit it makes, the share is {_join_en(bits_en)}.",
                     f"মুনাফার তুলনায় শেয়ারটি {_join_bn(bits_bn)}।")
    else:
        compare = None

    if fair:
        if ltp < fair["low"]:
            where = bi(f"At {money(ltp)} today, it is cheaper than that.", f"আজকের {money(ltp)} দাম তার চেয়েও কম।")
        elif ltp > fair["high"]:
            where = bi(f"At {money(ltp)} today, it costs more than that.", f"আজকের {money(ltp)} দাম তার চেয়ে বেশি।")
        else:
            where = bi(f"At {money(ltp)} today, it is inside that range.", f"আজকের {money(ltp)} দাম এর মধ্যেই।")
        head = bi(f"We think a fair price is between {money(fair['low'])} and {money(fair['high'])}. {where['en']}",
                  f"আমাদের হিসাবে ন্যায্য দাম {money(fair['low'])} থেকে {money(fair['high'])}। {where['bn']}")
    elif compare:
        head = compare
    else:
        head = bi("It made no profit in its latest results, so we can't say whether the price is fair.",
                  "সর্বশেষ ফলে কোনো মুনাফা নেই, তাই দাম ন্যায্য কি না বলা যায় না।")

    meaning = []
    if fair and compare:
        meaning.append(compare)
    if pe_now:
        yrs_en = f"At today's price you pay for about {pe_now:.0f} years of its profit"
        yrs_bn = f"আজকের দামে আপনি এর প্রায় {pe_now:.0f} বছরের মুনাফার দাম দিচ্ছেন"
        if usual:
            yrs_en += f"; it usually costs about {usual:.0f} years' worth"
            yrs_bn += f"; সাধারণত লাগে প্রায় {usual:.0f} বছরের"
        meaning.append(bi(yrs_en + ". Fewer years means a cheaper share.", yrs_bn + "। কম বছর মানে শেয়ারটি সস্তা।"))
    if fv and fv.get("estimates_disagree"):
        meaning.append(bi(
            "Our different ways of valuing it disagree for this share, so we don't show one fair price.",
            "এই শেয়ারের মূল্য হিসাবের আমাদের উপায়গুলো একমত নয়, তাই একটি ন্যায্য দাম দেখাচ্ছি না।",
        ))
    if profit_fall:
        below = ltp < profit_fall["center"]
        meaning.append(bi(
            "Even if its profit fell by a fifth, today's price would still be below what we think it is worth." if below
            else "If its profit fell by a fifth, today's price would be more than what we think it is worth.",
            "মুনাফা এক-পঞ্চমাংশ কমলেও আজকের দাম আমাদের হিসাবের মূল্যের নিচে থাকবে।" if below
            else "মুনাফা এক-পঞ্চমাংশ কমলে আজকের দাম আমাদের হিসাবের মূল্যের চেয়ে বেশি হয়ে যাবে।",
        ))
    if scenarios:
        meaning.append(bi(
            "The three prices for next year are simple sums from its profit, not a forecast.",
            "আগামী বছরের তিনটি দাম এর মুনাফা থেকে করা সাধারণ হিসাব, পূর্বাভাস নয়।",
        ))

    watch = None
    if fair and buy_below:
        watch = bi(f"We would call it a good buy under {money(buy_below)}. That leaves room in case we are wrong.",
                   f"{money(buy_below)}-এর নিচে কেনা ভালো বলে মনে করি। আমাদের হিসাবে ভুল হলেও তাতে কিছুটা নিরাপত্তা থাকে।")

    inside = []
    if fair:
        n = len(methods)
        inside.append(bi(f"What we think a fair price is, worked out {n} {'way' if n == 1 else 'ways'}",
                         f"{n}টি উপায়ে হিসাব করা ন্যায্য দাম"))
        inside.append(bi("The price we would buy under, with a one-tap alert", "কোন দামের নিচে কেনা ভালো, এক ট্যাপে অ্যালার্টসহ"))
    if scenarios:
        inside.append(bi("Where the price could be in a year, in three cases",
                         "এক বছর পর দাম কোথায় থাকতে পারে, তিনটি অবস্থায়"))
    elif profit_fall:
        inside.append(bi("What happens to its value if profit falls", "মুনাফা কমলে এর মূল্যের কী হয়"))
    if not inside:
        inside.append(bi("How the price compares with its past and its sector", "দামটি এর অতীত আর সেক্টরের তুলনায় কেমন"))

    years = [r["_year"] for r in fin if _f(r.get("pe_ratio_basic"))]
    src_en = (f"Its price against profit, FY{years[0]} to FY{years[-1]}" if len(years) > 1 else "Its price against profit")
    src_bn = (f"মুনাফার তুলনায় এর দাম, {years[0]} থেকে {years[-1]}" if len(years) > 1 else "মুনাফার তুলনায় এর দাম")
    if inp.get("sector"):
        src_en += f" · the middle of the {inp['sector']} sector"
        src_bn += f" · {inp.get('sector_bn') or inp['sector']} সেক্টরের মাঝামাঝি"
    if inp.get("as_of"):
        e, b = _day_short(inp["as_of"])
        src_en += f" · close of {e}"
        src_bn += f" · {b}-এর শেষ দাম"

    return _section(
        "price",
        bi("Is today's price right?", "আজকের দাম কি ঠিক আছে?"),
        word, tone, head, bi(src_en, src_bn),
        free_line=free, inside=inside, meaning=meaning, watch=watch,
        today=ltp, fair=fair, methods=methods, gap_pct=gap, buy_below=buy_below,
        profit_fall=profit_fall, scenarios=scenarios,
        pe={"now": round(pe_now, 2) if pe_now else None, "usual": round(usual, 2) if usual else None,
            "sector": round(sector_pe, 2) if sector_pe else None},
        _verdict=verdict,
    )


# ---------------------------------------------------------------- dividend

def _div_history(inp: dict) -> dict[int, float]:
    """{fiscal year: cash dividend ৳ a share} — the company page's list, with the
    ledger's sum of interim + final for the years it has."""
    face = _f(inp.get("face_value")) or 10.0
    out: dict[int, float] = {}
    for pair in (inp.get("company") or {}).get("cash_dividends") or []:
        try:
            y, pct = int(pair[0]), _f(pair[1])
        except (TypeError, ValueError, IndexError):
            continue
        if pct is not None:
            out[y] = round(pct * face / 100.0, 2)
    ledger: dict[int, float] = {}
    for d in inp.get("ledger") or []:
        pe = _d(d.get("period_end"))
        cash = _f(d.get("cash_pct"))
        if pe is None or cash is None:
            continue
        ledger[pe.year] = ledger.get(pe.year, 0.0) + cash
    for y, pct in ledger.items():
        out[y] = round(pct * face / 100.0, 2)
    return out


def _eps_by_year(inp: dict) -> dict[int, float]:
    out = {}
    for r in _sorted_fin(inp.get("financials") or []):
        e = _fin_eps(r)
        if e is not None:
            out[r["_year"]] = e
    for a in _annuals(inp.get("notices") or {}):
        e = _f(a.get("eps"))
        if e is not None:
            out[a["year"]] = e
        ep = _f(a.get("eps_prev"))
        if ep is not None and (a["year"] - 1) not in out:
            out[a["year"] - 1] = ep
    return out


def _latest_declaration(inp: dict) -> Optional[dict]:
    from backend.services.corporate_actions_service import NORMAL_BUY_LEAD_DAYS, SPOT_WINDOW_DAYS, _minus_trading_days

    today = inp["today"]
    face = _f(inp.get("face_value")) or 10.0
    ltp = _f(inp.get("ltp"))
    cal = inp.get("calendar_row") or None
    src = None
    if cal:
        src = {"record_date": cal.get("record_date"), "agm_date": cal.get("agm_date"),
               "cash_pct": cal.get("cash_pct"), "stock_pct": cal.get("stock_pct"),
               "dividend_type": cal.get("dividend_type"), "period_end": cal.get("period_end"),
               "declaration_date": cal.get("declaration_date"), "buy_by": cal.get("buy_by"),
               "spot_starts": cal.get("spot_starts"), "yield_pct": cal.get("yield_pct"),
               "cash_ps": cal.get("cash_per_share")}
    else:
        ledger = sorted(inp.get("ledger") or [], key=lambda d: _d(d.get("declaration_date")) or date.min, reverse=True)
        if not ledger:
            return None
        d = ledger[0]
        cash_pct = _f(d.get("cash_pct"))
        if cash_pct is None:
            cash_pct = _f(d.get("dividend_pct"))
        src = {k: d.get(k) for k in ("record_date", "agm_date", "stock_pct", "dividend_type",
                                     "period_end", "declaration_date")}
        src["cash_pct"] = cash_pct
        cps = round(cash_pct * face / 100.0, 4) if cash_pct else None
        src["cash_ps"] = cps
        src["yield_pct"] = round(cps / ltp * 100.0, 2) if cps and ltp else None
        rd = _d(d.get("record_date"))
        if rd:
            src["buy_by"] = _minus_trading_days(rd, NORMAL_BUY_LEAD_DAYS).isoformat()
            src["spot_starts"] = _minus_trading_days(rd, SPOT_WINDOW_DAYS).isoformat()
    rd = _d(src.get("record_date"))
    kind_raw = (src.get("dividend_type") or "").strip().lower()
    kind = bi("Interim", "অন্তর্বর্তী") if kind_raw.startswith("interim") else bi("Final", "চূড়ান্ত")
    pe = _d(src.get("period_end"))
    return {
        "fy": pe.year if pe else None,
        "cash_ps": _f(src.get("cash_ps")),
        "cash_pct": _f(src.get("cash_pct")),
        "stock_pct": _f(src.get("stock_pct")),
        "kind": kind,
        "record_date": _iso(rd),
        "buy_by": _iso(src.get("buy_by")),
        "agm_date": _iso(src.get("agm_date")),
        "yield_pct": _f(src.get("yield_pct")),
        "upcoming": bool(rd and rd >= today),
        "_spot": _iso(src.get("spot_starts")),
        "_declared": _iso(src.get("declaration_date")),
    }


def build_dividend(inp: dict, growth: float = 0.0) -> Optional[dict]:
    notices = inp.get("notices") or {}
    ltp = _f(inp.get("ltp"))
    latest = _latest_declaration(inp)
    hist = _div_history(inp)
    if not hist and not latest:
        return None
    years = sorted(hist)[-DIV_HISTORY_YEARS:]
    history = [{"year": y, "cash_ps": hist[y]} for y in years]
    paid = [h for h in history if h["cash_ps"] > 0]

    # Word from the last two years of cash.
    cur_y = years[-1] if years else None
    cur = hist.get(cur_y) if cur_y else None
    prev = hist.get(cur_y - 1) if cur_y else None
    stock_only = latest and not latest.get("cash_ps") and (latest.get("stock_pct") or 0) > 0
    if stock_only and not cur:
        word, tone = bi("Bonus only", "শুধু বোনাস"), "neutral"
    elif not cur:
        if prev:
            word, tone = bi("Cut", "বন্ধ"), "bad"
        else:
            word, tone = bi("None", "নেই"), "neutral"
    elif not prev:
        word, tone = bi("Rising", "বাড়ছে"), "good"
    elif cur > prev * 1.02:
        word, tone = bi("Rising", "বাড়ছে"), "good"
    elif cur >= prev * 0.98:
        word, tone = bi("Steady", "স্থির"), "good"
    elif cur >= prev * 0.75:
        word, tone = bi("Falling", "কমছে"), "fair"
    else:
        word, tone = bi("Cut", "কমেছে অনেক"), "bad"

    eps_y = _eps_by_year(inp)
    payout = None
    if cur and cur_y in eps_y and eps_y[cur_y] and eps_y[cur_y] > 0:
        payout = round(cur / eps_y[cur_y] * 100.0, 1)
    cash_cover = None
    nocf = None
    for a in _annuals(notices):
        if a["year"] == cur_y and _f(a.get("nocfps")) is not None:
            nocf = _f(a.get("nocfps"))
            break
    if nocf is None:
        for r in inp.get("extended_financials") or []:
            if str(r.get("year")) == str(cur_y) and _f(r.get("nocfps")) is not None:
                nocf = _f(r.get("nocfps"))
    if cur and nocf is not None and inp.get("sector_class") not in _LENDERS:
        cash_cover = round(nocf / cur, 2)

    # Next year's likely range at the usual payout.
    next_range = None
    payouts = [hist[y] / eps_y[y] for y in sorted(hist)[::-1]
               if hist.get(y) and eps_y.get(y) and eps_y[y] > 0][:3]
    eps_now = eps_y.get(cur_y) if cur_y else None
    if payouts and eps_now and eps_now > 0:
        usual_payout = statistics.median(payouts)
        lo = usual_payout * eps_now
        hi = usual_payout * eps_now * (1 + growth)
        if lo > 0:
            next_range = {"low": round(lo, 2), "high": round(max(lo, hi), 2), "_payout": usual_payout}

    cps = (latest or {}).get("cash_ps") or cur
    on_10k = None
    tax = DIV_TAX_PCT / 100.0
    if cps and ltp and ltp > 0:
        sh = int(10000 // ltp)
        if sh >= 1:
            gross = round(sh * cps, 2)
            on_10k = {"shares": sh, "gross": gross, "net": round(gross * (1 - tax), 2)}

    # Past record dates: the close before vs the first close after.
    series = _price_series(inp.get("prices") or [])
    face = _f(inp.get("face_value")) or 10.0
    rec_rows = []
    seen = set()
    for d in sorted(inp.get("ledger") or [], key=lambda x: _d(x.get("record_date")) or date.min, reverse=True):
        rd = _d(d.get("record_date"))
        cash_pct = _f(d.get("cash_pct"))
        if not rd or rd >= inp["today"] or not cash_pct or rd in seen:
            continue
        seen.add(rd)
        before = [p for dd, p in series if dd < rd]
        after = [(dd, p) for dd, p in series if dd > rd]
        if not before or not after or (after[0][0] - rd).days > 10:
            continue
        pb, pa = before[-1], after[0][1]
        c = round(cash_pct * face / 100.0, 2)
        net = round(c * (1 - tax), 2)
        move = round(pa - pb, 2)
        fees = round((pb + pa) * FEE_PCT / 100.0, 2)
        # Bonus shares: the price drop is spread over more shares, so their value
        # at the new price counts towards what the buyer kept.
        bonus = _f(d.get("stock_pct")) or 0.0
        bonus_value = round(pa * bonus / 100.0, 2) if bonus > 0 else 0.0
        rec_rows.append({"date": rd.isoformat(), "cash_ps": c, "net_ps": net, "price_before": pb,
                         "price_after": pa, "move": move, "kept_ps": round(net + move + bonus_value, 2),
                         "fees_ps": fees, "bonus_pct": bonus or None})
        if len(rec_rows) >= RECORD_HISTORY:
            break

    # Headline.
    if not cur:
        head = (bi("It gave bonus shares, not cash, for its latest year.", "সর্বশেষ বছরে নগদ নয়, বোনাস শেয়ার দিয়েছে।")
                if stock_only else
                bi("It paid no cash dividend for its latest year.", "সর্বশেষ বছরে কোনো নগদ ডিভিডেন্ড দেয়নি।"))
    else:
        # Plain words (2026-10-30): did the dividend go up or down, then is it
        # safe — said as a share of profit in words, never "42% payout,
        # covered 1.4 times".
        if prev and cur < prev * 0.98:
            change = bi(f"It cut its cash dividend this year, from {tk2(prev)} to {tk2(cur)} a share.",
                        f"এ বছর নগদ ডিভিডেন্ড কমিয়েছে, শেয়ারপ্রতি {tk2(prev)} থেকে {tk2(cur)}।")
        elif prev and cur > prev * 1.02:
            change = bi(f"It raised its cash dividend this year, to {tk2(cur)} a share.",
                        f"এ বছর নগদ ডিভিডেন্ড বাড়িয়ে শেয়ারপ্রতি {tk2(cur)} করেছে।")
        else:
            change = bi(f"It paid {tk2(cur)} a share in cash this year.", f"এ বছর শেয়ারপ্রতি {tk2(cur)} নগদ দিয়েছে।")
        if payout is not None and payout > 100:
            safe = bi("It paid out more than it earned, which it cannot keep doing.",
                      "আয়ের চেয়ে বেশি দিয়েছে, যা বেশি দিন চালানো যায় না।")
        elif cash_cover is not None and cash_cover < 1:
            safe = bi("The cash the business brought in was not enough to pay it all.",
                      "ব্যবসায় যে নগদ এসেছে, তা দিয়ে পুরো ডিভিডেন্ড দেওয়া যায়নি।")
        elif payout is not None and payout >= 70:
            safe = bi("It gives away most of its profit, so little is left to grow the business.",
                      "মুনাফার বেশির ভাগই দিয়ে দেয়, তাই ব্যবসা বাড়ানোর জন্য কম থাকে।")
        elif payout is not None:
            share_en, share_bn = (
                ("about a third of its profit or less", "মুনাফার প্রায় এক-তৃতীয়াংশ বা তার কম") if payout < 36
                else ("less than half of its profit", "মুনাফার অর্ধেকের কম") if payout < 46
                else ("about half of its profit", "মুনাফার প্রায় অর্ধেক") if payout < 56
                else ("a little more than half of its profit", "মুনাফার অর্ধেকের কিছু বেশি")
            )
            cash_en = " and the cash it earned easily pays for it" if (cash_cover or 0) >= 1.3 else ""
            cash_bn = ", আর আয় করা নগদ দিয়ে তা সহজেই দেওয়া যায়" if (cash_cover or 0) >= 1.3 else ""
            safe = bi(f"The dividend looks safe: it pays out {share_en}{cash_en}.",
                      f"ডিভিডেন্ড নিরাপদ দেখাচ্ছে: {share_bn} দেয়{cash_bn}।")
        else:
            safe = None
        head = bi(change["en"] + (f" {safe['en']}" if safe else ""), change["bn"] + (f" {safe['bn']}" if safe else ""))

    meaning = []
    if on_10k:
        meaning.append(bi(
            f"If you put ৳10,000 in today, it would pay you about {money(on_10k['net'])} a year in cash, after tax.",
            f"আজ ৳10,000 বিনিয়োগ করলে কর বাদে বছরে প্রায় {money(on_10k['net'])} নগদ পাবেন।",
        ))
    if rec_rows:
        r = rec_rows[0]
        m_en, m_bn = _mon(r["date"])
        # Did buying just before the record date, only for the dividend, pay?
        if r["kept_ps"] > r["fees_ps"]:
            meaning.append(bi(
                f"Last time, in {m_en}, the price held up after the record date, so someone who bought only for the dividend came out ahead.",
                f"গতবার, {m_bn}-এ, রেকর্ড ডেটের পরেও দাম টিকে ছিল, তাই শুধু ডিভিডেন্ডের জন্য কেনা ক্রেতা লাভে ছিলেন।",
            ))
        else:
            meaning.append(bi(
                f"Last time, in {m_en}, the price dropped by about as much as the dividend after the record date. "
                "Buying just to collect the dividend did not pay once fees were counted.",
                f"গতবার, {m_bn}-এ, রেকর্ড ডেটের পর দাম প্রায় ডিভিডেন্ডের সমান কমেছিল। "
                "খরচ ধরলে শুধু ডিভিডেন্ড পেতে কেনায় লাভ হয়নি।",
            ))
    if next_range:
        p = next_range["_payout"] * 100
        lo, hi = next_range["low"], next_range["high"]
        rng_en = f"about {_tk_est(lo)}" + (f" to {_tk_est(hi)}" if _tk_est(hi) != _tk_est(lo) else "")
        rng_bn = f"প্রায় {_tk_est(lo)}" + (f" থেকে {_tk_est(hi)}" if _tk_est(hi) != _tk_est(lo) else "")
        meaning.append(bi(
            f"If profit holds, next year's dividend could be {rng_en} a share.",
            f"মুনাফা একই থাকলে আগামী বছরের ডিভিডেন্ড হতে পারে শেয়ারপ্রতি {rng_bn}।",
        ))

    watch = None
    if latest and latest["upcoming"] and latest.get("cash_ps") and latest.get("buy_by"):
        b_en, b_bn = _day(latest["buy_by"])
        r_en, r_bn = _day(latest["record_date"])
        watch = bi(f"To get the {tk2(latest['cash_ps'])} a share, buy by {b_en}. You must own the shares on the record date, {r_en}.",
                   f"শেয়ারপ্রতি {tk2(latest['cash_ps'])} পেতে {b_bn}-এর মধ্যে কিনুন। রেকর্ড ডেট {r_bn}-এ শেয়ার আপনার কাছে থাকতে হবে।")

    n_paid = len([h for h in history[-10:] if h["cash_ps"] > 0])
    n_years = len(history[-10:])
    free = bi(f"It has paid a cash dividend in {n_paid} of the last {n_years} years.",
              f"গত {n_years} বছরের মধ্যে {n_paid} বছর নগদ ডিভিডেন্ড দিয়েছে।") if n_years else None

    inside = []
    if cps:
        inside.append(bi(f"What the {tk2(cps)} dividend is really worth to you after tax",
                         f"কর বাদে {tk2(cps)} ডিভিডেন্ড আপনার জন্য আসলে কত"))
    inside.append(bi("Whether the dividend is safe", "ডিভিডেন্ড নিরাপদ কি না"))
    inside.append(bi("What next year's dividend could be", "আগামী বছরের ডিভিডেন্ড কত হতে পারে"))

    src_en, src_bn = [], []
    if latest and latest.get("_declared"):
        e, b = _day(latest["_declared"])
        src_en.append(f"DSE notice of {e}")
        src_bn.append(f"{b}-এর ডিএসই নোটিশ")
    src_en.append("dividend ledger")
    src_bn.append("ডিভিডেন্ডের হিসাব")
    if rec_rows:
        e, b = _day(rec_rows[0]["date"])
        src_en.append(f"prices around the {e} record date")
        src_bn.append(f"{b} রেকর্ড ডেটের আশপাশের দাম")
    src_txt_en = " · ".join(src_en)
    src_txt_en = src_txt_en[0].upper() + src_txt_en[1:]

    out_latest = None
    if latest:
        out_latest = {k: v for k, v in latest.items() if not k.startswith("_")}
    return _section(
        "dividend",
        bi("What dividend does it pay?", "কত ডিভিডেন্ড দেয়?"),
        word, tone, head, bi(src_txt_en, " · ".join(src_bn)),
        free_line=free, inside=inside, meaning=meaning, watch=watch,
        latest=out_latest, payout_pct=payout, cash_cover=cash_cover,
        history=history,
        next_range={"low": next_range["low"], "high": next_range["high"]} if next_range else None,
        on_10k=on_10k, tax_pct=DIV_TAX_PCT, record_dates=rec_rows,
        _cur=cur, _prev=prev, _latest_full=latest,
    )


# ---------------------------------------------------------------- owners

_ROLE_WORDS = {
    "chairman": ("Chairman", "চেয়ারম্যান"), "chairperson": ("Chairman", "চেয়ারম্যান"),
    "vice chairman": ("Vice chairman", "ভাইস চেয়ারম্যান"),
    "managing director": ("Managing director", "ব্যবস্থাপনা পরিচালক"), "md": ("Managing director", "ব্যবস্থাপনা পরিচালক"),
    "ceo": ("Chief executive", "প্রধান নির্বাহী"),
    "corporate director": ("A corporate director", "একটি প্রাতিষ্ঠানিক পরিচালক"),
    "corporate sponsor": ("A corporate sponsor", "একটি প্রাতিষ্ঠানিক উদ্যোক্তা"),
    "sponsor director": ("A sponsor director", "একজন উদ্যোক্তা-পরিচালক"),
    "director": ("A director", "একজন পরিচালক"),
    "sponsor": ("A sponsor", "একজন উদ্যোক্তা"),
}


def _role(raw) -> dict:
    if isinstance(raw, dict) and raw.get("en"):
        return bi(raw["en"], raw.get("bn") or raw["en"])
    s = str(raw or "").strip().lower().replace("_", " ")
    s = s.removeprefix("a ").removeprefix("an ").removeprefix("the ").strip()
    for key in sorted(_ROLE_WORDS, key=len, reverse=True):
        if key in s:
            en, bn = _ROLE_WORDS[key]
            return bi(en, bn)
    return bi("An insider", "একজন সংশ্লিষ্ট ব্যক্তি")


def _owner_rows(holdings: list[dict]) -> list[tuple[date, dict]]:
    out = []
    for h in holdings or []:
        d = _d(h.get("as_of_date"))
        if d:
            out.append((d, h))
    out.sort(key=lambda t: t[0])
    dedup: dict[date, dict] = {}
    for d, h in out:
        dedup[d] = h
    return sorted(dedup.items())


_GROUPS = [
    ("sponsor_director_pct", "Founders and directors", "উদ্যোক্তা-পরিচালক"),
    ("institute_pct", "Institutions", "প্রতিষ্ঠান"),
    ("foreign_pct", "Foreign investors", "বিদেশি বিনিয়োগকারী"),
    ("govt_pct", "Government", "সরকার"),
]


def _insider_trades(inp: dict) -> list[dict]:
    today = inp["today"]
    series = _price_series(inp.get("prices") or [])
    raw = (inp.get("notices") or {}).get("insider_trades") or []
    out = []
    seen = set()
    for t in raw:
        if not isinstance(t, dict):
            continue
        side = (t.get("side") or "").lower()
        if side not in ("buy", "sell"):
            continue
        try:
            shares = int(float(t.get("shares") or 0))
        except (TypeError, ValueError):
            shares = 0
        if shares <= 0:
            continue
        declared, done = _d(t.get("declared")), _d(t.get("done"))
        anchor = declared or done or _d(t.get("post_date"))
        if not anchor or (today - anchor).days > NOTICE_DAYS:
            continue
        role = _role(t.get("role"))
        key = (side, (t.get("name") or role["en"]).lower(), shares, declared or done)
        if key in seen:
            continue
        seen.add(key)
        lo, hi = _range_between(series, declared or done, done if declared else None)
        value = round(shares * (lo + hi) / 2.0 / 1e6, 1) if lo and hi else None
        status = "done" if done or (t.get("status") == "done") else "declared"
        out.append({"side": side, "role": role, "name": t.get("name") or None, "shares": shares,
                    "declared": _iso(declared), "done": _iso(done), "status": status,
                    "price_low": lo, "price_high": hi, "value_mn": value})
    out.sort(key=lambda t: t["declared"] or t["done"] or "", reverse=True)
    return out


_SENIORITY = ["Chairman", "Vice chairman", "Managing director", "Chief executive", "A sponsor director",
              "A director", "A corporate director", "A sponsor", "A corporate sponsor"]


def _seniority(role_en: str) -> int:
    return _SENIORITY.index(role_en) if role_en in _SENIORITY else len(_SENIORITY)


def build_owners(inp: dict) -> Optional[dict]:
    today = inp["today"]
    rows = _owner_rows(inp.get("holdings") or [])
    trades = _insider_trades(inp)
    if not rows and not trades:
        return None
    latest = rows[-1][1] if rows else {}
    as_of = rows[-1][0] if rows else None
    split = None
    if rows:
        split = {"as_of": _iso(as_of), "sponsor": _f(latest.get("sponsor_director_pct")),
                 "institute": _f(latest.get("institute_pct")), "foreign": _f(latest.get("foreign_pct")),
                 "govt": _f(latest.get("govt_pct")), "public": _f(latest.get("public_pct"))}

    window = [(d, h) for d, h in rows if (today - d).days <= OWNER_TREND_DAYS]
    trend = []
    if len(window) >= 2:
        (d0, h0), (d1, h1) = window[0], window[-1]
        for key, en, bn_ in _GROUPS:
            a, b = _f(h0.get(key)), _f(h1.get(key))
            if a is None or b is None or abs(b - a) < OWNER_MOVE_PP:
                continue
            trend.append({"group": bi(en, bn_), "from_pct": round(a, 2), "to_pct": round(b, 2),
                          "from_date": d0.isoformat(), "to_date": d1.isoformat()})

    buys = [t for t in trades if t["side"] == "buy"]
    sells = [t for t in trades if t["side"] == "sell"]
    spon_move = next((t["to_pct"] - t["from_pct"] for t in trend if t["group"]["en"].startswith("Founders")), 0.0)
    if len(buys) > len(sells) or (not trades and spon_move >= OWNER_MOVE_PP):
        word, tone = bi("Buying", "কিনছেন"), "good"
    elif len(sells) > len(buys) or (not trades and spon_move <= -OWNER_MOVE_PP):
        word, tone = bi("Selling", "বিক্রি করছেন"), "fair"
    else:
        word, tone = bi("Steady", "স্থির"), "neutral"

    spon = _f(latest.get("sponsor_director_pct")) if latest else None
    govt = _f(latest.get("govt_pct")) if latest else None
    rule30 = None
    if spon is not None:
        rule30 = {"pct": round(spon, 2), "ok": spon >= SPONSOR_MIN_PCT or (govt or 0) >= GOVT_CONTROL_PCT}

    def who(ts: list[dict]) -> tuple[str, str]:
        en, bn_ = [], []
        for t in sorted(ts, key=lambda t: _seniority(t["role"]["en"])):
            r = t["role"]
            e = r["en"]
            e = e if e.startswith("A ") or e.startswith("An ") else "the " + e[0].lower() + e[1:]
            e = e[0].lower() + e[1:] if e.startswith("A ") or e.startswith("An ") else e
            if e not in en:
                en.append(e)
            if r["bn"] not in bn_:
                bn_.append(r["bn"])
        s_en = _join_en(en)
        return s_en[0].upper() + s_en[1:], _join_bn(bn_)

    def months(ts: list[dict]) -> tuple[str, str]:
        starts = [_d(t["declared"] or t["done"]) for t in ts if (t["declared"] or t["done"])]
        ends = [_d(t["done"] or t["declared"]) for t in ts if (t["declared"] or t["done"])]
        if not starts:
            return "", ""
        a, b = min(starts), max(ends)
        if (a.year, a.month) == (b.year, b.month):
            return f"in {_MON_FULL_EN[a.month]}", f"{_MON_BN[a.month]}-এ"
        if a.year == b.year and b.month - a.month == 1:
            return f"in {_MON_FULL_EN[a.month]} and {_MON_FULL_EN[b.month]}", f"{_MON_BN[a.month]} ও {_MON_BN[b.month]}-এ"
        return (f"between {_MON_FULL_EN[a.month]} and {_MON_FULL_EN[b.month]} {b.year}",
                f"{_MON_BN[a.month]} থেকে {_MON_BN[b.month]} {b.year}-এর মধ্যে")

    def total_value(ts):
        vals = [t["value_mn"] for t in ts if t["value_mn"]]
        return sum(vals) if vals else None

    # Plain words (2026-10-30): who, did they buy or sell, roughly how much
    # money — no share counts, no percentages to the decimal.
    if trades and (not buys or not sells):
        ts = buys or sells
        w_en, w_bn = who(ts)
        m_en, m_bn = months(ts)
        v = total_value(ts)
        v_en, v_bn = _crore(v) if v else ("", "")
        if buys:
            head = bi(
                f"The people who run it are buying. {w_en} bought more shares {m_en}" + (f", worth about {v_en}" if v else "") + ".",
                f"কোম্পানি যাঁরা চালান, তাঁরা কিনছেন। {w_bn} {m_bn} আরও শেয়ার কিনেছেন" + (f", প্রায় {v_bn} মূল্যের" if v else "") + "।",
            )
        else:
            head = bi(
                f"The people who run it are selling. {w_en} sold shares {m_en}" + (f", worth about {v_en}" if v else "") + ".",
                f"কোম্পানি যাঁরা চালান, তাঁরা বিক্রি করছেন। {w_bn} {m_bn} শেয়ার বিক্রি করেছেন" + (f", প্রায় {v_bn} মূল্যের" if v else "") + "।",
            )
    elif trades:
        head = bi("The people who run it both bought and sold shares in the last 12 months.",
                  "গত 12 মাসে কোম্পানি যাঁরা চালান, তাঁরা শেয়ার কিনেছেনও, বিক্রিও করেছেন।")
    elif spon is not None:
        head = bi(f"The people who run it did not buy or sell shares in the last 12 months. They own about {spon:.0f} of every 100 shares.",
                  f"গত 12 মাসে কোম্পানি যাঁরা চালান, তাঁরা শেয়ার কেনেননি বা বিক্রি করেননি। প্রতি 100টি শেয়ারের প্রায় {spon:.0f}টি তাঁদের।")
    else:
        head = bi("The people who run it did not buy or sell shares in the last 12 months.",
                  "গত 12 মাসে কোম্পানি যাঁরা চালান, তাঁরা শেয়ার কেনেননি বা বিক্রি করেননি।")

    meaning = []
    lows = [t["price_low"] for t in trades if t["price_low"]]
    highs = [t["price_high"] for t in trades if t["price_high"]]
    ltp = _f(inp.get("ltp"))
    if lows and highs and ltp and (not buys or not sells):
        lo, hi = min(lows), max(highs)
        v_en, v_bn = ("bought", "কিনেছিলেন") if buys else ("sold", "বিক্রি করেছিলেন")
        if ltp < lo * 0.97:
            meaning.append(bi(f"Today's price is lower than when they {v_en}.", f"তাঁরা যখন {v_bn}, আজকের দাম তার চেয়ে কম।"))
        elif ltp > hi * 1.03:
            meaning.append(bi(f"Today's price is higher than when they {v_en}.", f"তাঁরা যখন {v_bn}, আজকের দাম তার চেয়ে বেশি।"))
        else:
            meaning.append(bi(f"They {v_en} at about today's price.", f"তাঁরা প্রায় আজকের দামেই {v_bn}।"))
    for t in trend:
        up = t["to_pct"] > t["from_pct"]
        small = abs(t["to_pct"] - t["from_pct"]) < 2
        g = t["group"]
        f_en, f_bn = _mon(t["from_date"])
        if up:
            meaning.append(bi(f"Since {f_en}, {g['en'][0].lower() + g['en'][1:]} have bought {'a little ' if small else ''}more of the company.",
                              f"{f_bn}-এর পর থেকে {g['bn']} কোম্পানির {'কিছুটা ' if small else ''}বেশি শেয়ার কিনেছেন।"))
        else:
            meaning.append(bi(f"Since {f_en}, {g['en'][0].lower() + g['en'][1:]} have sold {'a few' if small else 'some'} of their shares.",
                              f"{f_bn}-এর পর থেকে {g['bn']} তাঁদের {'কিছু' if small else 'বেশ কিছু'} শেয়ার বিক্রি করেছেন।"))
    if buys and not sells:
        meaning.append(bi("When the people who run a company buy with their own money, they usually expect it to do well.",
                          "কোম্পানি যাঁরা চালান তাঁরা নিজের টাকায় শেয়ার কিনলে সাধারণত বোঝা যায়, তাঁরা কোম্পানির ভবিষ্যৎ ভালো দেখছেন।"))
    elif sells and not buys:
        meaning.append(bi("Insiders sell for many reasons, but a sale by the people who run a company is worth checking.",
                          "নানা কারণে শেয়ার বিক্রি হতে পারে, তবে কোম্পানি যাঁরা চালান তাঁদের বিক্রি একবার খতিয়ে দেখা ভালো।"))

    watch = None
    if rule30 and not rule30["ok"]:
        watch = bi("The founders and directors own less than the 30% the rules ask them to keep. That is a warning sign.",
                   "উদ্যোক্তা-পরিচালকদের হাতে নিয়ম অনুযায়ী যে 30% রাখার কথা, তার চেয়ে কম শেয়ার আছে। এটি একটি সতর্কসংকেত।")
    else:
        watch = bi("If any of the people who run it announce a sale, we show it here.",
                   "কোম্পানি যাঁরা চালান, তাঁদের কেউ বিক্রির ঘোষণা দিলে আমরা এখানে দেখাব।")

    nb, ns = len(buys), len(sells)
    times = lambda n: "once" if n == 1 else "twice" if n == 2 else f"{n} times"  # noqa: E731
    if nb + ns == 0:
        free = bi("In the last 12 months, the people who run it did not buy or sell any shares.",
                  "গত 12 মাসে কোম্পানি যাঁরা চালান, তাঁরা কোনো শেয়ার কেনেননি বা বিক্রি করেননি।")
    elif ns == 0:
        free = bi(f"In the last 12 months, the people who run it bought shares {times(nb)} and sold none.",
                  f"গত 12 মাসে কোম্পানি যাঁরা চালান, তাঁরা {nb} বার শেয়ার কিনেছেন, বিক্রি করেননি।")
    elif nb == 0:
        free = bi(f"In the last 12 months, the people who run it sold shares {times(ns)} and bought none.",
                  f"গত 12 মাসে কোম্পানি যাঁরা চালান, তাঁরা {ns} বার শেয়ার বিক্রি করেছেন, কেনেননি।")
    else:
        free = bi(f"In the last 12 months, the people who run it bought shares {times(nb)} and sold {times(ns)}.",
                  f"গত 12 মাসে কোম্পানি যাঁরা চালান, তাঁরা {nb} বার কিনেছেন আর {ns} বার বিক্রি করেছেন।")

    inside = []
    if trades:
        inside.append(bi("Who bought or sold, how much, and at what price", "কে কিনেছেন বা বিক্রি করেছেন, কতটা, আর কোন দামে"))
    if window:
        f_en, f_bn = _mon(window[0][0])
        inside.append(bi(f"Which groups of owners bought or sold since {f_en}", f"{f_bn}-এর পর থেকে কোন মালিকেরা কিনেছেন বা বিক্রি করেছেন"))
    inside.append(bi("What it means for someone buying today", "আজ যিনি কিনছেন, তাঁর জন্য এর অর্থ"))

    src_en, src_bn = ["DSE insider notices"], ["ডিএসইর উদ্যোক্তা-পরিচালক লেনদেনের নোটিশ"]
    if as_of:
        e, b = _day(as_of)
        src_en.append(f"monthly shareholding reports to {e}")
        src_bn.append(f"{b} পর্যন্ত মাসিক শেয়ার ধারণের প্রতিবেদন")

    return _section(
        "owners",
        bi("Who owns it, and are insiders buying?", "মালিক কারা, আর ভেতরের লোকেরা কি কিনছেন?"),
        word, tone, head, bi(" · ".join(src_en), " · ".join(src_bn)),
        free_line=free, inside=inside, meaning=meaning, watch=watch,
        split=split, trade_counts={"buys": nb, "sells": ns}, trades=trades, trend=trend, rule30=rule30,
    )


# ---------------------------------------------------------------- safety

def build_safety(inp: dict) -> Optional[dict]:
    row = inp.get("score_row") or {}
    sc = inp.get("sector_class") or "GENERAL"
    cat = (inp.get("category") or row.get("market_cat") or "").strip().upper() or None
    ratings = _ratings(inp)
    rating = ratings[0] if ratings else None
    facts = []
    level = 0  # 0 very safe, 1 safe, 2 watch, 3 risky
    detail_bits: list[tuple[str, str]] = []
    # The numbers behind the page's loans meter (2026-10-30): loans as a % of
    # saved profit and of market value, how many times profit pays the interest.
    measures: dict[str, Any] = {"saved_pct": None, "mcap_pct": None, "cover": None, "no_loans": False}

    def bump(n):
        nonlocal level
        level = max(level, n)

    # Plain sentences for the answer (2026-10-30): loans in words, then the
    # rating; the ratios stay in `facts` (the fold) and `measures` (the meter).
    plain: list[dict] = []
    interest_line: Optional[dict] = None

    if sc in _LENDERS:
        ext = sorted(inp.get("extended_financials") or [], key=lambda r: int(r.get("year") or 0))
        cushion = None
        for r in reversed(ext):
            eq, ta = _f(r.get("total_equity")), _f(r.get("total_assets"))
            if eq and ta and ta > 0:
                cushion = eq / ta * 100.0
                break
        if cushion is not None:
            cushion = round(cushion, 1)
            t = "good" if cushion >= BANK_CUSHION_SAFE else "fair" if cushion >= BANK_CUSHION_WATCH else "bad"
            bump(0 if cushion >= BANK_CUSHION_STRONG else 1 if cushion >= BANK_CUSHION_SAFE
                 else 2 if cushion >= BANK_CUSHION_WATCH else 3)
            facts.append({"label": bi("Its own money behind its lending", "ঋণের পেছনে নিজস্ব মূলধন"),
                          "value": bi(f"{cushion:.1f}% of assets", f"সম্পদের {cushion:.1f}%"), "tone": t})
            detail_bits.append((f"own money {cushion:.0f}% of assets", f"নিজস্ব মূলধন সম্পদের {cushion:.0f}%"))
            plain.append(
                bi("It keeps a good amount of its own money behind the loans it gives.",
                   "যে ঋণ দেয়, তার পেছনে যথেষ্ট নিজস্ব টাকা রাখে।") if cushion >= BANK_CUSHION_SAFE
                else bi("It keeps less of its own money behind its loans than we would like.",
                        "ঋণের পেছনে যতটা নিজস্ব টাকা থাকা ভালো, তার চেয়ে কম রাখে।") if cushion >= BANK_CUSHION_WATCH
                else bi("It keeps very little of its own money behind its loans.",
                        "ঋণের পেছনে খুব কম নিজস্ব টাকা রাখে।"))
        else:
            bump(1)
    elif sc == "INSURANCE":
        bump(1)
    else:
        loan = _f(inp.get("loan_mn"))
        res = _f(inp.get("reserve_mn"))
        mcap = _f(row.get("mcap_mn"))
        if loan is not None:
            if loan <= 0:
                measures["no_loans"] = True
                facts.append({"label": bi("Loans", "ঋণ"), "value": bi("None", "নেই"), "tone": "good"})
                detail_bits.append(("no loans", "কোনো ঋণ নেই"))
                plain.append(bi("It has no loans.", "এর কোনো ঋণ নেই।"))
            else:
                c_en, c_bn = _crore(loan)
                facts.append({"label": bi("Loans", "ঋণ"), "value": bi(c_en, c_bn), "tone": "neutral"})
                if res and res > 0:
                    r_ = loan / res
                    measures["saved_pct"] = round(r_ * 100.0)
                    t = "good" if r_ < 0.5 else "fair" if r_ <= 1 else "bad"
                    facts.append({"label": bi("Loans compared with money kept from past years", "আগের বছরে জমানো টাকার তুলনায় ঋণ"),
                                  "value": bi(f"{r_ * 100:.0f}%", f"{r_ * 100:.0f}%"), "tone": t})
                    detail_bits.append((f"loans {r_ * 100:.0f}% of saved profit", f"ঋণ জমা মুনাফার {r_ * 100:.0f}%"))
                    plain.append(
                        bi("Its loans are tiny next to the money it has kept from past years.",
                           "আগের বছরগুলোতে জমানো টাকার তুলনায় এর ঋণ খুবই কম।") if r_ < 0.1
                        else bi("Its loans are small next to the money it has kept from past years.",
                                "আগের বছরগুলোতে জমানো টাকার তুলনায় এর ঋণ কম।") if r_ < 0.5
                        else bi("Its loans are close to all the money it has kept from past years.",
                                "আগের বছরগুলোতে জমানো প্রায় সব টাকার সমান এর ঋণ।") if r_ <= 1
                        else bi("Its loans are bigger than all the money it has kept from past years.",
                                "আগের বছরগুলোতে জমানো সব টাকার চেয়েও এর ঋণ বেশি।"))
                    bump(0 if r_ < 0.1 else 1 if r_ <= 1 else 2)
                if mcap and mcap > 0:
                    m_ = loan / mcap
                    measures["mcap_pct"] = round(m_ * 100.0)
                    t = "good" if m_ < 0.5 else "fair" if m_ <= 1 else "bad"
                    facts.append({"label": bi("Loans compared with the company's market value", "কোম্পানির বাজারমূল্যের তুলনায় ঋণ"),
                                  "value": bi(f"{m_ * 100:.0f}%", f"{m_ * 100:.0f}%"), "tone": t})
                    if m_ > 1:
                        bump(3)
                        plain.append(bi("Its loans are bigger than the whole company is worth on the market.",
                                        "বাজারে পুরো কোম্পানির যে দাম, এর ঋণ তার চেয়েও বেশি।"))
        else:
            bump(1)
        # Interest cover from the latest accounts (magnitude of the interest line).
        ext = sorted(inp.get("extended_financials") or [], key=lambda r: int(r.get("year") or 0))
        for r in reversed(ext):
            ebit, ie = _f(r.get("ebit")), _f(r.get("interest_expense"))
            if ebit is not None and ie:
                ic = ebit / abs(ie)
                measures["cover"] = round(ic, 1)
                t = "good" if ic >= 3 else "fair" if ic >= 1.5 else "bad"
                facts.append({"label": bi("Profit compared with interest", "সুদের তুলনায় মুনাফা"),
                              "value": bi(f"{ic:.1f} times", f"{ic:.1f} গুণ"), "tone": t})
                bump(0 if ic >= 3 else 2 if ic >= 1.5 else 3)
                interest_line = (
                    bi("Its profit pays the interest on its loans easily.", "মুনাফা দিয়ে ঋণের সুদ সহজেই দেওয়া যায়।") if ic >= 3
                    else bi("Its profit covers the interest on its loans, but not by much.", "মুনাফা দিয়ে ঋণের সুদ মেটে, তবে খুব বেশি জায়গা থাকে না।") if ic >= 1.5
                    else bi("Its profit barely covers the interest on its loans.", "মুনাফা দিয়ে ঋণের সুদ কোনোমতে মেটে।") if ic >= 1
                    else bi("Its profit does not cover the interest on its loans.", "মুনাফা দিয়ে ঋণের সুদও মেটে না।"))
                break
    if rating:
        rk = _rating_rank(rating["long_term"])
        ig = rk is not None and rk <= _RATING_ORDER.index(INVESTMENT_GRADE_LAST)
        strong = rk is not None and rk <= _RATING_ORDER.index(STRONG_RATING_LAST)
        t = "good" if strong else "neutral" if ig else "bad"
        m_en, m_bn = _mon(rating["date"])
        facts.append({"label": bi("Credit rating", "ক্রেডিট রেটিং"),
                      "value": bi(f"{rating['long_term']} ({rating['agency']}, {m_en})", f"{rating['long_term']} ({rating['agency']}, {m_bn})"),
                      "tone": t})
        detail_bits.append((f"rated {rating['long_term']}", f"রেটিং {rating['long_term']}"))
        g = rating["long_term"]
        plain.append(
            bi(f"A rating agency gives it a top grade for paying its debts ({g}).", f"দেনা শোধের সামর্থ্যে একটি রেটিং এজেন্সি একে সেরা গ্রেড দিয়েছে ({g})।") if strong
            else bi(f"A rating agency gives it a fair grade for paying its debts ({g}).", f"দেনা শোধের সামর্থ্যে একটি রেটিং এজেন্সি একে মাঝারি গ্রেড দিয়েছে ({g})।") if ig
            else bi(f"A rating agency gives it a low grade for paying its debts ({g}).", f"দেনা শোধের সামর্থ্যে একটি রেটিং এজেন্সি একে নিচু গ্রেড দিয়েছে ({g})।"))
        if not ig:
            bump(3)
        elif not strong:
            bump(1)
    if cat:
        t = "good" if cat == "A" else "fair" if cat == "B" else "bad" if cat == "Z" else "neutral"
        facts.append({"label": bi("DSE category", "ডিএসই ক্যাটাগরি"), "value": bi(cat, cat), "tone": t})
        if cat == "Z":
            bump(3)
        elif cat == "B":
            bump(2)
        elif cat != "A":
            bump(1)
    if not facts:
        return None
    if level == 0 and not (rating or detail_bits):
        level = 1
    # The question is "Can it handle its loans?", so the word answers it.
    words = [(bi("Easily", "সহজেই"), "good"), (bi("Yes", "হ্যাঁ"), "good"),
             (bi("Watch this", "নজর রাখুন"), "fair"), (bi("Risky", "ঝুঁকিপূর্ণ"), "bad")]
    word, tone = words[level]

    if plain:
        head = bi(" ".join(x["en"] for x in plain[:2]), " ".join(x["bn"] for x in plain[:2]))
    elif sc == "INSURANCE":
        head = bi("Insurers are judged mainly on their ability to pay claims, and we have no rating for this one.",
                  "বিমা কোম্পানিকে মূলত দাবি মেটানোর সামর্থ্য দিয়ে বিচার করা হয়, আর এর কোনো রেটিং আমাদের কাছে নেই।")
    else:
        head = bi("We don't have enough figures on its loans.", "এর ঋণ নিয়ে যথেষ্ট তথ্য আমাদের কাছে নেই।")
    meaning = []
    if sc in _LENDERS:
        meaning.append(bi("A bank lends mostly with depositors' money. The more of its own money stands behind those loans, the safer it is when loans go bad.",
                          "ব্যাংক মূলত আমানতকারীদের টাকায় ঋণ দেয়। ঋণের পেছনে নিজস্ব মূলধন যত বেশি, ঋণ খারাপ হলে ব্যাংক তত নিরাপদ।"))
    elif sc == "INSURANCE":
        meaning.append(bi("An insurer's safety rests on its money to pay claims, which the credit rating measures.",
                          "বিমা কোম্পানির নিরাপত্তা নির্ভর করে দাবি মেটানোর সামর্থ্যের ওপর, যা ক্রেডিট রেটিং দিয়ে মাপা হয়।"))
    elif level >= 2:
        meaning.append(bi("Loans have to be repaid before shareholders see any of the profit, so heavy loans make the share riskier.",
                          "শেয়ারহোল্ডাররা মুনাফা পাওয়ার আগে ঋণ শোধ করতে হয়, তাই বেশি ঋণ শেয়ারকে বেশি ঝুঁকিপূর্ণ করে।"))
    else:
        meaning.append(bi("Its loans are small next to what it owns and earns, so a bad year would not put it in trouble.",
                          "সম্পদ আর আয়ের তুলনায় এর ঋণ কম, তাই একটি খারাপ বছরেও বড় বিপদে পড়ার কথা নয়।"))
    if interest_line:
        meaning.append(interest_line)
    if rating:
        meaning.append(bi(f"The grade comes from {rating['agency']}. Grades from AAA down to BBB mean the company is expected to pay its debts on time.",
                          f"গ্রেডটি দিয়েছে {rating['agency']}। AAA থেকে BBB পর্যন্ত গ্রেডের অর্থ, কোম্পানি সময়মতো দেনা শোধ করবে বলে আশা করা হয়।"))
    watch = None
    if rating:
        nd = _d(rating["date"]) + timedelta(days=365) if _d(rating["date"]) else None
        if nd and nd > inp["today"]:
            e, b = _mon(nd)
            watch = bi(f"The next rating is due around {e}.", f"পরের রেটিং আসতে পারে {b}-এর দিকে।")

    inside = []
    if sc in _LENDERS:
        inside.append(bi("How much of its own money stands behind its lending", "ঋণের পেছনে নিজস্ব মূলধন কতটা"))
    elif any(f["label"]["en"].startswith("Loans") for f in facts):
        inside.append(bi("How big its loans are next to what it has", "যা আছে তার তুলনায় এর ঋণ কত বড়"))
    if any(f["label"]["en"].startswith("Profit compared") for f in facts):
        inside.append(bi("Whether its profit pays the interest easily", "মুনাফা দিয়ে সুদ সহজে মেটে কি না"))
    inside.append(bi("Its credit rating, and what it means" if rating else "What would make it riskier",
                     "এর ক্রেডিট রেটিং, আর এর অর্থ" if rating else "কী হলে এটি বেশি ঝুঁকিপূর্ণ হবে"))

    src_en, src_bn = ["DSE company page"], ["ডিএসইর কোম্পানি পেজ"]
    ext_years = [int(r["year"]) for r in inp.get("extended_financials") or [] if r.get("year")]
    if ext_years:
        src_en.append(f"audited accounts FY{max(ext_years)}")
        src_bn.append(f"{max(ext_years)} অর্থবছরের নিরীক্ষিত হিসাব")
    if rating:
        e, b = _day(rating["date"])
        src_en.append(f"{rating['agency']} rating notice of {e}")
        src_bn.append(f"{b}-এর {rating['agency']} রেটিং নোটিশ")

    return _section(
        "safety",
        bi("Is it financially safe?", "আর্থিকভাবে কি নিরাপদ?"),
        word, tone, head, bi(" · ".join(src_en), " · ".join(src_bn)),
        free_line=bi("We check its loans, how easily it can pay them, and its credit rating.",
                     "আমরা এর ঋণ, কত সহজে তা শোধ করতে পারে, আর এর ক্রেডিট রেটিং দেখি।"),
        inside=inside, meaning=meaning, watch=watch,
        facts=facts,
        rating={k: rating[k] for k in ("agency", "long_term", "short_term", "outlook", "date")} if rating else None,
        measures=measures,
        _bits=detail_bits,
    )


def _ratings(inp: dict) -> list[dict]:
    out = []
    for r in (inp.get("notices") or {}).get("ratings") or []:
        if not isinstance(r, dict) or not r.get("long_term"):
            continue
        d = _d(r.get("post_date") or r.get("date"))
        if not d:
            continue
        out.append({"agency": r.get("agency") or "", "long_term": str(r["long_term"]).strip(),
                    "short_term": r.get("short_term") or None,
                    "outlook": (str(r["outlook"]).strip().capitalize() if r.get("outlook") else None),
                    "date": d.isoformat()})
    out.sort(key=lambda r: r["date"], reverse=True)
    return out


# ---------------------------------------------------------------- quality

# The five checks as everyday phrases ("It is best at paying dividends").
_PILLAR_PLAIN = {
    "p1_biz": ("making profit", "মুনাফা করা"),
    "p2_health": ("keeping its finances safe", "আর্থিক নিরাপত্তা"),
    "p3_moat": ("standing out in its business", "ব্যবসায় এগিয়ে থাকা"),
    "p4_val": ("being well priced", "দামের দিক"),
    "p5_div": ("paying dividends", "ডিভিডেন্ড দেওয়া"),
}
# …and as a noun for its weakest area ("Even its weakest area, its finances, …").
_PILLAR_NOUN = {
    "p1_biz": ("its profit", "মুনাফা"),
    "p2_health": ("its finances", "আর্থিক অবস্থা"),
    "p3_moat": ("its place in its business", "ব্যবসায় অবস্থান"),
    "p4_val": ("its price", "দাম"),
    "p5_div": ("its dividend", "ডিভিডেন্ড"),
}


def build_quality(inp: dict) -> Optional[dict]:
    row = inp.get("score_row") or {}
    score = _f(row.get("score"))
    if score is None:
        return None
    from backend.services.tiers import tier_key
    tier = tier_key(score)
    pillars = [(k, en, bn_, _f(row.get(k))) for k, en, bn_ in PILLARS]
    present = [p for p in pillars if p[3] is not None]
    healthy = len([p for p in present if p[3] >= 6])
    tone = {"excellent": "good", "good": "good", "average": "fair", "weak": "bad"}.get(tier, "neutral")
    word = bi(TIER_WORDS.get(tier, "Not rated"), TIER_WORDS_BN.get(tier, "রেটিং নেই"))
    rank, total = row.get("overall_rank"), row.get("total_scored")
    try:
        rank = int(rank) if rank is not None else None
        total = int(total) if total is not None else None
    except (TypeError, ValueError):
        rank = total = None

    # Plain words (2026-10-30): where it stands among DSE companies, then its
    # best and weakest side in everyday words — no "89 out of 100", no
    # "2nd of 362", no "9.5 out of 10".
    if rank and total:
        share = rank / total
        if rank == 1:
            head_en, head_bn = ("By our measure, it is the strongest company on the DSE.",
                                "আমাদের হিসাবে এটি ডিএসইর সবচেয়ে শক্তিশালী কোম্পানি।")
        elif rank <= 10:
            head_en = (f"One of the strongest companies on the DSE: only {rank - 1} "
                       f"{'company scores' if rank == 2 else 'companies score'} higher in our checks.")
            head_bn = f"ডিএসইর সবচেয়ে শক্তিশালী কোম্পানিগুলোর একটি: আমাদের যাচাইয়ে মাত্র {rank - 1}টি কোম্পানি এর চেয়ে এগিয়ে।"
        elif share <= 0.25:
            head_en, head_bn = ("Stronger than most companies on the DSE.", "ডিএসইর বেশির ভাগ কোম্পানির চেয়ে শক্তিশালী।")
        elif share <= 0.5:
            head_en, head_bn = ("Stronger than about half the companies on the DSE.", "ডিএসইর প্রায় অর্ধেক কোম্পানির চেয়ে শক্তিশালী।")
        elif share <= 0.9:
            head_en, head_bn = ("Weaker than most companies on the DSE.", "ডিএসইর বেশির ভাগ কোম্পানির চেয়ে দুর্বল।")
        else:
            head_en, head_bn = ("One of the weakest companies on the DSE.", "ডিএসইর সবচেয়ে দুর্বল কোম্পানিগুলোর একটি।")
    else:
        head_en = f"We grade it {word['en'].lower()}."
        head_bn = f"আমাদের গ্রেডে এটি {word['bn']}।"
    if len(present) >= 2:
        best = max(present, key=lambda p: p[3])
        worst = min(present, key=lambda p: p[3])
        b_en, b_bn = _PILLAR_PLAIN[best[0]]
        w_en, w_bn = _PILLAR_NOUN[worst[0]]
        if best[3] >= 6 and worst[3] >= 6:
            head_en += f" It is best at {b_en}, and even its weakest area, {w_en}, is in good shape."
            head_bn += f" এর সবচেয়ে ভালো দিক {b_bn}, আর সবচেয়ে দুর্বল দিক, {w_bn}, সেটিও ভালো অবস্থায়।"
        elif best[3] >= 6:
            head_en += f" It is best at {b_en}, but {w_en} needs watching."
            head_bn += f" এর সবচেয়ে ভালো দিক {b_bn}, তবে {w_bn} নজরে রাখা দরকার।"
        else:
            head_en += f" It is weak on almost everything we check, especially {w_en}."
            head_bn += f" আমরা যা দেখি তার প্রায় সবকিছুতেই দুর্বল, বিশেষ করে {w_bn}।"
    meaning = [bi("We look at five things: profit, finances, how strong the business is, the price and the dividend. "
                  + (f"{healthy} of the {len(present)} look healthy." if healthy else "None of them look healthy."),
                  f"আমরা পাঁচটি বিষয় দেখি: মুনাফা, আর্থিক অবস্থা, ব্যবসা কতটা শক্তিশালী, দাম আর ডিভিডেন্ড। "
                  + (f"{len(present)}টির মধ্যে {healthy}টি ভালো।" if healthy else "কোনোটিই ভালো নয়।"))]
    lines = [(75.0, "Excellent", "চমৎকার"), (60.0, "Good", "ভালো"), (45.0, "Average", "মাঝারি")]
    above = next((l for l in lines if score < l[0]), None)
    below = next((l for l in lines if score >= l[0]), None)
    watch = None
    if above and above[0] - score < 3:
        watch = bi(f"It is close to the next grade, {above[1]}. Good results could move it up.",
                   f"এটি পরের গ্রেড, {above[2]}-এর কাছাকাছি। ভালো ফল এলে গ্রেড বাড়তে পারে।")
    if below:
        gap = score - below[0]
        if gap < 3:
            watch = bi(f"It only just makes the {below[1]} grade, so weak results could move it down.",
                       f"এটি কোনোমতে {below[2]} গ্রেডে আছে, তাই দুর্বল ফল এলে গ্রেড নামতে পারে।")
    hist = inp.get("score_history") or {}
    ch = (hist.get("changes") or [])[:1]
    if ch:
        c = ch[0]
        t_en = TIER_WORDS.get(c.get("to_tier"), "")
        t_bn = TIER_WORDS_BN.get(c.get("to_tier"), "")
        e, b = _day(c.get("date"))
        if t_en and e:
            meaning.append(bi(f"Its grade last changed to {t_en} on {e}.", f"সর্বশেষ গ্রেড বদলে {t_bn} হয়েছে {b}।"))

    return _section(
        "quality",
        bi("How strong is the company?", "কোম্পানিটি কতটা শক্তিশালী?"),
        word, tone, bi(head_en, head_bn),
        bi("Our score, from the audited accounts and today's price", "আমাদের স্কোর, নিরীক্ষিত হিসাব আর আজকের দাম থেকে"),
        free_line=bi("We look at five things: profit, finances, how strong the business is, the price and the dividend.",
                     "আমরা পাঁচটি বিষয় দেখি: মুনাফা, আর্থিক অবস্থা, ব্যবসা কতটা শক্তিশালী, দাম আর ডিভিডেন্ড।"),
        inside=[bi("What we found on each of the five, in plain words", "পাঁচটি বিষয়ের প্রতিটিতে কী পেয়েছি, সহজ ভাষায়"),
                bi("Its best and weakest side", "এর সবচেয়ে ভালো আর সবচেয়ে দুর্বল দিক"),
                bi("Whether its grade could change soon", "শিগগির এর গ্রেড বদলাতে পারে কি না")],
        meaning=meaning, watch=watch,
        score=round(score, 1), rank=rank, total=total, healthy=healthy, checks=len(present),
        _tier=tier,
    )


# ---------------------------------------------------------------- story

def build_story(inp: dict) -> Optional[dict]:
    if inp.get("sector_class") in _LENDERS:
        return None
    rows = []
    for r in sorted(inp.get("extended_financials") or [], key=lambda r: int(r.get("year") or 0)):
        rev, np_, eq = _f(r.get("revenue")), _f(r.get("net_profit")), _f(r.get("total_equity"))
        if rev is None and np_ is None:
            continue
        rows.append({"year": int(r["year"]), "revenue_cr": _cr_of(rev), "profit_cr": _cr_of(np_),
                     "margin_pct": round(np_ / rev * 100.0, 1) if np_ is not None and rev and rev > 0 else None,
                     "roe_pct": round(np_ / eq * 100.0, 1) if np_ is not None and eq and eq > 0 else None})
    rows = rows[-10:]
    if len([r for r in rows if r["revenue_cr"]]) < 3:
        return None
    first = next(r for r in rows if r["revenue_cr"])
    # The newest year WITH sales: a year that has only a profit line (METROSPIN,
    # 2026-10-29) crashed the whole report on `None * 10`.
    last = next(r for r in reversed(rows) if r["revenue_cr"])
    span = last["year"] - first["year"]
    s_c = _cagr(first["revenue_cr"], last["revenue_cr"], span)
    p_c = _cagr(first["profit_cr"], last["profit_cr"], span) if first.get("profit_cr") and last.get("profit_cr") else None
    growth = {"years": span, "sales_pct": round(s_c, 1) if s_c is not None else None,
              "profit_pct": round(p_c, 1) if p_c is not None else None}
    if s_c is None:
        word, tone = bi("Mixed", "মিশ্র"), "neutral"
    elif s_c >= 5:
        word, tone = bi("Growing", "বাড়ছে"), "good"
    elif s_c <= -2:
        word, tone = bi("Shrinking", "কমছে"), "bad"
    else:
        word, tone = bi("Steady", "স্থির"), "neutral"

    la_en, la_bn = _crore(last["revenue_cr"] * 10)
    # Plain words (2026-10-30): did sales and profit grow over the years.
    if s_c is not None:
        def move(v: float) -> tuple[str, str]:
            return (("grown well", "ভালোভাবে বেড়েছে") if v >= 5 else ("grown a little", "সামান্য বেড়েছে") if v >= 0
                    else ("shrunk", "কমেছে"))
        se, sb = move(s_c)
        if p_c is None:
            head = bi(f"Over {span} years its sales have {se}.", f"{span} বছরে এর বিক্রি {sb}।")
        else:
            pe_, pb_ = move(p_c)
            if se == pe_:
                head = bi(f"Over {span} years both its sales and its profit have {se}.",
                          f"{span} বছরে এর বিক্রি আর মুনাফা দুটোই {sb}।")
            elif (s_c >= 0) == (p_c >= 0):
                head = bi(f"Over {span} years its sales have {se}, and its profit has {pe_}.",
                          f"{span} বছরে এর বিক্রি {sb}, আর মুনাফা {pb_}।")
            else:
                head = bi(f"Over {span} years its sales have {se}, but its profit has {pe_}.",
                          f"{span} বছরে এর বিক্রি {sb}, কিন্তু মুনাফা {pb_}।")
    else:
        head = bi(f"Sales in {last['year']}: {la_en}.", f"{last['year']} সালে বিক্রি: {la_bn}।")
    meaning = []
    m0 = next((r["margin_pct"] for r in rows if r["margin_pct"] is not None), None)
    m1 = last["margin_pct"]
    if m0 is not None and m1 is not None:
        better = m1 > m0 + 0.5
        worse = m1 < m0 - 0.5
        meaning.append(
            bi("It now keeps more of each sale as profit than it used to.", "এখন প্রতিটি বিক্রি থেকে আগের চেয়ে বেশি মুনাফা থাকে।") if better
            else bi("It now keeps less of each sale as profit than it used to.", "এখন প্রতিটি বিক্রি থেকে আগের চেয়ে কম মুনাফা থাকে।") if worse
            else bi("It keeps about the same share of each sale as profit as it used to.", "প্রতিটি বিক্রি থেকে আগের মতোই মুনাফা থাকে।"))
    changes = []
    for a, b in zip(rows, rows[1:]):
        if a.get("profit_cr") and b.get("profit_cr") is not None and a["profit_cr"] > 0:
            changes.append((b["year"], (b["profit_cr"] - a["profit_cr"]) / a["profit_cr"] * 100.0))
    if len(changes) >= 2:
        best = max(changes, key=lambda c: c[1])
        worst = min(changes, key=lambda c: c[1])
        meaning.append(bi(
            f"Its best year for profit was {best[0]}, and its weakest was {worst[0]}"
            + (", when profit fell." if worst[1] < 0 else "."),
            f"মুনাফার দিক থেকে সবচেয়ে ভালো বছর {best[0]}, আর সবচেয়ে দুর্বল {worst[0]}"
            + (", যখন মুনাফা কমেছিল।" if worst[1] < 0 else "।"),
        ))
    n = len(rows)
    return _section(
        "story",
        bi(f"How has the business changed over {n} years?", f"{n} বছরে ব্যবসা কীভাবে বদলেছে?"),
        word, tone, head,
        bi(f"Audited accounts FY{rows[0]['year']} to FY{rows[-1]['year']}", f"নিরীক্ষিত বার্ষিক হিসাব {rows[0]['year']} থেকে {rows[-1]['year']}"),
        free_line=bi("Its sales and profit for every year we have.",
                     "আমাদের কাছে থাকা প্রতিটি বছরের বিক্রি আর মুনাফা।"),
        inside=[bi(f"What changed over {n} years, in plain words", f"{n} বছরে কী বদলেছে, সহজ ভাষায়"),
                bi("Its best and weakest year", "এর সবচেয়ে ভালো আর সবচেয়ে দুর্বল বছর"),
                bi("Whether it keeps more of each sale than before", "প্রতিটি বিক্রি থেকে আগের চেয়ে বেশি থাকছে কি না")],
        meaning=meaning, watch=None,
        years=rows, growth=growth,
    )


# ---------------------------------------------------------------- sector

def build_sector(inp: dict) -> Optional[dict]:
    peers = inp.get("sector_rows") or []
    code = inp["code"]
    if len(peers) < 3:
        return None
    ext_latest = inp.get("sector_ext") or {}
    me = next((p for p in peers if p.get("trading_code") == code), None)
    if not me:
        return None

    def rank_by(vals: dict[str, float], desc: bool = True):
        ordered = sorted(vals.items(), key=lambda kv: kv[1], reverse=desc)
        for i, (c, _) in enumerate(ordered, 1):
            if c == code:
                return i, len(ordered)
        return None, len(ordered)

    ranks = []
    sales = {c: e["revenue"] for c, e in ext_latest.items() if _pos(e.get("revenue"))}
    margin = {c: e["net_profit"] / e["revenue"] * 100.0 for c, e in ext_latest.items()
              if _pos(e.get("revenue")) and _f(e.get("net_profit")) is not None}
    roe = {p["trading_code"]: _f(p.get("roe_pct")) for p in peers if _f(p.get("roe_pct")) is not None}
    growth = {p["trading_code"]: _f(p.get("eps_yoy_pct")) for p in peers if _f(p.get("eps_yoy_pct")) is not None}
    pe = {p["trading_code"]: _f(p.get("current_pe")) for p in peers if _pos(p.get("current_pe"))}
    score = {p["trading_code"]: _f(p.get("score")) for p in peers if _f(p.get("score")) is not None}
    sales_rank = None
    if inp.get("sector_class") not in _LENDERS and code in sales:
        r, n = rank_by(sales)
        c_en, c_bn = _crore(sales[code] / 1e6)
        ranks.append({"label": bi("Sales", "বিক্রি"), "rank": r, "of": n, "value": bi(c_en, c_bn)})
        sales_rank = (r, n)
    if code in margin and inp.get("sector_class") not in _LENDERS:
        r, n = rank_by(margin)
        ranks.append({"label": bi("Profit kept from sales", "বিক্রি থেকে থাকা মুনাফা"), "rank": r, "of": n,
                      "value": bi(f"{margin[code]:.0f}%", f"{margin[code]:.0f}%")})
    if code in roe:
        r, n = rank_by(roe)
        ranks.append({"label": bi("Profit on owners' money", "মালিকের টাকায় মুনাফা"), "rank": r, "of": n,
                      "value": bi(f"{roe[code]:.1f}%", f"{roe[code]:.1f}%")})
    if code in growth:
        r, n = rank_by(growth)
        g = growth[code]
        ranks.append({"label": bi("Profit growth", "মুনাফা বৃদ্ধি"), "rank": r, "of": n,
                      "value": bi(f"{'+' if g >= 0 else ''}{g:.0f}%", f"{'+' if g >= 0 else ''}{g:.0f}%")})
    if code in pe:
        r, n = rank_by(pe, desc=False)
        ranks.append({"label": bi("Cheapest for its profit", "মুনাফার তুলনায় সস্তা"), "rank": r, "of": n,
                      "value": bi(f"{pe[code]:.0f} years of profit", f"{pe[code]:.0f} বছরের মুনাফা")})
    if code in score:
        r, n = rank_by(score)
        ranks.append({"label": bi("Our score", "আমাদের স্কোর"), "rank": r, "of": n,
                      "value": bi(f"{score[code]:.0f}", f"{score[code]:.0f}")})
    if not ranks:
        return None

    sector = inp.get("sector") or ""
    sector_bn = inp.get("sector_bn") or sector
    n_peers = len(peers)
    size = None
    sr = next((r for r in ranks if r["label"]["en"] == "Our score"), None)
    if sr and sr["rank"] <= 3:
        word, tone = bi("Top 3", "সেরা 3-এ"), "good"
    elif sr and sr["rank"] <= math.ceil(sr["of"] / 2):
        word, tone = bi("Upper half", "ওপরের অর্ধেকে"), "neutral"
    elif sr:
        word, tone = bi("Lower half", "নিচের অর্ধেকে"), "fair"
    else:
        word, tone = bi("Ranked", "র‍্যাঙ্ক"), "neutral"

    # Plain words (2026-10-30): how big it is in its sector and whether it
    # keeps more of its sales as profit than the others — no "2nd biggest of 4
    # … highest profit margin of the top five".
    if sales_rank and code in margin:
        r, n = sales_rank
        size_en, size_bn = (
            ("The biggest company in its sector", "নিজের সেক্টরের সবচেয়ে বড় কোম্পানি") if r == 1
            else ("One of the biggest companies in its sector", "নিজের সেক্টরের বড় কোম্পানিগুলোর একটি") if r <= 3
            else ("A mid-sized company in its sector", "নিজের সেক্টরের একটি মাঝারি কোম্পানি") if r <= math.ceil(n / 2)
            else ("One of the smaller companies in its sector", "নিজের সেক্টরের ছোট কোম্পানিগুলোর একটি")
        )
        mr = next(x for x in ranks if x["label"]["en"] == "Profit kept from sales")
        if mr["rank"] == 1:
            m_en, m_bn = "It keeps more profit from each sale than any of them.", "প্রতিটি বিক্রি থেকে এটি সবার চেয়ে বেশি মুনাফা রাখে।"
        elif mr["rank"] <= math.ceil(mr["of"] / 2):
            m_en, m_bn = "It keeps more profit from each sale than most of them.", "প্রতিটি বিক্রি থেকে এটি বেশির ভাগের চেয়ে বেশি মুনাফা রাখে।"
        else:
            m_en, m_bn = "But it keeps less profit from each sale than most of them.", "তবে প্রতিটি বিক্রি থেকে এটি বেশির ভাগের চেয়ে কম মুনাফা রাখে।"
        head = bi(f"{size_en}. {m_en}", f"{size_bn}। {m_bn}")
        size = bi(size_en, size_bn)
    elif sr:
        head = bi(f"In our checks it comes {_ordinal(sr['rank'])} of the {sr['of']} companies in the {sector} sector.",
                  f"আমাদের যাচাইয়ে {sector_bn} সেক্টরের {sr['of']}টি কোম্পানির মধ্যে এটি {sr['rank']} নম্বরে।")
    else:
        head = bi(f"Where it stands among {n_peers} companies in the {sector} sector.", f"{sector_bn} সেক্টরের {n_peers}টি কোম্পানির মধ্যে এর অবস্থান।")
    meaning = []
    # (Its price against the sector is the price chapter's answer, not this one.)
    mr_ = next((x for x in ranks if x["label"]["en"] == "Profit kept from sales"), None)
    if sales_rank and mr_ and sales_rank[0] <= 3 and mr_["rank"] <= math.ceil(mr_["of"] / 2):
        meaning.append(bi("A big company that keeps a good share of each sale as profit is hard for rivals to push aside.",
                          "যে বড় কোম্পানি প্রতিটি বিক্রি থেকে ভালো মুনাফা রাখে, প্রতিযোগীরা তাকে সহজে সরাতে পারে না।"))
    elif sales_rank and mr_:
        meaning.append(bi("A smaller company, or one that keeps less of each sale, is easier for rivals to hurt.",
                          "ছোট কোম্পানি, বা যে প্রতিটি বিক্রি থেকে কম মুনাফা রাখে, প্রতিযোগীরা তার ক্ষতি সহজে করতে পারে।"))
    if sr:
        meaning.append(
            bi("In our checks it comes top of its sector.", "আমাদের যাচাইয়ে এটি নিজের সেক্টরে সবার ওপরে।") if sr["rank"] == 1
            else bi(f"In our checks it comes {_ordinal(sr['rank'])} of {sr['of']} in its sector.",
                    f"আমাদের যাচাইয়ে নিজের সেক্টরে {sr['of']}টির মধ্যে {sr['rank']} নম্বরে।"))
    return _section(
        "sector",
        bi("Where does it stand in its sector?", "নিজের সেক্টরে এর অবস্থান কোথায়?"),
        word, tone, head,
        bi(f"{sector} companies on DSE · latest audited accounts · today's prices",
           f"ডিএসইর {sector_bn} সেক্টরের কোম্পানি · সর্বশেষ নিরীক্ষিত হিসাব · আজকের দাম"),
        free_line=bi(f"Where it ranks among the {n_peers} companies in its sector.", f"নিজের সেক্টরের {n_peers}টি কোম্পানির মধ্যে এর অবস্থান।"),
        inside=[bi("What its place in its sector means for you", "সেক্টরে এর অবস্থান আপনার জন্য কী বোঝায়"),
                bi("How we grade the whole company, explained", "পুরো কোম্পানিকে কীভাবে গ্রেড দিই, ব্যাখ্যাসহ")],
        meaning=meaning, watch=None,
        sector=sector, peers=n_peers, ranks=ranks,
        _size=size,
    )


# ---------------------------------------------------------------- alternatives

def build_alternatives(inp: dict) -> Optional[dict]:
    peers = inp.get("sector_rows") or []
    code = inp["code"]
    me = next((p for p in peers if p.get("trading_code") == code), None) or (inp.get("score_row") or {})
    my_score = _f(me.get("score"))
    if my_score is None:
        return None
    my_pe = _f(me.get("current_pe"))
    names = inp.get("company_names") or {}
    picks = []
    for p in peers:
        c = p.get("trading_code")
        s, pe = _f(p.get("score")), _f(p.get("current_pe"))
        if c == code or s is None or s < my_score + 10 or not pe or pe <= 0:
            continue
        if (p.get("market_cat") or "").upper() == "Z":
            continue
        if my_pe and my_pe > 0 and pe >= my_pe:
            continue
        picks.append((s, c, pe))
    picks.sort(reverse=True)
    picks = picks[:3]
    if not picks:
        return None
    items = []
    for s, c, pe in picks:
        # Plain words (2026-10-30): stronger, and cheaper for its profit.
        from backend.services.tiers import tier_key
        t_them, t_me = tier_key(s), tier_key(my_score)
        g_en = f"Graded {TIER_WORDS.get(t_them, '').lower()}, against {TIER_WORDS.get(t_me, '').lower()} for {code}"
        g_bn = f"গ্রেড {TIER_WORDS_BN.get(t_them, '')}, যেখানে {code} {TIER_WORDS_BN.get(t_me, '')}"
        if t_them == t_me:
            g_en, g_bn = f"Same grade as {code} but stronger", f"{code}-এর মতো একই গ্রেড, তবে আরও শক্তিশালী"
        if my_pe and my_pe > 0:
            ch_en, ch_bn = ("much cheaper", "অনেক সস্তা") if pe <= my_pe * 0.7 else ("cheaper", "সস্তা")
            why = bi(f"{g_en}, and {ch_en} for the profit it makes.", f"{g_bn}; আর মুনাফার তুলনায় {ch_bn}।")
        else:
            why = bi(f"{g_en}, and it makes a profit.", f"{g_bn}; আর এটি মুনাফায় আছে।")
        items.append({"code": c, "name": names.get(c), "score": round(s, 1), "pe": round(pe, 2), "why": why})
    n = len(items)
    sector = inp.get("sector") or ""
    sector_bn = inp.get("sector_bn") or sector
    return _section(
        "alternatives",
        bi("Are there stronger companies for less?", "কম দামে আরও শক্তিশালী কোম্পানি আছে কি?"),
        bi(f"{n} found", f"{n}টি পাওয়া গেছে"), "neutral",
        bi(f"Yes. {n} {'company' if n == 1 else 'companies'} in the {sector} sector {'is' if n == 1 else 'are'} stronger and cheaper for the profit {'it makes' if n == 1 else 'they make'}.",
           f"হ্যাঁ। {sector_bn} সেক্টরের {n}টি কোম্পানি আরও শক্তিশালী, আর মুনাফার তুলনায় সস্তাও।"),
        bi("Our scores and today's prices", "আমাদের স্কোর আর আজকের দাম"),
        free_line=bi(f"We found {n} stronger {'company' if n == 1 else 'companies'} in this sector that {'is' if n == 1 else 'are'} also cheaper.",
                     f"এই সেক্টরে আরও শক্তিশালী আর সস্তা {n}টি কোম্পানি পেয়েছি।"),
        inside=[bi(f"Which {'company it is' if n == 1 else f'{n} companies they are'}", "কোন কোম্পানি"),
                bi("How each one compares, in one line", "প্রতিটি কোম্পানি কেমন, এক লাইনে")],
        meaning=[bi("A stronger company at a lower price is worth comparing before you buy this one.",
                    "এটি কেনার আগে কম দামের আরও শক্তিশালী কোম্পানির সঙ্গে তুলনা করে নেওয়া ভালো।")],
        watch=None,
        count=n, items=items,
    )


# ---------------------------------------------------------------- red flags + rally

def _rally(inp: dict) -> Optional[dict]:
    """The rumour-rally pattern: a big run with no news from the company."""
    series = _price_series(inp.get("prices") or [])
    if len(series) < 21:
        return None
    last_d, last_p = series[-1]
    hit = None
    for n, need in ((20, RALLY_20D_PCT), (60, RALLY_60D_PCT)):
        if len(series) > n:
            d0, p0 = series[-1 - n]
            pct = (last_p - p0) / p0 * 100.0
            if pct >= need:
                hit = (n, pct, d0)
                break
    if not hit:
        return None
    n, pct, since = hit
    # News from the company in the window: results, dividends, price-sensitive.
    keys = ("financials", "dividend", "price sensitive", "rights", "merger", "acquisition", "agreement",
            "contract", "investment", "expansion", "bonus", "record date", "credit rating", "agm")
    for d, title, _ in _news_titles(inp.get("news") or [], since):
        t = title.lower()
        if d and d >= since and any(k in t for k in keys):
            return None
    return {"days": n, "pct": pct, "since": since}


def _queries(inp: dict, days: int) -> list[dict]:
    today = inp["today"]
    out = []
    for q in (inp.get("notices") or {}).get("queries") or []:
        d = _d((q or {}).get("post_date"))
        if d and (today - d).days <= days:
            out.append({**q, "post_date": d})
    out.sort(key=lambda q: q["post_date"], reverse=True)
    return out


def build_warning(inp: dict) -> Optional[dict]:
    r = _rally(inp)
    if not r:
        return None
    from backend.services.tiers import tier_key
    row = inp.get("score_row") or {}
    tier = tier_key(_f(row.get("score")))
    cat = (inp.get("category") or row.get("market_cat") or "").upper()
    pub = None
    rows = _owner_rows(inp.get("holdings") or [])
    if rows:
        pub = _f(rows[-1][1].get("public_pct"))
    qs = _queries(inp, QUERY_DAYS)
    lines = []
    red = False
    if qs:
        red = True
        e, b = _day(qs[0]["post_date"])
        nothing = qs[0].get("no_undisclosed")
        lines.append(bi(
            f"DSE asked about the unusual price move on {e}" + (", and the company said there was no undisclosed news." if nothing else "."),
            f"{b} ডিএসই অস্বাভাবিক দাম বাড়া নিয়ে জানতে চেয়েছিল" + ("; কোম্পানি জানিয়েছে, অপ্রকাশিত কোনো তথ্য নেই।" if nothing else "।"),
        ))
    if tier in ("weak", "average"):
        red = True
        sc = _f(row.get("score"))
        lines.append(bi(f"We grade the company itself as {TIER_WORDS[tier].lower()}.",
                        f"আমাদের গ্রেডে কোম্পানিটি নিজে {TIER_WORDS_BN[tier]}।"))
    if cat == "Z":
        red = True
        lines.append(bi("It is in category Z, where DSE puts companies that missed a dividend or an AGM.",
                        "এটি Z ক্যাটাগরিতে আছে, যেখানে ডিভিডেন্ড বা এজিএম না করা কোম্পানিগুলো থাকে।"))
    if pub is not None and pub < FREE_FLOAT_LOW_PCT:
        red = True
        lines.append(bi("Few of its shares are with ordinary investors, so a handful of buyers can push the price around.",
                        "সাধারণ বিনিয়োগকারীদের হাতে এর শেয়ার কম, তাই অল্প কয়েকজন ক্রেতাই দাম ওঠানামা করাতে পারেন।"))
    lines.append(bi("A price that rises this fast without news often falls back just as fast. Checking the company's own figures first is the safer choice.",
                    "খবর ছাড়া এত দ্রুত দাম বাড়লে প্রায়ই তা আবার দ্রুত নেমে যায়। আগে কোম্পানির নিজের হিসাব দেখে নেওয়াই নিরাপদ।"))
    return {
        "level": "red" if red else "amber",
        "headline": bi(f"The price rose {r['pct']:.0f}% in {'about a month' if r['days'] <= 20 else 'about three months'}, with no news from the company.",
                       f"কোম্পানির কোনো খবর ছাড়াই {'প্রায় এক মাসে' if r['days'] <= 20 else 'প্রায় তিন মাসে'} দাম {r['pct']:.0f}% বেড়েছে।"),
        "lines": lines,
    }


def _turnover_mn(inp: dict) -> Optional[float]:
    m = inp.get("momentum") or {}
    v = _f(m.get("avg_turnover_7d_mn"))
    if v is not None:
        return v
    return None


def build_red_flags(inp: dict, *, cash: Optional[dict] = None, dividend: Optional[dict] = None,
                    owners: Optional[dict] = None, safety: Optional[dict] = None,
                    warning: Optional[dict] = None) -> dict:
    row = inp.get("score_row") or {}
    today = inp["today"]
    sc = inp.get("sector_class") or "GENERAL"
    notices = inp.get("notices") or {}
    notices_ok = bool(inp.get("notices_ok"))
    gov = {g.get("key"): g for g in inp.get("governance") or []}
    news = _news_titles(inp.get("news") or [], today - timedelta(days=NOTICE_DAYS))
    checks: list[dict] = []

    def add(key, en, bn_, level, d_en, d_bn, evidence=None):
        checks.append({"key": key, "label": bi(en, bn_), "level": level, "detail": bi(d_en, d_bn), "evidence": evidence})

    def ev(title, d):
        return {"title": title, "date": _iso(d)} if title and d else None

    # 1 · factory
    if notices_ok:
        insp = [i for i in notices.get("inspections") or [] if isinstance(i, dict)
                and _d(i.get("post_date")) and (today - _d(i.get("post_date"))).days <= NOTICE_DAYS]
        insp.sort(key=lambda i: _d(i.get("post_date")), reverse=True)
        closed = next((i for i in insp if (i.get("status") or "") == "closed"), None)
        if closed:
            vd = _d(closed.get("visit_date")) or _d(closed.get("post_date"))
            e, b = _day(vd)
            add("factory", "Factory", "কারখানা", "red",
                f"DSE visited the factory on {e} and found it closed or not making anything.",
                f"{b} ডিএসই কারখানা পরিদর্শন করে সেটি বন্ধ বা উৎপাদনহীন পেয়েছে।",
                ev(closed.get("title") or "Inspection of factory premises", closed.get("post_date")))
        elif insp and (insp[0].get("status") == "running"):
            m_en, m_bn = _mon(insp[0].get("visit_date") or insp[0].get("post_date"))
            add("factory", "Factory", "কারখানা", "pass", f"DSE found the factory working ({m_en}).",
                f"ডিএসই কারখানা চালু পেয়েছে ({m_bn})।", ev(insp[0].get("title"), insp[0].get("post_date")))
        else:
            add("factory", "Factory", "কারখানা", "pass", "No sign that the factory is closed.",
                "কারখানা বন্ধের কোনো খবর নেই।")

    # 2 · audit opinion
    if "going_concern" in gov or "qualified_opinion" in gov:
        g = gov.get("going_concern") or gov.get("qualified_opinion")
        add("audit", "The auditor's view", "নিরীক্ষকের মত", "red", g.get("en", ""), g.get("bn", ""))
    else:
        emph = next(((d, t) for d, t, _ in news if "emphasis of matter" in t.lower()), None)
        if emph:
            e, b = _day(emph[0])
            add("audit", "The auditor's view", "নিরীক্ষকের মত", "amber",
                f"On {e} the auditor pointed to something in the accounts that is worth reading.",
                f"{b} নিরীক্ষক হিসাবের একটি বিষয়ে দৃষ্টি আকর্ষণ করেছেন, যা পড়ে দেখা ভালো।", ev(emph[1], emph[0]))
        else:
            add("audit", "The auditor's view", "নিরীক্ষকের মত", "pass", "The auditor raised no warnings in the last year.",
                "গত এক বছরে নিরীক্ষক কোনো সতর্কতা দেননি।")

    # 3 · category
    cat = (inp.get("category") or row.get("market_cat") or "").strip().upper()
    if cat == "Z":
        add("category", "DSE category", "ডিএসই ক্যাটাগরি", "red", "DSE put it in category Z because it missed a dividend or its yearly meeting.",
            "ডিভিডেন্ড বা বার্ষিক সভা বাদ পড়ায় ডিএসই একে Z ক্যাটাগরিতে রেখেছে।")
    elif cat == "B":
        add("category", "DSE category", "ডিএসই ক্যাটাগরি", "amber", "DSE puts it in category B because its last dividend was small.",
            "সর্বশেষ ডিভিডেন্ড কম হওয়ায় ডিএসই একে B ক্যাটাগরিতে রেখেছে।")
    elif cat:
        add("category", "DSE category", "ডিএসই ক্যাটাগরি", "pass", "DSE puts it in category A, the best group." if cat == "A" else f"DSE puts it in category {cat}.",
            "ডিএসই একে সবচেয়ে ভালো গ্রুপ, A ক্যাটাগরিতে রেখেছে।" if cat == "A" else f"ডিএসই একে {cat} ক্যাটাগরিতে রেখেছে।")

    # 4 · DSE price query (red during a rally)
    if notices_ok:
        qs = _queries(inp, NOTICE_DAYS)
        if qs:
            e, b = _day(qs[0]["post_date"])
            during_rally = warning is not None and (today - qs[0]["post_date"]).days <= QUERY_DAYS
            add("dse_query", "DSE questions about the price", "দাম নিয়ে ডিএসইর প্রশ্ন", "red" if during_rally else "amber",
                f"On {e} DSE asked the company why its price moved so much" + (", while the price was racing up." if during_rally else "."),
                f"{b} ডিএসই কোম্পানির কাছে জানতে চেয়েছে, দাম এত ওঠানামা করল কেন" + ("; তখন দাম দ্রুত বাড়ছিল।" if during_rally else "।"),
                ev(qs[0].get("title") or "Query Response", qs[0]["post_date"]))
        else:
            add("dse_query", "DSE questions about the price", "দাম নিয়ে ডিএসইর প্রশ্ন", "pass", "DSE has not questioned its price in the last year.",
                "গত এক বছরে এর দাম নিয়ে ডিএসই কোনো প্রশ্ন করেনি।")

    # 5 · the 30% rule
    rule = (owners or {}).get("rule30")
    if rule:
        if rule["ok"]:
            add("owners_30", "Founders' share (30% rule)", "উদ্যোক্তা-পরিচালকদের অংশ (30% নিয়ম)", "pass",
                f"The founders and directors own {rule['pct']:.0f}%, more than the 30% the rules ask for.",
                f"উদ্যোক্তা-পরিচালকদের হাতে {rule['pct']:.0f}%, নিয়মের 30%-এর বেশি।")
        else:
            add("owners_30", "Founders' share (30% rule)", "উদ্যোক্তা-পরিচালকদের অংশ (30% নিয়ম)", "red",
                f"The founders and directors own only {rule['pct']:.0f}%, less than the 30% the rules ask for.",
                f"উদ্যোক্তা-পরিচালকদের হাতে মাত্র {rule['pct']:.0f}%, নিয়মের 30%-এর কম।")

    # 6 · loans (not for lenders / insurers)
    if sc not in _FINANCIALS:
        lvl = row.get("debt_level")
        loan = _f(inp.get("loan_mn"))
        res = _f(inp.get("reserve_mn"))
        if lvl == "over_mcap":
            add("loans", "Loans", "ঋণ", "red", "Its loans are bigger than the whole company is worth on the market.",
                "বাজারে পুরো কোম্পানির যে দাম, এর ঋণ তার চেয়েও বেশি।")
        elif lvl == "over_reserve":
            add("loans", "Loans", "ঋণ", "amber", "Its loans are bigger than all the money it has kept from past years.",
                "আগের বছরগুলোতে জমানো সব টাকার চেয়েও এর ঋণ বেশি।")
        elif loan is not None:
            if loan <= 0:
                add("loans", "Loans", "ঋণ", "pass", "It has no loans.", "এর কোনো ঋণ নেই।")
            elif res and res > 0:
                add("loans", "Loans", "ঋণ", "pass",
                    "Its loans are small next to the money it has kept from past years." if loan / res < 0.5
                    else "Its loans are less than the money it has kept from past years.",
                    "আগের বছরগুলোতে জমানো টাকার তুলনায় এর ঋণ কম।" if loan / res < 0.5
                    else "আগের বছরগুলোতে জমানো টাকার চেয়ে এর ঋণ কম।")

    # 7 · stale accounts
    age = _f(row.get("data_age_years"))
    last_year = row.get("last_reported_year") or row.get("fy_eps_year")
    fin_years = [r["_year"] for r in _sorted_fin(inp.get("financials") or [])]
    newest = max(fin_years) if fin_years else None
    if (age is not None and age >= STALE_YEARS) or row.get("stale_data") is True:
        y = last_year or newest
        add("stale", "Up-to-date accounts", "হালনাগাদ হিসাব", "red",
            f"Its latest yearly accounts are from {y}, more than two years old." if y else "Its yearly accounts are more than two years old.",
            f"সর্বশেষ বার্ষিক হিসাব {y} সালের, দুই বছরেরও বেশি পুরোনো।" if y else "বার্ষিক হিসাব দুই বছরেরও বেশি পুরোনো।")
    elif newest:
        add("stale", "Up-to-date accounts", "হালনাগাদ হিসাব", "pass", "Its yearly accounts are up to date.",
            "এর বার্ষিক হিসাব হালনাগাদ।")

    # 8 · meetings
    if "agm_postponed" in gov or "board_postponed" in gov:
        g = gov.get("agm_postponed") or gov.get("board_postponed")
        add("meetings", "Meetings on time", "সময়মতো সভা", "amber", g.get("en", ""), g.get("bn", ""))
    else:
        add("meetings", "Meetings on time", "সময়মতো সভা", "pass", "It held its board meetings and its yearly meeting on time.",
            "পর্ষদ সভা আর বার্ষিক সভা সময়মতো করেছে।")

    # 9 · regulator
    if "bsec_action" in gov or "penalty" in gov:
        g = gov.get("bsec_action") or gov.get("penalty")
        add("regulator", "Regulator", "নিয়ন্ত্রক সংস্থা", "amber", g.get("en", ""), g.get("bn", ""))
    else:
        add("regulator", "Regulator", "নিয়ন্ত্রক সংস্থা", "pass", "The market regulator (BSEC) took no action against it in the last year.",
            "গত এক বছরে বাজার নিয়ন্ত্রক বিএসইসি এর বিরুদ্ধে কোনো পদক্ষেপ নেয়নি।")

    # 10 · owner selling
    if owners is not None or notices_ok:
        sells = (owners or {}).get("trade_counts", {}).get("sells", 0) if owners else 0
        if sells:
            t = next((t for t in (owners or {}).get("trades") or [] if t["side"] == "sell"), None)
            who_en = (t or {}).get("role", {}).get("en", "An insider")
            who_bn = (t or {}).get("role", {}).get("bn", "একজন সংশ্লিষ্ট ব্যক্তি")
            add("owner_selling", "Founders selling", "উদ্যোক্তা-পরিচালকদের বিক্রি", "amber",
                f"{who_en} announced a plan to sell shares." if t else "Some of the people who run it sold shares in the last 12 months.",
                f"{who_bn} শেয়ার বিক্রির ঘোষণা দিয়েছেন।" if t else "গত 12 মাসে কোম্পানি যাঁরা চালান, তাঁদের কেউ কেউ শেয়ার বিক্রি করেছেন।")
        else:
            add("owner_selling", "Founders selling", "উদ্যোক্তা-পরিচালকদের বিক্রি", "pass", "None of the people who run it are selling.",
                "কোম্পানি যাঁরা চালান, তাঁদের কেউ বিক্রি করছেন না।")

    # 11 · cash backs the profit (not for lenders / insurers)
    if sc not in _FINANCIALS and cash:
        last = cash["years"][-1]
        gap = (cash.get("_gap_rise") or 0) >= CASH_GAP_PROFIT_RISE_PCT
        if last["ratio"] < 0:
            add("cash", "Profit backed by cash", "নগদে মুনাফার সমর্থন", "amber",
                "More cash went out of the business than came in, even though it showed a profit.",
                "মুনাফা দেখালেও ব্যবসায় যত নগদ এসেছে, তার চেয়ে বেশি বেরিয়ে গেছে।")
        elif last["ratio"] < CASH_WEAK_RATIO:
            add("cash", "Profit backed by cash", "নগদে মুনাফার সমর্থন", "amber",
                "Less than half of this year's profit came in as real cash.",
                "এ বছরের মুনাফার অর্ধেকেরও কম আসল নগদ হয়ে এসেছে।")
        elif gap:
            add("cash", "Profit backed by cash", "নগদে মুনাফার সমর্থন", "amber",
                "Profit went up, but less cash came in than the year before.",
                "মুনাফা বেড়েছে, কিন্তু আগের বছরের চেয়ে কম নগদ এসেছে।")
        else:
            add("cash", "Profit backed by cash", "নগদে মুনাফার সমর্থন", "pass",
                "Most of its profit comes in as real cash.",
                "এর মুনাফার বেশির ভাগই আসল নগদ হয়ে আসে।")

    # 12 · dividend paid from profit
    if dividend and dividend.get("payout_pct") is not None:
        p = dividend["payout_pct"]
        if p > 100:
            add("payout", "Dividend paid from profit", "মুনাফা থেকে ডিভিডেন্ড", "amber",
                "It paid more in dividends than it earned.",
                "আয়ের চেয়ে বেশি ডিভিডেন্ড দিয়েছে।")
        else:
            add("payout", "Dividend paid from profit", "মুনাফা থেকে ডিভিডেন্ড", "pass", "It pays its dividend out of its profit.",
                "মুনাফা থেকেই ডিভিডেন্ড দেয়।")

    # 13 · trading
    t_mn = _turnover_mn(inp)
    if t_mn is not None:
        c_en, c_bn = _crore(t_mn)
        if t_mn < THIN_TURNOVER_MN:
            add("trading", "Easy to sell", "সহজে বিক্রি", "amber", f"Few of its shares trade each day (about {c_en}), so selling can take time.",
                f"প্রতিদিন এর শেয়ার কম লেনদেন হয় (প্রায় {c_bn}), তাই বিক্রি করতে সময় লাগতে পারে।")
        else:
            add("trading", "Easy to sell", "সহজে বিক্রি", "pass", f"It is easy to buy and sell: about {c_en} of its shares trade each day.",
                f"সহজেই কেনাবেচা করা যায়: প্রতিদিন প্রায় {c_bn}-এর শেয়ার লেনদেন হয়।")

    # 14 · credit rating
    rs = _ratings(inp)
    if rs:
        r0 = rs[0]
        rk = _rating_rank(r0["long_term"])
        prev_rk = _rating_rank(rs[1]["long_term"]) if len(rs) > 1 else None
        m_en, m_bn = _mon(r0["date"])
        ig_last = _RATING_ORDER.index(INVESTMENT_GRADE_LAST)
        if rk is not None and rk > ig_last:
            add("rating", "Credit grade", "ক্রেডিট রেটিং", "amber",
                f"A rating agency gives it a low grade for paying its debts ({r0['long_term']}).",
                f"দেনা শোধের সামর্থ্যে একটি রেটিং এজেন্সি একে নিচু গ্রেড দিয়েছে ({r0['long_term']})।",
                ev(f"Credit Rating Result", r0["date"]))
        elif rk is not None and prev_rk is not None and rk > prev_rk:
            add("rating", "Credit grade", "ক্রেডিট রেটিং", "amber",
                f"Its grade for paying its debts was lowered in {m_en}, from {rs[1]['long_term']} to {r0['long_term']}.",
                f"{m_bn}-এ দেনা শোধের গ্রেড {rs[1]['long_term']} থেকে নেমে {r0['long_term']} হয়েছে।",
                ev("Credit Rating Result", r0["date"]))
        else:
            add("rating", "Credit grade", "ক্রেডিট রেটিং", "pass",
                f"A rating agency gives it a sound grade for paying its debts ({r0['long_term']}).",
                f"দেনা শোধের সামর্থ্যে একটি রেটিং এজেন্সি একে ভালো গ্রেড দিয়েছে ({r0['long_term']})।", ev("Credit Rating Result", r0["date"]))

    # 15 · big investors leaving
    rows = _owner_rows(inp.get("holdings") or [])
    if len(rows) >= 2:
        d1, h1 = rows[-1]
        base = None
        for d, h in rows:
            if (d1 - d).days <= OWNER_EXIT_DAYS:
                base = (d, h)
                break
        exit_line = None
        if base and base[0] != d1:
            for key, en, bn_ in (("foreign_pct", "Foreign investors", "বিদেশি বিনিয়োগকারীরা"),
                                 ("institute_pct", "Institutions", "প্রতিষ্ঠানগুলো")):
                peak = max((_f(h.get(key)) or 0, d) for d, h in rows if (d1 - d).days <= OWNER_EXIT_DAYS)
                now = _f(h1.get(key))
                if now is not None and peak[0] - now > OWNER_EXIT_PP:
                    f_en, f_bn = _mon(peak[1])
                    exit_line = (f"{en} have sold part of their shares since {f_en}.",
                                 f"{f_bn}-এর পর থেকে {bn_} তাঁদের শেয়ারের একটি অংশ বিক্রি করেছেন।")
                    break
        if exit_line:
            add("investors", "Big investors", "বড় বিনিয়োগকারী", "amber", exit_line[0], exit_line[1])
        else:
            add("investors", "Big investors", "বড় বিনিয়োগকারী", "pass", "No big investors are leaving.",
                "কোনো বড় বিনিয়োগকারী বেরিয়ে যাচ্ছেন না।")

    # 16 · price run without news
    if warning:
        if not any(c["key"] == "dse_query" and c["level"] == "red" for c in checks):
            add("rally", "Price jump with no news", "খবর ছাড়া দাম বাড়া", "red" if warning["level"] == "red" else "amber",
                warning["headline"]["en"], warning["headline"]["bn"])
        else:
            add("rally", "Price jump with no news", "খবর ছাড়া দাম বাড়া", "amber",
                warning["headline"]["en"], warning["headline"]["bn"])
    else:
        add("rally", "Price jump with no news", "খবর ছাড়া দাম বাড়া", "pass", "Its price has not jumped without news.",
            "খবর ছাড়া এর দাম অস্বাভাবিকভাবে বাড়েনি।")

    checks = checks[:16]
    order = {"red": 0, "amber": 1, "pass": 2}
    checks.sort(key=lambda c: order[c["level"]])
    red = len([c for c in checks if c["level"] == "red"])
    amber = len([c for c in checks if c["level"] == "amber"])
    passed = len([c for c in checks if c["level"] == "pass"])
    n = len(checks)

    if red:
        word, tone = bi(f"{red} red {'flag' if red == 1 else 'flags'}", f"{red}টি বড় সতর্কতা"), "bad"
    elif amber >= 3:
        word, tone = bi(f"{amber} to watch", f"{amber}টি নজরে রাখার মতো"), "fair"
    else:
        word, tone = bi("None", "নেই"), "good"

    reds = [c for c in checks if c["level"] == "red"]
    watch_en = f"{amber} {'thing' if amber == 1 else 'things'} to watch"
    watch_bn = f"{amber}টি নজরে রাখার মতো বিষয়"
    # Plain words (2026-10-30): is anything seriously wrong, said first.
    smaller_en = f"{amber} smaller {'thing' if amber == 1 else 'things'} worth a look"
    smaller_bn = f"{amber}টি ছোট বিষয় দেখে নেওয়ার মতো"
    if red:
        lead_en = "Yes, one serious problem: " if red == 1 else f"Yes, {red} serious problems. The biggest: "
        lead_bn = "হ্যাঁ, একটি গুরুতর সমস্যা: " if red == 1 else f"হ্যাঁ, {red}টি গুরুতর সমস্যা। সবচেয়ে বড়টি: "
        d0 = reds[0]["detail"]
        head = bi(lead_en + _lc(d0["en"]), lead_bn + d0["bn"])
        free = bi(f"We checked {n} things that can go wrong. {red} {'is' if red == 1 else 'are'} serious, shown below"
                  + (f", and {smaller_en}." if amber else "."),
                  f"আমরা {n}টি বিষয় দেখেছি, যেগুলোতে সমস্যা হতে পারে। {red}টি গুরুতর, নিচে দেখানো হলো" + (f"; আর {smaller_bn}।" if amber else "।"))
    elif amber:
        head = bi(f"Nothing seriously wrong. We found {smaller_en}.", f"গুরুতর কোনো সমস্যা নেই। {smaller_bn} পেয়েছি।")
        free = bi(f"We checked {n} things that can go wrong. Nothing serious, and {smaller_en}.",
                  f"আমরা {n}টি বিষয় দেখেছি, যেগুলোতে সমস্যা হতে পারে। গুরুতর কিছু নেই, আর {smaller_bn}।")
    else:
        head = bi(f"Nothing wrong. All {n} things we check look fine.", f"কোনো সমস্যা নেই। আমরা যে {n}টি বিষয় দেখি, সবই ঠিক আছে।")
        free = bi(f"We checked {n} things that can go wrong. All look fine.",
                  f"আমরা {n}টি বিষয় দেখেছি, যেগুলোতে সমস্যা হতে পারে। সবই ঠিক আছে।")

    inside = []
    if amber:
        inside.append(bi(f"The {amber} smaller {'thing' if amber == 1 else 'things'} worth a look, and the notice behind each",
                         f"দেখে নেওয়ার মতো {amber}টি ছোট বিষয়, আর প্রতিটির নোটিশ"))
    inside.append(bi(f"What we found on the {passed} things that look fine", f"যে {passed}টি বিষয় ঠিক আছে, তাতে কী পেয়েছি"))
    inside.append(bi("What would turn a smaller worry into a serious one", "কী হলে ছোট বিষয় গুরুতর সমস্যা হবে"))

    return _section(
        "red_flags",
        bi("Is anything seriously wrong?", "বড় কোনো সমস্যা আছে কি?"),
        word, tone, head,
        bi("DSE notices from the last 12 months · audited accounts · monthly ownership reports",
           "গত 12 মাসের ডিএসই নোটিশ · নিরীক্ষিত হিসাব · মাসিক শেয়ার ধারণের প্রতিবেদন"),
        free_line=free, inside=inside,
        meaning=[bi("A serious problem is shown free for everyone. The smaller things are worth checking before you buy.",
                    "গুরুতর সমস্যা সবার জন্য ফ্রিতে দেখাই। ছোট বিষয়গুলো কেনার আগে একবার দেখে নেওয়া ভালো।")],
        watch=bi("If a new red flag appears, we show it here, and Premium readers who follow the share get a notification.",
                 "নতুন কোনো বড় সতর্কতা দেখা দিলে আমরা এখানে দেখাব, আর শেয়ারটি যাঁরা অনুসরণ করেন সেই প্রিমিয়াম পাঠকেরা নোটিফিকেশন পাবেন।"),
        checks=checks, counts={"checks": n, "red": red, "amber": amber, "pass": passed},
    )


# ---------------------------------------------------------------- next + risks

def build_next(inp: dict, this_year: Optional[dict], dividend: Optional[dict], safety: Optional[dict]) -> Optional[dict]:
    today = inp["today"]
    items = []
    nxt = (this_year or {}).get("next")
    if nxt and nxt.get("date"):
        lab = (this_year or {}).get("_next_label") or bi("Results", "ফল")
        items.append({"date": nxt["date"], "approx": nxt["approx"], "kind": "results",
                      "label": lab,
                      "expect": bi("To keep growing, profit has to beat the same months last year.",
                                   "মুনাফা বাড়তে থাকলে তা আগের বছরের একই সময়ের চেয়ে বেশি হতে হবে।") if nxt.get("beat") else None})
    lat = (dividend or {}).get("_latest_full") or {}
    cps = lat.get("cash_ps")
    if lat.get("record_date") and _d(lat["record_date"]) and _d(lat["record_date"]) >= today:
        net = round(cps * (1 - DIV_TAX_PCT / 100.0), 2) if cps else None
        if lat.get("buy_by") and _d(lat["buy_by"]) >= today:
            items.append({"date": lat["buy_by"], "approx": False, "kind": "record",
                          "label": bi("Last day to buy for the dividend", "ডিভিডেন্ড পেতে কেনার শেষ দিন"),
                          "expect": bi(f"Buy by this day to get {tk2(cps)} a share." if cps else "Buy by this day to get the dividend.",
                                       f"শেয়ারপ্রতি {tk2(cps)} পেতে এই দিনের মধ্যে কিনুন।" if cps else "ডিভিডেন্ড পেতে এই দিনের মধ্যে কিনুন।")})
        if lat.get("_spot") and _d(lat["_spot"]) >= today:
            items.append({"date": lat["_spot"], "approx": False, "kind": "spot",
                          "label": bi("Shares settle the same day", "একই দিনে শেয়ার হাতে"),
                          "expect": bi("From this day until the record date, trades settle the same day (DSE's spot market). Buying now is too late for the dividend in a normal trade.",
                                       "এই দিন থেকে রেকর্ড ডেট পর্যন্ত লেনদেন একই দিনে নিষ্পত্তি হয় (ডিএসইর স্পট মার্কেট)। সাধারণ লেনদেনে এখন কিনলে ডিভিডেন্ড পাওয়া যাবে না।")})
        items.append({"date": lat["record_date"], "approx": False, "kind": "record",
                      "label": bi("Record date", "রেকর্ড ডেট"),
                      "expect": bi(f"Everyone who owns the shares on this day gets {tk2(cps)} a share, {tk2(net)} after tax." if cps else "Everyone who owns the shares on this day gets the dividend.",
                                   f"এই দিনে যাঁদের কাছে শেয়ার থাকবে তাঁরা শেয়ারপ্রতি {tk2(cps)} পাবেন, কর বাদে {tk2(net)}।" if cps else "এই দিনে যাঁদের কাছে শেয়ার থাকবে তাঁরা ডিভিডেন্ড পাবেন।")})
    if lat.get("agm_date") and _d(lat["agm_date"]) and _d(lat["agm_date"]) >= today:
        items.append({"date": lat["agm_date"], "approx": False, "kind": "agm", "label": bi("Yearly meeting (AGM)", "বার্ষিক সভা (এজিএম)"),
                      "expect": bi(f"Shareholders meet and approve the {tk2(cps)} dividend." if cps else "Shareholders meet and approve the accounts.",
                                   f"শেয়ারহোল্ডাররা {tk2(cps)} ডিভিডেন্ড অনুমোদন দেবেন।" if cps else "শেয়ারহোল্ডাররা হিসাব অনুমোদন দেবেন।")})
    rating = (safety or {}).get("rating")
    if rating and _d(rating["date"]):
        nd = _d(rating["date"]) + timedelta(days=365)
        if nd >= today:
            items.append({"date": nd.isoformat(), "approx": True, "kind": "rating", "label": bi("New credit grade due", "নতুন ক্রেডিট রেটিং"),
                          "expect": bi(f"Last time {rating['agency']} gave it {rating['long_term']}.",
                                       f"গতবার {rating['agency']} রেটিং দিয়েছিল {rating['long_term']}।")})
    for m in (inp.get("notices") or {}).get("board_meetings") or []:
        md = _d((m or {}).get("meeting_date"))
        if md and md >= today and (m.get("purpose") or "other") == "other" and not m.get("postponed"):
            items.append({"date": md.isoformat(), "approx": False, "kind": "board", "label": bi("Board meeting", "পর্ষদ সভা"),
                          "expect": None})
    if not items:
        return None
    items.sort(key=lambda i: i["date"])
    items = items[:6]
    def phrase(it):
        d_en, d_bn = _day_short(it["date"])
        lab = _lc(it["label"]["en"])
        if it["kind"] in ("agm", "record", "rating") or lab.startswith("last") or lab.startswith("results"):
            lab = "the " + lab
        return (f"{lab} {'around' if it['approx'] else 'on'} {d_en}",
                f"{it['label']['bn']}, {d_bn}{'-এর কাছাকাছি' if it['approx'] else ''}")
    p1 = phrase(items[0])
    head_en = f"Next up: {p1[0]}"
    head_bn = f"এরপর: {p1[1]}"
    if len(items) > 1:
        p2 = phrase(items[1])
        head_en += f", then {p2[0]}"
        head_bn += f"; তারপর {p2[1]}"
    head = bi(head_en + ".", head_bn + "।")
    n = len(items)
    return _section(
        "next",
        bi("What happens next?", "এরপর কী আছে?"),
        bi(f"{n} {'date' if n == 1 else 'dates'}", f"{n}টি তারিখ"), "neutral", head,
        bi("DSE notices · dividend ledger · last year's dates", "ডিএসই নোটিশ · ডিভিডেন্ডের হিসাব · গত বছরের তারিখ"),
        free_line=bi(f"The next {n} {'date' if n == 1 else 'dates'} that matter for this share.", f"এই শেয়ারের জন্য সামনের গুরুত্বপূর্ণ {n}টি তারিখ।"),
        inside=[bi("What each date means for you", "প্রতিটি তারিখ আপনার জন্য কী বোঝায়"),
                bi("What the next results need to show", "পরের ফলে কী দেখা দরকার")
                if any(i["kind"] == "results" for i in items) else
                bi("What each date means for your shares", "প্রতিটি তারিখ আপনার শেয়ারের জন্য কী বোঝায়")],
        meaning=[], watch=None,
        items=items,
    )


_TRIGGERS = {
    "cash": ("If less than half of its profit comes in as cash again next year, this becomes a serious problem.",
             "আগামী বছরও মুনাফার অর্ধেকের কম নগদ হয়ে এলে এটি গুরুতর সমস্যা হবে।"),
    "payout": ("If the next dividend is again more than the profit, it is being paid from savings.",
               "পরের ডিভিডেন্ডও মুনাফার চেয়ে বেশি হলে তা জমানো টাকা থেকে দেওয়া হচ্ছে।"),
    "loans": ("If loans keep rising faster than profit, the risk grows.",
              "মুনাফার চেয়ে দ্রুত ঋণ বাড়তে থাকলে ঝুঁকি বাড়বে।"),
    "investors": ("If they keep selling for another two reports, it is worth finding out why.",
                  "পরের দুটি প্রতিবেদনেও তাঁরা বিক্রি চালিয়ে গেলে কারণ জেনে নেওয়া ভালো।"),
    "category": ("A return to category A after the next dividend would ease this.",
                 "পরের ডিভিডেন্ডের পর A ক্যাটাগরিতে ফিরলে এটি কেটে যাবে।"),
    "trading": ("If more of its shares start trading each day, selling gets easier.",
                "প্রতিদিন আরও বেশি শেয়ার লেনদেন হলে বিক্রি সহজ হবে।"),
    "rating": ("A better grade at the next rating would ease this.",
               "পরের রেটিংয়ে ভালো গ্রেড পেলে এটি কেটে যাবে।"),
    "owner_selling": ("If more sale declarations follow, it is worth finding out why.",
                      "আরও বিক্রির ঘোষণা এলে কারণ জেনে নেওয়া ভালো।"),
    "rally": ("If the price falls back as fast as it rose, the rise was not about the business.",
              "যত দ্রুত বেড়েছে তত দ্রুত নেমে গেলে বোঝা যাবে, বাড়াটা ব্যবসার কারণে ছিল না।"),
}


def build_risks(inp: dict, red_flags: dict) -> Optional[dict]:
    items = []
    for c in red_flags.get("checks") or []:
        if c["level"] == "pass":
            continue
        tr = _TRIGGERS.get(c["key"])
        items.append({"text": c["detail"], "trigger": bi(tr[0], tr[1]) if tr else None})
    for w in inp.get("watch_items") or []:
        if len(items) >= 3:
            break
        en, bn_ = w.get("en") or "", w.get("bn") or ""
        if en and all(en != i["text"]["en"] for i in items):
            items.append({"text": bi(en, bn_ or en), "trigger": None})
    items = items[:3]
    if not items:
        return None
    n = len(items)
    return _section(
        "risks",
        bi("What could go wrong?", "কী ভুল হতে পারে?"),
        bi(f"{n} {'risk' if n == 1 else 'risks'}", f"{n}টি ঝুঁকি"), "fair" if n else "neutral",
        items[0]["text"],
        bi("Our checks on its accounts, notices and price", "এর হিসাব, নোটিশ আর দামের ওপর আমাদের যাচাই"),
        free_line=bi(f"We found {n} {'thing' if n == 1 else 'things'} that could hurt this share, and what would change our view.",
                     f"এই শেয়ারের ক্ষতি করতে পারে এমন {n}টি বিষয় পেয়েছি, আর কী হলে আমাদের মত বদলাবে।"),
        inside=[bi(f"The {n} biggest {'risk' if n == 1 else 'risks'}, in plain words", f"সবচেয়ে বড় {n}টি ঝুঁকি, সহজ ভাষায়"),
                bi("What would change our view on each", "প্রতিটির ক্ষেত্রে কী হলে আমাদের মত বদলাবে")],
        meaning=[], watch=None,
        items=items,
    )


# ---------------------------------------------------------------- cover

def build_scorecard(sections: dict, inp: dict) -> list[dict]:
    sc = inp.get("sector_class") or "GENERAL"

    def check(key, label: dict, sec: Optional[dict], detail: Optional[dict], na: Optional[dict] = None):
        if sec:
            return {"key": key, "label": label, "word": sec["word"], "tone": sec["tone"], "detail": detail}
        return {"key": key, "label": label, "word": na or bi("No data", "তথ্য নেই"), "tone": "neutral", "detail": None}

    rf = sections.get("red_flags")
    rf_detail = None
    if rf:
        c = rf["counts"]
        if c["red"] and c["amber"]:
            rf_detail = bi(f"{c['red']} red, {c['amber']} to watch", f"{c['red']}টি বড়, {c['amber']}টি নজরে রাখার মতো")
        elif c["red"]:
            rf_detail = bi(f"{c['red']} serious, see below", f"{c['red']}টি গুরুতর, নিচে দেখুন")
        elif c["amber"]:
            rf_detail = bi(f"{c['amber']} {'thing' if c['amber'] == 1 else 'things'} to watch", f"{c['amber']}টি নজরে রাখার মতো")
        else:
            rf_detail = bi(f"All {c['checks']} checks passed", f"{c['checks']}টি যাচাইয়েই উতরেছে")
    pr = sections.get("price")
    pr_detail = None
    if pr and pr["pe"]["now"]:
        pe = pr["pe"]
        pr_detail = bi(f"{pe['now']:.0f} years of profit" + (f", usually {pe['usual']:.0f}" if pe["usual"] else ""),
                       f"{pe['now']:.0f} বছরের মুনাফা" + (f", সাধারণত {pe['usual']:.0f}" if pe["usual"] else ""))
    elif pr and pr.get("fair"):
        pr_detail = bi(f"{'Below' if pr['gap_pct'] < 0 else 'Above'} what we think it is worth",
                       f"আমাদের হিসাবের মূল্যের চেয়ে {'কম' if pr['gap_pct'] < 0 else 'বেশি'}")
    dv = sections.get("dividend")
    dv_detail = None
    if dv and dv.get("_cur"):
        cur, prev = dv["_cur"], dv.get("_prev")
        if prev and abs(cur - prev) > 0.005:
            dv_detail = bi(f"{tk2(cur)} a share, {'up' if cur > prev else 'down'} from {tk2(prev)}",
                           f"শেয়ারপ্রতি {tk2(cur)}, আগে ছিল {tk2(prev)}")
        else:
            dv_detail = bi(f"{tk2(cur)} a share", f"শেয়ারপ্রতি {tk2(cur)}")
    ty = sections.get("this_year")
    ty_detail = None
    if ty and ty.get("_pct") is not None:
        p = ty["_pct"]
        lab = ty["fy_label"]
        if ty.get("_full_year"):
            ty_detail = bi(f"{lab['en']} profit {'up' if p >= 0 else 'down'} {abs(p):.0f}%", f"{lab['bn']} মুনাফা {abs(p):.0f}% {'বেশি' if p >= 0 else 'কম'}")
        else:
            ty_detail = bi(f"Profit {'up' if p >= 0 else 'down'} {abs(p):.0f}% so far this year",
                           f"এ বছর এ পর্যন্ত মুনাফা {abs(p):.0f}% {'বেশি' if p >= 0 else 'কম'}")
    ow = sections.get("owners")
    ow_detail = None
    if ow:
        tc = ow["trade_counts"]
        if tc["buys"] and not tc["sells"]:
            v = sum(t["value_mn"] or 0 for t in ow["trades"] if t["side"] == "buy")
            c_en, c_bn = _crore(v) if v else ("", "")
            ow_detail = bi(f"{tc['buys']} insider {'buy' if tc['buys'] == 1 else 'buys'}" + (f", {c_en}" if v else ""),
                           f"{tc['buys']}টি কেনা" + (f", {c_bn}" if v else ""))
        elif tc["sells"] and not tc["buys"]:
            ow_detail = bi(f"{tc['sells']} insider {'sale' if tc['sells'] == 1 else 'sales'}", f"{tc['sells']}টি বিক্রি")
        elif tc["buys"] or tc["sells"]:
            ow_detail = bi(f"{tc['buys']} buys, {tc['sells']} sales", f"{tc['buys']}টি কেনা, {tc['sells']}টি বিক্রি")
        elif ow.get("rule30"):
            ow_detail = bi(f"Sponsors hold {ow['rule30']['pct']:.0f}%", f"উদ্যোক্তাদের হাতে {ow['rule30']['pct']:.0f}%")
    ca = sections.get("cash")
    ca_detail = None
    if ca:
        last = ca["years"][-1]
        r_ = last["ratio"]
        ca_detail = (bi("More cash went out than came in", "যত নগদ এসেছে তার চেয়ে বেশি বেরিয়ে গেছে") if r_ < 0
                     else bi("Almost all of the profit came in as cash", "মুনাফার প্রায় পুরোটাই নগদে এসেছে") if r_ >= CASH_STRONG_RATIO
                     else bi("Most of the profit came in as cash", "মুনাফার বেশির ভাগ নগদে এসেছে") if r_ >= 60
                     else bi("About half of the profit came in as cash", "মুনাফার প্রায় অর্ধেক নগদে এসেছে") if r_ >= 45
                     else bi("Little of the profit came in as cash", "মুনাফার সামান্যই নগদে এসেছে"))
    sf = sections.get("safety")
    sf_detail = None
    if sf and sf.get("_bits"):
        bits = sf["_bits"][:2]
        txt = " · ".join(b[0] for b in bits)
        sf_detail = bi(txt[0].upper() + txt[1:], " · ".join(b[1] for b in bits))
    ql = sections.get("quality")
    ql_detail = None
    if ql:
        ql_detail = bi(f"{ql['healthy']} of the {ql['checks']} things we look at are healthy",
                       f"আমরা যে {ql['checks']}টি বিষয় দেখি, তার {ql['healthy']}টি ভালো")

    cash_na = None
    if sc in _LENDERS:
        cash_na = bi("Not used for banks", "ব্যাংকের জন্য প্রযোজ্য নয়")
    elif sc == "INSURANCE":
        cash_na = bi("Not used for insurers", "বিমার জন্য প্রযোজ্য নয়")
    return [
        check("red_flags", bi("Red flags", "বড় সতর্কতা"), rf, rf_detail),
        check("price", bi("Price today", "আজকের দাম"), pr, pr_detail),
        check("dividend", bi("Dividend", "ডিভিডেন্ড"), dv, dv_detail),
        check("this_year", bi("This year", "এ বছর"), ty, ty_detail),
        check("owners", bi("Owners", "মালিকপক্ষ"), ow, ow_detail),
        check("cash", bi("Is the profit real?", "মুনাফা কি আসল?"), ca, ca_detail, na=cash_na),
        check("safety", bi("Debt and safety", "ঋণ ও নিরাপত্তা"), sf, sf_detail),
        check("quality", bi("Company quality", "কোম্পানির মান"), ql, ql_detail),
    ]


def build_summary(sections: dict, inp: dict) -> list[dict]:
    out = []
    ty, dv, pr, ql, sf = (sections.get(k) for k in ("this_year", "dividend", "price", "quality", "safety"))
    # 1 · a strength
    strength = None
    if ty and ty["tone"] == "good" and ty.get("_pct") is not None and ty.get("_eps"):
        lab = ty["fy_label"]
        extra_en = extra_bn = ""
        if dv and dv.get("_cur") and dv.get("_prev") and dv["_cur"] > dv["_prev"]:
            extra_en = f", and the dividend rose to {tk2(dv['_cur'])}"
            extra_bn = f", আর ডিভিডেন্ড বেড়ে {tk2(dv['_cur'])} হয়েছে"
        if ty.get("latest") and not ty.get("_full_year"):
            strength = bi(f"{ty['latest']['headline']['en']}{extra_en}.", f"{ty['latest']['headline']['bn']}{extra_bn}।")
        else:
            yr = ty.get("_fy_year")
            in_bn = f"{yr} অর্থবছরে" if yr else "এ বছর"
            strength = bi(f"Profit grew {ty['_pct']:.0f}% in {lab['en']} to {tk2(ty['_eps'])} a share{extra_en}.",
                          f"{in_bn} মুনাফা {ty['_pct']:.0f}% বেড়ে শেয়ারপ্রতি {tk2(ty['_eps'])} হয়েছে{extra_bn}।")
    elif ql and ql["tone"] == "good":
        strength = bi(ql["headline"]["en"].split(" Its strongest")[0], ql["headline"]["bn"].split(" সবচেয়ে ভালো")[0])
    elif sf and sf["tone"] == "good":
        strength = sf["headline"]
    elif dv and dv["tone"] == "good" and dv.get("_cur"):
        strength = bi(f"It has paid a cash dividend of {tk2(dv['_cur'])} a share.", f"শেয়ারপ্রতি {tk2(dv['_cur'])} নগদ ডিভিডেন্ড দিয়েছে।")
    elif (sections.get("owners") or {}).get("tone") == "good":
        strength = sections["owners"]["headline"]
    else:
        row = inp.get("score_row") or {}
        present = [(en, bn_, sr_) for k, en, bn_ in PILLARS if (sr_ := _f(row.get(k))) is not None]
        best = max(present, key=lambda p: p[2]) if present else None
        if best and best[2] >= 6:
            strength = bi(f"Its strongest point is {best[0].lower()}, at {best[2]:.1f} out of 10 in our checks.",
                          f"এর সবচেয়ে ভালো দিক {best[1]}, আমাদের যাচাইয়ে 10-এর মধ্যে {best[2]:.1f}।")
        elif present:
            strength = bi("We found no clear strength: each of our five checks scores under 6 out of 10.",
                          "স্পষ্ট কোনো শক্তির দিক পাইনি: আমাদের পাঁচটি যাচাইয়ের প্রতিটিই 10-এর মধ্যে 6-এর কম।")
    if strength:
        out.append(strength)
    # 2 · a price read
    if pr:
        ltp = pr["today"]
        pe = pr["pe"]
        if pe["now"] and pr.get("fair"):
            f = pr["fair"]
            rel_en = "below" if pe["usual"] and pe["now"] < pe["usual"] else "above" if pe["usual"] else ""
            rel_bn = "কম" if rel_en == "below" else "বেশি" if rel_en == "above" else ""
            out.append(bi(
                f"At {money(ltp)} it costs {_x(pe['now'])} times its profit"
                + (f", {rel_en} its usual {_x(pe['usual'])}" if pe["usual"] else "")
                + f". Our fair range is {money(f['low'])} to {money(f['high'])}.",
                f"{money(ltp)} দামে শেয়ারটির দাম মুনাফার {_x(pe['now'])} গুণ"
                + (f", যা এর স্বাভাবিক {_x(pe['usual'])} গুণের চেয়ে {rel_bn}" if pe["usual"] else "")
                + f"। আমাদের হিসাবে ন্যায্য দাম {money(f['low'])} থেকে {money(f['high'])}।",
            ))
        else:
            out.append(pr["headline"])
    # 3 · a watch-out
    rf = sections.get("red_flags") or {}
    bad = [c for c in rf.get("checks") or [] if c["level"] == "red"]
    amber = [c for c in rf.get("checks") or [] if c["level"] == "amber"]
    if bad:
        out.append(bi("Watch: " + _lc(bad[0]["detail"]["en"]),
                      "সতর্কতা: " + bad[0]["detail"]["bn"]))
    elif amber:
        en = _join_en([_short_watch(c)["en"] for c in amber[:2]])
        bn_ = _join_bn([_short_watch(c)["bn"] for c in amber[:2]])
        out.append(bi(f"Watch: {en}.", f"নজরে রাখুন: {bn_}।"))
    else:
        nxt = (sections.get("this_year") or {}).get("next")
        if nxt and nxt.get("date"):
            d_en, d_bn = _day_short(nxt["date"])
            out.append(bi(f"Nothing serious to watch right now. The next check is the results around {d_en}.",
                          f"এখন নজরে রাখার মতো গুরুতর কিছু নেই। পরের যাচাই {d_bn}-এর কাছাকাছি ফল প্রকাশের সময়।"))
        else:
            out.append(bi("Nothing serious to watch right now in our 16 checks.",
                          "আমাদের যাচাইয়ে এখন নজরে রাখার মতো গুরুতর কিছু নেই।"))
    return out[:3]


_SHORT_WATCH = {
    "cash": ("cash from the business fell while profit rose", "মুনাফা বাড়লেও ব্যবসার নগদ কমেছে"),
    "investors": ("big investors trimmed their stake", "বড় বিনিয়োগকারীরা অংশ কমিয়েছেন"),
    "owner_selling": ("an insider declared a sale", "একজন উদ্যোক্তা-পরিচালক বিক্রির ঘোষণা দিয়েছেন"),
    "payout": ("the dividend was more than the profit", "ডিভিডেন্ড মুনাফার চেয়ে বেশি"),
    "trading": ("trading is thin", "লেনদেন কম"),
    "loans": ("loans are larger than its saved profit", "ঋণ জমা মুনাফার চেয়ে বেশি"),
    "category": ("it is in category B", "এটি B ক্যাটাগরিতে"),
    "meetings": ("a board meeting or AGM was postponed", "পর্ষদ সভা বা এজিএম স্থগিত হয়েছে"),
    "regulator": ("the regulator took a step against it", "নিয়ন্ত্রক সংস্থা পদক্ষেপ নিয়েছে"),
    "rating": ("its credit rating is weak", "এর ক্রেডিট রেটিং দুর্বল"),
    "audit": ("the auditor added a note worth reading", "নিরীক্ষক একটি নোট দিয়েছেন"),
    "dse_query": ("DSE asked about an unusual price move", "ডিএসই অস্বাভাবিক দাম নিয়ে জানতে চেয়েছে"),
    "rally": ("the price ran up without news", "খবর ছাড়াই দাম বেড়েছে"),
}


def _short_watch(c: dict) -> dict:
    s = _SHORT_WATCH.get(c["key"])
    if s:
        return bi(s[0], s[1])
    en = c["detail"]["en"].rstrip(".")
    return bi(en[0].lower() + en[1:], c["detail"]["bn"].rstrip("।"))


def build_offer(sections: dict) -> list[dict]:
    """What Premium shows on THIS share, in plain words, from counts — never
    the answers (2026-10-30: the three-line summary left the page)."""
    out = [bi("Why each of the three lights is green, amber or red", "তিনটি আলোর প্রতিটি কেন সবুজ, হলুদ বা লাল")]
    rf = sections.get("red_flags")
    if rf:
        a = rf["counts"]["amber"]
        if a:
            out.append(bi(f"The {a} smaller {'thing' if a == 1 else 'things'} worth a look, and the notice behind each",
                          f"দেখে নেওয়ার মতো {a}টি ছোট বিষয়, আর প্রতিটির নোটিশ"))
    ow = sections.get("owners")
    if ow and (ow["trade_counts"]["buys"] or ow["trade_counts"]["sells"]):
        out.append(bi("Who among the people who run it bought or sold, and at what price",
                      "কোম্পানি যাঁরা চালান, তাঁদের মধ্যে কে কিনেছেন বা বিক্রি করেছেন, কোন দামে"))
    pr = sections.get("price")
    if pr and pr.get("fair"):
        out.append(bi("What we think a fair price is, and the price we would buy under", "আমাদের হিসাবে ন্যায্য দাম, আর কোন দামের নিচে কেনা ভালো"))
    elif pr:
        out.append(bi("How its price compares with its past and with similar companies", "এর দাম অতীত আর একই ধরনের কোম্পানির তুলনায় কেমন"))
    dv = sections.get("dividend")
    cps = ((dv or {}).get("latest") or {}).get("cash_ps") or (dv or {}).get("_cur")
    if dv and cps:
        out.append(bi("Whether the dividend is safe, and what it pays you after tax", "ডিভিডেন্ড নিরাপদ কি না, আর কর বাদে আপনি কত পাবেন"))
    ty = sections.get("this_year")
    if ty and any(q["cur"] is not None for q in ty.get("quarters") or []):
        out.append(bi("How each part of this year compares with last year, and what the next results need to show",
                      "এ বছরের প্রতিটি অংশ আগের বছরের তুলনায় কেমন, আর পরের ফলে কী দেখা দরকার"))
    return out[:6]


def build_events(inp: dict) -> list[dict]:
    today = inp["today"]
    start = today - timedelta(days=365)
    end = today + timedelta(days=60)
    notices = inp.get("notices") or {}
    out = []

    def add(d, kind, en, bn_, end_d=None):
        dd = _d(d)
        if dd and start <= dd <= end:
            out.append({"date": dd.isoformat(), "kind": kind, "label": bi(en, bn_), "end": _iso(end_d)})

    for r in _interims(notices):
        add(r.get("post_date"), "results", f"Q{r['quarter']} results", f"Q{r['quarter']}-এর ফল")
    for a in _annuals(notices):
        add(a.get("post_date"), "results", f"FY{a['year']} results", f"{a['year']} অর্থবছরের ফল")
    face = _f(inp.get("face_value")) or 10.0
    for d in inp.get("ledger") or []:
        cash = _f(d.get("cash_pct"))
        cps = round(cash * face / 100.0, 2) if cash else None
        add(d.get("declaration_date"), "dividend",
            f"Dividend declared: {tk2(cps)} a share" if cps else "Dividend declared",
            f"ডিভিডেন্ড ঘোষণা: শেয়ারপ্রতি {tk2(cps)}" if cps else "ডিভিডেন্ড ঘোষণা")
        add(d.get("record_date"), "record", "Record date", "রেকর্ড ডেট")
    for t in _insider_trades(inp):
        side = t["side"]
        add(t["declared"] or t["done"], f"insider_{side}",
            f"{t['role']['en']} {'bought' if side == 'buy' else 'sold'} {t['shares']:,} shares",
            f"{t['role']['bn']} {t['shares']:,}টি শেয়ার {'কিনেছেন' if side == 'buy' else 'বিক্রি করেছেন'}",
            end_d=t["done"] if t["declared"] else None)
    for c in notices.get("category_changes") or []:
        if isinstance(c, dict) and c.get("to"):
            add(c.get("post_date"), "category", f"Moved to category {c['to']}", f"{c['to']} ক্যাটাগরিতে গেছে")
    for r in _ratings(inp):
        add(r["date"], "rating", f"Rated {r['long_term']} by {r['agency']}", f"{r['agency']}-এর রেটিং {r['long_term']}")
    out.sort(key=lambda e: e["date"])
    dedup, seen = [], set()
    for e in out:
        k = (e["date"], e["kind"], e["label"]["en"])
        if k not in seen:
            seen.add(k)
            dedup.append(e)
    return dedup


def build_updated(inp: dict, red_flags: Optional[dict]) -> Optional[dict]:
    notices = inp.get("notices") or {}
    cands: list[tuple[date, int, dict]] = []  # (date, priority on ties, reason)
    for a in _annuals(notices)[:1]:
        if a.get("post_date"):
            cands.append((a["post_date"], 3, bi(f"after the FY{a['year']} results", f"{a['year']} অর্থবছরের ফল প্রকাশের পর")))
    ints = _interims(notices)
    if ints:
        newest = max(ints, key=lambda r: r.get("post_date") or date.min)
        if newest.get("post_date"):
            q = newest["quarter"]
            cands.append((newest["post_date"], 2, bi(f"after its Q{q} results", f"Q{q}-এর ফল প্রকাশের পর")))
    ledger = [d for d in inp.get("ledger") or [] if _d(d.get("declaration_date"))]
    if ledger:
        d0 = max(ledger, key=lambda d: _d(d["declaration_date"]))
        cands.append((_d(d0["declaration_date"]), 1, bi("after the dividend notice", "ডিভিডেন্ড ঘোষণার পর")))
    ch = ((inp.get("score_history") or {}).get("changes") or [])[:1]
    if ch and _d(ch[0].get("date")) and ch[0].get("to_tier") in TIER_WORDS:
        t = ch[0]["to_tier"]
        cands.append((_d(ch[0]["date"]), 0, bi(f"after its grade changed to {TIER_WORDS[t]}", f"গ্রেড বদলে {TIER_WORDS_BN[t]} হওয়ার পর")))
    for i in notices.get("inspections") or []:
        if isinstance(i, dict) and i.get("status") == "closed" and _d(i.get("post_date")):
            cands.append((_d(i["post_date"]), 4, bi("after a DSE factory inspection", "ডিএসইর কারখানা পরিদর্শনের পর")))
    for c in notices.get("category_changes") or []:
        if isinstance(c, dict) and c.get("to") and _d(c.get("post_date")):
            cands.append((_d(c["post_date"]), 4, bi(f"after its move to category {c['to']}", f"{c['to']} ক্যাটাগরিতে যাওয়ার পর")))
    for d, title, _ in _news_titles(inp.get("news") or [], inp["today"] - timedelta(days=NOTICE_DAYS)):
        if d and "qualified opinion" in title.lower():
            cands.append((d, 4, bi("after an audit warning", "নিরীক্ষকের সতর্কতার পর")))
    today = inp["today"]
    cands = [c for c in cands if c[0] and c[0] <= today]
    if not cands:
        return None
    d, _, reason = max(cands, key=lambda c: (c[0], c[1]))
    return {"date": d.isoformat(), "reason": reason}



# ---------------------------------------------------------------- the answer

# Signal reasons that a risk blocks (signal_service rules 4–6d): the light's
# word and the plain clause the answer line uses.
_RISK_BLOCKS = {
    "z_category": (bi("Category Z", "Z ক্যাটাগরি"),
                   bi("it is in DSE's category Z", "এটি ডিএসইর Z ক্যাটাগরিতে")),
    "stale_financials": (bi("Old accounts", "পুরোনো হিসাব"),
                         bi("it has not published yearly accounts for years", "কয়েক বছর ধরে বার্ষিক হিসাব প্রকাশ করেনি")),
    "thin_trading": (bi("Hard to sell", "বিক্রি কঠিন"),
                     bi("few of its shares trade each day, so selling can be hard",
                        "প্রতিদিন এর শেয়ার কম লেনদেন হয়, তাই বিক্রি কঠিন হতে পারে")),
    "earnings_dropped": (bi("Profit fell", "মুনাফা কমেছে"),
                         bi("profit fell sharply in the latest results", "সর্বশেষ ফলে মুনাফা অনেক কমেছে")),
    "heavy_debt": (bi("Heavy loans", "বেশি ঋণ"),
                   bi("its loans are larger than the whole company's value", "এর ঋণ পুরো কোম্পানির বাজারমূল্যের চেয়েও বেশি")),
    "red_flag": (bi("Red flag", "বড় সতর্কতা"),
                 bi("we found a serious warning in its notices", "এর নোটিশে একটি গুরুতর সতর্কতা পেয়েছি")),
}


def build_answer(inp: dict, sections: dict) -> dict:
    """The answer card (2026-10-30): should you buy it today? One answer made
    from three lights (the company, the price, anything wrong) that mirror
    the Buy signal's own rules (`signal_service._signal_for_row`), so the card
    never disagrees with the Buy / Sell chip.

    Free: the answer, its line (built only from the light words, no figures)
    and each light's word. Premium: each light's `why` and the buy price."""
    from backend.services.tiers import tier_key

    sig = inp.get("signal") or {}
    row = inp.get("score_row") or {}
    score = _f(row.get("score"))
    tier = sig.get("tier") if sig.get("tier") not in (None, "unknown") else tier_key(score)
    reason = sig.get("reason_key") or ""
    signal = sig.get("signal") or "none"
    ql, pr, rf = sections.get("quality"), sections.get("price"), sections.get("red_flags")

    # 1 · the company
    company = {
        "key": "company", "label": bi("The company", "কোম্পানি"),
        "word": bi(TIER_WORDS.get(tier, "Not rated"), TIER_WORDS_BN.get(tier, "রেটিং নেই")),
        "tone": {"excellent": "good", "good": "good", "average": "fair", "weak": "bad"}.get(tier, "neutral"),
        "href": "#ch-company",
        "why": ql["headline"] if ql else None,
    }

    # 2 · the price
    if reason == "near_52w_high":
        p_word, p_tone = bi("Near its yearly top", "বছরের সর্বোচ্চের কাছে"), "fair"
    elif pr:
        p_word = pr["word"]
        p_tone = "bad" if p_word["en"] == "High" else pr["tone"]
    else:
        p_word, p_tone = bi("Not rated", "রেটিং নেই"), "neutral"
    price = {
        "key": "price", "label": bi("The price", "দাম"), "word": p_word, "tone": p_tone,
        "href": "#ch-price", "why": pr["headline"] if pr else None,
    }

    # 3 · anything wrong: the signal's blockers first, then the report's red flags.
    reds = [c for c in (rf or {}).get("checks") or [] if c["level"] == "red"]
    ambers = [c for c in (rf or {}).get("checks") or [] if c["level"] == "amber"]
    block = reason if reason in _RISK_BLOCKS else ("red_flag" if reds else None)
    if block == "red_flag" and reds:
        r_word = (bi("Yes, a serious problem", "হ্যাঁ, একটি গুরুতর সমস্যা") if len(reds) == 1
                  else bi(f"Yes, {len(reds)} serious problems", f"হ্যাঁ, {len(reds)}টি গুরুতর সমস্যা"))
        r_why = reds[0]["detail"]
    elif block:
        r_word = bi("Yes: " + _lc(_RISK_BLOCKS[block][0]["en"]), "হ্যাঁ: " + _RISK_BLOCKS[block][0]["bn"])
        r_why = bi(sig.get("reason_en") or _RISK_BLOCKS[block][1]["en"],
                   sig.get("reason_bn") or _RISK_BLOCKS[block][1]["bn"])
    elif ambers:
        n = len(ambers)
        r_word = bi(f"{n} small {'thing' if n == 1 else 'things'} to check", f"{n}টি ছোট বিষয় দেখার মতো")
        r_why = rf["headline"]
    else:
        r_word = bi("Nothing serious", "গুরুতর কিছু নেই")
        r_why = rf["headline"] if rf else None
    risks = {
        "key": "risks", "label": bi("Anything wrong", "কোনো সমস্যা"), "word": r_word,
        "tone": "bad" if block else "fair" if ambers else "good",
        "href": "#ch-risks", "why": r_why,
    }

    # The answer.
    good = bi("An excellent company", "চমৎকার কোম্পানি") if tier == "excellent" else bi("A good company", "ভালো কোম্পানি")
    blocker = None
    if tier == "unknown" or score is None:
        decision, word, tone = "unrated", bi("Not rated yet", "এখনো রেটিং নেই"), "neutral"
        line = bi("We don't have enough figures to rate it yet.", "রেটিং দেওয়ার মতো যথেষ্ট তথ্য এখনো নেই।")
    elif signal == "sell" or tier == "weak":
        decision, word, tone, blocker = "avoid", bi("Avoid", "এড়িয়ে চলুন"), "bad", "company"
        line = bi("The business is weak. It is safer to stay out.", "ব্যবসা দুর্বল। দূরে থাকাই নিরাপদ।")
    elif tier == "average":
        decision, word, tone, blocker = "no_reason", bi("No reason to buy", "কেনার কারণ নেই"), "neutral", "company"
        line = bi("An average company. Nothing stands out enough to buy it.",
                  "মাঝারি মানের কোম্পানি। কেনার মতো আলাদা কিছু নেই।")
    elif signal == "buy" and not block:
        decision, tone = "buy", "good"
        word = bi("Strong buy", "জোরালোভাবে কেনা যায়") if sig.get("strength") == "strong" else bi("Buy", "কেনা যায়")
        fair = p_word["en"] == "Fair"
        line = bi(f"{good['en']} at a {'fair' if fair else 'low'} price, and nothing serious is wrong.",
                  f"{good['bn']}, {'ন্যায্য' if fair else 'কম'} দামে পাওয়া যাচ্ছে, আর গুরুতর কোনো সমস্যা নেই।")
    else:
        decision, word, tone = "wait", bi("Not yet", "এখন নয়"), "fair"
        if block:
            blocker = "risks"
            clause = _RISK_BLOCKS[block][1]
            if block == "red_flag" and reds:
                d0 = reds[0]["detail"]
                clause = bi("we found a serious problem: " + _lc(d0["en"]).rstrip("."),
                            "একটি গুরুতর সমস্যা পেয়েছি: " + d0["bn"].rstrip("।"))
            line = bi(f"{good['en']}, but {clause['en']}.", f"{good['bn']}, তবে {clause['bn']}।")
        else:
            blocker = "price"
            if reason == "near_52w_high":
                line = bi(f"{good['en']}, but the price is near its highest this year.",
                          f"{good['bn']}, তবে দাম এ বছরের সর্বোচ্চের কাছাকাছি।")
            elif p_word["en"] == "High":
                line = bi(f"{good['en']}, but the price is high right now.", f"{good['bn']}, তবে এখন দাম বেশি।")
            else:
                line = bi(f"{good['en']}, but the price is only fair. A lower price would be a better time to buy.",
                          f"{good['bn']}, তবে দাম শুধু ঠিকঠাক। দাম আরও কমলে কেনা ভালো হবে।")
            # The light that blocked the buy is never green.
            if price["tone"] == "good":
                price["tone"] = "fair"
            elif price["tone"] == "neutral":
                price["tone"] = "fair"

    return {
        "decision": decision, "word": word, "tone": tone, "line": line,
        "lights": [company, price, risks],
        "blocker": blocker,
        "buy_price": (pr or {}).get("buy_below"),
    }


# ---------------------------------------------------------------- the full report

# What a chapter's written read says about each word (2026-10-30, the full
# report plan https://claude.ai/artifact/1TuJ9dvifeXTLzs5wVwk2Q): the data put
# together, two or three plain sentences per chapter, Premium.
_PROFIT_LEAD = {
    "Growing": ("Its profit is growing", "এর মুনাফা বাড়ছে"),
    "Flat": ("Its profit is about the same as a year ago", "এর মুনাফা আগের বছরের মতোই"),
    "Slipping": ("Its profit is falling", "এর মুনাফা কমছে"),
}
_LOANS_LINE = {
    "Easily": ("It can pay its loans easily.", "ঋণ সহজেই সামলাতে পারে।"),
    "Yes": ("It can handle its loans.", "ঋণ সামলাতে পারে।"),
    "Watch this": ("Its loans are worth watching.", "এর ঋণ নজরে রাখার মতো।"),
    "Risky": ("Its loans are a real risk.", "এর ঋণ সত্যিই ঝুঁকির।"),
}
_CUSHION_LINE = {
    "Easily": ("strong", "শক্ত"), "Yes": ("good", "ভালো"), "Watch this": ("thin", "পাতলা"), "Risky": ("very thin", "খুব পাতলা"),
}


def _sentences(parts: list[Optional[dict]]) -> Optional[dict]:
    parts = [p for p in parts if p]
    if not parts:
        return None
    return bi(" ".join(p["en"] for p in parts), " ".join(p["bn"] for p in parts))


def _word(sec: Optional[dict]) -> Optional[str]:
    return ((sec or {}).get("word") or {}).get("en")


def _profit_cash_line(ty: Optional[dict], ca: Optional[dict]) -> Optional[dict]:
    """Profit direction joined with whether it came in as cash: the one
    sentence no single row says."""
    tyw, caw = _word(ty), _word(ca)
    if tyw == "Loss":
        if caw == "Yes":
            return bi("It is making a loss right now, though money is still coming into the business.",
                      "এখন এটি লোকসানে আছে, তবে ব্যবসায় এখনো টাকা আসছে।")
        return bi("It is making a loss right now.", "এখন এটি লোকসানে আছে।")
    lead = _PROFIT_LEAD.get(tyw or "")
    if not lead:
        return None
    en, bn_ = lead
    if caw == "Yes":
        if tyw == "Growing":
            tail = (", and it comes in as real money, so the growth looks real.",
                    ", আর তা আসল নগদ টাকা হয়েই আসছে, তাই বৃদ্ধিটা আসল বলেই মনে হয়।")
        elif tyw == "Slipping":
            tail = (", but what it earns still comes in as real money.", ", তবে যা আয় করে তা আসল নগদ টাকা হয়েই আসছে।")
        else:
            tail = (", and it comes in as real money.", ", আর তা আসল নগদ টাকা হয়েই আসছে।")
    elif caw == "Mostly":
        tail = (", and most of it comes in as real money.", ", আর এর বেশির ভাগ আসল নগদ হয়ে আসছে।")
    elif caw == "No":
        if tyw == "Growing":
            tail = (", but little of it comes in as real money, so check that the growth is real.",
                    ", তবে এর সামান্যই আসল নগদ হয়ে আসছে, তাই বৃদ্ধিটা আসল কি না দেখে নিন।")
        else:
            tail = (", and little of it comes in as real money.", ", আর এর সামান্যই আসল নগদ হয়ে আসছে।")
    else:
        tail = (".", "।")
    return bi(en + tail[0], bn_ + tail[1])


def _loans_line(sa: Optional[dict], sector_class: str) -> Optional[dict]:
    if not sa:
        return None
    if (sa.get("measures") or {}).get("no_loans"):
        return bi("It has no loans.", "এর কোনো ঋণ নেই।")
    w = _word(sa)
    if sector_class in _LENDERS and w in _CUSHION_LINE:
        c_en, c_bn = _CUSHION_LINE[w]
        return bi(f"It keeps a {c_en} cushion of its own money behind what it lends.",
                  f"যা ধার দেয় তার পেছনে নিজের টাকার {c_bn} সুরক্ষা রাখে।")
    line = _LOANS_LINE.get(w or "")
    return bi(*line) if line else None


def _size_line(se: Optional[dict]) -> Optional[dict]:
    size = (se or {}).get("_size")
    return bi(f"It is {_lc(size['en'])}.", f"এটি {size['bn']}।") if size else None


def build_reads(inp: dict, sections: dict) -> dict:
    """One written read per chapter (`ch-company` · `ch-price` · `ch-risks` ·
    `ch-next`): two or three plain sentences that put the chapter's answers
    together. Built only from the sections' own words and figures, so it never
    says something a row doesn't back up. Premium."""
    ty, ca, sa = sections.get("this_year"), sections.get("cash"), sections.get("safety")
    se, pr, dv = sections.get("sector"), sections.get("price"), sections.get("dividend")
    rf, ow, ri, nx = sections.get("red_flags"), sections.get("owners"), sections.get("risks"), sections.get("next")
    sc = inp.get("sector_class") or "GENERAL"
    ltp = _f(inp.get("ltp"))
    out: dict[str, Optional[dict]] = {}

    # The company: profit + cash, loans, its place in its sector.
    out["ch-company"] = _sentences([_profit_cash_line(ty, ca), _loans_line(sa, sc), _size_line(se)])

    # The price: years of profit now vs usual, our fair range, our buy price.
    if pr:
        pe = pr.get("pe") or {}
        now, usual = _f(pe.get("now")), _f(pe.get("usual"))
        if now and now > 0 and usual and usual > 0:
            years = bi(f"You pay for about {now:.0f} years of its profit today; it usually costs about {usual:.0f}.",
                       f"আজ আপনি এর প্রায় {now:.0f} বছরের মুনাফার দাম দিচ্ছেন; সাধারণত লাগে প্রায় {usual:.0f} বছরের।")
        elif now and now > 0:
            years = bi(f"You pay for about {now:.0f} years of its profit today.",
                       f"আজ আপনি এর প্রায় {now:.0f} বছরের মুনাফার দাম দিচ্ছেন।")
        else:
            years = bi("It made no profit in its latest results, so its price can't be judged on profit.",
                       "সর্বশেষ ফলে মুনাফা নেই, তাই মুনাফা দিয়ে এর দাম বিচার করা যায় না।")
        fair = pr.get("fair")
        fair_line = buy_line = None
        if fair and ltp:
            where = (("below it", "তার নিচে") if ltp < fair["low"] else ("above it", "তার ওপরে") if ltp > fair["high"]
                     else ("inside that range", "এর মধ্যেই"))
            fair_line = bi(
                f"By our sums a fair price is {money(fair['low'])} to {money(fair['high'])}, so today's {money(ltp)} is {where[0]}.",
                f"আমাদের হিসাবে ন্যায্য দাম {money(fair['low'])} থেকে {money(fair['high'])}, তাই আজকের {money(ltp)} {where[1]}।")
        bb = _f(pr.get("buy_below"))
        if fair and bb and ltp:
            buy_line = (bi(f"We would buy under {money(bb)}, which leaves room in case we are wrong.",
                           f"{money(bb)}-এর নিচে কেনা ভালো মনে করি, তাতে আমাদের ভুল হলেও কিছুটা নিরাপত্তা থাকে।")
                        if ltp > bb else
                        bi(f"That is already under {money(bb)}, the price we would buy under.",
                           f"এটি আমাদের কেনার দাম {money(bb)}-এর নিচেই।"))
        yld = _f((((dv or {}).get("latest")) or {}).get("yield_pct"))
        div_line = (bi(f"It also pays about {yld:.1f}% a year in cash on today's price.",
                       f"আজকের দামে এটি বছরে প্রায় {yld:.1f}% নগদ ডিভিডেন্ডও দেয়।") if yld and yld > 0 else None)
        out["ch-price"] = _sentences([years, fair_line, buy_line or div_line])

    # Anything wrong: the serious first, then the biggest smaller thing, the owners.
    if rf or ow:
        parts: list[Optional[dict]] = []
        checks = (rf or {}).get("checks") or []
        reds = [c for c in checks if c["level"] == "red"]
        ambers = [c for c in checks if c["level"] == "amber"]
        if reds:
            d0 = reds[0]["detail"]
            lead_en = "We found one serious problem: " if len(reds) == 1 else f"We found {len(reds)} serious problems. The biggest: "
            lead_bn = "একটি গুরুতর সমস্যা পেয়েছি: " if len(reds) == 1 else f"{len(reds)}টি গুরুতর সমস্যা পেয়েছি। সবচেয়ে বড়টি: "
            parts.append(bi(lead_en + _lc(d0["en"]).rstrip(".") + ".", lead_bn + d0["bn"].rstrip("।") + "।"))
        elif ambers:
            d0 = ambers[0]["detail"]
            parts.append(bi("Nothing is seriously wrong. The main thing to check: " + _lc(d0["en"]).rstrip(".") + ".",
                            "গুরুতর কোনো সমস্যা নেই। মূলত যা দেখে নেবেন: " + d0["bn"].rstrip("।") + "।"))
        elif rf:
            parts.append(bi("Nothing is wrong in any of the things we check.", "আমরা যা যা দেখি, তার কোনোটিতেই সমস্যা নেই।"))
        # What would make the named problem worse (or end it): only the first
        # item's, so "this" points at the thing the sentence before named.
        trig = (((ri or {}).get("items") or [{}])[0]).get("trigger") if (reds or ambers) else None
        if trig:
            parts.append(trig)
        if ow:
            w = _word(ow)
            r30 = ow.get("rule30") or {}
            if w == "Buying":
                parts.append(bi("The people who run it have been buying its shares, which is a good sign.",
                                "কোম্পানি যাঁরা চালান, তাঁরা এর শেয়ার কিনছেন, যা ভালো লক্ষণ।"))
            elif w == "Selling":
                parts.append(bi("The people who run it have been selling shares, which is worth checking.",
                                "কোম্পানি যাঁরা চালান, তাঁরা শেয়ার বিক্রি করছেন, যা খতিয়ে দেখার মতো।"))
            elif r30 and r30.get("ok") is False:
                parts.append(bi("The founders own less than the rules ask them to keep.",
                                "উদ্যোক্তা-পরিচালকদের হাতে নিয়মের চেয়ে কম শেয়ার আছে।"))
            else:
                parts.append(bi("The people who run it have not bought or sold shares this year.",
                                "এ বছর কোম্পানি যাঁরা চালান, তাঁরা শেয়ার কেনেননি বা বিক্রি করেননি।"))
        out["ch-risks"] = _sentences(parts)

    # What's next: the next dates, and what the first one needs to show.
    if nx:
        first = (nx.get("items") or [None])[0]
        exp = (first or {}).get("expect")
        if exp:
            # The row's line points at its own date; here it follows the sentence naming it.
            exp = bi(exp["en"].replace("by this day", "by then").replace("on this day", "on that day"),
                     exp["bn"].replace("এই দিনের মধ্যে", "তার মধ্যে").replace("এই দিনে", "সেদিন"))
        out["ch-next"] = _sentences([nx["headline"], exp])
    return {k: v for k, v in out.items() if v}


# What would end each "not yet", in plain words (the signal's own blockers).
_VIEW_FIX = {
    "z_category": bi("If it moves out of category Z, after paying a dividend and holding its yearly meeting.",
                     "লভ্যাংশ দিয়ে আর বার্ষিক সভা করে Z ক্যাটাগরি থেকে বেরিয়ে এলে।"),
    "stale_financials": bi("When it publishes up-to-date yearly accounts.", "হালনাগাদ বার্ষিক হিসাব প্রকাশ করলে।"),
    "thin_trading": bi("If more of its shares start trading each day.", "প্রতিদিন আরও বেশি শেয়ার লেনদেন হতে শুরু করলে।"),
    "earnings_dropped": bi("If its next results show profit recovering.", "পরের ফলে মুনাফা আবার বাড়তে দেখা গেলে।"),
    "heavy_debt": bi("If it pays its loans down below what the whole company is worth on the market.",
                     "পুরো কোম্পানির বাজারমূল্যের নিচে ঋণ নামিয়ে আনলে।"),
    "red_flag": bi("If the serious problem we found is resolved.", "যে গুরুতর সমস্যা পেয়েছি, তা মিটে গেলে।"),
}


def build_view(inp: dict, sections: dict, answer: dict) -> dict:
    """Our view (2026-10-30): where the report ends. The case for, the case
    against, what would change our answer (the Buy signal's own lines turned
    into prices and events, so it never disagrees with the chip) and our buy
    price. Premium; free readers see what it holds (`inside`)."""
    decision = answer.get("decision")
    ty, ca, sa = sections.get("this_year"), sections.get("cash"), sections.get("safety")
    pr, dv, ow = sections.get("price"), sections.get("dividend"), sections.get("owners")
    se, rf = sections.get("sector"), sections.get("red_flags")
    sc = inp.get("sector_class") or "GENERAL"
    reason = (inp.get("signal") or {}).get("reason_key")
    checks = (rf or {}).get("checks") or []

    pros: list[dict] = []
    cons: list[dict] = []
    # The case against: serious problems first, then what blocks a Buy.
    for c in [c for c in checks if c["level"] == "red"][:2]:
        cons.append(bi(c["detail"]["en"].rstrip(".") + ".", c["detail"]["bn"].rstrip("।") + "।"))
    if reason in _RISK_BLOCKS and reason != "red_flag":
        cl = _RISK_BLOCKS[reason][1]
        cons.append(bi(cl["en"][0].upper() + cl["en"][1:] + ".", cl["bn"] + "।"))

    tier = (answer.get("lights") or [{}])[0].get("word", {}).get("en")
    if tier == "Excellent":
        pros.append(bi("We grade the business excellent, one of the strongest on the DSE.",
                       "ব্যবসাকে আমরা চমৎকার গ্রেড দিই, ডিএসইর সবচেয়ে শক্তিশালীগুলোর একটি।"))
    elif tier == "Weak":
        cons.append(bi("We grade the business weak.", "ব্যবসাকে আমরা দুর্বল গ্রেড দিই।"))
    pc = _profit_cash_line(ty, ca)
    if pc and _word(ty) == "Growing" and _word(ca) != "No":
        pros.append(pc)
    elif pc and (_word(ty) in ("Loss", "Slipping") or _word(ca) == "No"):
        cons.append(pc)
    if _word(pr) == "Low":
        pros.append(bi("It is cheap for the profit it makes.", "মুনাফার তুলনায় এটি সস্তা।"))
    elif _word(pr) == "High":
        cons.append(bi("It is expensive for the profit it makes.", "মুনাফার তুলনায় এটি দামি।"))
    ll = _loans_line(sa, sc)
    if ll and _word(sa) in ("Easily", "Yes"):
        pros.append(ll)
    elif ll:
        cons.append(ll)
    if _word(dv) in ("Rising", "Steady"):
        # The word reads the last two years only, so never "every year".
        pros.append(bi("It has raised its cash dividend." if _word(dv) == "Rising" else "It has kept its cash dividend steady.",
                       "নগদ ডিভিডেন্ড বাড়িয়েছে।" if _word(dv) == "Rising" else "নগদ ডিভিডেন্ড একই রেখেছে।"))
    elif _word(dv) in ("Cut", "Falling"):
        cons.append(bi("It has cut its cash dividend.", "নগদ ডিভিডেন্ড কমিয়েছে।"))
    if _word(ow) == "Buying":
        pros.append(bi("The people who run it are buying its shares.", "কোম্পানি যাঁরা চালান, তাঁরা এর শেয়ার কিনছেন।"))
    elif _word(ow) == "Selling":
        cons.append(bi("The people who run it are selling shares.", "কোম্পানি যাঁরা চালান, তাঁরা শেয়ার বিক্রি করছেন।"))
    if _word(se) == "Top 3" and _size_line(se):
        pros.append(_size_line(se))
    ambers = [c for c in checks if c["level"] == "amber"]
    if ambers:
        n = len(ambers)
        cons.append(bi(f"{n} smaller {'thing' if n == 1 else 'things'} in its notices {'is' if n == 1 else 'are'} worth a look.",
                       f"এর নোটিশে {n}টি ছোট বিষয় দেখে নেওয়ার মতো।"))
    if not pros:
        pros.append(bi("We found little in its favour right now.", "এই মুহূর্তে এর পক্ষে তেমন কিছু পাইনি।"))
    if not cons:
        cons.append(bi("We found nothing serious against it.", "এর বিপক্ষে গুরুতর কিছু পাইনি।"))

    # What would change our answer: the signal's lines as prices and events.
    ltp = _f(inp.get("ltp"))
    top = _near_top(inp)
    bb = _f((pr or {}).get("buy_below"))
    change: list[dict] = []
    if decision == "buy":
        if top and ltp and ltp < top:
            change.append(bi(f"If the price climbs past {money(top)}, it is near its highest this year, and we would stop calling it a Buy.",
                             f"দাম {money(top)} ছাড়ালে তা এ বছরের সর্বোচ্চের কাছে চলে যাবে, তখন আর কেনার কথা বলব না।"))
        change.append(bi("If its next results show profit down by a quarter or more from a year earlier.",
                         "পরের ফলে মুনাফা আগের বছরের চেয়ে এক-চতুর্থাংশ বা তার বেশি কমলে।"))
        change.append(bi("If a serious problem turns up in its notices.", "এর নোটিশে কোনো গুরুতর সমস্যা দেখা দিলে।"))
    elif decision == "wait":
        if answer.get("blocker") == "risks":
            change.append(_VIEW_FIX.get(reason) or _VIEW_FIX["red_flag"])
        elif reason == "near_52w_high" and top:
            change.append(bi(f"If the price falls back under {money(top)}, it is no longer near its highest this year.",
                             f"দাম {money(top)}-এর নিচে নামলে তা আর এ বছরের সর্বোচ্চের কাছে থাকবে না।"))
        elif bb:
            change.append(bi(f"If the price falls under {money(bb)}, it reaches the price we would buy under.",
                             f"দাম {money(bb)}-এর নিচে নামলে তা আমাদের কেনার দামে পৌঁছাবে।"))
        if _word(ty) == "Growing" and answer.get("blocker") == "price":
            change.append(bi("If its profit keeps growing, today's price gets cheaper for the profit it makes.",
                             "মুনাফা বাড়তে থাকলে মুনাফার তুলনায় আজকের দাম সস্তা হয়ে আসবে।"))
    elif decision == "no_reason":
        change.append(bi("If the business improves enough for our grade to reach Good.",
                         "ব্যবসা এতটা ভালো হলে যে আমাদের গ্রেড ভালো-তে ওঠে।"))
        if _word(pr) != "Low":
            change.append(bi("Even then, we would want a lower price for the profit it makes.",
                             "তখনও, মুনাফার তুলনায় আরও কম দাম চাইব।"))
    elif decision == "avoid":
        change.append(bi("If the business recovers and our grade rises out of Weak.",
                         "ব্যবসা ঘুরে দাঁড়ালে আর আমাদের গ্রেড দুর্বল থেকে ওপরে উঠলে।"))
    else:
        change.append(bi("When it publishes enough figures for us to rate it.",
                         "রেটিং দেওয়ার মতো যথেষ্ট তথ্য প্রকাশ করলে।"))

    inside = [bi("The case for buying it, from this report", "এই রিপোর্ট থেকে কেনার পক্ষে যুক্তি"),
              bi("The case against it", "এর বিপক্ষে যুক্তি"),
              bi("What would change our answer, with the prices", "কী হলে আমাদের উত্তর বদলাবে, দামসহ")]
    if answer.get("buy_price") is not None:
        inside.append(bi("Our buy price, with a one-tap alert", "আমাদের কেনার দাম, এক ট্যাপে অ্যালার্টসহ"))
    return {
        "headline": bi(f"Our answer: {answer['word']['en']}. {answer['line']['en']}",
                       f"আমাদের উত্তর: {answer['word']['bn']}। {answer['line']['bn']}"),
        "for": pros[:3],
        "against": cons[:3],
        "change": change[:3],
        "buy_price": answer.get("buy_price"),
        "inside": inside,
    }


def _day_month(iso) -> Optional[dict]:
    d = _d(iso)
    return bi(f"{d.day} {_MON_EN[d.month]}", f"{d.day} {_MON_BN[d.month]}") if d else None


def build_next_questions(inp: dict, sections: dict, answer: dict, view: dict, reads: dict) -> list[dict]:
    """The free reader's one Premium card, under the answer (2026-10-30, plan
    https://claude.ai/artifact/UHZTK5nvUVrtzzmq6c2oSX). Each row pairs an
    answer the reader already has (`word`, free on the page) with the question
    it leaves (`ask` + `hint`), which the full report answers. `answer` is that
    Premium answer: the page shows it only as the sample from today's free
    report. Up to five, chosen for this share."""
    rows: list[dict] = []

    def add(key, word, tone, ask, hint, ans):
        if word and ask:
            rows.append({"key": key, "word": word, "tone": tone or "neutral", "ask": ask, "hint": hint, "answer": ans})

    dec = answer.get("decision")
    bp = answer.get("buy_price")
    change = (view or {}).get("change") or []
    first = change[0] if change else None
    if dec == "buy":
        price_line = bi(f"We would buy under {money(bp)}.", f"{money(bp)}-এর নিচে কেনা ভালো মনে করি।") if bp else None
        add("answer", answer["word"], answer["tone"], bi("Up to what price?", "কত দাম পর্যন্ত?"),
            bi("The price we would buy under, and what would make us stop saying Buy",
               "কোন দামের নিচে কেনা ভালো, আর কী হলে আর কেনার কথা বলব না") if bp else
            bi("What would make us stop saying Buy", "কী হলে আর কেনার কথা বলব না"),
            _sentences([price_line, first]))
    elif dec == "wait":
        add("answer", answer["word"], answer["tone"], bi("What would change it?", "কী হলে বদলাবে?"),
            bi("What has to happen before we say Buy, and the price we would buy under",
               "কেনার কথা বলার আগে কী হতে হবে, আর কোন দামের নিচে কেনা ভালো") if bp else
            bi("What has to happen before we say Buy", "কেনার কথা বলার আগে কী হতে হবে"),
            first)
    elif dec in ("no_reason", "avoid"):
        add("answer", answer["word"], answer["tone"], bi("What would change our answer?", "কী হলে আমাদের উত্তর বদলাবে?"),
            bi("The case for and against it, and what would have to change", "পক্ষে-বিপক্ষে যুক্তি, আর কী বদলাতে হবে"),
            first)

    pr = sections.get("price")
    pw = _word(pr)
    if pr and pw in ("Low", "High", "Fair"):
        ask = {"Low": bi("How low?", "কতটা কম?"), "High": bi("How high?", "কতটা বেশি?"),
               "Fair": bi("What is a fair price?", "ন্যায্য দাম কত?")}[pw]
        n = len(pr.get("methods") or [])
        if pr.get("fair"):
            hint = (bi(f"Our fair price, worked out {n} ways", f"আমাদের হিসাবে ন্যায্য দাম, {n}টি উপায়ে হিসাব করা") if n >= 2
                    else bi("Our fair price for it", "আমাদের হিসাবে এর ন্যায্য দাম"))
        else:
            hint = bi("How its price compares with its own past and with similar companies",
                      "এর দাম নিজের অতীত আর একই ধরনের কোম্পানির তুলনায় কেমন")
        add("price", pr["word"], "bad" if pw == "High" else pr["tone"], ask, hint, pr.get("headline"))

    rf = sections.get("red_flags")
    checks = (rf or {}).get("checks") or []
    reds = [c for c in checks if c["level"] == "red"]
    ambers = [c for c in checks if c["level"] == "amber"]
    risks_ans = reads.get("ch-risks") or (rf or {}).get("headline")
    if reds:
        one = len(reds) == 1
        add("red_flags", rf["word"], "bad", bi("How serious is it?" if one else "How serious are they?", "কতটা গুরুতর?"),
            bi("What it means for you, and what would end it" if one else "What they mean for you, and what would end them",
               "আপনার জন্য এর মানে কী, আর কী হলে এটি মিটবে" if one else "আপনার জন্য এগুলোর মানে কী, আর কী হলে এগুলো মিটবে"),
            risks_ans)
    elif ambers:
        n = len(ambers)
        add("red_flags", bi(f"{n} small {'thing' if n == 1 else 'things'}", f"{n}টি ছোট বিষয়"), "fair",
            bi("What is it?" if n == 1 else "What are they?", "সেটি কী?" if n == 1 else "সেগুলো কী?"),
            bi("Each one in plain words, with the notice behind it", "প্রতিটি সহজ ভাষায়, পেছনের নোটিশসহ"), risks_ans)

    ty = sections.get("this_year")
    if _word(ty) in ("Slipping", "Loss"):
        add("this_year", ty["word"], ty["tone"], bi("Is it getting worse?", "অবস্থা কি আরও খারাপ হচ্ছে?"),
            bi("How each part of this year compares with last year", "এ বছরের প্রতিটি অংশ আগের বছরের তুলনায় কেমন"),
            ty.get("headline"))

    ow = sections.get("owners")
    tc = (ow or {}).get("trade_counts") or {}
    if ow and (tc.get("buys") or tc.get("sells")):
        add("owners", ow["word"], ow["tone"], bi("Who, and at what price?", "কে, কোন দামে?"),
            bi("Who among the people who run it bought or sold, when, and what they paid",
               "কোম্পানি যাঁরা চালান, তাঁদের মধ্যে কে কখন কিনেছেন বা বিক্রি করেছেন, আর কত দামে"),
            ow.get("headline"))

    nx = sections.get("next")
    res = next((i for i in (nx or {}).get("items") or [] if i.get("kind") == "results"), None)
    dm = _day_month(res["date"]) if res else None
    if dm:
        word = (bi(f"Results around {dm['en']}", f"ফল আসবে প্রায় {dm['bn']}") if res.get("approx")
                else bi(f"Results on {dm['en']}", f"ফল আসবে {dm['bn']}"))
        add("next", word, "neutral", bi("What must they show?", "তাতে কী দেখা দরকার?"),
            bi("What the results need to show to keep our answer", "আমাদের উত্তর ধরে রাখতে ফলে কী দেখা দরকার"),
            res.get("expect") or nx.get("headline"))

    dv = sections.get("dividend")
    cps = ((dv or {}).get("latest") or {}).get("cash_ps")
    if dv and cps:
        add("dividend", dv["word"], dv["tone"], bi("Is it safe?", "এটি কি নিরাপদ?"),
            bi("What it pays you after tax, and whether it can keep paying", "কর বাদে আপনি কত পান, আর এটি দিয়ে যেতে পারবে কি না"),
            dv.get("headline"))

    al = sections.get("alternatives")
    if al:
        add("alternatives", al["word"], al["tone"], bi("Which ones?", "কোনগুলো?"),
            bi("Stronger companies in its sector at a lower price, and how each compares",
               "একই সেক্টরে আরও শক্তিশালী আর কম দামের কোম্পানি, আর প্রতিটির তুলনা"),
            al.get("headline"))
    return rows[:5]


# ---------------------------------------------------------------- the report

def _public(sec: Optional[dict]) -> Optional[dict]:
    """Drop the private `_` working fields before the section ships."""
    if not sec:
        return None
    return {k: v for k, v in sec.items() if not k.startswith("_")}


def build_report(inp: dict) -> dict:
    """The whole report from one bundle of inputs (see stock_report_service)."""
    fin = _sorted_fin(inp.get("financials") or [])
    growth = _eps_growth(fin, _f((inp.get("score_row") or {}).get("eps")))

    warning = build_warning(inp)
    this_year = build_this_year(inp)
    cash = build_cash(inp, this_year)
    price = build_price(inp)
    dividend = build_dividend(inp, growth)
    owners = build_owners(inp)
    safety = build_safety(inp)
    quality = build_quality(inp)
    red_flags = build_red_flags(inp, cash=cash, dividend=dividend, owners=owners, safety=safety, warning=warning)
    nxt = build_next(inp, this_year, dividend, safety)
    risks = build_risks(inp, red_flags)
    story = build_story(inp)
    sector = build_sector(inp)
    alts = build_alternatives(inp)

    work = {"red_flags": red_flags, "price": price, "dividend": dividend, "this_year": this_year,
            "owners": owners, "cash": cash, "safety": safety, "quality": quality, "next": nxt,
            "risks": risks, "story": story, "sector": sector, "alternatives": alts}
    scorecard = build_scorecard(work, inp)
    answer = build_answer(inp, work)
    reads = build_reads(inp, work)
    view = build_view(inp, work, answer)
    next_questions = build_next_questions(inp, work, answer, view, reads)
    summary = build_summary(work, inp)
    offer = build_offer(work)
    events = build_events(inp)
    updated = build_updated(inp, red_flags)
    sections = {k: _public(v) for k, v in work.items() if v}

    return {
        "version": 1,
        "as_of": _iso(inp.get("as_of")) or inp["today"].isoformat(),
        "updated": updated,
        "summary": summary,
        "summary_kinds": bi("A strength, a price read and a watch-out, written for this share.",
                            "একটি শক্তির দিক, দাম নিয়ে একটি মত আর একটি সতর্কতা, এই শেয়ারের জন্য লেখা।"),
        "answer": answer,
        "reads": reads,
        "view": view,
        "next_questions": next_questions,
        "scorecard": scorecard,
        "warning": warning,
        "events": events,
        "sections": sections,
        "offer": offer,
    }


def snapshot_fields(report: dict) -> dict:
    """The small slice the daily snapshot keeps: scorecard words (English), the
    flag counts and keys, the fair middle and the buy-below price."""
    secs = report.get("sections") or {}
    rf = secs.get("red_flags") or {}
    pr = secs.get("price") or {}
    return {
        "words": {c["key"]: c["word"]["en"] for c in report.get("scorecard") or []},
        "red": (rf.get("counts") or {}).get("red", 0),
        "amber": (rf.get("counts") or {}).get("amber", 0),
        "red_keys": [c["key"] for c in rf.get("checks") or [] if c["level"] == "red"],
        "red_lines": {c["key"]: c["detail"] for c in rf.get("checks") or [] if c["level"] == "red"},
        "fair_center": ((pr.get("fair") or {}).get("center")),
        "buy_below": pr.get("buy_below"),
        # The answer card (2026-10-30): the watcher's `answer` event diffs these.
        "decision": (report.get("answer") or {}).get("decision"),
        "answer_word": (report.get("answer") or {}).get("word"),
        "answer_line": (report.get("answer") or {}).get("line"),
    }
