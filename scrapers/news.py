import re
import logging
from datetime import datetime, timedelta, timezone

from scrapers.base_scraper import BaseScraper
from db.connection import get_db
from config import DSE_NEWS_URL, NEWS_LOOKBACK_DAYS

_PCT_RE = re.compile(r"(\d+(?:\.\d+)?)%")
_DATE_FORMATS = [
    "%Y-%m-%d", "%d.%m.%Y", "%B %d, %Y", "%d/%m/%Y", "%d-%b-%Y", "%d %b %Y", "%d %B %Y",
    "%d-%m-%Y", "%B %d %Y", "%d %B, %Y", "%b %d, %Y", "%b %d %Y",
]

# --- Corporate-action fields parsed out of a DSE news body ---------------
# Labels are matched loosely, then a date-shaped token is picked out of the
# text that follows. Delimiter-based capture breaks on "December 15, 2025",
# where the comma inside the date looks like the end of the field.
_DATE_TOKEN_RE = re.compile(
    r"\d{1,2}[./-]\d{1,2}[./-]\d{2,4}"                          # 13.05.2026, 9-4-2026
    r"|[A-Z][a-z]{2,8}\s+\d{1,2}(?:st|nd|rd|th)?\s*,?\s*\d{4}"  # December 15, 2025
    r"|\d{1,2}(?:st|nd|rd|th)?\s+[A-Z][a-z]{2,8}\s*,?\s*\d{4}"  # 24th August 2026
)
_ORDINAL_RE = re.compile(r"(?<=\d)(?:st|nd|rd|th)\b", re.IGNORECASE)
_RECORD_LABEL_RE = re.compile(r"Record\s+Date", re.IGNORECASE)
_AGM_LABEL_RE = re.compile(r"(?:Date\s+of\s+(?:the\s+)?AGM|AGM\s+Date)", re.IGNORECASE)
_PERIOD_END_LABEL_RE = re.compile(
    r"(?:year|period|quarter|half[-\s]year)\s+end(?:ed|ing)(?:\s+on)?", re.IGNORECASE
)
_NO_DIVIDEND_RE = re.compile(r"no\s+(?:cash\s+)?dividend", re.IGNORECASE)
# DSE posts follow-ups under the same "Dividend Declaration" title on the same day
# — "(Additional Information)", "(Correction of Record Date)", "(Reason for
# deviation in NOCFPS)". Those bodies carry no dividend figure, so writing them as
# declarations would overwrite the real one with 0%. Titles that merely *add*
# something ("and Others", "and holding EGM") are still real declarations.
_SUPPLEMENTARY_TITLE_RE = re.compile(
    r"\(|additional\s+information|correction|revised|clarification|reason\s+for\s+deviation",
    re.IGNORECASE,
)
_AMENDMENT_BODY_RE = re.compile(
    r"^\s*(?:refer(?:ring)?\s+to|with\s+reference\s+to)", re.IGNORECASE
)
# Both orderings occur: "175% Cash Dividend" and "Cash Dividend of 475%".
_CASH_RES = (
    re.compile(r"(\d+(?:\.\d+)?)\s*%\s*(?:final\s+|interim\s+)?cash", re.IGNORECASE),
    re.compile(r"cash\s+dividend\s*(?:of|@|:|at)?\s*(\d+(?:\.\d+)?)\s*%", re.IGNORECASE),
)
_STOCK_RES = (
    re.compile(r"(\d+(?:\.\d+)?)\s*%\s*(?:stock|bonus)", re.IGNORECASE),
    re.compile(r"(?:stock|bonus)\s+(?:dividend|share)s?\s*(?:of|@|:|at)?\s*(\d+(?:\.\d+)?)\s*%", re.IGNORECASE),
)

logger = logging.getLogger(__name__)


