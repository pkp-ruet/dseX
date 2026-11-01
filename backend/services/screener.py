"""
The stock screener (`/screener`, rebuilt 2026-11-01) — the rules, kept pure.

The old screener was six graded questions built on our own score ("How good is
the company? Very good" = a score of 75). Nobody could check that against
another site, so it is now a screener of **public numbers**: price, P/E, P/B,
dividend yield, EPS, profit change, ROE, market cap, daily trading, loans,
where the price sits in its year, the 1-year return, sector and DSE category —
the figures any DSE site shows. Our own view (grade, price check, serious
warnings) is one optional group, ``VIEW`` — Premium, screen-only.

A screen is a *spec*:

    {"v": 2,
     "filters": [{"key": "pe", "max": 10}, {"key": "sector", "in": ["Bank"]}],
     "sort": "yield", "dir": "desc"}

A range filter keeps a company whose figure is between ``min`` and ``max``
(both inclusive, either may be left out); a company with no figure drops out
while the filter is on. A set filter keeps the companies whose value is one of
``in``. Every company's figures ship to the browser once (``row_values``), so
the page filters, counts and sorts on the spot; ``apply`` is the same rules
for saved screens and their daily alert. Keep ``frontend/lib/screener.ts`` in
step with ``matches`` / ``apply``.

No performance claims.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional

from backend.services.tiers import TIER_KEYS, TIER_WORDS, TIER_WORDS_BN, tier_key

MAX_FILTERS = 16


def _n(v) -> Optional[float]:
    try:
        x = float(v)
    except (TypeError, ValueError):
        return None
    return None if x != x else x


@dataclass(frozen=True)
class Preset:
    """A ready-made range on a filter's sheet ("Under 10")."""
    min: Optional[float]
    max: Optional[float]
    en: str
    bn: str


@dataclass(frozen=True)
class Opt:
    value: str
    en: str
    bn: str


@dataclass(frozen=True)
class Filter:
    key: str
    group: str
    kind: str              # "range" | "set"
    name_en: str           # plain name, on the filter sheet and the menu
    name_bn: str
    short_en: str          # column head and chip
    short_bn: str
    help_en: str
    help_bn: str
    unit: str = "x"        # taka · pct · x · crore · lakh · paid
    term: Optional[str] = None   # the market word, small, after the plain name
    decimals: int = 1
    presets: tuple = ()
    options: tuple = ()    # set filters; sector's come from the data
    premium: bool = False  # our view: count free, which shares Premium
    signed: bool = False   # a figure that can go either way (change, return)
    high_good: bool = True  # default sort direction when the column is tapped


GROUPS = [
    ("price", "Price", "দাম"),
    ("dividends", "Dividends", "ডিভিডেন্ড"),
    ("profit", "Profit", "মুনাফা"),
    ("size", "Size and trading", "আকার ও লেনদেন"),
    ("basics", "Sector and category", "সেক্টর ও ক্যাটাগরি"),
    ("view", "TopStockBD's view", "টপস্টকবিডির মত"),
]

P = Preset

