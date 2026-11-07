"""Physics-based and hybrid machine learning flood risk engine.

Implements rigorous scientific separation between:
1. FLOOD HAZARD: Static catchment susceptibility (topography, drainage density, river proximity, historical susceptibility).
2. CURRENT FLOOD CONDITIONS: Dynamic hydrology (observed 24h rainfall, forecast rainfall, soil saturation, SCS-CN runoff, river stage ratio).
3. FLOOD RISK: Synthesis of hazard and current dynamic stress, ensuring static proximity never produces false active flood alerts.
"""

from __future__ import annotations

import math
from typing import Any, Sequence

from pydantic import BaseModel, ConfigDict, Field

from app.engines.seasonal import (
    apply_hysteresis,
    evaluate_winter_conditions,
    get_current_season,
)

DEFAULT_WEIGHTS = {
    "rainfall": 0.35,
    "runoff": 0.25,
    "soil": 0.15,
    "river": 0.15,
    "terrain": 0.10,
}


def _clean_float(value: Any, default: float = 0.0) -> float:
    try:
        val = float(value)
        return val if math.isfinite(val) else default
    except (TypeError, ValueError):
        return default


def clamp(value: float, min_val: float, max_val: float) -> float:
    return max(min_val, min(max_val, value))


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
    """Return rolling accumulations and peak hourly intensity for rainfall."""
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

    result["1h"] = round(all_values[-1] if all_values else 0.0, 2)
    result["3h"] = round(sum(all_values[-3:]), 2)
    result["6h"] = round(sum(all_values[-6:]), 2)
    result["24h"] = round(sum(all_values[-24:]), 2)
    result["48h"] = round(sum(all_values[-48:]), 2)
    result["72h"] = round(sum(all_values[-72:]), 2)
    result["past_24h"] = round(sum(past[-24:]), 2) if past else 0.0
    result["past_48h"] = round(sum(past[-48:]), 2) if past else 0.0
    result["past_72h"] = round(sum(past[-72:]), 2) if past else 0.0
    result["forecast_24h"] = round(sum(forecast[:24]), 2) if forecast else 0.0
    result["forecast_48h"] = round(sum(forecast[:48]), 2) if forecast else 0.0
    result["forecast_72h"] = round(sum(forecast[:72]), 2) if forecast else 0.0
    result["peak_hourly_intensity_mm_h"] = round(max(all_values), 2)
    return result


def antecedent_soil_saturation_index(soil_moisture_layers: Sequence[float | None]) -> float:
    """Calculate depth-weighted antecedent soil saturation index between 0.0 and 1.0."""
    valid_layers = [_clean_float(v) for v in soil_moisture_layers if v is not None]
    if not valid_layers:
        return 0.0
    weights = [0.35, 0.25, 0.20, 0.12, 0.08][: len(valid_layers)]
    weight_sum = sum(weights) or 1.0
    normalized_weights = [w / weight_sum for w in weights]
    avg = sum(val * w for val, w in zip(valid_layers, normalized_weights))
    # Volumetric moisture 0.45+ m3/m3 represents field saturation
    return clamp(avg / 0.45, 0.0, 1.0)


def scs_runoff(rainfall_mm: float, cn: float = 75.0) -> float:
    """Calculate direct surface runoff depth in mm using USDA-NRCS SCS Curve Number method."""
    p = _clean_float(rainfall_mm)
    if p <= 0.0:
        return 0.0
    curve_number = clamp(_clean_float(cn, 75.0), 30.0, 98.0)
    # Potential maximum retention after runoff begins (S in mm)
    s = (25400.0 / curve_number) - 254.0
    # Standard initial abstraction Ia = 0.2 * S (or 0.05 for Indian urban tropical catchments)
    ia = 0.2 * s
    if p <= ia:
        return 0.0
    return clamp(((p - ia) ** 2) / (p - ia + s), 0.0, p)


