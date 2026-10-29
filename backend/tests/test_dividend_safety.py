"""'Is this dividend safe?' — the dividend calendar's Premium line."""
from backend.services.dividend_safety import dividend_safety


def _row(**kw):
    base = {"eps": 12.4, "payout_pct": 45.0, "payout_latest_pct": 48.0, "p5_consist": 10.0,
            "interim_nocfps": 3.1, "interim_eps_yoy_pct": 8.0}
    base.update(kw)
    return base


def test_steady_payer():
    s = dividend_safety(_row())
    assert s["level"] == "safe" and s["word_en"] == "Looks steady"
    assert s["line_en"] == "It pays out about 45% of its profit, and has paid cash in 5 of the last 5 years."
    assert "45%" in s["line_bn"]


def test_a_loss_comes_first():
    s = dividend_safety(_row(eps=-0.8, payout_latest_pct=None))
    assert s["level"] == "risk" and "loss" in s["line_en"]


def test_paid_more_than_it_earned():
    s = dividend_safety(_row(payout_latest_pct=135.2))
    assert s["level"] == "risk" and "135%" in s["line_en"]


def test_profit_drop_matches_the_signal_line():
    assert dividend_safety(_row(interim_eps_yoy_pct=-25.0))["level"] == "watch"
    assert dividend_safety(_row(interim_eps_yoy_pct=-24.9))["level"] == "safe"
    # Past −100% the year so far is a loss: words, not a percentage.
    assert "making a loss" in dividend_safety(_row(interim_eps_yoy_pct=-157.0))["line_en"]


def test_cash_out_is_skipped_for_lenders():
    assert dividend_safety(_row(interim_nocfps=-2.0))["level"] == "watch"
    assert dividend_safety(_row(interim_nocfps=-2.0), "BANK")["level"] == "safe"


def test_high_payout_and_irregular_years():
    assert "80%" in dividend_safety(_row(payout_pct=80.0))["line_en"]
    s = dividend_safety(_row(p5_consist=4.0))
    assert s["level"] == "watch" and "3 of the last 5" in s["line_en"]
    assert "2 or fewer" in dividend_safety(_row(p5_consist=0.0))["line_en"]


def test_missing_data():
    assert dividend_safety(None) is None
    assert dividend_safety({"eps": 3.0}) is None
    nan = float("nan")
    assert dividend_safety(_row(payout_pct=nan, payout_latest_pct=nan))["line_en"] == (
        "It has paid cash in 5 of the last 5 years.")
