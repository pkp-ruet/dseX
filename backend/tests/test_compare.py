"""Compare stocks (services/compare.py): the seven questions, our read in
plain words and the dates, on figures shaped like the real 2026-11-11 rows
(Square, Beacon, Renata, ACME and a bank)."""
import re

from backend.services import compare as cp
from backend.services.grade_rules import PROBLEM_WORDS
from backend.services.tiers import GROUP_WORDS


def _facts(code, **kw):
    base = {
        "code": code, "name": f"{code} Limited", "sector": "Pharmaceuticals & Chemicals",
        "sector_class": "GENERAL", "cat": "A", "ltp": 100.0, "change_pct": 0.5,
        "score": 70.0, "overall_rank": 30, "total_scored": 353,
        "eps": 10.0, "eps_yoy_pct": 12.0, "interim_eps_yoy_pct": 5.0,
        "interim_label_en": "3 months to Sep 2026", "interim_label_bn": "সেপ্টেম্বর 2026 পর্যন্ত 3 মাস",
        "current_pe": 10.0, "own_avg_pe": 12.0, "own_avg_pe_years": 5, "sector_median_pe": 18.3,
        "current_pb": 1.5, "total_loan_mn": 1000.0, "loan_to_reserve": 0.5, "loan_to_mcap": 0.2,
        "mcap_mn": 20000.0, "turnover_mn": 5.0, "paid_years": 5, "div_latest_dps": 4.0,
        "div_yield_pct": 4.0, "lo52": 80.0, "hi52": 120.0, "p4_val": 6.0,
        "grade_checks": {"p1_biz": "fair", "p2_health": "fair", "p3_moat": "strong", "p5_div": "strong"},
        "grade_problems": [],
    }
    base.update(kw)
    return base


def _row(f, ret=5.0, reserve=None, snap=None, signal=None):
    reserve = f.get("_reserve", 2000.0) if reserve is None else reserve
    return cp.share_row(f, short=f["code"].title(), ret_1y=ret, reserve_mn=reserve, snap=snap,
                        signal=signal, total=353, group_words=GROUP_WORDS, sector_bn=None)


SQUARE = _facts("SQURPHARMA", score=88.7, overall_rank=4, mcap_mn=193778.0, current_pe=6.9, div_yield_pct=5.9,
                loan_to_reserve=0.01, total_loan_mn=825.5, _reserve=129050.4, loan_to_mcap=0.004, p4_val=9.5,
                grade_checks={"p1_biz": "strong", "p2_health": "strong", "p3_moat": "strong", "p5_div": "strong"})
BEACON = _facts("BEACONPHAR", score=70.2, mcap_mn=21044.0, current_pe=10.8, div_yield_pct=1.2,
                interim_eps_yoy_pct=None, eps_yoy_pct=105.1, loan_to_reserve=2.31, total_loan_mn=10077.4,
                _reserve=4357.1, loan_to_mcap=0.48)
RENATA = _facts("RENATA", score=59.3, mcap_mn=48872.0, current_pe=12.5, div_yield_pct=1.3,
                interim_eps_yoy_pct=37.1, loan_to_reserve=0.56, total_loan_mn=18884.4, _reserve=33914.5,
                grade_checks={"p1_biz": "weak", "p2_health": "fair", "p3_moat": "strong", "p5_div": "strong"})
ACME = _facts("ACMELAB", score=59.33, mcap_mn=16928.0, current_pe=6.3, div_yield_pct=5.0,
              loan_to_reserve=1.27, total_loan_mn=24810.1, _reserve=19496.4, loan_to_mcap=1.47, grade_problems=["loans"],
              grade_checks={"p1_biz": "fair", "p2_health": "weak", "p3_moat": "strong", "p5_div": "strong"})


def _walk(o, path=""):
    """Every {en, bn} pair in a payload."""
    if isinstance(o, dict):
        if "en" in o and "bn" in o:
            yield path, o
        for k, v in o.items():
            yield from _walk(v, f"{path}.{k}")
    elif isinstance(o, list):
        for i, v in enumerate(o):
            yield from _walk(v, f"{path}[{i}]")


def test_parse_codes_upper_cases_drops_repeats_and_caps():
    assert cp.parse_codes(" gp, robi,GP,,bad code!") == ["GP", "ROBI"]
    assert cp.parse_codes(",".join(f"C{i}" for i in range(15))) == [f"C{i}" for i in range(10)]
    assert cp.parse_codes(None) == []
    assert cp.parse_codes("AMCL(PRAN)") == []          # not a code shape: dropped, never a crash
    assert cp.parse_codes("1JANATAMF,SQURPHARMA") == ["1JANATAMF", "SQURPHARMA"]


