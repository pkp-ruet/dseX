import streamlit as st
import pandas as pd
from pymongo import MongoClient
from config import MONGODB_URI, MONGODB_DB_NAME

st.set_page_config(
    page_title="dseX — Smart Stock Insights",
    page_icon="📊",
    layout="wide",
)

# ---------------------------------------------------------------------------
# Theme
# ---------------------------------------------------------------------------

from styles import THEME_CSS
st.markdown(THEME_CSS, unsafe_allow_html=True)

# ---------------------------------------------------------------------------
# Database helpers (cached)
# ---------------------------------------------------------------------------

@st.cache_resource
def get_mongo_db():
    client = MongoClient(MONGODB_URI)
    return client[MONGODB_DB_NAME]


@st.cache_data(ttl=300)
def load_companies():
    db = get_mongo_db()
    return list(db.companies.find({"excluded": {"$ne": True}}, {"_id": 0}))


@st.cache_data(ttl=300)
def load_latest_prices():
    db = get_mongo_db()
    pipeline = [
        {"$sort": {"date": -1}},
        {"$group": {
            "_id": "$trading_code",
            "date": {"$first": "$date"},
            "ltp": {"$first": "$ltp"},
            "close_price": {"$first": "$close_price"},
            "change": {"$first": "$change"},
            "change_pct": {"$first": "$change_pct"},
            "high": {"$first": "$high"},
            "low": {"$first": "$low"},
            "volume": {"$first": "$volume"},
            "value_mn": {"$first": "$value_mn"},
            "trade_count": {"$first": "$trade_count"},
            "ycp": {"$first": "$ycp"},
        }},
    ]
    return {doc["_id"]: doc for doc in db.stock_prices.aggregate(pipeline)}


@st.cache_data(ttl=300)
def load_price_history(trading_code):
    db = get_mongo_db()
    docs = list(
        db.stock_prices.find(
            {"trading_code": trading_code}, {"_id": 0}
        ).sort("date", 1)
    )
    return pd.DataFrame(docs) if docs else pd.DataFrame()


@st.cache_data(ttl=300)
def load_financials(trading_code):
    db = get_mongo_db()
    docs = list(
        db.financials.find(
            {"trading_code": trading_code}, {"_id": 0}
        ).sort("year", 1)
    )
    return pd.DataFrame(docs) if docs else pd.DataFrame()


@st.cache_data(ttl=300)
def load_shareholdings(trading_code):
    db = get_mongo_db()
    docs = list(
        db.shareholdings.find(
            {"trading_code": trading_code}, {"_id": 0}
        ).sort("as_of_date", -1)
    )
    return docs


@st.cache_data(ttl=300)
def load_company_news(trading_code, limit=40):
    db = get_mongo_db()
    docs = list(
        db.company_news.find(
            {"trading_code": trading_code},
            {"_id": 0, "title": 1, "body": 1, "post_date": 1},
        ).sort("post_date", -1).limit(limit)
    )
    return docs


@st.cache_data(ttl=300)
def load_dividend_declarations():
    db = get_mongo_db()
    return list(db.dividend_declarations.find({}, {"_id": 0}))


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

def main():
    code = st.query_params.get("code")
    if code:
        from pages.detail import render_detail_page
        render_detail_page(code)
    else:
        from pages.home import render_homepage
        render_homepage()


main()
