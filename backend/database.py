# backend/database.py
#
# WHAT: The connection pool to the CITIA-IS Supabase PostgreSQL database.
#
# OPTIONAL, LIKE THE MODEL: the API must start even when the database is
#   not configured, unreachable, or paused (Free plan). The pool is opened
#   in the background, so a slow or failed connection never blocks or
#   crashes startup; /health then reports the database as "unavailable".
#
# SECURITY:
#   - Every connection uses sslmode=verify-full with Supabase's root
#     certificate, so the API only talks to the real Supabase server.
#   - Every connection must be the least-privilege citia_api role. A
#     connection made as any other role (for example the postgres owner)
#     is refused before it can be used.
#   - Log messages name the problem but never include the connection URL,
#     which contains the password.
#
# POOLER: the Session pooler (port 5432) keeps one server connection per
#   pool connection. Automatic prepared statements are switched off anyway,
#   so moving to the transaction pooler later cannot break queries.

import logging
from dataclasses import dataclass
from decimal import Decimal
from functools import partial
from typing import Any, Literal, Protocol
from uuid import UUID

import psycopg
from psycopg import Connection
from psycopg_pool import ConnectionPool

from config import Settings

logger = logging.getLogger("uvicorn.error")

# The only database role the API is allowed to use.
EXPECTED_ROLE = "citia_api"

# Shown in Supabase's connection list, so the API's connections are easy
# to recognise.
APPLICATION_NAME = "citia-is-api"

# How long /health waits for a free connection before reporting
# "unavailable". Short, so a health check never hangs.
HEALTH_PING_TIMEOUT_SECONDS = 3.0

DatabaseStatus = Literal["ready", "unavailable", "not_configured"]

# Every statement names exactly the columns citia_api was granted, and
# every table with its schema. Server-set columns (timestamps, reference
# number, review status) are never written from here.
#
# ON CONFLICT handles two simultaneous retries of one submission: the
# loser inserts nothing and gets no row back.
INSERT_REPORT = """
    insert into citia.sighting_reports (
      id, client_submission_id, study_area, barangay, landmark,
      latitude, longitude, gps_accuracy_m, observation_type,
      community_notes, reporter_name, reporter_contact, consent_confirmed
    )
    values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    on conflict (client_submission_id) do nothing
    returning reference_number
"""

INSERT_PHOTO = """
    insert into citia.sighting_photos (
      id, report_id, storage_path, mime_type, byte_size, width_px, height_px, sha256
    )
    values (%s, %s, %s, %s, %s, %s, %s, %s)
"""

INSERT_CLASSIFICATION = """
    insert into citia.ai_classifications (
      photo_id, outcome, label, confidence, confidence_threshold,
      model_version, weights_sha256
    )
    values (%s, %s, %s, %s, %s, %s, %s)
"""

# Only an ACTIVE profile counts: a disabled account gets no access.
FIND_ACTIVE_STAFF = """
    select id, full_name, role
    from citia.staff_profiles
    where id = %s and account_status = 'active'
"""

# Reporter details are deliberately not selected: this feeds a public reply.
FIND_REPORT = """
    select r.reference_number, r.review_status,
           c.outcome, c.label, c.confidence, c.low_confidence
    from citia.sighting_reports r
    left join citia.sighting_photos p on p.report_id = r.id
    left join lateral (
      select ac.outcome, ac.label, ac.confidence, ac.low_confidence
      from citia.ai_classifications ac
      where ac.photo_id = p.id
      order by ac.classified_at desc, ac.id desc
      limit 1
    ) c on true
    where r.client_submission_id = %s
"""


class DatabaseSetupError(Exception):
    """The database is configured, but the pool cannot be opened safely."""


class WrongDatabaseRole(Exception):
    """A connection was made as a role other than citia_api."""


class DatabaseUnavailable(Exception):
    """The database could not be reached, or did not answer in time."""


class ReportNotSaved(Exception):
    """The database refused a report. A bug, not a connection problem."""


class DuplicateSubmission(Exception):
    """A report with this client_submission_id already exists."""


@dataclass(frozen=True)
class NewReport:
    """One submission: the report, its photo, and its AI attempt."""

    report_id: UUID
    client_submission_id: UUID
    study_area: str
    observation_type: str
    barangay: str | None
    landmark: str | None
    latitude: float | None
    longitude: float | None
    gps_accuracy_m: float | None
    community_notes: str | None
    reporter_name: str | None
    reporter_contact: str | None
    consent_confirmed: bool

    photo_id: UUID
    storage_path: str
    mime_type: str
    byte_size: int
    width_px: int
    height_px: int
    sha256: str

    outcome: str
    label: str | None
    confidence: float | None
    confidence_threshold: float | None
    model_version: str | None
    weights_sha256: str | None


@dataclass(frozen=True)
class StoredReport:
    """What a repeated submission gets back. Holds no reporter details."""

    reference_number: str
    review_status: str
    outcome: str | None
    label: str | None
    confidence: Decimal | None
    low_confidence: bool | None


@dataclass(frozen=True)
class StaffMember:
    id: UUID
    full_name: str
    role: str


class Database(Protocol):
    """What the API needs from the database — the real pool or a test fake."""

    def ping(self) -> bool: ...

    def close(self) -> None: ...

    def find_report(self, client_submission_id: UUID) -> StoredReport | None: ...

    def insert_report(self, report: NewReport) -> str: ...

    def find_active_staff(self, user_id: UUID) -> StaffMember | None: ...


