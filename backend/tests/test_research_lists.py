"""Research lists — the rules (pure), the shareholding order they rely on,
and the guards added to the old one-number lists."""
from backend.services import research_lists as rl
from backend.services.db_service import order_shareholdings
from backend.services.research_lists_service import facts_from
from backend.services.stock_facts import build_items, ownership_baseline


def payer(**over):
    """A company that passes every Cash-machines check."""
    f = {
        "code": "GOOD", "name": "Good Co", "score": 72.0, "sector_class": "GENERAL", "cat": "A",
        "stale": False, "last_reported_year": 2025, "debt_level": "ok",
        "div_yield_pct": 6.5, "paid_years": 5, "payout_pct": 45.0, "payout_latest_pct": 50.0,
        "p2_cfo": 8.0, "interim_nocfps": 1.2, "p4_val": 6.0,
    }
    f.update(over)
    return f


def test_every_list_has_bilingual_checks_and_unique_slugs():
    assert len(rl.LISTS) == 6
    assert len({l.slug for l in rl.LISTS}) == 6
    for lst in rl.LISTS:
        assert lst.title_bn and lst.idea_bn
        for c in lst.checks:
            assert c.label_en and any("ঀ" <= ch <= "৿" for ch in c.label_bn), (lst.id, c.key)


def test_funnel_counts_shrink_in_order_and_ranks_passers():
    facts = [
        payer(code="A", div_yield_pct=8.0),
        payer(code="B", div_yield_pct=5.0),
        payer(code="C", paid_years=4),                  # out at "paid every year"
        payer(code="D", payout_pct=None),               # dividend out of a loss
        payer(code="E", cat="Z"),                       # out at not_z
        payer(code="F", score=None),                    # unrated: not in the universe
    ]
    res = rl.run_list(rl.CASH_MACHINES, facts, rl.Ctx())
    assert res["universe"] == 5
    lefts = [s["left"] for s in res["funnel"]]
    assert lefts == sorted(lefts, reverse=True)
    assert [f["code"] for f in res["passed"]] == ["A", "B"]


def test_first_failure_names_the_check_and_the_figure():
    en, bn = rl.first_failure(rl.CASH_MACHINES, payer(payout_pct=85.0), rl.Ctx())
    assert en.startswith("Pays out no more than 70% of its profit")
    assert "85%" in en and "85%" in bn
    assert rl.first_failure(rl.CASH_MACHINES, None, rl.Ctx())[0] == "No longer rated"
    # Passes every check but fell outside the top 20.
    assert rl.first_failure(rl.CASH_MACHINES, payer(), rl.Ctx())[0] == "Dropped out of the top 20"


def test_cash_check_not_applied_to_lenders_but_negative_interim_cash_fails_industrials():
    ok, _, _ = rl._cash_backed(payer(sector_class="BANK", p2_cfo=None), rl.Ctx())
    assert ok
    ok, en, _ = rl._cash_backed(payer(interim_nocfps=-0.4), rl.Ctx())
    assert not ok and "more cash" in en


def test_value_trap_guard_reads_the_quarter_first():
    f = payer(interim_eps_yoy_pct=-30.0, eps_yoy_pct=12.0, interim_label_en="6 months to Dec 2025")
    ok, en, _ = rl._profit_holding(f, rl.Ctx())
    assert not ok and "down 30%" in en and "6 months" in en
    assert rl._profit_holding(payer(), rl.Ctx())[0]          # no figure → not a reason to drop


def test_owners_jump_is_a_reclassification_not_buying():
    base = {"sponsor_prev": 30.0}
    assert rl._sponsor_up({**base, "sponsor_now": 31.5, "sponsor_delta": 1.5}, rl.Ctx())[0]
    ok, en, _ = rl._sponsor_up({**base, "sponsor_now": 41.0, "sponsor_delta": 11.0}, rl.Ctx())
    assert not ok and "reclassification" in en
    assert not rl._sponsor_up({**base, "sponsor_now": 30.2, "sponsor_delta": 0.2}, rl.Ctx())[0]


