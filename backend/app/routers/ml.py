"""Machine-learning status and metrics endpoints."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from app.ml import get_model_status, read_metrics

router = APIRouter(tags=["ml"])


@router.get("/ml/status")
async def ml_status() -> dict[str, Any]:
    """Return whether a hazard model has been trained and saved on disk."""
    status = get_model_status()
    response: dict[str, Any] = {"hazards": {}}
    for hazard, item in status.items():
        response["hazards"][hazard] = {
            "available": item["available"],
            "model_size_mb": item["model_size_mb"],
            "metrics_path": item["metrics_path"],
        }
    return response


@router.get("/ml/metrics")
async def ml_metrics() -> dict[str, Any]:
    """Return the saved metrics JSON for each trained hazard model."""
    status = get_model_status()
    metrics: dict[str, Any] = {"hazards": {}}
    for hazard, item in status.items():
        metrics["hazards"][hazard] = read_metrics(hazard)
    return metrics
