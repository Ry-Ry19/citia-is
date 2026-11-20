# backend/tests/test_reports.py
#
# WHAT: Tests for POST /reports and the SQL behind it.
#
# NO REAL SERVICES: these tests use a fake database, fake storage and a
#   MOCK classifier. They check the API's own behaviour. They do NOT
#   prove the real database accepts these statements, and they do NOT
#   verify real YOLOv8n-cls inference.

import io
import logging
import re
from decimal import Decimal
from pathlib import Path
from uuid import UUID, uuid4

import psycopg
import pytest
from fastapi.testclient import TestClient
from PIL import Image, PngImagePlugin

import database as database_module
import reports as reports_module
from database import (
    DatabaseUnavailable,
    DuplicateSubmission,
    NewReport,
    PooledDatabase,
    ReportNotSaved,
    StoredReport,
)
from images import CleanPhoto
from main import create_app
from storage import StorageUnavailable
from tests.helpers import FakeClassifier, image_bytes, make_settings, no_model

REPORTER_NAME = "Juana Dela Cruz"
REPORTER_CONTACT = "juana.reporter@example.invalid"
MIGRATION = Path(__file__).resolve().parent.parent / "migrations" / "0001_citia_initial_schema.sql"


class FakeDatabase:
    """MOCK database: remembers reports in a dictionary."""

    def __init__(self, reference="CITS-000019"):
        self.reference = reference
        self.reports = {}
        self.inserted = []
        self.insert_error = None
        self.find_error = None
        self.saved_despite_error = False

    def ping(self):
        return True

    def close(self):
        pass

    def find_report(self, client_submission_id):
        if self.find_error:
            raise self.find_error
        return self.reports.get(client_submission_id)

    def insert_report(self, report):
        if self.saved_despite_error:
            self.reports[report.client_submission_id] = StoredReport(
                self.reference, "pending_review", "unavailable", None, None, None
            )
        if self.insert_error:
            raise self.insert_error
        self.inserted.append(report)
        return self.reference


class FakeStorage:
    """MOCK storage: remembers uploads in a dictionary."""

    def __init__(self):
        self.objects = {}
        self.upload_error = None
        self.delete_error = None

    def ping(self):
        return True

    def upload(self, key, data, content_type):
        if self.upload_error:
            raise self.upload_error
        self.objects[key] = (data, content_type)

    def delete(self, key):
        if self.delete_error:
            raise self.delete_error
        self.objects.pop(key)


CONFIGURED = {
    "database_url": "postgresql://citia_api.ref:test@pooler.example.com:5432/postgres",
    "storage_s3_endpoint": "https://ref.storage.example.com/storage/v1/s3",
    "storage_s3_region": "ap-southeast-1",
    "storage_s3_access_key_id": "test-access-key",
    "storage_s3_secret_access_key": "test-secret-key",
}


@pytest.fixture
def reporting():
    """Builds a started client wired to the fakes it was given."""
    opened = []

    def _make(classifier=None, database=None, storage=None, **overrides):
        database = database if database is not None else FakeDatabase()
        storage = storage if storage is not None else FakeStorage()
        loader = (lambda path: classifier) if classifier is not None else no_model
        client = TestClient(
            create_app(
                make_settings(**{**CONFIGURED, **overrides}),
                classifier_loader=loader,
                database_opener=lambda settings: database,
                storage_opener=lambda settings: storage,
            ),
            raise_server_exceptions=False,
        )
        client.__enter__()
        opened.append(client)
        return client, database, storage

    yield _make

    for client in opened:
        client.__exit__(None, None, None)


def valid_form(**overrides):
    form = {
        "client_submission_id": str(uuid4()),
        "study_area": "palao",
        "observation_type": "single_tree",
        "consent_confirmed": "true",
        "barangay": "Palao",
        "landmark": "Near the park fence",
        "community_notes": "Large tree beside the walkway.",
        "reporter_name": REPORTER_NAME,
        "reporter_contact": REPORTER_CONTACT,
        "latitude": "8.2215",
        "longitude": "124.2482",
        "gps_accuracy_m": "12.5",
    }
    form.update(overrides)
    return {key: value for key, value in form.items() if value is not None}


