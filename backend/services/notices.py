"""
DSE notices, read (2026-10-28) — the company announcements already stored in
``company_news`` that nothing parsed yet. The quarterly posts have their own
reader (``interim_service``) and the dividend percentages theirs
(``scrapers/news.py``); this module reads the rest:

  * the year's figures inside a dividend notice — "…reported Consolidated EPS of
    Tk. 31.24, Consolidated NAV per share of Tk. 178.99 and Consolidated NOCFPS
    of Tk. 18.65 for the year ended June 30, 2026 as against Tk. 27.04, …".
    DSE's audited table lags results day by weeks; ``provisional_fin_row``
    turns the notice into a ``financials``-shaped row (``provisional: True``,
    ``source: "notice"``) that ``db_service.load_financials`` and scoring merge
    in, so the page and the score move on the day the company reports.
  * insider trades — sponsor / director buy and sale declarations, and the
    confirmations that close them (``pair_insider_trades``). Gifts and other
    transfers outside the trading system are skipped: they are family moves,
    not market trades. So are the "sale and buy among the sponsors" swaps —
    shares change hands inside the owner group, the group's stake doesn't move.
  * credit ratings, board meetings (date + purpose, postponements), DSE factory
    inspections, DSE price-query answers, category changes, IPO-fund reports.

Pure functions; the ``load_*`` loaders are the only DB readers and import the DB
layer lazily, so the parsers stay import-light for the tests.
"""
import re
from datetime import date, datetime, timedelta
from typing import Optional

from backend.services.interim_service import (
    _NUM, _RESTATED, _num, parse_interim_post,
)

_MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}

# Dates as DSE writes them: "June 30, 2026", "30 June, 2026", "30-Jun-2026",
# "30.06.2026", "5.01.2026", "2026-06-30".
_MONTH_WORD = r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?"
_DATE = (
    r"(?:" + _MONTH_WORD + r"\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}"
    r"|\d{1,2}(?:st|nd|rd|th)?[\s-]+" + _MONTH_WORD + r",?[\s-]+\d{4}"
    r"|\d{1,2}[./-]\d{1,2}[./-]\d{4}"
    r"|\d{4}-\d{2}-\d{2})"
)
_DATE_RE = re.compile(_DATE, re.IGNORECASE)


def parse_date(text: Optional[str]) -> Optional[date]:
    """The first date in `text`, or None."""
    m = _DATE_RE.search(text or "")
    if not m:
        return None
    s = m.group(0).lower().replace(",", " ").replace(".", " ").strip()
    try:
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", m.group(0)):
            return date.fromisoformat(m.group(0))
        num = re.fullmatch(r"(\d{1,2})[./-](\d{1,2})[./-](\d{4})", m.group(0))
        if num:
            return date(int(num.group(3)), int(num.group(2)), int(num.group(1)))
        parts = [p for p in re.split(r"[\s-]+", s) if p]
        word = next(p for p in parts if p[:3] in _MONTHS and not p[0].isdigit())
        nums = [int(re.sub(r"\D", "", p)) for p in parts if p[0].isdigit()]
        day, year = (nums[0], nums[1]) if nums[0] < 100 else (nums[1], nums[0])
        return date(year, _MONTHS[word[:3]], day)
    except (ValueError, StopIteration, IndexError):
        return None


def _day(v) -> Optional[date]:
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    if isinstance(v, str) and v:
        try:
            return datetime.fromisoformat(v.replace("Z", "+00:00")).date()
        except ValueError:
            return parse_date(v)
    return None


def _strip_code(title: str) -> str:
    """'SQURPHARMA: Dividend Declaration' -> 'Dividend Declaration'
    (codes may carry brackets: 'AMCL(PRAN): …')."""
    head, sep, rest = (title or "").partition(":")
    return rest.strip() if sep and " " not in head.strip() else (title or "").strip()


# ---------------------------------------------------------------------------
# The year's figures in a dividend notice
# ---------------------------------------------------------------------------

