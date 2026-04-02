import logging

from db.connection import get_db
from scrapers.base_scraper import BaseScraper
from config import AMARSTOCK_BASE_URL

logger = logging.getLogger(__name__)


def _find_sum(items, report_type, *component_groups):
    """
    Sum multiple balance-sheet line items. Each element of component_groups
    is a tuple of label substrings for one component (passed to _find).
    Returns the sum of all found components, or None if none are found.
    """
    total = None
    for substrings in component_groups:
        val = _find(items, report_type, *substrings)
        if val is not None:
            total = (total or 0.0) + val
    return total


def _find(items, report_type, *substrings):
    """
    Return the value (l) of the first item in report_type whose k contains
    ANY of the given substrings (case-insensitive). Multiple substrings handle
    naming variations across companies on amarstock.
    """
    subs = [s.lower() for s in substrings]
    for item in items:
        if item.get("r") != report_type:
            continue
        k = (item.get("k") or "").lower()
        if any(sub in k for sub in subs):
            val = item.get("l")
            if val is not None:
                return float(val)
    return None


def _find_total_debt(yr, report_type="balance-sheet"):
    """
    Interest-bearing debt for D/E: prefer one aggregate line; otherwise sum
    typical split lines (long/short term, lease, bonds). Omits trade payables.
    """
    agg = _find(yr, report_type,
                "total borrowings",
                "loans and borrowings",
                "loans & borrowings",
                "total debt",
                "total interest-bearing",
                "interest bearing borrowings",
                "interest-bearing borrowings",
                "borrowings (net)",
                "net borrowings",
                "total loans",
                # DSE issuers often label ST borrowings / overdraft lines this way
                # (e.g. JAMUNAOIL: "Other Financial Facility")
                "financial facility",
                "credit facility",
                "borrowings")
    if agg is not None:
        return agg

    return _find_sum(yr, report_type,
                     ("long term borrowings", "long-term borrowings",
                      "long term loan", "long-term loan",
                      "non-current borrowings", "non current borrowings",
                      "term loan", "term loans"),
                     ("short term borrowings", "short-term borrowings",
                      "short term loan", "short-term loan",
                      "current borrowings", "current portion of borrowings",
                      "financial facility", "credit facility",
                      "bank overdraft", "overdraft"),
                     ("current portion of long", "current maturity of long",
                      "maturity of long-term", "portion of long-term debt"),
                     ("lease liabilit", "lease liability", "right-of-use lease"),
                     ("sukuk", "bonds payable", "debenture", "medium term note"))


