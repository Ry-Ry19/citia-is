# backend/tests/conftest.py
#
# WHAT: Shared test fixtures. Every test app uses fixed test settings,
#   so a developer's own backend/.env can never change test results.
#   Test apps also never load real model weights, even when they exist.

import pytest
from fastapi.testclient import TestClient

from main import create_app
from tests.helpers import make_settings, no_model


@pytest.fixture
def app():
    return create_app(make_settings(), classifier_loader=no_model)


@pytest.fixture
def client(app):
    # "with" runs the lifespan startup, exactly as uvicorn would.
    # raise_server_exceptions=False lets tests inspect 500 responses.
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client


@pytest.fixture
def make_client():
    """
    Builds a started test client with a chosen classifier (or none) and
    setting overrides, e.g. make_client(FakeClassifier(), max_upload_bytes=2048).
    """
    opened = []

    def _make(classifier=None, **setting_overrides):
        loader = (lambda weights_path: classifier) if classifier is not None else no_model
        test_client = TestClient(
            create_app(make_settings(**setting_overrides), classifier_loader=loader),
            raise_server_exceptions=False,
        )
        test_client.__enter__()
        opened.append(test_client)
        return test_client

    yield _make

    for test_client in opened:
        test_client.__exit__(None, None, None)
