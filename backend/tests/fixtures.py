"""Real DSE post text / figures for the stocks in the Oct 2026 review.

Bodies are copied verbatim from `company_news` (trimmed after the parts we read).
"""
from datetime import datetime

Q = {
    "JAMUNAOIL": ("JAMUNAOIL: Q3 Financials",
        "(Q3 Un-audited): EPS was Tk. 6.94 for January-March 2026 as against Tk. 12.73 for January-March 2025; "
        "EPS was Tk. 26.57 for July 2025-March 2026 as against Tk. 36.65 for July 2024-March 2025. NOCFPS was "
        "Tk. (134.34) for July 2025-March 2026 as against Tk. 88.26 for July 2024-March 2025. NAV per share was "
        "Tk. 281.28 as on March 31, 2026 and Tk. 274.03 as on June 30, 2025. (cont.)"),
    "EBL": ("EBL: Q2 Financials",
        "(Q2 Un-audited): Consolidated EPS was Tk. 1.46 for April-June 2026 as against Tk. 1.20 (restated) for "
        "April-June 2025; Consolidated EPS was Tk. 2.67 for January-June 2026 as against Tk. 2.14 (restated) for "
        "January-June 2025. Consolidated NOCFPS was Tk. 7.57 for January-June 2026 as against Tk. 13.10 (restated) "
        "for January-June 2025. Consolidated NAV per share was Tk. 30.71 as on June 30, 2026 and "),
    "BRACBANK": ("BRACBANK: Q2 Financials",
        "(Q2 Un-audited): Consolidated EPS was Tk. 2.55 for April-June 2026 as against Tk. 1.34 for April-June 2025; "
        "Consolidated EPS was Tk. 5.07 for January-June 2026 as against Tk. 3.09 for January-June 2025. Consolidated "
        "NOCFPS was Tk. 40.05 for January-June 2026 as against Tk. 38.47 for January-June 2025. Consolidated NAV per "
        "share was Tk. 49.38 as on June 30, 2026 and Tk. 44.84 as on December 31, 202"),
    "NAVANAPHAR": ("NAVANAPHAR: Q3 Financials and decision to proceed with a Foreign Loan",
        "(Q3 Un-audited): EPS was Tk. 1.22 for Jan-March 2026 as against Tk. 1.01 for Jan-March 2025; EPS was Tk. "
        "4.59 for July 2025-March 2026 as against Tk. 3.49 for July 2024-March 2025. Diluted EPS was Tk. 1.20 for "
        "Jan-March 2026 and Diluted EPS was Tk. 4.55 for July 2025-March 2026. NOCFPS was Tk. 15.44 for July "
        "2025-March 2026 as against Tk. 10.22 for July 2024-March 2025. NAV per share was Tk. 49.53 as on March 31, 2026"),
    "NAVANAPHAR_Q2": ("NAVANAPHAR: Q2 Financials",
        "(Q2 Un-audited): Diluted EPS was Tk. 1.65 for October-December 2025 as against Tk. 1.00 for October-December "
        "2024; Diluted EPS was Tk. 3.35 for July-December 2025 as against Tk. 2.25 for July-December 2024. NOCFPS was "
        "Tk. 8.11 for July-December 2025 as against Tk. 3.16 for July-December 2024. NAV per share was Tk. 48.32 as "
        "on December 31, 2025 and Tk. 45.29 as on June 30, 2025. (cont.)"),
    "BSC": ("BSC: Q3 Financials",
        "(Q3 Un-audited): EPS was Tk. 4.18 for January-March 2026 as against Tk. 4.95 for January-March 2025; EPS was "
        "Tk. 13.11 for July 2025-March 2026 as against Tk. 14.38 for July 2024-March 2025. NOCFPS was Tk. 16.80 for "
        "July 2025-March 2026 as against Tk. 19.58 for July 2024-March 2025. NAV per share was Tk. 115.45 as on "
        "March 31, 2026 and Tk. 104.84 as on June 30, 2025. Reasons for Deviation: (cont.)"),
    "ENVOYTEX": ("ENVOYTEX: Q3 Financials",
        "(Q3 Un-audited): EPS was Tk. 1.54 for January-March 2026 as against Tk. 2.44 for January-March 2025; EPS was "
        "Tk. 5.89 for July 2025-March 2026 as against Tk. 6.03 for July 2024-March 2025. NOCFPS was Tk. 16.85 for "
        "July 2025-March 2026 as against Tk. 3.27 for July 2024-March 2025. NAV per share was Tk. 61.21 as on March 31, 2026 "),
    "LHB": ("LHB: Q2 Financials",
        "(Q2 Un-audited): Consolidated EPS was Tk. 0.90 for April-June 2026 as against Tk. 0.83 for April-June 2025. "
        "Consolidated EPS was Tk. 1.87 for January-June 2026 as against Tk. 2.03 for January-June 2025. Consolidated "
        "NOCFPS was Tk. (2.59) for January-June 2026 as against Tk. 1.64 for January-June 2025. Consolidated NAV per "
        "share was Tk. 15.98 as on June 30, 2026 and Tk. 16.41 as on December 31, 202"),
    "BATBC": ("BATBC: Q2 Financials",
        "(Q2 Un-audited): EPS was Tk. 3.77 for April-June 2026 as against Tk. 1.80 for April-June 2025; EPS was Tk. "
        "7.65 for January-June 2026 as against Tk. 7.69 for January-June 2025. NOCFPS was Tk. 29.12 for January-June "
        "2026 as against Tk. 9.05 for January-June 2025. NAV per share was Tk. 107.15 as on June 30, 2026 and Tk. "
        "102.50 as on December 31, 2025. (cont.)"),
    "ACMELAB": ("ACMELAB: Q3 Financials",
        "(Q3 Un-audited): EPS was Tk. 3.30 for January-March 2026 as against Tk. 2.81 for January-March 2025; EPS was "
        "Tk. 9.40 for July 2025-March 2026 as against Tk. 8.28 for July 2024-March 2025. NOCFPS was Tk. 19.78 for "
        "July 2025-March 2026 as against Tk. 7.76 (restated) for July 2024-March 2025. NAV per share was Tk. 132.27 "
        "as on March 31, 2026 and Tk. 126.37 as on June 30, 2025. (cont.)"),
    "WALTONHIL": ("WALTONHIL: Q3 Financials",
        "(Q3 Un-audited): EPS was Tk. 8.39 for January-March 2026 as against Tk. 11.76 for January-March 2025; EPS was "
        "Tk. 19.29 for July 2025-March 2026 as against Tk. 20.90 for July 2024-March 2025. NOCFPS was Tk. 22.32 for "
        "July 2025-March 2026 as against Tk. (1.67) for July 2024-March 2025. NAV per share with revaluation was Tk. "
        "366.80 as on March 31, 2026, and Tk. 363.40 as on June 30, 2025; NAV per sh"),
    "GP": ("GP: Q1 Financials",
        "(Q1 Un-audited): EPS was Tk. 4.90 for January-March 2026 as against Tk. 4.69 for January-March 2025. NOCFPS "
        "was Tk. 12.48 for January-March 2026 as against Tk. 14.11 for January-March 2025. NAV per share was Tk. 46.39 "
        "as on March 31, 2026 and Tk. 52.64 as on March 31, 2025. (cont.)"),
}

