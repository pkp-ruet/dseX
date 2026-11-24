"""The reader survey's rules (backend/services/survey.py)."""
import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

from backend.services import survey as sv

NOW = datetime(2026, 11, 24, 10, 0, tzinfo=timezone.utc)      # Tue 24 Nov, 4 PM Dhaka
WAVE2 = datetime(2026, 12, 2, 10, 0, tzinfo=timezone.utc)
AFTER = datetime(2026, 12, 16, 10, 0, tzinfo=timezone.utc)


def user(**kw):
    base = {"user_id": "u1", "created_at": (NOW - timedelta(days=60)).isoformat()}
    base.update(kw)
    return base


# --------------------------------------------------------------------------- #
# Who, and when
# --------------------------------------------------------------------------- #

def test_segment_by_plan():
    assert sv.segment(user(), NOW) == "free"
    assert sv.segment(user(premium_until=NOW + timedelta(days=40)), NOW) == "premium"
    assert sv.segment(user(premium_until=NOW + timedelta(days=2)), NOW) == "ending"
    assert sv.segment(user(premium_until=NOW + timedelta(days=14)), NOW) == "ending"
    assert sv.segment(user(premium_until=NOW - timedelta(days=10)), NOW) == "ended"
    # a naive stored datetime counts as UTC
    assert sv.segment(user(premium_until=(NOW + timedelta(days=3)).replace(tzinfo=None)), NOW) == "ending"


def test_state_moves():
    st = sv.next_state(None, "shown", NOW)
    assert st["shows"] == 1 and st["state"] == "open"
    st = sv.next_state(st, "later", NOW)
    assert st["state"] == "later" and st["next_at"] == NOW + timedelta(days=sv.LATER_DAYS)
    done = sv.next_state(st, "finish", NOW)
    assert done["state"] == "done"
    assert sv.next_state(done, "shown", NOW)["shows"] == done["shows"]   # finished stays finished
    assert sv.next_state(None, "never", NOW)["state"] == "declined"
    # another round's state starts fresh
    assert sv.round_state({"round": "2025-01", "state": "done", "shows": 3})["state"] == "open"


def _due(seg, st=None, now=NOW, acc=60, active=10, admin=False):
    return sv.due(sv.round_state(st), seg, now, acc_days=acc, active_days=active, admin=admin)


def test_first_wave_then_everyone():
    assert _due("ending") == (True, "due")
    assert _due("ended") == (True, "due")
    assert _due("free") == (False, "wave")
    assert _due("premium") == (False, "wave")
    assert _due("free", now=WAVE2) == (True, "due")
    assert _due("free", now=AFTER) == (False, "closed")


def test_not_asked():
    assert _due("ending", admin=True) == (False, "admin")
    assert _due("ending", acc=3) == (False, "new")
    assert _due("ending", acc=None) == (False, "new")
    assert _due("free", now=WAVE2, active=2) == (False, "quiet")
    assert _due("ending", active=0) == (True, "due")          # the first wave needn't be regulars
    st = {"round": sv.ROUND, "state": "later", "shows": 1, "next_at": NOW + timedelta(days=1)}
    assert _due("ending", st) == (False, "later")
    st = {"round": sv.ROUND, "state": "later", "shows": 1, "next_at": NOW - timedelta(minutes=1)}
    assert _due("ending", st) == (True, "due")
    assert _due("ending", {"round": sv.ROUND, "shows": sv.MAX_SHOWS}) == (False, "asked")
    assert _due("ending", {"round": sv.ROUND, "state": "declined"}) == (False, "declined")
    assert _due("ending", {"round": sv.ROUND, "state": "done"}) == (False, "done")


def test_me_state():
    assert sv.me_state(user(), AFTER, admin=False) is None
    assert sv.me_state(user(), NOW, admin=False)["ask"] is False                 # free, wave 1
    ending = user(premium_until=NOW + timedelta(days=2))
    assert sv.me_state(ending, NOW, admin=False) == {"round": sv.ROUND, "state": "open", "ask": True}
    assert sv.me_state(ending, NOW, admin=True)["ask"] is False
    young = user(premium_until=NOW + timedelta(days=2), created_at=(NOW - timedelta(days=2)).isoformat())
    assert sv.me_state(young, NOW, admin=False)["ask"] is False


# --------------------------------------------------------------------------- #
# Answers
# --------------------------------------------------------------------------- #

def test_merge_cleans_and_keeps_the_plan_branch():
    a = sv.merge({}, {
        "years": "y1_3", "holdings": "l1_5", "miss": "very", "hack": "x",   # holdings: no longer asked
        "use": ["analysis", "portfolio", "analysis", "screener", "compare", "bad"],
        "thought": "soon",                 # free-only question
        "continue": "yes",                 # not for a free reader
        "like_text": "  ভালো লাগে, khub valo  ",
        "wish_text": "   ",
    }, "free")
    assert a == {"years": "y1_3", "miss": "very", "use": ["analysis", "portfolio", "screener"],
                 "thought": "soon", "like_text": "ভালো লাগে, khub valo"}
    assert "thought" not in sv.merge({}, {"thought": "soon"}, "ending")


