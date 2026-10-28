"""Request limits — the one place that decides who is sending too much.

Every API request is counted against a token bucket (2026-10-28): a reader
signed in counts against their account, anyone else against their IP address,
and every request also counts against an IP-wide ceiling. Phone networks here
put many readers behind one address (carrier NAT), so the per-IP numbers are
generous; the tight ones sit on the endpoints a script would hammer (sign in,
sign up, the screener run, the recommendation engine) and on the ones that
write something (feedback, stock visits, push tests, payments).

In-process, per worker (Render runs one). Each limiter is a bounded LRU, so a
flood from many addresses can't grow memory without end — an evicted key just
starts again with a full bucket.

Not limited: CORS preflights, /health, and requests that carry the shared
`REVALIDATE_SECRET` — the frontend's own server-side fetches (`x-internal-key`,
`lib/api.ts:apiFetch`) and the scrape hooks (`x-revalidate-secret`). Without
that, an ISR rebuild after a purge would come from a few Vercel addresses and
trip the per-IP limits.
"""
from __future__ import annotations

import hmac
import json
import logging
import math
import os
import re
import threading
import time
from collections import OrderedDict
from dataclasses import dataclass
from typing import Optional


class RateLimiter:
    """Token bucket per key: `per_minute` refill, up to `burst` at once."""

    def __init__(self, per_minute: float, burst: Optional[float] = None, max_keys: int = 20_000):
        self.rate = per_minute / 60.0
        self.capacity = float(burst if burst is not None else per_minute)
        self.max_keys = max_keys
        self._buckets: "OrderedDict[str, tuple[float, float]]" = OrderedDict()
        self._lock = threading.Lock()

    def _level(self, key: str, now: float) -> float:
        tokens, last = self._buckets.get(key, (self.capacity, now))
        return min(self.capacity, tokens + (now - last) * self.rate)

    def hit(self, key: str, now: Optional[float] = None) -> float:
        """Take one token. Returns 0 when allowed, else the seconds to wait."""
        now = time.monotonic() if now is None else now
        with self._lock:
            tokens = self._level(key, now)
            if tokens >= 1.0:
                self._buckets[key] = (tokens - 1.0, now)
                wait = 0.0
            else:
                self._buckets[key] = (tokens, now)
                wait = (1.0 - tokens) / self.rate if self.rate > 0 else 3600.0
            self._buckets.move_to_end(key)
            while len(self._buckets) > self.max_keys:
                self._buckets.popitem(last=False)
            return wait

    def blocked(self, key: str, now: Optional[float] = None) -> float:
        """Like `hit` but takes nothing: 0 when a token is there, else the wait."""
        now = time.monotonic() if now is None else now
        with self._lock:
            if key not in self._buckets:
                return 0.0
            tokens = self._level(key, now)
            return 0.0 if tokens >= 1.0 else (1.0 - tokens) / self.rate

    def clear(self) -> None:
        with self._lock:
            self._buckets.clear()


class SeenRecently:
    """Bounded "have we seen this key in the last `ttl` seconds" set."""

    def __init__(self, ttl_seconds: float, max_keys: int = 50_000):
        self.ttl = ttl_seconds
        self.max_keys = max_keys
        self._seen: "OrderedDict[str, float]" = OrderedDict()
        self._lock = threading.Lock()

    def check_and_add(self, key: str, now: Optional[float] = None) -> bool:
        """True if `key` was seen within the ttl; records it either way."""
        now = time.monotonic() if now is None else now
        with self._lock:
            at = self._seen.get(key)
            fresh = at is not None and now - at < self.ttl
            if not fresh:
                self._seen[key] = now
                self._seen.move_to_end(key)
                while len(self._seen) > self.max_keys:
                    self._seen.popitem(last=False)
            return fresh


# ---------------------------------------------------------------------------
# Rules
# ---------------------------------------------------------------------------

