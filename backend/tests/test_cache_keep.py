"""A cache past its timer is kept while its data hasn't changed
(db_service.KEEP_UNCHANGED_SECONDS, Render bandwidth 2026-11-23)."""
import pytest

from backend.services import db_service
from backend.services.db_service import (
    KEEP_UNCHANGED_SECONDS, _ttl_cache, cache_stamp, clear_all_caches,
    clear_price_caches, entry_current,
)

# 2026-11-23 10:00 Dhaka (04:00 UTC).
T0 = 1_795_406_400.0


@pytest.fixture
def clock(monkeypatch):
    now = {"t": T0}
    monkeypatch.setattr(db_service.time, "time", lambda: now["t"])
    return now


def _counter(**kw):
    calls = {"n": 0}

    @_ttl_cache(300, **kw)
    def load():
        calls["n"] += 1
        return calls["n"]

    return load, calls


def test_kept_past_its_timer_while_nothing_changed(clock):
    load, calls = _counter()
    load()
    clock["t"] += 2 * 3600          # well past 5 minutes, no clear since
    load()
    assert calls["n"] == 1


def test_safety_limit_rebuilds_it(clock):
    load, calls = _counter()
    load()
    clock["t"] += KEEP_UNCHANGED_SECONDS + 1
    load()
    assert calls["n"] == 2


def test_a_new_dhaka_day_rebuilds_it_even_inside_the_timer(clock):
    clock["t"] = T0 + 13 * 3600 + 58 * 60   # 23:58 Dhaka
    load, calls = _counter()
    load()
    clock["t"] += 3 * 60                    # 00:01 the next day
    load()
    assert calls["n"] == 2


def test_full_clear_rebuilds(clock):
    load, calls = _counter()
    load()
    clear_all_caches()
    load()
    assert calls["n"] == 2


def test_price_clear_ends_the_grace_but_not_the_timer(clock):
    # A non-price cache that may read today's prices: inside its timer it stays
    # warm after a price scrape (as before); past it, it picks the prices up.
    load, calls = _counter()
    load()
    clear_price_caches()
    clock["t"] += 60
    load()
    assert calls["n"] == 1
    clock["t"] += 300
    load()
    assert calls["n"] == 2


def test_price_cache_rebuilds_on_price_clear_and_is_kept_otherwise(clock):
    load, calls = _counter(prices=True)
    load()
    clock["t"] += 3600
    load()
    assert calls["n"] == 1
    clear_price_caches()
    load()
    assert calls["n"] == 2


def test_reader_data_caches_keep_only_their_timer(clock):
    load, calls = _counter(keep=False)
    load()
    clock["t"] += 301
    load()
    assert calls["n"] == 2


def test_large_per_key_caches_are_not_kept(clock):
    calls = {"n": 0}

    @_ttl_cache(300, max_entries=500)
    def per_code(code):
        calls["n"] += 1
        return code

    per_code("GP")
    clock["t"] += 301
    per_code("GP")
    assert calls["n"] == 2


def test_calls_with_arguments_keep_only_their_timer(clock):
    calls = {"n": 0}

    @_ttl_cache(300)
    def for_codes(codes):
        calls["n"] += 1
        return codes

    for_codes(("GP",))
    clock["t"] += 301
    for_codes(("GP",))
    assert calls["n"] == 2


def test_result_read_during_a_clear_is_not_served(clock):
    # The clear lands while the read is still running: its stamp is older.
    stamp = cache_stamp()
    clear_all_caches()
    assert not entry_current(clock["t"], stamp, 300, True)


def test_scores_snapshot_ignores_price_scrapes(clock):
    stamp = cache_stamp()
    clear_price_caches()
    clock["t"] += 3600
    assert entry_current(T0, stamp, 300, True, reads_prices=False)
    assert not entry_current(T0, stamp, 300, True)


# --- The data mark (2026-11-24): a clear the refresh call never delivered ---

@pytest.fixture
def mark(monkeypatch, clock):
    """The web process's look at the data mark, on, with a fake row."""
    row = {"mark": (0, 0), "reads": 0}

    def read():
        row["reads"] += 1
        return row["mark"]

    monkeypatch.setitem(db_service._mark, "on", True)
    monkeypatch.setitem(db_service._mark, "checked", 0.0)
    monkeypatch.setitem(db_service._mark, "seen", None)
    monkeypatch.setattr(db_service, "_read_mark", read)
    return row


