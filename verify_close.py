"""Verify the daily DSE close update landed in the database.

Run after `scrape-market-summary` / `scrape-prices` to confirm today's close
data is present and fresh. Read-only — safe to run anytime.

    python verify_close.py
"""
from datetime import datetime
from db.connection import get_db
from utils.market_hours import bst_today_iso

today = bst_today_iso()
db = get_db()
print(f"BST today = {today}\n")

# ---- dse_market_summary  (scrape-market-summary) ----
print("=== dse_market_summary (latest 5) ===")
docs = list(db.dse_market_summary.find({}, {"_id": 0}).sort("date", -1).limit(5))
for d in docs:
    mark = "   <-- TODAY" if d.get("date") == today else ""
    age = ""
    sa = d.get("scraped_at")
    if isinstance(sa, datetime):
        age = f"  (scraped {(datetime.utcnow() - sa).total_seconds() / 60:.0f} min ago, UTC)"
    print(f"{d.get('date')}  DSEX={d.get('dsex')} chg={d.get('dsex_change')} "
          f"pct={d.get('dsex_change_pct')}  vol={d.get('total_volume')} "
          f"val_mn={d.get('total_value_mn')} trades={d.get('total_trades')}{age}{mark}")
if not any(d.get("date") == today for d in docs):
    print(f"  !! No dse_market_summary row for {today} — market-summary did NOT write today.")

# ---- stock_prices  (scrape-prices) ----
print("\n=== stock_prices ===")
latest = db.stock_prices.find_one({}, {"_id": 0, "date": 1}, sort=[("date", -1)])
print(f"latest date in collection: {latest['date'] if latest else None}")
today_count = db.stock_prices.count_documents({"date": today})
print(f"rows for {today}: {today_count}")
if today_count == 0:
    print(f"  (no stock_prices for {today} — only run if you scraped prices too)")
else:
    null_close = db.stock_prices.count_documents({"date": today, "close_price": None})
    print(f"  null close_price among them: {null_close}")
    for s in db.stock_prices.find({"date": today},
                                  {"_id": 0, "trading_code": 1, "close_price": 1, "change_pct": 1}).limit(3):
        print(f"   {s['trading_code']}: close={s.get('close_price')} chg%={s.get('change_pct')}")
