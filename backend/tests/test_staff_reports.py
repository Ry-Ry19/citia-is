# backend/tests/test_staff_reports.py
#
# WHAT: Tests for what signed-in CENRO staff can read (Stage 15A): the
#   reports list, one report in full, its photo and the dashboard.
#
# NOTHING HERE TOUCHES SUPABASE: the database and the photo storage are
#   fakes that live in memory, and the staff tokens are signed with a
#   test key.

from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from database import (
    DashboardData,
    DatabaseUnavailable,
    PhotoLocation,
    RecentReview,
    ReportDetail,
    ReportFilters,
    ReportPage,
    ReportSummary,
    ReviewEntry,
    ReviewNotSaved,
    StaffMember,
    like_pattern,
    report_filter_sql,
)
from main import create_app
from storage import PhotoNotFound, StorageUnavailable
from tests.helpers import make_settings, no_model
from tests.test_auth import VERIFIER, bearer, make_token

STAFF_ID = uuid4()
WHEN = datetime(2026, 11, 16, 9, 30, tzinfo=timezone.utc)
PHOTO_BYTES = b"\xff\xd8\xff-not-a-real-photo"

# A reporter's details. They may appear in ONE reply only: the detail.
REPORTER_NAME = "Juan Reporter"
REPORTER_CONTACT = "0917-555-0101"
COMMUNITY_NOTES = "Tree beside the covered court."

CONFIGURED = {
    "database_url": "postgresql://mock:mock@mock.invalid/db",
    "supabase_url": "https://testref.supabase.co",
    "storage_s3_endpoint": "https://mock.invalid/storage/v1/s3",
    "storage_s3_region": "ap-southeast-1",
    "storage_s3_access_key_id": "test-access-key",
    "storage_s3_secret_access_key": "test-secret-key",
}


def summary(reference="CITS-000021", **changes) -> ReportSummary:
    values = dict(
        reference_number=reference,
        submitted_at=WHEN,
        study_area="palao",
        barangay="Palao",
        landmark="Near the medical center",
        latitude=8.2215,
        longitude=124.2482,
        observation_type="single_tree",
        review_status="pending_review",
        has_photo=True,
        ai_label="Mahogany",
        ai_confidence=Decimal("94.8"),
        ai_low_confidence=False,
    )
    values.update(changes)
    return ReportSummary(**values)


def detail(**changes) -> ReportDetail:
    values = dict(
        reference_number="CITS-000021",
        submitted_at=WHEN,
        study_area="palao",
        barangay="Palao",
        landmark="Near the medical center",
        latitude=8.2215,
        longitude=124.2482,
        gps_accuracy_m=12.0,
        observation_type="single_tree",
        community_notes=COMMUNITY_NOTES,
        reporter_name=REPORTER_NAME,
        reporter_contact=REPORTER_CONTACT,
        review_status="rejected",
        photo_mime_type="image/jpeg",
        photo_width_px=1024,
        photo_height_px=768,
        ai_outcome="succeeded",
        ai_label="Mahogany",
        ai_confidence=Decimal("94.8"),
        ai_low_confidence=False,
        ai_model_version="test-model",
        ai_classified_at=WHEN,
        reviews=[
            ReviewEntry("rejected", "Not a Mahogany leaf.", "Checked on site.", WHEN, "Maria Santos"),
            ReviewEntry("verified", None, None, WHEN, "Jose Cruz"),
        ],
    )
    values.update(changes)
    return ReportDetail(**values)


class FakeDatabase:
    """MOCK database: remembers what it was asked and returns canned rows."""

    def __init__(self, error=None):
        self.error = error
        self.active = {STAFF_ID: StaffMember(STAFF_ID, "Maria Santos", "cenro_staff")}
        self.filters: list[ReportFilters] = []
        self.detail_requests: list[str] = []
        self.photo_requests: list[str] = []
        self.page = ReportPage(items=[summary(), summary("CITS-000020", ai_label=None, ai_confidence=None, ai_low_confidence=None)], total=7)
        self.details = {"CITS-000021": detail()}
        self.photos = {"CITS-000021": PhotoLocation("reports/abc/photo.jpg", "image/jpeg")}
        self.dashboard_data = DashboardData(
            counts=[("palao", "pending_review", 2), ("palao", "verified", 1), ("npc", "rejected", 3)],
            recent_reports=[summary()],
            recent_reviews=[RecentReview("CITS-000020", "rejected", WHEN, "Maria Santos")],
        )

    def ping(self):
        return True

    def close(self):
        pass

    def find_active_staff(self, user_id):
        return self.active.get(user_id)

    def _fail_if_down(self):
        if self.error:
            raise self.error

    def list_reports(self, filters):
        self._fail_if_down()
        self.filters.append(filters)
        return self.page

    def find_report_detail(self, reference_number):
        self._fail_if_down()
        self.detail_requests.append(reference_number)
        return self.details.get(reference_number)

    def find_report_photo(self, reference_number):
        self._fail_if_down()
        self.photo_requests.append(reference_number)
        return self.photos.get(reference_number)

    def dashboard(self):
        self._fail_if_down()
        return self.dashboard_data


