THEME_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
    --primary: #1A6B5A;
    --primary-light: #E8F5F1;
    --primary-dim: #2D8B76;
    --accent: #E07A5F;
    --accent-light: #FFF0EB;
    --positive: #4CAF7D;
    --negative: #D45B5B;
    --negative-light: #FDF0F0;
    --text: #2D3436;
    --text-secondary: #636E72;
    --text-muted: #B2BEC3;
    --bg: #FAFAF8;
    --bg-card: #FFFFFF;
    --bg-input: #F5F5F3;
    --border: #E8E8E4;
    --border-light: #F0F0EC;
    --shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
    --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
    --radius: 10px;
    --radius-sm: 6px;
}

html, body, [class*="css"] {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
    color: var(--text) !important;
}

.stApp {
    background-color: var(--bg) !important;
}

h1, h2, h3, h4, h5, h6,
.stMarkdown h1, .stMarkdown h2, .stMarkdown h3 {
    font-family: 'Inter', sans-serif !important;
    color: var(--text) !important;
    letter-spacing: -0.02em;
}

.stSubheader, [data-testid="stSubheader"] {
    color: var(--text-secondary) !important;
}

[data-testid="stMetric"] {
    background: var(--bg-card) !important;
    border: 1px solid var(--border) !important;
    border-radius: var(--radius) !important;
    padding: 14px 18px !important;
    box-shadow: var(--shadow);
}
[data-testid="stMetricLabel"] {
    color: var(--text-muted) !important;
    text-transform: uppercase;
    font-size: 0.68rem !important;
    letter-spacing: 0.5px;
    font-weight: 500 !important;
}
[data-testid="stMetricValue"] {
    color: var(--text) !important;
    font-weight: 600 !important;
}
[data-testid="stMetricDelta"] svg { display: none; }
[data-testid="stMetricDelta"] > div {
    color: var(--positive) !important;
}

.stTextInput > div > div > input {
    background-color: var(--bg-input) !important;
    color: var(--text) !important;
    border: 1px solid var(--border) !important;
    border-radius: var(--radius) !important;
    font-family: 'Inter', sans-serif !important;
    caret-color: var(--primary);
    padding: 10px 14px !important;
    transition: border-color 0.2s, box-shadow 0.2s;
}
.stTextInput > div > div > input:focus {
    border-color: var(--primary) !important;
    box-shadow: 0 0 0 3px rgba(26,107,90,0.12) !important;
}
.stTextInput > div > div > input::placeholder {
    color: var(--text-muted) !important;
}
.stTextInput > label {
    color: var(--text-secondary) !important;
    font-family: 'Inter', sans-serif !important;
    font-weight: 500 !important;
}

[data-testid="stDataFrame"] {
    border: 1px solid var(--border) !important;
    border-radius: var(--radius) !important;
    overflow: hidden;
}

.stButton > button {
    background-color: var(--bg-card) !important;
    color: var(--primary) !important;
    border: 1px solid var(--border) !important;
    border-radius: var(--radius) !important;
    font-family: 'Inter', sans-serif !important;
    font-weight: 500;
    transition: all 0.2s;
}
.stButton > button:hover {
    background-color: var(--primary-light) !important;
    border-color: var(--primary) !important;
    color: var(--primary) !important;
}

[data-testid="stHorizontalRule"], hr {
    border-color: var(--border) !important;
}

.stCaption, [data-testid="stCaptionContainer"] {
    color: var(--text-muted) !important;
}

.stSelectbox label, .stSelectbox > div > div {
    color: var(--text) !important;
    font-family: 'Inter', sans-serif !important;
}

code {
    color: var(--primary) !important;
    background-color: var(--primary-light) !important;
    border-radius: 4px;
}

[data-testid="stNotification"] {
    background-color: var(--bg-card) !important;
    border: 1px solid var(--border) !important;
    border-radius: var(--radius) !important;
    color: var(--text) !important;
}

[data-testid="stExpander"] {
    background: var(--bg-card) !important;
    border: 1px solid var(--border) !important;
    border-radius: var(--radius) !important;
}
[data-testid="stExpander"] summary {
    color: var(--text-secondary) !important;
    font-family: 'Inter', sans-serif !important;
    font-size: 0.85rem !important;
}

