"""Portfolio builder (2026-11-23) — the rules, pure.

A signed-in reader says how much money, what it is for and what kind of
companies they like; we build a whole portfolio from the companies our
analysis rates strong: which shares, how many of each, and the job each one
does in the mix. Plan + mockup: https://claude.ai/artifact/17PPMcRFtJd3S841YC97BM
(user: "start phase 1. also user must sign in to use this builder").

``build`` in five steps:

1. **The pool** — the recommendation engine's explore pool (mostly strong or
   better, a profit, no serious warnings, loans under savings, traded, enough
   data), less the businesses left out, less what can't be bought in this
   size (one share must fit, and each share's money stays under
   ``TRADE_SHARE_PCT`` of a normal day's trading).
2. **Today's price** — a Buy today is "buy now"; a strong company kept off the
   Buy only by its price ("wait"), when today's price is within
   ``WAIT_WITHIN_PCT`` of our buy price; anything else is left out today.
3. **Jobs** — each company fits some of hold steady / pays cash / grows /
   low price; the purpose sets the mix of jobs (``MIX``).
4. **Picking** — best value first, inside the spread lines (one share, one
   business, banks + finance + insurers, waiting shares).
5. **Sizing** — each job's part of the money over its shares, tilted a little
   to the stronger pick, capped by the spread lines, then whole shares in
   taka with the broker fee set aside first, so a plan never costs more than
   the amount.

Never a performance claim or an expected return. The same answers on the
same day give the same plan. Tests: ``backend/tests/test_portfolio_builder.py``.
"""
from __future__ import annotations

import math
from typing import Optional

from backend.services import research_lists as rl
from backend.services.tiers import TIER_WORDS, TIER_WORDS_BN, tier_key

_n = rl._n

PURPOSES = ("income", "growth", "safe", "mix")
HORIZONS = ("lt1", "1to3", "gt3")
# Phase 2 (2026-11-23): "fresh" = new money on its own; "mine" = new money
# added to the reader's main portfolio — the spread lines then hold on the
# whole of it (what they own + the new money), new businesses come first, a
# share they own may get more while it stays under the one-share line.
STARTS = ("fresh", "mine")
LIKES = ("big", "cash", "no_loans", "growing", "low_price")
LEAVE_OUT = ("banks", "insurers", "tobacco")
JOBS = ("hold", "cash", "grow", "low")

MIN_AMOUNT = 10_000
MAX_AMOUNT = 100_000_000          # ৳10 crore
MAX_LIKES = 2
MAX_EXCLUDE = 30                  # "Not for me" codes carried into a rebuild
FEE_PCT = 0.4                     # broker fee a side (the portfolio's default)
DIV_TAX_PCT = 10.0                # tax on cash dividends (with a TIN)

# The purpose sets the mix of jobs, in % of the money.
MIX: dict[str, dict[str, int]] = {
    "income": {"hold": 30, "cash": 50, "low": 20},
    "growth": {"hold": 30, "grow": 40, "low": 30},
    "safe": {"hold": 60, "cash": 40},
    "mix": {"hold": 35, "cash": 25, "grow": 20, "low": 20},
}

# How many shares for the money: (under this amount, shares).
SHARE_STEPS = ((25_000, 3), (75_000, 5), (300_000, 7), (1_000_000, 8))
MAX_SHARES = 10

# Spread lines. The portfolio check calls one share over 25% "Sell some" and
# one business over 40% heavy, so a new plan stays well inside both.
ONE_SHARE_MAX_PCT = 20.0
SECTOR_MAX_PCT = 30.0
FIN_MAX_PCT = 30.0
# Each share's money under this much of what it trades on a normal day, so a
# big plan can be bought (and later sold) without moving the price.
TRADE_SHARE_PCT = 2.0
# A strong company whose price is this close to our buy price waits for it.
WAIT_WITHIN_PCT = 10.0
# The signal reasons that only mean "the price is a little high today".
WAIT_REASONS = frozenset({"good_wait_price", "quality_expensive", "near_52w_high"})
# How far a stronger pick's share is tilted up (and a weaker one's down).
TILT = 0.15
# From this much money, the plan says to buy over a few days.
BIG_MONEY = 2_500_000
# "Start from my shares": a business they don't own yet is worth this much more.
NEW_BUSINESS_BONUS = 1.25
# ...and the new shares never take the portfolio past this many shares (at least 2 new).
MAX_PORTFOLIO_SHARES = 12
# A share is left out when the lines leave it less than this part of an equal share.
MIN_ROOM_PART = 0.5
# Money left over past this share of the amount gets a note saying why.
LEFT_NOTE_PCT = 10.0

# Job lines.
HOLD_MCAP_MN = 10_000             # ৳1,000 crore
HOLD_TRADE_MN = 5.0               # ৳50 lakh a day
CASH_YIELD_PCT = 4.0
GROW_PCT = 10.0
GROW_CAGR = 5.0                   # the 5-year profit growth part of the grade (0–10)
LOW_P4 = 6.0                      # under the middle of our fair price (5.5)
# Likes.
BIG_MCAP_MN = 50_000              # ৳5,000 crore
NO_LOANS_PCT = 5.0                # loans under 5% of the company's market value
SAFE_LOANS_PCT = 20.0             # "Keep it safe": loans under 20% of market value