def photo_file(data=None, name="leaf.jpg", content_type="image/jpeg"):
    return ("photo", (name, data if data is not None else image_bytes(), content_type))


def submit(client, form=None, files=None):
    return client.post(
        "/reports",
        data=form if form is not None else valid_form(),
        files=files if files is not None else [photo_file()],
    )


# ── Saving a report ─────────────────────────────────────────────────────────


def test_valid_report_is_saved_without_a_model(reporting):
    client, database, storage = reporting()

    response = submit(client)

    assert response.status_code == 201
    assert response.json() == {
        "reference_number": "CITS-000019",
        "status": "pending_review",
        "classification": {"outcome": "unavailable"},
    }

    saved = database.inserted[0]
    assert saved.study_area == "palao"
    assert saved.reporter_name == REPORTER_NAME
    assert saved.latitude == pytest.approx(8.2215)
    assert saved.outcome == "unavailable"
    assert saved.label is None and saved.confidence is None and saved.model_version is None

    key = re.fullmatch(r"reports/([0-9a-f-]{36})/([0-9a-f-]{36})\.jpg", saved.storage_path)
    assert key and key.group(1) == str(saved.report_id) and key.group(2) == str(saved.photo_id)
    assert list(storage.objects) == [saved.storage_path]
    assert storage.objects[saved.storage_path][1] == "image/jpeg"
    assert saved.byte_size == len(storage.objects[saved.storage_path][0])


def test_successful_classification_is_returned_and_saved(reporting):
    client, database, _ = reporting(classifier=FakeClassifier("Mahogany", 94.8))

    body = submit(client).json()

    assert body["classification"] == {"outcome": "succeeded", "label": "Mahogany", "confidence": 94.8, "low_confidence": False}
    saved = database.inserted[0]
    assert (saved.outcome, saved.label, saved.confidence) == ("succeeded", "Mahogany", 94.8)
    assert saved.confidence_threshold == 70.0
    assert saved.model_version == "test-model"


def test_low_confidence_is_flagged(reporting):
    client, _, _ = reporting(classifier=FakeClassifier("Mahogany", 65.0))

    assert submit(client).json()["classification"]["low_confidence"] is True


def test_classifier_error_is_recorded_as_failed_and_the_report_is_kept(reporting):
    client, database, _ = reporting(classifier=FakeClassifier(error=RuntimeError("boom")))

    response = submit(client)

    assert response.status_code == 201
    assert response.json()["classification"] == {"outcome": "failed"}
    assert database.inserted[0].label is None and database.inserted[0].confidence is None


def test_blank_optional_fields_are_saved_as_not_provided(reporting):
    client, database, _ = reporting()

    form = valid_form(barangay="   ", reporter_name="", latitude="", longitude="", gps_accuracy_m="")
    assert submit(client, form).status_code == 201

    saved = database.inserted[0]
    assert saved.barangay is None and saved.reporter_name is None and saved.latitude is None


def test_reply_never_contains_reporter_details(reporting):
    client, _, _ = reporting()

    text = submit(client).text

    assert REPORTER_NAME not in text and REPORTER_CONTACT not in text


def test_reports_are_not_saved_when_services_are_missing(reporting):
    client, _, _ = reporting(storage_s3_endpoint=None)

    response = submit(client)

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "reporting_unavailable"


# ── Repeated submissions ────────────────────────────────────────────────────


