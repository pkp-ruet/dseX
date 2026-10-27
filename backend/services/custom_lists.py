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

Since 2026-10-27 the screener's main way in is SIX QUESTIONS (``QUESTIONS``:
how strong · how cheap · cash dividends · profit growing · how safe · easy to
trade), three choices each. A choice is a bundle of menu checks, so the
answers expand into an ordinary spec (``spec_from_answers``) and a spec built
that way is read back into answers (``answers_from_spec``); a spec that isn't
a combination of answers is a "fine-tune" screen (exact checks, Premium to
edit). The engine only ever sees checks.

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
        return s in allowed, s or "Sector not known", s or "খাত জানা নেই"
    if len(names) == 1:
        return Check("sector", f"In the {names[0]} sector", f"{names[0]} খাতে", fn)
    if len(names) <= 3:
        joined = " or ".join([", ".join(names[:-1]), names[-1]]) if len(names) > 1 else ""
        joined_bn = " বা ".join([", ".join(names[:-1]), names[-1]]) if len(names) > 1 else ""
        return Check("sector", f"In the {joined} sectors", f"{joined_bn} খাতে", fn)
    return Check("sector", f"In one of {len(names)} sectors: {', '.join(names)}",
                 f"{len(names)}টি খাতের একটিতে: {', '.join(names)}", fn)


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


def _quarter_better(f, ctx):
    ok, en, bn = rl._has_quarter(f, ctx)
    if not ok:
        return ok, en, bn
    v = _n(f.get("interim_eps_yoy_pct")) or 0.0
    word, word_bn = ("up", "বেশি") if v >= 0 else ("down", "কম")
    return v >= 0, f"Profit so far this year {word} {_r(abs(v), 0)}% on last year ({en})",         f"এ বছর এ পর্যন্ত লাভ গত বছরের চেয়ে {_r(abs(v), 0)}% {word_bn} ({bn})"