FILTERS: list[Filter] = [
    # Price
    Filter("price", "price", "range", "Share price", "শেয়ারের দাম", "Price", "দাম",
           "The official closing price of one share, in taka.",
           "একটি শেয়ারের অফিশিয়াল ক্লোজিং দাম, টাকায়।",
           unit="taka", presets=(P(None, 20, "Under ৳20", "৳20-এর কম"), P(20, 50, "৳20 to ৳50", "৳20 থেকে ৳50"),
                                 P(50, 200, "৳50 to ৳200", "৳50 থেকে ৳200"), P(200, None, "Over ৳200", "৳200-এর বেশি"))),
    Filter("change", "price", "range", "Today's price change", "আজকের দাম বদল", "Today", "আজ",
           "How much the price moved today against yesterday's close.",
           "গতকালের ক্লোজিং দামের তুলনায় আজ দাম কতটা বদলেছে।",
           unit="pct", signed=True,
           presets=(P(None, -2, "Down 2% or more", "2% বা বেশি কমেছে"), P(None, 0, "Down", "কমেছে"),
                    P(0, None, "Up", "বেড়েছে"), P(2, None, "Up 2% or more", "2% বা বেশি বেড়েছে"))),
    Filter("pe", "price", "range", "Years of profit you pay for", "দামে কত বছরের মুনাফা", "P/E", "পিই",
           "The price divided by one year's profit per share. 10 means you pay for 10 years of today's profit. "
           "A company with a loss has no P/E, so it drops out.",
           "দামকে এক বছরের শেয়ারপ্রতি মুনাফা দিয়ে ভাগ। 10 মানে আজকের দামে 10 বছরের মুনাফা কিনছেন। "
           "লোকসানি কোম্পানির পিই নেই, তাই সেটি বাদ পড়ে।",
           term="P/E", high_good=False,
           presets=(P(None, 10, "Under 10", "10-এর কম"), P(10, 15, "10 to 15", "10 থেকে 15"),
                    P(15, 25, "15 to 25", "15 থেকে 25"), P(25, None, "Over 25", "25-এর বেশি"))),
    Filter("pb", "price", "range", "Price against what it owns", "সম্পদের তুলনায় দাম", "P/B", "পিবি",
           "The price divided by the company's assets less its debts, per share. Under 1 means "
           "the price is below what the company owns on paper.",
           "দামকে শেয়ারপ্রতি নিট সম্পদ (সম্পদ থেকে দেনা বাদ) দিয়ে ভাগ। 1-এর কম মানে "
           "কাগজে কোম্পানির যা আছে, দাম তার চেয়ে কম।",
           term="P/B", decimals=2, high_good=False,
           presets=(P(None, 1, "Under 1", "1-এর কম"), P(1, 2, "1 to 2", "1 থেকে 2"),
                    P(2, 4, "2 to 4", "2 থেকে 4"), P(4, None, "Over 4", "4-এর বেশি"))),
    Filter("range_pos", "price", "range", "Where the price sits in its year", "বছরের মধ্যে দাম কোথায়",
           "1-yr range", "বছরের অবস্থান",
           "0% is the lowest price of the last 12 months, 100% the highest.",
           "0% মানে গত 12 মাসের সবচেয়ে কম দাম, 100% মানে সবচেয়ে বেশি।",
           unit="pct", decimals=0, high_good=False,
           presets=(P(None, 20, "Near the low", "সর্বনিম্নের কাছে"), P(None, 50, "Lower half", "নিচের অর্ধেকে"),
                    P(50, None, "Upper half", "ওপরের অর্ধেকে"), P(80, None, "Near the high", "সর্বোচ্চের কাছে"))),
    Filter("ret_1y", "price", "range", "Price change over 1 year", "1 বছরে দাম বদল", "1 year", "1 বছর",
           "The price today against a year ago, with dividends and bonus shares since then taken into account.",
           "এক বছর আগের তুলনায় আজকের দাম, এর মধ্যে দেওয়া ডিভিডেন্ড ও বোনাস শেয়ার হিসাবে ধরে।",
           unit="pct", decimals=0, signed=True,
           presets=(P(None, -20, "Fell 20% or more", "20% বা বেশি কমেছে"), P(None, 0, "Fell", "কমেছে"),
                    P(0, None, "Rose", "বেড়েছে"), P(30, None, "Rose 30% or more", "30% বা বেশি বেড়েছে"))),
    # Dividends
    Filter("yield", "dividends", "range", "Cash dividend a year", "বছরে নগদ ডিভিডেন্ড", "Yield", "ইল্ড",
           "The last year's cash dividend against today's price. 5% means ৳500 a year on ৳10,000. "
           "A company that paid no cash shows 0%.",
           "গত বছরের নগদ ডিভিডেন্ড, আজকের দামের তুলনায়। 5% মানে ৳10,000-এ বছরে ৳500। "
           "নগদ না দেওয়া কোম্পানি 0% দেখায়।",
           unit="pct", term="dividend yield",
           presets=(P(0.1, None, "Pays cash", "নগদ দেয়"), P(3, None, "3% or more", "3% বা বেশি"),
                    P(5, None, "5% or more", "5% বা বেশি"), P(8, None, "8% or more", "8% বা বেশি"))),
    Filter("paid", "dividends", "range", "Years it paid cash, of the last 5", "গত 5 বছরে কত বছর নগদ দিয়েছে",
           "Paid", "দিয়েছে",
           "How many of the last 5 years it paid a cash dividend.",
           "গত 5 বছরের কত বছর নগদ ডিভিডেন্ড দিয়েছে।",
           unit="paid", decimals=0,
           presets=(P(3, None, "3 years or more", "3 বছর বা বেশি"), P(4, None, "4 years or more", "4 বছর বা বেশি"),
                    P(5, None, "All 5 years", "5 বছরই"))),
    # Profit
    Filter("eps", "profit", "range", "Profit per share", "শেয়ারপ্রতি মুনাফা", "EPS", "ইপিএস",
           "One year's profit divided by the number of shares. When a newer quarterly report is out, "
           "it is the last 12 months.",
           "এক বছরের মুনাফাকে শেয়ারসংখ্যা দিয়ে ভাগ। নতুন প্রান্তিকের প্রতিবেদন এলে গত 12 মাসের হিসাব।",
           unit="taka", term="EPS", decimals=2,
           presets=(P(None, 0, "A loss", "লোকসান"), P(0, None, "Makes a profit", "মুনাফায় আছে"),
                    P(2, None, "৳2 or more", "৳2 বা বেশি"), P(5, None, "৳5 or more", "৳5 বা বেশি"))),
    Filter("profit_change", "profit", "range", "Profit change on last year", "গত বছরের তুলনায় মুনাফা বদল",
           "Profit change", "মুনাফা বদল",
           "Profit so far this year against the same months last year, from the latest quarterly report; "
           "else the last full year against the year before.",
           "সর্বশেষ প্রান্তিকের প্রতিবেদন থেকে এ বছর এ পর্যন্ত মুনাফা, গত বছরের একই সময়ের তুলনায়; "
           "না থাকলে গত পুরো বছর, তার আগের বছরের তুলনায়।",
           unit="pct", decimals=0, signed=True,
           presets=(P(None, -25, "Fell 25% or more", "25% বা বেশি কমেছে"), P(None, 0, "Fell", "কমেছে"),
                    P(0, None, "Grew", "বেড়েছে"), P(25, None, "Grew 25% or more", "25% বা বেশি বেড়েছে"))),
    Filter("roe", "profit", "range", "Profit on shareholders' money", "শেয়ারহোল্ডারদের টাকায় মুনাফা",
           "ROE", "আরওই",
           "The profit a year for every ৳100 the owners have in the company.",
           "কোম্পানিতে মালিকদের প্রতি ৳100-এ বছরে কত মুনাফা হয়।",
           unit="pct", term="ROE", decimals=0,
           presets=(P(None, 5, "Under 5%", "5%-এর কম"), P(5, 10, "5% to 10%", "5% থেকে 10%"),
                    P(10, 20, "10% to 20%", "10% থেকে 20%"), P(20, None, "Over 20%", "20%-এর বেশি"))),
    # Size and trading
    Filter("mcap", "size", "range", "Company size", "কোম্পানির আকার", "Market cap", "বাজার মূলধন",
           "What all its shares are worth together at today's price.",
           "আজকের দামে কোম্পানির সব শেয়ারের মোট দাম।",
           unit="crore", term="market cap", decimals=0,
           presets=(P(None, 100, "Under ৳100 crore", "৳100 কোটির কম"),
                    P(100, 500, "৳100 to ৳500 crore", "৳100 থেকে ৳500 কোটি"),
                    P(500, 2000, "৳500 to ৳2,000 crore", "৳500 থেকে ৳2,000 কোটি"),
                    P(2000, None, "Over ৳2,000 crore", "৳2,000 কোটির বেশি"))),
    Filter("turnover", "size", "range", "Daily trading", "দৈনিক লেনদেন", "Trading a day", "দৈনিক লেনদেন",
           "The money that changed hands in the share each day, on average over the last 7 trading days. "
           "More means it is easier to buy and sell.",
           "গত 7 লেনদেনের দিনে গড়ে প্রতিদিন কত টাকার শেয়ার কেনাবেচা হয়েছে। বেশি মানে সহজে কেনা-বেচা যায়।",
           unit="lakh", term="turnover", decimals=0,
           presets=(P(None, 10, "Under ৳10 lakh", "৳10 লাখের কম"), P(10, 50, "৳10 to ৳50 lakh", "৳10 থেকে ৳50 লাখ"),
                    P(50, 100, "৳50 lakh to ৳1 crore", "৳50 লাখ থেকে ৳1 কোটি"),
                    P(100, None, "Over ৳1 crore", "৳1 কোটির বেশি"))),
    Filter("loans", "size", "range", "Loans against its market value", "বাজার মূলধনের তুলনায় ঋণ",
           "Loans", "ঋণ",
           "Its bank loans as a share of what the company is worth on the market. "
           "Banks, finance companies and insurers lend or hold money for a living, so they are left out.",
           "কোম্পানির ব্যাংক ঋণ, বাজারে তার মোট দামের কত অংশ। "
           "ব্যাংক, আর্থিক প্রতিষ্ঠান ও বিমা কোম্পানির কাজই টাকা ধার দেওয়া বা রাখা, তাই এগুলো বাদ।",
           unit="pct", decimals=0, high_good=False,
           presets=(P(None, 5, "Almost none", "প্রায় নেই"), P(None, 25, "Under 25%", "25%-এর কম"),
                    P(25, 100, "25% to 100%", "25% থেকে 100%"), P(100, None, "More than its value", "মূল্যের চেয়ে বেশি"))),
    # Sector and category
    Filter("sector", "basics", "set", "Sector", "সেক্টর", "Sector", "সেক্টর",
           "The DSE sector the company is listed in. Pick one or several.",
           "ডিএসইতে কোম্পানিটি যে সেক্টরে তালিকাভুক্ত। এক বা একাধিক বাছুন।"),
    Filter("category", "basics", "set", "DSE category", "ডিএসই ক্যাটাগরি", "Category", "ক্যাটাগরি",
           "DSE's own grouping. A holds its AGM and pays at least 10% a year; B pays less; "
           "N is newly listed; Z has missed an AGM or a dividend.",
           "ডিএসইর নিজের শ্রেণি। A সময়মতো এজিএম করে ও বছরে অন্তত 10% দেয়; B এর কম দেয়; "
           "N নতুন তালিকাভুক্ত; Z এজিএম বা ডিভিডেন্ড বাদ দিয়েছে।",
           options=(Opt("A", "A", "A"), Opt("B", "B", "B"), Opt("N", "N", "N"), Opt("Z", "Z", "Z"))),
    # Our view (Premium)
    Filter("grade", "view", "set", "Our grade of the company", "কোম্পানির ওপর আমাদের গ্রেড", "Our grade", "আমাদের গ্রেড",
           "How strong the business is on our five checks of its accounts.",
           "হিসাবের পাঁচটি দিক দেখে ব্যবসাটি কতটা শক্তিশালী।",
           options=tuple(Opt(k, TIER_WORDS[k], TIER_WORDS_BN[k]) for k in TIER_KEYS), premium=True),
    Filter("price_word", "view", "set", "Our check of the price", "দাম নিয়ে আমাদের যাচাই", "Our price check", "আমাদের দাম যাচাই",
           "Whether the price is low, fair or high for what the company earns and owns, "
           "against its own past and similar companies.",
           "কোম্পানি যা আয় করে আর যা আছে, তার তুলনায় দাম কম, ন্যায্য না বেশি, "
           "নিজের অতীত আর একই ধরনের কোম্পানির সঙ্গে তুলনা করে।",
           options=(Opt("low", "Low price", "কম দাম"), Opt("fair", "Fair price", "ন্যায্য দাম"),
                    Opt("high", "High price", "বেশি দাম")), premium=True),
    Filter("warnings", "view", "set", "Serious warnings", "গুরুতর সতর্কতা", "Warnings", "সতর্কতা",
           "Serious problems our report finds, such as an auditor's warning, a closed factory "
           "or loans over the company's value.",
           "আমাদের রিপোর্টে পাওয়া গুরুতর সমস্যা, যেমন নিরীক্ষকের সতর্কতা, বন্ধ কারখানা "
           "বা কোম্পানির মূল্যের চেয়ে বেশি ঋণ।",
           options=(Opt("none", "No serious warnings", "গুরুতর সতর্কতা নেই"),
                    Opt("some", "Has a serious warning", "গুরুতর সতর্কতা আছে")), premium=True),
]
BY_KEY = {f.key: f for f in FILTERS}
SORT_KEYS = {f.key for f in FILTERS if f.kind == "range"} | {"name"}
DEFAULT_SORT, DEFAULT_DIR = "mcap", "desc"
_LENDERS = {"BANK", "NBFI", "INSURANCE"}


