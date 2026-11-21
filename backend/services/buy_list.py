"""
Buy List — the rules, kept pure (no database) so they can be tested. The data
side is ``buy_list_service.py``.

The Premium page /buy-list (2026-11-08, user: bring back the buy page "as a
premium feature, but complete new"; named "Buy List" the same day): the few
DSE shares we would buy today. It is stricter than a Buy signal. Six
questions, every one a yes:

1. Is it a strong company? Mostly strong or better on today's own figures,
   not only held there from yesterday by the group's settling.
2. Is today's price good? The Buy signal (``signal_service``).
3. Is anything seriously wrong? The recommendation gate's other checks
   (``recommend.GATE``: a profit, no auditor / regulator / meeting warnings,
   loans under saved profit, enough figures). 1–3 = the engine's ``pool()``.
   Since 2026-11-18 also: it trades at least ``TRADE_JOIN_MN`` on a normal
   day (the middle day of the last 30, the same list reaches every reader at
   once), and a bank or finance company paid cash dividends in each of its
   last ``BANK_CASH_YEARS`` years (Bangladesh Bank stops cash dividends at
   banks short of provisions, so a skipped year says more than the profit).
4. Is the price well under its usual price? Since 2026-11-18 "its usual
   price" is the company's own history only: the price it has traded at for
   its profit (P/E) and for what it owns (P/B), the two weighted the way the
   fair-value estimate weighs them. Today's price at least ``MARGIN_JOIN_PCT``
   under it, and under both of the two. (It used to be the stock page's fair
   value, whose middle often landed on the similar-companies figure capped at
   1.5× the company's own, and whose "estimates agree" test was a ±20% band
   edge: a cheap share joined only 20% under, DUTCHBANGL 19.5% under stayed
   out, and members left on a 1% rise.)
5. Is the profit holding up? The latest results not down more than
   ``PROFIT_JOIN_PCT`` on the same months last year, and since 2026-11-18 the
   latest quarter alone not down more than ``QUARTER_JOIN_PCT`` (when last
   year's quarter was big enough to compare: DBH joined on +8% for nine
   months while its July–September quarter alone was down 22.5%).
6. Has it passed on two closes in a row? It passed 1–5 on the previous
   stored day too (on the first day, it had a Buy signal on the previous
   signal day).

Then at most ``SECTOR_CAP`` from one DSE sector, ``FINANCIAL_CAP`` banks +
finance companies + insurers together and ``MAX_ROWS`` in all. Never filled to
reach a number. Ordered by the engine's conviction (the same 100 points as
Picked for you), the same for every reader.

It holds still: a share already on the list stays until it is less than
``MARGIN_LEAVE_PCT`` under its usual price, its profit falls past
``PROFIT_LEAVE_PCT`` (its latest quarter past ``QUARTER_LEAVE_PCT``) or it
trades under ``TRADE_LEAVE_MN``, and keeps its seat against a newcomer unless
the newcomer beats it by ``KEEP_SEAT_PTS``. Two closes to leave too (since
2026-11-18): a member that misses only a soft question (``SOFT_MISSES``: the
company's day figures, the price, trading) stays one more close "on grace";
a serious one (a warning, a loss, loans, the grade falling, profit falling,
a skipped bank dividend) takes it off at once.

No performance claims: never add "since it joined" returns.
Bengali sentences use Western digits.
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Iterable, Optional

from backend.services import research_lists as rl
from backend.services.dividend_safety import dividend_safety
from backend.services.tiers import tier_key

_n = rl._n
_r = rl._r

MARGIN_JOIN_PCT = 10.0     # joins at least this far under its usual price …
MARGIN_LEAVE_PCT = 5.0     # … and leaves only when less than this under
PROFIT_JOIN_PCT = -10.0    # joins with the latest results down this much or less …
PROFIT_LEAVE_PCT = -15.0   # … and leaves past this fall
QUARTER_JOIN_PCT = -20.0   # the latest quarter alone, joining …
QUARTER_LEAVE_PCT = -30.0  # … and leaving
QUARTER_MIN_BASE = 0.10    # ৳ a share: last year's quarter must be this big to compare
TRADE_JOIN_MN = 3.0        # ৳30 lakh on a normal day (the middle day of 30) to join …
TRADE_LEAVE_MN = 2.0       # … ৳20 lakh to stay
BANK_CASH_YEARS = 3        # a bank / finance company paid cash in each of these years
SECTOR_CAP = 2             # one DSE sector
FINANCIAL_CAP = 3          # banks + finance companies + insurers together
MAX_ROWS = 10
KEEP_SEAT_PTS = 5.0        # a share on the list keeps its seat unless beaten by this
NEXT_DAYS = 14             # results and dividend dates shown on a share's case
ALMOST_ROWS = 8

# "Its usual price": the company's own past prices against its profit and its
# assets, weighted as the fair-value estimate weighs them (fair_value.py).
OWN_METHODS = ("own_history_pe", "book_own")
_OWN_WEIGHTS = {"GENERAL": {"own_history_pe": 1.0, "book_own": 0.5},
                "FINANCIAL": {"own_history_pe": 0.6, "book_own": 1.0}}

_STRONG = ("good", "excellent")
_FINANCIAL = {"BANK", "NBFI", "INSURANCE"}
_LENDERS = {"BANK", "NBFI"}

# Which question each miss belongs to, and the ones a member gets a second
# close for. The price, a day's checks and trading can swing back by
# tomorrow; a warning, a loss, falling profit or a skipped dividend can't.
MISS_QUESTION = {"price_signal": 2, "strong": 1, "bank_cash": 3, "trading": 3,
                 "value": 4, "profit": 5, "quarter": 5}
SOFT_MISSES = frozenset({"price_signal", "strong", "trading", "value"})
# The signal's own reasons that are only about the price or trading.
SOFT_SIGNAL_REASONS = frozenset({"near_52w_high", "quality_expensive", "good_wait_price", "thin_trading"})


def _bi(en: str, bn: str) -> dict:
    return {"en": en, "bn": bn}


def _money(v: Optional[float]) -> str:
    """The site's ``money()``: ৳1,234 from 100, ৳45.6 below."""
    if v is None:
        return ""
    return f"৳{round(v):,}" if abs(v) >= 100 else f"৳{v:.1f}"


