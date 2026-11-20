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
from datetime import datetime
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

# ── Staff reads (Stage 15A). All SELECT; nothing here writes. ───────────────
#
# The list and the dashboard read the report_overview view, which holds no
# reporter name, contact or notes. Only FIND_REPORT_DETAIL selects those,
# and only for one report at a time.
REPORT_SUMMARY_COLUMNS = """
    reference_number, submitted_at, study_area, barangay, landmark,
    latitude, longitude, observation_type, review_status,
    (photo_id is not null) as has_photo,
    ai_label, ai_confidence, ai_low_confidence
"""

# The WHERE clause of a list request is built from these fixed pieces only.
# What the staff member typed is always passed as a query parameter, never
# written into the SQL text.
FILTER_STATUS = "review_status = %s"
FILTER_STUDY_AREA = "study_area = %s"
FILTER_HAS_LOCATION = "latitude is not null and longitude is not null"
# The backslash is declared as the escape character, so a typed % or _
# is matched as itself (see like_pattern).
FILTER_SEARCH = (
    "(reference_number ilike %s escape '\\'"
    " or barangay ilike %s escape '\\'"
    " or landmark ilike %s escape '\\')"
)

FIND_REPORT_DETAIL = """
    select r.id, r.reference_number, r.submitted_at, r.study_area, r.barangay,
           r.landmark, r.latitude, r.longitude, r.gps_accuracy_m,
           r.observation_type, r.community_notes, r.reporter_name,
           r.reporter_contact, r.review_status,
           p.mime_type, p.width_px, p.height_px,
           c.outcome, c.label, c.confidence, c.low_confidence,
           c.model_version, c.classified_at
    from citia.sighting_reports r
    left join citia.sighting_photos p on p.report_id = r.id
    left join lateral (
      select ac.outcome, ac.label, ac.confidence, ac.low_confidence,
             ac.model_version, ac.classified_at
      from citia.ai_classifications ac
      where ac.photo_id = p.id
      order by ac.classified_at desc, ac.id desc
      limit 1
    ) c on true
    where r.reference_number = %s
"""

FIND_REPORT_REVIEWS = """
    select v.decision, v.rejection_reason, v.staff_notes, v.reviewed_at, s.full_name
    from citia.report_reviews v
    join citia.staff_profiles s on s.id = v.reviewed_by
    where v.report_id = %s
    order by v.reviewed_at desc, v.id desc
"""

FIND_REPORT_PHOTO = """
    select p.storage_path, p.mime_type
    from citia.sighting_reports r
    join citia.sighting_photos p on p.report_id = r.id
    where r.reference_number = %s
"""

COUNT_REPORTS_BY_AREA_AND_STATUS = """
    select study_area, review_status, count(*)
    from citia.sighting_reports
    group by study_area, review_status
"""

FIND_RECENT_REVIEWS = """
    select r.reference_number, v.decision, v.reviewed_at, s.full_name
    from citia.report_reviews v
    join citia.sighting_reports r on r.id = v.report_id
    join citia.staff_profiles s on s.id = v.reviewed_by
    order by v.reviewed_at desc, v.id desc
    limit %s
"""

# ── Staff writes (Stage 15B) ───────────────────────────────────────────────
#
# A review is ADDED, never changed: report_reviews is append-only. The
# database trigger citia.apply_review then sets the report's
# review_status, reviewed_by and reviewed_at. Only the columns citia_api
# was granted are written; reviewed_at is set by the database.
#
# The report is found by its reference number inside the same statement,
# so a mistyped reference inserts nothing (and returns no row).
INSERT_REVIEW = """
    insert into citia.report_reviews (
      report_id, decision, rejection_reason, staff_notes, reviewed_by
    )
    select r.id, %s, %s, %s, %s
    from citia.sighting_reports r
    where r.reference_number = %s
    returning id
"""

# How many recent reports and recent reviews the dashboard shows.
DASHBOARD_RECENT_LIMIT = 8


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


class ReviewNotSaved(Exception):
    """The database refused a review. A bug, not a connection problem."""


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


@dataclass(frozen=True)
class NewReview:
    """One review decision, as a signed-in staff member made it."""

    reference_number: str
    decision: str
    rejection_reason: str | None
    staff_notes: str | None
    # Always the signed-in staff member, taken from their verified token.
    reviewed_by: UUID


@dataclass(frozen=True)
class ReportFilters:
    """What a staff member asked the reports list for."""

    status: str | None = None
    study_area: str | None = None
    search: str | None = None
    has_location: bool = False
    limit: int = 25
    offset: int = 0


@dataclass(frozen=True)
class ReportSummary:
    """One row of the reports list. Holds no reporter details."""

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
    ai_label: str | None
    ai_confidence: Decimal | None
    ai_low_confidence: bool | None


@dataclass(frozen=True)
class ReportPage:
    items: list[ReportSummary]
    total: int


@dataclass(frozen=True)
class ReviewEntry:
    """One decision in a report's review history."""

    decision: str
    rejection_reason: str | None
    staff_notes: str | None
    reviewed_at: datetime
    reviewer_name: str


@dataclass(frozen=True)
class ReportDetail:
    """One report in full, for a signed-in staff member. Includes the
    reporter's name and contact, so it is never used for a public reply."""

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
    photo_mime_type: str | None
    photo_width_px: int | None
    photo_height_px: int | None
    ai_outcome: str | None
    ai_label: str | None
    ai_confidence: Decimal | None
    ai_low_confidence: bool | None
    ai_model_version: str | None
    ai_classified_at: datetime | None
    reviews: list[ReviewEntry]


