"""The four groups by rule (grade_rules, 2026-11-05). Check values are the
real ones of companies on 2026-11-05 where a case is named."""
from backend.services import grade_rules as gr
from backend.services.tiers import tier_key


def vals(p1, p2, p3, p5):
    out = {"p1_biz": p1, "p2_health": p2, "p3_moat": p3, "p5_div": p5}
    return {k: v for k, v in out.items() if v is not None}


# ---- step 1 + 2: the checks --------------------------------------------------

def test_strong_all_round_needs_strong_profit_and_two_more_and_nothing_weak():
    assert gr.checks_group(vals(8.95, 8.0, 7.5, 9.0)) == "excellent"      # all four strong
    assert gr.checks_group(vals(9.6, 8.4, 5.2, 9.7)) == "excellent"       # strong profit + 2 more, one fair
    assert gr.checks_group(vals(9.6, 6.3, 5.2, 9.7)) == "good"            # JAMUNAOIL: strong on 2 only
    assert gr.checks_group(vals(9.9, 5.3, 5.2, 9.3)) == "good"            # PADMAOIL: strong on 2 only
    assert gr.checks_group(vals(6.4, 7.9, 9.6, 6.3)) == "good"            # GP: profit only fair
    assert gr.checks_group(vals(10.0, 8.2, 2.4, 10.0)) == "good"          # CITYBANK: 3 strong, one weak


def test_mostly_strong_never_with_weak_profit():
    assert gr.checks_group(vals(3.6, 6.8, 8.4, 8.1)) == "average"         # RENATA: weak profit
    assert gr.checks_group(vals(3.5, 7.6, 8.8, 8.7)) == "average"         # BDCOM: 3 strong but weak profit
    assert gr.checks_group(vals(8.0, 6.6, 3.6, 8.7)) == "average"         # PUBALIBANK: 2 strong, 1 weak


def test_strong_on_one_check_is_not_mostly_strong():
    assert gr.checks_group(vals(6.5, 5.8, 6.5, 8.7)) == "average"         # EHL: strong on dividend only
    assert gr.checks_group(vals(6.5, 5.9, 5.4, 6.0)) == "average"         # fair on everything


def test_mostly_weak_means_more_weak_than_strong_or_weak_profit_with_nothing_strong():
    assert gr.checks_group(vals(7.9, 1.6, 2.9, 8.7)) == "average"         # SONALIANSH: 2 strong, 2 weak
    assert gr.checks_group(vals(3.1, 8.4, 3.4, 4.7)) == "weak"            # NHFIL: 2 weak, 1 strong
    assert gr.checks_group(vals(2.5, 5.0, 6.0, 6.1)) == "weak"            # QUASEMIND: weak profit, nothing strong
    assert gr.checks_group(vals(5.5, 4.0, 3.6, 6.2)) == "average"         # BANGAS: one weak (not profit)
    assert gr.checks_group(vals(1.0, 2.0, 2.0, 2.0)) == "weak"


def test_a_check_with_no_figures_is_left_out_not_weak():
    row = {"p1_biz": 8.0, "p2_health": 7.5, "p3_moat": 0.0, "p3_coverage": 0.0, "p5_div": 9.2}
    v = gr.check_values(row)
    assert "p3_moat" not in v                                              # BNICL: insurer
    assert gr.checks_group(v) == "excellent"                               # strong on every check we can measure
    assert gr.check_values({"p1_biz": 8.0, "p2_health": None, "p5_div": float("nan")}) == {"p1_biz": 8.0}


# ---- step 3: serious problems -------------------------------------------------

def test_one_serious_problem_holds_at_mixed_two_make_it_mostly_weak():
    strong = vals(9.0, 8.0, 8.0, 9.0)
    assert gr.group_for(strong, []) == "excellent"
    assert gr.group_for(strong, ["z_category"]) == "average"
    assert gr.group_for(strong, ["z_category", "old_accounts"]) == "weak"
    assert gr.group_for(vals(2.0, 2.0, 2.0, 2.0), ["loss"]) == "weak"     # never lifted by a problem


def test_problem_keys_are_ordered_and_unique():
    keys = gr.problem_keys(["loans", "going_concern"], loss_now=True, old_accounts=False,
                           z_category=True, thin_data=False)
    assert keys == ["going_concern", "loans", "loss", "z_category"]
    assert gr.problem_keys([], loss_now=False, old_accounts=False, z_category=False, thin_data=False) == []


# ---- step 4: settling ------------------------------------------------------------

def test_a_check_parked_on_its_line_does_not_flip_the_group():
    v = vals(6.96, 8.4, 8.7, 9.6)                                          # DUTCHBANGL: profit 6.96
    assert gr.group_for(v, []) == "good"                                   # strict: profit not strong
    assert gr.group_for(v, [], prev="excellent") == "excellent"            # held: 0.04 under the line
    assert gr.group_for(vals(6.6, 8.4, 8.7, 9.6), [], prev="excellent") == "good"   # 0.4 under: moves
    up = vals(7.1, 8.4, 8.7, 9.6)
    assert gr.group_for(up, [], prev="good") == "good"                     # 0.1 over: not yet
    assert gr.group_for(vals(7.4, 8.4, 8.7, 9.6), [], prev="good") == "excellent"