# ---------------------------------------------------------------------------
# Figures
# ---------------------------------------------------------------------------

def _price_word(p4) -> Optional[str]:
    """The signal's own price bands: ≥ 7 low, < 4 high."""
    p4 = _n(p4)
    if p4 is None:
        return None
    return "low" if p4 >= 7 else "high" if p4 < 4 else "fair"


def _r(v, d: int = 2) -> Optional[float]:
    v = _n(v)
    return None if v is None else round(v, d)


def row_values(f: dict, ret_1y: Optional[float] = None, red: Optional[int] = None) -> dict:
    """One company's figure on every filter. ``f`` = the research-list facts
    (score row + price, 52-week range, turnover); ``red`` = serious warnings in
    its newest stock-report snapshot (None = no snapshot)."""
    pe, pb = _n(f.get("current_pe")), _n(f.get("current_pb"))
    mcap, turn = _n(f.get("mcap_mn")), _n(f.get("turnover_mn"))
    lender = (f.get("sector_class") or "").upper() in _LENDERS
    paid = f.get("paid_years")
    cat = (f.get("cat") or "").strip().upper() or None
    score = _n(f.get("score"))
    return {
        "price": _r(f.get("ltp")),
        "change": _r(f.get("change_pct")),
        "pe": _r(pe) if pe and pe > 0 else None,
        "pb": _r(pb) if pb and pb > 0 else None,
        "range_pos": _r(f.get("pct_in_range"), 1),
        "ret_1y": _r(ret_1y, 1),
        "yield": _r(_n(f.get("div_yield_pct")) or 0.0),
        # 3/4/5 of the last five years; 2 stands for "2 or fewer".
        "paid": int(paid) if paid else 2,
        "eps": _r(f.get("eps")),
        "profit_change": _r(f.get("profit_change_pct"), 1),
        "roe": _r(f.get("roe_pct"), 1),
        "mcap": _r(mcap / 10, 1) if mcap is not None else None,         # ৳ million -> crore
        "turnover": _r(turn * 10, 1) if turn is not None else None,     # ৳ million -> lakh
        "loans": None if lender else _r(f.get("loan_pct_mcap"), 1),
        "sector": f.get("sector") or None,
        "category": cat if cat in ("A", "B", "N", "Z") else None,
        "grade": tier_key(score) if score is not None else None,
        "price_word": _price_word(f.get("p4_val")),
        "warnings": None if red is None else ("some" if red > 0 else "none"),
    }


