""""Based on your shares" — the pure rules (backend/services/for_you.py)."""
import re
from datetime import datetime, timedelta, timezone

from backend.services import for_you as fy
from backend.services import recommend as rc

PHARMA, BANK, TELECOM, CEMENT, SHOES, POWER = (
    "Pharmaceuticals & Chemicals", "Bank", "Telecommunication", "Cement", "Tannery Industries", "Fuel & Power")
NOW = datetime(2026, 11, 18, 10, 0)

# The screener's strengths (custom_lists.best_levels).
PLAIN = {"quality": 1, "price": 0, "dividends": 0, "growth": 0, "safety": 1, "trading": 1}
GP_LIKE = {"quality": 1, "price": 0, "dividends": 1, "growth": 0, "safety": 2, "trading": 2}


def F(code, sector=PHARMA, score=80.0, **kw):
    f = {"code": code, "name": f"{code} Ltd", "sector": sector, "sector_class": "GENERAL", "score": score,
         "p1_biz": 8.0, "p2_health": 8.0, "p3_moat": 8.0, "p5_div": 8.0, "cat": "A", "eps": 5.0,
         "mcap_mn": 20000.0, "ltp": 100.0, "change_pct": 1.0, "div_yield_pct": 3.0, "signal": "none"}
    f.update(kw)
    f.setdefault("conviction", rc.conviction(f, PLAIN, explore=True))
    return f


def mine(held=(), watched=(), sig=None):
    out = [{"code": c, "held": True, "watched": False, "value": v, "holding_signal": sig} for c, v in held]
    out += [{"code": c, "held": False, "watched": True, "value": 0.0, "holding_signal": None} for c in watched]
    return out


def run(facts, held=(), watched=(), reads=(), levels=None, cands=None, n=fy.N_PICKS):
    facts = {f["code"]: f for f in facts}
    levels = levels or {c: PLAIN for c in facts}
    m = mine(held, watched)
    prof = rc.build_profile(m, facts, levels)
    skip = prof["codes"] | {r["code"] for r in reads}
    cands = cands if cands is not None else [f for f in facts.values()
                                             if f["code"] not in skip and (f.get("score") or 0) >= 60]
    return fy.build(m, list(reads), cands, facts, levels, prof, n)


def by_code(items):
    return {i["code"]: i for i in items}


# ---------------------------------------------------------------------------
# Ties
# ---------------------------------------------------------------------------

def test_a_weak_share_leads_to_stronger_companies_in_its_business_said_in_the_four_checks():
    aci = F("ACI", score=33.0, p1_biz=2.0, p2_health=3.0, p3_moat=5.0, p5_div=5.0)
    bxp = F("BXPHARMA", score=74.0, p1_biz=8.0, p2_health=8.0)
    groups, items = run([aci, bxp, F("ROBI", TELECOM)], held=[("ACI", 48000.0)])
    [g] = [g for g in groups if g["anchor"] == "ACI"]
    assert g["rel"] == "own" and g["codes"] == ["BXPHARMA"]
    assert g["line"]["en"] == ("We grade ACI mostly weak: weak on profit and finances. "
                               "We found 1 stronger company in the same business.")
    assert "মুনাফা আর আর্থিক অবস্থায় দুর্বল" in g["line"]["bn"]
    it = by_code(items)["BXPHARMA"]
    assert it["kind"] == "stronger" and it["tag_en"] == "Stronger than ACI"
    assert it["why_en"] == "Same business as ACI. ACI is weak on profit and finances; BXPHARMA is strong on both."
    assert "দুটিতেই শক্তিশালী" in it["why_bn"]
    # The sentence says it all, so no ticks repeat it.
    assert it["chips"] == [] and it["chips_label"] is None


def test_stronger_needs_ten_points_more():
    aci = F("ACI", score=55.0)
    groups, items = run([aci, F("NEAR", score=62.0), F("FAR", score=70.0)], held=[("ACI", 1000.0)])
    assert [i["code"] for i in items] == ["FAR"]


