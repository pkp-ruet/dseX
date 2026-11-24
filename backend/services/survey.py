"""
The reader survey (2026-11-24, plan https://claude.ai/artifact/AQ5dz94EaTaHcCAXLxuvpZ).

A full-screen, nine-screen survey for signed-in readers: how they feel about
TopStockBD, what they use and like, what gets in the way, Premium (by plan) and
what a service like ours is worth to them. Pure rules here — who is asked and
when, which questions a reader's plan gets, how answers are cleaned, and the
admin summary. Storage and routes: `survey_service.py`, `routers/survey.py`.
Tests: `backend/tests/test_survey.py`. Frontend copy: `frontend/lib/survey.ts`
(question ids and choice keys must match `QUESTIONS` below).

A round runs once. The first wave is Premium readers whose plan ends within
`ENDING_DAYS` and readers whose Premium has ended; everyone else is asked from
`EVERYONE_FROM`. The pop-up stops opening by itself after `CLOSES_ON`; the
`/feedback` page keeps working.
"""
from __future__ import annotations

from collections import Counter
from datetime import date, datetime, timedelta, timezone
from statistics import median
from typing import Any, Iterable, Optional

ROUND = "2026-11"
DHAKA = timezone(timedelta(hours=6))
EVERYONE_FROM = date(2026, 12, 1)   # Dhaka date wave 2 (every regular reader) starts
CLOSES_ON = date(2026, 12, 15)      # last Dhaka day the pop-up opens by itself

SEGMENTS = ("free", "premium", "ending", "ended")
FIRST_WAVE = ("ending", "ended")
ENDING_DAYS = 14          # Premium ending within this many Dhaka days = "ending"
MIN_ACCOUNT_DAYS = 7      # an account this old before we ask
MIN_ACTIVE_DAYS = 3       # active on this many days in the last 30 (not for the first wave)
MAX_SHOWS = 3             # the pop-up opens at most this many times a round
LATER_DAYS = 3            # "Later" asks again after this many days
SCREENS = 9               # question screens; step 0 = the intro, SCREENS + 1 = thanks
TEXT_MAX = 1000
PICK_MAX = 3

ONE, MANY, TEXT = "one", "many", "text"
PRICES = (50, 100, 150, 200, 300, 500, 1000)   # ৳ a month; 1000 = "৳1,000 or more"
STAY_CHOICES = ("price", "longer", "more_help", "unused", "money", "market", "other")

# id → (kind, choices, max picks, exclusive choice). Text questions have no choices.
QUESTIONS: dict[str, tuple] = {
    # 1 · About you (how much they hold in shares is not asked: it can feel
    # intrusive, user decision 2026-11-24)
    "years": (ONE, ("not_started", "lt1", "y1_3", "y3_10", "gt10"), None, None),
    # 2 · Your experience
    "miss": (ONE, ("very", "somewhat", "not_really", "hardly"), None, None),
    "use": (MANY, ("analysis", "portfolio", "watchlist", "dividends", "buylist", "screener",
                   "compare", "market", "results", "ranking", "learn"), PICK_MAX, None),
    "like_text": (TEXT, (), None, None),
    "problems": (MANY, ("slow", "late", "words", "crowded", "find", "notify", "signin", "pay",
                        "bangla", "none"), None, "none"),
    "problem_text": (TEXT, (), None, None),
    "wish_text": (TEXT, (), None, None),
    # 3 · Premium, by plan
    "thought": (ONE, ("dont_know", "not_yet", "soon", "too_dear", "enough"), None, None),
    "worth_for": (MANY, ("analysis", "portfolio", "buylist", "dividends", "news", "signals",
                         "nothing", "other"), PICK_MAX, "nothing"),
    "worth": (ONE, ("more", "yes", "unsure", "no"), None, None),
    "continue": (ONE, ("yes", "probably", "unsure", "probably_not", "no"), None, None),
    "next_plan": (ONE, ("monthly", "quarterly", "yearly"), None, None),
    "stay": (MANY, STAY_CHOICES, PICK_MAX, None),
    "ended_why": (ONE, ("didnt_know", "price", "unused", "no_help", "money", "market", "later",
                        "other"), None, None),
    "back": (MANY, STAY_CHOICES, PICK_MAX, None),
    # 4 · Price
    "spend_on": (MANY, ("none", "group", "app", "adviser", "broker"), None, "none"),
    "spend_amount": (ONE, ("lt200", "a200_500", "a500_1k", "a1k_3k", "gt3k"), None, None),
    "price_good": (ONE, (0,) + PRICES, None, None),   # 0 = "I wouldn't pay"
    "price_high": (ONE, PRICES, None, None),
}

