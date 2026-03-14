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