def test_repeated_submission_returns_the_existing_report(reporting):
    client, database, storage = reporting()
    form = valid_form()
    database.reports[UUID(form["client_submission_id"])] = StoredReport(
        "CITS-000020", "pending_review", "succeeded", "Mahogany", Decimal("94.8"), False
    )

    response = submit(client, form)

    assert response.status_code == 200
    assert response.json() == {
        "reference_number": "CITS-000020",
        "status": "pending_review",
        "classification": {"outcome": "succeeded", "label": "Mahogany", "confidence": 94.8, "low_confidence": False},
    }
    assert database.inserted == [] and storage.objects == {}


def test_simultaneous_retry_removes_the_extra_photo(reporting):
    client, database, storage = reporting()
    form = valid_form()

    def lose_the_race(report):
        database.reports[report.client_submission_id] = StoredReport(
            "CITS-000021", "pending_review", "unavailable", None, None, None
        )
        raise DuplicateSubmission

    database.insert_report = lose_the_race

    response = submit(client, form)

    assert response.status_code == 200
    assert response.json()["reference_number"] == "CITS-000021"
    assert storage.objects == {}


# ── Rejected submissions: nothing may be stored ─────────────────────────────


@pytest.mark.parametrize(
    "overrides, field",
    [
        ({"client_submission_id": "not-a-uuid"}, "client_submission_id"),
        ({"client_submission_id": None}, "client_submission_id"),
        ({"study_area": "iligan"}, "study_area"),
        ({"study_area": None}, "study_area"),
        ({"observation_type": "forest"}, "observation_type"),
        ({"consent_confirmed": "false"}, "consent_confirmed"),
        ({"consent_confirmed": None}, "consent_confirmed"),
        ({"latitude": "91"}, "latitude"),
        ({"longitude": "-181"}, "longitude"),
        ({"latitude": "nan"}, "latitude"),
        ({"gps_accuracy_m": "0"}, "gps_accuracy_m"),
        ({"barangay": "x" * 101}, "barangay"),
        ({"landmark": "x" * 201}, "landmark"),
        ({"community_notes": "x" * 2001}, "community_notes"),
        ({"reporter_name": "x" * 101}, "reporter_name"),
        ({"reporter_contact": "x" * 151}, "reporter_contact"),
        ({"landmark": "bad\x00text"}, "landmark"),
        ({"longitude": None}, "coordinates"),
        ({"latitude": None, "longitude": None}, "coordinates"),
    ],
)
def test_invalid_fields_are_rejected_and_nothing_is_stored(reporting, overrides, field):
    client, database, storage = reporting()

    response = submit(client, valid_form(**overrides))

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "validation_error"
    assert field in [detail["field"] for detail in error["details"]]
    assert database.inserted == [] and storage.objects == {}


def test_validation_errors_never_repeat_personal_data(reporting):
    client, _, _ = reporting()

    response = submit(client, valid_form(study_area="bad", reporter_name=f"{REPORTER_NAME}{'x' * 100}"))

    assert response.status_code == 422
    assert REPORTER_NAME not in response.text


def test_a_photo_is_required(reporting):
    client, database, storage = reporting()

    response = client.post("/reports", data=valid_form())

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "photo_required"
    assert database.inserted == [] and storage.objects == {}


def test_a_second_photo_is_rejected(reporting):
    client, database, storage = reporting()

    response = submit(client, files=[photo_file(), photo_file(name="second.jpg")])

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "one_photo_only"
    assert database.inserted == [] and storage.objects == {}


def test_a_file_that_is_not_an_image_is_rejected(reporting):
    client, database, storage = reporting()

    response = submit(client, files=[photo_file(b"this is not an image")])

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalid_image"
    assert database.inserted == [] and storage.objects == {}


def test_an_oversized_photo_is_rejected(reporting):
    client, database, storage = reporting(max_upload_bytes=2048)

    response = submit(client, files=[photo_file(image_bytes(size=(256, 256)))])

    assert response.status_code == 413
    assert database.inserted == [] and storage.objects == {}


