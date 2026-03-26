def normalize_sector(sector: str) -> str:
    """
    Map DSE's free-text sector field to one of three canonical classes:
      BANK   — commercial banks
      NBFI   — non-bank financial institutions (leasing, finance companies)
      GENERAL — everything else (insurance, telecom, pharma, textile, etc.)
    """
    if not sector:
        return "GENERAL"
    s = sector.lower()
    if "bank" in s:
        return "BANK"
    if "non-bank" in s or "nbfi" in s or "leasing" in s or "finance" in s:
        return "NBFI"
    return "GENERAL"
