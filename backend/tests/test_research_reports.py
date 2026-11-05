import re
from datetime import date

from backend.services import research_reports as rr
from backend.services.audit_opinion import REASON_WORDS, SERIOUS

_MARKET_WORDS = re.compile(r"\b(EPS|NOCFPS|NAV|P/E|ROE|TTM|YoY|CAGR)\b|ইপিএস|পিই|এনএভি")


def _all_text(obj):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in ("en", "bn") and isinstance(v, str):
                yield v
            else:
                yield from _all_text(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from _all_text(v)


# ---------------------------------------------------------------- risks

INFO = {c: {"name": f"{c} Ltd", "sector": "Textile", "tier": "weak", "price": 10.0}
        for c in ("AAA", "BBB", "CCC", "DDD")}


def _days(*rows):
    return [(d, {c: set(k) for c, k in keys.items()}) for d, keys in rows]


def test_register_lists_flagged_companies_worst_first():
    now = {
        "AAA": {"red_keys": ["category"], "red_lines": {"category": {"en": "In Z.", "bn": "Z-এ।"}}},
        "BBB": {"red_keys": ["category", "factory"], "red_lines": {}},
        "CCC": {"red_keys": [], "red_lines": {}},
    }
    days = _days(("2026-11-05", {"AAA": ["category"], "BBB": ["category", "factory"], "CCC": []}))
    r = rr.risk_register(now, days, INFO)
    assert (r["universe"], r["flagged"], r["two_or_more"]) == (3, 2, 1)
    assert [i["code"] for i in r["items"]] == ["BBB", "AAA"]
    # The most serious kind comes first, and a missing sentence falls back to the kind's title.
    assert [p["key"] for p in r["items"][0]["problems"]] == ["factory", "category"]
    assert r["items"][0]["problems"][0]["en"] == "Factory found closed"
    assert r["items"][1]["problems"][0]["en"] == "In Z."
    assert [(k["key"], k["n"]) for k in r["kinds"]] == [("factory", 1), ("category", 2)]


def test_week_changes_skip_rule_change_days_and_cancel_round_trips():
    base = {f"X{i}": {"category"} for i in range(30)}
    rebuilt = {**{f"X{i}": set() for i in range(30)}}
    days = [
        ("d1", {**base, "AAA": set(), "BBB": {"loans"}, "CCC": {"stale"}}),
        ("d2", {**base, "AAA": {"audit"}, "BBB": {"loans"}, "CCC": {"stale"}}),   # AAA added
        ("d3", {**rebuilt, "AAA": {"audit"}, "BBB": {"loans"}, "CCC": {"stale"}}),  # 30 dropped at once
        ("d4", {**rebuilt, "AAA": {"audit"}, "BBB": set(), "CCC": {"stale", "late"}}),  # BBB fixed, CCC added
        ("d5", {**rebuilt, "AAA": {"audit"}, "BBB": set(), "CCC": {"stale"}}),     # CCC's flag went again
    ]
    ch = rr.week_changes(days)
    assert ch["skipped"] == ["d3"]
    assert [(r["code"], r["key"]) for r in ch["added"]] == [("AAA", "audit")]
    assert [(r["code"], r["key"]) for r in ch["fixed"]] == [("BBB", "loans")]


def test_a_company_no_longer_graded_is_not_fixed():
    days = [("d1", {"AAA": {"category"}, "BBB": set()}), ("d2", {"BBB": set()})]
    assert rr.week_changes(days)["fixed"] == []


def test_close_to_z_leaves_out_companies_already_in_z():
    z = [{"code": "AAA", "category": "A", "level": "red", "reasons": [{"en": "Late.", "bn": "দেরি।", "level": "red"}]},
         {"code": "BBB", "category": "Z", "level": "red", "reasons": []}]
    r = rr.risk_register({}, _days(("d1", {})), INFO, z)
    assert [c["code"] for c in r["close_to_z"]] == ["AAA"]


# ---------------------------------------------------------------- auditors

def _op(code, year, posted, severity="serious", reasons=("credit_loss",), minor=(), gc=False):
    return {"trading_code": code, "year": year, "posted": date.fromisoformat(posted), "severity": severity,
            "reasons": list(reasons), "minor": list(minor), "going_concern": gc, "url": f"https://x/{code}.pdf",
            "basis_excerpt": "We draw attention to note 12. The company has not made a provision for the loss on "
                             "its receivables from a sister concern. Had it done so, profit would be lower.",
            "text_ok": True}


def test_auditor_tracker_reads_the_newest_report_per_company():
    ops = [
        _op("AAA", 2025, "2025-11-01", reasons=("recovery",)),
        _op("AAA", 2026, "2026-10-20", reasons=("going_concern", "credit_loss"), gc=True),
        _op("BBB", 2025, "2025-12-01", severity="minor", reasons=(), minor=("gratuity",)),
        _op("CCC", 2025, "2026-01-10", severity="unknown", reasons=()),
    ]
    sizes = {"Textile": 10}
    a = rr.auditor_tracker(ops, INFO, sizes, date(2026, 11, 5), REASON_WORDS, set(SERIOUS))
    assert a["companies"] == 3
    assert a["counts"] == {"going_concern": 1, "serious": 0, "minor": 1, "unknown": 1}
    assert a["recent"] == 1 and a["repeat"] == 1
    aaa = a["groups"][0]["items"][0]
    assert (aaa["code"], aaa["year"], aaa["earlier"], aaa["new"]) == ("AAA", 2026, [2025], True)
    # "going_concern" is the group, not a reason in the list.
    assert [r["key"] for r in aaa["reasons"]] == ["credit_loss"]
    assert aaa["excerpt"].endswith(".")
    # Serious reasons first in the market-wide count.
    assert [r["key"] for r in a["reasons"]] == ["credit_loss", "gratuity"]
    assert a["sectors"] == [{"sector": "Textile", "n": 3, "of": 10}]


def test_excerpt_cuts_at_a_sentence():
    text = "First sentence is here. " * 40
    out = rr.excerpt(text, 120)
    assert len(out) <= 120 and out.endswith(".")
    assert rr.excerpt("short") is None


# ---------------------------------------------------------------- results season

def _rec(code, cur, prev, pe=date(2026, 9, 30), fy=False, cash=None, cash_pct=None, posted="2026-10-30"):
    return {"code": code, "period_end": pe, "full_year": fy, "months": 12 if fy else 3, "eps_cum": cur,
            "eps_cum_prev": prev, "nocfps_cum": cash, "cash_pct": cash_pct, "stock_pct": 0,
            "post_date": date.fromisoformat(posted)}


def test_profit_move_words():
    assert rr.profit_move(1.2, 1.0) == ("up", 20.0)
    assert rr.profit_move(1.05, 1.0) == ("same", 5.0)
    assert rr.profit_move(0.8, 1.0) == ("down", -20.0)
    assert rr.profit_move(0.5, -0.2) == ("to_profit", None)
    assert rr.profit_move(-0.5, 0.2) == ("to_loss", None)
    assert rr.profit_move(-0.5, -0.2) == ("loss", None)
    assert rr.profit_move(None, 1.0) == (None, None)


def test_dividend_move():
    assert rr.dividend_move(None, None, 10) is None
    assert rr.dividend_move(12, 0, 10) == "raised"
    assert rr.dividend_move(10, 0, 10) == "same"
    assert rr.dividend_move(5, 0, 10) == "cut"
    assert rr.dividend_move(0, 0, 10) == "none"
    assert rr.dividend_move(0, 5, 10) == "bonus_only"
    assert rr.dividend_move(5, 0, 0) == "first"


def _season_records():
    recs = [_rec(f"Q{i}", 1.0 + i * 0.1, 1.0) for i in range(20)]           # 20 quarter reports
    recs += [_rec("DOWN", 0.5, 1.0), _rec("LOSS", -0.2, 0.3), _rec("CASH", 2.0, 1.0, cash=-1.0)]
    recs += [_rec(f"Y{i}", 1.0, 1.0, pe=date(2026, 6, 30), fy=True, cash_pct=10) for i in range(20)]
    return recs


def test_season_list_needs_enough_reports():
    recs = _season_records() + [_rec("OLD", 1, 1, pe=date(2025, 12, 31))]
    ids = [s["id"] for s in rr.season_list(recs)]
    assert ids == ["2026-09-30-q", "2026-06-30-y"]


def test_results_season_counts_and_lists():
    info = {**INFO, **{c: {"name": c, "sector": "Bank" if c.startswith("Q") else "Textile"} for c in
                       ("DOWN", "LOSS", "CASH")}}
    meetings = [{"code": "LATE", "name": "Late Ltd", "date": "2026-11-10", "days": 5, "purpose": "q1",
                 "period_end": "2026-09-30"},
                {"code": "Q1", "date": "2026-11-10", "days": 5, "purpose": "q1", "period_end": "2026-09-30"},
                {"code": "ANN", "date": "2026-11-10", "days": 5, "purpose": "annual", "period_end": "2026-09-30"}]
    s = rr.results_season(_season_records(), "2026-09-30-q", info, {}, meetings, {"CASH": "GENERAL"})
    assert s["reported"] == 23
    assert s["counts"] == {"up": 20, "same": 1, "down": 2, "loss": 0}
    assert s["turned_loss"] == ["LOSS"]
    assert s["cash_out"] == ["CASH"]
    assert s["top_down"][0] == "DOWN"
    assert [m["code"] for m in s["coming"]] == ["LATE"]
    assert s["dividends"] is None
    assert rr.results_season(_season_records(), "nope", info, {}, [], {}) is None


def test_yearly_season_reads_dividends_against_last_year():
    s = rr.results_season(_season_records(), "2026-06-30-y", INFO, {"Y0": {2025: 5}, "Y1": {2025: 20}}, [], {})
    d = s["dividends"]
    assert (d["raised"], d["cut"], d["first"]) == (1, 1, 18)


def test_every_sentence_is_plain():
    words = list(_all_text([rr.RISK_KINDS, rr.AUDIT_GROUPS, rr.season_title(date(2026, 9, 30), False)]))
    assert words
    for w in words:
        assert not _MARKET_WORDS.search(w), w
        assert not re.search(r"[০-৯]", w), w
        assert "—" not in w, w
