"""The stock screener (2026-11-01, Premium since 2026-11-14): goals, filters, joining prices."""
import pytest

from backend.services import screener as sc

SECTORS = ["Bank", "Cement", "Pharmaceuticals & Chemicals"]


def _f(code, **kw):
    """Research-list facts, the fields the screener reads."""
    base = {"code": code, "name": code, "sector": "Cement", "sector_class": "GENERAL", "cat": "A",
            "ltp": 50.0, "change_pct": 1.0, "current_pe": 9.0, "current_pb": 1.4, "pct_in_range": 40.0,
            "div_yield_pct": 5.0, "paid_years": 5, "eps": 4.0, "profit_change_pct": 10.0, "roe_pct": 15.0,
            "mcap_mn": 8000.0, "turnover_mn": 3.0, "loan_pct_mcap": 12.0, "score": 70.0, "p4_val": 7.5}
    base.update(kw)
    return base


def _row(code, ret=None, red=0, extra=None, **kw):
    return {"code": code, "name": code, "v": sc.row_values(_f(code, **kw), ret, red, extra)}


def test_figures_are_the_public_numbers_in_reader_units():
    v = sc.row_values(_f("A"), 12.5, 0)
    assert v["mcap"] == 800.0          # ৳8,000 million = ৳800 crore
    assert v["turnover"] == 30.0       # ৳3 million = ৳30 lakh
    assert v["pe"] == 9.0 and v["yield"] == 5.0 and v["ret_1y"] == 12.5
    assert v["grade"] == "good" and v["price_word"] == "low" and v["warnings"] == "none"


def test_a_loss_has_no_pe_and_a_lender_has_no_loan_figure():
    v = sc.row_values(_f("L", current_pe=-4.0, sector_class="BANK", div_yield_pct=None, paid_years=None), None, None)
    assert v["pe"] is None and v["loans"] is None
    assert v["yield"] == 0.0           # paid no cash = 0%, so "under 1%" keeps it
    assert v["paid"] == 2              # 2 or fewer of the last five years
    assert v["warnings"] is None       # no report snapshot: not known


def test_every_filter_explains_itself_in_both_languages():
    for fd in sc.FILTERS:
        assert fd.name_en and fd.name_bn and fd.help_en and fd.help_bn and fd.short_bn, fd.key
        for p in fd.presets:
            assert p.en and p.bn and (p.min is not None or p.max is not None), fd.key
        if fd.kind == "set" and fd.key != "sector":
            assert fd.options, fd.key
    assert {fd.key for fd in sc.FILTERS if fd.ours} == {"grade", "price_word", "warnings", "div_safety",
                                                         "cash_backed", "owners", "score"}
    groups = {g for g, _, _ in sc.GROUPS}
    assert all(fd.group in groups for fd in sc.FILTERS)
    # The menu: 12 filters, our own analysis first (2026-11-14: "lots of filters").
    # The rest still sort, goals use them and saved screens keep them.
    menu = [fd.key for fd in sc.FILTERS if fd.menu]
    assert menu == ["grade", "price_word", "warnings", "div_safety", "price", "pe", "yield", "paid",
                    "record_days", "profit_change", "mcap", "sector"]