def _eps(v: float) -> str:
    return f"৳{v:.2f}"


def _lakh(mn: float) -> str:
    """৳ million → "৳22 lakh" / "৳1.2 crore"."""
    if mn >= 10:
        return f"৳{mn / 10:.1f} crore"
    return f"৳{round(mn * 10)} lakh"


def _lakh_bn(mn: float) -> str:
    if mn >= 10:
        return f"{mn / 10:.1f} কোটি টাকা"
    return f"{round(mn * 10)} লাখ টাকা"


def round_price(x: Optional[float]) -> Optional[float]:
    """The fair-value estimate's rounding: whole taka from ৳100, one decimal from ৳10."""
    if x is None:
        return None
    if x >= 100:
        return float(round(x))
    if x >= 10:
        return round(x, 1)
    return round(x, 2)


# ---------------------------------------------------------------------------
# The questions
# ---------------------------------------------------------------------------

def strong_today(c: dict) -> bool:
    """Question 1: its group is mostly strong or better, and so are today's
    own checks (``checks_group`` before settling). A row from before the
    group rules has no ``checks_group``; then the group alone decides."""
    if tier_key(_n(c.get("score"))) not in _STRONG:
        return False
    cg = c.get("checks_group")
    return cg in _STRONG if cg else True


def usual_price(c: dict) -> Optional[dict]:
    """``{mid, low, high, methods}`` — its usual price from its own history
    (P/E and P/B), or None unless both are there. ``mid`` weighs the two
    like the fair-value estimate (profit first, assets first for banks,
    finance companies and insurers)."""
    meth = (c.get("fair_value") or {}).get("methods") or {}
    prices = {k: _n(meth.get(k)) for k in OWN_METHODS}
    prices = {k: v for k, v in prices.items() if v is not None and v > 0}
    if len(prices) < len(OWN_METHODS):
        return None
    w = _OWN_WEIGHTS["FINANCIAL" if is_financial(c) else "GENERAL"]
    mid = sum(v * w[k] for k, v in prices.items()) / sum(w[k] for k in prices)
    return {"mid": mid, "low": min(prices.values()), "high": max(prices.values()), "methods": prices}


def fair_mid(c: dict) -> Optional[float]:
    """The middle of its usual price (kept under its old name: the page's
    "fair" range is this one)."""
    u = usual_price(c)
    return u["mid"] if u else None


def margin_pct(c: dict) -> Optional[float]:
    """How far today's price sits under its usual price, in % (negative =
    above it). None without both of its own measures."""
    mid, px = fair_mid(c), _n(c.get("ltp"))
    if mid is None or not px or px <= 0:
        return None
    return (1 - px / mid) * 100


def under_both(c: dict) -> bool:
    """Today's price is under its usual price on profit AND on assets."""
    u, px = usual_price(c), _n(c.get("ltp"))
    return bool(u and px and all(v > px for v in u["methods"].values()))


def price_ok(c: dict, member: bool = False) -> bool:
    """Question 4. A newcomer needs the margin and both measures above
    today's price; a member only the leave margin."""
    m = margin_pct(c)
    if m is None:
        return False
    if member:
        return m >= MARGIN_LEAVE_PCT
    return m >= MARGIN_JOIN_PCT and under_both(c)


def profit_ok(c: dict, member: bool = False) -> bool:
    """Question 5, the year so far. No figure to compare is not a fall (the
    gate already asked for a profit)."""
    t = rl.profit_trend(c)[0]
    return t is None or t >= (PROFIT_LEAVE_PCT if member else PROFIT_JOIN_PCT)