CATALOG: list[CheckDef] = [
    # Quality
    CheckDef("grade", "quality", "Our grade", "আমাদের গ্রেড", _grade,
             [Option(45, "Average+", "মাঝারি+"), Option(60, "Good+", "ভালো+"), Option(75, "Excellent", "চমৎকার")], 60),
    CheckDef("buy_today", "quality", "A Buy signal today", "আজ 'কিনুন' সংকেত",
             _ok_fn(Check("buy_today", "Has a Buy signal today", "আজ 'কিনুন' সংকেত আছে", _buy_today)), premium=True),
    CheckDef("roe_min", "quality", "Return on shareholders' money", "শেয়ারহোল্ডারদের টাকায় আয়", _roe_min,
             [Option(10, "10%+", "10%+"), Option(15, "15%+", "15%+"), Option(20, "20%+", "20%+")], 15),
    CheckDef("no_governance", "quality", "No auditor or regulator warnings", "নিরীক্ষক বা নিয়ন্ত্রকের সতর্কতা নেই",
             _ok_fn(rl.NO_GOVERNANCE), premium=True),
    # Price
    CheckDef("not_expensive", "price", "Price not expensive", "দাম বেশি নয়", _ok_fn(rl.NOT_EXPENSIVE)),
    CheckDef("pe_max", "price", "Price ÷ profit (P/E)", "দাম ÷ লাভ (P/E)", _pe_max,
             [Option(8, "8 or less", "8 বা কম"), Option(10, "10 or less", "10 বা কম"), Option(15, "15 or less", "15 বা কম"),
              Option(20, "20 or less", "20 বা কম")], 10),
    CheckDef("cheaper_than_own", "price", "Cheaper than its usual", "নিজের স্বাভাবিকের চেয়ে কম দামে",
             _ok_fn(Check("cheaper_than_own", "Priced below its own usual level", "নিজের স্বাভাবিক দামের চেয়ে কম",
                          rl._cheaper_than_own)), premium=True),
    CheckDef("cheaper_than_sector", "price", "Cheaper than its sector", "খাতের চেয়ে কম দামে",
             _ok_fn(Check("cheaper_than_sector", "Priced below its sector", "খাতের চেয়ে কম দামে",
                          rl._cheaper_than_sector)), premium=True),
    CheckDef("below_high", "price", "Fallen from its 1-year high", "এক বছরের সর্বোচ্চ থেকে নেমেছে", _below_high,
             [Option(10, "10%+", "10%+"), Option(20, "20%+", "20%+"), Option(30, "30%+", "30%+")], 20),
    CheckDef("lower_half", "price", "Price in the lower half of its year", "দাম বছরের নিচের অর্ধেকে",
             _ok_fn(Check("lower_half", "Price in the lower half of its 1-year range",
                          "দাম এক বছরের সীমার নিচের অর্ধেকে", _lower_half))),
    # Dividends
    CheckDef("yield_min", "dividends", "Cash dividend a year", "বছরে নগদ লভ্যাংশ", _yield_min,
             [Option(2, "2%+", "2%+"), Option(4, "4%+", "4%+"), Option(6, "6%+", "6%+"), Option(8, "8%+", "8%+")], 4),
    CheckDef("paid_years", "dividends", "Years it paid a dividend", "কত বছর লভ্যাংশ দিয়েছে", _paid_years,
             [Option(3, "3 of 5 years", "5-এর 3 বছর"), Option(4, "4 of 5 years", "5-এর 4 বছর"), Option(5, "All 5 years", "5 বছরই")], 5),
    CheckDef("affordable", "dividends", "Dividend is affordable", "লভ্যাংশ সামর্থ্যের মধ্যে",
             _ok_fn(Check("affordable", "Pays out no more than 70% of its profit", "লাভের 70%-এর বেশি লভ্যাংশ দেয় না",
                          rl._affordable))),
    CheckDef("cash_backed", "dividends", "Dividend backed by real cash", "লভ্যাংশের পেছনে সত্যিকারের নগদ",
             _ok_fn(Check("cash_backed", "The dividend is backed by real cash", "লভ্যাংশের পেছনে সত্যিকারের নগদ আছে",
                          rl._cash_backed)), premium=True),
    # Profit
    CheckDef("profitable", "growth", "Makes a profit", "লাভে আছে", _ok_fn(rl.PROFITABLE)),
    CheckDef("profit_min", "growth", "Profit vs last year", "গত বছরের তুলনায় লাভ", _profit_min,
             [Option(0, "Not down", "কমেনি"), Option(10, "Up 10%+", "10%+ বেশি"), Option(25, "Up 25%+", "25%+ বেশি")], 10),
    CheckDef("growing", "growth", "Profit grew over 5 years", "5 বছরে লাভ বেড়েছে",
             _ok_fn(Check("growing", "Profit has grown over the last 5 years", "গত 5 বছরে লাভ বেড়েছে", rl._growing))),
    CheckDef("steady", "growth", "No big fall in profit", "লাভ বড় করে কমেনি",
             _ok_fn(Check("steady", "No big fall in profit along the way", "পথে লাভ বড় করে কমেনি", rl._steady)),
             premium=True),
    CheckDef("quarter_better", "growth", "Latest quarterly report better", "সর্বশেষ ত্রৈমাসিক প্রতিবেদন ভালো",
             _ok_fn(Check("quarter_better", "Profit so far this year is above the same months last year",
                          "এ বছর এ পর্যন্ত লাভ গত বছরের একই সময়ের চেয়ে বেশি", _quarter_better)), premium=True),
    CheckDef("owners_buying", "growth", "Owners are buying", "উদ্যোক্তারা কিনছেন",
             _ok_fn(Check("owners_buying", "Owners raised their stake in the latest report",
                          "সর্বশেষ প্রতিবেদনে উদ্যোক্তারা শেয়ার বাড়িয়েছেন", _owners_buying)), premium=True),
    # Safety
    CheckDef("debt", "safety", "Loans", "ঋণ", _debt,
             [Option("ok", "Less than its savings", "সঞ্চয়ের চেয়ে কম"), Option("none", "Almost none", "প্রায় নেই")], "ok"),
    CheckDef("category", "safety", "DSE category", "DSE ক্যাটাগরি", _category,
             [Option("not_z", "Anything but Z", "Z ছাড়া সব"), Option("a_only", "A only", "শুধু A")], "not_z"),
    CheckDef("fresh", "safety", "Accounts up to date", "হিসাব হালনাগাদ", _ok_fn(rl.FRESH)),
    # Trading and size
    CheckDef("turnover", "market", "Daily trading", "দৈনিক লেনদেন", _turnover,
             [Option(1, "৳10 lakh+", "৳10 লাখ+"), Option(5, "৳50 lakh+", "৳50 লাখ+"), Option(10, "৳1 crore+", "৳1 কোটি+")], 1),
    CheckDef("mcap", "market", "Market value", "বাজারমূল্য", _mcap,
             [Option(1000, "৳100 crore+", "৳100 কোটি+"), Option(5000, "৳500 crore+", "৳500 কোটি+"),
              Option(20000, "৳2,000 crore+", "৳2,000 কোটি+")], 5000),
    # Sector — its options are the DSE sectors present today (see catalog()).
    CheckDef("sector", "sector", "Sector", "খাত", _sector, [], None),
]
BY_KEY = {c.key: c for c in CATALOG}