def test_spec_is_cleaned_and_refuses_what_the_menu_does_not_offer():
    spec = sc.normalize_spec({"filters": [{"key": "pe", "min": 15, "max": 5},
                                          {"key": "sector", "in": ["Cement", "Bank", "Cement"]}]}, SECTORS)
    assert spec == {"v": 2, "filters": [{"key": "pe", "min": 5.0, "max": 15.0},
                                        {"key": "sector", "in": ["Bank", "Cement"]}],
                    "sort": "mcap", "dir": "desc"}
    for bad, why in (({"filters": [{"key": "luck", "min": 1}]}, "unknown_filter"),
                     ({"filters": [{"key": "pe"}]}, "empty_filter:pe"),
                     ({"filters": [{"key": "pe", "max": 1}, {"key": "pe", "max": 2}]}, "duplicate_filter"),
                     ({"filters": [{"key": "sector", "in": ["Jute"]}]}, "unknown_sector"),
                     ({"filters": [{"key": "category", "in": ["Q"]}]}, "bad_value:category"),
                     ({"filters": [{"key": "pe", "max": "ten"}]}, "bad_value:pe"),
                     ({"filters": [], "sort": "luck"}, "bad_sort"),
                     ({"checks": []}, "bad_spec")):
        with pytest.raises(ValueError, match=why):
            sc.normalize_spec(bad, SECTORS)
    with pytest.raises(ValueError, match="too_many_filters"):
        sc.normalize_spec({"filters": [{"key": "pe", "max": 1}] * (sc.MAX_FILTERS + 1)}, SECTORS)


def test_a_missing_figure_fails_an_active_filter_and_bounds_are_inclusive():
    rows = [_row("TEN", current_pe=10.0), _row("LOSS", current_pe=-2.0), _row("CHEAP", current_pe=6.0),
            _row("DEAR", current_pe=30.0)]
    spec = sc.normalize_spec({"filters": [{"key": "pe", "max": 10}], "sort": "pe", "dir": "asc"}, SECTORS)
    assert [r["code"] for r in sc.apply(rows, spec)] == ["CHEAP", "TEN"]


def test_sort_puts_missing_figures_last_whatever_the_direction():
    rows = [_row("A", ret=5.0), _row("B", ret=None), _row("C", ret=-3.0), _row("D", ret=20.0)]
    for d, want in (("desc", ["D", "A", "C", "B"]), ("asc", ["C", "A", "D", "B"])):
        spec = sc.normalize_spec({"filters": [], "sort": "ret_1y", "dir": d}, SECTORS)
        assert [r["code"] for r in sc.apply(rows, spec)] == want


def test_set_filters_and_our_view():
    rows = [_row("A"), _row("Z", cat="Z"), _row("WEAK", score=30.0, p4_val=2.0), _row("RED", red=2)]
    spec = sc.normalize_spec({"filters": [{"key": "category", "in": ["A"]},
                                          {"key": "grade", "in": ["good", "excellent"]},
                                          {"key": "warnings", "in": ["none"]}]}, SECTORS)
    assert [r["code"] for r in sc.apply(rows, spec)] == ["A"]


def test_words_read_plainly():
    assert sc.range_words(sc.BY_KEY["pe"], None, 10) == "Under 10"                    # a preset's own label
    assert sc.range_words(sc.BY_KEY["pe"], None, 12) == "12 or less"
    assert sc.range_words(sc.BY_KEY["yield"], 4, None, bn=True) == "4% বা বেশি"
    assert sc.range_words(sc.BY_KEY["mcap"], 300, 900) == "৳300 crore to ৳900 crore"
    assert sc.fmt(1771.0, "lakh") == "৳17.7 crore"                                    # ৳100 lakh = ৳1 crore
    assert sc.filter_words({"key": "category", "in": ["A", "B", "N"]}) == "Category: not Z"
    assert sc.summary({"filters": [{"key": "sector", "in": ["Bank"]}]}) == [
        {"key": "sector", "en": "Sector: Bank", "bn": "সেক্টর: Bank"}]


def test_goals_and_old_ready_screens_are_valid():
    assert [r.id for r in sc.GOALS] == ["strong_cheap", "steady_dividends", "dividend_soon", "profit_growing",
                                       "owners_buying", "strong_near_low"]
    for r in sc.READY:
        sc.normalize_spec(r.spec(), SECTORS)
        assert sc.BY_KEY[r.metric].kind == "range"
        assert r.title_bn and r.blurb_bn
        assert r.goal == (r in sc.GOALS), r.id
    assert len({r.id for r in sc.READY}) == len(sc.READY)
    # Old links (?ready=near_low, the removed lists' redirects) still load.
    for old in ("high_dividend", "low_pe", "below_book", "near_low", "profit_up", "biggest", "most_traded",
                "no_loans", "a_payers"):
        assert old in sc.READY_BY_ID and not sc.READY_BY_ID[old].goal


