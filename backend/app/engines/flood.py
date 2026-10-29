"""Flood-risk scoring engine built from free hydrometeorological data.

Formula sources:
- SCS Curve Number runoff method: NRCS Urban Hydrology for Small Watersheds (TR-55).
- IMD 24 h rainfall classification bands: India Meteorological Department rainfall categories.
- Terrain exposure and antecedent soil moisture are normalized using hydrologic thresholds consistent
  with field-capacity, wilting-point, and near-saturation ranges for agronomic soils.
"""

from __future__ import annotations

import math
from statistics import median
from typing import Any, Sequence

from pydantic import BaseModel, Field

SOIL_WILTING_POINT = 0.12
SOIL_SATURATION = 0.45
SOIL_LAYER_WEIGHTS = (0.30, 0.25, 0.20, 0.15, 0.10)
DEFAULT_WEIGHTS = {
    "rainfall": 0.30,
    "runoff": 0.25,
    "soil": 0.15,
    "river": 0.20,
    "terrain": 0.10,
}


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


def clamp(value: float, lower: float = 0.0, upper: float = 100.0) -> float:
    return max(lower, min(upper, value))


def rainfall_class_for_24h(rain_mm: float) -> str:
    """Return IMD-style rainfall class for a 24 h total."""
    rain = _clean_float(rain_mm)
    if rain >= 204.5:
        return "Extremely Heavy"
    if rain >= 115.6:
        return "Very Heavy"
    if rain >= 64.5:
        return "Heavy"
    if rain > 0:
        return "Light"
    return "None"


def compute_rainfall_accumulations(
    past_values: Sequence[float] | None = None,
    forecast_values: Sequence[float] | None = None,
) -> dict[str, float]:
    """Return rolling accumulations and peak hourly intensity for rainfall.

    For 24/48/72 h totals, the function looks at the available historical values and
    forecast values separately when supplied.
    """
    past = [_clean_float(value) for value in (past_values or [])]
    forecast = [_clean_float(value) for value in (forecast_values or [])]
    all_values = past + forecast
    result: dict[str, float] = {
        "1h": 0.0,
        "3h": 0.0,
        "6h": 0.0,
        "24h": 0.0,
        "48h": 0.0,
        "72h": 0.0,
        "past_24h": 0.0,
        "past_48h": 0.0,
        "past_72h": 0.0,
        "forecast_24h": 0.0,
        "forecast_48h": 0.0,
        "forecast_72h": 0.0,
        "peak_hourly_intensity_mm_h": 0.0,
    }
    if not all_values:
        return result
    result["peak_hourly_intensity_mm_h"] = max(all_values, default=0.0)
    for window in (1, 3, 6, 24, 48, 72):
        if len(past) >= window:
            result[f"{window}h"] = sum(past[-window:])
        elif past:
            result[f"{window}h"] = sum(past)
        else:
            result[f"{window}h"] = 0.0

    result["past_24h"] = sum(past[-24:]) if past else 0.0
    result["past_48h"] = sum(past[-48:]) if past else 0.0
    result["past_72h"] = sum(past[-72:]) if past else 0.0
    result["forecast_24h"] = sum(forecast[:24]) if forecast else 0.0
    result["forecast_48h"] = sum(forecast[:48]) if forecast else 0.0
    result["forecast_72h"] = sum(forecast[:72]) if forecast else 0.0
    result["24h"] = result["past_24h"] + result["forecast_24h"]
    result["48h"] = result["past_48h"] + result["forecast_48h"]
    result["72h"] = result["past_72h"] + result["forecast_72h"]
    return result