def test_a_good_share_leads_to_the_most_alike_company_in_its_business_first():
    gp = F("GP", TELECOM, score=74.0, mcap_mn=400000.0)
    small = F("SMALL", TELECOM, mcap_mn=3000.0)
    twin = F("TWIN", TELECOM, mcap_mn=300000.0)
    levels = {"GP": GP_LIKE, "SMALL": PLAIN, "TWIN": GP_LIKE}
    groups, items = run([gp, small, twin], held=[("GP", 5000.0)], levels=levels)
    assert groups[0]["codes"] == ["TWIN", "SMALL"]
    twin_item = by_code(items)["TWIN"]
    assert twin_item["kind"] == "like" and twin_item["tag_en"] == "Like GP"
    # The sentence names the share; the ticks say what they share.
    assert twin_item["why_en"] == "Same business as GP, which you own."
    assert [c["en"] for c in twin_item["chips"]] == ["Big company", "Cash every year", "Almost no loans"]
    assert twin_item["chips_label"] == {"en": "In common with GP", "bn": "GP-এর সাথে মিল"}


def test_a_company_like_yours_in_another_business_needs_two_shared_strengths():
    gp = F("GP", TELECOM, score=74.0)
    bata = F("BATASHOE", SHOES)
    one = F("ONE", POWER)
    levels = {"GP": GP_LIKE, "BATASHOE": {**PLAIN, "dividends": 1, "safety": 2},
              "ONE": {**PLAIN, "dividends": 1}}
    groups, items = run([gp, bata, one], held=[("GP", 5000.0)], levels=levels)
    assert [i["code"] for i in items if i["group_key"] == "GP"] == ["BATASHOE"]
    it = by_code(items)["BATASHOE"]
    assert it["kind"] == "like_other"
    assert it["why_en"] == "Like GP, which you own, in a different business: Tannery Industries."
    assert [c["en"] for c in it["chips"]] == ["Cash every year", "Almost no loans"]
    assert groups[0]["line"]["en"].endswith("We found 1 company like it in another business.")


def test_another_business_only_when_its_own_has_no_strong_match():
    gp = F("GP", TELECOM, score=74.0)
    levels = {"GP": GP_LIKE, "ROBI": PLAIN, "BATA": GP_LIKE}
    groups, items = run([gp, F("ROBI", TELECOM), F("BATA", SHOES)], held=[("GP", 5000.0)], watched=[],
                        levels=levels)
    assert [i["code"] for i in items if i["group_key"] == "GP"] == ["ROBI"]


def test_four_percent_and_every_year_still_share_cash_every_year():
    assert fy.shared_traits({"dividends": 2}, {"dividends": 1}) == ["every_year"]
    assert fy.shared_traits({"dividends": 2}, {"dividends": 2}) == ["high_cash"]


def test_a_share_they_read_about_leads_to_picks_and_says_how_often():
    renata = F("RENATA", score=59.0, p1_biz=5.0, p2_health=5.0)
    groups, items = run([renata, F("KOHINOOR", score=86.0)],
                        reads=[{"code": "RENATA", "rel": "read", "days": 3, "last": NOW}])
    [g] = groups
    assert g["rel"] == "read" and g["days"] == 3
    # The heading says "Because you looked at RENATA on 3 days"; the line says what we found.
    assert g["line"]["en"].startswith("We grade RENATA mixed.")
    assert items[0]["kind"] == "stronger"


def test_gaps_come_from_their_own_money():
    gp = F("GP", TELECOM, score=74.0)
    robi = F("ROBI", TELECOM)
    lhb = F("LHB", CEMENT, score=80.0)
    groups, items = run([gp, robi, lhb], held=[("GP", 9000.0)], levels={c: PLAIN for c in ("GP", "ROBI", "LHB")})
    gap = next(g for g in groups if g["rel"] == "gap")
    assert gap["key"] == "new_business" and gap["codes"] == ["LHB"]
    assert gap["line"]["en"] == ("All of your money is in the Telecommunication sector. "
                                 "We found 1 strong company in a business you don't own yet.")
    # A watch list, not a buy list: companies like theirs still come.
    assert by_code(items)["ROBI"]["kind"] == "like"


def test_no_steady_payer_among_three_shares_finds_one():
    held = [F("A1", TELECOM), F("A2", CEMENT), F("A3", BANK, sector_class="BANK")]
    payer = F("PAY", POWER, div_yield_pct=6.5)
    levels = {f["code"]: PLAIN for f in held} | {"PAY": {**PLAIN, "dividends": 2}}
    groups, items = run(held + [payer], held=[("A1", 1000.0), ("A2", 1000.0), ("A3", 1000.0)], levels=levels)
    gap = next(g for g in groups if g["key"] == "steady_payer")
    assert gap["codes"] == ["PAY"]
    assert by_code(items)["PAY"]["why_en"] == ("PAY has paid a cash dividend in each of the last 5 years, "
                                               "about 6.5% a year on today's price.")


