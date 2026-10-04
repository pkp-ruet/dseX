"""Make the repo root importable (``backend.*``, ``scrapers.*``, ``utils.*``).

The tests are pure: they never touch MongoDB. Fixtures are the real DSE news
text and figures for the 13 stocks reviewed in the Oct 2026 bug pass.
"""
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