_LABEL_WORDS = r"(?:(?:basic|diluted|and|consolidated|solo|separate|standalone|stand-alone)\s+)*"
_METRIC_RE = re.compile(
    r"(?P<label>" + _LABEL_WORDS +
    r"(?:EPS|NOCFPS|NAV\s+per\s+share(?:\s+\((?:with|without|including|excluding)[^)]*\))?"
    r"(?:\s+(?:with|without)\s+revaluation(?:\s+reserves?)?)?))"
    r"\s+(?:of\s+)?Tk\.?\s*(?P<v>" + _NUM + ")" + _RESTATED,
    re.IGNORECASE,
)
_YEAR_ENDED_RE = re.compile(r"for\s+the\s+year\s+ended\s+(?:on\s+)?(?P<d>" + _DATE + ")", re.IGNORECASE)
_INTERIM_SPAN_RE = re.compile(r"for\s+the\s+(?:half|period|quarter|\w+\s+months|nine|six|three)\b", re.IGNORECASE)
_AS_AGAINST_RE = re.compile(r"\s*,?\s*as\s+against\b", re.IGNORECASE)
_TK_RE = re.compile(r"Tk\.?\s*(?P<v>" + _NUM + ")" + _RESTATED, re.IGNORECASE)
# "Dividend Declaration (Revised EPS)": "…EPS for the year ended December 31,
# 2025 was mistakenly stated as Tk. 1.30 instead of Tk. 1.10. Now, the correct
# EPS is Tk. 1.10." — the EPS alone; `newest_annual` keeps the rest.
_CORRECT_EPS_RE = re.compile(r"correct\s+EPS\s+(?:is|will\s+be)\s+Tk\.?\s*(?P<v>" + _NUM + ")", re.IGNORECASE)


def _metric_kind(label: str) -> str:
    low = label.lower()
    if "nocfps" in low:
        return "nocfps"
    if "nav" in low:
        return "nav"
    return "eps"


def _metric_rank(label: str) -> tuple[int, int]:
    """Lower wins among several figures of one kind: consolidated over solo
    (DSE's audited table carries the consolidated figure — BRACBANK, CITYBANK,
    EBL, ROBI all match it), the headline NAV over "without revaluation" (the
    annual table carries revaluation), basic over a diluted-only figure."""
    low = label.lower()
    solo = 1 if re.search(r"\b(?:solo|separate|standalone|stand-alone)\b", low) else 0
    worse = 1 if ("without" in low or "excluding" in low or ("diluted" in low and "basic" not in low)) else 0
    return solo, worse


def _pick(found: list[tuple[str, Optional[float]]]) -> dict:
    """[(label, value)] -> {kind: value} using `_metric_rank`; also whether the
    chosen EPS is a consolidated figure."""
    best: dict[str, tuple[tuple[int, int], str, Optional[float]]] = {}
    for label, value in found:
        kind = _metric_kind(label)
        rank = _metric_rank(label)
        if kind not in best or rank < best[kind][0]:
            best[kind] = (rank, label, value)
    out = {k: v[2] for k, v in best.items()}
    out["_consolidated"] = bool(best.get("eps") and "consolidated" in best["eps"][1].lower())
    return out


def parse_annual_results(title: str, body: str, post_date=None) -> Optional[dict]:
    """The full year's EPS / NAV / NOCFPS (and last year's) from a notice, or None.

    Only a full year ("for the year ended …") right after the figures counts —
    half-year and quarterly figures in an interim declaration never do. Mutual
    funds report EPU / NAV per unit, which this does not read.
    """
    body = body or ""
    fix = _CORRECT_EPS_RE.search(body)
    if fix:
        ended = _YEAR_ENDED_RE.search(body)
        fy_end = parse_date(ended.group("d")) if ended else None
        if fy_end is None:
            return None
        return {"fy_end": fy_end, "fy": fy_end.year, "eps": _num(fix.group("v")), "eps_prev": None,
                "nav": None, "nav_prev": None, "nocfps": None, "nocfps_prev": None,
                "consolidated": False, "post_date": _day(post_date), "title": title or ""}
    first = _METRIC_RE.search(body)
    if not first:
        return None
    ended = next((m for m in _YEAR_ENDED_RE.finditer(body) if m.start() > first.start()), None)
    if not ended:
        return None
    segment = body[first.start():ended.start()]
    if _INTERIM_SPAN_RE.search(segment):
        return None
    fy_end = parse_date(ended.group("d"))
    if fy_end is None:
        return None

    cur_found = [(m.group("label"), _num(m.group("v"))) for m in _METRIC_RE.finditer(segment)]
    cur = _pick(cur_found)
    if cur.get("eps") is None and cur.get("nav") is None:
        return None

    # Last year's figures: "as against Tk. 27.04, Tk. 157.88 and Tk. 19.52
    # respectively for the year ended …" (positional, in the order above) or
    # "as against EPS of Tk. 3.64, NAV per share of Tk. 40.16 and …" (labelled).
    prev: dict = {}
    rest = body[ended.end():]
    aa = _AS_AGAINST_RE.match(rest)
    if aa:
        tail = rest[aa.end():]
        nxt = _YEAR_ENDED_RE.search(tail)
        prev_seg = tail[:nxt.start()] if nxt else tail
        cut = re.search(r"\(cont", prev_seg, re.IGNORECASE)
        if cut:
            prev_seg = prev_seg[:cut.start()]
        labelled = [(m.group("label"), _num(m.group("v"))) for m in _METRIC_RE.finditer(prev_seg)]
        if labelled:
            prev = _pick(labelled)
        else:
            vals = [_num(m.group("v")) for m in _TK_RE.finditer(prev_seg)]
            prev = _pick([(label, v) for (label, _), v in zip(cur_found, vals)])

    return {
        "fy_end": fy_end,
        "fy": fy_end.year,
        "eps": cur.get("eps"),
        "eps_prev": prev.get("eps"),
        "nav": cur.get("nav"),
        "nav_prev": prev.get("nav"),
        "nocfps": cur.get("nocfps"),
        "nocfps_prev": prev.get("nocfps"),
        "consolidated": cur["_consolidated"],
        "post_date": _day(post_date),
        "title": title or "",
    }