# One plain sentence per check — what it means, and why it is there. Shown
# under each check in the screener and in the "Add a check" menu.
HELP: dict[str, tuple[str, str]] = {
    "grade": ("Our 0–100 score from five checks on the company's accounts. 60 or more is Good.",
              "কোম্পানির হিসাবের পাঁচটি দিক দেখে আমাদের 0–100 স্কোর। 60 বা বেশি মানে ভালো।"),
    "buy_today": ("Our daily call: a good company at a fair price, traded enough, not near its yearly top.",
                  "আমাদের দৈনিক সংকেত: ভালো কোম্পানি, ঠিকঠাক দাম, যথেষ্ট লেনদেন, বছরের সর্বোচ্চের কাছে নয়।"),
    "roe_min": ("Profit a year for every ৳100 the owners have in the company. Higher means it uses money well.",
                "কোম্পানিতে মালিকদের প্রতি ৳100-তে বছরে কত লাভ। বেশি মানে টাকা ভালোভাবে খাটায়।"),
    "no_governance": ("No auditor objection, BSEC action or postponed AGM in the last year.",
                      "গত এক বছরে নিরীক্ষকের আপত্তি, BSEC-এর ব্যবস্থা বা এজিএম স্থগিত হয়নি।"),
    "not_expensive": ("Our price check doesn't call it expensive for what it earns and owns.",
                      "যা আয় করে আর যা সম্পদ আছে, সে তুলনায় আমাদের হিসাবে দাম বেশি নয়।"),
    "pe_max": ("How many years of today's profit the price pays for. Lower is cheaper.",
               "আজকের দামে কত বছরের লাভ কিনছেন। কম মানে সস্তা।"),
    "cheaper_than_own": ("Price ÷ profit is below where this company usually trades.",
                         "দাম ÷ লাভ এই কোম্পানির স্বাভাবিক মাত্রার চেয়ে কম।"),
    "cheaper_than_sector": ("Price ÷ profit is below the middle company in its sector.",
                            "দাম ÷ লাভ নিজের খাতের মাঝামাঝি কোম্পানির চেয়ে কম।"),
    "below_high": ("How far the price has fallen from its highest point in the last 12 months.",
                   "গত 12 মাসের সবচেয়ে বেশি দাম থেকে কতটা নেমেছে।"),
    "lower_half": ("Nearer its 12-month low than its high — the price hasn't run up yet.",
                   "গত 12 মাসের সর্বোচ্চের চেয়ে সর্বনিম্নের কাছাকাছি — দাম এখনো চড়েনি।"),
    "yield_min": ("Cash dividend a year against today's price. 5% means ৳500 on ৳10,000.",
                  "আজকের দামের তুলনায় বছরে কত নগদ লভ্যাংশ। 5% মানে ৳10,000-এ ৳500।"),
    "paid_years": ("How many of the last 5 years it paid a cash dividend.",
                   "গত 5 বছরের কত বছর নগদ লভ্যাংশ দিয়েছে।"),
    "affordable": ("It keeps some profit back, so the dividend can last.",
                   "লাভের কিছু রেখে দেয়, তাই লভ্যাংশ টিকে থাকতে পারে।"),
    "cash_backed": ("Cash from the business keeps up with its profit — the dividend isn't paper money.",
                    "ব্যবসার নগদ আয় লাভের সঙ্গে মেলে — লভ্যাংশ শুধু কাগজের হিসাব নয়।"),
    "profitable": ("Made a profit in its latest results.", "সর্বশেষ হিসাবে লাভ করেছে।"),
    "profit_min": ("Latest year's profit against the year before.", "সর্বশেষ বছরের লাভ, আগের বছরের তুলনায়।"),
    "growing": ("Profit has climbed about 5% a year or more over five years.",
                "পাঁচ বছরে লাভ বছরে প্রায় 5% বা তার বেশি হারে বেড়েছে।"),
    "steady": ("Profit never fell hard in any year along the way.", "এই সময়ে কোনো বছর লাভ খুব বেশি কমেনি।"),
    "quarter_better": ("The latest quarterly report shows more profit than the same months last year.",
                       "সর্বশেষ ত্রৈমাসিক প্রতিবেদনে লাভ গত বছরের একই সময়ের চেয়ে বেশি।"),
    "owners_buying": ("Sponsors and directors hold more shares than in the earlier report.",
                      "আগের প্রতিবেদনের চেয়ে উদ্যোক্তা-পরিচালকদের হাতে শেয়ার বেড়েছে।"),
    "debt": ("What the company owes. Banks, finance and insurance companies are not tested.",
             "কোম্পানির ঋণ। ব্যাংক, আর্থিক ও বিমা কোম্পানির ক্ষেত্রে দেখা হয় না।"),
    "category": ("DSE's own class: A holds AGMs and pays on time, Z has stopped doing so.",
                 "DSE-র নিজস্ব শ্রেণি: A সময়মতো এজিএম করে ও লভ্যাংশ দেয়, Z তা বন্ধ করেছে।"),
    "fresh": ("Its yearly accounts are recent, so the figures are current.",
              "বার্ষিক হিসাব সাম্প্রতিক, তাই সংখ্যাগুলো হালনাগাদ।"),
    "turnover": ("Money that changes hands in the share each day. More means easier to buy and sell.",
                 "প্রতিদিন কত টাকার শেয়ার কেনাবেচা হয়। বেশি মানে সহজে কেনা-বেচা যায়।"),
    "mcap": ("What all its shares are worth together. Bigger companies tend to be steadier.",
             "সব শেয়ারের মোট দাম। বড় কোম্পানি সাধারণত বেশি স্থির।"),
    "sector": ("Only companies from the DSE sectors you pick — one or several.",
               "শুধু আপনার বাছাই করা খাতের কোম্পানি — এক বা একাধিক।"),
}

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
DONT_MIND = ("Doesn't matter", "যাই হোক")

