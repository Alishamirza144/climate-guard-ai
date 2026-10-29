"""Machine-learning model registry for climate hazards.

This package keeps a small, auditable model bundle under backend/models/.
The files are saved on disk and reloaded by the API without storing
large artifacts in source control.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import joblib

BASE_DIR = Path(__file__).resolve().parents[2]
MODEL_DIR = BASE_DIR / "models"
DATA_DIR = BASE_DIR / "data"
HAZARDS = ("flood", "heat", "fire")


def ensure_model_dir() -> Path:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    return MODEL_DIR


def model_path_for(hazard: str) -> Path:
    ensure_model_dir()
    return MODEL_DIR / f"{hazard}.joblib"


def metrics_path_for(hazard: str) -> Path:
    ensure_model_dir()
    return MODEL_DIR / f"{hazard}_metrics.json"


def read_metrics(hazard: str) -> dict[str, Any]:
    path = metrics_path_for(hazard)
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def load_model(hazard: str) -> Any | None:
    path = model_path_for(hazard)
    if not path.exists():
        return None
    try:
        return joblib.load(path)
    except Exception:
        return None


def get_model_status() -> dict[str, Any]:
    status: dict[str, Any] = {}
    for hazard in HAZARDS:
        model_file = model_path_for(hazard)
        metrics_file = metrics_path_for(hazard)
        metrics = read_metrics(hazard)
        status[hazard] = {
            "available": model_file.exists() and metrics_file.exists(),
            "model_path": str(model_file),
            "metrics_path": str(metrics_file),
            "metrics": metrics,
            "model_size_mb": round(model_file.stat().st_size / (1024 * 1024), 3) if model_file.exists() else 0.0,
        }
    return status
