import re


def clean_numeric(text):
    """Parse a numeric string from DSE pages, handling commas and dashes."""
    if text is None:
        return None
    text = text.strip()
    if text in ("", "-", "--", "N/A", "n/a"):
        return None
    text = text.replace(",", "")
    try:
        if "." in text:
            return float(text)
        return int(text)
    except ValueError:
        return None


def clean_text(text):
    """Strip whitespace and normalize a string from DSE pages."""
    if text is None:
        return None
    text = re.sub(r"\s+", " ", text).strip()
    return text if text else None


def parse_percentage(text):
    """Parse a percentage value, stripping the % sign if present."""
    if text is None:
        return None
    text = text.strip().rstrip("%").strip()
    return clean_numeric(text)


def parse_dividend_cell(text):
    """
    Parse the dividend cell from the 'Continued' financial table.
    Handles formats like '275.00', '600.00, 200%B', '20%B'.
    Returns (cash_pct, stock_pct).
    """
    if text is None:
        return None, None
    text = text.strip()
    if text in ("", "-", "--"):
        return None, None

    cash_pct = None
    stock_pct = None

    parts = [p.strip() for p in text.split(",")]
    for part in parts:
        part = part.strip()
        if not part:
            continue
        if part.upper().endswith("B") or "%B" in part.upper():
            num = re.sub(r"[%Bb\s]", "", part)
            val = clean_numeric(num)
            if val is not None:
                stock_pct = (stock_pct or 0) + val
        else:
            num = re.sub(r"[%\s]", "", part)
            val = clean_numeric(num)
            if val is not None:
                cash_pct = (cash_pct or 0) + val

    return cash_pct, stock_pct


def parse_dividend_string(div_str):
    """
    Parse DSE dividend strings like '330% 2024, 125% 2023, 220% 2022'.
    Returns list of (year, percentage) tuples.
    """
    if not div_str or div_str.strip() in ("-", "--", ""):
        return []
    results = []
    entries = re.findall(r"([\d.]+)%?\s+(\d{4})", div_str)
    for pct, year in entries:
        try:
            results.append((int(year), float(pct)))
        except ValueError:
            continue
    return results


def extract_table_rows(table):
    """Extract all rows from a BeautifulSoup table element as lists of cell text."""
    rows = []
    for tr in table.find_all("tr"):
        cells = []
        for td in tr.find_all(["td", "th"]):
            cells.append(clean_text(td.get_text()))
        if cells:
            rows.append(cells)
    return rows