class FakeStorage:
    """MOCK photo bucket."""

    def __init__(self, error=None):
        self.error = error
        self.files = {"reports/abc/photo.jpg": PHOTO_BYTES}
        self.downloads: list[str] = []

    def ping(self):
        return True

    def download(self, key):
        self.downloads.append(key)
        if self.error:
            raise self.error
        if key not in self.files:
            raise PhotoNotFound
        return self.files[key]


@pytest.fixture
def staff():
    """Builds a started client wired to the fakes, and a signed-in header."""
    opened = []

    def _make(database=None, storage=None, with_storage=True):
        database = database if database is not None else FakeDatabase()
        storage = storage if storage is not None else FakeStorage()
        settings = dict(CONFIGURED)
        if not with_storage:
            settings["storage_s3_endpoint"] = None
        client = TestClient(
            create_app(
                make_settings(**settings),
                classifier_loader=no_model,
                database_opener=lambda s: database,
                storage_opener=lambda s: storage,
                token_verifier_opener=lambda s: VERIFIER,
            ),
            raise_server_exceptions=False,
        )
        client.__enter__()
        opened.append(client)
        return client, database, storage

    yield _make

    for client in opened:
        client.__exit__(None, None, None)


SIGNED_IN = bearer(make_token(sub=STAFF_ID))

ENDPOINTS = [
    "/staff/reports",
    "/staff/reports/CITS-000021",
    "/staff/reports/CITS-000021/photo",
    "/staff/dashboard",
]


# ── Who may read ────────────────────────────────────────────────────────────


@pytest.mark.parametrize("path", ENDPOINTS)
def test_every_endpoint_refuses_a_missing_or_bad_token(staff, path):
    client, database, storage = staff()

    assert client.get(path).status_code == 401
    assert client.get(path, headers=bearer("not-a-token")).status_code == 401
    # Nothing was read for a caller who is not signed in.
    assert database.filters == [] and database.detail_requests == []
    assert database.photo_requests == [] and storage.downloads == []


@pytest.mark.parametrize("path", ENDPOINTS)
def test_every_endpoint_refuses_an_account_without_a_staff_profile(staff, path):
    client, database, storage = staff()

    response = client.get(path, headers=bearer(make_token(sub=uuid4())))

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "not_staff"
    assert database.detail_requests == [] and storage.downloads == []


@pytest.mark.parametrize("method", ["post", "put", "patch", "delete"])
def test_the_read_endpoints_accept_no_writing_methods(staff, method):
    client, _, _ = staff()

    for path in ENDPOINTS:
        assert getattr(client, method)(path, headers=SIGNED_IN).status_code == 405


# ── The list ────────────────────────────────────────────────────────────────


def test_list_returns_a_page_with_the_total(staff):
    client, database, _ = staff()

    response = client.get("/staff/reports", headers=SIGNED_IN)

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 7 and body["limit"] == 25 and body["offset"] == 0
    assert [item["reference_number"] for item in body["items"]] == ["CITS-000021", "CITS-000020"]
    assert body["items"][0]["ai"] == {"label": "Mahogany", "confidence": 94.8, "low_confidence": False}
    # A report the AI did not classify has no AI result, not an invented one.
    assert body["items"][1]["ai"] is None
    assert database.filters == [ReportFilters()]


def test_list_passes_filters_search_and_paging_through(staff):
    client, database, _ = staff()

    response = client.get(
        "/staff/reports",
        params={"status": "verified", "study_area": "dalipuga", "q": "  purok 4 ", "has_location": "true", "limit": 50, "offset": 100},
        headers=SIGNED_IN,
    )

    assert response.status_code == 200
    assert database.filters == [
        ReportFilters(status="verified", study_area="dalipuga", search="purok 4", has_location=True, limit=50, offset=100)
    ]
    assert response.json()["limit"] == 50 and response.json()["offset"] == 100