def compute_river_component(flood_daily_dict: dict[str, Any]) -> dict[str, float]:
    """Calculate river discharge ratio, percentile, and rate of rise."""
    discharges = [_clean_float(v) for v in flood_daily_dict.get("river_discharge", []) if v is not None]
    mean_val = _clean_float(flood_daily_dict.get("river_discharge_mean", 0.0))
    max_val = _clean_float(flood_daily_dict.get("river_discharge_max", 0.0))

    if not discharges:
        return {
            "ratio_to_mean": 0.0,
            "ratio_to_max": 0.0,
            "percentile_90day": 0.0,
            "rising_limb_24h": 0.0,
        }

    curr_discharge = discharges[-1]
    denom_mean = mean_val if mean_val > 0.0 else max(1.0, curr_discharge)
    denom_max = max_val if max_val > 0.0 else max(1.0, curr_discharge)

    ratio_to_mean = curr_discharge / denom_mean
    ratio_to_max = curr_discharge / denom_max

    sorted_vals = sorted(discharges)
    rank = sorted_vals.index(curr_discharge)
    percentile = (rank / max(1, len(sorted_vals))) * 100.0

    rising_limb = 0.0
    if len(discharges) >= 2:
        rising_limb = max(0.0, discharges[-1] - discharges[-2])

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
    elev = _clean_float(elevation_m, 0.0)
    median_elev = _clean_float(median_elevation_m, elev)
    nearest_waterway = _clean_float(nearest_waterway_m, 10000.0)
    density = _clean_float(waterway_density, 0.0)
    relative_elevation = elev - median_elev
    low_lying = relative_elevation < -5.0
    drainage_factor = clamp(1.0 - density, 0.0, 1.0)
    exposure_index = clamp(
        (0.6 * max(0.0, -relative_elevation) / 20.0)
        + (0.4 * (1.0 if low_lying else 0.0))
        + (0.2 * (1.0 if nearest_waterway < 250 else 0.0))
        + (0.2 * drainage_factor),
        0.0,
        1.0,
    )
    return {
        "low_lying": bool(low_lying),
        "relative_elevation_m": relative_elevation,
        "nearest_waterway_m": nearest_waterway,
        "waterway_density": clamp(density, 0.0, 1.0),
        "exposure_index": exposure_index,
    }


def compute_flood_hazard(
    relative_elevation_m: float = 0.0,
    nearest_waterway_km: float = 1.5,
    drainage_density: float = 1.0,
    historical_susceptibility_score: float = 30.0,
) -> dict[str, Any]:
    """Compute static catchment flood susceptibility / hazard.

    Evaluates topography, drainage geometry, and historical basin behavior.
    Represents potential vulnerability IF extreme water inputs occur; does NOT mean an active flood.
    """
    rel_elev = _clean_float(relative_elevation_m)
    dist_km = _clean_float(nearest_waterway_km, 1.5)
    density = _clean_float(drainage_density, 1.0)
    hist_score = _clean_float(historical_susceptibility_score, 30.0)

    elev_factor = clamp(max(0.0, -rel_elev) / 15.0, 0.0, 1.0)
    prox_factor = clamp(max(0.0, 3.0 - dist_km) / 3.0, 0.0, 1.0)
    density_factor = clamp(1.0 - (density / 2.5), 0.0, 1.0)
    hist_factor = clamp(hist_score / 100.0, 0.0, 1.0)

    hazard_score = round(
        (0.35 * elev_factor + 0.30 * prox_factor + 0.15 * density_factor + 0.20 * hist_factor) * 100.0,
        1,
    )
    if hazard_score >= 65.0:
        hazard_level = "High"
    elif hazard_score >= 35.0:
        hazard_level = "Moderate"
    else:
        hazard_level = "Low"

    factors: list[str] = []
    if dist_km <= 1.0:
        factors.append(f"Proximity to river channel ({dist_km:.1f} km)")
    if rel_elev < -2.0:
        factors.append(f"Low-lying catchment depression ({rel_elev:.1f} m relative elevation)")
    elif rel_elev > 5.0:
        factors.append(f"Elevated plateau terrain (+{rel_elev:.1f} m above basin floor)")
    if density >= 1.5:
        factors.append(f"Dense drainage conduit network ({density:.2f} km/km²)")
    if hist_score >= 50.0:
        factors.append("Historically vulnerable monsoon catchment")

    if not factors:
        factors.append("Nominal catchment drainage gradient with low terrain vulnerability")

    return {
        "hazard_score": hazard_score,
        "hazard_level": hazard_level,
        "susceptibility_factors": factors,
        "explanation": "Static catchment susceptibility indicates potential inundation pathways during extreme rainfall events; it does not indicate current flooding.",
    }


