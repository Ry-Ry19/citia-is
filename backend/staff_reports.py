# backend/staff_reports.py
#
# WHAT: What signed-in CENRO staff can read about sighting reports — the
#   reports list, one report in full, and the dashboard figures. This
#   file defines the shape of each reply and builds it from what the
#   database returns.
#
# WHO MAY CALL THESE: only a signed-in, active staff member. The check
#   (require_staff) is in main.py, where the routes are.
#
# PERSONAL DETAILS:
#   - The list and the dashboard never contain a reporter's name, contact
#     or notes. Their reply shapes have no such fields.
#   - Only ReportDetailResponse has them, for one report at a time.
#
# WRITING: the only change staff can make is to ADD a review decision
#   (ReviewRequest below). Earlier decisions are kept; a report's status
#   is updated by the database itself when a decision is added.

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from database import (
    DashboardData,
    ReportDetail,
    ReportPage,
    ReportSummary,
)

# A reference number as the database writes it, e.g. CITS-000021.
REFERENCE_PATTERN = r"^CITS-\d{6,12}$"

ReviewStatus = Literal["pending_review", "verified", "rejected"]
StudyArea = Literal["palao", "dalipuga", "npc"]

STUDY_AREAS: tuple[str, ...] = ("palao", "dalipuga", "npc")
REVIEW_STATUSES: tuple[str, ...] = ("pending_review", "verified", "rejected")

# The only photo types the API stores. Anything else is sent as a plain
# download, so a browser never tries to display it as a page.
PHOTO_MEDIA_TYPES = {"image/jpeg", "image/png", "image/webp"}
FALLBACK_MEDIA_TYPE = "application/octet-stream"