def test_blank_search_is_treated_as_no_search(staff):
    client, database, _ = staff()

    client.get("/staff/reports", params={"q": "   "}, headers=SIGNED_IN)

    assert database.filters == [ReportFilters()]


@pytest.mark.parametrize(
    "params",
    [
        {"status": "approved"},
        {"study_area": "manila"},
        {"limit": 0},
        {"limit": 201},
        {"offset": -1},
        {"q": "x" * 101},
        {"has_location": "maybe"},
    ],
)
def test_bad_filter_values_are_refused_before_the_database(staff, params):
    client, database, _ = staff()

    response = client.get("/staff/reports", params=params, headers=SIGNED_IN)

    assert response.status_code == 422
    assert database.filters == []


def test_list_and_dashboard_never_contain_reporter_details(staff):
    client, _, _ = staff()

    for path in ("/staff/reports", "/staff/dashboard"):
        text = client.get(path, headers=SIGNED_IN).text
        assert "reporter" not in text and "community_notes" not in text
        assert REPORTER_NAME not in text and REPORTER_CONTACT not in text


# ── Search text is data, never SQL or a wildcard ────────────────────────────


def test_search_wildcards_are_matched_as_themselves():
    assert like_pattern("100%") == "%100\\%%"
    assert like_pattern("a_b") == "%a\\_b%"
    assert like_pattern("back\\slash") == "%back\\\\slash%"


def test_search_text_is_a_parameter_and_never_part_of_the_sql():
    attack = "'; drop table citia.sighting_reports; --"

    where, values = report_filter_sql(ReportFilters(search=attack, status="verified"))

    assert attack not in where and "drop" not in where
    # The text arrives whole, as a value (its "_" escaped), three times.
    assert values == ["verified", *[like_pattern(attack)] * 3]
    assert r"drop table citia.sighting\_reports" in values[1]
    assert where.count("%s") == len(values)


def test_no_filters_means_no_where_clause():
    assert report_filter_sql(ReportFilters()) == ("", [])
    where, values = report_filter_sql(ReportFilters(has_location=True))
    assert where == "where latitude is not null and longitude is not null" and values == []


# ── One report ──────────────────────────────────────────────────────────────


def test_detail_returns_the_full_report_with_its_history(staff):
    client, database, _ = staff()

    response = client.get("/staff/reports/CITS-000021", headers=SIGNED_IN)

    assert response.status_code == 200
    body = response.json()
    assert body["reference_number"] == "CITS-000021"
    assert body["reporter_name"] == REPORTER_NAME
    assert body["reporter_contact"] == REPORTER_CONTACT
    assert body["community_notes"] == COMMUNITY_NOTES
    assert body["gps_accuracy_m"] == 12.0
    assert body["photo"] == {"mime_type": "image/jpeg", "width_px": 1024, "height_px": 768}
    assert body["ai"]["outcome"] == "succeeded" and body["ai"]["model_version"] == "test-model"
    # Newest first, and the earlier decision is still there.
    assert [r["decision"] for r in body["reviews"]] == ["rejected", "verified"]
    assert body["reviews"][0]["reviewer_name"] == "Maria Santos"
    assert body["reviews"][0]["rejection_reason"] == "Not a Mahogany leaf."
    assert database.detail_requests == ["CITS-000021"]


def test_detail_of_an_unclassified_report_without_a_photo(staff):
    database = FakeDatabase()
    database.details["CITS-000021"] = detail(
        photo_mime_type=None, photo_width_px=None, photo_height_px=None,
        ai_outcome=None, ai_label=None, ai_confidence=None, ai_low_confidence=None,
        ai_model_version=None, ai_classified_at=None, reviews=[],
    )
    client, _, _ = staff(database)

    body = client.get("/staff/reports/CITS-000021", headers=SIGNED_IN).json()

    assert body["photo"] is None and body["ai"] is None and body["reviews"] == []


def test_ai_that_could_not_run_is_reported_as_unavailable_not_as_a_label(staff):
    database = FakeDatabase()
    database.details["CITS-000021"] = detail(
        ai_outcome="unavailable", ai_label=None, ai_confidence=None, ai_low_confidence=None,
        ai_model_version=None,
    )
    client, _, _ = staff(database)

    ai = client.get("/staff/reports/CITS-000021", headers=SIGNED_IN).json()["ai"]

    assert ai["outcome"] == "unavailable" and ai["label"] is None