_DIVIDEND_TITLE_RE = re.compile(r"dividend\s+declaration", re.IGNORECASE)
_ANNUAL_TITLE_RE = re.compile(
    r"dividend\s+declaration|audited\s+financial|financial\s+statements|revised\s+eps", re.IGNORECASE)


def annual_record(title: str, body: str, post_date=None) -> Optional[dict]:
    """`parse_annual_results` plus the cash / stock dividend % of the same
    notice when it is a dividend declaration (the declaration parser of
    scrapers/news.py), as ``cash_pct`` / ``stock_pct`` (None otherwise)."""
    rec = parse_annual_results(title, body, post_date)
    if rec is None:
        return None
    rec["cash_pct"] = rec["stock_pct"] = None
    stripped = _strip_code(title)
    if (_DIVIDEND_TITLE_RE.search(stripped) and "interim" not in stripped.lower()
            and not re.search(r"\((?:additional|revised|correction)", stripped, re.IGNORECASE)):
        from scrapers.news import parse_dividend_parts  # local: the scraper module is heavier
        cash, stock = parse_dividend_parts(body)
        rec["cash_pct"], rec["stock_pct"] = cash, stock
    return rec


def newest_annual(records: list[dict]) -> Optional[dict]:
    """The newest year; for one year, the newest post (a revision beats the
    first notice), and a figure the newer post lacks is kept from the older."""
    best = None
    for r in sorted((r for r in records or [] if r is not None),
                    key=lambda r: (r["fy_end"], r.get("post_date") or date.min)):
        if best is not None and best["fy_end"] == r["fy_end"]:
            r = {**r, **{k: best[k] for k in ("eps", "nav", "nocfps", "eps_prev", "nav_prev",
                                                "nocfps_prev", "cash_pct", "stock_pct")
                          if r.get(k) is None and best.get(k) is not None}}
        best = r
    return best


def _latest_audited_eps_year(rows: list[dict]) -> Optional[int]:
    years = []
    for r in rows or []:
        if r.get("provisional"):
            continue
        eps = r.get("eps")
        if eps is None:
            eps = r.get("eps_cont_basic") if r.get("eps_cont_basic") is not None else r.get("eps_basic")
        if eps is None or (isinstance(eps, float) and eps != eps):
            continue
        try:
            years.append(int(r.get("year")))
        except (TypeError, ValueError):
            continue
    return max(years) if years else None


def provisional_fin_row(annual: Optional[dict], audited_rows: list[dict],
                        ledger_cash_pct: Optional[float] = None) -> Optional[dict]:
    """A ``financials``-shaped row for a year the company has reported but DSE's
    audited table doesn't carry yet, or None.

    Fields: ``year`` (int, like the stored rows), ``eps`` + ``eps_cont_basic``
    (the column every reader prefers; ``eps_basic`` stays None as on every
    scraped row), ``nav_per_share``, ``nocfps``, ``cash_dividend_pct`` /
    ``stock_dividend_pct`` (the year's total: the notice's own figure, or the
    ledger's interim + final sum when that is larger — a notice that names only
    the final), ``provisional: True``, ``source: "notice"``, ``post_date`` (ISO).
    No P/E, profit or comprehensive-income cells: readers skip what is absent.
    """
    if not annual or annual.get("eps") is None:
        return None
    latest = _latest_audited_eps_year(audited_rows)
    if latest is not None and annual["fy"] <= latest:
        return None
    cash = annual.get("cash_pct")
    if ledger_cash_pct is not None and (cash is None or ledger_cash_pct > cash):
        cash = ledger_cash_pct
    post = annual.get("post_date")
    return {
        "year": int(annual["fy"]),
        "eps": annual["eps"],
        "eps_cont_basic": annual["eps"],
        "eps_basic": None,
        "nav_per_share": annual.get("nav"),
        "nocfps": annual.get("nocfps"),
        "cash_dividend_pct": cash,
        "stock_dividend_pct": annual.get("stock_pct"),
        "fy_end": annual["fy_end"].isoformat(),
        "provisional": True,
        "source": "notice",
        "post_date": post.isoformat() if isinstance(post, date) else None,
    }


