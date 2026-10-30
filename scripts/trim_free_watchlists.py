"""
Trim free accounts' watchlists to the free cap (FREE_LIMITS["watchlist"] = 5),
keeping the first shares each account followed (backend/services/watchlist_trim.py).

Safe by default:
* Dry run unless --write: prints every account it would change and writes nothing.
* --write saves a backup row per account in `watchlist_trims` BEFORE changing it
  (the full list and meta before, what was kept, what was removed).
* Each change only applies if the account's list is still exactly what was read
  (a reader adding or removing at that moment is skipped, not overwritten).
* Premium accounts and admins are never touched (entitlements.is_premium).
* --undo RUN_ID puts every removed share of that run back.

    py scripts/trim_free_watchlists.py                 # dry run
    py scripts/trim_free_watchlists.py --write         # apply, prints the run id
    py scripts/trim_free_watchlists.py --undo RUN_ID   # dry run of the undo
    py scripts/trim_free_watchlists.py --undo RUN_ID --write
"""
from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from db.connection import get_db  # noqa: E402
from backend.services.entitlements import FREE_LIMITS, is_premium  # noqa: E402
from backend.services.watchlist_trim import restore_list, trim_plan  # noqa: E402

BACKUP = "watchlist_trims"
FIELDS = {"_id": 0, "user_id": 1, "email": 1, "phone": 1, "display_name": 1, "watchlist": 1,
          "watchlist_meta": 1, "premium_until": 1, "email_verified": 1, "created_at": 1}


def _who(u: dict) -> str:
    return u.get("email") or u.get("phone") or u.get("user_id")


def trim(write: bool) -> None:
    from backend.config import ADMIN_EMAILS

    # Without the admin list every admin would read as a free account.
    if not ADMIN_EMAILS:
        sys.exit("ADMIN_EMAILS is not set here; refusing to run (admins would be trimmed).")
    db = get_db()
    limit = FREE_LIMITS["watchlist"]
    now = datetime.now(timezone.utc)
    run_id = now.strftime("trim-%Y%m%d-%H%M%S")
    over = list(db.users.find({f"watchlist.{limit}": {"$exists": True}}, FIELDS))
    print(f"Accounts following more than {limit} shares: {len(over)}")

    plans, premium = [], 0
    for u in over:
        if is_premium(u, now):
            premium += 1
            continue
        plan = trim_plan(u.get("watchlist") or [], u.get("watchlist_meta") or {}, limit)
        if plan:
            plans.append((u, plan))
    print(f"  Premium or admin, left alone: {premium}")
    print(f"  Free, to trim: {len(plans)}  (shares to remove: {sum(len(p['removed']) for _, p in plans)})")
    print()
    for u, p in plans:
        flag = "  [date order differs from list order]" if p["order_differs"] else ""
        print(f"- {_who(u)}: {len(u['watchlist'])} -> {len(p['keep'])}{flag}")
        print(f"    keep:   {', '.join(p['keep'])}")
        print(f"    remove: {', '.join(p['removed'])}")

    if not write:
        print("\nDry run: nothing was changed. Add --write to apply.")
        return

    done = skipped = 0
    for u, p in plans:
        uid = u["user_id"]
        db[BACKUP].insert_one({
            "_id": f"{run_id}:{uid}", "run_id": run_id, "user_id": uid, "who": _who(u), "at": now,
            "before": u["watchlist"], "before_meta": u.get("watchlist_meta") or {},
            "kept": p["keep"], "removed": p["removed"], "removed_meta": p["removed_meta"],
            "applied": False,
        })
        res = db.users.update_one(
            {"user_id": uid, "watchlist": u["watchlist"]},
            {"$set": {"watchlist": p["keep"], "watchlist_meta": p["meta"], "updated_at": now}},
        )
        if res.modified_count == 1:
            db[BACKUP].update_one({"_id": f"{run_id}:{uid}"}, {"$set": {"applied": True}})
            done += 1
        else:
            skipped += 1
            print(f"  skipped {_who(u)}: the list changed while we ran")
    print(f"\nRun {run_id}: trimmed {done}, skipped {skipped}. Backup in `{BACKUP}`.")
    print(f"To undo: py scripts/trim_free_watchlists.py --undo {run_id} --write")


def undo(run_id: str, write: bool) -> None:
    db = get_db()
    rows = list(db[BACKUP].find({"run_id": run_id, "applied": True}))
    print(f"Run {run_id}: {len(rows)} accounts to restore")
    for r in rows:
        u = db.users.find_one({"user_id": r["user_id"]}, {"watchlist": 1, "watchlist_meta": 1})
        if not u:
            print(f"- {r['who']}: account gone, skipped")
            continue
        current = u.get("watchlist") or []
        new = restore_list(current, r["removed"])
        meta = dict(u.get("watchlist_meta") or {})
        for c, m in (r.get("removed_meta") or {}).items():
            meta.setdefault(c, m)
        print(f"- {r['who']}: {len(current)} -> {len(new)}  (+{', '.join(c for c in new if c not in current)})")
        if write:
            res = db.users.update_one(
                {"user_id": r["user_id"], "watchlist": current},
                {"$set": {"watchlist": new, "watchlist_meta": {c: meta[c] for c in new if c in meta},
                          "updated_at": datetime.now(timezone.utc)}},
            )
            if res.modified_count == 1:
                db[BACKUP].update_one({"_id": r["_id"]}, {"$set": {"undone_at": datetime.now(timezone.utc)}})
            else:
                print("    skipped: the list changed while we ran")
    if not write:
        print("\nDry run: nothing was changed. Add --write to apply.")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--write", action="store_true", help="apply (default is a dry run)")
    ap.add_argument("--undo", metavar="RUN_ID", help="put back what a run removed")
    args = ap.parse_args()
    if args.undo:
        undo(args.undo, args.write)
    else:
        trim(args.write)