# ---------------------------------------------------------------------------
# Specs
# ---------------------------------------------------------------------------

def is_v2(spec: Any) -> bool:
    return isinstance(spec, dict) and isinstance(spec.get("filters"), list)


def _num(v, key: str) -> Optional[float]:
    if v is None or v == "":
        return None
    x = _n(v)
    if x is None or abs(x) > 1e9:
        raise ValueError(f"bad_value:{key}")
    return x


def normalize_spec(spec: Any, sectors: list[str]) -> dict:
    """A clean v2 spec, or ValueError with a short reason. Keeps the reader's
    order; an unknown filter or value is an error, never dropped silently."""
    if not is_v2(spec):
        raise ValueError("bad_spec")
    raw = spec["filters"]
    if len(raw) > MAX_FILTERS:
        raise ValueError("too_many_filters")
    seen, out = set(), []
    for item in raw:
        if not isinstance(item, dict):
            raise ValueError("bad_filter")
        key = item.get("key")
        fd = BY_KEY.get(key)
        if not fd:
            raise ValueError(f"unknown_filter:{key}")
        if key in seen:
            raise ValueError(f"duplicate_filter:{key}")
        seen.add(key)
        if fd.kind == "range":
            lo, hi = _num(item.get("min"), key), _num(item.get("max"), key)
            if lo is None and hi is None:
                raise ValueError(f"empty_filter:{key}")
            if lo is not None and hi is not None and lo > hi:
                lo, hi = hi, lo
            clean = {"key": key}
            if lo is not None:
                clean["min"] = lo
            if hi is not None:
                clean["max"] = hi
            out.append(clean)
        else:
            vals = item.get("in")
            if not isinstance(vals, list) or not vals:
                raise ValueError(f"empty_filter:{key}")
            allowed = sectors if key == "sector" else [o.value for o in fd.options]
            if any(not isinstance(v, str) or v not in allowed for v in vals):
                raise ValueError("unknown_sector" if key == "sector" else f"bad_value:{key}")
            out.append({"key": key, "in": sorted(set(vals), key=allowed.index)})
    sort = spec.get("sort") or DEFAULT_SORT
    if sort not in SORT_KEYS:
        raise ValueError("bad_sort")
    d = spec.get("dir") or (DEFAULT_DIR if sort == DEFAULT_SORT else "asc")
    if d not in ("asc", "desc"):
        raise ValueError("bad_dir")
    return {"v": 2, "filters": out, "sort": sort, "dir": d}


