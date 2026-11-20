from fastapi import HTTPException

from errors import ApiError


def test_unknown_route_uses_structured_error(client):
    response = client.get("/does-not-exist")

    assert response.status_code == 404
    assert response.json() == {
        "error": {"code": "not_found", "message": "The requested resource was not found."}
    }


def test_wrong_method_keeps_safe_allow_header(client):
    response = client.post("/health")

    assert response.status_code == 405
    assert response.json()["error"]["code"] == "method_not_allowed"
    assert "GET" in response.headers["allow"]


def test_http_exception_detail_and_headers_are_never_exposed(app, client):
    def leaky_endpoint():
        raise HTTPException(
            status_code=400,
            detail="psycopg error at C:/secret/db.py",
            headers={"X-Debug": "internal"},
        )

    app.add_api_route("/leaky", leaky_endpoint)

    response = client.get("/leaky")

    assert response.status_code == 400
    assert response.json() == {
        "error": {"code": "bad_request", "message": "The request could not be processed."}
    }
    assert "secret" not in response.text
    assert "x-debug" not in response.headers


def test_server_side_http_exception_detail_is_never_exposed(app, client):
    def unavailable_endpoint():
        raise HTTPException(status_code=503, detail="weights missing at C:/secret/model.pt")

    app.add_api_route("/unavailable", unavailable_endpoint)

    response = client.get("/unavailable")

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "service_unavailable"
    assert "secret" not in response.text


def test_intentional_api_error_message_is_shown(app, client):
    def rejecting_endpoint():
        raise ApiError(415, "unsupported_media_type", "Please upload a JPEG or PNG image.")

    app.add_api_route("/rejecting", rejecting_endpoint)

    response = client.get("/rejecting")

    assert response.status_code == 415
    assert response.json() == {
        "error": {
            "code": "unsupported_media_type",
            "message": "Please upload a JPEG or PNG image.",
        }
    }


def test_unexpected_errors_hide_internal_details(app, client):
    def broken_endpoint():
        raise RuntimeError("C:/internal/secret/path.py exploded")

    app.add_api_route("/broken", broken_endpoint)

    response = client.get("/broken")

    assert response.status_code == 500
    assert response.json() == {
        "error": {
            "code": "internal_error",
            "message": "An unexpected error occurred. Please try again later.",
        }
    }
    assert "secret" not in response.text