def quarter_change(c: dict) -> Optional[float]:
    """The latest quarter alone against the same quarter last year, in % —
    None for a first quarter (that is the year so far), without last year's
    quarter, or when it was under ``QUARTER_MIN_BASE`` a share (a small
    starting figure makes the % meaningless: NCCBANK read +745%)."""
    q, base = _n(c.get("interim_q_yoy_pct")), _n(c.get("interim_eps_q_prev"))
    if q is None or base is None or base < QUARTER_MIN_BASE:
        return None
    return q


def quarter_ok(c: dict, member: bool = False) -> bool:
    """Question 5, the latest quarter alone."""
    t = quarter_change(c)
    return t is None or t >= (QUARTER_LEAVE_PCT if member else QUARTER_JOIN_PCT)


def trading_mn(c: dict) -> Optional[float]:
    """৳ million on a normal day: the middle day of the last 30 (the 7-day
    average when the window has no median)."""
    med = _n(c.get("turnover_med30_mn"))
    return med if med is not None else _n(c.get("turnover_mn"))


def trading_ok(c: dict, member: bool = False) -> bool:
    """Question 3, trading. Unknown passes: the signal already turned away
    shares that hardly trade."""
    t = trading_mn(c)
    return t is None or t >= (TRADE_LEAVE_MN if member else TRADE_JOIN_MN)


def cash_years_ok(c: dict) -> bool:
    """Question 3, a bank's or finance company's dividends: cash in each of
    its last ``BANK_CASH_YEARS`` years. ``cash_years`` = [[year, cash %], …]
    for the years we have a record of (the service fills it); a year with no
    record is not counted against it."""
    if (c.get("sector_class") or "GENERAL") not in _LENDERS:
        return True
    years = c.get("cash_years") or []
    return all((_n(v) or 0) > 0 for _y, v in years)


def skipped_year(c: dict) -> Optional[int]:
    """The newest of a lender's last years with no cash dividend, else None."""
    for y, v in sorted(c.get("cash_years") or [], key=lambda p: -int(p[0])):
        if (_n(v) or 0) <= 0:
            return int(y)
    return None


def miss_keys(c: dict, member: bool = False) -> list[str]:
    """Every question part a candidate fails today, in question order."""
    out = []
    if c.get("soft_fail"):
        out.append("price_signal")
    if not strong_today(c):
        out.append("strong")
    if not cash_years_ok(c):
        out.append("bank_cash")
    if not trading_ok(c, member):
        out.append("trading")
    if not price_ok(c, member):
        out.append("value")
    if not profit_ok(c, member):
        out.append("profit")
    if not quarter_ok(c, member):
        out.append("quarter")
    return out


def first_miss(c: dict, member: bool = False) -> Optional[int]:
    """The question of the first part a candidate fails, else None."""
    keys = miss_keys(c, member)
    return MISS_QUESTION[keys[0]] if keys else None


def soft_signal_miss(failed: list[str], reason_key: Optional[str]) -> bool:
    """A member that fell out of the engine's pool only because the Buy
    signal turned on its price or trading (the gate's other checks pass)."""
    return list(failed) == ["buy"] and reason_key in SOFT_SIGNAL_REASONS


def is_financial(c: dict) -> bool:
    return (c.get("sector_class") or "GENERAL") in _FINANCIAL


# ---------------------------------------------------------------------------
# The list
# ---------------------------------------------------------------------------

def _order(c: dict) -> tuple:
    return (-(_n(c.get("conviction")) or 0.0), -(_n(c.get("score")) or 0.0), c["code"])