/* --- Hero header --- */
.hero-header {
    margin-bottom: 28px;
    padding: 28px 0 20px;
    text-align: center;
}
.hero-title {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--primary);
    letter-spacing: 3px;
    text-transform: uppercase;
    margin-bottom: 6px;
}
.hero-slogan {
    font-size: 1.15rem;
    font-weight: 600;
    color: var(--text);
    letter-spacing: 0;
    line-height: 1.5;
}
@media (max-width: 600px) {
    .hero-slogan { font-size: 0.9rem; }
}

/* --- Breaking News Ticker --- */
.news-ticker-wrap {
    display: flex;
    align-items: center;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    margin-bottom: 18px;
    overflow: hidden;
    height: 36px;
    box-shadow: var(--shadow);
}
.news-ticker-label {
    flex-shrink: 0;
    background: var(--primary);
    color: #fff;
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    padding: 0 14px;
    height: 100%;
    display: flex;
    align-items: center;
    white-space: nowrap;
    border-radius: var(--radius) 0 0 var(--radius);
}
.news-ticker-track {
    flex: 1;
    overflow: hidden;
    position: relative;
    height: 100%;
}
.news-ticker-inner {
    display: inline-flex;
    align-items: center;
    height: 100%;
    white-space: nowrap;
    animation: ticker-scroll 28s linear infinite;
}
.news-ticker-inner:hover { animation-play-state: paused; }
@keyframes ticker-scroll {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
}
.ticker-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    padding: 0 24px;
    color: var(--text);
}
.ticker-item .ti-rank {
    color: var(--primary);
    font-weight: 700;
}
.ticker-item .ti-code {
    color: var(--primary-dim);
    font-weight: 600;
}
.ticker-item .ti-sep {
    color: var(--border);
    font-size: 0.5rem;
}

/* --- Market Intelligence Bar --- */
.market-bar {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;
}
.market-stat {
    flex: 1;
    background: var(--bg-card);
    padding: 14px 16px;
    text-align: center;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    box-shadow: var(--shadow);
}
.market-stat .ms-label {
    font-size: 0.6rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
    font-weight: 500;
}
.market-stat .ms-value {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--primary);
    line-height: 1.2;
}
.market-stat .ms-sub {
    font-size: 0.65rem;
    color: var(--text-secondary);
    margin-top: 3px;
}
@media (max-width: 700px) {
    .market-bar { flex-wrap: wrap; }
    .market-stat { flex: 1 1 45%; }
}

/* --- Explainer box --- */
.explainer {
    border: 1px solid var(--border);
    background: var(--bg-card);
    padding: 16px 20px;
    margin-bottom: 20px;
    font-size: 0.82rem;
    color: var(--text-secondary);
    line-height: 1.7;
    border-radius: var(--radius);
    box-shadow: var(--shadow);
}
.explainer strong { color: var(--primary); }

/* --- Top 10 grid (2-col) --- */
.top10-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
    margin-bottom: 12px;
}
@media (max-width: 900px) {
    .top10-grid { grid-template-columns: 1fr; }
}
.top-card {
    display: block;
    text-decoration: none !important;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-left: 3px solid var(--primary);
    padding: 16px 18px 14px;
    border-radius: var(--radius);
    transition: box-shadow 0.2s, border-color 0.2s;
    overflow: hidden;
    box-shadow: var(--shadow);
}
.top-card:hover {
    box-shadow: var(--shadow-md);
    border-color: var(--primary-dim);
}
.top-card .card-head {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 8px;
    flex-wrap: wrap;
}
.top-card .card-rank {
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--primary);
    line-height: 1;
}
.top-card .card-code {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text);
    letter-spacing: 0.5px;
}
.top-card .card-name {
    font-size: 0.75rem;
    color: var(--text-secondary);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.top-card .card-score-badge {
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--primary);
    margin-left: auto;
}
.top-card .score-bar-wrap {
    height: 4px;
    background: var(--border-light);
    margin-bottom: 10px;
    width: 100%;
    border-radius: 2px;
}
.top-card .score-bar-fill {
    height: 4px;
    background: linear-gradient(90deg, var(--primary-dim), var(--primary));
    border-radius: 2px;
}
.top-card .card-meta {
    display: flex;
    gap: 14px;
    font-size: 0.72rem;
    color: var(--text-secondary);
    margin-bottom: 6px;
    flex-wrap: wrap;
}
.top-card .card-meta span { white-space: nowrap; }
.top-card .card-meta .highlight { color: var(--text); font-weight: 600; }
.top-card .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: 8px;
}
.tag {
    display: inline-block;
    font-size: 0.6rem;
    padding: 2px 8px;
    border: 1px solid var(--primary);
    color: var(--primary);
    border-radius: 20px;
    font-weight: 500;
}
.mid-card .tag {
    border-color: var(--text-muted);
    color: var(--text-secondary);
}
.top-card .card-verdict {
    font-size: 0.72rem;
    color: var(--text-secondary);
    border-top: 1px solid var(--border-light);
    padding-top: 8px;
    line-height: 1.5;
}