# Audited table: (year, EPS, NAV/share, cash dividend %, P/E basic), year-ascending.
FIN = {
    "JAMUNAOIL": [(2021, 18.24, 180.84, 120.0, 8.9), (2022, 16.87, 189.0, 120.0, 10.5), (2023, 30.87, 205.49, 130.0, 5.83),
                  (2024, 40.0, 228.61, 150.0, 4.37), (2025, 58.7, 274.03, 180.0, 3.11)],
    "EBL": [(2021, 5.03, 33.17, 12.5, 7.65), (2022, 4.77, 33.33, 12.5, 6.66), (2023, 5.07, 33.57, 12.5, 5.8),
            (2024, 4.86, 31.63, 17.5, 5.08), (2025, 5.23, 31.38, 25.0, 4.65)],
    "BRACBANK": [(2021, 3.93, 41.08, 7.5, 14.09), (2022, 4.02, 40.86, 7.5, 9.58), (2023, 4.73, 41.36, 10.0, 7.57),
                 (2024, 6.95, 44.11, 12.5, 7.05), (2025, 9.12, 51.56, 15.0, 6.92)],
    "NAVANAPHAR": [(2021, 2.52, 41.19, None, None), (2022, 3.42, 43.41, 11.0, None), (2023, 3.59, 43.98, 13.0, 32.53),
                   (2024, 3.77, 42.46, 14.0, 23.18), (2025, 4.54, 45.29, 14.0, 11.08)],
    "BSC": [(2021, 4.72, 60.28, 12.0, 9.55), (2022, 14.8, 72.52, 20.0, 7.92), (2023, 16.15, 86.67, 25.0, 7.83),
            (2024, 16.37, 101.97, 25.0, 6.23), (2025, 20.1, 104.84, 25.0, 4.5)],
    "ENVOYTEX": [(2021, 0.56, 37.79, 5.0, 52.04), (2022, 2.99, 38.21, 15.0, 14.79), (2023, 1.95, 38.57, 15.0, 22.5),
                 (2024, 3.58, 51.93, 20.0, 9.95), (2025, 8.4, 58.32, 30.0, 4.76)],
    "LHB": [(2021, 3.34, 17.04, 25.0, 21.27), (2022, 3.83, 15.25, 48.0, 16.93), (2023, 5.12, 19.14, 50.0, 13.54),
            (2024, 3.29, 16.01, 38.0, 16.39), (2025, 4.4, 16.41, 40.0, 10.62)],
    "BATBC": [(2021, 27.72, 68.13, 275.0, 22.93), (2022, 33.1, 76.27, 200.0, 15.67), (2023, 33.11, 99.33, 100.0, 15.67),
              (2024, 32.42, 106.88, 300.0, 11.34), (2025, 10.81, 102.5, 30.0, 22.99)],
    "WALTONHIL": [(2021, 54.21, 311.59, 250.0, 24.76), (2022, 40.16, 334.68, 250.0, 27.24), (2023, 25.84, 343.73, 300.0, 40.55),
                  (2024, 44.78, 379.3, 350.0, 14.5), (2025, 34.22, 399.74, 175.0, 11.87)],
    "ACMELAB": [(2021, 7.42, 95.04, 25.0, 9.94), (2022, 9.98, 102.5, 30.0, 8.91), (2023, 10.89, 110.09, 33.0, 7.9),
                (2024, 11.61, 118.39, 35.0, 5.9), (2025, 11.48, 126.37, 35.0, 6.29)],
    "GP": [(2021, 25.28, 36.94, 250.0, 13.83), (2022, 22.29, 34.22, 220.0, 12.86), (2023, 24.49, 49.39, 125.0, 11.7),
           (2024, 26.89, 47.95, 330.0, 12.02), (2025, 21.9, 41.49, 215.0, 11.77)],
}