# Part 3 belongs to one plan each; everything else is asked of everyone.
PART3 = {
    "free": ("thought", "worth_for"),
    "premium": ("worth", "continue", "next_plan", "stay"),
    "ending": ("worth", "continue", "next_plan", "stay"),
    "ended": ("ended_why", "back"),
}
_PART3_ALL = {q for qs in PART3.values() for q in qs}
TEXT_QUESTIONS = tuple(q for q, spec in QUESTIONS.items() if spec[0] == TEXT)


# --------------------------------------------------------------------------- #
# Dates
# --------------------------------------------------------------------------- #

def as_utc(value: Any) -> Optional[datetime]:
    """A stored datetime or an ISO string (the session doc's `created_at`)."""
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str) and value:
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    return None


def dhaka_date(dt: datetime) -> date:
    return dt.astimezone(DHAKA).date()


def account_days(user: dict, now: datetime) -> Optional[int]:
    created = as_utc(user.get("created_at"))
    return (now - created).days if created else None


# --------------------------------------------------------------------------- #
# Who is asked, and when
# --------------------------------------------------------------------------- #

def segment(user: dict, now: datetime) -> str:
    """free · premium · ending (within ENDING_DAYS Dhaka days) · ended."""
    until = as_utc(user.get("premium_until"))
    if until and until > now:
        days = (dhaka_date(until) - dhaka_date(now)).days
        return "ending" if days <= ENDING_DAYS else "premium"
    return "ended" if until else "free"


def round_state(raw: Any) -> dict:
    """The reader's state for this round (`users.survey_state`); another round's = fresh."""
    if not isinstance(raw, dict) or raw.get("round") != ROUND:
        return {"round": ROUND, "state": "open", "shows": 0, "next_at": None}
    return {
        "round": ROUND,
        "state": raw.get("state") if raw.get("state") in ("open", "later", "done", "declined") else "open",
        "shows": int(raw.get("shows") or 0),
        "next_at": as_utc(raw.get("next_at")),
    }


def next_state(raw: Any, action: str, now: datetime) -> dict:
    """shown → one more show · later → ask again after LATER_DAYS · never → declined ·
    finish → done. A finished or declined round stays that way."""
    st = round_state(raw)
    if st["state"] in ("done", "declined"):
        return st
    if action == "shown":
        st["shows"] += 1
    elif action == "later":
        st["state"], st["next_at"] = "later", now + timedelta(days=LATER_DAYS)
    elif action == "never":
        st["state"] = "declined"
    elif action == "finish":
        st["state"] = "done"
    return st


def round_open(today: date) -> bool:
    return today <= CLOSES_ON


def asking(st: dict, seg: str, now: datetime, *, admin: bool) -> tuple[bool, str]:
    """The checks that need nothing but the user document (so `/me` can carry
    them and a reader who is done never asks the server again)."""
    today = dhaka_date(now)
    if admin:
        return False, "admin"
    if not round_open(today):
        return False, "closed"
    if today < EVERYONE_FROM and seg not in FIRST_WAVE:
        return False, "wave"
    if st["state"] in ("done", "declined"):
        return False, st["state"]
    if st["shows"] >= MAX_SHOWS:
        return False, "asked"
    if st["next_at"] and st["next_at"] > now:
        return False, "later"
    return True, "due"


def due(st: dict, seg: str, now: datetime, *, acc_days: Optional[int], active_days: int,
        admin: bool) -> tuple[bool, str]:
    """May the pop-up open by itself now? (The browser adds its own checks:
    second page of a visit, outside trading hours, no other dialog open.)"""
    ok, why = asking(st, seg, now, admin=admin)
    if not ok:
        return ok, why
    if acc_days is None or acc_days < MIN_ACCOUNT_DAYS:
        return False, "new"
    if seg not in FIRST_WAVE and active_days < MIN_ACTIVE_DAYS:
        return False, "quiet"
    return True, "due"


def me_state(user: dict, now: datetime, *, admin: bool) -> Optional[dict]:
    """What `/me` carries: whether the browser should ask the server at all."""
    if not round_open(dhaka_date(now)):
        return None
    st = round_state(user.get("survey_state"))
    ok, _ = asking(st, segment(user, now), now, admin=admin)
    acc = account_days(user, now)
    return {
        "round": ROUND,
        "state": st["state"],
        "ask": bool(ok and acc is not None and acc >= MIN_ACCOUNT_DAYS),
    }


# --------------------------------------------------------------------------- #
# Answers
# --------------------------------------------------------------------------- #

def allowed(qid: str, seg: str) -> bool:
    return qid in QUESTIONS and (qid not in _PART3_ALL or qid in PART3.get(seg, ()))