# ---------------------------------------------------------------------------
# Selection
# ---------------------------------------------------------------------------

def test_shares_take_turns_and_each_gives_at_most_three():
    gp = F("GP", TELECOM, score=74.0)
    bata = F("BATA", SHOES, score=74.0)
    tele = [F(f"T{i}", TELECOM) for i in range(5)]
    shoes = [F(f"S{i}", SHOES) for i in range(5)]
    groups, items = run([gp, bata, *tele, *shoes], held=[("GP", 5000.0)], watched=["BATA"])
    assert [g["anchor"] for g in groups if g["rel"] != "gap"] == ["GP", "BATA"]
    assert all(g["n"] <= fy.PER_ANCHOR for g in groups)
    # Owned first, by money; their picks lead the list.
    assert [i["group_key"] for i in items[:2]] == ["GP", "GP"]


def test_a_company_tied_to_nothing_is_left_out():
    gp = F("GP", TELECOM, score=74.0)
    groups, items = run([gp, F("CEM", CEMENT)], watched=["GP"], levels={"GP": PLAIN, "CEM": PLAIN})
    assert items == [] and groups == []


def test_each_company_once_under_the_first_share_that_leads_to_it():
    a, b = F("A", TELECOM, score=74.0), F("B", TELECOM, score=72.0)
    groups, items = run([a, b, F("T1", TELECOM)], held=[("A", 5000.0)], watched=["B"])
    assert [i["code"] for i in items] == ["T1"] and items[0]["anchor"] == "A"
    assert [g["anchor"] for g in groups] == ["A"]


def test_caps_three_a_sector_and_fifteen_in_all():
    owners = [F(f"O{i}", f"Sector {i}", score=74.0) for i in range(8)]
    picks = [F(f"P{i}{j}", f"Sector {i}") for i in range(8) for j in range(4)]
    groups, items = run(owners + picks, watched=[o["code"] for o in owners])
    assert len(items) == fy.N_PICKS
    per = {}
    for it in items:
        per[it["sector"]] = per.get(it["sector"], 0) + 1
    assert max(per.values()) <= rc.SECTOR_CAP


def test_same_inputs_same_list():
    fs = [F("GP", TELECOM, score=74.0), F("X", TELECOM), F("Y", TELECOM, conviction=80.0)]
    assert run(fs, held=[("GP", 1.0)]) == run(fs, held=[("GP", 1.0)])


def test_a_free_reader_sees_the_business_not_the_name():
    groups, _ = run([F("ACI", score=33.0, p1_biz=2.0), F("BXPHARMA", score=74.0)], held=[("ACI", 1.0)])
    assert groups[0]["sectors"] == [{"en": PHARMA, "bn": groups[0]["sectors"][0]["bn"]}]
    assert "BXPHARMA" not in groups[0]["line"]["en"] and "BXPHARMA" not in groups[0]["line"]["bn"]


# ---------------------------------------------------------------------------
# Reads, hiding, the starter list
# ---------------------------------------------------------------------------

def test_reads_count_two_days_or_one_recent_visit():
    ev = lambda code, days_ago, hour=9: {"path": f"/stock/{code}", "ts": NOW - timedelta(days=days_ago, hours=-hour)}
    events = [ev("RENATA", 20), ev("RENATA", 20, 11), ev("RENATA", 3), ev("OLD", 25),
              ev("NEW", 2), ev("GP", 1), ev("GP", 4), ev("FUND", 1), {"path": "/stock/renata/analysis", "ts": NOW}]
    visits = fy.visits_from_events(events)
    assert visits["RENATA"]["days"] == 3
    reads = fy.read_anchors(visits, exclude={"GP"}, known={"RENATA", "OLD", "NEW", "GP"}, now=NOW)
    assert [r["code"] for r in reads] == ["RENATA", "NEW"]


def test_reads_take_a_timezone_aware_now():
    visits = {"X": {"days": 1, "last": NOW - timedelta(days=2)}}
    assert fy.read_anchors(visits, set(), {"X"}, NOW.replace(tzinfo=timezone.utc))[0]["code"] == "X"