# ---------------------------------------------------------------------------
# Insider trades
# ---------------------------------------------------------------------------

_INSIDER_TITLE_RE = re.compile(r"\b(?P<side>buy|sale|sell|purchase)\s+(?P<kind>declaration|confirmation)s?\b",
                               re.IGNORECASE)
_SKIP_INSIDER_RE = re.compile(r"transfer|gift|\bsale\s+and\s+buy\b|\bbuy\s+and\s+sale\b|^regarding\b",
                              re.IGNORECASE)
_SKIP_INSIDER_BODY_RE = re.compile(r"by\s+way\s+of\s+gift|outside\s+the\s+trading\s+system|^\s*refer\s+to",
                                   re.IGNORECASE)
_DECL_SHARES_RE = re.compile(
    r"intention\s+to\s+(?:buy|sell|purchase)\s+(?:(?:its|his|her|their)\s+)?(?:(?:entire|total)\s+holding\s+of\s+)?"
    r"(?P<n>\d[\d,]*)\s+(?:shares|units)", re.IGNORECASE)
_CONF_SHARES_RE = re.compile(
    r"complet\w*\s+(?:(?:his|her|its|their)\s+)?(?:buying|selling|sale|purchase|sell|buy)\s+of\s+"
    r"(?:(?:its|his|her|their)\s+)?(?:(?:entire|total)\s+holding\s+of\s+)?(?P<n>\d[\d,]*)", re.IGNORECASE)
_ANY_SHARES_RE = re.compile(r"(?P<n>\d[\d,]{2,})\s+(?:shares|units)", re.IGNORECASE)
_WITHIN_RE = re.compile(r"within\s+(?P<d>" + _DATE + ")", re.IGNORECASE)
_DECLARED_ON_RE = re.compile(r"declaration\s+disseminated\s+(?:by\s+DSE\s+)?on\s+(?P<d>" + _DATE + ")", re.IGNORECASE)
_NAME_RE = re.compile(r"^\s*(?P<name>[^,(]{3,100}?)\s*[,(]")

# Order matters: the first match wins.
_ROLES = [
    ("corporate_director", re.compile(r"corporate\s+director", re.I)),
    ("sponsor", re.compile(r"corporate\s+sponsor", re.I)),
    ("sponsor_director", re.compile(r"sponsor[\s-]+(?:and\s+)?director", re.I)),
    ("md", re.compile(r"managing\s+director", re.I)),
    ("chairman", re.compile(r"chair(?:man|person|woman)", re.I)),
    ("director", re.compile(r"director", re.I)),
    ("sponsor", re.compile(r"sponsor", re.I)),
]


def _role(text: str) -> Optional[str]:
    for key, pat in _ROLES:
        if pat.search(text or ""):
            return key
    return None


def _int(raw: Optional[str]) -> Optional[int]:
    if not raw:
        return None
    try:
        return int(raw.replace(",", ""))
    except ValueError:
        return None


def parse_insider(title: str, body: str, post_date=None) -> Optional[dict]:
    """One sponsor / director buy or sale declaration or confirmation, or None
    (transfers, gifts and swaps inside the owner group are skipped)."""
    stripped = _strip_code(title)
    tm = _INSIDER_TITLE_RE.search(stripped)
    body = body or ""
    if not tm or _SKIP_INSIDER_RE.search(stripped) or _SKIP_INSIDER_BODY_RE.search(body):
        return None
    side = "buy" if tm.group("side").lower() in ("buy", "purchase") else "sell"
    kind = "confirmation" if re.search(r"has\s+(?:further\s+informed\s+that\s+\w+\s+has\s+)?complet", body, re.I) \
        or tm.group("kind").lower() == "confirmation" else "declaration"

    # Role from the title ("… of a Sponsor Director"); a title without one
    # ("Buy Confirmation") is a company linked to a director — "other".
    after_of = stripped[tm.end():]
    role = _role(after_of) or "other"

    nm = _NAME_RE.match(body)
    name = " ".join(nm.group("name").split()) if nm else None

    sm = (_CONF_SHARES_RE if kind == "confirmation" else _DECL_SHARES_RE).search(body) or _ANY_SHARES_RE.search(body)
    shares = _int(sm.group("n")) if sm else None

    low = body.lower()
    block = "block market" in low or "block transaction" in low
    public = "public market" in low or "public & block" in low or "public and block" in low
    market = "both" if (block and public) else "block" if block else "public" if public else None

    wm = _WITHIN_RE.search(body)
    dm = _DECLARED_ON_RE.search(body)
    return {
        "kind": kind,
        "side": side,
        "role": role,
        "name": name,
        "shares": shares,
        "by_date": parse_date(wm.group("d")) if wm else None,
        "declared_on": parse_date(dm.group("d")) if dm else None,
        "market": market,
        "post_date": _day(post_date),
    }


