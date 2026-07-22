"""
Standalone inspection CLI for the grounded fair-value estimate.

The estimator itself now lives in ``backend/services/fair_value.py`` (the live
"value today" box is served from there). This file is a thin dev wrapper so the
skill can still eyeball one stock's figure from the repo root:

    py scripts/deep_analysis/fair_value.py --code GP
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))

# Re-export so any older caller doing `from fair_value import estimate_fair_value`
# keeps working, and there is exactly one implementation.
from backend.services.fair_value import estimate_fair_value  # noqa: E402,F401


if __name__ == "__main__":
    import argparse
    import json

    try:
        sys.stdout.reconfigure(encoding="utf-8")  # box/Bengali chars on Windows
    except Exception:
        pass

    from backend.services.db_service import (  # noqa: E402
        get_company, load_latest_prices, load_financials, close_db,
    )
    from backend.services.scoring_service import get_company_score_row  # noqa: E402
    from utils.sector import normalize_sector  # noqa: E402

    parser = argparse.ArgumentParser(description="Inspect the fair-value estimate for one stock.")
    parser.add_argument("--code", required=True, help="Trading code, e.g. GP")
    args = parser.parse_args()

    code = args.code.strip().upper()
    try:
        company = get_company(code)
        if not company:
            print(f"Company '{code}' not found (or excluded).")
            raise SystemExit(1)
        score_row = get_company_score_row(code)
        financials = load_financials(code)
        ltp = (load_latest_prices().get(code) or {}).get("ltp")
        sector_class = normalize_sector(company.get("sector") or "")
        fv = estimate_fair_value(score_row, financials, company, ltp, sector_class)
        print(json.dumps(fv, indent=2, ensure_ascii=False))
    finally:
        close_db()