/* --- Section tier labels --- */
.tier-label {
    color: var(--text-muted);
    font-size: 0.72rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    text-align: center;
    margin: 28px 0 14px;
    position: relative;
    font-weight: 500;
}
.tier-label::before, .tier-label::after {
    content: '';
    position: absolute;
    top: 50%;
    width: 30%;
    height: 1px;
    background: var(--border);
}
.tier-label::before { left: 0; }
.tier-label::after { right: 0; }
.tier-label.top10 {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--primary);
    letter-spacing: 3px;
}
.tier-label.top10::before, .tier-label.top10::after { background: var(--primary); opacity: 0.2; }
.tier-label.mid20 {
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--text-secondary);
    letter-spacing: 3px;
}
.tier-label.mid20::before, .tier-label.mid20::after { background: var(--text-muted); opacity: 0.3; }
.tier-label.sector {
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--primary);
    letter-spacing: 3px;
    margin-top: 16px;
}
.tier-label.sector::before, .tier-label.sector::after { background: var(--primary); opacity: 0.15; }
.tier-label.allco {
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--text-secondary);
    letter-spacing: 3px;
}
.tier-label.allco::before, .tier-label.allco::after { background: var(--text-muted); opacity: 0.3; }
.tier-label.danger {
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--negative);
    letter-spacing: 3px;
}

