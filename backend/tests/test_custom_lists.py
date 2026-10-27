"""Your own research lists: the menu, spec checks and running a list."""
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


def test_every_template_is_a_valid_spec():
    for t in cl.TEMPLATES:
        assert cl.normalize_spec(t["spec"], SECTORS)["checks"] == t["spec"]["checks"]


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


def test_catalog_lists_sectors_as_options():
    cat = cl.catalog(SECTORS)
    sector = next(c for c in cat["checks"] if c["key"] == "sector")
    assert [o["value"] for o in sector["options"]] == SECTORS
    fresh = next(c for c in cat["checks"] if c["key"] == "fresh")
    assert fresh["options"] == [] and fresh["label_en"] == "Yearly accounts are up to date"


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
    assert p["title"] == "2 new shares on your list 'Cheap banks'"
    assert p["body"] == "Passed every check today: CITYBANK, EBL"
    assert p["url"] == "/screener?tab=saved&list=x1&src=alert"
    assert push_payload([({"id": "x1", "name": "a"}, [])], "en") is None


def test_templates_are_goals_then_research_lists():
    kinds = [t["kind"] for t in cl.TEMPLATES]
    assert kinds == sorted(kinds, key=lambda k: k != "goal")
    slugs = {t["research_slug"] for t in cl.TEMPLATES if t["kind"] == "research"}
    assert slugs == {lst.slug for lst in rl.LISTS}
    assert cl.DEFAULT_TEMPLATE in cl.TEMPLATE_BY_ID


def test_catalog_marks_power_checks():
    cat = cl.catalog(SECTORS)
    power = {c["key"] for c in cat["checks"] if c["premium"]}
    assert {"buy_today", "quarter_better", "cash_backed", "steady", "owners_buying"} <= power
    assert not ({"grade", "yield_min", "pe_max", "sector"} & power)


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


def test_run_reports_near_misses_by_check(monkeypatch):
    from backend.services import custom_lists_service as svc

    facts = {f["code"]: f for f in [
        _f("PASS"), _f("DEAR", current_pe=12.0), _f("DEAR2", current_pe=14.0, div_yield_pct=6.0),
        _f("THIN", div_yield_pct=3.0), _f("BOTH", div_yield_pct=3.0, current_pe=12.0),
    ]}
    monkeypatch.setattr(svc, "facts", lambda: facts)
    monkeypatch.setattr(svc, "sectors", lambda: SECTORS)
    monkeypatch.setattr(svc, "_ctx", lambda: rl.Ctx())
    monkeypatch.setattr(svc, "question_table", lambda: {c: cl.question_sat(f, rl.Ctx()) for c, f in facts.items()})
    res = svc.run({"checks": [{"key": "yield_min", "value": 4}, {"key": "pe_max", "value": 10}], "sort": "yield"})
    assert res["passed"] == 1
    near = res["near"]
    assert res["answers"] is None and res["facets"] is None  # not six answers: a fine-tune screen
    assert near["by"] == "check"
    assert near["total"] == 3
    assert [(b["key"], b["count"]) for b in near["by_check"]] == [("pe_max", 2), ("yield_min", 1)]
    assert [s["code"] for s in near["stocks"]] == ["DEAR2", "DEAR", "THIN"]
    assert near["stocks"][0]["miss"] == {
        "key": "pe_max", "label_en": "Price is 10 times yearly profit or less",
        "label_bn": "দাম বার্ষিক মুনাফার 10 গুণ বা তার কম",
        "value_en": "Price is 14 times its yearly profit", "value_bn": "দাম বার্ষিক মুনাফার 14 গুণ"}
    assert svc.run({"checks": [{"key": "fresh"}, {"key": "pe_max"}]}, near=False)["near"] is None


def test_every_check_explains_itself_and_each_setting_reads_as_a_sentence():
    cat = cl.catalog(SECTORS)
    for c in cat["checks"]:
        assert c["help_en"] and c["help_bn"], c["key"]
        for o in c["options"]:
            assert o["sentence_en"] and o["sentence_bn"], (c["key"], o["value"])
    pe = next(c for c in cat["checks"] if c["key"] == "pe_max")
    assert pe["options"][1]["sentence_en"] == "Price is 10 times yearly profit or less"



# ---------------------------------------------------------------------------
# The six questions
# ---------------------------------------------------------------------------

import itertools  # noqa: E402


def _all_answers():
    keys = [q.key for q in cl.QUESTIONS]
    for combo in itertools.product((0, 1, 2), repeat=len(keys)):
        yield dict(zip(keys, combo))


def test_every_combination_of_answers_is_a_valid_spec_and_reads_back():
    for answers in _all_answers():
        for sectors in ([], ["Bank"], ["Bank", "Cement"]):
            if not any(answers.values()) and not sectors:
                with pytest.raises(ValueError, match="no_checks"):  # can't save "everything"
                    cl.normalize_spec({"answers": answers}, SECTORS)
            spec = cl.normalize_spec({"answers": answers, "sectors": sectors, "sort": "cheap"}, SECTORS, allow_empty=True)
            assert len(spec["checks"]) <= cl.MAX_CHECKS
            assert spec["sort"] == "cheap"
            assert cl.answers_from_spec(spec) == {"answers": answers, "sectors": sectors}


def test_a_screen_that_is_not_six_answers_is_fine_tune():
    for checks in ([{"key": "pe_max", "value": 10}],                                  # cheap without "not expensive"
                   [{"key": "grade", "value": 45}],                                   # a setting no answer uses
                   [{"key": "grade", "value": 60}, {"key": "buy_today"}]):            # a power check on top
        assert cl.answers_from_spec(cl.normalize_spec({"checks": checks}, SECTORS)) is None


