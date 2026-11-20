# backend/classifier.py
#
# WHAT: Loading the trained YOLOv8n-cls model and turning its output
#   into the CITIA-IS classification contract:
#
#     {"label": "Mahogany", "confidence": 94.8}
#
# THREE CLASSES, FIXED ORDER: Mahogany (0), Non-Mahogany (1), Non-Tree (2).
#   Ultralytics numbers classes alphabetically by dataset folder name,
#   which gives exactly this order when the folders are named exactly
#   like this. A model with any other names or order is refused at
#   startup rather than allowed to mislabel results.
#
# FAILURES ARE CONTROLLED: every problem while loading — a missing file,
#   missing or broken AI packages, corrupted or incompatible weights,
#   the wrong kind of model, wrong classes, or a failed test prediction —
#   is raised as ModelLoadError, so the API can start without inference
#   instead of crashing.
#
# NOT A SCIENTIFIC IDENTIFICATION: a prediction is the model's best
#   guess among its three classes, and confidence is a model score, not
#   a guarantee. "Non-Mahogany" does not mean "non-invasive".
#
# SECURITY: .pt files are Python pickles — loading one can run code.
#   Only load weights the project trained itself, never a user's file.

import hashlib
import math
import threading
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal, Protocol

from PIL import Image

ClassificationLabel = Literal["Mahogany", "Non-Mahogany", "Non-Tree"]

# Class index -> label, exactly as the trained model must report them.
REQUIRED_CLASS_NAMES: dict[int, str] = {0: "Mahogany", 1: "Non-Mahogany", 2: "Non-Tree"}

# Builds a model from a weights path. Normally Ultralytics' YOLO class;
# tests pass a stand-in so loading can be tested without Ultralytics.
YoloFactory = Callable[[str], Any]


class ModelLoadError(Exception):
    """The model is missing, unreadable, or not the expected three-class classifier."""


class InvalidPrediction(Exception):
    """The model produced output outside the classification contract."""


@dataclass(frozen=True)
class Prediction:
    label: ClassificationLabel
    # Percentage from 0 to 100, rounded to one decimal place.
    confidence: float


class Classifier(Protocol):
    """Anything that can classify an RGB image — the real model or a test mock."""

    def predict(self, image: Image.Image) -> Prediction: ...


def to_prediction(label: str, probability: float) -> Prediction:
    """
    Checks raw model output (a probability from 0 to 1) and converts it
    to the contract (a percentage from 0 to 100).
    """
    if label not in REQUIRED_CLASS_NAMES.values():
        raise InvalidPrediction("Model returned an unknown class.")

    if not math.isfinite(probability) or not 0.0 <= probability <= 1.0:
        raise InvalidPrediction("Model returned an invalid probability.")

    return Prediction(label=label, confidence=round(probability * 100, 1))


class YoloClassifier:
    """A loaded Ultralytics model that has passed the CITIA-IS checks."""

    def __init__(self, model: Any) -> None:
        if getattr(model, "task", None) != "classify":
            raise ModelLoadError(
                "The weights are not a classification model (expected YOLOv8n-cls)."
            )

        try:
            names = {int(index): str(name) for index, name in dict(model.names).items()}
        except Exception as exc:
            raise ModelLoadError("The model's class names could not be read.") from exc

        if names != REQUIRED_CLASS_NAMES:
            raise ModelLoadError(
                f"The model's classes {names} do not match the required "
                f"classes {REQUIRED_CLASS_NAMES}."
            )

        self._model = model
        self._names = names
        # FastAPI runs requests in a thread pool, and an Ultralytics model
        # is not safe to use from several threads at once, so predictions
        # take turns.
        self._lock = threading.Lock()

    def predict(self, image: Image.Image) -> Prediction:
        with self._lock:
            results = self._model.predict(image, verbose=False)

        probs = results[0].probs
        return to_prediction(self._names[int(probs.top1)], float(probs.top1conf))


def import_yolo() -> YoloFactory:
    try:
        # Imported here, not at the top of the file, so the API can start
        # (and report "not ready") before the AI packages are installed.
        from ultralytics import YOLO
    except Exception as exc:
        # ImportError when not installed; on Windows a broken PyTorch
        # install can also raise OSError ("DLL load failed").
        raise ModelLoadError(
            "The ultralytics package is not installed or could not be imported."
        ) from exc
    return YOLO


def load_classifier(
    weights_path: Path,
    yolo_factory: YoloFactory | None = None,
) -> YoloClassifier:
    """
    Loads and checks the trained model. Every failure is raised as
    ModelLoadError with a reason for the server log.
    """
    # Checked first: given a missing local file, Ultralytics may try to
    # download a model with that name from the internet instead.
    if not weights_path.is_file():
        raise ModelLoadError(f"Model weights not found ({weights_path.name}).")

    factory = yolo_factory or import_yolo()

    try:
        model = factory(str(weights_path))
    except Exception as exc:
        raise ModelLoadError(
            "The model weights could not be loaded "
            "(the file may be corrupted or from an incompatible version)."
        ) from exc

    classifier = YoloClassifier(model)

    # Smoke test: one prediction on a blank image, so a broken model fails
    # now, at startup, instead of on a community member's first scan. The
    # output goes through the same contract checks as every real request.
    # This proves the pipeline runs — it says nothing about accuracy.
    try:
        classifier.predict(Image.new("RGB", (224, 224)))
    except Exception as exc:
        raise ModelLoadError("The model failed a test prediction.") from exc

    return classifier


def weights_fingerprint(weights_path: Path) -> str | None:
    """SHA-256 of the weights file: proof of exactly which weights were used."""
    try:
        return hashlib.sha256(weights_path.read_bytes()).hexdigest()
    except OSError:
        return None


def describe_load_error(exc: ModelLoadError) -> str:
    """One log line: the reason, plus the type of the underlying error."""
    cause = exc.__cause__
    return f"{exc} (cause: {type(cause).__name__})" if cause else str(exc)