class CashFlowScraper(BaseScraper):
    def __init__(self):
        super().__init__()
        self.db = get_db()
        self.session.headers.update({"Accept": "application/json"})

    def scrape_one(self, trading_code: str) -> int:
        """Scrape financials for one company. Returns number of year-records saved."""
        resp = self.fetch(AMARSTOCK_BASE_URL, params={"symbol": trading_code})
        if resp is None:
            return 0
        try:
            data = resp.json()
        except Exception:
            logger.warning("Non-JSON response for %s", trading_code)
            return 0

        if not isinstance(data, list) or not data:
            logger.debug("Empty/invalid data for %s", trading_code)
            return 0

        years = sorted({item["y"] for item in data if "y" in item})
        saved = 0
        for year in years:
            yr = [item for item in data if item.get("y") == year]

            # ---- Cash Flow Statement ----
            operating_cf = _find(yr, "cash-flow-statement",
                "net cash generated from operating activities",
                "net cash from operating activities",
                "cash generated from operating",
                "operating activities")

            investing_cf = _find(yr, "cash-flow-statement",
                "net cash used in investing activities",
                "net cash from investing activities",
                "investing activities")

            capex = _find(yr, "cash-flow-statement",
                "acquisition of property, plant and equipment",
                "purchase of property, plant",
                "capital expenditure",
                "capex")

            # Interest paid — used as proxy for interest expense in coverage ratio
            interest_paid = _find(yr, "cash-flow-statement",
                "interest paid",
                "finance cost",
                "financial cost",
                "interest expense")

            nocfps = _find(yr, "cash-flow-statement",
                "net operating cash flow per share",
                "operating cash flow per share")

            # ---- Income Statement ----
            net_profit = _find(yr, "income-statement",
                "profit after tax",
                "net profit after tax",
                "net profit/(loss) after tax",
                "profit for the year")

            ebit = _find(yr, "income-statement",
                "operating profit",
                "profit from operations",
                "operating profit/(loss)",
                "income from operation",
                "ebit")

            revenue = _find(yr, "income-statement",
                "revenue/ sales/ turnover",
                "net sales revenue",
                "net revenue",
                "turnover",
                "revenue",
                "sales")

            # Interest expense from income statement (fallback from cash flow)
            interest_expense_is = _find(yr, "income-statement",
                "financial expense",
                "finance expense",
                "interest expense",
                "finance charges")

            # ---- Income Statement (additional) ----
            gross_profit = _find(yr, "income-statement",
                "gross profit",
                "gross income",
                "net revenue after cost")

            net_interest_income = _find(yr, "income-statement",
                "net interest income",
                "interest income net",
                "net interest and similar income",
                "net interest")

            interest_income = _find(yr, "income-statement",
                "interest income",
                "interest earned",
                "interest and similar income",
                "income from interest")

            # ---- Balance Sheet ----
            total_equity = _find(yr, "balance-sheet",
                "total shareholders' equity",
                "total shareholders equity",
                "shareholders' equity",
                "total equity")

            total_assets = _find(yr, "balance-sheet",
                "total assets",
                "total asset")

            intangibles = _find(yr, "balance-sheet",
                "intangible assets",
                "intangibles",
                "goodwill")

            cash_and_equivalents = _find(yr, "balance-sheet",
                "cash and cash equivalents",
                "cash & cash equivalents",
                "cash in hand and at bank",
                "cash in hand",
                "cash at bank")

            total_debt = _find_total_debt(yr)

            # Loans total is reported as three sub-rows; sum them to avoid
            # matching the ambiguous "Total" label that also appears for
            # total assets, total deposits, etc.
            earning_assets = _find_sum(yr, "balance-sheet",
                # Loans & Advances — main/corporate book
                ("loans, cash credits", "loans and advances", "loans & advances",
                 "general investments"),
                # Loans & Advances — SME book
                ("small and medium enterprise",),
                # Loans & Advances — bills
                ("bills discounted", "bills purchased"),
                # Government Securities (Amarstock label: "Government")
                ("government securities", "govt. securities", "investment in government",
                 "government"),
                # Other Securities (Amarstock label: "Others" under investments)
                ("other securities", "other investments", "investment in other securities",
                 "others"),
                # Money at call and short notice
                ("money at call", "call money"),
                # Balance with other banks & FIs
                ("balance with other banks", "balance with banks and",
                 "balance with other banks & fi", "balance with other banks and fi"),
            )

            # Use income statement interest expense if available, else cash flow proxy
            interest_expense = interest_expense_is or interest_paid

            doc = {
                "trading_code":           trading_code,
                "year":                   year,
                # Cash flow
                "operating_cf":           operating_cf,
                "investing_cf":           investing_cf,
                "capex":                  capex,
                "nocfps":                 nocfps,
                # Income statement
                "net_profit":             net_profit,
                "ebit":                   ebit,
                "revenue":                revenue,
                "interest_expense":       interest_expense,
                "gross_profit":           gross_profit,
                "net_interest_income":    net_interest_income,
                "interest_income":        interest_income,
                # Balance sheet
                "total_equity":           total_equity,
                "total_assets":           total_assets,
                "intangibles":            intangibles,
                "cash_and_equivalents":   cash_and_equivalents,
                "total_debt":             total_debt,
                "earning_assets":         earning_assets,
            }
            self.db.company_financials_ext.update_one(
                {"trading_code": trading_code, "year": year},
                {"$set": doc},
                upsert=True,
            )
            saved += 1

        return saved

    def run(self, codes=None):
        """Scrape all (or given) companies. Returns total year-records saved."""
        if codes is None:
            codes = [
                d["trading_code"]
                for d in self.db.companies.find(
                    {"excluded": {"$ne": True}}, {"trading_code": 1, "_id": 0}
                )
            ]

        total = 0
        for i, code in enumerate(codes, 1):
            logger.info("[%d/%d] Scraping cash flow: %s", i, len(codes), code)
            saved = self.scrape_one(code)
            total += saved
            if saved == 0:
                logger.debug("No data returned for %s", code)

        logger.info("Cash flow scrape complete. %d year-records saved.", total)
        return total