def test_mark_moved_names_the_clear():
    from backend.services.db_service import mark_moved
    assert mark_moved(None, (3, 9)) is None          # first look: adopt it
    assert mark_moved((3, 9), (3, 9)) is None
    assert mark_moved((3, 9), (3, 10)) == "prices"
    assert mark_moved((3, 9), (4, 10)) == "all"
    assert mark_moved((3, 9), None) is None          # read failed


def test_jobs_and_tests_never_read_the_mark(monkeypatch):
    from backend.services.db_service import sync_data_mark
    monkeypatch.setitem(db_service._mark, "on", False)
    monkeypatch.setattr(db_service, "_read_mark", lambda: pytest.fail("read the mark"))
    assert sync_data_mark() is None


def test_a_missed_price_clear_reaches_a_kept_price_cache(clock, mark):
    # 2026-11-24: the 11:12 AM index stayed up all day because no refresh
    # call arrived. With the job's mark it is rebuilt within a minute.
    load, calls = _counter(prices=True)
    load()                                  # first look adopts (0, 0)
    clock["t"] += 2 * 3600
    load()
    assert calls["n"] == 1                  # kept: nothing changed
    mark["mark"] = (0, 1)                   # a price job ran; its call was lost
    clock["t"] += 30
    load()
    assert calls["n"] == 1                  # looked 30 s ago: not yet
    clock["t"] += 31
    load()
    assert calls["n"] == 2                  # the next look clears it
    assert db_service._mark["seen"] == (0, 1)


def test_the_mark_is_read_at_most_once_a_minute(clock, mark):
    from backend.services.db_service import sync_data_mark
    sync_data_mark()
    clock["t"] += 30
    sync_data_mark()
    assert mark["reads"] == 1
    clock["t"] += 31
    sync_data_mark()
    assert mark["reads"] == 2


def test_a_moved_mark_clears_the_right_caches(clock, mark):
    from backend.services.db_service import sync_data_mark
    price_load, price_calls = _counter(prices=True)
    other_load, other_calls = _counter()
    price_load(), other_load()              # first look happened here: (0, 0)

    mark["mark"] = (0, 1)
    clock["t"] += 61
    assert sync_data_mark() == "prices"
    price_load(), other_load()
    assert (price_calls["n"], other_calls["n"]) == (2, 1)

    mark["mark"] = (1, 2)
    clock["t"] += 61
    assert sync_data_mark() == "all"
    price_load(), other_load()
    assert (price_calls["n"], other_calls["n"]) == (3, 2)


def test_a_failed_read_is_tried_again_and_clears_nothing(clock, mark):
    from backend.services.db_service import sync_data_mark
    sync_data_mark()                        # adopt (0, 0)
    mark["mark"] = None
    clock["t"] += 61
    assert sync_data_mark() is None
    assert db_service._mark["seen"] == (0, 0)
    mark["mark"] = (0, 1)
    clock["t"] += 61
    assert sync_data_mark() == "prices"


def test_the_refresh_call_takes_the_mark_as_seen(clock, mark):
    # The job writes the mark, then its call clears: no second clear after.
    from backend.services.db_service import adopt_data_mark, sync_data_mark
    sync_data_mark()
    mark["mark"] = (0, 1)
    clear_price_caches()
    adopt_data_mark()
    clock["t"] += 61
    assert sync_data_mark() is None


def test_every_clear_runs_the_after_clear_hooks(monkeypatch):
    ran = []
    monkeypatch.setattr(db_service, "_AFTER_CLEAR", [lambda: ran.append(1)])
    clear_price_caches()
    clear_all_caches()
    assert ran == [1, 1]


def test_the_stock_reports_are_dropped_by_every_clear():
    from backend.services import stock_report_service
    assert stock_report_service.clear_cache in db_service._AFTER_CLEAR


def test_reader_data_caches_are_opted_out():
    from backend.services import daily_email_service, feedback_service
    for fn in (db_service.load_popular_stocks, db_service.load_stock_visit_counts,
               feedback_service.public_trust_stats, daily_email_service.build_daily_content):
        assert fn.keep_unchanged is False, fn.__wrapped__.__name__
    # The big site-wide ones are kept.
    from backend.services import results_explainer, top20_service
    for fn in (db_service.load_52w_ranges, db_service.load_companies,
               results_explainer.all_results, top20_service._market_window_raw):
        assert fn.keep_unchanged is True, fn.__wrapped__.__name__