_FINANCIAL = frozenset({"BANK", "NBFI", "INSURANCE"})
_LENDERS = frozenset({"BANK", "NBFI"})

JOB_WORDS = {
    "hold": ("Hold steady", "স্থির ভিত্তি"),
    "cash": ("Pays cash", "নগদ দেয়"),
    "grow": ("Grows", "বাড়ছে"),
    "low": ("Low price", "কম দামে"),
}


def _bi(en: str, bn: str) -> dict:
    return {"en": en, "bn": bn}


def _r(x: float, nd: int = 1):
    v = round(float(x), nd)
    return int(v) if v == int(v) else v


def _taka(x: float) -> str:
    """৳1,00,000 in the Bangladeshi grouping (lakh / crore)."""
    v = int(round(x))
    s = str(abs(v))
    if len(s) > 3:
        head, tail = s[:-3], s[-3:]
        parts = []
        while len(head) > 2:
            parts.insert(0, head[-2:])
            head = head[:-2]
        if head:
            parts.insert(0, head)
        s = ",".join(parts + [tail])
    return f"{'-' if v < 0 else ''}৳{s}"


def _crore(mn: float) -> tuple[str, str]:
    """৳ million → "৳12,000 crore" / "12,000 কোটি টাকা"."""
    cr = mn / 10
    txt = f"{cr:,.0f}" if cr >= 100 else f"{_r(cr)}"
    return f"৳{txt} crore", f"{txt} কোটি টাকা"


# ---------------------------------------------------------------------------
# Answers
# ---------------------------------------------------------------------------

def clean_answers(raw: dict) -> dict:
    """The reader's answers, checked. A bad value is a ValueError (the
    router turns it into a 400), never a guess."""
    try:
        amount = float(raw.get("amount"))
    except (TypeError, ValueError):
        raise ValueError("bad_amount")
    if not math.isfinite(amount) or amount < MIN_AMOUNT or amount > MAX_AMOUNT:
        raise ValueError("bad_amount")
    purpose = raw.get("purpose") or "mix"
    if purpose not in PURPOSES:
        raise ValueError("bad_purpose")
    horizon = raw.get("horizon") or "gt3"
    if horizon not in HORIZONS:
        raise ValueError("bad_horizon")
    likes = list(dict.fromkeys(raw.get("likes") or []))
    if any(k not in LIKES for k in likes) or len(likes) > MAX_LIKES:
        raise ValueError("bad_likes")
    leave = list(dict.fromkeys(raw.get("leave_out") or []))
    if any(k not in LEAVE_OUT for k in leave):
        raise ValueError("bad_leave_out")
    exclude = []
    for c in (raw.get("exclude") or [])[:MAX_EXCLUDE]:
        c = str(c or "").strip().upper()
        if c and len(c) <= 20 and c.isascii() and c.replace("-", "").replace("&", "").isalnum():
            exclude.append(c)
    start = raw.get("start") or "fresh"
    if start not in STARTS:
        raise ValueError("bad_start")
    return {"amount": int(round(amount)), "purpose": purpose, "horizon": horizon,
            "likes": [k for k in LIKES if k in likes], "leave_out": [k for k in LEAVE_OUT if k in leave],
            "exclude": list(dict.fromkeys(exclude)), "start": start}


def share_count(amount: float) -> int:
    for under, n in SHARE_STEPS:
        if amount < under:
            return n
    return MAX_SHARES


def share_cap_pct(n: int) -> float:
    """No share over 20% of the money; under 5 shares, an equal part each."""
    return max(ONE_SHARE_MAX_PCT, 100.0 / n) if 0 < n < 5 else ONE_SHARE_MAX_PCT


def sector_cap_pct(n: int) -> float:
    return max(SECTOR_MAX_PCT, share_cap_pct(n))


def mine_context(holdings: list[dict], amount: float) -> Optional[dict]:
    """The reader's main portfolio as the "start from my shares" mode reads it.
    ``holdings`` = [{code, value, sector, sector_class, ...}] at today's
    prices. None when there is nothing priced to start from."""
    rows = [h for h in holdings or [] if h.get("code") and (_n(h.get("value")) or 0) > 0]
    if not rows:
        return None
    by_code: dict[str, float] = {}
    by_sector: dict[str, float] = {}
    fin = 0.0
    for h in rows:
        v = float(h["value"])
        by_code[h["code"]] = by_code.get(h["code"], 0.0) + v
        sec = h.get("sector") or ""
        by_sector[sec] = by_sector.get(sec, 0.0) + v
        if (h.get("sector_class") or "GENERAL") in _FINANCIAL:
            fin += v
    held = sum(by_code.values())
    return {"held": held, "total": held + float(amount), "code": by_code, "sector": by_sector,
            "fin": fin, "count": len(by_code)}