def _norm_name(name: Optional[str]) -> str:
    s = (name or "").lower()
    s = re.sub(r"\b(?:mr|mrs|ms|miss|dr|md|mohammad|mohammed|engr|alhaj|al-haj)\b\.?", " ", s)
    return re.sub(r"[^a-z]", "", s)


# A declaration lapses after its deadline (or ~30 working days) without a confirmation.
_DEFAULT_WINDOW = timedelta(days=45)
_MATCH_SLACK = timedelta(days=3)


def pair_insider_trades(records: list[dict]) -> list[dict]:
    """Declarations matched to the confirmations that close them, newest first:
    ``{side, role, name, shares, declared, done, status, by_date, market}``.

    A confirmation matches the declaration it cites ("as per declaration
    disseminated on 20.01.2026", ±3 days) with the same side and person, else
    the person's latest open declaration before it. A confirmation with no
    declaration on file still counts as a completed trade; a declaration with no
    confirmation stays "declared".
    """
    recs = [r for r in records or [] if r and r.get("side") and r.get("post_date")]
    decls = sorted((r for r in recs if r["kind"] == "declaration"), key=lambda r: r["post_date"])
    confs = sorted((r for r in recs if r["kind"] == "confirmation"), key=lambda r: r["post_date"])
    used: set[int] = set()
    out: list[dict] = []

    def same_person(a: dict, b: dict) -> bool:
        na, nb = _norm_name(a.get("name")), _norm_name(b.get("name"))
        if na and nb:
            return na == nb or na in nb or nb in na
        return a.get("role") == b.get("role")

    for c in confs:
        cands = [(i, d) for i, d in enumerate(decls)
                 if i not in used and d["side"] == c["side"] and d["post_date"] <= c["post_date"]
                 and same_person(d, c)]
        if c.get("declared_on"):
            cited = [(i, d) for i, d in cands if abs(d["post_date"] - c["declared_on"]) <= _MATCH_SLACK]
            cands = cited or [(i, d) for i, d in cands
                              if c["post_date"] - d["post_date"] <= _DEFAULT_WINDOW + _MATCH_SLACK]
        match = max(cands, key=lambda t: t[1]["post_date"], default=None)
        if match:
            used.add(match[0])
        d = match[1] if match else None
        out.append({
            "side": c["side"],
            "role": c["role"] if c["role"] != "other" or not d else d["role"],
            "name": c.get("name") or (d or {}).get("name"),
            "shares": c.get("shares") or (d or {}).get("shares"),
            "declared": d["post_date"] if d else c.get("declared_on"),
            "done": c["post_date"],
            "status": "done",
            "by_date": (d or {}).get("by_date"),
            "market": (d or {}).get("market") or c.get("market"),
        })
    for i, d in enumerate(decls):
        if i in used:
            continue
        out.append({
            "side": d["side"], "role": d["role"], "name": d.get("name"), "shares": d.get("shares"),
            "declared": d["post_date"], "done": None, "status": "declared",
            "by_date": d.get("by_date"), "market": d.get("market"),
        })
    out.sort(key=lambda t: (t["done"] or t["declared"] or date.min, t["declared"] or date.min), reverse=True)
    return out


# ---------------------------------------------------------------------------
# Credit ratings
# ---------------------------------------------------------------------------

_AGENCIES = [
    ("credit rating information", "CRISL"),
    ("crisl", "CRISL"),
    ("credit rating agency of bangladesh", "CRAB"),
    ("emerging credit", "ECRL"),
    ("national credit rating", "NCR"),
    ("argus", "ARGUS"),
    ("alpha credit", "Alpha"),
    ("waso", "WASO"),
    ("bangladesh rating agency", "BDRAL"),
]
_LT_RE = re.compile(r'"\s*(?P<r>[A-D][A-D+\-0-9]{0,4})\s*(?:\([^)"]*\))?\s*"\s*(?:\([^)]*\)\s*)?(?:in|for)\s+(?:the\s+)?long',
                    re.IGNORECASE)
_ST_RE = re.compile(r'"\s*(?P<r>ST\s*-?\s*\d)\s*(?:,[^"]*)?"\s*(?:\([^)]*\)\s*)?(?:in|for)\s+(?:the\s+)?short', re.IGNORECASE)
_RATING_AS_RE = re.compile(r'rating\s+of\s+the\s+company\s+as\s+"\s*(?P<r>[A-D][A-D+\-0-9]{0,4})', re.IGNORECASE)
_OUTLOOK_RE = re.compile(r"\b(?P<o>stable|positive|negative|developing)\s+outlook", re.IGNORECASE)


