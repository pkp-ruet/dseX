"""The fair price's steadier inputs (fair_context, 2026-11-22): steadier profit,
its usual price in today's market, and cleaner similar companies."""
import pytest

from backend.services import fair_context as fc
from backend.services.fair_value import estimate_fair_value


# --- 1. Steadier profit --------------------------------------------------------

def test_ordinary_growth_counts_in_full():
    assert fc.steady_eps(11.0, [9.0, 10.0, 10.5]) == (11.0, None)


def test_a_jump_counts_at_half_weight_and_is_capped():
    used, note = fc.steady_eps(18.0, [9.0, 10.0, 11.0])           # 1.8x the middle
    assert note == "jump"
    assert used == pytest.approx(10.0 * (1.25 + 0.5 * 0.55))       # 15.25, not 18
    capped, _ = fc.steady_eps(60.0, [9.0, 10.0, 11.0])             # a one-off year
    assert capped == pytest.approx(10.0 * 1.625)


def test_a_fall_counts_in_full():
    assert fc.steady_eps(5.0, [10.0, 10.0, 10.0]) == (5.0, None)


def test_the_steadied_figure_has_no_step():
    below, _ = fc.steady_eps(12.4999, [10.0, 10.0, 10.0])
    above, _ = fc.steady_eps(12.5001, [10.0, 10.0, 10.0])
    assert abs(above - below) < 0.001


def test_no_history_or_past_losses_keep_the_latest_profit():
    assert fc.steady_eps(8.0, [7.0]) == (8.0, None)
    assert fc.steady_eps(8.0, [-2.0, -1.0, 0.5]) == (8.0, None)
    assert fc.steady_eps(-1.0, [5.0, 5.0, 5.0]) == (None, None)


def test_only_the_last_three_years_count():
    # An old high year (40) is outside the window: the middle is 10, not 11.
    used, note = fc.steady_eps(20.0, [40.0, 9.0, 10.0, 11.0])
    assert note == "jump" and used == pytest.approx(10.0 * (1.25 + 0.5 * 0.75))


# --- 2. Its usual price, in today's market -------------------------------------

def _pts(year, month, then_now_pairs):
    return [(year, month, t, n) for t, n in then_now_pairs]


def test_market_factor_is_the_middle_of_then_over_now():
    pts = _pts(2021, 6, [(15, 10)] * 5 + [(20, 10)] * 4)           # 9 companies
    f = fc.market_factors(pts)
    assert f["by_month"][(2021, 6)] == pytest.approx(1.5)
    assert f["by_year"][2021] == pytest.approx(1.5)


def test_too_few_companies_fall_back_to_the_whole_year():
    pts = _pts(2021, 12, [(20, 10)] * 3) + _pts(2021, 6, [(15, 10)] * 6)
    f = fc.market_factors(pts)
    assert (2021, 12) not in f["by_month"]
    assert fc.factor_for(f, 2021, 12) == f["by_year"][2021]
    assert fc.market_factors(_pts(2021, 6, [(15, 10)] * 3))["by_year"] == {}


def test_a_wild_factor_is_bounded():
    f = fc.market_factors(_pts(2021, 6, [(90, 10)] * 9))
    assert f["by_year"][2021] == fc.FACTOR_MAX


def test_usual_today_takes_out_the_market_level():
    factors = {"by_month": {(2021, 6): 1.5, (2024, 6): 1.1, (2025, 6): 1.0}, "by_year": {}}
    # Year-end P/Es 21, 16.5, 14: the plain middle says 16.5; in today's market 14.
    assert fc.usual_today([(2021, 21.0), (2024, 16.5), (2025, 14.0)], 6, factors) == pytest.approx(14.0)


def test_usual_today_needs_three_years_on_todays_footing():
    factors = {"by_month": {(2024, 6): 1.1, (2025, 6): 1.0}, "by_year": {}}
    assert fc.usual_today([(2021, 21.0), (2024, 16.5), (2025, 14.0)], 6, factors) is None


# --- 3. Cleaner similar companies ----------------------------------------------

def _row(code, pe, mcap=1000.0, sector="Pharmaceuticals & Chemicals", cat="A", pb=2.0, stale=False):
    return {"trading_code": code, "sector": sector, "current_pe": pe, "current_pb": pb,
            "mcap_mn": mcap, "market_cat": cat, "stale_data": stale}


