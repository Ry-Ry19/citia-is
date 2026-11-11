# backend/auth.py
#
# WHAT: Verifying the Supabase Auth access token of a CENRO staff member.
#
# HOW: Supabase signs access tokens with the project's ES256 (ECC P-256)
#   key. This service checks each token against the project's PUBLIC key
#   list (JWKS), so no secret is needed here:
#     https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json
#
# WHAT A TOKEN PROVES: only who signed in. Whether that person is CENRO
#   staff, and their role, comes from citia.staff_profiles — never from
#   the token — so disabling a profile takes effect on the next request.
#
# LOGGING: a token is never logged. Only the reason it was refused is.

import logging
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any
from uuid import UUID

import jwt
from jwt import PyJWKClient

from config import Settings

logger = logging.getLogger("uvicorn.error")

# Only the algorithm Supabase signs with. This also rejects "none" and
# any token signed with the legacy shared secret (HS256).
ALGORITHMS = ["ES256"]
AUDIENCE = "authenticated"

# Tolerance for small clock differences between Supabase and this server.
LEEWAY_SECONDS = 30

# The key list is kept for 10 minutes. A token signed with a key not in
# the cached list makes the client fetch the list once more (a rotation),
# but not more often than the cooldown allows.
JWKS_CACHE_SECONDS = 600
JWKS_TIMEOUT_SECONDS = 5
JWKS_REFETCH_COOLDOWN_SECONDS = 30

# Turns a token into the public key that should have signed it.
KeyResolver = Callable[[str], Any]


class AuthSetupError(Exception):
    """Staff authentication is not configured."""


class KeysUnavailable(Exception):
    """The project's public key list could not be fetched."""


class InvalidToken(Exception):
    """The token was refused. `reason` is safe to log; the token is not."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


@dataclass(frozen=True)
class VerifiedToken:
    user_id: UUID
    # Shown in the staff portal header; never used to decide access.
    email: str | None


class TokenVerifier:
    def __init__(self, issuer: str, key_resolver: KeyResolver) -> None:
        self._issuer = issuer
        self._resolve_key = key_resolver

    def verify(self, token: str) -> VerifiedToken:
        try:
            header = jwt.get_unverified_header(token)
        except jwt.InvalidTokenError:
            raise InvalidToken("malformed") from None

        # Checked before any key lookup, so a forged HS256 or "none"
        # token never even causes a request for the key list.
        if header.get("alg") not in ALGORITHMS:
            raise InvalidToken("algorithm")

        try:
            key = self._resolve_key(token)
        except jwt.PyJWKClientConnectionError:
            raise KeysUnavailable from None
        except (jwt.PyJWKClientError, jwt.InvalidTokenError):
            raise InvalidToken("unknown_key") from None

        try:
            claims = jwt.decode(
                token,
                key,
                algorithms=ALGORITHMS,
                audience=AUDIENCE,
                issuer=self._issuer,
                leeway=LEEWAY_SECONDS,
                options={"require": ["exp", "iat", "iss", "aud", "sub"]},
            )
        except jwt.ExpiredSignatureError:
            raise InvalidToken("expired") from None
        except jwt.InvalidAudienceError:
            raise InvalidToken("audience") from None
        except jwt.InvalidIssuerError:
            raise InvalidToken("issuer") from None
        except jwt.MissingRequiredClaimError:
            raise InvalidToken("missing_claim") from None
        except jwt.InvalidSignatureError:
            raise InvalidToken("signature") from None
        except jwt.InvalidTokenError:
            raise InvalidToken("invalid") from None

        if claims.get("role") != "authenticated":
            raise InvalidToken("role")
        if claims.get("is_anonymous") is True:
            raise InvalidToken("anonymous")
        try:
            user_id = UUID(str(claims["sub"]))
        except ValueError:
            raise InvalidToken("subject") from None

        email = claims.get("email")
        return VerifiedToken(user_id=user_id, email=email if isinstance(email, str) and email else None)


def open_verifier(settings: Settings) -> TokenVerifier:
    """Builds the verifier. No network request is made until a token arrives."""
    if settings.supabase_url is None:
        raise AuthSetupError("SUPABASE_URL is not set.")

    issuer = f"{settings.supabase_url}/auth/v1"
    client = PyJWKClient(
        f"{issuer}/.well-known/jwks.json",
        cache_keys=True,
        lifespan=JWKS_CACHE_SECONDS,
        timeout=JWKS_TIMEOUT_SECONDS,
        cooldown_duration=JWKS_REFETCH_COOLDOWN_SECONDS,
    )
    return TokenVerifier(issuer, lambda token: client.get_signing_key_from_jwt(token).key)
