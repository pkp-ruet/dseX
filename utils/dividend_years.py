"""Which fiscal year a dividend declaration belongs to, and whether that year is
complete — the one rule every reader of the `dividend_declarations` ledger uses.

Three mistakes this module exists to stop (2026-11-04 audit, DT1 / DT2):

* A subsidiary's or associate's dividend saved as the company's own. "UPGDCL:
  Dividend declaration of a Subsidiary", "KPCL: Declaration of Dividend by
  Associate Company" (its 35% stake read as a 35% dividend, a 39% yield).
* An interim filed under the calendar year of its period end. MARICO's year
  ends in March, so an interim for the quarter to Sep 2025 belongs to FY2026,
  not FY2025; a June year-end company's half-year interim (to Dec 2025) belongs
  to FY2026 too.
* A year with only an interim treated as the year. GP's FY2026 interim (105%)
  replaced FY2025's 215% total, so its yield read 4.6% instead of ~9.3%.

Pure: no database access. Rows are ledger dicts with `title`, `period_end`
(datetime / date / ISO string), `cash_pct` (or `dividend_pct`) and
`dividend_type` ("Interim" / "Final").
"""
from __future__ import annotations

import re
from collections import Counter
from datetime import date, datetime
from typing import Iterable, Optional

# A dividend declared by another company in the group, posted under this code.
OTHER_COMPANY_TITLE_RE = re.compile(
    r"\b(?:subsidiar(?:y|ies)|associate(?:d)?\s+compan(?:y|ies)|sister\s+(?:concern|compan(?:y|ies))"
    r"|joint\s+venture)\b",
    re.IGNORECASE,
)


def is_other_company_dividend(title: Optional[str]) -> bool:
    """True for "Dividend declaration of a Subsidiary" and the like."""
    return bool(OTHER_COMPANY_TITLE_RE.search(title or ""))


def own_rows(rows: Iterable[dict]) -> list[dict]:
    """The ledger rows that are the company's own declarations."""
    return [r for r in rows or [] if not is_other_company_dividend(r.get("title"))]


def _as_date(v) -> Optional[date]:
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    if isinstance(v, str) and len(v) >= 10:
        try:
            return date.fromisoformat(v[:10])
        except ValueError:
            return None
    return None


def _is_final(row: dict) -> bool:
    return not str(row.get("dividend_type") or "").strip().lower().startswith("interim")


def _cash(row: dict) -> Optional[float]:
    for k in ("cash_pct", "dividend_pct"):
        v = row.get(k)
        if v is None:
            continue
        try:
            return float(v)
        except (TypeError, ValueError):
            continue
    return None


def year_end_month(rows: Iterable[dict]) -> Optional[int]:
    """The company's fiscal year-end month: the commonest period-end month of
    its final dividends (a final is declared for the year just ended). None when
    the ledger holds no final with a period end."""
    months = Counter()
    for r in rows or []:
        if not _is_final(r):
            continue
        pe = _as_date(r.get("period_end"))
        if pe:
            months[pe.month] += 1
    if not months:
        return None
    return months.most_common(1)[0][0]


def fiscal_year(period_end, ye_month: Optional[int]) -> Optional[int]:
    """The fiscal year (named by the calendar year it ends in, as DSE's audited
    table does) that a period ending on `period_end` falls in. With no known
    year-end month, the period end's own year (the old rule)."""
    pe = _as_date(period_end)
    if pe is None:
        return None
    if not ye_month:
        return pe.year
    return pe.year if pe.month <= ye_month else pe.year + 1


def ledger_years(rows: Iterable[dict]) -> dict[int, dict]:
    """{fiscal year: {"cash_pct": interim + final summed, "complete": a final
    was declared}} for the company's own declarations."""
    mine = own_rows(rows)
    ye = year_end_month(mine)
    out: dict[int, dict] = {}
    for r in mine:
        cash = _cash(r)
        fy = fiscal_year(r.get("period_end"), ye)
        if fy is None or cash is None:
            continue
        slot = out.setdefault(fy, {"cash_pct": 0.0, "complete": False})
        slot["cash_pct"] = round(slot["cash_pct"] + cash, 4)
        if _is_final(r):
            slot["complete"] = True
    return out


def ledger_cash_by_year(rows: Iterable[dict], complete_only: bool = False) -> dict[int, float]:
    """{fiscal year: cash %} — every year, or only years a final has closed."""
    return {y: v["cash_pct"] for y, v in ledger_years(rows).items()
            if not complete_only or v["complete"]}


def group_by_code(rows: Iterable[dict]) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {}
    for r in rows or []:
        code = r.get("trading_code")
        if code:
            out.setdefault(code, []).append(r)
    return out