def test_not_for_me_lasts_ninety_days_and_can_be_undone():
    now = NOW.replace(tzinfo=timezone.utc)
    entries = fy.hide([], "BXPHARMA", now)
    assert fy.hidden_codes(entries, now) == {"BXPHARMA"}
    assert fy.hidden_codes(entries, now + timedelta(days=fy.HIDE_DAYS + 1)) == set()
    assert fy.hidden_codes(fy.unhide(entries, "BXPHARMA"), now) == set()
    # Stored naive by Mongo, read back naive: still compares.
    naive = [{"code": "A", "until": NOW + timedelta(days=5)}]
    assert fy.hidden_codes(naive, now) == {"A"}


def test_starter_is_big_names_one_a_sector():
    cands = [F("BIG1", TELECOM), F("BIG2", TELECOM), F("BANK1", BANK, sector_class="BANK"),
             F("BANK2", "Bank2", sector_class="BANK"), F("BANK3", "Bank3", sector_class="BANK"), F("SMALL", CEMENT)]
    levels = {c["code"]: {**PLAIN, "trading": 2} for c in cands} | {"SMALL": PLAIN}
    out = fy.starter(cands, levels)
    codes = [i["code"] for i in out]
    assert codes.count("BIG1") + codes.count("BIG2") == 1
    assert sum(1 for c in codes if c.startswith("BANK")) <= fy.STARTER_FINANCIALS
    assert all(i["kind"] == "starter" and i["why_en"] for i in out)


# ---------------------------------------------------------------------------
# Words
# ---------------------------------------------------------------------------

_BARE = re.compile(r"\b(EPS|P/E|NAV|ROE|buy|cheap|fair price|low price)\b", re.I)


def test_no_word_says_buy_or_judges_the_price():
    gp = F("GP", TELECOM, score=74.0)
    aci = F("ACI", score=33.0, p1_biz=2.0)
    fs = [gp, aci, F("BXP", score=74.0), F("T1", TELECOM), F("LHB", CEMENT, div_yield_pct=5.0)]
    groups, items = run(fs, held=[("GP", 9000.0), ("ACI", 1000.0)], levels={f["code"]: GP_LIKE for f in fs})
    texts = [g["line"]["en"] for g in groups] + [i["why_en"] for i in items] + [i["tag_en"] for i in items]
    for t in texts:
        assert not _BARE.search(t), t
    for g in groups:
        assert g["line"]["bn"] and not re.search(r"[০-৯]", g["line"]["bn"])
    for i in items:
        assert i["why_bn"] and not re.search(r"[০-৯]", i["why_bn"])


def test_explore_list_leaves_out_the_buy_list_own_reads_and_hidden(monkeypatch):
    from backend.services import recommend_service as rs
    cands = [F("GP", TELECOM, score=74.0), F("ROBI", TELECOM), F("BSC", TELECOM), F("HID", TELECOM),
             F("RD", TELECOM), F("OK", TELECOM)]
    p = {"cands": cands, "levels": {c["code"]: PLAIN for c in cands}, "facts": {c["code"]: c for c in cands}}
    monkeypatch.setattr(rs, "_buy_list", lambda: [{"code": "ROBI"}])
    monkeypatch.setattr(rs, "_visits", lambda uid: {"RD": {"days": 2, "last": NOW}})
    user = {"user_id": "u1", "for_you_hidden": [{"code": "HID", "until": NOW + timedelta(days=9)}]}
    out = rs.explore_list(p, user, [], ["GP"], now=NOW)
    codes = {i["code"] for i in out["items"]}
    assert codes == {"BSC", "OK"}
    assert out["mode"] == "personal" and out["based_on"] == {"held": 0, "watched": 1, "read": 1}
    assert out["buy_list"]["count"] == 1 and out["hidden"] == 1
    assert {i["code"] for i in out["starter"]}.isdisjoint({"ROBI", "GP", "HID"})


def test_a_reader_with_nothing_to_match_gets_the_starter_list(monkeypatch):
    from backend.services import recommend_service as rs
    cands = [F("A", TELECOM), F("B", CEMENT)]
    p = {"cands": cands, "levels": {c["code"]: PLAIN for c in cands}, "facts": {c["code"]: c for c in cands}}
    monkeypatch.setattr(rs, "_buy_list", lambda: [])
    monkeypatch.setattr(rs, "_visits", lambda uid: {})
    out = rs.explore_list(p, {"user_id": "u1"}, [], [], now=NOW)
    assert out["mode"] == "generic" and out["groups"] == []
    assert [i["kind"] for i in out["items"]] == ["starter", "starter"]
