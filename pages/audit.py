import pandas as pd
import streamlit as st
from collections import defaultdict


def render_audit_page():
    from app import get_mongo_db, load_latest_prices

    db = get_mongo_db()

    if st.button("<< BACK"):
        st.query_params.clear()
        st.rerun()

    st.markdown(
        '<div style="font-size:0.6rem;color:var(--text-muted);letter-spacing:2px;'
        'text-transform:uppercase;margin-bottom:4px">// Data Audit</div>'
        '<div style="font-size:1.2rem;font-weight:700;color:var(--primary);'
        'letter-spacing:1px;margin-bottom:16px">Database Coverage</div>',
        unsafe_allow_html=True,
    )

    # ── Load all data ──────────────────────────────────────────────────────
    companies = {
        d["trading_code"]: d.get("company_name", "")
        for d in db.companies.find({"excluded": {"$ne": True}}, {"trading_code": 1, "company_name": 1, "_id": 0})
    }

    # financials — count years per field
    fin = defaultdict(lambda: {"eps": 0, "profit": 0, "div": 0, "nav": 0})
    for doc in db.financials.find(
        {}, {"trading_code": 1, "eps_cont_basic": 1, "eps_basic": 1,
             "profit_mn": 1, "cash_dividend_pct": 1, "nav_per_share": 1, "_id": 0}
    ):
        code = doc.get("trading_code")
        if not code:
            continue
        if doc.get("eps_cont_basic") is not None or doc.get("eps_basic") is not None:
            fin[code]["eps"] += 1
        if doc.get("profit_mn") is not None:
            fin[code]["profit"] += 1
        if (doc.get("cash_dividend_pct") or 0) > 0:
            fin[code]["div"] += 1
        if doc.get("nav_per_share") is not None:
            fin[code]["nav"] += 1

    # company_financials_ext — count years per field
    ext = defaultdict(lambda: {"cf": 0, "ebit": 0, "rev": 0, "assets": 0, "gp": 0, "cash": 0, "debt": 0, "nii": 0})
    for doc in db.company_financials_ext.find(
        {}, {"trading_code": 1, "operating_cf": 1, "ebit": 1,
             "revenue": 1, "total_assets": 1, "gross_profit": 1,
             "cash_and_equivalents": 1, "total_debt": 1,
             "net_interest_income": 1, "_id": 0}
    ):
        code = doc.get("trading_code")
        if not code:
            continue
        if doc.get("operating_cf") is not None:
            ext[code]["cf"] += 1
        if doc.get("ebit") is not None:
            ext[code]["ebit"] += 1
        if doc.get("revenue") is not None:
            ext[code]["rev"] += 1
        if doc.get("total_assets") is not None:
            ext[code]["assets"] += 1
        if doc.get("gross_profit") is not None:
            ext[code]["gp"] += 1
        if doc.get("cash_and_equivalents") is not None:
            ext[code]["cash"] += 1
        if doc.get("total_debt") is not None:
            ext[code]["debt"] += 1
        if doc.get("net_interest_income") is not None:
            ext[code]["nii"] += 1

    holding_codes = set(db.shareholdings.distinct("trading_code"))
    prices = load_latest_prices()
    price_codes = {c for c, v in prices.items() if v.get("ltp")}
    news_counts = {
        d["_id"]: d["count"]
        for d in db.company_news.aggregate([
            {"$group": {"_id": "$trading_code", "count": {"$sum": 1}}}
        ])
    }

    # ── Build DataFrame ────────────────────────────────────────────────────
    rows = []
    for code, name in companies.items():
        rows.append({
            "Code":     code,
            "Name":     name,
            "EPS":      fin[code]["eps"],
            "Profit":   fin[code]["profit"],
            "Dividend": fin[code]["div"],
            "NAV":      fin[code]["nav"],
            "Oper CF":  ext[code]["cf"],
            "EBIT":     ext[code]["ebit"],
            "Revenue":  ext[code]["rev"],
            "Gr Profit": ext[code]["gp"],
            "Assets":   ext[code]["assets"],
            "Cash":     ext[code]["cash"],
            "Tot Debt": ext[code]["debt"],
            "NII":      ext[code]["nii"],
            "Holding":  "✓" if code in holding_codes else "✗",
            "Price":    "✓" if code in price_codes else "✗",
            "News":     news_counts.get(code, 0),
        })

    df = pd.DataFrame(rows).sort_values("Code").reset_index(drop=True)

    # ── Summary metrics ────────────────────────────────────────────────────
    total = len(df)
    has_financials = ((df["EPS"] >= 3) & (df["Profit"] >= 3)).sum()
    has_cf = (df["Oper CF"] >= 1).sum()
    missing_price = (df["Price"] == "✗").sum()

    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Total Companies", total)
    m2.metric("EPS ≥ 3 yrs + Profit ≥ 3 yrs", has_financials)
    m3.metric("Has CF Data", has_cf)
    m4.metric("Missing Price", missing_price)

    st.markdown("<div style='margin-bottom:12px'></div>", unsafe_allow_html=True)

    # ── Filters ────────────────────────────────────────────────────────────
    col_search, col_filter = st.columns([2, 3])
    with col_search:
        search = st.text_input("Search", placeholder="Code or name...", label_visibility="collapsed")
    with col_filter:
        view_filter = st.radio(
            "Filter", ["All", "Missing CF", "Missing financials", "Complete"],
            horizontal=True, label_visibility="collapsed",
        )

    filtered = df.copy()
    if search:
        mask = (
            filtered["Code"].str.contains(search, case=False, na=False)
            | filtered["Name"].str.contains(search, case=False, na=False)
        )
        filtered = filtered[mask]

    if view_filter == "Missing CF":
        filtered = filtered[filtered["Oper CF"] == 0]
    elif view_filter == "Missing financials":
        filtered = filtered[(filtered["EPS"] == 0) | (filtered["Profit"] == 0)]
    elif view_filter == "Complete":
        filtered = filtered[
            (filtered["EPS"] >= 3)
            & (filtered["Profit"] >= 3)
            & (filtered["Oper CF"] >= 1)
            & (filtered["Price"] == "✓")
            & (filtered["Holding"] == "✓")
        ]

    st.caption(f"Showing {len(filtered)} of {total} companies")

    # ── Styling ────────────────────────────────────────────────────────────
    INT_COLS = ["EPS", "Profit", "Dividend", "NAV", "Oper CF", "EBIT", "Revenue", "Gr Profit", "Assets", "Cash", "Tot Debt", "NII", "News"]

    def _color_years(val):
        if not isinstance(val, (int, float)):
            return ""
        if val >= 3:
            return "background-color:#0d2b1a;color:#4CAF7D"
        if val >= 1:
            return "background-color:#2b1f0a;color:#E0A040"
        return "background-color:#2b0d0d;color:#E07A5F"

    def _color_bool(val):
        if val == "✓":
            return "color:#4CAF7D;font-weight:700"
        if val == "✗":
            return "color:#E07A5F;font-weight:700"
        return ""

    styled = (
        filtered.style
        .applymap(_color_years, subset=INT_COLS)
        .applymap(_color_bool, subset=["Holding", "Price"])
        .set_properties(**{"font-size": "0.75rem"})
    )

    st.dataframe(styled, use_container_width=True, hide_index=True, height=600)
