"""Adding / changing a password from the profile (pure, no DB: a fake users
collection stands in)."""
from datetime import datetime, timedelta, timezone

import pytest

from backend.services import auth_service
from backend.services.auth_service import (
    create_access_token,
    decode_access_claims,
    google_confirm_fresh,
    hash_password,
    password_change_check,
    sanitize_user,
    set_user_password,
    token_revoked,
    verify_password,
)


# ---------------------------------------------------------------------------
# Who may set a password
# ---------------------------------------------------------------------------

def test_google_only_account_needs_its_own_google_confirm():
    assert password_change_check(False, "g1", current_ok=False, google_sub=None) == "confirm_google"
    assert password_change_check(False, "g1", current_ok=False, google_sub="g1") is None
    assert password_change_check(False, "g1", current_ok=False, google_sub="g2") == "google_mismatch"


def test_password_account_needs_the_current_password():
    assert password_change_check(True, None, current_ok=False, google_sub=None) == "current_password"
    assert password_change_check(True, None, current_ok=True, google_sub=None) is None
    # A Google confirm proves nothing for an account with no Google link.
    assert password_change_check(True, None, current_ok=False, google_sub="g1") == "google_mismatch"


def test_google_linked_account_may_use_google_instead_of_a_forgotten_password():
    assert password_change_check(True, "g1", current_ok=False, google_sub="g1") is None
    assert password_change_check(True, "g1", current_ok=False, google_sub=None) == "current_password"


def test_google_confirm_must_be_fresh():
    now = datetime(2026, 11, 23, 12, 0, tzinfo=timezone.utc)
    at = lambda d: {"iat": (now - d).timestamp()}  # noqa: E731
    assert google_confirm_fresh(at(timedelta(minutes=2)), now)
    assert not google_confirm_fresh(at(timedelta(minutes=30)), now)
    assert not google_confirm_fresh(at(-timedelta(minutes=5)), now)  # from the future
    assert not google_confirm_fresh({}, now)


def test_sanitize_says_whether_a_raw_document_has_a_password():
    assert sanitize_user({"user_id": "u", "password_hash": "x"})["has_password"] is True
    assert sanitize_user({"user_id": "u", "password_hash": None})["has_password"] is False
    # The session read leaves the hash out: unknown, so no flag.
    assert "has_password" not in sanitize_user({"user_id": "u"})
    assert "password_hash" not in sanitize_user({"user_id": "u", "password_hash": "x"})


# ---------------------------------------------------------------------------
# Saving it
# ---------------------------------------------------------------------------

class _FakeUsers:
    def __init__(self, doc):
        self.doc = doc

    def find_one(self, query, projection=None):
        return dict(self.doc) if query.get("user_id") == self.doc["user_id"] else None

    def update_one(self, query, op):
        assert query == {"user_id": self.doc["user_id"]}
        self.doc.update(op.get("$set", {}))


@pytest.fixture
def users(monkeypatch):
    def make(doc):
        fake = _FakeUsers({"user_id": "u1", "is_active": True, **doc})
        monkeypatch.setattr(auth_service, "_users", lambda: fake)
        monkeypatch.setattr(auth_service.user_cache, "invalidate_user", lambda uid: None)
        return fake
    return make


def test_google_only_account_adds_a_password(users):
    fake = users({"google_id": "g1"})
    assert set_user_password("u1", "new-secret-1", google_sub="g1") is False
    assert verify_password("new-secret-1", fake.doc["password_hash"])
    # Adding one signs nobody out.
    assert "tokens_valid_after" not in fake.doc


def test_google_only_account_without_confirm_is_refused(users):
    fake = users({"google_id": "g1"})
    with pytest.raises(ValueError, match="confirm_google"):
        set_user_password("u1", "new-secret-1")
    with pytest.raises(ValueError, match="google_mismatch"):
        set_user_password("u1", "new-secret-1", google_sub="someone-else")
    assert "password_hash" not in fake.doc


def test_changing_a_password_signs_out_other_devices_but_not_this_one(users):
    fake = users({"password_hash": hash_password("old-secret")})
    with pytest.raises(ValueError, match="current_password"):
        set_user_password("u1", "new-secret-1", current_password="wrong")
    old_token = create_access_token("u1")
    # Tokens carry whole seconds; make the old one clearly earlier.
    old_claims = {**decode_access_claims(old_token), "iat": datetime.now(timezone.utc).timestamp() - 5}

    assert set_user_password("u1", "new-secret-1", current_password="old-secret") is True
    assert verify_password("new-secret-1", fake.doc["password_hash"])
    assert token_revoked(old_claims, fake.doc)
    fresh = decode_access_claims(create_access_token("u1"))
    assert not token_revoked(fresh, fake.doc)


def test_inactive_account_is_refused(users):
    users({"google_id": "g1", "is_active": False})
    with pytest.raises(ValueError, match="no_account"):
        set_user_password("u1", "new-secret-1", google_sub="g1")
