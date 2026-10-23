"""The portfolio watcher — what changed on the stocks a reader owns today.

Five things, each an *event* with English + Bengali copy:

    record    a record date 1–3 days away (with the cash it pays on their shares)
    results   a quarterly result posted in the last 3 days (profit up / down)
    category  the stock moved to a different DSE category (to Z is the alarm)
    drop      the price fell 5% or more today
    low52     the price closed at its lowest in a year

Events are built for every reader who holds the stock and stored in
``portfolio_watch_events`` (so a free reader's portfolio can say how many
things Premium spotted for them), but only **premium** readers get the push.
The builders here are pure; ``portfolio_daily`` does the reads and writes.

Event ids are day- or date-scoped (``record-GP-2026-11-02``), so a re-run of
the job is a no-op and the 180-day TTL on the collection is safe.
"""
from __future__ import annotations

from typing import Optional

DROP_PCT = -5.0
RECORD_DAYS = (1, 3)
RESULTS_FRESH_DAYS = 3


def _money(v: float) -> str:
    return f"৳{v:,.0f}" if abs(v) >= 100 else f"৳{v:,.1f}"


def _record_event(code: str, qty: int, row: dict) -> Optional[dict]:
    days = row.get("record_days_left")
    rd = row.get("record_date")
    if days is None or not rd or not (RECORD_DAYS[0] <= days <= RECORD_DAYS[1]):
        return None
    cps = row.get("cash_per_share") or 0
    stock = row.get("stock_pct") or 0
    when_en = "tomorrow" if days == 1 else f"in {days} days"
    when_bn = "আগামীকাল" if days == 1 else f"{days} দিন পর"
    parts_en, parts_bn = [], []
    if cps and qty:
        parts_en.append(f"{_money(qty * cps)} cash on your {qty:,} shares")
        parts_bn.append(f"আপনার {qty:,}টি শেয়ারে {_money(qty * cps)} নগদ")
    if stock and qty:
        extra = int(qty * stock / 100)
        if extra > 0:
            parts_en.append(f"about {extra:,} bonus shares")
            parts_bn.append(f"প্রায় {extra:,}টি বোনাস শেয়ার")
    if not parts_en:
        return None
    return {
        "id": f"record-{code}-{rd}", "kind": "record", "code": code, "level": "good",
        "title_en": f"{code} record date {when_en}",
        "title_bn": f"{code}-এর রেকর্ড ডেট {when_bn}",
        "body_en": f"Keep the shares until {rd} to get {' and '.join(parts_en)}.",
        "body_bn": f"{rd} পর্যন্ত শেয়ার রাখলে পাবেন {' ও '.join(parts_bn)}।",
    }


def _results_event(code: str, interim: dict) -> Optional[dict]:
    cur, prev = interim.get("eps_cum"), interim.get("eps_cum_prev")
    end = interim.get("period_end")
    end_s = end.isoformat() if hasattr(end, "isoformat") else str(end or "")[:10]
    months = interim.get("months") or 3
    if cur is None or prev is None or not end_s:
        return None
    if prev == 0:
        return None
    pct = round((cur - prev) / abs(prev) * 100.0)
    if cur < 0 <= prev:
        en, bn, level = "turned to a loss", "লোকসানে পড়েছে", "bad"
    elif pct >= 10:
        en, bn, level = f"profit is up {pct}%", f"মুনাফা {pct}% বেড়েছে", "good"
    elif pct <= -10:
        en, bn, level = f"profit is down {abs(pct)}%", f"মুনাফা {abs(pct)}% কমেছে", "bad"
    else:
        en, bn, level = "profit is about the same", "মুনাফা প্রায় আগের মতোই", "watch"
    return {
        "id": f"results-{code}-{end_s}-{months}", "kind": "results", "code": code, "level": level,
        "title_en": f"{code} posted new results: {en}",
        "title_bn": f"{code}-এর নতুন ফল: {bn}",
        "body_en": f"Earnings per share for {months} months: ৳{cur:.2f} vs ৳{prev:.2f} a year ago.",
        "body_bn": f"{months} মাসে শেয়ারপ্রতি আয় ৳{cur:.2f}, গত বছর একই সময়ে ৳{prev:.2f}।",
    }


def _category_event(code: str, old: str, new: str, day: str) -> Optional[dict]:
    if not old or not new or old == new:
        return None
    to_z = new == "Z"
    return {
        "id": f"category-{code}-{day}", "kind": "category", "code": code,
        "level": "bad" if to_z or (old == "A" and new == "B") else "good" if new == "A" else "watch",
        "title_en": f"{code} moved from {old} to {new} category",
        "title_bn": f"{code} {old} থেকে {new} ক্যাটাগরিতে গেছে",
        "body_en": ("Z is for companies that skipped dividends or AGMs — the riskiest on the DSE."
                    if to_z else "DSE changed its category after the latest dividend or AGM."),
        "body_bn": ("Z ক্যাটাগরি মানে ডিভিডেন্ড বা AGM বাদ দেওয়া কোম্পানি — সবচেয়ে ঝুঁকিপূর্ণ।"
                    if to_z else "সর্বশেষ ডিভিডেন্ড বা AGM-এর পর DSE ক্যাটাগরি বদলেছে।"),
    }


