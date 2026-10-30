from array import array

from backend.services import rank_today as rt


def test_group_moves_split_settled_grade_changes_by_direction():
    prev = {"UP": {"score": 72}, "DOWN": {"score": 61}, "EDGE": {"score": 74.5}, "SAME": {"score": 80}}
    cur = {"UP": {"score": 77}, "DOWN": {"score": 57}, "EDGE": {"score": 75.4}, "SAME": {"score": 82}}
    m = rt.group_moves(prev, cur)
    assert m == {"up": ["UP"], "down": ["DOWN"]}  # EDGE only touched the line: not settled


def test_first_ranks_reads_the_first_day_only():
    table = {
        "dates": ["2026-07-09", "2026-07-10"],
        "totals": [3, 3],
        "by_code": {
            "AAA": (array("H", [0, 1]), array("H", [2, 1])),
            "BBB": (array("H", [1]), array("H", [3])),  # listed later: no first-day rank
        },
    }
    assert rt.first_ranks(table) == {"date": "2026-07-09", "total": 3, "ranks": {"AAA": 2}}
    assert rt.first_ranks({"dates": ["2026-07-09"]}) is None


def test_warnings_keep_only_red_keys():
    snaps = {"AAA": {"red_keys": ["audit", "category"]}, "BBB": {"red_keys": []}, "CCC": {}}
    assert rt.warnings(snaps) == {"AAA": ["audit", "category"]}
