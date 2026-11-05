"""
Cash / stock dividend % out of a DSE dividend-declaration body.

Pure text parsing, shared by the news scraper (``scrapers/news.py``) and the
backend (``backend/services/notices.py``). It lives here, not in the scraper,
because the backend on Render installs only ``backend/requirements.txt``: the
scraper module imports BeautifulSoup, and reading it from the backend made
``/api/research/results-season`` fail (2026-11-06).
"""
from __future__ import annotations

import re

_PCT_RE = re.compile(r"(\d+(?:\.\d+)?)%")
_NO_DIVIDEND_RE = re.compile(r"no\s+(?:cash\s+)?dividend", re.IGNORECASE)
# Both orderings occur: "175% Cash Dividend" and "Cash Dividend of 475%".
_CASH_RES = (
    re.compile(r"(\d+(?:\.\d+)?)\s*%\s*(?:final\s+|interim\s+)?cash", re.IGNORECASE),
    re.compile(r"cash\s+dividend\s*(?:of|@|:|at)?\s*(\d+(?:\.\d+)?)\s*%", re.IGNORECASE),
)
_STOCK_RES = (
    re.compile(r"(\d+(?:\.\d+)?)\s*%\s*(?:stock|bonus)", re.IGNORECASE),
    re.compile(r"(?:stock|bonus)\s+(?:dividend|share)s?\s*(?:of|@|:|at)?\s*(\d+(?:\.\d+)?)\s*%", re.IGNORECASE),
)


def _first_pct(text: str, patterns) -> float | None:
    """Earliest-in-string match across `patterns`, so a headline figure beats a
    parenthetical one ("40% Final Cash Dividend (including 18% interim ...)")."""
    best_pos = None
    best_val = None
    for pat in patterns:
        m = pat.search(text)
        if m and (best_pos is None or m.start() < best_pos):
            best_pos = m.start()
            try:
                best_val = float(m.group(1))
            except (TypeError, ValueError):
                continue
    return best_val


def parse_dividend_parts(body: str) -> tuple[float, float]:
    """Split a declaration body into (cash %, stock/bonus %) of face value.

    "No dividend" is a real answer (0, 0), not missing data. A bare percentage
    with no cash/stock wording is read as cash — the old single-figure behaviour.
    """
    if not body:
        return 0.0, 0.0

    cash = _first_pct(body, _CASH_RES)
    stock = _first_pct(body, _STOCK_RES)

    if _NO_DIVIDEND_RE.search(body):
        # A plain "No Dividend" is (0, 0). "No cash dividend but 10% stock"
        # still declares a bonus, so keep the stock leg rather than zeroing both.
        return 0.0, stock or 0.0

    if cash is None and stock is None:
        m = _PCT_RE.search(body)
        cash = float(m.group(1)) if m else 0.0

    return cash or 0.0, stock or 0.0