@dataclass
class Rule:
    """A limit on the requests whose method + path match. `by_ip`: always count
    per address (sign in / sign up, where there is no account yet)."""
    name: str
    methods: frozenset
    pattern: re.Pattern
    limiter: RateLimiter
    by_ip: bool = False

    def matches(self, method: str, path: str) -> bool:
        return method in self.methods and bool(self.pattern.match(path))


def _rule(name, methods, pattern, per_minute, burst, by_ip=False, max_keys=5_000) -> Rule:
    return Rule(name, frozenset(methods.split()), re.compile(pattern),
                RateLimiter(per_minute, burst, max_keys), by_ip)


PER_HOUR = 1 / 60  # per_minute multiplier for "N an hour"

RULES: list[Rule] = [
    # No account yet, so per address. Brute force on one account is also
    # capped in the login route itself (LOGIN_FAILURES).
    _rule("login", "POST", r"^/api/auth/login$", 20, 10, by_ip=True),
    _rule("register", "POST", r"^/api/auth/register$", 30 * PER_HOUR, 10, by_ip=True),
    _rule("google", "POST", r"^/api/auth/google$", 30, 15, by_ip=True),
    # Expensive public compute.
    _rule("screener-run", "POST", r"^/api/custom-lists/run$", 30, 15),
    _rule("recommend", "POST", r"^/api/recommendations$", 20, 10),
    _rule("glance", "GET", r"^/api/watchlist/glance$", 30, 15),
    _rule("news-multi", "GET", r"^/api/news/multi$", 30, 15),
    _rule("prices", "GET", r"^/api/company/[^/]+/prices$", 60, 30),
    # Writes.
    _rule("stock-visit", "POST", r"^/api/stock-visit/", 60, 30, by_ip=True),
    _rule("feedback", "POST", r"^/api/feedback", 10 * PER_HOUR, 5, by_ip=True),
    _rule("push-test", "POST", r"^/api/notifications/test$", 6 * PER_HOUR, 3),
    _rule("push-subscribe", "POST", r"^/api/notifications/subscribe$", 20 * PER_HOUR, 10),
    _rule("payment", "POST", r"^/api/user/premium/payments$", 10 * PER_HOUR, 5),
    _rule("refresh", "POST", r"^/api/scores/refresh$", 10, 5, by_ip=True),
]

# Every request: per account when signed in, else per address; plus one
# ceiling per address for everything (many accounts on one address).
GLOBAL_ANON = RateLimiter(per_minute=300, burst=120)
GLOBAL_USER = RateLimiter(per_minute=240, burst=120)
IP_CEILING = RateLimiter(per_minute=1200, burst=400)

# Wrong passwords per account, checked in the login route: 10 in 15 minutes.
LOGIN_FAILURES = RateLimiter(per_minute=10 / 15, burst=10, max_keys=20_000)

# One counted visit per address per stock per 6 hours (the "popular" list).
STOCK_VISITS_SEEN = SeenRecently(ttl_seconds=6 * 3600)

EXEMPT_PATHS = frozenset({"/health", "/", "/docs", "/openapi.json"})

# Request bodies: nothing in the API needs more than a few KB; unbounded, one
# request could make the worker hold a body of any size in memory.
MAX_BODY_BYTES = 64 * 1024


def all_limiters() -> list[RateLimiter]:
    return [GLOBAL_ANON, GLOBAL_USER, IP_CEILING, LOGIN_FAILURES] + [r.limiter for r in RULES]


# ---------------------------------------------------------------------------
# Who is asking
# ---------------------------------------------------------------------------

def client_ip(headers: dict, peer: Optional[str]) -> str:
    """The reader's address. Render sits behind Cloudflare, which sets
    CF-Connecting-IP / True-Client-IP itself (a client can't forge them past
    Cloudflare); X-Forwarded-For's first entry is a fallback, then the peer."""
    for name in ("cf-connecting-ip", "true-client-ip"):
        v = (headers.get(name) or "").strip()
        if v:
            return v
    xff = headers.get("x-forwarded-for") or ""
    first = xff.split(",")[0].strip()
    return first or peer or "unknown"