def test_governance_lookup_is_lazy_and_cached():
    calls = []

    def gov(code):
        calls.append(code)
        return [{"en": "A board meeting was postponed", "bn": "সভা স্থগিত"}]

    ctx = rl.Ctx(governance=gov)
    f = {"code": "X"}
    assert not rl._no_governance(f, ctx)[0]
    rl._no_governance(f, ctx)
    assert calls == ["X"]


def test_turnover_reads_in_lakh_and_crore():
    assert rl._traded({"turnover_mn": 4.5}, rl.Ctx())[1] == "৳45 lakh traded a day"
    assert rl._traded({"turnover_mn": 32.0}, rl.Ctx())[1] == "৳3.2 crore traded a day"
    assert not rl._traded({"turnover_mn": 0.4}, rl.Ctx())[0]


def test_diff_codes_keeps_order():
    assert rl.diff_codes(["A", "B", "C"], ["B", "D", "C", "E"]) == (["D", "E"], ["A"])


def test_facts_from_derives_range_position_and_owner_move():
    row = {"trading_code": "X", "ltp": 80.0, "score": 70.0, "p5_consist": 7.0, "div_yield_pct": 5.0,
           "loan_to_mcap": 0.03, "eps_yoy_pct": 12.0, "sector": "Engineering", "market_cat": "A"}
    f = facts_from(row, {"company_name": "X Ltd"}, {"change_pct": 1.0}, {"hi": 100.0, "lo": 60.0},
                   {"avg_turnover_7d_mn": 2.0},
                   ({"as_of_date": "2026-09-30", "sponsor_director_pct": 35.0},
                    {"as_of_date": "2026-03-31", "sponsor_director_pct": 33.5}))
    assert f["pct_below_high"] == 20.0
    assert f["pct_in_range"] == 50.0
    assert f["paid_years"] == 4
    assert f["cash_per_10k"] == 500
    assert f["loan_pct_mcap"] == 3.0
    assert f["sponsor_delta"] == 1.5
    assert f["profit_change_pct"] == 12.0


# ---- Shareholding order (the stock page compared the wrong two reports) ----

def test_order_shareholdings_dedupes_mixed_formats_newest_first():
    docs = [
        {"as_of_date": "Mar 31, 2026", "sponsor_director_pct": 46.93},
        {"as_of_date": "Jun 30, 2025", "sponsor_director_pct": 45.77},
        {"as_of_date": "2026-09-30", "sponsor_director_pct": 47.27},
        {"as_of_date": "2026-03-31", "sponsor_director_pct": 46.90},
    ]
    out = order_shareholdings(docs)
    assert [d["as_of_date"] for d in out] == ["2026-09-30", "2026-03-31", "2025-06-30"]
    assert out[1]["sponsor_director_pct"] == 46.90          # the ISO row wins its date


def test_ownership_baseline_looks_about_six_months_back():
    monthly = [{"as_of_date": f"2026-{m:02d}-28", "sponsor_director_pct": 40.0} for m in range(9, 0, -1)]
    assert ownership_baseline(monthly)["as_of_date"] == "2026-04-28"
    two = [{"as_of_date": "2026-09-30"}, {"as_of_date": "2026-08-31"}]
    assert ownership_baseline(two)["as_of_date"] == "2026-08-31"   # nothing older → the oldest
    assert ownership_baseline(two[:1]) is None


def test_dash_category_is_not_a_watch_out():
    items = build_items({"score": 70}, [], [], {"market_category": "-"})
    assert "category_not_a" not in {i["key"] for i in items}
    items = build_items({"score": 70}, [], [], {"market_category": "B"})
    assert "category_not_a" in {i["key"] for i in items}


# ---- Old one-number lists --------------------------------------------------

def test_dividend_list_guard():
    from backend.routers.stock_lists import _safe_dividend
    ok = {"market_cat": "A", "stale_data": False, "payout_pct": 40.0, "payout_latest_pct": 45.0}
    assert _safe_dividend(ok)
    assert not _safe_dividend({**ok, "market_cat": "Z"})
    assert not _safe_dividend({**ok, "stale_data": True})
    assert not _safe_dividend({**ok, "payout_pct": None})          # paid out of a loss
    assert not _safe_dividend({**ok, "payout_latest_pct": 140.0})  # paid more than it earned
