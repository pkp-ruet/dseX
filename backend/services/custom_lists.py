"""
Your own research lists — the rules, kept pure so they can be tested.

A Premium reader builds a list from a fixed menu of plain checks, each with a
few allowed settings ("pays at least 4% a year", "price ÷ profit 10 or less",
"in the Bank sector"). The menu is ``CATALOG``; a saved list is a *spec*:

    {"checks": [{"key": "yield_min", "value": 4}, {"key": "grade", "value": 60}],
     "sort": "yield"}

``build_list`` turns a spec into the same ``ResearchList`` the six editorial
lists use, so the funnel, each stock's own figure on every check and "why it
left" all come from ``research_lists`` unchanged.

Settings are a short list of choices, never free numbers: on a phone a chip
row beats a slider, and every value the backend accepts is one we have
written words for.

No performance claims, same as the editorial lists.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Optional

from backend.services import research_lists as rl
from backend.services.research_lists import Check, ResearchList, _n, _r

MAX_CHECKS = 10
MAX_LISTS = 5
NAME_MAX = 40
MEMBERS_CAP = 200


@dataclass(frozen=True)
class Option:
    value: Any
    label_en: str
    label_bn: str


@dataclass(frozen=True)
class CheckDef:
    key: str
    group: str
    name_en: str
    name_bn: str
    make: Callable[[Any], Check]
    options: list[Option] = field(default_factory=list)  # empty = a plain on/off check
    default: Any = True


GROUPS = [
    ("quality", "Quality", "মান"),
    ("price", "Price", "দাম"),
    ("dividends", "Dividends", "লভ্যাংশ"),
    ("growth", "Profit", "লাভ"),
    ("safety", "Safety", "নিরাপত্তা"),
    ("market", "Trading and size", "লেনদেন ও আকার"),
    ("sector", "Sector", "খাত"),
]


def _ok_fn(fn) -> Callable[[Any], Check]:
    """A fixed check that takes no setting."""
    return lambda _v: fn


# ---------------------------------------------------------------------------
# Checks with a setting
# ---------------------------------------------------------------------------

def _grade(v) -> Check:
    words = {45: ("Average or better", "মাঝারি বা তার ওপরে"), 60: ("Good or better", "ভালো বা তার ওপরে"),
             75: ("Excellent", "চমৎকার")}[v]
    return rl.grade_at_least(v, f"Graded {words[0]} ({v}+)", f"গ্রেড {words[1]} ({v}+)")


def _pe_max(v) -> Check:
    def fn(f, ctx):
        pe = _n(f.get("current_pe"))
        if pe is None or pe <= 0:
            return False, "No price ÷ profit (loss or no figures)", "দাম ÷ লাভ নেই (লোকসান বা হিসাব নেই)"
        return pe <= v, f"Price is {_r(pe)}× its profit", f"দাম লাভের {_r(pe)} গুণ"
    return Check(f"pe_max_{v}", f"Price ÷ profit is {v} or less", f"দাম ÷ লাভ {v} বা তার কম", fn)


def _yield_min(v) -> Check:
    def fn(f, ctx):
        y = _n(f.get("div_yield_pct")) or 0.0
        return y >= v, f"Cash dividend worth {_r(y)}% of the price", f"দামের {_r(y)}% নগদ লভ্যাংশ"
    return Check(f"yield_min_{v}", f"Pays at least {v}% of the price a year in cash",
                 f"বছরে দামের অন্তত {v}% নগদ লভ্যাংশ", fn)


def _paid_years(v) -> Check:
    def fn(f, ctx):
        n = f.get("paid_years")
        if n is None:
            return False, "Paid in 2 or fewer of the last 5 years", "গত 5 বছরে 2 বা তার কম বছর দিয়েছে"
        return n >= v, f"Paid in {n} of the last 5 years", f"গত 5 বছরে {n} বছর দিয়েছে"
    return Check(f"paid_years_{v}", f"Paid cash in at least {v} of the last 5 years",
                 f"গত 5 বছরে অন্তত {v} বছর নগদ দিয়েছে", fn)


def _profit_min(v) -> Check:
    def fn(f, ctx):
        val, en, bn = rl.profit_trend(f)
        if val is None:
            return False, "No profit change to compare", "লাভের তুলনা নেই"
        word = "up" if val >= 0 else "down"
        word_bn = "বেশি" if val >= 0 else "কম"
        return val >= v, f"Profit {word} {_r(abs(val), 0)}% ({en})", f"লাভ {_r(abs(val), 0)}% {word_bn} ({bn})"
    label_en = "Profit has not fallen" if v == 0 else f"Profit up at least {v}% on last year"
    label_bn = "লাভ কমেনি" if v == 0 else f"গত বছরের চেয়ে লাভ অন্তত {v}% বেশি"
    return Check(f"profit_min_{v}", label_en, label_bn, fn)


def _roe_min(v) -> Check:
    def fn(f, ctx):
        roe = _n(f.get("roe_pct"))
        if roe is None:
            return False, "No return figure", "আয়ের হার নেই"
        return roe >= v, f"Earns {_r(roe)}% a year on shareholders' money", f"শেয়ারহোল্ডারদের টাকায় বছরে {_r(roe)}% আয়"
    return Check(f"roe_min_{v}", f"Earns at least {v}% a year on shareholders' money",
                 f"শেয়ারহোল্ডারদের টাকায় বছরে অন্তত {v}% আয়", fn)


def _below_high(v) -> Check:
    def fn(f, ctx):
        d = _n(f.get("pct_below_high"))
        if d is None:
            return False, "No 1-year high to compare", "এক বছরের সর্বোচ্চ দাম নেই"
        return d >= v, f"{_r(d, 0)}% below its 1-year high", f"এক বছরের সর্বোচ্চের চেয়ে {_r(d, 0)}% কম"
    return Check(f"below_high_{v}", f"Price at least {v}% below its 1-year high",
                 f"দাম এক বছরের সর্বোচ্চের চেয়ে অন্তত {v}% কম", fn)


_TURNOVER_WORDS = {1: ("৳10 lakh", "৳10 লাখ"), 5: ("৳50 lakh", "৳50 লাখ"), 10: ("৳1 crore", "৳1 কোটি")}


def _turnover(v) -> Check:
    def fn(f, ctx):
        t = _n(f.get("turnover_mn"))
        if t is None:
            return False, "Hardly traded", "প্রায় লেনদেন হয় না"
        en, bn = rl._taka_turnover(t)
        return t >= v, f"{en} traded a day", f"দিনে {bn} লেনদেন"
    w_en, w_bn = _TURNOVER_WORDS[v]
    return Check(f"turnover_{v}", f"Trades at least {w_en} a day", f"দিনে অন্তত {w_bn} লেনদেন", fn)


_MCAP_WORDS = {1000: ("৳100 crore", "৳100 কোটি"), 5000: ("৳500 crore", "৳500 কোটি"),
               20000: ("৳2,000 crore", "৳2,000 কোটি")}


def _mcap(v) -> Check:
    def fn(f, ctx):
        m = _n(f.get("mcap_mn"))
        if m is None:
            return False, "Market value not known", "বাজারমূল্য জানা নেই"
        crore = m / 10
        txt = f"{crore:,.0f}"
        return m >= v, f"Worth ৳{txt} crore on the market", f"বাজারমূল্য ৳{txt} কোটি"
    w_en, w_bn = _MCAP_WORDS[v]
    return Check(f"mcap_{v}", f"Worth at least {w_en} on the market", f"বাজারমূল্য অন্তত {w_bn}", fn)


def _debt(v) -> Check:
    if v == "none":
        return Check("debt_none", "Almost no loans (under 5% of its market value — regular businesses only)",
                     "প্রায় কোনো ঋণ নেই (বাজারমূল্যের 5%-এর কম — শুধু সাধারণ ব্যবসা)", rl._no_loans)
    return rl.DEBT_OK


def _category(v) -> Check:
    if v == "a_only":
        def fn(f, ctx):
            cat = (f.get("cat") or "").strip().upper()
            return cat == "A", f"Category {cat or 'not shown'}", f"{cat or 'অজানা'} ক্যাটাগরি"
        return Check("cat_a", "In category A (pays dividends and holds AGMs on time)",
                     "A ক্যাটাগরিতে (নিয়মিত লভ্যাংশ দেয় ও সময়মতো এজিএম করে)", fn)
    return rl.NOT_Z


def _sector(v) -> Check:
    def fn(f, ctx):
        s = f.get("sector") or ""
        return s == v, s or "Sector not known", s or "খাত জানা নেই"
    return Check("sector", f"In the {v} sector", f"{v} খাতে", fn)


# ---------------------------------------------------------------------------
# On/off checks
# ---------------------------------------------------------------------------

def _buy_today(f, ctx):
    sig = f.get("signal")
    if sig == "buy":
        return True, "A Buy signal today", "আজ 'কিনুন' সংকেত"
    if sig == "sell":
        return False, "A Sell signal today", "আজ 'বিক্রি' সংকেত"
    return False, "No Buy signal today", "আজ 'কিনুন' সংকেত নেই"


def _owners_buying(f, ctx):
    ok, en, bn = rl._two_reports(f, ctx)
    if not ok:
        return ok, en, bn
    ok, en, bn = rl._recent_report(f, ctx)
    if not ok:
        return ok, en, bn
    return rl._sponsor_up(f, ctx)


def _lower_half(f, ctx):
    return rl._price_quiet(f, ctx)


CATALOG: list[CheckDef] = [
    # Quality
    CheckDef("grade", "quality", "Our grade", "আমাদের গ্রেড", _grade,
             [Option(45, "Average+", "মাঝারি+"), Option(60, "Good+", "ভালো+"), Option(75, "Excellent", "চমৎকার")], 60),
    CheckDef("buy_today", "quality", "A Buy signal today", "আজ 'কিনুন' সংকেত",
             _ok_fn(Check("buy_today", "Has a Buy signal today", "আজ 'কিনুন' সংকেত আছে", _buy_today))),
    CheckDef("roe_min", "quality", "Return on shareholders' money", "শেয়ারহোল্ডারদের টাকায় আয়", _roe_min,
             [Option(10, "10%+", "10%+"), Option(15, "15%+", "15%+"), Option(20, "20%+", "20%+")], 15),
    CheckDef("no_governance", "quality", "No auditor or regulator warnings", "নিরীক্ষক বা নিয়ন্ত্রকের সতর্কতা নেই",
             _ok_fn(rl.NO_GOVERNANCE)),
    # Price
    CheckDef("not_expensive", "price", "Price not expensive", "দাম বেশি নয়", _ok_fn(rl.NOT_EXPENSIVE)),
    CheckDef("pe_max", "price", "Price ÷ profit at most", "দাম ÷ লাভ সর্বোচ্চ", _pe_max,
             [Option(8, "8", "8"), Option(10, "10", "10"), Option(15, "15", "15"), Option(20, "20", "20")], 10),
    CheckDef("cheaper_than_own", "price", "Cheaper than its usual", "নিজের স্বাভাবিকের চেয়ে কম দামে",
             _ok_fn(Check("cheaper_than_own", "Priced below its own usual level", "নিজের স্বাভাবিক দামের চেয়ে কম",
                          rl._cheaper_than_own))),
    CheckDef("cheaper_than_sector", "price", "Cheaper than its sector", "খাতের চেয়ে কম দামে",
             _ok_fn(Check("cheaper_than_sector", "Priced below its sector", "খাতের চেয়ে কম দামে",
                          rl._cheaper_than_sector))),
    CheckDef("below_high", "price", "Fallen from its 1-year high", "এক বছরের সর্বোচ্চ থেকে নেমেছে", _below_high,
             [Option(10, "10%+", "10%+"), Option(20, "20%+", "20%+"), Option(30, "30%+", "30%+")], 20),
    CheckDef("lower_half", "price", "Price in the lower half of its year", "দাম বছরের নিচের অর্ধেকে",
             _ok_fn(Check("lower_half", "Price in the lower half of its 1-year range",
                          "দাম এক বছরের সীমার নিচের অর্ধেকে", _lower_half))),
    # Dividends
    CheckDef("yield_min", "dividends", "Cash dividend yield", "নগদ লভ্যাংশের হার", _yield_min,
             [Option(2, "2%+", "2%+"), Option(4, "4%+", "4%+"), Option(6, "6%+", "6%+"), Option(8, "8%+", "8%+")], 4),
    CheckDef("paid_years", "dividends", "Years paid out of 5", "5 বছরে কত বছর দিয়েছে", _paid_years,
             [Option(3, "3+", "3+"), Option(4, "4+", "4+"), Option(5, "All 5", "5টিই")], 5),
    CheckDef("affordable", "dividends", "Dividend is affordable", "লভ্যাংশ সামর্থ্যের মধ্যে",
             _ok_fn(Check("affordable", "Pays out no more than 70% of its profit", "লাভের 70%-এর বেশি লভ্যাংশ দেয় না",
                          rl._affordable))),
    # Profit
    CheckDef("profitable", "growth", "Makes a profit", "লাভে আছে", _ok_fn(rl.PROFITABLE)),
    CheckDef("profit_min", "growth", "Profit change this year", "এ বছর লাভের পরিবর্তন", _profit_min,
             [Option(0, "Not down", "কমেনি"), Option(10, "Up 10%+", "10%+ বেশি"), Option(25, "Up 25%+", "25%+ বেশি")], 10),
    CheckDef("growing", "growth", "Profit grew over 5 years", "5 বছরে লাভ বেড়েছে",
             _ok_fn(Check("growing", "Profit has grown over the last 5 years", "গত 5 বছরে লাভ বেড়েছে", rl._growing))),
    CheckDef("owners_buying", "growth", "Owners are buying", "উদ্যোক্তারা কিনছেন",
             _ok_fn(Check("owners_buying", "Owners raised their stake in the latest report",
                          "সর্বশেষ প্রতিবেদনে উদ্যোক্তারা শেয়ার বাড়িয়েছেন", _owners_buying))),
    # Safety
    CheckDef("debt", "safety", "Loans", "ঋণ", _debt,
             [Option("ok", "Below savings", "সঞ্চয়ের কম"), Option("none", "Almost none", "প্রায় নেই")], "ok"),
    CheckDef("category", "safety", "DSE category", "DSE ক্যাটাগরি", _category,
             [Option("not_z", "Not Z", "Z নয়"), Option("a_only", "A only", "শুধু A")], "not_z"),
    CheckDef("fresh", "safety", "Accounts up to date", "হিসাব হালনাগাদ", _ok_fn(rl.FRESH)),
    # Trading and size
    CheckDef("turnover", "market", "Traded a day", "দিনে লেনদেন", _turnover,
             [Option(1, "৳10 lakh+", "৳10 লাখ+"), Option(5, "৳50 lakh+", "৳50 লাখ+"), Option(10, "৳1 crore+", "৳1 কোটি+")], 1),
    CheckDef("mcap", "market", "Market value", "বাজারমূল্য", _mcap,
             [Option(1000, "৳100 crore+", "৳100 কোটি+"), Option(5000, "৳500 crore+", "৳500 কোটি+"),
              Option(20000, "৳2,000 crore+", "৳2,000 কোটি+")], 5000),
    # Sector — its options are the DSE sectors present today (see catalog()).
    CheckDef("sector", "sector", "Sector", "খাত", _sector, [], None),
]
BY_KEY = {c.key: c for c in CATALOG}

SORTS = {
    "score": ("Best score first", "সবচেয়ে বেশি স্কোর আগে", lambda f: _n(f.get("score")) or 0.0),
    "yield": ("Highest dividend first", "সবচেয়ে বেশি লভ্যাংশ আগে", lambda f: _n(f.get("div_yield_pct")) or 0.0),
    "cheap": ("Lowest price ÷ profit first", "সবচেয়ে কম দাম ÷ লাভ আগে",
              lambda f: -(_n(f.get("current_pe")) or 1e9) if (_n(f.get("current_pe")) or 0) > 0 else -1e9),
    "size": ("Largest first", "সবচেয়ে বড় আগে", lambda f: _n(f.get("mcap_mn")) or 0.0),
    "growth": ("Fastest profit growth first", "সবচেয়ে দ্রুত লাভ বৃদ্ধি আগে",
               lambda f: rl.profit_trend(f)[0] if rl.profit_trend(f)[0] is not None else -1e9),
}
DEFAULT_SORT = "score"

# Ready-made starting points on the builder ("start from …").
TEMPLATES = [
    {"id": "steady_payers", "title_en": "Steady cash payers", "title_bn": "নিয়মিত নগদ দেয়",
     "spec": {"checks": [{"key": "yield_min", "value": 4}, {"key": "paid_years", "value": 5},
                         {"key": "affordable", "value": True}, {"key": "category", "value": "not_z"},
                         {"key": "turnover", "value": 1}], "sort": "yield"}},
    {"id": "good_cheap", "title_en": "Good and cheap", "title_bn": "ভালো আর সস্তা",
     "spec": {"checks": [{"key": "grade", "value": 60}, {"key": "pe_max", "value": 10},
                         {"key": "debt", "value": "ok"}, {"key": "category", "value": "not_z"}], "sort": "cheap"}},
    {"id": "big_growing", "title_en": "Big and growing", "title_bn": "বড় আর বাড়ছে",
     "spec": {"checks": [{"key": "mcap", "value": 5000}, {"key": "profit_min", "value": 10},
                         {"key": "grade", "value": 45}, {"key": "fresh", "value": True}], "sort": "growth"}},
    {"id": "strong_banks", "title_en": "Strong banks", "title_bn": "শক্তিশালী ব্যাংক",
     "spec": {"checks": [{"key": "sector", "value": "Bank"}, {"key": "grade", "value": 60},
                         {"key": "not_expensive", "value": True}], "sort": "score"}},
]


# ---------------------------------------------------------------------------
# Specs
# ---------------------------------------------------------------------------

def catalog(sectors: list[str]) -> dict:
    """The builder's menu, ready for the browser."""
    out = []
    for c in CATALOG:
        opts = c.options
        if c.key == "sector":
            opts = [Option(s, s, s) for s in sorted(sectors)]
        out.append({
            "key": c.key, "group": c.group, "name_en": c.name_en, "name_bn": c.name_bn,
            "options": [{"value": o.value, "label_en": o.label_en, "label_bn": o.label_bn} for o in opts],
            "default": (opts[0].value if c.key == "sector" and opts else c.default),
            "label_en": None if c.options or c.key == "sector" else c.make(True).label_en,
            "label_bn": None if c.options or c.key == "sector" else c.make(True).label_bn,
        })
    return {
        "groups": [{"key": k, "en": en, "bn": bn} for k, en, bn in GROUPS],
        "checks": out,
        "sorts": [{"key": k, "en": v[0], "bn": v[1]} for k, v in SORTS.items()],
        "templates": TEMPLATES,
        "max_checks": MAX_CHECKS,
        "max_lists": MAX_LISTS,
    }


