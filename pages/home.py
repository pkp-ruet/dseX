import html
import streamlit as st
from datetime import date as _date


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
    n_strong = int((scored["score"] >= 75).sum())
    n_safe   = int(((scored["score"] >= 55) & (scored["score"] < 75)).sum())
    n_watch  = int(((scored["score"] >= 35) & (scored["score"] < 55)).sum())
    n_avoid  = int((scored["score"] < 35).sum())

    # --- Masthead ---
    st.markdown(
        f'<div class="masthead masthead-modern">'
        f'  <div class="masthead-eyebrow">Dhaka Stock Exchange &nbsp;&middot;&nbsp; Fundamental Intelligence</div>'
        f'  <div class="masthead-title">dseX</div>'
        f'</div>',
        unsafe_allow_html=True,
    )

# --- Hero insight band ---
    st.markdown(
        f'<div class="hero-band hero-modern">'
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
            code = r["trading_code"]
            price_info = prices_map.get(code) or {}

            # Price + day change
            ltp = r.get("ltp") or price_info.get("ltp")
            chg = price_info.get("change_pct")

            # EPS YoY
            eps_yoy = r.get("eps_yoy_pct")
            if isinstance(eps_yoy, float) and (eps_yoy != eps_yoy):  # NaN check
                eps_yoy = None

            # Div yield
            div_yield = r.get("div_yield_pct")
            if isinstance(div_yield, float) and (div_yield != div_yield):
                div_yield = None

            # Three fixed columns + separators so dots line up across rows
            price_inner = ""
            if ltp is not None:
                price_inner = f'<span class="rr-ltp">৳{ltp:,.1f}</span>'
                if chg is not None:
                    if chg > 0:
                        price_inner += f'<span class="rr-chg rr-chg-up">&#9650;{chg:.1f}%</span>'
                    elif chg < 0:
                        price_inner += f'<span class="rr-chg rr-chg-dn">&#9660;{abs(chg):.1f}%</span>'
                    else:
                        price_inner += '<span class="rr-chg rr-chg-flat">0.0%</span>'

            eps_inner = ""
            if eps_yoy is not None:
                capped = min(abs(eps_yoy), 999)
                if eps_yoy > 0:
                    eps_inner = f'<span class="rr-eps rr-chg-up">EPS &#9650;{capped:.0f}%</span>'
                elif eps_yoy < 0:
                    eps_inner = f'<span class="rr-eps rr-chg-dn">EPS &#9660;{capped:.0f}%</span>'
                else:
                    eps_inner = '<span class="rr-eps rr-chg-flat">EPS 0%</span>'

            div_inner = ""
            if div_yield is not None:
                div_inner = f'<span class="rr-div">Div {div_yield:.1f}%</span>'

            sep = '<span class="rr-sep" aria-hidden="true">&middot;</span>'
            indicators_html = (
                f'<div class="rr-slot rr-slot-price">{price_inner}</div>'
                f"{sep}"
                f'<div class="rr-slot rr-slot-eps">{eps_inner}</div>'
                f"{sep}"
                f'<div class="rr-slot rr-slot-div">{div_inner}</div>'
            )

            code_esc = html.escape(str(code))

            rows.append(
                f'<a class="rank-row" href="?code={code}" target="_self">'
                f'<span class="rr-rank">{i}</span>'
                f'<span class="rr-code"><span class="rr-ticker-pill">{code_esc}</span></span>'
                f'<div class="rr-company">'
                f'<div class="rr-indicators">{indicators_html}</div>'
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
        if header_html:
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
        "rr-score-mid", "safe_more", "rank-table-safe",
    )

    # Watch / Avoid — native <details> (reliable yellow/red styling; full list, no extra expander)
    if not watch_df.empty:
        nw = len(watch_df)
        w_co = "company" if nw == 1 else "companies"
        w_tbl = rank_rows_html(watch_df, "rr-score-watch", "rank-table-watch")
        st.markdown(
            f'<details class="dsex-exp dsex-exp-watch">'
            f'<summary>'
            f'<span class="dsex-exp-title">Watch</span>'
            f'<span class="dsex-exp-sep">·</span>'
            f'<span class="dsex-exp-pill">Score 35–54</span>'
            f'<span class="dsex-exp-sep">·</span>'
            f'<span class="dsex-exp-count">{nw} {w_co}</span>'
            f"</summary>"
            f'<div class="dsex-exp-body">{w_tbl}</div>'
            f"</details>",
            unsafe_allow_html=True,
        )

    if not avoid_df.empty:
        na = len(avoid_df)
        a_co = "company" if na == 1 else "companies"
        a_tbl = rank_rows_html(avoid_df, "rr-score-danger", "rank-table-avoid")
        st.markdown(
            f'<details class="dsex-exp dsex-exp-avoid">'
            f'<summary>'
            f'<span class="dsex-exp-title">Avoid</span>'
            f'<span class="dsex-exp-sep">·</span>'
            f'<span class="dsex-exp-pill">Score &lt; 35</span>'
            f'<span class="dsex-exp-sep">·</span>'
            f'<span class="dsex-exp-count">{na} {a_co}</span>'
            f"</summary>"
            f'<div class="dsex-exp-body">{a_tbl}</div>'
            f"</details>",
            unsafe_allow_html=True,
        )

    # --- Section rule ---
    st.markdown(
        '<div class="section-rule section-rule-modern">'
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

    how_we_score_html = (
        '<div class="hws-row">'
        '<span class="hws-label">EPS &amp; Profitability</span>'
        '<div class="hws-desc">Is the company consistently earning? Looks at EPS growth track record, earnings history across 5 years, and return on equity.</div>'
        '</div>'
        '<div class="hws-row">'
        '<span class="hws-label">Financial Health</span>'
        '<div class="hws-desc">Is the balance sheet solid? Checks debt levels, whether operations generate real cash, and available liquidity.</div>'
        '</div>'
        '<div class="hws-row">'
        '<span class="hws-label">Competitive Strength</span>'
        '<div class="hws-desc">Does it hold its ground? Measures profit margins, revenue stability year-over-year, and scale within its sector.</div>'
        '</div>'
        '<div class="hws-row">'
        '<span class="hws-label">Valuation</span>'
        '<div class="hws-desc">Is the price reasonable? Compares current P/E and P/B against the company\'s own 5-year historical averages.</div>'
        '</div>'
        '<div class="hws-row">'
        '<span class="hws-label">Dividend Quality</span>'
        '<div class="hws-desc">Does it reward shareholders? Tracks dividend growth, how consistently it pays, and the current yield.</div>'
        '</div>'
    )

    st.markdown(
        f'<div class="info-strip info-strip-modern">'
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
        f'<div class="how-we-score-box how-we-score-modern">'
        f'  <div class="how-we-score-title">How We Score</div>'
        f'  {how_we_score_html}'
        f'</div>',
        unsafe_allow_html=True,
    )

    # --- Footer ---
    st.markdown(
        '<div class="np-footer np-footer-modern">'
        '  <div>'
        '    <div class="np-footer-brand">dseX</div>'
        '    <div class="np-footer-tagline">Fundamental scoring for Dhaka\'s market</div>'
        '  </div>'
        '  <a href="?view=audit" class="np-footer-audit">&#128269; Data Audit</a>'
        '</div>',
        unsafe_allow_html=True,
    )
