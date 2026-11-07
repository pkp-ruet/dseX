"""Buy List — the pure rules (backend/services/buy_list.py)."""
import re

from backend.services import buy_list as bl

PHARMA, BANK, TELECOM, FOOD, IT, FINANCE = (
    "Pharmaceuticals & Chemicals", "Bank", "Telecommunication", "Food & Allied", "IT Sector",
    "Financial Institutions")


def C(code, **kw):
    """A gate passer as the engine's pool carries it."""
    c = {"code": code, "name": f"{code} Ltd", "sector": PHARMA, "sector_class": "GENERAL",
         "score": 80.0, "checks_group": "excellent", "ltp": 80.0, "conviction": 80.0,
         "fair_value": {"low": 80.0, "high": 120.0, "center": 100.0, "estimates_disagree": False},
         "eps_yoy_pct": 12.0, "div_yield_pct": 3.0, "pct_in_range": 50.0}
    c.update(kw)
    return c


def codes(rows):
    return [r["code"] for r in rows]


# --- the questions ---------------------------------------------------------

def test_margin_join_and_leave_lines():
    c = C("A", ltp=93.0)  # 7% under the centre
    assert round(bl.margin_pct(c)) == 7
    assert not bl.price_ok(c)              # a newcomer needs 10%
    assert bl.price_ok(c, member=True)     # a member stays until 5%
    assert not bl.price_ok(C("B", ltp=96.0), member=True)


def test_no_margin_when_estimates_disagree_or_price_above():
    disagree = C("A", fair_value={"low": 80, "high": 120, "center": 100, "estimates_disagree": True})
    assert bl.margin_pct(disagree) is None and not bl.price_ok(disagree, member=True)
    above = C("B", ltp=104.0)
    assert bl.margin_pct(above) < 0 and bl.first_miss(above) == 4


def test_profit_join_and_leave_lines():
    c = C("A", eps_yoy_pct=-12.0)
    assert not bl.profit_ok(c) and bl.profit_ok(c, member=True)
    assert not bl.profit_ok(C("B", eps_yoy_pct=-16.0), member=True)
    # The latest quarter wins over the last full year.
    assert not bl.profit_ok(C("C", eps_yoy_pct=20.0, interim_eps_yoy_pct=-14.0))
    # No figure to compare is not a fall.
    assert bl.profit_ok(C("D", eps_yoy_pct=None))


def test_strong_on_todays_figures_only():
    held = C("A", score=65.0, checks_group="average")  # kept "Mostly strong" by settling
    assert not bl.strong_today(held) and bl.first_miss(held) == 1
    assert bl.strong_today(C("B", score=65.0, checks_group="good"))
    assert not bl.strong_today(C("C", score=50.0, checks_group="good"))
    assert bl.strong_today(C("D", checks_group=None))  # rows from before the group rules


# --- the list --------------------------------------------------------------

def test_two_closes_in_a_row():
    a, b = C("A"), C("B")
    res = bl.choose([a, b], prev_members=[], prev_passed=["A"])
    assert codes(res["members"]) == ["A"]
    assert codes(res["unsettled"]) == ["B"]
    assert set(res["passed"]) == {"A", "B"}
    # A share already on the list doesn't need yesterday's pass.
    assert codes(bl.choose([b], prev_members=["B"], prev_passed=[])["members"]) == ["B"]


def test_first_day_reads_yesterdays_buys():
    res = bl.choose([C("A"), C("B")], prev_members=[], prev_passed=None, prev_buys=["B"])
    assert codes(res["members"]) == ["B"]


def test_caps_by_sector_financials_and_size():
    pharma = [C(f"P{i}", conviction=90 - i) for i in range(3)]
    banks = [C(f"B{i}", sector=BANK, sector_class="BANK", conviction=85 - i) for i in range(3)]
    fin = [C("F0", sector=FINANCE, sector_class="NBFI", conviction=70)]
    res = bl.choose(pharma + banks + fin, [], [c["code"] for c in pharma + banks + fin])
    got = codes(res["members"])
    assert got == ["P0", "P1", "B0", "B1", "F0"]
    caps = {c["code"]: c["cap"] for c in res["also"]}
    assert caps == {"P2": "sector", "B2": "sector"}
    # Three financials at most, across banks + finance + insurers.
    banks2 = [C(f"X{i}", sector=s, sector_class=k, conviction=80 - i)
              for i, (s, k) in enumerate([(BANK, "BANK"), (BANK, "BANK"), (FINANCE, "NBFI"), ("Insurance", "INSURANCE")])]
    res2 = bl.choose(banks2, [], codes(banks2))
    assert len(res2["members"]) == 3 and res2["also"][0]["cap"] == "financial"
    many = [C(f"S{i}", sector=f"Sector {i}", conviction=90 - i) for i in range(12)]
    res3 = bl.choose(many, [], codes(many))
    assert len(res3["members"]) == bl.MAX_ROWS
    assert {c["cap"] for c in res3["also"]} == {"full"}


