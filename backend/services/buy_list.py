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
4. Is the price well under what it is worth? Today's price at least
   ``MARGIN_JOIN_PCT`` under our fair-price centre, and the estimates agree.
5. Is the profit holding up? The latest results not down more than
   ``PROFIT_JOIN_PCT`` on the same months last year.
6. Has it passed on two closes in a row? It passed 1–5 on the previous
   stored day too (on the first day, it had a Buy signal on the previous
   signal day).

Then at most ``SECTOR_CAP`` from one DSE sector, ``FINANCIAL_CAP`` banks +
finance companies + insurers together and ``MAX_ROWS`` in all. Never filled to
reach a number. Ordered by the engine's conviction (the same 100 points as
Picked for you), the same for every reader.

It holds still: a share already on the list stays until it is less than
``MARGIN_LEAVE_PCT`` under its fair price or its profit falls past
``PROFIT_LEAVE_PCT`` (questions 1–3 take it off at once), and keeps its seat
against a newcomer unless the newcomer beats it by ``KEEP_SEAT_PTS``.

No performance claims: never add "since it joined" returns.
Bengali sentences use Western digits.
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Iterable, Optional

from backend.services import research_lists as rl
from backend.services.tiers import tier_key

_n = rl._n
_r = rl._r

MARGIN_JOIN_PCT = 10.0     # joins at least this far under our fair price …
MARGIN_LEAVE_PCT = 5.0     # … and leaves only when less than this under
PROFIT_JOIN_PCT = -10.0    # joins with the latest results down this much or less …
PROFIT_LEAVE_PCT = -15.0   # … and leaves past this fall
SECTOR_CAP = 2             # one DSE sector
FINANCIAL_CAP = 3          # banks + finance companies + insurers together
MAX_ROWS = 10
KEEP_SEAT_PTS = 5.0        # a share on the list keeps its seat unless beaten by this
NEXT_DAYS = 14             # results and dividend dates shown on a share's case
ALMOST_ROWS = 8

_STRONG = ("good", "excellent")
_FINANCIAL = {"BANK", "NBFI", "INSURANCE"}


def _bi(en: str, bn: str) -> dict:
    return {"en": en, "bn": bn}


def _money(v: Optional[float]) -> str:
    """The site's ``money()``: ৳1,234 from 100, ৳45.6 below."""
    if v is None:
        return ""
    return f"৳{round(v):,}" if abs(v) >= 100 else f"৳{v:.1f}"


def _eps(v: float) -> str:
    return f"৳{v:.2f}"


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


def fair_mid(c: dict) -> Optional[float]:
    """Our fair-price centre, only when the estimates agree."""
    fv = c.get("fair_value") or {}
    if fv.get("estimates_disagree"):
        return None
    mid = _n(fv.get("center"))
    return mid if mid and mid > 0 else None


def margin_pct(c: dict) -> Optional[float]:
    """How far today's price sits under our fair-price centre, in %
    (negative = above it). None when the estimates disagree or are missing."""
    mid, px = fair_mid(c), _n(c.get("ltp"))
    if mid is None or not px or px <= 0:
        return None
    return (1 - px / mid) * 100


def price_ok(c: dict, member: bool = False) -> bool:
    """Question 4."""
    m = margin_pct(c)
    return m is not None and m >= (MARGIN_LEAVE_PCT if member else MARGIN_JOIN_PCT)


def profit_ok(c: dict, member: bool = False) -> bool:
    """Question 5. No figure to compare is not a fall (the gate already
    asked for a profit)."""
    t = rl.profit_trend(c)[0]
    return t is None or t >= (PROFIT_LEAVE_PCT if member else PROFIT_JOIN_PCT)


def first_miss(c: dict, member: bool = False) -> Optional[int]:
    """The first of questions 1, 4 and 5 a gate passer fails, else None."""
    if not strong_today(c):
        return 1
    if not price_ok(c, member):
        return 4
    if not profit_ok(c, member):
        return 5
    return None


def is_financial(c: dict) -> bool:
    return (c.get("sector_class") or "GENERAL") in _FINANCIAL


# ---------------------------------------------------------------------------
# The list
# ---------------------------------------------------------------------------

def _order(c: dict) -> tuple:
    return (-(_n(c.get("conviction")) or 0.0), -(_n(c.get("score")) or 0.0), c["code"])


def choose(cands: list[dict], prev_members: Iterable[str], prev_passed: Optional[Iterable[str]],
           prev_buys: Iterable[str] = ()) -> dict:
    """``cands`` = the engine's gate passers (questions 2–3 answered). Returns
    ``{members, also, unsettled, passed}``: the list in order, those that
    passed everything but a cap left out (with ``cap``: sector / financial /
    full), those that passed 1–5 today for the first time, and every code
    that passed 1–5 today (stored, so tomorrow can answer question 6).

    ``prev_passed`` None = no stored day yet: question 6 then reads the
    previous signal day's Buys (``prev_buys``)."""
    was = {str(c).upper() for c in prev_members or ()}
    before = ({str(c).upper() for c in prev_passed} if prev_passed is not None
              else {str(c).upper() for c in prev_buys or ()})

    passed = [c for c in cands if first_miss(c, c["code"] in was) is None]
    settled = [c for c in passed if c["code"] in was or c["code"] in before]
    unsettled = sorted((c for c in passed if c not in settled), key=_order)

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
        if len(chosen) >= MAX_ROWS:
            also.append({**c, "cap": "full"})
        elif sector and per_sector.get(sector, 0) >= SECTOR_CAP:
            also.append({**c, "cap": "sector"})
        elif is_financial(c) and fin >= FINANCIAL_CAP:
            also.append({**c, "cap": "financial"})
        else:
            chosen.append(c)
            if sector:
                per_sector[sector] = per_sector.get(sector, 0) + 1
            if is_financial(c):
                fin += 1
    return {"members": sorted(chosen, key=_order), "also": sorted(also, key=_order),
            "unsettled": unsettled, "passed": [c["code"] for c in passed]}


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