def choose(cands: list[dict], prev_members: Iterable[str], prev_passed: Optional[Iterable[str]],
           prev_buys: Iterable[str] = (), prev_grace: Iterable[str] = ()) -> dict:
    """``cands`` = the engine's gate passers (questions 2–3 answered), plus
    yesterday's members that left the pool only on the price (``soft_fail``).
    Returns ``{members, also, unsettled, passed, grace}``: the list in order,
    those that passed everything but a cap left out (with ``cap``: sector /
    financial / full), those that passed 1–5 today for the first time, every
    code that passed 1–5 today (stored, so tomorrow can answer question 6),
    and the members kept one more close on grace (each member dict carries
    ``grace`` = its first miss).

    ``prev_passed`` None = no stored day yet: question 6 then reads the
    previous signal day's Buys (``prev_buys``). ``prev_grace`` = yesterday's
    members on grace: a second miss in a row takes them off."""
    was = {str(c).upper() for c in prev_members or ()}
    before = ({str(c).upper() for c in prev_passed} if prev_passed is not None
              else {str(c).upper() for c in prev_buys or ()})
    graced_before = {str(c).upper() for c in prev_grace or ()}

    passed, graced = [], []
    for c in cands:
        member = c["code"] in was
        keys = miss_keys(c, member)
        if not keys:
            passed.append(c)
        elif member and c["code"] not in graced_before and all(k in SOFT_MISSES for k in keys):
            graced.append({**c, "grace": keys[0]})
    passed_codes = {c["code"] for c in passed}
    settled = [c for c in passed if c["code"] in was or c["code"] in before] + graced
    unsettled = sorted((c for c in passed if c["code"] not in was and c["code"] not in before), key=_order)

    # Seats: a share already on the list counts KEEP_SEAT_PTS more, so a
    # newcomer has to beat it clearly to take its place under a cap.
    def seat_key(c):
        bonus = KEEP_SEAT_PTS if c["code"] in was else 0.0
        return (-((_n(c.get("conviction")) or 0.0) + bonus), -(_n(c.get("score")) or 0.0), c["code"])

    chosen, also = [], []
    per_sector: dict[str, int] = {}
    fin = 0
    for c in sorted(settled, key=seat_key):
        sector = c.get("sector") or ""
        cap = None
        if len(chosen) >= MAX_ROWS:
            cap = "full"
        elif sector and per_sector.get(sector, 0) >= SECTOR_CAP:
            cap = "sector"
        elif is_financial(c) and fin >= FINANCIAL_CAP:
            cap = "financial"
        if cap:
            if c.get("grace") is None:  # "passed every question" — not true of a graced one
                also.append({**c, "cap": cap})
            continue
        chosen.append(c)
        if sector:
            per_sector[sector] = per_sector.get(sector, 0) + 1
        if is_financial(c):
            fin += 1
    return {"members": sorted(chosen, key=_order), "also": sorted(also, key=_order),
            "unsettled": unsettled, "passed": [c["code"] for c in passed if c["code"] in passed_codes],
            "grace": [c["code"] for c in chosen if c.get("grace")]}


def since_map(members: list[str], prev_members: Iterable[str], prev_since: Optional[dict], today: str) -> dict:
    """{code: the day it joined}: carried from the previous day for a share
    that stays, today for one that joins."""
    was = {str(c).upper() for c in prev_members or ()}
    prev_since = prev_since or {}
    return {c: (prev_since.get(c) or today) if c in was else today for c in members}


def free_pick(members: list[str], day: Optional[str]) -> Optional[str]:
    """The free reader's one open share: a different one from the list each
    day (by the date), the same one all day."""
    if not members:
        return None
    try:
        n = date.fromisoformat(str(day)[:10]).toordinal()
    except (TypeError, ValueError):
        n = 0
    return members[n % len(members)]


def week_start(day: str) -> str:
    """The Sunday that starts DSE's trading week."""
    d = date.fromisoformat(str(day)[:10])
    return (d - timedelta(days=(d.weekday() + 1) % 7)).isoformat()


def join_price(c: dict, signal_buy: Optional[float]) -> Optional[float]:
    """The highest price at which it would join the list today: under the
    signal's own buy price (``stock_report.buy_price_for``), at least
    ``MARGIN_JOIN_PCT`` under its usual price and under both of its own
    measures. The case's "worth buying under" line, so a member kept by its
    staying lines never shows a buy-under price that reads as today's."""
    u = usual_price(c)
    lines = [signal_buy] if signal_buy and signal_buy > 0 else []
    if u:
        lines += [u["mid"] * (1 - MARGIN_JOIN_PCT / 100), u["low"]]
    return round_price(min(lines)) if lines else None


# ---------------------------------------------------------------------------
# Words
# ---------------------------------------------------------------------------

def _steady_dividend(c: dict) -> bool:
    s = dividend_safety(c, c.get("sector_class") or "GENERAL")
    return bool(s and s.get("level") == "safe")


def dividend_watch(c: dict) -> Optional[dict]:
    """The dividend calendar's own word when it isn't "Looks steady", for a
    share that pays cash: ``{en, bn, level}``. The case shows it as the thing
    to watch (an "At risk" dividend first), so a yield never reads safer here
    than on the stock page (MARICO paid 101% of its profit, 17 Nov 2026)."""
    y = _n(c.get("div_yield_pct"))
    if not y or y <= 0:
        return None
    s = dividend_safety(c, c.get("sector_class") or "GENERAL")
    if not s or s.get("level") not in ("risk", "watch"):
        return None
    return {"en": f"Its dividend: {s['word_en'].lower()}. {s['line_en']}",
            "bn": f"এর ডিভিডেন্ড: {s['word_bn']}। {s['line_bn']}",
            "level": "red" if s["level"] == "risk" else "amber", "key": "dividend"}


