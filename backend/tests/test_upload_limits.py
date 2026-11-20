# backend/tests/test_upload_limits.py
#
# WHAT: Tests for UploadSizeLimitMiddleware at the ASGI level. A small
#   stand-in app reads the whole body the way FastAPI's form parser does,
#   so each test controls exactly which headers and body chunks arrive —
#   including uploads with no Content-Length or a false one.

import asyncio
import json

from upload_limits import UploadSizeLimitMiddleware

LIMIT = 1000


async def read_whole_body_then_ok(scope, receive, send):
    """Stand-in app: reads the entire body, like FastAPI parsing a form, then answers 200."""
    while True:
        message = await receive()
        if not message.get("more_body", False):
            break
    await send({"type": "http.response.start", "status": 200, "headers": []})
    await send({"type": "http.response.body", "body": b"ok"})


async def read_body_but_answer_its_own_error(scope, receive, send):
    """Stand-in app that turns a failed body read into its own 400, as FastAPI does."""
    try:
        await read_whole_body_then_ok(scope, receive, send)
    except Exception:
        await send({"type": "http.response.start", "status": 400, "headers": []})
        await send({"type": "http.response.body", "body": b"parse error"})


def run(app, chunks, headers=(), path="/classify"):
    """Sends one request through the middleware; returns (statuses sent, response body)."""
    middleware = UploadSizeLimitMiddleware(
        app, paths={"/classify"}, max_body_bytes=LIMIT, message="Too big."
    )
    incoming = [
        {"type": "http.request", "body": chunk, "more_body": index < len(chunks) - 1}
        for index, chunk in enumerate(chunks)
    ]
    sent = []

    async def receive():
        return incoming.pop(0) if incoming else {"type": "http.disconnect"}

    async def send(message):
        sent.append(message)

    scope = {"type": "http", "method": "POST", "path": path, "headers": list(headers)}
    asyncio.run(middleware(scope, receive, send))

    statuses = [m["status"] for m in sent if m["type"] == "http.response.start"]
    body = b"".join(m.get("body", b"") for m in sent if m["type"] == "http.response.body")
    return statuses, body


def test_body_within_limit_passes_through():
    statuses, body = run(read_whole_body_then_ok, [b"x" * 400, b"x" * 400])

    assert statuses == [200]
    assert body == b"ok"


def test_oversized_body_without_content_length_is_refused():
    statuses, body = run(read_whole_body_then_ok, [b"x" * 400] * 4)

    assert statuses == [413]
    assert json.loads(body)["error"]["code"] == "file_too_large"


def test_false_content_length_does_not_bypass_the_limit():
    statuses, _ = run(
        read_whole_body_then_ok, [b"x" * 400] * 4, headers=[(b"content-length", b"10")]
    )

    assert statuses == [413]


def test_declared_oversized_body_is_refused_without_calling_the_app():
    called = []

    async def app(scope, receive, send):
        called.append(True)
        await read_whole_body_then_ok(scope, receive, send)

    statuses, _ = run(app, [b"x"], headers=[(b"content-length", b"5000")])

    assert statuses == [413]
    assert called == []


def test_apps_own_error_is_replaced_by_a_single_413():
    statuses, body = run(read_body_but_answer_its_own_error, [b"x" * 400] * 4)

    assert statuses == [413]
    assert b"parse error" not in body


def test_other_paths_are_not_limited():
    statuses, _ = run(read_whole_body_then_ok, [b"x" * 400] * 4, path="/health")

    assert statuses == [200]
