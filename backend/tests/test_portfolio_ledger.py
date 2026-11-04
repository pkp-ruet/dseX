"""Portfolio history — trades, bonus shares, cash dividends, the watcher copy."""
import pytest

from backend.services import portfolio_daily as D
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


# ---------------------------------------------------------------- the log cap


def test_trim_keeps_actions_and_trades_inside_the_window():
    bonus = {"id": "bonus-GP-2024-01-05", "kind": "bonus", "code": "GP", "date": "2024-01-05", "status": "applied"}
    old = [L.buy_entry("GP", 1, 100, "2024-01-01") for _ in range(L.LOG_MAX)]
    recent = L.buy_entry("GP", 1, 100, "2026-10-01")
    log = L.trim_log([bonus] + old + [recent, L.buy_entry("GP", 1, 100, "2026-11-01")], "2026-11-05")
    assert len(log) == L.LOG_MAX
    assert log[0] is bonus and recent in log
    assert all(e not in log for e in old[:3]) and old[3] in log  # the 3 oldest trades went


def test_trim_never_drops_trades_inside_the_window_until_the_backstop():
    inside = [L.buy_entry("GP", 1, 100, "2026-10-01") for _ in range(L.LOG_MAX + 5)]
    assert len(L.trim_log(inside, "2026-11-05")) == L.LOG_MAX + 5
    runaway = [L.buy_entry("GP", 1, 100, "2026-10-01") for _ in range(L.LOG_HARD_MAX + 3)]
    assert L.trim_log(runaway, "2026-11-05") == runaway[3:]


# ---------------------------------------------------------------- corporate actions

ACTS = {"GP": [
    {"record_date": "2026-03-01", "cash_pct": 100, "stock_pct": 0, "cash_ps": 10.0},
    {"record_date": "2026-11-02", "cash_pct": 50, "stock_pct": 10, "cash_ps": 5.0},
]}
NOV = {"GP": [ACTS["GP"][1]]}
TRADED = {"GP": "2026-11-04"}  # GP has traded since both record dates


def test_pending_splits_auto_from_suggestions_and_puts_cash_first():
    pend = L.pending_actions([_h()], [], ACTS, TRADED)
    assert [(p["kind"], p["record_date"], p["auto"]) for p in pend] == [
        ("dividend", "2026-03-01", False),
        ("dividend", "2026-11-02", True),
        ("bonus", "2026-11-02", True),
    ]


def test_an_action_waits_for_the_first_trade_after_its_record_date():
    # DSE halts trading on the record date: until the ex-trade, the price still
    # carries the dividend and the bonus, so the old count is the right value.
    pend = L.pending_actions([_h()], [], ACTS, {"GP": "2026-11-02"})
    assert [p["record_date"] for p in pend] == ["2026-03-01"]
    assert L.pending_actions([_h()], [], ACTS, {}) == []
    holdings, _, applied = L.apply_auto([_h()], [], NOV, {"GP": "2026-11-01"})
    assert applied == [] and holdings[0]["qty"] == 100


def test_record_date_before_the_holding_was_added_is_not_owed():
    assert L.pending_actions([_h(added="2026-11-02")], [], ACTS, TRADED) == []


def test_owed_only_when_added_by_the_last_normal_market_buy_day():
    assert L.buy_by("2026-11-02") == "2026-10-28"  # three trading days, Fri/Sat off
    assert L.pending_actions([_h(added="2026-10-29")], [], NOV, TRADED) == []
    assert len(L.pending_actions([_h(added="2026-10-28")], [], NOV, TRADED)) == 2


def test_apply_auto_pays_cash_on_pre_bonus_count_then_adds_shares():
    holdings, log, applied = L.apply_auto([_h()], [], ACTS, TRADED, "2026-11-03")
    div, bonus = applied
    assert div["amount"] == 500.0 and div["qty"] == 100
    assert bonus["shares_added"] == 10
    assert holdings[0]["qty"] == 110
    # Total cost unchanged: 100 × 300 = 110 × avg
    assert holdings[0]["buy_price"] == pytest.approx(30000 / 110, abs=1e-3)
    # Idempotent: a second run applies nothing.
    _, _, again = L.apply_auto(holdings, log, ACTS, TRADED)
    assert again == []


