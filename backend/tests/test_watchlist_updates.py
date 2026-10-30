"""Watchlist updates: free facts only, on the reader's codes only."""
from backend.services.watchlist_updates import (
    MAX_CODES,
    calendar_rows,
    clean_codes,
    recent_grade_changes,
    without,
)


def test_clean_codes_dedupes_upper_cases_and_caps():
    assert clean_codes([" gp", "GP", "", "squrpharma", None]) == ["GP", "SQURPHARMA"]
    assert len(clean_codes([f"C{i}" for i in range(MAX_CODES + 20)])) == MAX_CODES


def test_results_lose_the_premium_meaning():
    row = {"code": "GP", "headline_en": "Profit up", "meaning_en": "Premium", "meaning_bn": "প্রিমিয়াম"}
    assert without(row, ("meaning_en", "meaning_bn")) == {"code": "GP", "headline_en": "Profit up"}


def test_calendar_rows_keep_only_these_codes_and_drop_safety():
    rows = [
        {"trading_code": "GP", "record_date": "2026-11-05", "cash_per_share": 12.5,
         "safety": {"level": "steady"}, "score": 80},
        {"trading_code": "BXPHARMA", "record_date": "2026-11-06"},
    ]
    out = calendar_rows(rows, {"GP"})
    assert len(out) == 1
    assert out[0]["trading_code"] == "GP" and out[0]["cash_per_share"] == 12.5
    assert "safety" not in out[0] and "score" not in out[0]


def test_grade_changes_inside_the_window_without_reasons_or_rule_days():
    timeline = {"changes": [
        {"date": "2026-10-20", "from_tier": "good", "to_tier": "average", "from_score": 62,
         "to_score": 57, "drivers": [{"key": "p4_val"}], "en": "…", "method": False},
        {"date": "2026-10-04", "from_tier": "average", "to_tier": "good", "method": True},
        {"date": "2026-08-01", "from_tier": "weak", "to_tier": "average", "method": False},
    ]}
    out = recent_grade_changes(timeline, "2026-09-30")
    assert out == [{"date": "2026-10-20", "from_tier": "good", "to_tier": "average",
                    "from_score": 62, "to_score": 57}]
    assert recent_grade_changes(None, "2026-09-30") == []