def test_photo_that_grows_too_large_when_cleaned_is_not_uploaded(reporting, monkeypatch):
    client, database, storage = reporting(max_upload_bytes=2048)
    monkeypatch.setattr(
        reports_module,
        "encode_clean_photo",
        lambda original, image: CleanPhoto(b"x" * 4096, "image/jpeg", "jpg", 1, 1, "a" * 64),
    )

    response = submit(client, files=[photo_file(image_bytes(size=(8, 8)))])

    assert response.status_code == 413
    assert database.inserted == [] and storage.objects == {}


# ── Failures while saving ───────────────────────────────────────────────────


def test_storage_failure_saves_nothing(reporting):
    storage = FakeStorage()
    storage.upload_error = StorageUnavailable()
    client, database, _ = reporting(storage=storage)

    response = submit(client)

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "reporting_unavailable"
    assert database.inserted == []


def test_database_failure_removes_the_uploaded_photo(reporting):
    database = FakeDatabase()
    database.insert_error = DatabaseUnavailable()
    client, _, storage = reporting(database=database)

    response = submit(client)

    assert response.status_code == 503
    assert storage.objects == {}


def test_refused_report_removes_the_photo_and_answers_generically(reporting):
    database = FakeDatabase()
    database.insert_error = ReportNotSaved()
    client, _, storage = reporting(database=database)

    response = submit(client)

    assert response.status_code == 500
    assert response.json()["error"]["code"] == "report_not_saved"
    assert storage.objects == {}


def test_photo_is_kept_if_the_report_was_saved_despite_the_error(reporting):
    database = FakeDatabase()
    database.insert_error = DatabaseUnavailable()
    database.saved_despite_error = True
    client, _, storage = reporting(database=database)

    submit(client)

    assert len(storage.objects) == 1


def test_photo_is_kept_if_the_failed_save_cannot_be_confirmed(reporting):
    database = FakeDatabase()
    database.insert_error = DatabaseUnavailable()
    client, _, storage = reporting(database=database)
    original_insert = database.insert_report

    def fail_and_lose_connection(report):
        database.find_error = DatabaseUnavailable()
        return original_insert(report)

    database.insert_report = fail_and_lose_connection

    assert submit(client).status_code == 503
    assert len(storage.objects) == 1


def test_failed_photo_cleanup_does_not_change_the_reply(reporting):
    database = FakeDatabase()
    database.insert_error = DatabaseUnavailable()
    storage = FakeStorage()
    storage.delete_error = StorageUnavailable()
    client, _, _ = reporting(database=database, storage=storage)

    assert submit(client).status_code == 503


# ── Photo cleaning ──────────────────────────────────────────────────────────


def stored_image(storage):
    data, content_type = next(iter(storage.objects.values()))
    return Image.open(io.BytesIO(data)), content_type


def test_location_metadata_is_removed_and_rotation_is_kept(reporting):
    client, _, storage = reporting()
    exif = Image.Exif()
    exif[0x0112] = 6  # rotated: a 40x20 file displays as 20x40
    exif.get_ifd(0x8825)[1] = "N"  # GPS block
    buffer = io.BytesIO()
    Image.new("RGB", (40, 20), "green").save(buffer, format="JPEG", exif=exif)

    assert submit(client, files=[photo_file(buffer.getvalue())]).status_code == 201

    image, content_type = stored_image(storage)
    assert content_type == "image/jpeg"
    assert image.size == (20, 40)
    assert dict(image.getexif()) == {}
    assert "exif" not in image.info


def test_png_stays_png_without_its_text_metadata(reporting):
    client, database, storage = reporting()
    info = PngImagePlugin.PngInfo()
    info.add_text("Location", "Home address")
    buffer = io.BytesIO()
    Image.new("RGB", (10, 10), "green").save(buffer, format="PNG", pnginfo=info)

    assert submit(client, files=[photo_file(buffer.getvalue(), "leaf.png", "image/png")]).status_code == 201

    image, content_type = stored_image(storage)
    assert content_type == "image/png"
    assert "Location" not in image.info
    assert database.inserted[0].storage_path.endswith(".png")


