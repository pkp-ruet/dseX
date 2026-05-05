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
