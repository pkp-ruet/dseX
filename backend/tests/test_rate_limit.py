"""Request limits (backend/services/rate_limit.py) — pure, no DB, no server."""
import asyncio

import pytest
from fastapi.middleware.cors import CORSMiddleware

from backend.services import rate_limit as rl
from backend.services.auth_service import create_access_token


@pytest.fixture(autouse=True)
def fresh_buckets(monkeypatch):
    for limiter in rl.all_limiters():
        limiter.clear()
    monkeypatch.setenv("REVALIDATE_SECRET", "s3cret")
    yield


def test_bucket_allows_burst_then_waits_then_refills():
    lim = rl.RateLimiter(per_minute=60, burst=3)
    assert [lim.hit("k", now=0) for _ in range(3)] == [0, 0, 0]
    wait = lim.hit("k", now=0)
    assert 0.9 < wait <= 1.0                       # one token a second
    assert lim.hit("k", now=1.5) == 0              # refilled
    assert lim.hit("other", now=0) == 0            # keys are separate


def test_bucket_memory_is_bounded():
    lim = rl.RateLimiter(per_minute=60, burst=1, max_keys=100)
    for i in range(1_000):
        lim.hit(f"ip:{i}", now=0)
    assert len(lim._buckets) == 100


def test_blocked_does_not_take_a_token():
    lim = rl.RateLimiter(per_minute=1, burst=2)
    assert lim.blocked("acct", now=0) == 0
    lim.hit("acct", now=0)
    lim.hit("acct", now=0)
    assert lim.blocked("acct", now=0) > 0
    assert lim.blocked("acct", now=0) > 0          # still blocked, nothing taken


def test_seen_recently():
    seen = rl.SeenRecently(ttl_seconds=10)
    assert not seen.check_and_add("1.2.3.4:GP", now=0)
    assert seen.check_and_add("1.2.3.4:GP", now=5)
    assert not seen.check_and_add("1.2.3.4:GP", now=11)


def test_client_ip_prefers_cloudflare_header():
    assert rl.client_ip({"cf-connecting-ip": "9.9.9.9", "x-forwarded-for": "1.1.1.1"}, "10.0.0.1") == "9.9.9.9"
    assert rl.client_ip({"x-forwarded-for": "1.1.1.1, 10.0.0.2"}, "10.0.0.1") == "1.1.1.1"
    assert rl.client_ip({}, "10.0.0.1") == "10.0.0.1"


def test_login_is_limited_per_address_even_when_signed_in():
    token_user = "u1"
    for _ in range(10):
        assert rl.check("POST", "/api/auth/login", "5.5.5.5", token_user)[0] is None
    rule, wait = rl.check("POST", "/api/auth/login", "5.5.5.5", token_user)
    assert rule == "login" and wait > 0
    assert rl.check("POST", "/api/auth/login", "6.6.6.6", None)[0] is None


def test_signed_in_readers_count_per_account():
    # Two readers behind one carrier address don't share the per-account budget.
    for _ in range(120):
        assert rl.check("GET", "/api/user/home", "7.7.7.7", "a")[0] is None
    assert rl.check("GET", "/api/user/home", "7.7.7.7", "a")[0] == "global"
    assert rl.check("GET", "/api/user/home", "7.7.7.7", "b")[0] is None


# --- middleware --------------------------------------------------------------

async def _ok_app(scope, receive, send):
    while (await receive()).get("more_body"):
        pass
    await send({"type": "http.response.start", "status": 200, "headers": []})
    await send({"type": "http.response.body", "body": b"ok"})


def _call(app, method="GET", path="/api/scores", headers=None, body=b""):
    hdrs = [(k.encode(), v.encode()) for k, v in (headers or {}).items()]
    scope = {"type": "http", "method": method, "path": path, "headers": hdrs,
             "client": ("8.8.8.8", 1234), "query_string": b"", "scheme": "https",
             "server": ("api", 443), "root_path": "", "http_version": "1.1"}
    sent = []

    async def receive():
        return {"type": "http.request", "body": body, "more_body": False}

    async def send(msg):
        sent.append(msg)

    asyncio.run(app(scope, receive, send))
    start = next(m for m in sent if m["type"] == "http.response.start")
    return start["status"], {k.decode(): v.decode() for k, v in start["headers"]}


def test_middleware_returns_429_with_cors_headers():
    # Same order as backend/main.py: CORS outside, the limiter inside.
    app = CORSMiddleware(rl.RateLimitMiddleware(_ok_app),
                         allow_origins=["https://www.topstockbd.com"], allow_methods=["*"], allow_headers=["*"])
    origin = {"origin": "https://www.topstockbd.com"}
    statuses = [_call(app, "POST", "/api/recommendations", origin)[0] for _ in range(11)]
    assert statuses[:10] == [200] * 10
    status, headers = _call(app, "POST", "/api/recommendations", origin)
    assert status == 429
    assert headers.get("access-control-allow-origin") == "https://www.topstockbd.com"
    assert int(headers["retry-after"]) >= 1


def test_frontend_server_is_not_limited():
    app = rl.RateLimitMiddleware(_ok_app)
    for _ in range(50):
        assert _call(app, "POST", "/api/recommendations", {"x-internal-key": "s3cret"})[0] == 200
    assert _call(app, "POST", "/api/recommendations", {"x-internal-key": "wrong"})[0] == 200
    for _ in range(15):
        _call(app, "POST", "/api/recommendations", {"x-internal-key": "wrong"})
    assert _call(app, "POST", "/api/recommendations", {"x-internal-key": "wrong"})[0] == 429


def test_signed_in_requests_use_the_account_bucket():
    app = rl.RateLimitMiddleware(_ok_app)
    auth = {"authorization": f"Bearer {create_access_token('reader-1')}"}
    for _ in range(10):
        assert _call(app, "POST", "/api/recommendations", auth)[0] == 200
    assert _call(app, "POST", "/api/recommendations", auth)[0] == 429
    assert _call(app, "POST", "/api/recommendations")[0] == 200   # anonymous, same IP: own bucket


def test_body_size_cap():
    app = rl.RateLimitMiddleware(_ok_app)
    big = str(rl.MAX_BODY_BYTES + 1)
    assert _call(app, "PATCH", "/api/user/profile", {"content-length": big})[0] == 413
    with pytest.raises(rl.BodyTooLarge):
        _call(app, "POST", "/api/feedback", body=b"x" * (rl.MAX_BODY_BYTES + 1))


def test_preflight_and_health_are_never_limited():
    app = rl.RateLimitMiddleware(_ok_app)
    for _ in range(500):
        assert _call(app, "OPTIONS", "/api/auth/login")[0] == 200
    assert _call(app, "GET", "/health")[0] == 200


def test_push_endpoints_must_be_browser_push_services():
    from backend.services.push_service import is_push_service

    assert is_push_service("https://fcm.googleapis.com/fcm/send/abc")
    assert is_push_service("https://updates.push.services.mozilla.com/wpush/v2/x")
    assert is_push_service("https://wns2-sg2p.notify.windows.com/w/?token=x")
    assert is_push_service("https://web.push.apple.com/QGx")
    assert not is_push_service("http://fcm.googleapis.com/fcm/send/abc")       # not https
    assert not is_push_service("https://169.254.169.254/latest/meta-data")      # internal
    assert not is_push_service("https://evil.example/fcm.googleapis.com")
    assert not is_push_service("https://fcm.googleapis.com.evil.example/x")
    assert not is_push_service("https://notify.windows.com.evil.example/x")
