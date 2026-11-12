import re
from datetime import date, datetime, timedelta, timezone

from backend.services import usage_analytics as ua

NOW = datetime(2026, 11, 4, 8, 0, tzinfo=timezone.utc)
TODAY = date(2026, 11, 4)


def test_plan_of_splits_paying_given_and_free():
    later, earlier = NOW + timedelta(days=5), NOW - timedelta(days=1)
    assert ua.plan_of(later, "paid", NOW) == "paid"
    assert ua.plan_of(later, "trial", NOW) == "gifted"
    assert ua.plan_of(later, "admin", NOW) == "gifted"
    assert ua.plan_of(earlier, "paid", NOW) == "free"          # lapsed = free
    assert ua.plan_of(None, None, NOW) == "free"
    assert ua.plan_of(later.replace(tzinfo=None), "paid", NOW) == "paid"  # Mongo's naive UTC


def test_area_of_maps_paths_to_product_areas():
    assert ua.area_of("/") == "home"
    assert ua.area_of("/?src=brief") == "home"
    assert ua.area_of("/stock/GP") == "stock"
    assert ua.area_of("/stock/GP/analysis") == "stock"
    assert ua.area_of("/stocks") == "stocks"
    assert ua.area_of("/portfolio/statement") == "statement"
    assert ua.area_of("/portfolio") == "portfolio"
    assert ua.area_of("/sector/bank") == "sectors"
    assert ua.area_of("/sectors") == "sectors"
    assert ua.area_of("/share-bazar") == "market"
    assert ua.area_of("/my-lists") == "screener"
    assert ua.area_of("/compare-stocks?s=GP") == "compare"
    assert ua.area_of("/premium") == "premium"
    assert ua.area_of("/admin/analytics") == "admin"
    assert ua.area_of("/somewhere-new") == "other"
    assert ua.stock_of("/stock/gp?src=x") == "GP"
    assert ua.stock_of("/stocks") is None


def test_area_switch_mirrors_area_of():
    # The Mongo $switch is built from the same table, in the same order.
    sw = ua.area_switch("$p")["$switch"]
    assert [b["then"] for b in sw["branches"]] == [k for k, _, _ in ua.AREAS]
    assert sw["default"] == "other"
    for b, (_, _, rx) in zip(sw["branches"], ua.AREAS):
        assert b["case"]["$regexMatch"]["regex"] == rx
        re.compile(rx)  # plain patterns only


def test_active_figures_count_groups_days_and_last_seen():
    days = {
        "a": ["2026-11-04", "2026-11-01", "2026-10-10"],   # free, today
        "b": ["2026-10-20"],                               # free, only earlier in the month
        "p": ["2026-11-03", "2026-11-02", "2026-11-03"],   # premium, this week (duplicate day)
    }
    got = ua.active_figures(days, {"p"}, TODAY)
    g = got["groups"]
    assert g["all"] == {"today": 1, "d7": 2, "d30": 3, "median_days": 2.0}
    assert g["free"] == {"today": 1, "d7": 1, "d30": 2, "median_days": 2.0}
    assert g["premium"] == {"today": 0, "d7": 1, "d30": 1, "median_days": 2.0}
    assert got["per_day"]["2026-11-03"] == 1
    assert got["last"] == {"a": "2026-11-04", "b": "2026-10-20", "p": "2026-11-03"}


def test_growth_series_fills_every_day_oldest_first():
    s = ua.growth_series(TODAY, {"2026-11-04": 3}, {"2026-11-03": 9}, days=3)
    assert s == [
        {"date": "2026-11-02", "signups": 0, "active": 0},
        {"date": "2026-11-03", "signups": 0, "active": 9},
        {"date": "2026-11-04", "signups": 3, "active": 0},
    ]


def test_money_summary_month_buyers_and_repeat():
    pays = [
        {"user_id": "a", "amount": 199, "created_at": datetime(2026, 10, 2)},   # naive UTC
        {"user_id": "a", "amount": 999, "created_at": datetime(2026, 11, 1, tzinfo=timezone.utc)},
        {"user_id": "b", "amount": 99, "created_at": datetime(2026, 10, 31, 19, 0, tzinfo=timezone.utc)},  # 1 Nov Dhaka
    ]
    m = ua.money_summary(pays, NOW)
    assert m["month"] == 1098 and m["month_payments"] == 2
    assert m["total"] == 1297 and m["payments"] == 3
    assert m["buyers"] == 2 and m["repeat_buyers"] == 1
    assert m["new_buyers_30d"] == 1   # a first paid on 2 Oct, 33 days ago


def test_ending_soon_window_order_and_flags():
    def until(d):
        return datetime.combine(TODAY + timedelta(days=d), datetime.min.time()) + timedelta(hours=6)

    members = [
        {"user_id": "x", "name": "Later", "plan": "paid", "until": until(10), "last_seen_at": None},
        {"user_id": "y", "name": "Soon", "plan": "gifted", "until": until(1), "last_seen_at": NOW},
        {"user_id": "z", "name": "Too far", "plan": "paid", "until": until(20)},
    ]
    rows = ua.ending_soon(members, TODAY, {"x": "2026-11-03"}, {"x"}, days=14)
    assert [r["name"] for r in rows] == ["Soon", "Later"]
    assert rows[0]["days_left"] == 1 and rows[0]["seen_7d"] is True and rows[0]["push"] is False
    assert rows[1]["seen_7d"] is True and rows[1]["push"] is True


def test_area_rows_split_free_and_premium_and_skip_admin():
    rows = ua.area_rows(
        [{"area": "home", "premium": False, "users": 8}, {"area": "home", "premium": True, "users": 2},
         {"area": "stock", "premium": True, "users": 4}, {"area": "admin", "premium": False, "users": 50}],
        {"free": 10, "premium": 4},
    )
    assert [r["key"] for r in rows] == ["home", "stock"]
    assert rows[0] == {"key": "home", "label": "Home / dashboard", "free": 8, "premium": 2,
                       "free_pct": 80.0, "premium_pct": 50.0}
    assert rows[1]["premium_pct"] == 100.0 and rows[1]["free"] == 0


def test_pct_and_median_handle_empty():
    assert ua.pct(1, 0) == 0.0
    assert ua.median([]) == 0.0
    assert ua.median([1, 2, 10]) == 2.0
