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
import re
import statistics
from datetime import date, datetime, timedelta
from typing import Any, Optional

from utils.dividend_years import fiscal_year, ledger_years, own_rows, year_end_month

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
# Profit up / down by this much reads "Growing" / "Slipping" — the results
# page's own band (results_explainer.MOVE_PCT), so a report "Growing" never
# sits beside "About the same" there (audit RP19: 19 conflicts at 5 vs 10).
GROWING_PCT = 10.0
# Under this the sentence says "about the same profit" (results_explainer._move_words).
SAME_PROFIT_PCT = 3.0
# Rating grades at or above BBB- are investment grade.
_RATING_ORDER = ["AAA", "AA+", "AA", "AA-", "A+", "A", "A-", "BBB+", "BBB", "BBB-",
                 "BB+", "BB", "BB-", "B+", "B", "B-", "CCC+", "CCC", "CCC-", "CC", "C", "D"]
INVESTMENT_GRADE_LAST = "BBB-"
# A lender's own money above this share of its assets is bad data
# (scoring_service.LENDER_CUSHION_MAX_PCT).
LENDER_CUSHION_MAX_PCT = 40.0
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

# The grade names (2026-10-31: the company ranking's groups — Strong all
# round / Mostly strong / Mixed / Mostly weak — are the label everywhere).
from backend.services.tiers import TIER_WORDS as _TW, TIER_WORDS_BN as _TWB
from backend.services import grade_rules as _gr

# "Strong" / "weak" on a check: the group rules' own lines (grade_rules).
STRONG_AT, WEAK_BELOW = _gr.STRONG_AT, _gr.WEAK_BELOW

TIER_WORDS = {k: _TW[k] for k in ("excellent", "good", "average", "weak")}
TIER_WORDS_BN = {k: _TWB[k] for k in ("excellent", "good", "average", "weak")}

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


# CRAB's long-term grades carry a number where CRISL / ECRL carry a sign:
# AA1 = AA+, AA2 = AA, AA3 = AA-, A1 = A+, BBB1 = BBB+ … (2026-11-04, audit
# RP1: 40 rated companies — HEIDELBCEM "AA2" — read as "a low grade" and
# turned the safety word "Risky").
_CRAB_SUFFIX = re.compile(r"^(AA|A|BBB|BB|B|CCC)([123])$")


def _rating_rank(grade: Optional[str]) -> Optional[int]:
    g = (grade or "").strip().upper().replace(" ", "")
    m = _CRAB_SUFFIX.match(g)
    if m:
        g = m.group(1) + {"1": "+", "2": "", "3": "-"}[m.group(2)]
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


def _newest_results_year(inp: dict) -> Optional[int]:
    """The newest fiscal year with yearly results: the audited table (with a
    provisional notice year) or the yearly notice."""
    years = [r["_year"] for r in _sorted_fin(inp.get("financials") or []) if _fin_eps(r) is not None]
    years += [a["year"] for a in _annuals(inp.get("notices") or {}) if _f(a.get("eps")) is not None]
    return max(years) if years else None


def _loss_in(inp: dict, year: int) -> bool:
    """A loss in that fiscal year's results (audited table / notice / accounts)."""
    for r in _sorted_fin(inp.get("financials") or []):
        if r["_year"] == year and (_fin_eps(r) or 0) < 0:
            return True
    for a in _annuals(inp.get("notices") or {}):
        if a["year"] == year and (_f(a.get("eps")) or 0) < 0:
            return True
    for r in inp.get("extended_financials") or []:
        if str(r.get("year")) == str(year) and (_f(r.get("net_profit")) or 0) < 0:
            return True
    return False


def _in_accounts(y: int) -> dict:
    """ "in its 2024 accounts" — how the report names a year (never "this year"
    for a year that may be old; audit RP4)."""
    return bi(f"in its {y} accounts", f"{y} সালের হিসাবে")


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
    if abs(pct) < SAME_PROFIT_PCT:
        return bi(f"It made about the same profit {when_en} as a year before.",
                  f"{when_bn} কোম্পানিটি আগের বছরের প্রায় সমান মুনাফা করেছে।")
    if pct > 0:
        if pct >= 95:
            return bi(f"It made about {pct / 100 + 1:.0f} times as much profit {when_en} as a year before.",
                      f"{when_bn} কোম্পানিটি আগের বছরের প্রায় {pct / 100 + 1:.0f} গুণ মুনাফা করেছে।")
        return bi(f"It made {pct:.0f}% more profit {when_en} than a year before.",
                  f"{when_bn} কোম্পানিটি আগের বছরের চেয়ে {pct:.0f}% বেশি মুনাফা করেছে।")
    return bi(f"It made {abs(pct):.0f}% less profit {when_en} than a year before.",
              f"{when_bn} কোম্পানিটি আগের বছরের চেয়ে {abs(pct):.0f}% কম মুনাফা করেছে।")


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
            when_bn = f"{_mon(fy_end)[1]}-এ শেষ হওয়া অর্থবছরে" if full else period_bn
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
        lead = bi("It is making a loss right now.", "কোম্পানিটি এখন লোকসানে চলছে।")
    elif fb_year and fy_eps_prev is not None and fy_eps_prev <= 0 and fy_eps_cur is not None and fy_eps_cur > 0:
        acc = _in_accounts(fb_year)
        lead = bi(f"It is back to a profit {acc['en']}, after a loss the year before.",
                  f"আগের বছর লোকসানের পর {acc['bn']} কোম্পানিটি আবার মুনাফায় ফিরেছে।")
    elif fy_eps_prev is not None and fy_eps_prev <= 0 and fy_eps_cur is not None and fy_eps_cur > 0:
        lead = (bi("It is back to a profit this year, after a loss the year before.",
                   "আগের বছর লোকসানের পর এ বছর কোম্পানিটি আবার মুনাফায় ফিরেছে।") if full_year
                else bi("It is back to a profit so far this year, after a loss in the same months a year before.",
                        "গত বছরের একই সময়ে লোকসানের পর এ বছর এ পর্যন্ত কোম্পানিটি আবার মুনাফায় ফিরেছে।"))
    elif pct is not None and fb_year:
        # The audited table, with no newer notice: name the year — BESTHLDNG
        # read "15% more profit this year" from FY2024 (audit RP4).
        acc = _in_accounts(fb_year)
        lead = _profit_change_line(pct, acc["en"], acc["bn"])
    elif pct is not None:
        lead = _profit_change_line(pct, "this year" if full_year else "so far this year",
                                   "এ বছর" if full_year else "এ বছর এ পর্যন্ত")
    else:
        lead = bi("It is making a profit.", "কোম্পানিটি মুনাফায় চলছে।")
    head = lead
    if both and fy_end:
        n = len(both)
        if n >= 2 and not slip:
            more = bi("Every part of the year so far beat the same months last year.",
                      "এ বছর এখন পর্যন্ত প্রতিটি প্রান্তিকেই মুনাফা গত বছরের একই সময়ের চেয়ে বেশি হয়েছে।")
        elif n >= 2 and not beat:
            more = bi("Every part of the year so far was weaker than the same months last year.",
                      "এ বছর এখন পর্যন্ত প্রতিটি প্রান্তিকেই মুনাফা গত বছরের একই সময়ের চেয়ে কম হয়েছে।")
        elif slip and beat:
            names_en = _join_en([_quarter_words(fy_end, b["q"])["en"] for b in slip])
            names_bn = _join_bn([_quarter_words(fy_end, b["q"])["bn"] for b in slip])
            small = len(slip) == 1 and slip[0]["prev"] and abs(slip[0]["cur"] - slip[0]["prev"]) / abs(slip[0]["prev"]) < 0.05
            more = bi(f"Only {names_en} was {'a little ' if small else ''}weaker than last year.",
                      f"শুধু {names_bn} সময়ে মুনাফা গত বছরের চেয়ে {'সামান্য ' if small else ''}কম হয়েছে।")
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
                              "শেয়ারপ্রতি মুনাফা বেড়েছে। তাই নতুন মুনাফার হিসাবে আজকের দাম আগের চেয়ে সস্তা মনে হচ্ছে।"))
        elif fy_eps_cur < fy_eps_prev:
            meaning.append(bi("With less profit behind each share, today's price now looks dearer than it did on last year's profit.",
                              "শেয়ারপ্রতি মুনাফা কমেছে। তাই নতুন মুনাফার হিসাবে আজকের দাম আগের চেয়ে বেশি মনে হচ্ছে।"))
    if cash_ytd and cash_ytd["cur"] is not None and cash_ytd["prev"] is not None:
        c, p = cash_ytd["cur"], cash_ytd["prev"]
        if c < 0:
            meaning.append(bi("More cash went out of the business than came in. That is worth watching.",
                              "ব্যবসায় যত নগদ টাকা এসেছে, তার চেয়ে বেশি বেরিয়ে গেছে। বিষয়টি খেয়াল রাখা দরকার।"))
        elif p > 0 and c >= p * 1.05:
            meaning.append(bi("More real cash came into the business than a year earlier.",
                              "আগের বছরের তুলনায় এবার ব্যবসা থেকে বেশি নগদ টাকা এসেছে।"))
        elif p > 0 and c <= p * 0.95:
            meaning.append(bi("Less real cash came into the business than a year earlier.",
                              "আগের বছরের তুলনায় এবার ব্যবসা থেকে কম নগদ টাকা এসেছে।"))
        else:
            meaning.append(bi("About the same real cash came into the business as a year earlier.",
                              "ব্যবসা থেকে আগের বছরের মতোই নগদ টাকা এসেছে।"))

    nxt = None
    name_en = name_bn = ""
    next_info = _next_results(table, notices, today) if table else None
    if next_info:
        q = next_info["q"]
        nfe = next_info["fy_end"]
        qwords = _quarter_words(nfe, q) if q < 4 else bi("the full year", "পুরো বছর")
        name_en = f"Results for {qwords['en']}" if q < 4 else "Results for the full year"
        name_bn = f"{qwords['bn']} প্রান্তিকের ফল" if q < 4 else "পুরো বছরের ফল"
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
            when_bn = f"এরপর {name_bn} আসার কথা {d_bn}{' নাগাদ' if next_info['approx'] else ''}"
        else:
            when_en = f"The next results, for {qwords['en']}, can come any day"
            when_bn = f"এরপর {name_bn} যেকোনো দিন আসতে পারে"
        if bar is not None and bar > 0:
            what = bi(
                f"{when_en}. To keep growing, profit has to beat the same months last year.",
                f"{when_bn}। প্রবৃদ্ধি ধরে রাখতে হলে মুনাফা গত বছরের একই সময়ের চেয়ে বেশি হতে হবে।",
            )
        else:
            what = bi(f"{when_en}.", f"{when_bn}।")
        nxt = {"what": what, "date": _iso(next_info["date"]), "approx": bool(next_info["approx"]),
               "beat": round(bar, 2) if bar is not None else None}

    inside = []
    if both:
        inside.append(bi("How each part of the year compares with last year",
                         "এ বছরের প্রতিটি প্রান্তিক গত বছরের তুলনায় কেমন গেছে"))
    if cash_ytd:
        inside.append(bi("Whether real cash came in with the profit", "মুনাফার সঙ্গে নগদ টাকাও হাতে এসেছে কি না"))
    if nxt:
        inside.append(bi("When the next results come, and what they need to show",
                         "পরের ফল কবে আসবে, আর তাতে কী দেখা দরকার"))
    if not inside:
        inside.append(bi("What the latest results mean for this share", "সর্বশেষ ফল থেকে এই শেয়ার সম্পর্কে কী বোঝা যায়"))

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
                     "আমরা কোম্পানির মুনাফা গত বছরের একই সময়ের সঙ্গে মিলিয়ে দেখি।"),
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
    # Name the year (audit RP4): only profitable years have a ratio, so ACI's
    # newest one was 2022 while the row said "This year". A newer year with
    # results but no ratio was a loss: say that instead.
    acc = _in_accounts(latest["year"])
    newest = _newest_results_year(inp)
    loss_since = newest if (newest and newest > latest["year"] and _loss_in(inp, newest)) else None
    # The question is "Is the profit real cash?", so the word answers it.
    if loss_since:
        word, tone = bi("No profit", "মুনাফা নেই"), "bad"
    elif lat < 0:
        word, tone = bi("No", "না"), "bad"
    elif lat < CASH_WEAK_RATIO:
        word, tone = (bi("Partly", "আংশিক"), "fair") if (usual or 0) >= CASH_STRONG_RATIO else (bi("Not much", "খুব একটা না"), "bad")
    elif lat < CASH_STRONG_RATIO:
        word, tone = bi("Mostly", "বেশির ভাগ"), "fair"
    else:
        word, tone = bi("Yes", "হ্যাঁ"), "good"

    # Plain words (2026-10-30): how much of the profit came in as money, in
    # words people use, then how that compares with its usual year.
    if loss_since:
        head = bi(f"It made a loss {_in_accounts(loss_since)['en']}, so there was no profit to turn into cash. "
                  f"The last profitable year we can check is {latest['year']}.",
                  f"{_in_accounts(loss_since)['bn']} লোকসান হয়েছে, তাই নগদে রূপ নেওয়ার মতো মুনাফা ছিল না। "
                  f"যাচাই করার মতো সর্বশেষ মুনাফার বছর {latest['year']}।")
    elif lat < 0:
        head = bi(f"{acc['en'][:1].upper()}{acc['en'][1:]}, more cash went out of the business than came in, even though it showed a profit.",
                  f"{acc['bn']} মুনাফা দেখানো হলেও ব্যবসায় যত নগদ টাকা এসেছে, তার চেয়ে বেশি বেরিয়ে গেছে।")
    else:
        part_en, part_bn = (
            ("all of the profit it showed came in as real money", "হিসাবে যে মুনাফা দেখানো হয়েছে, তার পুরোটাই নগদে হাতে এসেছে") if lat >= 100
            else ("almost all of the profit it showed came in as real money", "হিসাবে যে মুনাফা দেখানো হয়েছে, তার প্রায় পুরোটাই নগদে হাতে এসেছে") if lat >= 80
            else ("most of the profit it showed came in as real money", "হিসাবে যে মুনাফা দেখানো হয়েছে, তার বেশির ভাগই নগদে হাতে এসেছে") if lat >= 60
            else ("about half of the profit it showed came in as real money", "হিসাবে যে মুনাফা দেখানো হয়েছে, তার প্রায় অর্ধেক নগদে হাতে এসেছে") if lat >= 45
            else ("less than half of the profit it showed came in as real money", "হিসাবে যে মুনাফা দেখানো হয়েছে, তার অর্ধেকেরও কম নগদে হাতে এসেছে") if lat >= 25
            else ("only a small part of the profit it showed came in as real money", "হিসাবে যে মুনাফা দেখানো হয়েছে, তার সামান্য অংশই নগদে হাতে এসেছে")
        )
        cmp_en = cmp_bn = ""
        if usual is not None and lat < usual - 10:
            cmp_en, cmp_bn = " That is less than in its usual year.", " অন্য বছরগুলোর তুলনায় এটি কম।"
        elif usual is not None and lat > usual + 10 and lat < 100:
            cmp_en, cmp_bn = " That is better than in its usual year.", " অন্য বছরগুলোর তুলনায় এটি ভালো।"
        head = bi(f"{acc['en'][:1].upper()}{acc['en'][1:]}, {part_en}.{cmp_en}", f"{acc['bn']} {part_bn}।{cmp_bn}")

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
                    "মুনাফা বেড়েছে, কিন্তু নগদ টাকা আসা কমেছে। পণ্য বিক্রি না হয়ে জমে থাকলে বা ক্রেতারা দেরিতে টাকা দিলে এমন হয়।",
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
                                f"{qw['bn']} সময়েই এর বেশির ভাগ কমেছে।",
                            ))
            elif pr > 0 and cr >= 0:
                meaning.append(bi(
                    "Profit and the cash coming in both went up. That is a healthy sign.",
                    "মুনাফা বেড়েছে, নগদ টাকা আসাও বেড়েছে। এটি ভালো লক্ষণ।",
                ))
    if tone in ("fair", "bad"):
        meaning.append(bi(
            "A company can show a profit before the money reaches it. If this happens two years in a row, we treat it as a red flag.",
            "টাকা হাতে আসার আগেই কোম্পানি হিসাবে মুনাফা দেখাতে পারে। পরপর দুই বছর এমন হলে আমরা একে বড় সতর্কতা হিসেবে দেখি।",
        ))
    else:
        meaning.append(bi(
            "Real cash is much harder to fake than profit on paper, so this backs up the profit it shows.",
            "কাগজে মুনাফা দেখানো যত সহজ, নগদ টাকা সাজিয়ে দেখানো তত সহজ নয়। তাই এই নগদ টাকা দেখানো মুনাফার ওপর ভরসা দেয়।",
        ))

    watch = None
    nxt = (this_year or {}).get("next") if this_year else None
    if nxt and nxt.get("date"):
        d_en, d_bn = _day_short(nxt["date"])
        watch = bi(f"We check this again when the next results come, around {d_en}.",
                   f"পরের ফল আসার কথা {d_bn} নাগাদ। তখন আমরা বিষয়টি আবার দেখব।")

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
                     "কোম্পানি যে মুনাফা দেখায়, তা সত্যিই নগদ টাকা হয়ে হাতে আসছে কি না, আমরা সেটা দেখি।"),
        inside=[
            bi(f"How much of its profit came in as real money, year by year for {len(rows)} years",
               f"গত {len(rows)} বছরের প্রতিটিতে মুনাফার কতটা নগদে হাতে এসেছে"),
            bi("Whether this year is better or worse than usual", "এ বছরটা অন্য বছরগুলোর চেয়ে ভালো, না খারাপ"),
            bi("What would make it a red flag", "কী হলে বিষয়টি বড় সতর্কতা হয়ে দাঁড়াবে"),
        ],
        meaning=meaning, watch=watch,
        years=rows, usual=usual,
        _gap_rise=gap_rise,
    )


# ---------------------------------------------------------------- where the profit comes from (audit N2)

# Of every ৳100 of profit, how much the business itself made (operating profit,
# before interest and tax, against the profit after both). PADMAOIL's business
# made ৳5m against a ৳5.6bn profit: almost all of it was interest on deposits.
CORE_YES_PCT = 80.0           # ৳80+ of every ৳100 from the business
CORE_MOSTLY_PCT = 50.0        # under ৳50: most of it came from elsewhere (amber red-flag check)
CORE_PARTLY_PCT = 25.0
CORE_MAX_RATIO = 20.0         # business profit over 20× the profit is a bad figure, not a reading
CORE_ONE_OFF_JUMP_PCT = 50.0  # profit up 50%+ while the business made about the same …
CORE_ONE_OFF_FLAT_PCT = 10.0  # … (its own profit up less than 10%)
CORE_STALE_YEARS = 2          # a year this far behind the newest results isn't read


def _core_years(inp: dict) -> list[dict]:
    """Profitable years with both lines, oldest first (up to five): the
    business's own profit and the whole profit, ৳ crore, and the share."""
    rows = []
    for r in inp.get("extended_financials") or []:
        try:
            y = int(r.get("year"))
        except (TypeError, ValueError):
            continue
        op, np_, rev = _f(r.get("ebit")), _f(r.get("net_profit")), _f(r.get("revenue"))
        if op is None or np_ is None or np_ <= 0:
            continue
        if rev is not None and rev > 0 and op > rev:   # more than its sales: a bad line
            continue
        if op > 0 and op / np_ > CORE_MAX_RATIO:
            continue
        # A business that made a little (PADMAOIL: ৳5m of ৳5.6bn) is ৳1, never
        # the ৳0 that would read as "its business lost money".
        raw = op / np_ * 100
        share = max(1, min(100, round(raw))) if op > 0 else max(-100, min(0, round(raw)))
        rows.append({"year": y, "business_cr": round(op / 1e7, 1), "profit_cr": round(np_ / 1e7, 1),
                     "share": int(share)})
    rows.sort(key=lambda x: x["year"])
    return rows[-5:]