def test_exclusive_choices_and_text_limit():
    a = sv.merge({}, {"problems": ["none", "slow"], "spend_on": ["none"], "wish_text": "x" * 5000}, "free")
    assert a["problems"] == ["slow"]
    assert a["spend_on"] == ["none"]
    assert len(a["wish_text"]) == sv.TEXT_MAX
    assert sv.merge({}, {"worth_for": ["nothing", "analysis"]}, "free")["worth_for"] == ["analysis"]


def test_follow_ups_follow_their_parent():
    a = sv.merge({}, {"continue": "yes", "next_plan": "yearly", "stay": ["price"]}, "ending")
    assert a == {"continue": "yes", "next_plan": "yearly"}
    a = sv.merge(a, {"continue": "no", "stay": ["price", "money"]}, "ending")
    assert a == {"continue": "no", "stay": ["price", "money"]}
    a = sv.merge({}, {"spend_on": ["none"], "spend_amount": "lt200"}, "free")
    assert "spend_amount" not in a
    a = sv.merge({}, {"spend_on": ["group"], "spend_amount": "lt200"}, "free")
    assert a["spend_amount"] == "lt200"


def test_prices():
    assert sv.merge({}, {"price_good": "150", "price_high": 300}, "free") == {"price_good": 150, "price_high": 300}
    assert sv.merge({}, {"price_good": 150, "price_high": 100}, "free") == {"price_good": 150}
    assert sv.merge({}, {"price_good": 0, "price_high": 100}, "free") == {"price_good": 0}
    assert sv.merge({}, {"price_good": True}, "free") == {}
    assert sv.merge({}, {"price_good": 175}, "free") == {}


def test_none_clears_an_answer():
    a = sv.merge({"miss": "very", "years": "lt1"}, {"miss": None}, "free")
    assert a == {"years": "lt1"}


# --------------------------------------------------------------------------- #
# Admin summary
# --------------------------------------------------------------------------- #

def _doc(seg, answers, status="started", step=3, contact=False, **kw):
    return {"segment": seg, "answers": answers, "status": status, "step": step, "contact": contact,
            "name": "Rahim Uddin", "email": "r@example.com", "created_at": NOW, **kw}


def test_summary():
    docs = [
        {"segment": "free", "answers": {}, "status": "shown", "step": 0},
        _doc("free", {"miss": "very", "price_good": 150, "price_high": 300, "wish_text": "faster"}, "finished", 9),
        _doc("free", {"miss": "somewhat", "price_good": 0}, "started", 5),
        _doc("ending", {"miss": "very", "continue": "probably_not", "stay": ["price"]}, "finished", 9,
             contact=True, premium_until=NOW + timedelta(days=2)),
        _doc("ending", {"continue": "yes", "next_plan": "yearly"}, "started", 7, renewed=True,
             premium_until=NOW + timedelta(days=3)),
    ]
    s = sv.summary(docs, NOW)
    assert s["funnel"]["shown"] == 5 and s["funnel"]["started"] == 4 and s["funnel"]["finished"] == 2
    assert s["funnel"]["by"]["ending"] == {"shown": 2, "started": 2, "finished": 1}
    assert s["stops"] == {"5": 1, "7": 1}
    assert s["very_disappointed_pct"] == round(100 * 2 / 3, 1)
    miss = s["questions"]["miss"]
    assert miss["n"] == 3 and miss["n_by"] == {"free": 2, "ending": 1}
    very = next(c for c in miss["choices"] if c["key"] == "very")
    assert very["n"] == 2 and very["by"] == {"free": 1, "ending": 1}
    p = s["price"]
    assert p["n_good"] == 2 and p["wont_pay"] == 1 and p["good_mid"] == 150 and p["high_mid"] == 300
    row = {r["price"]: r for r in p["rows"]}
    assert row[150]["good_pct"] == 50.0 and row[200]["good_pct"] == 0.0
    assert row[200]["too_pct"] == 0.0 and row[300]["too_pct"] == 100.0
    # the renewal list: "probably not" first; identity only with permission
    assert [r["continue"] for r in s["renew"]] == ["probably_not", "yes"]
    assert s["renew"][0]["email"] == "r@example.com"
    assert s["renew"][1]["email"] is None and s["renew"][1]["renewed"] is True
    assert s["said_yes"] == 1 and s["said_yes_renewed"] == 1
    assert len(s["texts"]) == 1 and s["texts"][0]["name"] is None
    assert len(s["rows"]) == 5 and set(s["columns"]) >= set(sv.QUESTIONS)


# --------------------------------------------------------------------------- #
# The frontend uses the same question ids and choice keys
# --------------------------------------------------------------------------- #

def test_frontend_keys_match():
    ts = (Path(__file__).resolve().parents[2] / "frontend" / "lib" / "survey.ts").read_text(encoding="utf-8")
    for qid, (kind, choices, cap, _ex) in sv.QUESTIONS.items():
        if kind == sv.TEXT:
            assert re.search(rf'\b{qid}\b', ts), qid
            continue
        m = re.search(rf'^\s*{qid}: (\[[^\]]*\]),', ts, re.M)
        assert m, f"{qid} missing from QUESTION_KEYS in frontend/lib/survey.ts"
        assert tuple(json.loads(m.group(1))) == tuple(choices), qid
    assert re.search(rf"SCREENS = {sv.SCREENS}\b", ts)
    assert re.search(rf"PICK_MAX = {sv.PICK_MAX}\b", ts)