def room(c: dict, amount: float, mine: dict) -> float:
    """Taka of new money this company can take before the whole portfolio
    passes a line: one share, its business, banks + finance + insurers."""
    total = mine["total"]
    r = ONE_SHARE_MAX_PCT / 100 * total - mine["code"].get(c.get("code"), 0.0)
    r = min(r, SECTOR_MAX_PCT / 100 * total - mine["sector"].get(c.get("sector") or "", 0.0))
    if _financial(c):
        r = min(r, FIN_MAX_PCT / 100 * total - mine["fin"])
    return max(0.0, min(r, float(amount)))


# ---------------------------------------------------------------------------
# One company
# ---------------------------------------------------------------------------

def trading_mn(c: dict) -> Optional[float]:
    """৳ million on a normal day: the middle day of 30, else the 7-day average."""
    med = _n(c.get("turnover_med30_mn"))
    return med if med is not None else _n(c.get("turnover_mn"))


def cash_ps(c: dict) -> Optional[float]:
    """The year's cash dividend a share, before tax."""
    dps = _n(c.get("div_latest_dps"))
    if dps is not None and dps > 0:
        return dps
    y, px = _n(c.get("div_yield_pct")), _n(c.get("ltp"))
    return y * px / 100.0 if y and px else None


def _lender(c: dict) -> bool:
    return (c.get("sector_class") or "GENERAL") in _LENDERS


def _financial(c: dict) -> bool:
    return (c.get("sector_class") or "GENERAL") in _FINANCIAL


def traits(c: dict) -> set[str]:
    """The likes a company has (question 3)."""
    out = set()
    if (_n(c.get("mcap_mn")) or 0) >= BIG_MCAP_MN:
        out.add("big")
    if c.get("paid_years") == 5:
        out.add("cash")
    loans = _n(c.get("loan_pct_mcap"))
    if not _financial(c) and loans is not None and loans <= NO_LOANS_PCT:
        out.add("no_loans")
    trend = rl.profit_trend(c)[0]
    if trend is not None and trend >= GROW_PCT:
        out.add("growing")
    p4 = _n(c.get("p4_val"))
    if p4 is not None and p4 >= LOW_P4:
        out.add("low_price")
    return out


def job_fits(c: dict) -> dict[str, float]:
    """{job: how well it fits, 0–1} for the jobs this company can do."""
    quality = (_n(c.get("score")) or 0.0) / 100
    out: dict[str, float] = {}

    mcap = _n(c.get("mcap_mn")) or 0.0
    trade = trading_mn(c)
    cat = (c.get("cat") or "").strip().upper()
    if cat == "A" and mcap >= HOLD_MCAP_MN and (trade is None or trade >= HOLD_TRADE_MN):
        size = min(1.0, (mcap / 100_000) ** 0.5)
        stab = _n(c.get("eps_stability"))
        stab = 0.5 if stab is None else max(0.0, min(1.0, stab))
        out["hold"] = 0.5 * quality + 0.3 * size + 0.2 * stab

    y = _n(c.get("div_yield_pct"))
    if c.get("paid_years") == 5 and c.get("div_safety") == "safe" and y is not None and y >= CASH_YIELD_PCT:
        out["cash"] = 0.6 * min(y, 10.0) / 10 + 0.4 * quality

    trend = rl.profit_trend(c)[0]
    cagr = _n(c.get("p1_eps_cagr"))
    if trend is not None and trend >= GROW_PCT and (cagr is None or cagr >= GROW_CAGR):
        out["grow"] = 0.5 * min(trend, 60.0) / 60 + 0.3 * (cagr if cagr is not None else GROW_CAGR) / 10 + 0.2 * quality

    p4 = _n(c.get("p4_val"))
    conf = ((c.get("fair_value") or {}).get("confidence") or "").lower()
    if p4 is not None and p4 >= LOW_P4 and conf != "low":
        out["low"] = 0.6 * min(1.0, (p4 - 5.5) / 3) + 0.4 * quality
    return out


def price_state(c: dict) -> Optional[str]:
    """"now" (a Buy today), "wait" (strong, kept off the Buy only by a price
    within WAIT_WITHIN_PCT of our buy price), or None (left out today)."""
    if c.get("signal") == "buy":
        return "now"
    if c.get("reason_key") in WAIT_REASONS:
        buy, px = _n(c.get("buy_below")), _n(c.get("ltp"))
        if buy and px and buy > 0 and px <= buy * (1 + WAIT_WITHIN_PCT / 100):
            return "wait"
    return None


def unit_price(c: dict, state: str) -> Optional[float]:
    """What one share costs in the plan: today's price, or the price it waits for."""
    if state == "wait":
        return _n(c.get("buy_below"))
    return _n(c.get("ltp"))