def fin_rows(code: str) -> list[dict]:
    return [{"year": y, "eps": e, "nav_per_share": n, "cash_dividend_pct": c, "pe_ratio_basic": pe}
            for y, e, n, c, pe in FIN[code]]


def post(code: str, when=datetime(2026, 5, 1)) -> dict:
    title, body = Q[code]
    return {"title": title, "body": body, "post_date": when}


# Shareholding snapshots (latest, previous) — DSE company page.
SHARES = {
    "MPETROLEUM": ({"as_of_date": "Mar 31, 2026", "foreign_pct": 0.09, "govt_pct": 58.67, "institute_pct": 33.11,
                    "public_pct": 8.13, "sponsor_director_pct": 0.0},
                   {"as_of_date": "Jun 30, 2025", "foreign_pct": 0.09, "govt_pct": 58.67, "institute_pct": 33.42,
                    "public_pct": 7.82, "sponsor_director_pct": 0.0}),
    "BSC": ({"as_of_date": "Mar 31, 2026", "foreign_pct": 0.0, "govt_pct": 52.1, "institute_pct": 21.34,
             "public_pct": 26.56, "sponsor_director_pct": 0.0},
            {"as_of_date": "Jun 30, 2025", "foreign_pct": 0.0, "govt_pct": 52.1, "institute_pct": 21.34,
             "public_pct": 26.56, "sponsor_director_pct": 0.0}),
    "JAMUNAOIL": ({"as_of_date": "Mar 31, 2026", "foreign_pct": 0.11, "govt_pct": 60.08, "institute_pct": 30.72,
                   "public_pct": 9.09, "sponsor_director_pct": 0.0},
                  {"as_of_date": "Jun 30, 2025", "foreign_pct": 0.26, "govt_pct": 60.08, "institute_pct": 30.58,
                   "public_pct": 9.08, "sponsor_director_pct": 0.0}),
    "ACMELAB": ({"as_of_date": "Mar 31, 2026", "foreign_pct": 0.0, "govt_pct": 0.0, "institute_pct": 32.39,
                 "public_pct": 27.22, "sponsor_director_pct": 40.39},
                {"as_of_date": "Jun 30, 2025", "foreign_pct": 0.0, "govt_pct": 0.0, "institute_pct": 29.9,
                 "public_pct": 27.72, "sponsor_director_pct": 42.38}),
    "NAVANAPHAR": ({"as_of_date": "Mar 31, 2026", "foreign_pct": 19.63, "govt_pct": 0.0, "institute_pct": 10.84,
                    "public_pct": 27.33, "sponsor_director_pct": 42.2},
                   {"as_of_date": "Jun 30, 2025", "foreign_pct": 19.63, "govt_pct": 0.0, "institute_pct": 9.42,
                    "public_pct": 39.31, "sponsor_director_pct": 31.64}),
}

