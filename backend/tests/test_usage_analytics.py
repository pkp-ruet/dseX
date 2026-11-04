from datetime import date, datetime, timedelta, timezone

from backend.services import usage_analytics as ua

NOW = datetime(2026, 11, 4, 8, 0, tzinfo=timezone.utc)


def test_plan_of_splits_paying_given_and_free():
    later, earlier = NOW + timedelta(days=5), NOW - timedelta(days=1)
    assert ua.plan_of(later, "paid", NOW) == "paid"
    assert ua.plan_of(later, "trial", NOW) == "gifted"
    assert ua.plan_of(later, "admin", NOW) == "gifted"
    assert ua.plan_of(earlier, "paid", NOW) == "free"          # lapsed = free
    assert ua.plan_of(None, None, NOW) == "free"
    assert ua.plan_of(later.replace(tzinfo=None), "paid", NOW) == "paid"  # Mongo's naive UTC


def test_groups_of_puts_every_premium_reader_in_all_premium():
    assert ua.groups_of("paid") == ("all", "premium", "paid")
    assert ua.groups_of("gifted") == ("all", "premium", "gifted")
    assert ua.groups_of("free") == ("all", "free")


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
    assert ua.area_of("/premium") == "premium"
    assert ua.area_of("/admin/analytics") == "admin"
    assert ua.area_of("/somewhere-new") == "other"


def test_page_stock_and_source_parsing():
    assert ua.page_of("/stock/gp?src=push-digest") == "/stock/[code]"
    assert ua.page_of("/stock/GP/analysis") == "/stock/[code]/analysis"
    assert ua.page_of("/learn/what-is-pe") == "/learn/[slug]"
    assert ua.page_of("/") == "/"
    assert ua.stock_of("/stock/gp?src=x") == "GP"
    assert ua.stock_of("/stocks") is None
    assert ua.src_of("/?src=push-digest&v=2") == "push-digest"
    assert ua.src_of("/portfolio") is None


def test_push_kind_reads_the_campaign_prefix():
    assert ua.push_kind("pwatch-abc-2026-11-04") == "pwatch"
    assert ua.push_kind("evt-div-GP-2026-11-04") == "evt"
    assert ua.push_kind("whatever-1") == "other"
    assert ua.push_kind("") == "other"


def test_visits_break_after_a_thirty_minute_gap():
    # minute → views: one 6-minute visit (3 pages), then a lone page 31+ minutes later.
    assert ua.visits({100: 1, 103: 1, 105: 1, 137: 2}) == [(6, 3), (1, 2)]
    assert ua.visits({100: 1, 130: 1}) == [(31, 2)]      # exactly 30 apart stays one visit
    assert ua.visits({}) == []


def test_usage_summary_counts_days_visits_and_time():
    a = ua.Usage()
    a.add(1, 100, "home", 1)
    a.add(1, 104, "stock", 2)
    a.add(2, 5000, "portfolio", 1)
    b = ua.Usage()
    b.add(1, 200, "home", 1)
    s = ua.usage_summary([a, b])
    assert s["days"] == {"mean": 1.5, "median": 1.5}
    assert s["views"] == {"mean": 2.5, "median": 2.5}
    assert s["visits"] == {"mean": 1.5, "median": 1.5}
    assert s["minutes"]["median"] == 3.5           # a: 5 + 1, b: 1
    assert s["total_views"] == 5 and s["total_visits"] == 3
    assert a.top_areas() == ["Stock pages", "Home / dashboard", "Portfolio"]


def test_intensity_buckets_follow_the_window():
    assert [r["users"] for r in ua.intensity([1, 2, 3, 8, 30], 30)] == [1, 2, 0, 1, 1]
    assert [r["users"] for r in ua.intensity([7, 7, 1], 7)] == [1, 0, 0, 0, 2]
    assert ua.intensity([], 90)[-1] == {"label": "46+ days", "users": 0}


def test_area_rows_rank_by_reach_and_skip_admin():
    rows = ua.area_rows(
        {"home": {"a", "b"}, "stock": {"a"}, "admin": {"a"}},
        {"home": 3, "stock": 10, "admin": 50},
        active=4,
    )
    assert [r["key"] for r in rows] == ["home", "stock"]
    assert rows[0]["reach"] == 50.0 and rows[1]["per_user"] == 10.0


def test_signup_to_pay_buckets():
    got = {r["label"]: r["users"] for r in ua.signup_to_pay([0, 0, 3, 20, 45, 200])}
    assert got == {"Same day": 2, "1–7 days": 1, "8–30 days": 1, "1–3 months": 1, "3+ months": 1}


def test_renewal_weeks_bucket_end_dates_from_today():
    today = date(2026, 11, 4)
    members = [
        {"until": date(2026, 11, 4), "plan": "paid", "active7": True, "push": False},
        {"until": date(2026, 11, 10), "plan": "paid", "active7": False, "push": True},
        {"until": date(2026, 11, 11), "plan": "gifted", "active7": True, "push": True},
        {"until": date(2026, 11, 26), "plan": "paid", "active7": True, "push": True},
        {"until": None, "plan": "paid"},
    ]
    weeks = ua.renewal_weeks(members, today, weeks=4)
    assert weeks[0] == {"start": "2026-11-04", "end": "2026-11-10", "paid": 2,
                        "paid_active7": 1, "paid_push": 1, "gifted": 0}
    assert weeks[1]["gifted"] == 1 and weeks[1]["paid"] == 0
    assert weeks[3]["paid"] == 1


def test_before_after_waits_for_a_full_span():
    paid = 1000
    days = {990, 995, 999, 1000, 1001, 1005, 1013, 1014}
    assert ua.before_after(days, paid, today_ord=1013) is None     # 13 days in
    assert ua.before_after(days, paid, today_ord=1014) == (3, 4)    # 1014 is outside the span


def test_pct_median_mean_handle_empty():
    assert ua.pct(1, 0) == 0.0
    assert ua.median([]) == 0.0 and ua.mean([]) == 0.0
    assert ua.median([1, 2, 10]) == 2.0
