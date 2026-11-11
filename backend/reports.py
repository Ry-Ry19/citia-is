# backend/reports.py
#
# WHAT: Checking a community Report a Sighting submission and saving it.
#
# ORDER OF WORK (nothing is stored until every check has passed):
#   1. Validate the fields and decode the photo.
#   2. If this client_submission_id was already saved, return that report.
#   3. Re-classify the photo on the server. The browser's result is
#      never trusted or stored.
#   4. Re-encode the photo, which removes its metadata.
#   5. Upload it, then save everything in one database transaction.
#
# WHY UPLOAD FIRST: the upload cannot be part of a database transaction.
#   If the save fails, a leftover file is invisible and easy to remove,
#   whereas a saved report pointing at a missing photo would be a broken
#   record in front of CENRO staff.
#
# PERSONAL DATA: reporter details go into the database only. They are
#   never logged and never returned; see ReportResponse.

import logging
from dataclasses import dataclass
from typing import Literal
from uuid import UUID, uuid4

from fastapi.exceptions import RequestValidationError
from PIL import Image
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator

from classifier import Classifier
from config import Settings
from database import Database, DatabaseUnavailable, DuplicateSubmission, NewReport, StoredReport
from errors import ApiError
from images import CleanPhoto, decode_upload_image, encode_clean_photo
from storage import PhotoStorage, StorageUnavailable

logger = logging.getLogger("uvicorn.error")

Outcome = Literal["succeeded", "unavailable", "failed"]


class ReportSubmission(BaseModel):
    """The form fields. Limits match the checks in the citia schema."""

    model_config = ConfigDict(str_strip_whitespace=True)

    client_submission_id: UUID
    study_area: Literal["palao", "dalipuga", "npc"]
    observation_type: Literal["single_tree", "multiple_trees", "seedlings_saplings"]
    consent_confirmed: bool

    barangay: str | None = Field(default=None, max_length=100)
    landmark: str | None = Field(default=None, max_length=200)
    community_notes: str | None = Field(default=None, max_length=2000)
    reporter_name: str | None = Field(default=None, max_length=100)
    reporter_contact: str | None = Field(default=None, max_length=150)

    latitude: float | None = Field(default=None, ge=-90, le=90, allow_inf_nan=False)
    longitude: float | None = Field(default=None, ge=-180, le=180, allow_inf_nan=False)
    gps_accuracy_m: float | None = Field(default=None, gt=0, le=10000, allow_inf_nan=False)

    @field_validator("*", mode="before")
    @classmethod
    def clean_form_value(cls, value):
        if isinstance(value, str):
            # PostgreSQL text cannot hold this character.
            if "\x00" in value:
                raise ValueError("Contains an invalid character.")
            # An empty form field means "not provided".
            if not value.strip():
                return None
        return value

    @field_validator("consent_confirmed")
    @classmethod
    def consent_is_required(cls, value: bool) -> bool:
        if not value:
            raise ValueError("Consent is required to submit a report.")
        return value

    @model_validator(mode="after")
    def check_coordinates(self) -> "ReportSubmission":
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Latitude and longitude must be provided together.")
        if self.gps_accuracy_m is not None and self.latitude is None:
            raise ValueError("GPS accuracy needs coordinates.")
        return self


class ReportClassification(BaseModel):
    # "unavailable" and "failed" carry no label or confidence, so they can
    # never be mistaken for an analysis of the photo.
    outcome: Outcome
    label: str | None = None
    confidence: float | None = None
    low_confidence: bool | None = None


class ReportResponse(BaseModel):
    """The whole public reply. Reporter details are deliberately absent."""

    reference_number: str
    status: str
    classification: ReportClassification


@dataclass(frozen=True)
class SubmitResult:
    response: ReportResponse
    created: bool


@dataclass(frozen=True)
class ClassificationAttempt:
    outcome: Outcome
    label: str | None = None
    confidence: float | None = None
    confidence_threshold: float | None = None
    low_confidence: bool | None = None
    model_version: str | None = None
    weights_sha256: str | None = None


def parse_submission(values: dict) -> ReportSubmission:
    """Validates the form. Errors name the field, never the submitted value."""
    try:
        return ReportSubmission(**values)
    except ValidationError as exc:
        errors = exc.errors(include_input=False, include_context=False, include_url=False)
        for error in errors:
            # A rule that spans several fields has no location of its own.
            if not error["loc"]:
                error["loc"] = ("coordinates",)
        raise RequestValidationError(errors) from None


