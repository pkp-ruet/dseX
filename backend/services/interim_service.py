"""
Interim (quarterly) results parsed out of DSE's "Q1/Q2/Q3 Financials" news posts.

DSE does not publish a quarterly table we scrape, but every listed company
posts its un-audited quarter in one fixed template that we already store in
``company_news``::

    (Q3 Un-audited): EPS was Tk. 6.94 for January-March 2026 as against
    Tk. 12.73 for January-March 2025; EPS was Tk. 26.57 for July 2025-March 2026
    as against Tk. 36.65 for July 2024-March 2025. NOCFPS was Tk. (134.34) for
    July 2025-March 2026 as against Tk. 88.26 for July 2024-March 2025. NAV per
    share was Tk. 281.28 as on March 31, 2026 and Tk. 274.03 as on June 30, 2025.

From the latest such post we take the cumulative (year-to-date) EPS for this
year and the same period last year, the latest quarter on its own, the
cumulative NOCFPS, and the latest NAV per share. That powers:

  * TTM EPS  = last full-year EPS - last year's YTD EPS + this year's YTD EPS
  * the latest NAV for P/B
  * "this year" trend language (interim YoY)
  * a negative-operating-cash watch-out

Pure functions only, apart from ``load_interims`` — tests feed post text in.
Figures in parentheses are negative, as DSE writes them.
"""
import calendar
import re
from datetime import date, datetime
from typing import Optional

_MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}
_MONTH_ABBR = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
_MONTH_BN = ["", "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
             "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"]

# "Q3 Financials", "Audited Q2 Financials", "Q1 Financials and ..." — Q4 does
# not exist (the year end is the audited annual report).
TITLE_RE = re.compile(r"\bQ([1-3])\b.*Financials|Financials.*\bQ([1-3])\b", re.IGNORECASE)

_NUM = r"\(?-?[\d,]+(?:\.\d+)?\)?"
_RESTATED = r"(?:\s*\((?:restated|re-stated)\))?"
_PERIOD = r"[A-Za-z][^;.]*?\d{4}"