# The row's tag: the thing to watch in two to four words (2026-11-22). The
# stock report's red-flag keys, plus "dividend" from ``dividend_watch``. A
# smaller auditor note ("worth reading") is quiet, not amber: on a list of
# shares we would buy, an amber tag on half the rows read as a warning.
WATCH_LABELS: dict[str, tuple[str, str]] = {
    "audit": ("Auditor's note", "নিরীক্ষকের নোট"),
    "cash": ("Less cash came in", "নগদ কম এসেছে"),
    "category": ("Category B", "B ক্যাটাগরি"),
    "core": ("Profit not from its business", "মুনাফা ব্যবসার বাইরে থেকে"),
    "dse_query": ("DSE asked about its price", "দাম নিয়ে ডিএসইর প্রশ্ন"),
    "factory": ("Factory found closed", "কারখানা বন্ধ পাওয়া গেছে"),
    "investors": ("Big investors sold", "বড় বিনিয়োগকারীরা বিক্রি করেছেন"),
    "late": ("Results overdue", "আর্থিক ফল দেরিতে"),
    "loans": ("Large loans", "ঋণ বেশি"),
    "loss": ("Made a loss", "লোকসান হয়েছে"),
    "losses": ("Large past losses", "আগের লোকসান বড়"),
    "meetings": ("Meeting postponed", "সভা স্থগিত"),
    "owner_selling": ("Insider selling", "উদ্যোক্তার বিক্রি"),
    "owners_30": ("Owners hold under 30%", "উদ্যোক্তাদের অংশ 30%-এর কম"),
    "payout": ("Paid more than it earned", "আয়ের চেয়ে বেশি ডিভিডেন্ড"),
    "rally": ("Price ran up without news", "খবর ছাড়াই দাম বেড়েছে"),
    "rating": ("Weak credit rating", "দুর্বল ক্রেডিট রেটিং"),
    "regulator": ("Regulator stepped in", "নিয়ন্ত্রকের পদক্ষেপ"),
    "stale": ("Old accounts", "পুরোনো হিসাব"),
    "trading": ("Thin trading", "লেনদেন কম"),
}
_DIVIDEND_LABELS = {"red": ("Dividend at risk", "ডিভিডেন্ড ঝুঁকিতে"),
                    "amber": ("Dividend worth a check", "ডিভিডেন্ড দেখে নিন")}


def watch_label(key: Optional[str], level: Optional[str]) -> Optional[dict]:
    """``{en, bn, level}`` for the row's tag, or None for a key we have no
    name for (the page then says "Something to watch"). ``level``: ``red`` ·
    ``amber`` · ``note`` (a smaller auditor note, shown quiet)."""
    if key == "dividend":
        w = _DIVIDEND_LABELS.get(level or "amber")
        return {**_bi(*w), "level": level or "amber"} if w else None
    w = WATCH_LABELS.get(key or "")
    if not w:
        return None
    lv = "note" if key == "audit" and level != "red" else (level or "amber")
    return {**_bi(*w), "level": lv}


def why_line(c: dict) -> dict:
    """One sentence on why it is on the list: the company, how far under its
    usual price, and the one figure that stands out. The cash yield only when
    the dividend looks steady."""
    m = margin_pct(c)
    mp = max(0, round(m)) if m is not None else None
    strong = tier_key(_n(c.get("score"))) == "excellent"
    lead_en = "A company strong all round" if strong else "A mostly strong company"
    lead_bn = "সব দিকে শক্তিশালী কোম্পানি" if strong else "বেশিরভাগ দিকে শক্তিশালী কোম্পানি"
    y = _n(c.get("div_yield_pct"))
    trend, t_en, t_bn = rl.profit_trend(c)
    pos = _n(c.get("pct_in_range"))
    extra_en = extra_bn = None
    if y is not None and y >= 4 and _steady_dividend(c):
        extra_en, extra_bn = f"and it pays {_r(y)}% a year in cash", f"আর বছরে {_r(y)}% নগদ ডিভিডেন্ড দেয়"
    elif trend is not None and trend >= 15:
        extra_en, extra_bn = (f"with profit up {_r(trend, 0)}% ({t_en})",
                              f"আর মুনাফা {_r(trend, 0)}% বেড়েছে ({t_bn})")
    elif pos is not None and pos <= 30:
        extra_en, extra_bn = "with its price near the low of its year", "আর দাম বছরের সর্বনিম্নের কাছাকাছি"
    elif c.get("paid_years") == 5:
        extra_en, extra_bn = ("and it has paid cash in each of the last 5 years",
                              "আর গত 5 বছরের প্রতি বছর নগদ ডিভিডেন্ড দিয়েছে")
    if mp is None:
        en = f"{lead_en}, at a good price today."
        bn = f"{lead_bn}। আজ দামও ভালো।"
        return _bi(en, bn)
    if mp < 1:  # a member on grace, back at its usual price
        return _bi(f"{lead_en}, now at about its usual price.", f"{lead_bn}। দাম এখন প্রায় এর স্বাভাবিক দামের সমান।")
    en = f"{lead_en}, priced {mp}% under its usual price" + (f", {extra_en}." if extra_en else ".")
    bn = f"{lead_bn}। দাম এর স্বাভাবিক দামের চেয়ে {mp}% কম" + (f", {extra_bn}।" if extra_bn else "।")
    return _bi(en, bn)


