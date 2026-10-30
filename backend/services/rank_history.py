"""
Rank history — where a company stood on the rankings page, day by day, and
who climbed or fell this week (2026-10-31, the Premium Desk plan, step 3).

The rank is the rankings page's own order: every scored company by score,
strongest first (the page groups by grade, and the grades are score bands, so
it is the same order). It comes from the daily ``signal_snapshots`` rows.

Pure functions only — the reads live in ``rank_history_service``. Like the
score history, a day we changed the scoring rules is not read as news: the
week's movers are measured from after that day.
"""
from __future__ import annotations

from typing import Iterable, Optional

from backend.services import score_history as sh
from backend.services.tiers import tier_key

# A move smaller than this many places is noise (a 0.1-point drift next to a
# crowd of similar scores).
MOVER_MIN_PLACES = 5
# How many climbers and fallers the page lists.
MOVERS_EACH = 8
# Trading days the week's movers look back.
WEEK_DAYS = 5
# The top of the list a rank alert watches.
TOP_N = 20


def ranks_for_day(scores: dict[str, Optional[float]]) -> dict[str, int]:
    """{code: rank} — 1 = the highest score; ties by code so it is stable.
    Codes without a score are left out."""
    ok = [(c, sh._n(s)) for c, s in scores.items()]
    ok = [(c, s) for c, s in ok if s is not None]
    ok.sort(key=lambda x: (-x[1], x[0]))
    return {c: i for i, (c, _) in enumerate(ok, start=1)}


def series(dates: list[str], day_idx: Iterable[int], ranks: Iterable[int],
           totals: list[int]) -> list[dict]:
    """One company's points, oldest first: [{d, r, n}] (n = companies ranked that day)."""
    return [{"d": dates[i], "r": int(r), "n": totals[i]} for i, r in zip(day_idx, ranks)]


_CATS = {"A", "B", "N", "Z", "G"}


def _clean_cat(row: dict) -> dict:
    """DSE's category field sometimes reads "-" (not given); treat it as unknown
    so the reason never says "now -"."""
    cat = str(row.get("market_cat") or "").strip().upper()
    return row if cat in _CATS or not cat else {**row, "market_cat": None}


def _reason(prev: dict, cur: dict) -> dict:
    """Why a company moved, in plain words: a category / old-accounts change
    first, then the check that moved its score most. When its own score
    hardly moved, the companies around it did."""
    prev, cur = _clean_cat(prev), _clean_cat(cur)
    notes = sh._multiplier_notes(prev, cur)
    if notes:
        return {"en": notes[0]["en"], "bn": notes[0]["bn"], "kind": notes[0]["key"]}
    has_pillars = all(sh._n(prev.get(k)) is not None and sh._n(cur.get(k)) is not None
                      for k in sh.PILLAR_KEYS)
    ds = sh.drivers(prev, cur) if has_pillars else []
    if ds:
        return {"en": ds[0]["en"], "bn": ds[0]["bn"], "kind": ds[0]["pillar"]}
    a, b = sh._n(prev.get("score")), sh._n(cur.get("score"))
    if a is not None and b is not None and abs(b - a) >= sh.DRIVER_MIN_POINTS:
        up = b > a
        return {
            "en": f"Its score {'rose' if up else 'fell'} from {a:.0f} to {b:.0f}",
            "bn": f"স্কোর {a:.0f} থেকে {b:.0f} হয়েছে",
            "kind": "score",
        }
    return {
        "en": "Its own score hardly changed. Companies near it moved",
        "bn": "এর নিজের স্কোর প্রায় একই আছে। আশপাশের কোম্পানিগুলো সরে গেছে",
        "kind": "others",
    }


def grade_changes(prev: dict[str, dict], cur: dict[str, dict]) -> list[str]:
    """Codes whose settled grade changed between the two days (a score parked
    on a grade line doesn't count — ``score_history.settle``)."""
    out = []
    for code, c in cur.items():
        p = prev.get(code)
        if not p:
            continue
        a = tier_key(sh._n(p.get("score")))
        if a == "unknown":
            continue
        b = sh.settle(a, sh._n(c.get("score")))
        if b != "unknown" and b != a:
            out.append(code)
    return sorted(out)


def movers(prev: dict[str, dict], cur: dict[str, dict], prev_date: str, cur_date: str) -> dict:
    """The week's biggest rank moves between two days of snapshot rows
    ({code: row with score, pillars, market_cat, stale_data}).

    Returns {from, to, climbed_n, fell_n, climbed: [...], fell: [...],
    grade_changes}. Each item: code, from_rank, to_rank, places (+ = up),
    from_score, to_score, reason {en, bn, kind}."""
    pr = ranks_for_day({c: r.get("score") for c, r in prev.items()})
    cr = ranks_for_day({c: r.get("score") for c, r in cur.items()})
    moves = []
    for code, to_rank in cr.items():
        from_rank = pr.get(code)
        if from_rank is None:
            continue
        places = from_rank - to_rank
        if abs(places) < MOVER_MIN_PLACES:
            continue
        p, c = prev[code], cur[code]
        a, b = sh._n(p.get("score")), sh._n(c.get("score"))
        moves.append({
            "code": code, "from_rank": from_rank, "to_rank": to_rank, "places": places,
            "from_score": round(a, 1) if a is not None else None,
            "to_score": round(b, 1) if b is not None else None,
            "reason": _reason(p, c),
        })
    up = sorted((m for m in moves if m["places"] > 0), key=lambda m: (-m["places"], m["to_rank"]))
    down = sorted((m for m in moves if m["places"] < 0), key=lambda m: (m["places"], m["to_rank"]))
    return {
        "from": prev_date, "to": cur_date, "total": len(cr),
        "climbed_n": len(up), "fell_n": len(down),
        "climbed": up[:MOVERS_EACH], "fell": down[:MOVERS_EACH],
        "grade_changes": len(grade_changes(prev, cur)),
    }


def week_window(dates: list[str], method_days: set[str], back: int = WEEK_DAYS) -> tuple[Optional[str], Optional[str], bool]:
    """(from, to, method) for the week's movers: the newest day against the
    snapshot ``back`` trading days earlier. A rule-change day inside the
    window moves the start up to that day (so the reshuffle itself isn't read
    as moves); when the newest day is one, there is nothing to say."""
    ds = sorted(set(dates))
    if len(ds) < 2:
        return None, None, False
    to = ds[-1]
    if to in method_days:
        return None, to, True
    start = ds[max(0, len(ds) - 1 - back)]
    inside = [d for d in ds if start < d <= to and d in method_days]
    if inside:
        start = max(inside)
    return start, to, bool(inside)