@dataclass(frozen=True)
class PhotoLocation:
    """Where a report's photo is kept in storage, and its type."""

    storage_path: str
    mime_type: str


@dataclass(frozen=True)
class RecentReview:
    reference_number: str
    decision: str
    reviewed_at: datetime
    reviewer_name: str


@dataclass(frozen=True)
class DashboardData:
    # (study_area, review_status, how many)
    counts: list[tuple[str, str, int]]
    recent_reports: list[ReportSummary]
    recent_reviews: list[RecentReview]


def like_pattern(search: str) -> str:
    """
    Turns typed search text into a "contains" pattern. A typed backslash,
    % or _ is escaped, so it is matched as itself and cannot act as a
    wildcard.
    """
    escaped = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def report_filter_sql(filters: ReportFilters) -> tuple[str, list[Any]]:
    """The WHERE clause for a list request, and the values it needs."""
    conditions: list[str] = []
    values: list[Any] = []
    if filters.status is not None:
        conditions.append(FILTER_STATUS)
        values.append(filters.status)
    if filters.study_area is not None:
        conditions.append(FILTER_STUDY_AREA)
        values.append(filters.study_area)
    if filters.has_location:
        conditions.append(FILTER_HAS_LOCATION)
    if filters.search:
        conditions.append(FILTER_SEARCH)
        values.extend([like_pattern(filters.search)] * 3)
    where = f"where {' and '.join(conditions)}" if conditions else ""
    return where, values


class Database(Protocol):
    """What the API needs from the database — the real pool or a test fake."""

    def ping(self) -> bool: ...

    def close(self) -> None: ...

    def find_report(self, client_submission_id: UUID) -> StoredReport | None: ...

    def insert_report(self, report: NewReport) -> str: ...

    def find_active_staff(self, user_id: UUID) -> StaffMember | None: ...

    def list_reports(self, filters: ReportFilters) -> ReportPage: ...

    def find_report_detail(self, reference_number: str) -> ReportDetail | None: ...

    def find_report_photo(self, reference_number: str) -> PhotoLocation | None: ...

    def dashboard(self) -> DashboardData: ...

    def add_review(self, review: "NewReview") -> bool: ...


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

    def list_reports(self, filters: ReportFilters) -> ReportPage:
        """One page of the reports list, newest first, and the total that
        match the filters."""
        where, values = report_filter_sql(filters)
        try:
            with self._pool.connection() as conn:
                total = conn.execute(
                    f"select count(*) from citia.report_overview {where}", values
                ).fetchone()[0]
                rows = conn.execute(
                    f"select {REPORT_SUMMARY_COLUMNS} from citia.report_overview {where}"
                    " order by submitted_at desc, reference_number desc limit %s offset %s",
                    [*values, filters.limit, filters.offset],
                ).fetchall()
        except psycopg.Error as exc:
            raise database_failure(exc) from None
        return ReportPage(items=[ReportSummary(*row) for row in rows], total=total)

    def find_report_detail(self, reference_number: str) -> ReportDetail | None:
        try:
            with self._pool.connection() as conn:
                row = conn.execute(FIND_REPORT_DETAIL, (reference_number,)).fetchone()
                if row is None:
                    return None
                reviews = conn.execute(FIND_REPORT_REVIEWS, (row[0],)).fetchall()
        except psycopg.Error as exc:
            raise database_failure(exc) from None
        # row[0] is the report's internal id: used for the reviews query
        # above and not passed on.
        return ReportDetail(*row[1:], reviews=[ReviewEntry(*review) for review in reviews])

    def find_report_photo(self, reference_number: str) -> PhotoLocation | None:
        try:
            with self._pool.connection() as conn:
                row = conn.execute(FIND_REPORT_PHOTO, (reference_number,)).fetchone()
        except psycopg.Error as exc:
            raise database_failure(exc) from None
        return PhotoLocation(*row) if row else None

    def dashboard(self) -> DashboardData:
        try:
            with self._pool.connection() as conn:
                counts = conn.execute(COUNT_REPORTS_BY_AREA_AND_STATUS).fetchall()
                reports = conn.execute(
                    f"select {REPORT_SUMMARY_COLUMNS} from citia.report_overview"
                    " order by submitted_at desc, reference_number desc limit %s",
                    (DASHBOARD_RECENT_LIMIT,),
                ).fetchall()
                reviews = conn.execute(FIND_RECENT_REVIEWS, (DASHBOARD_RECENT_LIMIT,)).fetchall()
        except psycopg.Error as exc:
            raise database_failure(exc) from None
        return DashboardData(
            counts=[(area, status, count) for area, status, count in counts],
            recent_reports=[ReportSummary(*row) for row in reports],
            recent_reviews=[RecentReview(*row) for row in reviews],
        )

    def add_review(self, review: NewReview) -> bool:
        """
        Adds one decision to the report's history. Returns False when no
        report has that reference number (nothing is written then).
        """
        try:
            with self._pool.connection() as conn:
                row = conn.execute(
                    INSERT_REVIEW,
                    (
                        review.decision,
                        review.rejection_reason,
                        review.staff_notes,
                        review.reviewed_by,
                        review.reference_number,
                    ),
                ).fetchone()
        except psycopg.OperationalError as exc:
            raise database_failure(exc) from None
        except psycopg.Error as exc:
            # Logged like database_failure: the type and the constraint
            # only, never the row (it holds the staff notes).
            logger.error(
                "Database refused a review (%s, constraint %s).",
                type(exc).__name__,
                exc.diag.constraint_name,
            )
            raise ReviewNotSaved from None
        return row is not None

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
