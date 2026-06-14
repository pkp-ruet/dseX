"""Throwaway diagnostic: fetch DSE homepage (TLS verify off, local only) and inspect index structure."""
import warnings, requests
from bs4 import BeautifulSoup
warnings.filterwarnings("ignore")
from config import DSE_BASE_URL, USER_AGENTS

resp = requests.get(DSE_BASE_URL, headers={"User-Agent": USER_AGENTS[0]}, timeout=30, verify=False)
print("=== HTTP", resp.status_code, "bytes:", len(resp.content))
soup = BeautifulSoup(resp.content, "lxml")

midrows = soup.find_all("div", class_="midrow")
print("=== midrow count:", len(midrows))

for i, row in enumerate(midrows[:16]):
    c1 = row.find("div", class_="m_col-1")
    c2 = row.find("div", class_="m_col-2")
    c3 = row.find("div", class_="m_col-3")
    c4 = row.find("div", class_="m_col-4")
    wid = row.find("div", class_="m_col-wid")
    wid1 = row.find("div", class_="m_col-wid1")
    wid2 = row.find("div", class_="m_col-wid2")
    print(f"[{i}] c1={(c1.get_text(strip=True) if c1 else None)!r} "
          f"c2={(c2.get_text(strip=True) if c2 else None)!r} "
          f"c3={(c3.get_text(strip=True) if c3 else None)!r} "
          f"c4={(c4.get_text(strip=True) if c4 else None)!r} "
          f"wid={(wid.get_text(strip=True) if wid else None)!r} "
          f"wid1={(wid1.get_text(strip=True) if wid1 else None)!r} "
          f"wid2={(wid2.get_text(strip=True) if wid2 else None)!r}")

print("\n=== raw child classes of first 8 midrows ===")
for i, row in enumerate(midrows[:8]):
    kids = [k.get('class') for k in row.find_all('div', recursive=False)]
    print(f"[{i}]", kids, "| text:", repr(row.get_text(' ', strip=True))[:90])

# Now run the real parser against this exact soup
from scrapers.market_summary import MarketSummaryScraper
from utils.market_hours import bst_today_iso
s = MarketSummaryScraper()
s.fetch_soup = lambda *a, **k: soup  # inject the soup we already have
print("\n=== scrape() result ===")
doc = s.scrape()
print("bst_today_iso():", bst_today_iso())
print(doc)
