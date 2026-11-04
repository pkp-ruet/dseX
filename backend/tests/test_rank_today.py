from array import array

from backend.services import rank_today as rt


def test_rank_moves_between_two_days():
    table = {
        "dates": ["2026-10-23", "2026-10-26", "2026-10-30"],
        "totals": [3, 3, 4],
        "by_code": {
            "AAA": (array("H", [0, 1, 2]), array("H", [3, 3, 1])),  # 3 -> 1: up 2
            "BBB": (array("H", [0, 2]), array("H", [1, 3])),         # 1 -> 3: down 2
            "CCC": (array("H", [0, 2]), array("H", [2, 2])),         # same place
            "DDD": (array("H", [2]), array("H", [4])),               # new
            "EEE": (array("H", [0]), array("H", [4])),               # gone: left out
        },
    }
    out = rt.rank_moves(table, "2026-10-23", "2026-10-30")
    assert out == {"from": "2026-10-23", "to": "2026-10-30", "places": {"AAA": 2, "BBB": -2}, "new": ["DDD"]}
    assert rt.rank_moves(table, None, "2026-10-30") is None
    assert rt.rank_moves(table, "2026-10-01", "2026-10-30") is None