QUESTIONS: list[Question] = [
    Question("quality", "How good is the company?", "কোম্পানি কতটা ভালো?",
             "Our grade, from its yearly accounts", "বার্ষিক হিসাব দেখে আমাদের গ্রেড", *DONT_MIND, (
                 Level("Good", "ভালো", "Good company", "ভালো কোম্পানি",
                       "Our grade says Good or better (60+ out of 100)", "আমাদের গ্রেডে ভালো বা তার বেশি (100-এ 60+)",
                       (_q("grade", 60),)),
                 Level("Very good", "খুব ভালো", "Very good company", "খুব ভালো কোম্পানি",
                       "Our grade says Excellent (75+ out of 100)", "আমাদের গ্রেডে চমৎকার (100-এ 75+)",
                       (_q("grade", 75),)),
             )),
    Question("price", "Is the price low?", "দাম কি কম?",
             "The price compared with the profit it makes", "লাভের তুলনায় দাম", *DONT_MIND, (
                 Level("Not too high", "বেশি নয়", "Fair price", "ঠিকঠাক দাম",
                       "The price is fair for the profit it makes", "লাভের তুলনায় দাম ঠিকঠাক",
                       (_q("not_expensive"),)),
                 Level("Low", "কম", "Low price", "কম দাম",
                       "The price is low: about 10 years of profit or less", "দাম কম: মোটামুটি 10 বছরের লাভ বা তার কম",
                       (_q("not_expensive"), _q("pe_max", 10))),
             )),
    Question("dividends", "Does it pay cash every year?", "প্রতি বছর নগদ টাকা দেয়?",
             "The cash dividend it pays to shareholders", "শেয়ারহোল্ডারদের দেওয়া নগদ লভ্যাংশ", *DONT_MIND, (
                 Level("Yes", "হ্যাঁ", "Pays every year", "প্রতি বছর দেয়",
                       "Paid cash in each of the last 5 years, and can afford it",
                       "গত 5 বছরের প্রতি বছর নগদ দিয়েছে, সামর্থ্যের মধ্যে",
                       (_q("paid_years", 5), _q("affordable"))),
                 Level("Yes, 4% or more", "হ্যাঁ, 4%+", "Pays 4%+ a year", "বছরে 4%+ দেয়",
                       "Pays every year: at least ৳400 a year on ৳10,000",
                       "প্রতি বছর দেয়: ৳10,000-এ বছরে অন্তত ৳400",
                       (_q("paid_years", 5), _q("affordable"), _q("yield_min", 4))),
             )),
    Question("growth", "Is profit going up?", "লাভ কি বাড়ছে?",
             "Profit this year, and over the last 5 years", "এ বছরের আর গত 5 বছরের লাভ", *DONT_MIND, (
                 Level("Not going down", "কমছে না", "Profit steady", "লাভ স্থির",
                       "Makes a profit, and not less than last year", "লাভে আছে, গত বছরের চেয়ে কম নয়",
                       (_q("profitable"), _q("profit_min", 0))),
                 Level("Going up", "বাড়ছে", "Profit rising", "লাভ বাড়ছে",
                       "More profit than 5 years ago, and not less than last year",
                       "5 বছর আগের চেয়ে বেশি লাভ, গত বছরের চেয়েও কম নয়",
                       (_q("profitable"), _q("profit_min", 0), _q("growing"))),
             )),
    Question("safety", "How safe is it?", "কতটা নিরাপদ?",
             "Its loans, its DSE category and its accounts", "ঋণ, DSE ক্যাটাগরি আর হিসাব", *DONT_MIND, (
                 Level("Safe", "নিরাপদ", "Safe", "নিরাপদ",
                       "Not a risky Z company, loans under control, accounts up to date",
                       "ঝুঁকির Z কোম্পানি নয়, ঋণ নিয়ন্ত্রণে, হিসাব হালনাগাদ",
                       (_q("category", "not_z"), _q("debt", "ok"), _q("fresh"))),
                 Level("Very safe", "খুব নিরাপদ", "Very safe", "খুব নিরাপদ",
                       "Category A, almost no loans, accounts up to date (no banks or insurers)",
                       "A ক্যাটাগরি, প্রায় কোনো ঋণ নেই, হিসাব হালনাগাদ (ব্যাংক ও বিমা বাদ)",
                       (_q("category", "a_only"), _q("debt", "none"), _q("fresh"))),
             )),
    Question("trading", "Can you buy and sell it easily?", "সহজে কেনা-বেচা যায়?",
             "How much is bought and sold each day", "প্রতিদিন কত টাকার কেনাবেচা হয়", *DONT_MIND, (
                 Level("Yes", "হ্যাঁ", "Easy to trade", "সহজে কেনা-বেচা",
                       "At least ৳50 lakh bought and sold every day", "প্রতিদিন অন্তত ৳50 লাখের কেনাবেচা",
                       (_q("turnover", 5),)),
                 Level("Yes, big company", "হ্যাঁ, বড় কোম্পানি", "Big company", "বড় কোম্পানি",
                       "A big company (৳500 crore+), ৳1 crore+ bought and sold every day",
                       "বড় কোম্পানি (৳500 কোটি+), প্রতিদিন ৳1 কোটি+ কেনাবেচা",
                       (_q("mcap", 5000), _q("turnover", 10))),
             )),
]
Q_BY_KEY = {q.key: q for q in QUESTIONS}
NO_ANSWERS = {q.key: 0 for q in QUESTIONS}


