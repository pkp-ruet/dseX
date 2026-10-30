import re

from backend.services import signal_today as st

_MARKET_WORDS = re.compile(r"\b(EPS|NOCFPS|NAV|P/E|ROE|TTM|YoY|CAGR)\b|ইপিএস|পিই|এনএভি")
_RATIO_SPEAK = re.compile(r"times (its|their) profit|out of 10\b|\bpayout\b|\bmargin\b|\d×|\bQ[1-4]\b|\bFY\d{4}\b")
_NUM = re.compile(r"\d[\d,.]*")


def _sig(signal="none", reason="", tier="good", strength="normal"):
    return {"signal": signal, "reason_key": reason, "tier": tier, "strength": strength}


SIGNALS = {
    "AAA": _sig("buy", "quality_cheap", "excellent", "strong"),
    "BBB": _sig("buy", "quality_cheap", "good"),
    "CCC": _sig("buy", "excellent_fair_price", "excellent"),
    "DDD": _sig("none", "good_wait_price", "good"),
    "EEE": _sig("none", "quality_expensive", "excellent"),
    "FFF": _sig("none", "red_flag", "good"),
    "GGG": _sig("none", "average_fundamentals", "average"),
    "HHH": _sig("sell", "weak_fundamentals", "weak"),
    "III": _sig("none", "not_rated", "unknown"),
}


def test_price_word_replaces_strong_buy():
    assert st.price_word(SIGNALS["AAA"]) == "very_low"
    assert st.price_word(SIGNALS["BBB"]) == "low"
    assert st.price_word(SIGNALS["CCC"]) == "fair"
    assert st.price_word(SIGNALS["DDD"]) is None


def test_funnel_counts_graded_good_and_buys_and_groups_the_rest():
    f = st.funnel(SIGNALS)
    assert (f["graded"], f["good"], f["buys"]) == (8, 6, 3)
    assert [(g["key"], g["n"]) for g in f["left_out"]] == [("price", 2), ("red_flag", 1)]
    # The groups add up: good = buys + every good company left out.
    assert f["good"] == f["buys"] + sum(g["n"] for g in f["left_out"])


def test_changes_name_joiners_and_leavers_with_todays_reason():
    prev = {"AAA": "buy", "BBB": "none", "FFF": "buy", "GGG": "buy"}
    c = st.changes(SIGNALS, prev, "2026-10-29")
    assert c["joined"] == ["BBB", "CCC"]
    assert [(l["code"], l["reason"]["en"]) for l in c["left"]] == [
        ("FFF", "A serious warning in its report"), ("GGG", "Grade fell to Average")]
    assert c["rebuilt"] is False and c["since"] == "2026-10-29"
    assert st.changes(SIGNALS, {}, None) is None


def test_a_rule_change_day_is_not_news():
    today = {f"N{i}": _sig("buy", "quality_cheap") for i in range(10)}
    prev = {f"O{i}": "buy" for i in range(10)}
    assert st.changes(today, prev, "2026-10-29")["rebuilt"] is True


SQUARE = {"score": 89, "current_pe": 9.1, "own_avg_pe": 12.4, "sector_median_pe": 22,
          "eps_yoy_pct": 15.5, "div_yield_pct": 5.9, "loan_to_reserve": 0.02, "roe_pct": 17,
          "p3_sector_rank": 10}


def test_why_gives_three_plain_facts_price_first():
    facts = st.why_facts(SQUARE, SIGNALS["BBB"], "GENERAL", {"level": "safe"})
    assert len(facts) == 3
    assert facts[0]["en"] == "You pay about 9 years of its profit. It usually costs 12."
    assert facts[1]["en"] == "One of the strongest companies on the DSE." or "Profit" in facts[1]["en"] or "cash" in facts[1]["en"]
    for f in facts:
        for lang in ("en", "bn"):
            assert not _MARKET_WORDS.search(f[lang]), f[lang]
            assert len(_NUM.findall(f[lang])) <= 3, f[lang]
        assert not _RATIO_SPEAK.search(f["en"]), f["en"]


