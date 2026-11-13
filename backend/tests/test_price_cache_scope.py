"""The market-hours refresh drops only the caches that hold today's prices."""
from backend.services import db_service
from backend.services.db_service import _ttl_cache, clear_all_caches, clear_price_caches


def _counter_cache(prices: bool):
    calls = {"n": 0}

    @_ttl_cache(300, prices=prices)
    def load():
        calls["n"] += 1
        return calls["n"]

    return load, calls


def test_price_clear_keeps_other_caches_warm():
    price_load, price_calls = _counter_cache(prices=True)
    other_load, other_calls = _counter_cache(prices=False)
    price_load(), other_load()

    clear_price_caches()
    price_load(), other_load()
    assert price_calls["n"] == 2  # rebuilt
    assert other_calls["n"] == 1  # still cached

    clear_all_caches()
    price_load(), other_load()
    assert price_calls["n"] == 3
    assert other_calls["n"] == 2


def test_the_price_loaders_are_marked():
    marked = set(map(id, db_service._PRICE_CACHES))
    for fn in (db_service.load_latest_prices, db_service.load_market_movers,
               db_service.load_market_index, db_service.load_dse_today_table,
               db_service.load_price_history, db_service.compute_market_intelligence):
        assert id(fn.cache_clear) in marked, fn.__name__
    for fn in (db_service.load_financials, db_service.load_company_news):
        assert id(fn.cache_clear) not in marked, fn.__name__
