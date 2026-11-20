# backend/main.py
#
# WHAT: The entry point of the CITIA-IS FastAPI service.
#
# RUN (from the backend/ folder):
#     .\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
#
# ENDPOINTS:
#   GET  /health    — liveness, and whether AI inference is ready
#   POST /classify  — YOLOv8n-cls classification of one leaf image
#   POST /reports   — save a community Report a Sighting submission
#   GET  /staff/me  — the signed-in CENRO staff member (staff token required)

import logging
from collections.abc import Callable
from contextlib import asynccontextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from fastapi import Depends, FastAPI, File, Form, Path as PathParam, Query, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from auth import AuthSetupError, InvalidToken, KeysUnavailable, TokenVerifier, open_verifier
from classifier import (
    ClassificationLabel,
    Classifier,
    ModelLoadError,
    describe_load_error,
    load_classifier,
    weights_fingerprint,
)
from config import Settings, get_settings
from database import (
    Database,
    DatabaseSetupError,
    DatabaseStatus,
    DatabaseUnavailable,
    NewReview,
    ReportFilters,
    ReportNotSaved,
    ReviewNotSaved,
    StaffMember,
    open_database,
)
from errors import ApiError, register_error_handlers
from images import decode_upload_image
from reports import ReportResponse, parse_submission, submit_report
from staff_reports import (
    REFERENCE_PATTERN,
    DashboardResponse,
    ReportDetailResponse,
    ReportListResponse,
    ReviewRequest,
    ReviewStatus,
    StudyArea,
    dashboard_response,
    detail_response,
    list_response,
    photo_media_type,
)
from storage import (
    PhotoNotFound,
    PhotoStorage,
    StorageSetupError,
    StorageStatus,
    StorageUnavailable,
    open_storage,
)
from upload_limits import UploadSizeLimitMiddleware

API_VERSION = "0.1.0"

# Uvicorn already prints this logger's messages to the console.
logger = logging.getLogger("uvicorn.error")

# Endpoints that accept file uploads.
UPLOAD_PATHS = {"/classify", "/reports"}

# Room for the multipart boundary and part headers on top of the file.
MULTIPART_OVERHEAD_BYTES = 64 * 1024

REPORT_UNAVAILABLE_MESSAGE = "Reports cannot be saved right now. Please try again later."

ClassifierLoader = Callable[[Path], Classifier]
DatabaseOpener = Callable[[Settings], Database]
StorageOpener = Callable[[Settings], PhotoStorage]
TokenVerifierOpener = Callable[[Settings], TokenVerifier]

STAFF_AUTH_UNAVAILABLE_MESSAGE = "Staff sign-in cannot be checked right now. Please try again later."


class HealthResponse(BaseModel):
    status: Literal["ok"]
    # True only once trained weights have actually been loaded.
    inference_ready: bool
    # "ready" only when a citia_api connection answered just now.
    database: DatabaseStatus
    # "ready" only when the photo bucket answered just now.
    storage: StorageStatus
    version: str


class ClassificationResponse(BaseModel):
    label: ClassificationLabel
    # Classification Confidence as a percentage, 0–100, one decimal place.
    confidence: float
    # True when confidence is below LOW_CONFIDENCE_THRESHOLD: the frontend
    # should ask for a clearer photo rather than present a firm result.
    low_confidence: bool


class StaffMeResponse(BaseModel):
    id: str
    full_name: str
    role: str
    # From the sign-in token, for display only.
    email: str | None


@dataclass(frozen=True)
class StaffContext:
    """The signed-in staff member a staff endpoint is acting for."""

    staff: StaffMember
    email: str | None


