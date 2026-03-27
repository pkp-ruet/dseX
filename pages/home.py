import streamlit as st
from datetime import datetime, date as _date


def render_homepage():
    from app import load_companies, load_latest_prices, load_dividend_declarations
    from scoring import build_scores_df, ALGO_NAMES

    companies_raw = load_companies()
    prices_map = load_latest_prices()

    comp_map: dict[str, dict] = {}
    for c in companies_raw:
        code = c["trading_code"]
        comp_map[code] = {
            "name": c.get("company_name", "") or code,
            "sector": c.get("sector", "") or "",
        }

    # Algorithm selector (hidden if only one option)
    if len(ALGO_NAMES) > 1:
        algo = st.radio(
            "Algorithm", ALGO_NAMES,
            horizontal=True,
            label_visibility="collapsed",
            key="algo_selector",
        )
    else:
        algo = ALGO_NAMES[0]

    score_df = build_scores_df(algo)

    if score_df.empty:
        st.warning("No scored companies found. Run the scrapers first.")
        return

    score_df["name"] = score_df["trading_code"].map(
        lambda c: comp_map.get(c, {}).get("name", c)
    )
    score_df["sector"] = score_df["trading_code"].map(
        lambda c: comp_map.get(c, {}).get("sector", "")
    )

    scored = (
        score_df[score_df["score"].notna()]
        .sort_values("score", ascending=False)
        .reset_index(drop=True)
    )
    total = len(scored)

    n_strong = int((scored["score"] >= 75).sum())
    n_safe   = int(((scored["score"] >= 55) & (scored["score"] < 75)).sum())
    n_watch  = int(((scored["score"] >= 35) & (scored["score"] < 55)).sum())
    n_avoid  = int((scored["score"] < 35).sum())

    today_str = datetime.now().strftime("%A, %d %B %Y")

    # --- Masthead ---
    st.markdown(
        f'<div class="masthead">'
        f'  <div class="masthead-eyebrow">Dhaka Stock Exchange &nbsp;&middot;&nbsp; Fundamental Intelligence</div>'
        f'  <div class="masthead-title">dseX</div>'
        f'  <div class="masthead-tagline">We pick, You buy</div>'
        f'  <div class="masthead-rule-double"></div>'
        f'  <div class="masthead-subbar">'
        f'    <span>{today_str}</span>'
        f'    <span>{total} companies scored</span>'
        f'  </div>'
        f'  <div class="masthead-rule-single"></div>'
        f'</div>',
        unsafe_allow_html=True,
    )

