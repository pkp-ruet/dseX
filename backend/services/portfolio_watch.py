"""The portfolio watcher — what changed on the stocks a reader owns today.

Six things, each an *event* with English + Bengali copy:

    record    a record date 1–3 days away (with the cash it pays on their shares)
    results   a quarterly result posted in the last 3 days, explained
              (``results_explainer``: profit, cash, price, what it means)
    grade     our grade for the stock changed (``score_history``: the pillar
              that moved it)
    category  the stock moved to a different DSE category (to Z is the alarm)
    drop      the price fell 5% or more today
    low52     the price closed at its lowest in a year

``results`` and ``grade`` also cover the stocks a reader only follows
(watchlist); the other four are about shares they hold.

Events are built for every reader who holds the stock and stored in
``portfolio_watch_events`` (so a free reader's portfolio can say how many
things Premium spotted for them). **Premium** readers get the full push. A free
reader gets the first event of each trading week in full (``free: True`` on the
stored event — the pages show it open) and a **teaser** push (``teaser_payload``:
that free event, or how many things of what kind on which stocks), at most
``TEASER_WEEKLY_CAP`` in 7 days.
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


def _results_event(code: str, interim: dict, row: Optional[dict] = None,
                   score_before: Optional[float] = None, sector_class: str = "GENERAL") -> Optional[dict]:
    from backend.services.results_explainer import explain

    end = interim.get("period_end")
    end_s = end.isoformat() if hasattr(end, "isoformat") else str(end or "")[:10]
    months = interim.get("months") or 3
    if not end_s or not interim.get("eps_cum_prev"):
        return None
    ex = explain(interim, row, score_before, sector_class)
    if not ex:
        return None
    return {
        "id": f"results-{code}-{end_s}-{months}", "kind": "results", "code": code,
        "level": "watch" if ex["level"] == "neutral" else ex["level"],
        "title_en": f"{code} {ex['headline_en']}",
        "title_bn": f"{code} {ex['headline_bn']}",
        "body_en": ex["meaning_en"],
        "body_bn": ex["meaning_bn"],
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


def build_events(held: dict[str, int], facts: dict, day: str,
                 watched: Optional[set[str]] = None) -> list[dict]:
    """Events for one reader. `held` = {code: qty} across all their portfolios;
    `watched` = codes they follow without holding (results + grade only).
    `facts` = {record: {code: calendar row}, results: {code: interim},
    rows: {code: score row}, score_before: {code: score}, sector_class: {code: …},
    grades: {code: score_history.explain()}, category: {code: (old, new)},
    prices: {code: price row}, lows: {code: 52w low}}."""
    from backend.services.score_history import grade_event

    out: list[dict] = []
    prices = facts.get("prices") or {}
    for code in sorted(set(held) | set(watched or ())):
        qty = held.get(code) or 0
        row = (facts.get("record") or {}).get(code)
        if row and qty:
            e = _record_event(code, qty, row)
            if e:
                out.append(e)
        interim = (facts.get("results") or {}).get(code)
        if interim:
            e = _results_event(code, interim, (facts.get("rows") or {}).get(code),
                               (facts.get("score_before") or {}).get(code),
                               (facts.get("sector_class") or {}).get(code) or "GENERAL")
            if e:
                out.append(e)
        ch = (facts.get("grades") or {}).get(code)
        if ch:
            out.append(grade_event(code, ch, day))
        if not qty:
            continue
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


# Where a single event of each kind opens on the stock page.
_STOCK_ANCHOR = {"results": "results", "grade": "score-history"}


def push_payload(events: list[dict], lang: str = "bn", url: str = "/portfolio?src=watch") -> Optional[dict]:
    """One notification for the day's events, the most serious first. A lone
    result or grade change opens its explainer on the stock page."""
    if not events:
        return None
    bn = lang != "en"
    ranked = sorted(events, key=lambda e: _LEVEL_ORDER.get(e.get("level"), 3))
    top = ranked[0]
    if len(ranked) == 1:
        title = top["title_bn"] if bn else top["title_en"]
        body = top["body_bn"] if bn else top["body_en"]
        anchor = _STOCK_ANCHOR.get(top.get("kind"))
        if anchor and top.get("code"):
            url = f"/stock/{top['code']}?src=watch#{anchor}"
    else:
        title = (f"আজ আপনার শেয়ারে {len(ranked)}টি খবর" if bn
                 else f"{len(ranked)} things on your stocks today")
        body = " · ".join((e["title_bn"] if bn else e["title_en"]) for e in ranked[:3])
    return {"title": title, "body": body, "url": url, "tag": "pwatch"}


# --------------------------------------------------------------------------- #
# Free readers — one event a week in full, and a daily teaser push
# --------------------------------------------------------------------------- #

# Teaser pushes a free reader gets in any 7 days, however busy their stocks are.
TEASER_WEEKLY_CAP = 3


def week_start(day: str) -> str:
    """The Sunday on or before `day` — DSE trades Sunday to Thursday."""
    from datetime import date, timedelta

    d = date.fromisoformat(day[:10])
    return (d - timedelta(days=(d.weekday() + 1) % 7)).isoformat()


def pick_free(events: list[dict]) -> Optional[dict]:
    """The event a free reader gets in full this week: the most serious of the
    first day anything happened (worst level first, then the order built)."""
    if not events:
        return None
    return min(enumerate(events), key=lambda ie: (_LEVEL_ORDER.get(ie[1].get("level"), 3), ie[0]))[1]


def _kinds_of(events: list[dict]) -> list[dict]:
    by_kind: dict[str, int] = {}
    for e in events:
        if e.get("kind") in KIND_WORDS:
            by_kind[e["kind"]] = by_kind.get(e["kind"], 0) + 1
    return [{"kind": k, "count": by_kind[k]} for k in _KIND_ORDER if k in by_kind]


def teaser_payload(events: list[dict], free: Optional[dict], lang: str = "bn",
                   url: str = "/portfolio?src=watch-teaser#pf-premium") -> Optional[dict]:
    """A free reader's push for the day's events on their own stocks. When this
    week's free event is among them it is told in full (and the rest counted);
    otherwise the push says how many things, of what kind, on which stocks —
    what they were is in Premium."""
    if not events:
        return None
    bn = lang != "en"
    others = [e for e in events if free is None or e.get("id") != free.get("id")]
    if free is not None:
        title = free["title_bn"] if bn else free["title_en"]
        body = free["body_bn"] if bn else free["body_en"]
        if others:
            n = len(others)
            body += (f" আজ আপনার শেয়ারে আরও {n}টি খবর — প্রিমিয়ামে দেখুন।" if bn
                     else f" {n} more {'thing' if n == 1 else 'things'} on your stocks today — see {'it' if n == 1 else 'them'} with Premium.")
        else:
            anchor = _STOCK_ANCHOR.get(free.get("kind"))
            if anchor and free.get("code"):
                url = f"/stock/{free['code']}?src=watch-teaser#{anchor}"
        return {"title": title, "body": body, "url": url, "tag": "pwatch"}

    n = len(events)
    codes = sorted({e["code"] for e in events if e.get("code")})
    shown = ", ".join(codes[:3]) + ("…" if len(codes) > 3 else "")
    phrase = kinds_phrase(_kinds_of(events), "bn" if bn else "en")
    if bn:
        title = f"আজ {codes[0]}-এ একটি খবর" if n == 1 and codes else f"আজ আপনার শেয়ারে {n}টি খবর"
        body = f"{shown}-এ {phrase}। কী হয়েছে আর এর মানে কী, প্রিমিয়ামে দেখুন।"
    else:
        title = (f"Something happened on {codes[0]} today" if n == 1 and codes
                 else f"{n} things on your stocks today")
        body = f"{phrase[:1].upper()}{phrase[1:]} on {shown}. See what happened and what it means with Premium."
    return {"title": title, "body": body, "url": url, "tag": "pwatch"}


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


# --------------------------------------------------------------------------- #
# Summaries — the dashboard's "this week on your stocks" and the renewal recap
# --------------------------------------------------------------------------- #

# Plain words per kind: (English one, English many, Bengali).
KIND_WORDS = {
    "results": ("quarterly result", "quarterly results", "ত্রৈমাসিক ফল"),
    "grade": ("grade change", "grade changes", "গ্রেড বদল"),
    "record": ("record date", "record dates", "রেকর্ড ডেট"),
    "category": ("category change", "category changes", "ক্যাটাগরি বদল"),
    "drop": ("big one-day fall", "big one-day falls", "একদিনের বড় পতন"),
    "low52": ("fall to a yearly low", "falls to a yearly low", "বছরের সর্বনিম্ন দাম"),
}
_KIND_ORDER = list(KIND_WORDS)
DIGEST_ITEMS = 8


def digest(events: list[dict]) -> dict:
    """Counts by kind (most serious kinds first), the codes involved and the
    events themselves, worst first. Every reader gets all of it — the page
    shows a free reader only the counts (screen-only lock, like every lock)."""
    by_kind: dict[str, int] = {}
    for e in events:
        k = e.get("kind")
        if k in KIND_WORDS:
            by_kind[k] = by_kind.get(k, 0) + 1
    kinds = [{"kind": k, "count": by_kind[k]} for k in _KIND_ORDER if k in by_kind]
    ranked = sorted(
        (e for e in events if e.get("kind") in KIND_WORDS),
        key=lambda e: (_LEVEL_ORDER.get(e.get("level"), 3), str(e.get("created_at") or "")),
    )
    return {
        "total": sum(by_kind.values()),
        "kinds": kinds,
        "codes": sorted({e["code"] for e in ranked if e.get("code")}),
        "bad": sum(1 for e in ranked if e.get("level") == "bad"),
        "items": ranked[:DIGEST_ITEMS],
        # The week's free event(s) — open to a free reader whatever the cut above.
        "free_items": [e for e in ranked if e.get("free")],
    }


def _join(parts: list[str], last: str) -> str:
    if len(parts) < 2:
        return "".join(parts)
    return ", ".join(parts[:-1]) + last + parts[-1]


def kinds_phrase(kinds: list[dict], lang: str = "bn", limit: int = 3) -> str:
    """"2 quarterly results, 1 grade change and 1 record date" — the biggest
    counts first, at most `limit` kinds."""
    top = sorted(kinds, key=lambda k: -k["count"])[:limit]
    if lang != "en":
        return _join([f"{k['count']}টি {KIND_WORDS[k['kind']][2]}" for k in top], " ও ")
    return _join([f"{k['count']} {KIND_WORDS[k['kind']][0 if k['count'] == 1 else 1]}" for k in top], " and ")