def unauthorized() -> ApiError:
    return ApiError(
        401,
        "unauthorized",
        "Please sign in to the CENRO staff portal.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def require_staff(request: Request) -> StaffContext:
    """
    The check every staff endpoint uses: a valid Supabase access token
    (401 otherwise) belonging to an ACTIVE staff profile (403 otherwise).
    If the check itself cannot run, the answer is 503, never a refusal.
    """
    verifier = getattr(request.app.state, "token_verifier", None)
    database = getattr(request.app.state, "database", None)
    if verifier is None or database is None:
        raise ApiError(503, "staff_auth_unavailable", STAFF_AUTH_UNAVAILABLE_MESSAGE)

    scheme, _, token = request.headers.get("authorization", "").partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise unauthorized()

    try:
        verified = verifier.verify(token.strip())
    except InvalidToken as exc:
        logger.info("Staff token refused (%s).", exc.reason)
        raise unauthorized() from None
    except KeysUnavailable:
        logger.warning("Staff token not checked: the signing keys could not be fetched.")
        raise ApiError(503, "staff_auth_unavailable", STAFF_AUTH_UNAVAILABLE_MESSAGE) from None

    try:
        staff = database.find_active_staff(verified.user_id)
    except DatabaseUnavailable:
        raise ApiError(503, "staff_auth_unavailable", STAFF_AUTH_UNAVAILABLE_MESSAGE) from None

    if staff is None:
        logger.info("Staff access refused: no active staff profile for this account.")
        raise ApiError(403, "not_staff", "This account does not have access to the CENRO staff portal.")

    return StaffContext(staff=staff, email=verified.email)


STAFF_REPORTS_UNAVAILABLE_MESSAGE = "Reports cannot be loaded right now. Please try again later."
REPORT_NOT_FOUND_MESSAGE = "No report has that reference number."
PHOTO_UNAVAILABLE_MESSAGE = "The photo cannot be loaded right now. Please try again later."

# A staff photo is personal data from a private bucket: the browser must
# not keep a copy, and must not guess a different file type.
PHOTO_HEADERS = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": "inline",
}


def reports_unavailable() -> ApiError:
    return ApiError(503, "reports_unavailable", STAFF_REPORTS_UNAVAILABLE_MESSAGE)


def report_not_found() -> ApiError:
    return ApiError(404, "report_not_found", REPORT_NOT_FOUND_MESSAGE)


def upload_limit_message(settings: Settings) -> str:
    megabytes = settings.max_upload_bytes / (1024 * 1024)
    return f"The image must be {megabytes:g} MB or smaller."


