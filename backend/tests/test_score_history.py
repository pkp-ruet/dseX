"""Score history: grade changes, why they happened, and what is not news."""
from backend.services import score_history as sh


def _row(day, score, **pillars):
    r = {"date": day, "score": score}
    r.update(pillars)
    return r


P = dict(p1_biz=6.0, p2_health=6.0, p3_moat=6.0, p4_val=6.0, p5_div=6.0)


def test_drivers_turn_pillar_moves_into_score_points():
    prev = _row("d1", 62, **P)
    cur = _row("d2", 57, **{**P, "p1_biz": 4.0, "p4_val": 6.5})
    d = sh.drivers(prev, cur)
    assert d[0]["pillar"] == "p1_biz" and d[0]["points"] == -6.0
    assert d[0]["en"] == "Profit became weaker"
    # 0.5 × 0.15 × 10 = 0.75 points — under the 1-point floor, not a reason.
    assert all(x["pillar"] != "p4_val" for x in d)


def test_timeline_lists_grade_changes_measured_from_when_the_grade_began():
    rows = [_row("2026-10-01", 62, **P), _row("2026-10-02", 60.5, **P),
            _row("2026-10-05", 58.5, **{**P, "p1_biz": 4.0})]
    tl = sh.timeline(rows)
    assert [p["tier"] for p in tl["points"]] == ["good", "good", "average"]
    (ch,) = tl["changes"]
    assert ch["date"] == "2026-10-05" and ch["since"] == "2026-10-01"
    assert ch["en"] == "Grade fell from Good to Average (62 → 58)"
    assert ch["drivers"][0]["pillar"] == "p1_biz"
    assert tl["grade_changes"] == 1


def test_a_score_parked_on_a_grade_line_does_not_flicker():
    rows = [_row(f"2026-10-0{i}", s) for i, s in enumerate([60.2, 59.8, 60.1, 59.9, 60.3], start=1)]
    assert sh.timeline(rows)["changes"] == []
    # Clearing the line by a point does count.
    assert sh.settle("good", 58.9) == "average"
    assert sh.settle("good", 59.2) == "good"
    assert sh.settle("average", 61.0) == "good"


def test_rows_without_pillars_show_the_change_but_no_reason():
    rows = [_row("2026-08-01", 70), _row("2026-08-02", 80)]
    (ch,) = sh.timeline(rows)["changes"]
    assert ch["explained"] is False and ch["drivers"] == []


def _market(n, score):
    return {f"C{i}": {"tier": sh.tier_key(score), "score": score} for i in range(n)}


def test_a_market_wide_shift_is_our_rules_changing():
    a = _market(100, 62)
    b = {**_market(100, 62), **{f"C{i}": {"tier": "average", "score": 58} for i in range(10)}}
    assert sh.method_change_days({"d1": a, "d2": b}) == {"d2"}
    # Two companies changing grade on a normal day is news, not a rule change.
    c = {**_market(100, 62), **{f"C{i}": {"tier": "average", "score": 58} for i in range(2)}}
    assert sh.method_change_days({"d1": a, "d2": c}) == set()


def test_daily_state_diff_pushes_only_real_changes():
    prev = {"GP": {**sh.state_row({"score": 62, **P})}, "ACI": sh.state_row({"score": 50, **P})}
    cur = {"GP": sh.state_row({"score": 57, **{**P, "p2_health": 3.0}}), "ACI": sh.state_row({"score": 51, **P})}
    first = sh.grade_changes({}, {k: dict(v) for k, v in prev.items()})
    assert first == {}
    out = sh.grade_changes(prev, cur)
    assert list(out) == ["GP"]
    ev = sh.grade_event("GP", out["GP"], "2026-10-26")
    assert ev["id"] == "grade-GP-2026-10-26" and ev["level"] == "watch"
    assert ev["title_en"] == "GP: grade fell from Good to Average (62 → 57)"
    assert "finances became weaker" in ev["body_en"]
    assert cur["GP"]["anchor"]["score"] == 57


def test_state_diff_ignores_a_rule_change():
    prev = {f"C{i}": sh.state_row({"score": 62}) for i in range(60)}
    cur = {f"C{i}": sh.state_row({"score": 55}) for i in range(60)}
    assert sh.grade_changes(prev, cur) == {}