def antecedent_soil_saturation_index(layers: Sequence[float | None]) -> float:
    """Weighted mean soil moisture index normalized against wilting and saturation values.

    This uses a shallow-layer-heavy weighting distribution and normalizes each layer to a 0..1 index.
    """
    values: list[float] = []
    for value in layers:
        numeric = _clean_float(value)
        if numeric >= 0:
            values.append(numeric)
    if not values:
        return 0.0
    normalized: list[float] = []
    for value in values:
        span = max(SOIL_SATURATION - SOIL_WILTING_POINT, 1e-6)
        normalized_value = clamp((value - SOIL_WILTING_POINT) / span, 0.0, 1.0)
        normalized.append(normalized_value)
    weights = SOIL_LAYER_WEIGHTS[: len(normalized)]
    if len(weights) < len(normalized):
        weights = weights + (1.0 / max(len(normalized), 1),) * (len(normalized) - len(weights))
    total_weight = sum(weights)
    weighted_value = sum(normalized[idx] * weights[idx] for idx in range(len(normalized)))
    return clamp((weighted_value / total_weight) if total_weight else 0.0, 0.0, 1.0)


def scs_runoff(precipitation_mm: float, cn: float = 75.0) -> float:
    """Return runoff depth in mm using the SCS Curve Number equation.

    Source: NRCS TR-55 runoff equation: S = 25400/CN - 254, Q = (P - 0.2S)^2 / (P + 0.8S)
    for P > 0.2S. This reflects infiltration losses before excess rainfall becomes runoff.
    """
    p = _clean_float(precipitation_mm)
    if p <= 0:
        return 0.0
    cn_value = _clean_float(cn, 75.0)
    cn_value = min(max(cn_value, 20.0), 100.0)
    s = (25400.0 / cn_value) - 254.0
    if s <= 0:
        return p
    if p <= 0.2 * s:
        return 0.0
    runoff = ((p - 0.2 * s) ** 2) / (p + 0.8 * s)
    return max(0.0, runoff)


def _as_float_sequence(value: Any) -> list[float]:
    if value is None:
        return []
    if isinstance(value, (int, float)):
        return [_clean_float(value)]
    if isinstance(value, (list, tuple, set)):
        return [_clean_float(item) for item in value]
    return []


def compute_river_component(data: dict[str, Any]) -> dict[str, float]:
    """Compute discharge ratios, percentile, and rising-limb flag for the river component."""
    values = _as_float_sequence(data.get("river_discharge", []))
    mean_vals = _as_float_sequence(data.get("river_discharge_mean", []))
    max_vals = _as_float_sequence(data.get("river_discharge_max", []))

    current = values[-1] if values else 0.0
    base_mean = median(mean_vals) if mean_vals else 0.0
    base_max = max(max_vals) if max_vals else 0.0
    ratio_to_mean = current / base_mean if base_mean else 0.0
    ratio_to_max = current / base_max if base_max else 0.0

    history = values + mean_vals + max_vals
    if history:
        sorted_history = sorted(history)
        if current > 0 and sorted_history:
            percentile = (sum(1 for item in sorted_history if item <= current) / len(sorted_history)) * 100.0
        else:
            percentile = 0.0
    else:
        percentile = 0.0

    rising_limb = 0.0
    if len(values) >= 2:
        rising_limb = max(0.0, values[-1] - values[-2])

    return {
        "ratio_to_mean": clamp(ratio_to_mean * 100.0, 0.0, 1000.0) / 100.0,
        "ratio_to_max": clamp(ratio_to_max * 100.0, 0.0, 1000.0) / 100.0,
        "percentile_90day": clamp(percentile, 0.0, 100.0),
        "rising_limb_24h": rising_limb,
    }


