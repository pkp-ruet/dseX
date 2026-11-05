"""
The check library — kept pure (no database) so it can be tested.

It began as the six research lists (2026-10-24), each ONE idea tested as a
short run of plain checks. The lists, their pages and snapshots were removed
2026-11-05 (user decision); the checks and ``run_list`` stay because the
recommendation engine's safety gate (``recommend.GATE``), saved screens from
the old screener (``custom_lists``) read them.

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
        return True, "DSE does not show a category", "ডিএসই কোনো ক্যাটাগরি দেখায়নি"
    return True, f"Category {cat}", f"{cat} ক্যাটাগরি"


NOT_Z = Check("not_z",
              "Not in category Z, the group for companies that skip an AGM or a dividend",
              "Z ক্যাটাগরিতে নয়, যেখানে এজিএম বা ডিভিডেন্ড বাদ দেওয়া কোম্পানি থাকে", _not_z)


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
        return False, "Its loans are larger than its whole market value", "ঋণ পুরো বাজার মূলধনের চেয়েও বেশি"
    if lvl == "over_reserve":
        return False, "Its loans are larger than the profit it has saved", "ঋণ জমানো মুনাফার চেয়ে বেশি"
    return True, "Its loans are below the profit it has saved", "ঋণ জমানো মুনাফার চেয়ে কম"


DEBT_OK = Check("debt_ok", "Loans are not larger than the profit it has saved",
                "ঋণ জমানো মুনাফার চেয়ে বেশি নয়", _debt_ok)


def _traded(f, ctx):
    t = _n(f.get("turnover_mn"))
    if t is None:
        return False, "Hardly traded", "প্রায় লেনদেন হয় না"
    en, bn = _taka_turnover(t)
    return t >= MIN_TURNOVER_MN, f"{en} traded a day", f"দিনে {bn} লেনদেন"


TRADED = Check("traded", "Trades at least ৳10 lakh a day, so it is easy to buy and sell",
               "দিনে অন্তত ৳10 লাখ লেনদেন হয়, তাই সহজে কেনাবেচা করা যায়", _traded)


def _profit_holding(f, ctx):
    v, en, bn = profit_trend(f)
    if v is None:
        return True, "No recent profit change to check", "সাম্প্রতিক মুনাফার তুলনা নেই"
    sign = "up" if v >= 0 else "down"
    sign_bn = "বেশি" if v >= 0 else "কম"
    return (v > EARNINGS_DROP_PCT,
            f"Profit {sign} {_r(abs(v), 0)}% ({en})",
            f"মুনাফা {_r(abs(v), 0)}% {sign_bn} ({bn})")


PROFIT_HOLDING = Check("profit_holding", "Profit has not fallen by 25% or more",
                       "মুনাফা 25% বা তার বেশি কমেনি", _profit_holding)


def _not_expensive(f, ctx):
    p4 = _n(f.get("p4_val"))
    if p4 is None:
        return False, "The price could not be checked", "দাম যাচাই করা যায়নি"
    if p4 >= 7:
        return True, "Price looks cheap", "দাম সস্তা মনে হচ্ছে"
    if p4 >= EXPENSIVE_P4:
        return True, "Price looks fair", "দাম ন্যায্য মনে হচ্ছে"
    return False, "Price looks expensive", "দাম বেশি মনে হচ্ছে"


NOT_EXPENSIVE = Check("not_expensive", "Price is not expensive for what it earns",
                      "মুনাফার তুলনায় দাম বেশি নয়", _not_expensive)


def _profitable(f, ctx):
    e = _n(f.get("eps"))
    if e is None:
        return False, "No profit figure", "মুনাফার হিসাব নেই"
    return e > 0, f"Earns ৳{_r(e, 2)} a share" if e > 0 else f"Loses ৳{_r(abs(e), 2)} a share", \
        f"শেয়ারপ্রতি ৳{_r(e, 2)} মুনাফা" if e > 0 else f"শেয়ারপ্রতি ৳{_r(abs(e), 2)} লোকসান"


PROFITABLE = Check("profitable", "Makes a profit", "মুনাফায় আছে", _profitable)


def grade_at_least(minimum: float, label_en: str, label_bn: str) -> Check:
    def fn(f, ctx):
        s = _n(f.get("score"))
        if s is None:
            return False, "Not rated", "রেটিং নেই"
        w_en, w_bn = grade_words(s)
        return s >= minimum, f"{w_en}, a score of {_r(s, 0)}", f"{w_bn}, স্কোর {_r(s, 0)}"
    return Check(f"grade_{int(minimum)}", label_en, label_bn, fn)


def _no_governance(f, ctx):
    items = ctx.governance(f["code"])
    if items:
        it = items[0]
        return False, it.get("en") or "A warning about how the company is run", it.get("bn") or "কোম্পানি পরিচালনা নিয়ে সতর্কতা"
    return True, "No warnings in the last year", "গত এক বছরে কোনো সতর্কতা নেই"


NO_GOVERNANCE = Check("no_governance",
                      "No auditor, regulator or meeting warnings in the last year",
                      "গত এক বছরে নিরীক্ষক, নিয়ন্ত্রক বা সভা নিয়ে কোনো সতর্কতা নেই", _no_governance)


# ---------------------------------------------------------------------------
# More checks (built for the research lists, now read by saved screens)
# ---------------------------------------------------------------------------


def _affordable(f, ctx):
    p = _n(f.get("payout_pct"))
    latest = _n(f.get("payout_latest_pct"))
    if p is None:
        return False, "Paid a dividend in a loss year", "লোকসানের বছরে ডিভিডেন্ড দিয়েছে"
    if latest is not None and latest > 100:
        return False, f"Paid out {_r(latest, 0)}% of last year's profit", f"গত বছর মুনাফার {_r(latest, 0)}% দিয়েছে"
    return p <= 70, f"Pays out {_r(p, 0)}% of its profit", f"মুনাফার {_r(p, 0)}% ডিভিডেন্ড দেয়"


def _cash_backed(f, ctx):
    if f.get("sector_class") in _NO_DEBT_TEST:
        return True, "Not used for banks, finance and insurance companies", "ব্যাংক, আর্থিক ও বিমা কোম্পানির জন্য প্রযোজ্য নয়"
    nocf = _n(f.get("interim_nocfps"))
    if nocf is not None and nocf < 0:
        return False, f"Spent more cash than it brought in this year: ৳{_r(nocf, 2)} a share", \
            f"এ বছর যত নগদ এসেছে, খরচ হয়েছে তার চেয়ে বেশি: শেয়ারপ্রতি ৳{_r(nocf, 2)}"
    cfo = _n(f.get("p2_cfo"))
    if cfo is None:
        return False, "No cash figures", "নগদের হিসাব নেই"
    if cfo >= 5:
        return True, "Cash from the business matches its profit", "ব্যবসা থেকে আসা নগদ টাকা মুনাফার সঙ্গে মেলে"
    return False, "Cash from the business is less than its profit", "ব্যবসা থেকে আসা নগদ টাকা মুনাফার চেয়ে কম"


def _pe_text(v: float) -> tuple[str, str]:
    return f"{_r(v)}×", f"{_r(v)} গুণ"


def _cheaper_than_own(f, ctx):
    pe, own = _n(f.get("current_pe")), _n(f.get("own_avg_pe"))
    if pe is None or own is None or own <= 0:
        return False, "Not enough price history to compare", "তুলনার মতো দামের ইতিহাস নেই"
    a, ab = _pe_text(pe)
    b, bb = _pe_text(own)
    return pe < own, f"Price is {a} its profit, usually {b}", f"দাম মুনাফার {ab}, সাধারণত {bb}"


def _cheaper_than_sector(f, ctx):
    pe, sect = _n(f.get("current_pe")), _n(f.get("sector_median_pe"))
    if pe is None or sect is None or sect <= 0:
        return False, "No sector figure to compare", "সেক্টরের তুলনার হিসাব নেই"
    a, ab = _pe_text(pe)
    b, bb = _pe_text(sect)
    return pe < sect, f"{a} against {b} for its sector", f"{ab}, সেক্টরে {bb}"


def _has_quarter(f, ctx):
    if _n(f.get("interim_eps_yoy_pct")) is None:
        return False, "No quarterly report newer than the yearly accounts", "বার্ষিক হিসাবের পর কোনো প্রান্তিকের প্রতিবেদন নেই"
    return True, f.get("interim_label_en") or "Quarterly report out", f.get("interim_label_bn") or "প্রান্তিকের প্রতিবেদন এসেছে"


def _price_quiet(f, ctx):
    pos = _n(f.get("pct_in_range"))
    if pos is None:
        return False, "No 1-year price range", "এক বছরের দামের সীমা নেই"
    return pos <= 50, f"Price {_r(pos, 0)}% of the way up its 1-year range", \
        f"এক বছরের দামের সীমার নিচ থেকে {_r(pos, 0)}% ওপরে"


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
    return pct <= 5, f"Loans are {_r(pct)}% of its market value", f"ঋণ বাজার মূলধনের {_r(pct)}%"


def _growing(f, ctx):
    g = _n(f.get("p1_eps_cagr"))
    if g is None:
        return False, "Not enough years to judge", "বিচার করার মতো যথেষ্ট বছর নেই"
    if g >= 8:
        return True, "Profit grew about 10% a year or more", "মুনাফা বছরে প্রায় 10% বা তার বেশি বেড়েছে"
    if g >= 5:
        return True, "Profit grew about 5% a year or more", "মুনাফা বছরে প্রায় 5% বা তার বেশি বেড়েছে"
    return False, "Profit has not grown steadily", "মুনাফা নিয়মিত বাড়েনি"


def _steady(f, ctx):
    st = _n(f.get("eps_stability"))
    if st is None:
        return False, "Not enough years to judge", "বিচার করার মতো যথেষ্ট বছর নেই"
    if st >= 1.0:
        return True, "Profit never fell more than 25% from its best year", "মুনাফা কখনো সেরা বছরের চেয়ে 25%-এর বেশি কমেনি"
    return st >= 0.7, "Profit fell for a while, then recovered" if st >= 0.7 else "Profit fell hard at some point", \
        "মুনাফা কমেছিল, পরে আবার বেড়েছে" if st >= 0.7 else "কোনো এক সময় মুনাফা অনেক কমে গিয়েছিল"


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
        return False, f"Stake jumped from {_r(a)}% to {_r(b)}%. This is most likely a reclassification on paper, not buying", \
            f"শেয়ার {_r(a)}% থেকে {_r(b)}% হয়েছে। এটি সম্ভবত কাগজে-কলমে শ্রেণি বদল, কেনা নয়"
    if d < OWNERSHIP_MOVE_PP:
        word = "Unchanged" if abs(d) < OWNERSHIP_MOVE_PP else "Cut"
        word_bn = "অপরিবর্তিত" if abs(d) < OWNERSHIP_MOVE_PP else "কমেছে"
        return False, f"{word}: {_r(a)}% → {_r(b)}%", f"{word_bn}: {_r(a)}% → {_r(b)}%"
    return True, f"Raised from {_r(a)}% to {_r(b)}%", f"{_r(a)}% থেকে বেড়ে {_r(b)}%"


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


def near_misses(rl: ResearchList, facts: list[dict], ctx: Ctx,
                skip: frozenset[int] = frozenset()) -> list[tuple[dict, int, str, str]]:
    """Rated companies that fail exactly one check, best first by the list's
    rank: ``[(facts, index of the missed check, value_en, value_bn)]``. A miss
    on a check index in ``skip`` doesn't count (a sector check — another
    sector's company is not "almost" on the list). Needs two checks or more."""
    if len(rl.checks) < 2:
        return []
    out = []
    for f in facts:
        if _n(f.get("score")) is None:
            continue
        miss = None
        for i, c in enumerate(rl.checks):
            ok, en, bn = run_check(c, f, ctx)
            if ok:
                continue
            if miss is not None or i in skip:
                miss = None
                break
            miss = (i, en, bn)
        else:
            if miss is not None:
                out.append((f, *miss))
    out.sort(key=lambda m: rl.rank(m[0]), reverse=True)
    return out


def diff_codes(then: list[str], now: list[str]) -> tuple[list[str], list[str]]:
    """(joined, left) between two snapshots, each in the order it appears."""
    t, n = set(then), set(now)
    return [c for c in now if c not in t], [c for c in then if c not in n]
