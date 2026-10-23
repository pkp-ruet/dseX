"""Portfolio history — trades, bonus shares, cash dividends, the watcher copy."""
import pytest

from backend.services import portfolio_ledger as L
from backend.services import portfolio_watch as W


def _h(code="GP", qty=100, price=300.0, added="2026-01-10"):
    return {"id": code, "trading_code": code, "qty": qty, "buy_price": price, "added_at": added}


# ---------------------------------------------------------------- trades


def test_partial_sell_keeps_avg_and_logs_profit():
    holdings, e = L.sell([_h()], "GP", 40, 350.0, "2026-10-25")
    assert holdings[0]["qty"] == 60 and holdings[0]["buy_price"] == 300.0
    assert e["kind"] == "sell" and e["avg_cost"] == 300.0
    assert L.realized(e) == 2000.0


def test_sell_all_drops_the_holding():
    holdings, e = L.sell([_h(), _h("BATBC", 10, 500)], "GP", 100, 280.0)
    assert [h["trading_code"] for h in holdings] == ["BATBC"]
    assert L.realized(e) == -2000.0


@pytest.mark.parametrize("qty,price,msg", [(101, 300, "only hold"), (0, 300, "how many"), (5, 0, "price")])
def test_bad_sells_raise(qty, price, msg):
    with pytest.raises(ValueError, match=msg):
        L.sell([_h()], "GP", qty, price)


def test_remove_trade_only_touches_trades():
    b = L.buy_entry("GP", 10, 300)
    log = [b, {"id": "div-GP-2026-11-01", "kind": "dividend"}]
    assert L.remove_trade(log, b["id"]) == log[1:]
    with pytest.raises(KeyError):
        L.remove_trade(log, "div-GP-2026-11-01")


# ---------------------------------------------------------------- corporate actions

ACTS = {"GP": [
    {"record_date": "2026-03-01", "cash_pct": 100, "stock_pct": 0, "cash_ps": 10.0},
    {"record_date": "2026-11-02", "cash_pct": 50, "stock_pct": 10, "cash_ps": 5.0},
]}


def test_pending_splits_auto_from_suggestions_and_puts_cash_first():
    pend = L.pending_actions([_h()], [], ACTS)
    assert [(p["kind"], p["record_date"], p["auto"]) for p in pend] == [
        ("dividend", "2026-03-01", False),
        ("dividend", "2026-11-02", True),
        ("bonus", "2026-11-02", True),
    ]


def test_record_date_before_the_holding_was_added_is_not_owed():
    assert L.pending_actions([_h(added="2026-11-02")], [], ACTS) == []


def test_apply_auto_pays_cash_on_pre_bonus_count_then_adds_shares():
    holdings, log, applied = L.apply_auto([_h()], [], ACTS, "2026-11-03")
    div, bonus = applied
    assert div["amount"] == 500.0 and div["qty"] == 100
    assert bonus["shares_added"] == 10
    assert holdings[0]["qty"] == 110
    # Total cost unchanged: 100 × 300 = 110 × avg
    assert holdings[0]["buy_price"] == pytest.approx(30000 / 110, abs=1e-3)
    # Idempotent: a second run applies nothing.
    _, _, again = L.apply_auto(holdings, log, ACTS)
    assert again == []


def test_bonus_too_small_for_a_share_is_recorded_not_reoffered():
    holdings, log, applied = L.apply_auto([_h(qty=5)], [], {"GP": [
        {"record_date": "2026-11-02", "cash_pct": 0, "stock_pct": 10, "cash_ps": 0},
    ]})
    assert applied == [] and holdings[0]["qty"] == 5
    assert L.pending_actions(holdings, log, ACTS)[0]["record_date"] == "2026-03-01"