def compute_terrain_exposure(
    elevation_m: float | None = None,
    median_elevation_m: float | None = None,
    nearest_waterway_m: float | None = None,
    waterway_density: float | None = None,
    elevation: float | None = None,
    median_elevation: float | None = None,
) -> dict[str, Any]:
    """Compute low-lying exposure, relative elevation, and drainage exposure metrics."""
    if elevation_m is None:
        elevation_m = elevation
    if median_elevation_m is None:
        median_elevation_m = median_elevation
    elevation = _clean_float(elevation_m, 0.0)
    median_elev = _clean_float(median_elevation_m, elevation)
    nearest_waterway = _clean_float(nearest_waterway_m, 10000.0)
    density = _clean_float(waterway_density, 0.0)
    relative_elevation = elevation - median_elev
    low_lying = relative_elevation < -5.0
    drainage_factor = clamp(1.0 - density, 0.0, 1.0)
    exposure_index = clamp((0.6 * max(0.0, -relative_elevation) / 20.0) + (0.4 * (1.0 if low_lying else 0.0)) + (0.2 * (1.0 if nearest_waterway < 250 else 0.0)) + (0.2 * drainage_factor), 0.0, 1.0)
    return {
        "low_lying": bool(low_lying),
        "relative_elevation_m": relative_elevation,
        "nearest_waterway_m": nearest_waterway,
        "waterway_density": clamp(density, 0.0, 1.0),
        "exposure_index": exposure_index,
    }


def weighted_physics_score(
    rainfall_score: float,
    runoff_score: float,
    soil_score: float,
    river_score: float,
    terrain_score: float,
    weights: dict[str, float] | None = None,
) -> dict[str, float]:
    """Combine the five sub-scores using configurable weights into a physics score."""
    selected_weights = weights or DEFAULT_WEIGHTS
    sub_scores = {
        "rainfall": clamp(_clean_float(rainfall_score), 0.0, 100.0),
        "runoff": clamp(_clean_float(runoff_score), 0.0, 100.0),
        "soil": clamp(_clean_float(soil_score), 0.0, 100.0),
        "river": clamp(_clean_float(river_score), 0.0, 100.0),
        "terrain": clamp(_clean_float(terrain_score), 0.0, 100.0),
    }
    physics_score = (
        sub_scores["rainfall"] * selected_weights["rainfall"]
        + sub_scores["runoff"] * selected_weights["runoff"]
        + sub_scores["soil"] * selected_weights["soil"]
        + sub_scores["river"] * selected_weights["river"]
        + sub_scores["terrain"] * selected_weights["terrain"]
    )
    sub_scores["physics_score"] = clamp(physics_score, 0.0, 100.0)
    return sub_scores


class FloodRisk(BaseModel):
    score: float = Field(ge=0.0, le=100.0)
    level: str
    probability: float = Field(ge=0.0, le=1.0)
    expected_severity: str
    estimated_peak_runoff_depth_mm: float = Field(ge=0.0)
    lead_time_hours: int = Field(ge=0)
    affected_zone: str
    hourly_trend: list[dict[str, Any]] = Field(default_factory=list)
    drivers: list[dict[str, Any]] = Field(default_factory=list)
    data_quality: dict[str, Any] = Field(default_factory=dict)
    model_mode: str


def _score_to_level(score: float) -> str:
    if score >= 85:
        return "Critical"
    if score >= 60:
        return "High"
    if score >= 30:
        return "Moderate"
    return "Low"


def _build_hourly_trend(peak_hour: int, rainfall_pattern: Sequence[float] | None = None) -> list[dict[str, Any]]:
    pattern = list(rainfall_pattern or [])
    trend: list[dict[str, Any]] = []
    if not pattern:
        pattern = [0.0] * 24
    for index, value in enumerate(pattern[:24]):
        trend.append({
            "hour": index + 1,
            "rain_mm_h": float(value),
            "predicted_peak": index + 1 == peak_hour,
        })
    return trend


