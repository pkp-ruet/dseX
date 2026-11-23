"""Portfolio builder (services/portfolio_builder.py): the pool, today's price,
jobs, spread lines and whole-share sizing, on candidates shaped like the
recommendation engine's explore pool."""
import re

import pytest

from backend.services import portfolio_builder as pb


def _c(code, **kw):
    base = {
        "code": code, "name": f"{code} Limited", "sector": "Pharmaceuticals & Chemicals",
        "sector_class": "GENERAL", "sector_bn": "ওষুধ ও রসায়ন", "cat": "A",
        "ltp": 100.0, "change_pct": 0.4, "score": 80.0, "conviction": 70.0,
        "mcap_mn": 60_000.0, "turnover_med30_mn": 40.0, "turnover_mn": 40.0,
        "signal": "buy", "reason_key": "quality_cheap", "buy_below": None,
        "div_yield_pct": 5.0, "div_latest_dps": 5.0, "paid_years": 5, "div_safety": "safe",
        "interim_eps_yoy_pct": 14.0, "interim_label_en": "6 months to Dec", "interim_label_bn": "ডিসেম্বর পর্যন্ত 6 মাস",
        "p1_eps_cagr": 6.0, "p4_val": 6.5, "eps_stability": 0.8, "loan_pct_mcap": 3.0,
        "fair_value": {"center": 125.0, "confidence": "medium"},
        "risk": None, "hi52": 130.0, "lo52": 80.0,
    }
    base.update(kw)
    return base


SECTORS = ["Pharmaceuticals & Chemicals", "Telecommunication", "Cement", "Food & Allied",
           "Engineering", "Fuel & Power", "Textile", "Ceramics Sector", "Tannery Industries",
           "Paper & Printing", "IT Sector", "Services & Real Estate"]


def _market():
    """A pool of 24 strong companies across 12 businesses plus banks and insurers."""
    out = []
    for i, sec in enumerate(SECTORS):
        out.append(_c(f"G{i:02d}A", sector=sec, ltp=50.0 + 10 * i, conviction=60.0 + i,
                      div_yield_pct=4.0 + (i % 4), interim_eps_yoy_pct=5.0 + 3 * i))
        out.append(_c(f"G{i:02d}B", sector=sec, ltp=30.0 + 7 * i, conviction=55.0 + i, mcap_mn=12_000.0,
                      paid_years=4, interim_eps_yoy_pct=20.0 + i, p4_val=7.0))
    for i in range(4):
        out.append(_c(f"BANK{i}", sector="Bank", sector_class="BANK", ltp=25.0 + i, conviction=75.0,
                      div_yield_pct=7.0, loan_pct_mcap=None))
    out.append(_c("INS1", sector="Insurance", sector_class="INSURANCE", ltp=60.0, conviction=72.0))
    out.append(_c("BATBC", name="British American Tobacco Bangladesh", sector="Food & Allied",
                  ltp=300.0, conviction=90.0, div_yield_pct=8.0))
    return out


def _ans(**kw):
    a = {"amount": 100_000, "purpose": "mix", "horizon": "gt3", "likes": [], "leave_out": [], "exclude": []}
    a.update(kw)
    return a


def _sector_pct(plan):
    out = {}
    for i in plan["items"]:
        out[i["sector"]] = out.get(i["sector"], 0) + i["amount"]
    return {k: v / plan["answers"]["amount"] * 100 for k, v in out.items()}


# --- answers -------------------------------------------------------------

def test_answers_are_checked():
    with pytest.raises(ValueError):
        pb.clean_answers(_ans(amount=5000))
    with pytest.raises(ValueError):
        pb.clean_answers(_ans(amount=float("nan")))
    with pytest.raises(ValueError):
        pb.clean_answers(_ans(purpose="gamble"))
    with pytest.raises(ValueError):
        pb.clean_answers(_ans(likes=["big", "cash", "no_loans"]))
    with pytest.raises(ValueError):
        pb.clean_answers(_ans(leave_out=["casinos"]))
    a = pb.clean_answers(_ans(likes=["cash", "big", "cash"], exclude=["gp", "bad code!", "x" * 30]))
    assert a["likes"] == ["big", "cash"]
    assert a["exclude"] == ["GP"]


def test_share_count_by_money():
    assert pb.share_count(10_000) == 3
    assert pb.share_count(50_000) == 5
    assert pb.share_count(100_000) == 7
    assert pb.share_count(500_000) == 8
    assert pb.share_count(5_000_000) == 10


# --- the plan ------------------------------------------------------------