def build_core(inp: dict) -> Optional[dict]:
    """Does the profit come from its business? Not for banks, NBFIs and
    insurers: their interest and investment income is the business."""
    if inp.get("sector_class") in _FINANCIALS:
        return None
    rows = _core_years(inp)
    if not rows:
        return None
    latest = rows[-1]
    newest = _newest_results_year(inp)
    if newest and newest - latest["year"] >= CORE_STALE_YEARS:
        return None
    y, share = latest["year"], latest["share"]
    acc = _in_accounts(y)
    lead_en, lead_bn = acc["en"][:1].upper() + acc["en"][1:], acc["bn"]
    op_en, op_bn = _crore(latest["business_cr"] * 10.0)
    np_en, np_bn = _crore(latest["profit_cr"] * 10.0)

    if share >= CORE_YES_PCT:
        word, tone = bi("Yes", "হ্যাঁ"), "good"
    elif share >= CORE_MOSTLY_PCT:
        word, tone = bi("Mostly", "বেশির ভাগ"), "fair"
    elif share >= CORE_PARTLY_PCT:
        word, tone = bi("Partly", "আংশিক"), "bad"
    elif share > 0:
        word, tone = bi("Very little", "খুব সামান্য"), "bad"
    else:
        word, tone = bi("No", "না"), "bad"

    if share >= 100:
        head = bi(f"{lead_en}, its business made {op_en} before interest and tax, more than its whole profit of {np_en}.",
                  f"{lead_bn} সুদ আর কর বাদ দেওয়ার আগে ব্যবসা থেকে আয় হয়েছে {op_bn}, যা পুরো মুনাফা {np_bn}-এর চেয়ে বেশি।")
    elif share > 0:
        head = bi(f"{lead_en}, its business made about ৳{share} of every ৳100 of its profit. "
                  "The rest came from other income, such as interest on its bank deposits.",
                  f"{lead_bn} প্রতি ৳100 মুনাফার মধ্যে প্রায় ৳{share} এসেছে ব্যবসা থেকে। "
                  "বাকিটা এসেছে অন্য আয় থেকে, যেমন ব্যাংকে রাখা টাকার সুদ।")
    else:
        head = bi(f"{lead_en}, its business itself lost money. Its profit of {np_en} came from other income, "
                  "such as interest on its bank deposits.",
                  f"{lead_bn} ব্যবসা নিজেই লোকসানে ছিল। {np_bn} মুনাফা এসেছে অন্য আয় থেকে, যেমন ব্যাংকে রাখা টাকার সুদ।")

    meaning = [bi("Profit from what a company sells tends to come back year after year. Interest on deposits "
                  "and one-off gains can stop when the money is spent or the gain is gone.",
                  "কোম্পানি যা বিক্রি করে, তা থেকে আসা মুনাফা সাধারণত বছরের পর বছর ফিরে আসে। ব্যাংকের সুদ বা "
                  "এককালীন লাভ টাকা খরচ হয়ে গেলে বা লাভটা ফুরিয়ে গেলে বন্ধ হয়ে যেতে পারে।")]
    earlier = [r["share"] for r in rows[:-1]]
    usual = round(statistics.median(earlier)) if earlier else None
    if usual is not None and abs(usual - share) >= 20:
        if usual >= 100:
            meaning.append(bi("In its earlier years, its business made more than its whole profit.",
                              "আগের বছরগুলোতে ব্যবসা থেকে আয় পুরো মুনাফার চেয়েও বেশি ছিল।"))
        else:
            meaning.append(bi(f"In its earlier years, its business made about ৳{max(usual, 0)} of every ৳100.",
                              f"আগের বছরগুলোতে প্রতি ৳100 মুনাফার মধ্যে ব্যবসা থেকে আসত প্রায় ৳{max(usual, 0)}।"))
    one_off = False
    if len(rows) >= 2 and rows[-2]["year"] == y - 1:
        p0, p1 = rows[-2]["profit_cr"], latest["profit_cr"]
        b0, b1 = rows[-2]["business_cr"], latest["business_cr"]
        if (p0 > 0 and b0 > 0 and (p1 - p0) / p0 * 100 >= CORE_ONE_OFF_JUMP_PCT
                and (b1 - b0) / b0 * 100 < CORE_ONE_OFF_FLAT_PCT):
            one_off = True
            meaning.append(bi(f"Its profit jumped in {y} while its business made about the same, "
                              "so part of that profit is likely a one-off gain.",
                              f"{y} সালে মুনাফা অনেক বেড়েছে, কিন্তু ব্যবসা থেকে আয় প্রায় একই ছিল। "
                              "তাই ওই মুনাফার একটি অংশ সম্ভবত এককালীন লাভ।"))
    watch = None
    if share < CORE_YES_PCT or one_off:
        watch = bi("Watch whether its next yearly accounts show the business itself earning more.",
                   "পরের বার্ষিক হিসাবে ব্যবসা নিজে বেশি আয় করছে কি না, সেদিকে খেয়াল রাখুন।")
    first = rows[0]["year"]
    src = bi(f"Audited accounts FY{first}" + (f" to FY{y}" if y != first else ""),
             f"নিরীক্ষিত বার্ষিক হিসাব {first}" + (f" থেকে {y}" if y != first else ""))
    return _section(
        "core",
        bi("Does the profit come from its business?", "মুনাফা কি ব্যবসা থেকেই আসে?"),
        word, tone, head, src,
        free_line=bi("We check how much of its profit its own business made.",
                     "মুনাফার কতটা কোম্পানির নিজের ব্যবসা থেকে এসেছে, আমরা সেটা দেখি।"),
        inside=[
            bi("How much of its profit its business made, and how much came from other income",
               "মুনাফার কতটা ব্যবসা থেকে, আর কতটা অন্য আয় থেকে এসেছে"),
            bi("Whether a jump in profit looks like a one-off gain", "মুনাফার হঠাৎ বৃদ্ধি এককালীন লাভ কি না"),
        ],
        meaning=meaning, watch=watch,
        years=rows, usual=usual, year=y, share=share, one_off=one_off,
    )


# ---------------------------------------------------------------- can you sell it (audit N6)

# A sale should be no more than a tenth of a normal day's trading, so the
# seller's own orders don't push the price down.
LIQ_SHARE_OF_DAY = 0.10
LIQ_EASY_MN = 10.0       # ৳1 crore a day: even ৳10 lakh sells within a day
LIQ_SLOW_MN = 0.2        # under ৳2 lakh a day: ৳1 lakh takes more than 5 trading days
LIQ_NO_TRADE_DAYS = 30   # no trade for a month: there may be no buyer


def _days_to_sell(amount_mn: float, per_day_mn: float) -> float:
    return amount_mn / (LIQ_SHARE_OF_DAY * per_day_mn)


def _days_words(days: float) -> tuple[str, str]:
    if days <= 1:
        return "within a day", "এক দিনের মধ্যে"
    n = int(math.ceil(days))
    return f"about {n} trading days", f"প্রায় {n} লেনদেনের দিন"


def build_liquidity(inp: dict) -> Optional[dict]:
    """Can you sell it when you want to? From a normal day's trading (7-day
    average) and the shares not held by its owners or the government."""
    today = inp["today"]
    series = _price_series(inp.get("prices") or [])
    last_trade = series[-1][0] if series else None
    t_mn = _turnover_mn(inp)
    stale = last_trade is not None and (today - last_trade).days > LIQ_NO_TRADE_DAYS
    if t_mn is None and not stale:
        return None
    float_pct = float_mn = None
    own = _owner_rows(inp.get("holdings") or [])
    if own:
        h = own[-1][1]
        sp, gv = _f(h.get("sponsor_director_pct")), _f(h.get("govt_pct")) or 0.0
        if sp is not None:
            float_pct = max(0.0, min(100.0, 100.0 - sp - gv))
            mcap = _f((inp.get("score_row") or {}).get("mcap_mn"))
            if mcap and mcap > 0:
                float_mn = round(mcap * float_pct / 100.0, 1)

    d1 = d10 = None
    if stale or not t_mn or t_mn <= 0:
        e, b = _day(last_trade)
        word, tone = bi("No", "না"), "bad"
        if e:
            head = bi(f"Not now. It has not traded since {e}, so there may be no buyer when you want to sell.",
                      f"এখন নয়। {b}-এর পর এই শেয়ারে কোনো লেনদেন হয়নি, তাই বিক্রি করতে চাইলে ক্রেতা না-ও মিলতে পারে।")
        else:
            head = bi("Not now. It has not traded lately, so there may be no buyer when you want to sell.",
                      "এখন নয়। সম্প্রতি এই শেয়ারে কোনো লেনদেন হয়নি, তাই বিক্রি করতে চাইলে ক্রেতা না-ও মিলতে পারে।")
    else:
        d1, d10 = _days_to_sell(0.1, t_mn), _days_to_sell(1.0, t_mn)
        day_en, day_bn = _crore(t_mn)
        w1_en, w1_bn = _days_words(d1)
        if t_mn >= LIQ_EASY_MN:
            word, tone = bi("Easily", "সহজেই"), "good"
            head = bi(f"Yes, easily. About {day_en} of its shares trade on a normal day, so even ৳10 lakh would sell within a day.",
                      f"হ্যাঁ, সহজেই। সাধারণ একটি দিনে প্রায় {day_bn} লেনদেন হয়, তাই ৳10 লাখের শেয়ারও এক দিনের মধ্যে বিক্রি করা যায়।")
        elif t_mn >= THIN_TURNOVER_MN:
            word, tone = bi("Yes", "হ্যাঁ"), "good"
            head = bi(f"Yes. About {day_en} of its shares trade on a normal day, so you could sell ৳1 lakh within a day.",
                      f"হ্যাঁ। সাধারণ একটি দিনে প্রায় {day_bn} লেনদেন হয়, তাই ৳1 লাখের শেয়ার এক দিনের মধ্যে বিক্রি করা যায়।")
        elif t_mn >= LIQ_SLOW_MN:
            word, tone = bi("Slowly", "ধীরে"), "fair"
            head = bi(f"Slowly. Only about {day_en} of its shares trade on a normal day, so selling ৳1 lakh could take {w1_en}.",
                      f"ধীরে। সাধারণ একটি দিনে মাত্র প্রায় {day_bn} লেনদেন হয়, তাই ৳1 লাখের শেয়ার বিক্রি করতে {w1_bn} লাগতে পারে।")
        else:
            word, tone = bi("Hard", "কঠিন"), "bad"
            head = bi(f"It could be hard. Only about {day_en} of its shares trade on a normal day, so selling ৳1 lakh could take {w1_en}.",
                      f"কঠিন হতে পারে। সাধারণ একটি দিনে মাত্র প্রায় {day_bn} লেনদেন হয়, তাই ৳1 লাখের শেয়ার বিক্রি করতে {w1_bn} লাগতে পারে।")

    meaning = []
    if d10 is not None and t_mn < LIQ_EASY_MN:
        w_en, w_bn = _days_words(d10)
        meaning.append(bi(f"Selling ৳10 lakh would take {w_en}.", f"৳10 লাখের শেয়ার বিক্রি করতে {w_bn} লাগবে।"))
    if float_mn is not None and float_pct is not None:
        f_en, f_bn = _crore(float_mn)
        meaning.append(bi(f"About {f_en} of its shares are with investors other than its owners and the government, "
                          f"{round(float_pct)} of every 100 shares.",
                          f"উদ্যোক্তা-পরিচালক আর সরকারের বাইরে অন্য বিনিয়োগকারীদের হাতে আছে প্রায় {f_bn}-এর শেয়ার, "
                          f"প্রতি 100টির মধ্যে {round(float_pct)}টি।"))
        if float_pct < FREE_FLOAT_LOW_PCT:
            meaning.append(bi("With so few shares in ordinary hands, a handful of buyers or sellers can move the price a lot.",
                              "সাধারণ বিনিয়োগকারীদের হাতে এত কম শেয়ার থাকায় অল্প কয়েকজন ক্রেতা বা বিক্রেতাই দাম অনেকটা ওঠানামা করাতে পারেন।"))
    if d1 is not None:
        meaning.append(bi("We count a sale as no more than a tenth of a normal day's trading, so your own selling "
                          "doesn't push the price down.",
                          "আমরা ধরে নিই, আপনি একটি দিনের মোট লেনদেনের দশ ভাগের এক ভাগের বেশি বিক্রি করবেন না, "
                          "যাতে আপনার বিক্রির চাপে দাম না কমে।"))
    watch = None
    if tone != "good":
        watch = bi("If you may need this money at short notice, keep in mind that selling can take time.",
                   "এই টাকা হঠাৎ দরকার হতে পারলে মনে রাখুন, শেয়ারটি বিক্রি করতে সময় লাগতে পারে।")
    src = bi("DSE trading, the last 7 trading days · monthly ownership report",
             "ডিএসইর লেনদেন, শেষ 7টি লেনদেনের দিন · মাসিক শেয়ারধারণ প্রতিবেদন")
    return _section(
        "liquidity",
        bi("Can you sell it when you want to?", "দরকারের সময় বিক্রি করতে পারবেন কি?"),
        word, tone, head, src,
        free_line=bi("We check how much of it trades on a normal day.",
                     "সাধারণ একটি দিনে এই শেয়ারে কত টাকার লেনদেন হয়, আমরা সেটা দেখি।"),
        inside=[bi("How long selling ৳1 lakh or ৳10 lakh would take", "৳1 লাখ বা ৳10 লাখের শেয়ার বিক্রি করতে কত দিন লাগবে"),
                bi("How much of it is with ordinary investors", "সাধারণ বিনিয়োগকারীদের হাতে কতটা শেয়ার আছে")],
        meaning=meaning, watch=watch,
        turnover_mn=round(t_mn, 2) if t_mn else None,
        days_1lakh=round(d1, 2) if d1 is not None else None,
        days_10lakh=round(d10, 2) if d10 is not None else None,
        float_pct=round(float_pct, 1) if float_pct is not None else None,
        float_mn=float_mn,
        last_trade=_iso(last_trade),
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


# Today's price against its usual / its sector's years of profit: more than
# this far either side reads "cheaper" / "dearer" (the picture's one band).
PE_BAND = 0.10


def range_agrees(verdict: Optional[str], ltp: Optional[float], fv: Optional[dict]) -> bool:
    """The fair-value range points the same way as the price word: a low price
    sits under the range's centre, a high one over it, a fair one inside it.
    When they disagree the range is not shown (audit PR4: "Low ✓" beside
    "inside the fair range" beside "more than usual" on one screen)."""
    if not fv or not ltp or verdict in (None, "unjudged"):
        return verdict is not None and verdict != "unjudged"
    lo, hi, mid = _f(fv.get("low")), _f(fv.get("high")), _f(fv.get("center"))
    if not (lo and hi and mid):
        return False
    if verdict == "cheap":
        return ltp < mid
    if verdict == "expensive":
        return ltp > mid
    return lo <= ltp <= hi


def buy_price_for(row: dict, ltp: Optional[float], near_top: Optional[float]) -> Optional[float]:
    """Our buy price: the highest price at which the Buy rule still holds
    (2026-11-04, audit PR1). It used to be the fair-value centre less 20%, a
    second model that disagreed with the signal on 44% of companies — every
    "fair price" Buy showed a buy price under today's (BRACBANK: Buy at ৳65,
    "a good buy under ৳46.6") and 13 Buys had none.

    A mostly strong company is a Buy once its price score reaches CHEAP_P4; a
    strong-all-round one stays a Buy down to EXPENSIVE_P4 (signal_service rules
    7-9). Solved from the score itself (scoring_service.price_for_p4) and never
    above the near-the-top line, where the signal stops saying Buy. None for a
    weaker grade, or when no price reaches the line."""
    from backend.services.scoring_service import price_for_p4
    from backend.services.stock_facts import CHEAP_P4, EXPENSIVE_P4
    from backend.services.tiers import tier_key

    line = {"excellent": EXPENSIVE_P4, "good": CHEAP_P4}.get(tier_key(_f(row.get("score"))))
    if line is None or not ltp:
        return None
    price = price_for_p4(row, line)
    if price is None:
        return None
    if near_top and price > near_top:
        price = near_top
    elif not near_top and price > ltp * 5:
        return None
    return _round_price(price)


def leave_price_for(row: dict) -> Optional[float]:
    """The price at which a Buy leaves on valuation: its price score falls under
    CHEAP_LEAVE_P4 (a strong-all-round company: EXPENSIVE_LEAVE_P4)."""
    from backend.services.scoring_service import price_for_p4
    from backend.services.signal_service import CHEAP_LEAVE_P4, EXPENSIVE_LEAVE_P4
    from backend.services.tiers import tier_key

    line = {"excellent": EXPENSIVE_LEAVE_P4, "good": CHEAP_LEAVE_P4}.get(tier_key(_f(row.get("score"))))
    if line is None:
        return None
    price = price_for_p4(row, line)
    ltp = _f(row.get("ltp"))
    if price is None or (ltp and price > ltp * 5):
        return None
    return _round_price(price)


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
    eps_now = _f(row.get("eps"))
    if verdict and eps_now is not None and eps_now <= 0:
        # A loss in the latest results: there is no profit to judge the price
        # against, so the light and the row say so instead of "High"
        # (2026-11-04, audit PR4 — TITASGAS read "High" beside "we can't say").
        verdict = "unjudged"
    if verdict == "unjudged":
        word, tone = bi("Can't judge", "বলা যায় না"), "neutral"
        free = bi(f"Today {money(ltp)}. It made a loss in its latest results, so there is no profit to judge the price against.",
                  f"আজকের দাম {money(ltp)}। সর্বশেষ ফলে লোকসান হয়েছে, তাই মুনাফার তুলনায় দাম বিচার করার উপায় নেই।")
    elif verdict == "cheap":
        word, tone = bi("Low", "কম"), "good"
        free = bi(f"At {money(ltp)} today, we think the share costs less than the company is worth.",
                  f"আজ শেয়ারটির দাম {money(ltp)}। আমাদের মতে, কোম্পানির আসল মূল্যের চেয়ে এই দাম কম।")
    elif verdict == "expensive":
        word, tone = bi("High", "বেশি"), "fair"
        free = bi(f"At {money(ltp)} today, we think the share costs more than the company is worth.",
                  f"আজ শেয়ারটির দাম {money(ltp)}। আমাদের মতে, কোম্পানির আসল মূল্যের চেয়ে এই দাম বেশি।")
    elif verdict == "fair":
        word, tone = bi("Fair", "ন্যায্য"), "neutral"
        free = bi(f"At {money(ltp)} today, we think the price is about right for the company.",
                  f"আজ শেয়ারটির দাম {money(ltp)}। আমাদের মতে, কোম্পানির জন্য এই দাম মোটামুটি ন্যায্য।")
    else:
        word, tone = bi("Not rated", "রেটিং নেই"), "neutral"
        free = bi(f"Today {money(ltp)}.", f"আজকের দাম {money(ltp)}।")

    fair = None
    methods = []
    gap = buy_below = None
    profit_fall = None
    if fv and fv.get("center") and not fv.get("estimates_disagree") and range_agrees(verdict, ltp, fv):
        fair = {"low": _f(fv["low"]), "high": _f(fv["high"]), "center": _f(fv["center"])}
        methods = [{"label": bi(m.get("label_en") or "", m.get("label_bn") or m.get("label_en") or ""),
                    "price": _f(m.get("price"))} for m in fv.get("methods") or [] if _f(m.get("price"))]
        methods.sort(key=lambda m: m["price"])
        gap = round((ltp - fair["center"]) / fair["center"] * 100.0)
        if fall and _f(fall.get("center")):
            profit_fall = {"pct": round(PROFIT_FALL * 100), "center": _f(fall["center"])}
    buy_below = buy_price_for(row, ltp, _near_top(inp))

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
                             f"{grow_bn}, আর শেয়ারের দাম আবার স্বাভাবিক পর্যায়ে ফিরলে" if bull_is_usual
                             else f"{grow_bn}, আর শেয়ারের দাম সাম্প্রতিক বছরগুলোর সর্বোচ্চ পর্যায়ে উঠলে"),
                 "price": _round_price(bull)},
            ]

    # Plain words (2026-10-30). "P/E" is said as "years of its profit you pay
    # for": a P/E of 7.5 means today's price equals about 7.5 years of profit.
    def vs(a: float, b: float) -> Optional[tuple[str, str]]:
        r = a / b
        return (("much cheaper", "অনেক সস্তা") if r < 0.75 else ("cheaper", "সস্তা") if r < 1 - PE_BAND
                else ("much dearer", "অনেক দামি") if r > 1.3 else ("dearer", "দামি") if r > 1 + PE_BAND else None)

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

    # One answer to "Is today's price right?" (audit PR4): the sentence says
    # what the word says, and the fair range — shown only when it points the
    # same way (range_agrees) — backs it up.
    if verdict == "unjudged" or not verdict:
        head = bi("It made no profit in its latest results, so we can't say whether the price is fair.",
                  "সর্বশেষ ফলে কোম্পানির কোনো মুনাফা হয়নি। তাই দাম ন্যায্য কি না, তা বলা যাচ্ছে না।")
    else:
        lead = {"cheap": bi(f"At {money(ltp)} today, the price is low for what the company earns and owns.",
                            f"আজকের দাম {money(ltp)}, যা কোম্পানির আয় আর সম্পদের তুলনায় কম।"),
                "fair": bi(f"At {money(ltp)} today, the price is about right for what the company earns and owns.",
                           f"আজকের দাম {money(ltp)}, যা কোম্পানির আয় আর সম্পদের তুলনায় মোটামুটি ঠিক আছে।"),
                "expensive": bi(f"At {money(ltp)} today, the price is high for what the company earns and owns.",
                                f"আজকের দাম {money(ltp)}, যা কোম্পানির আয় আর সম্পদের তুলনায় বেশি।")}[verdict]
        if fair:
            head = bi(f"{lead['en']} We think a fair price is between {money(fair['low'])} and {money(fair['high'])}.",
                      f"{lead['bn']} আমাদের হিসাবে ন্যায্য দাম {money(fair['low'])} থেকে {money(fair['high'])}-এর মধ্যে।")
        else:
            head = lead

    meaning = []
    if compare:
        meaning.append(compare)
    if pe_now:
        yrs_en = f"At today's price you pay for about {pe_now:.0f} years of its profit"
        yrs_bn = f"আজকের দামে আপনি কোম্পানির প্রায় {pe_now:.0f} বছরের মুনাফার সমান দাম দিচ্ছেন"
        if usual:
            yrs_en += f"; it usually costs about {usual:.0f} years' worth"
            yrs_bn += f"। সাধারণত এটি থাকে প্রায় {usual:.0f} বছরের মুনাফার সমান"
        meaning.append(bi(yrs_en + ". Fewer years means a cheaper share.", yrs_bn + "। বছর যত কম, শেয়ারটি তত সস্তা।"))
    if fv and fv.get("center") and (fv.get("estimates_disagree") or not fair):
        meaning.append(bi(
            "Our different ways of valuing it disagree for this share, so we don't show one fair price.",
            "এই শেয়ারের মূল্য আমরা যে কয়েকভাবে হিসাব করি, সেগুলো এক জায়গায় মিলছে না। তাই কোনো একটি ন্যায্য দাম দেখাচ্ছি না।",
        ))
    if profit_fall:
        below = ltp < profit_fall["center"]
        meaning.append(bi(
            "Even if its profit fell by a fifth, today's price would still be below what we think it is worth." if below
            else "If its profit fell by a fifth, today's price would be more than what we think it is worth.",
            "মুনাফা পাঁচ ভাগের এক ভাগ কমে গেলেও আজকের দাম আমাদের হিসাবে কোম্পানির মূল্যের নিচেই থাকবে।" if below
            else "মুনাফা পাঁচ ভাগের এক ভাগ কমে গেলে আজকের দাম আমাদের হিসাবে কোম্পানির মূল্যের চেয়ে বেশি হয়ে যাবে।",
        ))
    if scenarios:
        meaning.append(bi(
            "The three prices for next year are simple sums from its profit, not a forecast.",
            "আগামী বছরের এই তিনটি দাম কোম্পানির মুনাফা থেকে করা সহজ হিসাব মাত্র, কোনো পূর্বাভাস নয়।",
        ))

    watch = None
    if buy_below:
        watch = (bi(f"At {money(buy_below)} or less we would call it a buy.",
                    f"দাম {money(buy_below)} বা তার নিচে হলে আমরা একে কেনার মতো বলব।") if ltp > buy_below
                 else bi(f"Today's price is under {money(buy_below)}, the price up to which we would call it a buy.",
                         f"আজকের দাম {money(buy_below)}-এর নিচে। এই দাম পর্যন্ত আমরা একে কেনার মতো বলি।"))

    inside = []
    if fair:
        n = len(methods)
        inside.append(bi(f"What we think a fair price is, worked out {n} {'way' if n == 1 else 'ways'}",
                         f"{n}টি উপায়ে হিসাব করা ন্যায্য দাম"))
        if buy_below:
            inside.append(bi("The price we would buy under, with a one-tap alert", "কোন দামের নিচে কেনা ভালো, সঙ্গে এক ট্যাপে প্রাইস অ্যালার্ট"))
    if scenarios:
        inside.append(bi("Where the price could be in a year, in three cases",
                         "তিনটি অবস্থায় এক বছর পর দাম কত হতে পারে"))
    elif profit_fall:
        inside.append(bi("What happens to its value if profit falls", "মুনাফা কমলে কোম্পানির মূল্যে কী প্রভাব পড়ে"))
    if not inside:
        inside.append(bi("How the price compares with its past and its sector", "আগের বছরগুলো আর একই সেক্টরের তুলনায় দামটি কেমন"))

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
        bi("Is today's price right?", "আজকের দাম কি ন্যায্য?"),
        word, tone, head, bi(src_en, src_bn),
        free_line=free, inside=inside, meaning=meaning, watch=watch,
        today=ltp, fair=fair, methods=methods, gap_pct=gap, buy_below=buy_below,
        profit_fall=profit_fall, scenarios=scenarios,
        pe={"now": round(pe_now, 2) if pe_now else None, "usual": round(usual, 2) if usual else None,
            "sector": round(sector_pe, 2) if sector_pe else None},
        _verdict=verdict, _buy_watch=watch is not None,
    )


