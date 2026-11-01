"""Screens saved before the 2026-11-01 screener (old checks) and the six
questions the recommendation engine still reads."""
import pytest

from backend.services import custom_lists as cl
from backend.services import research_lists as rl

SECTORS = ["Bank", "Cement"]


def _f(code, **kw):
    base = {"code": code, "name": code, "score": 70.0, "sector": "Cement", "cat": "A",
            "div_yield_pct": 5.0, "current_pe": 9.0, "mcap_mn": 8000.0, "turnover_mn": 3.0,
            "paid_years": 5, "eps": 4.0, "payout_pct": 50.0, "signal": "none"}
    base.update(kw)
    return base


def test_spec_rejects_what_the_menu_does_not_offer():
    with pytest.raises(ValueError, match="bad_value:pe_max"):
        cl.normalize_spec({"checks": [{"key": "pe_max", "value": 7}]}, SECTORS)
    with pytest.raises(ValueError, match="unknown_check"):
        cl.normalize_spec({"checks": [{"key": "magic"}]}, SECTORS)
    with pytest.raises(ValueError, match="duplicate_check"):
        cl.normalize_spec({"checks": [{"key": "fresh"}, {"key": "fresh"}]}, SECTORS)
    with pytest.raises(ValueError, match="unknown_sector"):
        cl.normalize_spec({"checks": [{"key": "sector", "value": "Jute"}]}, SECTORS)
    with pytest.raises(ValueError, match="no_checks"):
        cl.normalize_spec({"checks": []}, SECTORS)
    with pytest.raises(ValueError, match="too_many_checks"):
        cl.normalize_spec({"checks": [{"key": c.key} for c in cl.CATALOG[:cl.MAX_CHECKS + 1]]}, SECTORS)


def test_on_off_checks_ignore_a_value_and_defaults_fill_in():
    spec = cl.normalize_spec({"checks": [{"key": "fresh", "value": 99}, {"key": "yield_min"}]}, SECTORS)
    assert spec == {"checks": [{"key": "fresh", "value": True}, {"key": "yield_min", "value": 4}], "sort": "score"}


def test_running_a_list_funnels_and_sorts():
    spec = cl.normalize_spec({"checks": [{"key": "yield_min", "value": 4}, {"key": "pe_max", "value": 10},
                                         {"key": "buy_today"}], "sort": "yield"}, SECTORS)
    facts = [
        _f("A", div_yield_pct=6.0, signal="buy"),
        _f("B", div_yield_pct=8.0, signal="buy"),
        _f("C", div_yield_pct=8.0, current_pe=14.0, signal="buy"),   # too dear
        _f("D", div_yield_pct=3.0, signal="buy"),                    # pays too little
        _f("E", div_yield_pct=9.0),                                  # no Buy today
        _f("F", score=None),                                         # not rated: outside the universe
    ]
    res = rl.run_list(cl.build_list(spec), facts, rl.Ctx())
    assert res["universe"] == 5
    assert [f["left"] for f in res["funnel"]] == [4, 3, 2]
    assert [f["code"] for f in res["passed"]] == ["B", "A"]
    vals = rl.check_values(cl.build_list(spec), facts[0], rl.Ctx())
    assert vals[1]["value_en"] == "Price is 9 times its yearly profit"


def test_members_diff_waits_for_a_baseline():
    assert cl.diff_members(None, ["A", "B"]) == ([], [])
    assert cl.diff_members(["A", "B"], ["B", "C"]) == (["C"], ["A"])


def test_names_are_trimmed_and_required():
    assert cl.clean_name("  Cheap   banks ") == "Cheap banks"
    with pytest.raises(ValueError):
        cl.clean_name("   ")


def test_push_names_the_newcomers():
    from backend.services.custom_lists_service import push_payload

    p = push_payload([({"id": "x1", "name": "Cheap banks"}, ["CITYBANK", "EBL"])], "en")
    assert p["title"] == "2 new shares on your screen 'Cheap banks'"
    assert p["body"] == "Matched every filter today: CITYBANK, EBL"
    assert p["url"] == "/screener?tab=saved&list=x1&src=alert"
    assert push_payload([({"id": "x1", "name": "a"}, [])], "en") is None


def test_quarter_better_reads_the_interim_report():
    chk = cl.BY_KEY["quarter_better"].make(True)
    ok, en, _ = chk.fn(_f("A", interim_eps_yoy_pct=12.0, interim_label_en="Q2"), None)
    assert ok and "up 12%" in en
    ok, _, _ = chk.fn(_f("B", interim_eps_yoy_pct=-5.0), None)
    assert not ok
    ok, en, _ = chk.fn(_f("C"), None)
    assert not ok and "No quarterly report" in en


