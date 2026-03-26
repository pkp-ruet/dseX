import os
from dotenv import load_dotenv


load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "dsex")

REQUEST_DELAY = float(os.getenv("REQUEST_DELAY", "1.5"))
REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "30"))
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "3"))

DSE_BASE_URL = "https://www.dsebd.org"
DSE_COMPANY_LIST_URL = f"{DSE_BASE_URL}/company_listing.php"
DSE_LATEST_PRICE_URL = f"{DSE_BASE_URL}/latest_share_price_scroll_l.php"
DSE_COMPANY_DETAILS_URL = f"{DSE_BASE_URL}/displayCompany.php"
DSE_NEWS_URL = f"{DSE_BASE_URL}/old_news.php"

# Amarstock — cash flow & financial statement data
AMARSTOCK_BASE_URL = "https://www.amarstock.com/company/2b5e8cfdd75f/"

# Valuation model constants
DISCOUNT_RATE = 0.12          # cost of equity: ~8% BD risk-free + 4% equity risk premium
TERMINAL_GROWTH_RATE = 0.05   # conservative long-run GDP growth proxy
DCF_YEARS = 5                 # forecast horizon for DCF

NEWS_LOOKBACK_DAYS = int(os.getenv("NEWS_LOOKBACK_DAYS", "365"))
NEWS_TOP_N = int(os.getenv("NEWS_TOP_N", "50"))

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]
