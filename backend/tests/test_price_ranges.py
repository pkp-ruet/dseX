"""The streamed adjusted 52-week range must equal the old collect-then-adjust pass."""
import random

from backend.services.db_service import _stream_adjusted_ranges, adjust_price_rows, use_official_close


def _old(rows, acts):
    by_code = {}
    for d in rows:
        by_code.setdefault(d["trading_code"], []).append(use_official_close(dict(d)))
    out = {}
    for code, rs in by_code.items():
        vals = [r["ltp"] for r in adjust_price_rows(rs, acts.get(code, [])) if r.get("ltp")]
        if vals:
            out[code] = {"hi": max(vals), "lo": min(vals)}
    return out


def test_stream_matches_old_pass():
    rnd = random.Random(7)
    acts = {
        "GP": [{"record_date": "2026-03-10", "cash_ps": 12.5, "stock_pct": 0.0}],
        "WALTONHIL": [{"record_date": "2026-01-05", "cash_ps": 18.0, "stock_pct": 10.0},
                      {"record_date": "2026-06-20", "cash_ps": 2.0, "stock_pct": 5.0}],
        "BAD": [{"record_date": "2026-05-01", "cash_ps": 500.0, "stock_pct": 0.0}],
    }
    rows = []
    for code, base in (("GP", 300), ("WALTONHIL", 390), ("BAD", 40)):
        for i in range(1, 29):
            for day in range(1, 29, 3):
                if i > 12:
                    break
                close = round(base * rnd.uniform(0.8, 1.2), 1)
                rows.append({
                    "trading_code": code,
                    "date": f"2026-{i:02d}-{day:02d}",
                    "ltp": round(close * rnd.uniform(0.98, 1.02), 1),
                    # some rows have no official close yet / a zero close
                    "close_price": rnd.choice([close, close, close, None, 0]),
                })
    rnd.shuffle(rows)
    assert _stream_adjusted_ranges(iter(rows), acts) == _old(rows, acts)