@pytest.mark.parametrize("amount", [10_000, 30_000, 100_000, 450_000, 2_000_000])
@pytest.mark.parametrize("purpose", list(pb.PURPOSES))
def test_never_over_the_amount_and_inside_the_lines(amount, purpose):
    plan = pb.build(_market(), _ans(amount=amount, purpose=purpose))
    t = plan["totals"]
    assert plan["items"], plan["notes"]
    assert t["now"] + t["kept"] + t["fee"] + t["left"] == pytest.approx(amount, abs=2)
    assert t["left"] >= 0
    n = len(plan["items"])
    cap = pb.share_cap_pct(n)
    for i in plan["items"]:
        assert isinstance(i["qty"], int) and i["qty"] >= 1
        assert i["amount"] == pytest.approx(i["qty"] * (i["wait_under"] or i["price"]), abs=0.01)
        assert i["weight_pct"] <= cap + 0.5
    if n >= 4:
        assert max(_sector_pct(plan).values()) <= pb.SECTOR_MAX_PCT + 0.5
    fin = sum(i["amount"] for i in plan["items"] if i["financial"]) / amount * 100
    assert fin <= pb.FIN_MAX_PCT + 0.5
    assert len({i["code"] for i in plan["items"]}) == n


def test_same_answers_same_plan():
    a = pb.build(_market(), _ans())
    b = pb.build(list(reversed(_market())), _ans())
    assert [(i["code"], i["qty"]) for i in a["items"]] == [(i["code"], i["qty"]) for i in b["items"]]


def test_purpose_sets_the_jobs():
    income = pb.build(_market(), _ans(purpose="income"))
    jobs = {j["job"]: j["pct"] for j in income["jobs"]}
    assert "grow" not in jobs and jobs.get("cash", 0) >= 40
    growth = pb.build(_market(), _ans(purpose="growth"))
    assert "cash" not in {j["job"] for j in growth["jobs"]}


def test_keep_it_safe_is_category_a_without_lenders():
    mk = _market() + [_c("BCAT", sector="Jute", cat="B", conviction=99.0)]
    plan = pb.build(mk, _ans(purpose="safe"))
    codes = {i["code"] for i in plan["items"]}
    assert "BCAT" not in codes
    assert not any(i["financial"] for i in plan["items"])


def test_leave_out_removes_businesses():
    plan = pb.build(_market(), _ans(leave_out=["banks", "insurers", "tobacco"]))
    codes = {i["code"] for i in plan["items"]}
    assert not codes & {"BANK0", "BANK1", "BANK2", "BANK3", "INS1", "BATBC"}


def test_not_for_me_is_left_out():
    first = pb.build(_market(), _ans())
    gone = first["items"][0]["code"]
    again = pb.build(_market(), _ans(exclude=[gone]))
    assert gone not in {i["code"] for i in again["items"]}


def test_today_price_decides_now_wait_or_out():
    mk = _market() + [
        # A strong company a little over our buy price: waits for it.
        _c("WAITS", sector="Jute", signal="none", reason_key="good_wait_price", ltp=105.0, buy_below=100.0,
           conviction=99.0, score=97.0, mcap_mn=100_000.0, div_yield_pct=9.0),
        # Too far over the buy price: left out today.
        _c("FAR", sector="Jute", signal="none", reason_key="quality_expensive", ltp=150.0, buy_below=100.0,
           conviction=99.0),
        # Kept off the Buy by a serious problem: never in a plan.
        _c("FLAG", sector="Jute", signal="none", reason_key="red_flag", ltp=90.0, buy_below=120.0, conviction=99.0),
    ]
    plan = pb.build(mk, _ans())
    by = {i["code"]: i for i in plan["items"]}
    assert "FAR" not in by and "FLAG" not in by
    assert by["WAITS"]["state"] == "wait"
    assert by["WAITS"]["wait_under"] == 100.0
    assert by["WAITS"]["amount"] == by["WAITS"]["qty"] * 100.0
    assert plan["totals"]["kept"] == pytest.approx(by["WAITS"]["amount"], abs=1)
    assert by["WAITS"]["wait_why"]["en"]


