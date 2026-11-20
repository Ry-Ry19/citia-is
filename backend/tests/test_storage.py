# backend/tests/test_storage.py
#
# WHAT: Tests for the storage module, its settings, and how /health and
#   the MODEL_VERSION rule behave.
#
# NO REAL STORAGE: a fake S3 client is used, so these tests do NOT prove
#   Supabase accepts the requests or that the access keys work.

import logging

import pytest
from botocore.exceptions import ClientError, EndpointConnectionError
from fastapi.testclient import TestClient
from pydantic import ValidationError

from main import create_app
from storage import (
    S3PhotoStorage,
    StorageSetupError,
    StorageUnavailable,
    client_config,
    open_storage,
)
from tests.helpers import FakeClassifier, make_settings, no_model

ACCESS_KEY = "fake-access-key-id-123"
SECRET_KEY = "fake-secret-access-key-456"
STORAGE = {
    "storage_s3_endpoint": "https://ref.storage.example.com/storage/v1/s3",
    "storage_s3_region": "ap-southeast-1",
    "storage_s3_access_key_id": ACCESS_KEY,
    "storage_s3_secret_access_key": SECRET_KEY,
}


def client_error(code="NoSuchBucket"):
    return ClientError({"Error": {"Code": code, "Message": f"failed for {SECRET_KEY}"}}, "PutObject")


class FakeS3Client:
    def __init__(self, error=None):
        self.error = error
        self.calls = []

    def _record(self, name, kwargs):
        self.calls.append((name, kwargs))
        if self.error:
            raise self.error

    def put_object(self, **kwargs):
        self._record("put_object", kwargs)

    def delete_object(self, **kwargs):
        self._record("delete_object", kwargs)

    def head_bucket(self, **kwargs):
        self._record("head_bucket", kwargs)


# ── The S3 wrapper ──────────────────────────────────────────────────────────


def test_upload_targets_the_bucket_with_the_content_type():
    client = FakeS3Client()

    S3PhotoStorage(client, "sighting-photos").upload("reports/a/b.jpg", b"data", "image/jpeg")

    assert client.calls == [
        ("put_object", {"Bucket": "sighting-photos", "Key": "reports/a/b.jpg", "Body": b"data", "ContentType": "image/jpeg"})
    ]


def test_delete_targets_the_bucket():
    client = FakeS3Client()

    S3PhotoStorage(client, "sighting-photos").delete("reports/a/b.jpg")

    assert client.calls == [("delete_object", {"Bucket": "sighting-photos", "Key": "reports/a/b.jpg"})]


@pytest.mark.parametrize("error", [client_error(), EndpointConnectionError(endpoint_url="https://x")])
def test_upload_failure_is_reported_without_logging_details(error, caplog):
    with caplog.at_level(logging.WARNING):
        with pytest.raises(StorageUnavailable):
            S3PhotoStorage(FakeS3Client(error), "b").upload("k", b"d", "image/jpeg")

    assert SECRET_KEY not in caplog.text


def test_delete_failure_is_reported():
    with pytest.raises(StorageUnavailable):
        S3PhotoStorage(FakeS3Client(client_error()), "b").delete("k")


def test_ping_names_the_failure_but_not_its_details(caplog):
    with caplog.at_level(logging.WARNING):
        assert S3PhotoStorage(FakeS3Client(client_error("AccessDenied")), "b").ping() is False

    assert "AccessDenied" in caplog.text
    assert SECRET_KEY not in caplog.text


def test_ping_succeeds_when_the_bucket_answers():
    assert S3PhotoStorage(FakeS3Client(), "b").ping() is True


def test_client_uses_signature_v4_without_automatic_checksums():
    config = client_config()

    assert config.signature_version == "s3v4"
    assert config.s3 == {"addressing_style": "path"}
    assert config.request_checksum_calculation == "when_required"
    assert config.response_checksum_validation == "when_required"


def test_open_storage_needs_every_setting():
    with pytest.raises(StorageSetupError):
        open_storage(make_settings(**{**STORAGE, "storage_s3_region": None}))


def test_open_storage_builds_a_client_for_the_endpoint():
    storage = open_storage(make_settings(**STORAGE))

    assert storage._client.meta.endpoint_url == STORAGE["storage_s3_endpoint"]
    assert storage._client.meta.region_name == "ap-southeast-1"


# ── Settings ────────────────────────────────────────────────────────────────


def test_storage_keys_are_hidden_when_settings_are_printed():
    settings = make_settings(**STORAGE)

    for text in (repr(settings), settings.model_dump_json()):
        assert ACCESS_KEY not in text and SECRET_KEY not in text


def test_storage_endpoint_must_use_https():
    with pytest.raises(ValidationError) as error:
        make_settings(**{**STORAGE, "storage_s3_endpoint": "http://ref.example.com"})

    assert SECRET_KEY not in str(error.value)


@pytest.mark.parametrize(
    "missing",
    ["storage_s3_endpoint", "storage_s3_region", "storage_s3_access_key_id", "storage_s3_secret_access_key"],
)
def test_storage_needs_all_four_settings(missing):
    assert make_settings(**STORAGE).storage_configured is True
    assert make_settings(**{**STORAGE, missing: "  "}).storage_configured is False


# ── /health ─────────────────────────────────────────────────────────────────


class FakeStorage:
    def __init__(self, healthy=True):
        self.healthy = healthy

    def ping(self):
        return self.healthy


def start(opener):
    app = create_app(make_settings(**STORAGE), classifier_loader=no_model, storage_opener=opener)
    return TestClient(app, raise_server_exceptions=False)


def test_health_reports_a_reachable_bucket_as_ready():
    with start(lambda settings: FakeStorage()) as client:
        assert client.get("/health").json()["storage"] == "ready"


def test_health_reports_an_unreachable_bucket_as_unavailable():
    with start(lambda settings: FakeStorage(healthy=False)) as client:
        assert client.get("/health").json()["storage"] == "unavailable"


def test_storage_startup_error_leaves_the_api_running_and_logs_no_keys(caplog):
    def opener(settings):
        raise RuntimeError(f"bad key {SECRET_KEY}")

    with caplog.at_level(logging.INFO):
        with start(opener) as client:
            response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["storage"] == "unavailable"
    assert SECRET_KEY not in caplog.text


# ── MODEL_VERSION ───────────────────────────────────────────────────────────


def test_inference_stays_unavailable_without_a_model_version():
    def loader(path):
        raise AssertionError("must not be called")

    app = create_app(make_settings(model_version=None), classifier_loader=loader)

    with TestClient(app, raise_server_exceptions=False) as client:
        assert client.get("/health").json()["inference_ready"] is False


def test_inference_is_ready_with_a_model_version():
    app = create_app(make_settings(), classifier_loader=lambda path: FakeClassifier())

    with TestClient(app, raise_server_exceptions=False) as client:
        assert client.get("/health").json()["inference_ready"] is True