def test_a_buy_after_the_buy_by_day_gets_no_dividend_or_bonus():
    # 100 held since October; 50 more bought on 30 Oct, after the 28 Oct buy-by day.
    log = [L.buy_entry("GP", 50, 300, "2026-10-30")]
    holdings, log, (div, bonus) = L.apply_auto([_h(qty=150, added="2026-10-01")], log, NOV, TRADED)
    assert div["qty"] == 100 and div["amount"] == 500.0
    assert bonus["shares_added"] == 10 and holdings[0]["qty"] == 160
    assert holdings[0]["qty"] * holdings[0]["buy_price"] == pytest.approx(150 * 300, abs=0.1)


def test_shares_sold_after_the_buy_by_day_still_earn_it():
    log = [L.sell_entry("GP", 40, 320, 300, "2026-10-29")]
    holdings, _, (div, bonus) = L.apply_auto([_h(qty=60, added="2026-10-01")], log, NOV, TRADED)
    assert div["qty"] == 100 and div["amount"] == 500.0
    assert bonus["shares_added"] == 10 and holdings[0]["qty"] == 70


def test_confirming_an_old_dividend_after_a_bonus_pays_the_old_count():
    holdings, log, _ = L.apply_auto([_h()], [], ACTS, TRADED, "2026-11-03")
    assert holdings[0]["qty"] == 110
    march = next(p for p in L.pending_actions(holdings, log, ACTS, TRADED) if p["record_date"] == "2026-03-01")
    _, _, entry = L.apply_action(holdings, log, march)
    assert entry["qty"] == 100 and entry["amount"] == 1000.0


def test_bonus_too_small_for_a_share_is_recorded_not_reoffered():
    holdings, log, applied = L.apply_auto([_h(qty=5)], [], {"GP": [
        {"record_date": "2026-11-02", "cash_pct": 0, "stock_pct": 10, "cash_ps": 0},
    ]}, TRADED)
    assert applied == [] and holdings[0]["qty"] == 5
    assert L.pending_actions(holdings, log, ACTS, TRADED)[0]["record_date"] == "2026-03-01"


def test_undo_bonus_restores_count_at_same_cost():
    holdings, log, _ = L.apply_auto([_h()], [], NOV, TRADED)
    holdings, log = L.undo_action(holdings, log, "bonus-GP-2026-11-02")
    assert holdings[0]["qty"] == 100
    assert holdings[0]["buy_price"] == pytest.approx(300.0, abs=1e-3)
    assert next(e for e in log if e["id"] == "bonus-GP-2026-11-02")["status"] == "undone"
    # Undone stays undone — never re-applied.
    _, _, again = L.apply_auto(holdings, log, NOV, TRADED)
    assert again == []


def test_undo_bonus_refused_after_a_logged_trade():
    holdings, log, _ = L.apply_auto([_h()], [], NOV, TRADED)
    log = L.append(log, L.buy_entry("GP", 10, 250, "2026-11-04"))
    holdings = [{**holdings[0], "qty": 120}]
    with pytest.raises(ValueError, match="bought or sold GP after this bonus"):
        L.undo_action(holdings, log, "bonus-GP-2026-11-02")


def test_undo_bonus_refused_when_fewer_shares_than_it_added():
    holdings, log, _ = L.apply_auto([_h()], [], NOV, TRADED)
    holdings = [{**holdings[0], "qty": 10}]  # corrected by hand, no logged trade
    with pytest.raises(ValueError, match="fewer GP shares than this bonus added"):
        L.undo_action(holdings, log, "bonus-GP-2026-11-02")


def test_dismissed_suggestion_is_not_offered_again():
    pend = L.pending_actions([_h()], [], ACTS, TRADED)
    log = L.dismiss_action([], pend[0])
    assert all(p["id"] != pend[0]["id"] for p in L.pending_actions([_h()], log, ACTS, TRADED))


def test_settings_are_clamped():
    assert L.clean_settings({"fee_pct": 9, "div_tax_pct": -1}) == {"fee_pct": 2.0, "div_tax_pct": 0.0}
    assert L.clean_settings({"fee_pct": "x"}) == L.DEFAULT_SETTINGS


