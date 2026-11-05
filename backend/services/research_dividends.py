"""Dividends you can count on — a Premium research report (2026-11-05).

The judgement the dividend calendar deliberately leaves out, market-wide:

  * **The record** — cash and bonus dividends for each of the last five
    years: paid every year or skipped, raised or cut.
  * **Bonus shares instead of cash** — a company whose cash % fell while it
    handed out bonus shares. Restated per share held five years ago (each
    bonus multiplies the shares), so the reader sees whether the cash really
    shrank.
  * **At risk next time** — the dividend calendar's own safety rule
    (`dividend_safety`, the stock page's wording) on companies that paid cash.
  * **Steady payers** — cash every year of five, the safety rule says steady,
    and (where we can tell) the profit came in as cash; with the yield after
    the 10% tax.

Pure: data in, dicts out. Facts only — never a buy or sell call.
"""
from __future__ import annotations

from typing import Optional

from backend.services.research_reports import _n, bi

YEARS = 5
MIN_YEARS = 3
CUT_SHARE = 0.10          # cash % down at least this share of last year's
TAX_PCT = 10.0            # dividend tax with a TIN
FACE = 10.0               # DSE face value for nearly every company

MOVE_WORDS = {
    "raised": bi("Raised", "বাড়িয়েছে"),
    "same": bi("Kept the same", "একই রেখেছে"),
    "cut": bi("Cut", "কমিয়েছে"),
    "skipped": bi("Paid nothing", "কিছুই দেয়নি"),
    "back": bi("Paid again", "আবার দিয়েছে"),
    "none": bi("No cash two years running", "দুই বছর নগদ নেই"),
}


def record(years: dict[int, dict]) -> list[dict]:
    """The last YEARS fiscal years, oldest first: [{year, cash_pct, stock_pct}]."""
    ys = sorted(years)[-YEARS:]
    return [{"year": y, "cash_pct": _n(years[y].get("cash_pct")) or 0.0,
             "stock_pct": _n(years[y].get("stock_pct")) or 0.0} for y in ys]


def latest_move(rec: list[dict]) -> Optional[str]:
    if len(rec) < 2:
        return None
    a, b = rec[-2]["cash_pct"], rec[-1]["cash_pct"]
    if a <= 0 and b <= 0:
        return "none"
    if a <= 0:
        return "back"
    if b <= 0:
        return "skipped"
    if b < a * (1 - CUT_SHARE):
        return "cut"
    if b > a * (1 + 0.01):
        return "raised"
    return "same"


def per_original_share(rec: list[dict], face: float = FACE) -> list[dict]:
    """Cash on ONE share held at the start of the record, year by year: each
    year's cash a share × the shares that one share had grown into by then
    (a bonus for year y is issued after y, so it lifts y+1 onwards)."""
    mult, out = 1.0, []
    for r in rec:
        out.append({"year": r["year"], "tk": round(r["cash_pct"] / 100 * face * mult, 2)})
        mult *= 1 + r["stock_pct"] / 100
    return out


def bonus_instead(rec: list[dict]) -> bool:
    """Cash % lower than three years earlier while it handed out bonus shares
    in the years between."""
    if len(rec) < 3:
        return False
    old, new = rec[-3]["cash_pct"], rec[-1]["cash_pct"]
    return old > 0 and new < old * (1 - CUT_SHARE) and any(r["stock_pct"] > 0 for r in rec[-3:])


def dividend_report(years: dict[str, dict[int, dict]], safety: dict[str, dict],
                    yields: dict[str, Optional[float]], cash_labels: dict[str, str],
                    info: dict[str, dict], faces: dict[str, float]) -> dict:
    """`years` = {code: {year: {cash_pct, stock_pct}}}; `safety` = {code:
    dividend_safety(...)}; `yields` = gross yield %; `cash_labels` = the
    profit-vs-cash label from research_quality (may be missing)."""
    items = []
    for code, ys in years.items():
        meta = info.get(code)
        if not meta or not meta.get("graded"):
            continue
        rec = record(ys)
        if len(rec) < MIN_YEARS:
            continue
        paid = sum(1 for r in rec if r["cash_pct"] > 0)
        move = latest_move(rec)
        orig = per_original_share(rec, faces.get(code) or FACE)
        y = _n(yields.get(code))
        s = safety.get(code) or None
        items.append({
            "code": code, "name": meta.get("name") or code, "sector": meta.get("sector"),
            "tier": meta.get("tier") or "unknown",
            "record": rec, "paid_years": paid, "n_years": len(rec), "move": move,
            "latest_cash_pct": rec[-1]["cash_pct"], "prev_cash_pct": rec[-2]["cash_pct"],
            "year": rec[-1]["year"], "per_original": [orig[0], orig[-1]],
            "bonus_instead": bonus_instead(rec),
            "yield_after_tax": round(y * (1 - TAX_PCT / 100), 1) if y else None,
            "safety": ({"level": s["level"], "word_en": s["word_en"], "word_bn": s["word_bn"],
                        "line_en": s["line_en"], "line_bn": s["line_bn"]} if s else None),
            "cash_label": cash_labels.get(code),
        })

    def codes(rows):
        return [r["code"] for r in rows]

    paying = [i for i in items if i["latest_cash_pct"] > 0]
    every = [i for i in items if i["paid_years"] == i["n_years"] == YEARS]
    steady = sorted(
        (i for i in every if (i["safety"] or {}).get("level") == "safe"
         and i["cash_label"] not in ("paper", "none") and i["move"] != "cut"),
        key=lambda i: -(i["yield_after_tax"] or 0))
    at_risk = sorted((i for i in paying if (i["safety"] or {}).get("level") == "risk"),
                     key=lambda i: -(i["yield_after_tax"] or 0))
    cut = sorted((i for i in items if i["move"] == "cut"),
                 key=lambda i: i["latest_cash_pct"] / i["prev_cash_pct"] if i["prev_cash_pct"] else 1)
    skipped = sorted((i for i in items if i["move"] == "skipped"), key=lambda i: -i["prev_cash_pct"])
    raised = sorted((i for i in items if i["move"] == "raised"),
                    key=lambda i: -(i["latest_cash_pct"] / i["prev_cash_pct"] if i["prev_cash_pct"] else 0))
    bonus = [i for i in items if i["bonus_instead"]]
    return {
        "universe": len(items),
        "counts": {"paying": len(paying), "every_year": len(every), "steady": len(steady),
                   "at_risk": len(at_risk), "cut": len(cut), "skipped": len(skipped),
                   "raised": len(raised), "bonus_instead": len(bonus)},
        "lists": {"steady": codes(steady), "at_risk": codes(at_risk), "cut": codes(cut),
                  "skipped": codes(skipped), "raised": codes(raised), "bonus_instead": codes(bonus)},
        "moves": MOVE_WORDS,
        "tax_pct": TAX_PCT,
        "items": items,
    }
