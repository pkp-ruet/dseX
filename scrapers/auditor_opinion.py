"""Read the PDF behind each qualified audit opinion DSE posted and store what it
was about (2026-11-05, audit RP8 / round 3).

DSE's news post is one line ("The auditor of the company has given the
Qualified Opinion …") plus a link to the full paragraph as a PDF. We fetch the
PDF (normal, verified HTTPS — www.dsebd.org redirects to DSE's S3 bucket),
pull its text with pypdf and classify the "Basis for Qualified Opinion" with
backend.services.audit_opinion. One document per (trading_code, url) in
`auditor_opinions`:

    {trading_code, url, year, posted, title, severity, going_concern,
     reasons, minor, basis_excerpt, text_ok, fetched_at}

Read by scoring (grade cap: going concern / serious), the stock report (the
auditor red flag says what it was about, minor → amber) and nothing else.
Read-only towards DSE: one GET per new PDF, REQUEST_DELAY between them.
"""
from __future__ import annotations

import io
import logging
import re
import time
from datetime import datetime, timedelta, timezone
from typing import Optional

import requests

from config import REQUEST_DELAY, REQUEST_TIMEOUT
from db.connection import get_db

logger = logging.getLogger(__name__)

# Posts that carry an auditor's paragraph worth reading.
AUDIT_TITLE_RE = re.compile(r"qualified\s+opinion|going\s+concern|adverse\s+opinion|disclaimer\s+of\s+opinion", re.I)
_PDF_URL_RE = re.compile(r"https?://\S+?\.pdf", re.I)
_YEAR_RE = re.compile(r"year\s+ended\s+(?:on\s+)?(?:\d{1,2}\s+\w+|\w+\s+\d{1,2},?)\s+(\d{4})", re.I)
LOOKBACK_DAYS = 400
COLLECTION = "auditor_opinions"


def ensure_indexes(db=None) -> None:
    db = db or get_db()
    db[COLLECTION].create_index([("trading_code", 1), ("url", 1)], unique=True, name="code_url")
    db[COLLECTION].create_index([("posted", -1)], name="posted")


def pdf_url(body: str) -> Optional[str]:
    m = _PDF_URL_RE.search(body or "")
    return m.group(0) if m else None


def accounts_year(body: str, url: str) -> Optional[int]:
    m = _YEAR_RE.search(body or "")
    if m:
        return int(m.group(1))
    m = re.search(r"/Auditors_opinion/(\d{4})/", url or "")
    return int(m.group(1)) if m else None


def pdf_text(content: bytes) -> str:
    from pypdf import PdfReader  # scraper-only dependency (root requirements.txt)

    reader = PdfReader(io.BytesIO(content))
    return " ".join((page.extract_text() or "") for page in reader.pages)


def fetch_pdf(url: str, session: requests.Session) -> Optional[bytes]:
    try:
        r = session.get(url, timeout=REQUEST_TIMEOUT or 60, allow_redirects=True)
    except requests.RequestException as e:
        logger.warning("auditor PDF fetch failed %s: %s", url, e)
        return None
    if r.status_code != 200 or not r.content.startswith(b"%PDF"):
        logger.warning("auditor PDF not found %s (%s)", url, r.status_code)
        return None
    return r.content


def run(codes: Optional[list[str]] = None, force: bool = False, dry_run: bool = False) -> dict:
    """Fetch and classify every auditor PDF posted in the last LOOKBACK_DAYS
    that isn't stored yet (all of them with `force`). Returns counts. With
    `dry_run` nothing is written; each verdict is logged and returned."""
    from backend.services.audit_opinion import classify

    db = get_db()
    if not dry_run:
        ensure_indexes(db)
    col = db[COLLECTION]
    since = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=LOOKBACK_DAYS)
    q: dict = {"title": {"$regex": AUDIT_TITLE_RE.pattern, "$options": "i"}, "post_date": {"$gte": since}}
    if codes:
        q["trading_code"] = {"$in": [c.upper() for c in codes]}
    posts = list(db.company_news.find(q, {"_id": 0, "trading_code": 1, "title": 1, "body": 1, "post_date": 1}))
    seen = set() if force else {(d["trading_code"], d["url"]) for d in col.find({}, {"trading_code": 1, "url": 1})}

    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0 (TopStockBD auditor-opinion reader)"})
    counts = {"posts": len(posts), "fetched": 0, "stored": 0, "skipped": 0, "failed": 0,
              "serious": 0, "minor": 0, "unknown": 0, "verdicts": []}
    for post in posts:
        code, body = post["trading_code"], post.get("body") or ""
        url = pdf_url(body)
        if not url or (code, url) in seen:
            counts["skipped"] += 1
            continue
        content = fetch_pdf(url, session)
        time.sleep(REQUEST_DELAY or 1.0)
        text, ok = "", False
        if content:
            counts["fetched"] += 1
            try:
                text, ok = pdf_text(content), True
            except Exception as e:  # noqa: BLE001 — a broken PDF is "unknown", not a crash
                logger.warning("auditor PDF unreadable %s: %s", url, e)
        else:
            counts["failed"] += 1
        verdict = classify(text, post.get("title") or "")
        counts[verdict["severity"]] += 1
        if dry_run:
            counts["verdicts"].append((code, verdict["severity"], verdict["going_concern"],
                                       verdict["reasons"], verdict["minor"]))
            seen.add((code, url))
            continue
        col.update_one(
            {"trading_code": code, "url": url},
            {"$set": {"trading_code": code, "url": url, "year": accounts_year(body, url),
                      "posted": post.get("post_date"), "title": post.get("title"),
                      "text_ok": ok and len(text.strip()) > 200, "fetched_at": datetime.now(timezone.utc),
                      **verdict}},
            upsert=True,
        )
        counts["stored"] += 1
        seen.add((code, url))
    logger.info("auditor opinions: %s", counts)
    return counts