def _pairs(checks) -> set:
    return {(c["key"], tuple(c["value"]) if isinstance(c["value"], list) else c["value"]) for c in checks}


def spec_from_answers(answers: Any, sectors: Any = None, sort: Optional[str] = None) -> dict:
    """Six answers (+ optional sectors, one or several) -> a raw spec, sectors
    first, then the questions in order. ValueError on an unknown question or
    choice."""
    if not isinstance(answers, dict):
        raise ValueError("bad_answers")
    for k, v in answers.items():
        if k not in Q_BY_KEY:
            raise ValueError(f"unknown_question:{k}")
        if not isinstance(v, int) or isinstance(v, bool) or not 0 <= v <= 2:
            raise ValueError(f"bad_answer:{k}")
    checks: list[dict] = []
    names = sector_list(sectors)
    if names:
        checks.append(_q("sector", names[0] if len(names) == 1 else names))
    for q in QUESTIONS:
        lvl = answers.get(q.key, 0)
        if lvl:
            checks.extend(dict(c) for c in q.levels[lvl - 1].checks)
    return {"checks": checks, "sort": sort or DEFAULT_SORT}


def answers_from_spec(spec: dict) -> Optional[dict]:
    """A normalized spec read back as ``{"answers", "sectors"}`` (sectors = []
    for every sector), or None when it isn't exactly a combination of answers
    (a fine-tune screen)."""
    checks = spec.get("checks") or []
    sectors = next((sector_list(c["value"]) for c in checks if c["key"] == "sector"), [])
    rest = {p for p in _pairs(checks) if p[0] != "sector"}
    answers, rebuilt = {}, set()
    for q in QUESTIONS:
        best = 0
        for i, lvl in enumerate(q.levels, start=1):
            need = _pairs(lvl.checks)
            if need <= rest and (not best or len(need) > len(_pairs(q.levels[best - 1].checks))):
                best = i
        answers[q.key] = best
        if best:
            rebuilt |= _pairs(q.levels[best - 1].checks)
    if rebuilt != rest:
        return None
    return {"answers": answers, "sectors": sectors}


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