def left_out(c: dict, answers: dict, per_share: float, mine: Optional[dict] = None) -> Optional[str]:
    """Why a company can't be in this plan, or None. Keys only (counted)."""
    if c.get("code") in set(answers.get("exclude") or []):
        return "excluded"
    if mine is not None:
        # A share they own gets more only at today's price, never "wait".
        if c.get("code") in mine["code"] and price_state(c) != "now":
            return "held"
        if room(c, answers["amount"], mine) < per_share * MIN_ROOM_PART:
            return "heavy"
    leave = set(answers.get("leave_out") or [])
    sc = c.get("sector_class") or "GENERAL"
    if "banks" in leave and sc in _LENDERS:
        return "leave_out"
    if "insurers" in leave and sc == "INSURANCE":
        return "leave_out"
    if "tobacco" in leave and "tobacco" in f"{c.get('name') or ''} {c.get('sector') or ''}".lower():
        return "leave_out"
    if answers.get("purpose") == "safe":
        if (c.get("cat") or "").strip().upper() != "A" or _financial(c):
            return "safe"
        loans = _n(c.get("loan_pct_mcap"))
        if loans is not None and loans > SAFE_LOANS_PCT:
            return "safe"
    state = price_state(c)
    if state is None:
        return "price"
    px = unit_price(c, state)
    if not px or px <= 0:
        return "price"
    if px > per_share * 1.5:
        return "too_dear"
    trade = trading_mn(c)
    if trade is not None and per_share > trade * 1_000_000 * TRADE_SHARE_PCT / 100:
        return "trading"
    return None


# ---------------------------------------------------------------------------
# Picking
# ---------------------------------------------------------------------------

def _slots(mix: dict[str, int], n: int) -> dict[str, int]:
    """Shares per job: the mix's % of n, largest remainder, mix order on ties."""
    raw = {j: mix[j] * n / 100 for j in mix}
    slots = {j: int(math.floor(v)) for j, v in raw.items()}
    left = n - sum(slots.values())
    order = sorted(mix, key=lambda j: (-(raw[j] - slots[j]), -mix[j], JOBS.index(j)))
    for j in order[:left]:
        slots[j] += 1
    return slots


def _value(c: dict, fit: float, likes: set[str], state: str, mine: Optional[dict] = None) -> float:
    bonus = 1 + 0.25 * len(traits(c) & likes)
    conv = (_n(c.get("conviction")) or 50.0) / 100
    v = fit * bonus * (0.5 + 0.5 * conv) * (1.0 if state == "now" else 0.8)
    if mine is not None and (c.get("sector") or "") not in mine["sector"]:
        v *= NEW_BUSINESS_BONUS
    return v