def matches(values: dict, filters: list[dict]) -> bool:
    """Passes every filter. A missing figure fails an active filter."""
    for flt in filters:
        v = values.get(flt["key"])
        if v is None:
            return False
        if "in" in flt:
            if v not in flt["in"]:
                return False
            continue
        if flt.get("min") is not None and v < flt["min"]:
            return False
        if flt.get("max") is not None and v > flt["max"]:
            return False
    return True


def apply(rows: list[dict], spec: dict) -> list[dict]:
    """The rows that pass, in the spec's order; a missing figure sorts last,
    ties by code. ``rows`` = [{"code", "name", "v": row_values}]."""
    kept = [r for r in rows if matches(r["v"], spec.get("filters") or [])]
    key, desc = spec.get("sort") or DEFAULT_SORT, (spec.get("dir") or DEFAULT_DIR) == "desc"
    if key == "name":
        return sorted(kept, key=lambda r: ((r.get("name") or r["code"]).lower(), r["code"]), reverse=desc)
    have = [r for r in kept if r["v"].get(key) is not None]
    none = sorted((r for r in kept if r["v"].get(key) is None), key=lambda r: r["code"])
    have.sort(key=lambda r: r["code"])
    have.sort(key=lambda r: r["v"][key], reverse=desc)
    return have + none


