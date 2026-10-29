"""Crop stress monitoring API endpoint."""

from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.engines.crop import score_crop_risk
from app.services import openmeteo

router = APIRouter(tags=["risk"])


class CropRiskRequest(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lon: float = Field(..., ge=-180.0, le=180.0)
    crop: str = Field(..., min_length=1)
    sowing_date: str
    soil_type: str = "loam"
    irrigation: str = "drip"


@router.post("/risk/crop")
async def crop_risk(payload: CropRiskRequest) -> dict[str, Any]:
    """Return crop health and stress risk from weather, soil, and NDVI context."""
    sowing = date.fromisoformat(payload.sowing_date)
    archive_start = max(sowing - __import__("datetime").timedelta(days=45), date(2000, 1, 1))
    archive_end = min(date.today() + __import__("datetime").timedelta(days=7), date.today())
    archive = await openmeteo.get_archive(
        payload.lat,
        payload.lon,
        archive_start.isoformat(),
        archive_end.isoformat(),
        daily=["temperature_2m_max", "temperature_2m_min"],
    )
    forecast = await openmeteo.get_forecast(payload.lat, payload.lon, past_days=1, forecast_days=7)
    hourly = getattr(forecast, "hourly", {}) or {}
    archive_daily = getattr(archive, "daily", {}) or {}
    soil_layers = {
        "soil_moisture_0_to_1cm": hourly.get("soil_moisture_0_to_1cm", [0.2] * 7)[0],
        "soil_moisture_1_to_3cm": hourly.get("soil_moisture_1_to_3cm", [0.2] * 7)[0],
        "soil_moisture_3_to_9cm": hourly.get("soil_moisture_3_to_9cm", [0.23] * 7)[0],
        "soil_moisture_9_to_27cm": hourly.get("soil_moisture_9_to_27cm", [0.24] * 7)[0],
        "soil_moisture_27_to_81cm": hourly.get("soil_moisture_27_to_81cm", [0.25] * 7)[0],
    }
    return score_crop_risk(
        crop=payload.crop,
        sowing_date=payload.sowing_date,
        lat=payload.lat,
        lon=payload.lon,
        soil_type=payload.soil_type,
        irrigation=payload.irrigation,
        archive_daily=archive_daily,
        forecast_hourly=hourly,
        soil_layers=soil_layers,
    )
