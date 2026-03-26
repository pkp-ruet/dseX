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

    # --- Header row: title left, audit link middle, search right ---
    head_left, head_mid, head_right = st.columns([3, 1, 2])
    with head_left:
        st.markdown(
            '<span style="font-size:1.4rem;font-weight:800;color:var(--primary);letter-spacing:1px">dseX</span>'
            '<span style="font-size:0.78rem;color:var(--text-secondary);margin-left:10px">'
            'Smart Stock Insights</span>',
            unsafe_allow_html=True,
        )
    with head_mid:
        st.markdown(
            '<a href="?view=audit" style="font-size:0.7rem;color:#4CAF7D;text-decoration:none;'
            'letter-spacing:1px;font-weight:600;border:1px solid #4CAF7D;'
            'padding:5px 10px;border-radius:6px;white-space:nowrap">🔍 Audit</a>',
            unsafe_allow_html=True,
        )
    with head_right:
        search = st.text_input(
            "Search", key="search",
            placeholder="Search company...",
            label_visibility="collapsed",
        )

    algo = st.radio(
        "Algorithm", ALGO_NAMES,
        horizontal=True,
        label_visibility="collapsed",
        key="algo_selector",
    )
    score_df = build_scores_df(algo)

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

    CATEGORIES = [
        ("strong-buy", "// strong buy //",        lambda s: s >= 75,        "chip-top"),
        ("safe-buy",   "// safe buy //",           lambda s: 55 <= s < 75,   "chip-mid"),
        ("watch",      "// watch before buy //",   lambda s: 35 <= s < 55,   "chip-watch"),
        ("dont-buy",   "// don't buy //",          lambda s: s < 35,         "chip-danger"),
    ]

    for cat_id, label, predicate, chip_class in CATEGORIES:
        subset = scored[scored["score"].apply(predicate)]
        if subset.empty:
            continue
        st.markdown(f'<div class="tier-label {cat_id}">{label}</div>', unsafe_allow_html=True)
        chips = [
            f'<a class="chip {chip_class}" href="?code={r["trading_code"]}" target="_self">'
            f'  <span class="chip-code">{r["trading_code"]}</span>'
            f'</a>'
            for _, r in subset.iterrows()
        ]
        st.markdown('<div class="chip-grid">' + "".join(chips) + "</div>", unsafe_allow_html=True)

    # --- Bottom feature cards ---
    st.markdown('<div style="margin-top:36px"></div>', unsafe_allow_html=True)

    all_decls = load_dividend_declarations()
    today = _date.today()

    # Build data for cards
    upcoming_decls_html = ""
    upcoming_recs_html = ""
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
            upcoming_decls_html += (
                f'<a href="?code={code_link}" style="color:#fff;text-decoration:none;display:block;padding:3px 0;font-size:0.75rem">'
                f'<b>{proj_dt.strftime("%d %b")}</b> {code_link}'
                f' <span style="opacity:0.6">({pct:.0f}%)</span></a>'
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
            upcoming_recs_html += (
                f'<a href="?code={code_link}" style="color:#fff;text-decoration:none;display:block;padding:3px 0;font-size:0.75rem">'
                f'<b>{rec_dt.strftime("%d %b")}</b> {code_link}'
                f' <span style="opacity:0.6">({pct:.0f}%)</span></a>'
            )

    # Sector top 5
    sector_html = ""
    if not sector_avg.empty:
        for i, (sec_name, avg_sc) in enumerate(sector_avg.head(5).items(), 1):
            sector_html += (
                f'<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:0.75rem">'
                f'  <span>{i}. {sec_name}</span>'
                f'  <span style="font-weight:700">{avg_sc:.1f}</span>'
                f'</div>'
            )

    def _card(emoji, title, body_html, bg, border_clr):
        return (
            f'<div style="background:{bg};border:2px solid {border_clr};border-radius:14px;'
            f'padding:18px 16px;height:100%">'
            f'  <div style="font-size:1.5rem;margin-bottom:6px">{emoji}</div>'
            f'  <div style="font-size:0.82rem;font-weight:700;color:#fff;margin-bottom:10px">{title}</div>'
            f'  <div>{body_html or "<span style=\"color:rgba(255,255,255,0.5);font-size:0.75rem\">No data yet</span>"}</div>'
            f'</div>'
        )

    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.markdown(
            _card("📅", "Upcoming Declarations", upcoming_decls_html,
                  "linear-gradient(135deg,#1A6B5A,#2D8B76)", "#4CAF7D"),
            unsafe_allow_html=True,
        )
    with c2:
        st.markdown(
            _card("📋", "Record Dates", upcoming_recs_html,
                  "linear-gradient(135deg,#E07A5F,#E8915E)", "#F0A88C"),
            unsafe_allow_html=True,
        )
    with c3:
        st.markdown(
            _card("🏆", "Top Sectors", sector_html,
                  "linear-gradient(135deg,#5B8DEF,#7BA4F5)", "#9BB8F7"),
            unsafe_allow_html=True,
        )
    with c4:
        method_html = (
            '<div style="font-size:0.72rem;line-height:1.6">'
            '<div><b>Cash Flow Quality</b> 38%</div>'
            '<div><b>Profitability</b> 27%</div>'
            '<div><b>Valuation</b> 12%</div>'
            '<div><b>Growth &amp; Dividends</b> 15%</div>'
            '<div><b>Governance</b> 8%</div>'
            '<div style="margin-top:6px;opacity:0.6;font-size:0.65rem">10 factors, DSE-calibrated 1–10</div>'
            '</div>'
        )
        st.markdown(
            _card("🧠", "Score Method", method_html,
                  "linear-gradient(135deg,#9B6DD7,#B48AE0)", "#CBA8EB"),
            unsafe_allow_html=True,
        )

    st.markdown(
        '<div style="text-align:center;margin-top:28px">'
        '<a href="?view=audit" style="font-size:0.72rem;color:#4CAF7D;'
        'text-decoration:none;letter-spacing:1.5px;font-weight:600;'
        'border:1px solid #4CAF7D;padding:6px 16px;border-radius:6px">'
        '🔍 Data Audit</a>'
        '</div>',
        unsafe_allow_html=True,
    )