# ---------------------------------------------------------------- dividend

def _div_history(inp: dict) -> dict[int, float]:
    """{fiscal year: cash dividend ৳ a share} — the company page's list of
    finished years, filled from the ledger (interim + final) for a finished year
    the page doesn't have yet or shows smaller. A year with only an interim so
    far is left out: GP's FY2026 interim is not "the FY2026 dividend", and
    comparing it with FY2025's full year read as a cut (2026-11-04, DT2). The
    ledger only holds about a year, so it never overrides a larger page figure
    (MARICO's page has FY2026's interims from before our news window)."""
    face = _f(inp.get("face_value")) or 10.0
    out: dict[int, float] = {}
    for pair in (inp.get("company") or {}).get("cash_dividends") or []:
        try:
            y, pct = int(pair[0]), _f(pair[1])
        except (TypeError, ValueError, IndexError):
            continue
        if pct is not None:
            out[y] = round(pct * face / 100.0, 2)
    for y, slot in ledger_years(inp.get("ledger") or []).items():
        if not slot["complete"]:
            continue
        cps = round(slot["cash_pct"] * face / 100.0, 2)
        if y not in out or cps > out[y]:
            out[y] = cps
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
        "fy": fiscal_year(pe, year_end_month(own_rows(inp.get("ledger") or []))) if pe else None,
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


_SAFETY_LEAD = {
    "safe": ("The dividend looks steady", "ডিভিডেন্ড স্থিতিশীল মনে হচ্ছে"),
    "watch": ("The dividend is worth a check", "ডিভিডেন্ডটি যাচাই করে নিন"),
    "risk": ("The dividend is at risk", "ডিভিডেন্ড ঝুঁকিতে"),
}


def _safety_sentence(ds: Optional[dict]) -> Optional[dict]:
    """dividend_safety's word and line as one report sentence."""
    if not ds or ds.get("level") not in _SAFETY_LEAD:
        return None
    en, bn = _SAFETY_LEAD[ds["level"]]
    line_en = ds["line_en"][:1].lower() + ds["line_en"][1:]
    return bi(f"{en}: {line_en}", f"{bn}: {ds['line_bn']}")


def build_dividend(inp: dict, growth: float = 0.0) -> Optional[dict]:
    from backend.services.dividend_safety import dividend_safety

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
        word, tone = bi("Cut", "অনেক কমেছে"), "bad"

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
    newest = _newest_results_year(inp)
    if newest and cur_y and cur_y < newest:
        eps_now = None   # an old dividend year: no next-year guess from it (audit RP4)
    if payouts and eps_now and eps_now > 0:
        usual_payout = statistics.median(payouts)
        lo = usual_payout * eps_now
        hi = usual_payout * eps_now * (1 + growth)
        if lo > 0:
            next_range = {"low": round(lo, 2), "high": round(max(lo, hi), 2), "_payout": usual_payout}

    # "A year" means the year's cash (interim + final), never one payment: an
    # interim or the rest of a final read MARICO's yield as 1.4% while every
    # list said 8.0% (audit SP3).
    cps = cur or (latest or {}).get("cash_ps")
    year_yield = round(cur / ltp * 100.0, 2) if (cur and ltp) else None
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
    safety = None
    if not cur:
        head = (bi("It gave bonus shares, not cash, for its latest year.", "সর্বশেষ বছরের জন্য কোম্পানিটি নগদ নয়, বোনাস শেয়ার দিয়েছে।")
                if stock_only else
                bi("It paid no cash dividend for its latest year.", "সর্বশেষ বছরের জন্য কোম্পানিটি কোনো নগদ ডিভিডেন্ড দেয়নি।"))
    else:
        # Plain words (2026-10-30): did the dividend go up or down, then is it
        # safe — said as a share of profit in words, never "42% payout,
        # covered 1.4 times".
        # The year by name (audit RP4): BEXIMCO's FY2023 dividend read "It
        # cut its cash dividend this year".
        if prev and cur < prev * 0.98:
            change = bi(f"For {cur_y} it cut its cash dividend, from {tk2(prev)} to {tk2(cur)} a share.",
                        f"{cur_y} সালের জন্য কোম্পানিটি নগদ ডিভিডেন্ড কমিয়ে শেয়ারপ্রতি {tk2(prev)} থেকে {tk2(cur)} করেছে।")
        elif prev and cur > prev * 1.02:
            change = bi(f"For {cur_y} it raised its cash dividend, to {tk2(cur)} a share.",
                        f"{cur_y} সালের জন্য কোম্পানিটি নগদ ডিভিডেন্ড বাড়িয়ে শেয়ারপ্রতি {tk2(cur)} করেছে।")
        else:
            change = bi(f"For {cur_y} it paid {tk2(cur)} a share in cash.", f"{cur_y} সালের জন্য কোম্পানিটি শেয়ারপ্রতি {tk2(cur)} নগদ ডিভিডেন্ড দিয়েছে।")
        # "Is it safe?" is the dividend calendar's rule (dividend_safety), so the
        # report and the calendar never disagree (audit RP5: TITASGAS read
        # "Steady" here and "At risk: it made a loss" there; 54 such conflicts).
        safety = dividend_safety(inp.get("score_row") or {}, inp.get("sector_class") or "GENERAL")
        safe = _safety_sentence(safety)
        head = bi(change["en"] + (f" {safe['en']}" if safe else ""), change["bn"] + (f" {safe['bn']}" if safe else ""))

    meaning = []
    if cur and cash_cover is not None and cash_cover < 1 and inp.get("sector_class") not in _LENDERS:
        meaning.append(bi("In that year the cash the business brought in was not enough to pay it all.",
                          "সে বছর ব্যবসা থেকে যত নগদ টাকা এসেছে, তা পুরো ডিভিডেন্ড দেওয়ার জন্য যথেষ্ট ছিল না।"))
    if on_10k:
        meaning.append(bi(
            f"If you put ৳10,000 in today, it would pay you about {money(on_10k['net'])} a year in cash, after tax.",
            f"আজ ৳10,000 বিনিয়োগ করলে কর বাদ দিয়ে বছরে প্রায় {money(on_10k['net'])} নগদ ডিভিডেন্ড পাবেন।",
        ))
    if rec_rows:
        r = rec_rows[0]
        m_en, m_bn = _mon(r["date"])
        # Did buying just before the record date, only for the dividend, pay?
        if r["kept_ps"] > r["fees_ps"]:
            meaning.append(bi(
                f"Last time, in {m_en}, the price held up after the record date, so someone who bought only for the dividend came out ahead.",
                f"গতবার {m_bn}-এ রেকর্ড ডেটের পরেও দাম ধরে ছিল। তাই যাঁরা শুধু ডিভিডেন্ডের জন্য কিনেছিলেন, তাঁরা লাভে ছিলেন।",
            ))
        else:
            meaning.append(bi(
                f"Last time, in {m_en}, the price dropped by about as much as the dividend after the record date. "
                "Buying just to collect the dividend did not pay once fees were counted.",
                f"গতবার {m_bn}-এ রেকর্ড ডেটের পর দাম প্রায় ডিভিডেন্ডের সমান কমে গিয়েছিল। "
                "লেনদেনের খরচ ধরলে শুধু ডিভিডেন্ড পাওয়ার জন্য কিনে লাভ হয়নি।",
            ))
    if next_range:
        p = next_range["_payout"] * 100
        lo, hi = next_range["low"], next_range["high"]
        rng_en = f"about {_tk_est(lo)}" + (f" to {_tk_est(hi)}" if _tk_est(hi) != _tk_est(lo) else "")
        rng_bn = f"প্রায় {_tk_est(lo)}" + (f" থেকে {_tk_est(hi)}" if _tk_est(hi) != _tk_est(lo) else "")
        meaning.append(bi(
            f"If profit holds, next year's dividend could be {rng_en} a share.",
            f"মুনাফা একই রকম থাকলে আগামী বছর শেয়ারপ্রতি {rng_bn} ডিভিডেন্ড আসতে পারে।",
        ))

    watch = None
    if latest and latest["upcoming"] and latest.get("cash_ps") and latest.get("buy_by"):
        b_en, b_bn = _day(latest["buy_by"])
        r_en, r_bn = _day(latest["record_date"])
        watch = bi(f"To get the {tk2(latest['cash_ps'])} a share, buy by {b_en}. You must own the shares on the record date, {r_en}.",
                   f"শেয়ারপ্রতি {tk2(latest['cash_ps'])} পেতে হলে {b_bn}-এর মধ্যে কিনতে হবে। রেকর্ড ডেট {r_bn}, সেদিন শেয়ার আপনার কাছে থাকতে হবে।")

    n_paid = len([h for h in history[-10:] if h["cash_ps"] > 0])
    n_years = len(history[-10:])
    free = bi(f"It has paid a cash dividend in {n_paid} of the last {n_years} years.",
              f"গত {n_years} বছরের মধ্যে {n_paid} বছর কোম্পানিটি নগদ ডিভিডেন্ড দিয়েছে।") if n_years else None

    inside = []
    if cps:
        inside.append(bi(f"What the {tk2(cps)} dividend is really worth to you after tax",
                         f"{tk2(cps)} ডিভিডেন্ড থেকে কর বাদে আপনার হাতে আসলে কত আসে"))
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
        src_bn.append(f"{b}-এর রেকর্ড ডেটের আগে-পরের দাম")
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
        safety=({"level": safety["level"], "word": bi(safety["word_en"], safety["word_bn"]),
                 "line_en": safety["line_en"], "line_bn": safety["line_bn"]} if cur and safety else None),
        year=cur_y if cur else None, year_cash_ps=cur or None, year_yield_pct=year_yield
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
            return f"in {_MON_FULL_EN[a.month]}", f"{_MON_BN[a.month]} মাসে"
        if a.year == b.year and b.month - a.month == 1:
            return f"in {_MON_FULL_EN[a.month]} and {_MON_FULL_EN[b.month]}", f"{_MON_BN[a.month]} ও {_MON_BN[b.month]} মাসে"
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
                f"কোম্পানি যাঁরা চালান, তাঁরা শেয়ার কিনছেন। {w_bn} {m_bn} আরও শেয়ার কিনেছেন" + (f", যার দাম প্রায় {v_bn}" if v else "") + "।",
            )
        else:
            head = bi(
                f"The people who run it are selling. {w_en} sold shares {m_en}" + (f", worth about {v_en}" if v else "") + ".",
                f"কোম্পানি যাঁরা চালান, তাঁরা শেয়ার বিক্রি করছেন। {w_bn} {m_bn} শেয়ার বিক্রি করেছেন" + (f", যার দাম প্রায় {v_bn}" if v else "") + "।",
            )
    elif trades:
        head = bi("The people who run it both bought and sold shares in the last 12 months.",
                  "গত 12 মাসে কোম্পানি যাঁরা চালান, তাঁরা শেয়ার কিনেছেনও, বিক্রিও করেছেন।")
    elif spon is not None:
        head = bi(f"The people who run it did not buy or sell shares in the last 12 months. They own about {spon:.0f} of every 100 shares.",
                  f"গত 12 মাসে কোম্পানি যাঁরা চালান, তাঁরা শেয়ার কেনেননি বা বিক্রি করেননি। কোম্পানির প্রতি 100টি শেয়ারের মধ্যে প্রায় {spon:.0f}টি তাঁদের হাতে।")
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
            meaning.append(bi(f"Today's price is lower than when they {v_en}.", f"তাঁরা যে দামে {v_bn}, আজকের দাম তার চেয়ে কম।"))
        elif ltp > hi * 1.03:
            meaning.append(bi(f"Today's price is higher than when they {v_en}.", f"তাঁরা যে দামে {v_bn}, আজকের দাম তার চেয়ে বেশি।"))
        else:
            meaning.append(bi(f"They {v_en} at about today's price.", f"তাঁরা প্রায় আজকের দামেই {v_bn}।"))
    for t in trend:
        up = t["to_pct"] > t["from_pct"]
        small = abs(t["to_pct"] - t["from_pct"]) < 2
        g = t["group"]
        f_en, f_bn = _mon(t["from_date"])
        if up:
            meaning.append(bi(f"Since {f_en}, {g['en'][0].lower() + g['en'][1:]} have bought {'a little ' if small else ''}more of the company.",
                              f"{f_bn}-এর পর থেকে {g['bn']} অংশের শেয়ার {'কিছুটা ' if small else ''}বেড়েছে।"))
        else:
            meaning.append(bi(f"Since {f_en}, {g['en'][0].lower() + g['en'][1:]} have sold {'a few' if small else 'some'} of their shares.",
                              f"{f_bn}-এর পর থেকে {g['bn']} অংশের {'কিছু' if small else 'বেশ কিছু'} শেয়ার বিক্রি হয়েছে।"))
    if buys and not sells:
        meaning.append(bi("When the people who run a company buy with their own money, they usually expect it to do well.",
                          "কোম্পানি যাঁরা চালান, তাঁরা নিজের টাকায় শেয়ার কিনলে সাধারণত ধরে নেওয়া যায় যে তাঁরা কোম্পানির ভবিষ্যৎ ভালো দেখছেন।"))
    elif sells and not buys:
        meaning.append(bi("Insiders sell for many reasons, but a sale by the people who run a company is worth checking.",
                          "ভেতরের লোকেরা নানা কারণে শেয়ার বিক্রি করতে পারেন। তবে কোম্পানি যাঁরা চালান, তাঁরা বিক্রি করলে বিষয়টি একবার খতিয়ে দেখা ভালো।"))

    watch = None
    if rule30 and not rule30["ok"]:
        watch = bi("The founders and directors own less than the 30% the rules ask them to keep. That is a warning sign.",
                   "নিয়ম অনুযায়ী উদ্যোক্তা-পরিচালকদের হাতে অন্তত 30% শেয়ার থাকার কথা, কিন্তু আছে তার চেয়ে কম। এটি একটি সতর্কসংকেত।")
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
                  f"গত 12 মাসে কোম্পানি যাঁরা চালান, তাঁরা {nb} বার শেয়ার কিনেছেন, একবারও বিক্রি করেননি।")
    elif nb == 0:
        free = bi(f"In the last 12 months, the people who run it sold shares {times(ns)} and bought none.",
                  f"গত 12 মাসে কোম্পানি যাঁরা চালান, তাঁরা {ns} বার শেয়ার বিক্রি করেছেন, একবারও কেনেননি।")
    else:
        free = bi(f"In the last 12 months, the people who run it bought shares {times(nb)} and sold {times(ns)}.",
                  f"গত 12 মাসে কোম্পানি যাঁরা চালান, তাঁরা {nb} বার কিনেছেন আর {ns} বার বিক্রি করেছেন।")

    inside = []
    if trades:
        inside.append(bi("Who bought or sold, how much, and at what price", "কে কত কিনেছেন বা বিক্রি করেছেন, আর কোন দামে"))
    if window:
        f_en, f_bn = _mon(window[0][0])
        inside.append(bi(f"Which groups of owners bought or sold since {f_en}", f"{f_bn}-এর পর থেকে কোন ধরনের মালিক শেয়ার কিনেছেন বা বিক্রি করেছেন"))
    inside.append(bi("What it means for someone buying today", "আজ যিনি কিনতে চান, তাঁর জন্য এর মানে কী"))

    src_en, src_bn = ["DSE insider notices"], ["ডিএসইর উদ্যোক্তা-পরিচালক লেনদেনের নোটিশ"]
    if as_of:
        e, b = _day(as_of)
        src_en.append(f"monthly shareholding reports to {e}")
        src_bn.append(f"{b} পর্যন্ত মাসিক শেয়ারধারণ প্রতিবেদন")

    return _section(
        "owners",
        bi("Who owns it, and are insiders buying?", "মালিক কারা, আর কোম্পানির ভেতরের লোকেরা কি শেয়ার কিনছেন?"),
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
        from backend.services.scoring_service import lender_equity
        cushion = None
        nav_ps = _f((inp.get("score_row") or {}).get("nav_ps"))
        shares = _f((inp.get("company") or {}).get("total_shares"))
        for r in reversed(ext):
            eq, ta = _f(r.get("total_equity")), _f(r.get("total_assets"))
            if eq and ta and ta > 0:
                # Equity = assets (a 100% cushion) is a scraping error for 23
                # NBFIs — insolvent FASFIN read "a good amount of its own
                # money". DSE's NAV × shares stands in for the latest year;
                # an older row with the error is skipped (audit RP2).
                own = lender_equity(eq, ta, nav_ps if r is ext[-1] else None, shares)
                if own is None:
                    continue
                cushion = own / ta * 100.0
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
                   "প্রতিষ্ঠানটি যে ঋণ দেয়, তার পেছনে যথেষ্ট নিজস্ব মূলধন রাখে।") if cushion >= BANK_CUSHION_SAFE
                else bi("It keeps less of its own money behind its loans than we would like.",
                        "প্রতিষ্ঠানটি ঋণের পেছনে যতটা নিজস্ব মূলধন রাখে, তা আমাদের প্রত্যাশার চেয়ে কম।") if cushion >= BANK_CUSHION_WATCH
                else bi("It keeps very little of its own money behind its loans.",
                        "প্রতিষ্ঠানটি ঋণের পেছনে খুব কম নিজস্ব মূলধন রাখে।"))
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
                plain.append(bi("It has no loans.", "কোম্পানিটির কোনো ঋণ নেই।"))
            else:
                c_en, c_bn = _crore(loan)
                facts.append({"label": bi("Loans", "ঋণ"), "value": bi(c_en, c_bn), "tone": "neutral"})
                if res and res > 0:
                    r_ = loan / res
                    measures["saved_pct"] = round(r_ * 100.0)
                    t = "good" if r_ < 0.5 else "fair" if r_ <= 1 else "bad"
                    facts.append({"label": bi("Loans compared with money kept from past years", "আগের বছরগুলোর জমানো মুনাফার তুলনায় ঋণ"),
                                  "value": bi(f"{r_ * 100:.0f}%", f"{r_ * 100:.0f}%"), "tone": t})
                    detail_bits.append((f"loans {r_ * 100:.0f}% of saved profit", f"ঋণ জমানো মুনাফার {r_ * 100:.0f}%"))
                    plain.append(
                        bi("Its loans are tiny next to the money it has kept from past years.",
                           "আগের বছরগুলোর জমানো মুনাফার তুলনায় কোম্পানিটির ঋণ খুবই কম।") if r_ < 0.1
                        else bi("Its loans are small next to the money it has kept from past years.",
                                "আগের বছরগুলোর জমানো মুনাফার তুলনায় কোম্পানিটির ঋণ কম।") if r_ < 0.5
                        else bi("Its loans are close to all the money it has kept from past years.",
                                "কোম্পানিটির ঋণ আগের বছরগুলোর জমানো প্রায় সব মুনাফার সমান।") if r_ <= 1
                        else bi("Its loans are bigger than all the money it has kept from past years.",
                                "কোম্পানিটির ঋণ আগের বছরগুলোর জমানো সব মুনাফার চেয়েও বেশি।"))
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
                                        "শেয়ারবাজারে পুরো কোম্পানির যে দাম, কোম্পানিটির ঋণ তার চেয়েও বেশি।"))
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
                    else bi("Its profit covers the interest on its loans, but not by much.", "মুনাফা দিয়ে ঋণের সুদ মেটানো যায়, তবে হাতে খুব বেশি বাড়তি থাকে না।") if ic >= 1.5
                    else bi("Its profit barely covers the interest on its loans.", "মুনাফা দিয়ে ঋণের সুদ কোনোমতে মেটানো যায়।") if ic >= 1
                    else bi("Its profit does not cover the interest on its loans.", "মুনাফা দিয়ে ঋণের সুদও মেটানো যায় না।"))
                break
    if rating:
        rk = _rating_rank(rating["long_term"])
        known = rk is not None
        ig = known and rk <= _RATING_ORDER.index(INVESTMENT_GRADE_LAST)
        strong = known and rk <= _RATING_ORDER.index(STRONG_RATING_LAST)
        t = "good" if strong else "neutral" if (ig or not known) else "bad"
        m_en, m_bn = _mon(rating["date"])
        facts.append({"label": bi("Credit rating", "ক্রেডিট রেটিং"),
                      "value": bi(f"{rating['long_term']} ({rating['agency']}, {m_en})", f"{rating['long_term']} ({rating['agency']}, {m_bn})"),
                      "tone": t})
        detail_bits.append((f"rated {rating['long_term']}", f"রেটিং {rating['long_term']}"))
        g = rating["long_term"]
        plain.append(
            bi(f"A rating agency gives it a top grade for paying its debts ({g}).", f"ঋণ শোধের সামর্থ্য বিচার করে একটি রেটিং এজেন্সি কোম্পানিটিকে উঁচু রেটিং দিয়েছে ({g})।") if strong
            else bi(f"A rating agency gives it a fair grade for paying its debts ({g}).", f"ঋণ শোধের সামর্থ্য বিচার করে একটি রেটিং এজেন্সি কোম্পানিটিকে মাঝারি রেটিং দিয়েছে ({g})।") if ig
            else bi(f"A rating agency rates its ability to pay its debts {g}.", f"ঋণ শোধের সামর্থ্য বিচার করে একটি রেটিং এজেন্সি কোম্পানিটিকে {g} রেটিং দিয়েছে।") if not known
            else bi(f"A rating agency gives it a low grade for paying its debts ({g}).", f"ঋণ শোধের সামর্থ্য বিচার করে একটি রেটিং এজেন্সি কোম্পানিটিকে নিচের দিকের রেটিং দিয়েছে ({g})।"))
        if known and not ig:
            bump(3)
        elif known and not strong:
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
                  "বিমা কোম্পানিকে মূলত বিমা দাবি মেটানোর সামর্থ্য দিয়ে বিচার করা হয়। এই কোম্পানির কোনো রেটিং আমাদের কাছে নেই।")
    else:
        head = bi("We don't have enough figures on its loans.", "কোম্পানিটির ঋণ নিয়ে যথেষ্ট তথ্য আমাদের কাছে নেই।")
    meaning = []
    if sc in _LENDERS:
        meaning.append(bi("A bank lends mostly with depositors' money. The more of its own money stands behind those loans, the safer it is when loans go bad.",
                          "ব্যাংক মূলত আমানতকারীদের টাকায় ঋণ দেয়। ঋণের পেছনে নিজস্ব মূলধন যত বেশি থাকে, ঋণ খেলাপি হলে ব্যাংক তত নিরাপদ থাকে।"))
    elif sc == "INSURANCE":
        meaning.append(bi("An insurer's safety rests on its money to pay claims, which the credit rating measures.",
                          "বিমা কোম্পানির নিরাপত্তা নির্ভর করে বিমা দাবি মেটানোর মতো টাকা আছে কি না, তার ওপর। ক্রেডিট রেটিং এটিই মাপে।"))
    elif level >= 2:
        meaning.append(bi("Loans have to be repaid before shareholders see any of the profit, so heavy loans make the share riskier.",
                          "শেয়ারহোল্ডাররা মুনাফার ভাগ পাওয়ার আগে ঋণ শোধ করতে হয়। তাই ঋণ বেশি হলে শেয়ারের ঝুঁকিও বাড়ে।"))
    else:
        meaning.append(bi("Its loans are small next to what it owns and earns, so a bad year would not put it in trouble.",
                          "যা আছে আর যা আয় করে, তার তুলনায় কোম্পানিটির ঋণ কম। তাই একটি খারাপ বছর গেলেও বড় বিপদে পড়ার কথা নয়।"))
    if interest_line:
        meaning.append(interest_line)
    if rating:
        meaning.append(bi(f"The grade comes from {rating['agency']}. Grades from AAA down to BBB mean the company is expected to pay its debts on time.",
                          f"রেটিংটি দিয়েছে {rating['agency']}। AAA থেকে BBB পর্যন্ত রেটিং পাওয়া মানে, কোম্পানিটি সময়মতো ঋণ শোধ করবে বলে আশা করা হয়।"))
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
        inside.append(bi("How big its loans are next to what it has", "কোম্পানির সম্পদের তুলনায় এর ঋণ কত বড়"))
    if any(f["label"]["en"].startswith("Profit compared") for f in facts):
        inside.append(bi("Whether its profit pays the interest easily", "মুনাফা দিয়ে সুদ সহজে মেটে কি না"))
    inside.append(bi("Its credit rating, and what it means" if rating else "What would make it riskier",
                     "এর ক্রেডিট রেটিং, আর তার মানে কী" if rating else "কী হলে ঝুঁকি বাড়বে"))

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
        bi("Is it financially safe?", "কোম্পানিটি কি আর্থিকভাবে নিরাপদ?"),
        word, tone, head, bi(" · ".join(src_en), " · ".join(src_bn)),
        free_line=bi("We check its loans, how easily it can pay them, and its credit rating.",
                     "আমরা দেখি কোম্পানিটির ঋণ কত, তা কত সহজে শোধ করতে পারে, আর এর ক্রেডিট রেটিং কেমন।"),
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
    "p1_biz": ("making profit", "মুনাফা করার সামর্থ্য"),
    "p2_health": ("keeping its finances safe", "আর্থিক নিরাপত্তা"),
    "p3_moat": ("standing out in its business", "ব্যবসায় এগিয়ে থাকা"),
    "p4_val": ("being well priced", "সুবিধাজনক দাম"),
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