def facet_counts(rows: list[tuple[bool, dict[str, list[bool]]]], answers: dict[str, int]) -> dict[str, list[int]]:
    """How many companies each choice would leave, the other answers held.
    ``rows`` = [(in the chosen sectors, sat)] for every rated company."""
    out = {q.key: [0, 0, 0] for q in QUESTIONS}
    for sector_ok, sat in rows:
        if not sector_ok:
            continue
        fails = [k for k, lvl in answers.items() if lvl and not sat[k][lvl]]
        if len(fails) > 1:
            continue
        for q in QUESTIONS:
            if fails and fails[0] != q.key:
                continue  # fails another question whatever this one says
            for lvl in (0, 1, 2):
                if sat[q.key][lvl]:
                    out[q.key][lvl] += 1
    return out


def question_misses(rows: list[tuple[dict, bool, dict[str, list[bool]]]],
                    answers: dict[str, int]) -> list[tuple[dict, str]]:
    """[(facts, the one question it misses)] — rated companies in the chosen
    sectors that meet every answer but one."""
    out = []
    for f, sector_ok, sat in rows:
        if not sector_ok:
            continue
        fails = [k for k, lvl in answers.items() if lvl and not sat[k][lvl]]
        if len(fails) == 1:
            out.append((f, fails[0]))
    return out


def want_lines(answers: dict[str, int], sectors: list[str]) -> list[dict]:
    """A screen's answers in words, for a card that shows what a pick asks:
    [{q_en, q_bn, a_en, a_bn}] — only the questions not left at "doesn't
    matter", then the sectors when there are any."""
    out = []
    for q in QUESTIONS:
        lvl = answers.get(q.key, 0)
        if lvl:
            l = q.levels[lvl - 1]
            out.append({"key": q.key, "q_en": q.title_en, "q_bn": q.title_bn, "a_en": l.label_en, "a_bn": l.label_bn})
    if sectors:
        out.append({"key": "sector", "q_en": "Which business sectors?", "q_bn": "কোন খাতের ব্যবসা?",
                    "a_en": ", ".join(sectors), "a_bn": ", ".join(sectors)})
    return out


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


