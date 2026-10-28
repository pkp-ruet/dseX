"""Login tokens vs email-link tokens, and password checks (pure, no DB)."""
from datetime import datetime, timedelta, timezone

from jose import jwt

from backend.config import JWT_ALGORITHM, JWT_SECRET
from backend.services.auth_service import (
    create_access_token,
    decode_access_claims,
    decode_access_token,
    hash_password,
    token_revoked,
    verify_password,
)
from backend.services.email_service import sign_email_token


def test_login_token_round_trip():
    token = create_access_token("u1")
    claims = decode_access_claims(token)
    assert claims["sub"] == "u1" and claims["typ"] == "access"
    assert decode_access_token(token) == "u1"


def test_email_link_tokens_are_not_logins():
    # Unsubscribe / open-pixel tokens share the key but must never log anyone in.
    for purpose in ("unsub", "open"):
        assert decode_access_token(sign_email_token("u1", purpose, "camp-1")) is None


def test_token_without_expiry_is_rejected():
    forever = jwt.encode({"sub": "u1"}, JWT_SECRET, algorithm=JWT_ALGORITHM)
    assert decode_access_token(forever) is None


def test_older_login_tokens_without_typ_still_work():
    now = datetime.now(timezone.utc)
    legacy = jwt.encode({"sub": "u1", "iat": now, "exp": now + timedelta(days=1)},
                        JWT_SECRET, algorithm=JWT_ALGORITHM)
    assert decode_access_token(legacy) == "u1"
    other = jwt.encode({"sub": "u1", "typ": "refresh", "exp": now + timedelta(days=1)},
                       JWT_SECRET, algorithm=JWT_ALGORITHM)
    assert decode_access_token(other) is None


def test_token_revoked_by_cutoff():
    claims = decode_access_claims(create_access_token("u1"))
    later = datetime.now(timezone.utc) + timedelta(minutes=5)
    earlier = datetime.now(timezone.utc) - timedelta(minutes=5)
    assert token_revoked(claims, {"tokens_valid_after": later})
    assert not token_revoked(claims, {"tokens_valid_after": earlier})
    assert not token_revoked(claims, {"tokens_valid_after": earlier.replace(tzinfo=None)})
    assert not token_revoked(claims, {})


def test_verify_password_without_a_hash():
    # Google-only accounts have no hash; bcrypt used to raise -> 500 on /login.
    assert verify_password("x", None) is False
    assert verify_password("x", "") is False
    assert verify_password("x", "not-a-bcrypt-hash") is False
    h = hash_password("secret")
    assert verify_password("secret", h) and not verify_password("nope", h)
