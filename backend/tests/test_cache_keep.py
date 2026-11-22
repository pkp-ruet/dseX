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