def pick(cands: list[dict], answers: dict, n: int, mine: Optional[dict] = None) -> list[dict]:
    """[{c, job, state, value}] — best value first inside the spread lines;
    a job that can't fill its slots hands them to the other jobs."""
    mix = MIX[answers["purpose"]]
    likes = set(answers.get("likes") or [])
    slots = _slots(mix, n)
    sector_n = max(1, int(math.floor(sector_cap_pct(n) * n / 100 + 1e-9)))
    fin_n = int(math.floor(FIN_MAX_PCT * n / 100 + 1e-9))
    wait_n = max(1, n // 3)

    entries = []
    for c in cands:
        state = price_state(c)
        if state is None:
            continue
        for job, fit in job_fits(c).items():
            if job in mix:
                entries.append((_value(c, fit, likes, state, mine), job, c, state))
    entries.sort(key=lambda e: (-e[0], JOBS.index(e[1]), e[2]["code"]))

    chosen: list[dict] = []
    used: set[str] = set()
    sectors: dict[str, int] = {}
    fin = wait = 0

    def fits_lines(c: dict, state: str) -> bool:
        if c["code"] in used:
            return False
        if sectors.get(c.get("sector") or "", 0) >= sector_n:
            return False
        if _financial(c) and fin >= fin_n:
            return False
        return not (state == "wait" and wait >= wait_n)

    for strict in (True, False):
        for value, job, c, state in entries:
            if len(chosen) >= n:
                break
            if strict and slots.get(job, 0) <= 0:
                continue
            if not fits_lines(c, state):
                continue
            chosen.append({"c": c, "job": job, "state": state, "value": value})
            used.add(c["code"])
            sectors[c.get("sector") or ""] = sectors.get(c.get("sector") or "", 0) + 1
            fin += 1 if _financial(c) else 0
            wait += 1 if state == "wait" else 0
            if strict:
                slots[job] -= 1
    return chosen


# ---------------------------------------------------------------------------
# Sizing
# ---------------------------------------------------------------------------

def _base_weights(chosen: list[dict], mix: dict[str, int]) -> list[float]:
    present = {p["job"] for p in chosen}
    total = sum(mix[j] for j in present) or 1
    per_job = {j: mix[j] / total * 100 for j in present}
    count = {j: sum(1 for p in chosen if p["job"] == j) for j in present}
    convs = [(_n(p["c"].get("conviction")) or 50.0) for p in chosen]
    mean = sum(convs) / len(convs) if convs else 50.0
    out = []
    for p, conv in zip(chosen, convs):
        w = per_job[p["job"]] / count[p["job"]]
        w *= 1 + TILT * max(-1.0, min(1.0, (conv - mean) / 15))
        out.append(w)
    s = sum(out) or 1
    return [w / s * 100 for w in out]


def limits(chosen: list[dict], amount: float, mine: Optional[dict] = None) -> tuple[list[float], list[tuple[list[int], float]]]:
    """(each share's line, [(shares, their group's line)]) in % of the new
    money. A fresh plan: the plan's own lines. "Start from my shares": the
    lines on the whole portfolio, less what the reader already has in that
    share, business and banks + finance + insurers."""
    n = len(chosen)
    by_sector: dict[str, list[int]] = {}
    for i, p in enumerate(chosen):
        by_sector.setdefault(p["c"].get("sector") or "", []).append(i)
    fin = [i for i, p in enumerate(chosen) if _financial(p["c"])]
    if mine is None:
        groups = [(idx, sector_cap_pct(n)) for idx in by_sector.values() if len(idx) > 1]
        if len(fin) > 1:
            groups.append((fin, FIN_MAX_PCT))
        return [share_cap_pct(n)] * n, groups

    total = mine["total"]

    def pct(taka: float) -> float:
        return max(0.0, min(100.0, taka / amount * 100)) if amount > 0 else 0.0

    shares = [pct(ONE_SHARE_MAX_PCT / 100 * total - mine["code"].get(p["c"].get("code"), 0.0)) for p in chosen]
    groups = [(idx, pct(SECTOR_MAX_PCT / 100 * total - mine["sector"].get(sec, 0.0))) for sec, idx in by_sector.items()]
    if fin:
        groups.append((fin, pct(FIN_MAX_PCT / 100 * total - mine["fin"])))
    return shares, groups


def capped_weights(chosen: list[dict], base: list[float], share_caps: Optional[list[float]] = None,
                   groups: Optional[list[tuple[list[int], float]]] = None) -> list[float]:
    """The base weights with the spread lines held: each share, each business
    and banks + finance + insurers together. Money a capped group can't take
    goes to the others; when every share is capped the rest stays cash."""
    n = len(chosen)
    if share_caps is None or groups is None:
        share_caps, groups = limits(chosen, 100.0)

    fixed: dict[int, float] = {}
    w = list(base)
    for _ in range(4 * n + 4):
        free = [i for i in range(n) if i not in fixed]
        rest = max(0.0, 100.0 - sum(fixed.values()))
        base_free = sum(base[i] for i in free)
        w = [fixed[i] if i in fixed else (base[i] / base_free * rest if base_free > 0 else 0.0) for i in range(n)]
        over = [i for i in free if w[i] > share_caps[i] + 1e-9]
        if over:
            for i in over:
                fixed[i] = share_caps[i]
            continue
        moved = False
        for idx, cap in groups:
            tot = sum(w[i] for i in idx)
            if tot > cap + 1e-9:
                # The whole group comes down to its line, shares already held
                # at another line included (scaling down never breaks one).
                for i in idx:
                    fixed[i] = w[i] / tot * cap
                moved = True
                break
        if not moved:
            break
    return w


def size(chosen: list[dict], answers: dict, mine: Optional[dict] = None) -> tuple[list[dict], dict]:
    """Whole shares in taka. Returns (rows, totals)."""
    amount = float(answers["amount"])
    mix = MIX[answers["purpose"]]
    if not chosen:
        return [], {"amount": amount, "now": 0, "kept": 0, "fee": 0, "left": amount}
    n = len(chosen)
    share_caps, groups = limits(chosen, amount, mine)
    weights = capped_weights(chosen, _base_weights(chosen, mix), share_caps, groups)
    investable = amount / (1 + FEE_PCT / 100)
    cap_amt = [c / 100 * investable for c in share_caps]
    group_amt = [(idx, cap / 100 * investable) for idx, cap in groups]
    prices = [unit_price(p["c"], p["state"]) or 0.0 for p in chosen]
    targets = [investable * w / 100 for w in weights]
    qty = [int(target // px) if px > 0 else 0 for target, px in zip(targets, prices)]
    spent = sum(q * px for q, px in zip(qty, prices))

    # The leftover taka goes to the share furthest under its target (then the
    # least over it), one share at a time, while a whole share fits and no
    # share, business or banks + finance + insurers passes its line.
    for _ in range(2000):
        left = investable - spent
        best, best_gap = None, None
        for i, px in enumerate(prices):
            if px <= 0 or px > left + 1e-9 or (qty[i] + 1) * px > cap_amt[i] + 1e-9:
                continue
            if any(i in idx and sum(qty[k] * prices[k] for k in idx) + px > amt + 1e-9 for idx, amt in group_amt):
                continue
            gap = (targets[i] - qty[i] * px) / max(targets[i], 1.0)
            if best_gap is None or gap > best_gap:
                best, best_gap = i, gap
        if best is None:
            break
        qty[best] += 1
        spent += prices[best]

    rows = []
    for p, q, px, w in zip(chosen, qty, prices, weights):
        if q <= 0:
            continue
        rows.append({**p, "qty": q, "unit": px, "amount": round(q * px, 2)})
    spent = sum(r["amount"] for r in rows)
    fee = round(spent * FEE_PCT / 100)
    now = sum(r["amount"] for r in rows if r["state"] == "now")
    kept = sum(r["amount"] for r in rows if r["state"] == "wait")
    return rows, {"amount": amount, "now": round(now), "kept": round(kept), "fee": fee,
                  "left": round(amount - spent - fee)}


# ---------------------------------------------------------------------------
# Words
# ---------------------------------------------------------------------------

def _group(c: dict) -> tuple[str, str]:
    key = tier_key(_n(c.get("score")))
    return TIER_WORDS.get(key, "Unrated"), TIER_WORDS_BN.get(key, "রেটিং নেই")


def why(c: dict, job: str) -> dict:
    """One sentence on why this share is in the plan, in its job's words."""
    g_en, g_bn = _group(c)
    if job == "hold":
        cr_en, cr_bn = _crore(_n(c.get("mcap_mn")) or 0.0)
        return _bi(f"A big, steady company worth {cr_en}, {g_en.lower()} on our checks.",
                   f"{cr_bn} মূল্যের বড়, স্থির কোম্পানি; আমাদের যাচাইয়ে {g_bn}।")
    if job == "cash":
        y = _r(_n(c.get("div_yield_pct")) or 0.0)
        return _bi(f"Paid cash in each of the last 5 years: about ৳{y} a year on every ৳100 at today's price.",
                   f"গত 5 বছরের প্রতি বছর নগদ ডিভিডেন্ড দিয়েছে: আজকের দামে প্রতি ৳100-এ বছরে প্রায় ৳{y}।")
    if job == "grow":
        t, t_en, t_bn = rl.profit_trend(c)
        t = _r(t or 0.0, 0)
        return _bi(f"Profit up {t}% ({t_en}), and the company is {g_en.lower()} on our checks.",
                   f"মুনাফা {t}% বেড়েছে ({t_bn}), আর কোম্পানিটি আমাদের যাচাইয়ে {g_bn}।")
    fv = c.get("fair_value") or {}
    mid, px = _n(fv.get("center")), _n(c.get("ltp"))
    m = round((1 - px / mid) * 100) if mid and px and mid > 0 and not fv.get("estimates_disagree") else None
    if m is not None and m >= 1:
        return _bi(f"Its price is {m}% under the middle of our fair price for it.",
                   f"দাম আমাদের ন্যায্য দামের মাঝামাঝির চেয়ে {m}% কম।")
    return _bi("Its price is low for the profit it makes.", "মুনাফার তুলনায় দাম কম।")


def wait_why(c: dict) -> dict:
    if c.get("reason_key") == "near_52w_high":
        return _bi("Its price is near the top of its year, so it is worth waiting for a lower one.",
                   "দাম এখন বছরের সর্বোচ্চের কাছাকাছি, তাই একটু কম দামের অপেক্ষা ভালো।")
    return _bi("Today's price is a little high for the profit it makes.",
               "মুনাফার তুলনায় আজকের দাম একটু বেশি।")


def stronger_notes(holdings: list[dict], cands: list[dict], limit: int = 2) -> list[dict]:
    """For a share they own that we grade mostly weak or mixed (or in Z): a
    company in the same business we grade 10+ points stronger, said as two
    facts, never "sell"."""
    out = []
    for h in sorted(holdings or [], key=lambda h: -(_n(h.get("value")) or 0)):
        if len(out) >= limit:
            break
        score = _n(h.get("score"))
        z = (h.get("cat") or "").strip().upper() == "Z"
        if score is None or (tier_key(score) not in ("weak", "average") and not z):
            continue
        same = [c for c in cands if (c.get("sector") or "") == (h.get("sector") or "") and c.get("code") != h["code"]
                and (_n(c.get("score")) or 0) >= score + 10]
        if not same:
            continue
        best = max(same, key=lambda c: (_n(c.get("score")) or 0, c["code"]))
        hg, bg = _group(h), _group(best)
        out.append({"key": "stronger", **_bi(
            f"We grade {h['code']}, which you own, {hg[0].lower()}. In the same business we grade {best['code']} {bg[0].lower()}.",
            f"আপনার {h['code']} আমাদের গ্রেডে {hg[1]}। একই ব্যবসায় {best['code']} আমাদের গ্রেডে {bg[1]}।")})
    return out


def mine_notes(mine: dict, holdings: list[dict], amount: float) -> list[dict]:
    """What "start from my shares" did with what they own."""
    total = mine["total"]
    out = [{"key": "mine", **_bi(
        f"Your shares are worth {_taka(mine['held'])} today. With {_taka(amount)} more, the lines hold on the "
        f"whole {_taka(total)}: no share over 20% and no business over 30%.",
        f"আজ আপনার শেয়ারের মূল্য {_taka(mine['held'])}। আরও {_taka(amount)} যোগ করলে মোট {_taka(total)}-এর ওপর "
        "নিয়ম মানা হয়েছে: কোনো শেয়ার 20%-এর বেশি নয়, কোনো ব্যবসা 30%-এর বেশি নয়।")}]
    names = {h.get("sector") or "": h.get("sector_bn") or h.get("sector") or "" for h in holdings}
    heavy = sorted(((s, v) for s, v in mine["sector"].items() if s and v >= SECTOR_MAX_PCT / 100 * total),
                   key=lambda sv: -sv[1])[:2]
    fin_secs = {h.get("sector") for h in holdings if (h.get("sector_class") or "GENERAL") in _FINANCIAL}
    told_fin = 0.0
    for sec, v in heavy:
        pct = round(v / total * 100)
        if sec in fin_secs:
            told_fin += v
        out.append({"key": "heavy", **_bi(
            f"{pct}% of all your money is in one business, {sec}, so this plan adds nothing there.",
            f"আপনার মোট টাকার {pct}% একটি ব্যবসায়, {names.get(sec) or sec}-এ, তাই এই পরিকল্পনায় সেখানে কিছু যোগ হয়নি।")})
    # Banks + finance + insurers: only when it says more than the business line above.
    if mine["fin"] >= FIN_MAX_PCT / 100 * total and mine["fin"] - told_fin >= 0.05 * total:
        pct = round(mine["fin"] / total * 100)
        out.append({"key": "fin", **_bi(
            f"{pct}% of all your money is in banks, finance companies and insurers, so this plan adds none.",
            f"আপনার মোট টাকার {pct}% আছে ব্যাংক, আর্থিক প্রতিষ্ঠান ও বিমায়, তাই এই পরিকল্পনায় এগুলো যোগ হয়নি।")})
    return out


def notes(answers: dict, n_target: int, n_got: int, fdr_rate: Optional[float], left: float = 0.0,
          mine: bool = False) -> list[dict]:
    out = []
    amount = answers["amount"]
    if n_got and left > amount * LEFT_NOTE_PCT / 100:
        out.append({"key": "left", **_bi(
            f"{_taka(left)} is left over: putting it in would make one share or one business too big a part "
            "of your money.",
            f"{_taka(left)} বাকি থাকল: এটি লাগালে কোনো একটি শেয়ার বা ব্যবসায় আপনার টাকার অংশ বেশি হয়ে যেত।")})
    if n_got == 0:
        out.append({"key": "none", **_bi(
            "No company fits your answers today. Try leaving out fewer businesses, or another purpose.",
            "আজ আপনার উত্তরের সাথে কোনো কোম্পানি মেলেনি। কম ব্যবসা বাদ দিয়ে, বা অন্য লক্ষ্য বেছে আবার দেখুন।")})
    elif n_got < n_target:
        en = f"Only {n_got} companies fit everything you asked today, so your plan has {n_got} shares instead of {n_target}."
        bn = f"আজ আপনার সব উত্তরের সাথে মাত্র {n_got}টি কোম্পানি মিলেছে, তাই পরিকল্পনায় {n_target}টির বদলে {n_got}টি শেয়ার।"
        if answers.get("purpose") == "safe":
            en += " “Keep it safe” uses only category A companies with few loans, and no banks or insurers."
            bn += " “নিরাপদে রাখুন” শুধু A ক্যাটাগরির কম ঋণের কোম্পানি নেয়, ব্যাংক বা বিমা নয়।"
        elif answers.get("leave_out"):
            en += " Leaving out fewer businesses would give more."
            bn += " কম ব্যবসা বাদ দিলে আরও বেশি পাওয়া যাবে।"
        out.append({"key": "few", **_bi(en, bn)})
    if 0 < n_target < 5 and n_got and not mine:
        out.append({"key": "small", **_bi(
            f"With {_taka(amount)}, we keep it to {n_target} shares so each part is big enough to be worth "
            "the broker's fee. Add money later to spread it wider.",
            f"{_taka(amount)} দিয়ে আমরা {n_target}টি শেয়ার রাখি, যাতে প্রতিটি অংশ ব্রোকারের ফি দেওয়ার মতো বড় হয়। "
            "পরে টাকা যোগ করলে আরও ছড়িয়ে রাখা যাবে।")})
    if answers.get("horizon") == "lt1":
        rate = f" A one-year bank deposit pays about {_r(fdr_rate)}% a year before tax." if fdr_rate else ""
        rate_bn = f" এক বছরের ব্যাংক ডিপোজিটে কর বাদের আগে বছরে প্রায় {_r(fdr_rate)}% পাওয়া যায়।" if fdr_rate else ""
        out.append({"key": "lt1", **_bi(
            "You may need this money within a year. Share prices can fall a lot in a year, and you might "
            "have to sell at a loss." + rate,
            "এই টাকা এক বছরের মধ্যে লাগতে পারে। এক বছরে শেয়ারের দাম অনেক কমে যেতে পারে, তখন লোকসানে বিক্রি করতে "
            "হতে পারে।" + rate_bn)})
    if amount >= BIG_MONEY and n_got:
        out.append({"key": "big", **_bi(
            "Buy over a few days. Buying a lot of one share at once can push its price up.",
            "কয়েক দিনে ভাগ করে কিনুন। একবারে একটি শেয়ার বেশি কিনলে দাম বেড়ে যেতে পারে।")})
    return out


# ---------------------------------------------------------------------------
# The plan
# ---------------------------------------------------------------------------

def build(cands: list[dict], answers: dict, fdr_rate: Optional[float] = None,
          as_of: Optional[str] = None, holdings: Optional[list[dict]] = None) -> dict:
    """The plan for these answers from the engine's strong-company pool.
    ``holdings`` (the main portfolio at today's prices, [{code, name, qty,
    buy_price, value, sector, sector_bn, sector_class, score, cat}]) is read
    when the reader starts from their shares."""
    answers = clean_answers(answers)
    mine = mine_context(holdings or [], answers["amount"]) if answers["start"] == "mine" else None
    if answers["start"] == "mine" and mine is None:
        answers["start"] = "fresh"  # nothing priced to start from
    n = share_count(answers["amount"])
    if mine is not None:
        n = min(n, max(2, MAX_PORTFOLIO_SHARES - mine["count"]))
    per_share = answers["amount"] / n
    ok = [c for c in cands if c.get("code") and left_out(c, answers, per_share, mine) is None]
    chosen = pick(sorted(ok, key=lambda c: c["code"]), answers, n, mine)
    rows, totals = size(chosen, answers, mine)

    order = {j: i for i, j in enumerate(JOBS)}
    rows.sort(key=lambda r: (0 if r["state"] == "now" else 1, order[r["job"]], -r["amount"], r["c"]["code"]))
    items = []
    cash_year = 0.0
    for r in rows:
        c = r["c"]
        dps = cash_ps(c)
        cy = r["qty"] * dps * (1 - DIV_TAX_PCT / 100) if dps else 0.0
        cash_year += cy
        g_en, g_bn = _group(c)
        adds = mine is not None and c["code"] in mine["code"]
        reason = why(c, r["job"])
        if adds:
            reason = _bi(f"You already own it. {reason['en']}", f"এটি আপনার আছে। {reason['bn']}")
        items.append({
            "code": c["code"], "name": c.get("name") or c["code"],
            "sector": c.get("sector"), "sector_bn": c.get("sector_bn") or c.get("sector"),
            "financial": _financial(c),
            "tier": tier_key(_n(c.get("score"))), "group": _bi(g_en, g_bn),
            "job": r["job"], "state": r["state"],
            "price": _n(c.get("ltp")), "change_pct": _n(c.get("change_pct")),
            "wait_under": r["unit"] if r["state"] == "wait" else None,
            "qty": r["qty"], "amount": r["amount"],
            "weight_pct": round(r["amount"] / answers["amount"] * 100, 1),
            "cash_year": round(cy),
            "why": reason,
            "wait_why": wait_why(c) if r["state"] == "wait" else None,
            "watch": c.get("risk") or None,
            "hi52": _n(c.get("hi52")), "lo52": _n(c.get("lo52")),
            # "Start from my shares": this adds to a share they already own.
            "adds_to": adds,
        })

    jobs = []
    for j in JOBS:
        amt = sum(i["amount"] for i in items if i["job"] == j)
        if amt > 0:
            jobs.append({"job": j, "amount": round(amt), "pct": round(amt / answers["amount"] * 100),
                         **_bi(*JOB_WORDS[j])})
    fin = sum(i["amount"] for i in items if i["financial"])
    plan_notes = notes(answers, n, len(items), fdr_rate, totals.get("left", 0.0), mine is not None)
    out = {
        "answers": answers,
        "as_of": as_of,
        "target": n,
        "items": items,
        "jobs": jobs,
        "totals": {**totals, "cash_year": round(cash_year), "shares": len(items),
                   "now_count": sum(1 for i in items if i["state"] == "now"),
                   "wait_count": sum(1 for i in items if i["state"] == "wait"),
                   "businesses": len({i["sector"] for i in items}),
                   "financial_pct": round(fin / answers["amount"] * 100) if items else 0},
        "pool": {"strong": len(cands), "fit": len(ok)},
        "notes": plan_notes,
        "held": None,
    }
    if mine is not None:
        held_rows = [h for h in holdings or [] if h.get("code") in mine["code"]]
        held_cash = sum(int(h.get("qty") or 0) * (cash_ps(h) or 0.0) * (1 - DIV_TAX_PCT / 100) for h in held_rows)
        out["totals"].update({
            "held": round(mine["held"]),
            "total_after": round(mine["held"] + totals["now"] + totals["kept"]),
            "businesses_after": len({h.get("sector") for h in held_rows} | {i["sector"] for i in items}),
            "shares_after": len(set(mine["code"]) | {i["code"] for i in items}),
            "cash_year_held": round(held_cash),
        })
        # What they own, for the page's before / after grade and its list.
        out["held"] = [{"code": h["code"], "name": h.get("name") or h["code"], "qty": int(h.get("qty") or 0),
                        "buy_price": _n(h.get("buy_price")), "price": _n(h.get("ltp")),
                        "value": round(float(h.get("value") or 0)), "sector": h.get("sector"),
                        "sector_bn": h.get("sector_bn") or h.get("sector")}
                       for h in sorted(held_rows, key=lambda h: -(_n(h.get("value")) or 0))]
        out["notes"] = mine_notes(mine, held_rows, answers["amount"]) + stronger_notes(held_rows, cands) + plan_notes
    return out


def summary(doc: dict) -> dict:
    """A kept plan as the "Your plans" list shows it."""
    plan = doc.get("plan") or {}
    t = plan.get("totals") or {}
    return {"id": doc.get("id"), "created_at": doc.get("created_at"),
            "answers": plan.get("answers") or doc.get("answers"),
            "shares": t.get("shares"), "cash_year": t.get("cash_year"),
            "codes": [i.get("code") for i in plan.get("items") or []]}


def builder_state(user: Optional[dict]) -> dict:
    """What `/me` says about the builder: whether the free plan is used."""
    u = user or {}
    return {"free_used": bool(u.get("builder_free_at")), "count": int(u.get("builder_count") or 0)}
