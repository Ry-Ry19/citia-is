# backend/config.py
#
# WHAT: Every configurable setting for the CITIA-IS FastAPI service.
#
# WHERE VALUES COME FROM: environment variables, or a backend/.env file
#   during local development. backend/.env is git-ignored — copy
#   backend/.env.example to create it.
#
# FAIL EARLY: an invalid value (a wildcard CORS origin, a typo in
#   ENVIRONMENT) stops the server at startup with a clear message,
#   instead of causing confusing behaviour later.

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent


def split_origins(value: str) -> list[str]:
    """Turns "http://a, http://b/" into ["http://a", "http://b"]."""
    return [item.strip().rstrip("/") for item in value.split(",") if item.strip()]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        # A rejected setting's value is never repeated in the error
        # message, so a bad DATABASE_URL cannot print its password.
        hide_input_in_errors=True,
    )

    # "development" turns on the interactive API docs at /docs.
    environment: Literal["development", "production"] = "development"

    # Comma-separated frontend origins allowed to call the API from a
    # browser. Kept as a plain string so it is easy to write in .env.
    cors_origins: str = "http://localhost:3000"

    # Trained YOLOv8n-cls weights. A relative path is read from backend/.
    weights_path: Path = BACKEND_DIR / "models" / "mahogany_cls.pt"

    # Below this Classification Confidence (0–100) a result is flagged as
    # uncertain and the community member is asked for a clearer photo.
    # PROVISIONAL: confirm against the model's evaluation results.
    low_confidence_threshold: float = Field(default=70.0, ge=0, le=100, allow_inf_nan=False)

    # Largest accepted upload in bytes (default 10 MB).
    max_upload_bytes: int = Field(default=10 * 1024 * 1024, ge=1024, le=50 * 1024 * 1024)

    # Largest accepted image resolution, width x height (default 50 megapixels).
    max_image_pixels: int = Field(default=50_000_000, ge=1, le=100_000_000)

    # Names the trained model in every saved AI result. Required: without
    # it AI classification stays unavailable, so no result can be saved
    # without knowing which model produced it.
    model_version: str | None = Field(default=None, max_length=100)

    # ── Database (Supabase PostgreSQL) ──────────────────────────────────
    # Connection URL for the citia_api role through the Session pooler.
    # SecretStr keeps the password out of logs, error messages and
    # repr(); read it only with .get_secret_value(). Optional: without
    # it the API still starts and /health reports the database as
    # "not_configured".
    database_url: SecretStr | None = None

    # Supabase's root certificate, used to verify the database server
    # (sslmode=verify-full). A relative path is read from backend/.
    database_ssl_root_cert: Path = BACKEND_DIR / "certs" / "supabase-root.crt"

    # Kept small: the Free plan's shared pooler has limited capacity.
    database_pool_min_size: int = Field(default=1, ge=0, le=5)
    database_pool_max_size: int = Field(default=4, ge=1, le=10)

    # Seconds to wait when opening a connection or borrowing one from
    # the pool, and the longest a single query may run (milliseconds).
    database_connect_timeout_seconds: int = Field(default=10, ge=1, le=60)
    database_statement_timeout_ms: int = Field(default=15_000, ge=1_000, le=120_000)

    # ── Supabase Auth ───────────────────────────────────────────────────
    # Project URL, e.g. https://<project-ref>.supabase.co. Used later to
    # verify staff access tokens; not a secret.
    supabase_url: str | None = None

    # ── Supabase Storage (S3 protocol) ──────────────────────────────────
    # Report photos go to this private bucket. All four values are needed;
    # until they are set, /health reports storage as "not_configured" and
    # POST /reports answers 503. S3 access keys reach ALL of the project's
    # Storage and bypass its RLS, so they stay in backend/.env only.
    storage_s3_endpoint: str | None = None
    storage_s3_region: str | None = None
    storage_s3_access_key_id: SecretStr | None = None
    storage_s3_secret_access_key: SecretStr | None = None
    storage_bucket: str = "sighting-photos"

    @field_validator("cors_origins")
    @classmethod
    def check_cors_origins(cls, value: str) -> str:
        origins = split_origins(value)

        if not origins:
            raise ValueError("CORS_ORIGINS must list at least one origin.")

        if "*" in origins:
            raise ValueError(
                "CORS_ORIGINS must not contain '*'. List each frontend origin explicitly."
            )

        for origin in origins:
            if not origin.startswith(("http://", "https://")):
                raise ValueError(f"CORS origin must start with http:// or https://: {origin}")

        return value

    @field_validator("weights_path", "database_ssl_root_cert")
    @classmethod
    def resolve_backend_path(cls, value: Path) -> Path:
        return value if value.is_absolute() else BACKEND_DIR / value

    @field_validator("database_url")
    @classmethod
    def check_database_url(cls, value: SecretStr | None) -> SecretStr | None:
        if value is None or not value.get_secret_value().strip():
            return None
        # The message never repeats the value, which contains a password.
        if not value.get_secret_value().startswith(("postgresql://", "postgres://")):
            raise ValueError("DATABASE_URL must start with postgresql://")
        return value

    @field_validator("storage_s3_access_key_id", "storage_s3_secret_access_key")
    @classmethod
    def blank_secret_means_not_set(cls, value: SecretStr | None) -> SecretStr | None:
        if value is None or not value.get_secret_value().strip():
            return None
        return value

    @field_validator("model_version", "storage_s3_region")
    @classmethod
    def blank_text_means_not_set(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        return value.strip()

    @field_validator("storage_s3_endpoint")
    @classmethod
    def check_storage_endpoint(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        value = value.strip().rstrip("/")
        if not value.startswith("https://"):
            raise ValueError("STORAGE_S3_ENDPOINT must start with https://")
        return value

    @field_validator("supabase_url")
    @classmethod
    def check_supabase_url(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        value = value.strip().rstrip("/")
        if not value.startswith("https://"):
            raise ValueError("SUPABASE_URL must start with https://")
        return value

    @model_validator(mode="after")
    def check_pool_sizes(self) -> "Settings":
        if self.database_pool_min_size > self.database_pool_max_size:
            raise ValueError("DATABASE_POOL_MIN_SIZE cannot be larger than DATABASE_POOL_MAX_SIZE.")
        return self

    @property
    def storage_configured(self) -> bool:
        return None not in (
            self.storage_s3_endpoint,
            self.storage_s3_region,
            self.storage_s3_access_key_id,
            self.storage_s3_secret_access_key,
        )

    @property
    def cors_origin_list(self) -> list[str]:
        return split_origins(self.cors_origins)


@lru_cache
def get_settings() -> Settings:
    """Reads the settings once and reuses them for the life of the process."""
    return Settings()
