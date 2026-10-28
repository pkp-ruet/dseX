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
            prefix_en = fyl["en"] if table["done"] >= 4 and annual else f"Q{table['done']}"
            prefix_bn = fyl["bn"] if table["done"] >= 4 and annual else f"Q{table['done']}"
            if pct is not None and prev and prev > 0 and cur > 0:
                up = pct >= 0
                if table["done"] >= 4 and annual:
                    headline_latest = bi(
                        f"{prefix_en}: profit {'up' if up else 'down'} {abs(pct):.0f}% to {tk2(cur)} a share",
                        f"{prefix_bn}: শেয়ারপ্রতি মুনাফা {abs(pct):.0f}% {'বেড়ে' if up else 'কমে'} {tk2(cur)}",
                    )
                else:
                    headline_latest = bi(
                        f"{prefix_en} results: profit {'up' if up else 'down'} {abs(pct):.0f}% in {period_en}, at {tk2(cur)} a share",
                        f"{prefix_bn}-এর ফল: {period_bn} শেয়ারপ্রতি মুনাফা {abs(pct):.0f}% {'বেড়ে' if up else 'কমে'} {tk2(cur)}",
                    )
            elif cur <= 0:
                headline_latest = bi(
                    f"{prefix_en}: a loss of {tk2(abs(cur))} a share in {period_en}",
                    f"{prefix_bn}: {period_bn} শেয়ারপ্রতি {tk2(abs(cur))} লোকসান",
                )
            else:
                headline_latest = bi(
                    f"{prefix_en}: profit of {tk2(cur)} a share in {period_en}",
                    f"{prefix_bn}: {period_bn} শেয়ারপ্রতি মুনাফা {tk2(cur)}",
                )

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
                up = pct >= 0
                headline_latest = bi(
                    f"FY{y1}: profit {'up' if up else 'down'} {abs(pct):.0f}% to {tk2(e1)} a share",
                    f"{y1} অর্থবছর: শেয়ারপ্রতি মুনাফা {abs(pct):.0f}% {'বেড়ে' if up else 'কমে'} {tk2(e1)}",
                )
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

    if both and fy_end:
        n = len(both)
        if not slip:
            head = bi(
                "All four quarters beat the same quarter last year." if n == 4
                else "Both quarters so far beat the same quarters last year." if n == 2
                else "The first quarter beat the same quarter last year." if n == 1
                else f"All {n} quarters so far beat the same quarter last year.",
                f"এ পর্যন্ত {n}টি প্রান্তিকের সবকটিতেই মুনাফা আগের বছরের একই প্রান্তিকের চেয়ে বেশি।",
            )
        elif not beat:
            head = bi(
                f"Every quarter so far fell short of the same quarter last year ({n} of {n}).",
                f"এ পর্যন্ত {n}টি প্রান্তিকের প্রতিটিতেই মুনাফা আগের বছরের একই প্রান্তিকের চেয়ে কম।",
            )
        else:
            names_en = _join_en([_quarter_words(fy_end, b["q"])["en"] for b in slip])
            names_bn = _join_bn([_quarter_words(fy_end, b["q"])["bn"] for b in slip])
            one = slip[0]
            detail_en = f", {tk2(one['cur'])} against {tk2(one['prev'])}" if len(slip) == 1 else ""
            detail_bn = f" ({tk2(one['cur'])}, আগের বছর {tk2(one['prev'])})" if len(slip) == 1 else ""
            num_en = {1: "One", 2: "Two", 3: "Three", 4: "Four"}.get(len(beat), str(len(beat)))
            of_en = {2: "two", 3: "three", 4: "four"}.get(n, str(n))
            head = bi(
                f"{num_en} of {of_en} quarters beat last year. Only {names_en} slipped{detail_en}.",
                f"{n}টি প্রান্তিকের মধ্যে {len(beat)}টিতে মুনাফা আগের বছরের চেয়ে বেশি। শুধু {names_bn} কমেছে{detail_bn}।",
            )
    else:
        head = headline_latest or bi("We have no quarterly figures for this year yet.",
                                     "এ বছরের প্রান্তিকের কোনো হিসাব এখনো আমাদের কাছে নেই।")

    # P/E on the new year's profit against last year's.
    meaning = []
    ltp = _f(inp.get("ltp"))
    if ltp and fy_eps_cur and fy_eps_cur > 0 and fy_eps_prev and fy_eps_prev > 0 and table and table["done"] >= 4:
        pe_new, pe_old = ltp / fy_eps_cur, ltp / fy_eps_prev
        meaning.append(bi(
            f"On the new yearly profit the share costs {_x(pe_new)} times profit, "
            f"{'down from' if pe_new < pe_old else 'up from'} {_x(pe_old)} on last year's.",
            f"নতুন বছরের মুনাফায় শেয়ারটির দাম মুনাফার {_x(pe_new)} গুণ, আগের বছরের মুনাফায় যা ছিল {_x(pe_old)} গুণ।",
        ))
    if cash_ytd and cash_ytd["cur"] is not None and cash_ytd["prev"] is not None:
        c, p = cash_ytd["cur"], cash_ytd["prev"]
        meaning.append(bi(
            f"Cash from the business came to {tk2(c)} a share, against {tk2(p)} a year earlier.",
            f"ব্যবসা থেকে নগদ এসেছে শেয়ারপ্রতি {tk2(c)}, এক বছর আগে যা ছিল {tk2(p)}।",
        ))

    nxt = None
    name_en = name_bn = ""
    next_info = _next_results(table, notices, today) if table else None
    if next_info:
        q = next_info["q"]
        nfe = next_info["fy_end"]
        qwords = _quarter_words(nfe, q) if q < 4 else bi("the full year", "পুরো বছর")
        name_en = f"Q{q} results" if q < 4 else f"FY{nfe.year} results"
        name_bn = f"Q{q}-এর ফল" if q < 4 else f"{nfe.year} অর্থবছরের ফল"
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
            when_en = f"{name_en} are likely around {d_en}" if next_info["approx"] else f"{name_en} are due on {d_en}"
            when_bn = f"{name_bn} সম্ভবত {d_bn}-এর কাছাকাছি আসবে" if next_info["approx"] else f"{name_bn} আসবে {d_bn}"
            if next_info["approx"] and next_info.get("basis"):
                b_en, b_bn = _day_short(next_info["basis"])
                when_en += f", since the board met on {b_en} last year"
                when_bn += f", কারণ গত বছর পর্ষদ সভা হয়েছিল {b_bn}"
        else:
            when_en = f"{name_en} are due"
            when_bn = f"{name_bn} যেকোনো দিন আসতে পারে"
        if bar is not None and bar > 0:
            what = bi(
                f"{when_en}. To keep growing, {qwords['en']} needs more than {tk2(bar)} a share.",
                f"{when_bn}। মুনাফা বাড়াতে হলে {qwords['bn']} শেয়ারপ্রতি {tk2(bar)}-এর বেশি দরকার।",
            )
        else:
            what = bi(f"{when_en}.", f"{when_bn}।")
        nxt = {"what": what, "date": _iso(next_info["date"]), "approx": bool(next_info["approx"]),
               "beat": round(bar, 2) if bar is not None else None}

    inside = []
    if both:
        inside.append(bi("Each quarter against the same quarter last year",
                         "প্রতিটি প্রান্তিক, আগের বছরের একই প্রান্তিকের সঙ্গে তুলনায়"))
    if cash_ytd:
        inside.append(bi("Cash from the business so far this year", "এ বছর এ পর্যন্ত ব্যবসা থেকে আসা নগদ টাকা"))
    if nxt:
        qn = (next_info or {}).get("q")
        inside.append(bi(
            f"When {'Q' + str(qn) if qn and qn < 4 else 'the yearly results'} {'is' if qn and qn < 4 else 'are'} due and the number to beat",
            f"{'Q' + str(qn) if qn and qn < 4 else 'বার্ষিক ফল'} কবে আসবে, আর কত মুনাফা হলে ভালো বলা যাবে",
        ))
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
        free_line=bi("We compare every quarter with the same quarter last year.",
                     "আমরা প্রতিটি প্রান্তিককে আগের বছরের একই প্রান্তিকের সঙ্গে তুলনা করি।"),
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
    if lat < 0:
        word, tone = bi("Weak", "দুর্বল"), "bad"
    elif lat < CASH_WEAK_RATIO:
        word, tone = (bi("Fair", "মোটামুটি"), "fair") if (usual or 0) >= CASH_STRONG_RATIO else (bi("Weak", "দুর্বল"), "bad")
    elif lat < CASH_STRONG_RATIO:
        word, tone = bi("Fair", "মোটামুটি"), "fair"
    else:
        word, tone = bi("Strong", "শক্তিশালী"), "good"

    fy = f"FY{latest['year']}"
    fy_bn = f"{latest['year']} অর্থবছরে"
    if lat < 0:
        head = bi(
            f"In {fy} the business paid out more cash than it brought in, while it reported a profit.",
            f"{fy_bn} কোম্পানি মুনাফা দেখালেও ব্যবসা থেকে নগদ টাকা আসার বদলে বেরিয়ে গেছে।",
        )
    else:
        head = bi(
            f"In {fy} each ৳100 of profit brought in ৳{lat} of cash." + (f" Its usual is about ৳{usual}." if usual is not None else ""),
            f"{fy_bn} প্রতি ৳100 মুনাফায় নগদ এসেছে ৳{lat}।" + (f" সাধারণত আসে প্রায় ৳{usual}।" if usual is not None else ""),
        )

    meaning = []
    # The latest year from the yearly notice: profit up while cash per share down.
    ann = _annuals(notices)
    a0 = ann[0] if ann else None
    if a0 and a0["year"] == latest["year"]:
        e, ep, c, cp = (_f(a0.get(k)) for k in ("eps", "eps_prev", "nocfps", "nocfps_prev"))
        if e and ep and ep > 0 and c is not None and cp and cp > 0:
            pr = (e - ep) / ep * 100.0
            cr = (c - cp) / cp * 100.0
            if pr > 0 and cr < 0:
                meaning.append(bi(
                    f"Profit rose {pr:.0f}% but cash from the business fell {abs(cr):.0f}%, from {tk2(cp)} to {tk2(c)} a share.",
                    f"মুনাফা {pr:.0f}% বেড়েছে, কিন্তু ব্যবসা থেকে আসা নগদ {abs(cr):.0f}% কমে শেয়ারপ্রতি {tk2(cp)} থেকে {tk2(c)} হয়েছে।",
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
                                f"The gap opened in {qw['en']}: {tk2(q4)} a share against {tk2(q4p)} a year earlier.",
                                f"ফারাকটা তৈরি হয়েছে {qw['bn']} সময়ে: শেয়ারপ্রতি {tk2(q4)}, এক বছর আগে যা ছিল {tk2(q4p)}।",
                            ))
            elif pr > 0 and cr >= 0:
                meaning.append(bi(
                    f"Profit rose {pr:.0f}% and cash from the business rose {cr:.0f}%, to {tk2(c)} a share.",
                    f"মুনাফা {pr:.0f}% বেড়েছে, ব্যবসা থেকে আসা নগদও {cr:.0f}% বেড়ে শেয়ারপ্রতি {tk2(c)} হয়েছে।",
                ))
    if tone in ("fair", "bad"):
        meaning.append(bi(
            "Profit can be booked before the money arrives, for example when stock builds up or customers pay late. "
            "The full annual report shows which. Two weak years in a row would make this a red flag.",
            "টাকা হাতে আসার আগেই মুনাফা হিসাবে দেখানো যায়, যেমন মজুত বাড়লে বা গ্রাহক দেরিতে টাকা দিলে। "
            "পুরো বার্ষিক প্রতিবেদনে কারণটা দেখা যায়। পরপর দুই বছর দুর্বল হলে এটি বড় সতর্কতা হবে।",
        ))
    else:
        meaning.append(bi(
            "Cash from the business is much harder to dress up than profit, so this backs the profit it reports.",
            "মুনাফার চেয়ে ব্যবসা থেকে আসা নগদ টাকা সাজিয়ে দেখানো অনেক কঠিন, তাই এটি কোম্পানির দেখানো মুনাফাকে সমর্থন করে।",
        ))

    watch = None
    nxt = (this_year or {}).get("next") if this_year else None
    if nxt and nxt.get("date"):
        d_en, d_bn = _day_short(nxt["date"])
        watch = bi(f"Next check: the next results, around {d_en}.", f"পরের যাচাই: পরের ফল, {d_bn}-এর কাছাকাছি।")

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
        free_line=bi("We check whether the profit it reports comes in as cash.",
                     "কোম্পানি যে মুনাফা দেখায়, তা নগদ টাকা হয়ে আসছে কি না, আমরা তা দেখি।"),
        inside=[
            bi(f"Cash for every ৳100 of profit, over {len(rows)} years", f"{len(rows)} বছর ধরে প্রতি ৳100 মুনাফায় কত নগদ এসেছে"),
            bi(f"How {fy} compares with its usual", f"{latest['year']} অর্থবছর সাধারণ বছরের তুলনায় কেমন"),
            bi("The level that would make it a red flag", "কোন পর্যায়ে এটি বড় সতর্কতা হবে"),
        ],
        meaning=meaning, watch=watch,
        years=rows, usual=usual,
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
        free = bi(f"Today {money(ltp)}. We think the price is below what the company is worth.",
                  f"আজকের দাম {money(ltp)}। আমাদের মতে দামটি কোম্পানির মূল্যের চেয়ে কম।")
    elif verdict == "expensive":
        word, tone = bi("High", "বেশি"), "fair"
        free = bi(f"Today {money(ltp)}. We think the price is above what the company is worth.",
                  f"আজকের দাম {money(ltp)}। আমাদের মতে দামটি কোম্পানির মূল্যের চেয়ে বেশি।")
    elif verdict == "fair":
        word, tone = bi("Fair", "ঠিকঠাক"), "neutral"
        free = bi(f"Today {money(ltp)}. We think the price is about right for the company.",
                  f"আজকের দাম {money(ltp)}। আমাদের মতে দামটি কোম্পানির জন্য মোটামুটি ঠিক।")
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
            grow_en = f"Profit grows {gp}%" if gp > 0 else "Profit stays the same"
            grow_bn = f"মুনাফা {gp}% বাড়ে" if gp > 0 else "মুনাফা একই থাকে"
            bull_is_usual = abs(bull_pe - usual_pe) < 1e-9
            scenarios = [
                {"label": bi(f"Profit falls {abs(round(SCEN_BEAR_EPS * 100))}%, P/E "
                             + (f"drops to {_x(bear_pe)}" if bear_pe < today_pe - 0.05 else f"stays at {_x(today_pe)}"),
                             f"মুনাফা {abs(round(SCEN_BEAR_EPS * 100))}% কমে, পিই "
                             + (f"নেমে {_x(bear_pe)} হয়" if bear_pe < today_pe - 0.05 else f"{_x(today_pe)}-তেই থাকে")),
                 "price": _round_price(bear)},
                {"label": bi(f"{grow_en}, P/E stays at {_x(today_pe)}", f"{grow_bn}, পিই {_x(today_pe)}-তেই থাকে"),
                 "price": _round_price(base)},
                {"label": bi(f"{grow_en}, P/E returns to its usual {_x(bull_pe)}" if bull_is_usual
                             else f"{grow_en}, P/E rises to its highest year-end level of {_x(bull_pe)}",
                             f"{grow_bn}, পিই এর স্বাভাবিক {_x(bull_pe)}-এ ফেরে" if bull_is_usual
                             else f"{grow_bn}, পিই বেড়ে বছর শেষের সর্বোচ্চ {_x(bull_pe)} হয়"),
                 "price": _round_price(bull)},
            ]

    if fair:
        where_en = "below" if gap < 0 else "above"
        where_bn = "কম" if gap < 0 else "বেশি"
        if abs(gap) < 3:
            head = bi(f"Our fair range is {money(fair['low'])} to {money(fair['high'])}. Today's {money(ltp)} is close to its middle.",
                      f"আমাদের হিসাবে ন্যায্য দাম {money(fair['low'])} থেকে {money(fair['high'])}। আজকের {money(ltp)} এর মাঝামাঝি।")
        else:
            head = bi(f"Our fair range is {money(fair['low'])} to {money(fair['high'])}. Today's {money(ltp)} is {abs(gap)}% {where_en} its middle.",
                      f"আমাদের হিসাবে ন্যায্য দাম {money(fair['low'])} থেকে {money(fair['high'])}। আজকের {money(ltp)} এর মাঝামাঝি দামের চেয়ে {abs(gap)}% {where_bn}।")
    elif pe_now:
        head = bi(
            f"At {money(ltp)} the share costs {_x(pe_now)} times its profit"
            + (f", against its usual {_x(usual)}" if usual else "") + (f" and {_x(sector_pe)} for its sector" if sector_pe else "") + ".",
            f"{money(ltp)} দামে শেয়ারটির দাম মুনাফার {_x(pe_now)} গুণ"
            + (f"; সাধারণত থাকে {_x(usual)} গুণ" if usual else "") + (f", আর সেক্টরে {_x(sector_pe)} গুণ" if sector_pe else "") + "।",
        )
    else:
        head = bi(f"Today {money(ltp)}. It has no profit to measure the price against.",
                  f"আজকের দাম {money(ltp)}। দাম মাপার মতো কোনো মুনাফা নেই।")

    meaning = []
    if pe_now and fair:
        meaning.append(bi(
            f"At {money(ltp)} the share costs {_x(pe_now)} times its profit."
            + (f" It has usually cost {_x(usual)} times" if usual else "")
            + (f", and similar companies cost {_x(sector_pe)} times." if (usual and sector_pe) else "." if usual else "")
            + (f" Similar companies cost {_x(sector_pe)} times." if (sector_pe and not usual) else ""),
            f"{money(ltp)} দামে শেয়ারটির দাম মুনাফার {_x(pe_now)} গুণ।"
            + (f" সাধারণত থাকে {_x(usual)} গুণ" if usual else "")
            + (f", আর একই ধরনের কোম্পানির {_x(sector_pe)} গুণ।" if (usual and sector_pe) else "।" if usual else "")
            + (f" একই ধরনের কোম্পানির {_x(sector_pe)} গুণ।" if (sector_pe and not usual) else ""),
        ))
    if fv and fv.get("estimates_disagree"):
        meaning.append(bi(
            "Our yardsticks point different ways for this share, so we don't show a single fair range.",
            "এই শেয়ারের ক্ষেত্রে আমাদের হিসাবগুলো ভিন্ন দিকে ইঙ্গিত করছে, তাই একক ন্যায্য দাম দেখাচ্ছি না।",
        ))
    if profit_fall:
        below = ltp < profit_fall["center"]
        meaning.append(bi(
            f"If profit fell {profit_fall['pct']}%, the middle of the range would drop to about {money(profit_fall['center'])}. "
            + ("The price would still sit below it." if below else "The price would then sit above it."),
            f"মুনাফা {profit_fall['pct']}% কমলে মাঝামাঝি দাম নেমে প্রায় {money(profit_fall['center'])} হবে। "
            + ("তখনও দামটি এর নিচে থাকবে।" if below else "তখন দামটি এর ওপরে থাকবে।"),
        ))
    if scenarios:
        meaning.append(bi(
            "The three prices for the next 12 months are sums from profit and the P/E it has traded at, not a forecast.",
            "আগামী 12 মাসের তিনটি দাম মুনাফা আর এর পুরোনো পিই থেকে করা হিসাব, পূর্বাভাস নয়।",
        ))

    watch = None
    if fair and buy_below:
        watch = bi(f"Below {money(buy_below)} the price leaves a 20% safety margin under our fair middle.",
                   f"{money(buy_below)}-এর নিচে দাম আমাদের ন্যায্য মাঝামাঝি দামের চেয়ে 20% নিরাপত্তা রাখে।")

    inside = []
    if fair:
        n = len(methods)
        inside.append(bi(f"Our fair range, worked out {n} {'way' if n == 1 else 'ways'}, on one scale",
                         f"{n}টি উপায়ে হিসাব করা আমাদের ন্যায্য দাম, এক মাপে"))
        inside.append(bi("A buy-below price, with a one-tap price alert", "কোন দামের নিচে কেনা ভালো, এক ট্যাপে প্রাইস অ্যালার্টসহ"))
    if scenarios:
        inside.append(bi("Three prices for the next 12 months, and what each one needs",
                         "আগামী 12 মাসের তিনটি দাম, আর প্রতিটির জন্য কী দরকার"))
    elif profit_fall:
        inside.append(bi("What a 20% fall in profit would do to it", "মুনাফা 20% কমলে এর কী হবে"))
    if not inside:
        inside.append(bi("How the price compares with its past and its sector", "দামটি এর অতীত আর সেক্টরের তুলনায় কেমন"))

    years = [r["_year"] for r in fin if _f(r.get("pe_ratio_basic"))]
    src_en = (f"P/E history FY{years[0]} to FY{years[-1]}" if len(years) > 1 else "Its P/E")
    src_bn = (f"পিইর ইতিহাস {years[0]} থেকে {years[-1]}" if len(years) > 1 else "এর পিই")
    if inp.get("sector"):
        src_en += f" · {inp['sector']} sector medians"
        src_bn += f" · {inp.get('sector_bn') or inp['sector']} সেক্টরের মাঝামাঝি পিই"
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
    elif prev and cur < prev * 0.98:
        pay_en = f" That is {payout:.0f}% of profit." if payout is not None else ""
        pay_bn = f" এটি মুনাফার {payout:.0f}%।" if payout is not None else ""
        head = bi(f"The dividend fell from {tk2(prev)} to {tk2(cur)} a share.{pay_en}",
                  f"ডিভিডেন্ড শেয়ারপ্রতি {tk2(prev)} থেকে কমে {tk2(cur)} হয়েছে।{pay_bn}")
    elif payout is not None and payout > 100:
        head = bi(f"It paid out more than it earned: {payout:.0f}% of profit.",
                  f"আয়ের চেয়ে বেশি ডিভিডেন্ড দিয়েছে: মুনাফার {payout:.0f}%।")
    elif cash_cover is not None and cash_cover < 1:
        head = bi(f"Cash from the business did not cover the dividend: {cash_cover:.1f} times.",
                  f"ব্যবসা থেকে আসা নগদে ডিভিডেন্ড পুরো মেটেনি: মাত্র {cash_cover:.1f} গুণ।")
    elif payout is not None and payout >= 70:
        head = bi(f"It pays out most of its profit: {payout:.0f}%. Little is left to grow the business.",
                  f"মুনাফার বেশির ভাগই ডিভিডেন্ডে দেয়: {payout:.0f}%। ব্যবসা বাড়ানোর জন্য কম থাকে।")
    elif payout is not None:
        cov_en = f", covered {cash_cover:.1f} times by cash" if cash_cover is not None else ""
        cov_bn = f", আর ব্যবসার নগদে {cash_cover:.1f} গুণ মেটে" if cash_cover is not None else ""
        head = bi(f"Paid comfortably: {payout:.0f}% of profit{cov_en}.",
                  f"স্বচ্ছন্দে দেওয়া: মুনাফার {payout:.0f}%{cov_bn}।")
    else:
        head = bi(f"It paid {tk2(cur)} a share in cash for FY{cur_y}.", f"{cur_y} অর্থবছরে শেয়ারপ্রতি {tk2(cur)} নগদ দিয়েছে।")

    meaning = []
    if on_10k:
        meaning.append(bi(
            f"On ৳10,000 ({on_10k['shares']:,} shares) it pays {money(on_10k['gross'])} before tax, {money(on_10k['net'])} after the {DIV_TAX_PCT:.0f}% tax.",
            f"৳10,000-এ ({on_10k['shares']:,}টি শেয়ার) কর বাদের আগে {money(on_10k['gross'])}, {DIV_TAX_PCT:.0f}% কর বাদে {money(on_10k['net'])}।",
        ))
    if rec_rows:
        r = rec_rows[0]
        m_en, m_bn = _mon(r["date"])
        mv = r["move"]
        if mv < 0:
            move_en = f"The price fell {tk2(abs(mv))} on the first day after the record date."
            move_bn = f"রেকর্ড ডেটের পরের প্রথম দিনে দাম {tk2(abs(mv))} কমেছিল।"
        elif mv > 0:
            move_en = f"The price rose {tk2(mv)} on the first day after the record date."
            move_bn = f"রেকর্ড ডেটের পরের প্রথম দিনে দাম {tk2(mv)} বেড়েছিল।"
        else:
            move_en = "The price did not change on the first day after the record date."
            move_bn = "রেকর্ড ডেটের পরের প্রথম দিনে দাম বদলায়নি।"
        kept = r["kept_ps"]
        b_en = (f" It also gave {r['bonus_pct']:.0f}% bonus shares, which we count at the new price."
                if r.get("bonus_pct") else "")
        b_bn = (f" সঙ্গে {r['bonus_pct']:.0f}% বোনাস শেয়ারও দিয়েছিল, যা নতুন দামে ধরা হয়েছে।"
                if r.get("bonus_pct") else "")
        if kept > r["fees_ps"]:
            end_en = f"A buyer who came only for the dividend kept about {tk2(kept)} a share, more than the {tk2(r['fees_ps'])} in fees."
            end_bn = f"শুধু ডিভিডেন্ডের জন্য কেনা ক্রেতার শেয়ারপ্রতি প্রায় {tk2(kept)} থেকেছে, যা {tk2(r['fees_ps'])} খরচের চেয়ে বেশি।"
        elif kept > 0:
            end_en = f"A buyer who came only for the dividend kept about {tk2(kept)} a share, and fees of about {tk2(r['fees_ps'])} took more than that."
            end_bn = f"শুধু ডিভিডেন্ডের জন্য কেনা ক্রেতার শেয়ারপ্রতি প্রায় {tk2(kept)} থেকেছে, আর প্রায় {tk2(r['fees_ps'])} খরচ তার চেয়ে বেশি।"
        else:
            end_en = f"A buyer who came only for the dividend lost about {tk2(abs(kept) + r['fees_ps'])} a share after fees."
            end_bn = f"শুধু ডিভিডেন্ডের জন্য কেনা ক্রেতার খরচসহ শেয়ারপ্রতি প্রায় {tk2(abs(kept) + r['fees_ps'])} লোকসান হয়েছে।"
        meaning.append(bi(
            f"Last time, in {m_en}, it paid {tk2(r['cash_ps'])} ({tk2(r['net_ps'])} after tax). {move_en}{b_en} {end_en}",
            f"গতবার, {m_bn}-এ, শেয়ারপ্রতি {tk2(r['cash_ps'])} দিয়েছিল (কর বাদে {tk2(r['net_ps'])})। {move_bn}{b_bn} {end_bn}",
        ))
    if next_range:
        p = next_range["_payout"] * 100
        lo, hi = next_range["low"], next_range["high"]
        rng_en = f"about {_tk_est(lo)}" + (f" to {_tk_est(hi)}" if _tk_est(hi) != _tk_est(lo) else "")
        rng_bn = f"প্রায় {_tk_est(lo)}" + (f" থেকে {_tk_est(hi)}" if _tk_est(hi) != _tk_est(lo) else "")
        meaning.append(bi(
            f"At its usual {p:.0f}% payout, next year's dividend would be {rng_en} a share if profit holds or grows.",
            f"সাধারণত মুনাফার {p:.0f}% দেয়। মুনাফা একই থাকলে বা বাড়লে আগামী বছরের ডিভিডেন্ড হতে পারে শেয়ারপ্রতি {rng_bn}।",
        ))

    watch = None
    if latest and latest["upcoming"] and latest.get("cash_ps") and latest.get("buy_by"):
        b_en, b_bn = _day(latest["buy_by"])
        r_en, r_bn = _day(latest["record_date"])
        watch = bi(f"To get the {tk2(latest['cash_ps'])}, you need to buy by {b_en}. The record date is {r_en}.",
                   f"{tk2(latest['cash_ps'])} পেতে হলে {b_bn}-এর মধ্যে কিনতে হবে। রেকর্ড ডেট {r_bn}।")

    n_paid = len([h for h in history[-10:] if h["cash_ps"] > 0])
    n_years = len(history[-10:])
    free = bi(f"It has paid a cash dividend in {n_paid} of the last {n_years} years.",
              f"গত {n_years} বছরের মধ্যে {n_paid} বছর নগদ ডিভিডেন্ড দিয়েছে।") if n_years else None

    inside = []
    if cps:
        inside.append(bi(f"What {tk2(cps)} is worth after tax and the record-date price drop",
                         f"কর আর রেকর্ড ডেটের পরের দরপতনের পর {tk2(cps)} আসলে কত"))
    inside.append(bi("Is it safe? How much of profit and cash it uses", "ডিভিডেন্ড কি নিরাপদ? মুনাফা আর নগদের কতটা লাগে"))
    inside.append(bi(f"{len(history)} years of dividends, and next year's likely range" if len(history) > 1 else "Next year's likely range",
                     f"{len(history)} বছরের ডিভিডেন্ড, আর আগামী বছরের সম্ভাব্য পরিমাণ" if len(history) > 1 else "আগামী বছরের সম্ভাব্য পরিমাণ"))

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
    ("sponsor_director_pct", "Sponsors and directors", "উদ্যোক্তা-পরিচালক"),
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
    spon_move = next((t["to_pct"] - t["from_pct"] for t in trend if t["group"]["en"].startswith("Sponsors")), 0.0)
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

    if trades and (not buys or not sells):
        ts = buys or sells
        verb_en, verb_bn = ("bought", "কিনেছেন") if buys else ("sold", "বিক্রি করেছেন")
        w_en, w_bn = who(ts)
        m_en, m_bn = months(ts)
        n = sum(t["shares"] for t in ts)
        v = total_value(ts)
        v_en, v_bn = _crore(v) if v else ("", "")
        head = bi(
            f"{w_en} {verb_en} {n:,} shares {m_en}" + (f", about {v_en}" if v else "") + ".",
            f"{w_bn} {m_bn} {n:,}টি শেয়ার {verb_bn}" + (f", যার মূল্য প্রায় {v_bn}" if v else "") + "।",
        )
    elif trades:
        nb = sum(t["shares"] for t in buys)
        ns = sum(t["shares"] for t in sells)
        head = bi(f"Insiders bought {nb:,} shares and sold {ns:,} in the last 12 months.",
                  f"গত 12 মাসে সংশ্লিষ্টরা {nb:,}টি শেয়ার কিনেছেন আর {ns:,}টি বিক্রি করেছেন।")
    elif spon is not None:
        head = bi(f"No sponsor or director bought or sold shares in the last 12 months. Sponsors and directors own {spon:.1f}%.",
                  f"গত 12 মাসে কোনো উদ্যোক্তা-পরিচালক শেয়ার কেনেননি বা বিক্রি করেননি। তাঁদের হাতে {spon:.1f}% শেয়ার।")
    else:
        head = bi("No sponsor or director bought or sold shares in the last 12 months.",
                  "গত 12 মাসে কোনো উদ্যোক্তা-পরিচালক শেয়ার কেনেননি বা বিক্রি করেননি।")

    meaning = []
    lows = [t["price_low"] for t in trades if t["price_low"]]
    highs = [t["price_high"] for t in trades if t["price_high"]]
    ltp = _f(inp.get("ltp"))
    if lows and highs and ltp and (not buys or not sells):
        verb_en, verb_bn = ("paid", "কিনেছেন") if buys else ("sold at", "বিক্রি করেছেন")
        meaning.append(bi(
            f"The people who run it {verb_en} {money(min(lows))} to {money(max(highs))} a share. Today it is {money(ltp)}.",
            f"কোম্পানি যাঁরা চালান, তাঁরা শেয়ারপ্রতি {money(min(lows))} থেকে {money(max(highs))} দামে {verb_bn}। আজকের দাম {money(ltp)}।",
        ))
    for t in trend:
        up = t["to_pct"] > t["from_pct"]
        g = t["group"]
        f_en, f_bn = _mon(t["from_date"])
        meaning.append(bi(
            f"{g['en']} {'raised' if up else 'lowered'} their share from {t['from_pct']:.1f}% to {t['to_pct']:.1f}% since {f_en}.",
            f"{f_bn}-এর পর থেকে {g['bn']} তাঁদের অংশ {t['from_pct']:.1f}% থেকে {'বাড়িয়ে' if up else 'কমিয়ে'} {t['to_pct']:.1f}% করেছেন।",
        ))
    if buys and not sells:
        meaning.append(bi("When the people who run a company buy with their own money, they usually expect it to do well.",
                          "কোম্পানি যাঁরা চালান তাঁরা নিজের টাকায় শেয়ার কিনলে সাধারণত বোঝা যায়, তাঁরা কোম্পানির ভবিষ্যৎ ভালো দেখছেন।"))
    elif sells and not buys:
        meaning.append(bi("Insiders sell for many reasons, but a sale by the people who run a company is worth checking.",
                          "নানা কারণে শেয়ার বিক্রি হতে পারে, তবে কোম্পানি যাঁরা চালান তাঁদের বিক্রি একবার খতিয়ে দেখা ভালো।"))

    watch = None
    if rule30 and not rule30["ok"]:
        watch = bi(f"Sponsors and directors hold {rule30['pct']:.1f}% together, under the 30% the BSEC rule asks for.",
                   f"উদ্যোক্তা-পরিচালকদের মোট অংশ {rule30['pct']:.1f}%, যা বিএসইসির 30% নিয়মের নিচে।")
    else:
        watch = bi("We will show it here if a sponsor or director declares a sale.",
                   "কোনো উদ্যোক্তা-পরিচালক বিক্রির ঘোষণা দিলে আমরা এখানে দেখাব।")

    nb, ns = len(buys), len(sells)
    if nb + ns == 0:
        free = bi("No insider trades in the last 12 months.", "গত 12 মাসে উদ্যোক্তা-পরিচালকদের কোনো কেনাবেচা হয়নি।")
    elif ns == 0:
        free = bi(f"{nb} insider {'trade' if nb == 1 else 'trades'} in the last 12 months. {'It was a buy' if nb == 1 else 'All were buys'}.",
                  f"গত 12 মাসে উদ্যোক্তা-পরিচালকদের {nb}টি লেনদেন। {'এটি কেনা' if nb == 1 else 'সবগুলোই কেনা'}।")
    elif nb == 0:
        free = bi(f"{ns} insider {'trade' if ns == 1 else 'trades'} in the last 12 months. {'It was a sale' if ns == 1 else 'All were sales'}.",
                  f"গত 12 মাসে উদ্যোক্তা-পরিচালকদের {ns}টি লেনদেন। {'এটি বিক্রি' if ns == 1 else 'সবগুলোই বিক্রি'}।")
    else:
        free = bi(f"{nb + ns} insider trades in the last 12 months: {nb} {'buy' if nb == 1 else 'buys'} and {ns} {'sale' if ns == 1 else 'sales'}.",
                  f"গত 12 মাসে উদ্যোক্তা-পরিচালকদের {nb + ns}টি লেনদেন: {nb}টি কেনা, {ns}টি বিক্রি।")

    inside = []
    if trades:
        inside.append(bi("Who traded, how many shares, and the price then", "কে কেনাবেচা করেছেন, কত শেয়ার, আর তখনকার দাম"))
    if window:
        f_en, f_bn = _mon(window[0][0])
        inside.append(bi(f"How each owner group moved since {f_en}", f"{f_bn}-এর পর থেকে কোন মালিকপক্ষের অংশ কতটা বদলেছে"))
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

    def bump(n):
        nonlocal level
        level = max(level, n)

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
                facts.append({"label": bi("Loans", "ঋণ"), "value": bi("None", "নেই"), "tone": "good"})
                detail_bits.append(("no loans", "কোনো ঋণ নেই"))
            else:
                c_en, c_bn = _crore(loan)
                facts.append({"label": bi("Loans", "ঋণ"), "value": bi(c_en, c_bn), "tone": "neutral"})
                if res and res > 0:
                    r_ = loan / res
                    t = "good" if r_ < 0.5 else "fair" if r_ <= 1 else "bad"
                    facts.append({"label": bi("Loans against saved profit", "জমা মুনাফার তুলনায় ঋণ"),
                                  "value": bi(f"{r_ * 100:.0f}%", f"{r_ * 100:.0f}%"), "tone": t})
                    detail_bits.append((f"loans {r_ * 100:.0f}% of saved profit", f"ঋণ জমা মুনাফার {r_ * 100:.0f}%"))
                    bump(0 if r_ < 0.1 else 1 if r_ <= 1 else 2)
                if mcap and mcap > 0:
                    m_ = loan / mcap
                    t = "good" if m_ < 0.5 else "fair" if m_ <= 1 else "bad"
                    facts.append({"label": bi("Loans against market value", "বাজার মূলধনের তুলনায় ঋণ"),
                                  "value": bi(f"{m_ * 100:.0f}%", f"{m_ * 100:.0f}%"), "tone": t})
                    if m_ > 1:
                        bump(3)
        else:
            bump(1)
        # Interest cover from the latest accounts (magnitude of the interest line).
        ext = sorted(inp.get("extended_financials") or [], key=lambda r: int(r.get("year") or 0))
        for r in reversed(ext):
            ebit, ie = _f(r.get("ebit")), _f(r.get("interest_expense"))
            if ebit is not None and ie:
                ic = ebit / abs(ie)
                t = "good" if ic >= 3 else "fair" if ic >= 1.5 else "bad"
                facts.append({"label": bi("Profit against interest", "সুদের তুলনায় মুনাফা"),
                              "value": bi(f"{ic:.1f} times", f"{ic:.1f} গুণ"), "tone": t})
                bump(0 if ic >= 3 else 2 if ic >= 1.5 else 3)
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
    words = [(bi("Very safe", "খুব নিরাপদ"), "good"), (bi("Safe", "নিরাপদ"), "good"),
             (bi("Watch", "নজর রাখুন"), "fair"), (bi("Risky", "ঝুঁকিপূর্ণ"), "bad")]
    word, tone = words[level]

    bits_en = _join_en([b[0] for b in detail_bits][:2])
    bits_bn = _join_bn([b[1] for b in detail_bits][:2])
    if bits_en:
        head = bi(f"{word['en']}: {bits_en}.", f"{word['bn']}: {bits_bn}।")
    else:
        head = bi(f"{word['en']}.", f"{word['bn']}।")
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
    if rating:
        meaning.append(bi(f"{rating['agency']} rates it {rating['long_term']}"
                          + (f" with a {rating['outlook'].lower()} outlook" if rating.get("outlook") else "") + ". "
                          "Ratings from AAA to BBB- mean the company is expected to meet its debts.",
                          f"{rating['agency']} এর রেটিং দিয়েছে {rating['long_term']}"
                          + (f", দৃষ্টিভঙ্গি {rating['outlook']}" if rating.get("outlook") else "") + "। "
                          "AAA থেকে BBB- রেটিংয়ের অর্থ, কোম্পানি তার দেনা শোধ করতে পারবে বলে আশা করা হয়।"))
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
        inside.append(bi("Its loans against saved profit and market value", "জমা মুনাফা আর বাজার মূলধনের তুলনায় এর ঋণ"))
    if any(f["label"]["en"].startswith("Profit against") for f in facts):
        inside.append(bi("How easily its profit covers the interest", "মুনাফা দিয়ে সুদ কত সহজে মেটে"))
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

    rank_en = f", {_ordinal(rank)} of {total} companies" if rank and total else ""
    rank_bn = f"; {total}টি কোম্পানির মধ্যে {rank} নম্বরে" if rank and total else ""
    head_en = f"Graded {word['en']}, {score:.0f} out of 100{rank_en}."
    head_bn = f"গ্রেড {word['bn']}, 100-এর মধ্যে {score:.0f}{rank_bn}।"
    if len(present) >= 2:
        best = max(present, key=lambda p: p[3])
        worst = min(present, key=lambda p: p[3])
        head_en += f" Its strongest check is {best[1]} at {best[3]:.1f} out of 10, and its weakest is {worst[1]} at {worst[3]:.1f}."
        head_bn += f" সবচেয়ে ভালো {best[2]} (10-এর মধ্যে {best[3]:.1f}), সবচেয়ে দুর্বল {worst[2]} ({worst[3]:.1f})।"
    meaning = [bi(f"{healthy} of {len(present)} checks look healthy, scoring 6 or more out of 10.",
                  f"{len(present)}টির মধ্যে {healthy}টি যাচাই ভালো, 10-এর মধ্যে 6 বা তার বেশি।")]
    lines = [(75.0, "Excellent", "চমৎকার"), (60.0, "Good", "ভালো"), (45.0, "Average", "মাঝারি")]
    above = next((l for l in lines if score < l[0]), None)
    below = next((l for l in lines if score >= l[0]), None)
    watch = None
    if above:
        gap = above[0] - score
        watch = bi(f"It is {gap:.1f} points below {above[1]}, which starts at {above[0]:.0f}.",
                   f"{above[2]} গ্রেড শুরু হয় {above[0]:.0f}-এ; এটি তার চেয়ে {gap:.1f} পয়েন্ট নিচে।")
    if below:
        gap = score - below[0]
        if gap < 3:
            watch = bi(f"It sits {gap:.1f} points above the line for {below[1]}, so a small change could move the grade.",
                       f"এটি {below[2]} গ্রেডের সীমার মাত্র {gap:.1f} পয়েন্ট ওপরে, তাই সামান্য বদলেই গ্রেড বদলাতে পারে।")
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
        free_line=bi("We check five things: profit, finances, business strength, price and dividend.",
                     "আমরা পাঁচটি বিষয় দেখি: মুনাফা, আর্থিক অবস্থা, ব্যবসার শক্তি, দাম আর ডিভিডেন্ড।"),
        inside=[bi("What each of the five checks found", "পাঁচটি যাচাইয়ে কী পাওয়া গেছে"),
                bi("Its strongest and weakest check", "সবচেয়ে ভালো আর সবচেয়ে দুর্বল যাচাই"),
                bi("How far it is from the next grade", "পরের গ্রেড থেকে কত দূরে")],
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
    last = rows[-1]
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

    fr_en, fr_bn = _crore(first["revenue_cr"] * 10)
    la_en, la_bn = _crore(last["revenue_cr"] * 10)
    if s_c is not None:
        head = bi(
            f"Sales {'grew' if s_c >= 0 else 'shrank'} {abs(s_c):.0f}% a year, from {fr_en} in {first['year']} to {la_en} in {last['year']}"
            + (f", and profit {'grew' if p_c >= 0 else 'fell'} {abs(p_c):.0f}% a year." if p_c is not None else "."),
            f"বিক্রি বছরে {abs(s_c):.0f}% {'বেড়ে' if s_c >= 0 else 'কমে'} {first['year']} সালের {fr_bn} থেকে {last['year']} সালে {la_bn} হয়েছে"
            + (f", আর মুনাফা বছরে {abs(p_c):.0f}% {'বেড়েছে' if p_c >= 0 else 'কমেছে'}।" if p_c is not None else "।"),
        )
    else:
        head = bi(f"Sales in {last['year']}: {la_en}.", f"{last['year']} সালে বিক্রি: {la_bn}।")
    meaning = []
    m0 = next((r["margin_pct"] for r in rows if r["margin_pct"] is not None), None)
    m1 = last["margin_pct"]
    if m0 is not None and m1 is not None:
        better = m1 > m0 + 0.5
        worse = m1 < m0 - 0.5
        meaning.append(bi(
            f"The profit margin moved from {m0:.0f}% to {m1:.0f}%, "
            + ("so the business keeps more of each sale than before." if better
               else "so it keeps less of each sale than before." if worse else "about the same share of each sale."),
            f"মুনাফার হার {m0:.0f}% থেকে {m1:.0f}% হয়েছে, "
            + ("অর্থাৎ প্রতিটি বিক্রি থেকে আগের চেয়ে বেশি থাকছে।" if better
               else "অর্থাৎ প্রতিটি বিক্রি থেকে আগের চেয়ে কম থাকছে।" if worse else "অর্থাৎ প্রতিটি বিক্রি থেকে প্রায় একই অংশ থাকছে।"),
        ))
    changes = []
    for a, b in zip(rows, rows[1:]):
        if a.get("profit_cr") and b.get("profit_cr") is not None and a["profit_cr"] > 0:
            changes.append((b["year"], (b["profit_cr"] - a["profit_cr"]) / a["profit_cr"] * 100.0))
    if len(changes) >= 2:
        best = max(changes, key=lambda c: c[1])
        worst = min(changes, key=lambda c: c[1])
        meaning.append(bi(
            f"Its best year was {best[0]}, when profit {'rose' if best[1] >= 0 else 'fell'} {abs(best[1]):.0f}%. "
            f"Its weakest was {worst[0]}, when profit {'rose' if worst[1] >= 0 else 'fell'} {abs(worst[1]):.0f}%.",
            f"সবচেয়ে ভালো বছর {best[0]}, তখন মুনাফা {abs(best[1]):.0f}% {'বেড়েছিল' if best[1] >= 0 else 'কমেছিল'}। "
            f"সবচেয়ে দুর্বল বছর {worst[0]}, তখন মুনাফা {abs(worst[1]):.0f}% {'বেড়েছিল' if worst[1] >= 0 else 'কমেছিল'}।",
        ))
    n = len(rows)
    return _section(
        "story",
        bi(f"How has the business changed over {n} years?", f"{n} বছরে ব্যবসা কীভাবে বদলেছে?"),
        word, tone, head,
        bi(f"Audited accounts FY{rows[0]['year']} to FY{rows[-1]['year']}", f"নিরীক্ষিত বার্ষিক হিসাব {rows[0]['year']} থেকে {rows[-1]['year']}"),
        free_line=bi("Sales, profit, margin and return on equity for every year we have.",
                     "আমাদের কাছে থাকা প্রতিটি বছরের বিক্রি, মুনাফা, মুনাফার হার আর নিজস্ব মূলধনে আয়।"),
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
        ranks.append({"label": bi("Profit margin", "মুনাফার হার"), "rank": r, "of": n,
                      "value": bi(f"{margin[code]:.0f}%", f"{margin[code]:.0f}%")})
    if code in roe:
        r, n = rank_by(roe)
        ranks.append({"label": bi("Return on its own money", "নিজস্ব মূলধনে আয়"), "rank": r, "of": n,
                      "value": bi(f"{roe[code]:.1f}%", f"{roe[code]:.1f}%")})
    if code in growth:
        r, n = rank_by(growth)
        g = growth[code]
        ranks.append({"label": bi("Profit growth", "মুনাফা বৃদ্ধি"), "rank": r, "of": n,
                      "value": bi(f"{'+' if g >= 0 else ''}{g:.0f}%", f"{'+' if g >= 0 else ''}{g:.0f}%")})
    if code in pe:
        r, n = rank_by(pe, desc=False)
        ranks.append({"label": bi("Lowest P/E", "সবচেয়ে কম পিই"), "rank": r, "of": n,
                      "value": bi(_x(pe[code]), _x(pe[code]))})
    if code in score:
        r, n = rank_by(score)
        ranks.append({"label": bi("Our score", "আমাদের স্কোর"), "rank": r, "of": n,
                      "value": bi(f"{score[code]:.0f}", f"{score[code]:.0f}")})
    if not ranks:
        return None

    sector = inp.get("sector") or ""
    sector_bn = inp.get("sector_bn") or sector
    n_peers = len(peers)
    sr = next((r for r in ranks if r["label"]["en"] == "Our score"), None)
    if sr and sr["rank"] <= 3:
        word, tone = bi("Top 3", "সেরা 3-এ"), "good"
    elif sr and sr["rank"] <= math.ceil(sr["of"] / 2):
        word, tone = bi("Upper half", "ওপরের অর্ধেকে"), "neutral"
    elif sr:
        word, tone = bi("Lower half", "নিচের অর্ধেকে"), "fair"
    else:
        word, tone = bi("Ranked", "র‍্যাঙ্ক"), "neutral"

    if sales_rank and code in margin:
        top5 = [c for c, _ in sorted(sales.items(), key=lambda kv: kv[1], reverse=True)[:5]]
        top5_margin = {c: margin[c] for c in top5 if c in margin}
        best_margin = code in top5_margin and max(top5_margin, key=top5_margin.get) == code
        r, n = sales_rank
        if best_margin and r <= 5 and len(top5_margin) >= 3:
            head = bi(f"{'The biggest' if r == 1 else _ordinal(r) + ' biggest'} of {n} companies in the {sector} sector by sales, with the highest profit margin of the top five.",
                      f"বিক্রিতে {sector_bn} সেক্টরের {n}টি কোম্পানির মধ্যে {r} নম্বরে, আর বড় পাঁচটির মধ্যে মুনাফার হার সবচেয়ে বেশি।")
        else:
            mr = next(x for x in ranks if x["label"]["en"] == "Profit margin")
            head = bi(f"{'The biggest' if r == 1 else _ordinal(r) + ' biggest'} of {n} companies in the {sector} sector by sales, and {_ordinal(mr['rank'])} on profit margin.",
                      f"বিক্রিতে {sector_bn} সেক্টরের {n}টি কোম্পানির মধ্যে {r} নম্বরে, আর মুনাফার হারে {mr['rank']} নম্বরে।")
    elif sr:
        head = bi(f"Our score ranks it {_ordinal(sr['rank'])} of {sr['of']} companies in the {sector} sector.",
                  f"আমাদের স্কোরে {sector_bn} সেক্টরের {sr['of']}টি কোম্পানির মধ্যে এটি {sr['rank']} নম্বরে।")
    else:
        head = bi(f"Where it stands among {n_peers} companies in the {sector} sector.", f"{sector_bn} সেক্টরের {n_peers}টি কোম্পানির মধ্যে এর অবস্থান।")
    meaning = []
    if code in pe:
        r = next(x for x in ranks if x["label"]["en"] == "Lowest P/E")
        med = statistics.median(pe.values())
        meaning.append(bi(f"Its P/E of {_x(pe[code])} is the {_ordinal(r['rank'])} lowest in the sector, where the middle is {_x(med)}.",
                          f"এর পিই {_x(pe[code])}, যা সেক্টরে কম পিইর দিক থেকে {r['rank']} নম্বরে; সেক্টরের মাঝামাঝি পিই {_x(med)}।"))
    if sr:
        meaning.append(bi(f"Our score ranks it {_ordinal(sr['rank'])} of {sr['of']} in the sector.",
                          f"আমাদের স্কোরে সেক্টরে {sr['of']}টির মধ্যে {sr['rank']} নম্বরে।"))
    return _section(
        "sector",
        bi("Where does it stand in its sector?", "নিজের সেক্টরে এর অবস্থান কোথায়?"),
        word, tone, head,
        bi(f"{sector} companies on DSE · latest audited accounts · today's prices",
           f"ডিএসইর {sector_bn} সেক্টরের কোম্পানি · সর্বশেষ নিরীক্ষিত হিসাব · আজকের দাম"),
        free_line=bi(f"Where it ranks among the {n_peers} companies in its sector.", f"নিজের সেক্টরের {n_peers}টি কোম্পানির মধ্যে এর অবস্থান।"),
        inside=[bi("What its ranks add up to", "সব মিলিয়ে র‍্যাঙ্কগুলোর অর্থ"),
                bi("Where it is stronger and weaker than its sector", "সেক্টরের তুলনায় কোথায় এগিয়ে, কোথায় পিছিয়ে")],
        meaning=meaning, watch=None,
        sector=sector, peers=n_peers, ranks=ranks,
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
        if my_pe and my_pe > 0:
            why = bi(f"Graded {s:.0f} against {my_score:.0f}, at a P/E of {_x(pe)} against {_x(my_pe)}.",
                     f"স্কোর {s:.0f}, এর {my_score:.0f}; পিই {_x(pe)}, এর {_x(my_pe)}।")
        else:
            why = bi(f"Graded {s:.0f} against {my_score:.0f}, and it makes a profit (P/E {_x(pe)}).",
                     f"স্কোর {s:.0f}, এর {my_score:.0f}; আর এটি মুনাফায় আছে (পিই {_x(pe)})।")
        items.append({"code": c, "name": names.get(c), "score": round(s, 1), "pe": round(pe, 2), "why": why})
    n = len(items)
    sector = inp.get("sector") or ""
    sector_bn = inp.get("sector_bn") or sector
    return _section(
        "alternatives",
        bi("Are there stronger companies for less?", "কম দামে আরও শক্তিশালী কোম্পানি আছে কি?"),
        bi(f"{n} found", f"{n}টি পাওয়া গেছে"), "neutral",
        bi(f"{n} {'company' if n == 1 else 'companies'} in the {sector} sector {'scores' if n == 1 else 'score'} at least 10 points higher and {'costs' if n == 1 else 'cost'} less against {'its' if n == 1 else 'their'} profit.",
           f"{sector_bn} সেক্টরের {n}টি কোম্পানির স্কোর অন্তত 10 পয়েন্ট বেশি, আর মুনাফার তুলনায় দামও কম।"),
        bi("Our scores and today's prices", "আমাদের স্কোর আর আজকের দাম"),
        free_line=bi(f"{n} stronger {'company' if n == 1 else 'companies'} in this sector {'costs' if n == 1 else 'cost'} less against {'its' if n == 1 else 'their'} profit.",
                     f"এই সেক্টরে {n}টি আরও শক্তিশালী কোম্পানির দাম মুনাফার তুলনায় কম।"),
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
        lines.append(bi(f"Our grade for the company is {TIER_WORDS[tier]} ({sc:.0f} out of 100).",
                        f"কোম্পানিটির জন্য আমাদের গ্রেড {TIER_WORDS_BN[tier]} (100-এর মধ্যে {sc:.0f})।"))
    if cat == "Z":
        red = True
        lines.append(bi("It is in category Z, where DSE puts companies that missed a dividend or an AGM.",
                        "এটি Z ক্যাটাগরিতে আছে, যেখানে ডিভিডেন্ড বা এজিএম না করা কোম্পানিগুলো থাকে।"))
    if pub is not None and pub < FREE_FLOAT_LOW_PCT:
        red = True
        lines.append(bi(f"Only {pub:.0f}% of the shares are with the general public, so a few buyers can move the price.",
                        f"মাত্র {pub:.0f}% শেয়ার সাধারণ বিনিয়োগকারীদের হাতে, তাই অল্প কয়েকজন ক্রেতাই দাম নাড়াতে পারেন।"))
    lines.append(bi("A price that rises this fast without news often falls back just as fast. Checking the company's own figures first is the safer choice.",
                    "খবর ছাড়া এত দ্রুত দাম বাড়লে প্রায়ই তা আবার দ্রুত নেমে যায়। আগে কোম্পানির নিজের হিসাব দেখে নেওয়াই নিরাপদ।"))
    return {
        "level": "red" if red else "amber",
        "headline": bi(f"The price rose {r['pct']:.0f}% in {r['days']} trading days with no news from the company.",
                       f"কোম্পানির কোনো খবর ছাড়াই {r['days']} কার্যদিবসে দাম {r['pct']:.0f}% বেড়েছে।"),
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
                f"DSE found the factory closed or not producing (visited {e}).",
                f"ডিএসই কারখানা বন্ধ বা উৎপাদনহীন পেয়েছে (পরিদর্শন {b})।",
                ev(closed.get("title") or "Inspection of factory premises", closed.get("post_date")))
        elif insp and (insp[0].get("status") == "running"):
            m_en, m_bn = _mon(insp[0].get("visit_date") or insp[0].get("post_date"))
            add("factory", "Factory", "কারখানা", "pass", f"DSE found the factory working ({m_en}).",
                f"ডিএসই কারখানা চালু পেয়েছে ({m_bn})।", ev(insp[0].get("title"), insp[0].get("post_date")))
        else:
            add("factory", "Factory", "কারখানা", "pass", "No DSE report of a closed factory.",
                "কারখানা বন্ধের কোনো ডিএসই প্রতিবেদন নেই।")

    # 2 · audit opinion
    if "going_concern" in gov or "qualified_opinion" in gov:
        g = gov.get("going_concern") or gov.get("qualified_opinion")
        add("audit", "Audit opinion", "নিরীক্ষকের মতামত", "red", g.get("en", ""), g.get("bn", ""))
    else:
        emph = next(((d, t) for d, t, _ in news if "emphasis of matter" in t.lower()), None)
        if emph:
            e, b = _day(emph[0])
            add("audit", "Audit opinion", "নিরীক্ষকের মতামত", "amber",
                f"The auditor added an emphasis of matter note ({e}), pointing to something in the accounts worth reading.",
                f"নিরীক্ষক হিসাবে একটি বিশেষ মনোযোগের নোট দিয়েছেন ({b}), যা পড়ে দেখা ভালো।", ev(emph[1], emph[0]))
        else:
            add("audit", "Audit opinion", "নিরীক্ষকের মতামত", "pass", "No audit warnings in the last year.",
                "গত এক বছরে নিরীক্ষকের কোনো সতর্কতা নেই।")

    # 3 · category
    cat = (inp.get("category") or row.get("market_cat") or "").strip().upper()
    if cat == "Z":
        add("category", "DSE category", "ডিএসই ক্যাটাগরি", "red", "Category Z: it missed a dividend or an AGM.",
            "Z ক্যাটাগরি: ডিভিডেন্ড বা এজিএম বাদ পড়েছে।")
    elif cat == "B":
        add("category", "DSE category", "ডিএসই ক্যাটাগরি", "amber", "Category B: its last dividend was under 10%.",
            "B ক্যাটাগরি: সর্বশেষ ডিভিডেন্ড 10%-এর কম।")
    elif cat:
        add("category", "DSE category", "ডিএসই ক্যাটাগরি", "pass", f"Category {cat}.", f"{cat} ক্যাটাগরি।")

    # 4 · DSE price query (red during a rally)
    if notices_ok:
        qs = _queries(inp, NOTICE_DAYS)
        if qs:
            e, b = _day(qs[0]["post_date"])
            during_rally = warning is not None and (today - qs[0]["post_date"]).days <= QUERY_DAYS
            add("dse_query", "DSE price query", "ডিএসইর দাম-সংক্রান্ত প্রশ্ন", "red" if during_rally else "amber",
                f"DSE asked about an unusual price move ({e})" + (" while the price was running up." if during_rally else "."),
                f"ডিএসই অস্বাভাবিক দাম নিয়ে জানতে চেয়েছে ({b})" + (", যখন দাম দ্রুত বাড়ছিল।" if during_rally else "।"),
                ev(qs[0].get("title") or "Query Response", qs[0]["post_date"]))
        else:
            add("dse_query", "DSE price query", "ডিএসইর দাম-সংক্রান্ত প্রশ্ন", "pass", "No DSE price query in the last year.",
                "গত এক বছরে দাম নিয়ে ডিএসইর কোনো প্রশ্ন নেই।")

    # 5 · the 30% rule
    rule = (owners or {}).get("rule30")
    if rule:
        if rule["ok"]:
            add("owners_30", "Owners' share (30% rule)", "উদ্যোক্তা-পরিচালকদের অংশ (30% নিয়ম)", "pass",
                f"Sponsors and directors hold {rule['pct']:.0f}% (rule: 30%).",
                f"উদ্যোক্তা-পরিচালকদের হাতে {rule['pct']:.0f}% (নিয়ম: 30%)।")
        else:
            add("owners_30", "Owners' share (30% rule)", "উদ্যোক্তা-পরিচালকদের অংশ (30% নিয়ম)", "red",
                f"Sponsors and directors hold only {rule['pct']:.1f}%, under the 30% the BSEC rule asks for.",
                f"উদ্যোক্তা-পরিচালকদের হাতে মাত্র {rule['pct']:.1f}%, যা বিএসইসির 30% নিয়মের নিচে।")

    # 6 · loans (not for lenders / insurers)
    if sc not in _FINANCIALS:
        lvl = row.get("debt_level")
        loan = _f(inp.get("loan_mn"))
        res = _f(inp.get("reserve_mn"))
        if lvl == "over_mcap":
            add("loans", "Loans", "ঋণ", "red", "Its loans are larger than the whole company's market value.",
                "এর ঋণ পুরো কোম্পানির বাজার মূলধনের চেয়েও বেশি।")
        elif lvl == "over_reserve":
            add("loans", "Loans", "ঋণ", "amber", "Its loans are larger than all the profit it has saved.",
                "এর ঋণ এ পর্যন্ত জমানো সব মুনাফার চেয়ে বেশি।")
        elif loan is not None:
            if loan <= 0:
                add("loans", "Loans", "ঋণ", "pass", "No loans.", "কোনো ঋণ নেই।")
            elif res and res > 0:
                add("loans", "Loans", "ঋণ", "pass", f"Loans are {loan / res * 100:.0f}% of saved profit.",
                    f"ঋণ জমা মুনাফার {loan / res * 100:.0f}%।")

    # 7 · stale accounts
    age = _f(row.get("data_age_years"))
    last_year = row.get("last_reported_year") or row.get("fy_eps_year")
    fin_years = [r["_year"] for r in _sorted_fin(inp.get("financials") or [])]
    newest = max(fin_years) if fin_years else None
    if (age is not None and age >= STALE_YEARS) or row.get("stale_data") is True:
        y = last_year or newest
        add("stale", "Accounts up to date", "হিসাব হালনাগাদ", "red",
            f"Its latest yearly accounts are from FY{y}, two or more years old." if y else "Its yearly accounts are two or more years old.",
            f"সর্বশেষ বার্ষিক হিসাব {y} অর্থবছরের, দুই বছর বা তারও পুরোনো।" if y else "বার্ষিক হিসাব দুই বছর বা তারও পুরোনো।")
    elif newest:
        add("stale", "Accounts up to date", "হিসাব হালনাগাদ", "pass", f"Accounts up to date (FY{newest}).",
            f"হিসাব হালনাগাদ ({newest} অর্থবছর)।")

    # 8 · meetings
    if "agm_postponed" in gov or "board_postponed" in gov:
        g = gov.get("agm_postponed") or gov.get("board_postponed")
        add("meetings", "Board meetings and AGM", "পর্ষদ সভা ও এজিএম", "amber", g.get("en", ""), g.get("bn", ""))
    else:
        add("meetings", "Board meetings and AGM", "পর্ষদ সভা ও এজিএম", "pass", "Board meetings and the AGM held on time.",
            "পর্ষদ সভা আর এজিএম সময়মতো হয়েছে।")

    # 9 · regulator
    if "bsec_action" in gov or "penalty" in gov:
        g = gov.get("bsec_action") or gov.get("penalty")
        add("regulator", "Regulator", "নিয়ন্ত্রক সংস্থা", "amber", g.get("en", ""), g.get("bn", ""))
    else:
        add("regulator", "Regulator", "নিয়ন্ত্রক সংস্থা", "pass", "No action by BSEC in the last year.",
            "গত এক বছরে বিএসইসির কোনো পদক্ষেপ নেই।")

    # 10 · owner selling
    if owners is not None or notices_ok:
        sells = (owners or {}).get("trade_counts", {}).get("sells", 0) if owners else 0
        if sells:
            t = next((t for t in (owners or {}).get("trades") or [] if t["side"] == "sell"), None)
            who_en = (t or {}).get("role", {}).get("en", "An insider")
            who_bn = (t or {}).get("role", {}).get("bn", "একজন সংশ্লিষ্ট ব্যক্তি")
            add("owner_selling", "Owners selling", "উদ্যোক্তা-পরিচালকদের বিক্রি", "amber",
                f"{who_en} declared a sale of {(t or {}).get('shares', 0):,} shares." if t else f"{sells} insider sales in the last 12 months.",
                f"{who_bn} {(t or {}).get('shares', 0):,}টি শেয়ার বিক্রির ঘোষণা দিয়েছেন।" if t else f"গত 12 মাসে {sells}টি বিক্রি।")
        else:
            add("owner_selling", "Owners selling", "উদ্যোক্তা-পরিচালকদের বিক্রি", "pass", "No sponsor or director selling.",
                "কোনো উদ্যোক্তা-পরিচালক বিক্রি করেননি।")

    # 11 · cash backs the profit (not for lenders / insurers)
    if sc not in _FINANCIALS and cash:
        last = cash["years"][-1]
        gap_line = next((m for m in cash.get("meaning") or [] if "but cash from the business fell" in m.get("en", "")), None)
        if last["ratio"] < 0:
            add("cash", "Cash backs the profit", "নগদে মুনাফার সমর্থন", "amber",
                f"In FY{last['year']} cash from the business was negative while it reported a profit.",
                f"{last['year']} অর্থবছরে মুনাফা দেখালেও ব্যবসা থেকে নগদ ঋণাত্মক।")
        elif last["ratio"] < CASH_WEAK_RATIO:
            add("cash", "Cash backs the profit", "নগদে মুনাফার সমর্থন", "amber",
                f"In FY{last['year']} only ৳{last['ratio']} of cash came in for each ৳100 of profit.",
                f"{last['year']} অর্থবছরে প্রতি ৳100 মুনাফায় নগদ এসেছে মাত্র ৳{last['ratio']}।")
        elif gap_line and _cash_gap_counts(gap_line):
            add("cash", "Cash backs the profit", "নগদে মুনাফার সমর্থন", "amber", gap_line["en"], gap_line["bn"])
        else:
            add("cash", "Cash backs the profit", "নগদে মুনাফার সমর্থন", "pass",
                f"Cash backs the profit (৳{last['ratio']} for each ৳100 in FY{last['year']}).",
                f"নগদে মুনাফার সমর্থন আছে ({last['year']} অর্থবছরে প্রতি ৳100-এ ৳{last['ratio']})।")

    # 12 · dividend paid from profit
    if dividend and dividend.get("payout_pct") is not None:
        p = dividend["payout_pct"]
        if p > 100:
            add("payout", "Dividend paid from profit", "মুনাফা থেকে ডিভিডেন্ড", "amber",
                f"It paid out {p:.0f}% of its profit, more than it earned.",
                f"মুনাফার {p:.0f}% ডিভিডেন্ড দিয়েছে, যা আয়ের চেয়ে বেশি।")
        else:
            add("payout", "Dividend paid from profit", "মুনাফা থেকে ডিভিডেন্ড", "pass", "Dividend paid from profit.",
                "ডিভিডেন্ড মুনাফা থেকেই দেওয়া।")

    # 13 · trading
    t_mn = _turnover_mn(inp)
    if t_mn is not None:
        c_en, c_bn = _crore(t_mn)
        if t_mn < THIN_TURNOVER_MN:
            add("trading", "Trading", "লেনদেন", "amber", f"Thin trading: about {c_en} a day, so selling can take time.",
                f"লেনদেন কম: দিনে প্রায় {c_bn}, তাই বিক্রি করতে সময় লাগতে পারে।")
        else:
            add("trading", "Trading", "লেনদেন", "pass", f"Trades {c_en} a day.", f"দিনে লেনদেন {c_bn}।")

    # 14 · credit rating
    rs = _ratings(inp)
    if rs:
        r0 = rs[0]
        rk = _rating_rank(r0["long_term"])
        prev_rk = _rating_rank(rs[1]["long_term"]) if len(rs) > 1 else None
        m_en, m_bn = _mon(r0["date"])
        ig_last = _RATING_ORDER.index(INVESTMENT_GRADE_LAST)
        if rk is not None and rk > ig_last:
            add("rating", "Credit rating", "ক্রেডিট রেটিং", "amber",
                f"Rated {r0['long_term']} ({r0['agency']}, {m_en}), below investment grade.",
                f"রেটিং {r0['long_term']} ({r0['agency']}, {m_bn}), যা বিনিয়োগযোগ্য মানের নিচে।",
                ev(f"Credit Rating Result", r0["date"]))
        elif rk is not None and prev_rk is not None and rk > prev_rk:
            add("rating", "Credit rating", "ক্রেডিট রেটিং", "amber",
                f"Its rating was lowered from {rs[1]['long_term']} to {r0['long_term']} ({r0['agency']}, {m_en}).",
                f"রেটিং {rs[1]['long_term']} থেকে নেমে {r0['long_term']} হয়েছে ({r0['agency']}, {m_bn})।",
                ev("Credit Rating Result", r0["date"]))
        else:
            add("rating", "Credit rating", "ক্রেডিট রেটিং", "pass", f"Rated {r0['long_term']} ({r0['agency']}, {m_en}).",
                f"রেটিং {r0['long_term']} ({r0['agency']}, {m_bn})।", ev("Credit Rating Result", r0["date"]))

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
                    exit_line = (f"{en} cut their share from {peak[0]:.1f}% to {now:.1f}% since {f_en}.",
                                 f"{f_bn}-এর পর থেকে {bn_} তাঁদের অংশ {peak[0]:.1f}% থেকে কমিয়ে {now:.1f}% করেছে।")
                    break
        if exit_line:
            add("investors", "Big investors", "বড় বিনিয়োগকারী", "amber", exit_line[0], exit_line[1])
        else:
            add("investors", "Big investors", "বড় বিনিয়োগকারী", "pass", "No big investor leaving.",
                "কোনো বড় বিনিয়োগকারী বেরিয়ে যাচ্ছেন না।")

    # 16 · price run without news
    if warning:
        if not any(c["key"] == "dse_query" and c["level"] == "red" for c in checks):
            add("rally", "Price run without news", "খবর ছাড়া দাম বাড়া", "red" if warning["level"] == "red" else "amber",
                warning["headline"]["en"], warning["headline"]["bn"])
        else:
            add("rally", "Price run without news", "খবর ছাড়া দাম বাড়া", "amber",
                warning["headline"]["en"], warning["headline"]["bn"])
    else:
        add("rally", "Price run without news", "খবর ছাড়া দাম বাড়া", "pass", "No price run without news.",
            "খবর ছাড়া কোনো অস্বাভাবিক দাম বাড়া নেই।")

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
    if red:
        if red == 1:
            head = bi(f"1 red flag: {reds[0]['detail']['en']}" + (f" Also {watch_en}." if amber else ""),
                      f"1টি বড় সতর্কতা: {reds[0]['detail']['bn']}" + (f" এ ছাড়া {watch_bn}।" if amber else ""))
        else:
            head = bi(f"{red} red flags. The first: {reds[0]['detail']['en']}" + (f" Also {watch_en}." if amber else ""),
                      f"{red}টি বড় সতর্কতা। প্রথমটি: {reds[0]['detail']['bn']}" + (f" এ ছাড়া {watch_bn}।" if amber else ""))
        free = bi(f"We ran {n} checks. {red} red {'flag' if red == 1 else 'flags'}, shown below"
                  + (f", and {watch_en}." if amber else "."),
                  f"আমরা {n}টি যাচাই করেছি। {red}টি বড় সতর্কতা, নিচে দেখানো হলো" + (f"; আর {watch_bn}।" if amber else "।"))
    elif amber:
        head = bi(f"No red flags. {watch_en[0].upper() + watch_en[1:]}.", f"কোনো বড় সতর্কতা নেই। {watch_bn}।")
        free = bi(f"We ran {n} checks. No red flags, and {watch_en}.", f"আমরা {n}টি যাচাই করেছি। কোনো বড় সতর্কতা নেই, আর {watch_bn}।")
    else:
        head = bi(f"No red flags, and nothing to watch in {n} checks.", f"{n}টি যাচাইয়ে কোনো বড় সতর্কতা বা নজরে রাখার মতো কিছু নেই।")
        free = bi(f"We ran {n} checks. No red flags, and nothing to watch.", f"আমরা {n}টি যাচাই করেছি। কোনো বড় সতর্কতা নেই, নজরে রাখার মতোও কিছু নেই।")

    inside = []
    if amber:
        inside.append(bi(f"The {amber} {'thing' if amber == 1 else 'things'} to watch, with the evidence behind each",
                         f"নজরে রাখার মতো {amber}টি বিষয়, প্রতিটির প্রমাণসহ"))
    inside.append(bi(f"The {passed} checks it passed, and where each one stands", f"যে {passed}টি যাচাইয়ে উতরেছে, আর প্রতিটির অবস্থা"))
    inside.append(bi("What would turn a watch into a red flag", "কী হলে নজরে রাখার বিষয় বড় সতর্কতা হবে"))

    return _section(
        "red_flags",
        bi("Is anything seriously wrong?", "বড় কোনো সমস্যা আছে কি?"),
        word, tone, head,
        bi("DSE notices from the last 12 months · audited accounts · monthly ownership reports",
           "গত 12 মাসের ডিএসই নোটিশ · নিরীক্ষিত হিসাব · মাসিক শেয়ার ধারণের প্রতিবেদন"),
        free_line=free, inside=inside,
        meaning=[bi("A red flag is a serious problem, and we always show it for free. A thing to watch is worth checking before you buy.",
                    "বড় সতর্কতা মানে গুরুতর সমস্যা, আর তা আমরা সবসময় ফ্রিতে দেখাই। নজরে রাখার বিষয়গুলো কেনার আগে একবার দেখে নেওয়া ভালো।")],
        watch=bi("If a new red flag appears, we show it here, and Premium readers who follow the share get a notification.",
                 "নতুন কোনো বড় সতর্কতা দেখা দিলে আমরা এখানে দেখাব, আর শেয়ারটি যাঁরা অনুসরণ করেন সেই প্রিমিয়াম পাঠকেরা নোটিফিকেশন পাবেন।"),
        checks=checks, counts={"checks": n, "red": red, "amber": amber, "pass": passed},
    )


def _cash_gap_counts(line: dict) -> bool:
    """Only flag 'cash fell while profit rose' when profit rose 10% or more."""
    import re
    m = re.search(r"Profit rose (\d+)%", line.get("en", ""))
    return bool(m and float(m.group(1)) >= CASH_GAP_PROFIT_RISE_PCT)


# ---------------------------------------------------------------- next + risks

def build_next(inp: dict, this_year: Optional[dict], dividend: Optional[dict], safety: Optional[dict]) -> Optional[dict]:
    today = inp["today"]
    items = []
    nxt = (this_year or {}).get("next")
    if nxt and nxt.get("date"):
        lab = (this_year or {}).get("_next_label") or bi("Results", "ফল")
        items.append({"date": nxt["date"], "approx": nxt["approx"], "kind": "results",
                      "label": lab,
                      "expect": bi(f"To keep growing it needs more than {tk2(nxt['beat'])} a share.",
                                   f"মুনাফা বাড়াতে হলে শেয়ারপ্রতি {tk2(nxt['beat'])}-এর বেশি দরকার।") if nxt.get("beat") else None})
    lat = (dividend or {}).get("_latest_full") or {}
    cps = lat.get("cash_ps")
    if lat.get("record_date") and _d(lat["record_date"]) and _d(lat["record_date"]) >= today:
        net = round(cps * (1 - DIV_TAX_PCT / 100.0), 2) if cps else None
        if lat.get("buy_by") and _d(lat["buy_by"]) >= today:
            items.append({"date": lat["buy_by"], "approx": False, "kind": "record",
                          "label": bi("Last day to buy for the dividend", "ডিভিডেন্ডের জন্য শেষ কেনার দিন"),
                          "expect": bi(f"Buy by this day to get {tk2(cps)} a share." if cps else "Buy by this day to get the dividend.",
                                       f"শেয়ারপ্রতি {tk2(cps)} পেতে এই দিনের মধ্যে কিনুন।" if cps else "ডিভিডেন্ড পেতে এই দিনের মধ্যে কিনুন।")})
        if lat.get("_spot") and _d(lat["_spot"]) >= today:
            items.append({"date": lat["_spot"], "approx": False, "kind": "spot",
                          "label": bi("Spot market only", "শুধু স্পট মার্কেটে লেনদেন"),
                          "expect": bi("From this day the shares trade only in the spot market until the record date.",
                                       "এই দিন থেকে রেকর্ড ডেট পর্যন্ত শেয়ার শুধু স্পট মার্কেটে কেনাবেচা হবে।")})
        items.append({"date": lat["record_date"], "approx": False, "kind": "record",
                      "label": bi("Record date", "রেকর্ড ডেট"),
                      "expect": bi(f"Holders on this day get {tk2(cps)} a share, {tk2(net)} after tax." if cps else "Holders on this day get the dividend.",
                                   f"এই দিনে যাঁদের কাছে শেয়ার থাকবে তাঁরা শেয়ারপ্রতি {tk2(cps)} পাবেন, কর বাদে {tk2(net)}।" if cps else "এই দিনে যাঁদের কাছে শেয়ার থাকবে তাঁরা ডিভিডেন্ড পাবেন।")})
    if lat.get("agm_date") and _d(lat["agm_date"]) and _d(lat["agm_date"]) >= today:
        items.append({"date": lat["agm_date"], "approx": False, "kind": "agm", "label": bi("AGM", "এজিএম"),
                      "expect": bi(f"Shareholders vote on the {tk2(cps)} dividend." if cps else "Shareholders meet and vote on the accounts.",
                                   f"শেয়ারহোল্ডাররা {tk2(cps)} ডিভিডেন্ড অনুমোদন দেবেন।" if cps else "শেয়ারহোল্ডাররা হিসাব অনুমোদন দেবেন।")})
    rating = (safety or {}).get("rating")
    if rating and _d(rating["date"]):
        nd = _d(rating["date"]) + timedelta(days=365)
        if nd >= today:
            items.append({"date": nd.isoformat(), "approx": True, "kind": "rating", "label": bi("Credit rating renewal", "ক্রেডিট রেটিং নবায়ন"),
                          "expect": bi(f"{rating['agency']} rated it {rating['long_term']} last time.",
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
        if it["kind"] in ("agm", "record") or lab.startswith("last"):
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
        inside=[bi("What to expect at each date", "প্রতিটি তারিখে কী আশা করা যায়"),
                bi("The number each result has to beat", "প্রতিটি ফলে কত হলে ভালো বলা যাবে")
                if any(i["kind"] == "results" for i in items) else
                bi("What each date means for your shares", "প্রতিটি তারিখ আপনার শেয়ারের জন্য কী বোঝায়")],
        meaning=[], watch=None,
        items=items,
    )


_TRIGGERS = {
    "cash": ("If cash from the business stays under half of profit for another year, this becomes a red flag.",
             "আরও এক বছর ব্যবসার নগদ মুনাফার অর্ধেকের নিচে থাকলে এটি বড় সতর্কতা হবে।"),
    "payout": ("If the next dividend is again more than the profit, it is being paid from savings.",
               "পরের ডিভিডেন্ডও মুনাফার চেয়ে বেশি হলে তা জমানো টাকা থেকে দেওয়া হচ্ছে।"),
    "loans": ("If loans keep rising faster than profit, the risk grows.",
              "মুনাফার চেয়ে দ্রুত ঋণ বাড়তে থাকলে ঝুঁকি বাড়বে।"),
    "investors": ("If they keep selling for another two reports, it is worth finding out why.",
                  "পরের দুটি প্রতিবেদনেও তাঁরা বিক্রি চালিয়ে গেলে কারণ জেনে নেওয়া ভালো।"),
    "category": ("A return to category A after the next dividend would ease this.",
                 "পরের ডিভিডেন্ডের পর A ক্যাটাগরিতে ফিরলে এটি কেটে যাবে।"),
    "trading": ("If daily trading rises above ৳10 lakh, selling gets easier.",
                "দৈনিক লেনদেন ৳10 লাখের ওপরে গেলে বিক্রি সহজ হবে।"),
    "rating": ("A rating back at BBB- or better would ease this.",
               "রেটিং আবার BBB- বা তার ওপরে উঠলে এটি কেটে যাবে।"),
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
        free_line=bi(f"We list the {n} biggest {'risk' if n == 1 else 'risks'}, and what would change our view.",
                     f"আমরা সবচেয়ে বড় {n}টি ঝুঁকি দেখাই, আর কী হলে আমাদের মত বদলাবে।"),
        inside=[bi(f"The {n} biggest {'risk' if n == 1 else 'risks'}, in numbers", f"সবচেয়ে বড় {n}টি ঝুঁকি, সংখ্যাসহ"),
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
        pr_detail = bi(f"{_x(pe['now'])}× profit" + (f", usually {_x(pe['usual'])}×" if pe["usual"] else ""),
                       f"মুনাফার {_x(pe['now'])} গুণ" + (f", সাধারণত {_x(pe['usual'])} গুণ" if pe["usual"] else ""))
    elif pr and pr.get("fair"):
        pr_detail = bi(f"{abs(pr['gap_pct'])}% {'below' if pr['gap_pct'] < 0 else 'above'} our fair middle",
                       f"ন্যায্য মাঝামাঝি দামের চেয়ে {abs(pr['gap_pct'])}% {'কম' if pr['gap_pct'] < 0 else 'বেশি'}")
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
        ca_detail = bi(f"৳{last['ratio']} cash per ৳100 profit", f"প্রতি ৳100 মুনাফায় ৳{last['ratio']} নগদ")
    sf = sections.get("safety")
    sf_detail = None
    if sf and sf.get("_bits"):
        bits = sf["_bits"][:2]
        txt = " · ".join(b[0] for b in bits)
        sf_detail = bi(txt[0].upper() + txt[1:], " · ".join(b[1] for b in bits))
    ql = sections.get("quality")
    ql_detail = None
    if ql:
        ql_detail = bi(f"{ql['score']:.0f}/100 · {ql['healthy']} of {ql['checks']} checks healthy",
                       f"{ql['score']:.0f}/100 · {ql['checks']}টির মধ্যে {ql['healthy']}টি ভালো")

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
    out = [bi("Our three-line summary of where it stands", "এর অবস্থা নিয়ে আমাদের তিন লাইনের সারকথা")]
    rf = sections.get("red_flags")
    if rf:
        a = rf["counts"]["amber"]
        if a:
            out.append(bi(f"The {a} {'thing' if a == 1 else 'things'} to watch, with the evidence", f"নজরে রাখার মতো {a}টি বিষয়, প্রমাণসহ"))
        else:
            out.append(bi(f"All {rf['counts']['checks']} checks, and where each one stands", f"{rf['counts']['checks']}টি যাচাই, আর প্রতিটির অবস্থা"))
    ow = sections.get("owners")
    if ow and (ow["trade_counts"]["buys"] or ow["trade_counts"]["sells"]):
        b, s = ow["trade_counts"]["buys"], ow["trade_counts"]["sells"]
        if b and not s:
            out.append(bi(f"Who made the {b} insider {'buy' if b == 1 else 'buys'}, and what they paid",
                          f"উদ্যোক্তা-পরিচালকদের {b}টি কেনা কে করেছেন, কত দামে"))
        else:
            out.append(bi(f"Who made the {b + s} insider trades, and at what price", f"উদ্যোক্তা-পরিচালকদের {b + s}টি লেনদেন কে করেছেন, কত দামে"))
    pr = sections.get("price")
    if pr and pr.get("fair"):
        out.append(bi("Our fair range and a buy-below price alert", "আমাদের ন্যায্য দাম, আর কোন দামের নিচে কেনা ভালো তার অ্যালার্ট"))
    elif pr:
        out.append(bi("How the price compares with its past and its sector", "দামটি এর অতীত আর সেক্টরের তুলনায় কেমন"))
    dv = sections.get("dividend")
    cps = ((dv or {}).get("latest") or {}).get("cash_ps") or (dv or {}).get("_cur")
    if dv and cps:
        out.append(bi(f"What the {tk2(cps)} dividend is worth after tax and the price drop",
                      f"কর আর দরপতনের পর {tk2(cps)} ডিভিডেন্ড আসলে কত"))
    ty = sections.get("this_year")
    if ty and any(q["cur"] is not None for q in ty.get("quarters") or []):
        nxt = ty.get("next")
        n_q = len([q for q in ty["quarters"] if q["cur"] is not None])
        qn = None
        if nxt and nxt.get("what"):
            w = nxt["what"]["en"]
            qn = w.split(" results")[0] if " results" in w else None
        out.append(bi(f"{'All four' if n_q == 4 else f'{n_q}'} {'quarter' if n_q == 1 else 'quarters'}" + (f", and what {qn} has to beat" if qn else ""),
                      f"{n_q}টি প্রান্তিক" + (f", আর {qn}-এ কত মুনাফা দরকার" if qn else "")))
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
    }