def hidden_summary(stocks: list[dict], answers: Optional[dict[str, int]]) -> dict:
    """What sits past the free rows, as counts: how many have a Buy signal,
    and the top-level strength most of them share (skipping one the answers
    already require, which every stock has). Names stay out."""
    buys = sum(1 for x in stocks if x.get("signal") == "buy")
    best = None
    for q in QUESTIONS:
        if (answers or {}).get(q.key, 0) >= 2:
            continue
        n = sum(1 for x in stocks if ((x.get("levels") or {}).get(q.key, 0)) >= 2)
        if n and (best is None or n > best["n"]):
            l = q.levels[1]
            best = {"n": n, "en": l.tag_en, "bn": l.tag_bn}
    return {"count": len(stocks), "buys": buys, "strength": best}


def miss_value(f: dict, qkey: str, lvl: int, ctx: rl.Ctx) -> tuple[str, str]:
    """The company's own figure on the first check of that choice it fails."""
    for c in _level_checks(qkey)[lvl]:
        ok, en, bn = rl.run_check(c, f, ctx)
        if not ok:
            return en, bn
    return "", ""

def _c(key, value=True):
    return {"key": key, "value": value}


def _goal(id_, title_en, title_bn, blurb_en, blurb_bn, answers, sort, sectors=()):
    """A one-tap preset of the six questions."""
    full = {**NO_ANSWERS, **answers}
    return {"id": id_, "kind": "goal", "title_en": title_en, "title_bn": title_bn,
            "blurb_en": blurb_en, "blurb_bn": blurb_bn, "answers": full, "sectors": list(sectors),
            "spec": spec_from_answers(full, list(sectors), sort)}


def _from_list(id_, lst: ResearchList, checks, sort):
    """The screener's take on one of the six research lists, built from menu
    checks so the reader can change it. Close to the list, not identical — the
    blurb says so, and links the list itself."""
    return {"id": id_, "kind": "research", "title_en": lst.title_en, "title_bn": lst.title_bn,
            "blurb_en": "Our research list, rebuilt from the checks here so you can change it",
            "blurb_bn": "আমাদের গবেষণা তালিকা, এখানের শর্ত দিয়ে বানানো — যাতে আপনি বদলাতে পারেন",
            "research_slug": lst.slug, "spec": {"checks": checks, "sort": sort}}


