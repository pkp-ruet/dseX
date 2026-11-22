"""
"Nothing changed" replies (ETag / 304) for GET responses.

Render bills every byte the backend sends. Browsers fetch some large replies
straight from Render (`/api/scores` is ~267 KB raw on the signed-in home,
portfolio, watchlist …) and, once their copy is stale, download the whole
thing again even when it hasn't changed. With an ETag on the reply the browser
asks "is it still this one?" (`If-None-Match`) and gets an empty 304 instead.

Nothing about freshness changes: the reply is built exactly as before and the
tag is a hash of its bytes, so a 304 only ever goes out when the client already
holds those same bytes. Personal replies are safe for the same reason (a client
can only match a body it was sent). The tag is weak (`W/"…"`) because Render's
Cloudflare edge re-compresses replies, and Cloudflare drops strong ETags on a
body it compresses.

Pure ASGI, registered innermost in `backend/main.py` so CORS still adds its
headers to a 304.
"""
from __future__ import annotations

import hashlib

# Replies bigger than this pass through untagged (none come close today).
MAX_BUFFER_BYTES = 16 * 1024 * 1024

# Headers a 304 must not carry (RFC 9110 §15.4.5: it describes the stored body).
_DROP_ON_304 = {b"content-length", b"content-type", b"content-encoding"}


def make_etag(body: bytes) -> str:
    return 'W/"' + hashlib.blake2b(body, digest_size=16).hexdigest() + '"'


def _opaque(tag: str) -> str:
    tag = tag.strip()
    return tag[2:] if tag.startswith(("W/", "w/")) else tag


def etag_matches(if_none_match: str | None, etag: str) -> bool:
    """Weak comparison, as If-None-Match requires: `W/"x"` matches `"x"`."""
    if not if_none_match:
        return False
    want = _opaque(etag)
    for part in if_none_match.split(","):
        part = part.strip()
        if part == "*" or (part and _opaque(part) == want):
            return True
    return False


def _header(headers, name: bytes) -> bytes | None:
    for k, v in headers:
        if k.lower() == name:
            return v
    return None


class ETagMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope.get("method") != "GET":
            await self.app(scope, receive, send)
            return

        inm_raw = _header(scope.get("headers") or [], b"if-none-match")
        if_none_match = inm_raw.decode("latin-1") if inm_raw else None

        start: dict | None = None
        chunks: list[bytes] = []
        size = 0
        passthrough = False

        async def flush_held():
            nonlocal start
            if start is not None:
                await send(start)
                start = None
            for c in chunks:
                await send({"type": "http.response.body", "body": c, "more_body": True})
            chunks.clear()

        async def wrapped_send(message):
            nonlocal start, size, passthrough
            if passthrough:
                await send(message)
                return

            if message["type"] == "http.response.start":
                headers = message.get("headers") or []
                cache = (_header(headers, b"cache-control") or b"").lower()
                if (
                    message.get("status") != 200
                    or b"no-store" in cache
                    or _header(headers, b"etag") is not None
                    or _header(headers, b"content-encoding") is not None
                ):
                    passthrough = True
                    await send(message)
                    return
                start = message
                return

            if message["type"] != "http.response.body":
                await send(message)
                return

            body = message.get("body", b"") or b""
            more = message.get("more_body", False)
            chunks.append(body)
            size += len(body)

            if size > MAX_BUFFER_BYTES:
                passthrough = True
                await flush_held()
                if not more:
                    await send({"type": "http.response.body", "body": b"", "more_body": False})
                return
            if more:
                return

            full = b"".join(chunks)
            chunks.clear()
            tag = make_etag(full)
            assert start is not None
            headers = list(start.get("headers") or [])

            if etag_matches(if_none_match, tag):
                kept = [(k, v) for k, v in headers if k.lower() not in _DROP_ON_304]
                kept.append((b"etag", tag.encode("latin-1")))
                await send({"type": "http.response.start", "status": 304, "headers": kept})
                await send({"type": "http.response.body", "body": b"", "more_body": False})
                return

            headers.append((b"etag", tag.encode("latin-1")))
            await send({**start, "headers": headers})
            await send({"type": "http.response.body", "body": full, "more_body": False})

        await self.app(scope, receive, wrapped_send)
