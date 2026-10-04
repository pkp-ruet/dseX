"""#10 corporate-action adjustment, #11 price text, #12 fair value + one verdict,
#7 debt penalty and #4 interim drop in the Buy/Sell signal."""
import pytest

from backend.services.db_service import adjust_price_rows, adjustment_factor_fn
from backend.services.fair_value import estimate_fair_value
from backend.services.signal_service import _signal_for_row
from backend.services.verdict_service import build_verdict
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


# --- #11 price text consistent with the data ------------------------------------------------

def test_bracbank_rising_near_yearly_low():
    v = build_verdict({"score": 76.5}, {"momentum_grade": "warm", "pct_in_52w_range": 11.9, "return_7d_pct": 2.7},
                      None, {"change_pct": 0.5}, fin_rows("BRACBANK"))
    assert "slowly rising" not in v["tagline"]
    assert "1-year low" in v["tagline"]


def test_lhb_rising_week_but_falling_day():
    v = build_verdict({"score": 66.1}, {"momentum_grade": "hot", "pct_in_52w_range": 93.6},
                      None, {"change_pct": -3.7}, fin_rows("LHB"))
    assert "steadily" not in v["tagline"] and "fell today" in v["tagline"]
    assert "3.7%" in v["sentences"][0]


def test_record_date_in_window_is_explained():
    mom = {"momentum_grade": "flat", "pct_in_52w_range": 40.0,
           "corporate_action": {"record_date": "2026-09-20", "cash_pct": 180.0, "stock_pct": 10.0}}
    v = build_verdict({"score": 68.0}, mom, None, {"change_pct": 0.2}, fin_rows("WALTONHIL"))
    assert any("record date" in s and "180% cash" in s for s in v["sentences"])


def test_verdict_mentions_this_year_decline():
    sr_ = {"score": 83.0, "interim_eps_yoy_pct": -27.5, "eps_yoy_pct": 46.8,
           "interim_label_en": "9 months to Mar 2026"}
    v = build_verdict(sr_, {"momentum_grade": "flat"}, None, {"change_pct": 0.0}, fin_rows("JAMUNAOIL"))
    assert any("Profit rose last year, but so far this year it is down 28%" in s for s in v["sentences"])
