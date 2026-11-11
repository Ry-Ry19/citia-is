# backend/errors.py
#
# WHAT: One consistent JSON shape for every error the API returns:
#
#     {"error": {"code": "not_found", "message": "The requested resource was not found."}}
#
#   The frontend can read error.code and error.message the same way
#   for every endpoint.
#
# PUBLIC MESSAGES ONLY: the text sent to the browser always comes from
#   the PUBLIC_ERRORS table below, or from an ApiError that CITIA-IS
#   code raised on purpose with a message written for the public. The
#   "detail" of any other exception — from FastAPI, Starlette, a
#   library, or a bug — is never copied into the response, because it
#   could contain file paths, SQL, or other internal details.
#
# SERVER LOG: unexpected errors are logged on the server only, with the
#   request method and path but no request contents.

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("citia.errors")

# Safe, generic wording for each HTTP status the API is expected to return.
PUBLIC_ERRORS: dict[int, tuple[str, str]] = {
    400: ("bad_request", "The request could not be processed."),
    401: ("unauthorized", "Authentication is required."),
    403: ("forbidden", "You do not have permission to perform this action."),
    404: ("not_found", "The requested resource was not found."),
    405: ("method_not_allowed", "This method is not allowed for the requested resource."),
    413: ("payload_too_large", "The uploaded file is too large."),
    415: ("unsupported_media_type", "This file type is not supported."),
    422: ("validation_error", "The request contains invalid or missing fields."),
    429: ("too_many_requests", "Too many requests. Please try again later."),
    503: ("service_unavailable", "The service is temporarily unavailable. Please try again later."),
}

FALLBACK_CLIENT_ERROR = ("request_error", "The request could not be completed.")
INTERNAL_ERROR = ("internal_error", "An unexpected error occurred. Please try again later.")

# Headers that are safe and useful to pass on (a 405 response sends
# "Allow: GET"). Any other header attached to an exception is dropped.
SAFE_HEADERS = {"allow", "retry-after", "www-authenticate"}


class ApiError(StarletteHTTPException):
    """
    An error raised on purpose by CITIA-IS code, with a message written
    to be shown to the public. Only this class may set its own message.

    Example (Stage 12b):
        raise ApiError(415, "unsupported_media_type", "Please upload a JPEG or PNG image.")
    """

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(status_code=status_code, detail=message, headers=headers)
        self.code = code
        self.message = message


def public_error_for(status_code: int) -> tuple[str, str]:
    """Returns the safe (code, message) pair for a status code."""
    if status_code in PUBLIC_ERRORS:
        return PUBLIC_ERRORS[status_code]
    if status_code >= 500:
        return INTERNAL_ERROR
    return FALLBACK_CLIENT_ERROR


def error_response(
    status_code: int,
    code: str,
    message: str,
    details: list[dict] | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    body: dict = {"code": code, "message": message}
    if details:
        body["details"] = details
    return JSONResponse(status_code=status_code, content={"error": body}, headers=headers)


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    async def handle_http_error(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        if isinstance(exc, ApiError):
            code, message = exc.code, exc.message
        else:
            # exc.detail is deliberately ignored here.
            code, message = public_error_for(exc.status_code)
            if exc.status_code >= 500:
                logger.error("HTTP %s on %s %s", exc.status_code, request.method, request.url.path)

        safe_headers = {
            name: value
            for name, value in (exc.headers or {}).items()
            if name.lower() in SAFE_HEADERS
        }

        return error_response(exc.status_code, code, message, headers=safe_headers or None)

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        # Only the field name and the problem are returned — never the
        # submitted value, which could contain personal information.
        details = [
            {
                "field": ".".join(str(part) for part in err["loc"] if part != "body"),
                "message": err["msg"],
            }
            for err in exc.errors()
        ]
        code, message = PUBLIC_ERRORS[422]
        return error_response(422, code, message, details)

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        # Full traceback goes to the server log only.
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        code, message = INTERNAL_ERROR
        return error_response(500, code, message)
