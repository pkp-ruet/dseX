"""Buy / Sell split (services/buy_sell_split.py, 2026-11-22): our analysis
weighed, always inside the answer's band, plain words."""
from backend.services import buy_sell_split as bs
from backend.services import stock_report as sr
from backend.tests.test_stock_report import _MARKET_WORDS, _RATIO_SPEAK, _all_bi, _sig, red_flag_company, square

_SIGNALS = [
    ("buy", "quality_cheap", "excellent"),
    ("none", "near_52w_high", "excellent"),
    ("none", "fair_price", "good"),
    ("none", "z_category", "good"),
    ("none", "red_flag", "good"),
    ("none", "average", "average"),
    ("sell", "weak", "weak"),
]


def _rep(inp, signal, reason, tier):
    inp["signal"] = _sig(signal, reason, tier=tier)
    return sr.build_report(inp)


def test_grade_weights_match_the_grade():
    from backend.services.scoring_service import GRADE_WEIGHTS
    assert bs.CHECK_WEIGHTS == {"p1_biz": GRADE_WEIGHTS["p1"], "p2_health": GRADE_WEIGHTS["p2"],
                                "p3_moat": GRADE_WEIGHTS["p3"], "p5_div": GRADE_WEIGHTS["p5"]}


def test_bands_never_overlap_and_step_by_five():
    order = ["avoid", "no_reason", "wait", "buy"]
    for a, b in zip(order, order[1:]):
        assert bs.BANDS[a][1] < bs.BANDS[b][0]
    for lo, hi in bs.BANDS.values():
        assert lo % bs.STEP == 0 and hi % bs.STEP == 0


def test_split_always_agrees_with_the_answer():
    for make in (square, red_flag_company):
        for sig in _SIGNALS:
            rep = _rep(make(), *sig)
            ans, split = rep["answer"], rep["split"]
            if ans["decision"] == "unrated":
                assert split is None
                continue
            lo, hi = bs.BANDS[ans["decision"]]
            assert lo <= split["buy"] <= hi, (make.__name__, sig, ans["decision"], split["buy"])
            assert split["buy"] + split["sell"] == 100
            assert split["buy"] % 5 == 0
            _all_bi(split)


def test_in_band_keeps_the_order_inside_a_band():
    vals = [bs.in_band(r, "buy") for r in (0, 25, 50, 75, 100)]
    assert vals == sorted(vals) and vals[0] == 70 and vals[-1] == 95
    assert bs.in_band(50, "unrated") is None


def test_a_blocking_risk_pulls_safety_down():
    row = square()["score_row"]
    free = bs.weigh(row, verdict="cheap", near_top=False, red=0, amber=0, blocked=False)
    held = bs.weigh(row, verdict="cheap", near_top=False, red=0, amber=0, blocked=True)
    assert bs.lean_pct(held) < bs.lean_pct(free)
    assert next(p for p in held if p["key"] == "safety")["share"] <= bs.BLOCKED_SHARE


def test_near_the_top_and_a_loss_weigh_against_the_price():
    row = {**square()["score_row"], "p4_val": 9.0}
    price = lambda **k: next(p for p in bs.weigh(row, red=0, amber=0, blocked=False, **k) if p["key"] == "price")
    assert price(verdict="cheap", near_top=False)["share"] == 0.9
    assert price(verdict="cheap", near_top=True)["share"] == bs.NEAR_TOP_SHARE
    assert price(verdict="unjudged", near_top=False)["share"] == 0.0


def test_weights_add_to_one_hundred():
    parts = bs.weigh(square()["score_row"], verdict="fair", near_top=False, red=0, amber=1, blocked=False)
    assert round(sum(p["weight"] for p in parts)) == 100


def test_a_strong_buy_weighs_more_than_a_weak_avoid():
    good = _rep(square(), "buy", "quality_cheap", "excellent")["split"]
    bad = _rep(red_flag_company(), "sell", "weak", "weak")["split"]
    assert good["buy"] > bad["buy"]
    assert any(f["side"] == "against" for f in bad["factors"])


def test_the_split_reads_plainly():
    for make in (square, red_flag_company):
        for sig in _SIGNALS:
            split = _rep(make(), *sig)["split"]
            if not split:
                continue
            for half in ("en", "bn"):
                t = split["line"][half]
                assert not _MARKET_WORDS.search(t), t
                assert not _RATIO_SPEAK.search(t), t
                assert not any(ch.isdigit() for ch in t), t
                assert not any("০" <= ch <= "৯" for ch in t), t
