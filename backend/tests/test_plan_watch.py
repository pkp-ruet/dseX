"""Plan watch (services/plan_watch.py): what changed in a reader's portfolio
plan after the close — a waiting share reaching its price, a share falling
out of the strong pool, a new serious problem — each told once."""
import re

from backend.services import plan_watch as pw

PLAN = {
    "items": [
        {"code": "SQURPHARMA", "state": "now", "qty": 86, "amount": 18060.0, "price": 210.0, "wait_under": None},
        {"code": "BERGERPBL", "state": "wait", "qty": 11, "amount": 16214.0, "price": 1750.0, "wait_under": 1474.0},
        {"code": "EBL", "state": "now", "qty": 500, "amount": 12250.0, "price": 24.5, "wait_under": None},
    ]
}
POOL = {"SQURPHARMA", "BERGERPBL", "EBL"}


def _ev(**kw):
    args = {"plan_id": "abc123", "plan": PLAN, "day": "2026-11-24", "closes": {"BERGERPBL": 1600.0},
            "pool_codes": POOL, "gate_fail": {}, "red_new": {}, "held": set(), "followed": set()}
    args.update(kw)
    return pw.plan_events(**args)


def test_quiet_day_says_nothing():
    assert _ev() == []


def test_waiting_share_reaching_its_price():
    ev = _ev(closes={"BERGERPBL": 1470.0})
    assert len(ev) == 1
    e = ev[0]
    assert e["plan_kind"] == "price" and e["level"] == "good" and e["kind"] == "plan"
    assert e["id"] == "plan-price-abc123-BERGERPBL"  # once per plan and share
    assert "৳1,470" in e["body_en"] and "৳1,474" in e["body_en"] and "11 shares" in e["body_en"]
    assert e["url"].startswith("/portfolio-builder?plan=abc123")


def test_a_share_already_bought_is_left_to_the_watcher():
    assert _ev(closes={"BERGERPBL": 1400.0}, held={"BERGERPBL"}) == []


def test_out_of_the_pool_says_why_and_never_says_buy():
    ev = _ev(pool_codes={"SQURPHARMA", "EBL"}, closes={"BERGERPBL": 1400.0},
             gate_fail={"BERGERPBL": {"en": "We grade it mixed", "bn": "আমাদের গ্রেডে মিশ্র"}})
    kinds = {e["plan_kind"] for e in ev}
    assert kinds == {"out"}
    assert ev[0]["body_en"].startswith("We grade it mixed.")
    assert ev[0]["id"] == "plan-out-abc123-BERGERPBL"


def test_new_serious_problem_unless_the_watcher_says_it():
    red = {"EBL": {"day": "2026-11-24", "items": [{"key": "audit", "en": "The auditor did not fully approve the accounts.",
                                                  "bn": "নিরীক্ষক হিসাব পুরোপুরি অনুমোদন করেননি।"}]}}
    ev = _ev(red_new=red)
    assert [e["plan_kind"] for e in ev] == ["red"]
    assert ev[0]["id"] == "plan-red-abc123-EBL-2026-11-24"
    assert _ev(red_new=red, followed={"EBL"}) == []


def test_tags_keep_the_worst_news():
    red = {"BERGERPBL": {"day": "2026-11-24", "items": [{"en": "Loans over its value.", "bn": "ঋণ মূল্যের চেয়ে বেশি।"}]}}
    ev = _ev(red_new=red, pool_codes={"SQURPHARMA", "EBL"},
             gate_fail={"BERGERPBL": {"en": "Loans are bigger than what it has saved", "bn": "ঋণ জমানো টাকার চেয়ে বেশি"}})
    tags = pw.change_tags(ev)
    assert tags["BERGERPBL"]["kind"] == "red"


def test_push_payload():
    one = _ev(closes={"BERGERPBL": 1470.0})
    p = pw.push_payload(one, "abc123", "en")
    assert p["title"] == one[0]["title_en"] and p["tag"] == "planwatch"
    red = {"EBL": {"day": "2026-11-24", "items": [{"en": "x", "bn": "y"}]}}
    two = _ev(closes={"BERGERPBL": 1470.0}, red_new=red)
    p2 = pw.push_payload(two, "abc123", "bn")
    assert "2টি" in p2["title"] and p2["url"].startswith("/portfolio-builder?plan=abc123")
    assert pw.push_payload([], "abc123") is None


def test_words_are_plain():
    red = {"EBL": {"day": "2026-11-24", "items": [{"en": "x", "bn": "y"}]}}
    ev = _ev(closes={"BERGERPBL": 1470.0}, red_new=red, pool_codes={"BERGERPBL", "EBL"},
             gate_fail={"SQURPHARMA": {"en": "We grade it mixed", "bn": "আমাদের গ্রেডে মিশ্র"}})
    assert len(ev) == 3
    for e in ev:
        for k in ("title_en", "title_bn", "body_en", "body_bn"):
            assert e[k]
            assert not re.search(r"[০-৯]", e[k])
            assert "—" not in e[k]