def test_bad_answers_are_refused():
    with pytest.raises(ValueError, match="unknown_question"):
        cl.spec_from_answers({"luck": 1})
    with pytest.raises(ValueError, match="bad_answer:price"):
        cl.spec_from_answers({"price": 3})
    with pytest.raises(ValueError, match="bad_answer:price"):
        cl.spec_from_answers({"price": True})


def test_goal_starts_are_six_answers_and_old_ids_still_open():
    for t in cl.TEMPLATES:
        if t["kind"] == "goal":
            assert cl.answers_from_spec(cl.normalize_spec(t["spec"], SECTORS)) == {
                "answers": t["answers"], "sectors": t["sectors"]}
    assert cl.TEMPLATE_ALIASES["fallen_good"] in cl.TEMPLATE_BY_ID


def _universe():
    return [
        _f("TOP", score=80.0, current_pe=8.0, div_yield_pct=6.0, cat="A", stale=False, debt_level="ok",
           loan_to_mcap=0.0, paid_years=5, payout_pct=40.0, eps=5.0, profit_trend=5.0, p1_eps_cagr=12.0,
           turnover_mn=20.0, mcap_mn=30000.0, p4_val=8.0),
        _f("DEAR", score=70.0, current_pe=25.0, p4_val=3.0),
        _f("WEAK", score=40.0, current_pe=6.0, p4_val=8.0),
        _f("ZED", score=65.0, cat="Z", p4_val=6.0),
        _f("BANK", score=62.0, sector="Bank", p4_val=6.0),
    ]


def test_counts_per_choice_match_running_each_choice():
    ctx = rl.Ctx()
    facts = _universe()
    sats = {f["code"]: cl.question_sat(f, ctx) for f in facts}
    for answers in ({"quality": 1, "price": 2, "safety": 1}, {"quality": 2}, {"price": 1, "trading": 1}):
        for sector in (None, "Cement"):
            full = {**cl.NO_ANSWERS, **answers}
            rows = [(not sector or f["sector"] == sector, sats[f["code"]]) for f in facts]
            counts = cl.facet_counts(rows, full)
            for q in cl.QUESTIONS:
                for lvl in (0, 1, 2):
                    trial = {**full, q.key: lvl}
                    spec = cl.normalize_spec({"answers": trial, "sector": sector}, SECTORS, allow_empty=True)
                    expect = len(rl.run_list(cl.build_list(spec), facts, ctx)["passed"])
                    assert counts[q.key][lvl] == expect, (answers, sector, q.key, lvl)


def test_question_misses_name_the_one_answer_missed():
    ctx = rl.Ctx()
    facts = _universe()
    answers = {**cl.NO_ANSWERS, "quality": 1, "price": 2}
    rows = [(f, True, cl.question_sat(f, ctx)) for f in facts]
    misses = {f["code"]: q for f, q in cl.question_misses(rows, answers)}
    assert misses.get("DEAR") == "price"
    assert misses.get("WEAK") == "quality"
    assert "TOP" not in misses  # passes both
    en, _bn = cl.miss_value(facts[1], "price", 2, ctx)
    assert en  # its own figure on the check it failed


def test_strengths_are_the_best_choice_met():
    sat = {q.key: [True, False, False] for q in cl.QUESTIONS} | {"price": [True, True, True], "safety": [True, True, False]}
    lv = cl.best_levels(sat)
    assert lv["price"] == 2 and lv["safety"] == 1 and lv["quality"] == 0


def test_catalog_lists_the_six_questions_with_three_choices():
    qs = cl.catalog(SECTORS)["questions"]
    assert [q["key"] for q in qs] == ["quality", "price", "dividends", "growth", "safety", "trading"]
    for q in qs:
        assert len(q["levels"]) == 3 and q["levels"][0]["tag_en"] is None
        assert all(l["means_en"] and l["means_bn"] and l["label_bn"] for l in q["levels"])



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
    # The old single `sector` field still works.
    spec = cl.normalize_spec({"answers": {"quality": 1}, "sector": "Bank"}, SECTORS)
    assert cl.answers_from_spec(spec)["sectors"] == ["Bank"]
    res = rl.run_list(cl.build_list(two), [_f("A", sector="Bank"), _f("B"), _f("C", sector="Jute")], rl.Ctx())
    assert sorted(f["code"] for f in res["passed"]) == ["A", "B"]
    assert cl.summary(two)[0]["en"] == "In the Bank or Cement sectors"



def test_home_card_words_for_a_pick_and_its_stocks():
    wants = cl.want_lines({**cl.NO_ANSWERS, "quality": 1, "price": 2}, ["Bank"])
    assert [(w["q_en"], w["a_en"]) for w in wants] == [
        ("How good is the company?", "Good"), ("Is the price low?", "Low"), ("Which business sectors?", "Bank")]
    tags = cl.strength_tags({"quality": 2, "price": 0, "dividends": 1})
    assert [x["en"] for x in tags] == ["Very good company", "Pays every year"]
    hidden = cl.hidden_summary(
        [{"signal": "buy", "levels": {"dividends": 2, "quality": 2}},
         {"signal": "none", "levels": {"dividends": 2}},
         {"signal": "buy", "levels": {"quality": 1}}],
        {"quality": 2})
    # quality is already required at 2, so the shared strength is the dividend one.
    assert hidden == {"count": 3, "buys": 2, "strength": {"n": 2, "en": "Pays 4%+ a year", "bn": "বছরে 4%+ দেয়"}}