def test_unknown_report_is_404(staff):
    client, _, _ = staff()

    response = client.get("/staff/reports/CITS-999999", headers=SIGNED_IN)

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "report_not_found"


@pytest.mark.parametrize("reference", ["cits-000021", "CITS-21", "CITS-00002x", "1", "CITS-000021;drop"])
def test_malformed_reference_never_reaches_the_database(staff, reference):
    client, database, _ = staff()

    response = client.get(f"/staff/reports/{reference}", headers=SIGNED_IN)

    assert response.status_code == 422
    assert database.detail_requests == []


def test_opening_a_report_is_logged_without_personal_details(staff, caplog):
    client, _, _ = staff()

    with caplog.at_level("INFO", logger="uvicorn.error"):
        client.get("/staff/reports/CITS-000021", headers=SIGNED_IN)

    opened = [r.getMessage() for r in caplog.records if "opened report" in r.getMessage()]
    assert opened == [f"Staff {STAFF_ID} opened report CITS-000021."]
    assert REPORTER_NAME not in caplog.text and REPORTER_CONTACT not in caplog.text


# ── The photo ───────────────────────────────────────────────────────────────


def test_photo_is_served_to_staff_and_never_cached(staff):
    client, _, storage = staff()

    response = client.get("/staff/reports/CITS-000021/photo", headers=SIGNED_IN)

    assert response.status_code == 200
    assert response.content == PHOTO_BYTES
    assert response.headers["content-type"] == "image/jpeg"
    assert response.headers["cache-control"] == "private, no-store"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert storage.downloads == ["reports/abc/photo.jpg"]


def test_unexpected_file_type_is_sent_as_a_plain_download(staff):
    database = FakeDatabase()
    database.photos["CITS-000021"] = PhotoLocation("reports/abc/photo.jpg", "text/html")
    client, _, _ = staff(database)

    response = client.get("/staff/reports/CITS-000021/photo", headers=SIGNED_IN)

    assert response.headers["content-type"] == "application/octet-stream"


def test_report_without_a_photo_is_404(staff):
    client, _, storage = staff()

    response = client.get("/staff/reports/CITS-000020/photo", headers=SIGNED_IN)

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "photo_not_found"
    assert storage.downloads == []


def test_photo_missing_from_storage_is_404(staff):
    storage = FakeStorage()
    storage.files.clear()
    client, _, _ = staff(storage=storage)

    response = client.get("/staff/reports/CITS-000021/photo", headers=SIGNED_IN)

    assert response.status_code == 404


def test_storage_outage_is_503(staff):
    client, _, _ = staff(storage=FakeStorage(error=StorageUnavailable()))

    response = client.get("/staff/reports/CITS-000021/photo", headers=SIGNED_IN)

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "photo_unavailable"


def test_photo_is_503_when_storage_is_not_configured(staff):
    client, database, _ = staff(with_storage=False)

    response = client.get("/staff/reports/CITS-000021/photo", headers=SIGNED_IN)

    assert response.status_code == 503
    assert database.photo_requests == []


# ── The dashboard ───────────────────────────────────────────────────────────


def test_dashboard_adds_up_counts_and_lists_every_study_area(staff):
    client, _, _ = staff()

    response = client.get("/staff/dashboard", headers=SIGNED_IN)

    assert response.status_code == 200
    body = response.json()
    assert body["totals"] == {"total": 6, "pending_review": 2, "verified": 1, "rejected": 3}
    assert body["by_area"] == [
        {"study_area": "palao", "total": 3, "pending_review": 2, "verified": 1, "rejected": 0},
        # An area with no reports is still listed, with zeros.
        {"study_area": "dalipuga", "total": 0, "pending_review": 0, "verified": 0, "rejected": 0},
        {"study_area": "npc", "total": 3, "pending_review": 0, "verified": 0, "rejected": 3},
    ]
    assert body["recent_reports"][0]["reference_number"] == "CITS-000021"
    assert body["recent_reviews"] == [
        {
            "reference_number": "CITS-000020",
            "decision": "rejected",
            "reviewed_at": "2026-11-16T09:30:00Z",
            "reviewer_name": "Maria Santos",
        }
    ]


