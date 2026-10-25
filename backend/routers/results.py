"""
Every company's latest quarterly results, explained (services/results_explainer.py).

Public: the headline and the profit line of each report. What the report
means, the cash and price lines stay on the stock page behind its lock.
"""
from fastapi import APIRouter

from backend.services.results_explainer import all_results

router = APIRouter(tags=["results"])


@router.get("/api/results")
def latest_results():
    """Newest report first. `counts` = how many are better / mixed / weaker /
    about the same as a year ago."""
    rows = all_results()
    counts = {"good": 0, "watch": 0, "bad": 0, "neutral": 0}
    for r in rows:
        counts[r["level"]] = counts.get(r["level"], 0) + 1
    return {"as_of": rows[0]["post_date"] if rows else None, "counts": counts, "results": rows}
