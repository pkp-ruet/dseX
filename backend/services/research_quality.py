"""Is the profit real? — a Premium research report (2026-11-05).

A forensic read of every company's last five years (Amarstock's cash-flow
statement + DSE's yearly profit), in plain words:

  * **Profit vs cash** — of every ৳100 of profit over the years, how much
    came in as cash from the business. Backed by cash (≥ ৳90) · partly
    (৳50–90) · mostly on paper (৳0–50) · no cash came in (below ৳0).
  * **Profit that isn't from the business** — the latest year's operating
    profit (before interest and tax) against the whole profit; under ৳50 of
    every ৳100 means most of it came from elsewhere (interest, one-off gains).
  * **Dividends the business couldn't pay** — cash dividends over the years
    bigger than the cash left after spending on machines and buildings.
  * **Growing on loans** — loans up much faster than sales.

Banks, finance companies and insurers are left out: their cash flows mean
something else (deposits and loans are their business). Cash figures that look
wrong are left out rather than guessed at: a year whose operating cash and
DSE's per-share operating cash disagree in sign (`doubt` on the year, set by
the loader), and a company whose cash was negative in every year while it
showed a profit and paid a cash dividend every year, or whose cash out over
the window was more than twice its profit (a wrong line, not a business —
HEIDELBCEM read −৳250 crore a year on ৳108 crore of profit in five). Pure: data in, dicts
out. Facts only — never a buy or sell call.
"""
from __future__ import annotations

from statistics import median
from typing import Optional

from backend.services.research_reports import _n, bi

YEARS = 5                 # the window read
MIN_YEARS = 3             # fewer usable years → left out
BACKED = 90               # ৳ of cash per ৳100 of profit
PARTLY = 50
CORE_MIN = 50             # ৳ of operating profit per ৳100 of profit
DEBT_GAP_PP = 50          # loans growth minus sales growth, percentage points
DEBT_MIN_SHARE = 0.10     # loans at least this share of assets to matter
DOUBT_CASH_PER_100 = -200  # cash out over twice the profit, five years running: a misread line
STALE_YEARS = 2           # newest cash-flow year this far behind the market's → left out
SKIP_CLASSES = {"BANK", "NBFI", "INSURANCE"}
CRORE = 1e7

LABELS = {
    "backed": (bi("Backed by cash", "নগদে সমর্থিত"),
               bi("Almost all of its profit came in as cash.", "মুনাফার প্রায় পুরোটাই নগদে এসেছে।")),
    "partly": (bi("Partly backed", "আংশিক সমর্থিত"),
               bi("Some of its profit came in as cash, some stayed on paper.", "মুনাফার কিছু নগদে এসেছে, কিছু কাগজে রয়ে গেছে।")),
    "paper": (bi("Mostly on paper", "বেশির ভাগই কাগজে"),
              bi("Less than half of its profit came in as cash.", "মুনাফার অর্ধেকেরও কম নগদে এসেছে।")),
    "none": (bi("No cash came in", "নগদ আসেনি"),
             bi("It showed a profit, but its business paid out more cash than it took in.",
                "কাগজে মুনাফা দেখিয়েছে, কিন্তু ব্যবসায় যত নগদ এসেছে, খরচ হয়েছে তার বেশি।")),
}
LABEL_ORDER = ["backed", "partly", "paper", "none"]


def label_for(cash_per_100: float) -> str:
    if cash_per_100 >= BACKED:
        return "backed"
    if cash_per_100 >= PARTLY:
        return "partly"
    if cash_per_100 >= 0:
        return "paper"
    return "none"


