import streamlit as st
from datetime import datetime, date as _date


def render_homepage():
    from app import load_companies, load_latest_prices, load_dividend_declarations
    from scoring import _build_scores_df, _top_strengths, _worst_factor, _generate_verdict

    companies_raw = load_companies()
    prices_map = load_latest_prices()
    score_df = _build_scores_df()

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

    score_df["name"] = score_df["trading_code"].map(lambda c: comp_map.get(c, {}).get("name", c))
    score_df["sector"] = score_df["trading_code"].map(lambda c: comp_map.get(c, {}).get("sector", ""))

    scored = score_df[score_df["score"].notna()].sort_values("score", ascending=False).reset_index(drop=True)
    total = len(scored)

    sector_avg = (
        scored[scored["sector"] != ""]
        .groupby("sector")["score"]
        .mean()
        .sort_values(ascending=False)
    )

    # --- Header row: title left, search right ---
    head_left, head_right = st.columns([3, 2])
    with head_left:
        st.markdown(
            '<span style="font-size:1.4rem;font-weight:800;color:var(--primary);letter-spacing:1px">dseX</span>'
            '<span style="font-size:0.78rem;color:var(--text-secondary);margin-left:10px">'
            'Smart Stock Insights</span>',
            unsafe_allow_html=True,
        )
    with head_right:
        search = st.text_input(
            "Search", key="search",
            placeholder="Search company...",
            label_visibility="collapsed",
        )

    if search:
        mask = (
            scored["trading_code"].str.contains(search, case=False, na=False)
            | scored["name"].str.contains(search, case=False, na=False)
        )
        scored = scored[mask].reset_index(drop=True)
        # If exact match, navigate to detail page
        if len(scored) == 1:
            st.query_params["code"] = scored.iloc[0]["trading_code"]
            st.rerun()

    st.markdown(
        '<div style="text-align:center;margin:8px 0 4px">'
        '  <span style="background:linear-gradient(135deg,var(--primary),var(--accent));'
        '-webkit-background-clip:text;-webkit-text-fill-color:transparent;'
        'font-size:0.82rem;font-weight:700;letter-spacing:0.5px">'
        'AI-Powered Fundamental Analysis</span>'
        '</div>',
        unsafe_allow_html=True,
    )

    # --- Top 10 ---
    top_n = min(10, len(scored))
    if top_n > 0:
        st.markdown('<div class="tier-label top10">// top 10 //</div>', unsafe_allow_html=True)
        chips = []
        for i in range(top_n):
            r = scored.iloc[i].to_dict()
            code = r["trading_code"]
            score = r["score"]
            chips.append(
                f'<a class="chip chip-top" href="?code={code}" target="_self">'
                f'  <span class="chip-rank">#{i+1}</span>'
                f'  <span class="chip-code">{code}</span>'
                f'</a>'
            )
        st.markdown('<div class="chip-grid">' + "".join(chips) + "</div>", unsafe_allow_html=True)

    # --- Next 20 ---
    mid_start = top_n
    mid_end = min(mid_start + 20, len(scored))
    if mid_end > mid_start:
        st.markdown('<div class="tier-label mid20">// next 20 //</div>', unsafe_allow_html=True)
        chips = []
        for i in range(mid_start, mid_end):
            r = scored.iloc[i].to_dict()
            code = r["trading_code"]
            score = r["score"]
            chips.append(
                f'<a class="chip chip-mid" href="?code={code}" target="_self">'
                f'  <span class="chip-code">{code}</span>'
                f'</a>'
            )
        st.markdown('<div class="chip-grid">' + "".join(chips) + "</div>", unsafe_allow_html=True)

    # --- Danger zone (red chips) ---
    danger_n = min(30, total)
    danger_df = scored.iloc[max(0, total - danger_n):]
    if len(danger_df) > 0 and not search:
        st.markdown('<div class="tier-label danger">// danger zone — lowest 30 //</div>', unsafe_allow_html=True)
        chips = []
        for i, row in danger_df.iterrows():
            code = row["trading_code"]
            chips.append(
                f'<a class="chip chip-danger" href="?code={code}" target="_self">'
                f'  <span class="chip-code">{code}</span>'
                f'</a>'
            )
        st.markdown('<div class="chip-grid">' + "".join(chips) + "</div>", unsafe_allow_html=True)

    # --- All companies (scrollable) ---
    rest_end = max(mid_end, total - 30)
    rest_df = scored.iloc[mid_end:rest_end]
    if len(rest_df) > 0:
        st.markdown('<div class="tier-label allco">// all companies //</div>', unsafe_allow_html=True)
        chips = []
        for i, row in rest_df.iterrows():
            code = row["trading_code"]
            rank = i + 1
            chips.append(
                f'<a class="chip chip-rest" href="?code={code}" target="_self">'
                f'  <span class="chip-rank">#{rank}</span>'
                f'  <span class="chip-code">{code}</span>'
                f'</a>'
            )
        st.markdown('<div class="rest-scroll"><div class="chip-grid">' + "".join(chips) + "</div></div>", unsafe_allow_html=True)

    st.markdown('<div style="margin-top:32px"></div>', unsafe_allow_html=True)

    # --- Expandable sections at bottom ---
    col1, col2 = st.columns(2)

    with col1:
        all_decls = load_dividend_declarations()
        if all_decls:
            today = _date.today()
            with st.expander("Upcoming Declarations"):
                st.caption("Expected dates based on prior year")
                upcoming_decls = []
                for d in all_decls:
                    dd = d.get("declaration_date")
                    if not dd:
                        continue
                    projected = dd.replace(year=today.year)
                    if projected.date() < today:
                        projected = projected.replace(year=today.year + 1)
                    upcoming_decls.append((projected, d))
                upcoming_decls.sort(key=lambda x: x[0])
                for proj_dt, d in upcoming_decls[:10]:
                    code_link = d["trading_code"]
                    pct = d.get("dividend_pct", 0)
                    st.markdown(
                        f'<a href="?code={code_link}" style="color:#1A6B5A;text-decoration:none">'
                        f'<b>{proj_dt.strftime("%d %b")}</b> &mdash; {code_link}'
                        f' <span style="color:#636E72">(last: {pct:.0f}%)</span></a>',
                        unsafe_allow_html=True,
                    )
                if not upcoming_decls:
                    st.write("No data yet")

            with st.expander("Upcoming Record Dates"):
                upcoming_recs = []
                for d in all_decls:
                    rd = d.get("record_date")
                    if not rd or rd.date() < today:
                        continue
                    upcoming_recs.append((rd, d))
                upcoming_recs.sort(key=lambda x: x[0])
                for rec_dt, d in upcoming_recs[:10]:
                    code_link = d["trading_code"]
                    pct = d.get("dividend_pct", 0)
                    dtype = d.get("dividend_type", "")
                    st.markdown(
                        f'<a href="?code={code_link}" style="color:#E07A5F;text-decoration:none">'
                        f'<b>{rec_dt.strftime("%d %b %Y")}</b> &mdash; {code_link}'
                        f' <span style="color:#636E72">({pct:.0f}% {dtype})</span></a>',
                        unsafe_allow_html=True,
                    )
                if not upcoming_recs:
                    st.write("No upcoming record dates")

    with col2:
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

            with st.expander("Sector Leaderboard"):
                all_sectors = list(enumerate(sector_avg.items(), 1))
                st.markdown('<div class="sector-board">' + "".join(_sector_rows(all_sectors)) + "</div>", unsafe_allow_html=True)

        with st.expander("Score Methodology"):
            st.markdown(
                '<div class="method-panel">'
                '  <div class="method-grid">'
                '    <div class="method-group">'
                '      <div class="mg-header">Valuation <span class="mg-w">35%</span></div>'
                '      <div class="mg-f"><span>Earnings Yield</span><span class="mg-fw">20%</span></div>'
                '      <div class="mg-f"><span>NAV / Price</span><span class="mg-fw">15%</span></div>'
                '    </div>'
                '    <div class="method-group">'
                '      <div class="mg-header">Profitability <span class="mg-w">25%</span></div>'
                '      <div class="mg-f"><span>ROE (3yr avg)</span><span class="mg-fw">15%</span></div>'
                '      <div class="mg-f"><span>EPS Stability</span><span class="mg-fw">10%</span></div>'
                '    </div>'
                '    <div class="method-group">'
                '      <div class="mg-header">Dividend Quality <span class="mg-w">25%</span></div>'
                '      <div class="mg-f"><span>Dividend Yield</span><span class="mg-fw">15%</span></div>'
                '      <div class="mg-f"><span>Div. Streak</span><span class="mg-fw">10%</span></div>'
                '    </div>'
                '    <div class="method-group">'
                '      <div class="mg-header">Balance Sheet <span class="mg-w">15%</span></div>'
                '      <div class="mg-f"><span>Reserve / MCap</span><span class="mg-fw">10%</span></div>'
                '      <div class="mg-f"><span>Equity / Loan</span><span class="mg-fw">5%</span></div>'
                '    </div>'
                '  </div>'
                '  <div class="method-note">'
                '    Each factor is <strong>percentile-ranked</strong> across all companies, then weighted and combined. '
                '    Market category multiplier: A&times;1.0, B&times;0.92, N&times;0.88, Z&times;0.30.'
                '  </div>'
                '</div>',
                unsafe_allow_html=True,
            )
