import re
import logging
from scrapers.base_scraper import BaseScraper
from db.connection import get_db
from config import DSE_COMPANY_DETAILS_URL
from utils.parser_helpers import clean_numeric, clean_text, parse_dividend_string, parse_dividend_cell
from utils.sector import normalize_sector

logger = logging.getLogger(__name__)


class CompanyDetailsScraper(BaseScraper):

    def scrape_company(self, trading_code):
        """Scrape all details for a single company from its displayCompany page."""
        soup = self.fetch_soup(DSE_COMPANY_DETAILS_URL, params={"name": trading_code})
        if soup is None:
            logger.error("Failed to fetch details for %s", trading_code)
            return None

        result = {
            "basic_info": self._parse_basic_info(soup, trading_code),
            "financials": self._parse_financials(soup, trading_code),
            "shareholdings": self._parse_shareholdings(soup, trading_code),
        }
        return result

    # ------------------------------------------------------------------
    # Basic info: capital, face value, sector, listing year, dividends
    # ------------------------------------------------------------------

    def _parse_basic_info(self, soup, trading_code):
        info = {"trading_code": trading_code}

        field_map = {
            "Authorized Capital (mn)": "authorized_capital_mn",
            "Paid-up Capital (mn)": "paid_up_capital_mn",
            "Face/par Value": "face_value",
            "Total No. of Outstanding Securities": "total_shares",
            "Sector": "sector",
            "Market Lot": "market_lot",
            "Type of Instrument": "instrument_type",
            "Listing Year": "listing_year",
            "Market Category": "market_category",
            "Reserve & Surplus without OCI (mn)": "reserve_surplus_mn",
            "Short-term loan (mn)": "short_term_loan_mn",
            "Long-term loan (mn)": "long_term_loan_mn",
        }

        for table in soup.find_all("table", id="company"):
            for row in table.find_all("tr"):
                cells = row.find_all(["th", "td"])
                # Iterate consecutive pairs; step-1 handles rows with leading empty cells
                for i in range(len(cells) - 1):
                    header = clean_text(cells[i].get_text())
                    value = clean_text(cells[i + 1].get_text())
                    if header is None:
                        continue
                    for pattern, key in field_map.items():
                        if pattern in header:
                            if key in ("sector", "instrument_type", "market_category"):
                                info[key] = value
                            else:
                                info[key] = clean_numeric(value)
                            break

        # Computed: total loan = short-term + long-term
        st = info.get("short_term_loan_mn") or 0
        lt = info.get("long_term_loan_mn") or 0
        info["total_loan_mn"] = st + lt

        # Normalized sector classification
        info["sector_class"] = normalize_sector(info.get("sector") or "")

        # Dividends from the dedicated row
        cash_div, stock_div = self._parse_dividend_rows(soup)
        info["cash_dividends"] = cash_div
        info["stock_dividends"] = stock_div

        return info

    def _parse_dividend_rows(self, soup):
        cash_dividends = []
        stock_dividends = []

        for table in soup.find_all("table", id="company"):
            for row in table.find_all("tr"):
                cells = row.find_all(["th", "td"])
                if len(cells) < 2:
                    continue
                header = clean_text(cells[0].get_text())
                if header and "Cash Dividend" in header:
                    cash_dividends = parse_dividend_string(cells[1].get_text())
                elif header and "Bonus Issue" in header:
                    stock_dividends = parse_dividend_string(cells[1].get_text())

        return cash_dividends, stock_dividends

    # ------------------------------------------------------------------
    # Audited financials: EPS, NAV, profit, P/E, dividends by year
    # ------------------------------------------------------------------

    def _parse_financials(self, soup, trading_code):
        """Parse both the audited financial table and the continued (P/E + dividend) table."""
        records = {}  # year -> dict

        self._parse_audited_table(soup, records)
        self._parse_continued_table(soup, records)

        financials = []
        for year, data in records.items():
            data["trading_code"] = trading_code
            data["year"] = year
            financials.append(data)

        return financials

    def _parse_audited_table(self, soup, records):
        """
        Parse 'Financial Performance as per Audited Financial Statements' table.
        Columns (after 3 header rows):
          Year | EPS Basic Orig | EPS Basic Restated | EPS Diluted |
          EPS Cont Basic Orig | EPS Cont Basic Restated | EPS Cont Diluted |
          NAV Orig | NAV Restated | NAV Diluted |
          PCO | Profit(mn) | TCI(mn)
        """
        heading = soup.find("h2", string=re.compile(r"Financial Performance as per Audited"))
        if not heading:
            return

        table = heading.find_next("table")
        if not table:
            return

        data_rows = [
            row for row in table.find_all("tr")
            if "header" not in " ".join(row.get("class", []))
        ]

        for row in data_rows:
            cells = row.find_all("td")
            if len(cells) < 10:
                continue

            year_text = clean_text(cells[0].get_text())
            if not year_text:
                year_text = clean_text(cells[1].get_text()) if len(cells) > 1 else None
            year = clean_numeric(year_text)
            if not year or not isinstance(year, int) or year < 1900:
                continue

            # The first cell may be colspan=2 (year), so we need to figure
            # out the offset. If first cell has colspan, data starts at index 1.
            colspan = cells[0].get("colspan")
            offset = 1 if colspan and int(colspan) >= 2 else 2

            vals = []
            for c in cells[offset:]:
                vals.append(clean_numeric(c.get_text(strip=True)))

            rec = records.setdefault(year, {})
            # vals layout: EPS Basic Orig, EPS Basic Restated, EPS Diluted,
            #   EPS Cont Orig, EPS Cont Restated, EPS Cont Diluted,
            #   NAV Orig, NAV Restated, NAV Diluted,
            #   PCO, Profit(mn), TCI(mn)
            if len(vals) >= 3:
                rec["eps_basic"] = vals[0] or vals[1]  # orig or restated
            if len(vals) >= 3:
                rec["eps_diluted"] = vals[2]
            if len(vals) >= 6:
                rec["eps_cont_basic"] = vals[3] or vals[4]
                rec["eps_cont_diluted"] = vals[5]
            if len(vals) >= 9:
                rec["nav_per_share"] = vals[6] or vals[7]
            if len(vals) >= 12:
                rec["profit_cont_ops_mn"] = vals[9]
                rec["profit_mn"] = vals[10]
                rec["total_comprehensive_income_mn"] = vals[11]

    def _parse_continued_table(self, soup, records):
        """
        Parse 'Financial Performance... (Continued)' table.
        Columns (after 4 header rows):
          Year | PE Orig | PE Restated | PE Diluted |
          PE Cont Orig | PE Cont Restated | PE Cont Diluted |
          Dividend % | Dividend Yield %
        """
        heading = soup.find("h2", string=re.compile(r"Financial Performance.*Continued"))
        if not heading:
            return

        table = heading.find_next("table")
        if not table:
            return

        data_rows = [
            row for row in table.find_all("tr")
            if "header" not in " ".join(row.get("class", []))
        ]

        for row in data_rows:
            cells = row.find_all("td")
            if len(cells) < 6:
                continue

            year_text = clean_text(cells[0].get_text())
            if not year_text:
                year_text = clean_text(cells[1].get_text()) if len(cells) > 1 else None
            year = clean_numeric(year_text)
            if not year or not isinstance(year, int) or year < 1900:
                continue

            colspan = cells[0].get("colspan")
            offset = 1 if colspan and int(colspan) >= 2 else 2

            vals = []
            for c in cells[offset:]:
                vals.append(clean_numeric(c.get_text(strip=True)))

            rec = records.setdefault(year, {})
            # vals: PE Orig, PE Restated, PE Diluted,
            #   PE Cont Orig, PE Cont Restated, PE Cont Diluted,
            #   Dividend%, Dividend Yield%
            if len(vals) >= 6:
                rec["pe_ratio_basic"] = vals[0] or vals[1] or vals[3] or vals[4]
                rec["pe_ratio_diluted"] = vals[2] or vals[5]
            if len(vals) >= 7:
                # Dividend cell may contain mixed values like "600.00, 200%B"
                div_cell = cells[offset + 6].get_text(strip=True) if len(cells) > offset + 6 else None
                cash, stock = parse_dividend_cell(div_cell)
                rec["cash_dividend_pct"] = cash
                rec["stock_dividend_pct"] = stock
            if len(vals) >= 8:
                rec["dividend_yield_pct"] = vals[7]

    # ------------------------------------------------------------------
    # Shareholding percentages
    # ------------------------------------------------------------------

    def _parse_shareholdings(self, soup, trading_code):
        shareholdings = []

        for table in soup.find_all("table", id="company"):
            for row in table.find_all("tr"):
                cells = row.find_all(["th", "td"])
                if len(cells) < 2:
                    continue
                header_text = clean_text(cells[0].get_text())
                if not header_text or "Share Holding Percentage" not in header_text:
                    continue

                # Extract the date from the header, e.g.
                # "Share Holding Percentage [as on Dec 31, 2024 (year ended)]"
                date_match = re.search(
                    r"as on\s+(.+?)(?:\s*\(|])", header_text
                )
                as_of_date = date_match.group(1).strip() if date_match else None

                reporting_period = None
                period_match = re.search(r"\(([^)]+)\)", header_text)
                if period_match:
                    reporting_period = period_match.group(1).strip()

                inner_table = cells[1].find("table")
                if not inner_table:
                    continue

                inner_cells = inner_table.find_all("td")
                holding = {
                    "trading_code": trading_code,
                    "as_of_date": as_of_date,
                    "reporting_period": reporting_period,
                    "sponsor_director_pct": None,
                    "govt_pct": None,
                    "institute_pct": None,
                    "foreign_pct": None,
                    "public_pct": None,
                }

                label_map = {
                    "Sponsor/Director": "sponsor_director_pct",
                    "Govt": "govt_pct",
                    "Institute": "institute_pct",
                    "Foreign": "foreign_pct",
                    "Public": "public_pct",
                }

                for cell in inner_cells:
                    text = cell.get_text(separator="\n").strip()
                    for label, key in label_map.items():
                        if label in text:
                            lines = text.split("\n")
                            for line in lines:
                                val = clean_numeric(line.strip())
                                if val is not None:
                                    holding[key] = val
                                    break
                            break

                shareholdings.append(holding)

        return shareholdings

    # ------------------------------------------------------------------
    # Save to MongoDB
    # ------------------------------------------------------------------

    # Keywords matched against instrument_type OR company_name to detect non-equity instruments
    _EXCLUDED_KEYWORDS = ("bond", "debenture", "sukuk", "mutual fund", "etf", "t-bond", "treasury")

    def _is_excluded_instrument(self, instrument_type: str) -> bool:
        if not instrument_type:
            return False
        it_lower = instrument_type.lower()
        return any(kw in it_lower for kw in self._EXCLUDED_KEYWORDS)

    def _is_excluded_by_name(self, company_name: str) -> bool:
        if not company_name:
            return False
        name_lower = company_name.lower()
        return any(kw in name_lower for kw in self._EXCLUDED_KEYWORDS)

    def _exclude_company(self, db, trading_code: str) -> None:
        """Mark company as excluded and purge all its data from every collection."""
        db.companies.update_one(
            {"trading_code": trading_code},
            {"$set": {"excluded": True}},
        )
        db.financials.delete_many({"trading_code": trading_code})
        db.shareholdings.delete_many({"trading_code": trading_code})
        db.stock_prices.delete_many({"trading_code": trading_code})
        logger.info("Excluded and purged data for %s", trading_code)

    def save(self, data, trading_code):
        db = get_db()

        basic = data["basic_info"]
        instrument_type = basic.get("instrument_type") or ""

        # Exclude corporate bonds, debentures, mutual funds, ETFs, etc.
        if self._is_excluded_instrument(instrument_type):
            logger.info("Skipping %s — non-equity instrument: %s", trading_code, instrument_type)
            self._exclude_company(db, trading_code)
            return

        # Exclude companies with no financial data (cannot be scored)
        if not data["financials"]:
            logger.info("Skipping %s — no financial data found", trading_code)
            self._exclude_company(db, trading_code)
            return

        db.companies.update_one(
            {"trading_code": trading_code},
            {"$set": basic},
            upsert=True,
        )

        face_value = basic.get("face_value") or 0
        for fin in data["financials"]:
            # Compute DPS from cash dividend % and face value
            cash_div_pct = fin.get("cash_dividend_pct")
            if cash_div_pct is not None and face_value:
                fin["dps"] = round(cash_div_pct / 100 * face_value, 4)
            db.financials.update_one(
                {"trading_code": fin["trading_code"], "year": fin["year"]},
                {"$set": fin},
                upsert=True,
            )

        for sh in data["shareholdings"]:
            db.shareholdings.update_one(
                {"trading_code": sh["trading_code"], "as_of_date": sh["as_of_date"]},
                {"$set": sh},
                upsert=True,
            )

    def run(self, trading_codes):
        """Scrape details for all given trading codes, skipping already-excluded companies."""
        db = get_db()

        # Auto-exclude companies whose name already signals a non-equity instrument
        name_map = {
            d["trading_code"]: d.get("company_name", "")
            for d in db.companies.find(
                {"trading_code": {"$in": list(trading_codes)}},
                {"trading_code": 1, "company_name": 1, "_id": 0},
            )
        }
        for code, name in name_map.items():
            if self._is_excluded_by_name(name):
                logger.info("Auto-excluding %s by name: %s", code, name)
                self._exclude_company(db, code)

        excluded = {
            d["trading_code"]
            for d in db.companies.find({"excluded": True}, {"trading_code": 1, "_id": 0})
        }
        codes = [c for c in trading_codes if c not in excluded]
        if len(excluded) > 0:
            logger.info("Skipping %d already-excluded companies", len(excluded))

        total = len(codes)
        for i, code in enumerate(codes, 1):
            logger.info("[%d/%d] Scraping details for %s", i, total, code)
            try:
                data = self.scrape_company(code)
                if data:
                    self.save(data, code)
                    logger.info("[%d/%d] Saved details for %s", i, total, code)
            except Exception:
                logger.exception("Error scraping %s", code)
                continue
