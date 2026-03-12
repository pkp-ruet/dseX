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

/* Company list */
.company-list {
    max-height: 70vh;
    overflow-y: auto;
    border: 1px solid var(--border);
    padding: 0;
}
.company-link {
    display: block;
    padding: 8px 16px;
    color: var(--amber) !important;
    text-decoration: none !important;
    border-bottom: 1px solid #1a1a1a;
    font-size: 0.88rem;
    transition: background 0.1s, color 0.1s;
}
.company-link:hover {
    background: var(--bg-card);
    color: var(--green) !important;
    text-shadow: 0 0 6px rgba(51, 255, 51, 0.3);
}
.company-link .rank {
    color: var(--text-muted);
    margin-right: 8px;
}
.company-list::-webkit-scrollbar {
    width: 6px;
}
.company-list::-webkit-scrollbar-track {
    background: var(--bg-dark);
}
.company-list::-webkit-scrollbar-thumb {
    background: var(--border);
}

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

@st.cache_data(ttl=300)
def compute_composite_scores():
    """
    dseX Score (0-100) based on 3 value factors:
      50% P/E Ratio (lower = better)
      25% Reserve per Share (higher = better)
      25% Loan-to-Reserve Ratio (lower = better)
    Each factor is percentile-ranked before weighting.
    """
    db = get_mongo_db()

    fin_docs = list(db.financials.find({}, {"_id": 0}))
    if not fin_docs:
        return {}
    fin_df = pd.DataFrame(fin_docs).sort_values(["trading_code", "year"])
    fin_df["eps"] = fin_df["eps_cont_basic"].combine_first(fin_df.get("eps_basic"))
    latest_eps = fin_df.groupby("trading_code")["eps"].last()

    companies = {
        d["trading_code"]: d
        for d in db.companies.find({}, {
            "trading_code": 1, "reserve_surplus_mn": 1,
            "total_shares": 1, "total_loan_mn": 1, "_id": 0,
        })
    }

    prices = load_latest_prices()

    metrics = []
    for code, eps in latest_eps.items():
        comp = companies.get(code, {})
        ltp = (prices.get(code) or {}).get("ltp")
        reserve = comp.get("reserve_surplus_mn")
        shares = comp.get("total_shares")
        loan = comp.get("total_loan_mn")

        pe = ltp / eps if ltp and eps and eps > 0 else None
        rps = (reserve * 1_000_000 / shares) if reserve and shares and shares > 0 else None

        if reserve and reserve > 0:
            ltr = (loan or 0) / reserve
        elif loan and loan > 0:
            ltr = float("inf")
        else:
            ltr = None

        metrics.append({
            "trading_code": code, "pe": pe, "rps": rps, "ltr": ltr,
        })

    mdf = pd.DataFrame(metrics)
    if mdf.empty:
        return {}

    pe_raw = mdf["pe"].rank(pct=True, ascending=True)
    mdf["pe_rank"] = (1 - pe_raw).fillna(0)  # invert: lowest P/E -> highest rank; NaN -> 0

    mdf["rps_rank"] = mdf["rps"].rank(pct=True).fillna(0)

    ltr_finite = mdf["ltr"].replace(float("inf"), np.nan)
    ltr_raw = ltr_finite.rank(pct=True, ascending=True)
    mdf["ltr_rank"] = (1 - ltr_raw).fillna(0)  # invert: lowest ratio -> highest rank; NaN -> 0
    mdf.loc[mdf["ltr"] == float("inf"), "ltr_rank"] = 0

    mdf["score"] = np.round(
        (0.50 * mdf["pe_rank"] + 0.25 * mdf["rps_rank"] + 0.25 * mdf["ltr_rank"]) * 100, 1
    )

    has_any = mdf["pe"].notna() | mdf["rps"].notna() | mdf["ltr"].notna()
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

    companies = load_companies()
    scores = compute_composite_scores()

    rows = []
    for c in companies:
        code = c["trading_code"]
        score = scores.get(code)
        rows.append({
            "trading_code": code,
            "name": c.get("company_name", "") or code,
            "score": score,
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

    lines = []
    for i, row in df.iterrows():
        code = row["trading_code"]
        name = row["name"]
        rank = i + 1
        lines.append(
            f'<a class="company-link" href="?code={code}" target="_self">'
            f'<span class="rank">{rank:>3}.</span> {name}</a>'
        )

    list_html = '<div class="company-list">' + "\n".join(lines) + "</div>"
    st.markdown(list_html, unsafe_allow_html=True)


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

    # --- Price metrics ---
    if latest:
        m1, m2, m3, m4 = st.columns(4)
        change_val = latest.get("change")
        change_delta = f"{change_val:+.2f}" if change_val is not None else None
        m1.metric("Last Trading Price", f"{latest.get('ltp', 'N/A')}", delta=change_delta)
        m2.metric("Day's Range", f"{latest.get('low', '—')} – {latest.get('high', '—')}")
        m3.metric("Volume", f"{latest.get('volume', 0):,}")
        m4.metric("Value (mn)", f"{latest.get('value_mn', 0):.2f}")
    else:
        st.info("No price data available for this company.")

    # --- Basic info ---
    info_fields = [
        ("Face Value", "face_value"),
        ("Market Lot", "market_lot"),
        ("Paid-up Capital (mn)", "paid_up_capital_mn"),
        ("Listing Year", "listing_year"),
        ("Category", "market_category"),
        ("Total Shares", "total_shares"),
        ("Reserve & Surplus (mn)", "reserve_surplus_mn"),
        ("Total Loan (mn)", "total_loan_mn"),
    ]
    available = [(label, company[key]) for label, key in info_fields if key in company]
    if available:
        cols = st.columns(len(available))
        for col, (label, value) in zip(cols, available):
            if isinstance(value, (int, float)) and value > 10000:
                col.metric(label, f"{value:,.0f}")
            else:
                col.metric(label, value)

    st.divider()

    # --- Price history chart ---
    st.subheader("Stock Price History")
    price_df = load_price_history(trading_code)
    if not price_df.empty and "close_price" in price_df.columns:
        fig = px.line(
            price_df,
            x="date",
            y="close_price",
            labels={"date": "Date", "close_price": "Close Price (BDT)"},
        )
        _retro_fig(fig)
        fig.update_layout(hovermode="x unified", height=350, margin=dict(l=0, r=0, t=10, b=0))
        fig.update_traces(line=dict(color="#33ff33", width=2))
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.caption("Price history will appear here as more daily data is scraped.")

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
