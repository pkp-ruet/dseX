"""Watch rules (THE Premium line, step 4): validation, the shared cap, and
what each rule raises from the watcher's facts."""
from datetime import date

from backend.services import watch_rules as wr

TODAY = date(2026, 11, 22)  # a Sunday
DAY = "2026-11-22"


def test_clean_rules_keeps_known_kinds_once_and_snaps_values():
    out = wr.clean_rules([
        {"kind": "grade_down"}, {"kind": "grade_down"}, {"kind": "nonsense"},
        {"kind": "day_drop", "value": 7}, {"kind": "profit_drop", "value": 30}, {"kind": "results", "value": 9},
    ])
    assert out == [{"kind": "grade_down"}, {"kind": "day_drop", "value": 5},
                   {"kind": "profit_drop", "value": 30}, {"kind": "results"}]
    assert wr.clean_rules("x") == []


def test_every_kind_has_words_in_both_languages_and_the_suggested_set_is_known():
    for kind, k in wr.KINDS.items():
        w = wr.label(kind)
        assert w["en"] and w["bn"] and "{v}" not in w["en"] and "{v}" not in w["bn"], kind
        if "values" in k:
            assert k["value"] in k["values"], kind
    assert set(wr.SUGGESTED) <= set(wr.KINDS)


def test_replace_code_keeps_other_shares_and_old_dates():
    rules = [{"code": "GP", "kind": "results", "created_at": "a"}, {"code": "ACI", "kind": "dividend", "created_at": "b"}]
    out = wr.replace_code(rules, "gp", [{"kind": "results"}, {"kind": "grade_down"}], "now")
    assert {"code": "ACI", "kind": "dividend", "created_at": "b"} in out
    gp = [r for r in out if r["code"] == "GP"]
    assert [(r["kind"], r["created_at"]) for r in gp] == [("results", "a"), ("grade_down", "now")]


def test_the_cap_is_shared_with_price_alerts_and_oldest_rules_stay_on():
    rules = [{"code": "A", "kind": "results", "created_at": "2"}, {"code": "B", "kind": "results", "created_at": "1"},
             {"code": "C", "kind": "results", "created_at": "3"}]
    active, paused = wr.active_rules(rules, 3, armed_alerts=1)
    assert [r["code"] for r in active] == ["B", "A"] and [r["code"] for r in paused] == ["C"]
    assert wr.active_rules(rules, None, 9) == (rules, [])
    assert wr.over_limit(2, 4, 3) and not wr.over_limit(5, 4, 3) and not wr.over_limit(1, 9, None)


def test_kept_rules_stay_on_before_older_ones_and_survive_a_save():
    rules = [{"code": "A", "kind": "results", "created_at": "1"}, {"code": "B", "kind": "results", "created_at": "2"},
             {"code": "C", "kind": "dividend", "created_at": "3"}]
    kept = wr.set_keep(rules, "c", "dividend", True)
    active, paused = wr.active_rules(kept, 3, armed_alerts=1)
    assert [r["code"] for r in active] == ["C", "A"] and [r["code"] for r in paused] == ["B"]
    assert wr.set_keep(rules, "C", "results", True) is None
    assert "keep" not in wr.set_keep(kept, "C", "dividend", False)[2]
    saved = wr.replace_code(kept, "C", [{"kind": "dividend"}, {"kind": "results"}], "now")
    c = {r["kind"]: r for r in saved if r["code"] == "C"}
    assert c["dividend"].get("keep") is True and "keep" not in c["results"]


def test_watching_is_following_a_share_off_the_watchlist_loses_its_rules():
    rules = [{"code": "GP", "kind": "results"}, {"code": "ACI", "kind": "dividend"},
             {"code": "GP", "kind": "grade_down"}, {"code": "BXPHARMA", "kind": "results"}]
    assert wr.drop_codes(rules, ["gp"]) == [{"code": "ACI", "kind": "dividend"}, {"code": "BXPHARMA", "kind": "results"}]
    assert wr.drop_codes(rules, []) == rules and wr.drop_codes(rules, None) == rules
    # Older rules on shares the reader never followed: each named once, in order.
    assert wr.unfollowed_codes(rules, ["aci"]) == ["GP", "BXPHARMA"]
    assert wr.unfollowed_codes(rules, ["GP", "ACI", "BXPHARMA"]) == []


