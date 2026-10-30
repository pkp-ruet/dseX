from datetime import datetime, timezone

from backend.services import rank_alerts as ra
from backend.services import rank_history as rh

PILLARS = {"p1_biz": 7.0, "p2_health": 7.0, "p3_moat": 7.0, "p4_val": 5.0, "p5_div": 5.0}


def row(score, **kw):
    return {"score": score, **PILLARS, "market_cat": "A", "stale_data": False, **kw}


def test_ranks_are_by_score_with_stable_ties_and_skip_unscored():
    assert rh.ranks_for_day({"B": 50, "A": 50, "C": 80, "D": None}) == {"C": 1, "A": 2, "B": 3}


def test_series_keeps_the_day_and_how_many_were_ranked():
    pts = rh.series(["2026-10-01", "2026-10-02"], [0, 1], [5, 3], [300, 301])
    assert pts == [{"d": "2026-10-01", "r": 5, "n": 300}, {"d": "2026-10-02", "r": 3, "n": 301}]


def _market(n=40, base=40.0):
    return {f"C{i:02d}": row(base + i * 0.5) for i in range(n)}


def test_movers_name_the_check_that_moved_the_score():
    prev = _market()
    cur = {c: dict(r) for c, r in prev.items()}
    # C00 is last; a better profit check lifts it to the top.
    cur["C00"] = row(70.0, p1_biz=10.0)
    m = rh.movers(prev, cur, "2026-10-23", "2026-10-30")
    assert m["climbed"][0]["code"] == "C00"
    assert m["climbed"][0]["places"] == 39
    assert m["climbed"][0]["reason"]["kind"] == "p1_biz"
    assert m["climbed_n"] == 1
    # Everyone C00 passed slipped one place — under the noise floor.
    assert m["fell_n"] == 0


def test_a_company_that_did_not_move_is_explained_by_its_neighbours():
    prev = {"A": row(60.0), "B": row(59.0), "C": row(58.0), "D": row(57.0), "E": row(56.0), "F": row(55.0)}
    cur = dict(prev)
    cur["F"] = row(66.0, p1_biz=10.0)
    cur["A"] = row(60.0)  # A only slipped because F passed it
    m = rh.movers(prev, cur, "a", "b")
    assert m["climbed"][0]["code"] == "F"
    assert rh._reason(prev["A"], cur["A"])["kind"] == "others"


def test_category_change_leads_the_reason():
    r = rh._reason(row(60.0), row(40.0, market_cat="Z"))
    assert r["kind"] == "to_z"


def test_grade_changes_need_a_settled_move():
    prev = {"A": row(60.5), "B": row(62.0)}
    cur = {"A": row(59.6), "B": row(58.0)}  # A is parked on the line; B really fell
    assert rh.grade_changes(prev, cur) == ["B"]


def test_week_window_starts_after_a_rule_change():
    dates = [f"2026-10-{d:02d}" for d in (19, 20, 21, 22, 23, 26, 27)]
    assert rh.week_window(dates, set()) == ("2026-10-20", "2026-10-27", False)
    assert rh.week_window(dates, {"2026-10-23"}) == ("2026-10-23", "2026-10-27", True)
    assert rh.week_window(dates, {"2026-10-27"}) == (None, "2026-10-27", True)
    assert rh.week_window(["2026-10-27"], set()) == (None, None, False)


def test_rank_alert_fires_only_when_the_condition_turns_true():
    now = datetime(2026, 10, 31, tzinfo=timezone.utc)
    a = ra.new_alert("X", "top20", rank=25, score=70.0, now=now)
    assert a["was"] is False
    alerts, fired = ra.check([a], {"X": 18}, {"X": 72.0})
    assert [f["code"] for f in fired] == ["X"] and alerts[0]["was"] is True
    alerts, fired = ra.check(alerts, {"X": 17}, {"X": 72.0})
    assert fired == []
    alerts, fired = ra.check(alerts, {"X": 30}, {"X": 70.0})
    alerts, fired = ra.check(alerts, {"X": 19}, {"X": 71.0})
    assert len(fired) == 1


def test_below_good_uses_the_settled_grade():
    now = datetime(2026, 10, 31, tzinfo=timezone.utc)
    a = ra.new_alert("X", "below_good", rank=50, score=62.0, now=now)
    assert a["tier"] == "good" and a["was"] is False
    alerts, fired = ra.check([a], {"X": 60}, {"X": 59.5})  # parked on the line
    assert fired == []
    alerts, fired = ra.check(alerts, {"X": 70}, {"X": 57.0})
    assert len(fired) == 1 and fired[0]["tier_now"] == "average"


def test_missing_score_keeps_state_and_never_fires():
    now = datetime(2026, 10, 31, tzinfo=timezone.utc)
    a = ra.new_alert("X", "top20", rank=25, score=70.0, now=now)
    alerts, fired = ra.check([a], {}, {})
    assert fired == [] and alerts[0]["was"] is False


def test_push_payload_words():
    f = {"code": "GP", "kind": "top20", "rank": 12}
    p = ra.push_payload([f], "en")
    assert "top 20" in p["body"] and p["url"].startswith("/stock/GP")
    assert ra.push_payload([], "en") is None
    two = ra.push_payload([f, {"code": "X", "kind": "below_good", "tier_now": "weak"}], "bn")
    assert two["url"].startswith("/dsestockranking")


def test_an_unknown_category_mark_never_reads_as_a_change():
    r = rh._reason(row(40.0, market_cat="Z"), row(40.2, market_cat="-"))
    assert "now -" not in r["en"]
