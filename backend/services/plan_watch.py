"""Plan watch (2026-11-23, portfolio builder phase 2) — pure.

After every close we look again at the shares in each reader's newest
portfolio plan (``builder_plans``, built in the last ``WATCH_DAYS``) that they
haven't bought yet. Three kinds of news, each told once:

- **price** — a share the plan waits for closed at or under the price the
  plan waits for (once per plan and share);
- **out** — it no longer passes the checks that let a company into a plan
  (the engine's explore gate: we now grade it mixed, a loss, a serious
  warning, loans, trading, data), said with the first check it fails (once
  per plan and share);
- **red** — its stock report found a new serious problem (the snapshot diff
  the watcher reads); a share the reader follows is left to the watcher,
  which already says it.

Events are stored as the watcher's (``portfolio_watch_events``, kind
``plan``), so Updates lists them; Premium readers get one push the same
evening. ``portfolio_builder_service.run_plan_watch`` does the reads and
writes. Tests: ``backend/tests/test_plan_watch.py``.
"""
from __future__ import annotations

from typing import Optional

WATCH_DAYS = 90

_LEVEL_ORDER = {"bad": 0, "watch": 1, "good": 2}


def _px(v: Optional[float]) -> str:
    if v is None:
        return "–"
    v = float(v)
    return f"৳{v:,.0f}" if v >= 100 else f"৳{v:,.1f}"


def _taka(v: float) -> str:
    from backend.services.portfolio_builder import _taka as t

    return t(v)


def plan_events(plan_id: str, plan: dict, day: str, closes: dict[str, float], pool_codes: set[str],
                gate_fail: dict[str, dict], red_new: dict[str, dict], held: set[str],
                followed: set[str]) -> list[dict]:
    """The day's news on one plan. ``closes`` {code: last close}; ``pool_codes``
    the companies that pass the explore gate today; ``gate_fail`` {code: {en,
    bn}} the first check a company outside the pool fails; ``red_new`` the
    report snapshots' new red checks ({code: {day, items}})."""
    out: list[dict] = []
    for it in plan.get("items") or []:
        code = (it.get("code") or "").upper()
        if not code or code in held:
            continue
        base = {"kind": "plan", "plan_id": plan_id, "code": code, "day": day}

        red = red_new.get(code)
        if red and red.get("items") and code not in followed:
            first = red["items"][0]
            out.append({**base, "plan_kind": "red", "level": "bad",
                        "id": f"plan-red-{plan_id}-{code}-{red.get('day') or day}",
                        "title_en": f"{code}, in your portfolio plan, has a new serious problem",
                        "title_bn": f"আপনার পোর্টফোলিও পরিকল্পনার {code}-এ নতুন গুরুতর সমস্যা",
                        "body_en": first.get("en") or "", "body_bn": first.get("bn") or first.get("en") or "",
                        "url": f"/stock/{code}?src=plan-watch#an-safety"})

        if code not in pool_codes:
            why = gate_fail.get(code)
            if why:
                out.append({**base, "plan_kind": "out", "level": "watch",
                            "id": f"plan-out-{plan_id}-{code}",
                            "title_en": f"{code}, in your portfolio plan, no longer passes our checks",
                            "title_bn": f"আপনার পোর্টফোলিও পরিকল্পনার {code} এখন আমাদের যাচাইয়ে টেকে না",
                            "body_en": f"{why['en']}. We would not put it in a new plan today.",
                            "body_bn": f"{why['bn']}। আজ নতুন পরিকল্পনায় আমরা এটি রাখতাম না।",
                            "url": f"/stock/{code}?src=plan-watch#ch-analysis"})
            continue  # a share that no longer passes is never "time to buy"

        wait, close = it.get("wait_under"), closes.get(code)
        if it.get("state") == "wait" and wait and close is not None and close <= float(wait):
            qty, amount = int(it.get("qty") or 0), float(it.get("amount") or 0)
            out.append({**base, "plan_kind": "price", "level": "good",
                        "id": f"plan-price-{plan_id}-{code}",
                        "title_en": f"{code} reached the price your plan waits for",
                        "title_bn": f"আপনার পরিকল্পনার {code} অপেক্ষার দামে নেমেছে",
                        "body_en": f"It closed at {_px(close)}, at or under {_px(wait)}. "
                                   f"Your plan keeps {_taka(amount)} for {qty} shares.",
                        "body_bn": f"দিন শেষে দাম {_px(close)}, {_px(wait)} বা তার নিচে। "
                                   f"আপনার পরিকল্পনায় এর {qty}টি শেয়ারের জন্য {_taka(amount)} রাখা আছে।",
                        "url": f"/portfolio-builder?plan={plan_id}&src=plan-watch#pb-{code}"})
    return out


def change_tags(events: list[dict]) -> dict[str, dict]:
    """{code: the plan page's tag} — the worst news on each share wins."""
    tags: dict[str, dict] = {}
    for e in sorted(events, key=lambda e: _LEVEL_ORDER.get(e.get("level"), 3)):
        code = e.get("code")
        if not code or code in tags or "." in code or code.startswith("$"):
            continue
        k = e.get("plan_kind")
        if k == "red":
            en, bn = "New serious problem", "নতুন গুরুতর সমস্যা"
        elif k == "out":
            en, bn = "No longer passes our checks", "আমাদের যাচাইয়ে আর টেকে না"
        else:
            en, bn = "Reached the price to buy", "কেনার দামে পৌঁছেছে"
        tags[code] = {"kind": k, "level": e.get("level"), "day": e.get("day"), "en": en, "bn": bn,
                      "body_en": e.get("body_en"), "body_bn": e.get("body_bn")}
    return tags


def push_payload(events: list[dict], plan_id: str, lang: str = "bn") -> Optional[dict]:
    """One notification for the day's plan news, the most serious first."""
    if not events:
        return None
    bn = lang != "en"
    ranked = sorted(events, key=lambda e: _LEVEL_ORDER.get(e.get("level"), 3))
    if len(ranked) == 1:
        e = ranked[0]
        return {"title": e["title_bn"] if bn else e["title_en"],
                "body": e["body_bn"] if bn else e["body_en"], "url": e["url"], "tag": "planwatch"}
    n = len(ranked)
    return {"title": f"আপনার পোর্টফোলিও পরিকল্পনায় {n}টি বদল" if bn else f"Your portfolio plan: {n} changes",
            "body": " · ".join((e["title_bn"] if bn else e["title_en"]) for e in ranked[:3]),
            "url": f"/portfolio-builder?plan={plan_id}&src=plan-watch", "tag": "planwatch"}
