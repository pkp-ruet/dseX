from backend.services.signal_detail import run_start, stop_line


def test_run_start_is_the_newest_unbroken_buy_stretch():
    days = [("2026-10-30", "buy"), ("2026-10-28", "none"), ("2026-10-29", "buy"), ("2026-10-27", "buy")]
    assert run_start(days) == ("2026-10-29", False)


def test_no_run_when_today_is_not_a_buy():
    assert run_start([("2026-10-30", "none"), ("2026-10-29", "buy")]) == (None, False)
    assert run_start([]) == (None, False)


def test_a_run_reaching_the_window_start_says_so():
    assert run_start([("2026-10-30", "buy"), ("2026-10-29", "buy")]) == ("2026-10-29", True)


def test_stop_line_is_the_near_high_mark_of_the_yearly_range():
    assert stop_line(200, 100, 85) == 185
    assert stop_line(20, 10, 85) == 18.5
    assert stop_line(None, 10, 85) is None
    assert stop_line(10, 10, 85) is None