def _one(value: Any, choices: tuple) -> Any:
    if isinstance(choices[0], int):
        if isinstance(value, bool):
            return None
        if isinstance(value, str) and value.strip().isdigit():
            value = int(value.strip())
        return value if isinstance(value, int) and value in choices else None
    return value if isinstance(value, str) and value in choices else None


def _many(value: Any, choices: tuple, cap: Optional[int], exclusive: Optional[str]) -> Optional[list]:
    if not isinstance(value, (list, tuple)):
        return None
    picked: list = []
    for v in value:
        if isinstance(v, str) and v in choices and v not in picked:
            picked.append(v)
    if exclusive and exclusive in picked and len(picked) > 1:
        picked = [v for v in picked if v != exclusive]
    if cap:
        picked = picked[:cap]
    return picked or None


def clean_value(qid: str, value: Any) -> Any:
    kind, choices, cap, exclusive = QUESTIONS[qid]
    if kind == ONE:
        return _one(value, choices)
    if kind == MANY:
        return _many(value, choices, cap, exclusive)
    if isinstance(value, str):
        text = value.strip()[:TEXT_MAX]
        return text or None
    return None


def tidy(answers: dict) -> dict:
    """Drop answers whose question no longer applies after another answer."""
    out = dict(answers)
    cont = out.get("continue")
    if cont not in ("yes", "probably"):
        out.pop("next_plan", None)
    if cont not in ("unsure", "probably_not", "no"):
        out.pop("stay", None)
    spend = out.get("spend_on") or []
    if not [s for s in spend if s != "none"]:
        out.pop("spend_amount", None)
    good, high = out.get("price_good"), out.get("price_high")
    if high is not None and (not good or high <= good):
        out.pop("price_high", None)
    return out


def merge(old: Optional[dict], new: Optional[dict], seg: str) -> dict:
    """Old answers updated by new ones (None clears one), cleaned for this plan."""
    merged: dict = {}
    for source in (old or {}), (new or {}):
        for qid, value in source.items():
            if not isinstance(qid, str) or not allowed(qid, seg):
                continue
            if value is None:
                merged.pop(qid, None)
                continue
            clean = clean_value(qid, value)
            if clean is None:
                merged.pop(qid, None)
            else:
                merged[qid] = clean
    return tidy(merged)


# --------------------------------------------------------------------------- #
# Admin summary
# --------------------------------------------------------------------------- #

def _pct(n: int, d: int) -> Optional[float]:
    return round(100 * n / d, 1) if d else None


def _choices(qid: str) -> tuple:
    return QUESTIONS[qid][1]


def question_counts(docs: list[dict]) -> dict:
    """Every tap question: how many answered, and each choice — overall and per plan."""
    out: dict = {}
    for qid, (kind, choices, _cap, _ex) in QUESTIONS.items():
        if kind == TEXT:
            continue
        n_by: Counter = Counter()
        by: dict = {c: Counter() for c in choices}
        for d in docs:
            a = (d.get("answers") or {}).get(qid)
            if a is None:
                continue
            seg = d.get("segment") or "free"
            n_by[seg] += 1
            for v in (a if isinstance(a, list) else [a]):
                if v in by:
                    by[v][seg] += 1
        n = sum(n_by.values())
        out[qid] = {
            "n": n,
            "n_by": dict(n_by),
            "choices": [{"key": c, "n": sum(by[c].values()), "pct": _pct(sum(by[c].values()), n),
                         "by": dict(by[c])} for c in choices],
        }
    return out


def _mid(values: list[int]) -> Optional[int]:
    return int(round(median(values))) if values else None


def price_picture(docs: list[dict]) -> dict:
    """At each price: the share who still call it good value (their good-value
    price is at least this) and the share for whom it is too much (their
    too-much price is at most this). Where both are low, most readers are
    comfortable. "I wouldn't pay" counts as good value at no price."""
    goods = [d["answers"]["price_good"] for d in docs if "price_good" in (d.get("answers") or {})]
    highs = [d["answers"]["price_high"] for d in docs if "price_high" in (d.get("answers") or {})]
    rows = [{
        "price": p,
        "good_pct": _pct(sum(1 for g in goods if g >= p), len(goods)),
        "too_pct": _pct(sum(1 for h in highs if h <= p), len(highs)),
    } for p in PRICES]
    by_seg = {}
    for seg in SEGMENTS:
        g = [d["answers"]["price_good"] for d in docs
             if d.get("segment") == seg and (d.get("answers") or {}).get("price_good")]
        h = [d["answers"]["price_high"] for d in docs
             if d.get("segment") == seg and "price_high" in (d.get("answers") or {})]
        by_seg[seg] = {"n": len(g), "good_mid": _mid(g), "high_mid": _mid(h)}
    return {
        "n_good": len(goods),
        "n_high": len(highs),
        "wont_pay": sum(1 for g in goods if g == 0),
        "good_mid": _mid([g for g in goods if g > 0]),
        "high_mid": _mid(highs),
        "rows": rows,
        "by_segment": by_seg,
    }