def test_pool_leaves_out_z_losses_stale_thin_and_miscellaneous():
    rows = [_row("A", 12), _row("Z1", 40, cat="Z"), _row("L", -3), _row("S", 30, stale=True),
            _row("T", 50), _row("M", 15, sector="Miscellaneous")]
    pool = fc.peer_pool(rows, {"A": 5.0, "Z1": 5.0, "L": 5.0, "S": 5.0, "T": 0.2, "M": 5.0})
    assert [p["code"] for p in pool["Pharmaceuticals & Chemicals"]] == ["A"]
    assert "Miscellaneous" not in pool


def test_peers_are_similar_size_when_enough_are():
    big = [_row(f"B{i}", 10 + i, mcap=50_000) for i in range(5)]
    small = [_row(f"S{i}", 40 + i, mcap=500) for i in range(5)]
    pool = fc.peer_pool(big + small)
    out = fc.peer_ratios("ME", "Pharmaceuticals & Chemicals", 60_000, pool)
    assert out["sized"] and out["n"] == 5 and out["pe"] == 12


def test_too_few_peers_means_no_peer_estimate_not_the_market():
    pool = fc.peer_pool([_row(f"P{i}", 10) for i in range(4)])
    out = fc.peer_ratios("ME", "Pharmaceuticals & Chemicals", 1000, pool)
    assert out["pe"] is None and out["n"] == 0


def test_a_company_is_never_its_own_peer():
    pool = fc.peer_pool([_row(f"P{i}", 10) for i in range(5)] + [_row("ME", 99)])
    assert fc.peer_ratios("ME", "Pharmaceuticals & Chemicals", 1000, pool)["pe"] == 10


# --- The estimate with the market inputs ---------------------------------------

def _fin(eps_by_year, pe_by_year, nav=50.0):
    return [{"year": y, "eps": eps_by_year[y], "pe_ratio_basic": pe_by_year.get(y), "nav_per_share": nav}
            for y in sorted(eps_by_year)]


def test_estimate_uses_steady_profit_and_todays_usual_price():
    fin = _fin({2021: 10.0, 2022: 10.0, 2024: 10.0, 2025: 10.0},
               {2021: 21.0, 2022: 18.0, 2024: 16.5, 2025: 14.0})
    row = {"trading_code": "ME", "sector": "Pharmaceuticals & Chemicals", "mcap_mn": 1000,
           "eps": 18.0, "own_avg_pe": 17.25, "ye_month": 6, "p4_val": 5.0, "p5_consist": 0}
    ctx = {"pe_factors": {"by_month": {(2021, 6): 1.5, (2022, 6): 1.3, (2024, 6): 1.1, (2025, 6): 1.0},
                          "by_year": {}},
           "pb_factors": {}, "pool": {}}
    fv = estimate_fair_value(row, fin, {"face_value": 10}, 200.0, "GENERAL", ctx=ctx)
    own = next(m for m in fv["methods"] if m["name"] == "own_history_pe")
    assert fv["eps_note"] == "jump" and fv["eps_used"] == pytest.approx(15.25)
    # Today's usual P/E: middle of 14, 13.85, 15, 14 = 14 (not the plain 17.25).
    assert own["price"] == pytest.approx(round(14.0 * 15.25))
    assert "today's market" in own["label_en"]
    assert not any(m["name"] == "peer_pe" for m in fv["methods"])   # no clean peers
    assert fv["usual_today"] == ["own_history_pe"] and fv["peers"] == 0


def test_without_market_inputs_the_row_figures_stand():
    fin = _fin({2023: 10.0, 2024: 10.0, 2025: 10.0}, {2023: 15.0, 2024: 15.0, 2025: 15.0})
    row = {"eps": 10.0, "own_avg_pe": 15.0, "sector_median_pe": 15.0, "p4_val": 5.0, "p5_consist": 0}
    fv = estimate_fair_value(row, fin, {"face_value": 10}, 150.0)
    assert fv["center"] == 150 and fv["usual_today"] == [] and fv["peers"] is None


