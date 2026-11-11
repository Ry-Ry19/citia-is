# backend/storage.py
#
# WHAT: Storing report photos in the private Supabase Storage bucket,
#   through Storage's S3 protocol.
#
# OPTIONAL, LIKE THE DATABASE: without storage settings the API still
#   starts; /health reports storage as "not_configured" and POST /reports
#   answers 503.
#
# S3 COMPATIBILITY: Supabase requires Signature Version 4. boto3's
#   automatic upload checksums are switched off because Supabase does
#   not list those headers as supported for PutObject.
#
# LOGGING: only the kind of failure is logged, never the exception text,
#   so access keys and signed request details cannot reach the log.

import logging
from typing import Literal, Protocol

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

from config import Settings

logger = logging.getLogger("uvicorn.error")

StorageStatus = Literal["ready", "unavailable", "not_configured"]

# Short enough that a failing check or upload returns an answer promptly.
CONNECT_TIMEOUT_SECONDS = 5
READ_TIMEOUT_SECONDS = 30
MAX_ATTEMPTS = 2

STORAGE_ERRORS = (BotoCoreError, ClientError)


class StorageSetupError(Exception):
    """Storage is not configured, so the client cannot be created."""


class StorageUnavailable(Exception):
    """Storage could not complete a request."""


class PhotoStorage(Protocol):
    """Anything that can hold report photos — the real bucket or a test fake."""

    def upload(self, key: str, data: bytes, content_type: str) -> None: ...

    def delete(self, key: str) -> None: ...

    def ping(self) -> bool: ...


def failure_reason(exc: Exception) -> str:
    """A log-safe name for a storage failure, e.g. "NoSuchBucket"."""
    if isinstance(exc, ClientError):
        return str(exc.response.get("Error", {}).get("Code", "ClientError"))
    return type(exc).__name__


class S3PhotoStorage:
    """The real bucket, reached with a boto3 S3 client."""

    def __init__(self, client, bucket: str) -> None:
        self._client = client
        self._bucket = bucket

    def upload(self, key: str, data: bytes, content_type: str) -> None:
        try:
            self._client.put_object(
                Bucket=self._bucket,
                Key=key,
                Body=data,
                ContentType=content_type,
            )
        except STORAGE_ERRORS as exc:
            logger.warning("Photo upload failed (%s).", failure_reason(exc))
            raise StorageUnavailable from None

    def delete(self, key: str) -> None:
        try:
            self._client.delete_object(Bucket=self._bucket, Key=key)
        except STORAGE_ERRORS as exc:
            logger.warning("Photo delete failed (%s).", failure_reason(exc))
            raise StorageUnavailable from None

    def ping(self) -> bool:
        """True when the bucket exists and the access keys can reach it."""
        try:
            self._client.head_bucket(Bucket=self._bucket)
        except STORAGE_ERRORS as exc:
            logger.warning("Storage health check failed (%s).", failure_reason(exc))
            return False
        return True


def client_config() -> Config:
    return Config(
        signature_version="s3v4",
        s3={"addressing_style": "path"},
        connect_timeout=CONNECT_TIMEOUT_SECONDS,
        read_timeout=READ_TIMEOUT_SECONDS,
        retries={"max_attempts": MAX_ATTEMPTS, "mode": "standard"},
        request_checksum_calculation="when_required",
        response_checksum_validation="when_required",
    )


def open_storage(settings: Settings) -> S3PhotoStorage:
    if not settings.storage_configured:
        raise StorageSetupError("Storage settings are incomplete.")

    client = boto3.client(
        "s3",
        endpoint_url=settings.storage_s3_endpoint,
        region_name=settings.storage_s3_region,
        aws_access_key_id=settings.storage_s3_access_key_id.get_secret_value(),
        aws_secret_access_key=settings.storage_s3_secret_access_key.get_secret_value(),
        config=client_config(),
    )
    return S3PhotoStorage(client, settings.storage_bucket)