# ---------------------------------------------------------------- the daily write


class _Col:
    def __init__(self, matched):
        self.matched, self.calls = matched, []

    def update_one(self, flt, upd):
        self.calls.append((flt, upd))
        return type("R", (), {"matched_count": self.matched})()


def test_daily_write_is_compare_and_set_on_what_it_read(monkeypatch):
    from backend.services import portfolio_store as S

    read = {"portfolio": [_h()], "portfolio_log": None,
            "extra_portfolios": [{"id": "p-1", "name": "Mum", "holdings": [_h("ACI")], "log": []}]}
    col = _Col(1)
    monkeypatch.setattr(S, "_users", lambda: col)
    assert S.save_if_unchanged("u1", read, {"main": ([_h(qty=110)], [])}) is True
    flt, upd = col.calls[-1]
    assert flt == {"user_id": "u1", "portfolio": read["portfolio"], "portfolio_log": None}
    assert upd["$set"]["portfolio"][0]["qty"] == 110 and "extra_portfolios" not in upd["$set"]

    assert S.save_if_unchanged("u1", read, {"p-1": ([_h("ACI", qty=11)], [])}) is True
    flt, upd = col.calls[-1]
    assert flt == {"user_id": "u1", "extra_portfolios": read["extra_portfolios"]}
    (mum,) = upd["$set"]["extra_portfolios"]
    assert mum["name"] == "Mum" and mum["holdings"][0]["qty"] == 11

    monkeypatch.setattr(S, "_users", lambda: _Col(0))  # the reader edited meanwhile
    assert S.save_if_unchanged("u1", read, {"main": ([_h(qty=110)], [])}) is False


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
        "prices": {"GP": {"date": "2026-10-25", "ltp": 250.0, "change": -15.0, "change_pct": -5.7}},
        "lows": {"GP": 250.0},
    }
    ev = W.build_events({"GP": 100}, facts, "2026-10-25")
    kinds = [e["kind"] for e in ev]
    assert kinds == ["record", "results", "category", "drop", "low52"]
    assert "৳1,250 cash before tax on your 100 shares" in ev[0]["body_en"]
    assert ev[1]["level"] == "bad" and "down 25%" in ev[1]["title_en"]
    assert ev[3]["id"] == "drop-GP-2026-10-25"
    # Bengali copy uses Western digits.
    assert "100" in ev[0]["body_bn"]


def test_no_trade_today_raises_no_move_events():
    # The record date (no trading) or a suspension: the row is an older day's move.
    facts = {"trade_day": "2026-10-25",
             "prices": {"GP": {"date": "2026-10-23", "ltp": 250.0, "change": -15.0, "change_pct": -5.7}},
             "lows": {"GP": 250.0}}
    assert W.build_events({"GP": 100}, facts, "2026-10-25") == []


def test_drop_taka_follows_the_ex_day_move_not_the_raw_change():
    # Raw −72 (a dividend + bonus left the price); adjusted, it fell 5.9%.
    facts = {"trade_day": "2026-11-03",
             "prices": {"GP": {"date": "2026-11-03", "ltp": 320.0, "change": -72.0, "change_pct": -18.37}},
             "ex_moves": {"GP": {"change_pct": -5.9}}}
    (e,) = W.build_events({"GP": 110}, facts, "2026-11-03")
    assert e["title_en"] == "GP fell 5.9% today"
    assert "about ৳2,207 off the value" in e["body_en"] and "7,920" not in e["body_en"]


def test_flat_stock_at_its_low_is_not_news():
    facts = {"prices": {"GP": {"date": "2026-10-25", "ltp": 250.0, "change": 0, "change_pct": 0.0}},
             "lows": {"GP": 250.0}}
    assert W.build_events({"GP": 100}, facts, "2026-10-25") == []


def _back_facts(ltp=305.0, top=298.0, n=20, lo=260.0, lo_date="2026-10-20"):
    return {
        "prices": {"GP": {"date": "2026-11-04", "ltp": ltp, "change": 8.0, "change_pct": 2.7}},
        "prior": {"GP": {"max": top, "n": n, "start": "2026-10-06", "lo": lo, "lo_date": lo_date}},
    }