def test_a_usual_pe_past_40_does_not_price_the_share():
    fin = _fin({2023: 0.04, 2024: 0.05, 2025: 0.06}, {2023: 900.0, 2024: 700.0, 2025: 600.0}, nav=14.0)
    row = {"eps": 0.06, "own_avg_pe": 700.0, "sector_median_pe": 55.0, "own_avg_pb": 4.0,
           "p4_val": 1.0, "p5_consist": 0}
    fv = estimate_fair_value(row, fin, {"face_value": 10}, 50.0)
    assert [m["name"] for m in fv["methods"]] == ["book_own"]


def test_a_jump_year_is_not_counted_twice():
    # Profit doubled in 2025 and the market priced it at a low P/E: that year's
    # usual P/E is read on its steadied profit, as today's price is.
    fin = _fin({2021: 2.0, 2022: 2.0, 2023: 2.0, 2024: 2.0, 2025: 4.0},
               {2021: 6.0, 2022: 6.0, 2024: 6.0, 2025: 3.0})
    row = {"trading_code": "ME", "eps": 4.0, "own_avg_pe": 6.0, "ye_month": 12, "p4_val": 5.0,
           "p5_consist": 0}
    flat = {(y, 12): 1.0 for y in range(2020, 2026)}
    ctx = {"pe_factors": {"by_month": flat, "by_year": {}}, "pb_factors": {}, "pool": {}}
    fv = estimate_fair_value(row, fin, {"face_value": 10}, 20.0, "GENERAL", ctx=ctx)
    own = next(m for m in fv["methods"] if m["name"] == "own_history_pe")
    # Steadied 2025 profit 3.25: P/E 3 on ৳4 = price 12 = 3.69x 3.25. Middle of
    # 6, 6, 3.69 (2022 and 2023 sit in the floor years) = 6, on ৳3.25 today.
    assert fv["eps_used"] == pytest.approx(3.25)
    assert own["price"] == pytest.approx(19.5)


# --- 4. Confidence and the range (2026-11-22, phase 1) ---------------------------

def test_confidence_needs_methods_that_agree_and_a_steady_record():
    level, why = fc.confidence(3, 0.2, 4, True, 0.9, False, 0.9, False)
    assert level == "high" and {"methods_agree", "long_history", "steady_profit"} <= set(why)
    assert fc.confidence(2, 0.4, 3, True, 0.9, False, 0.9, False)[0] == "medium"
    assert fc.confidence(2, 0.7, 3, False, 0.3, False, 0.4, False)[0] == "low"


def test_one_method_is_always_low_confidence():
    assert fc.confidence(1, 0.0, 9, True, 1.0, False, 1.0, False) == ("low", ["one_method"])


def test_a_steadied_jump_is_named_but_not_counted_twice():
    a = fc.confidence(3, 0.2, 4, True, 0.9, False, 0.9, False)
    b = fc.confidence(3, 0.2, 4, True, 0.9, True, 0.9, False)
    assert a[0] == b[0] and "profit_jump" in b[1]


def test_old_or_thin_accounts_lower_confidence():
    assert fc.confidence(3, 0.2, 3, True, 0.9, False, 0.9, False)[0] == "high"
    assert fc.confidence(3, 0.2, 3, True, 0.9, False, 0.9, True)[0] == "medium"
    assert fc.confidence(3, 0.2, 3, True, 0.9, False, 0.5, False)[0] == "medium"


def test_the_range_widens_with_less_confidence_and_wide_methods():
    assert fc.range_half_width("high", 0.0) == pytest.approx(0.08)
    assert fc.range_half_width("medium", 0.05) == pytest.approx(0.12)
    assert fc.range_half_width("low", 0.0) == pytest.approx(0.18)
    assert fc.range_half_width("medium", 0.32) == pytest.approx(0.12 + 0.25 * 0.20)
    assert fc.range_half_width("low", 5.0) == fc.RANGE_MAX


# --- 5. Earning power behind the assets estimate --------------------------------

def test_book_scale_only_ever_lowers_and_has_a_floor():
    assert fc.book_scale(0.10, 0.20) == pytest.approx(0.5)
    assert fc.book_scale(0.15, 0.20) == pytest.approx(0.75)
    assert fc.book_scale(0.30, 0.20) == 1.0
    assert fc.book_scale(-0.05, 0.20) == fc.BOOK_SCALE_MIN
    assert fc.book_scale(0.10, None) is None