def test_waiting_shares_are_a_minority():
    mk = [_c(f"W{i}", sector=SECTORS[i], signal="none", reason_key="good_wait_price", ltp=105.0,
             buy_below=100.0) for i in range(10)]
    mk += [_c(f"N{i}", sector=SECTORS[i + 2]) for i in range(8)]
    plan = pb.build(mk, _ans())
    assert plan["totals"]["wait_count"] <= max(1, plan["target"] // 3)


def test_big_money_needs_shares_that_trade_enough():
    thin = _c("THIN", sector="Jute", turnover_med30_mn=2.0, conviction=99.0, mcap_mn=90_000.0)
    small = pb.build(_market() + [thin], _ans(amount=50_000))
    big = pb.build(_market() + [thin], _ans(amount=5_000_000))
    assert "THIN" not in {i["code"] for i in big["items"]}
    # ৳50,000 over 5 shares is ৳10,000 a share: 0.5% of ৳20 lakh a day.
    assert pb.left_out(thin, pb.clean_answers(_ans(amount=50_000)), 10_000) is None
    assert any(n["key"] == "big" for n in big["notes"])
    assert not any(n["key"] == "big" for n in small["notes"])


def test_a_share_too_dear_for_the_money_is_left_out():
    dear = _c("DEAR", sector="Jute", ltp=8_000.0, conviction=99.0)
    plan = pb.build(_market() + [dear], _ans(amount=10_000))
    assert "DEAR" not in {i["code"] for i in plan["items"]}


def test_too_few_companies_says_so():
    plan = pb.build(_market()[:4], _ans())
    assert 0 < len(plan["items"]) < plan["target"]
    assert any(n["key"] == "few" for n in plan["notes"])
    empty = pb.build([], _ans())
    assert empty["items"] == [] and empty["notes"][0]["key"] == "none"


def test_short_horizon_gets_the_deposit_note():
    plan = pb.build(_market(), _ans(horizon="lt1"), fdr_rate=10.5)
    note = next(n for n in plan["notes"] if n["key"] == "lt1")
    assert "10.5%" in note["en"] and "10.5%" in note["bn"]


def test_cash_a_year_is_after_tax():
    one = _c("ONE", ltp=100.0, div_latest_dps=6.0)
    plan = pb.build([one], _ans(amount=10_000))
    item = plan["items"][0]
    assert item["cash_year"] == round(item["qty"] * 6.0 * 0.9)
    assert plan["totals"]["cash_year"] == item["cash_year"]


def test_likes_tilt_the_picks():
    mk = _market() + [_c("NOLOAN", sector="Jute", loan_pct_mcap=0.0, conviction=40.0, mcap_mn=80_000.0)]
    plain = pb.build(mk, _ans())
    liked = pb.build(mk, _ans(likes=["no_loans", "big"]))
    assert sum(1 for i in liked["items"] if "no_loans" in pb.traits(next(c for c in mk if c["code"] == i["code"]))) >= \
        sum(1 for i in plain["items"] if "no_loans" in pb.traits(next(c for c in mk if c["code"] == i["code"])))


def test_capped_weights_hold_every_line():
    chosen = [{"c": _c(f"S{i}", sector="Bank" if i < 3 else SECTORS[i], sector_class="BANK" if i < 3 else "GENERAL"),
               "job": "cash", "state": "now"} for i in range(7)]
    w = pb.capped_weights(chosen, [40, 30, 10, 5, 5, 5, 5])
    assert sum(w) == pytest.approx(100, abs=0.01)
    assert max(w) <= pb.ONE_SHARE_MAX_PCT + 1e-6
    assert sum(w[:3]) <= pb.FIN_MAX_PCT + 1e-6


# --- words ---------------------------------------------------------------

_MARKET_WORDS = re.compile(r"\b(EPS|NAV|P/E|PE ratio|ROE|YoY|CAGR|TTM|yield|allocation|weight)\b")
_BN_DIGITS = re.compile(r"[০-৯]")


def test_words_read_plainly():
    plan = pb.build(_market() + [_c("WAITS", sector="Jute", signal="none", reason_key="near_52w_high",
                                    ltp=105.0, buy_below=100.0, conviction=99.0)],
                    _ans(amount=3_000_000, horizon="lt1"), fdr_rate=10.5)
    texts = []
    for i in plan["items"]:
        texts += [i["why"], i["wait_why"]] if i["wait_why"] else [i["why"]]
    texts += plan["notes"]
    for t in texts:
        assert t["en"] and t["bn"]
        assert not _MARKET_WORDS.search(t["en"]), t["en"]
        assert not _BN_DIGITS.search(t["bn"]), t["bn"]
        assert "—" not in t["en"] and "—" not in t["bn"]


def test_every_job_has_words():
    for j in pb.JOBS:
        assert j in pb.JOB_WORDS
        assert pb.why(_c("X"), j)["en"]


def test_builder_state():
    assert pb.builder_state(None) == {"free_used": False, "count": 0}
    assert pb.builder_state({"builder_free_at": "2026-11-23T10:00:00", "builder_count": 3}) == \
        {"free_used": True, "count": 3}


# --- start from my shares (phase 2) ---------------------------------------

def _held(code, value, sector="Pharmaceuticals & Chemicals", sc="GENERAL", score=80.0, cat="A", qty=None, ltp=100.0):
    return {"code": code, "name": f"{code} Ltd", "qty": qty or int(value / ltp), "buy_price": ltp * 0.9, "ltp": ltp,
            "value": value, "sector": sector, "sector_bn": sector, "sector_class": sc, "score": score, "cat": cat,
            "div_latest_dps": 3.0, "div_yield_pct": 3.0}


def test_start_is_checked_and_falls_back_without_shares():
    with pytest.raises(ValueError):
        pb.clean_answers(_ans(start="borrow"))
    plan = pb.build(_market(), _ans(start="mine"), holdings=[])
    assert plan["answers"]["start"] == "fresh" and plan["held"] is None


def test_mine_holds_the_lines_on_the_whole_portfolio():
    held = [_held("BANKX", 60_000, "Bank", "BANK"), _held("BANKY", 40_000, "Bank", "BANK"),
            _held("G00A", 50_000, SECTORS[0])]
    amount = 100_000
    plan = pb.build(_market(), _ans(amount=amount, start="mine"), holdings=held)
    assert plan["answers"]["start"] == "mine"
    total = 150_000 + amount
    # Banks are 40% of the whole already: nothing financial is added, and the
    # business note says so once (no second "banks + finance" note).
    assert not any(i["financial"] for i in plan["items"])
    keys = [n["key"] for n in plan["notes"]]
    assert "heavy" in keys and "fin" not in keys
    # Finance spread over two businesses: then the finance note is the one that says it.
    held2 = [_held("BANKX", 40_000, "Bank", "BANK"), _held("INSX", 40_000, "Insurance", "INSURANCE"),
             _held("G00A", 70_000, SECTORS[0])]
    plan2 = pb.build(_market(), _ans(amount=amount, start="mine"), holdings=held2)
    assert "fin" in [n["key"] for n in plan2["notes"]]
    sectors = {}
    for h in held:
        sectors[h["sector"]] = sectors.get(h["sector"], 0) + h["value"]
    for i in plan["items"]:
        sectors[i["sector"]] = sectors.get(i["sector"], 0) + i["amount"]
    for sec, v in sectors.items():
        if sec != "Bank":
            assert v / total * 100 <= pb.SECTOR_MAX_PCT + 0.5, sec
    t = plan["totals"]
    assert t["held"] == 150_000 and t["total_after"] == 150_000 + t["now"] + t["kept"]
    assert plan["notes"][0]["key"] == "mine"
    assert {h["code"] for h in plan["held"]} == {"BANKX", "BANKY", "G00A"}


def test_mine_prefers_new_businesses_and_may_add_to_one_owned():
    held = [_held("G00A", 10_000, SECTORS[0])]
    plan = pb.build(_market(), _ans(amount=100_000, start="mine"), holdings=held)
    held_sectors = {SECTORS[0]}
    new_biz = [i for i in plan["items"] if i["sector"] not in held_sectors]
    assert len(new_biz) >= len(plan["items"]) - 1
    for i in plan["items"]:
        if i["adds_to"]:
            assert i["code"] == "G00A" and i["why"]["en"].startswith("You already own it.")
            # G00A stays under 20% of the whole.
            assert (10_000 + i["amount"]) / 110_000 * 100 <= pb.ONE_SHARE_MAX_PCT + 0.5


def test_mine_never_waits_on_a_share_they_own():
    mk = _market() + [_c("OWNED", sector="Jute", signal="none", reason_key="good_wait_price", ltp=105.0,
                         buy_below=100.0, conviction=99.0, score=97.0, mcap_mn=100_000.0)]
    plan = pb.build(mk, _ans(start="mine"), holdings=[_held("OWNED", 5_000, "Jute", ltp=105.0)])
    assert "OWNED" not in {i["code"] for i in plan["items"]}


def test_mine_keeps_the_portfolio_to_a_dozen_shares():
    held = [_held(f"H{i}", 20_000, f"Biz{i}") for i in range(11)]
    plan = pb.build(_market(), _ans(amount=500_000, start="mine"), holdings=held)
    assert plan["target"] == 2
    assert not any(n["key"] == "small" for n in plan["notes"])


def test_mine_names_a_stronger_company_for_a_weak_share():
    held = [_held("WEAKCO", 30_000, SECTORS[1], score=40.0)]
    plan = pb.build(_market(), _ans(start="mine"), holdings=held)
    note = next(n for n in plan["notes"] if n["key"] == "stronger")
    assert "WEAKCO" in note["en"] and "sell" not in note["en"].lower()


def test_taka_grouping():
    assert pb._taka(100000) == "৳1,00,000"
    assert pb._taka(12345678) == "৳1,23,45,678"
    assert pb._taka(950) == "৳950"
