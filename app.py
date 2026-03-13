import numpy as np
import streamlit as st
import pandas as pd
import plotly.express as px
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

/* --- Top 10 card grid --- */
.top-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 10px;
    margin-bottom: 8px;
}
@media (max-width: 900px) {
    .top-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 500px) {
    .top-grid { grid-template-columns: 1fr; }
}
.top-card {
    display: block;
    text-decoration: none !important;
    background: var(--bg-card);
    border: 1px solid var(--border);
    padding: 14px 14px 12px;
    transition: border-color 0.15s, box-shadow 0.15s;
    position: relative;
    overflow: hidden;
}
.top-card:hover {
    border-color: var(--green-dim);
    box-shadow: 0 0 12px rgba(51, 255, 51, 0.15);
}
.top-card .card-rank {
    font-size: 1.6rem;
    font-weight: 700;
    color: var(--green);
    line-height: 1;
    margin-bottom: 6px;
    text-shadow: 0 0 10px rgba(51, 255, 51, 0.3);
}
.top-card .card-code {
    font-size: 0.82rem;
    color: var(--green-dim);
    letter-spacing: 1px;
    margin-bottom: 4px;
}
.top-card .card-name {
    font-size: 0.78rem;
    color: var(--amber);
    line-height: 1.3;
    margin-bottom: 6px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
.top-card .card-sector {
    font-size: 0.65rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
}

/* --- Section dividers --- */
.tier-label {
    color: var(--text-muted);
    font-size: 0.75rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    text-align: center;
    margin: 20px 0 12px;
    position: relative;
}
.tier-label::before,
.tier-label::after {
    content: '';
    position: absolute;
    top: 50%;
    width: 30%;
    height: 1px;
    background: var(--border);
}
.tier-label::before { left: 0; }
.tier-label::after { right: 0; }

/* --- Rest list (multi-column) --- */
.rest-list {
    column-count: 3;
    column-gap: 16px;
    max-height: 55vh;
    overflow-y: auto;
    border: 1px solid var(--border);
    padding: 6px 0;
}
@media (max-width: 900px) {
    .rest-list { column-count: 2; }
}
@media (max-width: 500px) {
    .rest-list { column-count: 1; }
}
.rest-list a {
    display: block;
    padding: 5px 14px;
    color: var(--amber) !important;
    text-decoration: none !important;
    font-size: 0.8rem;
    break-inside: avoid;
    transition: color 0.1s, background 0.1s;
    border-bottom: 1px solid #131313;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.rest-list a:hover {
    background: var(--bg-card);
    color: var(--green) !important;
    text-shadow: 0 0 6px rgba(51, 255, 51, 0.3);
}
.rest-list a .rk {
    color: var(--text-muted);
    display: inline-block;
    width: 36px;
    text-align: right;
    margin-right: 8px;
}
.rest-list::-webkit-scrollbar { width: 6px; }
.rest-list::-webkit-scrollbar-track { background: var(--bg-dark); }
.rest-list::-webkit-scrollbar-thumb { background: var(--border); }

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
    return list(db.companies.find({}, {"_id": 0}))


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


def _trend_slope(years, values):
    """Normalized linear-regression slope for a year-sorted series.
    Returns NaN when fewer than 2 non-null data points exist."""
    mask = pd.notna(values)
    y = np.asarray(years[mask], dtype=float)
    v = np.asarray(values[mask], dtype=float)
    if len(v) < 2:
        return np.nan
    mean_abs = np.mean(np.abs(v))
    if mean_abs == 0:
        return 0.0
    slope = np.polyfit(y, v, 1)[0]
    return slope / mean_abs


@st.cache_data(ttl=300)
def compute_composite_scores():
    """
    dseX Score (0-100) based on 6 factors in 3 pairs:
      EPS Pair (30%):
        15 %  P/E Ratio           (lower = better value)
        15 %  EPS Growth Trend    (steeper positive slope = better)
      Balance-Sheet Pair (30%):
        15 %  Reserve per Share   (higher = better)
        15 %  Loan per Share      (lower = better)
      Dividend Pair (40%):
        20 %  Dividend Yield      (higher = better)
        20 %  Dividend Growth     (steeper positive slope = better)
    Each factor is percentile-ranked before weighting.
    """
    db = get_mongo_db()

    fin_docs = list(db.financials.find({}, {"_id": 0}))
    if not fin_docs:
        return {}
    fin_df = pd.DataFrame(fin_docs).sort_values(["trading_code", "year"])
    fin_df["eps"] = fin_df["eps_cont_basic"].combine_first(fin_df.get("eps_basic"))

    latest_eps = fin_df.groupby("trading_code")["eps"].last()

    eps_slopes: dict[str, float] = {}
    div_slopes: dict[str, float] = {}
    latest_div_pct: dict[str, float] = {}
    for code, grp in fin_df.groupby("trading_code"):
        eps_slopes[code] = _trend_slope(grp["year"].values, grp["eps"].values)
        div_slopes[code] = _trend_slope(
            grp["year"].values, grp["cash_dividend_pct"].values
        )
        div_valid = grp["cash_dividend_pct"].dropna()
        if not div_valid.empty:
            latest_div_pct[code] = div_valid.iloc[-1]

    companies = {
        d["trading_code"]: d
        for d in db.companies.find({}, {
            "trading_code": 1, "reserve_surplus_mn": 1,
            "total_shares": 1, "total_loan_mn": 1,
            "face_value": 1, "_id": 0,
        })
    }

    prices = load_latest_prices()

    all_codes = set(latest_eps.index) | set(companies.keys())
    metrics = []
    for code in all_codes:
        comp = companies.get(code, {})
        ltp = (prices.get(code) or {}).get("ltp")
        reserve = comp.get("reserve_surplus_mn")
        shares = comp.get("total_shares")
        loan = comp.get("total_loan_mn")
        face = comp.get("face_value")

        eps_val = latest_eps.get(code)
        eps_growth = eps_slopes.get(code)

        pe = ltp / eps_val if ltp and eps_val and eps_val > 0 else None

        rps = (reserve * 1_000_000 / shares) if reserve and shares and shares > 0 else None
        lps = (((loan or 0) * 1_000_000) / shares) if shares and shares > 0 else None

        div_pct = latest_div_pct.get(code)
        if div_pct and face and ltp and ltp > 0:
            div_yield = (face * div_pct / 100) / ltp * 100
        else:
            div_yield = None

        div_growth = div_slopes.get(code)

        metrics.append({
            "trading_code": code,
            "pe": pe,
            "eps_growth": eps_growth,
            "rps": rps,
            "lps": lps,
            "div_yield": div_yield,
            "div_growth": div_growth,
        })

    mdf = pd.DataFrame(metrics)
    if mdf.empty:
        return {}

    # Higher is better
    mdf["eps_growth_rank"] = mdf["eps_growth"].rank(pct=True).fillna(0)
    mdf["rps_rank"] = mdf["rps"].rank(pct=True).fillna(0)
    mdf["div_yield_rank"] = mdf["div_yield"].rank(pct=True).fillna(0)
    mdf["div_growth_rank"] = mdf["div_growth"].rank(pct=True).fillna(0)

    # Lower is better
    pe_raw = mdf["pe"].rank(pct=True, ascending=True)
    mdf["pe_rank"] = (1 - pe_raw).fillna(0)

    lps_raw = mdf["lps"].rank(pct=True, ascending=True)
    mdf["lps_rank"] = (1 - lps_raw).fillna(0)

    mdf["score"] = np.round(
        (
            0.15 * mdf["pe_rank"]
            + 0.15 * mdf["eps_growth_rank"]
            + 0.15 * mdf["rps_rank"]
            + 0.15 * mdf["lps_rank"]
            + 0.20 * mdf["div_yield_rank"]
            + 0.20 * mdf["div_growth_rank"]
        ) * 100,
        1,
    )

    has_any = (
        mdf["pe"].notna()
        | mdf["eps_growth"].notna()
        | mdf["rps"].notna()
        | mdf["lps"].notna()
        | mdf["div_yield"].notna()
        | mdf["div_growth"].notna()
    )
    mdf.loc[~has_any, "score"] = np.nan

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
# Homepage -- company list
# ---------------------------------------------------------------------------

def render_homepage():
    st.markdown("## dseX // Dhaka Stock Exchange")

    companies_raw = load_companies()
    scores = compute_composite_scores()

    rows = []
    for c in companies_raw:
        code = c["trading_code"]
        rows.append({
            "trading_code": code,
            "name": c.get("company_name", "") or code,
            "sector": c.get("sector", ""),
            "score": scores.get(code),
        })

    df = pd.DataFrame(rows)
    df = df.sort_values("score", ascending=False, na_position="last").reset_index(drop=True)

    search = st.text_input(">> search", key="search", placeholder="type company name or code...")

    if search:
        mask = (
            df["trading_code"].str.contains(search, case=False, na=False)
            | df["name"].str.contains(search, case=False, na=False)
        )
        df = df[mask]

    st.caption(f"{len(df)} companies ranked")

    # --- Tier 1: Top 10 featured cards ---
    top_n = min(10, len(df))
    if top_n > 0:
        st.markdown('<div class="tier-label">// top 10 //</div>', unsafe_allow_html=True)
        cards = []
        for i in range(top_n):
            row = df.iloc[i]
            code = row["trading_code"]
            name = row["name"]
            sector = row["sector"] or ""
            rank = i + 1
            cards.append(
                f'<a class="top-card" href="?code={code}" target="_self">'
                f'<div class="card-rank">#{rank}</div>'
                f'<div class="card-code">{code}</div>'
                f'<div class="card-name">{name}</div>'
                f'<div class="card-sector">{sector}</div>'
                f'</a>'
            )
        grid_html = '<div class="top-grid">' + "\n".join(cards) + "</div>"
        st.markdown(grid_html, unsafe_allow_html=True)

    # --- Tier 2: Remaining companies ---
    rest_df = df.iloc[top_n:]
    if len(rest_df) > 0:
        st.markdown('<div class="tier-label">// all companies //</div>', unsafe_allow_html=True)
        links = []
        for i, row in rest_df.iterrows():
            code = row["trading_code"]
            name = row["name"]
            rank = i + 1
            links.append(
                f'<a href="?code={code}" target="_self">'
                f'<span class="rk">{rank}.</span>{name}</a>'
            )
        rest_html = '<div class="rest-list">' + "\n".join(links) + "</div>"
        st.markdown(rest_html, unsafe_allow_html=True)


# ---------------------------------------------------------------------------
# Detail page — single company
# ---------------------------------------------------------------------------

def render_detail_page(trading_code):
    db = get_mongo_db()
    company = db.companies.find_one(
        {"trading_code": trading_code}, {"_id": 0}
    )
    if not company:
        st.error(f"Company '{trading_code}' not found.")
        return

    prices_map = load_latest_prices()
    latest = prices_map.get(trading_code, {})

    if st.button("<< BACK"):
        st.query_params.clear()
        st.rerun()

    name = company.get("company_name", trading_code)
    sector = company.get("sector", "")
    header = f"**{trading_code}** // {name}"
    if sector:
        header += f"  `{sector}`"
    st.markdown(f"## {header}")

    # --- Price metric ---
    if latest:
        ltp = latest.get("ltp")
        change_val = latest.get("change")
        change_delta = f"{change_val:+.2f}" if change_val is not None else None
        st.metric("Last Trading Price", f"{ltp:,.2f}" if ltp else "N/A", delta=change_delta)
    else:
        st.info("No price data available for this company.")

    # --- Basic info ---
    info_fields = [
        ("Paid-up Capital (mn)", "paid_up_capital_mn"),
        ("Listing Year", "listing_year"),
        ("Category", "market_category"),
        ("Total Shares", "total_shares"),
        ("Reserve & Surplus (mn)", "reserve_surplus_mn"),
        ("Total Loan (mn)", "total_loan_mn"),
    ]
    available = [(label, company[key]) for label, key in info_fields if key in company]
    if available:
        cols = st.columns(min(len(available), 4))
        for idx, (label, value) in enumerate(available):
            col = cols[idx % len(cols)]
            if isinstance(value, (int, float)):
                col.metric(label, f"{value:,.2f}" if isinstance(value, float) else f"{value:,}")
            else:
                col.metric(label, value)

    st.divider()

    # --- Financial performance charts ---
    st.subheader("Financial Performance (Audited, Year-wise)")
    fin_df = load_financials(trading_code)

    if not fin_df.empty:
        fin_df["year"] = fin_df["year"].astype(str)
        fin_df["eps"] = fin_df.get("eps_cont_basic", fin_df.get("eps_basic"))

        c1, c2 = st.columns(2)

        with c1:
            if "eps" in fin_df.columns and fin_df["eps"].notna().any():
                fig_eps = px.bar(
                    fin_df,
                    x="year",
                    y="eps",
                    labels={"year": "Year", "eps": "EPS (BDT)"},
                    title="Earnings Per Share",
                    text_auto=".2f",
                )
                _retro_fig(fig_eps)
                fig_eps.update_layout(height=320, margin=dict(l=0, r=0, t=40, b=0))
                st.plotly_chart(fig_eps, use_container_width=True)

        with c2:
            if "profit_mn" in fin_df.columns and fin_df["profit_mn"].notna().any():
                fig_profit = px.bar(
                    fin_df,
                    x="year",
                    y="profit_mn",
                    labels={"year": "Year", "profit_mn": "Profit (mn BDT)"},
                    title="Yearly Profit",
                    text_auto=",.0f",
                )
                _retro_fig(fig_profit)
                fig_profit.update_layout(height=320, margin=dict(l=0, r=0, t=40, b=0))
                st.plotly_chart(fig_profit, use_container_width=True)

        # Dividend chart
        div_cols = [c for c in ["cash_dividend_pct", "stock_dividend_pct"] if c in fin_df.columns]
        has_div = any(fin_df[c].notna().any() for c in div_cols) if div_cols else False
        if has_div:
            div_melted = fin_df.melt(
                id_vars=["year"],
                value_vars=div_cols,
                var_name="Type",
                value_name="Dividend %",
            )
            div_melted["Type"] = div_melted["Type"].map({
                "cash_dividend_pct": "Cash",
                "stock_dividend_pct": "Stock (Bonus)",
            })
            div_melted = div_melted.dropna(subset=["Dividend %"])
            fig_div = px.bar(
                div_melted,
                x="year",
                y="Dividend %",
                color="Type",
                barmode="group",
                labels={"year": "Year"},
                title="Dividend History (%)",
                text_auto=".0f",
            )
            _retro_fig(fig_div)
            fig_div.update_layout(height=320, margin=dict(l=0, r=0, t=40, b=0))
            st.plotly_chart(fig_div, use_container_width=True)
    else:
        st.caption(
            "No financial data yet. Run `python main.py scrape-details` to populate."
        )

    st.divider()

    # --- Shareholding pie ---
    st.subheader("Shareholding Pattern")
    holdings = load_shareholdings(trading_code)

    if holdings:
        latest_h = holdings[0]
        labels = []
        values = []
        for key, label in [
            ("sponsor_director_pct", "Sponsor / Director"),
            ("govt_pct", "Government"),
            ("institute_pct", "Institute"),
            ("foreign_pct", "Foreign"),
            ("public_pct", "Public"),
        ]:
            val = latest_h.get(key)
            if val is not None and val > 0:
                labels.append(label)
                values.append(val)

        if values:
            fig_pie = px.pie(
                names=labels,
                values=values,
                title=f"As of {latest_h.get('as_of_date', 'N/A')}",
                hole=0.35,
            )
            fig_pie.update_traces(
                textinfo="label+percent", textposition="outside",
                textfont=dict(color="#ffb000"),
                marker=dict(colors=["#33ff33", "#ffb000", "#20c020", "#cc8d00", "#886600"]),
            )
            _retro_fig(fig_pie)
            fig_pie.update_layout(height=400, margin=dict(l=0, r=0, t=40, b=0))
            st.plotly_chart(fig_pie, use_container_width=True)
    else:
        st.caption(
            "No shareholding data yet. Run `python main.py scrape-details` to populate."
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
