"""Trimming a free watchlist: the first five added stay, the rest go."""
from backend.services.watchlist_trim import add_order, restore_list, trim_plan


def _m(day: str) -> dict:
    return {"added_at": f"2026-{day}T10:00:00+00:00", "price_at_add": 10.0}


def test_within_the_cap_is_left_alone():
    assert trim_plan(["GP", "ACI"], {}, 5) is None
    assert trim_plan(["GP", "gp", "ACI", "BATBC", "RENATA", "LHBL"], {}, 5) is None  # 5 after dedupe


def test_codes_without_a_date_are_the_oldest_then_the_array_order():
    codes = ["A", "B", "C", "D", "E", "F", "G"]
    meta = {"F": _m("09-10"), "G": _m("09-11")}
    plan = trim_plan(codes, meta, 5)
    assert plan["keep"] == ["A", "B", "C", "D", "E"]
    assert plan["removed"] == ["F", "G"]
    assert plan["removed_meta"] == {"F": meta["F"], "G": meta["G"]}
    assert plan["meta"] == {}
    assert plan["order_differs"] is False


def test_the_date_wins_over_the_array_order():
    # D was removed and restored by undo: it sits last in the array but was
    # followed first.
    codes = ["A", "B", "C", "E", "F", "G", "D"]
    meta = {"A": _m("09-02"), "B": _m("09-03"), "C": _m("09-04"), "D": _m("09-01"),
            "E": _m("09-05"), "F": _m("09-06"), "G": _m("09-07")}
    plan = trim_plan(codes, meta, 5)
    assert set(plan["keep"]) == {"D", "A", "B", "C", "E"}
    assert plan["keep"] == ["A", "B", "C", "E", "D"]  # array order kept
    assert plan["removed"] == ["F", "G"]
    assert plan["order_differs"] is True
    assert add_order(codes, meta)[:2] == ["D", "A"]


def test_meta_keys_are_matched_case_blind():
    plan = trim_plan(["a", "b", "c", "d", "e", "f"], {"f": _m("01-01")}, 5)
    # no-date codes are oldest, so the dated F goes
    assert plan["keep"] == ["A", "B", "C", "D", "E"]
    assert plan["removed"] == ["F"]


def test_undo_puts_the_removed_codes_back_after_the_current_list():
    assert restore_list(["A", "B", "X"], ["F", "G", "A"]) == ["A", "B", "X", "F", "G"]