def company_quality(years: list[dict], dividends_tk: dict[int, float]) -> Optional[dict]:
    """`years` = [{year, profit, ocf, capex, ebit, revenue, debt, assets}] in
    taka, any order; `dividends_tk` = {year: cash paid for that year}. None when
    fewer than MIN_YEARS years carry both profit and operating cash."""
    ys = sorted((y for y in years if _n(y.get("profit")) is not None and _n(y.get("ocf")) is not None
                 and not y.get("doubt")), key=lambda y: y["year"])[-YEARS:]
    if len(ys) < MIN_YEARS:
        return None
    if (all(y["ocf"] < 0 for y in ys) and all(y["profit"] > 0 for y in ys)
            and all((dividends_tk.get(y["year"]) or 0) > 0 for y in ys)):
        return {"label": "doubtful"}
    profit = sum(y["profit"] for y in ys)
    cash = sum(y["ocf"] for y in ys)
    capex = sum(abs(_n(y.get("capex")) or 0) for y in ys)
    out: dict = {"from": ys[0]["year"], "to": ys[-1]["year"], "n_years": len(ys),
                 "profit_cr": round(profit / CRORE, 1), "cash_cr": round(cash / CRORE, 1),
                 "free_cr": round((cash - capex) / CRORE, 1), "flags": []}
    if profit <= 0:
        out["label"] = "loss"
        out["cash_per_100"] = None
    else:
        per = round(cash / profit * 100)
        if per <= DOUBT_CASH_PER_100:
            return {"label": "doubtful"}
        out["cash_per_100"] = per
        out["label"] = label_for(per)
    # Profit from outside the business (latest year).
    last = ys[-1]
    ebit, np_ = _n(last.get("ebit")), last["profit"]
    out["core_per_100"] = None
    if ebit is not None and np_ > 0:
        out["core_per_100"] = max(0, round(ebit / np_ * 100)) if ebit > 0 else 0
        if out["core_per_100"] < CORE_MIN:
            out["flags"].append("outside")
    # Dividends bigger than the cash left after investment.
    paid = sum(dividends_tk.get(y["year"], 0) for y in ys)
    out["dividends_cr"] = round(paid / CRORE, 1)
    if paid > 0 and paid > (cash - capex):
        out["flags"].append("dividend_unfunded")
    # Loans growing much faster than sales.
    first = ys[0]
    d0, d1 = _n(first.get("debt")), _n(last.get("debt"))
    r0, r1 = _n(first.get("revenue")), _n(last.get("revenue"))
    a1 = _n(last.get("assets"))
    out["debt_from_cr"] = round(d0 / CRORE, 1) if d0 is not None else None
    out["debt_to_cr"] = round(d1 / CRORE, 1) if d1 is not None else None
    if d0 and d1 and r0 and r1 and d0 > 0 and r0 > 0 and a1 and d1 / a1 >= DEBT_MIN_SHARE:
        dg, rg = (d1 / d0 - 1) * 100, (r1 / r0 - 1) * 100
        out["debt_growth_pct"], out["sales_growth_pct"] = round(dg), round(rg)
        if dg - rg >= DEBT_GAP_PP:
            out["flags"].append("debt_up")
    if out["label"] in ("paper", "none") and profit > 0:
        out["flags"].insert(0, "paper")
    return out


def quality_report(rows: dict[str, list[dict]], dividends: dict[str, dict[int, float]],
                   info: dict[str, dict]) -> dict:
    """`rows` = {code: yearly figures}; `info` carries name, sector, tier and
    sector_class. Banks / NBFIs / insurers and companies whose newest year is
    STALE_YEARS behind the market's newest are left out."""
    newest = max((y["year"] for ys in rows.values() for y in ys if _n(y.get("profit")) is not None
                  and _n(y.get("ocf")) is not None), default=None)
    items, skipped = [], {"lenders": 0, "stale": 0, "thin": 0, "doubtful": 0}
    for code, ys in rows.items():
        meta = info.get(code)
        if not meta or not meta.get("graded"):
            continue
        if (meta.get("sector_class") or "GENERAL") in SKIP_CLASSES:
            skipped["lenders"] += 1
            continue
        q = company_quality(ys, dividends.get(code) or {})
        if q is None:
            skipped["thin"] += 1
            continue
        if q.get("label") == "doubtful":
            skipped["doubtful"] += 1
            continue
        if newest is not None and q["to"] <= newest - STALE_YEARS:
            skipped["stale"] += 1
            continue
        items.append({"code": code, "name": meta.get("name") or code, "sector": meta.get("sector"),
                      "tier": meta.get("tier") or "unknown", **q})

    graded = [i for i in items if i["label"] != "loss"]
    counts = {k: sum(1 for i in graded if i["label"] == k) for k in LABEL_ORDER}
    counts["loss"] = len(items) - len(graded)

    by_sector: dict[str, list[dict]] = {}
    for i in graded:
        by_sector.setdefault(i["sector"] or "Other", []).append(i)
    sectors = []
    for s, xs in by_sector.items():
        if len(xs) < 3:
            continue
        sectors.append({"sector": s, "n": len(xs), "backed": sum(1 for x in xs if x["label"] == "backed"),
                        "paper": sum(1 for x in xs if x["label"] in ("paper", "none")),
                        "median_cash_per_100": round(median(x["cash_per_100"] for x in xs))})
    sectors.sort(key=lambda r: (-r["median_cash_per_100"], r["sector"]))

    def pick(flag):
        return [i["code"] for i in sorted((i for i in items if flag in i["flags"]),
                                          key=lambda i: (i["cash_per_100"] if i["cash_per_100"] is not None else 999,
                                                         -i["profit_cr"]))]

    best = [i["code"] for i in sorted((i for i in graded if i["label"] == "backed" and i["free_cr"] > 0),
                                      key=lambda i: -i["profit_cr"])]
    return {
        "years": {"to": newest, "window": YEARS},
        "universe": len(items),
        "skipped": skipped,
        "counts": counts,
        "labels": {k: {"title": LABELS[k][0], "means": LABELS[k][1]} for k in LABEL_ORDER},
        "sectors": sectors,
        "lists": {
            "paper": pick("paper"),
            "outside": pick("outside"),
            "dividend_unfunded": pick("dividend_unfunded"),
            "debt_up": pick("debt_up"),
            "best": best,
        },
        "items": sorted(items, key=lambda i: (i["cash_per_100"] is None, -(i["cash_per_100"] or 0))),
    }