# DSE company-page profile: total loan, reserve & surplus (Tk mn), market cap (Tk mn), sector.
PROFILE = {
    "BSC": {"total_loan_mn": 15100.5, "reserve_surplus_mn": 9818.5, "mcap_mn": 19280.4,
            "sector": "Miscellaneous", "market_category": "A"},
    "ENVOYTEX": {"total_loan_mn": 10399.59, "reserve_surplus_mn": 7009.7, "mcap_mn": 9795.7,
                 "sector": "Textile", "market_category": "A"},
    "ACMELAB": {"total_loan_mn": 24810.11, "reserve_surplus_mn": 19496.4, "mcap_mn": 16500.0,
                "sector": "Pharmaceuticals & Chemicals", "market_category": "A"},
    "EBL": {"total_loan_mn": 106815.61, "reserve_surplus_mn": 33646.5, "mcap_mn": 40106.0,
            "sector": "Bank", "market_category": "A"},
}

NEWS = {
    "NAVANAPHAR_BSEC": {
        "title": "NAVANAPHAR: Current Board Member status of the company.",
        "post_date": datetime(2026, 8, 27),
        "body": "The company has informed that pursuant to the direction of the Bangladesh Securities and Exchange "
                "Commission reference no: BSEC/ICSD/SRIC/2026-313/part-03/123: dated June 18, 2026, the 64th Meetings "
                "of the Board of Directors of Navana Pharmaceuticals PLC. have been postponed, with a direction to "
                "maintain the composition of the Board as it stood at the 63rd Board Meeting. (cont.)",
    },
    "JAMUNAOIL_QO": {
        "title": "JAMUNAOIL: Qualified Opinion and Emphasis of Matters",
        "post_date": datetime(2025, 12, 22),
        "body": "The auditor of the company has given the Qualified Opinion and Emphasis of Matters in the auditor's "
                "report of the company for the year ended June 30, 2025.",
    },
    "MPETROLEUM_QO": {
        "title": "MPETROLEUM: Qualified Opinion, Emphasis of Matters and Other Matters",
        "post_date": datetime(2025, 12, 22),
        "body": "The auditor of the company has given the Qualified Opinion, Emphasis of Matters and Other Matters "
                "paragraphs in the audited financial statements of the company for the year ended June 30, 2025.",
    },
    "EBL_CONSENT": {
        "title": "EBL: BSEC Consent for Issuance of Unsecured, Non-convertible Subordinated Bond",
        "post_date": datetime(2025, 12, 22),
        "body": "Refer to the earlier news disseminated by DSE on 25.09.2025 regarding Board approves the issuance of "
                "Unsecured, Non-convertible Subordinated Bond, the company has further informed that Bangladesh "
                "Securities and Exchange Commission (BSEC) vide its letter dated December 21, 2025, has accorded its "
                "consent for raising Tier-II capital of the Bank under Basel III amounting to BDT 800.00 crore.",
    },
    "WALTON_NOC": {
        "title": "WALTONHIL: No Objection of BSEC regarding proposed merger",
        "post_date": datetime(2026, 3, 15),
        "body": "Referring to their earlier news disseminated by DSE on 25.01.2026 regarding Board approval of the "
                "Scheme of the proposed Merger, the company has further informed that the Bangladesh Securities and "
                "Exchange Commission (BSEC) has issued No Objection dated: 15 March 2026 regarding the proposed Merger.",
    },
}

NOW = datetime(2026, 10, 1)
