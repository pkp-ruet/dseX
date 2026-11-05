"""
Premium research reports (services/research_reports.py, research_owners.py,
research_quality.py, research_dividends.py): companies with serious problems,
what the auditors found, the results season, who is buying, whether the profit
is real, and dividends you can count on.

The full payload goes to every reader: the Premium lock on the page is
screen-only, like every other lock in the app.
"""
from typing import Optional

from fastapi import APIRouter, HTTPException

from backend.services import research_reports_service as svc

router = APIRouter(tags=["research"])


@router.get("/api/research/summary")
def research_summary():
    """The hub's figures: one line per report."""
    return svc.summary()


@router.get("/api/research/risks")
def research_risks():
    return svc.risk_register()


@router.get("/api/research/auditors")
def research_auditors():
    return svc.auditor_tracker()


@router.get("/api/research/owners")
def research_owners():
    return svc.owners_report()


@router.get("/api/research/earnings-quality")
def research_earnings_quality():
    return svc.earnings_quality()


@router.get("/api/research/dividends")
def research_dividends():
    return svc.dividend_reliability()


@router.get("/api/research/results-season")
def research_results_season(season: Optional[str] = None):
    data = svc.results_season(season)
    if data is None:
        raise HTTPException(status_code=404, detail="unknown_season")
    return data