def why_short(c: dict) -> Optional[dict]:
    """The row's one short reason (2026-11-22): the figure that stands out,
    picked the way ``why_line`` picks its last clause. The group and the gap
    are shown on the row on their own, so they are left out here."""
    y = _n(c.get("div_yield_pct"))
    trend, _t_en, _t_bn = rl.profit_trend(c)
    pos = _n(c.get("pct_in_range"))
    if y is not None and y >= 4 and _steady_dividend(c):
        return _bi(f"Pays {_r(y)}% a year in cash", f"বছরে {_r(y)}% নগদ ডিভিডেন্ড দেয়")
    if trend is not None and trend >= 15:
        return _bi(f"Profit up {_r(trend, 0)}%", f"মুনাফা {_r(trend, 0)}% বেড়েছে")
    if pos is not None and pos <= 30:
        return _bi("Price near the low of its year", "দাম বছরের সর্বনিম্নের কাছাকাছি")
    if c.get("paid_years") == 5:
        return _bi("Paid cash in each of the last 5 years", "গত 5 বছর প্রতি বছর নগদ দিয়েছে")
    if trend is not None and trend >= 3:
        return _bi(f"Profit up {_r(trend, 0)}%", f"মুনাফা {_r(trend, 0)}% বেড়েছে")
    if y is not None and y > 0:
        return _bi(f"Pays {_r(y)}% a year in cash", f"বছরে {_r(y)}% নগদ ডিভিডেন্ড দেয়")
    return None


def profit_chip(c: dict) -> dict:
    """The row's profit word: "Profit up 16%" / "Profit down 7%" / "Profit about the same"."""
    t = rl.profit_trend(c)[0]
    if t is None:
        return {**_bi("No new profit figure", "নতুন মুনাফার হিসাব নেই"), "tone": "neutral"}
    if t >= 3:
        return {**_bi(f"Profit up {_r(t, 0)}%", f"মুনাফা {_r(t, 0)}% বেশি"), "tone": "good"}
    if t <= -3:
        return {**_bi(f"Profit down {_r(abs(t), 0)}%", f"মুনাফা {_r(abs(t), 0)}% কম"), "tone": "watch"}
    return {**_bi("Profit about the same", "মুনাফা প্রায় একই"), "tone": "neutral"}


def results_base(meeting: Optional[dict]) -> Optional[float]:
    """Last year's EPS for the months the coming results cover, from the
    results calendar's Better line (base × 1.10)."""
    hi = _n((meeting or {}).get("better_above"))
    return round(hi / 1.10, 2) if hi and hi > 0 else None


def also_line(c: dict) -> dict:
    """Why a share that passed every question isn't in the list. The page
    shows it under "Passed all six, left out to keep the list spread", so the
    line gives only the reason."""
    cap = c.get("cap")
    if cap == "financial":
        return _bi("Left out because 3 banks, finance companies or insurers are already on the list.",
                   "তালিকায় এর মধ্যেই 3টি ব্যাংক, আর্থিক প্রতিষ্ঠান বা বিমা কোম্পানি আছে, তাই বাদ।")
    if cap == "full":
        return _bi(f"Left out to keep the list to {MAX_ROWS}.",
                   f"তালিকা {MAX_ROWS}টিতে রাখতে বাদ।")
    return _bi(f"Left out because {SECTOR_CAP} companies from its sector are already on the list.",
               f"তালিকায় এর সেক্টরের {SECTOR_CAP}টি কোম্পানি এর মধ্যেই আছে, তাই বাদ।")


_MONTHS_EN = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
_MONTHS_BN = ("জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট",
              "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর")


def _quarter_label(c: dict) -> tuple[str, str]:
    """"the 3 months to Sep 2026" from the latest quarter's period end."""
    try:
        d = date.fromisoformat(str(c.get("interim_period_end"))[:10])
    except (TypeError, ValueError):
        return "its latest quarter", "সর্বশেষ প্রান্তিকে"
    return (f"the 3 months to {_MONTHS_EN[d.month - 1]} {d.year}",
            f"{_MONTHS_BN[d.month - 1]} {d.year} পর্যন্ত 3 মাসে")


def _fix_on_results(meeting: Optional[dict], en: str, bn: str) -> dict:
    out = _bi(en, bn)
    if meeting and meeting.get("date"):
        out["date"] = meeting["date"]
    return out


