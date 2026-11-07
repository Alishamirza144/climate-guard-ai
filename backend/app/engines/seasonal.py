"""Seasonal and winter-aware risk intelligence engine for ClimateGuard AI.

Focuses on Maharashtra (Nashik/Godavari basin) meteorological seasonality:
- Winter (November – February): Cool, dry, low rainfall baseline, stable river levels.
- Summer (March – May): High ambient heat, convective storms, elevated fire index.
- Monsoon (June – September): Heavy orographic precipitation, high reservoir inflow, flood risks.
- Post-Monsoon (October): Cyclonic transition, receding waters.

Implements:
- Seasonal baseline computation
- Rate-of-change detection
- Hysteresis thresholding to prevent alert flapping
- Transparent, explainable causal reasoning for every risk level
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

SeasonName = Literal["winter", "summer", "monsoon", "post_monsoon"]

SEASON_CONFIG: dict[SeasonName, dict[str, Any]] = {
    "winter": {
        "name": "Winter / Rabi Season",
        "months": [11, 12, 1, 2],
        "normal_rainfall_24h_max_mm": 5.0,
        "normal_tmax_c": 30.0,
        "normal_tmin_c": 12.0,
        "normal_river_level_m": 2.2,
        "flood_alert_threshold_rain_24h": 35.0,
        "heat_alert_threshold_tmax": 35.0,
        "fire_alert_threshold_fwi": 15.0,
        "baseline_summary": "Low baseline precipitation, mild daytime temperatures, stable river baseflow.",
    },
    "summer": {
        "name": "Summer / Pre-Monsoon",
        "months": [3, 4, 5],
        "normal_rainfall_24h_max_mm": 10.0,
        "normal_tmax_c": 41.0,
        "normal_tmin_c": 22.0,
        "normal_river_level_m": 1.5,
        "flood_alert_threshold_rain_24h": 40.0,
        "heat_alert_threshold_tmax": 40.0,
        "fire_alert_threshold_fwi": 22.0,
        "baseline_summary": "High thermal stress, dry soil conditions, elevated vegetation dryness.",
    },
    "monsoon": {
        "name": "Southwest Monsoon / Kharif",
        "months": [6, 7, 8, 9],
        "normal_rainfall_24h_max_mm": 65.0,
        "normal_tmax_c": 30.0,
        "normal_tmin_c": 21.0,
        "normal_river_level_m": 5.0,
        "flood_alert_threshold_rain_24h": 65.0,
        "heat_alert_threshold_tmax": 36.0,
        "fire_alert_threshold_fwi": 8.0,
        "baseline_summary": "Frequent precipitation, saturated soil horizons, elevated river discharge.",
    },
    "post_monsoon": {
        "name": "Post-Monsoon Transition",
        "months": [10],
        "normal_rainfall_24h_max_mm": 20.0,
        "normal_tmax_c": 33.0,
        "normal_tmin_c": 18.0,
        "normal_river_level_m": 3.0,
        "flood_alert_threshold_rain_24h": 50.0,
        "heat_alert_threshold_tmax": 37.0,
        "fire_alert_threshold_fwi": 12.0,
        "baseline_summary": "Receding monsoon waters, gradual temperature moderation.",
    },
}


def get_current_season(dt: datetime | None = None) -> SeasonName:
    """Determine the meteorological season for Maharashtra based on date."""
    target_dt = dt or datetime.now(timezone.utc)
    month = target_dt.month
    if month in (11, 12, 1, 2):
        return "winter"
    if month in (3, 4, 5):
        return "summer"
    if month in (6, 7, 8, 9):
        return "monsoon"
    return "post_monsoon"


def apply_hysteresis(
    current_score: float,
    previous_level: str | None = None,
    threshold_moderate: float = 30.0,
    threshold_high: float = 60.0,
    threshold_critical: float = 85.0,
    deadband: float = 4.0,
) -> tuple[str, float]:
    """Apply hysteresis band to prevent rapid bouncing between risk levels."""
    score = max(0.0, min(100.0, float(current_score)))

    # Without a previous level, assign direct threshold
    if not previous_level:
        if score >= threshold_critical:
            return "Critical", score
        if score >= threshold_high:
            return "High", score
        if score >= threshold_moderate:
            return "Moderate", score
        return "Low", score

    prev = previous_level.title()

    if prev == "Critical":
        if score < threshold_critical - deadband:
            level = "High" if score >= threshold_high else ("Moderate" if score >= threshold_moderate else "Low")
        else:
            level = "Critical"
    elif prev == "High":
        if score >= threshold_critical:
            level = "Critical"
        elif score < threshold_high - deadband:
            level = "Moderate" if score >= threshold_moderate else "Low"
        else:
            level = "High"
    elif prev == "Moderate":
        if score >= threshold_high:
            level = "High"
        elif score < threshold_moderate - deadband:
            level = "Low"
        else:
            level = "Moderate"
    else:  # prev == "Low"
        if score >= threshold_moderate:
            level = "Moderate"
        else:
            level = "Low"

    return level, score


def evaluate_winter_conditions(
    rainfall_24h_mm: float,
    river_water_level_m: float,
    river_rate_of_rise_m_h: float = 0.0,
    dam_discharge_cusecs: float = 0.0,
    drainage_blockage_pct: float = 0.0,
    tmax_c: float = 26.0,
    soil_saturation: float = 0.25,
    city_name: str | None = None,
    river_name: str | None = None,
    station_name: str | None = None,
    reservoir_name: str | None = None,
) -> dict[str, Any]:
    """Specialized seasonal evaluation for Maharashtra winter.
    
    If parameters remain within normal winter ranges, explicitly confirms
    'NO RISK – CONDITIONS NORMAL' with detailed causal explainability.
    """
    season = get_current_season()
    config = SEASON_CONFIG[season]

    reasons: list[str] = []
    anomalies: list[str] = []

    # 1. Rainfall evaluation
    if rainfall_24h_mm <= config["normal_rainfall_24h_max_mm"]:
        reasons.append("No significant rainfall recorded (0.0 mm past 24h).")
    elif rainfall_24h_mm < config["flood_alert_threshold_rain_24h"]:
        reasons.append(f"Light unseasonal shower ({rainfall_24h_mm:.1f} mm), well below flood runoff threshold.")
    else:
        anomalies.append(f"Unusually heavy unseasonal precipitation ({rainfall_24h_mm:.1f} mm past 24h).")

    # 2. River level & rate of change
    if river_water_level_m <= config["normal_river_level_m"]:
        gauge_label = station_name if station_name else ("Ramkund" if not city_name or city_name.lower() == "nashik" else f"{city_name} Reach")
        reasons.append(f"River gauge at {gauge_label} is steady at {river_water_level_m:.1f} m (normal winter baseline).")
    elif river_water_level_m < 4.0:
        reasons.append(f"River water level at {river_water_level_m:.1f} m remains safely below warning mark (5.0 m).")
    else:
        anomalies.append(f"River water level elevated at {river_water_level_m:.1f} m (approaching warning threshold).")

    if river_rate_of_rise_m_h > 0.35:
        anomalies.append(f"Rapid river stage surge detected (+{river_rate_of_rise_m_h:.2f} m/h).")
    else:
        reasons.append("River water level remains stable with no abnormal rate of rise.")

    # 3. Upstream Dam / Reservoir flow
    if dam_discharge_cusecs <= 1500.0:
        dam_label = f"{reservoir_name} spillway release" if reservoir_name else ("Gangapur Dam spillway release" if not city_name or city_name.lower() == "nashik" else f"{city_name} Regional Dam spillway release")
        reasons.append(f"{dam_label} is at normal baseflow (<1,500 cusecs).")
    elif dam_discharge_cusecs < 10000.0:
        reasons.append(f"Regulated canal release ({dam_discharge_cusecs:,.0f} cusecs) safely absorbed by channel.")
    else:
        anomalies.append(f"Substantial dam spillway discharge active ({dam_discharge_cusecs:,.0f} cusecs).")

    # 4. Drainage Network
    if drainage_blockage_pct < 20.0:
        reasons.append("Municipal stormwater conduit capacity is clear (blockage < 20%).")
    else:
        anomalies.append(f"Stormwater drainage conduit blockage detected ({drainage_blockage_pct:.0f}%).")

    # Determine overall status
    is_normal = len(anomalies) == 0

    if is_normal:
        status_text = "NO RISK – CONDITIONS NORMAL"
        status_badge = "NORMAL"
        alert_category = "NORMAL"
        recommended_action = "Routine civic and hydrological monitoring. No emergency action required."
    elif len(anomalies) == 1 and rainfall_24h_mm < 40.0:
        status_text = "ELEVATED VIGILANCE"
        status_badge = "WATCH"
        alert_category = "WATCH"
        recommended_action = "Monitor local gauges and check drainage outfalls. Follow official bulletins."
    elif len(anomalies) <= 2:
        status_text = "FLOOD WARNING"
        status_badge = "WARNING"
        alert_category = "WARNING"
        recommended_action = "Alert low-lying Panchavati ghats. Move assets away from riverfront."
    else:
        status_text = "CRITICAL FLOOD ALERT"
        status_badge = "CRITICAL"
        alert_category = "CRITICAL"
        recommended_action = "Activate NMC/DDMA evacuation protocols immediately. High inundation hazard."

    return {
        "season": season,
        "season_display": config["name"],
        "is_normal": is_normal,
        "status_text": status_text,
        "status_badge": status_badge,
        "alert_category": alert_category,
        "reasons": reasons,
        "anomalies": anomalies,
        "recommended_action": recommended_action,
        "baseline_summary": config["baseline_summary"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
