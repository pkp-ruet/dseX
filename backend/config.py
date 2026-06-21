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

# Absolute bases for links embedded in emails (CTA → site, pixel/unsubscribe → API).
PUBLIC_SITE_URL = os.getenv("PUBLIC_SITE_URL", "https://www.topstockbd.com").rstrip("/")
PUBLIC_API_BASE_URL = os.getenv("PUBLIC_API_BASE_URL", "https://dsex.onrender.com").rstrip("/")