def create_app(
    settings: Settings | None = None,
    classifier_loader: ClassifierLoader = load_classifier,
    database_opener: DatabaseOpener = open_database,
    storage_opener: StorageOpener = open_storage,
    token_verifier_opener: TokenVerifierOpener = open_verifier,
) -> FastAPI:
    """
    Builds the FastAPI application.

    Tests pass their own Settings so they never depend on backend/.env,
    their own classifier_loader so they never load real weights, and
    their own database_opener, storage_opener and token_verifier_opener
    so they never connect to Supabase.
    """
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # Startup: load the model once, not on every request. Inference is
        # marked ready ONLY after every check in load_classifier() passes.
        # If anything fails, the API still starts — /health reports
        # inference as not ready and /classify answers 503.
        app.state.classifier = None
        app.state.weights_sha256 = None
        try:
            # A result that cannot name its model must never be saved.
            if settings.model_version is None:
                raise ModelLoadError("MODEL_VERSION is not set.")
            classifier = classifier_loader(settings.weights_path)
        except ModelLoadError as exc:
            logger.warning("AI classification unavailable: %s", describe_load_error(exc))
        except Exception:
            # A bug or an unexpected library error must not stop the API
            # from starting. The full traceback goes to the server log only.
            logger.exception("AI classification unavailable: unexpected error while loading the model.")
        else:
            app.state.classifier = classifier
            app.state.weights_sha256 = weights_fingerprint(settings.weights_path)
            logger.info("AI classifier loaded; inference is ready.")

        # The database is optional in the same way: any failure here
        # leaves it "unavailable" and the API keeps running. Messages
        # never include DATABASE_URL, which contains the password.
        app.state.database = None
        if settings.database_url is None:
            logger.info("Database not configured (DATABASE_URL is empty).")
        else:
            try:
                app.state.database = database_opener(settings)
            except DatabaseSetupError as exc:
                logger.warning("Database unavailable: %s", exc)
            except Exception as exc:
                logger.warning(
                    "Database unavailable: unexpected %s while opening the connection pool.",
                    type(exc).__name__,
                )
            else:
                logger.info("Database connection pool started.")

        # Storage is optional too, and its messages never include the keys.
        app.state.storage = None
        if not settings.storage_configured:
            logger.info("Storage not configured (STORAGE_S3_* settings are incomplete).")
        else:
            try:
                app.state.storage = storage_opener(settings)
            except StorageSetupError as exc:
                logger.warning("Storage unavailable: %s", exc)
            except Exception as exc:
                logger.warning(
                    "Storage unavailable: unexpected %s while creating the client.",
                    type(exc).__name__,
                )

        # Staff sign-in checking is optional in the same way.
        app.state.token_verifier = None
        if settings.supabase_url is None:
            logger.info("Staff sign-in not configured (SUPABASE_URL is empty).")
        else:
            try:
                app.state.token_verifier = token_verifier_opener(settings)
            except AuthSetupError as exc:
                logger.warning("Staff sign-in unavailable: %s", exc)
            except Exception as exc:
                logger.warning(
                    "Staff sign-in unavailable: unexpected %s while setting up.",
                    type(exc).__name__,
                )

        yield

        # Shutdown: release the model and close the database connections.
        app.state.classifier = None
        app.state.storage = None
        app.state.token_verifier = None
        database = app.state.database
        app.state.database = None
        if database is not None:
            database.close()

    is_development = settings.environment == "development"

    app = FastAPI(
        title="CITIA-IS API",
        version=API_VERSION,
        lifespan=lifespan,
        # Interactive docs are a development convenience; they are
        # switched off in production so the API surface is not advertised.
        docs_url="/docs" if is_development else None,
        redoc_url=None,
        openapi_url="/openapi.json" if is_development else None,
    )

    # Hard cap on upload request bodies, enforced while they arrive (see
    # upload_limits.py). Added BEFORE the CORS middleware so CORS stays
    # the outer layer and the browser can still read a 413 response.
    app.add_middleware(
        UploadSizeLimitMiddleware,
        paths=UPLOAD_PATHS,
        max_body_bytes=settings.max_upload_bytes + MULTIPART_OVERHEAD_BYTES,
        message=upload_limit_message(settings),
    )

    # Only the listed frontend origins may call the API from a browser.
    # No cookies are needed for the public endpoints, so credentials stay off.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
        allow_credentials=False,
    )

    register_error_handlers(app)

    @app.get("/health", response_model=HealthResponse)
    def health(request: Request) -> HealthResponse:
        classifier = getattr(request.app.state, "classifier", None)
        database = getattr(request.app.state, "database", None)

        database_status: DatabaseStatus
        if settings.database_url is None:
            database_status = "not_configured"
        elif database is not None and database.ping():
            database_status = "ready"
        else:
            database_status = "unavailable"

        storage = getattr(request.app.state, "storage", None)
        storage_status: StorageStatus
        if not settings.storage_configured:
            storage_status = "not_configured"
        elif storage is not None and storage.ping():
            storage_status = "ready"
        else:
            storage_status = "unavailable"

        return HealthResponse(
            status="ok",
            inference_ready=classifier is not None,
            database=database_status,
            storage=storage_status,
            version=API_VERSION,
        )

    def read_upload(upload: UploadFile) -> bytes:
        # Read at most one byte past the limit — enough to know the file
        # is too large without holding all of it in memory.
        data = upload.file.read(settings.max_upload_bytes + 1)
        if len(data) > settings.max_upload_bytes:
            raise ApiError(413, "file_too_large", upload_limit_message(settings))
        return data

    @app.post("/classify", response_model=ClassificationResponse)
    def classify(request: Request, image: UploadFile = File(...)) -> ClassificationResponse:
        # A plain "def" endpoint runs in FastAPI's thread pool, so slow
        # model inference does not block other requests.
        classifier = getattr(request.app.state, "classifier", None)
        if classifier is None:
            raise ApiError(
                503,
                "inference_unavailable",
                "AI classification is temporarily unavailable. Please try again later.",
            )

        data = read_upload(image)

        # The filename and browser-supplied content type are never
        # trusted; the actual file content is checked here.
        rgb_image = decode_upload_image(data, settings.max_image_pixels)

        try:
            prediction = classifier.predict(rgb_image)
        except Exception:
            logger.exception("Classification failed.")
            raise ApiError(
                500,
                "classification_failed",
                "The image could not be classified. Please try again.",
            ) from None
        finally:
            rgb_image.close()

        return ClassificationResponse(
            label=prediction.label,
            confidence=prediction.confidence,
            low_confidence=prediction.confidence < settings.low_confidence_threshold,
        )

    # Every field is optional here so that parse_submission() can report
    # all problems in one place, naming fields but never their values.
    @app.post(
        "/reports",
        response_model=ReportResponse,
        response_model_exclude_none=True,
        status_code=201,
    )
    def create_report(
        request: Request,
        response: Response,
        client_submission_id: str | None = Form(None),
        study_area: str | None = Form(None),
        observation_type: str | None = Form(None),
        consent_confirmed: str | None = Form(None),
        barangay: str | None = Form(None),
        landmark: str | None = Form(None),
        community_notes: str | None = Form(None),
        reporter_name: str | None = Form(None),
        reporter_contact: str | None = Form(None),
        latitude: str | None = Form(None),
        longitude: str | None = Form(None),
        gps_accuracy_m: str | None = Form(None),
        photo: list[UploadFile] | None = File(None),
    ) -> ReportResponse:
        database = getattr(request.app.state, "database", None)
        storage = getattr(request.app.state, "storage", None)
        if database is None or storage is None:
            raise ApiError(503, "reporting_unavailable", REPORT_UNAVAILABLE_MESSAGE)

        submission = parse_submission(
            {
                "client_submission_id": client_submission_id,
                "study_area": study_area,
                "observation_type": observation_type,
                "consent_confirmed": consent_confirmed,
                "barangay": barangay,
                "landmark": landmark,
                "community_notes": community_notes,
                "reporter_name": reporter_name,
                "reporter_contact": reporter_contact,
                "latitude": latitude,
                "longitude": longitude,
                "gps_accuracy_m": gps_accuracy_m,
            }
        )

        if not photo:
            raise ApiError(422, "photo_required", "Please attach a photo of the sighting.")
        if len(photo) > 1:
            raise ApiError(422, "one_photo_only", "Please attach only one photo per report.")

        try:
            result = submit_report(
                submission,
                read_upload(photo[0]),
                classifier=getattr(request.app.state, "classifier", None),
                database=database,
                storage=storage,
                settings=settings,
                weights_sha256=getattr(request.app.state, "weights_sha256", None),
            )
        except (DatabaseUnavailable, StorageUnavailable):
            raise ApiError(503, "reporting_unavailable", REPORT_UNAVAILABLE_MESSAGE) from None
        except ReportNotSaved:
            raise ApiError(500, "report_not_saved", "Your report could not be saved. Please try again.") from None

        if not result.created:
            response.status_code = 200
        return result.response

    @app.get("/staff/me", response_model=StaffMeResponse)
    def staff_me(context: StaffContext = Depends(require_staff)) -> StaffMeResponse:
        return StaffMeResponse(
            id=str(context.staff.id),
            full_name=context.staff.full_name,
            role=context.staff.role,
            email=context.email,
        )

    # ── Staff: reading reports (Stage 15A). Every route below requires a
    #    signed-in, active staff member, and none of them writes. ──────────

    @app.get("/staff/reports", response_model=ReportListResponse)
    def staff_list_reports(
        request: Request,
        status: ReviewStatus | None = None,
        study_area: StudyArea | None = None,
        q: str | None = Query(default=None, max_length=100),
        has_location: bool = False,
        limit: int = Query(default=25, ge=1, le=200),
        offset: int = Query(default=0, ge=0, le=1_000_000),
        context: StaffContext = Depends(require_staff),
    ) -> ReportListResponse:
        """One page of reports, newest first. Holds no reporter details."""
        search = q.strip() if q else None
        filters = ReportFilters(
            status=status,
            study_area=study_area,
            search=search or None,
            has_location=has_location,
            limit=limit,
            offset=offset,
        )
        try:
            page = request.app.state.database.list_reports(filters)
        except DatabaseUnavailable:
            raise reports_unavailable() from None
        return list_response(page, limit, offset)

    @app.get("/staff/reports/{reference}", response_model=ReportDetailResponse)
    def staff_report_detail(
        request: Request,
        reference: str = PathParam(pattern=REFERENCE_PATTERN),
        context: StaffContext = Depends(require_staff),
    ) -> ReportDetailResponse:
        """One report in full, including the reporter's name and contact."""
        try:
            report = request.app.state.database.find_report_detail(reference)
        except DatabaseUnavailable:
            raise reports_unavailable() from None
        if report is None:
            raise report_not_found()
        # This reply holds personal details, so who opened it is recorded.
        # The line names the staff account and the report, never the details.
        logger.info("Staff %s opened report %s.", context.staff.id, reference)
        return detail_response(report)

    @app.get("/staff/reports/{reference}/photo")
    def staff_report_photo(
        request: Request,
        reference: str = PathParam(pattern=REFERENCE_PATTERN),
        context: StaffContext = Depends(require_staff),
    ) -> Response:
        """The report's photo, fetched from the private bucket for staff."""
        storage: PhotoStorage | None = getattr(request.app.state, "storage", None)
        if storage is None:
            raise ApiError(503, "photo_unavailable", PHOTO_UNAVAILABLE_MESSAGE)
        try:
            photo = request.app.state.database.find_report_photo(reference)
        except DatabaseUnavailable:
            raise reports_unavailable() from None
        if photo is None:
            raise ApiError(404, "photo_not_found", "This report has no photo.")
        try:
            data = storage.download(photo.storage_path)
        except PhotoNotFound:
            raise ApiError(404, "photo_not_found", "This report has no photo.") from None
        except StorageUnavailable:
            raise ApiError(503, "photo_unavailable", PHOTO_UNAVAILABLE_MESSAGE) from None
        logger.info("Staff %s viewed the photo of report %s.", context.staff.id, reference)
        return Response(
            content=data,
            media_type=photo_media_type(photo.mime_type),
            headers=PHOTO_HEADERS,
        )

    # ── Staff: recording a review (Stage 15B). ──────────────────────────

    @app.post(
        "/staff/reports/{reference}/reviews",
        response_model=ReportDetailResponse,
        status_code=201,
    )
    def staff_add_review(
        request: Request,
        decision: ReviewRequest,
        reference: str = PathParam(pattern=REFERENCE_PATTERN),
        context: StaffContext = Depends(require_staff),
    ) -> ReportDetailResponse:
        """
        Adds a review decision to the report's history and returns the
        report as it now stands. A later decision is added on top; the
        earlier one is kept.
        """
        database = request.app.state.database
        try:
            saved = database.add_review(
                NewReview(
                    reference_number=reference,
                    decision=decision.decision,
                    rejection_reason=decision.rejection_reason,
                    staff_notes=decision.staff_notes,
                    reviewed_by=context.staff.id,
                )
            )
        except DatabaseUnavailable:
            raise ApiError(
                503, "review_unavailable", "The decision could not be saved right now. Please try again."
            ) from None
        except ReviewNotSaved:
            raise ApiError(500, "review_not_saved", "The decision could not be saved. Please try again.") from None
        if not saved:
            raise report_not_found()

        logger.info(
            "Staff %s recorded %s on report %s.", context.staff.id, decision.decision, reference
        )
        try:
            report = database.find_report_detail(reference)
        except DatabaseUnavailable:
            # The decision IS saved; only the refreshed copy could not be read.
            raise ApiError(
                503,
                "review_saved_reload_failed",
                "The decision was saved, but the report could not be reloaded. Refresh the page.",
            ) from None
        if report is None:
            raise report_not_found()
        return detail_response(report)

    @app.get("/staff/dashboard", response_model=DashboardResponse)
    def staff_dashboard(
        request: Request,
        context: StaffContext = Depends(require_staff),
    ) -> DashboardResponse:
        """Counts by status and study area, and the latest activity."""
        try:
            data = request.app.state.database.dashboard()
        except DatabaseUnavailable:
            raise reports_unavailable() from None
        return dashboard_response(data)

    return app


app = create_app()
