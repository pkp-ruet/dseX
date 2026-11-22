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
