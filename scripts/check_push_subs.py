"""
Read-only push-subscription inspector.

Answers "did this device ever register a web-push subscription?" by listing the
`push_subscriptions` docs (one per device, unique on endpoint) for a user, plus
the account-level push flags. Nothing is written.

Usage:
    python scripts/check_push_subs.py you@example.com   # one user by email
    python scripts/check_push_subs.py                    # summary of all users
"""
import sys
from pathlib import Path

# Allow running from anywhere: put repo root (which holds config.py) on the path.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from db.connection import get_db, close_connection  # noqa: E402


def _fmt_ts(v):
    if not v:
        return "—"
    try:
        return v.strftime("%Y-%m-%d %H:%M")
    except AttributeError:
        return str(v)


def _endpoint_tag(endpoint: str) -> str:
    """Short, human-readable endpoint id: host + last 10 chars of the token."""
    if not endpoint:
        return "(none)"
    host = endpoint.split("/")[2] if "://" in endpoint else endpoint[:24]
    return f"{host} ...{endpoint[-10:]}"


def _guess_device(ua) -> str:
    if not ua:
        return "unknown-device"
    ua_l = ua.lower()
    if "android" in ua_l:
        return "ANDROID"
    if "iphone" in ua_l or "ipad" in ua_l:
        return "iOS"
    if "windows" in ua_l:
        return "Windows-desktop"
    if "macintosh" in ua_l or "mac os" in ua_l:
        return "Mac-desktop"
    if "linux" in ua_l:
        return "Linux-desktop"
    return "other"


def show_user(db, email: str) -> None:
    user = db["users"].find_one({"email": email.lower().strip()})
    if not user:
        print(f"No user found with email {email!r}.")
        print("Tip: run with no argument to list every user that has subscriptions.")
        return

    uid = user.get("user_id")
    print(f"User    : {email}  (user_id={uid})")
    print(f"push_enabled       : {user.get('push_enabled')}")
    print(f"notification_prefs : {user.get('notification_prefs')}")
    print("-" * 72)

    subs = list(db["push_subscriptions"].find({"user_id": uid}))
    if not subs:
        print("NO push subscriptions on file for this account.")
        print("=> No device (desktop OR mobile) has a live subscription in the DB.")
        return

    print(f"{len(subs)} subscription(s):\n")
    for i, s in enumerate(subs, 1):
        print(f"  [{i}] {_guess_device(s.get('ua'))}   platform={s.get('platform')!r}")
        print(f"      endpoint    : {_endpoint_tag(s.get('endpoint', ''))}")
        print(f"      created     : {_fmt_ts(s.get('created_at'))}")
        print(f"      last_seen   : {_fmt_ts(s.get('last_seen_at'))}")
        print(f"      last_success: {_fmt_ts(s.get('last_success_at'))}   fail_count={s.get('fail_count', 0)}")
        ua = s.get("ua")
        if ua:
            print(f"      ua          : {ua[:90]}")
        print()

    has_android = any("android" in (s.get("ua") or "").lower() for s in subs)
    print("-" * 72)
    print(f"Android device registered? {'YES' if has_android else 'NO - this is the problem'}")


def show_all(db) -> None:
    subs = list(db["push_subscriptions"].find({}))
    print(f"Total push_subscriptions in DB: {len(subs)}\n")
    by_user: dict[str, list] = {}
    for s in subs:
        by_user.setdefault(s.get("user_id", "?"), []).append(s)
    for uid, docs in sorted(by_user.items(), key=lambda kv: -len(kv[1])):
        devices = ", ".join(sorted({_guess_device(d.get("ua")) for d in docs}))
        print(f"  {uid}: {len(docs)} device(s)  [{devices}]")


def main() -> None:
    db = get_db()
    try:
        if len(sys.argv) > 1:
            show_user(db, sys.argv[1])
        else:
            show_all(db)
    finally:
        close_connection()


if __name__ == "__main__":
    main()