def is_internal(headers: dict) -> bool:
    """A request from the site's own server (Next.js ISR fetches, scrape hooks)."""
    secret = os.getenv("REVALIDATE_SECRET") or ""
    if not secret:
        return False
    for name in ("x-internal-key", "x-revalidate-secret"):
        v = headers.get(name)
        if v and hmac.compare_digest(v.encode(), secret.encode()):
            return True
    return False


def user_id_from(headers: dict) -> Optional[str]:
    """The account behind a valid Bearer token, else None (no DB read)."""
    auth = headers.get("authorization") or ""
    if not auth.lower().startswith("bearer "):
        return None
    from backend.services.auth_service import decode_access_token

    return decode_access_token(auth[7:].strip())


def check(method: str, path: str, ip: str, user_id: Optional[str]) -> tuple[Optional[str], float]:
    """(rule name, seconds to wait) for the first limit this request breaks,
    else (None, 0). Every applicable bucket is charged, specific rule first."""
    for rule in RULES:
        if rule.matches(method, path):
            key = f"ip:{ip}" if (rule.by_ip or not user_id) else f"user:{user_id}"
            wait = rule.limiter.hit(key)
            if wait > 0:
                return rule.name, wait
            break
    wait = IP_CEILING.hit(f"ip:{ip}")
    if wait > 0:
        return "ip", wait
    if user_id:
        wait = GLOBAL_USER.hit(f"user:{user_id}")
    else:
        wait = GLOBAL_ANON.hit(f"ip:{ip}")
    if wait > 0:
        return "global", wait
    return None, 0.0


def retry_after(wait: float) -> str:
    return str(max(1, math.ceil(wait)))


# ---------------------------------------------------------------------------
# ASGI middleware
# ---------------------------------------------------------------------------

logger = logging.getLogger("rate_limit")
_LOGGED = SeenRecently(ttl_seconds=60, max_keys=5_000)


class BodyTooLarge(Exception):
    """Raised mid-read; FastAPI turns a body-read error into a 400."""


def _capped(receive, limit: int):
    seen = 0

    async def wrapped():
        nonlocal seen
        message = await receive()
        if message.get("type") == "http.request":
            seen += len(message.get("body") or b"")
            if seen > limit:
                raise BodyTooLarge()
        return message

    return wrapped


async def _send_json(send, status: int, body: dict, extra: Optional[dict] = None) -> None:
    data = json.dumps(body).encode()
    headers = [(b"content-type", b"application/json"), (b"content-length", str(len(data)).encode())]
    for k, v in (extra or {}).items():
        headers.append((k.encode(), v.encode()))
    await send({"type": "http.response.start", "status": status, "headers": headers})
    await send({"type": "http.response.body", "body": data})


class RateLimitMiddleware:
    """Body-size cap + the limits above. Registered INSIDE CORSMiddleware
    (`backend/main.py` adds it first), so a 429 still carries the CORS headers —
    without them the browser reports "Failed to fetch" instead of the 429."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        method = scope["method"]
        path = scope["path"]
        headers = {k.decode("latin-1").lower(): v.decode("latin-1") for k, v in scope.get("headers") or []}

        if method in ("POST", "PUT", "PATCH", "DELETE"):
            length = headers.get("content-length") or ""
            if length.isdigit() and int(length) > MAX_BODY_BYTES:
                await _send_json(send, 413, {"detail": "body_too_large"})
                return
            receive = _capped(receive, MAX_BODY_BYTES)

        if method == "OPTIONS" or path in EXEMPT_PATHS or is_internal(headers):
            await self.app(scope, receive, send)
            return

        ip = client_ip(headers, (scope.get("client") or (None,))[0])
        rule, wait = check(method, path, ip, user_id_from(headers))
        if rule:
            if not _LOGGED.check_and_add(f"{rule}:{ip}"):
                logger.warning("rate limited: %s %s from %s (%s)", method, path, ip, rule)
            await _send_json(send, 429, {"detail": "Too many requests. Please wait a moment and try again."},
                             {"retry-after": retry_after(wait)})
            return
        await self.app(scope, receive, send)
