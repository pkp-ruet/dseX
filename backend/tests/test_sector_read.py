from backend.services.sector_service import money_flow, sector_read


def _st(code, score, p4=5.0, tier="good"):
    return {"trading_code": code, "company_name": f"{code} Ltd.", "score": score, "tier": tier, "p4_val": p4, "ltp": 10.0}


def test_money_flow_reads_the_share_of_dse_trading():
    t = {"now": {"A": 30.0, "B": 10.0}, "before": {"A": 10.0, "B": 10.0}, "total_now": 400.0, "total_before": 400.0}
    f = money_flow(["A", "B"], t)
    assert f["share_now"] == 10.0 and f["share_before"] == 5.0 and f["word"] == "in"
    assert money_flow(["B"], t)["word"] == "same"
    assert money_flow(["A"], {"now": {}, "before": {}, "total_now": 0, "total_before": 0}) is None


def test_the_read_says_price_profit_and_money_plainly():
    stocks = [_st("A", 80, p4=8, tier="excellent"), _st("B", 65, p4=3), _st("C", 40, p4=9, tier="weak")]
    flow = {"share_now": 6.0, "share_before": 4.0, "change_pct": 50.0, "word": "in"}
    r = sector_read({"median_pe": 8.0}, {"median_pe": 15.0}, stocks, {"A": "good", "B": "good", "C": "bad"}, flow)
    keys = [l["key"] for l in r["lines"]]
    assert keys == ["price", "profit", "money"]
    assert "cheaper than the market" in r["lines"][0]["en"]
    assert r["lines"][1]["en"].startswith("Profit is mixed")  # 2 up, 1 down is not "mostly"
    assert "Money is moving in" in r["lines"][2]["en"]
    assert r["best"]["trading_code"] == "A" and "A Ltd:" in r["best"]["en"]
    for l in r["lines"]:
        assert l["bn"] and "P/E" not in l["en"]


def test_no_best_value_without_a_good_company_at_a_low_price():
    r = sector_read({}, {}, [_st("B", 65, p4=3), _st("C", 40, p4=9, tier="weak")], {}, None)
    assert r["best"] is None and r["lines"] == []
