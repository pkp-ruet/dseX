import numpy as np
import streamlit as st
import pandas as pd
import plotly.express as px
from datetime import datetime
from pymongo import MongoClient
from config import MONGODB_URI, MONGODB_DB_NAME

st.set_page_config(
    page_title="dseX // DSE Terminal",
    page_icon="$",
    layout="wide",
)

# ---------------------------------------------------------------------------
# Retro terminal theme
# ---------------------------------------------------------------------------

_RETRO_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');

:root {
    --amber: #ffb000;
    --amber-dim: #cc8d00;
    --green: #33ff33;
    --green-dim: #20c020;
    --bg-dark: #0a0a0a;
    --bg-card: #111111;
    --bg-input: #1a1a1a;
    --border: #2a2a2a;
    --text-muted: #666666;
}

html, body, [class*="css"] {
    font-family: 'IBM Plex Mono', 'Courier New', monospace !important;
    color: var(--amber) !important;
}

.stApp {
    background-color: var(--bg-dark) !important;
}

/* Headers */
h1, h2, h3, h4, h5, h6,
.stMarkdown h1, .stMarkdown h2, .stMarkdown h3 {
    font-family: 'IBM Plex Mono', monospace !important;
    color: var(--green) !important;
    text-shadow: 0 0 8px rgba(51, 255, 51, 0.3);
    letter-spacing: 1px;
}

/* Subheaders */
.stSubheader, [data-testid="stSubheader"] {
    color: var(--green-dim) !important;
}

/* Metrics */
[data-testid="stMetric"] {
    background: var(--bg-card) !important;
    border: 1px solid var(--border) !important;
    border-radius: 0 !important;
    padding: 12px 16px !important;
}
[data-testid="stMetricLabel"] {
    color: var(--text-muted) !important;
    text-transform: uppercase;
    font-size: 0.7rem !important;
    letter-spacing: 1.5px;
}
[data-testid="stMetricValue"] {
    color: var(--amber) !important;
    font-weight: 600 !important;
}
[data-testid="stMetricDelta"] svg { display: none; }
[data-testid="stMetricDelta"] > div {
    color: var(--green) !important;
}

/* Text input */
.stTextInput > div > div > input {
    background-color: var(--bg-input) !important;
    color: var(--amber) !important;
    border: 1px solid var(--border) !important;
    border-radius: 0 !important;
    font-family: 'IBM Plex Mono', monospace !important;
    caret-color: var(--amber);
}
.stTextInput > div > div > input::placeholder {
    color: var(--text-muted) !important;
}
.stTextInput > label {
    color: var(--green-dim) !important;
    font-family: 'IBM Plex Mono', monospace !important;
}

/* Dataframe / table */
[data-testid="stDataFrame"] {
    border: 1px solid var(--border) !important;
    border-radius: 0 !important;
}
[data-testid="stDataFrame"] * {
    font-family: 'IBM Plex Mono', monospace !important;
}

/* Buttons */
.stButton > button {
    background-color: var(--bg-card) !important;
    color: var(--green) !important;
    border: 1px solid var(--green-dim) !important;
    border-radius: 0 !important;
    font-family: 'IBM Plex Mono', monospace !important;
    text-transform: uppercase;
    letter-spacing: 1px;
    transition: all 0.15s;
}
.stButton > button:hover {
    background-color: var(--green-dim) !important;
    color: var(--bg-dark) !important;
    box-shadow: 0 0 10px rgba(51, 255, 51, 0.3);
}

/* Dividers */
[data-testid="stHorizontalRule"], hr {
    border-color: var(--border) !important;
}

/* Captions */
.stCaption, [data-testid="stCaptionContainer"] {
    color: var(--text-muted) !important;
}

/* Selectbox */
.stSelectbox label, .stSelectbox > div > div {
    color: var(--amber) !important;
    font-family: 'IBM Plex Mono', monospace !important;
}

/* Code blocks */
code {
    color: var(--green) !important;
    background-color: var(--bg-input) !important;
}

/* Info/warning boxes */
[data-testid="stNotification"] {
    background-color: var(--bg-card) !important;
    border: 1px solid var(--border) !important;
    border-radius: 0 !important;
    color: var(--amber) !important;
}

/* Expander */
[data-testid="stExpander"] {
    background: var(--bg-card) !important;
    border: 1px solid var(--border) !important;
    border-radius: 0 !important;
}
[data-testid="stExpander"] summary {
    color: var(--amber-dim) !important;
    font-family: 'IBM Plex Mono', monospace !important;
    font-size: 0.8rem !important;
}

/* --- Hero header --- */
.hero-header {
    margin-bottom: 20px;
    padding: 16px 0 12px;
    border-bottom: 1px solid var(--border);
    text-align: center;
}
.hero-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--green-dim);
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 6px;
}
.hero-slogan {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--green);
    text-shadow: 0 0 18px rgba(51,255,51,0.35), 0 0 40px rgba(51,255,51,0.12);
    letter-spacing: 2px;
    text-transform: uppercase;
    line-height: 1.5;
}
@media (max-width: 600px) {
    .hero-slogan { font-size: 0.85rem; letter-spacing: 1px; }
}

/* --- Market Intelligence Bar --- */
.market-bar {
    display: flex;
    gap: 1px;
    background: var(--border);
    border: 1px solid var(--border);
    margin-bottom: 20px;
}
.market-stat {
    flex: 1;
    background: var(--bg-card);
    padding: 10px 14px;
    text-align: center;
}
.market-stat .ms-label {
    font-size: 0.6rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 4px;
}
.market-stat .ms-value {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--green);
    line-height: 1.2;
}
.market-stat .ms-sub {
    font-size: 0.62rem;
    color: var(--amber-dim);
    margin-top: 3px;
}
@media (max-width: 700px) {
    .market-bar { flex-wrap: wrap; }
    .market-stat { flex: 1 1 45%; }
}

/* --- Explainer box --- */
.explainer {
    border: 1px solid var(--border);
    background: var(--bg-card);
    padding: 14px 18px;
    margin-bottom: 20px;
    font-size: 0.78rem;
    color: var(--amber-dim);
    line-height: 1.7;
}
.explainer strong { color: var(--green); }

/* --- Top 10 grid (2-col) --- */
.top10-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 8px;
}
@media (max-width: 900px) {
    .top10-grid { grid-template-columns: 1fr; }
}
.top-card {
    display: block;
    text-decoration: none !important;
    background: var(--bg-card);
    border: 1px solid var(--border);
    padding: 14px 16px 12px;
    transition: border-color 0.15s, box-shadow 0.15s;
    overflow: hidden;
}
.top-card:hover {
    border-color: var(--green-dim);
    box-shadow: 0 0 14px rgba(51, 255, 51, 0.12);
}
.top-card .card-head {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 8px;
    flex-wrap: wrap;
}
.top-card .card-rank {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--green);
    line-height: 1;
    text-shadow: 0 0 10px rgba(51, 255, 51, 0.3);
}
.top-card .card-code {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--green-dim);
    letter-spacing: 1px;
}
.top-card .card-name {
    font-size: 0.72rem;
    color: var(--amber);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.top-card .card-score-badge {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--green);
    margin-left: auto;
}
.top-card .score-bar-wrap {
    height: 3px;
    background: var(--border);
    margin-bottom: 8px;
    width: 100%;
}
.top-card .score-bar-fill {
    height: 3px;
    background: linear-gradient(90deg, var(--green-dim), var(--green));
}
.top-card .card-meta {
    display: flex;
    gap: 14px;
    font-size: 0.68rem;
    color: var(--amber-dim);
    margin-bottom: 6px;
    flex-wrap: wrap;
}
.top-card .card-meta span { white-space: nowrap; }
.top-card .card-meta .highlight { color: var(--amber); }
.top-card .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 7px;
}
.tag {
    display: inline-block;
    font-size: 0.58rem;
    padding: 2px 6px;
    border: 1px solid var(--green-dim);
    color: var(--green);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
.top-card .card-verdict {
    font-size: 0.68rem;
    color: var(--amber-dim);
    border-top: 1px solid var(--border);
    padding-top: 6px;
    line-height: 1.4;
}

/* --- Section tier labels --- */
.tier-label {
    color: var(--text-muted);
    font-size: 0.72rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    text-align: center;
    margin: 24px 0 12px;
    position: relative;
}
.tier-label::before, .tier-label::after {
    content: '';
    position: absolute;
    top: 50%;
    width: 30%;
    height: 1px;
    background: var(--border);
}
.tier-label::before { left: 0; }
.tier-label::after { right: 0; }
.tier-label.top10 {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--green);
    letter-spacing: 3px;
    text-shadow: 0 0 10px rgba(51,255,51,0.3);
}
.tier-label.mid20 {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--amber);
    letter-spacing: 3px;
}
.tier-label.danger {
    font-size: 0.85rem;
    font-weight: 700;
    color: #ff4444;
    letter-spacing: 3px;
    text-shadow: 0 0 10px rgba(255,68,68,0.3);
}

