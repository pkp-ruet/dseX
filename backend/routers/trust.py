"""
Public trust signals for the landing page.

Deliberately small and deliberately boring: how many people have signed up, how
they rate the app, and the reviews an admin has approved for publication. No
performance, return, or accuracy claims are served from here — the product makes
none, and this endpoint must never become the place where one sneaks in.
"""
import logging

from fastapi import APIRouter

from backend.services.feedback_service import public_trust_stats

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["trust"])


@router.get("/trust")
def get_trust():
    """Landing-page trust block. Degrades to zeros rather than erroring — a
    missing number just hides that line, it should never break the homepage."""
    try:
        return public_trust_stats()
    except Exception as e:  # noqa: BLE001
        logger.error("trust stats error: %s", e, exc_info=True)
        return {
            "user_count": 0,
            "review_count": 0,
            "review_average": None,
            "testimonials": [],
        }
