import math

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from config import BACKEND_DIR, Settings
from main import create_app


def make_settings(**values) -> Settings:
    return Settings(_env_file=None, **values)


def test_wildcard_origin_is_rejected():
    with pytest.raises(ValidationError):
        make_settings(cors_origins="*")


def test_empty_origin_list_is_rejected():
    with pytest.raises(ValidationError):
        make_settings(cors_origins=" , ")


def test_origin_without_scheme_is_rejected():
    with pytest.raises(ValidationError):
        make_settings(cors_origins="localhost:3000")


def test_unknown_environment_is_rejected():
    with pytest.raises(ValidationError):
        make_settings(environment="staging")


def test_origins_are_split_and_trailing_slashes_removed():
    settings = make_settings(
        cors_origins="http://localhost:3000/, http://192.168.1.239:3000"
    )

    assert settings.cors_origin_list == [
        "http://localhost:3000",
        "http://192.168.1.239:3000",
    ]


def test_api_docs_are_disabled_in_production():
    app = create_app(make_settings(environment="production"))

    with TestClient(app) as client:
        assert client.get("/docs").status_code == 404
        assert client.get("/openapi.json").status_code == 404


def test_low_confidence_threshold_defaults_to_70():
    assert make_settings().low_confidence_threshold == 70.0


@pytest.mark.parametrize("value", [-1, 100.1, math.nan])
def test_low_confidence_threshold_must_be_a_percentage(value):
    with pytest.raises(ValidationError):
        make_settings(low_confidence_threshold=value)


def test_relative_weights_path_is_read_from_backend_folder():
    settings = make_settings(weights_path="models/v2/best.pt")

    assert settings.weights_path == BACKEND_DIR / "models" / "v2" / "best.pt"