/* --- Mid-tier grid (3-col) --- */
.mid-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 16px;
}
@media (max-width: 900px) { .mid-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 500px) { .mid-grid { grid-template-columns: 1fr; } }
.mid-card {
    display: block;
    text-decoration: none !important;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-left: 3px solid var(--text-muted);
    padding: 12px 14px 10px;
    border-radius: var(--radius);
    transition: box-shadow 0.2s;
    overflow: hidden;
    box-shadow: var(--shadow);
}
.mid-card:hover { box-shadow: var(--shadow-md); }
.mid-card .mc-head {
    display: flex;
    align-items: baseline;
    gap: 7px;
    margin-bottom: 4px;
}
.mid-card .mc-rank { font-size: 0.85rem; font-weight: 700; color: var(--text-secondary); }
.mid-card .mc-code { font-size: 0.75rem; font-weight: 600; color: var(--text); letter-spacing: 0.5px; }
.mid-card .mc-score { margin-left: auto; font-size: 0.82rem; font-weight: 700; color: var(--primary-dim); }
.mid-card .mc-name {
    font-size: 0.7rem;
    color: var(--text-secondary);
    margin-bottom: 3px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mid-card .mc-sector {
    font-size: 0.6rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 5px;
}
.mid-card .mc-tags { display: flex; flex-wrap: wrap; gap: 4px; }

/* --- Danger zone grid (5-col) --- */
.danger-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 10px;
    margin-bottom: 20px;
}
@media (max-width: 900px) { .danger-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 500px) { .danger-grid { grid-template-columns: repeat(2, 1fr); } }
.danger-card {
    display: block;
    text-decoration: none !important;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-left: 3px solid var(--negative);
    padding: 10px 12px 8px;
    border-radius: var(--radius);
    transition: box-shadow 0.2s;
    overflow: hidden;
    box-shadow: var(--shadow);
}
.danger-card:hover { box-shadow: var(--shadow-md); }
.danger-card .dc-rank { font-size: 0.65rem; color: var(--text-muted); }
.danger-card .dc-code { font-size: 0.8rem; font-weight: 700; color: var(--negative); letter-spacing: 0.5px; margin: 2px 0; }
.danger-card .dc-name {
    font-size: 0.66rem;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-bottom: 4px;
}
.danger-card .dc-score { font-size: 0.75rem; font-weight: 700; color: var(--negative); }
.danger-card .dc-weak {
    font-size: 0.6rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-top: 3px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* --- Sector leaderboard --- */
.sector-board {
    border: 1px solid var(--border);
    border-left: 3px solid var(--primary);
    background: var(--bg-card);
    margin-bottom: 12px;
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    overflow: hidden;
}
.sector-row {
    display: grid;
    grid-template-columns: 26px 220px 1fr 52px;
    align-items: center;
    gap: 10px;
    padding: 9px 16px;
    border-bottom: 1px solid var(--border-light);
    font-size: 0.78rem;
}
.sector-row:last-child { border-bottom: none; }
.sector-row .sr-rank { color: var(--text-muted); }
.sector-row .sr-name { color: var(--text); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sector-row .sr-bar-wrap { height: 4px; background: var(--border-light); border-radius: 2px; }
.sector-row .sr-bar-fill { height: 4px; background: var(--primary); border-radius: 2px; }
.sector-row .sr-score { color: var(--primary); font-weight: 700; text-align: right; }

/* --- Rest list (multi-column) --- */
.rest-list {
    column-count: 3;
    column-gap: 0;
    max-height: 60vh;
    overflow-y: auto;
    border: 1px solid var(--border);
    background: var(--bg-card);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
}
@media (max-width: 900px) { .rest-list { column-count: 2; } }
@media (max-width: 500px) { .rest-list { column-count: 1; } }
.rest-list a {
    display: grid;
    grid-template-columns: 32px 58px 1fr 40px;
    align-items: center;
    gap: 6px;
    padding: 7px 12px;
    color: var(--text) !important;
    text-decoration: none !important;
    font-size: 0.75rem;
    break-inside: avoid;
    transition: background 0.15s;
    border-bottom: 1px solid var(--border-light);
}
.rest-list a:hover { background: var(--bg-input); }
.rest-list a .rk {
    color: var(--text-muted);
    font-size: 0.65rem;
    text-align: right;
}
.rest-list a .rc {
    color: var(--text);
    font-size: 0.72rem;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.rest-list a .rn {
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.rest-list a .rs {
    color: var(--primary);
    font-weight: 700;
    font-size: 0.72rem;
    text-align: right;
}
.rest-list::-webkit-scrollbar { width: 6px; }
.rest-list::-webkit-scrollbar-track { background: var(--bg); }
.rest-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

/* ===== Detail page ===== */

.score-panel {
    border: 1px solid var(--border);
    background: var(--bg-card);
    padding: 20px 24px 18px;
    margin-bottom: 18px;
    border-radius: var(--radius);
    box-shadow: var(--shadow);
}
.score-panel-head {
    display: flex;
    align-items: baseline;
    gap: 14px;
    margin-bottom: 16px;
    flex-wrap: wrap;
}
.score-big {
    font-size: 2.8rem;
    font-weight: 700;
    line-height: 1;
}
.score-rank-text { font-size: 0.78rem; color: var(--text-muted); }
.factor-row {
    display: grid;
    grid-template-columns: 130px 80px 1fr 38px;
    align-items: center;
    gap: 8px;
    padding: 5px 0;
    font-size: 0.76rem;
    border-bottom: 1px solid var(--border-light);
}
.factor-row:last-of-type { border-bottom: none; }
.factor-row .fr-name { color: var(--text-secondary); }
.factor-row .fr-val  { color: var(--text); text-align: right; font-size: 0.72rem; font-weight: 500; }
.factor-row .fr-bar-wrap { height: 5px; background: var(--border-light); border-radius: 3px; }
.factor-row .fr-bar-fill { height: 5px; border-radius: 3px; }
.factor-row .fr-pct  { color: var(--primary); font-size: 0.7rem; text-align: right; font-weight: 600; }
.score-verdict-text {
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid var(--border-light);
    font-size: 0.82rem;
    color: var(--text-secondary);
    line-height: 1.6;
}

/* Price panel */
.price-panel {
    border: 1px solid var(--border);
    background: var(--bg-card);
    padding: 18px 22px 16px;
    margin-bottom: 18px;
    border-radius: var(--radius);
    box-shadow: var(--shadow);
}
.price-ltp-row {
    display: flex;
    align-items: baseline;
    gap: 14px;
    margin-bottom: 12px;
    flex-wrap: wrap;
}
.price-ltp { font-size: 2rem; font-weight: 700; color: var(--text); line-height: 1; }
.price-change-pos { font-size: 0.9rem; font-weight: 600; color: var(--positive); }
.price-change-neg { font-size: 0.9rem; font-weight: 600; color: var(--negative); }
.price-change-neu { font-size: 0.9rem; color: var(--text-muted); }
.price-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
}
@media (max-width: 700px) { .price-grid { grid-template-columns: repeat(2, 1fr); } }
.price-cell {
    background: var(--bg-input);
    padding: 10px 14px;
    border-radius: var(--radius-sm);
}
.price-cell .pc-label {
    font-size: 0.6rem; color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; font-weight: 500;
}
.price-cell .pc-val { font-size: 0.88rem; font-weight: 600; color: var(--text); }

/* Key ratios */
.ratio-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 12px;
    margin-bottom: 20px;
}
@media (max-width: 900px) { .ratio-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 500px) { .ratio-grid { grid-template-columns: repeat(2, 1fr); } }
.ratio-cell {
    background: var(--bg-card);
    padding: 12px 14px;
    text-align: center;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
}
.ratio-cell .rc-label {
    font-size: 0.6rem; color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 4px; font-weight: 500;
}
.ratio-cell .rc-val { font-size: 0.92rem; font-weight: 700; color: var(--primary); }
.ratio-cell .rc-sub { font-size: 0.6rem; color: var(--text-muted); margin-top: 2px; }

/* Section label */
.section-label {
    font-size: 0.7rem; letter-spacing: 1.5px; text-transform: uppercase;
    color: var(--text-muted); border-bottom: 1px solid var(--border);
    padding-bottom: 8px; margin: 26px 0 14px; font-weight: 500;
}
.section-label span { color: var(--primary); margin-right: 6px; }

/* --- Methodology Panel --- */
.method-panel {
    border: 1px solid var(--border);
    background: var(--bg-card);
    padding: 18px 22px 16px;
    margin-bottom: 16px;
    border-radius: var(--radius);
    box-shadow: var(--shadow);
}
.method-header {
    display: flex;
    align-items: baseline;
    gap: 16px;
    margin-bottom: 14px;
    flex-wrap: wrap;
}
.method-title {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--primary);
    letter-spacing: 1.5px;
    text-transform: uppercase;
}
.method-sub {
    font-size: 0.65rem;
    color: var(--text-muted);
}
.method-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 12px;
}
@media (max-width: 800px) { .method-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 500px) { .method-grid { grid-template-columns: 1fr; } }
.method-group {
    background: var(--bg-input);
    padding: 12px 14px;
    border-radius: var(--radius-sm);
}
.mg-header {
    font-size: 0.67rem;
    font-weight: 700;
    color: var(--primary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid var(--border);
    padding-bottom: 6px;
}
.mg-w { color: var(--primary); font-size: 0.72rem; }
.mg-f {
    display: flex;
    justify-content: space-between;
    font-size: 0.65rem;
    color: var(--text-secondary);
    padding: 3px 0;
}
.mg-fw { color: var(--text); font-size: 0.63rem; font-weight: 600; }
.method-note {
    font-size: 0.63rem;
    color: var(--text-muted);
    line-height: 1.6;
    padding-top: 10px;
    border-top: 1px solid var(--border-light);
}
.method-note strong { color: var(--text-secondary); }
</style>
"""


def style_fig(fig):
    """Apply clean minimal styling to any Plotly figure."""
    fig.update_layout(
        paper_bgcolor="#FAFAF8",
        plot_bgcolor="#FFFFFF",
        font=dict(family="Inter, -apple-system, sans-serif", color="#2D3436", size=12),
        colorway=["#1A6B5A", "#E07A5F", "#4CAF7D", "#636E72", "#D45B5B"],
        legend=dict(font=dict(color="#636E72")),
        margin=dict(l=0, r=0, t=36, b=0),
    )
    fig.update_xaxes(gridcolor="#E8E8E4", zerolinecolor="#E8E8E4", tickfont=dict(color="#636E72"))
    fig.update_yaxes(gridcolor="#E8E8E4", zerolinecolor="#E8E8E4", tickfont=dict(color="#636E72"))
    fig.update_traces(
        textfont=dict(color="#2D3436"),
        marker=dict(line=dict(width=0)),
        selector=dict(type="bar"),
    )
    return fig
