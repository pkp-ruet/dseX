import pandas as pd
import plotly.express as px
import streamlit as st
from styles import style_fig


def render_detail_page(trading_code):
    from app import get_mongo_db, load_latest_prices, load_financials, load_shareholdings, load_company_news, load_dividend_declarations
    from scoring import _get_company_score_row, _generate_verdict

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
        f'  <div style="font-size:1.35rem;font-weight:700;color:var(--primary);letter-spacing:1px">'
        f'    {trading_code}'
        f'    <span style="color:var(--border);font-weight:400"> // </span>'
        f'    <span style="color:var(--text);font-size:1rem;font-weight:600">{name}</span>'
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
            "var(--primary)" if score >= 70
            else "var(--accent)" if score >= 40
            else "var(--negative)"
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
                "var(--primary)" if pct >= 0.70
                else "var(--accent)" if pct >= 0.40
                else "var(--negative)"
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
        price_date = latest.get("date", "")

        def _p(v, fmt=",.2f"):
            return f"{v:{fmt}}" if v is not None else "--"

        st.markdown(
            f'<div class="price-panel">'
            f'  <div style="font-size:0.6rem;color:var(--text-muted);letter-spacing:1.5px;'
            f'text-transform:uppercase;margin-bottom:8px">Last Trading Price &mdash; {price_date}</div>'
            f'  <div class="price-ltp-row">'
            f'    <span class="price-ltp">\u09f3{_p(ltp)}</span>'
            f'  </div>'
            f'  <div class="price-grid">'
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
    # Latest Dividend Declaration                                          #
    # ------------------------------------------------------------------ #
    all_decls = load_dividend_declarations()
    decl = next((d for d in all_decls if d.get("trading_code") == trading_code), None)
    if decl:
        decl_date = decl.get("declaration_date")
        rec_date = decl.get("record_date")
        dpct = decl.get("dividend_pct", 0)
        dtype = decl.get("dividend_type", "")
        st.markdown('<div class="section-label"><span>//</span> LATEST DIVIDEND DECLARATION</div>', unsafe_allow_html=True)
        d_cols = st.columns(3)
        d_cols[0].metric("Declaration Date", decl_date.strftime("%d %b %Y") if decl_date else "--")
        d_cols[1].metric("Record Date", rec_date.strftime("%d %b %Y") if rec_date else "--")
        d_cols[2].metric("Dividend", f"{dpct:.0f}% {dtype}" if dpct else f"No Dividend ({dtype})")

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
                style_fig(fig_eps)
                fig_eps.update_layout(height=300, margin=dict(l=0, r=0, t=40, b=0))
                st.plotly_chart(fig_eps, use_container_width=True, config={"staticPlot": True})

        with c2:
            if "profit_mn" in fin_df.columns and fin_df["profit_mn"].notna().any():
                fig_profit = px.bar(fin_df, x="year", y="profit_mn",
                    labels={"year": "Year", "profit_mn": "Profit (mn BDT)"},
                    title="Net Profit", text_auto=",.0f")
                style_fig(fig_profit)
                fig_profit.update_layout(height=300, margin=dict(l=0, r=0, t=40, b=0))
                st.plotly_chart(fig_profit, use_container_width=True, config={"staticPlot": True})

        # NAV per share (if scraped)
        if "nav_ps" in fin_df.columns and fin_df["nav_ps"].notna().any():
            c3, _ = st.columns(2)
            with c3:
                fig_nav = px.bar(fin_df, x="year", y="nav_ps",
                    labels={"year": "Year", "nav_ps": "NAV/Share (BDT)"},
                    title="Net Asset Value per Share", text_auto=".2f")
                style_fig(fig_nav)
                fig_nav.update_layout(height=300, margin=dict(l=0, r=0, t=40, b=0))
                st.plotly_chart(fig_nav, use_container_width=True, config={"staticPlot": True})

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
            style_fig(fig_div)
            fig_div.update_layout(height=300, margin=dict(l=0, r=0, t=40, b=0))
            st.plotly_chart(fig_div, use_container_width=True, config={"staticPlot": True})
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
                    textfont=dict(color="#2D3436"),
                    marker=dict(colors=["#1A6B5A", "#E07A5F", "#4CAF7D", "#636E72", "#B2BEC3"]),
                )
                style_fig(fig_pie)
                fig_pie.update_layout(height=360, margin=dict(l=0, r=0, t=36, b=0))
                st.plotly_chart(fig_pie, use_container_width=True, config={"staticPlot": True})

            with col_table:
                st.markdown("<br>", unsafe_allow_html=True)
                rows_html = []
                for label, val in zip(s_labels, s_values):
                    rows_html.append(
                        f'<div style="display:grid;grid-template-columns:140px 44px 1fr;'
                        f'gap:8px;align-items:center;padding:6px 0;'
                        f'border-bottom:1px solid var(--border-light);font-size:0.73rem">'
                        f'  <span style="color:var(--text-secondary)">{label}</span>'
                        f'  <span style="color:var(--primary);text-align:right;font-weight:700">{val:.1f}%</span>'
                        f'  <div style="height:4px;background:var(--border-light)">'
                        f'    <div style="height:4px;width:{int(val)}%;background:var(--primary)"></div>'
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
    # ------------------------------------------------------------------ #
    # News Feed                                                           #
    # ------------------------------------------------------------------ #
    st.markdown('<div class="section-label"><span>//</span> NEWS FEED</div>', unsafe_allow_html=True)
    news_items = load_company_news(trading_code)
    if news_items:
        for item in news_items:
            post_date = item.get("post_date", "")
            if hasattr(post_date, "strftime"):
                post_date = post_date.strftime("%Y-%m-%d")
            title = item.get("title", "—")
            body = item.get("body", "").strip()
            with st.expander(f"{post_date}  ·  {title}"):
                if body:
                    st.markdown(
                        f'<div style="font-size:0.78rem;color:var(--text-secondary);'
                        f'line-height:1.75;white-space:pre-wrap;font-family:\'IBM Plex Mono\',monospace">'
                        f'{body}</div>',
                        unsafe_allow_html=True,
                    )
                else:
                    st.caption("No body text available.")
    else:
        st.caption("No news stored yet. Run: python main.py scrape-news --code " + trading_code)

    avail = [(k, v) for k, v in info_pairs if v]
    if avail:
        st.markdown('<div class="section-label"><span>//</span> COMPANY INFO</div>', unsafe_allow_html=True)
        rows_html = "".join(
            f'<div style="display:flex;justify-content:space-between;padding:5px 0;'
            f'border-bottom:1px solid var(--border-light);font-size:0.75rem">'
            f'  <span style="color:var(--text-muted)">{k}</span>'
            f'  <span style="color:var(--text)">{v}</span>'
            f'</div>'
            for k, v in avail
        )
        st.markdown(
            f'<div style="border:1px solid var(--border);background:var(--bg-card);padding:12px 16px">{rows_html}</div>',
            unsafe_allow_html=True,
        )
