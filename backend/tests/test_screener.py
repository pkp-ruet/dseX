"""The stock screener (2026-11-01): filters on public figures."""
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


def _row(code, ret=None, red=0, **kw):
    return {"code": code, "name": code, "v": sc.row_values(_f(code, **kw), ret, red)}


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
    assert {fd.key for fd in sc.FILTERS if fd.premium} == {"grade", "price_word", "warnings"}


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


def test_ready_screens_are_valid_and_use_only_public_figures():
    for r in sc.READY:
        spec = sc.normalize_spec(r.spec(), SECTORS)
        assert not any(sc.BY_KEY[f["key"]].premium for f in spec["filters"]), r.id
        assert sc.BY_KEY[r.metric].kind == "range"
        assert r.title_bn and r.blurb_bn
    assert len({r.id for r in sc.READY}) == len(sc.READY)


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