def _is(noun: str) -> str:
    """'its finances are' / 'its profit is'."""
    return "are" if noun.endswith("finances") else "is"


def build_quality(inp: dict) -> Optional[dict]:
    row = inp.get("score_row") or {}
    score = _f(row.get("score"))
    if score is None:
        return None
    from backend.services.tiers import tier_key
    tier = tier_key(score)
    # The grade's four business checks: the price is judged on its own; a check
    # with no figures (insurers' business strength) is left out (grade_rules).
    measured = _gr.check_values(row)
    present = [(k, en, bn_, measured[k]) for k, en, bn_ in PILLARS if k in measured]
    healthy = len([p for p in present if p[3] >= STRONG_AT])
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
            above = row.get("higher_count")
            above = int(above) if isinstance(above, (int, float)) and above == above else rank - 1
            if above <= 0:
                head_en, head_bn = ("By our measure, it is among the strongest companies on the DSE.",
                                    "আমাদের হিসাবে এটি ডিএসইর সবচেয়ে শক্তিশালী কোম্পানিগুলোর একটি।")
            else:
                head_en = (f"One of the strongest companies on the DSE: only {above} "
                           f"{'company scores' if above == 1 else 'companies score'} higher in our checks.")
                head_bn = f"এটি ডিএসইর সবচেয়ে শক্তিশালী কোম্পানিগুলোর একটি। আমাদের যাচাইয়ে মাত্র {above}টি কোম্পানি এর চেয়ে এগিয়ে আছে।"
        elif share <= 0.25:
            head_en, head_bn = ("Stronger than most companies on the DSE.", "ডিএসইর বেশির ভাগ কোম্পানির চেয়ে এটি শক্তিশালী।")
        elif share <= 0.5:
            head_en, head_bn = ("Stronger than about half the companies on the DSE.", "ডিএসইর প্রায় অর্ধেক কোম্পানির চেয়ে এটি শক্তিশালী।")
        elif share <= 0.9:
            head_en, head_bn = ("Weaker than most companies on the DSE.", "ডিএসইর বেশির ভাগ কোম্পানির চেয়ে এটি দুর্বল।")
        else:
            head_en, head_bn = ("One of the weakest companies on the DSE.", "এটি ডিএসইর সবচেয়ে দুর্বল কোম্পানিগুলোর একটি।")
    else:
        head_en = f"On our checks, it is {word['en'].lower()}."
        head_bn = f"আমাদের যাচাইয়ে এটি {word['bn']}।"
    if len(present) >= 2:
        best = max(present, key=lambda p: p[3])
        worst = min(present, key=lambda p: p[3])
        b_en, b_bn = _PILLAR_PLAIN[best[0]]
        w_en, w_bn = _PILLAR_NOUN[worst[0]]
        # One "strong" line (STRONG_AT / WEAK_BELOW, the company light's checks
        # line): "needs watching" fired under 6 while the light said strong
        # from 7 — DUTCHBANGL read "its profit needs watching" (audit RP18).
        if best[3] >= STRONG_AT and worst[3] >= STRONG_AT:
            head_en += f" It is best at {b_en}, and even its weakest area, {w_en}, is strong."
            head_bn += f" এর সবচেয়ে বড় শক্তি {b_bn}। সবচেয়ে দুর্বল দিক {w_bn}, তবে সেটিও শক্তিশালী।"
        elif best[3] >= STRONG_AT and worst[3] < WEAK_BELOW:
            head_en += f" It is best at {b_en}, but {w_en} {_is(w_en)} weak."
            head_bn += f" এর সবচেয়ে বড় শক্তি {b_bn}। তবে {w_bn} দুর্বল।"
        elif best[3] >= STRONG_AT:
            head_en += f" It is best at {b_en}; {w_en} {_is(w_en)} its weakest area."
            head_bn += f" এর সবচেয়ে বড় শক্তি {b_bn}। সবচেয়ে কম শক্তিশালী দিক {w_bn}।"
        elif worst[3] >= WEAK_BELOW:
            head_en += f" It is fair on everything we look at; nothing stands out as strong. Its weakest area is {w_en}."
            head_bn += f" আমরা যা যাচাই করি তার সবকিছুতেই এটি মোটামুটি; কোনোটিতেই আলাদা করে শক্তিশালী নয়। সবচেয়ে দুর্বল দিক {w_bn}।"
        else:
            head_en += f" Nothing we look at is strong, and {w_en} {_is(w_en)} weak."
            head_bn += f" আমরা যা যাচাই করি তার কোনোটিতেই এটি শক্তিশালী নয়, আর {w_bn} দুর্বল।"
    meaning = [bi("The grade looks at four things: profit, finances, how strong the business is and its dividend record; the price is judged on its own. "
                  + (f"{healthy} of the {len(present)} are strong." if healthy else "None of them is strong."),
                  f"গ্রেড চারটি বিষয় দেখে: মুনাফা, আর্থিক অবস্থা, ব্যবসা কতটা শক্তিশালী আর ডিভিডেন্ডের ধারা; দাম আলাদাভাবে বিচার করা হয়। "
                  + (f"{len(present)}টির মধ্যে {healthy}টি শক্তিশালী।" if healthy else "কোনোটিই শক্তিশালী নয়।"))]
    # How the group is decided (grade_rules), then what held it back, if anything.
    rule = _gr.GROUP_RULES.get(tier)
    if rule:
        meaning.append(bi(f"“{word['en']}” means: {rule[0][0].lower()}{rule[0][1:]}.",
                          f"“{word['bn']}” মানে: {rule[1]}।"))
    held = _gr.problem_note(measured, _row_problems(row), tier,
                            {k: (TIER_WORDS[k], TIER_WORDS_BN[k]) for k in _gr.ORDER})
    if held:
        meaning.append(bi(held[0], held[1]))
    # Held by settling: a check sits right on its line, so the group waits
    # until it is clearly past it (grade_rules.CHECK_SETTLE).
    settling = _gr.strict_group(measured, _row_problems(row)) != tier
    if settling:
        near = _gr.near_line(measured)
        if near:
            n_en, n_bn = _PILLAR_NOUN[near[0]]
            meaning.append(bi(f"It stays “{word['en']}” for now: {n_en} {_is(n_en)} right on the line, and a grade "
                              "changes only when a check moves clearly past its line.",
                              f"আপাতত এটি “{word['bn']}”-এ আছে: এর {n_bn} ঠিক সীমার ওপর, আর কোনো যাচাই স্পষ্টভাবে "
                              "সীমা পার না হলে গ্রেড বদলায় না।"))
    # Watch: the one check that could move its group soon (within a point of
    # its line) — a fall first, else a rise. Not while settling holds it.
    watch = None
    gw = {} if settling else _gr.group_watch(measured, _row_problems(row))
    mv = gw.get("down") or gw.get("up")
    if mv:
        n_en, n_bn = _PILLAR_NOUN[mv["check"]]
        n_en = n_en[0].upper() + n_en[1:]
        g_en, g_bn = TIER_WORDS.get(mv["group"], ""), TIER_WORDS_BN.get(mv["group"], "")
        v = _is(n_en.lower())
        if mv is gw.get("down") and mv["from"] == "strong":
            watch = bi(f"{n_en} {v} only just strong. A small slip would move the company down to “{g_en}”.",
                       f"এর {n_bn} কোনোমতে শক্তিশালী। একটু দুর্বল হলেই কোম্পানিটি “{g_bn}”-এ নেমে যাবে।")
        elif mv is gw.get("down"):
            watch = bi(f"{n_en} {v} close to weak. A small slip would move the company down to “{g_en}”.",
                       f"এর {n_bn} দুর্বল হওয়ার কাছাকাছি। একটু খারাপ হলেই কোম্পানিটি “{g_bn}”-এ নেমে যাবে।")
        elif mv["to"] == "strong":
            watch = bi(f"{n_en} {v} close to strong. Getting there would move the company up to “{g_en}”.",
                       f"এর {n_bn} শক্তিশালী হওয়ার কাছাকাছি। সেটা হলে কোম্পানিটি “{g_bn}”-এ উঠবে।")
        else:
            watch = bi(f"{n_en} {v} close to no longer being weak. Getting there would move the company up to “{g_en}”.",
                       f"এর {n_bn} দুর্বলতা কাটিয়ে ওঠার কাছাকাছি। সেটা হলে কোম্পানিটি “{g_bn}”-এ উঠবে।")
    hist = inp.get("score_history") or {}
    ch = (hist.get("changes") or [])[:1]
    if ch:
        c = ch[0]
        t_en = TIER_WORDS.get(c.get("to_tier"), "")
        t_bn = TIER_WORDS_BN.get(c.get("to_tier"), "")
        e, b = _day(c.get("date"))
        if t_en and e:
            meaning.append(bi(f"It last moved to “{t_en}” on {e}.", f"{b} তারিখে এটি সর্বশেষ “{t_bn}” গ্রেডে এসেছে।"))

    return _section(
        "quality",
        bi("How strong is the company?", "কোম্পানিটি কতটা শক্তিশালী?"),
        word, tone, bi(head_en, head_bn),
        bi("Our grade, from the audited accounts and the company's notices", "নিরীক্ষিত হিসাব আর কোম্পানির নোটিশ থেকে আমাদের গ্রেড"),
        free_line=bi("We grade four things: profit, finances, how strong the business is and the dividend record. The price is judged on its own.",
                     "আমরা চারটি বিষয়ে গ্রেড দিই: মুনাফা, আর্থিক অবস্থা, ব্যবসা কতটা শক্তিশালী আর ডিভিডেন্ডের ধারা। দাম আলাদাভাবে বিচার করা হয়।"),
        inside=[bi("What we found on each of the four, in plain words", "চারটি বিষয়ের প্রতিটিতে আমরা কী পেয়েছি, সহজ ভাষায়"),
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
            return (("grown well", "বেশ ভালো বেড়েছে") if v >= 5 else ("grown a little", "সামান্য বেড়েছে") if v >= 0
                    else ("shrunk", "কমেছে"))
        se, sb = move(s_c)
        if p_c is None:
            head = bi(f"Over {span} years its sales have {se}.", f"{span} বছরে কোম্পানিটির বিক্রি {sb}।")
        else:
            pe_, pb_ = move(p_c)
            if se == pe_:
                head = bi(f"Over {span} years both its sales and its profit have {se}.",
                          f"{span} বছরে কোম্পানিটির বিক্রি আর মুনাফা দুটোই {sb}।")
            elif (s_c >= 0) == (p_c >= 0):
                head = bi(f"Over {span} years its sales have {se}, and its profit has {pe_}.",
                          f"{span} বছরে কোম্পানিটির বিক্রি {sb}, আর মুনাফা {pb_}।")
            else:
                head = bi(f"Over {span} years its sales have {se}, but its profit has {pe_}.",
                          f"{span} বছরে কোম্পানিটির বিক্রি {sb}, তবে মুনাফা {pb_}।")
    else:
        head = bi(f"Sales in {last['year']}: {la_en}.", f"{last['year']} সালে কোম্পানিটির বিক্রি ছিল {la_bn}।")
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
    # Best / weakest = the years with the most and least profit (2026-11-04,
    # audit RP6). It used to be the biggest year-on-year change, so POWERGRID
    # read "its best year for profit was 2022" for a year profit fell.
    prof = [(r["year"], r["profit_cr"]) for r in rows if r.get("profit_cr") is not None]
    losses_now = 0
    for _, v in reversed(prof):
        if v >= 0:
            break
        losses_now += 1
    if losses_now >= 2:
        meaning.insert(0, bi(f"It has made a loss in each of its last {losses_now} years.",
                             f"শেষ {losses_now} বছরের প্রতিটিতেই কোম্পানিটির লোকসান হয়েছে।"))
    elif losses_now == 1:
        meaning.insert(0, bi(f"It made a loss in {prof[-1][0]}, its latest year.",
                             f"সর্বশেষ বছর, {prof[-1][0]} সালে, কোম্পানিটির লোকসান হয়েছে।"))
    if len(prof) >= 3:
        best = max(prof, key=lambda c: c[1])
        worst = min(prof, key=lambda c: c[1])
        if best[0] != worst[0] and best[1] > 0:
            meaning.append(bi(
                f"Its most profitable year was {best[0]}, and its weakest was {worst[0]}"
                + (", when it made a loss." if worst[1] < 0 else "."),
                f"সবচেয়ে বেশি মুনাফা হয়েছিল {best[0]} সালে, আর সবচেয়ে কম {worst[0]} সালে"
                + ("। সে বছর লোকসান হয়েছিল।" if worst[1] < 0 else "।"),
            ))
    n = len(rows)
    return _section(
        "story",
        bi(f"How has the business changed over {n} years?", f"{n} বছরে ব্যবসা কীভাবে বদলেছে?"),
        word, tone, head,
        bi(f"Audited accounts FY{rows[0]['year']} to FY{rows[-1]['year']}", f"{rows[0]['year']} থেকে {rows[-1]['year']} অর্থবছরের নিরীক্ষিত বার্ষিক হিসাব"),
        free_line=bi("Its sales and profit for every year we have.",
                     "যত বছরের হিসাব আমাদের কাছে আছে, তার প্রতিটি বছরের বিক্রি আর মুনাফা।"),
        inside=[bi(f"What changed over {n} years, in plain words", f"{n} বছরে কী বদলেছে, সহজ ভাষায়"),
                bi("Its most and least profitable year", "কোন বছর মুনাফা সবচেয়ে বেশি আর কোন বছর সবচেয়ে কম"),
                bi("Whether it keeps more of each sale than before", "প্রতিটি বিক্রি থেকে আগের চেয়ে বেশি মুনাফা থাকছে কি না")],
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
        ranks.append({"label": bi("Profit kept from sales", "বিক্রির তুলনায় মুনাফা"), "rank": r, "of": n,
                      "value": bi(f"{margin[code]:.0f}%", f"{margin[code]:.0f}%")})
    if code in roe:
        r, n = rank_by(roe)
        ranks.append({"label": bi("Profit on owners' money", "নিজস্ব মূলধনে মুনাফা"), "rank": r, "of": n,
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
            else ("A mid-sized company in its sector", "নিজের সেক্টরে মাঝারি আকারের কোম্পানি") if r <= math.ceil(n / 2)
            else ("One of the smaller companies in its sector", "নিজের সেক্টরের ছোট কোম্পানিগুলোর একটি")
        )
        mr = next(x for x in ranks if x["label"]["en"] == "Profit kept from sales")
        if mr["rank"] == 1:
            m_en, m_bn = "It keeps more profit from each sale than any of them.", "প্রতিটি বিক্রি থেকে এর মুনাফা অন্য সবার চেয়ে বেশি থাকে।"
        elif mr["rank"] <= math.ceil(mr["of"] / 2):
            m_en, m_bn = "It keeps more profit from each sale than most of them.", "প্রতিটি বিক্রি থেকে এর মুনাফা বেশির ভাগ কোম্পানির চেয়ে বেশি থাকে।"
        else:
            m_en, m_bn = "But it keeps less profit from each sale than most of them.", "তবে প্রতিটি বিক্রি থেকে এর মুনাফা বেশির ভাগ কোম্পানির চেয়ে কম থাকে।"
        head = bi(f"{size_en}. {m_en}", f"এটি {size_bn}। {m_bn}")
        size = bi(size_en, size_bn)
    elif sr:
        head = bi(f"In our checks it comes {_ordinal(sr['rank'])} of the {sr['of']} companies in the {sector} sector.",
                  f"আমাদের যাচাইয়ে {sector_bn} সেক্টরের {sr['of']}টি কোম্পানির মধ্যে এর অবস্থান {sr['rank']} নম্বরে।")
    else:
        head = bi(f"Where it stands among {n_peers} companies in the {sector} sector.", f"{sector_bn} সেক্টরের {n_peers}টি কোম্পানির মধ্যে এর অবস্থান।")
    meaning = []
    # (Its price against the sector is the price chapter's answer, not this one.)
    mr_ = next((x for x in ranks if x["label"]["en"] == "Profit kept from sales"), None)
    if sales_rank and mr_ and sales_rank[0] <= 3 and mr_["rank"] <= math.ceil(mr_["of"] / 2):
        meaning.append(bi("A big company that keeps a good share of each sale as profit is hard for rivals to push aside.",
                          "বড় কোম্পানি যদি প্রতিটি বিক্রি থেকে ভালো মুনাফাও রাখে, প্রতিযোগীরা তাকে সহজে পেছনে ফেলতে পারে না।"))
    elif sales_rank and mr_:
        meaning.append(bi("A smaller company, or one that keeps less of each sale, is easier for rivals to hurt.",
                          "কোম্পানি ছোট হলে, বা প্রতিটি বিক্রি থেকে কম মুনাফা থাকলে, প্রতিযোগীদের চাপে সহজেই ক্ষতির মুখে পড়তে পারে।"))
    if sr:
        meaning.append(
            bi("In our checks it comes top of its sector.", "আমাদের যাচাইয়ে এটি নিজের সেক্টরে সবার ওপরে।") if sr["rank"] == 1
            else bi(f"In our checks it comes {_ordinal(sr['rank'])} of {sr['of']} in its sector.",
                    f"আমাদের যাচাইয়ে নিজের সেক্টরের {sr['of']}টি কোম্পানির মধ্যে এটি {sr['rank']} নম্বরে।"))
    return _section(
        "sector",
        bi("Where does it stand in its sector?", "নিজের সেক্টরে এর অবস্থান কোথায়?"),
        word, tone, head,
        bi(f"{sector} companies on DSE · latest audited accounts · today's prices",
           f"ডিএসইর {sector_bn} সেক্টরের কোম্পানি · সর্বশেষ নিরীক্ষিত হিসাব · আজকের দাম"),
        free_line=bi(f"Where it ranks among the {n_peers} companies in its sector.", f"নিজের সেক্টরের {n_peers}টি কোম্পানির মধ্যে এর অবস্থান।"),
        inside=[bi("What its place in its sector means for you", "সেক্টরে এর অবস্থান আপনার জন্য কী বোঝায়"),
                bi("How we grade the whole company, explained", "পুরো কোম্পানিকে আমরা কীভাবে গ্রেড দিই, তার ব্যাখ্যা")],
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
        g_en = f"{TIER_WORDS.get(t_them, '')}, where {code} is {TIER_WORDS.get(t_me, '').lower()}"
        g_bn = f"এটি {TIER_WORDS_BN.get(t_them, '')}, আর {code} {TIER_WORDS_BN.get(t_me, '')}"
        if t_them == t_me:
            g_en, g_bn = f"In the same group as {code}, but stronger", f"এটিও {code}-এর গ্রেডেই আছে, তবে আরও শক্তিশালী"
        if my_pe and my_pe > 0:
            ch_en, ch_bn = ("much cheaper", "অনেক সস্তা") if pe <= my_pe * 0.7 else ("cheaper", "সস্তা")
            why = bi(f"{g_en}, and {ch_en} for the profit it makes.", f"{g_bn}। মুনাফার তুলনায় এর দামও {ch_bn}।")
        else:
            why = bi(f"{g_en}, and it makes a profit.", f"{g_bn}। কোম্পানিটি মুনাফাও করছে।")
        items.append({"code": c, "name": names.get(c), "score": round(s, 1), "pe": round(pe, 2), "why": why})
    n = len(items)
    sector = inp.get("sector") or ""
    sector_bn = inp.get("sector_bn") or sector
    return _section(
        "alternatives",
        bi("Are there stronger companies for less?", "কম দামে আরও শক্তিশালী কোম্পানি আছে কি?"),
        bi(f"{n} found", f"{n}টি পাওয়া গেছে"), "neutral",
        bi(f"Yes. {n} {'company' if n == 1 else 'companies'} in the {sector} sector {'is' if n == 1 else 'are'} stronger and cheaper for the profit {'it makes' if n == 1 else 'they make'}.",
           f"হ্যাঁ। {sector_bn} সেক্টরে {n}টি কোম্পানি আছে, যেগুলো এর চেয়ে শক্তিশালী, আবার মুনাফার তুলনায় দামেও সস্তা।"),
        bi("Our scores and today's prices", "আমাদের স্কোর আর আজকের দাম"),
        free_line=bi(f"We found {n} stronger {'company' if n == 1 else 'companies'} in this sector that {'is' if n == 1 else 'are'} also cheaper.",
                     f"এই সেক্টরে আমরা {n}টি কোম্পানি পেয়েছি, যেগুলো এর চেয়ে শক্তিশালী এবং দামেও সস্তা।"),
        inside=[bi(f"Which {'company it is' if n == 1 else f'{n} companies they are'}", "কোন কোম্পানি"),
                bi("How each one compares, in one line", "প্রতিটি কোম্পানির তুলনা, এক লাইনে")],
        meaning=[bi("A stronger company at a lower price is worth comparing before you buy this one.",
                    "কম দামে আরও শক্তিশালী কোম্পানি পাওয়া গেলে, এটি কেনার আগে সেগুলোর সঙ্গে একবার তুলনা করে নেওয়া ভালো।")],
        watch=None,
        count=n, items=items,
    )


# ---------------------------------------------------------------- red flags + rally

# Company news that explains a run (results, dividends, price-sensitive news).
RALLY_NEWS_KEYS = ("financials", "dividend", "price sensitive", "rights", "merger", "acquisition", "agreement",
                   "contract", "investment", "expansion", "bonus", "record date", "credit rating", "agm")


def rally_run(series: list[tuple[date, float]], news: list[tuple[Optional[date], str]]) -> Optional[dict]:
    """The rumour-rally pattern on a price series (oldest first) and the
    company's news titles: up RALLY_20D_PCT in 20 trading days or RALLY_60D_PCT
    in 60, with no company news since the run began. Shared by the stock report
    and the market-wide caution list (services/caution_list.py)."""
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
    for d, title in news:
        t = (title or "").lower()
        if d and d >= since and any(k in t for k in RALLY_NEWS_KEYS):
            return None
    return {"days": n, "pct": pct, "since": since}


def _rally(inp: dict) -> Optional[dict]:
    """The rumour-rally pattern: a big run with no news from the company."""
    series = _price_series(inp.get("prices") or [])
    return rally_run(series, [(d, t) for d, t, _ in _news_titles(inp.get("news") or [])])


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
    row = inp.get("score_row") or {}
    pub = None
    rows = _owner_rows(inp.get("holdings") or [])
    if rows:
        pub = _f(rows[-1][1].get("public_pct"))
    return rally_warning(r, score=_f(row.get("score")),
                         category=(inp.get("category") or row.get("market_cat") or ""),
                         public_pct=pub, queries=_queries(inp, QUERY_DAYS))


def rally_warning(r: dict, *, score: Optional[float], category: Optional[str],
                  public_pct: Optional[float], queries: list[dict]) -> dict:
    """The rally warning in words: red when DSE asked about the price
    (`queries`, newest first, each with a `post_date` date), the company grades
    weak / average, it is in Z or few shares are with the public."""
    from backend.services.tiers import tier_key
    tier = tier_key(score)
    cat = (category or "").upper()
    pub = public_pct
    qs = queries
    lines = []
    red = False
    if qs:
        red = True
        e, b = _day(qs[0]["post_date"])
        nothing = qs[0].get("no_undisclosed")
        lines.append(bi(
            f"DSE asked about the unusual price move on {e}" + (", and the company said there was no undisclosed news." if nothing else "."),
            f"{b} তারিখে দামের অস্বাভাবিক ওঠানামা নিয়ে ডিএসই কোম্পানির কাছে জানতে চেয়েছিল" + ("। কোম্পানি জানিয়েছে, প্রকাশ করা হয়নি এমন কোনো তথ্য নেই।" if nothing else "।"),
        ))
    if tier in ("weak", "average"):
        red = True
        lines.append(bi(f"On our checks, the company itself is {TIER_WORDS[tier].lower()}.",
                        f"আমাদের যাচাইয়ে কোম্পানিটির গ্রেড “{TIER_WORDS_BN[tier]}”।"))
    if cat == "Z":
        red = True
        lines.append(bi("It is in category Z, where DSE puts companies that missed a dividend or an AGM.",
                        "শেয়ারটি Z ক্যাটাগরিতে আছে। ডিভিডেন্ড না দিলে বা এজিএম না করলে ডিএসই কোম্পানিকে এই ক্যাটাগরিতে রাখে।"))
    if pub is not None and pub < FREE_FLOAT_LOW_PCT:
        red = True
        lines.append(bi("Few of its shares are with ordinary investors, so a handful of buyers can push the price around.",
                        "সাধারণ বিনিয়োগকারীদের হাতে এর শেয়ার কম। তাই অল্প কয়েকজন ক্রেতাই দাম অনেকটা ওঠানামা করাতে পারেন।"))
    lines.append(bi("A price that rises this fast without news often falls back just as fast. Checking the company's own figures first is the safer choice.",
                    "কোনো খবর ছাড়া এত দ্রুত দাম বাড়লে অনেক সময় তা আবার তত দ্রুতই নেমে যায়। তাই আগে কোম্পানির নিজের হিসাব দেখে নেওয়াই নিরাপদ।"))
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


def _z_risk(inp: dict, row: dict) -> Optional[dict]:
    """z_risk.assess on the report's own inputs (results overdue, losses over
    paid-up capital); the factory and old accounts have their own checks."""
    from backend.services.z_risk import assess

    decided = None
    for a in _annuals(inp.get("notices") or {}):
        fe = _d(a.get("fy_end"))
        if fe and (decided is None or fe > decided):
            decided = fe
    for d in inp.get("ledger") or []:
        if str(d.get("dividend_type") or "").lower().startswith("interim"):
            continue
        pe = _d(d.get("period_end"))
        if pe and (decided is None or pe > decided):
            decided = pe
    try:
        return assess(today=inp["today"], category=inp.get("category") or row.get("market_cat"),
                      last_decided=decided, reserve_mn=_f(inp.get("reserve_mn")),
                      paid_up_mn=_f((inp.get("company") or {}).get("paid_up_capital_mn")))
    except Exception:  # noqa: BLE001 — a refinement, never a blocker
        return None


def audit_line(op: dict) -> tuple[str, str]:
    """The auditor red flag's sentence from a stored opinion: the year and what
    it was about, in plain words (2026-11-05, audit N3: "did not fully
    approve" instead of "qualified"; every serious reason counted; an
    unread PDF says so instead of guessing)."""
    from backend.services.audit_opinion import reason_phrase

    y = op.get("year")
    yr_en = f"its {y} accounts" if y else "its accounts"
    yr_bn = f"{y} সালের হিসাব" if y else "হিসাব"

    def more(keys: list[str]) -> tuple[str, str]:
        n = len([k for k in keys if k]) - 2
        return (f", and {n} more matter{'s' if n > 1 else ''}", f", আরও {n}টি বিষয়") if n > 0 else ("", "")

    if op.get("going_concern"):
        return (f"The auditor doubts the business can keep running, in {yr_en}.",
                f"{yr_bn}ে নিরীক্ষক সন্দেহ প্রকাশ করেছেন যে ব্যবসা চালিয়ে যেতে পারবে কি না।")
    keys = op.get("reasons") or []
    if op.get("severity") == "serious" and keys:
        m_en, m_bn = more(keys)
        return (f"The auditor did not fully approve {yr_en}, because of {reason_phrase(keys, 'en')}{m_en}.",
                f"নিরীক্ষক {yr_bn} পুরোপুরি অনুমোদন করেননি। কারণ: {reason_phrase(keys, 'bn')}{m_bn}।")
    minor = op.get("minor") or []
    if op.get("severity") == "minor" and minor:
        m_en, m_bn = more(minor)
        return (f"The auditor did not fully approve {yr_en}, over smaller matters: {reason_phrase(minor, 'en')}{m_en}.",
                f"নিরীক্ষক ছোট কিছু বিষয়ে {yr_bn} পুরোপুরি অনুমোদন করেননি: {reason_phrase(minor, 'bn')}{m_bn}।")
    return (f"The auditor did not fully approve {yr_en}. We could not read the reason in the auditor's report, "
            "so it is worth reading yourself.",
            f"নিরীক্ষক {yr_bn} পুরোপুরি অনুমোদন করেননি। নিরীক্ষকের প্রতিবেদনে কারণটি আমরা পড়তে পারিনি, "
            "তাই নিজে একবার পড়ে দেখা ভালো।")


def build_red_flags(inp: dict, *, cash: Optional[dict] = None, dividend: Optional[dict] = None,
                    owners: Optional[dict] = None, safety: Optional[dict] = None,
                    warning: Optional[dict] = None, core: Optional[dict] = None) -> dict:
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
                f"{b} তারিখে ডিএসই কারখানা পরিদর্শন করে দেখেছে, সেটি বন্ধ বা সেখানে কোনো উৎপাদন হচ্ছে না।",
                ev(closed.get("title") or "Inspection of factory premises", closed.get("post_date")))
        elif insp and (insp[0].get("status") == "running"):
            m_en, m_bn = _mon(insp[0].get("visit_date") or insp[0].get("post_date"))
            add("factory", "Factory", "কারখানা", "pass", f"DSE found the factory working ({m_en}).",
                f"{m_bn}-এ ডিএসই কারখানা চালু পেয়েছে।", ev(insp[0].get("title"), insp[0].get("post_date")))
        else:
            add("factory", "Factory", "কারখানা", "pass", "No sign that the factory is closed.",
                "কারখানা বন্ধের কোনো খবর নেই।")

    # 2 · audit opinion — what the PDF says it was about (audit_opinion.py,
    # 2026-11-05): a minor reason is amber, a serious one or going concern red,
    # with the accounts' year named (it read "on the latest accounts" for a
    # year, even after newer accounts were out).
    op = inp.get("audit_opinion") or None
    if op and ("going_concern" in gov or "qualified_opinion" in gov or op.get("going_concern")
               or op.get("severity") in ("serious", "minor")):
        level = "red" if (op.get("going_concern") or op.get("severity") != "minor") else "amber"
        e_ = ev(op.get("title") or "Auditor's opinion", op.get("posted"))
        if e_ and op.get("url"):
            e_["url"] = op["url"]   # the auditor's report itself (audit N3)
        add("audit", "The auditor's view", "নিরীক্ষকের মত", level, *audit_line(op), e_)
    elif "going_concern" in gov or "qualified_opinion" in gov:
        g = gov.get("going_concern") or gov.get("qualified_opinion")
        add("audit", "The auditor's view", "নিরীক্ষকের মত", "red", g.get("en", ""), g.get("bn", ""))
    else:
        emph = next(((d, t) for d, t, _ in news if "emphasis of matter" in t.lower()), None)
        if emph:
            e, b = _day(emph[0])
            add("audit", "The auditor's view", "নিরীক্ষকের মত", "amber",
                f"On {e} the auditor pointed to something in the accounts that is worth reading.",
                f"{b} তারিখে নিরীক্ষক হিসাবের একটি বিষয়ের দিকে আলাদা করে নজর দিতে বলেছেন। বিষয়টি পড়ে দেখা ভালো।", ev(emph[1], emph[0]))
        else:
            add("audit", "The auditor's view", "নিরীক্ষকের মত", "pass", "The auditor raised no warnings in the last year.",
                "গত এক বছরে নিরীক্ষক কোনো সতর্কতা দেননি।")

    # 3 · category
    cat = (inp.get("category") or row.get("market_cat") or "").strip().upper()
    if cat == "Z":
        add("category", "DSE category", "ডিএসই ক্যাটাগরি", "red", "DSE put it in category Z because it missed a dividend or its yearly meeting.",
            "ডিভিডেন্ড না দেওয়ায় বা এজিএম না করায় ডিএসই শেয়ারটিকে Z ক্যাটাগরিতে রেখেছে।")
    elif cat == "B":
        add("category", "DSE category", "ডিএসই ক্যাটাগরি", "amber", "DSE puts it in category B because its last dividend was small.",
            "সর্বশেষ ডিভিডেন্ড কম হওয়ায় ডিএসই একে B ক্যাটাগরিতে রেখেছে।")
    elif cat:
        add("category", "DSE category", "ডিএসই ক্যাটাগরি", "pass", "DSE puts it in category A, the best group." if cat == "A" else f"DSE puts it in category {cat}.",
            "শেয়ারটি A ক্যাটাগরিতে, যা ডিএসইর সবচেয়ে ভালো ক্যাটাগরি।" if cat == "A" else f"ডিএসই একে {cat} ক্যাটাগরিতে রেখেছে।")

    # 4 · DSE price query (red during a rally)
    if notices_ok:
        qs = _queries(inp, NOTICE_DAYS)
        if qs:
            e, b = _day(qs[0]["post_date"])
            during_rally = warning is not None and (today - qs[0]["post_date"]).days <= QUERY_DAYS
            add("dse_query", "DSE questions about the price", "দাম নিয়ে ডিএসইর প্রশ্ন", "red" if during_rally else "amber",
                f"On {e} DSE asked the company why its price moved so much" + (", while the price was racing up." if during_rally else "."),
                f"{b} তারিখে ডিএসই কোম্পানির কাছে জানতে চেয়েছে, দাম এত ওঠানামা করছে কেন" + ("। সে সময় দাম দ্রুত বাড়ছিল।" if during_rally else "।"),
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
                f"উদ্যোক্তা-পরিচালকদের হাতে {rule['pct']:.0f}% শেয়ার আছে, যা নিয়ম অনুযায়ী দরকারি 30%-এর বেশি।")
        else:
            add("owners_30", "Founders' share (30% rule)", "উদ্যোক্তা-পরিচালকদের অংশ (30% নিয়ম)", "red",
                f"The founders and directors own only {rule['pct']:.0f}%, less than the 30% the rules ask for.",
                f"উদ্যোক্তা-পরিচালকদের হাতে মাত্র {rule['pct']:.0f}% শেয়ার আছে, যা নিয়ম অনুযায়ী দরকারি 30%-এর কম।")

    # 6 · loans (not for lenders / insurers)
    if sc not in _FINANCIALS:
        lvl = row.get("debt_level")
        loan = _f(inp.get("loan_mn"))
        res = _f(inp.get("reserve_mn"))
        if lvl == "over_mcap":
            add("loans", "Loans", "ঋণ", "red", "Its loans are bigger than the whole company is worth on the market.",
                "কোম্পানির ঋণ বাজারে পুরো কোম্পানির দামের চেয়েও বেশি।")
        elif lvl == "over_reserve":
            add("loans", "Loans", "ঋণ", "amber", "Its loans are bigger than all the money it has kept from past years.",
                "আগের বছরগুলোতে জমানো সব টাকার চেয়েও কোম্পানির ঋণ বেশি।")
        elif loan is not None:
            if loan <= 0:
                add("loans", "Loans", "ঋণ", "pass", "It has no loans.", "কোম্পানির কোনো ঋণ নেই।")
            elif res and res > 0:
                add("loans", "Loans", "ঋণ", "pass",
                    "Its loans are small next to the money it has kept from past years." if loan / res < 0.5
                    else "Its loans are less than the money it has kept from past years.",
                    "আগের বছরগুলোতে জমানো টাকার তুলনায় কোম্পানির ঋণ অনেক কম।" if loan / res < 0.5
                    else "আগের বছরগুলোতে জমানো টাকার চেয়ে কোম্পানির ঋণ কম।")
            elif res is not None and res <= 0:
                # Loans while losses have used up everything it saved (audit
                # RP7: BDSERVICE owed ৳908 crore on a −৳2,734 crore reserve and
                # read "ok" — the loans check needed a positive reserve).
                l_en, l_bn = _crore(loan)
                add("loans", "Loans", "ঋণ", "red",
                    f"Its losses have used up all the profit it had saved, and it still owes {l_en}.",
                    f"লোকসানে জমানো সব মুনাফা শেষ হয়ে গেছে, তবু কোম্পানির ঋণ {l_bn}।")

    # 6b · making a loss, results overdue, losses bigger than the shareholders'
    # money (audit RP7: HEIDELBCEM, a loss-maker, read "Nothing wrong. All 15
    # things we check look fine"). The last two are z_risk's own rules.
    eps_now = _f(row.get("eps"))
    if eps_now is not None and eps_now <= 0:
        add("loss", "Making a profit", "মুনাফা", "amber", "It made a loss in its latest results.",
            "সর্বশেষ ফলে কোম্পানির লোকসান হয়েছে।")
    elif eps_now is not None:
        add("loss", "Making a profit", "মুনাফা", "pass", "It made a profit in its latest results.",
            "সর্বশেষ ফলে কোম্পানি মুনাফা করেছে।")
    zr = _z_risk(inp, row)
    for r in (zr or {}).get("reasons") or []:
        if r["key"] == "late_year":
            add("late", "Results on time", "সময়মতো ফল", r["level"], r["en"], r["bn"])
        elif r["key"] == "losses":
            add("losses", "Losses against capital", "মূলধনের তুলনায় লোকসান", "red", r["en"], r["bn"])

    # 7 · stale accounts
    age = _f(row.get("data_age_years"))
    last_year = row.get("last_reported_year") or row.get("fy_eps_year")
    fin_years = [r["_year"] for r in _sorted_fin(inp.get("financials") or [])]
    newest = max(fin_years) if fin_years else None
    if (age is not None and age >= STALE_YEARS) or row.get("stale_data") is True:
        y = last_year or newest
        add("stale", "Up-to-date accounts", "হালনাগাদ হিসাব", "red",
            f"Its latest yearly accounts are from {y}, more than two years old." if y else "Its yearly accounts are more than two years old.",
            f"কোম্পানির সর্বশেষ বার্ষিক হিসাব {y} সালের, যা দুই বছরেরও বেশি পুরোনো।" if y else "কোম্পানির বার্ষিক হিসাব দুই বছরেরও বেশি পুরোনো।")
    elif newest:
        add("stale", "Up-to-date accounts", "হালনাগাদ হিসাব", "pass", "Its yearly accounts are up to date.",
            "কোম্পানির বার্ষিক হিসাব হালনাগাদ আছে।")

    # 8 · meetings
    if "agm_postponed" in gov or "board_postponed" in gov:
        g = gov.get("agm_postponed") or gov.get("board_postponed")
        add("meetings", "Meetings on time", "সময়মতো সভা", "amber", g.get("en", ""), g.get("bn", ""))
    else:
        add("meetings", "Meetings on time", "সময়মতো সভা", "pass", "It held its board meetings and its yearly meeting on time.",
            "পর্ষদ সভা ও এজিএম সময়মতো হয়েছে।")

    # 9 · regulator
    if "bsec_action" in gov or "penalty" in gov:
        g = gov.get("bsec_action") or gov.get("penalty")
        add("regulator", "Regulator", "নিয়ন্ত্রক সংস্থা", "amber", g.get("en", ""), g.get("bn", ""))
    else:
        add("regulator", "Regulator", "নিয়ন্ত্রক সংস্থা", "pass", "The market regulator (BSEC) took no action against it in the last year.",
            "গত এক বছরে বাজার নিয়ন্ত্রক সংস্থা বিএসইসি কোম্পানির বিরুদ্ধে কোনো ব্যবস্থা নেয়নি।")

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
                "কোম্পানি যাঁরা চালান, তাঁদের কেউ শেয়ার বিক্রি করছেন না।")

    # 11 · cash backs the profit (not for lenders / insurers)
    if sc not in _FINANCIALS and cash:
        last = cash["years"][-1]
        gap = (cash.get("_gap_rise") or 0) >= CASH_GAP_PROFIT_RISE_PCT
        if last["ratio"] < 0:
            add("cash", "Profit backed by cash", "নগদে আসা মুনাফা", "amber",
                "More cash went out of the business than came in, even though it showed a profit.",
                "হিসাবে মুনাফা দেখালেও ব্যবসায় যত নগদ টাকা এসেছে, বেরিয়ে গেছে তার চেয়ে বেশি।")
        elif last["ratio"] < CASH_WEAK_RATIO:
            add("cash", "Profit backed by cash", "নগদে আসা মুনাফা", "amber",
                "Less than half of this year's profit came in as real cash.",
                "এ বছরের মুনাফার অর্ধেকেরও কম নগদে হাতে এসেছে।")
        elif gap:
            add("cash", "Profit backed by cash", "নগদে আসা মুনাফা", "amber",
                "Profit went up, but less cash came in than the year before.",
                "মুনাফা বেড়েছে, কিন্তু নগদ টাকা এসেছে আগের বছরের চেয়ে কম।")
        else:
            add("cash", "Profit backed by cash", "নগদে আসা মুনাফা", "pass",
                "Most of its profit comes in as real cash.",
                "মুনাফার বেশির ভাগই নগদে হাতে আসে।")

    # 11b · the profit comes from its business (audit N2; not for lenders / insurers)
    if core:
        y_en, y_bn = core["year"], core["year"]
        if core["share"] < CORE_MOSTLY_PCT:
            add("core", "Profit from its business", "ব্যবসা থেকে মুনাফা", "amber",
                f"In its {y_en} accounts, most of its profit came from outside its business, such as interest on deposits.",
                f"{y_bn} সালের হিসাবে মুনাফার বেশির ভাগ এসেছে ব্যবসার বাইরে থেকে, যেমন ব্যাংকে রাখা টাকার সুদ।")
        else:
            add("core", "Profit from its business", "ব্যবসা থেকে মুনাফা", "pass",
                "Most of its profit comes from its own business.",
                "মুনাফার বেশির ভাগ আসে কোম্পানির নিজের ব্যবসা থেকে।")

    # 12 · dividend paid from profit
    eps_now = _f((inp.get("score_row") or {}).get("eps"))
    paying = bool(dividend and ((dividend.get("history") or [{}])[-1].get("cash_ps") or 0) > 0)
    if paying and eps_now is not None and eps_now <= 0:
        # Payout is blank on a loss (a % of a loss is no number), so a dividend
        # paid out of a loss was never flagged (audit RP5).
        add("payout", "Dividend paid from profit", "মুনাফা থেকে ডিভিডেন্ড", "amber",
            "It made a loss in its latest results, so its dividend comes out of past savings.",
            "সর্বশেষ ফলে লোকসান হয়েছে, তাই ডিভিডেন্ড আসছে আগের জমানো টাকা থেকে।")
    elif dividend and dividend.get("payout_pct") is not None:
        p = dividend["payout_pct"]
        if p > 100:
            add("payout", "Dividend paid from profit", "মুনাফা থেকে ডিভিডেন্ড", "amber",
                "It paid more in dividends than it earned.",
                "কোম্পানি যত মুনাফা করেছে, তার চেয়ে বেশি ডিভিডেন্ড দিয়েছে।")
        else:
            add("payout", "Dividend paid from profit", "মুনাফা থেকে ডিভিডেন্ড", "pass", "It pays its dividend out of its profit.",
                "কোম্পানি নিজের মুনাফা থেকেই ডিভিডেন্ড দেয়।")

    # 13 · trading
    t_mn = _turnover_mn(inp)
    if t_mn is not None:
        c_en, c_bn = _crore(t_mn)
        if t_mn < THIN_TURNOVER_MN:
            add("trading", "Easy to sell", "সহজে কেনাবেচা", "amber", f"Few of its shares trade each day (about {c_en}), so selling can take time.",
                f"এই শেয়ারে প্রতিদিন লেনদেন কম হয়, গড়ে প্রায় {c_bn}। তাই বিক্রি করতে সময় লাগতে পারে।")
        else:
            add("trading", "Easy to sell", "সহজে কেনাবেচা", "pass", f"It is easy to buy and sell: about {c_en} of its shares trade each day.",
                f"প্রতিদিন গড়ে প্রায় {c_bn} লেনদেন হয়, তাই সহজেই কেনাবেচা করা যায়।")

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
                f"ঋণ শোধের সামর্থ্য বিচার করে একটি রেটিং এজেন্সি কোম্পানিকে নিচের দিকের রেটিং দিয়েছে: {r0['long_term']}।",
                ev(f"Credit Rating Result", r0["date"]))
        elif rk is not None and prev_rk is not None and rk > prev_rk:
            add("rating", "Credit grade", "ক্রেডিট রেটিং", "amber",
                f"Its grade for paying its debts was lowered in {m_en}, from {rs[1]['long_term']} to {r0['long_term']}.",
                f"{m_bn}-এ কোম্পানির ক্রেডিট রেটিং {rs[1]['long_term']} থেকে নেমে {r0['long_term']} হয়েছে।",
                ev("Credit Rating Result", r0["date"]))
        else:
            add("rating", "Credit grade", "ক্রেডিট রেটিং", "pass",
                f"A rating agency gives it a sound grade for paying its debts ({r0['long_term']}).",
                f"ঋণ শোধের সামর্থ্য বিচার করে একটি রেটিং এজেন্সি কোম্পানিকে ভালো রেটিং দিয়েছে: {r0['long_term']}।", ev("Credit Rating Result", r0["date"]))

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
            for key, en, bn_ in (("foreign_pct", "Foreign investors", "বিদেশি বিনিয়োগকারীদের"),
                                 ("institute_pct", "Institutions", "প্রতিষ্ঠানগুলোর")):
                peak = max((_f(h.get(key)) or 0, d) for d, h in rows if (d1 - d).days <= OWNER_EXIT_DAYS)
                now = _f(h1.get(key))
                if now is not None and peak[0] - now > OWNER_EXIT_PP:
                    f_en, f_bn = _mon(peak[1])
                    exit_line = (f"{en} have sold part of their shares since {f_en}.",
                                 f"{f_bn}-এর পর থেকে {bn_} হাতে থাকা শেয়ার কমে গেছে।")
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
    smaller_bn = f"দেখে নেওয়ার মতো {amber}টি ছোট বিষয়"
    if red:
        lead_en = "Yes, one serious problem: " if red == 1 else f"Yes, {red} serious problems. The biggest: "
        lead_bn = "হ্যাঁ, একটি গুরুতর সমস্যা: " if red == 1 else f"হ্যাঁ, {red}টি গুরুতর সমস্যা। সবচেয়ে বড়টি: "
        d0 = reds[0]["detail"]
        head = bi(lead_en + _lc(d0["en"]), lead_bn + d0["bn"])
        free = bi(f"We checked {n} things that can go wrong. {red} {'is' if red == 1 else 'are'} serious, shown below"
                  + (f", and {smaller_en}." if amber else "."),
                  f"সমস্যা হতে পারে এমন {n}টি বিষয় আমরা যাচাই করেছি। এর মধ্যে {red}টি গুরুতর, নিচে দেখানো হলো" + (f"। এ ছাড়া {smaller_bn} আছে।" if amber else "।"))
    elif amber:
        head = bi(f"Nothing seriously wrong. We found {smaller_en}.", f"গুরুতর কোনো সমস্যা নেই। তবে {smaller_bn} পেয়েছি।")
        free = bi(f"We checked {n} things that can go wrong. Nothing serious, and {smaller_en}.",
                  f"সমস্যা হতে পারে এমন {n}টি বিষয় আমরা যাচাই করেছি। গুরুতর কিছু পাইনি, তবে {smaller_bn} আছে।")
    else:
        head = bi(f"Nothing wrong. All {n} things we check look fine.", f"কোনো সমস্যা নেই। আমরা যে {n}টি বিষয় দেখি, সবই ঠিক আছে।")
        free = bi(f"We checked {n} things that can go wrong. All look fine.",
                  f"সমস্যা হতে পারে এমন {n}টি বিষয় আমরা যাচাই করেছি। সবই ঠিক আছে।")

    inside = []
    if amber:
        inside.append(bi(f"The {amber} smaller {'thing' if amber == 1 else 'things'} worth a look, and the notice behind each",
                         f"দেখে নেওয়ার মতো {amber}টি ছোট বিষয়, আর প্রতিটির পেছনের নোটিশ"))
    inside.append(bi(f"What we found on the {passed} things that look fine", f"যে {passed}টি বিষয় ঠিক আছে, সেগুলোতে আমরা কী দেখেছি"))
    inside.append(bi("What would turn a smaller worry into a serious one", "কী হলে একটি ছোট বিষয় গুরুতর সমস্যা হয়ে উঠবে"))

    return _section(
        "red_flags",
        bi("Is anything seriously wrong?", "গুরুতর কোনো সমস্যা আছে কি?"),
        word, tone, head,
        bi("DSE notices from the last 12 months · audited accounts · monthly ownership reports",
           "গত 12 মাসের ডিএসই নোটিশ · নিরীক্ষিত হিসাব · মাসিক শেয়ার ধারণের প্রতিবেদন"),
        free_line=free, inside=inside,
        meaning=[bi("A serious problem can hurt the share price for a long time. The smaller things are worth checking before you buy.",
                    "গুরুতর সমস্যা অনেক দিন শেয়ারের দামের ক্ষতি করতে পারে। ছোট বিষয়গুলো কেনার আগে একবার দেখে নেওয়া ভালো।")],
        watch=bi("If a new red flag appears, we show it here, and Premium readers who follow the share get a notification.",
                 "নতুন কোনো বড় সতর্কতা দেখা দিলে আমরা এখানে দেখাব। শেয়ারটি যেসব প্রিমিয়াম পাঠক অনুসরণ করেন, তাঁরা নোটিফিকেশনও পাবেন।"),
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
                                   "প্রবৃদ্ধি ধরে রাখতে হলে মুনাফা আগের বছরের একই মাসগুলোর চেয়ে বেশি হতে হবে।") if nxt.get("beat") else None})
    lat = (dividend or {}).get("_latest_full") or {}
    cps = lat.get("cash_ps")
    if lat.get("record_date") and _d(lat["record_date"]) and _d(lat["record_date"]) >= today:
        net = round(cps * (1 - DIV_TAX_PCT / 100.0), 2) if cps else None
        if lat.get("buy_by") and _d(lat["buy_by"]) >= today:
            items.append({"date": lat["buy_by"], "approx": False, "kind": "record",
                          "label": bi("Last day to buy for the dividend", "ডিভিডেন্ড পেতে কেনার শেষ দিন"),
                          "expect": bi(f"Buy by this day to get {tk2(cps)} a share." if cps else "Buy by this day to get the dividend.",
                                       f"শেয়ারপ্রতি {tk2(cps)} ডিভিডেন্ড পেতে হলে এই দিনের মধ্যে কিনতে হবে।" if cps else "ডিভিডেন্ড পেতে হলে এই দিনের মধ্যে কিনতে হবে।")})
        if lat.get("_spot") and _d(lat["_spot"]) >= today:
            items.append({"date": lat["_spot"], "approx": False, "kind": "spot",
                          "label": bi("Shares settle the same day", "একই দিনে নিষ্পত্তি শুরু"),
                          "expect": bi("From this day until the record date, trades settle the same day (DSE's spot market). Buying now is too late for the dividend in a normal trade.",
                                       "এই দিন থেকে রেকর্ড ডেট পর্যন্ত লেনদেন হয় ডিএসইর স্পট মার্কেটে, যেখানে শেয়ার একই দিনে হাতে আসে। এখন সাধারণ লেনদেনে কিনলে এই ডিভিডেন্ড আর পাওয়া যাবে না।")})
        items.append({"date": lat["record_date"], "approx": False, "kind": "record",
                      "label": bi("Record date", "রেকর্ড ডেট"),
                      "expect": bi(f"Everyone who owns the shares on this day gets {tk2(cps)} a share, {tk2(net)} after tax." if cps else "Everyone who owns the shares on this day gets the dividend.",
                                   f"এই দিনে যাঁদের কাছে শেয়ার থাকবে, তাঁরা শেয়ারপ্রতি {tk2(cps)} পাবেন; কর কাটার পর হাতে আসবে {tk2(net)}।" if cps else "এই দিনে যাঁদের কাছে শেয়ার থাকবে, তাঁরা ডিভিডেন্ড পাবেন।")})
    if lat.get("agm_date") and _d(lat["agm_date"]) and _d(lat["agm_date"]) >= today:
        items.append({"date": lat["agm_date"], "approx": False, "kind": "agm", "label": bi("Yearly meeting (AGM)", "বার্ষিক সভা (এজিএম)"),
                      "expect": bi(f"Shareholders meet and approve the {tk2(cps)} dividend." if cps else "Shareholders meet and approve the accounts.",
                                   f"এই সভায় শেয়ারহোল্ডাররা শেয়ারপ্রতি {tk2(cps)} ডিভিডেন্ড অনুমোদন করবেন।" if cps else "এই সভায় শেয়ারহোল্ডাররা বার্ষিক হিসাব অনুমোদন করবেন।")})
    rating = (safety or {}).get("rating")
    if rating and _d(rating["date"]):
        nd = _d(rating["date"]) + timedelta(days=365)
        if nd >= today:
            items.append({"date": nd.isoformat(), "approx": True, "kind": "rating", "label": bi("New credit grade due", "নতুন ক্রেডিট রেটিং আসার কথা"),
                          "expect": bi(f"Last time {rating['agency']} gave it {rating['long_term']}.",
                                       f"গতবার {rating['agency']} একে {rating['long_term']} রেটিং দিয়েছিল।")})
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
                f"{d_bn}{' নাগাদ' if it['approx'] else ''} {it['label']['bn']}")
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
        free_line=bi(f"The next {n} {'date' if n == 1 else 'dates'} that matter for this share.", f"এই শেয়ারের সামনের {n}টি গুরুত্বপূর্ণ তারিখ।"),
        inside=[bi("What each date means for you", "প্রতিটি তারিখে আপনার জন্য কী আছে"),
                bi("What the next results need to show", "পরের ফলে কী দেখা দরকার")
                if any(i["kind"] == "results" for i in items) else
                bi("What each date means for your shares", "প্রতিটি তারিখে আপনার শেয়ারের কী হবে")],
        meaning=[], watch=None,
        items=items,
    )


