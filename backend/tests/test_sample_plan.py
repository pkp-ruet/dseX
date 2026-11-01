import pytest
from fastapi import HTTPException

from backend.routers.recommendations import SAMPLE_MAX, parse_sample_holdings


def test_parses_the_sample_holdings():
    assert parse_sample_holdings("gp:80:280,SQURPHARMA:60:200.5") == [
        {"trading_code": "GP", "qty": 80, "buy_price": 280.0},
        {"trading_code": "SQURPHARMA", "qty": 60, "buy_price": 200.5},
    ]


@pytest.mark.parametrize("bad", ["GP:80", "GP:x:280", "GP:0:280", "GP:80:0", "GP:80:nan", "G P:80:280", "GP:80:1e9"])
def test_rejects_a_bad_part(bad):
    with pytest.raises(HTTPException):
        parse_sample_holdings(bad)


def test_keeps_at_most_twelve():
    h = ",".join(f"C{i}:1:10" for i in range(20))
    assert len(parse_sample_holdings(h)) == SAMPLE_MAX