class ReviewRequest(BaseModel):
    """
    A review decision sent by a staff member. Who made it is NOT part of
    the request: the API takes that from the verified sign-in token.

    The limits match the database's own checks, so a bad request gets a
    clear message here instead of a database error.
    """

    # An unknown field (for example "reviewed_by") is refused, not ignored.
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    decision: Literal["verified", "rejected"]
    rejection_reason: str | None = Field(default=None, max_length=1000)
    staff_notes: str | None = Field(default=None, max_length=2000)

    @field_validator("rejection_reason", "staff_notes")
    @classmethod
    def blank_means_not_given(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None

    @model_validator(mode="after")
    def reason_matches_decision(self) -> "ReviewRequest":
        if self.decision == "rejected" and self.rejection_reason is None:
            raise ValueError("A rejection needs a reason.")
        if self.decision == "verified" and self.rejection_reason is not None:
            raise ValueError("A rejection reason can only be given when rejecting.")
        return self


class AiSummary(BaseModel):
    """The AI's result. A suggestion for staff, never a decision."""

    label: str
    confidence: float | None
    low_confidence: bool | None


class ReportListItem(BaseModel):
    reference_number: str
    submitted_at: datetime
    study_area: str
    barangay: str | None
    landmark: str | None
    latitude: float | None
    longitude: float | None
    observation_type: str
    review_status: str
    has_photo: bool
    # None when the AI did not classify the photo.
    ai: AiSummary | None


class ReportListResponse(BaseModel):
    items: list[ReportListItem]
    total: int
    limit: int
    offset: int


class PhotoInfo(BaseModel):
    mime_type: str
    width_px: int | None
    height_px: int | None


class AiDetail(BaseModel):
    # "succeeded", "unavailable" or "failed".
    outcome: str
    label: str | None
    confidence: float | None
    low_confidence: bool | None
    model_version: str | None
    classified_at: datetime | None


class ReviewItem(BaseModel):
    decision: str
    rejection_reason: str | None
    staff_notes: str | None
    reviewed_at: datetime
    reviewer_name: str


class ReportDetailResponse(BaseModel):
    reference_number: str
    submitted_at: datetime
    study_area: str
    barangay: str | None
    landmark: str | None
    latitude: float | None
    longitude: float | None
    gps_accuracy_m: float | None
    observation_type: str
    community_notes: str | None
    reporter_name: str | None
    reporter_contact: str | None
    review_status: str
    photo: PhotoInfo | None
    ai: AiDetail | None
    # Newest first. Decisions are never changed or removed, only added.
    reviews: list[ReviewItem]


class StatusCounts(BaseModel):
    total: int = 0
    pending_review: int = 0
    verified: int = 0
    rejected: int = 0


class AreaCounts(StatusCounts):
    study_area: str


class RecentReviewItem(BaseModel):
    reference_number: str
    decision: str
    reviewed_at: datetime
    reviewer_name: str


class DashboardResponse(BaseModel):
    totals: StatusCounts
    by_area: list[AreaCounts]
    recent_reports: list[ReportListItem]
    recent_reviews: list[RecentReviewItem]


def as_float(value: Decimal | None) -> float | None:
    return float(value) if value is not None else None


def list_item(report: ReportSummary) -> ReportListItem:
    ai = None
    if report.ai_label is not None:
        ai = AiSummary(
            label=report.ai_label,
            confidence=as_float(report.ai_confidence),
            low_confidence=report.ai_low_confidence,
        )
    return ReportListItem(
        reference_number=report.reference_number,
        submitted_at=report.submitted_at,
        study_area=report.study_area,
        barangay=report.barangay,
        landmark=report.landmark,
        latitude=report.latitude,
        longitude=report.longitude,
        observation_type=report.observation_type,
        review_status=report.review_status,
        has_photo=report.has_photo,
        ai=ai,
    )


def list_response(page: ReportPage, limit: int, offset: int) -> ReportListResponse:
    return ReportListResponse(
        items=[list_item(report) for report in page.items],
        total=page.total,
        limit=limit,
        offset=offset,
    )


def detail_response(report: ReportDetail) -> ReportDetailResponse:
    photo = None
    if report.photo_mime_type is not None:
        photo = PhotoInfo(
            mime_type=report.photo_mime_type,
            width_px=report.photo_width_px,
            height_px=report.photo_height_px,
        )

    ai = None
    if report.ai_outcome is not None:
        ai = AiDetail(
            outcome=report.ai_outcome,
            label=report.ai_label,
            confidence=as_float(report.ai_confidence),
            low_confidence=report.ai_low_confidence,
            model_version=report.ai_model_version,
            classified_at=report.ai_classified_at,
        )

    return ReportDetailResponse(
        reference_number=report.reference_number,
        submitted_at=report.submitted_at,
        study_area=report.study_area,
        barangay=report.barangay,
        landmark=report.landmark,
        latitude=report.latitude,
        longitude=report.longitude,
        gps_accuracy_m=report.gps_accuracy_m,
        observation_type=report.observation_type,
        community_notes=report.community_notes,
        reporter_name=report.reporter_name,
        reporter_contact=report.reporter_contact,
        review_status=report.review_status,
        photo=photo,
        ai=ai,
        reviews=[
            ReviewItem(
                decision=review.decision,
                rejection_reason=review.rejection_reason,
                staff_notes=review.staff_notes,
                reviewed_at=review.reviewed_at,
                reviewer_name=review.reviewer_name,
            )
            for review in report.reviews
        ],
    )


def dashboard_response(data: DashboardData) -> DashboardResponse:
    """
    Turns the raw (area, status, count) rows into totals. Every study
    area is listed, with zeros when it has no reports yet.
    """
    totals = StatusCounts()
    areas = {area: AreaCounts(study_area=area) for area in STUDY_AREAS}

    for area, status, count in data.counts:
        if status not in REVIEW_STATUSES:
            continue
        totals.total += count
        setattr(totals, status, getattr(totals, status) + count)
        if area in areas:
            areas[area].total += count
            setattr(areas[area], status, getattr(areas[area], status) + count)

    return DashboardResponse(
        totals=totals,
        by_area=list(areas.values()),
        recent_reports=[list_item(report) for report in data.recent_reports],
        recent_reviews=[
            RecentReviewItem(
                reference_number=review.reference_number,
                decision=review.decision,
                reviewed_at=review.reviewed_at,
                reviewer_name=review.reviewer_name,
            )
            for review in data.recent_reviews
        ],
    )


def photo_media_type(mime_type: str) -> str:
    return mime_type if mime_type in PHOTO_MEDIA_TYPES else FALLBACK_MEDIA_TYPE
