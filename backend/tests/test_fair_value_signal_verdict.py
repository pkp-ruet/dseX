"""#10 corporate-action adjustment, #11 price text, #12 fair value + one verdict,
#7 debt penalty and #4 interim drop in the Buy/Sell signal."""
import pytest

from backend.services.db_service import adjust_price_rows, adjustment_factor_fn
from backend.services.fair_value import estimate_fair_value
from backend.services.signal_service import _signal_for_row
from backend.tests.fixtures import fin_rows


# --- #12 fair value ------------------------------------------------------------------

def sr(**kw):
    base = {"eps": 48.62, "own_avg_pe": 6.0, "sector_median_pe": 19.7, "own_avg_pb": 0.83,
            "sector_median_pb": 0.75, "current_pb": 0.62, "p5_consist": 10.0, "nav_ps": 281.28,
            "div_latest_dps": 18.0, "p4_val": 9.2}
    base.update(kw)
    return base


def test_peer_outlier_no_longer_drives_fair_value():
    fv = estimate_fair_value(sr(), fin_rows("JAMUNAOIL"), {"face_value": 10}, 175.0)
    peer = next(m["price"] for m in fv["methods"] if m["name"] == "peer_pe")
    own = next(m["price"] for m in fv["methods"] if m["name"] == "own_history_pe")
    assert peer <= own * 1.5 + 1                       # was ৳1,158 next to ৳384
    assert fv["center"] < 400                          # was ৳602 (mean incl. the outlier)


def test_value_box_badge_is_the_p4_verdict():
    # BATBC: P4 3.99 ("Looks costly" in the Health Check) — the box must not say "Looks cheap".
    batbc = sr(eps=10.77, own_avg_pe=17.72, sector_median_pe=47.6, own_avg_pb=5.2, nav_ps=107.15,
               current_pb=2.1, div_latest_dps=3.0, p4_val=3.99)
    fv = estimate_fair_value(batbc, fin_rows("BATBC"), {"face_value": 10}, 225.0)
    assert fv["stance"] == "expensive"
    assert fv["estimates_disagree"] == (fv["estimate_stance"] != "expensive")
    if fv["estimates_disagree"]:
        assert fv["confidence"] == "low"


def test_walton_fair_badge_over_a_much_higher_estimate_is_flagged():
    walton = sr(eps=32.61, own_avg_pe=24.76, sector_median_pe=30.0, own_avg_pb=2.9, nav_ps=366.8,
                current_pb=0.92, div_latest_dps=18.0, p4_val=5.6)
    fv = estimate_fair_value(walton, fin_rows("WALTONHIL"), {"face_value": 10}, 337.0)
    assert fv["stance"] == "fair" and fv["estimate_stance"] == "cheap"
    assert fv["estimates_disagree"] and fv["confidence"] == "low"


def test_bracbank_buy_at_reasonable_price_is_fair_not_pricey():
    brac = sr(eps=11.1, own_avg_pe=9.04, sector_median_pe=5.0, own_avg_pb=1.1, nav_ps=49.38,
              sector_median_pb=0.6, current_pb=1.3, div_latest_dps=1.5, p4_val=5.05)
    fv = estimate_fair_value(brac, fin_rows("BRACBANK"), {"face_value": 10}, 64.4, "BANK")
    assert fv["stance"] == "fair"


# --- #7 / #4 signal ---------------------------------------------------------------------

def row(**kw):
    base = {"score": 78.0, "p4_val": 8.0, "market_cat": "A", "stale_data": False, "eps_yoy_pct": 5.0}
    base.update(kw)
    return base


MOM = {"momentum_grade": "flat", "pct_in_52w_range": 40.0}


def test_buy_baseline():
    assert _signal_for_row(row(), MOM)["signal"] == "buy"


def test_loans_above_market_cap_block_buy():
    sig = _signal_for_row(row(debt_level="over_mcap"), MOM)
    assert sig["signal"] == "none" and sig["reason_key"] == "heavy_debt"
    assert sig["reason_bn"]


def test_interim_drop_blocks_buy_even_when_last_year_rose():
    sig = _signal_for_row(row(eps_yoy_pct=46.8, interim_eps_yoy_pct=-27.5), MOM)
    assert sig["reason_key"] == "earnings_dropped"


def test_red_flag_in_report_blocks_buy():
    sig = _signal_for_row(row(), MOM, ["audit"])
    assert sig["signal"] == "none" and sig["reason_key"] == "red_flag"
    assert sig["reason_bn"]