def connection_options(settings: Settings) -> dict[str, Any]:
    """
    Options added to every connection. They override anything in
    DATABASE_URL, so the URL cannot weaken them (for example by asking
    for sslmode=disable).
    """
    return {
        "sslmode": "verify-full",
        "sslrootcert": str(settings.database_ssl_root_cert),
        "connect_timeout": settings.database_connect_timeout_seconds,
        "application_name": APPLICATION_NAME,
        "prepare_threshold": None,
    }


def configure_connection(conn: Connection, statement_timeout_ms: int) -> None:
    """
    Runs once on every new connection, before the pool hands it out.
    Refuses the connection if it is not citia_api, then sets a time limit
    for every query on it.
    """
    role = conn.execute("select current_user").fetchone()[0]
    if role != EXPECTED_ROLE:
        logger.error(
            "Refusing database connection: connected as %r, but the API must use %r.",
            role,
            EXPECTED_ROLE,
        )
        raise WrongDatabaseRole(f"Connected as {role!r}, expected {EXPECTED_ROLE!r}.")

    # SET cannot take a query parameter; set_config can. false = for the
    # whole session, not just this transaction.
    conn.execute(
        "select set_config('statement_timeout', %s, false)",
        (f"{statement_timeout_ms}ms",),
    )
    conn.commit()


def database_failure(exc: psycopg.Error) -> Exception:
    """
    Logs a database error safely and picks what to raise. Only the error
    type and constraint name are logged: a database error's message can
    quote the failing row, which holds a reporter's personal details.
    """
    if isinstance(exc, psycopg.OperationalError):
        logger.warning("Database request failed (%s).", type(exc).__name__)
        return DatabaseUnavailable()

    logger.error(
        "Database refused a report (%s, constraint %s).",
        type(exc).__name__,
        exc.diag.constraint_name,
    )
    return ReportNotSaved()


class PooledDatabase:
    """The real database: a small psycopg connection pool."""

    def __init__(self, pool: ConnectionPool) -> None:
        self._pool = pool

    def ping(self) -> bool:
        """True when a connection can be borrowed and answers a query."""
        try:
            with self._pool.connection(timeout=HEALTH_PING_TIMEOUT_SECONDS) as conn:
                conn.execute("select 1")
        except Exception as exc:
            # The exception type is enough to diagnose; its message could
            # contain connection details.
            logger.warning("Database health check failed (%s).", type(exc).__name__)
            return False
        return True

    def find_active_staff(self, user_id: UUID) -> StaffMember | None:
        try:
            with self._pool.connection() as conn:
                row = conn.execute(FIND_ACTIVE_STAFF, (user_id,)).fetchone()
        except psycopg.Error as exc:
            raise database_failure(exc) from None
        return StaffMember(*row) if row else None

    def find_report(self, client_submission_id: UUID) -> StoredReport | None:
        try:
            with self._pool.connection() as conn:
                row = conn.execute(FIND_REPORT, (client_submission_id,)).fetchone()
        except psycopg.Error as exc:
            raise database_failure(exc) from None
        return StoredReport(*row) if row else None

    def insert_report(self, report: NewReport) -> str:
        """
        Saves the report, its photo and its AI attempt in one transaction:
        all three are stored, or none. Returns the reference number.
        """
        try:
            with self._pool.connection() as conn:
                row = conn.execute(
                    INSERT_REPORT,
                    (
                        report.report_id,
                        report.client_submission_id,
                        report.study_area,
                        report.barangay,
                        report.landmark,
                        report.latitude,
                        report.longitude,
                        report.gps_accuracy_m,
                        report.observation_type,
                        report.community_notes,
                        report.reporter_name,
                        report.reporter_contact,
                        report.consent_confirmed,
                    ),
                ).fetchone()
                if row is None:
                    raise DuplicateSubmission

                conn.execute(
                    INSERT_PHOTO,
                    (
                        report.photo_id,
                        report.report_id,
                        report.storage_path,
                        report.mime_type,
                        report.byte_size,
                        report.width_px,
                        report.height_px,
                        report.sha256,
                    ),
                )
                conn.execute(
                    INSERT_CLASSIFICATION,
                    (
                        report.photo_id,
                        report.outcome,
                        report.label,
                        report.confidence,
                        report.confidence_threshold,
                        report.model_version,
                        report.weights_sha256,
                    ),
                )
        except psycopg.Error as exc:
            raise database_failure(exc) from None
        return row[0]

    def close(self) -> None:
        self._pool.close()


def open_database(settings: Settings) -> PooledDatabase:
    """
    Creates the pool and starts opening its connections in the background.
    Raises DatabaseSetupError for a problem that a retry cannot fix.
    """
    if settings.database_url is None:
        raise DatabaseSetupError("DATABASE_URL is not set.")

    if not settings.database_ssl_root_cert.is_file():
        raise DatabaseSetupError(
            "The SSL root certificate was not found at "
            f"{settings.database_ssl_root_cert}. Download it from the Supabase "
            "Dashboard (Database settings) or set DATABASE_SSL_ROOT_CERT."
        )

    pool = ConnectionPool(
        conninfo=settings.database_url.get_secret_value(),
        kwargs=connection_options(settings),
        min_size=settings.database_pool_min_size,
        max_size=settings.database_pool_max_size,
        timeout=settings.database_connect_timeout_seconds,
        configure=partial(
            configure_connection,
            statement_timeout_ms=settings.database_statement_timeout_ms,
        ),
        name="citia-api",
        open=False,
    )
    # wait=False: connect in the background so startup never blocks.
    pool.open(wait=False)
    return PooledDatabase(pool)