_TRIGGERS = {
    "cash": ("If less than half of its profit comes in as cash again next year, this becomes a serious problem.",
             "আগামী বছরও মুনাফার অর্ধেকের কম নগদে এলে বিষয়টি গুরুতর হয়ে উঠবে।"),
    "payout": ("If the next dividend is again more than the profit, it is being paid from savings.",
               "পরের ডিভিডেন্ডও মুনাফার চেয়ে বেশি হলে বুঝতে হবে, তা আগের জমানো টাকা থেকে দেওয়া হচ্ছে।"),
    "loans": ("If loans keep rising faster than profit, the risk grows.",
              "মুনাফার চেয়ে দ্রুত ঋণ বাড়তে থাকলে ঝুঁকি বাড়বে।"),
    "investors": ("If they keep selling for another two reports, it is worth finding out why.",
                  "পরের দুটি প্রতিবেদনেও তাঁরা বিক্রি চালিয়ে গেলে কারণ জেনে নেওয়া ভালো।"),
    "category": ("A return to category A after the next dividend would ease this.",
                 "পরের ডিভিডেন্ডের পর A ক্যাটাগরিতে ফিরলে এই দুশ্চিন্তা কমবে।"),
    "trading": ("If more of its shares start trading each day, selling gets easier.",
                "প্রতিদিন আরও বেশি শেয়ার লেনদেন হলে বিক্রি সহজ হবে।"),
    "rating": ("A better grade at the next rating would ease this.",
               "পরের রেটিংয়ে ভালো গ্রেড পেলে এই দুশ্চিন্তা কমবে।"),
    "owner_selling": ("If more sale declarations follow, it is worth finding out why.",
                      "আরও বিক্রির ঘোষণা এলে কারণ জেনে নেওয়া ভালো।"),
    "rally": ("If the price falls back as fast as it rose, the rise was not about the business.",
              "দাম যত দ্রুত বেড়েছে, তত দ্রুত নেমে গেলে বোঝা যাবে, এই বৃদ্ধি ব্যবসার কারণে হয়নি।"),
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
        bi("What could go wrong?", "কী কী ঝুঁকি আছে?"),
        bi(f"{n} {'risk' if n == 1 else 'risks'}", f"{n}টি ঝুঁকি"), "fair" if n else "neutral",
        items[0]["text"],
        bi("Our checks on its accounts, notices and price", "কোম্পানির হিসাব, নোটিশ ও দাম নিয়ে আমাদের যাচাই"),
        free_line=bi(f"We found {n} {'thing' if n == 1 else 'things'} that could hurt this share, and what would change our view.",
                     f"এই শেয়ারের জন্য ক্ষতিকর হতে পারে এমন {n}টি বিষয় পেয়েছি। কী হলে আমাদের মত বদলাবে, তা-ও বলেছি।"),
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
                       f"মুনাফার {pe['now']:.0f} বছরের দাম" + (f", সাধারণত {pe['usual']:.0f} বছরের" if pe["usual"] else ""))
    elif pr and pr.get("fair"):
        pr_detail = bi(f"{'Below' if pr['gap_pct'] < 0 else 'Above'} what we think it is worth",
                       f"আমাদের হিসাবের ন্যায্য দামের চেয়ে {'কম' if pr['gap_pct'] < 0 else 'বেশি'}")
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
            ow_detail = bi(f"Sponsors hold {ow['rule30']['pct']:.0f}%", f"উদ্যোক্তা-পরিচালকদের হাতে {ow['rule30']['pct']:.0f}%")
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
        ql_detail = bi(f"{ql['healthy']} of the {ql['checks']} things we look at are strong",
                       f"আমরা যে {ql['checks']}টি বিষয় দেখি, তার {ql['healthy']}টি শক্তিশালী")

    cash_na = None
    if sc in _LENDERS:
        cash_na = bi("Not used for banks", "ব্যাংকের জন্য প্রযোজ্য নয়")
    elif sc == "INSURANCE":
        cash_na = bi("Not used for insurers", "বিমা কোম্পানির জন্য প্রযোজ্য নয়")
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
                          f"এখন নজরে রাখার মতো গুরুতর কিছু নেই। পরের যাচাই {d_bn} নাগাদ ফল প্রকাশের সময়।"))
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
                      "কোম্পানি যাঁরা চালান, তাঁদের মধ্যে কে কোন দামে কিনেছেন বা বিক্রি করেছেন"))
    pr = sections.get("price")
    if pr and pr.get("fair"):
        out.append(bi("What we think a fair price is, and the price we would buy under", "আমাদের হিসাবে ন্যায্য দাম কত, আর কোন দামের নিচে কেনা ভালো"))
    elif pr:
        out.append(bi("How its price compares with its past and with similar companies", "আগের বছরগুলো আর একই ধরনের কোম্পানির তুলনায় এর দাম কেমন"))
    dv = sections.get("dividend")
    cps = ((dv or {}).get("latest") or {}).get("cash_ps") or (dv or {}).get("_cur")
    if dv and cps:
        out.append(bi("Whether the dividend is safe, and what it pays you after tax", "ডিভিডেন্ড নিরাপদ কি না, আর কর কাটার পর আপনার হাতে কত আসবে"))
    ty = sections.get("this_year")
    if ty and any(q["cur"] is not None for q in ty.get("quarters") or []):
        out.append(bi("How each part of this year compares with last year, and what the next results need to show",
                      "এ বছরের প্রতিটি প্রান্তিক আগের বছরের তুলনায় কেমন গেছে, আর পরের ফলে কী দেখা দরকার"))
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
        cands.append((_d(ch[0]["date"]), 0, bi(f"after it moved to “{TIER_WORDS[t]}”", f"গ্রেড “{TIER_WORDS_BN[t]}” হওয়ার পর")))
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
                   bi("it is in DSE's category Z", "শেয়ারটি ডিএসইর Z ক্যাটাগরিতে আছে")),
    "stale_financials": (bi("Old accounts", "পুরোনো হিসাব"),
                         bi("it has not published yearly accounts for years", "কোম্পানিটি কয়েক বছর ধরে বার্ষিক হিসাব প্রকাশ করেনি")),
    "thin_trading": (bi("Hard to sell", "বিক্রি করা কঠিন"),
                     bi("few of its shares trade each day, so selling can be hard",
                        "শেয়ারটি প্রতিদিন কম লেনদেন হয়, তাই বিক্রি করা কঠিন হতে পারে")),
    "earnings_dropped": (bi("Profit fell", "মুনাফা কমেছে"),
                         bi("profit fell sharply in the latest results", "সর্বশেষ ফলে মুনাফা অনেক কমেছে")),
    "heavy_debt": (bi("Heavy loans", "বেশি ঋণ"),
                   bi("its loans are larger than the whole company's value", "কোম্পানির ঋণ তার পুরো বাজারমূল্যের চেয়েও বেশি")),
    "red_flag": (bi("Red flag", "বড় সতর্কতা"),
                 bi("we found a serious warning in its notices", "কোম্পানির নোটিশে একটি গুরুতর সতর্কতা পেয়েছি")),
}