# --- Hero insight band ---
    st.markdown(
        f'<div class="hero-band">'
        f'  <div class="hero-pills">'
        f'    <span class="score-pill score-pill-top">{n_strong} Strong Buy</span>'
        f'    <span class="score-pill score-pill-mid">{n_safe} Safe Buy</span>'
        f'    <span class="score-pill score-pill-watch">{n_watch} Watch</span>'
        f'    <span class="score-pill score-pill-danger">{n_avoid} Avoid</span>'
        f'  </div>'
        f'</div>',
        unsafe_allow_html=True,
    )

    # --- Rank table builder ---
    def rank_rows_html(subset, score_cls, table_cls=""):
        rows = []
        for i, (_, r) in enumerate(subset.iterrows(), 1):
            rows.append(
                f'<a class="rank-row" href="?code={r["trading_code"]}" target="_self">'
                f'<span class="rr-rank">{i}</span>'
                f'<span class="rr-code">{r["trading_code"]}</span>'
                f'<div class="rr-company">'
                f'<span class="rr-sector">{r["sector"]}</span>'
                f'</div>'
                f'<span class="rr-score {score_cls}">{r["score"]:.1f}</span>'
                f'</a>'
            )
        cls = f"rank-table {table_cls}".strip()
        return f'<div class="{cls}">' + "".join(rows) + '</div>'

    strong_df = scored[scored["score"] >= 75]
    safe_df   = scored[(scored["score"] >= 55) & (scored["score"] < 75)]
    watch_df  = scored[(scored["score"] >= 35) & (scored["score"] < 55)]
    avoid_df  = scored[scored["score"] < 35]

    def render_tier_col(df, header_html, score_cls, state_key, table_cls=""):
        st.markdown(header_html, unsafe_allow_html=True)
        if df.empty:
            st.markdown('<p style="font-size:0.75rem;color:var(--ink-muted);padding:12px 6px">None at this time.</p>', unsafe_allow_html=True)
            return
        expanded = st.session_state.get(state_key, False)
        visible = df if expanded else df.iloc[:10]
        st.markdown(rank_rows_html(visible, score_cls, table_cls), unsafe_allow_html=True)
        if len(df) > 10:
            rest = len(df) - 10
            label = "▴ Show less" if expanded else f"▾ Show {rest} more"
            if st.button(label, key=state_key + "_btn", use_container_width=True):
                st.session_state[state_key] = not expanded
                st.rerun()

    render_tier_col(
        strong_df,
        '<div class="np-col-header np-col-strong">'
        '<span class="np-col-label">Strong Buy</span>'
        '<span class="np-col-score-label">Score &ge; 75</span>'
        '</div>',
        "rr-score-top", "strong_more", "rank-table-strong",
    )

    render_tier_col(
        safe_df,
        '<div class="np-col-header np-col-safe">'
        '<span class="np-col-label">Safe Buy</span>'
        '<span class="np-col-score-label">Score 55–74</span>'
        '</div>',
        "rr-score-mid", "safe_more",
    )

    # Watch & Avoid — collapsible
    if not watch_df.empty or not avoid_df.empty:
        with st.expander(f"Watch ({len(watch_df)}) & Avoid ({len(avoid_df)})", expanded=False):
            col_w, col_a = st.columns(2)
            with col_w:
                st.markdown(
                    '<div class="np-col-header np-col-watch">'
                    '<span class="np-col-label">Watch</span>'
                    '<span class="np-col-score-label">Score 35–54</span>'
                    '</div>',
                    unsafe_allow_html=True,
                )
                st.markdown(rank_rows_html(watch_df, "rr-score-watch"), unsafe_allow_html=True)
            with col_a:
                st.markdown(
                    '<div class="np-col-header np-col-danger">'
                    '<span class="np-col-label">Avoid</span>'
                    '<span class="np-col-score-label">Score &lt; 35</span>'
                    '</div>',
                    unsafe_allow_html=True,
                )
                st.markdown(rank_rows_html(avoid_df, "rr-score-danger"), unsafe_allow_html=True)

    # --- Section rule ---
    st.markdown(
        '<div class="section-rule">'
        '<span class="section-rule-text">Market Intelligence</span>'
        '</div>',
        unsafe_allow_html=True,
    )

    # --- Bottom info strip ---
    all_decls = load_dividend_declarations()
    today = _date.today()

    decl_rows = ""
    rec_rows = ""
    if all_decls:
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
        for proj_dt, d in upcoming_decls[:6]:
            code_link = d["trading_code"]
            pct = d.get("dividend_pct", 0)
            decl_rows += (
                f'<a class="info-col-row info-col-row--intel" href="?code={code_link}">'
                f'<span class="icr-key">{code_link}</span>'
                f'<span class="icr-sub">{proj_dt.strftime("%d %b")}</span>'
                f'<span class="icr-val">{pct:.0f}%</span>'
                f'</a>'
            )

        upcoming_recs = []
        for d in all_decls:
            rd = d.get("record_date")
            if not rd or rd.date() < today:
                continue
            upcoming_recs.append((rd, d))
        upcoming_recs.sort(key=lambda x: x[0])
        for rec_dt, d in upcoming_recs[:6]:
            code_link = d["trading_code"]
            pct = d.get("dividend_pct", 0)
            rec_rows += (
                f'<a class="info-col-row info-col-row--intel" href="?code={code_link}">'
                f'<span class="icr-key">{code_link}</span>'
                f'<span class="icr-sub">{rec_dt.strftime("%d %b")}</span>'
                f'<span class="icr-val">{pct:.0f}%</span>'
                f'</a>'
            )

    no_data = '<span style="font-size:0.68rem;color:var(--ink-muted)">No data yet</span>'
    if not decl_rows:
        decl_rows = no_data
    if not rec_rows:
        rec_rows = no_data

    method_rows = (
        '<div class="info-col-row"><span class="icr-key">Cash Flow</span><span class="icr-val">38%</span></div>'
        '<div class="info-col-row"><span class="icr-key">Profitability</span><span class="icr-val">27%</span></div>'
        '<div class="info-col-row"><span class="icr-key">Growth &amp; Dividends</span><span class="icr-val">15%</span></div>'
        '<div class="info-col-row"><span class="icr-key">Valuation</span><span class="icr-val">12%</span></div>'
        '<div class="info-col-row"><span class="icr-key">Governance</span><span class="icr-val">8%</span></div>'
    )

    st.markdown(
        f'<div class="info-strip">'
        f'  <div class="info-col">'
        f'    <div class="info-col-header">Upcoming Declarations</div>'
        f'    {decl_rows}'
        f'  </div>'
        f'  <div class="info-col">'
        f'    <div class="info-col-header">Record Dates</div>'
        f'    {rec_rows}'
        f'  </div>'
        f'</div>',
        unsafe_allow_html=True,
    )

    st.markdown(
        f'<div class="how-we-score-box">'
        f'  <div class="how-we-score-title">How We Score</div>'
        f'  {method_rows}'
        f'</div>',
        unsafe_allow_html=True,
    )

    # --- Footer ---
    st.markdown(
        '<div class="np-footer">'
        '  <div>'
        '    <div class="np-footer-brand">dseX</div>'
        '    <div class="np-footer-tagline">Fundamental scoring for Dhaka\'s market</div>'
        '  </div>'
        '  <a href="?view=audit" class="np-footer-audit">&#128269; Data Audit</a>'
        '</div>',
        unsafe_allow_html=True,
    )