# ── The SQL statements, against a fake connection ───────────────────────────


class ScriptedConnection:
    def __init__(self, rows):
        self.rows = list(rows)
        self.statements = []

    def execute(self, sql, params=None):
        self.statements.append(sql)
        row = self.rows.pop(0) if self.rows else None

        class Result:
            def fetchone(self):
                return row

        return Result()


class ScriptedPool:
    def __init__(self, connection=None, error=None):
        self.conn = connection
        self.error = error

    def connection(self):
        pool = self

        class Borrowed:
            def __enter__(self):
                if pool.error:
                    raise pool.error
                return pool.conn

            def __exit__(self, *exc):
                return False

        return Borrowed()


def new_report():
    return NewReport(
        report_id=uuid4(), client_submission_id=uuid4(), study_area="palao", observation_type="single_tree",
        barangay=None, landmark=None, latitude=None, longitude=None, gps_accuracy_m=None, community_notes=None,
        reporter_name=REPORTER_NAME, reporter_contact=REPORTER_CONTACT, consent_confirmed=True,
        photo_id=uuid4(), storage_path="reports/a/b.jpg", mime_type="image/jpeg", byte_size=1, width_px=1, height_px=1,
        sha256="a" * 64, outcome="unavailable", label=None, confidence=None, confidence_threshold=None,
        model_version=None, weights_sha256=None,
    )


def granted_insert_columns():
    """The column-level INSERT grants, read from the applied migration."""
    text = MIGRATION.read_text(encoding="utf-8")
    grants = re.findall(r"grant insert \(([^)]*)\)\s+on citia\.(\w+) to citia_api", text)
    return {table: {column.strip() for column in columns.split(",")} for columns, table in grants}


@pytest.mark.parametrize(
    "statement",
    [database_module.INSERT_REPORT, database_module.INSERT_PHOTO, database_module.INSERT_CLASSIFICATION],
)
def test_every_insert_uses_only_columns_granted_to_citia_api(statement):
    table, columns = re.search(r"insert into citia\.(\w+) \(([^)]*)\)", statement).groups()

    used = {column.strip() for column in columns.split(",")}

    assert used <= granted_insert_columns()[table]
    assert statement.count("%s") == len(used)


def test_report_photo_and_attempt_are_saved_together_in_order():
    conn = ScriptedConnection([("CITS-000019",)])

    assert PooledDatabase(ScriptedPool(conn)).insert_report(new_report()) == "CITS-000019"

    assert conn.statements == [
        database_module.INSERT_REPORT,
        database_module.INSERT_PHOTO,
        database_module.INSERT_CLASSIFICATION,
    ]


def test_conflicting_submission_stops_before_the_photo_row():
    conn = ScriptedConnection([None])

    with pytest.raises(DuplicateSubmission):
        PooledDatabase(ScriptedPool(conn)).insert_report(new_report())

    assert conn.statements == [database_module.INSERT_REPORT]


def test_find_report_never_selects_reporter_details():
    assert "reporter_" not in database_module.FIND_REPORT


def test_connection_problem_is_reported_as_unavailable():
    with pytest.raises(DatabaseUnavailable):
        PooledDatabase(ScriptedPool(error=psycopg.OperationalError("down"))).insert_report(new_report())


def test_refused_row_is_never_written_to_the_log(caplog):
    error = psycopg.errors.CheckViolation(f"Failing row contains ({REPORTER_NAME}, {REPORTER_CONTACT})")

    with caplog.at_level(logging.INFO):
        with pytest.raises(ReportNotSaved):
            PooledDatabase(ScriptedPool(error=error)).insert_report(new_report())

    assert "CheckViolation" in caplog.text
    assert REPORTER_NAME not in caplog.text and REPORTER_CONTACT not in caplog.text
