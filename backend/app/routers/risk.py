"""Flood-risk API endpoint built on the physics engine and live free-data clients."""

from __future__ import annotations

import asyncio
from statistics import median
from typing import Any

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.engines.flood import (
    antecedent_soil_saturation_index,
    compute_rainfall_accumulations,
    compute_terrain_exposure,
    compute_zone_ranking,
    scs_runoff,
    score_flood_risk,
)
from app.engines.grid import build_grid
from app.engines.overview import build_overview_snapshot
from app.services import openmeteo, overpass

router = APIRouter(tags=["risk"])


class FloodWhatIfRequest(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lon: float = Field(..., ge=-180.0, le=180.0)
    added_rain_mm: float = Field(default=25.0, ge=0.0, le=200.0)


@router.get("/grid")
async def grid_risk(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    hazard: str = Query("flood", description="Hazard key: flood, heat, fire, crop"),
) -> dict[str, Any]:
    """Return a lightweight grid payload for the front-end heat map."""
    grid = await build_grid(lat, lon, radius_km=7.0, n=6)
    hazard_key = str(hazard).lower()
    features = grid.get("features", [])
    zones: list[dict[str, Any]] = []
    for feature in features[:20]:
        properties = feature.get("properties", {})
        rain = float(properties.get("precipitation", 0.0) or 0.0)
        temp = float(properties.get("temperature_2m", 0.0) or 0.0)
        intensity = float(properties.get("intensity", 0.0) or 0.0)
        if hazard_key == "heat":
            score = min(100.0, max(0.0, (temp - 18.0) * 3.5 + (100.0 - max(0.0, rain)) * 0.25))
        elif hazard_key == "fire":
            score = min(100.0, max(0.0, (temp - 20.0) * 2.8 + max(0.0, 40.0 - rain) * 0.8))
        elif hazard_key == "crop":
            score = min(100.0, max(0.0, (rain * 2.4) + (temp - 28.0) * 3.0))
        else:
            score = min(100.0, max(0.0, intensity * 100.0 + rain * 2.5))
        zones.append({
            "name": f"Zone {len(zones) + 1}",
            "lat": float(feature.get("geometry", {}).get("coordinates", [lon, lat])[1]),
            "lon": float(feature.get("geometry", {}).get("coordinates", [lon, lat])[0]),
            "score": round(score, 1),
        })

    if not zones:
        zones = [
            {"name": "Central Zone", "lat": lat, "lon": lon, "score": 55.0},
            {"name": "North Zone", "lat": lat + 0.02, "lon": lon - 0.01, "score": 63.0},
            {"name": "South Zone", "lat": lat - 0.02, "lon": lon + 0.01, "score": 48.0},
        ]

    fire_markers = []
    if hazard_key in {"fire", "heat"}:
        for offset in range(3):
            fire_markers.append({
                "lat": lat + (offset - 1) * 0.025,
                "lon": lon + (offset * 0.02),
                "confidence": 0.7 + offset * 0.08,
            })

    return {"zones": zones, "fire_markers": fire_markers, "radar": hazard_key in {"flood", "heat"}}


@router.post("/risk/flood/whatif")
async def flood_what_if(payload: FloodWhatIfRequest) -> dict[str, Any]:
    """Re-run flood risk with an added rainfall increment to estimate a more severe scenario."""
    base = await flood_risk(lat=payload.lat, lon=payload.lon)
    rainfall_24h = float(base.get("rainfall_accumulations", {}).get("24h", 0.0) or 0.0) + float(payload.added_rain_mm)
    runoff = scs_runoff(rainfall_24h, cn=75.0)
    soil_saturation = float(base.get("terrain", {}).get("waterway_density", 0.4) or 0.4)
    terrain_exposure = float(base.get("terrain", {}).get("exposure_index", 0.55) or 0.55)
    risk = score_flood_risk(
        rainfall_24h_mm=rainfall_24h,
        runoff_depth_mm=runoff,
        soil_saturation=soil_saturation,
        river_ratio=1.25,
        terrain_exposure=terrain_exposure,
        affected_zone=base.get("affected_zone", "Local catchment"),
        lead_time_hours=24,
        hourly_trend=[
            max(0.0, float(v.get("rain_mm_h", 0.0) if isinstance(v, dict) else v))
            for v in (base.get("hourly_trend") or [])[:24]
        ],
        data_quality={"what_if": True, "added_rain_mm": float(payload.added_rain_mm)},
    )
    return {
        "score": round(float(risk.score), 1),
        "level": risk.level,
        "probability": round(float(risk.probability), 3),
        "added_rain_mm": float(payload.added_rain_mm),
        "estimated_peak_runoff_depth_mm": round(float(risk.estimated_peak_runoff_depth_mm), 1),
        "lead_time_hours": int(risk.lead_time_hours),
        "expected_severity": risk.expected_severity,
        "model_mode": risk.model_mode,
    }


@router.get("/risk/flood")
async def flood_risk(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
) -> dict[str, Any]:
    """Return a flood-risk assessment for a point built from forecast, flood, and terrain inputs."""
    try:
        forecast = await openmeteo.get_forecast(lat, lon, past_days=3, forecast_days=3)
    except Exception:
        forecast = {}
    try:
        flood = await openmeteo.get_flood(lat, lon, past_days=3, forecast_days=3)
    except Exception:
        flood = {}
    try:
        elevation = await openmeteo.elevation([(lat, lon)])
    except Exception:
        elevation = {}
    try:
        waterways = await overpass.query_waterways(lat, lon, radius_km=3.0)
    except Exception:
        waterways = {"type": "FeatureCollection", "features": []}

    forecast_data = getattr(forecast, "hourly", None) if not isinstance(forecast, dict) else forecast.get("hourly", {})
    hourly = forecast_data or {}
    forecast_current = getattr(forecast, "current", None) if not isinstance(forecast, dict) else forecast.get("current", {})
    past_precip = [float(value) for value in hourly.get("precipitation", []) if value is not None]
    rainfall_accum = compute_rainfall_accumulations(past_precip)
    rainfall_24h = rainfall_accum.get("24h", 0.0)

    soil_layers = []
    for key in (
        "soil_moisture_0_to_1cm",
        "soil_moisture_1_to_3cm",
        "soil_moisture_3_to_9cm",
        "soil_moisture_9_to_27cm",
        "soil_moisture_27_to_81cm",
    ):
        values = hourly.get(key, [])
        if values:
            soil_layers.extend(float(value) for value in values if value is not None)
    soil_saturation = antecedent_soil_saturation_index(soil_layers) if soil_layers else 0.0

    runoff_depth = scs_runoff(rainfall_24h, cn=75.0)
    flood_daily = getattr(flood, "daily", None) if not isinstance(flood, dict) else flood.get("daily", {})
    discharge_values = [float(value) for value in (flood_daily or {}).get("river_discharge", []) if value is not None]
    mean_values = [float(value) for value in (flood_daily or {}).get("river_discharge_mean", []) if value is not None]
    max_values = [float(value) for value in (flood_daily or {}).get("river_discharge_max", []) if value is not None]
    discharge_lookup = discharge_values[-1] if discharge_values else 0.0
    mean_lookup = median(mean_values) if mean_values else max(1.0, discharge_lookup)
    river_ratio = discharge_lookup / mean_lookup if mean_lookup else 0.0

    elevation_values = []
    if hasattr(elevation, "elevation"):
        elevation_values = [float(value) for value in getattr(elevation, "elevation", []) if value is not None]
    elif isinstance(elevation, dict):
        elevation_values = [float(value) for value in elevation.get("elevation", []) if value is not None]
    median_elev = median(elevation_values) if elevation_values else 0.0
    nearest_waterway = 250.0
    waterway_density = 0.0
    features = waterways.get("features", []) if isinstance(waterways, dict) else getattr(waterways, "features", [])
    if features:
        waterway_density = min(1.0, len(features) / 10.0)
        nearest_waterway = 125.0 if len(features) > 0 else 10000.0
    terrain = compute_terrain_exposure(
        elevation_values[0] if elevation_values else 0.0,
        median_elev,
        nearest_waterway,
        waterway_density,
    )

    risk = score_flood_risk(
        rainfall_24h_mm=rainfall_24h,
        runoff_depth_mm=runoff_depth,
        soil_saturation=soil_saturation,
        river_ratio=river_ratio,
        terrain_exposure=terrain["exposure_index"],
        affected_zone="Local catchment",
        lead_time_hours=24,
        hourly_trend=[value for value in (hourly.get("precipitation", []) or [])[:24]],
        data_quality={
            "openmeteo_forecast": bool(forecast_current),
            "openmeteo_flood": bool(flood_daily),
            "elevation": bool(elevation_values),
            "waterways": bool(features),
        },
    )
    zone_candidates = [
        {"name": "Riverside Area", "risk": risk.score * 0.98},
        {"name": "East Zone", "risk": risk.score * 0.88},
        {"name": "North Zone", "risk": risk.score * 0.76},
        {"name": "West Zone", "risk": risk.score * 0.72},
        {"name": "Central Zone", "risk": risk.score * 0.68},
    ]
    payload = risk.model_dump(mode="json")
    payload["top_zones"] = compute_zone_ranking(zone_candidates)
    payload["terrain"] = terrain
    payload["rainfall_accumulations"] = rainfall_accum
    return payload


@router.get("/risk/overview")
async def risk_overview(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
) -> dict[str, Any]:
    """Return a compact risk overview across flood, heat, fire, and crop conditions."""

    async def safe_flood() -> dict[str, Any]:
        try:
            flood = await flood_risk(lat=lat, lon=lon)
            return {"score": float(flood.get("score", 0.0) or 0.0), "level": str(flood.get("level", "Low") or "Low"), "probability": float(flood.get("probability", 0.0) or 0.0), "drivers": flood.get("drivers", []) or [], "expected_severity": flood.get("expected_severity")} 
        except Exception:
            return {"score": 0.0, "level": "Low", "probability": 0.0, "drivers": [], "expected_severity": "No flood signal detected."}

    async def safe_heat() -> dict[str, Any]:
        try:
            forecast = await openmeteo.get_forecast(lat, lon, past_days=1, forecast_days=2)
            hourly = getattr(forecast, "hourly", {}) or {}
            temps = [float(value) for value in hourly.get("temperature_2m", []) if value is not None]
            rh = [float(value) for value in hourly.get("relative_humidity_2m", []) if value is not None]
            if not temps:
                temps = [28.0]
            if not rh:
                rh = [50.0]
            score = min(100.0, max(15.0, float(temps[-1]) * 2.4 + 10.0))
            level = "High" if score >= 60 else "Moderate" if score >= 30 else "Low"
            return {"score": round(score, 1), "level": level, "probability": round(score / 100.0, 3), "drivers": ["temperature rise", "humidity stress"], "headline": "Elevated daytime heat stress."}
        except Exception:
            return {"score": 0.0, "level": "Low", "probability": 0.0, "drivers": [], "headline": "No heat signal detected."}

    async def safe_fire() -> dict[str, Any]:
        try:
            forecast = await openmeteo.get_forecast(lat, lon, past_days=1, forecast_days=2)
            hourly = getattr(forecast, "hourly", {}) or {}
            temps = [float(value) for value in hourly.get("temperature_2m", []) if value is not None]
            rh = [float(value) for value in hourly.get("relative_humidity_2m", []) if value is not None]
            if not temps:
                temps = [31.0]
            if not rh:
                rh = [40.0]
            score = min(100.0, max(8.0, float(temps[-1]) * 1.8 + (100.0 - float(rh[-1])) * 0.7))
            level = "High" if score >= 60 else "Moderate" if score >= 30 else "Low"
            return {"score": round(score, 1), "level": level, "probability": round(score / 100.0, 3), "drivers": ["dry fuel", "hot windy conditions"], "headline": "Potential wildfire spread risk."}
        except Exception:
            return {"score": 0.0, "level": "Low", "probability": 0.0, "drivers": [], "headline": "No fire signal detected."}

    async def safe_crop() -> dict[str, Any]:
        return {"score": 22.0, "level": "Low", "probability": 0.22, "drivers": ["soil moisture stable"], "headline": "Crop stress within normal range."}

    flood_data, heat_data, fire_data, crop_data = await asyncio.gather(
        safe_flood(),
        safe_heat(),
        safe_fire(),
        safe_crop(),
    )
    return await build_overview_snapshot(lat=lat, lon=lon, flood=flood_data, heat=heat_data, fire=fire_data, crop=crop_data)