def almost_row(c: dict, question: int, meeting: Optional[dict] = None, key: Optional[str] = None) -> Optional[dict]:
    """A strong company that missed one question: what is missing and what
    would bring it in, with its own figures."""
    if question == 3 and key == "trading":
        t = trading_mn(c)
        if t is None:
            return None
        return {"question": 3,
                "miss": _bi(f"About {_lakh(t)} of it changes hands on a normal day. We want at least "
                            f"{_lakh(TRADE_JOIN_MN)}, so readers can buy and sell it easily.",
                            f"সাধারণ একটি দিনে এর প্রায় {_lakh_bn(t)}র লেনদেন হয়। পাঠকেরা যাতে সহজে কিনতে ও বেচতে "
                            f"পারেন, তাই আমরা অন্তত {_lakh_bn(TRADE_JOIN_MN)}র লেনদেন চাই।"),
                "fix": _bi("It comes in once more of it trades on a normal day.",
                           "সাধারণ দিনে লেনদেন বাড়লে তালিকায় আসবে।")}
    if question == 4:
        u, px = usual_price(c), _n(c.get("ltp"))
        if u is None:
            miss = _bi("We can't work out its usual price: we need its past prices against both its profit and its assets.",
                       "এর স্বাভাবিক দাম হিসাব করা যাচ্ছে না: মুনাফা ও সম্পদ, দুটির তুলনায়ই এর আগের দাম দরকার।")
            fix = _bi("It comes in once we have both.", "দুটিই পাওয়া গেলে তালিকায় আসবে।")
            return {"question": 4, "miss": miss, "fix": fix}
        mid = u["mid"]
        m = margin_pct(c) or 0.0
        line = join_price(c, None)
        pe, pb = u["methods"]["own_history_pe"], u["methods"]["book_own"]
        if m < 0:
            miss = _bi(f"Its price, {_money(px)}, is above its usual price of {_money(mid)}.",
                       f"এর দাম {_money(px)}, যা এর স্বাভাবিক দাম {_money(mid)}-এর চেয়ে বেশি।")
        elif m < 1:
            miss = _bi(f"Its price, {_money(px)}, is about its usual price of {_money(mid)}.",
                       f"এর দাম {_money(px)}, প্রায় এর স্বাভাবিক দাম {_money(mid)}-এর সমান।")
        elif m >= MARGIN_JOIN_PCT and px and min(pe, pb) <= px:
            if pb <= px:
                miss = _bi(f"Its price is under its usual price for its profit ({_money(pe)}), "
                           f"but not under its usual price for what it owns ({_money(pb)}).",
                           f"দাম মুনাফার তুলনায় এর স্বাভাবিক দামের ({_money(pe)}) চেয়ে কম, "
                           f"কিন্তু সম্পদের তুলনায় স্বাভাবিক দামের ({_money(pb)}) চেয়ে কম নয়।")
            else:
                miss = _bi(f"Its price is under its usual price for what it owns ({_money(pb)}), "
                           f"but not under its usual price for its profit ({_money(pe)}).",
                           f"দাম সম্পদের তুলনায় এর স্বাভাবিক দামের ({_money(pb)}) চেয়ে কম, "
                           f"কিন্তু মুনাফার তুলনায় স্বাভাবিক দামের ({_money(pe)}) চেয়ে কম নয়।")
        else:
            miss = _bi(f"Only {round(m)}% under its usual price of {_money(mid)}.",
                       f"এর স্বাভাবিক দাম {_money(mid)}-এর চেয়ে মাত্র {round(m)}% কম।")
        fix = _bi(f"It comes in under {_money(line)}.", f"দাম {_money(line)}-এর নিচে এলে তালিকায় আসবে।")
        if line:
            fix["price"] = line  # the page's figure and its price-alert bell
        return {"question": 4, "miss": miss, "fix": fix}
    if question == 5 and key == "quarter":
        q = quarter_change(c)
        if q is None:
            return None
        l_en, l_bn = _quarter_label(c)
        miss = _bi(f"Profit in {l_en} alone is down {_r(abs(q), 0)}% on the same months last year.",
                   f"শুধু {l_bn} মুনাফা আগের বছরের একই সময়ের চেয়ে {_r(abs(q), 0)}% কম।")
        fix = _fix_on_results(meeting, "It comes in once a quarter's profit holds up.",
                              "কোনো প্রান্তিকে মুনাফা টিকে থাকলে তালিকায় আসবে।")
        return {"question": 5, "miss": miss, "fix": fix}
    if question == 5:
        t, t_en, t_bn = rl.profit_trend(c)
        if t is None:
            return None
        miss = _bi(f"Profit is down {_r(abs(t), 0)}% ({t_en}).", f"মুনাফা {_r(abs(t), 0)}% কমেছে ({t_bn})।")
        base = results_base(meeting)
        if meeting and base:
            need = base * (1 + PROFIT_JOIN_PCT / 100)
            fix = {"date": meeting.get("date"),
                   **_bi(f"A year ago it earned {_eps(base)} a share in the same months. {_eps(need)} or more would bring it in.",
                         f"গত বছর একই সময়ে শেয়ারপ্রতি আয় ছিল {_eps(base)}। এবার {_eps(need)} বা তার বেশি হলে তালিকায় আসবে।")}
        else:
            fix = _bi("It comes in once its results show profit holding up.",
                      "আর্থিক ফলে মুনাফা টিকে থাকলে তালিকায় আসবে।")
        return {"question": 5, "miss": miss, "fix": fix}
    if question == 6:
        return {"question": 6,
                "miss": _bi("It passed every question today, for the first time.",
                            "আজ প্রথমবার সব প্রশ্নে পাস করেছে।"),
                "fix": _bi("It joins if it passes again at the next close.",
                           "পরের দিন বাজার বন্ধের পর আবার পাস করলে তালিকায় আসবে।")}
    return None


