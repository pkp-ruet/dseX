"""Watchlist glance board — the pure row builders."""
from backend.services.watchlist_glance import (
    buy_below, fair_block, glance_row, next_event, risk_flags, warnings_block,
)


def test_fair_gap_is_price_against_centre_and_hidden_when_estimates_disagree():
    fv = {"low": 80.0, "high": 120.0, "center": 100.0, "stance": "cheap", "estimates_disagree": False}
    assert fair_block(fv, 88.0)["gap_pct"] == -12.0
    assert fair_block(fv, 110.0)["gap_pct"] == 10.0
    hidden = fair_block({**fv, "estimates_disagree": True}, 88.0)
    assert hidden["gap_pct"] is None and hidden["center"] is None
    assert hidden["stance"] == "cheap" and hidden["low"] == 80.0
    assert fair_block(None, 88.0) is None


def test_buy_below_only_for_the_near_high_dampener():
    assert buy_below("near_52w_high", 200.0, 100.0) == 185.0
    assert buy_below("quality_expensive", 200.0, 100.0) is None
    assert buy_below("near_52w_high", 100.0, 100.0) is None
    assert buy_below("near_52w_high", None, 100.0) is None


def test_risk_flags_order_and_lender_cash_exemption():
    f = {"debt_level": "over_mcap", "cat": "Z", "stale": True, "eps": -0.4,
         "interim_nocfps": -1.2, "sector_class": "GENERAL"}
    gov = [{"key": "qualified_opinion", "tone": "watch", "en": "Auditor qualified", "bn": "নিরীক্ষক"}]
    keys = [r["key"] for r in risk_flags(f, gov)]
    assert keys == ["loans_over_mcap", "z_category", "stale", "loss", "cash_out", "qualified_opinion"]
    bank = {"interim_nocfps": -3.0, "sector_class": "BANK", "eps": 2.0, "debt_level": None, "cat": "A"}
    assert risk_flags(bank, []) == []
    assert [r["key"] for r in risk_flags({"debt_level": "over_reserve"}, [])] == ["loans_over_reserve"]


def test_next_event_picks_the_nearest_and_counts_the_rest():
    recs = [{"trading_code": "X", "record_date": "2026-11-10", "record_days_left": 17,
             "buy_by": "2026-11-05", "buy_days_left": 12, "cash_per_share": 2.5, "yield_pct": 4.1},
            {"trading_code": "Y", "record_date": "2026-10-30"}]
    agms = [{"trading_code": "X", "agm_date": "2026-12-01", "agm_days_left": 38}]
    ev = next_event("X", recs, agms)
    assert ev["kind"] == "record" and ev["buy_by"] == "2026-11-05" and ev["more"] == 1
    assert next_event("X", [], agms)["kind"] == "agm"
    assert next_event("Z", recs, agms) is None
    same_day = [{"trading_code": "X", "agm_date": "2026-11-10", "agm_days_left": 17}]
    assert next_event("X", recs, same_day)["kind"] == "record"


def test_unscored_row_has_no_risks_and_keeps_the_signal_reason():
    sig = {"signal": "none", "reason_key": "not_rated", "reason_en": "x", "reason_bn": "y"}
    row = glance_row("NEW", None, {"company_name": "New Co"}, {"ltp": 12.0, "change_pct": 1.5},
                     sig, None, [], [], [])
    assert row["name"] == "New Co" and row["price"] == 12.0 and row["risks"] == []
    assert row["fair"] is None and row["signal"]["reason_key"] == "not_rated"
    assert row["hi52"] is None and row["lo52"] is None


def test_warnings_name_only_the_serious_flags():
    snap = {"red": 1, "amber": 2, "red_keys": ["qualified"],
            "red_lines": {"qualified": {"en": "The auditor qualified its accounts.", "bn": "নিরীক্ষক আপত্তি দিয়েছেন।"}}}
    w = warnings_block(snap)
    assert w == {"red": 1, "amber": 2, "items": [{"key": "qualified", "en": "The auditor qualified its accounts.",
                                                   "bn": "নিরীক্ষক আপত্তি দিয়েছেন।"}]}
    assert warnings_block(None) is None
    assert warnings_block({"red": 0, "amber": 0})["items"] == []


def test_row_carries_profit_trend_safety_and_warnings():
    f = {"code": "X", "name": "X Ltd", "ltp": 50.0, "score": 70.0, "profit_change_pct": 12.5,
         "sector_class": "GENERAL", "eps": 4.0, "payout_pct": 40.0, "p5_consist": 10.0}
    row = glance_row("X", f, {}, {}, {"signal": "buy"}, None, [], [], [],
                     {"red": 0, "amber": 1, "red_keys": [], "red_lines": {}})
    assert row["profit_change_pct"] == 12.5
    assert row["safety"]["level"] == "safe"
    assert row["warnings"] == {"red": 0, "amber": 1, "items": []}
    bare = glance_row("Y", None, {"company_name": "Y"}, {}, {}, None, [], [], [])
    assert bare["safety"] is None and bare["warnings"] is None and bare["profit_change_pct"] is None
