"""
Send a one-off test web-push to a user's devices (by email), to verify delivery.

Uses the real send path (push_service.send_to_user), so it exercises VAPID +
pywebpush + FCM exactly like the daily digest. Requires VAPID_* keys in the
environment (.env). Fans out to every registered device on the account.

Usage:
    python scripts/send_test_push.py you@example.com
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from db.connection import get_db, close_connection  # noqa: E402
from backend.services import push_service  # noqa: E402


def main() -> None:
    if len(sys.argv) < 2:
        print("usage: python scripts/send_test_push.py you@example.com")
        return
    email = sys.argv[1].lower().strip()

    if not push_service.is_configured():
        print("VAPID keys are NOT set in this environment (.env) - cannot send.")
        print("Set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT locally,")
        print("or run this from the backend host (Render) where they exist.")
        return

    user = get_db()["users"].find_one({"email": email})
    if not user:
        print(f"No user with email {email!r}")
        return

    payload = {
        "title": "TopStockBD test",
        "body": "If you see this on your phone, web push is working.",
        "url": "/",
        "tag": "test-push",
    }
    result = push_service.send_to_user(user["user_id"], payload)
    print(f"send_to_user({email}) -> {result}")
    print("  sent    = delivered to that many devices")
    print("  expired = dead endpoint, pruned (re-subscribe needed)")
    print("  failed  = transient/config error (see logs)")


if __name__ == "__main__":
    try:
        main()
    finally:
        close_connection()