def _back(facts, since="2026-09-01", **kw):
    return W.build_events({"GP": 100}, facts, "2026-11-04", costs={"GP": 300.0}, since={"GP": since}, **kw)


def test_back_to_your_price_after_a_month_under_it():
    ev = _back(_back_facts())
    assert [e["kind"] for e in ev] == ["breakeven"]
    e = ev[0]
    assert e["id"] == "breakeven-GP-2026-11-04" and e["level"] == "good"
    assert "back to the price you paid" in e["title_en"]
    assert "৳260" in e["body_en"] and "৳302" in e["body_en"]
    assert "৳305" in e["body_bn"]


@pytest.mark.parametrize("kw", [
    {"ltp": 299.0},            # still under the price
    {"top": 301.0},            # it was at the price within the month
    {"n": 12},                 # too little history to call it a month
    {"lo": 285.0},             # never fell far: not news
])
def test_back_to_your_price_needs_a_real_comeback(kw):
    assert _back(_back_facts(**kw)) == []


def test_back_to_your_price_needs_the_readers_cost():
    assert W.build_events({"GP": 100}, _back_facts(), "2026-11-04", since={"GP": "2026-09-01"}) == []


def test_back_to_your_price_needs_them_to_have_held_it_all_month():
    assert _back(_back_facts(), since="2026-10-10") == []  # added after the window began
    assert W.build_events({"GP": 100}, _back_facts(), "2026-11-04", costs={"GP": 300.0}) == []


def test_back_to_your_price_names_the_low_only_if_they_held_it_then():
    (e,) = _back(_back_facts(lo_date="2026-08-01"))
    assert "fell as low as" not in e["body_en"] and "৳260" not in e["body_bn"]


def test_back_to_your_price_uses_the_readers_fee():
    (e,) = _back(_back_facts(), fee_pct=1.0)
    assert "needs to sell above ৳306" in e["body_en"]


def test_reader_positions_use_the_highest_price_and_the_latest_holding():
    held, cost, since = D.reader_positions([
        ("main", [_h(qty=100, price=250.0, added="2026-01-01")]),
        ("p-1", [_h(qty=50, price=300.0, added="2026-05-01")]),
    ])
    assert held == {"GP": 150} and cost == {"GP": 300.0} and since == {"GP": "2026-05-01"}


def _rows(*closes):
    days = ["2026-10-01", "2026-10-04", "2026-10-05", "2026-10-06"]
    return [{"trading_code": "GP", "date": d, "close_price": c, "ltp": c} for d, c in zip(days, closes)]


def test_prior_closes_take_out_bonus_shares_but_not_cash():
    cash = {"GP": [{"record_date": "2026-10-04", "cash_ps": 10.0, "stock_pct": 0}]}
    out = D.prior_closes(_rows(110, 112, 108, 105), cash, "2026-10-06", days=3)["GP"]
    assert out == {"max": 112.0, "n": 3, "start": "2026-10-01", "lo": 105.0, "lo_date": "2026-10-06"}
    bonus = {"GP": [{"record_date": "2026-10-04", "cash_ps": 10.0, "stock_pct": 10}]}
    out = D.prior_closes(_rows(110, 112, 108, 105), bonus, "2026-10-06", days=3)["GP"]
    assert out["max"] == 108.0 and out["lo"] == 100.0 and out["lo_date"] == "2026-10-01"


def test_record_event_only_inside_the_window():
    far = {"record": {"GP": {"record_date": "2026-11-20", "record_days_left": 20, "cash_per_share": 5}}}
    assert W.build_events({"GP": 100}, far, "2026-10-25") == []


def test_push_payload_leads_with_the_worst_news():
    ev = W.build_events({"GP": 100}, {
        "record": {"GP": {"record_date": "2026-10-27", "record_days_left": 2, "cash_per_share": 5}},
        "prices": {"GP": {"date": "2026-10-25", "ltp": 250, "change": -15, "change_pct": -6}},
    }, "2026-10-25")
    p = W.push_payload(ev, "en")
    assert p["title"] == "2 updates on your shares today"
    assert p["body"].startswith("GP fell")