def parse_credit_rating(title: str, body: str, post_date=None) -> Optional[dict]:
    """One "Credit Rating Result" -> agency, long / short term rating, outlook.
    Follow-up notices ("Refer to the earlier news …") return None."""
    body = body or ""
    if "credit rating" not in (title or "").lower() or re.match(r"\s*refer\s+to", body, re.IGNORECASE):
        return None
    low = body.lower()
    agency = next((short for key, short in _AGENCIES if key in low[:200]), None)
    if agency is None:
        m = re.search(r"\(([A-Z]{2,6})\)", body[:200])
        agency = m.group(1) if m else None
    lt = _LT_RE.search(body) or _RATING_AS_RE.search(body)
    st = _ST_RE.search(body)
    if not lt and not st:
        return None
    om = _OUTLOOK_RE.search(body)
    return {
        "agency": agency or "",
        "long_term": lt.group("r").strip().upper() if lt else None,
        "short_term": re.sub(r"\s+", "", st.group("r")).upper().replace("ST", "ST-").replace("--", "-") if st else None,
        "outlook": om.group("o").capitalize() if om else None,
        "post_date": _day(post_date),
    }


# ---------------------------------------------------------------------------
# Board meetings
# ---------------------------------------------------------------------------

_BOARD_TITLE_RE = re.compile(r"board\s+meeting", re.IGNORECASE)
_HELD_ON_RE = re.compile(r"(?:will\s+be|to\s+be|scheduled\s+to\s+be)?\s*held\s+on\s+(?P<d>" + _DATE + ")", re.IGNORECASE)
_QUARTER_RE = re.compile(r"\(Q(?P<q>[1-3])\)|\b(?P<w>first|second|third|1st|2nd|3rd)\s+quarter", re.IGNORECASE)
_ENDED_RE = re.compile(r"(?:period|year|quarter)\s+ended\s+(?:on\s+)?(?P<d>" + _DATE + ")", re.IGNORECASE)
_Q_WORDS = {"first": 1, "1st": 1, "second": 2, "2nd": 2, "third": 3, "3rd": 3}


def parse_board_meeting(title: str, body: str, post_date=None) -> Optional[dict]:
    """A board-meeting notice -> meeting date + what it considers.

    ``purpose`` is "q1" / "q2" / "q3" (un-audited quarter), "annual" (the
    audited year) or "other". For a postponement ``postponed`` is True and
    ``meeting_date`` is the date that was called off (the new one comes later).
    """
    stripped = _strip_code(title)
    if not _BOARD_TITLE_RE.search(stripped) or re.match(r"decision", stripped, re.IGNORECASE):
        return None
    body = body or ""
    postponed = bool(re.search(r"postpone", stripped + " " + body, re.IGNORECASE))
    hm = _HELD_ON_RE.search(body)
    qm = _QUARTER_RE.search(body)
    if qm:
        q = int(qm.group("q")) if qm.group("q") else _Q_WORDS[qm.group("w").lower()]
        purpose = f"q{q}"
    elif re.search(r"year\s+ended", body, re.IGNORECASE) and re.search(r"audited", body, re.IGNORECASE):
        purpose = "annual"
    else:
        purpose = "other"
    em = _ENDED_RE.search(body)
    return {
        "meeting_date": parse_date(hm.group("d")) if hm else None,
        "purpose": purpose,
        "period_end": parse_date(em.group("d")) if em else None,
        "postponed": postponed,
        "post_date": _day(post_date),
    }


# ---------------------------------------------------------------------------
# DSE's own checks
# ---------------------------------------------------------------------------

_VISITED_RE = re.compile(r"(?:visited|inspected)\s+[^.]{0,200}?\bon\s+(?P<d>" + _DATE + ")", re.IGNORECASE)
# "on November 03 and 04, 2025" — a two-day visit; the first day counts.
_TWO_DAYS_RE = re.compile(r"\b(\d{1,2})\s+and\s+\d{1,2},")
_CLOSED_RE = re.compile(r"found\s+[^.]{0,60}?\b(?:closed|shut\s*down|not\s+in\s+operation|non[- ]operational)",
                        re.IGNORECASE)
_RUNNING_RE = re.compile(r"found\s+[^.]{0,60}?\b(?:running|in\s+operation|operational)\b", re.IGNORECASE)
_WORKING_RE = re.compile(r"\b(?:was|were|is|are)\s+(?:running|operational|in\s+operation)\b", re.IGNORECASE)


def parse_inspection(title: str, body: str, post_date=None) -> Optional[dict]:
    """A DSE factory visit -> closed / running. ``partly`` is True when one unit
    was found working and another closed (DOMINAGE: Ashulia operational,
    Narsingdi closed) — still "closed". DSE re-posts the same visit daily;
    ``company_notices`` keeps one per visit date."""
    body = body or ""
    if "inspection" not in (title or "").lower() and "visited the factory" not in body.lower():
        return None
    closed = bool(_CLOSED_RE.search(body))
    working = bool(_RUNNING_RE.search(body) or _WORKING_RE.search(body))
    status = "closed" if closed else "running" if working else "unknown"
    vm = _VISITED_RE.search(_TWO_DAYS_RE.sub(r"\1,", body))
    return {"status": status, "partly": closed and working,
            "visit_date": parse_date(vm.group("d")) if vm else None, "post_date": _day(post_date)}