def test_next_trading_day_skips_friday_and_saturday():
    assert wr.next_trading_day(date(2026, 11, 26)) == date(2026, 11, 29)  # Thu -> Sun
    assert wr.next_trading_day(TODAY) == date(2026, 11, 23)


FACTS = {
    "trade_day": DAY,
    "results": {"GP": {"period_end": date(2026, 9, 30), "months": 9, "eps_cum": 6.0, "eps_cum_prev": 10.0}},
    "grades": {"GP": {"from_tier": "good", "to_tier": "average"}},
    "red_flags": {"ACI": {"day": DAY, "items": [{"key": "audit", "en": "The auditor did not fully approve.", "bn": "নিরীক্ষক"}]}},
    "category": {"ACI": ("B", "Z")},
    "prices": {"GP": {"date": DAY, "change_pct": -6.2, "ltp": 300}},
    "declared": {"GP": {"declaration_date": "2026-11-21", "cash_pct": 100, "stock_pct": 0}},
    "dividend_prev": {"GP": {"cash_pct": 160}},
    "buy_rows": {"GP": [{"buy_by": "2026-11-23", "cash_per_share": 10, "record_date": "2026-11-25"}]},
    "insider_sells": {"ACI": {"post_date": "2026-11-21", "name": "Mr X", "shares": 100000}},
}


def _fire(code, kind, value=None, events=()):
    rule = {"code": code, "kind": kind, **({"value": value} if value is not None else {})}
    return wr.fire(code, rule, FACTS, DAY, TODAY, list(events))


def test_each_rule_fires_on_its_fact():
    assert _fire("GP", "profit_drop", 20)["level"] == "bad"
    assert _fire("GP", "profit_drop", 30)["title_en"].startswith("GP: profit fell 40%")
    assert _fire("GP", "results")["title_en"] == "GP posted its results: profit down 40%"
    assert _fire("GP", "grade_down")["title_en"] == "GP moved from “Mostly strong” to “Mixed”"
    assert _fire("GP", "grade_up") is None
    assert _fire("ACI", "red_flag")["body_en"] == "The auditor did not fully approve."
    assert _fire("ACI", "z_category")["level"] == "bad"
    assert _fire("GP", "day_drop", 5)["title_en"].startswith("GP fell 6.2% today")
    assert _fire("GP", "day_drop", 8) is None
    assert _fire("GP", "dividend")["title_en"] == "GP declared 100% cash"
    assert _fire("GP", "dividend_cut")["title_en"] == "GP cut its cash dividend to 100%"
    assert _fire("GP", "last_day")["id"] == "rule-last_day-GP-2026-11-23"
    assert "100,000 shares" in _fire("ACI", "owners_selling")["title_en"]
    assert _fire("GP", "breakeven") is None
    back = {"kind": "breakeven", "code": "GP", "title_en": "GP is back", "title_bn": "জিপি"}
    assert _fire("GP", "breakeven", events=[back])["title_en"] == "GP is back"
    assert _fire("ROBI", "results") is None


def test_every_event_reads_in_both_languages_and_says_it_is_their_rule():
    for code, kind in (("GP", "grade_down"), ("GP", "dividend"), ("ACI", "z_category"), ("GP", "last_day")):
        e = _fire(code, kind)
        assert e["kind"] == "rule" and e["rule"] == kind and e["code"] == code
        assert e["title_en"] and e["title_bn"] and e["body_en"] and e["body_bn"]


def test_evaluate_prefers_the_profit_drop_and_marks_paused_rules():
    rules = [{"code": "GP", "kind": "results"}, {"code": "GP", "kind": "profit_drop", "value": 20}]
    out = wr.evaluate(rules, FACTS, DAY, TODAY, [], paused=[{"code": "ACI", "kind": "z_category"}])
    assert [(e["rule"], e.get("paused", False)) for e in out] == [("profit_drop", False), ("z_category", True)]
    assert wr.covered(out) == {("GP", "results")}
