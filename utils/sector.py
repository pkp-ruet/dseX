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