def parse_query_response(title: str, body: str, post_date=None) -> Optional[dict]:
    """The company's answer to a DSE query about an unusual price or volume move.
    ``move`` is "rise" / "fall" / None."""
    body = body or ""
    if "query response" not in (title or "").lower() and not re.search(r"in\s+response\s+to\s+the\s+DSE\s+query", body, re.I):
        return None
    low = body.lower()
    move = "fall" if re.search(r"price\s+(?:fall|decline|drop)", low) else \
        "rise" if re.search(r"price\s+(?:hike|rise|increase)|increase\s+in\s+(?:the\s+)?price", low) else None
    return {"no_undisclosed": bool(re.search(r"no\s+undisclosed\s+[^.]{0,30}?price[\s-]+sensitive", low)),
            "move": move, "post_date": _day(post_date)}


_CATEGORY_RE = re.compile(
    r"placed\s+in\s+['\"‘’“”]?(?P<to>[ABGNZ])['\"‘’“”]?\s+category\s+from\s+(?:the\s+)?(?:existing\s+)?"
    r"['\"‘’“”]?(?P<from>[ABGNZ])['\"‘’“”]?", re.IGNORECASE)
_EFFECT_RE = re.compile(r"with\s+effect\s+from\s+(?:today\s+i\.?\s*e\.?,?\s*)?(?P<d>" + _DATE + ")", re.IGNORECASE)


def parse_category_change(title: str, body: str, post_date=None) -> Optional[dict]:
    """DSE moving the company between categories. ``reason``: "dividend_unpaid"
    (an approved dividend not paid on time), "no_dividend", "no_agm",
    "dividend" (a declaration moved it), or "other"."""
    body = body or ""
    if "category" not in (title or "").lower():
        return None
    m = _CATEGORY_RE.search(body)
    if not m:
        return None
    low = body.lower()
    if re.search(r"non[- ]disbursement|not\s+disburs|fail\w*\s+to\s+(?:pay|disburse)", low):
        reason = "dividend_unpaid"
    elif re.search(r"fail\w*\s+to\s+declare|no\s+dividend", low):
        reason = "no_dividend"
    elif "annual general meeting" in low or re.search(r"\bagm\b", low):
        reason = "no_agm"
    elif "dividend" in low:
        reason = "dividend"
    else:
        reason = "other"
    em = _EFFECT_RE.search(body)
    return {"from": m.group("from").upper(), "to": m.group("to").upper(), "reason": reason,
            "effective": parse_date(em.group("d")) if em else None, "post_date": _day(post_date)}


# ---------------------------------------------------------------------------
# One company's notices
# ---------------------------------------------------------------------------

_NAV_TITLE_RE = re.compile(r"\b(?:daily|weekly)\s+nav\b", re.IGNORECASE)
_ADDITIONAL_RE = re.compile(r"additional\s+information", re.IGNORECASE)


def company_notices(news: list[dict]) -> dict:
    """One company's ``company_news`` docs ({title, body, post_date}) -> every
    notice this module reads, each list newest first."""
    annual, interims, insider, ratings, meetings = [], {}, [], [], []
    inspections: dict = {}
    queries, categories, ipo = [], [], []
    for n in news or []:
        title = n.get("title") or ""
        if _NAV_TITLE_RE.search(title):
            continue
        body = n.get("body") or n.get("news") or ""
        when = _day(n.get("post_date"))
        stripped = _strip_code(title)

        if _ANNUAL_TITLE_RE.search(stripped):
            rec = annual_record(title, body, when)
            if rec:
                annual.append(rec)
        it = parse_interim_post(title, body, when)
        if it:
            key = (it["period_end"], it["months"])
            extra = bool(_ADDITIONAL_RE.search(title))
            have = interims.get(key)
            rank = (not extra, it.get("post_date") or date.min)
            if have is None or rank > have[0]:
                interims[key] = (rank, it)
            continue
        ins = parse_insider(title, body, when)
        if ins:
            insider.append(ins)
            continue
        cr = parse_credit_rating(title, body, when)
        if cr:
            ratings.append(cr)
            continue
        bm = parse_board_meeting(title, body, when)
        if bm:
            meetings.append(bm)
            continue
        if "inspection" in title.lower():
            ip = parse_inspection(title, body, when)
            if ip:
                key = ip["visit_date"] or ip["post_date"]
                if key not in inspections or (ip["post_date"] or date.min) > (inspections[key]["post_date"] or date.min):
                    inspections[key] = ip
                continue
        qr = parse_query_response(title, body, when)
        if qr:
            queries.append(qr)
            continue
        cc = parse_category_change(title, body, when)
        if cc:
            categories.append(cc)
            continue
        if re.search(r"ipo\s+proceeds", title, re.IGNORECASE):
            ipo.append({"post_date": _day(when), "title": title})

    def newest(rows: list[dict], key: str = "post_date") -> list[dict]:
        return sorted(rows, key=lambda r: r.get(key) or date.min, reverse=True)

    return {
        "annual": sorted(annual, key=lambda r: (r["fy_end"], r.get("post_date") or date.min), reverse=True),
        "interims": sorted((v[1] for v in interims.values()),
                           key=lambda r: (r["period_end"], r["months"]), reverse=True),
        "insider_trades": pair_insider_trades(insider),
        "insider_raw": newest(insider),
        "ratings": newest(ratings),
        "board_meetings": newest(meetings),
        "inspections": newest(list(inspections.values())),
        "queries": newest(queries),
        "category_changes": newest(categories),
        "ipo_proceeds": newest(ipo),
    }


