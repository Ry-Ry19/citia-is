# backend/tests/test_database.py
#
# WHAT: Tests for the database settings, the connection pool module, and
#   how /health reports the database.
#
# NO REAL DATABASE: these tests never connect to Supabase. They use fake
#   pools and fake connections, so they check the API's own behaviour
#   (security options, role check, safe failure), not the live database.

import logging

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

import database
from config import BACKEND_DIR
from database import (
    APPLICATION_NAME,
    DatabaseSetupError,
    PooledDatabase,
    WrongDatabaseRole,
    configure_connection,
    connection_options,
    open_database,
)
from main import create_app
from tests.helpers import make_settings, no_model

FAKE_PASSWORD = "not-a-real-password-123"
FAKE_URL = f"postgresql://citia_api.testref:{FAKE_PASSWORD}@pooler.example.com:5432/postgres"


class FakeDatabase:
    """Stands in for the real pool in /health tests."""

    def __init__(self, healthy=True):
        self.healthy = healthy
        self.closed = False

    def ping(self):
        return self.healthy

    def close(self):
        self.closed = True


def start(settings, opener):
    app = create_app(settings, classifier_loader=no_model, database_opener=opener)
    return TestClient(app, raise_server_exceptions=False)


def raising(exc):
    def opener(settings):
        raise exc

    return opener


# ── Settings ────────────────────────────────────────────────────────────────


def test_database_url_is_hidden_when_settings_are_printed():
    settings = make_settings(database_url=FAKE_URL)

    assert FAKE_PASSWORD not in repr(settings)
    assert FAKE_PASSWORD not in str(settings.database_url)
    assert FAKE_PASSWORD not in settings.model_dump_json()
    assert settings.database_url.get_secret_value() == FAKE_URL


def test_invalid_database_url_is_rejected_without_repeating_it():
    with pytest.raises(ValidationError) as error:
        make_settings(database_url=f"mysql://user:{FAKE_PASSWORD}@host/db")

    assert FAKE_PASSWORD not in str(error.value)


def test_empty_database_url_means_not_configured():
    assert make_settings(database_url="  ").database_url is None


def test_pool_minimum_cannot_exceed_maximum():
    with pytest.raises(ValidationError):
        make_settings(database_pool_min_size=5, database_pool_max_size=2)


def test_relative_certificate_path_is_read_from_backend_folder():
    settings = make_settings(database_ssl_root_cert="certs/other.crt")

    assert settings.database_ssl_root_cert == BACKEND_DIR / "certs" / "other.crt"


def test_supabase_url_must_use_https_and_loses_trailing_slash():
    assert make_settings(supabase_url="https://ref.supabase.co/").supabase_url == "https://ref.supabase.co"

    with pytest.raises(ValidationError):
        make_settings(supabase_url="http://ref.supabase.co")


# ── Connection options and the role check ──────────────────────────────────


def test_every_connection_verifies_the_server_and_disables_prepared_statements(tmp_path):
    cert = tmp_path / "root.crt"
    options = connection_options(make_settings(database_ssl_root_cert=cert))

    assert options["sslmode"] == "verify-full"
    assert options["sslrootcert"] == str(cert)
    assert options["prepare_threshold"] is None
    assert options["application_name"] == APPLICATION_NAME
    assert options["connect_timeout"] == 10


class FakeConnection:
    def __init__(self, role):
        self.role = role
        self.executed = []
        self.committed = False

    def execute(self, sql, params=None):
        self.executed.append((sql, params))
        role = self.role

        class Result:
            def fetchone(self):
                return (role,)

        return Result()

    def commit(self):
        self.committed = True


def test_connection_as_another_role_is_refused():
    conn = FakeConnection(role="postgres")

    with pytest.raises(WrongDatabaseRole):
        configure_connection(conn, statement_timeout_ms=15_000)

    assert len(conn.executed) == 1  # only the role check ran
    assert conn.committed is False


def test_citia_api_connection_gets_a_statement_timeout():
    conn = FakeConnection(role="citia_api")

    configure_connection(conn, statement_timeout_ms=15_000)

    assert conn.executed[1] == ("select set_config('statement_timeout', %s, false)", ("15000ms",))
    assert conn.committed is True


