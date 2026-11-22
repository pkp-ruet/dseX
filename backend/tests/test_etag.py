"""ETag / 304 middleware (backend/services/etag.py)."""
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.testclient import TestClient

from backend.services.etag import ETagMiddleware, etag_matches, make_etag

STATE = {"n": 1}


def _app() -> FastAPI:
    app = FastAPI()
    app.add_middleware(ETagMiddleware)
    app.add_middleware(CORSMiddleware, allow_origins=["https://www.topstockbd.com"])

    @app.get("/data")
    def data(response: Response):
        response.headers["Cache-Control"] = "public, max-age=300"
        return {"n": STATE["n"], "rows": list(range(50))}

    @app.post("/data")
    def post():
        return {"ok": True}

    @app.get("/nostore")
    def nostore():
        return JSONResponse({"x": 1}, headers={"Cache-Control": "no-store"})

    @app.get("/missing")
    def missing():
        return JSONResponse({"detail": "no"}, status_code=404)

    @app.get("/stream")
    def stream():
        return StreamingResponse(iter([b"ab", b"cd"]), media_type="text/plain")

    return app


client = TestClient(_app())


def test_first_reply_carries_a_weak_etag():
    STATE["n"] = 1
    r = client.get("/data")
    assert r.status_code == 200
    assert r.headers["etag"].startswith('W/"')
    assert r.headers["etag"] == make_etag(r.content)
    assert r.json()["n"] == 1


def test_same_body_gets_an_empty_304_with_its_headers():
    STATE["n"] = 1
    tag = client.get("/data").headers["etag"]
    r = client.get("/data", headers={"If-None-Match": tag, "Origin": "https://www.topstockbd.com"})
    assert r.status_code == 304
    assert r.content == b""
    assert r.headers["etag"] == tag
    assert r.headers["cache-control"] == "public, max-age=300"
    assert "content-type" not in r.headers
    # CORS sits outside the middleware, so the 304 keeps its CORS headers.
    assert r.headers["access-control-allow-origin"] == "https://www.topstockbd.com"


def test_changed_body_gets_the_full_reply():
    STATE["n"] = 1
    tag = client.get("/data").headers["etag"]
    STATE["n"] = 2
    r = client.get("/data", headers={"If-None-Match": tag})
    assert r.status_code == 200
    assert r.json()["n"] == 2
    assert r.headers["etag"] != tag


def test_strong_form_of_the_tag_still_matches():
    # Cloudflare may hand the tag back without the W/ prefix.
    STATE["n"] = 1
    tag = client.get("/data").headers["etag"]
    r = client.get("/data", headers={"If-None-Match": f'"zzz", {tag[2:]}'})
    assert r.status_code == 304


def test_left_alone():
    assert "etag" not in client.post("/data").headers
    assert "etag" not in client.get("/nostore").headers
    r = client.get("/missing")
    assert r.status_code == 404 and "etag" not in r.headers


def test_streamed_body_is_tagged_whole():
    r = client.get("/stream")
    assert r.content == b"abcd"
    assert r.headers["etag"] == make_etag(b"abcd")


def test_etag_matches():
    tag = 'W/"abc"'
    assert etag_matches('W/"abc"', tag)
    assert etag_matches('"abc"', tag)
    assert etag_matches('"x", W/"abc"', tag)
    assert etag_matches("*", tag)
    assert not etag_matches('"abd"', tag)
    assert not etag_matches(None, tag)
    assert not etag_matches("", tag)