def normalize_spec(spec: Any, sectors: list[str]) -> dict:
    """A clean spec, or ValueError with a short reason. Keeps the reader's
    order, drops nothing silently: an unknown check or setting is an error."""
    if not isinstance(spec, dict):
        raise ValueError("bad_spec")
    raw = spec.get("checks")
    if not isinstance(raw, list) or not raw:
        raise ValueError("no_checks")
    if len(raw) > MAX_CHECKS:
        raise ValueError("too_many_checks")
    seen, checks = set(), []
    for item in raw:
        if not isinstance(item, dict):
            raise ValueError("bad_check")
        key = item.get("key")
        cdef = BY_KEY.get(key)
        if not cdef:
            raise ValueError(f"unknown_check:{key}")
        if key in seen:
            raise ValueError(f"duplicate_check:{key}")
        seen.add(key)
        value = item.get("value", cdef.default)
        if key == "sector":
            if value not in sectors:
                raise ValueError("unknown_sector")
        elif cdef.options:
            allowed = [o.value for o in cdef.options]
            if value not in allowed:
                raise ValueError(f"bad_value:{key}")
        else:
            value = True
        checks.append({"key": key, "value": value})
    sort = spec.get("sort") or DEFAULT_SORT
    if sort not in SORTS:
        raise ValueError("bad_sort")
    return {"checks": checks, "sort": sort}


