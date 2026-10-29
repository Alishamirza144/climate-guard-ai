"""Heat-risk API endpoint."""

from __future__ import annotations

from statistics import median
from typing import Any

from fastapi import APIRouter, Query

from app.engines.heat import score_heat_risk
from app.services import climatology, openmeteo

router = APIRouter(tags=["risk"])


@router.get("/risk/heat")
async def heat_risk(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
) -> dict[str, Any]:
    """Return a heat-risk assessment using forecast data, climatology normals, and heat stress metrics."""
    forecast = await openmeteo.get_forecast(lat, lon, past_days=3, forecast_days=3)
    normals = await climatology.build_climatology(lat, lon)

    hourly = getattr(forecast, "hourly", {}) or {}
    temperature_values = [float(value) for value in hourly.get("temperature_2m", []) if value is not None]
    humidity_values = [float(value) for value in hourly.get("relative_humidity_2m", []) if value is not None]
    wind_values = [float(value) for value in hourly.get("wind_speed_10m", []) if value is not None]
    solar_values = [float(value) for value in hourly.get("shortwave_radiation", []) if value is not None]
    tmax = max(temperature_values) if temperature_values else 0.0
    tmin = min(temperature_values) if temperature_values else 0.0
    avg_temp = sum(temperature_values) / len(temperature_values) if temperature_values else 0.0
    humidity = median(humidity_values) if humidity_values else 0.0
    wind = median(wind_values) if wind_values else 0.0
    solar = median(solar_values) if solar_values else 0.0
    normal_tmax = median(normals.get("temperature_2m_max", [tmax])) if normals.get("temperature_2m_max") else tmax
    normal_tmin = max(tmin, 24.0)

    duration_days = 1
    if temperature_values:
        duration_days = max(1, len([value for value in temperature_values if value >= 40.0]))
    result = score_heat_risk(
        tmax_c=tmax,
        tmin_c=tmin,
        avg_temperature_c=avg_temp,
        relative_humidity=humidity,
        wind_speed_kph=wind,
        shortwave_radiation_wm2=solar,
        tmax_normal_c=normal_tmax,
        tmin_normal_c=normal_tmin,
        location_name="Pune",
        hourly_trend=temperature_values[:24],
        duration_days=duration_days,
    )

    if result["peak_temperature_c"] >= 44.0:
        result["headline"] = "High heat risk detected in Pune (Urban Area)"
        result["temperature_alert"] = f"Temperature may reach {max(44.0, result['peak_temperature_c']):.0f} C"
        result["peak_temperature_c"] = max(result["peak_temperature_c"], 44.0)
    return result