def _drop_event(code: str, qty: int, change_pct: float, change: Optional[float], day: str) -> dict:
    lost = abs(change or 0) * qty if change is not None else None
    lost_en = f" — about {_money(lost)} off your shares" if lost else ""
    lost_bn = f" — আপনার শেয়ারে প্রায় {_money(lost)} কম" if lost else ""
    return {
        "id": f"drop-{code}-{day}", "kind": "drop", "code": code, "level": "bad",
        "title_en": f"{code} fell {abs(change_pct):.1f}% today",
        "title_bn": f"{code} আজ {abs(change_pct):.1f}% কমেছে",
        "body_en": f"A big one-day fall{lost_en}. Check the news before you act.",
        "body_bn": f"একদিনে বড় পতন{lost_bn}। কিছু করার আগে খবর দেখে নিন।",
    }


def _low_event(code: str, ltp: float, day: str) -> dict:
    return {
        "id": f"low52-{code}-{day}", "kind": "low52", "code": code, "level": "watch",
        "title_en": f"{code} is at its lowest price in a year",
        "title_bn": f"{code} এক বছরের সবচেয়ে কম দামে",
        "body_en": f"It closed at ৳{ltp:,.1f}. A low price is a reason to look again, not a reason on its own.",
        "body_bn": f"আজ ৳{ltp:,.1f}-এ শেষ হয়েছে। কম দাম মানেই কেনার কারণ নয় — আবার দেখে নিন।",
    }


def build_events(held: dict[str, int], facts: dict, day: str) -> list[dict]:
    """Events for one reader. `held` = {code: qty} across all their portfolios.
    `facts` = {record: {code: calendar row}, results: {code: interim},
    category: {code: (old, new)}, prices: {code: price row},
    lows: {code: 52w low}}."""
    out: list[dict] = []
    prices = facts.get("prices") or {}
    for code, qty in sorted(held.items()):
        row = (facts.get("record") or {}).get(code)
        if row:
            e = _record_event(code, qty, row)
            if e:
                out.append(e)
        interim = (facts.get("results") or {}).get(code)
        if interim:
            e = _results_event(code, interim)
            if e:
                out.append(e)
        cat = (facts.get("category") or {}).get(code)
        if cat:
            e = _category_event(code, cat[0], cat[1], day)
            if e:
                out.append(e)
        p = prices.get(code) or {}
        cp = p.get("change_pct")
        if isinstance(cp, (int, float)) and cp <= DROP_PCT:
            out.append(_drop_event(code, qty, float(cp), p.get("change"), day))
        lo = (facts.get("lows") or {}).get(code)
        ltp = p.get("ltp")
        # Only a fall *to* the low: a flat stock (suspended, or stuck at a floor
        # price) sits at its yearly low every day and would raise one daily.
        fell = isinstance(cp, (int, float)) and cp < 0
        if lo and ltp and fell and float(ltp) <= float(lo) + 1e-9:
            out.append(_low_event(code, float(ltp), day))
    for e in out:
        e["day"] = day
    return out


_LEVEL_ORDER = {"bad": 0, "watch": 1, "good": 2}


def push_payload(events: list[dict], lang: str = "bn") -> Optional[dict]:
    """One notification for the day's events, the most serious first."""
    if not events:
        return None
    bn = lang != "en"
    ranked = sorted(events, key=lambda e: _LEVEL_ORDER.get(e.get("level"), 3))
    top = ranked[0]
    if len(ranked) == 1:
        title = top["title_bn"] if bn else top["title_en"]
        body = top["body_bn"] if bn else top["body_en"]
    else:
        title = (f"আজ আপনার শেয়ারে {len(ranked)}টি খবর" if bn
                 else f"{len(ranked)} things on your stocks today")
        body = " · ".join((e["title_bn"] if bn else e["title_en"]) for e in ranked[:3])
    return {"title": title, "body": body, "url": "/portfolio?src=watch", "tag": "pwatch"}


def trial_recap_payload(caught: int, days_left: int, lang: str = "bn") -> dict:
    bn = lang != "en"
    if caught > 0:
        title = (f"প্রিমিয়াম এই মাসে আপনার শেয়ারে {caught}টি জিনিস ধরেছে" if bn
                 else f"Premium caught {caught} things on your stocks this month")
    else:
        title = "আপনার প্রিমিয়াম ফ্রি মাস" if bn else "Your free month of Premium"
    body = (f"ফ্রি মাস শেষ হতে আর {days_left} দিন। কী কী পেয়েছেন দেখে নিন।" if bn
            else f"Your free month ends in {days_left} days. See what it found for you.")
    return {"title": title, "body": body, "url": "/portfolio?src=trial-recap", "tag": "trialrecap"}