# ---------------------------------------------------------------------------
# Words
# ---------------------------------------------------------------------------

def fmt(v: float, unit: str, decimals: int = 1, bn: bool = False) -> str:
    """A figure the way a chip says it: ৳12.5 · 5% · 10 · ৳500 crore · ৳50 lakh."""
    s = f"{v:,.{decimals}f}"
    if "." in s:
        s = s.rstrip("0").rstrip(".")
    if unit == "taka":
        return f"৳{s}"
    if unit == "pct":
        return f"{s}%"
    if unit == "crore":
        return f"৳{s} {'কোটি' if bn else 'crore'}"
    if unit == "lakh":
        if v >= 100:  # ৳100 lakh = ৳1 crore
            return fmt(v / 100, "crore", 1, bn)
        return f"৳{s} {'লাখ' if bn else 'lakh'}"
    if unit == "paid":
        return f"{s} {'বছর' if bn else ('year' if s == '1' else 'years')}"
    return s


def range_words(fd: Filter, lo: Optional[float], hi: Optional[float], bn: bool = False) -> str:
    """A range in words: its preset's label when it is one, else
    "10 or less" / "5% or more" / "10 to 15"."""
    for p in fd.presets:
        if p.min == lo and p.max == hi:
            return p.bn if bn else p.en
    a = fmt(lo, fd.unit, fd.decimals, bn) if lo is not None else None
    b = fmt(hi, fd.unit, fd.decimals, bn) if hi is not None else None
    if a and b:
        return f"{a} থেকে {b}" if bn else f"{a} to {b}"
    if a:
        return f"{a} বা বেশি" if bn else f"{a} or more"
    return f"{b} বা কম" if bn else f"{b} or less"


