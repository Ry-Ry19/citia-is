# backend/tests/test_auth.py
#
# WHAT: Tests for staff token verification and GET /staff/me.
#
# NO NETWORK: tokens are signed with P-256 keys generated here, and the
#   key list is built in Supabase's JWKS format in memory. These tests
#   prove the checks; they do not prove a real Supabase token passes.

import json
import logging
import time
from uuid import uuid4

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient

from auth import InvalidToken, KeysUnavailable, TokenVerifier, open_verifier
from database import DatabaseUnavailable, StaffMember
from main import create_app
from tests.helpers import make_settings, no_model

ISSUER = "https://testref.supabase.co/auth/v1"
SIGNING_KEY = ec.generate_private_key(ec.SECP256R1())
OTHER_KEY = ec.generate_private_key(ec.SECP256R1())
KID = "f0b6fc02-test-key"
# Long enough that PyJWT does not warn; it only stands in for a forger.
FORGED_HS256_SECRET = "forged-legacy-shared-secret-for-tests-only"


def public_jwk(private_key, kid=KID):
    """A public key exactly as Supabase publishes it in its JWKS."""
    jwk = json.loads(jwt.algorithms.ECAlgorithm.to_jwk(private_key.public_key()))
    jwk.update({"kid": kid, "alg": "ES256", "use": "sig", "key_ops": ["verify"]})
    return jwk


JWKS = jwt.PyJWKSet.from_dict({"keys": [public_jwk(SIGNING_KEY)]})


def jwks_resolver(token):
    """Looks the key up by kid, the way PyJWKClient does."""
    kid = jwt.get_unverified_header(token).get("kid")
    for key in JWKS.keys:
        if key.key_id == kid:
            return key.key
    raise jwt.PyJWKClientError(f"Unable to find a signing key that matches: {kid}")


def make_token(key=SIGNING_KEY, algorithm="ES256", kid=KID, **claims):
    now = int(time.time())
    payload = {
        "iss": ISSUER,
        "aud": "authenticated",
        "sub": str(claims.pop("sub", uuid4())),
        "exp": now + 3600,
        "iat": now,
        "role": "authenticated",
        "email": "officer@example.invalid",
        "is_anonymous": False,
        "session_id": str(uuid4()),
    }
    payload.update(claims)
    payload = {name: value for name, value in payload.items() if value is not None}
    return jwt.encode(payload, key, algorithm=algorithm, headers={"kid": kid} if kid else None)


VERIFIER = TokenVerifier(ISSUER, jwks_resolver)


# ── The token checks ────────────────────────────────────────────────────────


def test_a_valid_supabase_token_is_accepted():
    user_id = uuid4()

    verified = VERIFIER.verify(make_token(sub=user_id))

    assert verified.user_id == user_id
    assert verified.email == "officer@example.invalid"


@pytest.mark.parametrize(
    "token, reason",
    [
        (make_token(exp=int(time.time()) - 120), "expired"),
        (make_token(iss="https://other.supabase.co/auth/v1"), "issuer"),
        (make_token(aud="anon"), "audience"),
        (make_token(key=OTHER_KEY), "signature"),
        (make_token(kid="unknown-kid"), "unknown_key"),
        (make_token(role="anon"), "role"),
        (make_token(role="service_role"), "role"),
        (make_token(is_anonymous=True), "anonymous"),
        (make_token(sub="not-a-uuid"), "subject"),
        (make_token(exp=None), "missing_claim"),
        (make_token(iat=None), "missing_claim"),
        (make_token(key=FORGED_HS256_SECRET, algorithm="HS256"), "algorithm"),
        (make_token(key=None, algorithm="none"), "algorithm"),
        ("not.a.token", "malformed"),
        ("", "malformed"),
    ],
)
def test_bad_tokens_are_refused_with_a_safe_reason(token, reason):
    with pytest.raises(InvalidToken) as error:
        VERIFIER.verify(token)

    assert error.value.reason == reason


def test_hs256_token_never_triggers_a_key_lookup():
    def resolver(token):
        raise AssertionError("no key lookup for a forged algorithm")

    with pytest.raises(InvalidToken):
        TokenVerifier(ISSUER, resolver).verify(make_token(key=FORGED_HS256_SECRET, algorithm="HS256"))


def test_small_clock_difference_is_tolerated():
    VERIFIER.verify(make_token(exp=int(time.time()) - 10))


def test_unreachable_key_list_is_not_a_refusal():
    def resolver(token):
        raise jwt.PyJWKClientConnectionError("network down")

    with pytest.raises(KeysUnavailable):
        TokenVerifier(ISSUER, resolver).verify(make_token())