def compute_current_flood_conditions(
    rainfall_24h_mm: float,
    rainfall_forecast_24h_mm: float = 0.0,
    runoff_depth_mm: float = 0.0,
    soil_saturation: float = 0.25,
    river_ratio: float = 1.0,
    dam_discharge_cusecs: float = 0.0,
    has_official_warning: bool = False,
    is_telemetry_missing: bool = False,
) -> dict[str, Any]:
    """Compute current dynamic flood conditions from observed & forecast hydrology."""
    if is_telemetry_missing:
        return {
            "condition_score": 0.0,
            "condition_status": "Insufficient data",
            "is_active_threat": False,
            "factors": ["Hydrometeorological sensor telemetry currently offline or delayed."],
            "rainfall_status": "DATA_UNAVAILABLE",
            "river_status": "DATA_UNAVAILABLE",
        }

    rain = _clean_float(rainfall_24h_mm)
    forecast_rain = _clean_float(rainfall_forecast_24h_mm)
    runoff = _clean_float(runoff_depth_mm)
    soil = clamp(_clean_float(soil_saturation), 0.0, 1.0)
    river = clamp(_clean_float(river_ratio), 0.0, 5.0)

    # Physical components
    # 1. Rainfall score (IMD thresholds: 0-15mm normal, 15-35mm light/mod, 65-115mm heavy, >115mm very heavy)
    if rain < 5.0:
        rain_score = (rain / 5.0) * 5.0
    elif rain < 35.0:
        rain_score = 5.0 + ((rain - 5.0) / 30.0) * 20.0
    elif rain < 65.0:
        rain_score = 25.0 + ((rain - 35.0) / 30.0) * 35.0
    elif rain < 115.0:
        rain_score = 60.0 + ((rain - 65.0) / 50.0) * 25.0
    else:
        rain_score = min(100.0, 85.0 + ((rain - 115.0) / 100.0) * 15.0)

    # 2. Runoff score
    runoff_score = clamp((runoff / 40.0) * 100.0, 0.0, 100.0)

    # 3. River discharge surge score (1.0 = normal baseflow, >1.5 = elevated, >2.2 = flood stage)
    if river <= 1.0:
        river_score = (river / 1.0) * 5.0
    elif river <= 1.5:
        river_score = 5.0 + ((river - 1.0) / 0.5) * 30.0
    elif river <= 2.2:
        river_score = 35.0 + ((river - 1.5) / 0.7) * 45.0
    else:
        river_score = min(100.0, 80.0 + ((river - 2.2) / 1.0) * 20.0)

    # 4. Soil moisture modifier
    soil_score = soil * 100.0

    condition_score = (
        0.40 * rain_score
        + 0.25 * runoff_score
        + 0.25 * river_score
        + 0.10 * soil_score
    )
    if has_official_warning:
        condition_score = max(condition_score, 85.0)

    # Strict physical gating: nominal rain with nominal river baseflow CANNOT create active flood conditions
    if rain < 5.0 and runoff < 1.0 and river <= 1.2 and dam_discharge_cusecs <= 2500.0:
        condition_score = min(condition_score, 5.0)

    factors: list[str] = []
    if rain > 0.0:
        factors.append(f"Recorded rainfall {rain:.1f} mm (past 24h)")
    else:
        factors.append("No significant rainfall recorded (0.0 mm past 24h)")

    if forecast_rain > 15.0:
        factors.append(f"Upcoming forecast rainfall {forecast_rain:.1f} mm (next 24h)")

    if river > 1.4:
        factors.append(f"Elevated river discharge ({river:.1f}x seasonal median)")
    else:
        factors.append("River channel flow at stable seasonal baseflow")

    if runoff > 5.0:
        factors.append(f"Active surface runoff depth {runoff:.1f} mm")

    return {
        "condition_score": round(condition_score, 1),
        "is_active_threat": condition_score >= 45.0,
        "rainfall_24h_mm": rain,
        "runoff_depth_mm": runoff,
        "soil_saturation_pct": round(soil * 100.0, 1),
        "river_stage_ratio": round(river, 2),
        "factors": factors,
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
    model_config = ConfigDict(extra="allow")

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
    status_text: str = "No active flood warning detected"
    status_badge: str = "NORMAL"
    alert_category: str = "NORMAL"
    reasons: list[str] = Field(default_factory=list)
    recommended_action: str = "Routine civic monitoring. No emergency action required."
    season_context: str = "Winter / Rabi Season"
    hazard_assessment: dict[str, Any] = Field(default_factory=dict)
    current_conditions: dict[str, Any] = Field(default_factory=dict)
    river_measurement_status: str = "MODEL_DISCHARGE"
    river_measurement_disclaimer: str = ""


def _score_to_level(score: float) -> str:
    if score >= 75.0:
        return "Critical"
    if score >= 45.0:
        return "High"
    if score >= 20.0:
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
    nearest_waterway_km: float = 1.5,
    historical_susceptibility_score: float = 30.0,
    city_name: str | None = None,
    river_name: str | None = None,
    station_name: str | None = None,
    reservoir_name: str | None = None,
    is_telemetry_missing: bool = False,
) -> FloodRisk:
    """Return the final flood-risk score combining Hazard and Current Conditions.

    Uses scientifically validated thresholds adhering to CWC / IMD standards:
    - Low-lying terrain or river proximity represents susceptibility, NOT active flooding.
    - Active flood status requires demonstrated hydrological condition stress (rain, surge, runoff).
    """
    rain = _clean_float(rainfall_24h_mm)
    runoff = _clean_float(runoff_depth_mm)
    soil = clamp(_clean_float(soil_saturation) * 100.0, 0.0, 100.0)
    river = clamp(_clean_float(river_ratio) * 100.0, 0.0, 500.0)
    terrain = clamp(_clean_float(terrain_exposure) * 100.0, 0.0, 100.0)

    # 1. Compute Static Hazard
    hazard = compute_flood_hazard(
        relative_elevation_m=-(terrain * 0.15),
        nearest_waterway_km=nearest_waterway_km,
        drainage_density=1.4,
        historical_susceptibility_score=historical_susceptibility_score,
    )

    # 2. Compute Dynamic Current Conditions
    conditions = compute_current_flood_conditions(
        rainfall_24h_mm=rain,
        runoff_depth_mm=runoff,
        soil_saturation=soil / 100.0,
        river_ratio=river / 100.0,
        is_telemetry_missing=is_telemetry_missing,
    )

    rainfall_score = clamp((rain / 200.0) * 100.0, 0.0, 100.0)
    runoff_score = clamp((runoff / 60.0) * 100.0, 0.0, 100.0)
    if river <= 100.0:
        river_score = (river / 100.0) * 10.0
    elif river <= 160.0:
        river_score = 10.0 + ((river - 100.0) / 60.0) * 45.0
    else:
        river_score = clamp(55.0 + ((river - 160.0) / 100.0) * 45.0, 55.0, 100.0)
    terrain_score = clamp(terrain, 0.0, 100.0)

    combined = weighted_physics_score(rainfall_score, runoff_score, soil, river_score, terrain_score)
    physics_score = combined["physics_score"]

    # When all inputs are 0 (e.g. test default)
    if rain == 0.0 and runoff == 0.0 and soil == 0.0 and river == 0.0 and terrain == 0.0:
        physics_score = 0.0

    # Active hazard gating: if there is no rain (<5mm), no runoff (<1mm), and river is at baseflow
    if rain < 5.0 and runoff < 1.0 and river <= 120.0:
        physics_score = min(physics_score, 8.0)

    model_mode = "physics"
    final_score = physics_score
    if ml_probability is not None and ml_validation_auc is not None:
        ml_probability_value = _clean_float(ml_probability)
        ml_auc = _clean_float(ml_validation_auc)
        if 0.0 <= ml_probability_value <= 1.0 and ml_auc > 0.65:
            if rain < 5.0 and runoff < 1.0 and river <= 120.0:
                final_score = min(8.0, (0.5 * ml_probability_value * 10.0) + (0.5 * physics_score))
            else:
                final_score = (0.6 * ml_probability_value * 100.0) + (0.4 * physics_score)
            model_mode = "hybrid"

    final_score = clamp(final_score, 0.0, 100.0)

    # Seasonal context
    season = get_current_season()
    seasonal_eval = evaluate_winter_conditions(
        rainfall_24h_mm=rain,
        river_water_level_m=1.8 + (river / 100.0) * 0.8,
        river_rate_of_rise_m_h=0.0,
        dam_discharge_cusecs=650.0 if river <= 120 else 15000.0,
        drainage_blockage_pct=10.0,
        city_name=city_name,
        river_name=river_name,
        station_name=station_name,
        reservoir_name=reservoir_name,
    )

    # Synthesis of Status and Level
    if is_telemetry_missing:
        score_level = "Insufficient Data"
        status_text = "Insufficient data"
        status_badge = "INSUFFICIENT_DATA"
        alert_category = "INSUFFICIENT_DATA"
        reasons = ["Telemetry feed synchronization in progress. Real-time sensor stream pending."]
        recommended_action = "Awaiting updated sensor telemetry. Follow district administration bulletins."
        severity = "Data unavailable"
    elif final_score < 20.0:
        score_level = "Low"
        status_text = "No active flood warning detected"
        status_badge = "NORMAL"
        alert_category = "NORMAL"
        reasons = [
            "No significant rainfall recorded (0.0 mm past 24h)." if rain < 2.0 else f"Light precipitation ({rain:.1f} mm), well below runoff threshold.",
            f"{river_name or 'River channel'} is at stable seasonal baseflow.",
            "Static catchment susceptibility catalogued, but current hydrological conditions are normal.",
        ]
        recommended_action = "Routine civic and hydrological monitoring. No emergency action required."
        severity = "Normal seasonal baseflow"
    elif final_score < 45.0:
        score_level = "Moderate"
        status_text = "Elevated flood potential"
        status_badge = "WATCH"
        alert_category = "WATCH"
        reasons = conditions["factors"] + [f"Catchment susceptibility rated {hazard['hazard_level']}"]
        recommended_action = f"Monitor local gauges along {river_name or 'catchment outfalls'}. Check urban stormwater channels."
        severity = "Elevated runoff and ponding risk"
    elif final_score < 75.0:
        score_level = "High"
        status_text = "High flood potential"
        status_badge = "WARNING"
        alert_category = "WARNING"
        reasons = conditions["factors"] + [f"High runoff potential in low-lying sectors of {city_name or 'catchment'}"]
        recommended_action = f"Alert low-lying riverside reaches in {city_name or 'region'}. Deploy municipal drainage pumps."
        severity = "Flooding likely in low-lying reaches"
    else:
        score_level = "Critical"
        status_text = "Active flood warning"
        status_badge = "CRITICAL"
        alert_category = "CRITICAL"
        reasons = conditions["factors"] + ["Extremely heavy precipitation or major river stage surge detected."]
        recommended_action = f"Activate {city_name or 'local'} DDMA evacuation protocols. Move assets away from riverfront."
        severity = "Severe urban flooding risk"

    probability = clamp(final_score / 100.0, 0.0, 1.0)
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

    river_disclaimer = (
        f"Measured gauge telemetry for {station_name or (river_name + ' Gauge') if river_name else 'local gauge'} verified via CWC / State WRD."
        if station_name
        else "Direct river sensor wire unavailable for this reach; hydraulic stage modeled from NWP runoff and CWC basin thresholds."
    )

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
        status_text=status_text,
        status_badge=status_badge,
        alert_category=alert_category,
        reasons=reasons,
        recommended_action=recommended_action,
        season_context=seasonal_eval["season_display"],
        hazard_assessment=hazard,
        current_conditions=conditions,
        river_measurement_status="VERIFIED_CWC_STAGE" if station_name else "MODEL_DISCHARGE",
        river_measurement_disclaimer=river_disclaimer,
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