def _who(d: dict) -> dict:
    """A reader's name and email only when they agreed to be contacted."""
    if d.get("contact"):
        return {"name": d.get("name"), "email": d.get("email"), "phone": d.get("phone")}
    return {"name": None, "email": None, "phone": None}


def _iso(v: Any) -> Optional[str]:
    dt = as_utc(v)
    return dt.isoformat() if dt else None


def _day(v: Any) -> Optional[str]:
    dt = as_utc(v)
    return dhaka_date(dt).isoformat() if dt else None


def flat(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        return "|".join(str(v) for v in value)
    return str(value)


def summary(docs: Iterable[dict], now: datetime) -> dict:
    """Everything the admin Survey tab shows, from this round's response docs.
    `renewed` on a doc (set by the service) = its Premium now ends later than
    when the reader answered."""
    docs = list(docs)
    started = [d for d in docs if d.get("answers")]
    finished = [d for d in docs if d.get("status") == "finished"]
    funnel = {"shown": len(docs), "started": len(started), "finished": len(finished), "by": {}}
    for seg in SEGMENTS:
        mine = [d for d in docs if d.get("segment") == seg]
        funnel["by"][seg] = {
            "shown": len(mine),
            "started": sum(1 for d in mine if d.get("answers")),
            "finished": sum(1 for d in mine if d.get("status") == "finished"),
        }
    stops = Counter(int(d.get("step") or 0) for d in started if d.get("status") != "finished")

    miss = [d["answers"]["miss"] for d in docs if (d.get("answers") or {}).get("miss")]
    renew = []
    for d in docs:
        a = d.get("answers") or {}
        if "continue" not in a and "ended_why" not in a:
            continue
        renew.append({
            "segment": d.get("segment"),
            "ends_on": _day(d.get("premium_until")),
            "plan": d.get("paid_plan"),
            "worth": a.get("worth"),
            "continue": a.get("continue"),
            "next_plan": a.get("next_plan"),
            "stay": a.get("stay") or a.get("back") or [],
            "ended_why": a.get("ended_why"),
            "renewed": bool(d.get("renewed")),
            "contact": bool(d.get("contact")),
            **_who(d),
        })
    order = {"no": 0, "probably_not": 1, "unsure": 2, "probably": 3, "yes": 4}
    renew.sort(key=lambda r: (order.get(r["continue"] or "", 5), r["ends_on"] or ""))

    texts = []
    for d in docs:
        a = d.get("answers") or {}
        if not any(a.get(q) for q in TEXT_QUESTIONS):
            continue
        texts.append({
            "segment": d.get("segment"),
            "at": _iso(d.get("updated_at") or d.get("created_at")),
            "lang": d.get("lang"),
            "device": d.get("device") or {},
            "years": a.get("years"),
            "problems": a.get("problems") or [],
            "like_text": a.get("like_text"),
            "problem_text": a.get("problem_text"),
            "wish_text": a.get("wish_text"),
            "contact": bool(d.get("contact")),
            **_who(d),
        })
    texts.sort(key=lambda t: t["at"] or "", reverse=True)

    rows = []
    for d in docs:
        a = d.get("answers") or {}
        who = _who(d)
        rows.append({
            "segment": d.get("segment"),
            "status": d.get("status"),
            "step": d.get("step") or 0,
            "started": _iso(d.get("created_at")),
            "finished": _iso(d.get("finished_at")),
            "lang": d.get("lang") or "",
            "mobile": bool((d.get("device") or {}).get("mobile")),
            "contact": bool(d.get("contact")),
            "name": who["name"] or "",
            "email": who["email"] or "",
            **{q: flat(a.get(q)) for q in QUESTIONS},
        })
    return {
        "round": ROUND,
        "everyone_from": EVERYONE_FROM.isoformat(),
        "closes_on": CLOSES_ON.isoformat(),
        "generated_at": now.isoformat(),
        "funnel": funnel,
        "stops": {str(k): v for k, v in sorted(stops.items())},
        "very_disappointed_pct": _pct(sum(1 for m in miss if m == "very"), len(miss)),
        "questions": question_counts(docs),
        "price": price_picture(docs),
        "renew": renew,
        "said_yes_renewed": sum(1 for r in renew if r["continue"] in ("yes", "probably") and r["renewed"]),
        "said_yes": sum(1 for r in renew if r["continue"] in ("yes", "probably")),
        "texts": texts,
        "rows": rows,
        "columns": ["segment", "status", "step", "started", "finished", "lang", "mobile",
                    "contact", "name", "email", *QUESTIONS.keys()],
    }