# ---------------------------------------------------------------------------
# Loaders (the only DB readers)
# ---------------------------------------------------------------------------

_cached: dict = {}


def _cache(name: str, ttl: int, max_entries: int = 50):
    """db_service's TTL cache, wrapped on first use so importing this module
    never touches the DB layer."""
    fn = _cached.get(name)
    if fn is None:
        from backend.services.db_service import _ttl_cache
        fn = _ttl_cache(ttl, max_entries=max_entries)(globals()[f"_{name}"])
        _cached[name] = fn
    return fn


def _load_company_notices(code: str) -> dict:
    from backend.services.db_service import get_db
    docs = list(get_db().company_news.find(
        {"trading_code": code, "title": {"$not": _NAV_TITLE_RE}},
        {"_id": 0, "title": 1, "body": 1, "post_date": 1},
    ))
    return company_notices(docs)


def load_company_notices(code: str) -> dict:
    """Every notice of one company (cached 300s)."""
    return _cache("load_company_notices", 300, max_entries=200)((code or "").upper())


def _load_all_annual() -> dict[str, dict]:
    from backend.services.db_service import get_db
    by_code: dict[str, list[dict]] = {}
    for d in get_db().company_news.find(
        {"title": {"$regex": _ANNUAL_TITLE_RE.pattern, "$options": "i"},
         "body": {"$regex": "year ended", "$options": "i"}},
        {"_id": 0, "trading_code": 1, "title": 1, "body": 1, "post_date": 1},
    ):
        rec = annual_record(d.get("title") or "", d.get("body") or "", d.get("post_date"))
        if rec:
            by_code.setdefault(d.get("trading_code"), []).append(rec)
    return {c: newest_annual(recs) for c, recs in by_code.items() if c}


def load_annual_results(codes: Optional[list[str]] = None) -> dict[str, dict]:
    """{code: newest yearly figures from a notice} — one query for the market,
    cached 900s."""
    all_ = _cache("load_all_annual", 900, max_entries=2)()
    if codes is None:
        return dict(all_)
    want = {c.upper() for c in codes}
    return {c: r for c, r in all_.items() if c in want}


def _load_ledger_cash() -> dict[str, dict[int, float]]:
    """{code: {fiscal year: cash % declared, interim + final summed}} — the same
    sum scoring fills a blank dividend cell from."""
    from backend.services.db_service import get_db
    out: dict[str, dict[int, float]] = {}
    for d in get_db().dividend_declarations.find(
        {"cash_pct": {"$ne": None}, "period_end": {"$ne": None}},
        {"_id": 0, "trading_code": 1, "period_end": 1, "cash_pct": 1},
    ):
        pe = d.get("period_end")
        try:
            fy = pe.year if isinstance(pe, (datetime, date)) else int(str(pe)[:4])
        except (TypeError, ValueError):
            continue
        per = out.setdefault(d["trading_code"], {})
        per[fy] = per.get(fy, 0.0) + float(d.get("cash_pct") or 0.0)
    return out


def load_ledger_cash() -> dict[str, dict[int, float]]:
    return _cache("load_ledger_cash", 900, max_entries=2)()


def provisional_row_for(code: str, audited_rows: list[dict]) -> Optional[dict]:
    """``provisional_fin_row`` for one company from the cached bulk loaders."""
    annual = load_annual_results([code]).get((code or "").upper())
    if not annual:
        return None
    ledger = (load_ledger_cash().get((code or "").upper()) or {}).get(annual["fy"])
    return provisional_fin_row(annual, audited_rows, ledger)