def test_limits_match_entitlements():
    from backend.services.entitlements import FREE_LIMITS, HARD_LIMITS
    assert cp.FREE_CODES == FREE_LIMITS["compare"] == 3
    assert cp.MAX_CODES == HARD_LIMITS["compare"] == 10


def test_share_row_reads_a_loss_maker_and_a_bank_honestly():
    loss = _row(_facts("LOSSCO", eps=-1.2, current_pe=None, interim_eps_yoy_pct=-140.0))
    assert loss["loss"] and loss["profit_pct"] is None and loss["pe"] is None
    assert loss["analysis"]["price"]["en"] == "Can't judge"

    bank = _row(_facts("CITYBANK", sector_class="BANK", sector="Bank"))
    assert bank["lender"] and bank["loans_pct"] is None and bank["loans_mcap_pct"] is None

    sq = _row(SQUARE)
    assert sq["group"]["en"] == "Strong all round" and sq["score"] == 89
    assert sq["analysis"]["strong"]["en"] == "profit, finances, business and dividend"
    assert sq["analysis"]["weak"] is None
    assert sq["mcap_cr"] == 19377.8 and sq["loans_pct"] == 0.6

    short_history = _row(_facts("NEWCO", own_avg_pe_years=2))
    assert short_history["usual_pe"] is None          # under 3 year-ends: no "usual"


def test_price_word_follows_the_stock_page():
    strong_buy = _row(SQUARE, signal={"signal": "buy", "strength": "strong"})
    assert strong_buy["analysis"]["price"]["en"] == "Very low"
    from_report = _row(BEACON, snap={"words": {"price": "Fair"}, "red": 0, "amber": 1})
    assert from_report["analysis"]["price"] == {"en": "Fair", "bn": "ন্যায্য", "tone": "neutral"}
    assert from_report["analysis"]["safety"]["word"]["en"] == "1 smaller thing to check"
    serious = _row(ACME, snap={"words": {"price": "Low"}, "red": 1, "amber": 0, "red_keys": ["loans"],
                               "red_lines": {"loans": {"en": "Loans over its market value.", "bn": "ঋণ বাজার মূলধনের চেয়ে বেশি।"}}})
    assert serious["analysis"]["safety"]["tone"] == "bad"
    assert serious["analysis"]["safety"]["line"]["en"] == "Loans over its market value."
    no_snap = _row(BEACON)
    assert no_snap["analysis"]["safety"] is None and no_snap["analysis"]["price"]["en"] == "Fair"


def _qs(*facts):
    return {q["key"]: q for q in cp.questions([_row(f) for f in facts])}


def test_each_card_names_its_leader_and_ranks_best_first():
    qs = _qs(SQUARE, BEACON, RENATA, ACME)
    assert qs["grade"]["leaders"] == ["SQURPHARMA"]
    assert qs["size"]["bars"][0]["code"] == "SQURPHARMA"
    assert qs["profit"]["leaders"] == ["BEACONPHAR"]                 # +105% for its full year
    assert qs["profit"]["answer"]["en"] == "Beaconphar's profit grew most: up 105% in its last full year."
    assert qs["loans"]["answer"]["en"].startswith("Squrpharma has the fewest loans: almost none.")
    assert qs["dividend"]["leaders"] == ["SQURPHARMA"]
    assert qs["pe"]["leaders"] == ["ACMELAB"] and qs["pe"]["best"] == "min"
    assert qs["loans"]["leaders"] == ["SQURPHARMA"]
    assert "Beacon" in qs["loans"]["answer"]["en"] and "Acmelab" in qs["loans"]["answer"]["en"]
    assert "owe more than they have saved" in qs["loans"]["answer"]["en"]
    assert [b["code"] for b in qs["pe"]["bars"]] == ["ACMELAB", "SQURPHARMA", "BEACONPHAR", "RENATA"]
    assert len(qs) == 7


def test_missing_figures_sort_last_and_never_lead():
    loss = _facts("LOSSCO", eps=-1.2, current_pe=None, interim_eps_yoy_pct=-140.0, score=30.0)
    bank = _facts("CITYBANK", sector_class="BANK", sector="Bank")
    qs = _qs(loss, SQUARE, bank)
    assert qs["pe"]["bars"][-1]["value"] is None and qs["pe"]["leaders"] == ["SQURPHARMA"]
    assert qs["profit"]["bars"][-1]["code"] == "LOSSCO"
    assert qs["profit"]["bars"][-1]["label"]["en"] == "A loss"
    loans_last = qs["loans"]["bars"][-1]
    assert loans_last["code"] == "CITYBANK" and loans_last["sub"]["en"] == "Not used for banks"