def classify_photo(
    image: Image.Image,
    classifier: Classifier | None,
    settings: Settings,
    weights_sha256: str | None,
) -> ClassificationAttempt:
    """Never raises: a report is still saved when the AI cannot run."""
    if classifier is None:
        return ClassificationAttempt(outcome="unavailable")

    try:
        prediction = classifier.predict(image)
    except Exception as exc:
        logger.warning("Report classification failed (%s).", type(exc).__name__)
        return ClassificationAttempt(
            outcome="failed",
            model_version=settings.model_version,
            weights_sha256=weights_sha256,
        )

    # Rounded like the database column, so this reply and the saved
    # low_confidence value can never disagree.
    threshold = round(settings.low_confidence_threshold, 1)
    return ClassificationAttempt(
        outcome="succeeded",
        label=prediction.label,
        confidence=prediction.confidence,
        confidence_threshold=threshold,
        low_confidence=prediction.confidence < threshold,
        model_version=settings.model_version,
        weights_sha256=weights_sha256,
    )


def response_for_stored(stored: StoredReport) -> ReportResponse:
    return ReportResponse(
        reference_number=stored.reference_number,
        status=stored.review_status,
        classification=ReportClassification(
            outcome=stored.outcome or "unavailable",
            label=stored.label,
            confidence=None if stored.confidence is None else float(stored.confidence),
            low_confidence=stored.low_confidence,
        ),
    )


def build_new_report(
    submission: ReportSubmission,
    report_id: UUID,
    photo_id: UUID,
    storage_path: str,
    photo: CleanPhoto,
    attempt: ClassificationAttempt,
) -> NewReport:
    return NewReport(
        report_id=report_id,
        client_submission_id=submission.client_submission_id,
        study_area=submission.study_area,
        observation_type=submission.observation_type,
        barangay=submission.barangay,
        landmark=submission.landmark,
        latitude=submission.latitude,
        longitude=submission.longitude,
        gps_accuracy_m=submission.gps_accuracy_m,
        community_notes=submission.community_notes,
        reporter_name=submission.reporter_name,
        reporter_contact=submission.reporter_contact,
        consent_confirmed=submission.consent_confirmed,
        photo_id=photo_id,
        storage_path=storage_path,
        mime_type=photo.mime_type,
        byte_size=len(photo.data),
        width_px=photo.width,
        height_px=photo.height,
        sha256=photo.sha256,
        outcome=attempt.outcome,
        label=attempt.label,
        confidence=attempt.confidence,
        confidence_threshold=attempt.confidence_threshold,
        model_version=attempt.model_version,
        weights_sha256=attempt.weights_sha256,
    )


def remove_upload(storage: PhotoStorage, key: str) -> None:
    try:
        storage.delete(key)
    except StorageUnavailable:
        logger.warning("Orphaned report photo left in storage: %s", key)


def discard_failed_upload(
    database: Database,
    storage: PhotoStorage,
    key: str,
    client_submission_id: UUID,
) -> None:
    """
    After a failed save, removes the photo unless the report may have been
    saved anyway (a connection can drop just after the commit succeeds).
    A leftover file is harmless; a report without its photo is not.
    """
    try:
        saved = database.find_report(client_submission_id) is not None
    except Exception:
        logger.warning("Report photo kept; could not confirm the save failed: %s", key)
        return

    if not saved:
        remove_upload(storage, key)


def submit_report(
    submission: ReportSubmission,
    photo_data: bytes,
    *,
    classifier: Classifier | None,
    database: Database,
    storage: PhotoStorage,
    settings: Settings,
    weights_sha256: str | None,
) -> SubmitResult:
    image = decode_upload_image(photo_data, settings.max_image_pixels)
    try:
        existing = database.find_report(submission.client_submission_id)
        if existing is not None:
            return SubmitResult(response_for_stored(existing), created=False)

        attempt = classify_photo(image, classifier, settings, weights_sha256)
        photo = encode_clean_photo(photo_data, image)
    finally:
        image.close()

    # Re-encoding can enlarge a photo, and the bucket has its own limit.
    if len(photo.data) > settings.max_upload_bytes:
        raise ApiError(413, "file_too_large", "The photo is too large to store. Please upload a smaller one.")

    report_id, photo_id = uuid4(), uuid4()
    key = f"reports/{report_id}/{photo_id}.{photo.extension}"
    storage.upload(key, photo.data, photo.mime_type)

    new_report = build_new_report(submission, report_id, photo_id, key, photo, attempt)
    try:
        reference_number = database.insert_report(new_report)
    except DuplicateSubmission:
        # A simultaneous retry saved first; this attempt's file is unused.
        remove_upload(storage, key)
        existing = database.find_report(submission.client_submission_id)
        if existing is None:
            raise DatabaseUnavailable from None
        return SubmitResult(response_for_stored(existing), created=False)
    except Exception:
        discard_failed_upload(database, storage, key, submission.client_submission_id)
        raise

    return SubmitResult(
        ReportResponse(
            reference_number=reference_number,
            status="pending_review",
            classification=ReportClassification(
                outcome=attempt.outcome,
                label=attempt.label,
                confidence=attempt.confidence,
                low_confidence=attempt.low_confidence,
            ),
        ),
        created=True,
    )