# ── Opening the pool ───────────────────────────────────────────────────────


class FakePool:
    created = []

    def __init__(self, **kwargs):
        self.kwargs = kwargs
        self.opened_with = None
        self.closed = False
        FakePool.created.append(self)

    def open(self, wait=True):
        self.opened_with = wait

    def close(self):
        self.closed = True


@pytest.fixture
def fake_pool(monkeypatch):
    FakePool.created = []
    monkeypatch.setattr(database, "ConnectionPool", FakePool)
    return FakePool


def test_missing_certificate_stops_the_pool_from_being_created(tmp_path, fake_pool):
    settings = make_settings(database_url=FAKE_URL, database_ssl_root_cert=tmp_path / "missing.crt")

    with pytest.raises(DatabaseSetupError):
        open_database(settings)

    assert fake_pool.created == []


def test_pool_opens_in_the_background_with_the_secure_options(tmp_path, fake_pool):
    cert = tmp_path / "root.crt"
    cert.write_text("test certificate")
    settings = make_settings(database_url=FAKE_URL, database_ssl_root_cert=cert)

    db = open_database(settings)

    pool = fake_pool.created[0]
    assert isinstance(db, PooledDatabase)
    assert pool.opened_with is False  # never blocks startup
    assert pool.kwargs["conninfo"] == FAKE_URL
    assert pool.kwargs["kwargs"]["sslmode"] == "verify-full"
    assert pool.kwargs["min_size"] == 1
    assert pool.kwargs["max_size"] == 4
    assert pool.kwargs["open"] is False
    assert callable(pool.kwargs["configure"])

    db.close()
    assert pool.closed is True


def test_ping_reports_failure_without_logging_its_details(caplog):
    class BrokenPool:
        def connection(self, timeout):
            raise RuntimeError(f"could not connect with {FAKE_URL}")

    with caplog.at_level(logging.WARNING):
        assert PooledDatabase(BrokenPool()).ping() is False

    assert FAKE_PASSWORD not in caplog.text


def test_ping_succeeds_when_a_connection_answers():
    class WorkingPool:
        def connection(self, timeout):
            class Borrowed:
                def __enter__(self):
                    return FakeConnection(role="citia_api")

                def __exit__(self, *exc):
                    return False

            return Borrowed()

    assert PooledDatabase(WorkingPool()).ping() is True


# ── /health ─────────────────────────────────────────────────────────────────


def test_health_never_opens_a_database_that_is_not_configured():
    with start(make_settings(), raising(AssertionError("must not be called"))) as client:
        assert client.get("/health").json()["database"] == "not_configured"


def test_health_reports_a_working_database_as_ready():
    with start(make_settings(database_url=FAKE_URL), lambda settings: FakeDatabase()) as client:
        response = client.get("/health")

    assert response.json()["database"] == "ready"
    assert FAKE_PASSWORD not in response.text


def test_health_reports_an_unreachable_database_as_unavailable():
    with start(make_settings(database_url=FAKE_URL), lambda settings: FakeDatabase(healthy=False)) as client:
        assert client.get("/health").json()["database"] == "unavailable"


def test_setup_problem_leaves_the_api_running_with_database_unavailable():
    opener = raising(DatabaseSetupError("The SSL root certificate was not found."))

    with start(make_settings(database_url=FAKE_URL), opener) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["database"] == "unavailable"


def test_unexpected_startup_error_never_logs_the_connection_url(caplog):
    opener = raising(RuntimeError(f"bad connection string {FAKE_URL}"))

    with caplog.at_level(logging.INFO):
        with start(make_settings(database_url=FAKE_URL), opener) as client:
            assert client.get("/health").json()["database"] == "unavailable"

    assert FAKE_PASSWORD not in caplog.text
    assert "RuntimeError" in caplog.text


def test_shutdown_closes_the_database():
    fake = FakeDatabase()

    with start(make_settings(database_url=FAKE_URL), lambda settings: fake):
        assert fake.closed is False

    assert fake.closed is True
