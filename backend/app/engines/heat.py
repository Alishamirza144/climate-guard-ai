"""Heatwave and heat-stress risk engine.

This module implements a hydrometeorological heat-stress assessment for the ClimateGuard backend.
It combines:
- NWS heat-index calculations (Rothfusz regression with simple-form fallback)
- IMD heatwave / warm-night thresholds
- duration and night-recovery weighting
- grid-based local heat zones and a hybrid ML blend matching the flood engine rule.
"""

from __future__ import annotations

import math
from typing import Any, Sequence

from pydantic import BaseModel, Field

DEFAULT_WEIGHTS = {
    "temperature_anomaly": 0.25,
    "heat_index": 0.20,
    "duration": 0.15,
    "solar_load": 0.15,
    "wind_relief": 0.10,
    "humidity_stress": 0.10,
    "night_recovery": 0.05,
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


def _heat_index_simple(temp_c: float, rh: float) -> float:
    """Steadman simple formula for lower heat-index values."""
    t = _clean_float(temp_c)
    r = _clean_float(rh)
    if t <= 27.0 or r <= 0.0:
        return t
    return -8.78469475556 + 1.61139411 * t + 2.338549 * r - 0.14611605 * t * r - 0.012308094 * t * t - 0.016424828 * r * r + 0.002211732 * t * t * r + 0.00072546 * t * r * r - 0.000003582 * t * t * r * r


def heat_index_celsius(temp_c: float | None, relative_humidity: float | None) -> float:
    """Compute the NWS heat index (Rothfusz regression) in °C.

    For values below 27 C, the result approximates the actual air temperature.
    """
    temp = _clean_float(temp_c, 0.0)
    rh = _clean_float(relative_humidity, 0.0)
    if temp <= 0.0 or rh <= 0.0:
        return 0.0
    simple = _heat_index_simple(temp, rh)
    if temp < 27.0:
        return temp
    if temp <= 40.0:
        hi = simple
    else:
        hi = (
            -42.379
            + 2.04901523 * temp
            + 10.14333127 * rh
            - 0.22475541 * temp * rh
            - 0.00683783 * temp * temp
            - 0.05481717 * rh * rh
            + 0.00122874 * temp * temp * rh
            + 0.00085282 * temp * rh * rh
            - 0.00000199 * temp * temp * rh * rh
        )
        if rh < 13.0 and 27.0 <= temp <= 40.0:
            hi -= ((13.0 - rh) / 4.0) * ((17.0 - abs(temp - 25.0)) / 17.0)
        elif rh > 85.0 and 27.0 <= temp <= 40.0:
            hi += ((rh - 85.0) / 10.0) * ((87.0 - temp) / 5.0)

    if hi < temp:
        hi = temp
    return clamp(hi, 0.0, 100.0)


def wet_bulb_temperature_c(temp_c: float | None, relative_humidity: float | None, pressure_hpa: float | None = None) -> float:
    """Approximate wet-bulb temperature using Stull's approximation.

    Pressure is optional and mainly used for normalization; if omitted, 1013 hPa is assumed.
    """
    temp = _clean_float(temp_c, 0.0)
    rh = _clean_float(relative_humidity, 0.0)
    if temp <= 0.0 or rh <= 0.0:
        return 0.0
    p = _clean_float(pressure_hpa, 1013.0)
    gamma = 0.0015 * (p / 100.0)
    dew = temp - ((100.0 - rh) / 5.0)
    wb = temp * math.atan(0.151977 * math.sqrt(rh + 8.313659)) + math.atan(temp + rh) - math.atan(rh - 1.676331) + 0.00391838 * (rh ** 1.5) * math.atan(0.023101 * rh) - 4.686
    if not math.isfinite(wb):
        return temp
    return clamp(wb, 0.0, 60.0)


def imd_heatwave_status(
    tmax_c: float | None,
    tmax_normal_c: float | None,
    tmin_c: float | None,
    tmin_normal_c: float | None,
) -> dict[str, Any]:
    """Return IMD plains heatwave criteria plus warm night assessment."""
    tmax = _clean_float(tmax_c, 0.0)
    tmax_normal = _clean_float(tmax_normal_c, tmax)
    tmin = _clean_float(tmin_c, 0.0)
    tmin_normal = _clean_float(tmin_normal_c, tmin)
    departure = tmax - tmax_normal
    heatwave = (tmax >= 40.0 and departure >= 4.5) or (tmax >= 45.0)
    severe_heatwave = (departure >= 6.5) or (tmax >= 47.0)
    warm_night = (tmin - tmin_normal) >= 4.5
    return {
        "heatwave": bool(heatwave),
        "severe_heatwave": bool(severe_heatwave),
        "warm_night": bool(warm_night),
        "tmax_departure_c": departure,
        "tmin_departure_c": tmin - tmin_normal,
        "tmax_norm_c": tmax_normal,
        "tmin_norm_c": tmin_normal,
    }


def consecutive_hot_days(values: Sequence[float] | None, threshold: float = 40.0) -> int:
    """Count the longest consecutive run of days/values at or above threshold."""
    items = [_clean_float(value, 0.0) for value in (values or [])]
    if not items:
        return 0
    longest = current = 0
    for value in items:
        if value >= threshold:
            current += 1
            longest = max(longest, current)
        else:
            current = 0
    return longest


def _compute_subscores(
    temp_anomaly_c: float,
    heat_index_c: float,
    duration_days: int,
    shortwave_radiation_wm2: float,
    wind_speed_kph: float,
    humidity_percent: float,
    night_recovery_c: float,
) -> dict[str, float]:
    anomaly = clamp((temp_anomaly_c / 12.0) * 100.0, 0.0, 100.0)
    hi_score = clamp((heat_index_c / 55.0) * 100.0, 0.0, 100.0)
    duration_score = clamp((duration_days / 7.0) * 100.0, 0.0, 100.0)
    solar_score = clamp((shortwave_radiation_wm2 / 1000.0) * 100.0, 0.0, 100.0)
    wind_score = clamp((1.0 - min(wind_speed_kph / 25.0, 1.0)) * 100.0, 0.0, 100.0)
    humidity_score = clamp((humidity_percent / 100.0) * 100.0, 0.0, 100.0)
    night_recovery_score = clamp((night_recovery_c / 8.0) * 100.0, 0.0, 100.0)
    return {
        "temperature_anomaly": anomaly,
        "heat_index": hi_score,
        "duration": duration_score,
        "solar_load": solar_score,
        "wind_relief": wind_score,
        "humidity_stress": humidity_score,
        "night_recovery": night_recovery_score,
    }


class HeatRisk(BaseModel):
    score: float = Field(ge=0.0, le=100.0)
    level: str
    probability: float = Field(ge=0.0, le=1.0)
    headline: str
    temperature_alert: str | None = None
    peak_temperature_c: float = Field(ge=-100.0, le=100.0)
    peak_time: str | None = None
    hourly_trend: list[dict[str, Any]] = Field(default_factory=list)
    risk_zones: list[dict[str, Any]] = Field(default_factory=list)
    recommended_actions: list[str] = Field(default_factory=list)
    vulnerable_groups: list[str] = Field(default_factory=list)
    aqi_line: str | None = None
    model_mode: str
    heatwave_status: dict[str, Any] = Field(default_factory=dict)
    data_quality: dict[str, Any] = Field(default_factory=dict)


def _score_to_level(score: float) -> str:
    if score >= 85:
        return "Critical"
    if score >= 60:
        return "High"
    if score >= 30:
        return "Moderate"
    return "Low"


def score_heat_risk(
    tmax_c: float | None,
    tmin_c: float | None,
    avg_temperature_c: float | None,
    relative_humidity: float | None,
    wind_speed_kph: float | None,
    shortwave_radiation_wm2: float | None,
    tmax_normal_c: float | None,
    tmin_normal_c: float | None,
    ml_probability: float | None = None,
    ml_validation_auc: float | None = None,
    location_name: str = "Urban Area",
    hourly_trend: Sequence[float] | None = None,
    data_quality: dict[str, Any] | None = None,
    duration_days: int = 1,
    simulation_mode: bool = False,
) -> dict[str, Any]:
    """Return the final heat-risk score with the documented sub-scores and action advice.

    Final score uses a weighted sum of seven contributions. ML blend follows the same pattern as the flood engine:
    60% ML probability * 100 + 40% physics score, when the model exceeds the threshold AUC and the probability is valid.
    """
    temp = _clean_float(avg_temperature_c, 0.0)
    tmax = _clean_float(tmax_c, temp)
    tmin = _clean_float(tmin_c, temp)
    humidity = clamp(_clean_float(relative_humidity, 0.0), 0.0, 100.0)
    wind = _clean_float(wind_speed_kph, 0.0)
    solar = _clean_float(shortwave_radiation_wm2, 0.0)
    normal_tmax = _clean_float(tmax_normal_c, tmax)
    normal_tmin = _clean_float(tmin_normal_c, tmin)
    heat_idx = heat_index_celsius(tmax, humidity)
    duration = max(1, int(duration_days))
    status = imd_heatwave_status(tmax, normal_tmax, tmin, normal_tmin)
    temp_anomaly = tmax - normal_tmax
    if temp_anomaly < 0:
        temp_anomaly = 0.0
    night_recovery = max(0.0, normal_tmin - tmin)
    subscores = _compute_subscores(
        temp_anomaly_c=temp_anomaly,
        heat_index_c=heat_idx,
        duration_days=duration,
        shortwave_radiation_wm2=solar,
        wind_speed_kph=wind,
        humidity_percent=humidity,
        night_recovery_c=night_recovery,
    )
    weight_total = sum(DEFAULT_WEIGHTS.values())
    physics_score = (
        subscores["temperature_anomaly"] * DEFAULT_WEIGHTS["temperature_anomaly"]
        + subscores["heat_index"] * DEFAULT_WEIGHTS["heat_index"]
        + subscores["duration"] * DEFAULT_WEIGHTS["duration"]
        + subscores["solar_load"] * DEFAULT_WEIGHTS["solar_load"]
        + subscores["wind_relief"] * DEFAULT_WEIGHTS["wind_relief"]
        + subscores["humidity_stress"] * DEFAULT_WEIGHTS["humidity_stress"]
        + subscores["night_recovery"] * DEFAULT_WEIGHTS["night_recovery"]
    ) / weight_total
    final_score = clamp(physics_score, 0.0, 100.0)
    model_mode = "physics"
    if ml_probability is not None and ml_validation_auc is not None:
        ml_prob = _clean_float(ml_probability, 0.0)
        auc = _clean_float(ml_validation_auc, 0.0)
        if 0.0 <= ml_prob <= 1.0 and auc > 0.65:
            final_score = (0.6 * ml_prob * 100.0) + (0.4 * physics_score)
            model_mode = "hybrid"
    final_score = clamp(final_score, 0.0, 100.0)
    level = _score_to_level(final_score)
    peak_temperature = max(tmax, heat_idx)
    peak_time = "12:00" if hourly_trend and len(hourly_trend) > 12 else "14:00"
    hourly = [{"hour": idx + 1, "temperature_c": float(value), "predicted_peak": idx + 1 == 12} for idx, value in enumerate((hourly_trend or [peak_temperature])[:24])]
    if not hourly:
        hourly = [{"hour": 1, "temperature_c": float(peak_temperature), "predicted_peak": True}]

    headline = f"High heat risk detected in {location_name} (Urban Area)"
    if final_score < 60:
        headline = f"Moderate heat risk in {location_name}"
    if status["severe_heatwave"]:
        headline = f"Severe heatwave alert in {location_name}"
    if status["heatwave"] and peak_temperature >= 44.0:
        headline = f"High heat risk detected in {location_name} (Urban Area)"

    recommended = [
        "Hydrate frequently and avoid dehydration",
        "Avoid 11:00-16:00 outdoor work when possible",
        "Check elderly residents and people with chronic conditions",
    ]
    if status["heatwave"]:
        recommended.insert(0, "Use cooling spaces and shade during peak hours")
    if status["warm_night"]:
        recommended.append("Monitor overnight heat stress and recovery")

    vulnerable = ["Elderly adults", "Children", "People with heart or respiratory illness", "Outdoor workers"]
    if status["warm_night"]:
        vulnerable.append("People without nighttime cooling access")

    aqi_line = None
    if solar > 700.0:
        aqi_line = "AQI may rise with strong solar heating; limit outdoor exertion when air quality is poor."

    temperature_alert = None
    if peak_temperature >= 44.0:
        temperature_alert = f"Temperature may reach {peak_temperature:.0f} C"

    zone_candidates = [
        {"name": "Urban Area", "risk": final_score * 0.98, "approximation": True},
        {"name": "Low-Wind Corridors", "risk": final_score * 0.9, "approximation": True},
        {"name": "Commercial Core", "risk": final_score * 0.82, "approximation": True},
    ]
    quality = data_quality or {}
    quality.setdefault("simulation_mode", simulation_mode)
    payload = {
        "score": round(clamp(final_score, 0.0, 100.0), 2),
        "level": level,
        "probability": round(clamp(final_score / 100.0, 0.0, 1.0), 3),
        "headline": headline,
        "temperature_alert": temperature_alert,
        "peak_temperature_c": round(peak_temperature, 2),
        "peak_time": peak_time,
        "hourly_trend": hourly,
        "risk_zones": zone_candidates,
        "recommended_actions": recommended,
        "vulnerable_groups": vulnerable,
        "aqi_line": aqi_line,
        "model_mode": model_mode,
        "heatwave_status": status,
        "data_quality": quality,
        "subscores": subscores,
    }
    return payload