# The four business checks in running text. The strong / weak lines are the
# group rules' own (grade_rules, 2026-11-05): the words here are what the
# group is made of.
_CHECK_RUN = {"p1_biz": ("profit", "মুনাফা"), "p2_health": ("finances", "আর্থিক অবস্থা"),
              "p3_moat": ("business", "ব্যবসার শক্তি"), "p5_div": ("dividend", "ডিভিডেন্ড")}
# Serious problems, in two or three words, for the checks line.
_PROBLEM_SHORT = {
    "going_concern": ("auditor's doubt", "নিরীক্ষকের সন্দেহ"),
    "audit_serious": ("auditor's objection", "নিরীক্ষকের আপত্তি"),
    "factory": ("factory closed", "কারখানা বন্ধ"),
    "loans": ("loans over its value", "মূল্যের চেয়ে বেশি ঋণ"),
    "loss": ("a loss now", "এখন লোকসান"),
    "old_accounts": ("old accounts", "পুরোনো হিসাব"),
    "z_category": ("Z category", "জেড ক্যাটাগরি"),
    "thin_data": ("too few figures", "তথ্য কম"),
}


def _row_problems(row: dict) -> list[str]:
    p = row.get("grade_problems")
    return [k for k in p if k in _PROBLEM_SHORT] if isinstance(p, (list, tuple)) else []


