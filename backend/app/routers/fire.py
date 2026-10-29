"""Wildfire risk endpoint backed by weather FWI and FIRMS detections."""

from __future__ import annotations

from statistics import median
from typing import Any

from fastapi import APIRouter, Query

from app.engines.fire import score_fire_risk
from app.services import climatology, openmeteo

router = APIRouter(tags=["risk"])


@router.get("/risk/fire")
async def fire_risk(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
) -> dict[str, Any]:
    """Compute a wildfire risk score using FWI, dryness, and recent FIRMS detections."""
    forecast = await openmeteo.get_forecast(lat, lon, past_days=3, forecast_days=3)
    hourly = getattr(forecast, "hourly", {}) or {}
    temps = [float(value) for value in hourly.get("temperature_2m", []) if value is not None]
    rh_values = [float(value) for value in hourly.get("relative_humidity_2m", []) if value is not None]
    wind_values = [float(value) for value in hourly.get("wind_speed_10m", []) if value is not None]
    rain_values = [float(value) for value in hourly.get("precipitation", []) if value is not None]
    soil_values = [float(value) for value in hourly.get("soil_moisture_0_to_1cm", []) if value is not None]
    if not temps:
        temps = [30.0]
    if not rh_values:
        rh_values = [40.0]
    if not wind_values:
        wind_values = [12.0]
    if not rain_values:
        rain_values = [0.0]

    current_temp = temps[-1]
    temp_max = max(temps)
    current_rh = rh_values[-1]
    current_wind = median(wind_values) if wind_values else 10.0
    current_rain = sum(rain_values[-24:]) if rain_values else 0.0
    normals = await climatology.build_climatology(lat, lon)
    normal_tmax = median(normals.get("temperature_2m_max", [current_temp])) if normals.get("temperature_2m_max") else current_temp
    payload = await score_fire_risk(
        lat=lat,
        lon=lon,
        temp_c=current_temp,
        rh=current_rh,
        wind_kmh=current_wind,
        rain_24h_mm=current_rain,
        soil_moisture_top_layers=soil_values[-10:],
        temp_normal_30d_c=normal_tmax,
        wind_direction_deg=225.0,
    )
    payload["hourly_temperature_trend"] = [
        {"hour": idx + 1, "temperature_c": float(value), "predicted_peak": idx + 1 == max(1, min(12, len(temps)))}
        for idx, value in enumerate(temps[:24])
    ]
    payload["peak_temperature_c"] = round(max(temp_max, current_temp), 2)
    payload["location_hint"] = "Surface dryness and hot, windy conditions are elevating fire spread risk."
    return payload