def filter_words(flt: dict, bn: bool = False) -> str:
    fd = BY_KEY[flt["key"]]
    head = fd.short_bn if bn else fd.short_en
    if fd.kind == "range":
        return f"{head}: {range_words(fd, flt.get('min'), flt.get('max'), bn)}"
    if fd.key == "category" and flt["in"] == ["A", "B", "N"]:
        return f"{head}: {'Z ছাড়া' if bn else 'not Z'}"
    by = {o.value: (o.bn if bn else o.en) for o in fd.options}
    return f"{head}: {', '.join(by.get(v, v) for v in flt['in'])}"


def summary(spec: dict) -> list[dict]:
    """The filters in words, for a saved-screen card: [{key, en, bn}]."""
    out = []
    for flt in spec.get("filters") or []:
        if flt.get("key") in BY_KEY:
            out.append({"key": flt["key"], "en": filter_words(flt), "bn": filter_words(flt, True)})
    return out


# ---------------------------------------------------------------------------
# Ready-made screens
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class ReadyScreen:
    id: str
    title_en: str
    title_bn: str
    blurb_en: str
    blurb_bn: str
    filters: tuple
    sort: str
    dir: str
    metric: str  # the figure a card shows beside each share
    extra: tuple = field(default_factory=tuple)

    def spec(self) -> dict:
        return {"v": 2, "filters": [dict(f) for f in self.filters], "sort": self.sort, "dir": self.dir}


# Most ready-made screens also leave out category Z and shares that hardly
# trade (under ৳10 lakh a day): otherwise the top of "High dividend" is a
# Z-category share with a stale price and a 38% yield. Both are ordinary
# filters the reader sees and can remove.
NOT_Z = {"key": "category", "in": ["A", "B", "N"]}
TRADED = {"key": "turnover", "min": 10}

READY: list[ReadyScreen] = [
    ReadyScreen("high_dividend", "High dividend", "বেশি ডিভিডেন্ড",
                "Paid 5% or more of the price in cash last year", "গত বছর দামের 5% বা বেশি নগদ দিয়েছে",
                ({"key": "yield", "min": 5}, NOT_Z, TRADED), "yield", "desc", "yield"),
    ReadyScreen("low_pe", "Low P/E", "কম পিই",
                "The price is under 10 years of its profit", "দাম 10 বছরের মুনাফার কম",
                ({"key": "pe", "max": 10}, NOT_Z, TRADED), "pe", "asc", "pe"),
    ReadyScreen("below_book", "Below what it owns", "সম্পদের চেয়ে কম দামে",
                "The price is under the company's net assets per share, and it makes a profit",
                "দাম শেয়ারপ্রতি নিট সম্পদের চেয়ে কম, আর মুনাফায় আছে",
                ({"key": "pb", "max": 1}, {"key": "eps", "min": 0}, NOT_Z, TRADED), "pb", "asc", "pb"),
    ReadyScreen("near_low", "Near its 1-year low", "বছরের সর্বনিম্নের কাছে",
                "The price is close to its lowest point of the last 12 months",
                "দাম গত 12 মাসের সবচেয়ে কম দামের কাছাকাছি",
                ({"key": "range_pos", "max": 20}, NOT_Z, TRADED), "mcap", "desc", "range_pos"),
    ReadyScreen("profit_up", "Profit growing", "মুনাফা বাড়ছে",
                "Profit up 25% or more on last year", "গত বছরের চেয়ে মুনাফা 25% বা বেশি",
                ({"key": "profit_change", "min": 25}, {"key": "eps", "min": 0}, NOT_Z, TRADED),
                "mcap", "desc", "profit_change"),
    ReadyScreen("biggest", "Biggest companies", "সবচেয়ে বড় কোম্পানি",
                "Worth over ৳2,000 crore on the market", "বাজার মূলধন ৳2,000 কোটির বেশি",
                ({"key": "mcap", "min": 2000},), "mcap", "desc", "mcap"),
    ReadyScreen("most_traded", "Most traded", "সবচেয়ে বেশি লেনদেন",
                "Over ৳1 crore bought and sold a day", "দিনে ৳1 কোটির বেশি কেনাবেচা",
                ({"key": "turnover", "min": 100},), "turnover", "desc", "turnover"),
    ReadyScreen("no_loans", "Almost no loans", "প্রায় ঋণ নেই",
                "Loans under 5% of its market value, and it makes a profit",
                "ঋণ বাজার মূলধনের 5%-এর কম, আর মুনাফায় আছে",
                ({"key": "loans", "max": 5}, {"key": "eps", "min": 0}, NOT_Z, TRADED), "mcap", "desc", "loans"),
    ReadyScreen("a_payers", "Category A, paying 3%+", "A ক্যাটাগরি, 3%+ দেয়",
                "In DSE's category A and paid 3% or more in cash", "ডিএসইর A ক্যাটাগরিতে, আর 3% বা বেশি নগদ দিয়েছে",
                ({"key": "category", "in": ["A"]}, {"key": "yield", "min": 3}, TRADED), "yield", "desc", "yield"),
]
READY_BY_ID = {r.id: r for r in READY}