def test_undo_bonus_restores_count_at_same_cost_even_after_a_buy():
    holdings, log, _ = L.apply_auto([_h()], [], ACTS)
    # Bought 10 more at 250 after the bonus.
    h = holdings[0]
    cost = h["qty"] * h["buy_price"] + 10 * 250
    holdings = [{**h, "qty": h["qty"] + 10, "buy_price": cost / (h["qty"] + 10)}]
    holdings, log = L.undo_action(holdings, log, "bonus-GP-2026-11-02")
    assert holdings[0]["qty"] == 110
    assert holdings[0]["qty"] * holdings[0]["buy_price"] == pytest.approx(cost, abs=0.1)
    assert next(e for e in log if e["id"] == "bonus-GP-2026-11-02")["status"] == "undone"
    # Undone stays undone — never re-applied.
    _, _, again = L.apply_auto(holdings, log, ACTS)
    assert again == []


def test_dismissed_suggestion_is_not_offered_again():
    pend = L.pending_actions([_h()], [], ACTS)
    log = L.dismiss_action([], pend[0])
    assert all(p["id"] != pend[0]["id"] for p in L.pending_actions([_h()], log, ACTS))


def test_settings_are_clamped():
    assert L.clean_settings({"fee_pct": 9, "div_tax_pct": -1}) == {"fee_pct": 2.0, "div_tax_pct": 0.0}
    assert L.clean_settings({"fee_pct": "x"}) == L.DEFAULT_SETTINGS


# ---------------------------------------------------------------- value


def test_value_counts_unpriced_codes_at_cost():
    v = L.value_of([_h(), _h("SUSP", 10, 50)], {"GP": {"ltp": 330}})
    assert v == {"value": 33500.0, "cost": 30500.0, "priced": 1, "n": 2}


def test_replay_carries_last_close_and_waits_for_every_code():
    closes = {"GP": {"d1": 300, "d2": 310, "d3": 320}, "BATBC": {"d2": 500}}
    out = L.replay_series([_h(qty=1), _h("BATBC", 1, 1)], closes, ["d1", "d2", "d3"])
    assert out == [{"date": "d2", "value": 810.0}, {"date": "d3", "value": 820.0}]


# ---------------------------------------------------------------- watcher


def test_watch_events_cover_each_kind():
    facts = {
        "record": {"GP": {"record_date": "2026-10-27", "record_days_left": 2, "cash_per_share": 12.5, "stock_pct": 0}},
        "results": {"GP": {"eps_cum": 6.0, "eps_cum_prev": 8.0, "period_end": "2026-09-30", "months": 9}},
        "category": {"GP": ("A", "Z")},
        "prices": {"GP": {"ltp": 250.0, "change": -15.0, "change_pct": -5.7}},
        "lows": {"GP": 250.0},
    }
    ev = W.build_events({"GP": 100}, facts, "2026-10-25")
    kinds = [e["kind"] for e in ev]
    assert kinds == ["record", "results", "category", "drop", "low52"]
    assert "৳1,250 cash on your 100 shares" in ev[0]["body_en"]
    assert ev[1]["level"] == "bad" and "down 25%" in ev[1]["title_en"]
    assert ev[3]["id"] == "drop-GP-2026-10-25"
    # Bengali copy uses Western digits.
    assert "100" in ev[0]["body_bn"]


def test_flat_stock_at_its_low_is_not_news():
    facts = {"prices": {"GP": {"ltp": 250.0, "change": 0, "change_pct": 0.0}}, "lows": {"GP": 250.0}}
    assert W.build_events({"GP": 100}, facts, "2026-10-25") == []


def test_record_event_only_inside_the_window():
    far = {"record": {"GP": {"record_date": "2026-11-20", "record_days_left": 20, "cash_per_share": 5}}}
    assert W.build_events({"GP": 100}, far, "2026-10-25") == []


def test_push_payload_leads_with_the_worst_news():
    ev = W.build_events({"GP": 100}, {
        "record": {"GP": {"record_date": "2026-10-27", "record_days_left": 2, "cash_per_share": 5}},
        "prices": {"GP": {"ltp": 250, "change": -15, "change_pct": -6}},
    }, "2026-10-25")
    p = W.push_payload(ev, "en")
    assert p["title"] == "2 things on your stocks today"
    assert p["body"].startswith("GP fell")