def _held_back(row: dict) -> list[str]:
    """The serious problems that put the company below what its checks say
    (one holds it at Mixed, two make it Mostly weak)."""
    probs = _row_problems(row)
    if not probs:
        return []
    from backend.services.tiers import tier_key
    return _gr.held_back_by(_gr.check_values(row), probs, tier_key(_f(row.get("score"))))


def checks_line(row: dict) -> Optional[dict]:
    """Which of the four business checks it is strong and weak on, in words
    ("Strong: profit and finances · Weak: business"), plus what held it back
    when a serious problem decided its group — the company light says what
    its group is made of. A check with no figures (insurers' business
    strength) is left out. Free."""
    vals = list(_gr.check_values(row).items())
    if not vals:
        return None
    strong = [k for k, v in vals if v >= STRONG_AT]
    weak = [k for k, v in vals if v < WEAK_BELOW]
    held = _held_back(row)

    def join(keys, i, table=_CHECK_RUN):
        words = [table[k][i] for k in keys]
        if i == 1:
            return ", ".join(words)
        return words[0] if len(words) == 1 else ", ".join(words[:-1]) + " and " + words[-1]

    en, bn_ = [], []
    n = len(vals)
    if len(strong) == n:
        en.append("Strong on all four business checks" if n == 4 else "Strong on every check we can measure")
        bn_.append("ব্যবসার চারটি যাচাইয়েই শক্তিশালী" if n == 4 else "যেসব যাচাই করা যায়, তার সবগুলোতেই শক্তিশালী")
    elif len(weak) == n:
        en.append("Weak on all four business checks" if n == 4 else "Weak on every check we can measure")
        bn_.append("ব্যবসার চারটি যাচাইয়েই দুর্বল" if n == 4 else "যেসব যাচাই করা যায়, তার সবগুলোতেই দুর্বল")
    else:
        if strong:
            en.append(f"Strong: {join(strong, 0)}")
            bn_.append(f"শক্তিশালী: {join(strong, 1)}")
        if weak:
            en.append(f"Weak: {join(weak, 0)}")
            bn_.append(f"দুর্বল: {join(weak, 1)}")
        if not strong and not weak:
            en.append("Fair on every check")
            bn_.append("সব যাচাইয়েই মোটামুটি")
    if held:
        en.append(f"Held back: {join(held, 0, _PROBLEM_SHORT)}")
        bn_.append(f"আটকে রেখেছে: {join(held, 1, _PROBLEM_SHORT)}")
    return bi(" · ".join(en), " · ".join(bn_))


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
        "note": checks_line(row) if tier not in (None, "unknown") else None,
    }

    # 2 · the price
    if reason == "near_52w_high":
        p_word, p_tone = bi("Near its yearly top", "বছরের সর্বোচ্চের কাছে"), "fair"
    elif signal == "buy" and sig.get("strength") == "strong":
        # What made a Buy "strong" was only the price (2026-10-31: the word
        # "Strong buy" was retired, the price light says it instead).
        p_word, p_tone = bi("Very low", "খুব কম"), "good"
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
        r_word = bi(f"{n} small {'thing' if n == 1 else 'things'} to check", f"দেখার মতো {n}টি ছোট বিষয়")
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
    good = (bi("A company strong all round", "সব দিকে শক্তিশালী কোম্পানি") if tier == "excellent"
            else bi("A mostly strong company", "বেশিরভাগ দিকে শক্তিশালী কোম্পানি"))
    blocker = None
    if tier == "unknown" or score is None:
        decision, word, tone = "unrated", bi("Not rated yet", "এখনো রেটিং নেই"), "neutral"
        line = bi("We don't have enough figures to rate it yet.", "রেটিং দেওয়ার মতো যথেষ্ট তথ্য এখনো নেই।")
    elif signal == "sell" or tier == "weak":
        decision, word, tone, blocker = "avoid", bi("Avoid", "এড়িয়ে চলুন"), "bad", "company"
        line = bi("The business is weak. It is safer to stay out.", "ব্যবসাটি দুর্বল। এই শেয়ার থেকে দূরে থাকাই নিরাপদ।")
    elif tier == "average":
        decision, word, tone, blocker = "no_reason", bi("No reason to buy", "কেনার কারণ নেই"), "neutral", "company"
        line = bi("A mixed company on our checks. Nothing stands out enough to buy it.",
                  "আমাদের যাচাইয়ে কোম্পানিটির ফল মিশ্র। কেনার মতো বিশেষ কিছু চোখে পড়ে না।")
    elif signal == "buy" and not block:
        decision, tone = "buy", "good"
        word = bi("Buy", "কেনা যায়")
        pe, pb = {"Fair": ("fair", "ন্যায্য"), "Very low": ("very low", "খুব কম")}.get(p_word["en"], ("low", "কম"))
        line = bi(f"{good['en']}, at a {pe} price, and nothing serious is wrong.",
                  f"{good['bn']}, দামও {pb}, আর গুরুতর কোনো সমস্যা নেই।")
    else:
        decision, word, tone = "wait", bi("Not yet", "এখন নয়"), "fair"
        if block:
            blocker = "risks"
            clause = _RISK_BLOCKS[block][1]
            if block == "red_flag" and reds:
                d0 = reds[0]["detail"]
                clause = bi("we found a serious problem: " + _lc(d0["en"]).rstrip("."),
                            "আমরা একটি গুরুতর সমস্যা পেয়েছি: " + d0["bn"].rstrip("।"))
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
                          f"{good['bn']}, তবে দাম কেবল ন্যায্য পর্যায়ে। দাম আরও কমলে কেনা ভালো হবে।")
            # The light that blocked the buy is never green.
            if price["tone"] == "good":
                price["tone"] = "fair"
            elif price["tone"] == "neutral":
                price["tone"] = "fair"

    return {
        "decision": decision, "word": word, "tone": tone, "line": line,
        "lights": [company, price, risks],
        "blocker": blocker,
        "buy_price": answer_buy_price(decision, blocker, (pr or {}).get("buy_below"), _f(inp.get("ltp"))),
    }


def answer_buy_price(decision: Optional[str], blocker: Optional[str],
                     buy_below: Optional[float], ltp: Optional[float]) -> Optional[float]:
    """Our buy price, only where it means something (2026-11-04, audit PR2):

    * "Not yet" because of the price — buying under it is what we're waiting for.
    * "Buy" — only when today's price is already under it ("already under the
      price we would buy under"). A Buy at ৳65 beside "a good buy under ৳46.6"
      (BRACBANK) contradicted itself.

    Never for Avoid, "No reason to buy", or a "Not yet" held back by a risk
    (category Z, old accounts, a red flag): buying cheaper would not change
    the answer. 127 companies showed "a good buy under ৳X" with an alert."""
    if buy_below is None:
        return None
    if decision == "wait" and blocker == "price":
        return buy_below
    if decision == "buy" and ltp is not None and ltp <= buy_below:
        return buy_below
    return None


# ---------------------------------------------------------------- the full report

# What a chapter's written read says about each word (2026-10-30, the full
# report plan https://claude.ai/artifact/1TuJ9dvifeXTLzs5wVwk2Q): the data put
# together, two or three plain sentences per chapter, Premium.
_PROFIT_LEAD = {
    "Growing": ("Its profit is growing", "কোম্পানির মুনাফা বাড়ছে"),
    "Flat": ("Its profit is about the same as a year ago", "কোম্পানির মুনাফা আগের বছরের মতোই আছে"),
    "Slipping": ("Its profit is falling", "কোম্পানির মুনাফা কমছে"),
}
_LOANS_LINE = {
    "Easily": ("It can pay its loans easily.", "ঋণ শোধ করা কোম্পানির জন্য সহজ।"),
    "Yes": ("It can handle its loans.", "ঋণ সামলানোর সামর্থ্য কোম্পানির আছে।"),
    "Watch this": ("Its loans are worth watching.", "ঋণের দিকে নজর রাখা দরকার।"),
    "Risky": ("Its loans are a real risk.", "ঋণের পরিমাণ সত্যিই ঝুঁকির কারণ।"),
}
_CUSHION_LINE = {
    "Easily": ("strong", "শক্ত"), "Yes": ("good", "ভালো"), "Watch this": ("thin", "কম"), "Risky": ("very thin", "খুব কম"),
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
                      "কোম্পানিটি এখন লোকসানে চলছে, তবে ব্যবসায় এখনো নগদ টাকা আসছে।")
        return bi("It is making a loss right now.", "কোম্পানিটি এখন লোকসানে চলছে।")
    lead = _PROFIT_LEAD.get(tyw or "")
    if not lead:
        return None
    en, bn_ = lead
    if caw == "Yes":
        if tyw == "Growing":
            tail = (", and it comes in as real money, so the growth looks real.",
                    "। মুনাফার টাকা নগদেই হাতে আসছে, তাই এই বৃদ্ধি সত্যিকারের বলেই মনে হয়।")
        elif tyw == "Slipping":
            tail = (", but what it earns still comes in as real money.", ", তবে যা আয় হচ্ছে, তা নগদেই হাতে আসছে।")
        else:
            tail = (", and it comes in as real money.", ", আর সেই মুনাফা নগদেই হাতে আসছে।")
    elif caw == "Mostly":
        tail = (", and most of it comes in as real money.", ", আর এর বেশির ভাগই নগদে হাতে আসছে।")
    elif caw == "No":
        if tyw == "Growing":
            tail = (", but little of it comes in as real money, so check that the growth is real.",
                    ", তবে এর সামান্যই নগদে হাতে আসছে। তাই এই বৃদ্ধি কতটা সত্যিকারের, তা দেখে নেওয়া দরকার।")
        else:
            tail = (", and little of it comes in as real money.", ", আর এর সামান্যই নগদে হাতে আসছে।")
    else:
        tail = (".", "।")
    return bi(en + tail[0], bn_ + tail[1])