def score_flood_risk(
    rainfall_24h_mm: float,
    runoff_depth_mm: float,
    soil_saturation: float,
    river_ratio: float,
    terrain_exposure: float,
    affected_zone: str = "Local catchment",
    ml_probability: float | None = None,
    ml_validation_auc: float | None = None,
    lead_time_hours: int = 24,
    hourly_trend: Sequence[float] | None = None,
    data_quality: dict[str, Any] | None = None,
    simulation_mode: bool = False,
) -> FloodRisk:
    """Return the final flood-risk score plus the risk level and explanation fields."""
    rain = _clean_float(rainfall_24h_mm)
    runoff = _clean_float(runoff_depth_mm)
    soil = clamp(_clean_float(soil_saturation) * 100.0, 0.0, 100.0)
    river = clamp(_clean_float(river_ratio) * 100.0, 0.0, 100.0)
    terrain = clamp(_clean_float(terrain_exposure) * 100.0, 0.0, 100.0)
    rainfall_score = clamp((rain / 200.0) * 100.0, 0.0, 100.0)
    runoff_score = clamp((runoff / 60.0) * 100.0, 0.0, 100.0)
    river_score = clamp((river / 1.5) if river else 0.0, 0.0, 100.0)
    terrain_score = clamp(terrain, 0.0, 100.0)

    combined = weighted_physics_score(rainfall_score, runoff_score, soil, river_score, terrain_score)
    physics_score = combined["physics_score"]

    model_mode = "physics"
    final_score = physics_score
    if ml_probability is not None and ml_validation_auc is not None:
        ml_probability_value = _clean_float(ml_probability)
        ml_auc = _clean_float(ml_validation_auc)
        if 0.0 <= ml_probability_value <= 1.0 and ml_auc > 0.65:
            final_score = (0.6 * ml_probability_value * 100.0) + (0.4 * physics_score)
            model_mode = "hybrid"

    final_score = clamp(final_score, 0.0, 100.0)
    score_level = _score_to_level(final_score)
    probability = clamp(final_score / 100.0, 0.0, 1.0)
    severity = "Minor drainage stress"
    if final_score >= 85:
        severity = "Severe urban flooding risk"
    elif final_score >= 60:
        severity = "Flooding likely in low-lying areas"
    elif final_score >= 30:
        severity = "Elevated runoff and pooling risk"
    expected_severity = f"{severity} — peak runoff approx. {runoff:.1f} mm"
    peak_hour = max(1, min(len(_build_hourly_trend(1, hourly_trend or [0.0] * 24)) or [1], int(lead_time_hours / 2)))
    hourly = _build_hourly_trend(peak_hour, hourly_trend)
    drivers = [
        {"factor": "rainfall_24h_mm", "value": round(rain, 1), "unit": "mm", "score": rainfall_score},
        {"factor": "runoff_depth_mm", "value": round(runoff, 1), "unit": "mm", "score": runoff_score},
        {"factor": "soil_saturation", "value": round(soil / 100.0, 3), "unit": "fraction", "score": soil},
    ]
    drivers = sorted(drivers, key=lambda d: d["score"], reverse=True)[:3]
    quality: dict[str, Any] = data_quality or {"openmeteo_forecast": True, "openmeteo_flood": True, "terrain": True}
    quality.setdefault("simulation_mode", simulation_mode)
    return FloodRisk(
        score=final_score,
        level=score_level,
        probability=probability,
        expected_severity=expected_severity,
        estimated_peak_runoff_depth_mm=runoff,
        lead_time_hours=int(lead_time_hours),
        affected_zone=affected_zone,
        hourly_trend=hourly,
        drivers=drivers,
        data_quality=quality,
        model_mode=model_mode,
    )


def compute_zone_ranking(zones: Sequence[dict[str, Any]]) -> list[dict[str, Any]]:
    """Return the top five ranked zones by descending flood risk."""
    if not zones:
        return []
    ranked = sorted(zones, key=lambda zone: _clean_float(zone.get("risk", 0.0)), reverse=True)
    return [
        {
            "name": str(zone.get("name", "Zone")),
            "risk": clamp(_clean_float(zone.get("risk", 0.0)), 0.0, 100.0),
            "score": clamp(_clean_float(zone.get("risk", 0.0)), 0.0, 100.0),
        }
        for zone in ranked[:5]
    ]
