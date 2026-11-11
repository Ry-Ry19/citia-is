# backend/tests/test_classify.py
#
# MOCK-BASED TESTS: every test uses FakeClassifier, not the trained
#   YOLOv8n-cls model. They verify upload validation, error handling and
#   the response contract — NOT the accuracy of real AI inference.

from tests.helpers import FakeClassifier, image_bytes


def upload(client, data, filename="leaf.jpg", content_type="image/jpeg", headers=None):
    return client.post(
        "/classify",
        files={"image": (filename, data, content_type)},
        headers=headers,
    )


def error_code(response):
    return response.json()["error"]["code"]


# ── Successful classification ──────────────────────────────────────────


def test_valid_jpeg_returns_classification_contract(make_client):
    client = make_client(FakeClassifier("Mahogany", 94.8))

    response = upload(client, image_bytes("JPEG"))

    assert response.status_code == 200
    assert response.json() == {"label": "Mahogany", "confidence": 94.8, "low_confidence": False}


def test_valid_png_is_accepted(make_client):
    client = make_client(FakeClassifier("Non-Tree", 88.0))

    response = upload(client, image_bytes("PNG"), "leaf.png", "image/png")

    assert response.status_code == 200
    assert response.json()["label"] == "Non-Tree"


def test_confidence_below_threshold_is_flagged(make_client):
    client = make_client(FakeClassifier("Non-Mahogany", 69.9))

    assert upload(client, image_bytes()).json()["low_confidence"] is True


def test_confidence_at_threshold_is_not_flagged(make_client):
    client = make_client(FakeClassifier("Mahogany", 70.0))

    assert upload(client, image_bytes()).json()["low_confidence"] is False


def test_threshold_is_configurable(make_client):
    client = make_client(FakeClassifier("Mahogany", 80.0), low_confidence_threshold=85)

    assert upload(client, image_bytes()).json()["low_confidence"] is True


def test_images_reach_the_classifier_as_rgb(make_client):
    fake = FakeClassifier()
    client = make_client(fake)

    upload(client, image_bytes("PNG", mode="RGBA"), "leaf.png", "image/png")
    upload(client, image_bytes("JPEG", mode="L"))

    assert [mode for mode, _size in fake.received] == ["RGB", "RGB"]


def test_health_reports_ready_when_a_model_is_loaded(make_client):
    client = make_client(FakeClassifier())

    assert client.get("/health").json()["inference_ready"] is True


# ── Invalid uploads ────────────────────────────────────────────────────


def test_empty_file_is_rejected(make_client):
    response = upload(make_client(FakeClassifier()), b"")

    assert response.status_code == 400
    assert error_code(response) == "empty_file"


def test_non_image_is_rejected_even_when_labelled_as_jpeg(make_client):
    fake = FakeClassifier()

    response = upload(make_client(fake), b"this is not an image", "leaf.jpg", "image/jpeg")

    assert response.status_code == 400
    assert error_code(response) == "invalid_image"
    assert fake.received == []


def test_corrupted_jpeg_is_rejected(make_client):
    data = image_bytes("JPEG", size=(256, 256))

    response = upload(make_client(FakeClassifier()), data[: len(data) // 2])

    assert response.status_code == 400
    assert error_code(response) == "invalid_image"


def test_unsupported_format_is_rejected(make_client):
    response = upload(make_client(FakeClassifier()), image_bytes("GIF"), "leaf.gif", "image/gif")

    assert response.status_code == 415
    assert error_code(response) == "unsupported_media_type"


def test_file_over_size_limit_is_rejected(make_client):
    data = image_bytes(size=(128, 128))
    assert len(data) > 2048

    response = upload(make_client(FakeClassifier(), max_upload_bytes=2048), data)

    assert response.status_code == 413
    assert error_code(response) == "file_too_large"


def test_oversized_request_is_refused_early_and_keeps_cors_header(make_client):
    client = make_client(FakeClassifier(), max_upload_bytes=2048)

    response = upload(client, b"x" * 200_000, headers={"Origin": "http://localhost:3000"})

    assert response.status_code == 413
    assert error_code(response) == "file_too_large"
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_chunked_oversized_upload_without_content_length_is_refused(make_client):
    fake = FakeClassifier()
    client = make_client(fake, max_upload_bytes=2048)
    boundary = "citia-test-boundary"
    body = (
        (
            f"--{boundary}\r\n"
            'Content-Disposition: form-data; name="image"; filename="leaf.jpg"\r\n'
            "Content-Type: image/jpeg\r\n\r\n"
        ).encode()
        + b"x" * 200_000
        + f"\r\n--{boundary}--\r\n".encode()
    )

    def chunks():  # a generator body is sent without a Content-Length header
        for start in range(0, len(body), 8192):
            yield body[start : start + 8192]

    response = client.post(
        "/classify",
        content=chunks(),
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )

    assert response.request.headers.get("content-length") is None
    assert response.status_code == 413
    assert error_code(response) == "file_too_large"
    assert fake.received == []


def test_resolution_over_pixel_limit_is_rejected(make_client):
    client = make_client(FakeClassifier(), max_image_pixels=1000)

    response = upload(client, image_bytes(size=(64, 64)))  # 4,096 pixels

    assert response.status_code == 413
    assert error_code(response) == "image_too_large"


def test_missing_image_field_is_a_validation_error(make_client):
    response = make_client(FakeClassifier()).post("/classify", data={"note": "no file"})

    assert response.status_code == 422
    assert error_code(response) == "validation_error"
    assert response.json()["error"]["details"][0]["field"] == "image"


# ── Model unavailable or failing ───────────────────────────────────────


def test_returns_503_when_no_model_is_loaded(client):
    response = upload(client, image_bytes())

    assert response.status_code == 503
    assert error_code(response) == "inference_unavailable"


def test_classifier_failure_hides_internal_details(make_client):
    fake = FakeClassifier(error=RuntimeError("torch error at C:/secret/model.pt"))

    response = upload(make_client(fake), image_bytes())

    assert response.status_code == 500
    assert error_code(response) == "classification_failed"
    assert "secret" not in response.text