def test_goals_find_what_they_say():
    rows = [
        _row("CHEAP"),                                                       # good, low price, no warnings
        _row("FAIR", p4_val=5.0),                                            # price check fair
        _row("FLAG", red=1),                                                 # a serious warning
        _row("ZED", cat="Z"),
        _row("QUIET", turnover_mn=0.2),                                      # ৳2 lakh a day
        _row("SOON", extra={"record": {"days": 12, "buy_by": "2026-11-24"}}),
        _row("CASH", profit_change_pct=30.0, extra={"cash": "backed"}),
        _row("PAPER", profit_change_pct=30.0, extra={"cash": "paper"}),
        _row("BUYER", extra={"owners": "bought"}),
        _row("LOW", pct_in_range=10.0, p4_val=5.0),
    ]
    run = {g.id: [r["code"] for r in sc.apply(rows, g.safe_spec())] for g in sc.GOALS}
    # The goals carry only their own rules; Z and thin trading go on top.
    assert not any(f["key"] in ("category", "turnover") for g in sc.GOALS for f in g.spec()["filters"])
    assert set(run["strong_cheap"]) == {"CHEAP", "SOON", "CASH", "PAPER", "BUYER"}
    assert run["dividend_soon"] == ["SOON"]
    assert run["profit_growing"] == ["CASH"]
    assert run["owners_buying"] == ["BUYER"]
    assert run["strong_near_low"] == ["LOW"]


def test_safety_rules_go_on_top_unless_the_reader_set_their_own():
    assert sc.with_safety([]) == [sc.NOT_Z, sc.TRADED]
    a_only = [{"key": "category", "in": ["A"]}]
    assert sc.with_safety(a_only) == a_only + [sc.TRADED]      # category A only is stricter than not Z


def test_our_new_figures():
    v = sc.row_values(_f("A", p5_consist=10.0, payout_pct=40.0), None, 0,
                      {"cash": "paper", "owners": "none", "record": {"days": 3, "buy_by": "2026-11-16"},
                       "lines": {"low_below": 48.0, "high_above": 70.0}})
    assert v["div_safety"] == "safe" and v["cash_backed"] == "no" and v["owners"] == "none"
    assert v["record_days"] == 3 and v["buy_by"] == "2026-11-16" and v["low_below"] == 48.0
    none = sc.row_values(_f("N", div_yield_pct=0.0), None, 0, {"cash": "loss"})
    assert none["div_safety"] is None          # paid no cash: no reading
    assert none["cash_backed"] is None         # a loss has no profit to back
    assert none["owners"] is None              # the owners report wasn't built: not "No trades"
    assert sc.fmt(1, "days") == "1 day" and sc.fmt(12, "days", 0, True) == "12 দিন"
    assert set(sc.EXTRA_COLS) <= set(v)


def test_the_price_that_brings_a_share_in():
    v = sc.row_values(_f("A", ltp=100.0, current_pe=12.0, div_yield_pct=3.0, lo52=80.0, hi52=120.0),
                      None, 0, {"lines": {"low_below": 95.0, "high_above": 130.0}})
    assert sc.join_price(v, {"key": "pe", "max": 10}) == pytest.approx(83.33, abs=0.01)
    assert sc.join_price(v, {"key": "yield", "min": 4}) == 75.0
    assert sc.join_price(v, {"key": "range_pos", "max": 25}) == 90.0
    assert sc.join_price(v, {"key": "price_word", "in": ["low"]}) == 95.0
    assert sc.join_price(v, {"key": "price", "max": 90}) == 90.0
    assert sc.join_price(v, {"key": "pe", "max": 15}) is None          # it already passes
    assert sc.join_price(v, {"key": "pe", "min": 15}) is None          # it would take a rise
    assert sc.join_price(v, {"key": "sector", "in": ["Bank"]}) is None  # not about the price


