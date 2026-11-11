# backend/tests/test_classifier.py
#
# MOCK-BASED TESTS: FakeYoloModel only imitates the shape of an
#   Ultralytics model, and the "weights" files are placeholders. These
#   tests check CITIA-IS's own checks, failure handling and output
#   mapping. They do NOT verify real YOLOv8n-cls inference.

import math
import pickle
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from classifier import (
    InvalidPrediction,
    ModelLoadError,
    YoloClassifier,
    load_classifier,
    to_prediction,
)
from main import create_app
from tests.helpers import image_bytes, make_settings

CORRECT_NAMES = {0: "Mahogany", 1: "Non-Mahogany", 2: "Non-Tree"}


class FakeYoloModel:
    def __init__(
        self,
        task="classify",
        names=CORRECT_NAMES,
        top1=0,
        top1conf=0.9483,
        predict_error=None,
        return_probs=True,
    ):
        self.task = task
        self.names = names
        self._top1 = top1
        self._top1conf = top1conf
        self._predict_error = predict_error
        self._return_probs = return_probs

    def predict(self, image, verbose=False):
        if self._predict_error:
            raise self._predict_error
        probs = SimpleNamespace(top1=self._top1, top1conf=self._top1conf) if self._return_probs else None
        return [SimpleNamespace(probs=probs)]


def placeholder_weights(tmp_path):
    """A file that exists but is NOT a real model."""
    path = tmp_path / "mahogany_cls.pt"
    path.write_bytes(b"placeholder - not a real model")
    return path


# ── Output mapping ─────────────────────────────────────────────────────


def test_probability_becomes_percentage_with_one_decimal():
    assert to_prediction("Mahogany", 0.9483).confidence == 94.8


@pytest.mark.parametrize("probability", [-0.01, 1.01, math.nan, math.inf])
def test_invalid_probabilities_are_rejected(probability):
    with pytest.raises(InvalidPrediction):
        to_prediction("Mahogany", probability)


def test_unknown_label_is_rejected():
    with pytest.raises(InvalidPrediction):
        to_prediction("Narra", 0.9)


def test_correct_model_maps_its_top_prediction():
    classifier = YoloClassifier(FakeYoloModel(top1=2, top1conf=0.871))

    prediction = classifier.predict(Image.new("RGB", (8, 8)))

    assert (prediction.label, prediction.confidence) == ("Non-Tree", 87.1)


# ── Model checks ───────────────────────────────────────────────────────


def test_non_classification_model_is_refused():
    with pytest.raises(ModelLoadError):
        YoloClassifier(FakeYoloModel(task="detect"))


@pytest.mark.parametrize(
    "names",
    [
        {0: "Non-Mahogany", 1: "Mahogany", 2: "Non-Tree"},  # wrong order
        {0: "mahogany", 1: "non_mahogany", 2: "non_tree"},  # wrong spelling
        {0: "Mahogany", 1: "Non-Mahogany"},  # missing class
        {0: "Mahogany", 1: "Non-Mahogany", 2: "Non-Tree", 3: "Narra"},  # extra class
    ],
)
def test_model_with_wrong_classes_is_refused(names):
    with pytest.raises(ModelLoadError):
        YoloClassifier(FakeYoloModel(names=names))


@pytest.mark.parametrize("names", [None, "Mahogany", 42])
def test_unreadable_class_names_are_refused(names):
    with pytest.raises(ModelLoadError, match="could not be read"):
        YoloClassifier(FakeYoloModel(names=names))


def test_model_without_class_names_is_refused():
    with pytest.raises(ModelLoadError):
        YoloClassifier(SimpleNamespace(task="classify"))


# ── Loading failures ───────────────────────────────────────────────────


def test_missing_weights_file_is_reported(tmp_path):
    with pytest.raises(ModelLoadError, match="not found"):
        load_classifier(tmp_path / "missing.pt")


def test_corrupted_weights_are_reported(tmp_path):
    def corrupted(path):
        raise pickle.UnpicklingError("invalid load key")

    with pytest.raises(ModelLoadError, match="could not be loaded"):
        load_classifier(placeholder_weights(tmp_path), yolo_factory=corrupted)


def test_model_that_fails_its_test_prediction_is_refused(tmp_path):
    def broken(path):
        return FakeYoloModel(predict_error=RuntimeError("shape mismatch"))

    with pytest.raises(ModelLoadError, match="test prediction"):
        load_classifier(placeholder_weights(tmp_path), yolo_factory=broken)


def test_model_with_malformed_output_is_refused(tmp_path):
    def no_probabilities(path):
        return FakeYoloModel(return_probs=False)

    with pytest.raises(ModelLoadError, match="test prediction"):
        load_classifier(placeholder_weights(tmp_path), yolo_factory=no_probabilities)


def test_model_with_out_of_range_confidence_is_refused(tmp_path):
    def out_of_range(path):
        return FakeYoloModel(top1conf=1.7)

    with pytest.raises(ModelLoadError, match="test prediction"):
        load_classifier(placeholder_weights(tmp_path), yolo_factory=out_of_range)


def test_correct_model_loads(tmp_path):
    classifier = load_classifier(placeholder_weights(tmp_path), yolo_factory=lambda path: FakeYoloModel())

    assert isinstance(classifier, YoloClassifier)


def test_real_loader_fails_in_a_controlled_way(tmp_path):
    # No factory: the real Ultralytics import is used. Today it is not
    # installed ("could not be imported"); once it is, loading this
    # placeholder file fails instead. Either way: a ModelLoadError.
    with pytest.raises(ModelLoadError):
        load_classifier(placeholder_weights(tmp_path))


# ── Application startup ────────────────────────────────────────────────


def test_api_starts_without_weights_and_reports_not_ready(tmp_path):
    # Uses the REAL loader, pointed at a file that does not exist.
    app = create_app(make_settings(weights_path=tmp_path / "missing.pt"))

    with TestClient(app) as client:
        assert client.get("/health").json()["inference_ready"] is False


@pytest.mark.parametrize(
    "error",
    [ModelLoadError("bad weights"), RuntimeError("unexpected bug in a library")],
)
def test_any_loading_failure_leaves_api_running_and_not_ready(error):
    def failing_loader(weights_path):
        raise error

    app = create_app(make_settings(), classifier_loader=failing_loader)

    with TestClient(app) as client:
        assert client.get("/health").json()["inference_ready"] is False
        response = client.post(
            "/classify", files={"image": ("leaf.jpg", image_bytes(), "image/jpeg")}
        )
        assert response.status_code == 503
