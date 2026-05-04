from pymongo import ASCENDING
from db.connection import get_db


def ensure_indexes():
    db = get_db()

    db.companies.create_index(
        [("trading_code", ASCENDING)],
        unique=True,
    )

    db.stock_prices.create_index(
        [("trading_code", ASCENDING), ("date", ASCENDING)],
        unique=True,
    )

    # Supports sort=[("date", -1)] used by load_market_movers,
    # load_dse_today_table, compute_market_intelligence — without it,
    # Atlas free-tier hits the 32MB in-memory sort cap once stock_prices grows.
    db.stock_prices.create_index([("date", ASCENDING)])

    db.financials.create_index(
        [("trading_code", ASCENDING), ("year", ASCENDING)],
        unique=True,
    )

    db.shareholdings.create_index(
        [("trading_code", ASCENDING), ("as_of_date", ASCENDING)],
        unique=True,
    )

    db.company_news.create_index(
        [("trading_code", ASCENDING), ("post_date", ASCENDING), ("title", ASCENDING)],
        unique=True,
    )

    db.company_news.create_index(
        [("trading_code", ASCENDING), ("post_date", ASCENDING)],
    )

    db.dividend_declarations.create_index(
        [("trading_code", ASCENDING)],
        unique=True,
    )

    db.company_financials_ext.create_index(
        [("trading_code", ASCENDING), ("year", ASCENDING)],
        unique=True,
    )

    db.dse_market_summary.create_index(
        [("date", ASCENDING)],
        unique=True,
    )