def _loans_line(sa: Optional[dict], sector_class: str) -> Optional[dict]:
    if not sa:
        return None
    if (sa.get("measures") or {}).get("no_loans"):
        return bi("It has no loans.", "কোম্পানির কোনো ঋণ নেই।")
    w = _word(sa)
    if sector_class in _LENDERS and w in _CUSHION_LINE:
        c_en, c_bn = _CUSHION_LINE[w]
        return bi(f"It keeps a {c_en} cushion of its own money behind what it lends.",
                  f"যা ধার দেয়, তার পেছনে প্রতিষ্ঠানটির নিজস্ব মূলধনের সুরক্ষা {c_bn}।")
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
                       f"আজকের দামে আপনি কোম্পানির প্রায় {now:.0f} বছরের মুনাফার সমান দাম দিচ্ছেন। সাধারণত এটি প্রায় {usual:.0f} বছরের মুনাফার সমান থাকে।")
        elif now and now > 0:
            years = bi(f"You pay for about {now:.0f} years of its profit today.",
                       f"আজকের দামে আপনি কোম্পানির প্রায় {now:.0f} বছরের মুনাফার সমান দাম দিচ্ছেন।")
        else:
            years = bi("It made no profit in its latest results, so its price can't be judged on profit.",
                       "সর্বশেষ ফলে কোনো মুনাফা হয়নি, তাই মুনাফার হিসাবে এর দাম বিচার করা যায় না।")
        fair = pr.get("fair")
        fair_line = buy_line = None
        if fair and ltp:
            where = (("below it", "চেয়ে কম") if ltp < fair["low"] else ("above it", "চেয়ে বেশি") if ltp > fair["high"]
                     else ("inside that range", "সীমার মধ্যেই"))
            fair_line = bi(
                f"By our sums a fair price is {money(fair['low'])} to {money(fair['high'])}, so today's {money(ltp)} is {where[0]}.",
                f"আমাদের হিসাবে ন্যায্য দাম {money(fair['low'])} থেকে {money(fair['high'])}। আজকের দাম {money(ltp)}, অর্থাৎ ন্যায্য দামের {where[1]}।")
        bb = _f(pr.get("buy_below"))
        if bb and ltp:
            buy_line = (bi(f"At {money(bb)} or less we would call it a buy.",
                           f"দাম {money(bb)} বা তার নিচে হলে আমরা একে কেনার মতো বলব।")
                        if ltp > bb else
                        bi(f"That is already under {money(bb)}, the price up to which we would call it a buy.",
                           f"আজকের দাম এরই মধ্যে {money(bb)}-এর নিচে, যে দাম পর্যন্ত আমরা একে কেনার মতো বলি।"))
        yld = _f((((dv or {}).get("latest")) or {}).get("yield_pct"))
        div_line = (bi(f"It also pays about {yld:.1f}% a year in cash on today's price.",
                       f"আজকের দামের হিসাবে শেয়ারটি বছরে প্রায় {yld:.1f}% নগদ ডিভিডেন্ডও দেয়।") if yld and yld > 0 else None)
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
            lead_bn = "আমরা একটি গুরুতর সমস্যা পেয়েছি: " if len(reds) == 1 else f"আমরা {len(reds)}টি গুরুতর সমস্যা পেয়েছি। সবচেয়ে বড়টি: "
            parts.append(bi(lead_en + _lc(d0["en"]).rstrip(".") + ".", lead_bn + d0["bn"].rstrip("।") + "।"))
        elif ambers:
            d0 = ambers[0]["detail"]
            parts.append(bi("Nothing is seriously wrong. The main thing to check: " + _lc(d0["en"]).rstrip(".") + ".",
                            "গুরুতর কোনো সমস্যা নেই। তবে একটি বিষয় দেখে নেওয়া ভালো: " + d0["bn"].rstrip("।") + "।"))
        elif rf:
            parts.append(bi("Nothing is wrong in any of the things we check.", "আমরা যেসব বিষয় যাচাই করি, তার কোনোটিতেই সমস্যা পাইনি।"))
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
                                "কোম্পানি যাঁরা চালান, তাঁরা নিজেরাই শেয়ার কিনছেন। এটি ভালো লক্ষণ।"))
            elif w == "Selling":
                parts.append(bi("The people who run it have been selling shares, which is worth checking.",
                                "কোম্পানি যাঁরা চালান, তাঁরা শেয়ার বিক্রি করছেন। কারণটা খতিয়ে দেখা ভালো।"))
            elif r30 and r30.get("ok") is False:
                parts.append(bi("The founders own less than the rules ask them to keep.",
                                "নিয়ম অনুযায়ী উদ্যোক্তা-পরিচালকদের যত শেয়ার রাখার কথা, তাঁদের হাতে আছে তার চেয়ে কম।"))
            else:
                parts.append(bi("The people who run it have not bought or sold shares this year.",
                                "কোম্পানি যাঁরা চালান, তাঁরা এ বছর কোনো শেয়ার কেনেননি, বিক্রিও করেননি।"))
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
                     "ডিভিডেন্ড দিয়ে আর এজিএম করে কোম্পানি Z ক্যাটাগরি থেকে বেরিয়ে এলে।"),
    "stale_financials": bi("When it publishes up-to-date yearly accounts.", "হালনাগাদ বার্ষিক হিসাব প্রকাশ করলে।"),
    "thin_trading": bi("If more of its shares start trading each day.", "প্রতিদিন আরও বেশি শেয়ার লেনদেন হতে শুরু করলে।"),
    "earnings_dropped": bi("If its next results show profit recovering.", "পরের ফলে মুনাফা আবার বাড়তে দেখা গেলে।"),
    "heavy_debt": bi("If it pays its loans down below what the whole company is worth on the market.",
                     "কোম্পানি তার ঋণ কমিয়ে পুরো বাজারমূল্যের নিচে নামিয়ে আনলে।"),
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
    if tier == TIER_WORDS["excellent"]:
        pros.append(bi("The business is strong all round on our checks, one of the strongest on the DSE.",
                       "আমাদের যাচাইয়ে ব্যবসাটি সব দিকে শক্তিশালী। এটি ডিএসইর সবচেয়ে শক্তিশালী কোম্পানিগুলোর একটি।"))
    elif tier == TIER_WORDS["weak"]:
        cons.append(bi("The business is mostly weak on our checks.", "আমাদের যাচাইয়ে ব্যবসাটি বেশিরভাগ দিকে দুর্বল।"))
    pc = _profit_cash_line(ty, ca)
    if pc and _word(ty) == "Growing" and _word(ca) != "No":
        pros.append(pc)
    elif pc and (_word(ty) in ("Loss", "Slipping") or _word(ca) == "No"):
        cons.append(pc)
    if _word(pr) == "Low":
        pros.append(bi("It is cheap for the profit it makes.", "মুনাফার তুলনায় শেয়ারটির দাম কম।"))
    elif _word(pr) == "High":
        cons.append(bi("It is expensive for the profit it makes.", "মুনাফার তুলনায় শেয়ারটির দাম বেশি।"))
    ll = _loans_line(sa, sc)
    if ll and _word(sa) in ("Easily", "Yes"):
        pros.append(ll)
    elif ll:
        cons.append(ll)
    ds_level = ((dv or {}).get("safety") or {}).get("level")
    if _word(dv) in ("Rising", "Steady") and ds_level == "risk":
        cons.append(bi("Its dividend is at risk: " + (((dv or {}).get("safety") or {}).get("line_en") or "").rstrip(".").lower() + ".",
                       "ডিভিডেন্ড ঝুঁকিতে: " + (((dv or {}).get("safety") or {}).get("line_bn") or "")))
    elif _word(dv) in ("Rising", "Steady") and ds_level in (None, "safe"):
        # The word reads the last two years only, so never "every year".
        pros.append(bi("It has raised its cash dividend." if _word(dv) == "Rising" else "It has kept its cash dividend steady.",
                       "কোম্পানি নগদ ডিভিডেন্ড বাড়িয়েছে।" if _word(dv) == "Rising" else "কোম্পানি নগদ ডিভিডেন্ড আগের মতোই রেখেছে।"))
    elif _word(dv) in ("Cut", "Falling"):
        cons.append(bi("It has cut its cash dividend.", "কোম্পানি নগদ ডিভিডেন্ড কমিয়েছে।"))
    if _word(ow) == "Buying":
        pros.append(bi("The people who run it are buying its shares.", "কোম্পানি যাঁরা চালান, তাঁরা নিজেরাই শেয়ার কিনছেন।"))
    elif _word(ow) == "Selling":
        cons.append(bi("The people who run it are selling shares.", "কোম্পানি যাঁরা চালান, তাঁরা শেয়ার বিক্রি করছেন।"))
    if _word(se) == "Top 3" and _size_line(se):
        pros.append(_size_line(se))
    ambers = [c for c in checks if c["level"] == "amber"]
    if ambers:
        n = len(ambers)
        cons.append(bi(f"{n} smaller {'thing' if n == 1 else 'things'} in its notices {'is' if n == 1 else 'are'} worth a look.",
                       f"কোম্পানির নোটিশে দেখে নেওয়ার মতো {n}টি ছোট বিষয় আছে।"))
    if not pros:
        pros.append(bi("We found little in its favour right now.", "এই মুহূর্তে শেয়ারটির পক্ষে তেমন কিছু পাইনি।"))
    if not cons:
        cons.append(bi("We found nothing serious against it.", "শেয়ারটির বিপক্ষে গুরুতর কিছু পাইনি।"))

    # What would change our answer: the signal's lines as prices and events.
    ltp = _f(inp.get("ltp"))
    top = _near_top(inp)
    bb = _f((pr or {}).get("buy_below"))
    change: list[dict] = []
    if decision == "buy":
        # The lower of the two lines the Buy leaves at (signal_service): near
        # its yearly top, or a price score under the leave line (audit PR5).
        leave = leave_price_for(inp.get("score_row") or {})
        if leave and ltp and ltp < leave and (not top or leave < top):
            change.append(bi(f"If the price climbs past {money(leave)}, it is no longer low enough for us to call it a Buy.",
                             f"দাম {money(leave)} ছাড়ালে তা আর কেনার মতো কম থাকবে না। তখন আমরা আর একে কেনার মতো বলব না।"))
        elif top and ltp and ltp < top:
            change.append(bi(f"If the price climbs past {money(top)}, it is near its highest this year, and we would stop calling it a Buy.",
                             f"দাম {money(top)} ছাড়ালে তা এ বছরের সর্বোচ্চের কাছে চলে যাবে। তখন আমরা আর একে কেনার মতো বলব না।"))
        change.append(bi("If its next results show profit down by a quarter or more from a year earlier.",
                         "পরের ফলে মুনাফা আগের বছরের একই সময়ের চেয়ে এক-চতুর্থাংশ বা তার বেশি কমে গেলে।"))
        change.append(bi("If a serious problem turns up in its notices.", "কোম্পানির নোটিশে কোনো গুরুতর সমস্যা ধরা পড়লে।"))
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
                             "মুনাফা বাড়তে থাকলে সেই মুনাফার হিসাবে আজকের দাম কম মনে হবে।"))
    elif decision == "no_reason":
        change.append(bi("If the business improves enough to be “Mostly strong” on our checks.",
                         "ব্যবসার এতটা উন্নতি হলে, যাতে আমাদের যাচাইয়ে এটি “বেশিরভাগ দিকে শক্তিশালী” গ্রেডে ওঠে।"))
        if _word(pr) != "Low":
            change.append(bi("Even then, we would want a lower price for the profit it makes.",
                             "তখনও আমরা মুনাফার তুলনায় আরও কম দাম চাইব।"))
    elif decision == "avoid":
        change.append(bi("If the business recovers and moves up out of “Mostly weak”.",
                         "ব্যবসা ঘুরে দাঁড়িয়ে “বেশিরভাগ দিকে দুর্বল” থেকে ওপরে উঠলে।"))
    else:
        change.append(bi("When it publishes enough figures for us to rate it.",
                         "রেটিং দেওয়ার মতো যথেষ্ট হিসাব কোম্পানি প্রকাশ করলে।"))

    inside = [bi("The case for buying it, from this report", "এই রিপোর্ট থেকে কেনার পক্ষে যুক্তি"),
              bi("The case against it", "কেনার বিপক্ষে যুক্তি"),
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


# ---------------------------------------------------------------- against a bank deposit (audit N11)

# Updated by hand: a one-year fixed deposit (FDR) at the big banks, before
# tax. Deposit interest is taxed like a cash dividend (10% with a TIN). The
# line gives the price an anchor readers already use (audit GR5 / N11).
FDR_RATE_PCT = 10.5
FDR_RATE_AS_OF = "2026-11"
FDR_TAX_PCT = 10.0


def _per100(v: float) -> str:
    return f"{v:.1f}" if v < 10 else f"{v:.0f}"


def build_deposit(inp: dict, dividend: Optional[dict]) -> Optional[dict]:
    """For every ৳100 you pay today: the profit the company earns in a year and
    the cash it pays you after tax, next to what a bank deposit pays. Facts,
    no verdict: the price chapter's word stays the one answer."""
    ltp = _f(inp.get("ltp"))
    if not ltp or ltp <= 0:
        return None
    eps = _f((inp.get("score_row") or {}).get("eps"))
    profit = eps / ltp * 100.0 if eps and eps > 0 else None
    y = _f((dividend or {}).get("year_yield_pct"))
    cash = y * (1 - DIV_TAX_PCT / 100.0) if y and y > 0 else None
    if profit is None and cash is None:
        return None
    fdr_net = FDR_RATE_PCT * (1 - FDR_TAX_PCT / 100.0)
    if profit is not None and cash is not None:
        first = bi(f"For every ৳100 you pay today, the company earns about ৳{_per100(profit)} of profit a year "
                   f"and pays you about ৳{_per100(cash)} in cash after tax.",
                   f"আজকের দামে প্রতি ৳100-এর বিপরীতে কোম্পানি বছরে প্রায় ৳{_per100(profit)} মুনাফা করে, "
                   f"আর কর বাদে আপনাকে নগদ দেয় প্রায় ৳{_per100(cash)}।")
    elif profit is not None:
        first = bi(f"For every ৳100 you pay today, the company earns about ৳{_per100(profit)} of profit a year.",
                   f"আজকের দামে প্রতি ৳100-এর বিপরীতে কোম্পানি বছরে প্রায় ৳{_per100(profit)} মুনাফা করে।")
    else:
        first = bi(f"For every ৳100 you pay today, it pays you about ৳{_per100(cash)} a year in cash after tax, "
                   "although it made a loss.",
                   f"আজকের দামে প্রতি ৳100-এর বিপরীতে কোম্পানি বছরে কর বাদে প্রায় ৳{_per100(cash)} নগদ দেয়, "
                   "যদিও এর লোকসান হয়েছে।")
    second = bi(f"A one-year bank deposit pays about ৳{_per100(fdr_net)} after tax. "
                "The deposit's interest stays the same; a company's profit can grow or shrink.",
                f"এক বছরের ব্যাংক এফডিআরে কর বাদে পাওয়া যায় প্রায় ৳{_per100(fdr_net)}। "
                "এফডিআরের সুদ একই থাকে; কোম্পানির মুনাফা বাড়তেও পারে, কমতেও পারে।")
    return {
        "profit_per_100": round(profit, 1) if profit is not None else None,
        "cash_per_100": round(cash, 1) if cash is not None else None,
        "fdr_pct": FDR_RATE_PCT,
        "fdr_net_per_100": round(fdr_net, 1),
        "fdr_as_of": FDR_RATE_AS_OF,
        "lines": [first, second],
    }


# ---------------------------------------------------------------- our answer over time (audit N8)

ANSWER_FLIPS_DAYS = 30      # how far back "it changed N times" reaches
ANSWER_FLIPS_NOTE = 3       # from this many changes, say the price sits near our line


def answer_since(days: list[dict], decision: Optional[str], word: Optional[dict],
                 today: date) -> Optional[dict]:
    """Pure. `days` = the stock report snapshots' answers ({date, decision,
    answer_word}). Today's live answer may not be stored yet. Returns
    {since, before, first_record, changes, line} — "Buy since 12 Oct, Not yet
    before" — or None without a stored day or an answer."""
    rows = sorted((d for d in days or [] if d.get("decision") and _d(d.get("date"))),
                  key=lambda d: _d(d["date"]), reverse=True)
    if not rows or not decision or not word:
        return None
    live_new = rows[0]["decision"] != decision
    if live_new:
        since, before, first = today, rows[0].get("answer_word"), None
    else:
        i = 0
        while i < len(rows) and rows[i]["decision"] == decision:
            i += 1
        since = _d(rows[i - 1]["date"])
        before = rows[i].get("answer_word") if i < len(rows) else None
        first = since if i >= len(rows) else None
    # How often it changed in the last month (the live answer counts as a day).
    seq = [decision] + [r["decision"] for r in rows if (today - _d(r["date"])).days <= ANSWER_FLIPS_DAYS]
    changes = sum(1 for a, b in zip(seq, seq[1:]) if a != b)

    w_en, w_bn = word.get("en") or "", word.get("bn") or ""
    s_en, s_bn = _day_short(since)
    if first:
        line = bi(f"Our answer has been “{w_en}” since we started keeping a record of it on {s_en}.",
                  f"{s_bn} থেকে আমরা এই উত্তরের রেকর্ড রাখছি, তখন থেকেই উত্তর “{w_bn}”।")
    elif since == today:
        line = bi(f"Our answer changed to “{w_en}” today." + (f" Before that it was “{before['en']}”." if before else ""),
                  f"আজ আমাদের উত্তর বদলে “{w_bn}” হয়েছে।" + (f" এর আগে ছিল “{before['bn']}”।" if before else ""))
    else:
        line = bi(f"Our answer has been “{w_en}” since {s_en}." + (f" Before that it was “{before['en']}”." if before else ""),
                  f"{s_bn} থেকে আমাদের উত্তর “{w_bn}”।" + (f" এর আগে ছিল “{before['bn']}”।" if before else ""))
    if changes >= ANSWER_FLIPS_NOTE:
        line = bi(line["en"] + f" It changed {changes} times in the last month, because the price sits close to our line.",
                  line["bn"] + f" গত এক মাসে এটি {changes} বার বদলেছে, কারণ দাম আমাদের সীমার খুব কাছে আছে।")
    return {"since": since.isoformat(), "before": before, "first_record": first.isoformat() if first else None,
            "changes": changes, "line": line}


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
    core = build_core(inp)
    liquidity = build_liquidity(inp)
    red_flags = build_red_flags(inp, cash=cash, dividend=dividend, owners=owners, safety=safety, warning=warning,
                                core=core)
    nxt = build_next(inp, this_year, dividend, safety)
    risks = build_risks(inp, red_flags)
    story = build_story(inp)
    sector = build_sector(inp)
    alts = build_alternatives(inp)

    if price is not None:
        deposit = build_deposit(inp, dividend)
        if deposit:
            price["deposit"] = deposit
    work = {"red_flags": red_flags, "price": price, "dividend": dividend, "this_year": this_year,
            "owners": owners, "cash": cash, "core": core, "safety": safety, "quality": quality, "next": nxt,
            "risks": risks, "story": story, "sector": sector, "alternatives": alts, "liquidity": liquidity}
    scorecard = build_scorecard(work, inp)
    answer = build_answer(inp, work)
    history = answer_since(inp.get("answer_days") or [], answer.get("decision"), answer.get("word"), inp["today"])
    if history:
        answer["history"] = history
    if price and price.get("buy_below") is not None and answer.get("buy_price") is None:
        price["buy_below"] = None
        if price.get("_buy_watch"):
            price["watch"] = None
    reads = build_reads(inp, work)
    view = build_view(inp, work, answer)
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
        # The smaller things too (2026-11-05, audit EL11): research cards and
        # picks take their one watch-out from these lines, not the old wording.
        "amber_keys": [c["key"] for c in rf.get("checks") or [] if c["level"] == "amber"],
        "amber_lines": {c["key"]: c["detail"] for c in rf.get("checks") or [] if c["level"] == "amber"},
        "fair_center": ((pr.get("fair") or {}).get("center")),
        "buy_below": pr.get("buy_below"),
        # The answer card (2026-10-30): the watcher's `answer` event diffs these.
        "decision": (report.get("answer") or {}).get("decision"),
        "answer_word": (report.get("answer") or {}).get("word"),
        "answer_line": (report.get("answer") or {}).get("line"),
    }