def test_why_skips_loans_for_lenders_and_a_price_that_is_not_lower():
    bank = dict(SQUARE, current_pe=12.3, own_avg_pe=12.4)
    facts = st.why_facts(bank, SIGNALS["BBB"], "BANK", None, limit=10)
    texts = " ".join(f["en"] for f in facts)
    assert "loans" not in texts
    assert "years of its profit" not in texts or "Similar companies" in texts
    assert "able to keep paying" not in texts  # safety unknown → no claim


def test_why_reads_this_years_results_first():
    row = dict(SQUARE, interim_eps_yoy_pct=-5, eps_yoy_pct=40)
    texts = [f["en"] for f in st.why_facts(row, SIGNALS["BBB"], limit=10)]
    assert "Profit is holding steady." in texts
    assert not any("40%" in t for t in texts)


def test_almost_says_what_keeps_a_good_company_off():
    near = st.almost_row("JMB", _sig("none", "near_52w_high"), {"score": 70}, 24.0, None, 23.4)
    assert near["group"] == "near_52w_high" and near["under"] == 23.4
    assert near["line"]["en"] == "Comes back on the list under ৳23.4."
    pricey = st.almost_row("GP", _sig("none", "good_wait_price"), {"score": 66}, 237.0, 204.0, 250.0)
    assert pricey["line"]["en"] == "Our buy price is ৳204, 14% below today."
    # A buy price above today's price says nothing useful: no line.
    odd = st.almost_row("X", _sig("none", "quality_expensive"), {"score": 61}, 50.0, 60.0, None)
    assert odd["line"] is None and odd["under"] is None
    assert st.almost_row("Y", _sig("none", "average_fundamentals", "average"), {}, 10, None, None) is None
    assert st.almost_row("Z", SIGNALS["AAA"], {}, 10, None, None) is None


def test_almost_puts_the_closest_first():
    rows = [
        {"code": "A", "gap_pct": 20.0, "score": 90},
        {"code": "B", "gap_pct": None, "score": 80},
        {"code": "C", "gap_pct": 3.0, "score": 60},
        {"code": "D", "gap_pct": None, "score": 85},
        None,
    ]
    assert [r["code"] for r in st.sort_almost(rows)] == ["C", "A", "D", "B"]


# ---------------------------------------------------------------- the watcher

from backend.services import portfolio_watch as watch

BUNDLE = {
    "changes": {"since": "2026-10-29", "joined": ["AAA"], "rebuilt": False,
                "left": [{"code": "FFF", "reason_key": "red_flag",
                          "reason": {"en": "A serious warning in its report", "bn": "রিপোর্টে গুরুতর সতর্কতা"}}]},
    "buys": {"AAA": {"price_word": "very_low", "stop_above": 125},
             "BBB": {"price_word": "low", "stop_above": 100},
             "CCC": {"price_word": "low", "stop_above": 100}},
}


def test_buylist_events_cover_joined_left_and_crossing_near_the_limit():
    prices = {"BBB": {"ltp": 98.0, "change": 2.0},   # crossed into the last 3% today
              "CCC": {"ltp": 98.0, "change": 0.5}}   # was already there yesterday
    ch = watch.buylist_changes(BUNDLE, prices, {"AAA", "FFF", "BBB", "CCC", "ZZZ"})
    assert ch["AAA"]["kind"] == "joined" and ch["FFF"]["kind"] == "left"
    assert ch["BBB"] == {"kind": "near", "stop": 100}
    assert "CCC" not in ch and "ZZZ" not in ch
    events = watch.build_events({}, {"buylist": ch}, "2026-10-30", {"AAA", "FFF", "BBB"})
    by = {e["code"]: e for e in events}
    assert by["AAA"]["title_en"] == "AAA joined today's buy list"
    assert by["AAA"]["body_en"] == "It now passes every check, at a very low price."
    assert by["FFF"]["body_en"] == "The reason: a serious warning in its report."
    assert "৳100" in by["BBB"]["body_en"] and "৳৳" not in by["BBB"]["body_en"]
    assert all(e["kind"] == "buylist" and e["id"].endswith("2026-10-30") for e in events)


def test_buylist_is_quiet_on_a_rule_change_day():
    rebuilt = dict(BUNDLE, changes=dict(BUNDLE["changes"], rebuilt=True))
    assert watch.buylist_changes(rebuilt, {}, {"AAA", "FFF"}) == {}