/* --- Mid-tier grid (3-col) --- */
.mid-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-bottom: 16px;
}
@media (max-width: 900px) { .mid-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 500px) { .mid-grid { grid-template-columns: 1fr; } }
.mid-card {
    display: block;
    text-decoration: none !important;
    background: var(--bg-card);
    border: 1px solid var(--border);
    padding: 10px 13px 9px;
    transition: border-color 0.15s;
    overflow: hidden;
}
.mid-card:hover { border-color: var(--green-dim); }
.mid-card .mc-head {
    display: flex;
    align-items: baseline;
    gap: 7px;
    margin-bottom: 3px;
}
.mid-card .mc-rank { font-size: 0.85rem; font-weight: 700; color: var(--green); }
.mid-card .mc-code { font-size: 0.75rem; font-weight: 600; color: var(--green-dim); letter-spacing: 1px; }
.mid-card .mc-score { margin-left: auto; font-size: 0.82rem; font-weight: 700; color: var(--green); }
.mid-card .mc-name {
    font-size: 0.67rem;
    color: var(--amber);
    margin-bottom: 3px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mid-card .mc-sector {
    font-size: 0.58rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 5px;
}
.mid-card .mc-tags { display: flex; flex-wrap: wrap; gap: 3px; }

/* --- Danger zone grid (5-col) --- */
.danger-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
    margin-bottom: 20px;
}
@media (max-width: 900px) { .danger-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 500px) { .danger-grid { grid-template-columns: repeat(2, 1fr); } }
.danger-card {
    display: block;
    text-decoration: none !important;
    background: #0e0808;
    border: 1px solid #2a1010;
    padding: 10px 12px 8px;
    transition: border-color 0.15s;
    overflow: hidden;
}
.danger-card:hover { border-color: #cc2222; }
.danger-card .dc-rank { font-size: 0.65rem; color: #663333; }
.danger-card .dc-code { font-size: 0.8rem; font-weight: 700; color: #cc2222; letter-spacing: 1px; margin: 2px 0; }
.danger-card .dc-name {
    font-size: 0.63rem;
    color: #664444;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-bottom: 4px;
}
.danger-card .dc-score { font-size: 0.75rem; font-weight: 700; color: #ff4444; }
.danger-card .dc-weak {
    font-size: 0.58rem;
    color: #442222;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 3px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* --- Sector leaderboard --- */
.sector-board {
    border: 1px solid var(--border);
    margin-bottom: 8px;
}
.sector-row {
    display: grid;
    grid-template-columns: 26px 220px 1fr 52px;
    align-items: center;
    gap: 10px;
    padding: 7px 16px;
    border-bottom: 1px solid #161616;
    font-size: 0.75rem;
}
.sector-row:last-child { border-bottom: none; }
.sector-row .sr-rank { color: var(--text-muted); }
.sector-row .sr-name { color: var(--amber); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sector-row .sr-bar-wrap { height: 4px; background: #1a1a1a; }
.sector-row .sr-bar-fill { height: 4px; background: var(--green-dim); }
.sector-row .sr-score { color: var(--green); font-weight: 700; text-align: right; }

/* --- Rest list (multi-column) --- */
.rest-list {
    column-count: 3;
    column-gap: 0;
    max-height: 60vh;
    overflow-y: auto;
    border: 1px solid var(--border);
}
@media (max-width: 900px) { .rest-list { column-count: 2; } }
@media (max-width: 500px) { .rest-list { column-count: 1; } }
.rest-list a {
    display: grid;
    grid-template-columns: 32px 58px 1fr 40px;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    color: var(--amber) !important;
    text-decoration: none !important;
    font-size: 0.72rem;
    break-inside: avoid;
    transition: background 0.1s;
    border-bottom: 1px solid #161616;
}
.rest-list a:hover { background: var(--bg-card); }
.rest-list a:hover .rn { color: var(--green) !important; }
.rest-list a .rk {
    color: var(--text-muted);
    font-size: 0.62rem;
    text-align: right;
}
.rest-list a .rc {
    color: var(--green-dim);
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.5px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.rest-list a .rn {
    color: var(--amber);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.rest-list a .rs {
    color: var(--green);
    font-weight: 700;
    font-size: 0.72rem;
    text-align: right;
}
.rest-list::-webkit-scrollbar { width: 6px; }
.rest-list::-webkit-scrollbar-track { background: var(--bg-dark); }
.rest-list::-webkit-scrollbar-thumb { background: var(--border); }

/* ===== Detail page ===== */

/* Score panel */
.score-panel {
    border: 1px solid var(--green-dim);
    background: #0a0f0a;
    padding: 18px 22px 16px;
    margin-bottom: 16px;
}
.score-panel-head {
    display: flex;
    align-items: baseline;
    gap: 14px;
    margin-bottom: 14px;
    flex-wrap: wrap;
}
.score-big {
    font-size: 3rem;
    font-weight: 700;
    line-height: 1;
    text-shadow: 0 0 20px rgba(51,255,51,0.35);
}
.score-rank-text { font-size: 0.76rem; color: var(--text-muted); }
.factor-row {
    display: grid;
    grid-template-columns: 130px 80px 1fr 38px;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    font-size: 0.73rem;
    border-bottom: 1px solid #141414;
}
.factor-row:last-of-type { border-bottom: none; }
.factor-row .fr-name { color: var(--amber-dim); }
.factor-row .fr-val  { color: var(--amber); text-align: right; font-size: 0.7rem; }
.factor-row .fr-bar-wrap { height: 4px; background: #1a1a1a; }
.factor-row .fr-bar-fill { height: 4px; }
.factor-row .fr-pct  { color: var(--green); font-size: 0.68rem; text-align: right; }
.score-verdict-text {
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid #1a2a1a;
    font-size: 0.78rem;
    color: var(--amber-dim);
    line-height: 1.5;
}

/* Price panel */
.price-panel {
    border: 1px solid var(--border);
    background: var(--bg-card);
    padding: 16px 20px 14px;
    margin-bottom: 16px;
}
.price-ltp-row {
    display: flex;
    align-items: baseline;
    gap: 14px;
    margin-bottom: 12px;
    flex-wrap: wrap;
}
.price-ltp { font-size: 2.2rem; font-weight: 700; color: var(--amber); line-height: 1; }
.price-change-pos { font-size: 0.9rem; font-weight: 600; color: var(--green); }
.price-change-neg { font-size: 0.9rem; font-weight: 600; color: #ff4444; }
.price-change-neu { font-size: 0.9rem; color: var(--text-muted); }
.price-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1px;
    background: var(--border);
}
@media (max-width: 700px) { .price-grid { grid-template-columns: repeat(2, 1fr); } }
.price-cell { background: #0d0d0d; padding: 8px 12px; }
.price-cell .pc-label {
    font-size: 0.57rem; color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 3px;
}
.price-cell .pc-val { font-size: 0.85rem; font-weight: 600; color: var(--amber); }

/* Key ratios */
.ratio-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 1px;
    background: var(--border);
    border: 1px solid var(--border);
    margin-bottom: 18px;
}
@media (max-width: 900px) { .ratio-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 500px) { .ratio-grid { grid-template-columns: repeat(2, 1fr); } }
.ratio-cell { background: var(--bg-card); padding: 10px 12px; text-align: center; }
.ratio-cell .rc-label {
    font-size: 0.57rem; color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 4px;
}
.ratio-cell .rc-val { font-size: 0.9rem; font-weight: 700; color: var(--green); }
.ratio-cell .rc-sub { font-size: 0.58rem; color: var(--amber-dim); margin-top: 2px; }

/* Section label */
.section-label {
    font-size: 0.68rem; letter-spacing: 2px; text-transform: uppercase;
    color: var(--text-muted); border-bottom: 1px solid var(--border);
    padding-bottom: 6px; margin: 22px 0 12px;
}
.section-label span { color: var(--green-dim); margin-right: 6px; }

/* Scanline overlay for CRT feel */
.stApp::after {
    content: '';
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    pointer-events: none;
    z-index: 9999;
    background: repeating-linear-gradient(
        0deg,
        rgba(0,0,0,0.03) 0px,
        rgba(0,0,0,0.03) 1px,
        transparent 1px,
        transparent 3px
    );
}
</style>
"""

st.markdown(_RETRO_CSS, unsafe_allow_html=True)

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


# ---------------------------------------------------------------------------
# Composite scoring
# ---------------------------------------------------------------------------


# Sectors where debt is a core business product — skip Debt/Equity factor
_FINANCIAL_SECTORS = {"bank", "insurance", "financial institution", "nbfi",
                      "non-bank financial institution", "leasing"}

def _is_financial_sector(sector: str) -> bool:
    return any(k in sector.lower() for k in _FINANCIAL_SECTORS) if sector else False


@st.cache_data(ttl=300)
def _build_scores_df():
    """
    dseX Score (0-100) — 8 factors, 4 groups, multi-year averages.

    Group 1 — Valuation (35%):
      20%  Earnings Yield    — 3yr avg EPS / current LTP
      15%  Price-to-NAV inv  — latest NAV/share ÷ LTP (higher = trading below book)

    Group 2 — Profitability Quality (25%):
      15%  ROE               — 3yr avg (EPS / NAV per share per year)
      10%  EPS Stability     — inverse of coefficient of variation across all years

    Group 3 — Dividend Quality (25%):
      15%  Dividend Yield    — 3yr avg cash dividend / face value / LTP
      10%  Dividend Streak   — consecutive years with cash dividend > 0

    Group 4 — Balance Sheet Safety (15%):
      10%  Reserve / MCap    — reserve_surplus_mn / market_cap_mn
       5%  Debt Safety       — (reserve + paid_up) / total_loan; skipped for financial sector

    Post-score multiplier by market category: A=1.00 B=0.92 N=0.88 Z=0.30
    Missing factors are excluded and weights re-normalised per company.
    """
    db = get_mongo_db()

    excluded_codes = {
        d["trading_code"]
        for d in db.companies.find({"excluded": True}, {"trading_code": 1, "_id": 0})
    }
    fin_docs = list(db.financials.find({"trading_code": {"$nin": list(excluded_codes)}}, {"_id": 0}))
    if not fin_docs:
        return pd.DataFrame()

    fin_df = pd.DataFrame(fin_docs).sort_values(["trading_code", "year"])
    fin_df["eps"] = (
        fin_df["eps_cont_basic"].combine_first(fin_df.get("eps_basic"))
        if "eps_cont_basic" in fin_df.columns
        else fin_df.get("eps_basic", pd.Series(dtype=float))
    )

    # ---- Per-company multi-year metric extraction ----
    per_company: dict[str, dict] = {}
    for code, grp in fin_df.groupby("trading_code"):
        grp = grp.sort_values("year")

        eps_s = grp["eps"].dropna()
        nav_s = grp["nav_per_share"].dropna() if "nav_per_share" in grp.columns else pd.Series(dtype=float)
        div_s = grp["cash_dividend_pct"].dropna() if "cash_dividend_pct" in grp.columns else pd.Series(dtype=float)

        # 3yr average EPS (positive-only; loss years excluded so yield stays meaningful)
        eps_pos = eps_s[eps_s > 0]
        eps_3yr = float(eps_pos.tail(3).mean()) if not eps_pos.empty else None

        # Latest NAV per share
        nav_latest = float(nav_s.iloc[-1]) if not nav_s.empty else None

        # 3yr average ROE = avg(EPS/NAV) computed year-by-year
        roe_3yr = None
        if "nav_per_share" in grp.columns:
            roe_df = grp[["eps", "nav_per_share"]].dropna()
            roe_df = roe_df[roe_df["nav_per_share"] > 0]
            if not roe_df.empty:
                roe_vals = (roe_df["eps"] / roe_df["nav_per_share"]).tail(3)
                roe_3yr = float(roe_vals.mean())

        # EPS Stability: 1/(1+CV) across all years; needs >= 3 years
        eps_stab = None
        if len(eps_s) >= 3:
            mean_abs = abs(float(eps_s.mean()))
            if mean_abs > 0:
                cv = float(eps_s.std()) / mean_abs
                eps_stab = 1.0 / (1.0 + cv)  # 0–1; higher = more stable

        # 3yr average dividend % (includes zero years in average)
        div_3yr = float(grp["cash_dividend_pct"].fillna(0).tail(3).mean()) if "cash_dividend_pct" in grp.columns else None
        if div_3yr == 0:
            div_3yr = None

        # Dividend streak: consecutive years with cash div > 0, counting back
        streak = 0
        for val in grp["cash_dividend_pct"].fillna(0).values[::-1]:
            if val > 0:
                streak += 1
            else:
                break
        div_streak = streak if streak > 0 else None

        per_company[code] = {
            "eps_3yr":    eps_3yr,
            "nav_latest": nav_latest,
            "roe_3yr":    roe_3yr,
            "eps_stab":   eps_stab,
            "div_3yr":    div_3yr,
            "div_streak": div_streak,
        }

    # ---- Company metadata ----
    companies = {
        d["trading_code"]: d
        for d in db.companies.find({"excluded": {"$ne": True}}, {
            "trading_code": 1, "reserve_surplus_mn": 1, "paid_up_capital_mn": 1,
            "total_shares": 1, "total_loan_mn": 1, "face_value": 1,
            "market_category": 1, "sector": 1, "_id": 0,
        })
    }

    prices = load_latest_prices()

    all_codes = set(per_company.keys()) | set(companies.keys())
    rows = []
    for code in all_codes:
        comp  = companies.get(code, {})
        fm    = per_company.get(code, {})
        ltp   = (prices.get(code) or {}).get("ltp")
        reserve  = comp.get("reserve_surplus_mn")
        paid_up  = comp.get("paid_up_capital_mn")
        shares   = comp.get("total_shares")
        loan     = comp.get("total_loan_mn")
        face     = comp.get("face_value")
        sector   = comp.get("sector", "") or ""
        cat      = (comp.get("market_category") or "").strip().upper()

        eps_3yr    = fm.get("eps_3yr")
        nav_latest = fm.get("nav_latest")
        roe_3yr    = fm.get("roe_3yr")
        eps_stab   = fm.get("eps_stab")
        div_3yr    = fm.get("div_3yr")
        div_streak = fm.get("div_streak")

        mcap_mn = (ltp * shares / 1e6) if ltp and shares and shares > 0 else None

        # Factor 1 — Earnings Yield (3yr avg EPS / LTP)
        earn_yield = None
        if eps_3yr and ltp and ltp > 0:
            earn_yield = eps_3yr / ltp * 100

        # Factor 2 — Price-to-NAV inverse (NAV / LTP)
        nav_to_price = None
        if nav_latest and nav_latest > 0 and ltp and ltp > 0:
            nav_to_price = nav_latest / ltp

        # Factor 3 — ROE (already computed per year above)
        # positive ROE only; negative means loss-making
        roe_val = roe_3yr if roe_3yr and roe_3yr > 0 else None

        # Factor 4 — EPS Stability (already computed)

        # Factor 5 — Dividend Yield (3yr avg div)
        div_yield = None
        if div_3yr and face and ltp and ltp > 0:
            div_yield = (face * div_3yr / 100) / ltp * 100

        # Factor 6 — Dividend Streak (already computed)

        # Factor 7 — Reserve / MCap
        res_mcap = None
        if reserve is not None and mcap_mn and mcap_mn > 0:
            res_mcap = reserve / mcap_mn

        # Factor 8 — Debt Safety: (equity / loan) — skip for financial sector
        debt_safety = None
        if not _is_financial_sector(sector):
            equity = (reserve or 0) + (paid_up or 0)
            if loan and loan > 0 and equity > 0:
                debt_safety = equity / loan  # higher = safer
            elif equity > 0 and (loan is None or loan == 0):
                debt_safety = equity  # no debt = very safe; will rank high

        rows.append({
            "trading_code": code,
            "sector":       sector,
            "market_cat":   cat,
            "ltp":          ltp,
            "mcap_mn":      mcap_mn,
            "eps_3yr":      eps_3yr,
            "nav_latest":   nav_latest,
            "roe_3yr":      roe_val,
            "eps_stab":     eps_stab,
            "earn_yield":   earn_yield,
            "nav_to_price": nav_to_price,
            "div_yield":    div_yield,
            "div_streak":   div_streak,
            "res_mcap":     res_mcap,
            "debt_safety":  debt_safety,
        })

    mdf = pd.DataFrame(rows)
    if mdf.empty:
        return mdf

    # Percentile ranks — all higher = better; NaN stays NaN
    mdf["ey_rank"]     = mdf["earn_yield"].rank(pct=True)
    mdf["np_rank"]     = mdf["nav_to_price"].rank(pct=True)
    mdf["roe_rank"]    = mdf["roe_3yr"].rank(pct=True)
    mdf["stab_rank"]   = mdf["eps_stab"].rank(pct=True)
    mdf["dy_rank"]     = mdf["div_yield"].rank(pct=True)
    mdf["streak_rank"] = mdf["div_streak"].rank(pct=True)
    mdf["rm_rank"]     = mdf["res_mcap"].rank(pct=True)
    mdf["de_rank"]     = mdf["debt_safety"].rank(pct=True)

    # Weights
    _W = {
        "ey_rank":     0.20,
        "np_rank":     0.15,
        "roe_rank":    0.15,
        "stab_rank":   0.10,
        "dy_rank":     0.15,
        "streak_rank": 0.10,
        "rm_rank":     0.10,
        "de_rank":     0.05,
    }
    rank_cols = list(_W.keys())
    w_series  = pd.Series(_W)
    rank_mat  = mdf[rank_cols]

    # Re-normalise weights per row — missing factors are excluded, not penalised
    w_avail     = rank_mat.notna().astype(float).multiply(w_series)
    w_sum       = w_avail.sum(axis=1)
    weighted    = rank_mat.fillna(0).multiply(w_series).sum(axis=1)
    raw_score   = np.where(w_sum > 0, weighted / w_sum * 100, np.nan)

    # Market category multiplier
    _CAT = {"A": 1.00, "B": 0.92, "N": 0.88, "Z": 0.30}
    cat_mult = mdf["market_cat"].map(lambda c: _CAT.get(c, 0.88))
    mdf["score"] = np.round(raw_score * cat_mult, 1)

    # Companies with no factor data at all → NaN
    mdf.loc[~rank_mat.notna().any(axis=1), "score"] = np.nan

    return mdf


@st.cache_data(ttl=300)
def compute_composite_scores():
    mdf = _build_scores_df()
    if mdf.empty:
        return {}
    return dict(zip(mdf["trading_code"], mdf["score"]))


def _retro_fig(fig):
    """Apply retro terminal styling to any Plotly figure."""
    fig.update_layout(
        paper_bgcolor="#0a0a0a",
        plot_bgcolor="#111111",
        font=dict(family="IBM Plex Mono, Courier New, monospace", color="#ffb000"),
        colorway=["#33ff33", "#ffb000", "#20c020", "#cc8d00", "#886600"],
        legend=dict(font=dict(color="#ffb000")),
    )
    fig.update_xaxes(gridcolor="#2a2a2a", zerolinecolor="#333", tickfont=dict(color="#cc8d00"))
    fig.update_yaxes(gridcolor="#2a2a2a", zerolinecolor="#333", tickfont=dict(color="#cc8d00"))
    fig.update_traces(
        textfont=dict(color="#ffb000"),
        marker=dict(line=dict(width=0)),
        selector=dict(type="bar"),
    )
    return fig


# ---------------------------------------------------------------------------
# Homepage helpers
# ---------------------------------------------------------------------------

_FACTOR_LABELS = {
    "ey_rank":     "earnings yield",
    "np_rank":     "price-to-book",
    "roe_rank":    "ROE",
    "stab_rank":   "EPS stability",
    "dy_rank":     "div. yield",
    "streak_rank": "div. streak",
    "rm_rank":     "reserve/mkt cap",
    "de_rank":     "low debt",
}


def _top_strengths(row_dict: dict, n: int = 2) -> list[str]:
    """Return labels of the top-n highest-ranked factors."""
    ranked = []
    for key, label in _FACTOR_LABELS.items():
        v = row_dict.get(key)
        if v is not None and not (isinstance(v, float) and pd.isna(v)):
            ranked.append((v, label))
    ranked.sort(reverse=True)
    return [label for _, label in ranked[:n]]


def _worst_factor(row_dict: dict) -> str | None:
    """Return the label of the single worst-ranked factor."""
    ranked = []
    for key, label in _FACTOR_LABELS.items():
        v = row_dict.get(key)
        if v is not None and not (isinstance(v, float) and pd.isna(v)):
            ranked.append((v, label))
    if not ranked:
        return None
    ranked.sort()
    return ranked[0][1]


def _generate_verdict(row_dict: dict) -> str:
    """Return a 1-sentence plain-language summary of strengths and weaknesses."""
    strengths = _top_strengths(row_dict, n=2)
    ranked = []
    for key, label in _FACTOR_LABELS.items():
        v = row_dict.get(key)
        if v is not None and not (isinstance(v, float) and pd.isna(v)):
            ranked.append((v, label))
    ranked.sort()
    weak = [label for _, label in ranked[:1] if ranked and ranked[0][0] < 0.30]
    parts = []
    if strengths:
        parts.append("Strong " + " & ".join(strengths))
    if weak:
        parts.append("weak " + weak[0])
    if not parts:
        return "Moderate across all factors."
    sentence = ", but ".join(parts) + "."
    return sentence[0].upper() + sentence[1:]


def _get_company_score_row(trading_code: str) -> dict | None:
    """Return the full score row dict for one company including overall rank."""
    mdf = _build_scores_df()
    if mdf.empty:
        return None
    row = mdf[mdf["trading_code"] == trading_code]
    if row.empty:
        return None
    scored = mdf[mdf["score"].notna()].sort_values("score", ascending=False).reset_index(drop=True)
    rank_pos = scored[scored["trading_code"] == trading_code].index
    d = row.iloc[0].to_dict()
    d["overall_rank"] = int(rank_pos[0]) + 1 if len(rank_pos) else None
    d["total_scored"] = len(scored)
    return d


# ---------------------------------------------------------------------------
# Homepage
# ---------------------------------------------------------------------------


def render_homepage():
    st.markdown(
        '<div class="hero-header">'
        '  <div class="hero-title">dseX &mdash; Dhaka Stock Exchange Analysis Terminal</div>'
        '  <div class="hero-slogan">Algorithmic Fundamental Analysis &middot; Powered by Data &middot; Driven by Logic</div>'
        '</div>',
        unsafe_allow_html=True,
    )

    companies_raw = load_companies()
    prices_map = load_latest_prices()
    score_df = _build_scores_df()

    # Build company metadata map
    comp_map: dict[str, dict] = {}
    for c in companies_raw:
        code = c["trading_code"]
        comp_map[code] = {
            "name": c.get("company_name", "") or code,
            "sector": c.get("sector", "") or "",
        }

    if score_df.empty:
        st.warning("No scored companies found. Run the scrapers first.")
        return

    # Merge company info into score df
    score_df["name"] = score_df["trading_code"].map(lambda c: comp_map.get(c, {}).get("name", c))
    score_df["sector"] = score_df["trading_code"].map(lambda c: comp_map.get(c, {}).get("sector", ""))

    scored = score_df[score_df["score"].notna()].sort_values("score", ascending=False).reset_index(drop=True)
    total = len(scored)

    # --- Market Intelligence Bar ---
    strong_n = int((scored["score"] >= 70).sum())
    moderate_n = int(((scored["score"] >= 40) & (scored["score"] < 70)).sum())
    weak_n = int((scored["score"] < 40).sum())

    sector_avg = (
        scored[scored["sector"] != ""]
        .groupby("sector")["score"]
        .mean()
        .sort_values(ascending=False)
    )
    top_sector = sector_avg.index[0] if not sector_avg.empty else "N/A"
    top_sector_score = f"{sector_avg.iloc[0]:.1f}" if not sector_avg.empty else "--"

    now_str = datetime.now().strftime("%d %b %Y %H:%M")

    st.markdown(
        f'<div class="market-bar">'
        f'  <div class="market-stat">'
        f'    <div class="ms-label">Companies Scored</div>'
        f'    <div class="ms-value">{total}</div>'
        f'    <div class="ms-sub">of {len(score_df)} listed</div>'
        f'  </div>'
        f'  <div class="market-stat">'
        f'    <div class="ms-label">Strong (&gt;70)</div>'
        f'    <div class="ms-value">{strong_n}</div>'
        f'    <div class="ms-sub">{strong_n / total * 100:.0f}% of market</div>'
        f'  </div>'
        f'  <div class="market-stat">'
        f'    <div class="ms-label">Moderate (40–70)</div>'
        f'    <div class="ms-value">{moderate_n}</div>'
        f'    <div class="ms-sub">{moderate_n / total * 100:.0f}% of market</div>'
        f'  </div>'
        f'  <div class="market-stat">'
        f'    <div class="ms-label">Weak (&lt;40)</div>'
        f'    <div class="ms-value">{weak_n}</div>'
        f'    <div class="ms-sub">{weak_n / total * 100:.0f}% of market</div>'
        f'  </div>'
        f'  <div class="market-stat">'
        f'    <div class="ms-label">Top Sector</div>'
        f'    <div class="ms-value" style="font-size:0.78rem">{top_sector}</div>'
        f'    <div class="ms-sub">avg score {top_sector_score}</div>'
        f'  </div>'
        f'  <div class="market-stat">'
        f'    <div class="ms-label">Last Updated</div>'
        f'    <div class="ms-value" style="font-size:0.72rem">{now_str}</div>'
        f'    <div class="ms-sub">5-min cache</div>'
        f'  </div>'
        f'</div>',
        unsafe_allow_html=True,
    )

    # --- Explainer ---
    with st.expander(">> what is the dseX score?"):
        st.markdown(
            '<div class="explainer">'
            'The <strong>dseX Score (0–100)</strong> ranks every DSE-listed company on '
            '<strong>6 fundamental factors</strong> across 3 pairs:<br>'
            '&nbsp;&nbsp;· <strong>EPS Pair (30%)</strong> — P/E ratio (lower = cheaper) + EPS growth trend<br>'
            '&nbsp;&nbsp;· <strong>Balance-Sheet Pair (30%)</strong> — Reserve per share (higher = better) + Loan per share (lower = better)<br>'
            '&nbsp;&nbsp;· <strong>Dividend Pair (40%)</strong> — Dividend yield + Dividend growth trend<br><br>'
            'Each factor is <strong>percentile-ranked</strong> across all companies, then weighted and combined. '
            'A score of <strong>80</strong> means the company beats 80% of the market on these fundamentals. '
            'This is a <strong>relative</strong> score — it compares companies against each other, not against absolute thresholds.'
            '</div>',
            unsafe_allow_html=True,
        )

    # --- Search ---
    search = st.text_input(">> search", key="search", placeholder="type company name or code...")

    if search:
        mask = (
            scored["trading_code"].str.contains(search, case=False, na=False)
            | scored["name"].str.contains(search, case=False, na=False)
        )
        scored = scored[mask].reset_index(drop=True)

    st.caption(f"{len(scored)} companies ranked")

    # --- Sector Leaderboard ---
    if not search and not sector_avg.empty:
        max_avg = sector_avg.max()

        def _sector_rows(items):
            rows = []
            for rank_i, (sec_name, avg_sc) in items:
                bar_w = int(avg_sc / max_avg * 100) if max_avg > 0 else 0
                rows.append(
                    f'<div class="sector-row">'
                    f'  <span class="sr-rank">{rank_i}</span>'
                    f'  <span class="sr-name">{sec_name}</span>'
                    f'  <div class="sr-bar-wrap"><div class="sr-bar-fill" style="width:{bar_w}%"></div></div>'
                    f'  <span class="sr-score">{avg_sc:.1f}</span>'
                    f'</div>'
                )
            return rows

        st.markdown('<div class="tier-label" style="margin-top:16px">// sector leaderboard //</div>', unsafe_allow_html=True)
        top5 = list(enumerate(sector_avg.head(5).items(), 1))
        st.markdown('<div class="sector-board">' + "".join(_sector_rows(top5)) + "</div>", unsafe_allow_html=True)

        if len(sector_avg) > 5:
            with st.expander(f">> show all {len(sector_avg)} sectors"):
                rest = list(enumerate(sector_avg.iloc[5:].items(), 6))
                st.markdown('<div class="sector-board">' + "".join(_sector_rows(rest)) + "</div>", unsafe_allow_html=True)

    # --- Top 10 rich cards ---
    top_n = min(10, len(scored))
    if top_n > 0:
        st.markdown('<div class="tier-label top10">// top 10 //</div>', unsafe_allow_html=True)
        cards = []
        for i in range(top_n):
            r = scored.iloc[i].to_dict()
            code = r["trading_code"]
            name = r["name"]
            sector = r["sector"] or ""
            score = r["score"]
            rank = i + 1
            ltp = (prices_map.get(code) or {}).get("ltp")
            ltp_str = f"LTP: {ltp:,.1f}" if ltp else ""
            pe_val = r.get("pe")
            pe_str = f"P/E: {pe_val:.1f}" if pe_val else ""
            dy_val = r.get("div_yield")
            dy_str = f"Div: {dy_val:.1f}%" if dy_val else ""

            strengths = _top_strengths(r, n=3)
            tags_html = "".join(f'<span class="tag">{s}</span>' for s in strengths)
            verdict = _generate_verdict(r)
            bar_width = min(100, max(0, score))

            cards.append(
                f'<a class="top-card" href="?code={code}" target="_self">'
                f'  <div class="card-head">'
                f'    <span class="card-rank">#{rank}</span>'
                f'    <span class="card-code">{code}</span>'
                f'    <span class="card-name">{name}</span>'
                f'    <span class="card-score-badge">{score:.1f}</span>'
                f'  </div>'
                f'  <div class="score-bar-wrap"><div class="score-bar-fill" style="width:{bar_width}%"></div></div>'
                f'  <div class="card-meta">'
                f'    {"<span class=\"highlight\">" + ltp_str + "</span>" if ltp_str else ""}'
                f'    {"<span>" + pe_str + "</span>" if pe_str else ""}'
                f'    {"<span>" + dy_str + "</span>" if dy_str else ""}'
                f'    {"<span>" + sector + "</span>" if sector else ""}'
                f'  </div>'
                f'  <div class="card-tags">{tags_html}</div>'
                f'  <div class="card-verdict">{verdict}</div>'
                f'</a>'
            )
        st.markdown('<div class="top10-grid">' + "\n".join(cards) + "</div>", unsafe_allow_html=True)

    # --- Mid-tier 11–30 ---
    mid_start = top_n
    mid_end = min(mid_start + 20, len(scored))
    if mid_end > mid_start:
        st.markdown('<div class="tier-label mid20">// next 20 //</div>', unsafe_allow_html=True)
        cards = []
        for i in range(mid_start, mid_end):
            r = scored.iloc[i].to_dict()
            code = r["trading_code"]
            name = r["name"]
            sector = r["sector"] or ""
            score = r["score"]
            rank = i + 1
            strengths = _top_strengths(r, n=2)
            tags_html = "".join(f'<span class="tag">{s}</span>' for s in strengths)
            cards.append(
                f'<a class="mid-card" href="?code={code}" target="_self">'
                f'  <div class="mc-head">'
                f'    <span class="mc-rank">#{rank}</span>'
                f'    <span class="mc-code">{code}</span>'
                f'    <span class="mc-score">{score:.1f}</span>'
                f'  </div>'
                f'  <div class="mc-name">{name}</div>'
                f'  <div class="mc-sector">{sector}</div>'
                f'  <div class="mc-tags">{tags_html}</div>'
                f'</a>'
            )
        st.markdown('<div class="mid-grid">' + "\n".join(cards) + "</div>", unsafe_allow_html=True)

    # --- All companies list (31 to N-30) ---
    rest_end = max(mid_end, total - 30)
    rest_df = scored.iloc[mid_end:rest_end]
    if len(rest_df) > 0:
        st.markdown('<div class="tier-label">// all companies //</div>', unsafe_allow_html=True)
        links = []
        for i, row in rest_df.iterrows():
            code = row["trading_code"]
            name = row["name"]
            score = row["score"]
            rank = i + 1
            links.append(
                f'<a href="?code={code}" target="_self">'
                f'<span class="rk">{rank}</span>'
                f'<span class="rc">{code}</span>'
                f'<span class="rn">{name}</span>'
                f'<span class="rs">{score:.1f}</span></a>'
            )
        st.markdown('<div class="rest-list">' + "\n".join(links) + "</div>", unsafe_allow_html=True)

    # --- Danger zone: worst 30 ---
    danger_n = min(30, total)
    danger_df = scored.iloc[max(0, total - danger_n):]
    if len(danger_df) > 0 and not search:
        st.markdown('<div class="tier-label danger">// danger zone &mdash; lowest 30 //</div>', unsafe_allow_html=True)
        cards = []
        for i, row in danger_df.iterrows():
            r = row.to_dict()
            code = r["trading_code"]
            name = r["name"]
            score = r["score"]
            rank = i + 1
            worst = _worst_factor(r)
            worst_html = f'<div class="dc-weak">weak: {worst}</div>' if worst else ""
            cards.append(
                f'<a class="danger-card" href="?code={code}" target="_self">'
                f'  <div class="dc-rank">#{rank}</div>'
                f'  <div class="dc-code">{code}</div>'
                f'  <div class="dc-name">{name}</div>'
                f'  <div class="dc-score">{score:.1f}</div>'
                f'  {worst_html}'
                f'</a>'
            )
        st.markdown('<div class="danger-grid">' + "\n".join(cards) + "</div>", unsafe_allow_html=True)


# ---------------------------------------------------------------------------
# Detail page — single company
# ---------------------------------------------------------------------------

def render_detail_page(trading_code):
    db = get_mongo_db()
    company = db.companies.find_one({"trading_code": trading_code}, {"_id": 0})
    if not company or company.get("excluded"):
        st.error(f"Company '{trading_code}' not found.")
        return

    prices_map = load_latest_prices()
    latest = prices_map.get(trading_code) or {}

    if st.button("<< BACK"):
        st.query_params.clear()
        st.rerun()

    name = company.get("company_name", trading_code)
    sector = company.get("sector", "")
    sector_tag = (
        f'&nbsp;<span style="font-size:0.68rem;color:var(--text-muted);'
        f'border:1px solid #2a2a2a;padding:2px 8px;letter-spacing:1px">{sector}</span>'
        if sector else ""
    )
    st.markdown(
        f'<div style="margin-bottom:16px">'
        f'  <div style="font-size:0.65rem;color:var(--text-muted);letter-spacing:2px;'
        f'text-transform:uppercase;margin-bottom:5px">// Company Detail</div>'
        f'  <div style="font-size:1.35rem;font-weight:700;color:var(--green);letter-spacing:1px">'
        f'    {trading_code}'
        f'    <span style="color:var(--border);font-weight:400"> // </span>'
        f'    <span style="color:var(--amber);font-size:1rem;font-weight:600">{name}</span>'
        f'    {sector_tag}'
        f'  </div>'
        f'</div>',
        unsafe_allow_html=True,
    )

    # ------------------------------------------------------------------ #
    # dseX Score Panel                                                     #
    # ------------------------------------------------------------------ #
    score_row = _get_company_score_row(trading_code)
    if score_row and score_row.get("score") is not None and not pd.isna(score_row["score"]):
        score = score_row["score"]
        overall_rank = score_row.get("overall_rank")
        total_scored = score_row.get("total_scored", 0)
        rank_text = f"Rank #{overall_rank} of {total_scored}" if overall_rank else ""
        verdict = _generate_verdict(score_row)

        score_color = (
            "var(--green)" if score >= 70
            else "var(--amber)" if score >= 40
            else "#ff4444"
        )

        _DETAIL_FACTORS = [
            ("ey_rank",     "Earnings Yield",    score_row.get("earn_yield"),
             lambda v: f"{v:.2f}%"),
            ("np_rank",     "NAV / Price",       score_row.get("nav_to_price"),
             lambda v: f"{v:.2f}x"),
            ("roe_rank",    "ROE (3yr avg)",     score_row.get("roe_3yr"),
             lambda v: f"{v*100:.1f}%"),
            ("stab_rank",   "EPS Stability",     score_row.get("eps_stab"),
             lambda v: f"{v:.2f}"),
            ("dy_rank",     "Dividend Yield",    score_row.get("div_yield"),
             lambda v: f"{v:.2f}%"),
            ("streak_rank", "Div. Streak",       score_row.get("div_streak"),
             lambda v: f"{int(v)} yrs"),
            ("rm_rank",     "Reserve / MCap",    score_row.get("res_mcap"),
             lambda v: f"{v:.2f}x"),
            ("de_rank",     "Equity / Loan",     score_row.get("debt_safety"),
             lambda v: f"{v:.2f}x"),
        ]

        factor_rows_html = []
        for rank_key, label, raw_val, fmt_fn in _DETAIL_FACTORS:
            _raw_pct = score_row.get(rank_key)
            pct = 0.0 if _raw_pct is None or (isinstance(_raw_pct, float) and pd.isna(_raw_pct)) else float(_raw_pct)
            bar_w = int(pct * 100)
            bar_color = (
                "var(--green)" if pct >= 0.70
                else "var(--amber-dim)" if pct >= 0.40
                else "#cc2222"
            )
            try:
                val_str = fmt_fn(raw_val) if raw_val is not None and not (isinstance(raw_val, float) and pd.isna(raw_val)) else "--"
            except Exception:
                val_str = "--"
            factor_rows_html.append(
                f'<div class="factor-row">'
                f'  <span class="fr-name">{label}</span>'
                f'  <span class="fr-val">{val_str}</span>'
                f'  <div class="fr-bar-wrap"><div class="fr-bar-fill" style="width:{bar_w}%;background:{bar_color}"></div></div>'
                f'  <span class="fr-pct">{bar_w}</span>'
                f'</div>'
            )

        st.markdown(
            f'<div class="score-panel">'
            f'  <div class="score-panel-head">'
            f'    <span class="score-big" style="color:{score_color}">{score:.1f}</span>'
            f'    <span class="score-rank-text">dseX Score &mdash; {rank_text}</span>'
            f'  </div>'
            + "".join(factor_rows_html)
            + f'  <div class="score-verdict-text">{verdict}</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

    # ------------------------------------------------------------------ #
    # Price Panel                                                          #
    # ------------------------------------------------------------------ #
    ltp = latest.get("ltp")
    if ltp:
        change_val = latest.get("change") or 0
        change_pct_val = latest.get("change_pct") or 0
        high = latest.get("high")
        low = latest.get("low")
        ycp = latest.get("ycp")
        volume = latest.get("volume")
        value_mn = latest.get("value_mn")
        trade_count = latest.get("trade_count")
        price_date = latest.get("date", "")

        change_class = (
            "price-change-pos" if change_val > 0
            else "price-change-neg" if change_val < 0
            else "price-change-neu"
        )
        sign = "+" if change_val > 0 else ""

        def _p(v, fmt=",.2f"):
            return f"{v:{fmt}}" if v is not None else "--"

        st.markdown(
            f'<div class="price-panel">'
            f'  <div style="font-size:0.6rem;color:var(--text-muted);letter-spacing:1.5px;'
            f'text-transform:uppercase;margin-bottom:8px">Last Trading Price &mdash; {price_date}</div>'
            f'  <div class="price-ltp-row">'
            f'    <span class="price-ltp">\u09f3{_p(ltp)}</span>'
            f'    <span class="{change_class}">{sign}{_p(change_val)} &nbsp;({sign}{_p(change_pct_val, ".2f")}%)</span>'
            f'  </div>'
            f'  <div class="price-grid">'
            f'    <div class="price-cell"><div class="pc-label">Day High</div><div class="pc-val">{_p(high)}</div></div>'
            f'    <div class="price-cell"><div class="pc-label">Day Low</div><div class="pc-val">{_p(low)}</div></div>'
            f'    <div class="price-cell"><div class="pc-label">Prev. Close (YCP)</div><div class="pc-val">{_p(ycp)}</div></div>'
            f'    <div class="price-cell"><div class="pc-label">Volume</div><div class="pc-val">{_p(volume, ",.0f") if volume else "--"}</div></div>'
            f'    <div class="price-cell"><div class="pc-label">Value Traded (mn)</div><div class="pc-val">{_p(value_mn) if value_mn else "--"}</div></div>'
            f'    <div class="price-cell"><div class="pc-label">Trade Count</div><div class="pc-val">{_p(trade_count, ",.0f") if trade_count else "--"}</div></div>'
            f'    <div class="price-cell"><div class="pc-label">Listing Year</div><div class="pc-val">{company.get("listing_year", "--")}</div></div>'
            f'    <div class="price-cell"><div class="pc-label">Category</div><div class="pc-val">{company.get("market_category", "--")}</div></div>'
            f'  </div>'
            f'</div>',
            unsafe_allow_html=True,
        )
    else:
        st.info("No price data available for this company.")

    # ------------------------------------------------------------------ #
    # Key Ratios                                                           #
    # ------------------------------------------------------------------ #
    shares = company.get("total_shares")
    mcap_mn = (ltp * shares / 1e6) if ltp and shares else None

    # Pull computed values from score row if available
    earn_yield_v  = score_row.get("earn_yield")   if score_row else None
    nav_to_price_v = score_row.get("nav_to_price") if score_row else None
    roe_3yr_v     = score_row.get("roe_3yr")       if score_row else None
    div_yield_v   = score_row.get("div_yield")     if score_row else None
    div_streak_v  = score_row.get("div_streak")    if score_row else None
    eps_3yr_v     = score_row.get("eps_3yr")       if score_row else None

    # Latest EPS from financials
    fin_df = load_financials(trading_code)
    if not fin_df.empty:
        fin_df["year"] = fin_df["year"].astype(str)

    def _rv(v, fmt=".2f", prefix="", suffix=""):
        if v is None or (isinstance(v, float) and pd.isna(v)):
            return "--"
        return f"{prefix}{v:{fmt}}{suffix}"

    def _rc(label, val_str, sub=""):
        sub_html = f'<div class="rc-sub">{sub}</div>' if sub else ""
        return (
            f'<div class="ratio-cell">'
            f'  <div class="rc-label">{label}</div>'
            f'  <div class="rc-val">{val_str}</div>'
            f'  {sub_html}'
            f'</div>'
        )

    st.markdown(
        '<div class="section-label"><span>//</span> KEY RATIOS</div>'
        '<div class="ratio-grid">'
        + _rc("Earnings Yield",  _rv(earn_yield_v, ".2f", suffix="%"), "3yr avg EPS / price")
        + _rc("NAV / Price",     _rv(nav_to_price_v, ".2f", suffix="x"), "book-to-market")
        + _rc("ROE (3yr avg)",   _rv(roe_3yr_v * 100 if roe_3yr_v else None, ".1f", suffix="%"), "return on equity")
        + _rc("EPS (3yr avg)",   _rv(eps_3yr_v, ".2f", "\u09f3"), "BDT")
        + _rc("Div. Yield",      _rv(div_yield_v, ".2f", suffix="%"), "cash div.")
        + _rc("Div. Streak",     (f"{int(div_streak_v)} yrs" if div_streak_v and not (isinstance(div_streak_v, float) and pd.isna(div_streak_v)) else "--"), "consecutive yrs")
        + '</div>',
        unsafe_allow_html=True,
    )

    # ------------------------------------------------------------------ #
    # Price History Chart                                                  #
    # ------------------------------------------------------------------ #
    ph_df = load_price_history(trading_code)
    if not ph_df.empty and "date" in ph_df.columns and "ltp" in ph_df.columns:
        ph_df = ph_df.dropna(subset=["ltp"]).sort_values("date")
        st.markdown('<div class="section-label"><span>//</span> PRICE HISTORY</div>', unsafe_allow_html=True)
        fig_price = px.line(ph_df, x="date", y="ltp", labels={"date": "", "ltp": "Price (BDT)"})
        _retro_fig(fig_price)
        fig_price.update_traces(line=dict(color="#33ff33", width=1.5))
        fig_price.update_layout(height=250, margin=dict(l=0, r=0, t=8, b=0))
        st.plotly_chart(fig_price, use_container_width=True)

    # ------------------------------------------------------------------ #
    # Financial Performance                                                #
    # ------------------------------------------------------------------ #
    st.markdown('<div class="section-label"><span>//</span> FINANCIAL PERFORMANCE</div>', unsafe_allow_html=True)

    if not fin_df.empty:
        if "eps_cont_basic" in fin_df.columns or "eps_basic" in fin_df.columns:
            fin_df["eps"] = (
                fin_df["eps_cont_basic"].combine_first(fin_df.get("eps_basic"))
                if "eps_cont_basic" in fin_df.columns
                else fin_df.get("eps_basic")
            )

        c1, c2 = st.columns(2)
        with c1:
            if "eps" in fin_df.columns and fin_df["eps"].notna().any():
                fig_eps = px.bar(fin_df, x="year", y="eps",
                    labels={"year": "Year", "eps": "EPS (BDT)"},
                    title="Earnings Per Share", text_auto=".2f")
                _retro_fig(fig_eps)
                fig_eps.update_layout(height=300, margin=dict(l=0, r=0, t=40, b=0))
                st.plotly_chart(fig_eps, use_container_width=True)

        with c2:
            if "profit_mn" in fin_df.columns and fin_df["profit_mn"].notna().any():
                fig_profit = px.bar(fin_df, x="year", y="profit_mn",
                    labels={"year": "Year", "profit_mn": "Profit (mn BDT)"},
                    title="Net Profit", text_auto=",.0f")
                _retro_fig(fig_profit)
                fig_profit.update_layout(height=300, margin=dict(l=0, r=0, t=40, b=0))
                st.plotly_chart(fig_profit, use_container_width=True)

        # NAV per share (if scraped)
        if "nav_ps" in fin_df.columns and fin_df["nav_ps"].notna().any():
            c3, _ = st.columns(2)
            with c3:
                fig_nav = px.bar(fin_df, x="year", y="nav_ps",
                    labels={"year": "Year", "nav_ps": "NAV/Share (BDT)"},
                    title="Net Asset Value per Share", text_auto=".2f")
                _retro_fig(fig_nav)
                fig_nav.update_layout(height=300, margin=dict(l=0, r=0, t=40, b=0))
                st.plotly_chart(fig_nav, use_container_width=True)

        # Dividend chart
        div_cols = [c for c in ["cash_dividend_pct", "stock_dividend_pct"] if c in fin_df.columns]
        has_div = any(fin_df[c].notna().any() for c in div_cols) if div_cols else False
        if has_div:
            div_melted = fin_df.melt(
                id_vars=["year"], value_vars=div_cols,
                var_name="Type", value_name="Dividend %",
            )
            div_melted["Type"] = div_melted["Type"].map({
                "cash_dividend_pct": "Cash", "stock_dividend_pct": "Stock (Bonus)",
            })
            div_melted = div_melted.dropna(subset=["Dividend %"])
            fig_div = px.bar(div_melted, x="year", y="Dividend %", color="Type",
                barmode="group", labels={"year": "Year"},
                title="Dividend History (%)", text_auto=".0f")
            _retro_fig(fig_div)
            fig_div.update_layout(height=300, margin=dict(l=0, r=0, t=40, b=0))
            st.plotly_chart(fig_div, use_container_width=True)
    else:
        st.caption("No financial data yet. Run `python main.py scrape-details` to populate.")

    # ------------------------------------------------------------------ #
    # Shareholding                                                         #
    # ------------------------------------------------------------------ #
    st.markdown('<div class="section-label"><span>//</span> SHAREHOLDING PATTERN</div>', unsafe_allow_html=True)
    holdings = load_shareholdings(trading_code)

    if holdings:
        latest_h = holdings[0]
        hold_meta = [
            ("sponsor_director_pct", "Sponsor / Director"),
            ("govt_pct",             "Government"),
            ("institute_pct",        "Institute"),
            ("foreign_pct",          "Foreign"),
            ("public_pct",           "General Public"),
        ]
        s_labels, s_values = [], []
        for key, label in hold_meta:
            val = latest_h.get(key)
            if val is not None and val > 0:
                s_labels.append(label)
                s_values.append(val)

        if s_values:
            col_pie, col_table = st.columns([3, 2])
            with col_pie:
                fig_pie = px.pie(
                    names=s_labels, values=s_values,
                    title=f"As of {latest_h.get('as_of_date', 'N/A')}",
                    hole=0.40,
                )
                fig_pie.update_traces(
                    textinfo="label+percent", textposition="outside",
                    textfont=dict(color="#ffb000"),
                    marker=dict(colors=["#33ff33", "#ffb000", "#20c020", "#cc8d00", "#664400"]),
                )
                _retro_fig(fig_pie)
                fig_pie.update_layout(height=360, margin=dict(l=0, r=0, t=36, b=0))
                st.plotly_chart(fig_pie, use_container_width=True)

            with col_table:
                st.markdown("<br>", unsafe_allow_html=True)
                rows_html = []
                for label, val in zip(s_labels, s_values):
                    rows_html.append(
                        f'<div style="display:grid;grid-template-columns:140px 44px 1fr;'
                        f'gap:8px;align-items:center;padding:6px 0;'
                        f'border-bottom:1px solid #161616;font-size:0.73rem">'
                        f'  <span style="color:var(--amber-dim)">{label}</span>'
                        f'  <span style="color:var(--green);text-align:right;font-weight:700">{val:.1f}%</span>'
                        f'  <div style="height:4px;background:#1a1a1a">'
                        f'    <div style="height:4px;width:{int(val)}%;background:var(--green-dim)"></div>'
                        f'  </div>'
                        f'</div>'
                    )
                st.markdown(
                    '<div style="border:1px solid var(--border);background:var(--bg-card);padding:12px 16px;margin-top:8px">'
                    '<div style="font-size:0.58rem;color:var(--text-muted);text-transform:uppercase;'
                    'letter-spacing:1.5px;margin-bottom:10px">Breakdown</div>'
                    + "".join(rows_html) + "</div>",
                    unsafe_allow_html=True,
                )
    else:
        st.caption("No shareholding data yet. Run `python main.py scrape-details` to populate.")

    # ------------------------------------------------------------------ #
    # Company Info Footer                                                  #
    # ------------------------------------------------------------------ #
    info_pairs = [
        ("Face Value",        f"\u09f3{company['face_value']}" if company.get("face_value") else None),
        ("Paid-up Capital",   f"\u09f3{company['paid_up_capital_mn']:,.2f} mn" if company.get("paid_up_capital_mn") else None),
        ("Total Shares",      f"{company['total_shares']:,}" if company.get("total_shares") else None),
        ("Reserve & Surplus", f"\u09f3{company['reserve_surplus_mn']:,.2f} mn" if company.get("reserve_surplus_mn") else None),
        ("Total Loan",        f"\u09f3{company['total_loan_mn']:,.2f} mn" if company.get("total_loan_mn") else None),
    ]
    avail = [(k, v) for k, v in info_pairs if v]
    if avail:
        st.markdown('<div class="section-label"><span>//</span> COMPANY INFO</div>', unsafe_allow_html=True)
        rows_html = "".join(
            f'<div style="display:flex;justify-content:space-between;padding:5px 0;'
            f'border-bottom:1px solid #161616;font-size:0.75rem">'
            f'  <span style="color:var(--text-muted)">{k}</span>'
            f'  <span style="color:var(--amber)">{v}</span>'
            f'</div>'
            for k, v in avail
        )
        st.markdown(
            f'<div style="border:1px solid var(--border);background:var(--bg-card);padding:12px 16px">{rows_html}</div>',
            unsafe_allow_html=True,
        )


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

def main():
    code = st.query_params.get("code")
    if code:
        render_detail_page(code)
    else:
        render_homepage()


main()
