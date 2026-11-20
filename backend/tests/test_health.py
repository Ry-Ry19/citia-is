def test_health_reports_service_is_running(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "inference_ready": False,
        "database": "not_configured",
        "storage": "not_configured",
        "version": "0.1.0",
    }


def test_health_never_claims_inference_without_a_loaded_model(client):
    # Stage 12a loads no model, so inference must be reported as not ready.
    assert client.get("/health").json()["inference_ready"] is False