def build_list(spec: dict, name: str = "Your list") -> ResearchList:
    """A normalized spec -> a runnable ResearchList."""
    checks = [BY_KEY[c["key"]].make(c["value"]) for c in spec["checks"]]
    rank = SORTS[spec.get("sort") or DEFAULT_SORT][2]
    return ResearchList(
        id="custom", slug="", title_en=name, title_bn=name, idea_en="", idea_bn="",
        checks=checks, rank=lambda f: (rank(f), _n(f.get("score")) or 0.0),
        headline=lambda f: ("", ""),
    )


def summary(spec: dict) -> list[dict]:
    """The checks in words, for the saved-list card: [{key, en, bn}]."""
    out = []
    for c in spec.get("checks") or []:
        cdef = BY_KEY.get(c.get("key"))
        if not cdef:
            continue
        try:
            chk = cdef.make(c.get("value"))
        except Exception:  # noqa: BLE001 — a stale setting reads as its name
            out.append({"key": cdef.key, "en": cdef.name_en, "bn": cdef.name_bn})
            continue
        out.append({"key": cdef.key, "en": chk.label_en, "bn": chk.label_bn})
    return out


def clean_name(name: Any) -> str:
    s = " ".join(str(name or "").split())[:NAME_MAX]
    if not s:
        raise ValueError("no_name")
    return s


def diff_members(then: Optional[list[str]], now: list[str]) -> tuple[list[str], list[str]]:
    """(joined, left). ``then`` None = never checked: nothing is news yet."""
    if then is None:
        return [], []
    return rl.diff_codes(then, now)
