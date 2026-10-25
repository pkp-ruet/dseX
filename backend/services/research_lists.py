"""
Research lists — the rules, kept pure (no database) so they can be tested.

Each list is ONE idea tested in the open: a short run of plain checks applied
in order to every scored company. The page shows how many companies are left
after each check (the funnel), the stocks that pass every check, each stock's
own number on every check, and — from the daily snapshots — who joined or
left and which check a leaver now fails.

A check is ``fn(facts, ctx) -> (ok, value_en, value_bn)``: ``facts`` is one
company's flat dict (built by ``research_lists_service.build_facts``) and
``ctx`` supplies the slow lookups (governance news) only for companies that
reach that check. ``value_*`` is the company's own figure in words, shown on
its research card and as the reason it left a list.

No performance claims: nothing here or on the page says how a list's stocks
did after they joined it.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Optional

from backend.services.tiers import TIER_WORDS, TIER_WORDS_BN, tier_key

# Shared thresholds (same lines the signal and the stock page draw).
MIN_TURNOVER_MN = 1.0          # signal_service: thin trading below Tk 1mn a day
EARNINGS_DROP_PCT = -25.0      # signal_service.EARNINGS_DROP_PCT (value-trap guard)
EXPENSIVE_P4 = 4.0             # stock_facts / signal_service valuation bands
OWNERSHIP_MOVE_PP = 0.5        # stock_facts.OWNERSHIP_MOVE_PP
OWNERSHIP_JUMP_PP = 5.0        # stock_facts.OWNERSHIP_JUMP_PP (reclassification, not buying)
SHAREHOLDING_MAX_AGE_DAYS = 150
LIST_CAP = 20

_LENDERS = {"BANK", "NBFI"}
_NO_DEBT_TEST = {"BANK", "NBFI", "INSURANCE"}

CheckFn = Callable[[dict, "Ctx"], tuple[bool, str, str]]


class Ctx:
    """Slow, per-company lookups the service supplies. Defaults are empty so
    tests can build facts alone."""

    def __init__(self, governance: Optional[Callable[[str], list[dict]]] = None,
                 today: Optional[str] = None):
        self._gov = governance or (lambda code: [])
        self._gov_cache: dict[str, list[dict]] = {}
        self.today = today

    def governance(self, code: str) -> list[dict]:
        if code not in self._gov_cache:
            self._gov_cache[code] = self._gov(code) or []
        return self._gov_cache[code]


@dataclass(frozen=True)
class Check:
    key: str
    label_en: str
    label_bn: str
    fn: CheckFn


@dataclass(frozen=True)
class Column:
    key: str
    label_en: str
    label_bn: str
    fmt: str  # pct | x | pp | score | num


@dataclass(frozen=True)
class ResearchList:
    id: str
    slug: str
    title_en: str
    title_bn: str
    idea_en: str
    idea_bn: str
    checks: list[Check]
    rank: Callable[[dict], float]
    headline: Callable[[dict], tuple[str, str]]
    columns: list[Column] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------

def _n(v) -> Optional[float]:
    if v is None or isinstance(v, bool):
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if f != f else f  # NaN -> None


def _r(v: float, nd: int = 1) -> str:
    """Tidy number for prose: 42.0 -> '42', 42.24 -> '42.2'."""
    s = f"{v:.{nd}f}"
    return s.rstrip("0").rstrip(".") if "." in s else s


def _taka_turnover(mn: float) -> tuple[str, str]:
    """Tk million -> '৳45 lakh' / '৳3.2 crore' (1 crore = Tk 10mn)."""
    if mn >= 10:
        c = _r(mn / 10, 1)
        return f"৳{c} crore", f"৳{c} কোটি"
    lakh = _r(mn * 10, 0)
    return f"৳{lakh} lakh", f"৳{lakh} লাখ"


def grade_words(score) -> tuple[str, str]:
    key = tier_key(_n(score))
    return TIER_WORDS.get(key, "Not rated"), TIER_WORDS_BN.get(key, "রেটিং নেই")


def _days_between(a: Optional[str], b: Optional[str]) -> Optional[int]:
    from datetime import date
    try:
        return (date.fromisoformat(str(b)[:10]) - date.fromisoformat(str(a)[:10])).days
    except (TypeError, ValueError):
        return None


def profit_trend(f: dict) -> tuple[Optional[float], str, str]:
    """This year's profit move (quarterly report first, else the last full
    year) — the figure the value-trap guard reads."""
    iy = _n(f.get("interim_eps_yoy_pct"))
    if iy is not None:
        return iy, f.get("interim_label_en") or "so far this year", f.get("interim_label_bn") or "এ বছর এ পর্যন্ত"
    fy = _n(f.get("eps_yoy_pct"))
    return fy, "last full year", "গত পুরো বছর"


# ---------------------------------------------------------------------------
# Shared checks
# ---------------------------------------------------------------------------

def _not_z(f, ctx):
    cat = (f.get("cat") or "").strip().upper()
    if cat == "Z":
        return False, "In category Z", "Z ক্যাটাগরিতে"
    if not cat or cat == "-":
        return True, "Category not shown by DSE", "DSE ক্যাটাগরি দেখায়নি"
    return True, f"Category {cat}", f"{cat} ক্যাটাগরি"


NOT_Z = Check("not_z",
              "Not in category Z (companies that skip AGMs or dividends)",
              "Z ক্যাটাগরিতে নয় (যারা এজিএম বা লভ্যাংশ বাদ দেয়)", _not_z)


def _fresh(f, ctx):
    y = f.get("last_reported_year")
    ys = f"FY{int(y)}" if _n(y) is not None else None
    if f.get("stale"):
        return False, f"Latest yearly accounts: {ys or 'old'}", f"সর্বশেষ বার্ষিক হিসাব: {ys or 'পুরোনো'}"
    return True, f"Accounts for {ys}" if ys else "Accounts up to date", f"{ys}-এর হিসাব" if ys else "হিসাব হালনাগাদ"


FRESH = Check("fresh", "Yearly accounts are up to date", "বার্ষিক হিসাব হালনাগাদ", _fresh)


def _debt_ok(f, ctx):
    if f.get("sector_class") in _NO_DEBT_TEST:
        return True, "Not used for banks, finance and insurance companies", "ব্যাংক, আর্থিক ও বিমা কোম্পানির জন্য প্রযোজ্য নয়"
    lvl = f.get("debt_level")
    if lvl == "over_mcap":
        return False, "Loans are bigger than its whole market value", "ঋণ পুরো বাজারমূল্যের চেয়েও বেশি"
    if lvl == "over_reserve":
        return False, "Loans are bigger than its savings", "ঋণ জমানো সঞ্চয়ের চেয়ে বেশি"
    return True, "Loans below its savings", "ঋণ সঞ্চয়ের চেয়ে কম"


DEBT_OK = Check("debt_ok", "Loans are not bigger than its savings",
                "ঋণ সঞ্চয়ের চেয়ে বেশি নয়", _debt_ok)


def _traded(f, ctx):
    t = _n(f.get("turnover_mn"))
    if t is None:
        return False, "Hardly traded", "প্রায় লেনদেন হয় না"
    en, bn = _taka_turnover(t)
    return t >= MIN_TURNOVER_MN, f"{en} traded a day", f"দিনে {bn} লেনদেন"


TRADED = Check("traded", "Trades at least ৳10 lakh a day (easy to buy and sell)",
               "দিনে অন্তত ৳10 লাখ লেনদেন (সহজে কেনা-বেচা যায়)", _traded)


def _profit_holding(f, ctx):
    v, en, bn = profit_trend(f)
    if v is None:
        return True, "No recent profit change to check", "সাম্প্রতিক লাভের তুলনা নেই"
    sign = "up" if v >= 0 else "down"
    sign_bn = "বেশি" if v >= 0 else "কম"
    return (v > EARNINGS_DROP_PCT,
            f"Profit {sign} {_r(abs(v), 0)}% ({en})",
            f"লাভ {_r(abs(v), 0)}% {sign_bn} ({bn})")


PROFIT_HOLDING = Check("profit_holding", "Profit has not dropped by a quarter or more",
                       "লাভ এক-চতুর্থাংশ বা তার বেশি কমেনি", _profit_holding)


def _not_expensive(f, ctx):
    p4 = _n(f.get("p4_val"))
    if p4 is None:
        return False, "No price check possible", "দাম যাচাই করা যায়নি"
    if p4 >= 7:
        return True, "Price looks cheap", "দাম সস্তা মনে হচ্ছে"
    if p4 >= EXPENSIVE_P4:
        return True, "Price looks fair", "দাম ন্যায্য মনে হচ্ছে"
    return False, "Price looks expensive", "দাম বেশি মনে হচ্ছে"


NOT_EXPENSIVE = Check("not_expensive", "Price is not expensive for what it earns",
                      "আয়ের তুলনায় দাম বেশি নয়", _not_expensive)


def _profitable(f, ctx):
    e = _n(f.get("eps"))
    if e is None:
        return False, "No profit figure", "লাভের হিসাব নেই"
    return e > 0, f"Earns ৳{_r(e, 2)} a share" if e > 0 else f"Loses ৳{_r(abs(e), 2)} a share", \
        f"শেয়ারপ্রতি ৳{_r(e, 2)} আয়" if e > 0 else f"শেয়ারপ্রতি ৳{_r(abs(e), 2)} লোকসান"


PROFITABLE = Check("profitable", "Makes a profit", "লাভে আছে", _profitable)


def grade_at_least(minimum: float, label_en: str, label_bn: str) -> Check:
    def fn(f, ctx):
        s = _n(f.get("score"))
        if s is None:
            return False, "Not rated", "রেটিং নেই"
        w_en, w_bn = grade_words(s)
        return s >= minimum, f"Graded {w_en} ({_r(s, 0)}/100)", f"গ্রেড {w_bn} ({_r(s, 0)}/100)"
    return Check(f"grade_{int(minimum)}", label_en, label_bn, fn)


def _no_governance(f, ctx):
    items = ctx.governance(f["code"])
    if items:
        it = items[0]
        return False, it.get("en") or "Governance warning", it.get("bn") or "সুশাসন নিয়ে সতর্কতা"
    return True, "No warnings in the last year", "গত এক বছরে কোনো সতর্কতা নেই"


NO_GOVERNANCE = Check("no_governance",
                      "No auditor, regulator or meeting warnings in the last year",
                      "গত এক বছরে নিরীক্ষক, নিয়ন্ত্রক বা সভা নিয়ে কোনো সতর্কতা নেই", _no_governance)


# ---------------------------------------------------------------------------
# 1. Cash machines
# ---------------------------------------------------------------------------

def _pays_now(f, ctx):
    y = _n(f.get("div_yield_pct"))
    if not y or y <= 0:
        return False, "No cash dividend for the latest year", "সর্বশেষ বছরে নগদ লভ্যাংশ নেই"
    return True, f"Cash dividend worth {_r(y)}% of the price", f"দামের {_r(y)}% নগদ লভ্যাংশ"


def _paid_every_year(f, ctx):
    n = f.get("paid_years")
    if n is None:
        return False, "Paid in 2 or fewer of the last 5 years", "গত 5 বছরে 2 বা তার কম বছর দিয়েছে"
    return n >= 5, f"Paid in {n} of the last 5 years", f"গত 5 বছরের {n} বছরই দিয়েছে" if n >= 5 else f"গত 5 বছরে {n} বছর দিয়েছে"


def _affordable(f, ctx):
    p = _n(f.get("payout_pct"))
    latest = _n(f.get("payout_latest_pct"))
    if p is None:
        return False, "Paid a dividend in a loss year", "লোকসানের বছরে লভ্যাংশ দিয়েছে"
    if latest is not None and latest > 100:
        return False, f"Paid out {_r(latest, 0)}% of last year's profit", f"গত বছর লাভের {_r(latest, 0)}% দিয়েছে"
    return p <= 70, f"Pays out {_r(p, 0)}% of its profit", f"লাভের {_r(p, 0)}% লভ্যাংশ দেয়"


def _cash_backed(f, ctx):
    if f.get("sector_class") in _NO_DEBT_TEST:
        return True, "Not used for banks, finance and insurance companies", "ব্যাংক, আর্থিক ও বিমা কোম্পানির জন্য প্রযোজ্য নয়"
    nocf = _n(f.get("interim_nocfps"))
    if nocf is not None and nocf < 0:
        return False, f"Used more cash than it made this year (৳{_r(nocf, 2)} a share)", \
            f"এ বছর আয়ের চেয়ে নগদ খরচ বেশি (শেয়ারপ্রতি ৳{_r(nocf, 2)})"
    cfo = _n(f.get("p2_cfo"))
    if cfo is None:
        return False, "No cash-flow figures", "নগদ প্রবাহের হিসাব নেই"
    if cfo >= 5:
        return True, "Cash from the business matches its profit", "ব্যবসার নগদ আয় লাভের সঙ্গে মেলে"
    return False, "Cash from the business falls short of its profit", "ব্যবসার নগদ আয় লাভের চেয়ে কম"


def _yield_4(f, ctx):
    y = _n(f.get("div_yield_pct")) or 0.0
    return y >= 4, f"{_r(y)}% a year", f"বছরে {_r(y)}%"


CASH_MACHINES = ResearchList(
    id="cash_machines",
    slug="dividend-cash-machines-dse",
    title_en="Pays cash every year",
    title_bn="প্রতি বছর নগদ লভ্যাংশ দেয়",
    idea_en="Companies that pay cash every year, pay it out of real profit and real cash, and still have money left over.",
    idea_bn="যে কোম্পানিগুলো প্রতি বছর নগদ লভ্যাংশ দেয়, সত্যিকারের লাভ ও নগদ থেকেই দেয়, আর তারপরও হাতে টাকা থাকে।",
    checks=[
        Check("pays_now", "Paid a cash dividend for the latest year", "সর্বশেষ বছরে নগদ লভ্যাংশ দিয়েছে", _pays_now),
        Check("paid_every_year", "Paid cash in each of the last 5 years", "গত 5 বছরের প্রতি বছর নগদ দিয়েছে", _paid_every_year),
        Check("affordable", "Pays out no more than 70% of its profit", "লাভের 70%-এর বেশি লভ্যাংশ দেয় না", _affordable),
        Check("cash_backed", "The dividend is backed by real cash", "লভ্যাংশের পেছনে সত্যিকারের নগদ আছে", _cash_backed),
        NOT_Z, FRESH, DEBT_OK,
        Check("yield_4", "Pays at least 4% of the price a year", "বছরে দামের অন্তত 4% দেয়", _yield_4),
        NOT_EXPENSIVE,
    ],
    rank=lambda f: _n(f.get("div_yield_pct")) or 0.0,
    headline=lambda f: (
        f"Pays {_r(_n(f.get('div_yield_pct')) or 0)}% a year in cash, using {_r(_n(f.get('payout_pct')) or 0, 0)}% of its profit",
        f"বছরে {_r(_n(f.get('div_yield_pct')) or 0)}% নগদ লভ্যাংশ দেয়, লাভের {_r(_n(f.get('payout_pct')) or 0, 0)}% খরচ করে",
    ),
    columns=[
        Column("div_yield_pct", "Cash yield", "নগদ আয়", "pct"),
        Column("payout_pct", "Share of profit paid", "লাভের কত অংশ", "pct"),
        Column("cash_per_10k", "Cash on ৳10,000 a year", "৳10,000-এ বছরে নগদ", "taka"),
        Column("current_pe", "Price ÷ profit", "দাম ÷ লাভ", "x"),
        Column("score", "Score", "স্কোর", "score"),
    ],
)


# ---------------------------------------------------------------------------
# 2. Cheap, but not broken
# ---------------------------------------------------------------------------

def _pe_text(v: float) -> tuple[str, str]:
    return f"{_r(v)}×", f"{_r(v)} গুণ"


def _cheaper_than_own(f, ctx):
    pe, own = _n(f.get("current_pe")), _n(f.get("own_avg_pe"))
    if pe is None or own is None or own <= 0:
        return False, "Not enough price history to compare", "তুলনার মতো দামের ইতিহাস নেই"
    a, ab = _pe_text(pe)
    b, bb = _pe_text(own)
    return pe < own, f"Price is {a} its profit, usually {b}", f"দাম লাভের {ab}, সাধারণত {bb}"


def _cheaper_than_sector(f, ctx):
    pe, sect = _n(f.get("current_pe")), _n(f.get("sector_median_pe"))
    if pe is None or sect is None or sect <= 0:
        return False, "No sector figure to compare", "খাতের তুলনার হিসাব নেই"
    a, ab = _pe_text(pe)
    b, bb = _pe_text(sect)
    return pe < sect, f"{a} against {b} for its sector", f"{ab}, খাতে {bb}"


def _discount(f) -> float:
    pe, own = _n(f.get("current_pe")), _n(f.get("own_avg_pe"))
    return (1 - pe / own) if pe and own and own > 0 else 0.0


CHEAP_NOT_BROKEN = ResearchList(
    id="cheap_not_broken",
    slug="cheap-quality-stocks-dse",
    title_en="Good companies at a low price",
    title_bn="কম দামে ভালো কোম্পানি",
    idea_en="Good companies priced below their own usual level and below their sector — with the checks that weed out shares that are cheap for a reason.",
    idea_bn="ভালো কোম্পানি, যাদের দাম নিজেদের স্বাভাবিক স্তর ও খাতের চেয়ে কম — সঙ্গে সেই যাচাই, যা 'কারণেই সস্তা' শেয়ার বাদ দেয়।",
    checks=[
        PROFITABLE,
        Check("cheaper_than_own", "Priced below its own usual level", "নিজের স্বাভাবিক দামের চেয়ে কম", _cheaper_than_own),
        Check("cheaper_than_sector", "Priced below its sector", "খাতের চেয়ে কম দামে", _cheaper_than_sector),
        grade_at_least(60, "Graded Good or better (60+)", "গ্রেড ভালো বা তার ওপরে (60+)"),
        PROFIT_HOLDING, DEBT_OK, NOT_Z, FRESH, TRADED,
    ],
    rank=lambda f: (_discount(f), _n(f.get("score")) or 0.0),
    # Says what "cheap" is measured on (price ÷ profit), so it can't read as a
    # contradiction of the fair-value box, which weighs more than one yardstick.
    headline=lambda f: (
        f"Price is {_r(_n(f.get('current_pe')) or 0)}× its profit — {_r(_discount(f) * 100, 0)}% under its usual {_r(_n(f.get('own_avg_pe')) or 0)}×",
        f"দাম লাভের {_r(_n(f.get('current_pe')) or 0)} গুণ — স্বাভাবিক {_r(_n(f.get('own_avg_pe')) or 0)} গুণের চেয়ে {_r(_discount(f) * 100, 0)}% কম",
    ),
    columns=[
        Column("current_pe", "Price ÷ profit", "দাম ÷ লাভ", "x"),
        Column("own_avg_pe", "Its usual", "সাধারণত", "x"),
        Column("sector_median_pe", "Sector", "খাত", "x"),
        Column("profit_change_pct", "Profit change", "লাভের পরিবর্তন", "pct"),
        Column("score", "Score", "স্কোর", "score"),
    ],
)


# ---------------------------------------------------------------------------
# 3. Profits rising quietly
# ---------------------------------------------------------------------------

def _has_quarter(f, ctx):
    if _n(f.get("interim_eps_yoy_pct")) is None:
        return False, "No quarterly report newer than the yearly accounts", "বার্ষিক হিসাবের পর কোনো ত্রৈমাসিক প্রতিবেদন নেই"
    return True, f.get("interim_label_en") or "Quarterly report out", f.get("interim_label_bn") or "ত্রৈমাসিক প্রতিবেদন এসেছে"


def _real_base(f, ctx):
    prev = _n(f.get("interim_eps_cum_prev"))
    if prev is None or prev <= 0:
        return False, "Made a loss in the same months last year", "গত বছরের একই সময়ে লোকসান ছিল"
    return True, f"Earned ৳{_r(prev, 2)} a share in the same months last year", f"গত বছরের একই সময়ে শেয়ারপ্রতি ৳{_r(prev, 2)} আয়"


def _profit_up_15(f, ctx):
    v = _n(f.get("interim_eps_yoy_pct")) or 0.0
    sign = "up" if v >= 0 else "down"
    return v >= 15, f"Profit {sign} {_r(abs(v), 0)}% this year", f"এ বছর লাভ {_r(abs(v), 0)}% {'বেশি' if v >= 0 else 'কম'}"


def _quarter_up(f, ctx):
    q = _n(f.get("interim_q_yoy_pct"))
    if q is None:
        return True, "Only one quarter reported so far", "এ পর্যন্ত একটি প্রান্তিকের হিসাব"
    return q >= 0, f"Latest quarter {'up' if q >= 0 else 'down'} {_r(abs(q), 0)}%", \
        f"সর্বশেষ প্রান্তিকে {_r(abs(q), 0)}% {'বেশি' if q >= 0 else 'কম'}"


def _cash_this_year(f, ctx):
    if f.get("sector_class") in _NO_DEBT_TEST:
        return True, "Not used for banks, finance and insurance companies", "ব্যাংক, আর্থিক ও বিমা কোম্পানির জন্য প্রযোজ্য নয়"
    nocf = _n(f.get("interim_nocfps"))
    if nocf is None:
        return True, "No cash figure in the report", "প্রতিবেদনে নগদের হিসাব নেই"
    return nocf >= 0, f"৳{_r(nocf, 2)} cash per share from the business", f"ব্যবসা থেকে শেয়ারপ্রতি ৳{_r(nocf, 2)} নগদ"


def _price_quiet(f, ctx):
    pos = _n(f.get("pct_in_range"))
    if pos is None:
        return False, "No 1-year price range", "এক বছরের দামের সীমা নেই"
    return pos <= 50, f"Price {_r(pos, 0)}% of the way up its 1-year range", \
        f"এক বছরের দামের সীমার {_r(pos, 0)}% ওপরে"


PROFITS_RISING = ResearchList(
    id="profits_rising",
    slug="profits-rising-stocks-dse",
    title_en="Profit up, price still low",
    title_bn="লাভ বাড়ছে, দাম এখনো কম",
    idea_en="Companies whose latest quarterly report shows profit clearly up on last year, while the share price has not run up yet.",
    idea_bn="যেসব কোম্পানির সর্বশেষ ত্রৈমাসিক প্রতিবেদনে লাভ গত বছরের চেয়ে স্পষ্টভাবে বেশি, অথচ শেয়ারের দাম এখনো তেমন বাড়েনি।",
    checks=[
        Check("has_quarter", "Has a quarterly report newer than its yearly accounts", "বার্ষিক হিসাবের পরে ত্রৈমাসিক প্রতিবেদন আছে", _has_quarter),
        Check("real_base", "Made a profit in the same months last year too", "গত বছরের একই সময়েও লাভ ছিল", _real_base),
        Check("profit_up_15", "Profit up at least 15% on the same months last year", "গত বছরের একই সময়ের চেয়ে লাভ অন্তত 15% বেশি", _profit_up_15),
        Check("quarter_up", "The latest quarter is not weaker than a year ago", "সর্বশেষ প্রান্তিক গত বছরের চেয়ে দুর্বল নয়", _quarter_up),
        Check("cash_this_year", "The business brought in cash this year", "এ বছর ব্যবসা থেকে নগদ এসেছে", _cash_this_year),
        Check("price_quiet", "Price still in the lower half of its 1-year range", "দাম এখনো এক বছরের সীমার নিচের অর্ধেকে", _price_quiet),
        NOT_Z, TRADED,
    ],
    # Capped so a jump off a tiny base doesn't outrank steady strong growth.
    rank=lambda f: (min(_n(f.get("interim_eps_yoy_pct")) or 0.0, 100.0), _n(f.get("score")) or 0.0),
    headline=lambda f: (
        f"Profit up {_r(_n(f.get('interim_eps_yoy_pct')) or 0, 0)}% ({f.get('interim_label_en') or 'this year'}), price still in the lower half of its range",
        f"লাভ {_r(_n(f.get('interim_eps_yoy_pct')) or 0, 0)}% বেশি ({f.get('interim_label_bn') or 'এ বছর'}), দাম এখনো সীমার নিচের অর্ধেকে",
    ),
    columns=[
        Column("interim_eps_yoy_pct", "Profit this year", "এ বছর লাভ", "pct"),
        Column("interim_q_yoy_pct", "Latest quarter", "সর্বশেষ প্রান্তিক", "pct"),
        Column("pct_in_range", "Place in 1-year range", "বছরের সীমায় অবস্থান", "pct"),
        Column("current_pe", "Price ÷ profit", "দাম ÷ লাভ", "x"),
        Column("score", "Score", "স্কোর", "score"),
    ],
)


# ---------------------------------------------------------------------------
# 4. Debt-free and growing
# ---------------------------------------------------------------------------

def _regular_business(f, ctx):
    if f.get("sector_class") in _NO_DEBT_TEST:
        return False, "A bank, finance or insurance company", "ব্যাংক, আর্থিক বা বিমা কোম্পানি"
    return True, "A regular business", "সাধারণ ব্যবসা"


def _no_loans(f, ctx):
    ratio = _n(f.get("loan_to_mcap"))
    loan = _n(f.get("total_loan_mn"))
    if ratio is None:
        if loan == 0:
            return True, "No loans", "কোনো ঋণ নেই"
        return False, "Loan figure not available", "ঋণের হিসাব নেই"
    if ratio == 0:
        return True, "No loans", "কোনো ঋণ নেই"
    pct = ratio * 100
    return pct <= 5, f"Loans are {_r(pct)}% of its market value", f"ঋণ বাজারমূল্যের {_r(pct)}%"


def _roe_10(f, ctx):
    roe = _n(f.get("roe_pct"))
    if roe is None:
        return False, "No return figure", "আয়ের হার নেই"
    return roe >= 10, f"Earns {_r(roe)}% a year on shareholders' money", f"শেয়ারহোল্ডারদের টাকায় বছরে {_r(roe)}% আয়"


def _growing(f, ctx):
    g = _n(f.get("p1_eps_cagr"))
    if g is None:
        return False, "Not enough years to judge", "বিচার করার মতো যথেষ্ট বছর নেই"
    if g >= 8:
        return True, "Profit grew about 10% a year or more", "লাভ বছরে প্রায় 10% বা তার বেশি বেড়েছে"
    if g >= 5:
        return True, "Profit grew about 5% a year or more", "লাভ বছরে প্রায় 5% বা তার বেশি বেড়েছে"
    return False, "Profit has not grown steadily", "লাভ নিয়মিত বাড়েনি"


def _steady(f, ctx):
    st = _n(f.get("eps_stability"))
    if st is None:
        return False, "Not enough years to judge", "বিচার করার মতো যথেষ্ট বছর নেই"
    if st >= 1.0:
        return True, "Profit never fell more than a quarter from its best year", "লাভ কখনো সেরা বছরের চেয়ে এক-চতুর্থাংশের বেশি কমেনি"
    return st >= 0.7, "Profit dipped but recovered" if st >= 0.7 else "Profit fell hard at some point", \
        "লাভ কমেছিল, আবার সামলে নিয়েছে" if st >= 0.7 else "কোনো এক সময় লাভ অনেক কমে গিয়েছিল"


DEBT_FREE_GROWING = ResearchList(
    id="debt_free_growing",
    slug="debt-free-growth-stocks-dse",
    title_en="No loans, still growing",
    title_bn="ঋণ নেই, তবু বাড়ছে",
    idea_en="Businesses that grow on their own money: almost no loans, a good return on shareholders' money, and profit that has risen steadily over the years.",
    idea_bn="যে ব্যবসাগুলো নিজের টাকায় বড় হচ্ছে: প্রায় কোনো ঋণ নেই, শেয়ারহোল্ডারদের টাকায় ভালো আয়, আর বছরের পর বছর লাভ নিয়মিত বেড়েছে।",
    checks=[
        Check("regular_business", "A regular business (banks and insurers borrow by design)", "সাধারণ ব্যবসা (ব্যাংক ও বিমার ঋণ ব্যবসারই অংশ)", _regular_business),
        Check("no_loans", "No loans, or loans under 5% of its market value", "ঋণ নেই, বা বাজারমূল্যের 5%-এর কম", _no_loans),
        Check("roe_10", "Earns at least 10% a year on shareholders' money", "শেয়ারহোল্ডারদের টাকায় বছরে অন্তত 10% আয়", _roe_10),
        Check("growing", "Profit has grown over the last 5 years", "গত 5 বছরে লাভ বেড়েছে", _growing),
        Check("steady", "No big fall in profit along the way", "পথে লাভ বড় করে কমেনি", _steady),
        PROFIT_HOLDING, NOT_Z, FRESH, NOT_EXPENSIVE,
    ],
    rank=lambda f: _n(f.get("score")) or 0.0,
    headline=lambda f: (
        f"Almost no loans, earns {_r(_n(f.get('roe_pct')) or 0)}% a year on shareholders' money",
        f"প্রায় কোনো ঋণ নেই, শেয়ারহোল্ডারদের টাকায় বছরে {_r(_n(f.get('roe_pct')) or 0)}% আয়",
    ),
    columns=[
        Column("roe_pct", "Return on equity", "মূলধনে আয়", "pct"),
        Column("loan_pct_mcap", "Loans ÷ market value", "ঋণ ÷ বাজারমূল্য", "pct"),
        Column("profit_change_pct", "Profit change", "লাভের পরিবর্তন", "pct"),
        Column("current_pe", "Price ÷ profit", "দাম ÷ লাভ", "x"),
        Column("score", "Score", "স্কোর", "score"),
    ],
)


# ---------------------------------------------------------------------------
# 5. Fallen, but still strong
# ---------------------------------------------------------------------------

def _fell_20(f, ctx):
    d = _n(f.get("pct_below_high"))
    if d is None:
        return False, "No 1-year high to compare", "এক বছরের সর্বোচ্চ দাম নেই"
    return d >= 20, f"{_r(d, 0)}% below its 1-year high", f"এক বছরের সর্বোচ্চ দামের চেয়ে {_r(d, 0)}% কম"


FALLEN_STRONG = ResearchList(
    id="fallen_strong",
    slug="fallen-strong-stocks-dse",
    title_en="Price fell, company still good",
    title_bn="দাম পড়েছে, কোম্পানি এখনো ভালো",
    idea_en="Good companies whose share price has fallen a long way this year while the business itself still looks sound.",
    idea_bn="ভালো কোম্পানি, যাদের শেয়ারের দাম এ বছর অনেক পড়েছে, অথচ ব্যবসা এখনো মজবুত দেখাচ্ছে।",
    checks=[
        Check("fell_20", "Price at least 20% below its 1-year high", "দাম এক বছরের সর্বোচ্চের চেয়ে অন্তত 20% কম", _fell_20),
        grade_at_least(60, "Still graded Good or better (60+)", "এখনো গ্রেড ভালো বা তার ওপরে (60+)"),
        PROFIT_HOLDING, DEBT_OK, NOT_Z, FRESH, TRADED, NO_GOVERNANCE,
    ],
    rank=lambda f: _n(f.get("score")) or 0.0,
    headline=lambda f: (
        f"{_r(_n(f.get('pct_below_high')) or 0, 0)}% below its 1-year high, still graded {grade_words(f.get('score'))[0]}",
        f"এক বছরের সর্বোচ্চের চেয়ে {_r(_n(f.get('pct_below_high')) or 0, 0)}% কম, তবু গ্রেড {grade_words(f.get('score'))[1]}",
    ),
    columns=[
        Column("pct_below_high", "Below 1-year high", "সর্বোচ্চের চেয়ে কম", "pct"),
        Column("profit_change_pct", "Profit change", "লাভের পরিবর্তন", "pct"),
        Column("current_pe", "Price ÷ profit", "দাম ÷ লাভ", "x"),
        Column("div_yield_pct", "Cash yield", "নগদ আয়", "pct"),
        Column("score", "Score", "স্কোর", "score"),
    ],
)


# ---------------------------------------------------------------------------
# 6. Owners are buying
# ---------------------------------------------------------------------------

def _two_reports(f, ctx):
    if _n(f.get("sponsor_now")) is None or _n(f.get("sponsor_prev")) is None:
        return False, "Only one shareholding report", "মাত্র একটি শেয়ারধারণ প্রতিবেদন"
    return True, f"Reports from {f.get('sh_prev_date')} and {f.get('sh_date')}", \
        f"{f.get('sh_prev_date')} ও {f.get('sh_date')}-এর প্রতিবেদন"


def _recent_report(f, ctx):
    age = _days_between(f.get("sh_date"), ctx.today)
    if age is None:
        return False, "Report date unknown", "প্রতিবেদনের তারিখ জানা নেই"
    return age <= SHAREHOLDING_MAX_AGE_DAYS, f"Latest report {age} days old", f"সর্বশেষ প্রতিবেদন {age} দিন আগের"


def _sponsor_up(f, ctx):
    a, b, d = _n(f.get("sponsor_prev")), _n(f.get("sponsor_now")), _n(f.get("sponsor_delta"))
    if d is None:
        return False, "No change to compare", "তুলনার মতো পরিবর্তন নেই"
    if d > OWNERSHIP_JUMP_PP:
        return False, f"Stake jumped {_r(a)}% → {_r(b)}% (likely a reclassification, not buying)", \
            f"শেয়ার {_r(a)}% → {_r(b)}% (সম্ভবত শ্রেণি বদল, কেনা নয়)"
    if d < OWNERSHIP_MOVE_PP:
        word = "Unchanged" if abs(d) < OWNERSHIP_MOVE_PP else "Cut"
        word_bn = "অপরিবর্তিত" if abs(d) < OWNERSHIP_MOVE_PP else "কমেছে"
        return False, f"{word}: {_r(a)}% → {_r(b)}%", f"{word_bn}: {_r(a)}% → {_r(b)}%"
    return True, f"Raised from {_r(a)}% to {_r(b)}%", f"{_r(a)}% থেকে বেড়ে {_r(b)}%"


OWNERS_BUYING = ResearchList(
    id="owners_buying",
    slug="sponsors-buying-stocks-dse",
    title_en="Owners are buying more",
    title_bn="মালিকরা আরও কিনছেন",
    idea_en="Companies whose owners (sponsors and directors) raised their own stake in the latest shareholding report — people who know the business best putting in more money.",
    idea_bn="যেসব কোম্পানির উদ্যোক্তা-পরিচালকরা সর্বশেষ শেয়ারধারণ প্রতিবেদনে নিজেদের শেয়ার বাড়িয়েছেন — ব্যবসাটা যারা সবচেয়ে ভালো জানেন, তারাই আরও টাকা ঢালছেন।",
    checks=[
        Check("two_reports", "Has shareholding reports to compare", "তুলনার মতো শেয়ারধারণ প্রতিবেদন আছে", _two_reports),
        Check("recent_report", "The latest report is less than 5 months old", "সর্বশেষ প্রতিবেদন 5 মাসের কম পুরোনো", _recent_report),
        Check("sponsor_up", "Owners raised their stake by 0.5 to 5 points in about 6 months", "প্রায় 6 মাসে উদ্যোক্তারা শেয়ার 0.5 থেকে 5 পয়েন্ট বাড়িয়েছেন", _sponsor_up),
        PROFITABLE,
        grade_at_least(45, "Graded Average or better (45+)", "গ্রেড মাঝারি বা তার ওপরে (45+)"),
        NOT_Z, FRESH,
    ],
    rank=lambda f: _n(f.get("sponsor_delta")) or 0.0,
    headline=lambda f: (
        f"Owners raised their stake from {_r(_n(f.get('sponsor_prev')) or 0)}% to {_r(_n(f.get('sponsor_now')) or 0)}%",
        f"উদ্যোক্তারা শেয়ার {_r(_n(f.get('sponsor_prev')) or 0)}% থেকে বাড়িয়ে {_r(_n(f.get('sponsor_now')) or 0)}% করেছেন",
    ),
    columns=[
        Column("sponsor_delta", "Owners' stake change", "উদ্যোক্তাদের পরিবর্তন", "pp"),
        Column("sponsor_now", "Owners hold", "উদ্যোক্তাদের হাতে", "pct"),
        Column("profit_change_pct", "Profit change", "লাভের পরিবর্তন", "pct"),
        Column("current_pe", "Price ÷ profit", "দাম ÷ লাভ", "x"),
        Column("score", "Score", "স্কোর", "score"),
    ],
)


LISTS: list[ResearchList] = [
    CASH_MACHINES, CHEAP_NOT_BROKEN, PROFITS_RISING,
    DEBT_FREE_GROWING, FALLEN_STRONG, OWNERS_BUYING,
]
BY_SLUG = {l.slug: l for l in LISTS}
BY_ID = {l.id: l for l in LISTS}


# ---------------------------------------------------------------------------
# Running a list
# ---------------------------------------------------------------------------

def run_check(check: Check, f: dict, ctx: Ctx) -> tuple[bool, str, str]:
    try:
        ok, en, bn = check.fn(f, ctx)
        return bool(ok), en, bn
    except Exception:  # noqa: BLE001 — a bad row fails the check, never the page
        return False, "Could not check", "যাচাই করা যায়নি"


def run_list(rl: ResearchList, facts: list[dict], ctx: Ctx) -> dict:
    """The funnel and the ranked passers.

    Returns ``{"universe": n, "funnel": [{key, label_en, label_bn, left}],
    "passed": [facts…]}`` — ``passed`` is every company that cleared every
    check, best first (callers cap it)."""
    survivors = [f for f in facts if _n(f.get("score")) is not None]
    funnel = []
    universe = len(survivors)
    for c in rl.checks:
        survivors = [f for f in survivors if run_check(c, f, ctx)[0]]
        funnel.append({"key": c.key, "label_en": c.label_en, "label_bn": c.label_bn, "left": len(survivors)})
    survivors.sort(key=rl.rank, reverse=True)
    return {"universe": universe, "funnel": funnel, "passed": survivors}


def check_values(rl: ResearchList, f: dict, ctx: Ctx) -> list[dict]:
    """Every check's verdict and this company's own figure on it."""
    out = []
    for c in rl.checks:
        ok, en, bn = run_check(c, f, ctx)
        out.append({"key": c.key, "label_en": c.label_en, "label_bn": c.label_bn,
                    "ok": ok, "value_en": en, "value_bn": bn})
    return out


def first_failure(rl: ResearchList, f: Optional[dict], ctx: Ctx) -> tuple[str, str]:
    """Why a company is not on the list today, in one line."""
    if not f or _n(f.get("score")) is None:
        return "No longer rated", "এখন আর রেটিং নেই"
    for c in rl.checks:
        ok, en, bn = run_check(c, f, ctx)
        if not ok:
            return f"{c.label_en} — now: {en}", f"{c.label_bn} — এখন: {bn}"
    return "Dropped out of the top 20", "সেরা 20-এর বাইরে চলে গেছে"


def diff_codes(then: list[str], now: list[str]) -> tuple[list[str], list[str]]:
    """(joined, left) between two snapshots, each in the order it appears."""
    t, n = set(then), set(now)
    return [c for c in now if c not in t], [c for c in then if c not in n]


# ---------------------------------------------------------------------------
# The lists on /market-analysis — which one fits today's market
# ---------------------------------------------------------------------------

# The market page's mood (market_state_service) decides which list leads.
# Same three cases the old "Best now" lens used: a rising market → profits
# growing faster than the price; a cheap / weak / falling one → good
# companies at a low price; anything else → steady cash payers.
MARKET_ORDER: dict[str, tuple[str, ...]] = {
    "rising": ("profits_rising", "debt_free_growing", "owners_buying",
               "cash_machines", "cheap_not_broken", "fallen_strong"),
    "low": ("cheap_not_broken", "fallen_strong", "cash_machines",
            "owners_buying", "profits_rising", "debt_free_growing"),
    "steady": ("cash_machines", "profits_rising", "cheap_not_broken",
               "debt_free_growing", "owners_buying", "fallen_strong"),
}

MARKET_REASON: dict[str, tuple[str, str]] = {
    "rising": ("More shares are rising. Look for companies whose profit is growing faster than their price.",
               "বেশিরভাগ শেয়ারের দাম বাড়ছে। এমন কোম্পানি খুঁজুন যাদের লাভ দামের চেয়ে দ্রুত বাড়ছে।"),
    "low": ("Prices are low and many shares cost less than usual. A good time to look at strong companies at a low price, not at shares that are jumping fast.",
            "দাম কম, অনেক শেয়ার স্বাভাবিকের চেয়ে সস্তা। দ্রুত লাফানো শেয়ার নয়, কম দামে ভালো কোম্পানি দেখার সময়।"),
    "steady": ("Prices look about normal. Companies that pay cash every year are a calm place to start.",
               "দাম মোটামুটি স্বাভাবিক। প্রতি বছর নগদ লভ্যাংশ দেয় এমন কোম্পানি দিয়ে শুরু করা নিরাপদ।"),
}


def market_case(tone: Optional[str], value_band: Optional[str]) -> str:
    """The market mood → "rising" | "low" | "steady"."""
    if tone == "up":
        return "rising"
    if value_band == "cheap" or tone in ("weak", "down"):
        return "low"
    return "steady"


def market_order(case: str, passed: dict[str, int]) -> list[str]:
    """List ids in the order the market page shows them. The case's first
    list leads unless nothing passes it today — then the first one in the
    case's order that has passers moves to the front."""
    order = list(MARKET_ORDER.get(case) or MARKET_ORDER["steady"])
    lead = next((i for i in order if passed.get(i, 0) > 0), order[0])
    return [lead] + [i for i in order if i != lead]


def count_then(series: list[dict], today: str, days: int = 30) -> Optional[dict]:
    """The pass count to compare today's with: the latest point at least
    `days` old, else the oldest point a week or more old (the record is
    younger than a month). `series` is [{date, n}] oldest first."""
    old = [p for p in series if p.get("date") and _days_between(p["date"], today) is not None]
    month = [p for p in old if _days_between(p["date"], today) >= days]
    if month:
        return month[-1]
    week = [p for p in old if _days_between(p["date"], today) >= 7]
    return week[0] if week else None
