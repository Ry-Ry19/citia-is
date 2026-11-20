# backend/upload_limits.py
#
# WHAT: A hard cap on the size of request bodies sent to upload
#   endpoints such as POST /classify.
#
# WHY A MIDDLEWARE: FastAPI reads and parses the entire multipart body
#   (`await request.form()`) BEFORE the endpoint function runs, and
#   Starlette writes uploaded files to a temporary file with no size
#   limit of its own. A size check inside the endpoint therefore comes
#   too late: the whole upload has already been received. This
#   middleware sits in front of FastAPI and counts the bytes as they
#   arrive.
#
# TWO CHECKS:
#   1. A declared Content-Length above the limit is refused at once,
#      before any of the body is read.
#   2. The body is ALSO counted while it streams in, because
#      Content-Length can be missing (chunked uploads) or untrue. The
#      moment the count passes the limit, reading stops and the client
#      receives 413 instead of whatever the app would have answered.
#
# "PURE ASGI": this class wraps the low-level receive/send functions
#   directly, which is what makes counting the body possible.

from collections.abc import Iterable

from starlette.types import ASGIApp, Message, Receive, Scope, Send

from errors import error_response


class BodyTooLarge(Exception):
    """Raised to the app when the request body passes the limit."""


def declared_content_length(scope: Scope) -> int | None:
    for name, value in scope["headers"]:
        if name == b"content-length":
            return int(value) if value.isdigit() else None
    return None


class UploadSizeLimitMiddleware:
    def __init__(
        self,
        app: ASGIApp,
        *,
        paths: Iterable[str],
        max_body_bytes: int,
        message: str,
    ) -> None:
        self.app = app
        self.paths = frozenset(paths)
        self.max_body_bytes = max_body_bytes
        self.message = message

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope["path"] not in self.paths:
            await self.app(scope, receive, send)
            return

        too_large = error_response(413, "file_too_large", self.message)

        # Check 1: the declared size.
        declared = declared_content_length(scope)
        if declared is not None and declared > self.max_body_bytes:
            await too_large(scope, receive, send)
            return

        # Check 2: the real size, counted as the body arrives.
        received_bytes = 0
        exceeded = False
        response_started = False

        async def counting_receive() -> Message:
            nonlocal received_bytes, exceeded
            if exceeded:
                raise BodyTooLarge()
            message = await receive()
            if message["type"] == "http.request":
                received_bytes += len(message.get("body", b""))
                if received_bytes > self.max_body_bytes:
                    exceeded = True
                    raise BodyTooLarge()
            return message

        async def guarded_send(message: Message) -> None:
            nonlocal response_started
            # Once the limit is hit, the app's own answer (FastAPI turns a
            # failed body read into a 400) is discarded; the 413 below is
            # sent instead.
            if exceeded and not response_started:
                return
            if message["type"] == "http.response.start":
                response_started = True
            await send(message)

        try:
            await self.app(scope, counting_receive, guarded_send)
        except Exception:
            # An error caused by stopping the upload is replaced by the
            # 413 below. Any other error is passed on unchanged.
            if not exceeded:
                raise

        if exceeded and not response_started:
            await too_large(scope, receive, send)
