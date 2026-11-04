def normalize_sector(sector: str) -> str:
    """
    Map DSE's free-text sector field to one of four canonical classes:
      BANK      — commercial banks
      NBFI      — non-bank financial institutions (DSE lists these under
                  "Financial Institutions"; also leasing / finance companies)
      INSURANCE — life & general insurers (investment-float balance sheets:
                  no borrowings/gross-profit lines, so industrial metrics
                  don't apply)
      GENERAL   — everything else (telecom, pharma, textile, etc.)

    Note: the NBFI patterns are checked before "bank" so that
    "Non-Bank Financial Institution" style labels don't match BANK first.
    """
    if not sector:
        return "GENERAL"
    s = sector.lower()
    if ("non-bank" in s or "nbfi" in s or "financial institution" in s
            or "leasing" in s or "finance" in s):
        return "NBFI"
    if "bank" in s:
        return "BANK"
    if "insurance" in s:
        return "INSURANCE"
    return "GENERAL"


# DSE sector free-text → Bengali, matched by keyword so variants resolve
# ("General Insurance" / "Life Insurance" → বিমা). First match wins. Moved here
# from the retired summaries_service (2026-11-05, audit EL11).
SECTOR_BN = [
    ("bank", "ব্যাংক"),
    ("cement", "সিমেন্ট"),
    ("ceramic", "সিরামিক"),
    ("engineering", "প্রকৌশল"),
    ("nbfi", "আর্থিক প্রতিষ্ঠান"),
    ("leasing", "আর্থিক প্রতিষ্ঠান"),
    ("financial", "আর্থিক প্রতিষ্ঠান"),
    ("food", "খাদ্য ও আনুষঙ্গিক"),
    ("fuel", "জ্বালানি ও বিদ্যুৎ"),
    ("power", "জ্বালানি ও বিদ্যুৎ"),
    ("insurance", "বিমা"),
    ("jute", "পাট"),
    ("mutual fund", "মিউচুয়াল ফান্ড"),
    ("paper", "কাগজ ও মুদ্রণ"),
    ("pharma", "ওষুধ ও রসায়ন"),
    ("chemical", "ওষুধ ও রসায়ন"),
    ("real estate", "সেবা ও আবাসন"),
    ("services", "সেবা ও আবাসন"),
    ("tannery", "চামড়া শিল্প"),
    ("leather", "চামড়া শিল্প"),
    ("telecom", "টেলিযোগাযোগ"),
    ("textile", "বস্ত্র"),
    ("travel", "ভ্রমণ ও বিনোদন"),
    ("leisure", "ভ্রমণ ও বিনোদন"),
    ("information technology", "তথ্যপ্রযুক্তি"),
    ("it sector", "তথ্যপ্রযুক্তি"),
    ("miscellaneous", "বিবিধ"),
]


def sector_bn(sector) -> str | None:
    """The sector's Bengali name, or None when no keyword matches."""
    if not sector:
        return None
    s = str(sector).lower()
    for kw, bn in SECTOR_BN:
        if kw in s:
            return bn
    return None
