import os
import secrets
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "dsex")

# JWT — set JWT_SECRET as a persistent env var on Render (default randomizes on restart)
JWT_SECRET = os.getenv("JWT_SECRET", secrets.token_hex(32))
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "10080"))  # 7 days

ADMIN_EMAILS: set[str] = {
    e.strip().lower()
    for e in os.getenv("ADMIN_EMAILS", "").split(",")
    if e.strip()
}

# Google OAuth — Web Client ID from Google Cloud Console.
# Public per Google's design (also exposed to the browser as NEXT_PUBLIC_GOOGLE_CLIENT_ID).
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

# Email (Resend transactional API) — used for re-engagement campaigns.
# RESEND_API_KEY must be set on Render before any real send. Domain auth
# (DKIM/SPF for topstockbd.com) is configured in the Resend dashboard.
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
EMAIL_FROM_ADDRESS = os.getenv("EMAIL_FROM_ADDRESS", "hello@topstockbd.com")
EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "TopStock BD")
EMAIL_REPLY_TO = os.getenv("EMAIL_REPLY_TO", EMAIL_FROM_ADDRESS)

# Second provider (Brevo transactional API). Running both lets sends fail over
# and stacks free-tier volume (Resend ~100/day + Brevo ~300/day). topstockbd.com
# must be domain-authenticated in Brevo too — its own DKIM selector, plus Brevo
# added to the domain's SPF record (coexists with Resend's DKIM).
BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")

# Order providers are tried in. Each send prefers a provider that still has daily
# quota headroom, then falls back to the rest on error → failover.
EMAIL_PROVIDER_ORDER = [
    p.strip().lower()
    for p in os.getenv("EMAIL_PROVIDER_ORDER", "resend,brevo").split(",")
    if p.strip()
]


def _email_daily_cap(name: str) -> int:
    """Per-provider daily send cap (approx, UTC day). 0/unset = unlimited. Set a
    little below the true free-tier limit for headroom (e.g. 90 Resend / 280 Brevo)."""
    try:
        return max(0, int(os.getenv(name, "0")))
    except ValueError:
        return 0


RESEND_DAILY_CAP = _email_daily_cap("RESEND_DAILY_CAP")
BREVO_DAILY_CAP = _email_daily_cap("BREVO_DAILY_CAP")

# Absolute bases for links embedded in emails (CTA → site, pixel/unsubscribe → API).
PUBLIC_SITE_URL = os.getenv("PUBLIC_SITE_URL", "https://www.topstockbd.com").rstrip("/")
PUBLIC_API_BASE_URL = os.getenv("PUBLIC_API_BASE_URL", "https://dsex.onrender.com").rstrip("/")

# Web push (VAPID) — browser push notifications for the daily digest + alerts.
# Generate the keypair ONCE (e.g. `vapid --gen` from py-vapid, or the helper in
# scripts) and set all three as persistent env vars on Render AND in the GitHub
# Actions secrets that run `notify-digest`. The PUBLIC key is also exposed to the
# browser as NEXT_PUBLIC_VAPID_PUBLIC_KEY (must match byte-for-byte). Rotating the
# keys silently invalidates every existing browser subscription — never rotate.
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_SUBJECT = os.getenv("VAPID_SUBJECT", "mailto:hello@topstockbd.com")
