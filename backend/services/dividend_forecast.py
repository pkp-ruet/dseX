"""What Premium adds to the dividend calendar (2026-10-31, the Premium Desk
plan). Pure rules; loaders in `dividend_forecast_service.py`.

- `forecast_row`: a company that paid cash for its last fiscal year and has not
  declared for the next one yet — when we expect it to declare (a year after
  last year's notice, or the yearly board meeting DSE already posted) and how
  much (last year's cash at the same share of profit, applied to the profit of
  the last 12 months). Worded as what we expect, and why, with the inputs.
- `capture`: "Worth buying for the dividend?" — how far the price moved across
  the company's last record dates, against the cash paid each time, and what
  is left of today's cash after tax and fees.

Free on the page: last year's declaration date and cash. Premium (screen-only):
the expected window, the expected cash and the capture line.
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Optional

# Tax deducted from a cash dividend at source (with a TIN; 15% without one).
DIVIDEND_TAX = 0.10
# Brokerage + CDBL + exchange charges, each side (the portfolio's default).
FEE_PER_SIDE = 0.004
# How many past record dates the capture line reads.
CAPTURE_EVENTS = 3
# Expected declarations from this many days back (later than last year) …
LATE_DAYS = 60
# … to this many days ahead.
AHEAD_DAYS = 150
# The expected window: last year's date ± this many days.
WINDOW_DAYS = 14
# Profit change applied to last year's cash is held inside these bounds —
# boards rarely move a dividend as far as profit moves.
RATIO_MIN, RATIO_MAX = 0.5, 1.5

_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
_MONTHS_BN = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট",
              "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"]


def _en(d: date) -> str:
    return f"{d.day} {_MONTHS[d.month - 1]}"


def _bn(d: date) -> str:
    return f"{d.day} {_MONTHS_BN[d.month - 1]}"


def _tk(v: float) -> str:
    return f"৳{v:,.2f}" if abs(v) < 100 else f"৳{v:,.0f}"


def _pct_word(v: float) -> str:
    return f"{v:g}%"


def round_pct(v: float) -> float:
    """A dividend % the way boards declare them: 5s from 20%, whole numbers
    from 5%, halves below."""
    if v >= 20:
        return float(round(v / 5) * 5)
    if v >= 5:
        return float(round(v))
    half = round(v * 2) / 2
    return half if half > 0 else round(v, 1)


def one_year_on(d: date) -> date:
    try:
        return d.replace(year=d.year + 1)
    except ValueError:  # 29 Feb
        return d + timedelta(days=365)


def expected_cash(last_pct: float, base_eps: Optional[float], now_eps: Optional[float]) -> dict:
    """{kind, pct, change_pct}: `estimate` (last year's cash moved with profit),
    `same` (nothing newer than last year's results), `may_skip` (profit turned
    to a loss) or `unknown` (no base to compare)."""
    if now_eps is None:
        return {"kind": "same", "pct": round_pct(last_pct), "change_pct": None}
    if now_eps <= 0:
        return {"kind": "may_skip", "pct": None, "change_pct": None}
    if base_eps is None or base_eps <= 0:
        return {"kind": "unknown", "pct": None, "change_pct": None}
    ratio = now_eps / base_eps
    held = min(RATIO_MAX, max(RATIO_MIN, ratio))
    return {"kind": "estimate", "pct": round_pct(last_pct * held), "change_pct": round((ratio - 1) * 100),
            "capped": held != ratio}


def forecast_row(*, code: str, name: Optional[str], last: dict, face_value: float,
                 base_eps: Optional[float], now_eps: Optional[float], now_months: Optional[int],
                 meeting: Optional[date], today: date) -> Optional[dict]:
    """One "Coming next" row, or None when it falls outside the window.

    `last` = last year's final declaration: declaration_date, record_date
    (dates), cash_pct, stock_pct. `now_eps` = profit a share over the last 12
    months when there are results newer than last year's (else None)."""
    decl: Optional[date] = last.get("declaration_date")
    cash_pct = float(last.get("cash_pct") or 0)
    if decl is None or cash_pct <= 0:
        return None
    due = one_year_on(decl)
    if meeting is not None:
        start = end = meeting
    else:
        start, end = due - timedelta(days=WINDOW_DAYS), due + timedelta(days=WINDOW_DAYS)
    if end < today - timedelta(days=LATE_DAYS) or start > today + timedelta(days=AHEAD_DAYS):
        return None
    late = meeting is None and end < today

    cash_ps = round(cash_pct / 100.0 * face_value, 4)
    rec: Optional[date] = last.get("record_date")
    exp = expected_cash(cash_pct, base_eps, now_eps)
    exp_ps = round(exp["pct"] / 100.0 * face_value, 4) if exp.get("pct") is not None else None

    # When we expect it, in words.
    if meeting is not None and meeting == today:
        when_en = "The board meets today on its yearly results. Dividends are declared at that meeting."
        when_bn = "বার্ষিক ফল নিয়ে আজ পর্ষদ সভা। ডিভিডেন্ড সেই সভাতেই ঘোষণা হয়।"
    elif meeting is not None:
        when_en = f"The board meets on {_en(meeting)} on its yearly results. Dividends are declared at that meeting."
        when_bn = f"বার্ষিক ফল নিয়ে পর্ষদ সভা {_bn(meeting)}। ডিভিডেন্ড সেই সভাতেই ঘোষণা হয়।"
    elif late:
        when_en = f"Later than last year: it declared on {_en(decl)} then, and has not yet this year."
        when_bn = f"গত বছরের চেয়ে দেরি: তখন {_bn(decl)} ঘোষণা করেছিল, এ বছর এখনো করেনি।"
    else:
        when_en = f"Around {_en(start)} to {_en(end)}, since it declared on {_en(decl)} last year."
        when_bn = f"{_bn(start)} থেকে {_bn(end)}-এর মধ্যে, কারণ গত বছর {_bn(decl)} ঘোষণা করেছিল।"

    # How much we expect, and why.
    last_en = f"Last year it paid {_pct_word(cash_pct)} ({_tk(cash_ps)} a share)"
    last_bn = f"গত বছর দিয়েছিল {_pct_word(cash_pct)} (শেয়ারপ্রতি {_tk(cash_ps)})"
    kind = exp["kind"]
    if kind == "estimate":
        ch = exp["change_pct"]
        span_en = f"the last {now_months} months" if now_months and now_months != 12 else "the last 12 months"
        span_bn = "গত 12 মাসে"
        if ch is None or abs(ch) < 3:
            move_en, move_bn = "about the same as", "প্রায় একই"
        elif ch > 0:
            move_en, move_bn = f"{ch}% higher than", f"{ch}% বেশি"
        else:
            move_en, move_bn = f"{-ch}% lower than", f"{-ch}% কম"
        if exp.get("capped"):
            rule_en = ("so we expect about {x}: boards seldom raise a dividend as fast as profit grows"
                       if (ch or 0) > 0 else "so we expect about {x}: boards seldom cut a dividend as fast as profit falls")
            rule_bn = ("তাই আমরা আশা করি প্রায় {x}: মুনাফা যত দ্রুত বাড়ে, বোর্ড সাধারণত ডিভিডেন্ড তত বাড়ায় না"
                       if (ch or 0) > 0 else "তাই আমরা আশা করি প্রায় {x}: মুনাফা যত দ্রুত কমে, বোর্ড সাধারণত ডিভিডেন্ড তত কমায় না")
        else:
            rule_en = "so at the same share of profit we expect about {x}"
            rule_bn = "মুনাফার একই অংশ দিলে আমরা আশা করি প্রায় {x}"
        x_en = f"{_pct_word(exp['pct'])} ({_tk(exp_ps)} a share)"
        x_bn = f"{_pct_word(exp['pct'])} (শেয়ারপ্রতি {_tk(exp_ps)})"
        why_en = (f"{last_en} on profit of {_tk(base_eps)} a share. Profit over {span_en} is "
                  f"{_tk(now_eps)} a share, {move_en} that year, " + rule_en.format(x=x_en) + ".")
        if move_bn == "প্রায় একই":
            mid_bn = "সেই বছরের প্রায় সমান"
        else:
            mid_bn = f"সেই বছরের চেয়ে {move_bn}"
        why_bn = (f"{last_bn}, তখন শেয়ারপ্রতি মুনাফা ছিল {_tk(base_eps)}। {span_bn} মুনাফা শেয়ারপ্রতি "
                  f"{_tk(now_eps)}, {mid_bn}। " + rule_bn.format(x=x_bn) + "।")
        word_en, word_bn = f"About {_pct_word(exp['pct'])}", f"প্রায় {_pct_word(exp['pct'])}"
        tone = "good" if (ch or 0) >= 3 else "bad" if (ch or 0) <= -25 else "neutral"
    elif kind == "same":
        why_en = (f"{last_en}. There are no results newer than that year yet, so we expect about "
                  f"the same: {_pct_word(exp['pct'])}.")
        why_bn = (f"{last_bn}। সেই বছরের পরের কোনো ফল এখনো আসেনি, তাই আমরা প্রায় একই আশা করি: "
                  f"{_pct_word(exp['pct'])}।")
        word_en, word_bn = f"About {_pct_word(exp['pct'])}", f"প্রায় {_pct_word(exp['pct'])}"
        tone = "neutral"
    elif kind == "may_skip":
        why_en = (f"{last_en}. Profit over the last 12 months turned to a loss of "
                  f"{_tk(abs(now_eps))} a share, so it may pay less or skip the dividend.")
        why_bn = (f"{last_bn}। গত 12 মাসে শেয়ারপ্রতি {_tk(abs(now_eps))} লোকসান হয়েছে, তাই কম দিতে পারে "
                  f"বা ডিভিডেন্ড না-ও দিতে পারে।")
        word_en, word_bn = "May skip", "না-ও দিতে পারে"
        tone = "bad"
    else:
        why_en = f"{last_en}. We can't compare this year's profit with that year's, so we make no estimate."
        why_bn = f"{last_bn}। এ বছরের মুনাফা সেই বছরের সঙ্গে মেলানো যাচ্ছে না, তাই অনুমান দিচ্ছি না।"
        word_en, word_bn = "No estimate", "অনুমান নেই"
        tone = "neutral"

    return {
        "trading_code": code,
        "company_name": name,
        # Free: last year's facts.
        "last_declared": decl.isoformat(),
        "last_record_date": rec.isoformat() if rec else None,
        "last_cash_pct": cash_pct,
        "last_cash_per_share": cash_ps,
        "last_stock_pct": float(last.get("stock_pct") or 0) or None,
        "face_value": face_value,
        # Premium: when and how much.
        "window_start": start.isoformat(),
        "window_end": end.isoformat(),
        "meeting": meeting.isoformat() if meeting else None,
        "late": late,
        "expected_record": one_year_on(rec).isoformat() if rec else None,
        "kind": kind,
        "expected_pct": exp.get("pct"),
        "expected_cash_per_share": exp_ps,
        "change_pct": exp.get("change_pct"),
        "word_en": word_en,
        "word_bn": word_bn,
        "tone": tone,
        "when_en": when_en,
        "when_bn": when_bn,
        "why_en": why_en,
        "why_bn": why_bn,
    }


def sort_forecast(rows: list[dict]) -> list[dict]:
    """Board meetings first (a date is set), then the expected window, soonest first."""
    return sorted(rows, key=lambda r: (r["meeting"] is None, r["window_start"], r["trading_code"]))


# --------------------------------------------------------------------------- #
# Worth buying for the dividend?
# --------------------------------------------------------------------------- #

def price_move(closes: list[tuple[str, float]], record_date: str) -> Optional[tuple[float, float]]:
    """(last close before the record date, first close after it) from
    (ISO date, close) pairs, or None when either side is missing."""
    before = [c for d, c in closes if d < record_date and c and c > 0]
    after = [c for d, c in closes if d > record_date and c and c > 0]
    if not before or not after:
        return None
    by_date = sorted(((d, c) for d, c in closes if c and c > 0), key=lambda x: x[0])
    b = [c for d, c in by_date if d < record_date][-1]
    a = [c for d, c in by_date if d > record_date][0]
    return b, a


def capture(past: list[dict], cash_now: float, price_now: Optional[float]) -> Optional[dict]:
    """The "worth buying for it?" line from past record dates.

    `past` = [{record_date, cash, before, after}] newest first (only events with
    both closes). None without at least one past event or today's cash."""
    events = [p for p in past if p.get("before") and p.get("after") and (p.get("cash") or 0) > 0][:CAPTURE_EVENTS]
    if not events or not cash_now or cash_now <= 0:
        return None
    n = len(events)
    drop = sum(p["before"] - p["after"] for p in events) / n
    cash_then = sum(p["cash"] for p in events) / n
    gave_back = drop / cash_then if cash_then else 0.0
    if gave_back >= 1.0:
        level, word_en, word_bn = "bad", "Price fell by more", "দাম বেশি কমেছে"
    elif gave_back >= 0.5:
        level, word_en, word_bn = "watch", "Price gave most of it back", "দাম বেশিরভাগই ফেরত নিয়েছে"
    else:
        level, word_en, word_bn = "good", "Price mostly held", "দাম মোটামুটি ধরে ছিল"

    if n == 1:
        lead_en, lead_bn = "On its last record date", "শেষ রেকর্ড ডেটে"
    else:
        lead_en, lead_bn = f"On its last {n} record dates", f"শেষ {n}টি রেকর্ড ডেটে"
    avg_en = "" if n == 1 else " on average"
    avg_bn = "" if n == 1 else " গড়ে"
    if drop > 0:
        move_en = f"the price fell {_tk(drop)}{avg_en}"
        move_bn = f"দাম{avg_bn} {_tk(drop)} কমেছে"
    elif drop < 0:
        move_en = f"the price rose {_tk(-drop)}{avg_en}"
        move_bn = f"দাম{avg_bn} {_tk(-drop)} বেড়েছে"
    else:
        move_en, move_bn = "the price did not move", "দাম বদলায়নি"
    if drop >= cash_then:
        cmp_en, cmp_bn = f"more than the {_tk(cash_then)} cash", f"যা {_tk(cash_then)} নগদের চেয়ে বেশি"
    elif drop > 0:
        cmp_en, cmp_bn = f"against {_tk(cash_then)} of cash", f"আর নগদ ছিল {_tk(cash_then)}"
    else:
        cmp_en, cmp_bn = f"and it paid {_tk(cash_then)} of cash", f"আর নগদ দিয়েছিল {_tk(cash_then)}"
    keep = cash_now * (1 - DIVIDEND_TAX) - (2 * FEE_PER_SIDE * price_now if price_now else 0.0)
    if keep > 0:
        keep_en = f"Of today's {_tk(cash_now)} you keep about {_tk(keep)} after 10% tax and fees."
        keep_bn = f"আজকের {_tk(cash_now)}-এর মধ্যে 10% কর আর খরচের পর থাকে প্রায় {_tk(keep)}।"
    else:
        keep_en = f"Of today's {_tk(cash_now)}, 10% tax and the fees of buying and selling take it all."
        keep_bn = f"আজকের {_tk(cash_now)}-এর পুরোটাই 10% কর আর কেনাবেচার খরচে চলে যায়।"
    return {
        "events": n,
        "avg_drop": round(drop, 2),
        "avg_cash": round(cash_then, 2),
        "keep": round(keep, 2),
        "level": level,
        "word_en": word_en,
        "word_bn": word_bn,
        "line_en": f"{lead_en} {move_en}, {cmp_en}. {keep_en}",
        "line_bn": f"{lead_bn} {move_bn}, {cmp_bn}। {keep_bn}",
    }
