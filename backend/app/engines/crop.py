"""Crop stress monitoring engine.

This module implements a lightweight crop-water and crop-stress assessment driven by
free weather, soil, and satellite context. The agronomic defaults are intentionally
kept editable and documented for calibration to local conditions.

Source basis (configurable defaults):
- FAO-56 crop coefficients and soil-water balance framework
- FAO and ICAR agronomy tables for stage critical temperatures and base GDD assumptions
- NASA GIBS NDVI is used only as contextual imagery and is explicitly not a field-level measurement
"""

from __future__ import annotations

import math
from datetime import date, datetime, timedelta
from typing import Any, Sequence

SOIL_DEFAULTS = {
    "sand": {"field_capacity": 0.18, "wilting_point": 0.08},
    "loam": {"field_capacity": 0.32, "wilting_point": 0.15},
    "clay": {"field_capacity": 0.38, "wilting_point": 0.22},
}

# Crop defaults are editable JSON-like data. Each entry includes:
# - base_temp_c for GDD accumulation
# - gdd_by_stage: cumulative GDD windows for key phenological stages
# - kc_by_stage: FAO-56 crop coefficients
# - root_zone_m: effective root-zone depth
# - critical_temp_c: stage-specific stress thresholds
# - disease windows: weather-based disease favourability ranges only; not diagnosis
# Sources: FAO-56 crop coefficients, ICAR agronomy references, and agronomic default stress thresholds.
CROP_LIBRARY: dict[str, dict[str, Any]] = {
    "wheat": {
        "base_temp_c": 10.0,
        "gdd_by_stage": {
            "sowing_emergence": 150.0,
            "vegetative": 650.0,
            "flowering": 950.0,
            "grain_fill": 1200.0,
            "maturity": 1400.0,
        },
        "kc_by_stage": {
            "sowing_emergence": 0.35,
            "vegetative": 0.75,
            "flowering": 1.10,
            "grain_fill": 1.15,
            "maturity": 0.45,
        },
        "critical_temp_c": {
            "sowing_emergence": 30.0,
            "vegetative": 32.0,
            "flowering": 33.0,
            "grain_fill": 34.0,
            "maturity": 36.0,
        },
        "root_zone_m": 1.0,
    },
    "rice": {
        "base_temp_c": 10.0,
        "gdd_by_stage": {
            "sowing_emergence": 180.0,
            "vegetative": 700.0,
            "flowering": 1050.0,
            "grain_fill": 1350.0,
            "maturity": 1550.0,
        },
        "kc_by_stage": {
            "sowing_emergence": 1.05,
            "vegetative": 1.10,
            "flowering": 1.20,
            "grain_fill": 1.10,
            "maturity": 0.70,
        },
        "critical_temp_c": {
            "sowing_emergence": 34.0,
            "vegetative": 35.0,
            "flowering": 36.0,
            "grain_fill": 35.0,
            "maturity": 38.0,
        },
        "root_zone_m": 0.8,
    },
    "maize": {
        "base_temp_c": 10.0,
        "gdd_by_stage": {
            "sowing_emergence": 180.0,
            "vegetative": 720.0,
            "flowering": 1100.0,
            "grain_fill": 1500.0,
            "maturity": 1750.0,
        },
        "kc_by_stage": {
            "sowing_emergence": 0.35,
            "vegetative": 0.80,
            "flowering": 1.15,
            "grain_fill": 1.20,
            "maturity": 0.60,
        },
        "critical_temp_c": {
            "sowing_emergence": 32.0,
            "vegetative": 35.0,
            "flowering": 36.0,
            "grain_fill": 35.0,
            "maturity": 37.0,
        },
        "root_zone_m": 1.0,
    },
    "sugarcane": {
        "base_temp_c": 18.0,
        "gdd_by_stage": {
            "sowing_emergence": 300.0,
            "vegetative": 900.0,
            "flowering": 1600.0,
            "grain_fill": 2200.0,
            "maturity": 2600.0,
        },
        "kc_by_stage": {
            "sowing_emergence": 0.45,
            "vegetative": 0.85,
            "flowering": 1.10,
            "grain_fill": 1.20,
            "maturity": 0.90,
        },
        "critical_temp_c": {
            "sowing_emergence": 32.0,
            "vegetative": 34.0,
            "flowering": 36.0,
            "grain_fill": 38.0,
            "maturity": 40.0,
        },
        "root_zone_m": 1.2,
    },
    "cotton": {
        "base_temp_c": 15.5,
        "gdd_by_stage": {
            "sowing_emergence": 200.0,
            "vegetative": 780.0,
            "flowering": 1200.0,
            "grain_fill": 1650.0,
            "maturity": 1900.0,
        },
        "kc_by_stage": {
            "sowing_emergence": 0.40,
            "vegetative": 0.75,
            "flowering": 1.10,
            "grain_fill": 1.20,
            "maturity": 0.70,
        },
        "critical_temp_c": {
            "sowing_emergence": 30.0,
            "vegetative": 32.0,
            "flowering": 35.0,
            "grain_fill": 34.0,
            "maturity": 36.0,
        },
        "root_zone_m": 1.0,
    },
    "soybean": {
        "base_temp_c": 10.0,
        "gdd_by_stage": {
            "sowing_emergence": 160.0,
            "vegetative": 700.0,
            "flowering": 1050.0,
            "grain_fill": 1450.0,
            "maturity": 1700.0,
        },
        "kc_by_stage": {
            "sowing_emergence": 0.35,
            "vegetative": 0.80,
            "flowering": 1.10,
            "grain_fill": 1.15,
            "maturity": 0.55,
        },
        "critical_temp_c": {
            "sowing_emergence": 31.0,
            "vegetative": 34.0,
            "flowering": 35.0,
            "grain_fill": 34.0,
            "maturity": 36.0,
        },
        "root_zone_m": 0.9,
    },
    "onion": {
        "base_temp_c": 7.0,
        "gdd_by_stage": {
            "sowing_emergence": 160.0,
            "vegetative": 500.0,
            "flowering": 800.0,
            "grain_fill": 1000.0,
            "maturity": 1200.0,
        },
        "kc_by_stage": {
            "sowing_emergence": 0.50,
            "vegetative": 0.75,
            "flowering": 1.00,
            "grain_fill": 1.00,
            "maturity": 0.70,
        },
        "critical_temp_c": {
            "sowing_emergence": 30.0,
            "vegetative": 31.0,
            "flowering": 32.0,
            "grain_fill": 33.0,
            "maturity": 34.0,
        },
        "root_zone_m": 0.5,
    },
    "grape": {
        "base_temp_c": 10.0,
        "gdd_by_stage": {
            "sowing_emergence": 180.0,
            "vegetative": 600.0,
            "flowering": 1000.0,
            "grain_fill": 1400.0,
            "maturity": 1700.0,
        },
        "kc_by_stage": {
            "sowing_emergence": 0.30,
            "vegetative": 0.60,
            "flowering": 0.90,
            "grain_fill": 1.00,
            "maturity": 0.75,
        },
        "critical_temp_c": {
            "sowing_emergence": 31.0,
            "vegetative": 33.0,
            "flowering": 34.0,
            "grain_fill": 35.0,
            "maturity": 36.0,
        },
        "root_zone_m": 1.1,
    },
    "tomato": {
        "base_temp_c": 10.0,
        "gdd_by_stage": {
            "sowing_emergence": 200.0,
            "vegetative": 750.0,
            "flowering": 1100.0,
            "grain_fill": 1450.0,
            "maturity": 1700.0,
        },
        "kc_by_stage": {
            "sowing_emergence": 0.45,
            "vegetative": 0.75,
            "flowering": 1.10,
            "grain_fill": 1.15,
            "maturity": 0.80,
        },
        "critical_temp_c": {
            "sowing_emergence": 31.0,
            "vegetative": 34.0,
            "flowering": 35.0,
            "grain_fill": 34.0,
            "maturity": 36.0,
        },
        "root_zone_m": 0.8,
    },
}