def test_settling_never_overshoots_and_problems_act_at_once():
    v = vals(9.0, 8.0, 8.0, 9.0)
    assert gr.group_for(v, ["factory"], prev="excellent") == "average"    # a fact, not a drift
    assert gr.group_for(v, [], prev="average") == "excellent"             # problem gone: back at once
    assert gr.group_for(vals(1.0, 1.0, 1.0, 1.0), [], prev="excellent") == "weak"
    assert gr.group_for(v, [], prev="unknown") == "excellent"


# ---- the published score ----------------------------------------------------------

def test_the_score_is_held_inside_its_groups_band():
    for g in gr.ORDER:
        for raw in (0.0, 30.0, 44.95, 52.0, 59.95, 66.0, 74.95, 80.0, 100.0):
            assert tier_key(gr.held_score(raw, g)) == g, (g, raw)
    assert gr.held_score(81.6, "good") == 74.34                             # DUTCHBANGL held at Mostly strong
    assert gr.held_score(41.4, "average") == 45.08                          # ADVENT lifted to Mixed
    assert gr.held_score(66.04, "good") == 66.0                             # inside: untouched
    assert gr.held_score(None, "good") is None
    # Held companies keep their own order, and never show the next group's number.
    held = [gr.held_score(r, "good") for r in (74.6, 77.9, 81.6, 99.0)]
    assert held == sorted(held) and len(set(held)) == 4
    assert all(round(h) == 74 for h in held)
    lifted = [gr.held_score(r, "average") for r in (10.0, 30.0, 44.0)]
    assert lifted == sorted(lifted) and all(45.0 <= h < 45.1 for h in lifted)


# ---- words for the stock page ------------------------------------------------------

WORDS = {"excellent": ("Strong all round", "সব দিকে শক্তিশালী"), "good": ("Mostly strong", "বেশিরভাগ দিকে শক্তিশালী"),
         "average": ("Mixed", "মিশ্র"), "weak": ("Mostly weak", "বেশিরভাগ দিকে দুর্বল")}


def test_problem_note_says_what_held_it_back():
    v = vals(9.0, 8.0, 8.0, 9.0)
    en, bn = gr.problem_note(v, ["z_category"], "average", WORDS)
    assert "“Strong all round”" in en and "Z category" in en and "“Mixed”" in en
    assert "জেড ক্যাটাগরি" in bn
    en, _ = gr.problem_note(v, ["loss", "old_accounts"], "weak", WORDS)
    assert en.startswith("It is “Mostly weak” because of 2 serious problems")
    # A problem that changed nothing (its checks already say Mixed) is not news.
    assert gr.problem_note(vals(5.0, 5.0, 5.0, 5.0), ["z_category"], "average", WORDS) is None
    assert gr.problem_note(v, [], "excellent", WORDS) is None


def test_a_group_held_by_settling_is_not_blamed_on_a_problem():
    # HEIDELBCEM 2026-11-05: profit weak, business 4.01, dividend strong, a loss now.
    # Checks alone: Mixed; one problem: Mixed at best; held at Mostly weak only
    # because business strength sits on its line (settling).
    v = vals(3.17, 5.43, 4.01, 8.51)
    assert gr.strict_group(v, ["loss"]) == "average"
    assert gr.group_for(v, ["loss"], prev="weak") == "weak"
    assert gr.held_back_by(v, ["loss"], "weak") == []
    assert gr.problem_note(v, ["loss"], "weak", WORDS) is None
    assert gr.near_line(v) == ["p3_moat"]
    # BXPHARMA: strong on 3, old accounts: the problem did decide it.
    v = vals(6.28, 8.8, 9.1, 9.7)
    assert gr.held_back_by(v, ["old_accounts"], "average") == ["old_accounts"]


def test_group_watch_names_the_check_that_could_move_it():
    gw = gr.group_watch(vals(7.2, 8.0, 8.0, 9.0), [])
    assert gw["down"] == {"check": "p1_biz", "from": "strong", "to": "fair", "group": "good"}
    gw = gr.group_watch(vals(6.6, 8.0, 8.0, 9.0), [])
    assert gw["down"] is None and gw["up"]["check"] == "p1_biz" and gw["up"]["group"] == "excellent"
    gw = gr.group_watch(vals(9.0, 9.0, 9.0, 9.0), [])
    assert gw == {"down": None, "up": None}                                 # nothing close to a line
    # A held-back company can't move up on results alone past Mixed.
    gw = gr.group_watch(vals(6.6, 8.0, 8.0, 9.0), ["z_category"])
    assert gw["up"] is None


def test_every_group_has_its_rule_in_words():
    for g in gr.ORDER:
        en, bn = gr.GROUP_RULES[g]
        assert en and bn
    assert set(gr.PROBLEM_WORDS) == set(gr.PROBLEMS)