# Ready-made starting points in the screener: goals first (one tap for a
# beginner — they replaced the three-question quiz), then the research lists.
TEMPLATES = [
    _goal("good_cheap", "Good and cheap", "ভালো আর সস্তা",
          "A good company at a low price, and safe", "ভালো কোম্পানি, কম দাম, নিরাপদ",
          {"quality": 1, "price": 2, "safety": 1}, "cheap"),
    _goal("steady_payers", "Cash every year", "প্রতি বছর নগদ",
          "Pays 4% or more in cash every year, and safe", "প্রতি বছর 4% বা বেশি নগদ দেয়, নিরাপদ",
          {"dividends": 2, "safety": 1}, "yield"),
    _goal("beginner", "Safe for a beginner", "নতুনদের জন্য নিরাপদ",
          "Good, safe, big companies that are easy to sell", "ভালো, নিরাপদ, বড় কোম্পানি — সহজে বেচা যায়",
          {"quality": 1, "safety": 1, "trading": 2}, "score"),
    _goal("big_growing", "Profit going up", "লাভ বাড়ছে",
          "Profit going up, price not too high, and safe", "লাভ বাড়ছে, দাম বেশি নয়, নিরাপদ",
          {"price": 1, "growth": 2, "safety": 1}, "growth"),
    _goal("best_companies", "Best companies", "সেরা কোম্পানি",
          "Our top grade, and safe", "আমাদের সেরা গ্রেড, নিরাপদ",
          {"quality": 2, "safety": 1}, "score"),
    _goal("strong_banks", "Strong banks", "শক্তিশালী ব্যাংক",
          "Good banks at a price that's not too high", "ভালো ব্যাংক, দাম বেশি নয়",
          {"quality": 1, "price": 1}, "score", sectors=["Bank"]),
    _from_list("rl_cash_machines", rl.CASH_MACHINES,
               [_c("paid_years", 5), _c("affordable"), _c("cash_backed"), _c("yield_min", 4), _c("not_expensive")],
               "yield"),
    _from_list("rl_cheap_not_broken", rl.CHEAP_NOT_BROKEN,
               [_c("profitable"), _c("cheaper_than_own"), _c("cheaper_than_sector"), _c("grade", 60),
                _c("debt", "ok")], "cheap"),
    _from_list("rl_profits_rising", rl.PROFITS_RISING,
               [_c("quarter_better"), _c("lower_half"), _c("fresh")], "growth"),
    _from_list("rl_debt_free", rl.DEBT_FREE_GROWING,
               [_c("debt", "none"), _c("roe_min", 10), _c("growing"), _c("steady")], "score"),
    _from_list("rl_fallen_strong", rl.FALLEN_STRONG,
               [_c("below_high", 20), _c("grade", 60), _c("profitable"), _c("no_governance")], "score"),
    _from_list("rl_owners_buying", rl.OWNERS_BUYING,
               [_c("owners_buying"), _c("profitable"), _c("category", "not_z")], "score"),
]
TEMPLATE_BY_ID = {t["id"]: t for t in TEMPLATES}
# Retired starts, so old links (homepage card, pushes) still open something close.
TEMPLATE_ALIASES = {"fallen_good": "rl_fallen_strong"}
DEFAULT_TEMPLATE = "good_cheap"


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
        help_en, help_bn = HELP.get(c.key, ("", ""))
        options = []
        for o in opts:
            chk = c.make(o.value)
            options.append({"value": o.value, "label_en": o.label_en, "label_bn": o.label_bn,
                            "sentence_en": chk.label_en, "sentence_bn": chk.label_bn})
        out.append({
            "key": c.key, "group": c.group, "name_en": c.name_en, "name_bn": c.name_bn,
            "help_en": help_en, "help_bn": help_bn,
            "options": options,
            "default": (opts[0].value if c.key == "sector" and opts else c.default),
            "label_en": None if c.options or c.key == "sector" else c.make(True).label_en,
            "label_bn": None if c.options or c.key == "sector" else c.make(True).label_bn,
            "premium": c.premium,
        })
    return {
        "questions": [{
            "key": q.key, "title_en": q.title_en, "title_bn": q.title_bn,
            "blurb_en": q.blurb_en, "blurb_bn": q.blurb_bn,
            "levels": [{"label_en": q.any_en, "label_bn": q.any_bn, "tag_en": None, "tag_bn": None,
                        "means_en": q.blurb_en, "means_bn": q.blurb_bn}] + [
                {"label_en": l.label_en, "label_bn": l.label_bn, "tag_en": l.tag_en, "tag_bn": l.tag_bn,
                 "means_en": l.means_en, "means_bn": l.means_bn} for l in q.levels],
        } for q in QUESTIONS],
        "groups": [{"key": k, "en": en, "bn": bn} for k, en, bn in GROUPS],
        "checks": out,
        "sorts": [{"key": k, "en": v[0], "bn": v[1]} for k, v in SORTS.items()],
        "templates": TEMPLATES,
        "max_checks": MAX_CHECKS,
        "max_lists": MAX_LISTS,
    }


def normalize_spec(spec: Any, sectors: list[str], allow_empty: bool = False) -> dict:
    """A clean spec, or ValueError with a short reason. Keeps the reader's
    order, drops nothing silently: an unknown check or setting is an error.
    ``allow_empty``: a live run may have no checks at all (every question at
    "any" = every rated company); a saved screen may not."""
    if not isinstance(spec, dict):
        raise ValueError("bad_spec")
    if spec.get("answers") is not None:
        spec = spec_from_answers(spec["answers"], spec.get("sectors") or spec.get("sector"), spec.get("sort"))
    raw = spec.get("checks")
    if not isinstance(raw, list) or (not raw and not allow_empty):
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