def test_red_flags_the_rules_already_cover_keep_their_reason():
    # Z, old accounts and loans over market value have their own rules; a
    # report flag for them alone never turns a Buy into "red_flag".
    assert _signal_for_row(row(), MOM, ["category", "stale", "loans"])["signal"] == "buy"
    assert _signal_for_row(row(market_cat="Z"), MOM, ["category"])["reason_key"] == "z_category"


# --- #10 corporate actions ----------------------------------------------------------------

def test_walton_record_date_adjustment():
    acts = [{"record_date": "2026-09-20", "cash_ps": 18.0, "stock_pct": 10.0, "cash_pct": 180.0}]
    f = adjustment_factor_fn(acts)
    assert f("2026-09-18", 392.0) == pytest.approx(340.0, abs=0.01)   # (392 - 18) / 1.1
    assert f("2026-09-21", 340.0) == 340.0                            # after the record date: untouched
    rows = adjust_price_rows([{"date": "2026-09-18", "ltp": 392.0}, {"date": "2026-09-21", "ltp": 344.0}], acts)
    assert rows[0]["adjusted"] and rows[0]["ltp"] == pytest.approx(340.0, abs=0.01)
    assert "adjusted" not in rows[1]


def test_bonus_only_adjustment():
    f = adjustment_factor_fn([{"record_date": "2026-05-17", "cash_ps": 1.5, "stock_pct": 15.0}])
    assert f("2026-05-14", 70.0) == pytest.approx((70 - 1.5) / 1.15, abs=1e-6)


# --------------------------------------------------------------------------- #
# Join and leave lines (2026-11-04, audit PR5)
# --------------------------------------------------------------------------- #

def _good_row(p4, score=70.0):
    return {"score": score, "p4_val": p4, "market_cat": "A", "stale_data": False}


def test_buy_joins_at_7_and_leaves_under_6_5():
    from backend.services.signal_service import _signal_for_row
    mom = {"momentum_grade": "healthy", "pct_in_52w_range": 50.0}
    assert _signal_for_row(_good_row(6.98), mom)["signal"] == "none"                         # not yet in
    assert _signal_for_row(_good_row(6.98), mom, prev={"signal": "buy"})["signal"] == "buy"  # stays
    assert _signal_for_row(_good_row(6.4), mom, prev={"signal": "buy"})["signal"] == "none"  # leaves
    assert _signal_for_row(_good_row(7.02), mom)["signal"] == "buy"


def test_near_top_block_lifts_only_under_80():
    from backend.services.signal_service import _signal_for_row
    near = {"reason_key": "near_52w_high", "signal": "none"}
    at82 = {"momentum_grade": "healthy", "pct_in_52w_range": 82.0}
    at79 = {"momentum_grade": "healthy", "pct_in_52w_range": 79.0}
    assert _signal_for_row(_good_row(7.5), at82)["signal"] == "buy"
    assert _signal_for_row(_good_row(7.5), at82, prev=near)["reason_key"] == "near_52w_high"
    assert _signal_for_row(_good_row(7.5), at79, prev=near)["signal"] == "buy"


def test_excellent_keeps_its_buy_down_to_3_5():
    from backend.services.signal_service import _signal_for_row
    mom = {"momentum_grade": "healthy", "pct_in_52w_range": 40.0}
    assert _signal_for_row(_good_row(3.8, 80.0), mom)["reason_key"] == "quality_expensive"
    assert _signal_for_row(_good_row(3.8, 80.0), mom, prev={"signal": "buy"})["signal"] == "buy"
    assert _signal_for_row(_good_row(3.4, 80.0), mom, prev={"signal": "buy"})["signal"] == "none"


def test_no_trade_in_the_window_blocks_a_buy():
    from backend.services.signal_service import _signal_for_row, _NO_TRADE
    assert _signal_for_row(_good_row(8.0), _NO_TRADE)["reason_key"] == "thin_trading"
    assert _signal_for_row(_good_row(8.0), None)["signal"] == "buy"     # momentum unavailable: not blocked


# --------------------------------------------------------------------------- #
# Holding advice is weight-aware, never from the buy price (2026-11-05, PR7)
# --------------------------------------------------------------------------- #

