THEME_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap');

:root {
    --primary: #1A6B5A;
    --primary-light: #E8F5F1;
    --primary-dim: #2D8B76;
    --accent: #E07A5F;
    --accent-light: #FFF0EB;
    --positive: #4CAF7D;
    --negative: #D45B5B;
    --negative-light: #FDF0F0;
    --text: #0D0A04;
    --text-secondary: #2C2418;
    --text-muted: #5A5048;
    --bg: #FEFDF7;
    --bg-card: #FFFFFF;
    --bg-input: #FAF7EE;
    --border: #D8CEB4;
    --border-light: #E8DFC8;
    --shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
    --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
    --radius: 10px;
    --radius-sm: 6px;
    /* Newspaper palette */
    --gold: #9A7610;
    --gold-light: #F0E4B8;
    --ink: #0D0A04;
    --ink-2: #2C2418;
    --ink-muted: #5A5048;
    --rule: #D4B483;
    --rule-dark: #1A1208;
    --np-strong: #2D6A3F;
    --np-safe: #1A4D6B;
    --np-watch: #7A5C00;
    --np-danger: #8B2020;
}

html, body, [class*="css"] {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
    color: var(--text) !important;
}

/* Flat yellow-orange top bar + cream body */
.stApp {
    background-color: var(--bg) !important;
    box-shadow: inset 0 9px 0 0 #ffb343 !important;
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
    background: linear-gradient(180deg, #ffffff 0%, #faf8f3 100%) !important;
    border: 1px solid rgba(212, 180, 131, 0.45) !important;
    border-radius: 14px !important;
    box-shadow: 0 4px 20px rgba(26, 18, 8, 0.07) !important;
    overflow: hidden;
    margin-bottom: 12px !important;
}
[data-testid="stExpander"] summary {
    color: var(--ink) !important;
    font-family: 'Inter', sans-serif !important;
    font-size: 0.88rem !important;
    font-weight: 700 !important;
    letter-spacing: -0.02em !important;
    padding: 14px 16px !important;
}
[data-testid="stExpander"] summary:hover {
    color: var(--np-strong) !important;
}

/* Watch / Avoid — HTML <details>; same vibe as np-col Strong/Safe/Watch/Avoid (gradient + glass) */
details.dsex-exp {
    margin: 0 0 14px 0;
    border-radius: 14px;
    overflow: hidden;
    font-family: 'Inter', sans-serif;
    border: none;
}
details.dsex-exp-watch {
    box-shadow: 0 6px 24px rgba(122, 92, 0, 0.24);
    background: linear-gradient(180deg, #ffffff 0%, #faf8f3 100%);
}
details.dsex-exp-avoid {
    box-shadow: 0 6px 24px rgba(139, 32, 32, 0.24);
    background: linear-gradient(180deg, #ffffff 0%, #faf6f6 100%);
}
details.dsex-exp > summary {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    padding: 16px 18px;
    cursor: pointer;
    list-style: none;
    font-family: 'Inter', sans-serif;
    position: relative;
    overflow: hidden;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    transition: filter 0.15s ease;
}
details.dsex-exp > summary::-webkit-details-marker {
    display: none;
}
details.dsex-exp > summary::marker {
    display: none;
    content: '';
}
/* Shine overlay (matches .np-col-header::before) */
details.dsex-exp-watch > summary::before,
details.dsex-exp-avoid > summary::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: 58%;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, transparent 100%);
    pointer-events: none;
    z-index: 0;
}
details.dsex-exp-watch > summary {
    background: linear-gradient(125deg, #4a3a06 0%, var(--np-watch) 46%, #c9a227 100%);
}
details.dsex-exp-watch > summary:hover {
    filter: brightness(1.05);
}
details.dsex-exp-avoid > summary {
    background: linear-gradient(125deg, #3d1214 0%, var(--np-danger) 46%, #c04044 100%);
}
details.dsex-exp-avoid > summary:hover {
    filter: brightness(1.05);
}
details.dsex-exp > summary > span {
    position: relative;
    z-index: 1;
}
details.dsex-exp .dsex-exp-title {
    font-size: 1.08rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: #fff;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
}
details.dsex-exp .dsex-exp-sep {
    font-size: 0.85rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.55);
    user-select: none;
}
/* Glass chip — same as .np-col-score-label */
details.dsex-exp .dsex-exp-pill {
    display: inline-block;
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    padding: 7px 14px;
    border-radius: 999px;
    color: rgba(255, 255, 255, 0.95);
    background: rgba(255, 255, 255, 0.18);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.28);
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.12) inset;
}
details.dsex-exp .dsex-exp-count {
    font-size: 0.72rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.06em;
    margin-left: auto;
    color: rgba(255, 255, 255, 0.92);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
}
details.dsex-exp > summary::after {
    content: '▸';
    position: relative;
    z-index: 1;
    font-size: 0.95rem;
    font-weight: 700;
    margin-left: 4px;
    color: rgba(255, 255, 255, 0.88);
    transition: transform 0.2s ease;
}
details.dsex-exp[open] > summary::after {
    transform: rotate(90deg);
}
details.dsex-exp:not([open]) > summary {
    border-radius: 14px;
    border-bottom: none !important;
}
details.dsex-exp[open] > summary {
    border-radius: 14px 14px 0 0;
}
details.dsex-exp-watch .dsex-exp-body {
    background: linear-gradient(180deg, #ffffff 0%, #faf8f3 100%);
    border-top: 1px solid rgba(202, 165, 60, 0.25);
}
details.dsex-exp-avoid .dsex-exp-body {
    background: linear-gradient(180deg, #ffffff 0%, #faf6f6 100%);
    border-top: 1px solid rgba(248, 113, 113, 0.25);
}
details.dsex-exp .dsex-exp-body .rank-table {
    margin-bottom: 0;
}

/* --- Reduce Streamlit top padding --- */
.block-container { padding-top: 2rem !important; }
header[data-testid="stHeader"] { height: 0; min-height: 0; }

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

/* --- Chip grid --- */
.chip-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 10px;
    margin-bottom: 12px;
}
@media (max-width: 700px) { .chip-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 500px) { .chip-grid { grid-template-columns: repeat(2, 1fr); } }
.chip-grid-3 { grid-template-columns: repeat(3, 1fr); }
@media (max-width: 500px) { .chip-grid-3 { grid-template-columns: repeat(2, 1fr); } }
.chip {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    text-decoration: none !important;
    padding: 10px 16px;
    border-radius: 28px;
    font-weight: 600;
    transition: transform 0.15s, box-shadow 0.15s;
    white-space: nowrap;
}
.chip:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}
.chip-top {
    background: linear-gradient(135deg, #2D8B76, #4CAF7D);
    color: #fff !important;
    font-size: 0.88rem;
    padding: 12px 20px;
    border-radius: 32px;
    box-shadow: 0 2px 8px rgba(76,175,125,0.3);
}
.chip-top .chip-rank {
    font-weight: 800;
    opacity: 0.7;
    font-size: 0.78rem;
}
.chip-top .chip-code {
    font-weight: 700;
    letter-spacing: 0.5px;
}
.chip-top .chip-score {
    background: rgba(255,255,255,0.2);
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 700;
}
.chip-mid {
    background: linear-gradient(135deg, #E8F5F1, #F0F7F5);
    border: 1px solid var(--primary-dim);
    color: var(--primary) !important;
    font-size: 0.78rem;
    box-shadow: 0 2px 6px rgba(26,107,90,0.1);
}
.chip-mid .chip-code {
    color: var(--primary);
    font-weight: 600;
}
.chip-mid:hover {
    background: var(--primary);
    color: #fff !important;
}
.chip-mid:hover .chip-code { color: #fff; }
.chip-watch {
    background: #FFF8EB;
    border: 1px solid #E0A040;
    border-radius: 10px;
    font-size: 0.78rem;
}
.chip-watch .chip-code { color: #B87820; font-weight: 600; }
.chip-watch:hover {
    background: #E0A040;
    color: #fff !important;
}
.chip-watch:hover .chip-code { color: #fff; }

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
.tier-label.strong-buy { font-size:0.85rem; font-weight:700; color:var(--primary); letter-spacing:3px; }
.tier-label.strong-buy::before, .tier-label.strong-buy::after { background:var(--primary); opacity:0.2; }
.tier-label.safe-buy   { font-size:0.82rem; font-weight:700; color:var(--primary-dim); letter-spacing:3px; }
.tier-label.safe-buy::before, .tier-label.safe-buy::after { background:var(--primary-dim); opacity:0.2; }
.tier-label.watch      { font-size:0.82rem; font-weight:700; color:#B87820; letter-spacing:3px; }
.tier-label.watch::before, .tier-label.watch::after { background:#E0A040; opacity:0.3; }
.tier-label.dont-buy   { font-size:0.82rem; font-weight:700; color:var(--negative); letter-spacing:3px; }
.tier-label.dont-buy::before, .tier-label.dont-buy::after { background:var(--negative); opacity:0.2; }

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

/* --- Rest list (scrollable chip grid) --- */
.rest-scroll {
    max-height: 40vh;
    overflow-y: auto;
    border: 1px solid var(--border);
    background: var(--bg-card);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 12px;
}
.rest-scroll::-webkit-scrollbar { width: 5px; }
.rest-scroll::-webkit-scrollbar-track { background: transparent; }
.rest-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
.chip-rest {
    background: linear-gradient(135deg, #F0F0EC, #F5F5F3);
    border: 1px solid var(--border);
    color: var(--text-secondary) !important;
    font-size: 0.72rem;
    padding: 6px 12px;
}
.chip-rest .chip-rank {
    font-size: 0.62rem;
    color: var(--text-muted);
    font-weight: 600;
}
.chip-rest .chip-code {
    font-weight: 600;
    color: var(--text-secondary);
}
.chip-rest:hover {
    background: linear-gradient(135deg, #5B8DEF, #4CAF7D);
    border-color: transparent;
    color: #fff !important;
    box-shadow: 0 2px 8px rgba(91,141,239,0.2);
}
.chip-rest:hover .chip-code { color: #fff; }
.chip-rest:hover .chip-rank { color: rgba(255,255,255,0.7); }
.chip-danger {
    background: var(--negative-light);
    border: 1px solid var(--negative);
    color: var(--negative) !important;
    font-size: 0.78rem;
}
.chip-danger .chip-code { color: var(--negative); font-weight: 700; }
.chip-danger:hover {
    background: var(--negative);
    color: #fff !important;
}
.chip-danger:hover .chip-code { color: #fff; }

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
.pillar-block { border-bottom: 1px solid var(--border-light); }
.pillar-block:last-of-type { border-bottom: none; }
.pillar-block .factor-row { border-bottom: none; padding-bottom: 2px; }
.sub-chips-row { display: flex; flex-wrap: wrap; gap: 4px; padding: 2px 0 6px 4px; }
.sub-chip { font-size: 0.6rem; padding: 1px 6px; border: 1px solid; border-radius: 3px; letter-spacing: 0.2px; white-space: nowrap; }
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

/* --- Verdict Bar --- */
.verdict-bar {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0;
    border: 1px solid var(--border);
    background: var(--bg-card);
    border-radius: var(--radius);
    margin-bottom: 10px;
    box-shadow: var(--shadow);
    overflow: hidden;
}
@media (max-width: 800px) { .verdict-bar { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 500px) { .verdict-bar { grid-template-columns: repeat(2, 1fr); } }
.vb-cell {
    padding: 14px 16px;
    border-right: 1px solid var(--border-light);
    display: flex;
    flex-direction: column;
    gap: 3px;
}
.vb-cell:last-child { border-right: none; }
.vb-label {
    font-size: 0.58rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    font-weight: 500;
}
.vb-score-num {
    font-size: 2.2rem;
    font-weight: 700;
    line-height: 1;
}
.vb-val {
    font-size: 0.92rem;
    font-weight: 700;
    color: var(--text);
    line-height: 1.2;
}
.vb-sub {
    font-size: 0.68rem;
    color: var(--text-muted);
}
.verdict-narrative {
    font-size: 0.8rem;
    color: var(--text-secondary);
    background: var(--bg-input);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 8px 14px;
    margin-bottom: 18px;
    line-height: 1.6;
}

/* --- Signal Flags --- */
.flags-col {
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.flag-green {
    background: var(--primary-light);
    color: var(--primary);
    border: 1px solid rgba(26,107,90,0.25);
    border-radius: var(--radius-sm);
    padding: 6px 12px;
    font-size: 0.76rem;
    font-weight: 500;
    line-height: 1.4;
}
.flag-red {
    background: var(--negative-light);
    color: var(--negative);
    border: 1px solid rgba(212,91,91,0.25);
    border-radius: var(--radius-sm);
    padding: 6px 12px;
    font-size: 0.76rem;
    font-weight: 500;
    line-height: 1.4;
}

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

/* ===== Newspaper Homepage ===== */

/* Masthead */
.masthead {
    text-align: center;
    padding: 8px 0 0;
}
.masthead-eyebrow {
    font-family: 'Inter', sans-serif;
    font-size: 0.58rem;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #b45309;
    font-weight: 700;
    margin-bottom: 10px;
}
.masthead-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 4.2rem;
    font-weight: 700;
    color: var(--ink);
    letter-spacing: 6px;
    line-height: 1;
    margin-bottom: 10px;
}
.masthead-rule-double {
    border-top: 3px solid var(--rule-dark);
    border-bottom: 1px solid var(--rule-dark);
    padding-top: 3px;
    margin-bottom: 10px;
}
.masthead-subbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.65rem;
    color: var(--ink-muted);
    font-family: 'Inter', sans-serif;
    letter-spacing: 0.3px;
    padding: 2px 2px;
}
.masthead-rule-single {
    height: 1px;
    background: var(--rule);
    margin-top: 10px;
    margin-bottom: 4px;
}

.masthead-modern {
    margin: 0 0 8px 0;
    padding: 12px 16px 14px;
    border-radius: 14px;
    border: none;
    background: #ffb343;
    box-shadow: none;
}
.masthead-modern .masthead-eyebrow {
    display: inline-block;
    margin-bottom: 6px;
    padding: 5px 12px;
    font-size: 0.56rem;
    letter-spacing: 2px;
    font-weight: 800;
    color: #78350f;
    background: #fff;
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 999px;
    box-shadow: none;
}
.masthead-modern .masthead-title {
    font-size: 2.35rem !important;
    line-height: 1.05;
    color: var(--ink) !important;
    letter-spacing: 3px;
    text-shadow: none;
    margin-bottom: 0;
}

/* Hero band */
.hero-band {
    text-align: center;
    padding: 22px 10% 18px;
    border-bottom: 1px solid var(--rule);
    margin-bottom: 28px;
}
.hero-headline {
    font-family: 'Playfair Display', Georgia, serif;
    font-style: italic;
    font-size: 1.45rem;
    color: var(--ink);
    line-height: 1.6;
    margin-bottom: 18px;
}
.hero-pills {
    display: flex;
    justify-content: center;
    gap: 10px;
    flex-wrap: wrap;
}
.score-pill {
    font-family: 'Inter', sans-serif;
    font-size: 0.7rem;
    font-weight: 600;
    padding: 5px 16px;
    border-radius: 2px;
    letter-spacing: 0.4px;
}
.score-pill-top    { background: #EAF3EC; color: var(--np-strong); border: 1px solid #2D6A3F; }
.score-pill-mid    { background: #E6EEF4; color: var(--np-safe);   border: 1px solid #1A4D6B; }
.score-pill-watch  { background: #FBF5DF; color: var(--np-watch);  border: 1px solid #7A5C00; }
.score-pill-danger { background: #F5E8E8; color: var(--np-danger); border: 1px solid #8B2020; }

.hero-modern {
    padding: 24px 16px 26px;
    margin-bottom: 28px;
    border: none;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.58);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid rgba(212, 180, 131, 0.38);
    box-shadow: 0 6px 28px rgba(26, 18, 8, 0.06);
}
.hero-modern .score-pill {
    font-size: 0.72rem;
    font-weight: 700;
    padding: 9px 20px;
    border-radius: 999px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.hero-modern .score-pill:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
}

/* Newspaper column header */
.np-col-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 2px solid var(--ink);
    margin-bottom: 0;
}
.np-col-label {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: 0.3px;
}
/* Strong Buy & Safe Buy — gradient card headers */
.np-col-header.np-col-strong,
.np-col-header.np-col-safe {
    position: relative;
    overflow: hidden;
    gap: 14px;
    padding: 16px 18px;
    border: none;
    border-radius: 14px 14px 0 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}
.np-col-header.np-col-strong::before,
.np-col-header.np-col-safe::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: 58%;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.16) 0%, transparent 100%);
    pointer-events: none;
}
.np-col-header.np-col-strong {
    background: linear-gradient(125deg, #153d24 0%, var(--np-strong) 42%, #3d9160 100%);
    box-shadow: 0 6px 24px rgba(45, 106, 63, 0.28);
}
.np-col-header.np-col-safe {
    background: linear-gradient(125deg, #0c3048 0%, var(--np-safe) 45%, #2a7aa3 100%);
    box-shadow: 0 6px 24px rgba(26, 77, 107, 0.26);
}
.np-col-header.np-col-strong .np-col-label,
.np-col-header.np-col-safe .np-col-label {
    position: relative;
    z-index: 1;
    font-family: 'Inter', sans-serif;
    font-size: 1.08rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: #fff;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
}
.np-col-header.np-col-strong .np-col-score-label,
.np-col-header.np-col-safe .np-col-score-label {
    position: relative;
    z-index: 1;
    flex-shrink: 0;
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.95);
    background: rgba(255, 255, 255, 0.18);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    padding: 7px 14px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.28);
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.12) inset;
}

/* Watch & Avoid — gradient headers (match Strong / Safe) */
.np-col-header.np-col-watch,
.np-col-header.np-col-danger {
    position: relative;
    overflow: hidden;
    gap: 14px;
    padding: 16px 18px;
    border: none;
    border-radius: 14px 14px 0 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}
.np-col-header.np-col-watch::before,
.np-col-header.np-col-danger::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: 58%;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, transparent 100%);
    pointer-events: none;
}
.np-col-header.np-col-watch {
    background: linear-gradient(125deg, #4a3a06 0%, var(--np-watch) 46%, #c9a227 100%);
    box-shadow: 0 6px 24px rgba(122, 92, 0, 0.24);
}
.np-col-header.np-col-danger {
    background: linear-gradient(125deg, #3d1214 0%, var(--np-danger) 46%, #c04044 100%);
    box-shadow: 0 6px 24px rgba(139, 32, 32, 0.24);
}
.np-col-header.np-col-watch .np-col-label,
.np-col-header.np-col-danger .np-col-label {
    position: relative;
    z-index: 1;
    font-family: 'Inter', sans-serif;
    font-size: 1.08rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: #fff;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
}
.np-col-header.np-col-watch .np-col-score-label,
.np-col-header.np-col-danger .np-col-score-label {
    position: relative;
    z-index: 1;
    flex-shrink: 0;
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.95);
    background: rgba(255, 255, 255, 0.18);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    padding: 7px 14px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.28);
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.12) inset;
}
.np-col-score-label {
    font-family: 'Inter', sans-serif;
    font-size: 0.6rem;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--ink-muted);
}

/* Rank table rows */
.rank-table {
    display: table;
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 24px;
}
.rank-row {
    display: table-row;
    text-decoration: none !important;
    color: var(--ink) !important;
    font-family: 'Inter', sans-serif;
    transition: background 0.1s;
}
.rank-row:nth-child(even)          { background: rgba(201,162,39,0.05); }
.rank-row:hover                    { background: var(--gold-light); }
/* Tier-tinted row bands */
.rank-table-strong .rank-row:nth-child(even) { background: rgba(45,106,63,0.05); }
.rank-table-strong .rank-row:hover           { background: rgba(45,106,63,0.11); }
.rank-table-safe .rank-row:nth-child(even)   { background: rgba(26,77,107,0.05); }
.rank-table-safe .rank-row:hover             { background: rgba(26,77,107,0.10); }
.rank-table-watch .rank-row:nth-child(even) { background: rgba(122,92,0,0.06); }
.rank-table-watch .rank-row:hover            { background: rgba(122,92,0,0.12); }
.rank-table-avoid .rank-row:nth-child(even) { background: rgba(139,32,32,0.05); }
.rank-table-avoid .rank-row:hover            { background: rgba(139,32,32,0.10); }
.rr-rank, .rr-code, .rr-company, .rr-score {
    display: table-cell;
    vertical-align: middle;
    padding: 9px 8px;
    border-bottom: 1px solid #EDE3D0;
}
.rr-rank    { font-size: 0.74rem; color: var(--ink-muted); text-align: right; white-space: nowrap; width: 1%; padding-right: 4px; }
.rr-code    { width: 1%; white-space: nowrap; padding-right: 14px; vertical-align: middle; }
/* Trading code pill — shared shape; color system per tier */
.rr-ticker-pill {
    display: inline-block;
    font-family: 'Inter', sans-serif;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.11em;
    text-transform: uppercase;
    padding: 3px 10px;
    border-radius: 4px;
    line-height: 1.2;
}
.rank-table-strong .rr-ticker-pill {
    color: var(--np-strong);
    background: linear-gradient(165deg, rgba(45,106,63,0.14) 0%, rgba(45,106,63,0.26) 100%);
    border: 1px solid rgba(45,106,63,0.5);
    box-shadow: 0 1px 2px rgba(45,106,63,0.12);
}
.rank-table-safe .rr-ticker-pill {
    color: var(--np-safe);
    background: linear-gradient(165deg, rgba(26,77,107,0.1) 0%, rgba(26,77,107,0.2) 100%);
    border: 1px solid rgba(26,77,107,0.45);
    box-shadow: 0 1px 2px rgba(26,77,107,0.08);
}
.rank-table-watch .rr-ticker-pill {
    color: var(--np-watch);
    background: linear-gradient(165deg, rgba(122,92,0,0.12) 0%, rgba(122,92,0,0.22) 100%);
    border: 1px dashed rgba(122,92,0,0.55);
    border-radius: 6px;
}
.rank-table-avoid .rr-ticker-pill {
    color: var(--np-danger);
    background: rgba(139,32,32,0.09);
    border: 1px solid rgba(139,32,32,0.4);
    border-left: 3px solid var(--np-danger);
    border-radius: 2px 5px 5px 2px;
}
/* Middle cell: fill row; indicators centered as a group */
.rr-company    {
    width: 100%;
    padding-left: 10px;
    padding-right: 10px;
    border-left: 1px solid #EDE3D0;
    text-align: center;
}
.rr-indicators {
    display: grid;
    grid-template-columns: 1fr min-content 1fr min-content 1fr;
    align-items: center;
    justify-items: center;
    column-gap: 20px;
    row-gap: 4px;
    width: 100%;
    line-height: 1.35;
}
.rr-slot {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: nowrap;
    gap: 6px;
    min-width: 0;
    width: 100%;
}
.rr-ltp        { font-size: 0.76rem; color: var(--ink-muted); }
.rr-sep        {
    font-size: 0.68rem;
    color: var(--ink-muted);
    opacity: 0.85;
    line-height: 1;
    align-self: center;
}
.rr-chg        { font-size: 0.74rem; font-weight: 600; white-space: nowrap; }
.rr-chg-up     { color: #4CAF7D; }
.rr-chg-dn     { color: #D45B5B; }
.rr-chg-flat   { color: var(--ink-muted); }
.rr-eps        { font-size: 0.74rem; font-weight: 600; white-space: nowrap; }
.rr-div        { font-size: 0.74rem; color: var(--ink-muted); white-space: nowrap; }
.rr-score   { font-size: 0.92rem; font-weight: 700; text-align: right; white-space: nowrap; width: 1%; padding-left: 14px; }
.rr-score-top    { color: var(--np-strong); font-size: 1.05rem; }
.rr-score-mid    { color: var(--np-safe); font-size: 0.92rem; }
.rr-score-watch  { color: var(--np-watch);  }
.rr-score-danger { color: var(--np-danger); }

/* Section rule (newspaper section break) */
.section-rule {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 32px 0 24px;
}
.section-rule::before, .section-rule::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--rule);
}
.section-rule-text {
    font-family: 'Inter', sans-serif;
    font-size: 0.58rem;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--ink-muted);
    white-space: nowrap;
}
.section-rule-modern {
    margin: 38px 0 28px;
    gap: 18px;
}
.section-rule-modern::before,
.section-rule-modern::after {
    height: 2px;
    border-radius: 2px;
    background: linear-gradient(90deg, transparent 0%, var(--gold) 35%, var(--rule) 65%, transparent 100%);
    opacity: 0.8;
}
.section-rule-modern .section-rule-text {
    font-size: 0.64rem;
    font-weight: 800;
    letter-spacing: 3px;
    color: var(--ink);
    padding: 9px 18px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(250, 246, 238, 0.98));
    border: 1px solid rgba(212, 180, 131, 0.45);
    border-radius: 999px;
    box-shadow: 0 3px 14px rgba(26, 18, 8, 0.07);
}

/* Info strip (Market Intelligence: declarations + record dates) */
.info-strip {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0;
    border-top: 2px solid var(--ink);
    border-bottom: 1px solid var(--rule);
    padding: 18px 0 20px;
    margin-bottom: 20px;
}
@media (max-width: 700px) { .info-strip { grid-template-columns: repeat(2, 1fr); } }
.info-col {
    padding: 0 18px;
    border-right: 1px solid var(--rule);
}
.info-col:first-child { padding-left: 2px; }
.info-col:last-child  { border-right: none; padding-right: 2px; }
.info-col-header {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: var(--ink);
    border-bottom: 1px solid var(--rule);
    padding-bottom: 6px;
    margin-bottom: 9px;
}
.info-col-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 4px 0;
    font-size: 0.7rem;
    font-family: 'Inter', sans-serif;
    color: var(--ink-2);
    border-bottom: 1px solid #EDE3D0;
    text-decoration: none !important;
    gap: 6px;
}
/* Same grid on every row so dates stack vertically (max-content per row broke alignment) */
.info-col-row--intel {
    display: grid;
    grid-template-columns: 8.25rem 4.75rem 2.5rem;
    align-items: baseline;
    column-gap: 6px;
    justify-content: start;
}
.info-col-row--intel .icr-key {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.info-col-row--intel .icr-sub {
    flex: unset;
    text-align: center;
    font-variant-numeric: tabular-nums;
    justify-self: stretch;
}
.info-col-row--intel .icr-val { justify-self: end; }
.info-col-row:last-child { border-bottom: none; }
.info-col-row:hover { color: var(--ink); }
.icr-key { color: var(--ink); font-weight: 600; flex-shrink: 0; }
.icr-sub { color: var(--ink-muted); font-size: 0.62rem; flex: 1; text-align: center; }
.icr-val { color: var(--gold); font-weight: 700; flex-shrink: 0; }

.info-strip-modern {
    border: none;
    border-radius: 18px;
    overflow: hidden;
    padding: 22px 10px 24px;
    margin-bottom: 22px;
    background: linear-gradient(180deg, #ffffff 0%, #faf7f0 100%);
    border: 1px solid rgba(212, 180, 131, 0.42);
    box-shadow: 0 10px 36px rgba(26, 18, 8, 0.08);
}
.info-strip-modern .info-col-header {
    font-family: 'Inter', sans-serif;
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.16em;
    border-bottom: none;
    padding-bottom: 0;
    margin-bottom: 12px;
    color: var(--ink);
    display: flex;
    align-items: center;
    gap: 10px;
}
.info-strip-modern .info-col-header::before {
    content: '';
    width: 4px;
    height: 15px;
    border-radius: 3px;
    background: linear-gradient(180deg, var(--gold), var(--np-strong));
    flex-shrink: 0;
}
.info-strip-modern .info-col-row--intel {
    padding: 6px 10px;
    margin-bottom: 2px;
    border-radius: 8px;
    border-bottom: none;
    background: rgba(255, 255, 255, 0.65);
}
.info-strip-modern .info-col-row--intel:hover {
    background: rgba(240, 228, 184, 0.35);
}

/* How We Score (below Market Intelligence) */
.how-we-score-box {
    border: 1px solid var(--ink);
    padding: 14px 16px 16px;
    margin-bottom: 20px;
    background: var(--bg-input);
}
.how-we-score-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: var(--ink);
    border-bottom: 1px solid var(--rule);
    padding-bottom: 8px;
    margin-bottom: 10px;
}
.how-we-score-modern {
    border: none;
    border-radius: 18px;
    padding: 20px 20px 22px;
    margin-bottom: 22px;
    background: linear-gradient(145deg, #f9fbfa 0%, #ecf4f1 38%, #faf8f3 100%);
    box-shadow:
        0 10px 32px rgba(26, 107, 90, 0.09),
        0 0 0 1px rgba(26, 107, 90, 0.11);
}
.how-we-score-modern .how-we-score-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.28rem;
    font-weight: 600;
    font-style: italic;
    letter-spacing: 0.02em;
    text-transform: none;
    color: #1a3d28;
    border-bottom-color: rgba(45, 106, 63, 0.28);
    padding-bottom: 14px;
    margin-bottom: 16px;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.85);
}
.how-we-score-modern .hws-row {
    gap: 7px;
    padding: 12px 2px 14px;
    border-bottom-color: rgba(45, 106, 63, 0.14);
}
.how-we-score-modern .hws-label {
    font-family: 'Inter', sans-serif;
    font-size: 0.84rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    text-transform: none;
    color: var(--np-strong);
    line-height: 1.25;
}
.how-we-score-modern .hws-desc {
    font-size: 0.78rem;
    font-weight: 500;
    line-height: 1.58;
    color: var(--ink-2);
    letter-spacing: 0.01em;
}
.how-we-score-modern .info-col-row {
    border: none;
    padding: 9px 14px;
    margin-bottom: 6px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.75);
    border: 1px solid rgba(212, 180, 131, 0.22);
    box-shadow: 0 1px 3px rgba(26, 18, 8, 0.04);
}
.how-we-score-modern .info-col-row:last-child { margin-bottom: 0; }

/* How We Score — pillar rows */
.hws-row        { display: flex; flex-direction: column; gap: 2px; padding: 7px 0; border-bottom: 1px solid #EDE3D0; }
.hws-row:last-child { border-bottom: none; }
.hws-label      { font-size: 0.68rem; font-weight: 700; color: var(--ink); text-transform: uppercase; letter-spacing: 0.4px; }
.hws-desc       { font-size: 0.62rem; color: var(--ink-muted); line-height: 1.45; }

/* Footer */
.np-footer {
    border-top: 2px solid var(--ink);
    padding-top: 10px;
    margin-top: 12px;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
}
.np-footer-brand {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 0.82rem;
    color: var(--ink);
    font-weight: 700;
    letter-spacing: 1px;
}
.np-footer-tagline {
    font-family: 'Inter', sans-serif;
    font-size: 0.6rem;
    color: var(--ink-muted);
    letter-spacing: 0.3px;
    margin-top: 2px;
}
.np-footer-audit {
    font-family: 'Inter', sans-serif;
    font-size: 0.65rem;
    color: var(--ink-2);
    text-decoration: none !important;
    letter-spacing: 1px;
    border: 1px solid var(--rule);
    padding: 5px 14px;
    transition: background 0.15s;
}
.np-footer-audit:hover { background: var(--gold-light); border-color: var(--gold); }

.np-footer-modern {
    border-top: none;
    margin-top: 22px;
    margin-bottom: 28px;
    padding: 22px 20px 26px;
    border-radius: 18px;
    background: linear-gradient(180deg, rgba(26, 18, 8, 0.045) 0%, rgba(255, 253, 247, 0.4) 100%);
    border: 1px solid rgba(212, 180, 131, 0.38);
    box-shadow: 0 6px 24px rgba(26, 18, 8, 0.05);
}
.np-footer-modern .np-footer-brand {
    font-size: 0.95rem;
    letter-spacing: 2px;
}
.np-footer-modern .np-footer-tagline {
    font-size: 0.64rem;
    margin-top: 4px;
}
.np-footer-modern .np-footer-audit {
    border-radius: 999px;
    padding: 8px 20px;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
    border-color: rgba(212, 180, 131, 0.5);
    transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}
.np-footer-modern .np-footer-audit:hover {
    background: var(--gold-light);
    border-color: var(--gold);
    transform: translateY(-1px);
}

.rank-table-strong,
.rank-table-safe {
    border-radius: 0 0 14px 14px;
    overflow: hidden;
}
.rank-table-strong { box-shadow: 0 10px 32px rgba(45, 106, 63, 0.1); }
.rank-table-safe   { box-shadow: 0 10px 32px rgba(26, 77, 107, 0.1); }
.rank-table-watch,
.rank-table-avoid {
    border-radius: 0 0 14px 14px;
    overflow: hidden;
}
.rank-table-watch { box-shadow: 0 8px 26px rgba(122, 92, 0, 0.09); }
.rank-table-avoid { box-shadow: 0 8px 26px rgba(139, 32, 32, 0.09); }

/* Show more / less — default warm yellow (all secondary pills) */
div[data-testid="stButton"] button[kind="secondary"] {
    background: #fffbeb !important;
    border: 1px solid #fde68a !important;
    border-radius: 999px !important;
    color: #713f12 !important;
    font-size: 0.68rem !important;
    letter-spacing: 0.08em !important;
    font-weight: 600 !important;
    padding: 10px 18px !important;
    width: 100% !important;
    box-shadow: 0 2px 10px rgba(251, 191, 36, 0.18) !important;
    margin-top: 6px !important;
    transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease !important;
}
div[data-testid="stButton"] button[kind="secondary"]:hover {
    background: #fef3c7 !important;
    color: #422006 !important;
    border-color: #fbbf24 !important;
    box-shadow: 0 4px 16px rgba(251, 191, 36, 0.22) !important;
}

/* Tier overrides — distinct yellow shades after each rank table */
div[data-testid="element-container"]:has(.rank-table-strong)
    + div[data-testid="element-container"]
    button[kind="secondary"] {
    background: #fffbeb !important;
    border-color: #fcd34d !important;
    color: #713f12 !important;
    box-shadow: 0 2px 10px rgba(251, 191, 36, 0.22) !important;
}
div[data-testid="element-container"]:has(.rank-table-strong)
    + div[data-testid="element-container"]
    button[kind="secondary"]:hover {
    background: #fef3c7 !important;
    border-color: #f59e0b !important;
}

div[data-testid="element-container"]:has(.rank-table-safe)
    + div[data-testid="element-container"]
    button[kind="secondary"] {
    background: #fefce8 !important;
    border-color: #fde047 !important;
    color: #713f12 !important;
    box-shadow: 0 2px 10px rgba(250, 204, 21, 0.2) !important;
}
div[data-testid="element-container"]:has(.rank-table-safe)
    + div[data-testid="element-container"]
    button[kind="secondary"]:hover {
    background: #fef9c3 !important;
    border-color: #facc15 !important;
    color: #422006 !important;
}

</style>
"""


def style_fig(fig):
    """Apply clean minimal styling to any Plotly figure."""
    fig.update_layout(
        paper_bgcolor="#FEFDF7",
        plot_bgcolor="#FFFFFF",
        font=dict(family="Inter, -apple-system, sans-serif", color="#1A1208", size=12),
        colorway=["#1A6B5A", "#C9A227", "#2D6A3F", "#4A3F35", "#8B2020"],
        legend=dict(font=dict(color="#4A3F35")),
        margin=dict(l=0, r=0, t=36, b=0),
    )
    fig.update_xaxes(gridcolor="#E8DFC8", zerolinecolor="#E8DFC8", tickfont=dict(color="#9A8E83"))
    fig.update_yaxes(gridcolor="#E8DFC8", zerolinecolor="#E8DFC8", tickfont=dict(color="#9A8E83"))
    fig.update_traces(
        textfont=dict(color="#2D3436"),
        marker=dict(line=dict(width=0)),
        selector=dict(type="bar"),
    )
    return fig