def test_ties_dividends_and_falls_read_plainly():
    a = _facts("AAA", score=70.0, div_yield_pct=0.0)
    b = _facts("BBB", score=70.0, div_yield_pct=0.0)
    qs = cp.questions([_row(a, ret=-5.0), _row(b, ret=-12.0)])
    q = {x["key"]: x for x in qs}
    assert q["grade"]["leaders"] == ["AAA", "BBB"] and "share our highest grade" in q["grade"]["answer"]["en"]
    assert q["dividend"]["answer"]["en"] == "None of these shares paid a cash dividend last year."
    assert q["move"]["answer"]["en"].startswith("All of them fell.")


_BARE = re.compile(r"\b(EPS|NAV|P/E|P/B|ROE|TTM|YoY|CAGR|ratio)\b|ইপিএস|পিই|পিবি|এনএভি")


def test_every_line_is_filled_in_both_languages_and_reads_plainly():
    qs = cp.questions([_row(f) for f in (SQUARE, BEACON, RENATA, ACME)])
    pairs = list(_walk(qs))
    assert pairs
    for path, p in pairs:
        assert p["en"] and p["bn"], path
        assert not re.search(r"[০-৯]", p["bn"]), path          # Western digits only
    for q in qs:
        for part in ("question", "answer"):
            for lang in ("en", "bn"):
                text = q[part][lang]
                assert " — " not in text and "—" not in text, (q["key"], part)
                assert not _BARE.search(text), (q["key"], part, text)
                for sentence in re.split(r"(?<=[.।])\s+", text):
                    assert len(re.findall(r"\d[\d,.]*", sentence)) <= 3, sentence


def test_plain_words_name_the_strongest_and_the_cheapest_problem():
    rows = [_row(f) for f in (SQUARE, BEACON, RENATA, ACME)]
    p = cp.plain_words(rows, PROBLEM_WORDS)
    assert p["en"].startswith("Squrpharma is the strongest company here: it is strong on profit, finances, business and dividend.")
    assert "It also pays the most cash." in p["en"]
    assert "Acmelab costs the least for its profit, but its loans are bigger than" in p["en"]
    assert "Renata is weak on profit." in p["en"]
    for word in (" buy", " sell", "Buy", "Sell"):
        assert word not in p["en"]
    assert p["bn"] and not re.search(r"[০-৯]", p["bn"])
    assert cp.plain_words([_row(SQUARE)], PROBLEM_WORDS) is None


def test_dates_keep_these_shares_inside_the_window_soonest_first():
    rows = [_row(SQUARE), _row(RENATA)]
    records = [
        {"trading_code": "SQURPHARMA", "record_date": "2026-11-16", "cash_per_share": 13.0, "buy_by": "2026-11-11"},
        {"trading_code": "RENATA", "record_date": "2026-11-15", "cash_per_share": 5.5, "buy_by": "2026-11-12"},
        {"trading_code": "OTHER", "record_date": "2026-11-14", "cash_per_share": 1.0},
        {"trading_code": "RENATA", "record_date": "2027-03-01", "cash_per_share": 2.0},
    ]
    agms = [{"trading_code": "SQURPHARMA", "agm_date": "2026-12-15", "cash_per_share": 13.0}]
    meetings = [{"code": "RENATA", "date": "2026-11-20", "label_en": "Q1 results", "label_bn": "প্রথম প্রান্তিকের ফল"}]
    items = cp.date_items(rows, records, agms, meetings, "2026-11-12", "2027-01-11")
    assert [(i["date"], i["code"], i["kind"]) for i in items] == [
        ("2026-11-15", "RENATA", "record"), ("2026-11-16", "SQURPHARMA", "record"),
        ("2026-11-20", "RENATA", "results"), ("2026-12-15", "SQURPHARMA", "agm")]
    assert "Last day to buy: 12 Nov." in items[0]["line"]["en"]
    assert "too late to buy for it in a normal trade" in items[1]["line"]["en"]      # 11 Nov has passed
    assert "শেষ কেনার দিন: 12 নভেম্বর।" in items[0]["line"]["bn"]


def test_similar_companies_come_from_the_same_sector_biggest_first():
    rows = [_row(SQUARE)]
    universe = [
        {"code": "SQURPHARMA", "short": "Square", "sector": "Pharmaceuticals & Chemicals", "mcap_cr": 19000},
        {"code": "BEACONPHAR", "short": "Beacon", "sector": "Pharmaceuticals & Chemicals", "mcap_cr": 2100},
        {"code": "RENATA", "short": "Renata", "sector": "Pharmaceuticals & Chemicals", "mcap_cr": 4900},
        {"code": "GP", "short": "Grameenphone", "sector": "Telecommunication", "mcap_cr": 40000},
    ]
    assert [s["code"] for s in cp.similar_codes(rows, universe)] == ["RENATA", "BEACONPHAR"]