def test_almost_there_is_one_filter_and_a_small_fall():
    rows = [_row("IN", current_pe=8.0), _row("NEAR", current_pe=10.5), _row("FAR", current_pe=14.0),
            _row("TWO", current_pe=10.5, cat="Z")]
    spec = sc.normalize_spec({"filters": [{"key": "pe", "max": 10}, {"key": "category", "in": ["A", "B", "N"]}]},
                             SECTORS)
    near = sc.near_misses(rows, spec)
    assert [n["code"] for n in near] == ["NEAR"]                        # FAR needs a 29% fall, TWO misses two
    assert near[0]["key"] == "pe" and near[0]["fall_pct"] == pytest.approx(4.8, abs=0.1)
    assert sc.one_away(rows, spec["filters"]) == {"NEAR": "pe", "FAR": "pe"}   # TWO misses two


def test_change_reasons_read_plainly():
    v = sc.row_values(_f("GP", p4_val=7.5, current_pe=9.6), None, 0)
    assert sc.change_reason("GP", "price_word", v, True) == {
        "en": "GP: Our price check is now Low price.", "bn": "GP: আমাদের দাম যাচাই এখন কম দাম।"}
    assert sc.change_reason("GP", "pe", v, True)["en"] == "GP: P/E is now 9.6."
    assert sc.change_reason("GP", None, v, True)["en"] == "GP now passes every filter."
    assert sc.change_reason("GP", "record_days", v, False)["en"] == "GP: Record date in has no figure now."


def test_old_checks_become_the_closest_filters():
    filters, dropped = sc.from_checks([
        {"key": "pe_max", "value": 10}, {"key": "yield_min", "value": 4}, {"key": "turnover", "value": 5},
        {"key": "mcap", "value": 5000}, {"key": "category", "value": "not_z"}, {"key": "sector", "value": "Bank"},
        {"key": "grade", "value": 60}, {"key": "cash_backed", "value": True}, {"key": "profitable", "value": True}])
    by = {f["key"]: f for f in filters}
    assert by["pe"] == {"key": "pe", "max": 10.0}
    assert by["turnover"] == {"key": "turnover", "min": 50.0}     # ৳5 million = ৳50 lakh
    assert by["mcap"] == {"key": "mcap", "min": 500.0}            # ৳5,000 million = ৳500 crore
    assert by["category"] == {"key": "category", "in": ["A", "B", "N"]}
    assert by["grade"] == {"key": "grade", "in": ["excellent", "good"]}
    assert by["eps"] == {"key": "eps", "min": 0.0}
    assert dropped == ["cash_backed"]
    sc.normalize_spec({"filters": filters}, SECTORS)  # opens as a valid screen


def test_a_saved_screen_remembers_the_lists_it_was_made_from():
    spec = sc.normalize_spec({
        "filters": sc.with_safety([{"key": "paid", "min": 5}, {"key": "yield", "min": 4},
                                   {"key": "sector", "in": ["Bank"]}]),
        "lists": ["profit_growing", "steady_dividends", "steady_dividends"],
        "own": [{"key": "sector", "in": ["Bank"]}], "safe": True}, SECTORS)
    assert spec["lists"] == ["steady_dividends", "profit_growing"]      # the page's order, once each
    assert spec["own"] == [{"key": "sector", "in": ["Bank"]}] and spec["safe"] is True
    assert [w["en"] for w in sc.summary(spec)] == ["Steady dividends", "Profit growing", "Sector: Bank"]
    with pytest.raises(ValueError, match="bad_lists"):
        sc.normalize_spec({"filters": [], "lists": ["luck"]}, SECTORS)
    old = sc.normalize_spec({"filters": [{"key": "pe", "max": 10}]}, SECTORS)
    assert "lists" not in old and sc.summary(old)[0]["en"] == "P/E: Under 10"