def test_saved_news_names_joiners_only_from_the_last_check(monkeypatch):
    from backend.services import custom_lists_service as svc
    docs = [
        {"id": "a", "name": "Cheap banks", "members": ["X", "Y"], "joined": ["Y"],
         "changed_on": "2026-10-26", "checked_on": "2026-10-26"},
        {"id": "b", "name": "Old news", "members": ["Z"], "joined": ["Z"],
         "changed_on": "2026-10-20", "checked_on": "2026-10-26"},
        {"id": "c", "name": "Never checked", "members": None},
    ]
    monkeypatch.setattr(svc, "_docs", lambda uid: docs)
    monkeypatch.setattr(svc, "facts", lambda: {"Y": {"name": "Y Bank"}})
    out = {d["id"]: d for d in svc.saved_news("u1")}
    assert out["a"]["passed"] == 2 and out["a"]["new_today"] == [{"code": "Y", "name": "Y Bank"}]
    assert out["b"]["new_today"] == []
    assert out["c"]["passed"] is None and out["c"]["new_today"] == []


def test_near_misses_fail_exactly_one_check():
    spec = cl.normalize_spec({"checks": [{"key": "yield_min", "value": 4}, {"key": "pe_max", "value": 10},
                                         {"key": "sector", "value": "Cement"}], "sort": "yield"}, SECTORS)
    facts = [
        _f("PASS"),                                                  # passes all three: not a near miss
        _f("DEAR", current_pe=12.0, div_yield_pct=7.0),              # misses only the P/E
        _f("THIN", div_yield_pct=3.0),                               # misses only the yield
        _f("BOTH", div_yield_pct=3.0, current_pe=12.0),              # misses two
        _f("BANK", sector="Bank"),                                   # misses only the sector: skipped
        _f("NONE", current_pe=12.0, score=None),                     # not rated
    ]
    lst = cl.build_list(spec)
    misses = rl.near_misses(lst, facts, rl.Ctx(), skip=frozenset({2}))
    assert [(f["code"], i) for f, i, _en, _bn in misses] == [("DEAR", 1), ("THIN", 0)]  # ranked by yield
    assert misses[0][2] == "Price is 12 times its yearly profit"
    # Without the skip, another sector's company counts as one miss.
    assert "BANK" in [f["code"] for f, *_ in rl.near_misses(lst, facts, rl.Ctx())]


def test_near_misses_need_two_checks():
    spec = cl.normalize_spec({"checks": [{"key": "pe_max", "value": 10}]}, SECTORS)
    assert rl.near_misses(cl.build_list(spec), [_f("DEAR", current_pe=12.0)], rl.Ctx()) == []


# ---------------------------------------------------------------------------
# The six questions
# ---------------------------------------------------------------------------


def test_strengths_are_the_best_choice_met():
    sat = {q.key: [True, False, False] for q in cl.QUESTIONS} | {"price": [True, True, True], "safety": [True, True, False]}
    lv = cl.best_levels(sat)
    assert lv["price"] == 2 and lv["safety"] == 1 and lv["quality"] == 0


def test_several_sectors_in_one_screen():
    # One sector stays a string (old saved specs read the same); several are a list, in catalog order.
    one = cl.normalize_spec({"checks": [{"key": "sector", "value": "Bank"}]}, SECTORS)
    assert one["checks"] == [{"key": "sector", "value": "Bank"}]
    two = cl.normalize_spec({"checks": [{"key": "sector", "value": ["Cement", "Bank", "Cement"]}]}, SECTORS)
    assert two["checks"] == [{"key": "sector", "value": ["Bank", "Cement"]}]
    with pytest.raises(ValueError, match="unknown_sector"):
        cl.normalize_spec({"checks": [{"key": "sector", "value": ["Bank", "Jute"]}]}, SECTORS)
    with pytest.raises(ValueError, match="unknown_sector"):
        cl.normalize_spec({"checks": [{"key": "sector", "value": []}]}, SECTORS)
    res = rl.run_list(cl.build_list(two), [_f("A", sector="Bank"), _f("B"), _f("C", sector="Jute")], rl.Ctx())
    assert sorted(f["code"] for f in res["passed"]) == ["A", "B"]
    assert cl.summary(two)[0]["en"] == "In the Bank or Cement sectors"


def test_strength_tags_name_the_best_choice_met():
    tags = cl.strength_tags({"quality": 2, "price": 0, "dividends": 1})
    assert [x["en"] for x in tags] == ["Very good company", "Pays every year"]