def test_holding_advice_ignores_what_was_paid():
    from backend.services.signal_service import holding_signal
    pricey = {"signal": "none", "reason_key": "quality_expensive", "tier": "good"}
    assert holding_signal(pricey, -12.0, 3.0, 10.0)["signal"] == "none"     # used to be Sell
    assert holding_signal(pricey, 0.0, 3.0, 10.0)["signal"] == "none"


def test_trim_a_big_share_at_a_high_price():
    from backend.services.signal_service import holding_signal
    pricey = {"signal": "none", "reason_key": "quality_expensive", "tier": "good"}
    assert holding_signal(pricey, 5.0, 3.0, 30.0)["signal"] == "trim"
    fair = {"signal": "none", "reason_key": "good_wait_price", "tier": "good", "pct52": 50.0}
    assert holding_signal(fair, 5.0, 5.0, 30.0)["signal"] == "none"           # big but fairly priced


def test_buy_more_only_under_20_percent():
    from backend.services.signal_service import holding_signal
    buy = {"signal": "buy", "reason_key": "quality_cheap", "tier": "good", "pct52": 40.0}
    assert holding_signal(buy, -3.0, 8.0, 12.0)["signal"] == "buy_more"
    assert holding_signal(buy, -3.0, 8.0, 22.0)["signal"] == "none"


def test_review_for_a_strong_company_held_back_by_a_warning():
    from backend.services.signal_service import holding_signal
    sig = {"signal": "none", "reason_key": "red_flag", "tier": "excellent", "reason_en": "We found a serious warning."}
    out = holding_signal(sig, 0.0, 8.0, 10.0)
    assert out["signal"] == "review" and out["reason_en"] == "We found a serious warning."
    assert holding_signal({"signal": "sell", "reason_key": "weak_fundamentals"}, 20.0, 9.0, 5.0)["signal"] == "sell"


# --------------------------------------------------------------------------- #
# Holding advice: the business's weight and release lines (2026-11-05)
# --------------------------------------------------------------------------- #

def test_no_buy_more_when_its_business_already_holds_too_much():
    from backend.services.signal_service import holding_signal
    buy = {"signal": "buy", "reason_key": "quality_cheap", "tier": "good", "pct52": 40.0}
    assert holding_signal(buy, 0.0, 8.0, 12.0, sector_pct=45.0)["reason_key"] == "heavy_sector_hold"
    assert holding_signal(buy, 0.0, 8.0, 12.0, sector_pct=35.0)["signal"] == "buy_more"
    # Banks + finance + insurers over half: a bank isn't "Buy more" either.
    assert holding_signal(buy, 0.0, 8.0, 12.0, sector_pct=30.0, fin_pct=55.0)["signal"] == "none"


def test_release_lines_stop_daily_flips():
    from backend.services.signal_service import holding_signal
    buy = {"signal": "buy", "reason_key": "quality_cheap", "tier": "good", "pct52": 40.0}
    assert holding_signal(buy, 0.0, 8.0, 21.0)["signal"] == "none"                     # new: over 20%
    assert holding_signal(buy, 0.0, 8.0, 21.0, prev="buy_more")["signal"] == "buy_more"  # kept to 23%
    assert holding_signal(buy, 0.0, 8.0, 23.5, prev="buy_more")["signal"] == "none"
    assert holding_signal(buy, 0.0, 8.0, 12.0, sector_pct=42.0, prev="buy_more")["signal"] == "buy_more"
    pricey = {"signal": "none", "reason_key": "quality_expensive", "tier": "good"}
    assert holding_signal(pricey, 0.0, 3.0, 24.0)["signal"] == "none"                  # new trim needs 25%
    assert holding_signal(pricey, 0.0, 3.0, 24.0, prev="trim")["signal"] == "trim"     # kept to 22%
    assert holding_signal(pricey, 0.0, 3.0, 21.0, prev="trim")["signal"] == "none"


def test_holding_mix_counts_sectors_and_financials():
    from backend.services.signal_service import holding_mix
    mix = holding_mix({"A": 30.0, "B": 25.0, "C": 45.0},
                      {"A": ("Bank", "BANK"), "B": ("Insurance", "INSURANCE"), "C": ("Cement", "GENERAL")})
    assert mix["A"] == {"sector_pct": 30.0, "fin_pct": 55.0}
    assert mix["C"] == {"sector_pct": 45.0, "fin_pct": None}
    assert holding_mix({"A": 100.0}, {"A": ("Bank", "BANK")}) == {}