def test_empty_database_gives_zeros_not_an_error(staff):
    database = FakeDatabase()
    database.dashboard_data = DashboardData(counts=[], recent_reports=[], recent_reviews=[])
    database.page = ReportPage(items=[], total=0)
    client, _, _ = staff(database)

    dashboard = client.get("/staff/dashboard", headers=SIGNED_IN).json()
    listing = client.get("/staff/reports", headers=SIGNED_IN).json()

    assert dashboard["totals"]["total"] == 0 and dashboard["recent_reports"] == []
    assert listing == {"items": [], "total": 0, "limit": 25, "offset": 0}


# ── When the database is down ───────────────────────────────────────────────


@pytest.mark.parametrize("path", ENDPOINTS)
def test_database_outage_is_503_on_every_endpoint(staff, path):
    database = FakeDatabase()
    client, _, _ = staff(database)
    # Sign-in is checked first; the outage begins after that.
    database.error = DatabaseUnavailable()

    response = client.get(path, headers=SIGNED_IN)

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "reports_unavailable"


# ── Recording a review (Stage 15B) ──────────────────────────────────────────


class ReviewingDatabase(FakeDatabase):
    """MOCK database that also accepts review decisions, like the trigger."""

    def __init__(self, error=None, refuse=False):
        super().__init__()
        self.review_error = error
        self.refuse = refuse
        self.reviews = []

    def add_review(self, review):
        if self.review_error:
            raise self.review_error
        if self.refuse:
            raise ReviewNotSaved
        if review.reference_number not in self.details:
            return False
        self.reviews.append(review)
        # What the database trigger does: the newest decision sets the
        # status, and the history keeps every decision.
        current = self.details[review.reference_number]
        self.details[review.reference_number] = detail(
            review_status=review.decision,
            reviews=[
                ReviewEntry(review.decision, review.rejection_reason, review.staff_notes, WHEN, "Maria Santos"),
                *current.reviews,
            ],
        )
        return True


REVIEW_PATH = "/staff/reports/CITS-000021/reviews"


def test_staff_can_verify_a_report_and_get_it_back(staff):
    client, database, _ = staff(ReviewingDatabase())

    response = client.post(
        REVIEW_PATH, json={"decision": "verified", "staff_notes": "  Checked on site.  "}, headers=SIGNED_IN
    )

    assert response.status_code == 201
    body = response.json()
    assert body["review_status"] == "verified"
    assert body["reviews"][0]["decision"] == "verified"
    # The earlier decisions are still in the history.
    assert len(body["reviews"]) == 3
    [saved] = database.reviews
    assert saved.decision == "verified" and saved.rejection_reason is None
    assert saved.staff_notes == "Checked on site."


def test_the_reviewer_is_always_the_signed_in_staff_member(staff):
    client, database, _ = staff(ReviewingDatabase())

    client.post(REVIEW_PATH, json={"decision": "verified"}, headers=SIGNED_IN)

    assert database.reviews[0].reviewed_by == STAFF_ID


def test_naming_a_different_reviewer_in_the_request_is_refused(staff):
    client, database, _ = staff(ReviewingDatabase())

    response = client.post(
        REVIEW_PATH, json={"decision": "verified", "reviewed_by": str(uuid4())}, headers=SIGNED_IN
    )

    assert response.status_code == 422
    assert database.reviews == []


def test_rejecting_needs_a_reason_and_saves_it(staff):
    client, database, _ = staff(ReviewingDatabase())

    missing = client.post(REVIEW_PATH, json={"decision": "rejected"}, headers=SIGNED_IN)
    blank = client.post(REVIEW_PATH, json={"decision": "rejected", "rejection_reason": "   "}, headers=SIGNED_IN)
    given = client.post(
        REVIEW_PATH, json={"decision": "rejected", "rejection_reason": "Not a Mahogany leaf."}, headers=SIGNED_IN
    )

    assert missing.status_code == 422 and blank.status_code == 422
    assert given.status_code == 201
    assert [r.rejection_reason for r in database.reviews] == ["Not a Mahogany leaf."]


def test_a_reason_is_refused_when_verifying(staff):
    client, database, _ = staff(ReviewingDatabase())

    response = client.post(
        REVIEW_PATH, json={"decision": "verified", "rejection_reason": "Why"}, headers=SIGNED_IN
    )

    assert response.status_code == 422
    assert database.reviews == []