STAGE_ORDER = [
    "sowing_emergence",
    "vegetative",
    "flowering",
    "grain_fill",
    "maturity",
]


def _clean_float(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        result = float(value)
    except (TypeError, ValueError):
        return default
    if math.isnan(result) or math.isinf(result):
        return default
    return result


def clamp(value: float, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def gdd_for_day(tmax_c: float | None, tmin_c: float | None, base_temp_c: float = 10.0) -> float:
    """Growing-degree day accumulation for a single day.

    GDD = ((Tmax + Tmin) / 2) - Tb, truncated at zero for cold days.
    """
    tmax = _clean_float(tmax_c, 0.0)
    tmin = _clean_float(tmin_c, 0.0)
    base = _clean_float(base_temp_c, 10.0)
    avg = (tmax + tmin) / 2.0
    return max(0.0, avg - base)


def vpd_from_temp_rh(temp_c: float | None, relative_humidity: float | None) -> float:
    """Vapour pressure deficit in kPa using the standard saturation-vapour formulation."""
    temp = _clean_float(temp_c, 0.0)
    rh = clamp(_clean_float(relative_humidity, 0.0), 0.0, 100.0)
    saturation_vapour = 0.6108 * math.exp((17.27 * temp) / (temp + 237.3))
    return saturation_vapour * (1.0 - (rh / 100.0))


def water_stress_coefficient(
    root_zone_m: float,
    field_capacity: float,
    wilting_point: float,
    current_moisture: float,
    depletion_fraction: float = 0.55,
) -> float:
    """Compute Ks with the FAO-56 root-zone depletion formulation.

    Ks = (TAW - Dr) / ((1 - p) * TAW)
    where TAW = (FC - WP) * root_zone_depth,
    Dr = (FC - current_moisture) * root_zone_depth.
    """
    root_zone = max(0.1, _clean_float(root_zone_m, 0.5))
    fc = _clean_float(field_capacity, 0.3)
    wp = _clean_float(wilting_point, 0.1)
    current = _clean_float(current_moisture, fc)
    p = clamp(_clean_float(depletion_fraction, 0.55), 0.0, 0.9)
    taw = max(0.0, (fc - wp) * root_zone * 1000.0)
    if taw <= 0.0:
        return 1.0
    dr = max(0.0, (fc - current) * root_zone * 1000.0)
    denominator = max((1.0 - p) * taw, 1e-6)
    return clamp((taw - dr) / denominator, 0.0, 1.0)


def _soil_moisture_from_layers(layer_map: dict[str, Any] | None, root_zone_depth_m: float) -> float:
    if not layer_map:
        return 0.25
    layers = [
        ("soil_moisture_0_to_1cm", 0.01),
        ("soil_moisture_1_to_3cm", 0.03),
        ("soil_moisture_3_to_9cm", 0.09),
        ("soil_moisture_9_to_27cm", 0.27),
        ("soil_moisture_27_to_81cm", 0.81),
    ]
    total_depth = 0.0
    weighted_total = 0.0
    for key, depth in layers:
        value = _clean_float(layer_map.get(key), 0.0)
        if value <= 0.0:
            continue
        if total_depth + depth > root_zone_depth_m:
            overlap = max(0.0, root_zone_depth_m - total_depth)
            weight = overlap / depth if depth > 0 else 0.0
            weighted_total += value * weight
            total_depth = root_zone_depth_m
            break
        weighted_total += value * (depth / max(root_zone_depth_m, 1e-6))
        total_depth += depth
        if total_depth >= root_zone_depth_m:
            break
    if weighted_total <= 0.0:
        return 0.25
    return clamp(weighted_total, 0.0, 1.0)


def estimate_crop_stage(
    crop: str,
    sowing_date: str | date,
    archive_daily: dict[str, Sequence[Any]] | None,
    forecast_daily: dict[str, Sequence[Any]] | None,
    as_of: str | date | None = None,
) -> tuple[str, float, float, float]:
    """Estimate crop stage from sowing date and accumulated GDD.

    Returns: (stage_name, accumulated_gdd, total_gdd_for_crop, progress_pct)
    """
    crop_name = (crop or "wheat").lower().strip()
    profile = CROP_LIBRARY.get(crop_name, CROP_LIBRARY["wheat"])
    base_temp = _clean_float(profile.get("base_temp_c", 10.0), 10.0)
    stage_thresholds = profile.get("gdd_by_stage", {})
    if isinstance(sowing_date, str):
        sowing = date.fromisoformat(sowing_date)
    else:
        sowing = sowing_date
    reference_day = date.fromisoformat(str(as_of)) if as_of else date.today()
    total_gdd = 0.0
    daily_max = archive_daily.get("temperature_2m_max", []) if archive_daily else []
    daily_min = archive_daily.get("temperature_2m_min", []) if archive_daily else []
    daily_dates = []
    if archive_daily and "time" in archive_daily:
        daily_dates = [date.fromisoformat(str(item)) for item in archive_daily["time"]]
    else:
        delta_days = (reference_day - sowing).days + 1
        for offset in range(max(0, delta_days)):
            daily_dates.append(sowing + timedelta(days=offset))
    if forecast_daily and "temperature_2m_max" in forecast_daily:
        forecast_max = forecast_daily["temperature_2m_max"]
        forecast_min = forecast_daily.get("temperature_2m_min", [0.0] * len(forecast_max))
        for idx, item in enumerate(forecast_max):
            if idx >= len(forecast_min):
                continue
            total_gdd += gdd_for_day(item, forecast_min[idx], base_temp)
    if archive_daily:
        max_vals = [float(v) for v in daily_max if v is not None]
        min_vals = [float(v) for v in daily_min if v is not None]
        for idx in range(min(len(max_vals), len(min_vals))):
            total_gdd += gdd_for_day(max_vals[idx], min_vals[idx], base_temp)
    if total_gdd <= 0.0 and reference_day >= sowing:
        total_gdd = max(0.0, (reference_day - sowing).days * max(0.0, 12.0 - base_temp))
    stage_name = "sowing_emergence"
    threshold_total = 0.0
    for candidate in STAGE_ORDER:
        threshold_total = max(threshold_total, float(stage_thresholds.get(candidate, 0.0)))
    stage_progress = min(1.0, total_gdd / max(threshold_total, 1.0))
    for candidate in STAGE_ORDER:
        if total_gdd < float(stage_thresholds.get(candidate, 0.0)):
            stage_name = candidate
            break
    else:
        stage_name = "maturity"
    return stage_name, total_gdd, float(max(stage_thresholds.values(), default=0.0)), stage_progress


def _et0_daily_from_forecast(forecast_hourly: dict[str, Sequence[Any]] | None) -> float:
    if not forecast_hourly:
        return 3.0
    et0_values = [float(v) for v in forecast_hourly.get("et0_fao_evapotranspiration", []) if v is not None]
    return sum(et0_values) / max(len(et0_values), 1)


def _irrigation_advice_mm(deficit_mm: float, irrigation_type: str) -> tuple[float, str]:
    irrigation_mode = (irrigation_type or "drip").lower()
    if irrigation_mode == "drip":
        return round(max(0.0, deficit_mm), 1), "Apply within 24-48 h; drip pulse for 30-45 min to refill root-zone depletion."
    if irrigation_mode == "sprinkler":
        return round(max(0.0, deficit_mm), 1), "Apply within 12-24 h; split the depth into 2 short cycles to limit runoff."
    if irrigation_mode == "flood":
        return round(max(0.0, deficit_mm * 0.8), 1), "Schedule with field checks to avoid waterlogging; prefer evening scheduling."
    return round(max(0.0, deficit_mm), 1), "Monitor soil moisture and irrigate when depletion reaches 55-60% of TAW."


def _disease_favourability(crop: str, temp_c: float, rh_pct: float) -> list[dict[str, Any]]:
    diseases = [
        {"name": "blight", "temp_window_c": [18.0, 28.0], "rh_threshold_pct": 85.0, "weight": 0.5},
        {"name": "rust", "temp_window_c": [16.0, 30.0], "rh_threshold_pct": 80.0, "weight": 0.45},
        {"name": "powdery_mildew", "temp_window_c": [20.0, 28.0], "rh_threshold_pct": 70.0, "weight": 0.4},
    ]
    results: list[dict[str, Any]] = []
    for item in diseases:
        temp_low, temp_high = item["temp_window_c"]
        in_window = temp_low <= temp_c <= temp_high
        wetness = rh_pct >= item["rh_threshold_pct"]
        score = 100.0 if in_window and wetness else 45.0 if in_window else 15.0
        results.append(
            {
                "name": item["name"],
                "score": round(score, 1),
                "favourable": bool(in_window and wetness),
                "temperature_c": round(temp_c, 1),
                "relative_humidity_pct": round(rh_pct, 1),
                "note": "Weather-based disease-favourability index only; not a diagnosis.",
            }
        )
    return results


def score_crop_risk(
    crop: str,
    sowing_date: str | date,
    lat: float,
    lon: float,
    soil_type: str = "loam",
    irrigation: str = "drip",
    archive_daily: dict[str, Sequence[Any]] | None = None,
    forecast_hourly: dict[str, Sequence[Any]] | None = None,
    soil_layers: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Return crop stress risk, phase, and irrigation guidance.

    The output is intentionally simple and deterministic for unit testing and route integration.
    """
    crop_name = (crop or "wheat").lower().strip()
    profile = CROP_LIBRARY.get(crop_name, CROP_LIBRARY["wheat"])
    soil_key = (soil_type or "loam").lower().strip()
    soil_profile = SOIL_DEFAULTS.get(soil_key, SOIL_DEFAULTS["loam"])
    field_capacity = float(soil_profile["field_capacity"])
    wilting_point = float(soil_profile["wilting_point"])
    root_zone_m = float(profile.get("root_zone_m", 0.8))
    current_moisture = _soil_moisture_from_layers(soil_layers, root_zone_m)
    stage_name, total_gdd, stage_total, stage_progress = estimate_crop_stage(
        crop_name,
        sowing_date,
        archive_daily=archive_daily,
        forecast_daily={
            "temperature_2m_max": [
                item for item in (forecast_hourly or {}).get("temperature_2m", []) if item is not None
            ],
            "temperature_2m_min": [
                item for item in (forecast_hourly or {}).get("temperature_2m", []) if item is not None
            ],
        },
    )
    et0 = _et0_daily_from_forecast(forecast_hourly)
    kc = float(profile.get("kc_by_stage", {}).get(stage_name, 0.8))
    et_c = max(0.0, kc * et0)
    ks = water_stress_coefficient(
        root_zone_m=root_zone_m,
        field_capacity=field_capacity,
        wilting_point=wilting_point,
        current_moisture=current_moisture,
        depletion_fraction=0.55,
    )
    rainfall = 0.0
    if forecast_hourly:
        rainfall = sum(_clean_float(v, 0.0) for v in forecast_hourly.get("precipitation", []))
    deficit_mm = max(0.0, (et_c - rainfall) * 1.0)
    irrigation_mm, irrigation_message = _irrigation_advice_mm(deficit_mm, irrigation)
    temp_values = [float(value) for value in (forecast_hourly or {}).get("temperature_2m", []) if value is not None]
    rh_values = [float(value) for value in (forecast_hourly or {}).get("relative_humidity_2m", []) if value is not None]
    avg_temp = sum(temp_values) / max(len(temp_values), 1)
    avg_rh = sum(rh_values) / max(len(rh_values), 1)
    vpd = vpd_from_temp_rh(avg_temp, avg_rh)
    crit_temp = float(profile.get("critical_temp_c", {}).get(stage_name, 35.0))
    heat_hours = sum(1 for value in temp_values if value > crit_temp)
    cold_hours = sum(1 for value in temp_values if value < max(5.0, crit_temp - 10.0))
    disease_index = _disease_favourability(crop_name, avg_temp, avg_rh)
    disease_level = max(item["score"] for item in disease_index) if disease_index else 0.0
    heat_stress = clamp((heat_hours / max(len(temp_values), 1)) * 100.0, 0.0, 100.0)
    water_stress = clamp((1.0 - ks) * 100.0, 0.0, 100.0)
    vpd_stress = clamp((vpd / 2.5) * 100.0, 0.0, 100.0)
    disease_score = clamp(disease_level / 100.0 * 100.0, 0.0, 100.0)
    score = round(
        clamp(
            0.45 * heat_stress + 0.28 * water_stress + 0.17 * vpd_stress + 0.10 * disease_score,
            0.0,
            100.0,
        ),
        1,
    )
    if score >= 80:
        level = "High"
    elif score >= 55:
        level = "Moderate"
    elif score >= 30:
        level = "Watch"
    else:
        level = "Low"
    actions = []
    if ks < 0.7:
        actions.append("irrigate")
    if heat_hours > 0:
        actions.append("monitor field")
    if disease_score > 55:
        actions.append("delay spraying")
        actions.append("apply protective fungicide advisory")
    if not actions:
        actions.append("monitor field")
    trend = [
        {
            "day": idx + 1,
            "index": round((100.0 - score * (0.9 + idx * 0.01)) + (idx * 2.0), 1),
            "status": "stable" if score < 50 else "watch",
        }
        for idx in range(7)
    ]
    return {
        "score": score,
        "level": level,
        "stage": stage_name,
        "stage_progress_pct": round(stage_progress * 100.0, 1),
        "gdd_accumulated": round(total_gdd, 1),
        "gdd_target": round(stage_total, 1),
        "water_stress": round(ks, 3),
        "irrigation_advice": {
            "mm": irrigation_mm,
            "timing": irrigation_message,
            "deficit_mm": round(deficit_mm, 1),
        },
        "heat_stress_hours": int(heat_hours),
        "cold_stress_hours": int(cold_hours),
        "vpd_kpa": round(vpd, 2),
        "disease_favourability": disease_index,
        "crop_health_trend": trend,
        "recommended_actions": actions,
        "ndvi_context": {
            "layer": "NASA_GIBS_MODIS_061_MOD13A2_NDVI",
            "note": "Imagery only; not a field-level measurement.",
            "lat": lat,
            "lon": lon,
        },
        "crop": crop_name,
        "soil_type": soil_key,
        "irrigation": irrigation,
    }
