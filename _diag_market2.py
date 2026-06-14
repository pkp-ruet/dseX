"""Diagnostic 2: label the two index panels on the DSE homepage + dump recent DB docs."""
import warnings, requests
from bs4 import BeautifulSoup
warnings.filterwarnings("ignore")
from config import DSE_BASE_URL, USER_AGENTS

resp = requests.get(DSE_BASE_URL, headers={"User-Agent": USER_AGENTS[0]}, timeout=30, verify=False)
soup = BeautifulSoup(resp.content, "lxml")

# Find headings/labels that precede each midrow group to understand the two panels
midrows = soup.find_all("div", class_="midrow")
first = midrows[0]
seventh = midrows[7]

def ancestors_text(el, levels=4):
    out = []
    p = el
    for _ in range(levels):
        p = p.parent
        if p is None: break
        # grab any heading-ish text in this container before the midrows
        h = p.find(["h1","h2","h3","h4","h5","span","b","strong","a"])
        out.append((p.name, p.get('class'), (h.get_text(' ', strip=True)[:60] if h else None)))
    return out

print("=== Panel A (midrow[0]) ancestry ===")
for a in ancestors_text(first): print("   ", a)
print("=== Panel B (midrow[7]) ancestry ===")
for a in ancestors_text(seventh): print("   ", a)

# Look for any text node near the blocks that says 'last update' / date / time
import re
text = soup.get_text(" ", strip=True)
for kw in ["Last Update", "Update", "Market Open", "Market Close", "Last Trading", "Updated"]:
    idx = text.lower().find(kw.lower())
    if idx != -1:
        print(f"\n[page text @ {kw!r}]:", text[max(0,idx-20):idx+80])

print("\n\n=== Recent dse_market_summary docs in DB ===")
try:
    from db.connection import get_db
    db = get_db()
    docs = list(db.dse_market_summary.find({}, {"_id":0}).sort("date",-1).limit(8))
    for d in docs:
        print(f"{d.get('date')}: dsex={d.get('dsex')} chg={d.get('dsex_change')} "
              f"pct={d.get('dsex_change_pct')} vol={d.get('total_volume')} "
              f"val={d.get('total_value_mn')} trades={d.get('total_trades')} "
              f"scraped_at={d.get('scraped_at')}")
except Exception as e:
    print("DB query failed:", repr(e))
