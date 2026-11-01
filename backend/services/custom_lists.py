"""
The screener's old checks — kept for two readers since the 2026-11-01 rebuild
(the screener itself now filters public figures, ``screener.py``):

- screens saved before then: a spec of plain checks from ``CATALOG``
  (``{"checks": [{"key": "yield_min", "value": 4}], "sort": "yield"}``), run
  through ``build_list`` -> ``research_lists.run_list`` until the reader edits
  the screen in the new screener;
- the recommendation engine, which reads each company's strengths on the six
  questions (``QUESTIONS``, ``question_sat``, ``best_levels``,
  ``strength_tags``) for its "style" fit and its row tags.

No performance claims, same as the editorial lists.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Optional

from backend.services import research_lists as rl
from backend.services.research_lists import Check, ResearchList, _n, _r

MAX_CHECKS = 16  # six answers at their strictest + a sector = 15
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
    # A "power check" (crown in the screener): anyone can switch it on and see
    # the count; which stocks pass is Premium. Screen-only, like every lock.
    premium: bool = False
    # Off the menu (2026-11-01: Buy / Sell signals left every page but the
    # stock report and the portfolio's Premium sections). Kept in BY_KEY so a
    # saved screen that already uses it still runs.
    menu: bool = True


def _sector_bn(name: str) -> str:
    """A DSE sector name in Bengali, else the DSE name."""
    try:
        from backend.services.summaries_service import _sector_bn as word
        return word(name) or name
    except Exception:  # noqa: BLE001 — a label helper must never break a run
        return name


def _ok_fn(fn) -> Callable[[Any], Check]:
    """A fixed check that takes no setting."""
    return lambda _v: fn


# ---------------------------------------------------------------------------
# Checks with a setting
# ---------------------------------------------------------------------------

def _grade(v) -> Check:
    words = {45: ("Mixed or better", "মিশ্র বা তার ওপরে"),
             60: ("Mostly strong or better", "বেশিরভাগ দিকে শক্তিশালী বা তার ওপরে"),
             75: ("Strong all round", "সব দিকে শক্তিশালী")}[v]
    return rl.grade_at_least(v, f"{words[0]} on our checks: a score of {v} or more",
                             f"আমাদের যাচাইয়ে {words[1]}: স্কোর {v} বা তার বেশি")


def _pe_max(v) -> Check:
    def fn(f, ctx):
        pe = _n(f.get("current_pe"))
        if pe is None or pe <= 0:
            return False, "No P/E: a loss, or no figures", "পিই নেই: লোকসান, বা হিসাব নেই"
        return pe <= v, f"Price is {_r(pe)} times its yearly profit", f"দাম বার্ষিক মুনাফার {_r(pe)} গুণ"
    return Check(f"pe_max_{v}", f"Price is {v} times yearly profit or less",
                 f"দাম বার্ষিক মুনাফার {v} গুণ বা তার কম", fn)


def _yield_min(v) -> Check:
    def fn(f, ctx):
        y = _n(f.get("div_yield_pct")) or 0.0
        return y >= v, f"Cash dividend of {_r(y)}% of the price a year", f"বছরে দামের {_r(y)}% নগদ ডিভিডেন্ড"
    return Check(f"yield_min_{v}", f"Pays at least {v}% of the price a year in cash",
                 f"বছরে দামের অন্তত {v}% নগদ ডিভিডেন্ড দেয়", fn)


def _paid_years(v) -> Check:
    def fn(f, ctx):
        n = f.get("paid_years")
        if n is None:
            return False, "Paid in 2 or fewer of the last 5 years", "গত 5 বছরে 2 বা তার কম বছর দিয়েছে"
        return n >= v, f"Paid in {n} of the last 5 years", f"গত 5 বছরের {n} বছর দিয়েছে"
    return Check(f"paid_years_{v}", f"Paid a cash dividend in at least {v} of the last 5 years",
                 f"গত 5 বছরের অন্তত {v} বছর নগদ ডিভিডেন্ড দিয়েছে", fn)


def _profit_min(v) -> Check:
    def fn(f, ctx):
        val, en, bn = rl.profit_trend(f)
        if val is None:
            return False, "No profit figure to compare", "তুলনার মতো মুনাফার হিসাব নেই"
        word = "up" if val >= 0 else "down"
        word_bn = "বেশি" if val >= 0 else "কম"
        return val >= v, f"Profit {word} {_r(abs(val), 0)}% ({en})", f"মুনাফা {_r(abs(val), 0)}% {word_bn} ({bn})"
    label_en = "Profit has not fallen" if v == 0 else f"Profit up at least {v}% on last year"
    label_bn = "মুনাফা কমেনি" if v == 0 else f"গত বছরের চেয়ে মুনাফা অন্তত {v}% বেশি"
    return Check(f"profit_min_{v}", label_en, label_bn, fn)


def _roe_min(v) -> Check:
    def fn(f, ctx):
        roe = _n(f.get("roe_pct"))
        if roe is None:
            return False, "No figure to check", "যাচাইয়ের মতো হিসাব নেই"
        return roe >= v, f"Earns {_r(roe)}% a year on shareholders' money", f"শেয়ারহোল্ডারদের টাকায় বছরে {_r(roe)}% মুনাফা"
    return Check(f"roe_min_{v}", f"Earns at least {v}% a year on shareholders' money",
                 f"শেয়ারহোল্ডারদের টাকায় বছরে অন্তত {v}% মুনাফা", fn)


def _below_high(v) -> Check:
    def fn(f, ctx):
        d = _n(f.get("pct_below_high"))
        if d is None:
            return False, "No 1-year high to compare", "তুলনার মতো এক বছরের সর্বোচ্চ দাম নেই"
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
            return False, "Market value not known", "বাজার মূলধন জানা নেই"
        crore = m / 10
        txt = f"{crore:,.0f}"
        return m >= v, f"Worth ৳{txt} crore on the market", f"বাজার মূলধন ৳{txt} কোটি"
    w_en, w_bn = _MCAP_WORDS[v]
    return Check(f"mcap_{v}", f"Worth at least {w_en} on the market", f"বাজার মূলধন অন্তত {w_bn}", fn)


def _debt(v) -> Check:
    if v == "none":
        return Check("debt_none", "Almost no loans: under 5% of its market value, for regular businesses only",
                     "প্রায় কোনো ঋণ নেই: বাজার মূলধনের 5%-এর কম, শুধু সাধারণ ব্যবসার ক্ষেত্রে", rl._no_loans)
    return rl.DEBT_OK


def _category(v) -> Check:
    if v == "a_only":
        def fn(f, ctx):
            cat = (f.get("cat") or "").strip().upper()
            return cat == "A", f"Category {cat or 'not shown'}", f"{cat or 'অজানা'} ক্যাটাগরি"
        return Check("cat_a", "In category A: pays dividends and holds its AGM on time",
                     "A ক্যাটাগরিতে: নিয়মিত ডিভিডেন্ড দেয় ও সময়মতো এজিএম করে", fn)
    return rl.NOT_Z


def sector_list(v) -> list[str]:
    """A sector setting as a list: one sector is a string (every spec saved
    before 2026-10-27), several are a list."""
    if isinstance(v, str):
        return [v] if v else []
    if isinstance(v, (list, tuple)):
        return [x for x in v if isinstance(x, str) and x]
    return []


def _sector(v) -> Check:
    names = sector_list(v)
    allowed = set(names)

    def fn(f, ctx):
        s = f.get("sector") or ""
        return s in allowed, s or "Sector not known", (_sector_bn(s) if s else "সেক্টর জানা নেই")
    names_bn = [_sector_bn(n) for n in names]
    if len(names) == 1:
        return Check("sector", f"In the {names[0]} sector", f"{names_bn[0]} সেক্টরে", fn)
    if len(names) <= 3:
        joined = " or ".join([", ".join(names[:-1]), names[-1]]) if len(names) > 1 else ""
        joined_bn = " বা ".join([", ".join(names_bn[:-1]), names_bn[-1]]) if len(names) > 1 else ""
        return Check("sector", f"In the {joined} sectors", f"{joined_bn} সেক্টরে", fn)
    return Check("sector", f"In one of {len(names)} sectors: {', '.join(names)}",
                 f"{len(names)}টি সেক্টরের একটিতে: {', '.join(names_bn)}", fn)


# ---------------------------------------------------------------------------
# On/off checks
# ---------------------------------------------------------------------------

def _buy_today(f, ctx):
    sig = f.get("signal")
    if sig == "buy":
        return True, "A Buy signal today", "আজ কেনার সংকেত আছে"
    if sig == "sell":
        return False, "A Sell signal today", "আজ বিক্রির সংকেত আছে"
    return False, "No Buy signal today", "আজ কেনার সংকেত নেই"


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


def _quarter_better(f, ctx):
    ok, en, bn = rl._has_quarter(f, ctx)
    if not ok:
        return ok, en, bn
    v = _n(f.get("interim_eps_yoy_pct")) or 0.0
    word, word_bn = ("up", "বেশি") if v >= 0 else ("down", "কম")
    return (v >= 0, f"Profit so far this year {word} {_r(abs(v), 0)}% on last year ({en})",
            f"এ বছর এ পর্যন্ত মুনাফা গত বছরের চেয়ে {_r(abs(v), 0)}% {word_bn} ({bn})")


CATALOG: list[CheckDef] = [
    # Quality
    CheckDef("grade", "quality", "Our grade", "আমাদের গ্রেড", _grade,
             [Option(45, "Mixed+", "মিশ্র+"), Option(60, "Mostly strong+", "বেশ শক্তিশালী+"),
              Option(75, "Strong all round", "সব দিকে শক্তিশালী")], 60),
    CheckDef("buy_today", "quality", "A Buy signal today", "আজ কেনার সংকেত",
             _ok_fn(Check("buy_today", "Has a Buy signal today", "আজ কেনার সংকেত আছে", _buy_today)), premium=True,
             menu=False),
    CheckDef("roe_min", "quality", "Return on shareholders' money", "শেয়ারহোল্ডারদের টাকায় মুনাফার হার", _roe_min,
             [Option(10, "10%+", "10%+"), Option(15, "15%+", "15%+"), Option(20, "20%+", "20%+")], 15),
    CheckDef("no_governance", "quality", "No auditor or regulator warnings", "নিরীক্ষক বা নিয়ন্ত্রকের কোনো সতর্কতা নেই",
             _ok_fn(rl.NO_GOVERNANCE), premium=True),
    # Price
    CheckDef("not_expensive", "price", "Price is not high", "দাম বেশি নয়", _ok_fn(rl.NOT_EXPENSIVE)),
    CheckDef("pe_max", "price", "P/E: price against profit", "পিই: মুনাফার তুলনায় দাম", _pe_max,
             [Option(8, "8 or less", "8 বা কম"), Option(10, "10 or less", "10 বা কম"), Option(15, "15 or less", "15 বা কম"),
              Option(20, "20 or less", "20 বা কম")], 10),
    CheckDef("cheaper_than_own", "price", "Cheaper than usual for it", "নিজের স্বাভাবিকের চেয়ে কম দাম",
             _ok_fn(Check("cheaper_than_own", "Priced below its own usual level", "দাম নিজের স্বাভাবিক মাত্রার চেয়ে কম",
                          rl._cheaper_than_own)), premium=True),
    CheckDef("cheaper_than_sector", "price", "Cheaper than its sector", "সেক্টরের চেয়ে কম দাম",
             _ok_fn(Check("cheaper_than_sector", "Priced below its sector", "দাম নিজের সেক্টরের চেয়ে কম",
                          rl._cheaper_than_sector)), premium=True),
    CheckDef("below_high", "price", "Fallen from its 1-year high", "এক বছরের সর্বোচ্চ থেকে কমেছে", _below_high,
             [Option(10, "10%+", "10%+"), Option(20, "20%+", "20%+"), Option(30, "30%+", "30%+")], 20),
    CheckDef("lower_half", "price", "Price in the lower half of its year", "দাম বছরের নিচের অর্ধেকে",
             _ok_fn(Check("lower_half", "Price in the lower half of its 1-year range",
                          "দাম এক বছরের ওঠানামার নিচের অর্ধেকে", _lower_half))),
    # Dividends
    CheckDef("yield_min", "dividends", "Cash dividend a year", "বছরে নগদ ডিভিডেন্ড", _yield_min,
             [Option(2, "2%+", "2%+"), Option(4, "4%+", "4%+"), Option(6, "6%+", "6%+"), Option(8, "8%+", "8%+")], 4),
    CheckDef("paid_years", "dividends", "Years it paid a dividend", "কত বছর ডিভিডেন্ড দিয়েছে", _paid_years,
             [Option(3, "3 of 5 years", "5-এর মধ্যে 3 বছর"), Option(4, "4 of 5 years", "5-এর মধ্যে 4 বছর"),
              Option(5, "All 5 years", "5 বছরই")], 5),
    CheckDef("affordable", "dividends", "Dividend is affordable", "ডিভিডেন্ড সামর্থ্যের মধ্যে",
             _ok_fn(Check("affordable", "Pays out no more than 70% of its profit", "মুনাফার 70%-এর বেশি ডিভিডেন্ড দেয় না",
                          rl._affordable))),
    CheckDef("cash_backed", "dividends", "Dividend backed by real cash", "ডিভিডেন্ডের পেছনে আসল নগদ",
             _ok_fn(Check("cash_backed", "The dividend is backed by real cash", "ডিভিডেন্ডের পেছনে আসল নগদ আয় আছে",
                          rl._cash_backed)), premium=True),
    # Profit
    CheckDef("profitable", "growth", "Makes a profit", "মুনাফায় আছে", _ok_fn(rl.PROFITABLE)),
    CheckDef("profit_min", "growth", "Profit against last year", "গত বছরের তুলনায় মুনাফা", _profit_min,
             [Option(0, "Not down", "কমেনি"), Option(10, "Up 10%+", "10%+ বেশি"), Option(25, "Up 25%+", "25%+ বেশি")], 10),
    CheckDef("growing", "growth", "Profit grew over 5 years", "5 বছরে মুনাফা বেড়েছে",
             _ok_fn(Check("growing", "Profit has grown over the last 5 years", "গত 5 বছরে মুনাফা বেড়েছে", rl._growing))),
    CheckDef("steady", "growth", "No big fall in profit", "মুনাফা বড় করে কমেনি",
             _ok_fn(Check("steady", "No big fall in profit along the way", "এই সময়ে মুনাফা কখনো বড় করে কমেনি", rl._steady)),
             premium=True),
    CheckDef("quarter_better", "growth", "Latest quarter is better", "সর্বশেষ প্রান্তিক ভালো",
             _ok_fn(Check("quarter_better", "Profit so far this year is above the same months last year",
                          "এ বছর এ পর্যন্ত মুনাফা গত বছরের একই সময়ের চেয়ে বেশি", _quarter_better)), premium=True),
    CheckDef("owners_buying", "growth", "Owners are buying", "উদ্যোক্তা-পরিচালকরা কিনছেন",
             _ok_fn(Check("owners_buying", "Sponsors and directors raised their stake in the latest report",
                          "সর্বশেষ প্রতিবেদনে উদ্যোক্তা-পরিচালকরা শেয়ার বাড়িয়েছেন", _owners_buying)), premium=True),
    # Safety
    CheckDef("debt", "safety", "Loans", "ঋণ", _debt,
             [Option("ok", "Less than its kept profit", "জমানো মুনাফার চেয়ে কম"), Option("none", "Almost none", "প্রায় নেই")],
             "ok"),
    CheckDef("category", "safety", "DSE category", "ডিএসই ক্যাটাগরি", _category,
             [Option("not_z", "Anything but Z", "Z ছাড়া যেকোনো"), Option("a_only", "A only", "শুধু A")], "not_z"),
    CheckDef("fresh", "safety", "Accounts up to date", "হিসাব হালনাগাদ", _ok_fn(rl.FRESH)),
    # Trading and size
    CheckDef("turnover", "market", "Daily trading", "দৈনিক লেনদেন", _turnover,
             [Option(1, "৳10 lakh+", "৳10 লাখ+"), Option(5, "৳50 lakh+", "৳50 লাখ+"), Option(10, "৳1 crore+", "৳1 কোটি+")], 1),
    CheckDef("mcap", "market", "Market value", "বাজার মূলধন", _mcap,
             [Option(1000, "৳100 crore+", "৳100 কোটি+"), Option(5000, "৳500 crore+", "৳500 কোটি+"),
              Option(20000, "৳2,000 crore+", "৳2,000 কোটি+")], 5000),
    # Sector — its options are the DSE sectors present today (see catalog()).
    CheckDef("sector", "sector", "Sector", "সেক্টর", _sector, [], None),
]
BY_KEY = {c.key: c for c in CATALOG}

SORTS = {
    "score": ("Best score first", "বেশি স্কোর আগে", lambda f: _n(f.get("score")) or 0.0),
    "yield": ("Highest dividend first", "বেশি ডিভিডেন্ড আগে", lambda f: _n(f.get("div_yield_pct")) or 0.0),
    "cheap": ("Cheapest for its profit first", "মুনাফার তুলনায় কম দাম আগে",
              lambda f: -(_n(f.get("current_pe")) or 1e9) if (_n(f.get("current_pe")) or 0) > 0 else -1e9),
    "size": ("Largest first", "সবচেয়ে বড় আগে", lambda f: _n(f.get("mcap_mn")) or 0.0),
    "growth": ("Fastest profit growth first", "মুনাফা দ্রুত বাড়ছে, এমন আগে",
               lambda f: rl.profit_trend(f)[0] if rl.profit_trend(f)[0] is not None else -1e9),
}
DEFAULT_SORT = "score"


# ---------------------------------------------------------------------------
# The six questions
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Level:
    label_en: str          # the choice on the switch
    label_bn: str
    tag_en: str            # a stock's strength on its result row
    tag_bn: str
    means_en: str          # what the choice checks, in one line
    means_bn: str
    checks: tuple          # spec items: ({"key", "value"}, …)


@dataclass(frozen=True)
class Question:
    key: str
    title_en: str
    title_bn: str
    blurb_en: str          # shown while the answer is "any"
    blurb_bn: str
    any_en: str
    any_bn: str
    levels: tuple          # (Level, Level) — choices 1 and 2; choice 0 = any


def _q(key, value=True):
    return {"key": key, "value": value}


# Plain words on purpose (2026-10-27, user: "options are hard to understand"):
# each question is one a beginner would ask, every first choice is "Doesn't
# matter", and the other two answer the question in two or three words.
DONT_MIND = ("Doesn't matter", "যেকোনো")

QUESTIONS: list[Question] = [
    Question("quality", "How good is the company?", "কোম্পানি কতটা ভালো?",
             "Our grade, from its yearly accounts", "বার্ষিক হিসাব দেখে আমাদের গ্রেড", *DONT_MIND, (
                 Level("Good", "ভালো", "Good company", "ভালো কোম্পানি",
                       "Mostly strong or better on our checks: 60 or more out of 100",
                       "আমাদের যাচাইয়ে বেশিরভাগ দিকে শক্তিশালী বা তার বেশি: 100-এ 60 বা তার বেশি",
                       (_q("grade", 60),)),
                 Level("Very good", "খুব ভালো", "Very good company", "খুব ভালো কোম্পানি",
                       "Strong all round on our checks: 75 or more out of 100",
                       "আমাদের যাচাইয়ে সব দিকে শক্তিশালী: 100-এ 75 বা তার বেশি",
                       (_q("grade", 75),)),
             )),
    Question("price", "Is the price low?", "দাম কি কম?",
             "The price compared with the profit it makes", "মুনাফার তুলনায় দাম", *DONT_MIND, (
                 Level("Not too high", "বেশি নয়", "Fair price", "ন্যায্য দাম",
                       "The price is fair for the profit it makes", "মুনাফার তুলনায় দাম ন্যায্য",
                       (_q("not_expensive"),)),
                 Level("Low", "কম", "Low price", "কম দাম",
                       "The price is low: about 10 years of profit or less",
                       "দাম কম: মোটামুটি 10 বছরের মুনাফা বা তার কম",
                       (_q("not_expensive"), _q("pe_max", 10))),
             )),
    Question("dividends", "Does it pay cash every year?", "প্রতি বছর নগদ টাকা দেয়?",
             "The cash dividend it pays to shareholders", "শেয়ারহোল্ডারদের দেওয়া নগদ ডিভিডেন্ড", *DONT_MIND, (
                 Level("Yes", "হ্যাঁ", "Pays every year", "প্রতি বছর দেয়",
                       "Paid cash in each of the last 5 years, and can afford it",
                       "গত 5 বছরের প্রতি বছর নগদ দিয়েছে, আর তা সামর্থ্যের মধ্যে",
                       (_q("paid_years", 5), _q("affordable"))),
                 Level("Yes, 4% or more", "হ্যাঁ, 4% বা বেশি", "Pays 4%+ a year", "বছরে 4%+ দেয়",
                       "Pays every year: at least ৳400 a year on ৳10,000",
                       "প্রতি বছর দেয়: ৳10,000-এ বছরে অন্তত ৳400",
                       (_q("paid_years", 5), _q("affordable"), _q("yield_min", 4))),
             )),
    Question("growth", "Is profit going up?", "মুনাফা কি বাড়ছে?",
             "Profit this year, and over the last 5 years", "এ বছরের আর গত 5 বছরের মুনাফা", *DONT_MIND, (
                 Level("Not going down", "কমছে না", "Profit steady", "মুনাফা স্থির",
                       "Makes a profit, and no less than last year", "মুনাফায় আছে, গত বছরের চেয়ে কম নয়",
                       (_q("profitable"), _q("profit_min", 0))),
                 Level("Going up", "বাড়ছে", "Profit rising", "মুনাফা বাড়ছে",
                       "More profit than 5 years ago, and no less than last year",
                       "5 বছর আগের চেয়ে বেশি মুনাফা, আর গত বছরের চেয়েও কম নয়",
                       (_q("profitable"), _q("profit_min", 0), _q("growing"))),
             )),
    Question("safety", "How safe is it?", "কতটা নিরাপদ?",
             "Its loans, its DSE category and its accounts", "ঋণ, ডিএসই ক্যাটাগরি আর হিসাব", *DONT_MIND, (
                 Level("Safe", "নিরাপদ", "Safe", "নিরাপদ",
                       "Not in the risky Z category, loans under control, accounts up to date",
                       "ঝুঁকির Z ক্যাটাগরিতে নয়, ঋণ নিয়ন্ত্রণে, হিসাব হালনাগাদ",
                       (_q("category", "not_z"), _q("debt", "ok"), _q("fresh"))),
                 Level("Very safe", "খুব নিরাপদ", "Very safe", "খুব নিরাপদ",
                       "Category A, almost no loans and accounts up to date. Banks and insurers are left out.",
                       "A ক্যাটাগরি, প্রায় কোনো ঋণ নেই, হিসাব হালনাগাদ। ব্যাংক ও বিমা কোম্পানি বাদ।",
                       (_q("category", "a_only"), _q("debt", "none"), _q("fresh"))),
             )),
    Question("trading", "Can you buy and sell it easily?", "সহজে কেনা-বেচা যায়?",
             "How much is bought and sold each day", "প্রতিদিন কত টাকার কেনাবেচা হয়", *DONT_MIND, (
                 Level("Yes", "হ্যাঁ", "Easy to trade", "সহজে কেনা-বেচা",
                       "At least ৳50 lakh bought and sold every day", "প্রতিদিন অন্তত ৳50 লাখের কেনাবেচা",
                       (_q("turnover", 5),)),
                 Level("Yes, big company", "হ্যাঁ, বড় কোম্পানি", "Big company", "বড় কোম্পানি",
                       "A company worth ৳500 crore or more, with ৳1 crore or more traded every day",
                       "৳500 কোটি বা তার বেশি মূলধনের কোম্পানি, প্রতিদিন ৳1 কোটি বা তার বেশি কেনাবেচা",
                       (_q("mcap", 5000), _q("turnover", 10))),
             )),
]
Q_BY_KEY = {q.key: q for q in QUESTIONS}


_LEVEL_CHECKS: dict[str, list[list[Check]]] = {}


def _level_checks(qkey: str) -> list[list[Check]]:
    """[[], checks at choice 1, checks at choice 2] — built once."""
    if qkey not in _LEVEL_CHECKS:
        q = Q_BY_KEY[qkey]
        _LEVEL_CHECKS[qkey] = [[]] + [[BY_KEY[c["key"]].make(c["value"]) for c in lvl.checks] for lvl in q.levels]
    return _LEVEL_CHECKS[qkey]


def question_sat(f: dict, ctx: rl.Ctx) -> dict[str, list[bool]]:
    """{question: [True, passes choice 1, passes choice 2]} for one company."""
    out = {}
    for q in QUESTIONS:
        lv = _level_checks(q.key)
        out[q.key] = [True] + [all(rl.run_check(c, f, ctx)[0] for c in lv[i]) for i in (1, 2)]
    return out


def best_levels(sat: dict[str, list[bool]]) -> dict[str, int]:
    """The strongest choice a company meets on each question — its strengths."""
    return {k: (2 if v[2] else 1 if v[1] else 0) for k, v in sat.items()}


def strength_tags(levels: Optional[dict[str, int]]) -> list[dict]:
    """A stock's strengths in words ("Very good company", "Low price" …), in
    question order — the same words the screener's rows use."""
    out = []
    for q in QUESTIONS:
        lvl = (levels or {}).get(q.key, 0)
        if lvl:
            l = q.levels[lvl - 1]
            out.append({"en": l.tag_en, "bn": l.tag_bn})
    return out


# ---------------------------------------------------------------------------
# Specs
# ---------------------------------------------------------------------------

def normalize_spec(spec: Any, sectors: list[str]) -> dict:
    """A clean old spec, or ValueError with a short reason (an unknown check or
    setting, a sector that left the DSE)."""
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
            names = sector_list(value)
            if not names or any(n not in sectors for n in names):
                raise ValueError("unknown_sector")
            names = sorted(set(names), key=sectors.index)
            value = names[0] if len(names) == 1 else names
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
