import pandas as pd
import plotly.express as px
from datetime import datetime, timedelta
import streamlit as st
from styles import style_fig


def render_detail_page(trading_code):
    from app import (
        get_mongo_db, load_latest_prices, load_financials,
        load_shareholdings, load_company_news,
        load_dividend_declarations, load_price_history,
        load_extended_financials,
    )
    from scoring import _get_company_score_row

    db = get_mongo_db()
    company = db.companies.find_one({"trading_code": trading_code}, {"_id": 0})
    if not company or company.get("excluded"):
        st.error(f"Company '{trading_code}' not found.")
        return

    # ── Preload all data ────────────────────────────────────────────────── #
    prices_map = load_latest_prices()
    latest     = prices_map.get(trading_code) or {}
    ltp        = latest.get("ltp")
    change     = latest.get("change")
    change_pct = latest.get("change_pct")
    price_date = latest.get("date", "")

    score_row = _get_company_score_row(trading_code)

    fin_df = load_financials(trading_code)
    if not fin_df.empty:
        fin_df["year"] = fin_df["year"].astype(str)
        if "eps_cont_basic" in fin_df.columns or "eps_basic" in fin_df.columns:
            fin_df["eps"] = (
                fin_df["eps_cont_basic"].combine_first(fin_df.get("eps_basic"))
                if "eps_cont_basic" in fin_df.columns
                else fin_df.get("eps_basic")
            )

    ext_df = load_extended_financials(trading_code)
    if not ext_df.empty:
        ext_df["year"] = ext_df["year"].astype(str)

    price_hist = load_price_history(trading_code)
    if not price_hist.empty and "date" in price_hist.columns:
        price_hist["date"] = pd.to_datetime(price_hist["date"], errors="coerce")
        price_hist = price_hist.sort_values("date")

    holdings = load_shareholdings(trading_code)

    # ── Derived scalars ─────────────────────────────────────────────────── #
    shares   = company.get("total_shares")
    face_v   = company.get("face_value")
    reserve_mn  = company.get("reserve_surplus_mn")
    paid_up_mn  = company.get("paid_up_capital_mn")
    loan_mn     = company.get("total_loan_mn")
    market_cat  = (company.get("market_category") or "").strip()

    eps_latest_v = nav_latest_v = div_pct_v = None
    if not fin_df.empty:
        if "eps" in fin_df.columns:
            s = fin_df["eps"].dropna()
            eps_latest_v = float(s.iloc[-1]) if len(s) else None
        nav_col = next((c for c in ["nav_per_share", "nav_ps"] if c in fin_df.columns), None)
        if nav_col:
            s = fin_df[nav_col].dropna()
            nav_latest_v = float(s.iloc[-1]) if len(s) else None
        if "cash_dividend_pct" in fin_df.columns:
            s = fin_df["cash_dividend_pct"].dropna()
            div_pct_v = float(s.iloc[-1]) if len(s) else None

    mcap_mn_v = score_row.get("mcap_mn") if score_row else None
    dps_v     = (div_pct_v * face_v / 100.0) if div_pct_v is not None and face_v else None
    pe_v      = (ltp / eps_latest_v) if ltp and eps_latest_v and eps_latest_v > 0 else None
    pb_v      = (ltp / nav_latest_v) if ltp and nav_latest_v and nav_latest_v > 0 else None
    div_yield_v = (dps_v / ltp * 100) if dps_v is not None and ltp and ltp > 0 else None
    payout_v    = (dps_v / eps_latest_v * 100) if dps_v and eps_latest_v and eps_latest_v > 0 else None

    # 5yr avg P/E and P/B
    avg_pe_5yr = avg_pb_5yr = None
    if not fin_df.empty:
        for col in ["pe_ratio_cont_basic", "pe_ratio_basic"]:
            if col in fin_df.columns:
                pe_vals = fin_df[col].dropna().astype(float)
                pe_vals = pe_vals[pe_vals > 0]
                if len(pe_vals) >= 2:
                    avg_pe_5yr = float(pe_vals.mean())
                    break
        pb_hist = []
        for _, r in fin_df.iterrows():
            pe  = r.get("pe_ratio_cont_basic") or r.get("pe_ratio_basic")
            eps = r.get("eps")
            nav = r.get("nav_per_share") or r.get("nav_ps")
            if pe and float(pe) > 0 and eps and float(eps) > 0 and nav and float(nav) > 0:
                pb_hist.append(float(pe) * float(eps) / float(nav))
        if len(pb_hist) >= 2:
            avg_pb_5yr = sum(pb_hist) / len(pb_hist)

    # 52w high/low
    now = datetime.now()
    w52_high = w52_low = None
    if not price_hist.empty and "ltp" in price_hist.columns:
        hist_1yr = price_hist[price_hist["date"] >= now - timedelta(days=365)]
        if not hist_1yr.empty:
            w52_high = float(hist_1yr["ltp"].max())
            w52_low  = float(hist_1yr["ltp"].min())

    def _rv(v, fmt=".2f", prefix="", suffix=""):
        if v is None or (isinstance(v, float) and pd.isna(v)):
            return "--"
        return f"{prefix}{v:{fmt}}{suffix}"

    # ── BACK button ─────────────────────────────────────────────────────── #
    if st.button("<< BACK", type="primary"):
        st.query_params.clear()
        st.rerun()

    # ===================================================================== #
    # 1. HEADER + VERDICT BAR                                               #
    # ===================================================================== #
    name    = company.get("company_name", trading_code)
    sector  = company.get("sector", "")
    sector_tag = (
        f'&nbsp;<span style="font-size:0.68rem;color:var(--text-muted);'
        f'border:1px solid #2a2a2a;padding:2px 8px;letter-spacing:1px">{sector}</span>'
        if sector else ""
    )
    st.markdown(
        f'<div style="margin-bottom:12px">'
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

    # Score
    score     = score_row.get("score") if score_row else None
    has_score = score is not None and not (isinstance(score, float) and pd.isna(score))
    score_color = (
        "var(--primary)" if (has_score and score >= 70)
        else "var(--accent)" if (has_score and score >= 40)
        else "var(--negative)"
    )
    overall_rank  = score_row.get("overall_rank")  if score_row else None
    total_scored  = score_row.get("total_scored", 0) if score_row else 0
    rank_text = f"Rank #{overall_rank} of {total_scored}" if overall_rank else ""

    # LTP change badge
    change_html = ""
    if change is not None:
        cls  = "price-change-pos" if change > 0 else "price-change-neg" if change < 0 else "price-change-neu"
        sign = "+" if change > 0 else ""
        pct_part = f" ({sign}{change_pct:.2f}%)" if change_pct is not None else ""
        change_html = f'<span class="{cls}">{sign}{change:.2f}{pct_part}</span>'

    # P/E context
    pe_context_color = "var(--text)"
    if pe_v and avg_pe_5yr and avg_pe_5yr > 0:
        r = pe_v / avg_pe_5yr
        if r < 0.85:
            pe_context = f"{pe_v:.1f}x vs avg {avg_pe_5yr:.1f}x — CHEAP"
            pe_context_color = "var(--positive)"
        elif r > 1.2:
            pe_context = f"{pe_v:.1f}x vs avg {avg_pe_5yr:.1f}x — EXPENSIVE"
            pe_context_color = "var(--negative)"
        else:
            pe_context = f"{pe_v:.1f}x vs avg {avg_pe_5yr:.1f}x — FAIR"
            pe_context_color = "var(--accent)"
    else:
        pe_context = _rv(pe_v, ".1f", suffix="x")

    # P/B context
    pb_context_color = "var(--text)"
    if pb_v and avg_pb_5yr and avg_pb_5yr > 0:
        r = pb_v / avg_pb_5yr
        if r < 0.85:
            pb_context = f"{pb_v:.2f}x vs avg {avg_pb_5yr:.2f}x — CHEAP"
            pb_context_color = "var(--positive)"
        elif r > 1.2:
            pb_context = f"{pb_v:.2f}x vs avg {avg_pb_5yr:.2f}x — EXPENSIVE"
            pb_context_color = "var(--negative)"
        else:
            pb_context = f"{pb_v:.2f}x vs avg {avg_pb_5yr:.2f}x — FAIR"
            pb_context_color = "var(--accent)"
    else:
        pb_context = _rv(pb_v, ".2f", suffix="x")

    # Auto-narrative
    narrative = ""
    if has_score and score_row:
        p4 = score_row.get("p4_val") or 0
        if score >= 70 and p4 >= 7:
            narrative = "Strong fundamentals trading at a historically attractive valuation — high-conviction value play."
        elif score >= 70:
            narrative = "Strong business quality and healthy balance sheet; monitor valuation before entry."
        elif score >= 50 and p4 >= 7:
            narrative = "Decent fundamentals trading cheap vs history — selective accumulation may be warranted."
        elif score >= 40:
            narrative = "Mixed signals across pillars; requires deeper due diligence before investing."
        else:
            narrative = "Weak fundamentals across multiple pillars — speculative or avoid."

    st.markdown(
        f'<div class="verdict-bar">'
        f'  <div class="vb-cell vb-score">'
        f'    <div class="vb-label">dseX Score</div>'
        f'    <div class="vb-score-num" style="color:{score_color}">'
        f'      {f"{score:.1f}" if has_score else "--"}'
        f'    </div>'
        f'    <div class="vb-sub">{rank_text}</div>'
        f'  </div>'
        f'  <div class="vb-cell">'
        f'    <div class="vb-label">Last Price &mdash; {price_date}</div>'
        f'    <div class="vb-val">{_rv(ltp, ",.2f", "৳") if ltp else "--"}</div>'
        f'    <div class="vb-sub">{change_html}</div>'
        f'  </div>'
        f'  <div class="vb-cell">'
        f'    <div class="vb-label">P/E vs 5yr Avg</div>'
        f'    <div class="vb-val" style="color:{pe_context_color};font-size:0.78rem">{pe_context}</div>'
        f'  </div>'
        f'  <div class="vb-cell">'
        f'    <div class="vb-label">P/B vs 5yr Avg</div>'
        f'    <div class="vb-val" style="color:{pb_context_color};font-size:0.78rem">{pb_context}</div>'
        f'  </div>'
        f'  <div class="vb-cell">'
        f'    <div class="vb-label">Dividend Yield</div>'
        f'    <div class="vb-val">{_rv(div_yield_v, ".2f", suffix="%")}</div>'
        f'    <div class="vb-sub">cash div / LTP</div>'
        f'  </div>'
        f'</div>'
        + (f'<div class="verdict-narrative">{narrative}</div>' if narrative else ""),
        unsafe_allow_html=True,
    )

    # ===================================================================== #
    # 2. SIGNAL FLAGS                                                        #
    # ===================================================================== #
    green_flags, red_flags = [], []

    if score_row:
        if (score_row.get("p1_eps_consist") or 0) >= 8:
            green_flags.append("EPS positive 4+ of 5 years")
        if (score_row.get("p2_cfo") or 0) >= 4:
            green_flags.append("CFO positive 3+ years")
        if (score_row.get("p5_consist") or 0) >= 7:
            green_flags.append("Consistent dividend payer (4+ years)")
        if (score_row.get("p4_pe") or 0) >= 8:
            green_flags.append("Currently cheap vs historical P/E")

    if holdings:
        spon_pct_flag = holdings[0].get("sponsor_director_pct")
        if spon_pct_flag and spon_pct_flag > 30:
            green_flags.append(f"Sponsor holding {spon_pct_flag:.1f}% (strong alignment)")

    if eps_latest_v is not None and eps_latest_v < 0:
        red_flags.append("Latest EPS is negative")
    if reserve_mn and loan_mn and reserve_mn > 0 and loan_mn > 2 * reserve_mn:
        red_flags.append("Total loan > 2× reserve surplus")
    if payout_v is not None and payout_v > 90:
        red_flags.append(f"Payout ratio {payout_v:.0f}% — potentially unsustainable")
    if score_row and (score_row.get("p4_pe") or 5) <= 1.0:
        red_flags.append("P/E more than 20% above 5yr average")
    if market_cat and market_cat.upper() != "A":
        red_flags.append(f"Market category: {market_cat} (not 'A')")

    if green_flags or red_flags:
        st.markdown('<div class="section-label"><span>//</span> SIGNAL FLAGS</div>', unsafe_allow_html=True)
        col_g, col_r = st.columns(2)
        with col_g:
            if green_flags:
                st.markdown(
                    '<div class="flags-col">'
                    + "".join(f'<div class="flag-green">&#10003; {f}</div>' for f in green_flags)
                    + '</div>',
                    unsafe_allow_html=True,
                )
            else:
                st.markdown('<div style="color:var(--text-muted);font-size:0.78rem">No green flags detected.</div>', unsafe_allow_html=True)
        with col_r:
            if red_flags:
                st.markdown(
                    '<div class="flags-col">'
                    + "".join(f'<div class="flag-red">&#9888; {f}</div>' for f in red_flags)
                    + '</div>',
                    unsafe_allow_html=True,
                )
            else:
                st.markdown('<div class="flag-green" style="display:inline-block">&#10003; No red flags detected</div>', unsafe_allow_html=True)

    # ===================================================================== #
    # 3. SCORE PILLARS (condensed)                                          #
    # ===================================================================== #
    if score_row and has_score:
        _PILLARS = [
            ("p1_biz",    "Business Quality",  "EPS consistency, CAGR, ROE, NPM trend",
             [("p1_eps_consist", "EPS Consist"), ("p1_eps_cagr", "EPS CAGR"),
              ("p1_roe", "ROE"), ("p1_npm_trend", "NPM Trend")]),
            ("p2_health", "Financial Health",  "D/E, interest coverage, CFO quality",
             [("p2_de", "D/E"), ("p2_ic", "Int. Cov."),
              ("p2_cfo", "CFO"), ("p2_cash", "Cash/Assets")]),
            ("p3_moat",   "Competitive Moat",  "Gross margin/NIM, revenue volatility, sector rank",
             [("p3_margin", "Margin"), ("p3_rev_vol", "Rev. Vol."),
              ("p3_sector_rank", "Sector Rank")]),
            ("p4_val",    "Valuation",         "P/E & P/B vs 5yr avg",
             [("p4_pe", "P/E"), ("p4_pb", "P/B")]),
            ("p5_div",    "Dividend Quality",  "DPS CAGR, consistency, yield",
             [("p5_dps_cagr", "DPS CAGR"), ("p5_consist", "Consistency"),
              ("p5_yield", "Yield")]),
        ]

        st.markdown('<div class="section-label"><span>//</span> SCORE PILLARS</div>', unsafe_allow_html=True)
        rows_html = []
        for key, label, desc, subs in _PILLARS:
            fs = score_row.get(key)
            has_fs = fs is not None and not (isinstance(fs, float) and pd.isna(fs))
            if has_fs:
                bar_w = int(fs / 10 * 100)
                bar_color = (
                    "var(--primary)" if fs >= 7
                    else "var(--accent)" if fs >= 4
                    else "var(--negative)"
                )
                sub_vals = [(k, n, score_row.get(k)) for k, n in subs
                            if score_row.get(k) is not None]
                weakest = min(sub_vals, key=lambda x: x[2]) if sub_vals else None
                weak_html = (
                    f'&nbsp;<span style="font-size:0.6rem;color:var(--negative)">'
                    f'weak: {weakest[1]} {weakest[2]:.1f}/10</span>'
                    if weakest and weakest[2] < 5 else ""
                )
                score_str = f"{fs:.1f}"
            else:
                bar_w, bar_color, weak_html, score_str = 0, "var(--border)", "", "--"

            rows_html.append(
                f'<div class="factor-row">'
                f'  <span class="fr-name">{label}{weak_html}</span>'
                f'  <span class="fr-val" title="{desc}">{score_str}</span>'
                f'  <div class="fr-bar-wrap">'
                f'    <div class="fr-bar-fill" style="width:{bar_w}%;background:{bar_color}"></div>'
                f'  </div>'
                f'  <span class="fr-pct">{bar_w if has_fs else "--"}</span>'
                f'</div>'
            )

        st.markdown(
            '<div class="score-panel">' + "".join(rows_html) + '</div>',
            unsafe_allow_html=True,
        )

    # ===================================================================== #
    # 4. PRICE CHART + VALUATION CONTEXT                                    #
    # ===================================================================== #
    st.markdown('<div class="section-label"><span>//</span> PRICE HISTORY</div>', unsafe_allow_html=True)

    if not price_hist.empty and "ltp" in price_hist.columns:
        time_range = st.radio(
            "Range", ["1 Year", "2 Years", "All Time"],
            horizontal=True, label_visibility="collapsed", key="price_range",
        )
        cutoff = {
            "1 Year":   now - timedelta(days=365),
            "2 Years":  now - timedelta(days=730),
            "All Time": price_hist["date"].min(),
        }[time_range]
        ph_filtered = price_hist[price_hist["date"] >= cutoff]

        col_chart, col_val = st.columns([3, 1])
        with col_chart:
            fig_p = px.line(ph_filtered, x="date", y="ltp",
                            labels={"date": "", "ltp": "LTP (BDT)"})
            fig_p.update_traces(line_color="#1A6B5A", line_width=1.5)
            style_fig(fig_p)
            fig_p.update_layout(height=280, margin=dict(l=0, r=0, t=10, b=0))
            st.plotly_chart(fig_p, use_container_width=True, config={"staticPlot": True})

        with col_val:
            st.markdown("<br>", unsafe_allow_html=True)

            def _vc(label, val_str, color="var(--text)"):
                return (
                    f'<div style="padding:6px 0;border-bottom:1px solid var(--border-light)">'
                    f'  <div style="font-size:0.57rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">{label}</div>'
                    f'  <div style="font-size:0.85rem;font-weight:600;color:{color}">{val_str}</div>'
                    f'</div>'
                )

            st.markdown(
                '<div style="border:1px solid var(--border);background:var(--bg-card);'
                'padding:12px 16px;border-radius:var(--radius)">'
                '<div style="font-size:0.57rem;color:var(--text-muted);text-transform:uppercase;'
                'letter-spacing:1.5px;margin-bottom:6px">Valuation</div>'
                + _vc("P/E Ratio",    _rv(pe_v,        ".1f", suffix="x"), "var(--primary)")
                + _vc("5yr Avg P/E",  _rv(avg_pe_5yr,  ".1f", suffix="x"))
                + _vc("P/B Ratio",    _rv(pb_v,        ".2f", suffix="x"), "var(--primary)")
                + _vc("5yr Avg P/B",  _rv(avg_pb_5yr,  ".2f", suffix="x"))
                + _vc("Market Cap",   _rv(mcap_mn_v,   ",.0f", suffix=" mn"))
                + _vc("52w High",     _rv(w52_high,    ",.2f", "৳"), "var(--positive)")
                + _vc("52w Low",      _rv(w52_low,     ",.2f", "৳"), "var(--negative)")
                + '</div>',
                unsafe_allow_html=True,
            )
    else:
        st.caption("No price history available.")

    # ===================================================================== #
    # 5. FINANCIAL PERFORMANCE (2×2 grid + ROE)                             #
    # ===================================================================== #
    st.markdown('<div class="section-label"><span>//</span> FINANCIAL PERFORMANCE</div>', unsafe_allow_html=True)

    if not fin_df.empty:
        r1c1, r1c2 = st.columns(2)
        r2c1, r2c2 = st.columns(2)

        with r1c1:
            if not ext_df.empty and "revenue" in ext_df.columns and ext_df["revenue"].notna().any():
                rev_vars = ["revenue"]
                if "gross_profit" in ext_df.columns and ext_df["gross_profit"].notna().any():
                    rev_vars.append("gross_profit")
                melt = ext_df.melt(id_vars=["year"], value_vars=rev_vars,
                                   var_name="Metric", value_name="Value (mn BDT)")
                melt["Metric"] = melt["Metric"].map(
                    {"revenue": "Revenue", "gross_profit": "Gross Profit"}
                )
                melt = melt.dropna(subset=["Value (mn BDT)"])
                fig = px.bar(melt, x="year", y="Value (mn BDT)", color="Metric",
                             barmode="group", title="Revenue & Gross Profit", text_auto=",.0f")
                style_fig(fig)
                fig.update_layout(height=300, margin=dict(l=0, r=0, t=40, b=0))
                st.plotly_chart(fig, use_container_width=True, config={"staticPlot": True})
            else:
                st.caption("No revenue data (run scrape-details).")

        with r1c2:
            if "eps" in fin_df.columns and fin_df["eps"].notna().any():
                fig = px.bar(fin_df, x="year", y="eps",
                             labels={"year": "Year", "eps": "EPS (BDT)"},
                             title="Earnings Per Share", text_auto=".2f")
                style_fig(fig)
                fig.update_layout(height=300, margin=dict(l=0, r=0, t=40, b=0))
                st.plotly_chart(fig, use_container_width=True, config={"staticPlot": True})

        with r2c1:
            if "profit_mn" in fin_df.columns and fin_df["profit_mn"].notna().any():
                fig = px.bar(fin_df, x="year", y="profit_mn",
                             labels={"year": "Year", "profit_mn": "Profit (mn BDT)"},
                             title="Net Profit", text_auto=",.0f")
                style_fig(fig)
                fig.update_layout(height=300, margin=dict(l=0, r=0, t=40, b=0))
                st.plotly_chart(fig, use_container_width=True, config={"staticPlot": True})

        with r2c2:
            nc = next((c for c in ["nav_per_share", "nav_ps"]
                       if c in fin_df.columns and fin_df[c].notna().any()), None)
            if nc:
                fig = px.bar(fin_df, x="year", y=nc,
                             labels={"year": "Year", nc: "NAV/Share (BDT)"},
                             title="Net Asset Value per Share", text_auto=".2f")
                style_fig(fig)
                fig.update_layout(height=300, margin=dict(l=0, r=0, t=40, b=0))
                st.plotly_chart(fig, use_container_width=True, config={"staticPlot": True})

        # ROE trend (full-width)
        if (not ext_df.empty
                and "net_profit" in ext_df.columns
                and "total_equity" in ext_df.columns):
            roe_df = ext_df[
                ext_df["net_profit"].notna()
                & ext_df["total_equity"].notna()
                & (ext_df["total_equity"] > 0)
            ].copy()
            if len(roe_df) >= 2:
                roe_df["roe_pct"] = roe_df["net_profit"] / roe_df["total_equity"] * 100
                fig = px.line(roe_df, x="year", y="roe_pct",
                              labels={"year": "Year", "roe_pct": "ROE (%)"},
                              title="Return on Equity (%)", markers=True)
                fig.update_traces(line_color="#1A6B5A", line_width=2)
                style_fig(fig)
                fig.update_layout(height=220, margin=dict(l=0, r=0, t=40, b=0))
                st.plotly_chart(fig, use_container_width=True, config={"staticPlot": True})
    else:
        st.caption("No financial data yet. Run `python main.py scrape-details` to populate.")

    # ===================================================================== #
    # 6. CASH FLOW QUALITY                                                  #
    # ===================================================================== #
    if (not ext_df.empty
            and "operating_cf" in ext_df.columns
            and ext_df["operating_cf"].notna().any()):
        st.markdown('<div class="section-label"><span>//</span> CASH FLOW QUALITY</div>', unsafe_allow_html=True)

        col_cf, col_cfcard = st.columns([2, 1])
        with col_cf:
            cf_df = ext_df[ext_df["operating_cf"].notna()].copy()
            if "net_profit" in ext_df.columns:
                cf_df = cf_df[cf_df["net_profit"].notna()].copy()
                melt = cf_df.melt(id_vars=["year"],
                                  value_vars=["operating_cf", "net_profit"],
                                  var_name="Metric", value_name="Value (mn BDT)")
                melt["Metric"] = melt["Metric"].map(
                    {"operating_cf": "Operating CF", "net_profit": "Net Profit"}
                )
                melt = melt.dropna(subset=["Value (mn BDT)"])
                fig = px.bar(melt, x="year", y="Value (mn BDT)", color="Metric",
                             barmode="group", title="Operating CF vs Net Profit",
                             text_auto=",.0f")
                style_fig(fig)
                fig.update_layout(height=280, margin=dict(l=0, r=0, t=40, b=0))
                st.plotly_chart(fig, use_container_width=True, config={"staticPlot": True})

        with col_cfcard:
            st.markdown("<br>", unsafe_allow_html=True)
            last_ext = ext_df.iloc[-1].to_dict()
            cfo   = last_ext.get("operating_cf")
            np_   = last_ext.get("net_profit")
            capex = last_ext.get("capex")

            cfo_ratio = (cfo / np_) if cfo and np_ and np_ != 0 else None
            fcf       = (cfo - abs(capex)) if cfo is not None and capex is not None else None
            fcf_ps    = (fcf / shares * 1e6) if fcf is not None and shares else None

            ratio_color = (
                "var(--positive)" if cfo_ratio and cfo_ratio > 1
                else "var(--accent)" if cfo_ratio and cfo_ratio > 0.7
                else "var(--negative)"
            )

            def _cfv(label, val_str, color="var(--text)"):
                return (
                    f'<div style="padding:8px 0;border-bottom:1px solid var(--border-light)">'
                    f'  <div style="font-size:0.57rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">{label}</div>'
                    f'  <div style="font-size:0.9rem;font-weight:600;color:{color}">{val_str}</div>'
                    f'</div>'
                )

            st.markdown(
                '<div style="border:1px solid var(--border);background:var(--bg-card);'
                'padding:12px 16px;border-radius:var(--radius)">'
                '<div style="font-size:0.57rem;color:var(--text-muted);text-transform:uppercase;'
                'letter-spacing:1.5px;margin-bottom:6px">CF Metrics (Latest Year)</div>'
                + _cfv("CFO / Net Profit", _rv(cfo_ratio, ".2f", suffix="x"), ratio_color)
                + _cfv("Free Cash Flow",   _rv(fcf,       ",.0f", suffix=" mn BDT"))
                + _cfv("FCF per Share",    _rv(fcf_ps,    ".2f",  "৳"))
                + '</div>',
                unsafe_allow_html=True,
            )

    # ===================================================================== #
    # 7. DIVIDENDS (merged)                                                 #
    # ===================================================================== #
    st.markdown('<div class="section-label"><span>//</span> DIVIDENDS</div>', unsafe_allow_html=True)

    all_decls = load_dividend_declarations()
    decl = next((d for d in all_decls if d.get("trading_code") == trading_code), None)
    if decl:
        decl_date = decl.get("declaration_date")
        rec_date  = decl.get("record_date")
        dpct      = decl.get("dividend_pct", 0)
        dtype     = decl.get("dividend_type", "")
        d_cols = st.columns(3)
        d_cols[0].metric("Declaration Date", decl_date.strftime("%d %b %Y") if decl_date else "--")
        d_cols[1].metric("Record Date",       rec_date.strftime("%d %b %Y")  if rec_date  else "--")
        d_cols[2].metric("Dividend",          f"{dpct:.0f}% {dtype}" if dpct else f"No Dividend ({dtype})")

    if not fin_df.empty:
        div_cols_avail = [c for c in ["cash_dividend_pct", "stock_dividend_pct"] if c in fin_df.columns]
        has_div = any(fin_df[c].notna().any() for c in div_cols_avail) if div_cols_avail else False
        if has_div:
            div_melt = fin_df.melt(id_vars=["year"], value_vars=div_cols_avail,
                                   var_name="Type", value_name="Dividend %")
            div_melt["Type"] = div_melt["Type"].map(
                {"cash_dividend_pct": "Cash", "stock_dividend_pct": "Stock (Bonus)"}
            )
            div_melt = div_melt.dropna(subset=["Dividend %"])
            fig = px.bar(div_melt, x="year", y="Dividend %", color="Type",
                         barmode="group", title="Dividend History (%)", text_auto=".0f")
            style_fig(fig)
            fig.update_layout(height=280, margin=dict(l=0, r=0, t=40, b=0))
            st.plotly_chart(fig, use_container_width=True, config={"staticPlot": True})

        # Payout ratio trend + streak
        if ("eps" in fin_df.columns and "cash_dividend_pct" in fin_df.columns and face_v):
            payout_rows = []
            for _, r in fin_df.iterrows():
                e = r.get("eps")
                d = r.get("cash_dividend_pct")
                if e and float(e) > 0 and d and float(d) > 0:
                    dps_r = float(d) * float(face_v) / 100.0
                    payout_rows.append({"year": r["year"], "payout_pct": dps_r / float(e) * 100})

            streak = 0
            for _, r in fin_df.sort_values("year", ascending=False).iterrows():
                if (r.get("cash_dividend_pct") or 0) > 0:
                    streak += 1
                else:
                    break

            if payout_rows:
                payout_df = pd.DataFrame(payout_rows)
                col_pay, col_streak = st.columns([3, 1])
                with col_pay:
                    fig = px.line(payout_df, x="year", y="payout_pct",
                                  labels={"year": "Year", "payout_pct": "Payout Ratio (%)"},
                                  title="Payout Ratio Trend (%)", markers=True)
                    fig.update_traces(line_color="#E07A5F", line_width=2)
                    fig.add_hline(y=90, line_dash="dash", line_color="#D45B5B",
                                  annotation_text="90% threshold")
                    style_fig(fig)
                    fig.update_layout(height=220, margin=dict(l=0, r=0, t=40, b=0))
                    st.plotly_chart(fig, use_container_width=True, config={"staticPlot": True})
                with col_streak:
                    st.markdown("<br><br>", unsafe_allow_html=True)
                    st.metric("Dividend Streak",
                              f"{streak} yr{'s' if streak != 1 else ''}",
                              help="Consecutive years with cash dividend")
    else:
        st.caption("No dividend data available.")

    # ===================================================================== #
    # 8. SHAREHOLDING PATTERN (enhanced)                                    #
    # ===================================================================== #
    st.markdown('<div class="section-label"><span>//</span> SHAREHOLDING PATTERN</div>', unsafe_allow_html=True)

    if holdings:
        latest_h = holdings[0]
        hold_meta = [
            ("sponsor_director_pct", "Sponsor / Director"),
            ("govt_pct",             "Government"),
            ("institute_pct",        "Institute"),
            ("foreign_pct",          "Foreign"),
            ("public_pct",           "General Public"),
        ]
        s_labels = [lbl for key, lbl in hold_meta if (latest_h.get(key) or 0) > 0]
        s_values = [latest_h[key] for key, _ in hold_meta if (latest_h.get(key) or 0) > 0]

        if s_values:
            spon_pct = latest_h.get("sponsor_director_pct")
            if spon_pct:
                if spon_pct >= 50:
                    spon_tag = (f'<span style="background:var(--primary-light);color:var(--primary);'
                                f'padding:3px 12px;border-radius:20px;font-size:0.7rem;font-weight:600">'
                                f'Sponsor {spon_pct:.1f}% — High Confidence</span>')
                elif spon_pct < 20:
                    spon_tag = (f'<span style="background:#FFF8EB;color:#B87820;'
                                f'padding:3px 12px;border-radius:20px;font-size:0.7rem;font-weight:600">'
                                f'Sponsor {spon_pct:.1f}% — Low Alignment</span>')
                else:
                    spon_tag = (f'<span style="background:var(--bg-input);color:var(--text-secondary);'
                                f'padding:3px 12px;border-radius:20px;font-size:0.7rem">'
                                f'Sponsor {spon_pct:.1f}%</span>')

                if len(holdings) >= 2:
                    old_spon = holdings[-1].get("sponsor_director_pct")
                    if old_spon and abs(spon_pct - old_spon) > 0.5:
                        arrow = "&#9650;" if spon_pct > old_spon else "&#9660;"
                        tc = "var(--positive)" if spon_pct > old_spon else "var(--negative)"
                        spon_tag += (f' <span style="color:{tc};font-size:0.7rem">'
                                     f'{arrow} was {old_spon:.1f}%</span>')

                st.markdown(f'<div style="margin-bottom:12px">{spon_tag}</div>', unsafe_allow_html=True)

            col_pie, col_tbl = st.columns([3, 2])
            with col_pie:
                fig = px.pie(names=s_labels, values=s_values,
                             title=f"As of {latest_h.get('as_of_date', 'N/A')}",
                             hole=0.40)
                fig.update_traces(
                    textinfo="label+percent", textposition="outside",
                    textfont=dict(color="#2D3436"),
                    marker=dict(colors=["#1A6B5A", "#E07A5F", "#4CAF7D", "#636E72", "#B2BEC3"]),
                )
                style_fig(fig)
                fig.update_layout(height=360, margin=dict(l=0, r=0, t=36, b=0))
                st.plotly_chart(fig, use_container_width=True, config={"staticPlot": True})

            with col_tbl:
                st.markdown("<br>", unsafe_allow_html=True)
                rows_html = "".join(
                    f'<div style="display:grid;grid-template-columns:140px 44px 1fr;'
                    f'gap:8px;align-items:center;padding:6px 0;'
                    f'border-bottom:1px solid var(--border-light);font-size:0.73rem">'
                    f'  <span style="color:var(--text-secondary)">{lbl}</span>'
                    f'  <span style="color:var(--primary);text-align:right;font-weight:700">{val:.1f}%</span>'
                    f'  <div style="height:4px;background:var(--border-light)">'
                    f'    <div style="height:4px;width:{int(val)}%;background:var(--primary)"></div>'
                    f'  </div>'
                    f'</div>'
                    for lbl, val in zip(s_labels, s_values)
                )
                st.markdown(
                    '<div style="border:1px solid var(--border);background:var(--bg-card);'
                    'padding:12px 16px;margin-top:8px;border-radius:var(--radius)">'
                    '<div style="font-size:0.57rem;color:var(--text-muted);text-transform:uppercase;'
                    'letter-spacing:1.5px;margin-bottom:10px">Breakdown</div>'
                    + rows_html + '</div>',
                    unsafe_allow_html=True,
                )
    else:
        st.caption("No shareholding data yet. Run `python main.py scrape-details` to populate.")

    # ===================================================================== #
    # 9. COMPANY FUNDAMENTALS                                               #
    # ===================================================================== #
    reserve_ps = (reserve_mn * 1e6 / shares) if reserve_mn and shares else None
    debt_ps    = (loan_mn    * 1e6 / shares) if loan_mn    and shares else None
    bv_ps      = (paid_up_mn * 1e6 / shares) if paid_up_mn and shares else None

    info_pairs = [
        ("Face Value",             f"৳{face_v}"                       if face_v     else None),
        ("Paid-up Capital",        f"৳{paid_up_mn:,.2f} mn"           if paid_up_mn else None),
        ("Total Shares",           f"{shares:,}"                       if shares     else None),
        ("Reserve & Surplus",      f"৳{reserve_mn:,.2f} mn"           if reserve_mn else None),
        ("Total Loan",             f"৳{loan_mn:,.2f} mn"              if loan_mn    else None),
        ("Reserve per Share",      f"৳{reserve_ps:,.2f}"              if reserve_ps else None),
        ("Debt per Share",         f"৳{debt_ps:,.2f}"                 if debt_ps    else None),
        ("Book Value per Share",   f"৳{bv_ps:,.2f}"                   if bv_ps      else None),
        ("Listing Year",           str(company.get("listing_year"))    if company.get("listing_year") else None),
        ("Market Category",        market_cat                          if market_cat else None),
    ]
    avail = [(k, v) for k, v in info_pairs if v]
    if avail:
        st.markdown('<div class="section-label"><span>//</span> COMPANY FUNDAMENTALS</div>', unsafe_allow_html=True)
        rows_html = "".join(
            f'<div style="display:flex;justify-content:space-between;padding:5px 0;'
            f'border-bottom:1px solid var(--border-light);font-size:0.75rem">'
            f'  <span style="color:var(--text-muted)">{k}</span>'
            f'  <span style="color:var(--text)">{v}</span>'
            f'</div>'
            for k, v in avail
        )
        st.markdown(
            f'<div style="border:1px solid var(--border);background:var(--bg-card);'
            f'padding:12px 16px;border-radius:var(--radius)">{rows_html}</div>',
            unsafe_allow_html=True,
        )

    # ===================================================================== #
    # 10. NEWS FEED                                                         #
    # ===================================================================== #
    st.markdown('<div class="section-label"><span>//</span> NEWS FEED</div>', unsafe_allow_html=True)
    news_items = load_company_news(trading_code)
    if news_items:
        for item in news_items:
            post_date = item.get("post_date", "")
            if hasattr(post_date, "strftime"):
                post_date = post_date.strftime("%Y-%m-%d")
            title = item.get("title", "—")
            body  = item.get("body", "").strip()
            with st.expander(f"{post_date}  ·  {title}"):
                if body:
                    st.markdown(
                        f'<div style="font-size:0.78rem;color:var(--text-secondary);'
                        f'line-height:1.75;white-space:pre-wrap;'
                        f'font-family:\'IBM Plex Mono\',monospace">{body}</div>',
                        unsafe_allow_html=True,
                    )
                else:
                    st.caption("No body text available.")
    else:
        st.caption("No news stored yet. Run: python main.py scrape-news --code " + trading_code)