def metric_words(key: str, v: Any) -> dict:
    """{en, bn} for a share's figure on one filter ("Yield 7.2%")."""
    fd = BY_KEY.get(key)
    if fd is None or v is None or fd.kind != "range":
        return {"en": "", "bn": ""}
    return {"en": f"{fd.short_en} {fmt(v, fd.unit, fd.decimals)}",
            "bn": f"{fd.short_bn} {fmt(v, fd.unit, fd.decimals, True)}"}


# ---------------------------------------------------------------------------
# Old screens (saved before 2026-11-01)
# ---------------------------------------------------------------------------

def from_checks(checks: list[dict], categories: tuple = ("A", "B", "N", "Z")) -> tuple[list[dict], list[str]]:
    """An old saved screen's checks as filters, as close as the public figures
    allow: (filters, keys of checks with no filter). The old screen keeps
    running as it was until the reader edits it."""
    out: dict[str, dict] = {}
    dropped: list[str] = []

    def put(key, **kw):
        cur = out.setdefault(key, {"key": key})
        for k, v in kw.items():
            if k == "min":
                cur["min"] = max(cur.get("min", v), v)
            elif k == "max":
                cur["max"] = min(cur.get("max", v), v)
            else:
                cur[k] = v

    for c in checks or []:
        k, v = c.get("key"), c.get("value")
        if k == "pe_max":
            put("pe", max=float(v))
        elif k == "yield_min":
            put("yield", min=float(v))
        elif k == "paid_years":
            put("paid", min=float(v))
        elif k == "roe_min":
            put("roe", min=float(v))
        elif k == "profit_min":
            put("profit_change", min=float(v))
        elif k == "profitable":
            put("eps", min=0.0)
        elif k == "lower_half":
            put("range_pos", max=50.0)
        elif k == "turnover":
            put("turnover", min=float(v) * 10)
        elif k == "mcap":
            put("mcap", min=float(v) / 10)
        elif k == "category":
            put("category", **{"in": ["A"] if v == "a_only" else [x for x in categories if x != "Z"]})
        elif k == "debt" and v == "none":
            put("loans", max=5.0)
        elif k == "sector":
            names = [v] if isinstance(v, str) else list(v or [])
            put("sector", **{"in": names})
        elif k == "grade":
            keep = [t for t, cut in (("excellent", 75), ("good", 60), ("average", 45), ("weak", 0)) if cut >= float(v)]
            put("grade", **{"in": keep})
        elif k == "not_expensive":
            put("price_word", **{"in": ["low", "fair"]})
        else:
            dropped.append(k)
    return list(out.values()), dropped
