# backend/tests/helpers.py
#
# WHAT: Shared test helpers.
#
# MOCK CLASSIFIER: FakeClassifier returns a fixed answer. Tests that use
#   it check request handling, validation and the response contract.
#   They do NOT verify real YOLOv8n-cls inference.

import io
import random

from PIL import Image

from classifier import ModelLoadError, Prediction
from config import Settings


def make_settings(**overrides) -> Settings:
    """
    Test settings that never read backend/.env. The database and storage
    are switched off unless a test asks for them, even if they are set in
    the machine's environment variables.
    """
    values = {
        "environment": "development",
        "cors_origins": "http://localhost:3000",
        "database_url": None,
        "supabase_url": None,
        "model_version": "test-model",
        "storage_s3_endpoint": None,
        "storage_s3_region": None,
        "storage_s3_access_key_id": None,
        "storage_s3_secret_access_key": None,
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)


def no_model(weights_path):
    """A classifier loader that never loads real weights."""
    raise ModelLoadError("Tests never load real weights.")


class FakeClassifier:
    """MOCK classifier: a fixed prediction, and a record of what it received."""

    def __init__(self, label="Mahogany", confidence=94.8, error=None):
        self.prediction = Prediction(label=label, confidence=confidence)
        self.error = error
        self.received = []

    def predict(self, image):
        self.received.append((image.mode, image.size))
        if self.error:
            raise self.error
        return self.prediction


def image_bytes(fmt="JPEG", size=(64, 64), mode="RGB") -> bytes:
    """A real encoded image of random pixels (random so it does not compress to almost nothing)."""
    width, height = size
    pixels = random.Random(0).randbytes(width * height * 3)
    image = Image.frombytes("RGB", size, pixels)
    if mode != "RGB":
        image = image.convert(mode)
    buffer = io.BytesIO()
    image.save(buffer, format=fmt)
    return buffer.getvalue()