_EPS_RE = re.compile(
    r"(?P<kind>(?:Consolidated\s+)?(?:Diluted\s+)?)EPS\s+was\s+Tk\.?\s*(?P<cur>" + _NUM + ")" + _RESTATED +
    r"\s+for\s+(?P<per>" + _PERIOD + r")\s*,?\s+as\s+against\s+Tk\.?\s*(?P<prev>" + _NUM + ")" + _RESTATED +
    r"\s+for\s+(?P<pper>" + _PERIOD + ")",
    re.IGNORECASE,
)
_NOCF_RE = re.compile(
    r"NOCFPS\s+was\s+Tk\.?\s*(?P<cur>" + _NUM + ")" + _RESTATED +
    r"\s+for\s+(?P<per>" + _PERIOD + r")\s*,?\s+as\s+against\s+Tk\.?\s*(?P<prev>" + _NUM + ")",
    re.IGNORECASE,
)
_NAV_RE = re.compile(
    r"NAV\s+per\s+share(?P<q>[^.;]{0,40}?)\s+was\s+Tk\.?\s*(?P<v>" + _NUM + ")" + _RESTATED +
    r"\s+as\s+on\s+(?P<d>[A-Za-z]+\s+\d{1,2},?\s*\d{4})",
    re.IGNORECASE,
)
_MONTH_TOKEN_RE = re.compile(r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b", re.IGNORECASE)
_YEAR_RE = re.compile(r"\b(\d{4})\b")


def _num(raw: str) -> Optional[float]:
    if raw is None:
        return None
    s = raw.strip().replace(",", "")
    neg = s.startswith("(") and s.endswith(")")
    s = s.strip("()")
    try:
        v = float(s)
    except ValueError:
        return None
    return -v if neg else v


def parse_period(text: str) -> Optional[tuple[date, date, int]]:
    """'July 2025-March 2026' -> (2025-07-01, 2026-03-31, 9 months).

    Handles 'Jan-March 2026', 'July-December 2025', 'January-September, 2025'.
    With one year, it belongs to the END month; the start rolls back a year
    when the start month comes after the end month (July-March 2026)."""
    months = [_MONTHS[m.group(1).lower()] for m in _MONTH_TOKEN_RE.finditer(text or "")]
    years = [int(y) for y in _YEAR_RE.findall(text or "")]
    if not months or not years:
        return None
    m1, m2 = months[0], months[-1]
    if len(years) >= 2:
        y1, y2 = years[0], years[-1]
    else:
        y2 = years[0]
        y1 = y2 if m1 <= m2 else y2 - 1
    span = (y2 * 12 + m2) - (y1 * 12 + m1) + 1
    if span <= 0 or span > 12:
        return None
    end = date(y2, m2, calendar.monthrange(y2, m2)[1])
    return date(y1, m1, 1), end, span


def _parse_nav_date(raw: str) -> Optional[date]:
    raw = " ".join(raw.replace(",", " ").split())
    for fmt in ("%B %d %Y", "%b %d %Y"):
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    return None


def parse_interim_post(title: str, body: str, post_date=None) -> Optional[dict]:
    """One quarterly post -> interim record, or None when it isn't one / can't be read."""
    tm = TITLE_RE.search(title or "")
    if not tm or not body:
        return None
    quarter = int(tm.group(1) or tm.group(2))

    eps_rows = []
    for m in _EPS_RE.finditer(body):
        per = parse_period(m.group("per"))
        if not per:
            continue
        kind = m.group("kind").lower()
        eps_rows.append({
            "diluted": "diluted" in kind,
            "cur": _num(m.group("cur")), "prev": _num(m.group("prev")),
            "start": per[0], "end": per[1], "months": per[2],
        })
    if not eps_rows:
        return None
    # Basic EPS beats diluted (the annual table is basic); fall back to diluted
    # when that is all the post gives (NAVANAPHAR's Q2).
    basic = [r for r in eps_rows if not r["diluted"]]
    rows = basic or eps_rows
    cum = max(rows, key=lambda r: r["months"])          # first longest = consolidated when both appear
    qtr = next((r for r in rows if r["months"] == 3), cum)

    nocf = None
    nm = _NOCF_RE.search(body)
    if nm:
        nocf = {"cur": _num(nm.group("cur")), "prev": _num(nm.group("prev"))}

    nav = nav_date = None
    navs = []
    for m in _NAV_RE.finditer(body):
        d = _parse_nav_date(m.group("d"))
        v = _num(m.group("v"))
        if d is None or v is None:
            continue
        navs.append((("without" in m.group("q").lower()), d, v))
    if navs:
        # The figure dated at the period end, preferring the headline NAV over a
        # "without revaluation" variant (the annual table carries revaluation).
        navs.sort(key=lambda t: (t[0], -t[1].toordinal()))
        _, nav_date, nav = navs[0]

    if isinstance(post_date, datetime):
        post_date = post_date.date()
    return {
        "quarter": quarter,
        "period_start": cum["start"],
        "period_end": cum["end"],
        "months": cum["months"],
        "eps_cum": cum["cur"],
        "eps_cum_prev": cum["prev"],
        "eps_q": qtr["cur"],
        "eps_q_prev": qtr["prev"],
        "nocfps_cum": nocf["cur"] if nocf else None,
        "nocfps_cum_prev": nocf["prev"] if nocf else None,
        "nav": nav,
        "nav_date": nav_date,
        "post_date": post_date,
    }


def latest_interim(posts: list[dict]) -> Optional[dict]:
    """Newest readable interim among a company's news docs ({title, body, post_date})."""
    best = None
    for p in posts or []:
        rec = parse_interim_post(p.get("title") or "", p.get("body") or p.get("news") or "",
                                 p.get("post_date"))
        if rec is None:
            continue
        if best is None or (rec["period_end"], rec["months"]) > (best["period_end"], best["months"]):
            best = rec
    return best


def prior_fy_year(interim: dict) -> int:
    """Fiscal-year label (calendar year of the year end) of the full year just
    before this interim's year-to-date window — the year TTM builds on."""
    s = interim["period_start"]
    return s.year if s.month > 1 else s.year - 1  # a January start means the FY ended last December


def pct_change(cur: Optional[float], prev: Optional[float]) -> Optional[float]:
    if cur is None or prev is None or prev == 0:
        return None
    return round((cur - prev) / abs(prev) * 100.0, 1)


def interim_facts(interim: Optional[dict], fin_rows: list[dict]) -> Optional[dict]:
    """Combine the latest interim with the audited table (year-ascending rows
    carrying ``year`` + ``eps``). Returns None when there is no interim, or it is
    already superseded by a newer audited year (its numbers are then old news).

    Keys: ttm_eps (None when the base year's EPS is missing), base_fy, label_en/bn,
    eps_cum_yoy_pct, eps_q_yoy_pct, nocfps_cum(+prev), nav, nav_date, months, quarter.
    """
    if not interim:
        return None
    base = prior_fy_year(interim)
    years_with_eps = {int(r["year"]): r.get("eps") for r in fin_rows or []
                      if r.get("year") is not None and r.get("eps") is not None
                      and not (isinstance(r.get("eps"), float) and r.get("eps") != r.get("eps"))}
    latest_fy = max(years_with_eps) if years_with_eps else None
    if latest_fy is not None and latest_fy > base:
        return None  # the year this interim belongs to is already in the audited table

    ttm = None
    fy_eps = years_with_eps.get(base)
    if (fy_eps is not None and interim.get("eps_cum") is not None
            and interim.get("eps_cum_prev") is not None):
        ttm = round(float(fy_eps) - interim["eps_cum_prev"] + interim["eps_cum"], 2)

    end = interim["period_end"]
    months = interim["months"]
    return {
        "quarter": interim["quarter"],
        "months": months,
        "period_end": end.isoformat(),
        "base_fy": base,
        "ttm_eps": ttm,
        "eps_cum": interim.get("eps_cum"),
        "eps_cum_prev": interim.get("eps_cum_prev"),
        "eps_q": interim.get("eps_q"),
        "eps_q_prev": interim.get("eps_q_prev"),
        "eps_cum_yoy_pct": pct_change(interim.get("eps_cum"), interim.get("eps_cum_prev")),
        "eps_q_yoy_pct": pct_change(interim.get("eps_q"), interim.get("eps_q_prev")) if months > 3 else None,
        "nocfps_cum": interim.get("nocfps_cum"),
        "nocfps_cum_prev": interim.get("nocfps_cum_prev"),
        "nav": interim.get("nav"),
        "nav_date": interim["nav_date"].isoformat() if interim.get("nav_date") else None,
        "label_en": f"{months} months to {_MONTH_ABBR[end.month]} {end.year}",
        "label_bn": f"{_MONTH_BN[end.month]} {end.year} পর্যন্ত {months} মাস",
    }


def load_interims(codes: Optional[list[str]] = None) -> dict[str, dict]:
    """{code: latest raw interim record} straight from ``company_news`` — one query."""
    from backend.services.db_service import get_db  # local: keep the parser import-light

    q: dict = {"title": {"$regex": r"\bQ[1-3]\b.*Financials|Financials.*\bQ[1-3]\b", "$options": "i"}}
    if codes:
        q["trading_code"] = {"$in": list(codes)}
    by_code: dict[str, list[dict]] = {}
    for d in get_db().company_news.find(q, {"_id": 0, "trading_code": 1, "title": 1, "body": 1, "post_date": 1}):
        by_code.setdefault(d.get("trading_code"), []).append(d)
    out = {}
    for code, posts in by_code.items():
        rec = latest_interim(posts)
        if rec:
            out[code] = rec
    return out