# ---------------------------------------------------------------------------
# Words
# ---------------------------------------------------------------------------

def why_line(c: dict) -> dict:
    """One sentence on why it is on the list: the company, how far under its
    fair price, and the one figure that stands out."""
    m = margin_pct(c)
    mp = max(0, round(m)) if m is not None else None
    strong = tier_key(_n(c.get("score"))) == "excellent"
    lead_en = "A company strong all round" if strong else "A mostly strong company"
    lead_bn = "সব দিকে শক্তিশালী কোম্পানি" if strong else "বেশিরভাগ দিকে শক্তিশালী কোম্পানি"
    y = _n(c.get("div_yield_pct"))
    trend, t_en, t_bn = rl.profit_trend(c)
    pos = _n(c.get("pct_in_range"))
    extra_en = extra_bn = None
    if y is not None and y >= 4:
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
    en = f"{lead_en}, priced {mp}% under what we think it is worth" + (f", {extra_en}." if extra_en else ".")
    bn = f"{lead_bn}। দাম আমাদের হিসাবের ন্যায্য দামের চেয়ে {mp}% কম" + (f", {extra_bn}।" if extra_bn else "।")
    return _bi(en, bn)


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
    """Why a share that passed every question isn't in the list."""
    cap = c.get("cap")
    if cap == "financial":
        return _bi("Passed every question. Left out because 3 banks, finance companies or insurers are already on the list.",
                   "সব প্রশ্নে পাস করেছে। তালিকায় এর মধ্যেই 3টি ব্যাংক, আর্থিক প্রতিষ্ঠান বা বিমা কোম্পানি আছে, তাই বাদ।")
    if cap == "full":
        return _bi(f"Passed every question. Left out to keep the list to {MAX_ROWS}.",
                   f"সব প্রশ্নে পাস করেছে। তালিকা {MAX_ROWS}টিতে রাখতে বাদ।")
    return _bi(f"Passed every question. Left out because {SECTOR_CAP} companies from its sector are already on the list.",
               f"সব প্রশ্নে পাস করেছে। তালিকায় এর সেক্টরের {SECTOR_CAP}টি কোম্পানি এর মধ্যেই আছে, তাই বাদ।")


def almost_row(c: dict, question: int, meeting: Optional[dict] = None) -> Optional[dict]:
    """A strong company that missed one question: what is missing and what
    would bring it in, with its own figures."""
    if question == 4:
        mid, px = fair_mid(c), _n(c.get("ltp"))
        if mid is None:
            miss = _bi("Our ways of working out its fair price disagree, so we can't say what it is worth.",
                       "এর ন্যায্য দাম হিসাবের আমাদের পদ্ধতিগুলো একমত নয়, তাই এর মূল্য বলা যাচ্ছে না।")
            fix = _bi("It comes in once they agree.", "পদ্ধতিগুলো একমত হলে তালিকায় আসবে।")
        else:
            m = margin_pct(c) or 0.0
            line = mid * (1 - MARGIN_JOIN_PCT / 100)
            if m < 0:
                miss = _bi(f"Its price, {_money(px)}, is above our fair price of {_money(mid)}.",
                           f"এর দাম {_money(px)}, যা আমাদের ন্যায্য দাম {_money(mid)}-এর চেয়ে বেশি।")
            elif m < 1:
                miss = _bi(f"Its price, {_money(px)}, is about our fair price of {_money(mid)}.",
                           f"এর দাম {_money(px)}, প্রায় আমাদের ন্যায্য দাম {_money(mid)}-এর সমান।")
            else:
                miss = _bi(f"Only {round(m)}% under our fair price of {_money(mid)}.",
                           f"আমাদের ন্যায্য দাম {_money(mid)}-এর চেয়ে মাত্র {round(m)}% কম।")
            fix = _bi(f"It comes in under {_money(line)}.", f"দাম {_money(line)}-এর নিচে এলে তালিকায় আসবে।")
        return {"question": 4, "miss": miss, "fix": fix}
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


def left_reason(c: Optional[dict], member_question: Optional[int], signal_reason: Optional[dict]) -> dict:
    """Why a share left the list since the last close, in one short line."""
    if c is not None and member_question == 4:
        m = margin_pct(c)
        if m is None:
            return _bi("Our fair-price estimates no longer agree.", "ন্যায্য দামের হিসাব আর একমত নয়।")
        return _bi("Its price came too close to our fair price.", "দাম আমাদের ন্যায্য দামের খুব কাছে চলে এসেছে।")
    if c is not None and member_question == 5:
        return _bi("Its latest results showed profit falling.", "সর্বশেষ আর্থিক ফলে মুনাফা কমেছে।")
    if c is not None and member_question == 1:
        return _bi("The company is no longer mostly strong on today's figures.",
                   "আজকের হিসাবে কোম্পানিটি আর বেশিরভাগ দিকে শক্তিশালী নয়।")
    if c is not None:
        return _bi("A newcomer with a stronger case took its place.", "আরও জোরালো কারণের একটি শেয়ার এর জায়গা নিয়েছে।")
    if signal_reason and signal_reason.get("en") and signal_reason.get("bn"):
        return _bi(signal_reason["en"], signal_reason["bn"])
    return _bi("It no longer passes one of our safety checks.", "আমাদের একটি নিরাপত্তা যাচাইয়ে আর পাস করছে না।")