def test_a_member_keeps_its_seat_unless_clearly_beaten():
    old, new = C("OLD", conviction=80), C("NEW", conviction=83)
    other = C("TOP", conviction=95)
    res = bl.choose([old, new, other], prev_members=["OLD", "TOP"], prev_passed=["NEW", "OLD", "TOP"])
    assert set(codes(res["members"])) == {"TOP", "OLD"}
    beaten = C("NEW", conviction=86)
    res2 = bl.choose([old, beaten, other], prev_members=["OLD", "TOP"], prev_passed=["NEW", "OLD", "TOP"])
    assert set(codes(res2["members"])) == {"TOP", "NEW"}


def test_list_is_in_conviction_order_and_never_filled():
    res = bl.choose([C("A", conviction=70), C("B", conviction=90), C("Z", ltp=99.0)], [], ["A", "B", "Z"])
    assert codes(res["members"]) == ["B", "A"]  # Z misses question 4 and nothing replaces it


def test_since_and_free_pick():
    since = bl.since_map(["A", "B"], ["A"], {"A": "2026-10-01"}, "2026-11-05")
    assert since == {"A": "2026-10-01", "B": "2026-11-05"}
    members = ["A", "B", "C"]
    picks = {bl.free_pick(members, f"2026-11-{d:02d}") for d in range(1, 8)}
    assert picks == set(members)
    assert bl.free_pick(members, "2026-11-05") == bl.free_pick(members, "2026-11-05")
    assert bl.free_pick([], "2026-11-05") is None


def test_week_starts_on_sunday():
    assert bl.week_start("2026-11-05") == "2026-11-01"  # Thursday
    assert bl.week_start("2026-11-08") == "2026-11-08"  # Sunday
    assert bl.week_start("2026-11-07") == "2026-11-01"  # Saturday


# --- words -----------------------------------------------------------------

_BN_DIGITS = re.compile(r"[০-৯]")


def _all_text(*parts):
    out = []
    for p in parts:
        if isinstance(p, dict):
            out += [v for k, v in p.items() if k in ("en", "bn") and isinstance(v, str)]
            for k in ("miss", "fix"):
                if isinstance(p.get(k), dict):
                    out += _all_text(p[k])
    return out


def test_why_line_names_the_gap_and_one_standout():
    w = bl.why_line(C("A", ltp=78.0, div_yield_pct=5.9))
    assert w["en"] == "A company strong all round, priced 22% under what we think it is worth, and it pays 5.9% a year in cash."
    assert "22% কম" in w["bn"] and "5.9%" in w["bn"]
    g = bl.why_line(C("B", score=70.0, ltp=80.0, div_yield_pct=2.0, eps_yoy_pct=26.0))
    assert g["en"].startswith("A mostly strong company, priced 20% under") and "profit up 26%" in g["en"]


def test_almost_rows_say_what_would_bring_it_in():
    above = bl.almost_row(C("A", ltp=104.0), 4)
    assert above["miss"]["en"] == "Its price, ৳104, is above our fair price of ৳100."
    assert above["fix"]["en"] == "It comes in under ৳90.0."
    near = bl.almost_row(C("B", ltp=97.0), 4)
    assert near["miss"]["en"].startswith("Only 3% under")
    split = bl.almost_row(C("C", fair_value={"center": 100, "estimates_disagree": True}), 4)
    assert "disagree" in split["miss"]["en"]
    meeting = {"date": "2026-11-08", "better_above": 1.01}
    falling = bl.almost_row(C("D", eps_yoy_pct=-14.1), 5, meeting)
    assert falling["miss"]["en"] == "Profit is down 14% (last full year)."
    assert falling["fix"]["date"] == "2026-11-08"
    assert "৳0.92" in falling["fix"]["en"] and "৳0.83 or more" in falling["fix"]["en"]
    assert bl.almost_row(C("E"), 6)["question"] == 6


def test_also_and_left_lines():
    assert "2 companies from its sector" in bl.also_line({"cap": "sector"})["en"]
    assert "3 banks" in bl.also_line({"cap": "financial"})["en"]
    assert "Its price came too close" in bl.left_reason(C("A", ltp=97.0), 4, None)["en"]
    sig = {"en": "Its price is near the top of its range for the year.", "bn": "দাম বছরের সর্বোচ্চের কাছে।"}
    assert bl.left_reason(None, None, sig) == sig


def test_no_bengali_numerals_anywhere():
    rows = [bl.why_line(C("A", ltp=78.0, div_yield_pct=5.9)), bl.profit_chip(C("B", eps_yoy_pct=-7.0)),
            bl.also_line({"cap": "full"}), bl.almost_row(C("C", ltp=104.0), 4),
            bl.almost_row(C("D", eps_yoy_pct=-20.0), 5, {"date": "2026-11-10", "better_above": 9.19}),
            bl.almost_row(C("E"), 6), bl.left_reason(C("F"), 5, None)]
    for text in _all_text(*rows):
        assert not _BN_DIGITS.search(text), text