# --- 6. The valuation score from the price and the range -------------------------

def test_the_score_is_the_signals_lines_at_the_range_edges():
    from backend.services.signal_service import CHEAP_P4, EXPENSIVE_P4
    c, w = 100.0, 0.12
    assert fc.p4_on_fair(c * (1 - w), c, w)[0] == pytest.approx(CHEAP_P4)
    assert fc.p4_on_fair(c * (1 + w), c, w)[0] == pytest.approx(EXPENSIVE_P4)
    assert fc.p4_on_fair(c, c, w)[0] == pytest.approx(fc.P4_AT_CENTRE)


def test_less_confidence_needs_a_bigger_fall_to_be_a_low_price():
    from backend.services.signal_service import CHEAP_P4
    high = fc.p4_on_fair(88.0, 100.0, fc.RANGE_BASE["high"])[0]
    low = fc.p4_on_fair(88.0, 100.0, fc.RANGE_BASE["low"])[0]
    assert high >= CHEAP_P4 > low


def test_the_score_falls_as_the_price_rises_and_stays_in_bounds():
    scores = [fc.p4_on_fair(p, 100.0, 0.12)[0] for p in (30, 60, 90, 100, 110, 150, 400)]
    assert scores == sorted(scores, reverse=True)
    assert scores[0] == 10.0 and scores[-1] == 0.0


def test_a_loss_has_no_price_score():
    assert fc.p4_on_fair(50.0, 100.0, 0.12, eps_now=-1.0) == (0.0, "loss")


def test_pe_ceilings_cap_the_score():
    p4, cap = fc.p4_on_fair(50.0, 100.0, 0.12, eps_now=1.0)        # P/E 50, far under the centre
    assert cap == "pe_ceiling" and p4 == 1.0


def test_a_flat_company_that_earns_less_than_a_deposit_is_never_a_low_price():
    # P/E 20 (5% a year), 3% cash, profit flat: 30% under its usual price is still not "low".
    p4, cap = fc.p4_on_fair(70.0, 100.0, 0.12, eps_now=3.5, eps_used=3.5, dps=2.1, growth_score=2.0)
    assert cap == "deposit" and p4 == fc.DEPOSIT_CAP_P4
    # Growing, or earning close to the deposit, or paying more cash: no cap.
    assert fc.p4_on_fair(70.0, 100.0, 0.12, 3.5, 3.5, 2.1, growth_score=6.0)[1] is None
    assert fc.p4_on_fair(70.0, 100.0, 0.12, 6.5, 6.5, 2.1, growth_score=2.0)[1] is None
    assert fc.p4_on_fair(70.0, 100.0, 0.12, 3.5, 3.5, 7.5, growth_score=2.0)[1] is None


def test_p4_at_price_reads_the_fair_range():
    from backend.services.scoring_service import p4_at_price, price_for_p4
    row = {"ltp": 90.0, "p4_val": 6.75, "p4_basis": "fair", "fair_center": 100.0,
           "fair_half_width": 0.08, "eps": 8.0, "fair_eps_used": 8.0, "div_latest_dps": 4.0,
           "p1_eps_cagr": 6.0}
    assert p4_at_price(row, 90.0) == pytest.approx(5.5 + 1.5 * 0.10 / 0.08)
    assert price_for_p4(row, 7.0) == pytest.approx(92.0, abs=0.01)


def test_the_estimate_carries_confidence_and_a_range_from_it():
    row = {"eps": 10.0, "own_avg_pe": 12.0, "own_avg_pb": 1.5, "nav_ps": 80.0,
           "div_latest_dps": 5.0, "p5_consist": 10.0, "payout_pct": 50.0,
           "eps_stability": 0.9, "data_completeness": 0.9}
    fv = estimate_fair_value(row, [], {"face_value": 10}, 100.0)
    assert fv["confidence"] in ("high", "medium", "low")
    assert fv["half_width"] >= fc.RANGE_BASE[fv["confidence"]] - 1e-9
    assert fv["low"] == pytest.approx(fv["center"] * (1 - fv["half_width"]), rel=0.01)
