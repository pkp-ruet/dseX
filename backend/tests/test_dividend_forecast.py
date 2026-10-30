"""The dividend calendar's Premium parts: the forecast and the capture line.
Fixtures are shaped like real ledger rows (SQURPHARMA's FY2025 final: 120%
declared 23 Oct 2025, record date 16 Nov 2025)."""
from datetime import date

from backend.services import dividend_forecast as f

TODAY = date(2026, 10, 31)
LAST = {"declaration_date": date(2025, 10, 23), "record_date": date(2025, 11, 16), "cash_pct": 120.0, "stock_pct": 0.0}


def row(**kw):
    args = dict(code="SQURPHARMA", name="Square Pharmaceuticals", last=LAST, face_value=10.0,
                base_eps=27.05, now_eps=31.24, now_months=12, meeting=None, today=TODAY)
    args.update(kw)
    return f.forecast_row(**args)


def test_estimate_moves_last_years_cash_with_profit():
    r = row()
    assert r["kind"] == "estimate"
    assert r["expected_pct"] == 140.0  # 120 x 1.155 = 138.6 -> nearest 5
    assert r["expected_cash_per_share"] == 14.0
    assert r["last_cash_per_share"] == 12.0
    assert "15% higher" in r["why_en"] and "same share of profit" in r["why_en"]
    assert r["window_start"] == "2026-10-09" and r["window_end"] == "2026-11-06"
    assert r["expected_record"] == "2026-11-16"


def test_a_big_profit_jump_is_held_and_said_so():
    r = row(base_eps=2.0, now_eps=5.0)
    assert r["expected_pct"] == 180.0  # held at 1.5x
    assert "seldom raise" in r["why_en"]


def test_a_loss_says_it_may_skip():
    r = row(now_eps=-1.2)
    assert r["kind"] == "may_skip" and r["expected_pct"] is None
    assert "may pay less or skip" in r["why_en"]
    assert r["tone"] == "bad"


def test_no_newer_results_expects_the_same():
    r = row(now_eps=None)
    assert r["kind"] == "same" and r["expected_pct"] == 120.0


def test_a_posted_board_meeting_pins_the_date():
    r = row(meeting=date(2026, 11, 3))
    assert r["window_start"] == r["window_end"] == "2026-11-03"
    assert "board meets on 3 Nov" in r["when_en"]
    assert row(meeting=TODAY)["when_en"].startswith("The board meets today")


def test_outside_the_window_is_left_out():
    assert row(last={**LAST, "declaration_date": date(2025, 4, 1)}) is None  # long overdue
    assert row(last={**LAST, "declaration_date": date(2026, 6, 1)}) is None  # next one far off


def test_late_when_last_years_date_has_passed():
    r = row(last={**LAST, "declaration_date": date(2025, 9, 20)})
    assert r["late"] and r["when_en"].startswith("Later than last year")


def test_round_pct_never_rounds_a_dividend_to_zero():
    assert f.round_pct(0.1) == 0.1
    assert f.round_pct(7.4) == 7.0
    assert f.round_pct(138.6) == 140.0


def test_price_move_takes_the_closes_either_side_of_the_record_date():
    closes = [("2025-11-12", 300.0), ("2025-11-13", 302.0), ("2025-11-17", 288.0), ("2025-11-18", 290.0)]
    assert f.price_move(closes, "2025-11-16") == (302.0, 288.0)
    assert f.price_move(closes[:2], "2025-11-16") is None


def test_capture_says_when_the_price_fell_by_more_than_the_cash():
    c = f.capture([{"record_date": "2025-11-16", "cash": 12.0, "before": 302.0, "after": 288.0}], 13.0, 300.0)
    assert c["level"] == "bad" and c["avg_drop"] == 14.0
    assert c["line_en"].startswith("On its last record date the price fell ৳14.00, more than the ৳12.00 cash.")
    assert c["keep"] == round(13 * 0.9 - 2 * 0.004 * 300, 2)


def test_capture_averages_several_record_dates():
    past = [
        {"record_date": "2025-11-16", "cash": 10.0, "before": 100.0, "after": 98.0},
        {"record_date": "2024-11-16", "cash": 10.0, "before": 100.0, "after": 99.0},
    ]
    c = f.capture(past, 10.0, 100.0)
    assert c["events"] == 2 and c["level"] == "good"
    assert "last 2 record dates" in c["line_en"] and "on average" in c["line_en"]


def test_capture_needs_a_past_event_and_cash():
    assert f.capture([], 10.0, 100.0) is None
    assert f.capture([{"record_date": "2025-11-16", "cash": 10.0}], 10.0, 100.0) is None
    assert f.capture([{"record_date": "2025-11-16", "cash": 10.0, "before": 100.0, "after": 90.0}], 0, 100.0) is None
