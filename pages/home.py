import streamlit as st
from datetime import datetime, date as _date


def render_homepage():
    from app import load_companies, load_latest_prices, load_dividend_declarations
    from scoring import _build_scores_df, _top_strengths, _worst_factor, _generate_verdict

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

    # --- Breaking News Ticker (Top 10) ---
    top10_ticker = scored.head(10)
    ticker_items = "".join(
        f'<span class="ticker-item">'
        f'  <span class="ti-rank">#{i+1}</span>'
        f'  <span class="ti-code">{row["trading_code"]}</span>'
        f'  <span>{row["name"]}</span>'
        f'  <span class="ti-sep">&#9632;</span>'
        f'</span>'
        for i, row in top10_ticker.iterrows()
    )
    # Duplicate for seamless loop
    ticker_inner = ticker_items * 2
    st.markdown(
        f'<div class="news-ticker-wrap">'
        f'  <div class="news-ticker-label">&#9733; Top 10</div>'
        f'  <div class="news-ticker-track">'
        f'    <div class="news-ticker-inner">{ticker_inner}</div>'
        f'  </div>'
        f'</div>',
        unsafe_allow_html=True,
    )

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

    # --- Upcoming Dividend Boxes ---
    all_decls = load_dividend_declarations()
    if all_decls:
        from datetime import date as _date
        today = _date.today()

        box_left, box_right = st.columns(2)

        # Box A: Upcoming Declarations (predicted from last year's date)
        with box_left:
            st.markdown('<div class="section-label"><span>//</span> UPCOMING DECLARATIONS</div>', unsafe_allow_html=True)
            st.caption("Expected dates based on prior year pattern")
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

        # Box B: Upcoming Record Dates
        with box_right:
            st.markdown('<div class="section-label"><span>//</span> UPCOMING RECORD DATES</div>', unsafe_allow_html=True)
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

        st.markdown('<div class="tier-label sector">// sector leaderboard //</div>', unsafe_allow_html=True)
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
        st.markdown('<div class="tier-label allco">// all companies //</div>', unsafe_allow_html=True)
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

    # --- Methodology Panel ---
    st.markdown(
        '<div class="method-panel">'
        '  <div class="method-header">'
        '    <span class="method-title">// dseX Score Methodology</span>'
        '    <span class="method-sub">8 fundamental factors &middot; 4 groups &middot; multi-year averages &middot; percentile ranking</span>'
        '  </div>'
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
        '    A score of <strong>80</strong> means the company beats 80% of the market on these fundamentals. '
        '    Market category multiplier applied: A&times;1.0, B&times;0.92, N&times;0.88, Z&times;0.30. '
        '    Missing factors are excluded and weights re-normalised per company.'
        '  </div>'
        '</div>',
        unsafe_allow_html=True,
    )
