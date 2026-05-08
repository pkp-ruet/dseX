"""Top-N selection backed by the DSEF leaderboard.

Historically this file held a separate percentile-rank scoring algorithm with its
own factor weights — meaning the news scraper picked top-N companies via a
different ranking than the leaderboard the user actually sees.

This module is now a thin shim around backend.services.scoring_service so the
news scraper and the leaderboard always agree.
"""
import logging

from backend.services.scoring_service import build_scores_df

logger = logging.getLogger(__name__)


def get_top_n_codes(db=None, n: int = 50) -> list[str]:
    """Return trading codes for the top-n companies by DSEF score.

    `db` is accepted for backwards-compatibility with old call sites but ignored —
    build_scores_df() resolves its own connection.
    """
    mdf = build_scores_df()
    if mdf.empty:
        logger.warning("No scored companies found — cannot compute top-%d codes", n)
        return []
    top = mdf[mdf["score"].notna()].nlargest(n, "score")
    return list(top["trading_code"])