@pytest.mark.parametrize(
    "body",
    [
        {},
        {"decision": "pending_review"},
        {"decision": "approved"},
        {"decision": "verified", "staff_notes": "x" * 2001},
        {"decision": "rejected", "rejection_reason": "x" * 1001},
    ],
)
def test_invalid_decisions_are_refused_before_the_database(staff, body):
    client, database, _ = staff(ReviewingDatabase())

    response = client.post(REVIEW_PATH, json=body, headers=SIGNED_IN)

    assert response.status_code == 422
    assert database.reviews == []


def test_validation_errors_never_repeat_the_notes(staff):
    client, _, _ = staff(ReviewingDatabase())
    private = "Reporter lives at 12 Example Street " + "x" * 2000

    response = client.post(REVIEW_PATH, json={"decision": "verified", "staff_notes": private}, headers=SIGNED_IN)

    assert response.status_code == 422
    assert "Example Street" not in response.text


def test_a_second_decision_is_added_on_top_of_the_first(staff):
    client, database, _ = staff(ReviewingDatabase())

    client.post(REVIEW_PATH, json={"decision": "rejected", "rejection_reason": "Blurry photo."}, headers=SIGNED_IN)
    response = client.post(REVIEW_PATH, json={"decision": "verified"}, headers=SIGNED_IN)

    body = response.json()
    assert body["review_status"] == "verified"
    assert [r["decision"] for r in body["reviews"][:2]] == ["verified", "rejected"]
    assert len(database.reviews) == 2


def test_reviewing_an_unknown_report_is_404_and_saves_nothing(staff):
    client, database, _ = staff(ReviewingDatabase())

    response = client.post(
        "/staff/reports/CITS-999999/reviews", json={"decision": "verified"}, headers=SIGNED_IN
    )

    assert response.status_code == 404
    assert database.reviews == []


def test_malformed_reference_is_refused(staff):
    client, database, _ = staff(ReviewingDatabase())

    response = client.post("/staff/reports/abc/reviews", json={"decision": "verified"}, headers=SIGNED_IN)

    assert response.status_code == 422
    assert database.reviews == []


def test_only_staff_can_record_a_review(staff):
    client, database, _ = staff(ReviewingDatabase())

    assert client.post(REVIEW_PATH, json={"decision": "verified"}).status_code == 401
    outsider = bearer(make_token(sub=uuid4()))
    assert client.post(REVIEW_PATH, json={"decision": "verified"}, headers=outsider).status_code == 403
    assert database.reviews == []


@pytest.mark.parametrize("method", ["put", "patch", "delete"])
def test_a_review_can_be_added_but_never_changed_or_deleted(staff, method):
    client, _, _ = staff(ReviewingDatabase())

    response = getattr(client, method)(REVIEW_PATH, headers=SIGNED_IN)

    assert response.status_code == 405


def test_database_outage_is_503_and_a_refusal_is_500(staff):
    down, _, _ = staff(ReviewingDatabase(error=DatabaseUnavailable()))
    refused, _, _ = staff(ReviewingDatabase(refuse=True))

    first = down.post(REVIEW_PATH, json={"decision": "verified"}, headers=SIGNED_IN)
    second = refused.post(REVIEW_PATH, json={"decision": "verified"}, headers=SIGNED_IN)

    assert first.status_code == 503 and first.json()["error"]["code"] == "review_unavailable"
    assert second.status_code == 500 and second.json()["error"]["code"] == "review_not_saved"


def test_saved_decision_with_a_failed_reload_says_it_was_saved(staff):
    database = ReviewingDatabase()
    client, _, _ = staff(database)
    real_find = database.find_report_detail

    def reload_fails(reference):
        database.find_report_detail = real_find
        raise DatabaseUnavailable

    database.find_report_detail = reload_fails

    response = client.post(REVIEW_PATH, json={"decision": "verified"}, headers=SIGNED_IN)

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "review_saved_reload_failed"
    assert len(database.reviews) == 1


def test_recording_a_decision_is_logged_without_the_notes(staff, caplog):
    client, _, _ = staff(ReviewingDatabase())

    with caplog.at_level("INFO", logger="uvicorn.error"):
        client.post(
            REVIEW_PATH, json={"decision": "verified", "staff_notes": "Private note."}, headers=SIGNED_IN
        )

    assert f"Staff {STAFF_ID} recorded verified on report CITS-000021." in caplog.text
    assert "Private note." not in caplog.text