def test_verifier_reads_the_project_key_list_and_issuer():
    verifier = open_verifier(make_settings(supabase_url="https://testref.supabase.co"))

    assert verifier._issuer == ISSUER


# ── GET /staff/me ───────────────────────────────────────────────────────────


class FakeStaffDatabase:
    """MOCK database: knows which accounts have an ACTIVE staff profile."""

    def __init__(self, active=None, error=None):
        self.active = active or {}
        self.error = error

    def ping(self):
        return True

    def close(self):
        pass

    def find_active_staff(self, user_id):
        if self.error:
            raise self.error
        return self.active.get(user_id)


def staff_client(database, verifier=VERIFIER, **settings):
    values = {"database_url": "postgresql://mock:mock@mock.invalid/db", "supabase_url": "https://testref.supabase.co"}
    values.update(settings)
    app = create_app(
        make_settings(**values),
        classifier_loader=no_model,
        database_opener=lambda s: database,
        token_verifier_opener=lambda s: verifier,
    )
    return TestClient(app, raise_server_exceptions=False)


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


def test_active_staff_member_gets_their_profile():
    user_id = uuid4()
    database = FakeStaffDatabase({user_id: StaffMember(user_id, "Maria Santos", "administrator")})

    with staff_client(database) as client:
        response = client.get("/staff/me", headers=bearer(make_token(sub=user_id)))

    assert response.status_code == 200
    assert response.json() == {
        "id": str(user_id),
        "full_name": "Maria Santos",
        "role": "administrator",
        "email": "officer@example.invalid",
    }


def test_role_comes_from_the_database_not_the_token():
    user_id = uuid4()
    database = FakeStaffDatabase({user_id: StaffMember(user_id, "Juan Cruz", "cenro_staff")})

    with staff_client(database) as client:
        token = make_token(sub=user_id, app_metadata={"role": "administrator"}, user_role="administrator")
        assert client.get("/staff/me", headers=bearer(token)).json()["role"] == "cenro_staff"


@pytest.mark.parametrize(
    "headers",
    [{}, {"Authorization": "Basic abc"}, {"Authorization": "Bearer"}, {"Authorization": "Bearer   "}],
)
def test_missing_or_wrong_scheme_is_401(headers):
    with staff_client(FakeStaffDatabase()) as client:
        response = client.get("/staff/me", headers=headers)

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_invalid_token_is_401():
    with staff_client(FakeStaffDatabase()) as client:
        response = client.get("/staff/me", headers=bearer(make_token(exp=int(time.time()) - 3600)))

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"


def test_signed_in_user_without_an_active_profile_is_403():
    # Covers both "no profile" and "disabled": the query only returns active ones.
    with staff_client(FakeStaffDatabase()) as client:
        response = client.get("/staff/me", headers=bearer(make_token()))

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "not_staff"


def test_database_down_is_503_not_a_refusal():
    with staff_client(FakeStaffDatabase(error=DatabaseUnavailable())) as client:
        response = client.get("/staff/me", headers=bearer(make_token()))

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "staff_auth_unavailable"


def test_unreachable_keys_is_503():
    def resolver(token):
        raise jwt.PyJWKClientConnectionError("down")

    with staff_client(FakeStaffDatabase(), verifier=TokenVerifier(ISSUER, resolver)) as client:
        assert client.get("/staff/me", headers=bearer(make_token())).status_code == 503


def test_staff_endpoint_is_503_when_sign_in_is_not_configured():
    with staff_client(FakeStaffDatabase(), supabase_url=None) as client:
        assert client.get("/staff/me", headers=bearer(make_token())).status_code == 503


def test_tokens_are_never_written_to_the_log(caplog):
    good = make_token()
    expired = make_token(exp=int(time.time()) - 3600)

    with caplog.at_level(logging.DEBUG):
        with staff_client(FakeStaffDatabase()) as client:
            client.get("/staff/me", headers=bearer(good))
            client.get("/staff/me", headers=bearer(expired))

    assert good not in caplog.text and expired not in caplog.text
    assert "Staff token refused (expired)" in caplog.text


def test_staff_endpoint_is_not_reachable_from_the_browser_with_a_token():
    # CORS allows only Content-Type, so a browser cannot attach the token.
    with staff_client(FakeStaffDatabase()) as client:
        response = client.options(
            "/staff/me",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "authorization",
            },
        )

    assert "authorization" not in response.headers.get("access-control-allow-headers", "").lower()
