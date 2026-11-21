"""THE Premium line (premium_line.py): every area is well formed, and the
numbers the rest of the backend reads come from it."""
from backend.services import premium_line as pl


def test_every_area_has_a_layer_a_shape_and_the_numbers_it_needs():
    for table in (pl.AREAS, pl.TARGET):
        for key, a in table.items():
            assert a["layer"] in pl.LAYERS, key
            assert a["free"] in pl.SHAPES, key
            assert a["per"] in pl.PERIODS, key
            needs_n = a["free"] in ("limit", "meter", "week", "count_one")
            assert (isinstance(a["n"], int) and a["n"] >= 0) if needs_n else a["n"] is None, key


def test_targets_are_known_areas_in_the_same_layer():
    for key, a in pl.TARGET.items():
        assert key in pl.AREAS, key
        assert a["layer"] == pl.AREAS[key]["layer"], key


def test_every_layer_has_words_in_both_languages():
    for layer in pl.LAYERS:
        assert pl.LAYER_WORDS[layer]["en"] and pl.LAYER_WORDS[layer]["bn"]


def test_the_market_layer_is_never_fully_locked_and_judgement_never_fully_open():
    for key, a in pl.AREAS.items():
        if a["layer"] == "market":
            assert a["free"] != "locked", key
        if a["layer"] == "judgement":
            assert a["free"] != "open", key


def test_premium_sees_everything():
    for key in pl.AREAS:
        assert pl.view(key, True)["free"] == "open"
        assert pl.view(key, False) == pl.AREAS[key]


def test_free_n_reads_the_shape():
    assert pl.free_n("ranking") is None  # open: no cap
    assert pl.free_n("brief") == 0  # locked
    assert pl.free_n("for_you") == 0  # only a count
    assert pl.free_n("analysis") == 10


def test_step_one_changes_nothing_a_reader_sees():
    """The free numbers the backend reads from the line (step 1 kept the
    hard-coded ones; each later step updates its own here)."""
    from backend.services import compare, entitlements, portfolio_watch, report_keys

    assert entitlements.FREE_LIMITS == {
        "watchlist": None, "holdings": None, "alerts": 3, "ai_daily": 10,  # step 5: watchlist open
        "portfolios": 1, "custom_lists": 0, "compare": 10,  # step 5: compare figures for 10
    }
    assert report_keys.REPORT_KEYS_PER_MONTH == 10
    assert portfolio_watch.TEASER_WEEKLY_CAP == 0  # step 3: the Friday letter is the one free push
    assert compare.FREE_CODES == 10
