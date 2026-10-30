"""The portfolio watcher — what changed on the stocks a reader owns today.

Six things, each an *event* with English + Bengali copy:

    record    a record date 1–3 days away (with the cash it pays on their shares)
    results   a quarterly or yearly result posted in the last 3 days, explained
              (``results_explainer``: profit, cash, price, what it means)
    grade     our grade for the stock changed (``score_history``: the pillar
              that moved it)
    category  the stock moved to a different DSE category (to Z is the alarm)
    drop      the price fell 5% or more today
    low52     the price closed at its lowest in a year
    red_flag  a serious red flag appeared in the stock report (DSE found the
              factory closed, a qualified audit opinion, Z, the 30% rule …),
              from ``stock_report_service.red_flag_changes``
    answer    our answer on the stock page changed (Buy → Not yet …) and held
              two days, from ``stock_report_service.answer_changes``
    buylist   the share joined or left today's buy list, or came within 3% of
              the price where it stops being a Buy (2026-10-31, the buy list
              redesign), from ``signal_today_service.signals_today``

``results``, ``grade``, ``red_flag``, ``answer`` and ``buylist`` also cover the
stocks a reader only follows (watchlist); the other four are about shares they hold.

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


_MONTHS_EN = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
_MONTHS_BN = ("জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট",
              "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর")


def _day(iso: str, lang: str) -> str:
    """"28 Oct 2026" / "28 অক্টোবর 2026" for an ISO date; the raw text otherwise."""
    try:
        y, m, d = (int(x) for x in str(iso)[:10].split("-"))
        months = _MONTHS_BN if lang == "bn" else _MONTHS_EN
        return f"{d} {months[m - 1]} {y}"
    except (ValueError, IndexError):
        return str(iso)


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
        "body_en": f"If you still hold the shares on {_day(rd, 'en')}, you will receive {' and '.join(parts_en)}.",
        "body_bn": f"{_day(rd, 'bn')} তারিখে শেয়ারগুলো আপনার কাছে থাকলে পাবেন {' ও '.join(parts_bn)}।",
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
        "body_en": ("DSE moves a company to Z when it skips a dividend or an AGM. "
                    "These shares carry the most risk on the DSE."
                    if to_z else "DSE changed its category after the latest dividend or AGM."),
        "body_bn": ("ডিভিডেন্ড না দিলে বা এজিএম না করলে ডিএসই কোম্পানিকে Z ক্যাটাগরিতে পাঠায়। "
                    "ডিএসইতে এই শেয়ারগুলোর ঝুঁকি সবচেয়ে বেশি।"
                    if to_z else "সর্বশেষ ডিভিডেন্ড বা এজিএমের পর ডিএসই এর ক্যাটাগরি বদলেছে।"),
    }


def _drop_event(code: str, qty: int, change_pct: float, change: Optional[float], day: str) -> dict:
    lost = abs(change or 0) * qty if change is not None else None
    lost_en = f", about {_money(lost)} off the value of your shares" if lost else ""
    lost_bn = f", আপনার শেয়ারের মূল্য প্রায় {_money(lost)} কমেছে" if lost else ""
    return {
        "id": f"drop-{code}-{day}", "kind": "drop", "code": code, "level": "bad",
        "title_en": f"{code} fell {abs(change_pct):.1f}% today",
        "title_bn": f"{code} আজ {abs(change_pct):.1f}% কমেছে",
        "body_en": f"A big fall in one day{lost_en}. It is worth checking the news before you act.",
        "body_bn": f"একদিনে বড় দরপতন হয়েছে{lost_bn}। কিছু করার আগে খবর দেখে নিন।",
    }


def _low_event(code: str, ltp: float, day: str) -> dict:
    return {
        "id": f"low52-{code}-{day}", "kind": "low52", "code": code, "level": "watch",
        "title_en": f"{code} is at its lowest price in a year",
        "title_bn": f"{code} এক বছরের সর্বনিম্ন দামে",
        "body_en": f"It closed at ৳{ltp:,.1f}. A low price is a reason to look again, not a reason to buy on its own.",
        "body_bn": f"আজ দাম ৳{ltp:,.1f}-এ শেষ হয়েছে। কম দাম নিজে কেনার কারণ নয়, তবে আবার দেখে নেওয়ার কারণ।",
    }


def _red_flag_event(code: str, change: dict) -> Optional[dict]:
    items = [i for i in change.get("items") or [] if i.get("key")]
    if not items:
        return None
    first = items[0]
    more_en = f" {len(items) - 1} more on its report." if len(items) > 1 else ""
    more_bn = f" রিপোর্টে আরও {len(items) - 1}টি।" if len(items) > 1 else ""
    keys = "-".join(sorted(i["key"] for i in items))
    return {
        "id": f"redflag-{code}-{keys}-{change.get('day') or ''}", "kind": "red_flag", "code": code,
        "level": "bad",
        "title_en": f"A new red flag on {code}",
        "title_bn": f"{code}-এ নতুন বড় সতর্কতা",
        "body_en": (first.get("en") or "Our checks found a serious problem.") + more_en,
        "body_bn": (first.get("bn") or "আমাদের যাচাইয়ে একটি গুরুতর সমস্যা পাওয়া গেছে।") + more_bn,
    }


_DECISION_LEVEL = {"buy": "good", "wait": "watch", "no_reason": "watch", "avoid": "bad", "unrated": "watch"}


def _answer_event(code: str, change: dict) -> Optional[dict]:
    to, frm, line = change.get("to") or {}, change.get("from") or {}, change.get("line") or {}
    if not to.get("en") or not frm.get("en"):
        return None
    return {
        "id": f"answer-{code}-{change.get('decision')}-{change.get('day') or ''}", "kind": "answer", "code": code,
        "level": _DECISION_LEVEL.get(change.get("decision") or "", "watch"),
        "title_en": f"Our answer on {code} changed: {to['en']}",
        "title_bn": f"{code} নিয়ে আমাদের উত্তর বদলেছে: {to.get('bn') or to['en']}",
        "body_en": f"It was {frm['en']}. {line.get('en') or ''}".strip(),
        "body_bn": f"আগে ছিল {frm.get('bn') or frm['en']}। {line.get('bn') or ''}".strip(),
    }


# A Buy within this share of its stop line (the near-the-yearly-high price
# where it stops being a Buy) counts as "near its limit".
NEAR_STOP_PCT = 3.0


def _buylist_event(code: str, change: dict, day: str) -> Optional[dict]:
    """`change` = {kind: joined | left | near, reason?: {en, bn}, stop?: price}."""
    kind = change.get("kind")
    if kind == "joined":
        word = change.get("word") or {}
        return {
            "id": f"buylist-{code}-joined-{day}", "kind": "buylist", "code": code, "level": "good",
            "title_en": f"{code} joined today's buy list",
            "title_bn": f"{code} আজ কেনার তালিকায় এসেছে",
            "body_en": (f"It now passes every check, at a {word['en'].lower()}." if word.get("en")
                        else "It now passes every check."),
            "body_bn": (f"এখন সব যাচাইয়ে উতরেছে, {word['bn']}।" if word.get("bn")
                        else "এখন সব যাচাইয়ে উতরেছে।"),
        }
    if kind == "left":
        r = change.get("reason") or {}
        return {
            "id": f"buylist-{code}-left-{day}", "kind": "buylist", "code": code, "level": "watch",
            "title_en": f"{code} left the buy list",
            "title_bn": f"{code} কেনার তালিকা থেকে বাদ গেছে",
            "body_en": (f"The reason: {r['en'][0].lower() + r['en'][1:]}." if r.get("en")
                        else "It no longer passes every check."),
            "body_bn": f"কারণ: {r['bn']}।" if r.get("bn") else "এটি আর সব যাচাইয়ে উতরায় না।",
        }
    if kind == "near" and change.get("stop"):
        stop = float(change["stop"])
        return {
            "id": f"buylist-{code}-near-{day}", "kind": "buylist", "code": code, "level": "watch",
            "title_en": f"{code} is close to its limit",
            "title_bn": f"{code} সীমার কাছাকাছি",
            "body_en": f"Past {_money(stop)} it stops being a Buy, because the price would be near its top for the year.",
            "body_bn": f"{_money(stop)} পার হলে আর কেনার সংকেত থাকবে না, কারণ দাম তখন বছরের সর্বোচ্চের কাছে।",
        }
    return None


def buylist_changes(today: dict, prices: dict, codes) -> dict[str, dict]:
    """{code: change} for the given codes from the page's bundle
    (`signal_today_service.signals_today()`): joined / left since the last
    trading day (none on a rule-change day), else `near` — today's close
    crossed into the last 3% under the stop line (yesterday's close was below
    it, so it fires once, not every day it stays there)."""
    from backend.services.signal_today import PRICE_WORDS

    codes = {c.upper() for c in codes or ()}
    out: dict[str, dict] = {}
    ch = today.get("changes") or {}
    if ch and not ch.get("rebuilt"):
        buys = today.get("buys") or {}
        for c in ch.get("joined") or []:
            if c in codes:
                pw = (buys.get(c) or {}).get("price_word")
                out[c] = {"kind": "joined",
                          "word": {"en": PRICE_WORDS[pw][0], "bn": PRICE_WORDS[pw][1]} if pw in PRICE_WORDS else None}
        for l in ch.get("left") or []:
            if l.get("code") in codes:
                out[l["code"]] = {"kind": "left", "reason": l.get("reason")}
    for c, b in (today.get("buys") or {}).items():
        if c not in codes or c in out:
            continue
        stop = b.get("stop_above")
        p = prices.get(c) or {}
        ltp, chg = p.get("ltp"), p.get("change")
        if not stop or not isinstance(ltp, (int, float)) or not isinstance(chg, (int, float)):
            continue
        line = float(stop) * (1 - NEAR_STOP_PCT / 100)
        if line <= float(ltp) < float(stop) and float(ltp) - float(chg) < line:
            out[c] = {"kind": "near", "stop": stop}
    return out


def build_events(held: dict[str, int], facts: dict, day: str,
                 watched: Optional[set[str]] = None) -> list[dict]:
    """Events for one reader. `held` = {code: qty} across all their portfolios;
    `watched` = codes they follow without holding (results + grade only).
    `facts` = {record: {code: calendar row}, results: {code: interim},
    rows: {code: score row}, score_before: {code: score}, sector_class: {code: …},
    grades: {code: score_history.explain()}, category: {code: (old, new)},
    prices: {code: price row}, lows: {code: 52w low},
    red_flags: {code: stock_report_service.red_flag_changes() entry},
    answers: {code: stock_report_service.answer_changes() entry},
    buylist: {code: buylist_changes() entry}}."""
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
        rf = (facts.get("red_flags") or {}).get(code)
        if rf:
            e = _red_flag_event(code, rf)
            if e:
                out.append(e)
        ac = (facts.get("answers") or {}).get(code)
        if ac:
            e = _answer_event(code, ac)
            if e:
                out.append(e)
        bl = (facts.get("buylist") or {}).get(code)
        if bl:
            e = _buylist_event(code, bl, day)
            if e:
                out.append(e)
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
_STOCK_ANCHOR = {"results": "results", "grade": "score-history", "red_flag": "red-flags", "answer": "ch-answer",
                 "buylist": "ch-answer"}


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
        title = (f"আজ আপনার শেয়ারে {len(ranked)}টি আপডেট" if bn
                 else f"{len(ranked)} updates on your shares today")
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
            body += (f" আজ আপনার শেয়ারে আরও {n}টি আপডেট আছে, যা প্রিমিয়ামে দেখা যাবে।" if bn
                     else f" {n} more {'update' if n == 1 else 'updates'} on your shares today, which you can see with Premium.")
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
        title = f"আজ {codes[0]}-এ একটি আপডেট" if n == 1 and codes else f"আজ আপনার শেয়ারে {n}টি আপডেট"
        body = f"{shown}-এ {phrase}। কী হয়েছে আর এর মানে কী, তা প্রিমিয়ামে দেখুন।"
    else:
        title = (f"One update on {codes[0]} today" if n == 1 and codes
                 else f"{n} updates on your shares today")
        body = f"{phrase[:1].upper()}{phrase[1:]} on {shown}. See what happened and what it means with Premium."
    return {"title": title, "body": body, "url": url, "tag": "pwatch"}


def trial_recap_payload(caught: int, days_left: int, lang: str = "bn") -> dict:
    bn = lang != "en"
    if caught > 0:
        title = (f"এই মাসে প্রিমিয়াম আপনার শেয়ারে {caught}টি আপডেট পেয়েছে" if bn
                 else f"This month Premium found {caught} updates on your shares")
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
    "red_flag": ("red flag", "red flags", "বড় সতর্কতা"),
    "answer": ("change in our answer", "changes in our answer", "আমাদের উত্তরে বদল"),
    "buylist": ("change on the buy list", "changes on the buy list", "কেনার তালিকায় বদল"),
    # A quarter or a full year (results_explainer.load_latest_results).
    "results": ("results report", "results reports", "আর্থিক ফল"),
    "grade": ("grade change", "grade changes", "গ্রেড বদল"),
    "record": ("record date", "record dates", "রেকর্ড ডেট"),
    "category": ("category change", "category changes", "ক্যাটাগরি বদল"),
    "drop": ("big one-day fall", "big one-day falls", "একদিনে বড় দরপতন"),
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
    """"2 results reports, 1 grade change and 1 record date" — the biggest
    counts first, at most `limit` kinds."""
    top = sorted(kinds, key=lambda k: -k["count"])[:limit]
    if lang != "en":
        return _join([f"{k['count']}টি {KIND_WORDS[k['kind']][2]}" for k in top], " ও ")
    return _join([f"{k['count']} {KIND_WORDS[k['kind']][0 if k['count'] == 1 else 1]}" for k in top], " and ")