# What each miss means, in the words "left" and "on grace" use.
_MISS_WORDS = {
    "price_signal": ("our price check no longer calls its price low",
                     "আমাদের দাম যাচাইয়ে এর দাম আর কম নয়"),
    "strong": ("the company was not mostly strong on that day's own figures",
               "সেদিনের হিসাবে কোম্পানিটি বেশিরভাগ দিকে শক্তিশালী ছিল না"),
    "trading": ("too little of it traded on a normal day", "সাধারণ দিনে এর লেনদেন খুব কম হয়েছে"),
    "value": ("its price came too close to its usual price", "দাম এর স্বাভাবিক দামের খুব কাছে চলে এসেছে"),
}


def grace_line(key: Optional[str]) -> Optional[dict]:
    """The case's note for a member kept one more close on grace."""
    if key not in _MISS_WORDS:
        return None
    en, bn = _MISS_WORDS[key]
    return _bi(f"At the last close it missed one of our questions: {en}. It stays on the list for now, "
               "and leaves if it misses again at the next close.",
               f"শেষ লেনদেনের দিনে এটি আমাদের একটি প্রশ্নে আটকে গেছে: {bn}। আপাতত তালিকায় থাকছে, "
               "পরের দিনও আটকালে বাদ পড়বে।")


_GATE_LEFT = {
    "profitable": ("Its latest results showed a loss.", "সর্বশেষ আর্থিক ফলে লোকসান হয়েছে।"),
    "no_governance": ("An auditor, regulator or meeting warning came out.",
                      "নিরীক্ষক, নিয়ন্ত্রক বা সভা নিয়ে একটি সতর্কতা এসেছে।"),
    "debt_ok": ("Its loans grew larger than the profit it has saved.", "এর ঋণ জমানো মুনাফার চেয়ে বেশি হয়ে গেছে।"),
    "enough_data": ("We no longer have enough of its figures to trust the grade.",
                    "গ্রেডে ভরসা করার মতো যথেষ্ট তথ্য আর নেই।"),
}


def left_reason(c: Optional[dict], key: Optional[str], signal_reason: Optional[dict],
                failed: Optional[list[str]] = None, second: bool = False) -> dict:
    """Why a share left the list since the last close, in one short line.
    ``key`` = its first miss on the Buy List's own questions; ``failed`` =
    the engine gate's checks it failed (a member that left the pool);
    ``second`` = it was on grace and missed again."""
    out = None
    if c is not None and key == "value":
        out = (_bi("We can no longer work out its usual price.", "এর স্বাভাবিক দাম আর হিসাব করা যাচ্ছে না।")
               if margin_pct(c) is None else
               _bi("Its price came too close to its usual price.", "দাম এর স্বাভাবিক দামের খুব কাছে চলে এসেছে।"))
    elif c is not None and key == "profit":
        out = _bi("Its latest results showed profit falling.", "সর্বশেষ আর্থিক ফলে মুনাফা কমেছে।")
    elif c is not None and key == "quarter":
        out = _bi("Profit in its latest quarter alone fell sharply.", "শুধু সর্বশেষ প্রান্তিকে মুনাফা অনেক কমেছে।")
    elif c is not None and key == "strong":
        out = _bi("The company is no longer mostly strong on today's figures.",
                  "আজকের হিসাবে কোম্পানিটি আর বেশিরভাগ দিকে শক্তিশালী নয়।")
    elif c is not None and key == "trading":
        out = _bi("Too little of it has traded on a normal day lately.", "ইদানীং সাধারণ দিনে এর লেনদেন খুব কম।")
    elif c is not None and key == "bank_cash":
        y = skipped_year(c)
        out = (_bi(f"It paid no cash dividend for {y}.", f"{y} সালের জন্য কোনো নগদ ডিভিডেন্ড দেয়নি।") if y else
               _bi("It skipped a cash dividend.", "একটি বছর নগদ ডিভিডেন্ড দেয়নি।"))
    elif c is not None and key == "price_signal" and signal_reason and signal_reason.get("en"):
        out = _bi(signal_reason["en"], signal_reason["bn"])
    elif c is not None and key is None and not failed:
        out = _bi("A newcomer with a stronger case took its place.", "আরও জোরালো কারণের একটি শেয়ার এর জায়গা নিয়েছে।")
    if out is None:
        gate = next((k for k in (failed or []) if k in _GATE_LEFT), None)
        if gate:
            out = _bi(*_GATE_LEFT[gate])
        elif signal_reason and signal_reason.get("en") and signal_reason.get("bn"):
            out = _bi(signal_reason["en"], signal_reason["bn"])
        else:
            out = _bi("It no longer passes one of our safety checks.", "আমাদের একটি নিরাপত্তা যাচাইয়ে আর পাস করছে না।")
    if second:
        out = _bi(out["en"] + " It missed at two closes in a row.", out["bn"] + " টানা দুই দিন আটকে গেছে।")
    return out