def _parse_post_date(raw: str):
    """Parse a DSE news post-date cell. Tries multiple formats; returns None on failure."""
    if not raw:
        return None
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(raw, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _parse_date_token(raw: str):
    """Parse one date-shaped token (13.05.2026 / December 15, 2025 / 24th Aug 2026)."""
    raw = _ORDINAL_RE.sub("", " ".join(raw.split()).strip().rstrip(".,;"))
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(raw, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _parse_labelled_date(text: str, label_re: re.Pattern):
    """Find `label_re` in the body, then the first date-shaped token after it.

    Only looks 48 chars past the label so a missing value can't silently pick up
    an unrelated date from later in the sentence.
    """
    if not text:
        return None
    m = label_re.search(text)
    if not m:
        return None
    window = text[m.end(): m.end() + 48]
    token = _DATE_TOKEN_RE.search(window)
    return _parse_date_token(token.group(0)) if token else None


def _first_pct(text: str, patterns) -> float | None:
    """Earliest-in-string match across `patterns`, so a headline figure beats a
    parenthetical one ("40% Final Cash Dividend (including 18% interim ...)")."""
    best_pos = None
    best_val = None
    for pat in patterns:
        m = pat.search(text)
        if m and (best_pos is None or m.start() < best_pos):
            best_pos = m.start()
            try:
                best_val = float(m.group(1))
            except (TypeError, ValueError):
                continue
    return best_val


def parse_dividend_parts(body: str) -> tuple[float, float]:
    """Split a declaration body into (cash %, stock/bonus %) of face value.

    "No dividend" is a real answer (0, 0), not missing data. A bare percentage
    with no cash/stock wording is read as cash — the old single-figure behaviour.
    """
    if not body:
        return 0.0, 0.0

    cash = _first_pct(body, _CASH_RES)
    stock = _first_pct(body, _STOCK_RES)

    if _NO_DIVIDEND_RE.search(body):
        # A plain "No Dividend" is (0, 0). "No cash dividend but 10% stock"
        # still declares a bonus, so keep the stock leg rather than zeroing both.
        return 0.0, stock or 0.0

    if cash is None and stock is None:
        m = _PCT_RE.search(body)
        cash = float(m.group(1)) if m else 0.0

    return cash or 0.0, stock or 0.0


def is_declaration_news(item: dict) -> bool:
    """True for news that *is* a dividend declaration (not a follow-up notice)."""
    title = item.get("title") or ""
    if "Dividend Declaration" not in title:
        return False
    if _SUPPLEMENTARY_TITLE_RE.search(title):
        return False
    return not _AMENDMENT_BODY_RE.match(item.get("body") or "")


def build_declaration_doc(item: dict) -> dict:
    """Turn one "Dividend Declaration" news item into a declaration document."""
    title = item["title"]
    body = item.get("body") or ""
    cash_pct, stock_pct = parse_dividend_parts(body)

    return {
        "trading_code": item["trading_code"],
        "declaration_date": item["post_date"],
        # dividend_pct stays the *cash* figure — every downstream yield
        # calculation treats it as cash per Tk 100 of face value.
        "dividend_pct": cash_pct,
        "cash_pct": cash_pct,
        "stock_pct": stock_pct,
        "record_date": _parse_labelled_date(body, _RECORD_LABEL_RE),
        "agm_date": _parse_labelled_date(body, _AGM_LABEL_RE),
        "period_end": _parse_labelled_date(body, _PERIOD_END_LABEL_RE),
        "dividend_type": "Interim" if "Interim" in title else "Final",
        "title": title,
        "scraped_at": item["scraped_at"],
    }


def save_declaration(db, doc: dict) -> bool:
    """Upsert one declaration, keyed on (trading_code, declaration_date).

    Merges rather than replaces: DSE sometimes posts the same declaration twice on
    one day (a whitespace-different title, a fuller body), and a later re-scrape of
    a truncated "(cont.)" body must not blank out a date or percentage we already
    have. Returns True when a new declaration was inserted.
    """
    key = {"trading_code": doc["trading_code"], "declaration_date": doc["declaration_date"]}
    existing = db.dividend_declarations.find_one(key)

    payload = {k: v for k, v in doc.items() if v is not None}
    if existing:
        # Never let a 0% re-parse overwrite a figure we already extracted.
        for pct_field in ("dividend_pct", "cash_pct", "stock_pct"):
            if not payload.get(pct_field) and existing.get(pct_field):
                payload.pop(pct_field, None)

    db.dividend_declarations.update_one(key, {"$set": payload}, upsert=True)
    logger.info(
        "%s: %s %s declaration (cash %s%%, stock %s%%, record %s, agm %s)",
        doc["trading_code"], "updated" if existing else "saved", doc["dividend_type"],
        doc["cash_pct"], doc["stock_pct"],
        doc["record_date"].date() if doc["record_date"] else "—",
        doc["agm_date"].date() if doc["agm_date"] else "—",
    )
    return existing is None


def apply_declaration_amendment(db, item: dict) -> bool:
    """Fold a follow-up notice's corrected dates into the declaration it refers to.

    Follow-ups ("Correction of Record Date", "Refer to the earlier news ...") carry
    no dividend figure, so they must not become declarations of their own — but a
    corrected record/AGM date is exactly what a calendar user needs. Applied to the
    company's most recent declaration on or before the notice date. Returns True if
    something was changed.
    """
    body = item.get("body") or ""
    updates = {}
    for field, label in (("record_date", _RECORD_LABEL_RE), ("agm_date", _AGM_LABEL_RE)):
        parsed = _parse_labelled_date(body, label)
        if parsed is not None:
            updates[field] = parsed
    if not updates:
        return False

    target = db.dividend_declarations.find_one(
        {
            "trading_code": item["trading_code"],
            "declaration_date": {"$lte": item["post_date"]},
        },
        sort=[("declaration_date", -1)],
    )
    if not target:
        return False

    changed = {k: v for k, v in updates.items() if target.get(k) != v}
    if not changed:
        return False

    updates["amended_at"] = item["post_date"]
    updates["amendment_title"] = item["title"]
    db.dividend_declarations.update_one({"_id": target["_id"]}, {"$set": updates})
    logger.info(
        "%s: amended declaration of %s — %s",
        item["trading_code"], target["declaration_date"].date(),
        ", ".join(f"{k}={v.date()}" for k, v in changed.items()),
    )
    return True


class NewsScraper(BaseScraper):

    def scrape_company(self, trading_code: str, cutoff: datetime) -> list[dict]:
        """Fetch and parse all news for one company, filtering to within the cutoff date."""
        soup = self.fetch_soup(DSE_NEWS_URL, params={
            "inst": trading_code,
            "criteria": "3",
            "archive": "news",
        })
        if soup is None:
            logger.error("Failed to fetch news for %s", trading_code)
            return []

        return self._parse_news_tables(soup, trading_code, cutoff)

    def _parse_news_tables(self, soup, trading_code: str, cutoff: datetime) -> list[dict]:
        items = []
        now = datetime.now(tz=timezone.utc)

        tables = soup.find_all("table", class_="table-news")
        if not tables:
            logger.warning("%s: no table.table-news found", trading_code)
            tables = [
                t for t in soup.find_all("table")
                if t.find(string=lambda s: s and "News Title" in s)
            ]

        for table in tables:
            rows = table.find_all("tr")
            title = None
            body = None
            post_date = None

            for row in rows:
                th = row.find("th")
                td = row.find("td")
                if not th or not td:
                    continue

                header = th.get_text(strip=True)

                if "News Title" in header:
                    # Flush previous item before starting a new one
                    if title and post_date and post_date >= cutoff:
                        items.append({
                            "trading_code": trading_code,
                            "title": title,
                            "body": body or "",
                            "post_date": post_date,
                            "scraped_at": now,
                        })
                    raw_title = td.get_text(separator=" ", strip=True)
                    # Collapse internal whitespace so the unique index
                    # (trading_code, post_date, title) doesn't dup on
                    # cosmetic HTML changes.
                    title = " ".join(raw_title.split()) if raw_title else None
                    body = None
                    post_date = None
                elif "News" in header and "Title" not in header:
                    body = td.get_text(separator="\n", strip=True)
                elif "Post Date" in header or "Date" in header:
                    raw = td.get_text(strip=True)
                    post_date = _parse_post_date(raw)
                    if post_date is None:
                        logger.warning(
                            "%s: could not parse date %r", trading_code, raw
                        )

            # Flush the last item
            if title and post_date and post_date >= cutoff:
                items.append({
                    "trading_code": trading_code,
                    "title": title,
                    "body": body or "",
                    "post_date": post_date,
                    "scraped_at": now,
                })

        return items

    def save(self, news_items: list[dict], cutoff: datetime) -> int:
        """Upsert news items and remove stale records older than cutoff."""
        if not news_items:
            return 0

        db = get_db()
        upserted = 0

        for item in news_items:
            result = db.company_news.update_one(
                {
                    "trading_code": item["trading_code"],
                    "post_date": item["post_date"],
                    "title": item["title"],
                },
                {"$set": item},
                upsert=True,
            )
            if result.upserted_id:
                upserted += 1

        # Purge anything older than the lookback window
        codes = list({item["trading_code"] for item in news_items})
        db.company_news.delete_many({
            "trading_code": {"$in": codes},
            "post_date": {"$lt": cutoff},
        })

        # Extract dividend declarations into separate collection
        self._save_dividend_declarations(db, news_items)

        return upserted

    @staticmethod
    def _parse_record_date(text: str):
        """Record date out of a news body (kept as a method for callers/tests)."""
        return _parse_labelled_date(text, _RECORD_LABEL_RE)

    @staticmethod
    def _parse_dividend_pct(body: str) -> float:
        """Cash dividend percentage from body text. Returns 0 for 'No Dividend'."""
        return parse_dividend_parts(body)[0]

    def _save_dividend_declarations(self, db, news_items: list[dict]):
        """Upsert dividend declarations — one doc per (company, declaration date).

        Every declaration is kept, not just the latest, so interim + final + prior
        years build a real dividend history. Declarations are never purged with the
        news lookback window: the news item expires, the corporate action doesn't.
        """
        candidates = [
            item for item in news_items
            if "Dividend Declaration" in item.get("title", "")
        ]
        if not candidates:
            return

        for item in candidates:
            if is_declaration_news(item):
                save_declaration(db, build_declaration_doc(item))
            else:
                apply_declaration_amendment(db, item)

    def run(self, trading_codes: list[str]) -> int:
        """Scrape and save news for all given trading codes."""
        cutoff = datetime.now(tz=timezone.utc) - timedelta(days=NEWS_LOOKBACK_DAYS)
        total_saved = 0
        total_codes = len(trading_codes)

        for i, code in enumerate(trading_codes, 1):
            logger.info("[%d/%d] Scraping news for %s", i, total_codes, code)
            try:
                items = self.scrape_company(code, cutoff)
                saved = self.save(items, cutoff)
                logger.info("[%d/%d] %s: %d new items", i, total_codes, code, saved)
                total_saved += saved
            except Exception:
                logger.exception("Error scraping news for %s", code)
                continue

        return total_saved
