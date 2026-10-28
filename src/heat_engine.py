"""
Climate Guard AI - Heat Guard Engine
Implements hydrometeorological heat-stress assessment:
- NWS Heat Index (Rothfusz regression with Steadman fallback)
- Stull Wet-Bulb Temperature approximation
- IMD Heatwave and Severe Heatwave criteria for Maharashtra
- NDMA Heat Action Plan advisories
"""

import math
from typing import Any, Dict, List, Optional

MAHARASHTRA_HEAT_CITIES = {
    "Nagpur (Vidarbha)": {
        "lat": 21.1458, "lon": 79.0882, "tmax_normal": 42.5, "elevation": 310,
        "region": "Vidarbha", "risk_profile": "High historical heatwave vulnerability"
    },
    "Chandrapur (Vidarbha)": {
        "lat": 19.9615, "lon": 79.2961, "tmax_normal": 43.0, "elevation": 189,
        "region": "Vidarbha", "risk_profile": "Extreme industrial & thermal basin"
    },
    "Jalgaon (Khandesh)": {
        "lat": 21.0077, "lon": 75.5626, "tmax_normal": 41.5, "elevation": 209,
        "region": "Khandesh", "risk_profile": "Arid agricultural basin"
    },
    "Nashik (North Maharashtra)": {
        "lat": 19.9975, "lon": 73.7898, "tmax_normal": 38.0, "elevation": 560,
        "region": "North Maharashtra", "risk_profile": "Plateau terrain with moderate nocturnal cooling"
    },
    "Pune (Western Maharashtra)": {
        "lat": 18.5204, "lon": 73.8567, "tmax_normal": 37.5, "elevation": 560,
        "region": "Western Maharashtra", "risk_profile": "Urban heat island with high density"
    },
    "Mumbai (Konkan Coast)": {
        "lat": 19.0760, "lon": 72.8777, "tmax_normal": 34.0, "elevation": 14,
        "region": "Konkan", "risk_profile": "High humidity coastal heat stress"
    },
    "Solapur (Southern Maharashtra)": {
        "lat": 17.6599, "lon": 75.9064, "tmax_normal": 41.0, "elevation": 458,
        "region": "Southern Maharashtra", "risk_profile": "Semi-arid drought-prone zone"
    }
}


def clamp(val: float, lower: float = 0.0, upper: float = 100.0) -> float:
    return max(lower, min(upper, val))


def compute_heat_index_c(temp_c: float, rh_pct: float) -> float:
    """NWS Heat Index Rothfusz regression in Celsius."""
    t = float(temp_c)
    r = float(rh_pct)
    if t < 26.0 or r <= 0.0:
        return round(t, 1)

    # Convert to Fahrenheit for standard NWS equation
    tf = (t * 9.0 / 5.0) + 32.0

    # Steadman simple formula
    simple_f = 0.5 * (tf + 61.0 + ((tf - 68.0) * 1.2) + (r * 0.094))
    if simple_f < 80.0:
        return round((simple_f - 32.0) * 5.0 / 9.0, 1)

    # Standard Rothfusz regression
    hi_f = (
        -42.379
        + 2.04901523 * tf
        + 10.14333127 * r
        - 0.22475541 * tf * r
        - 0.00683783 * tf * tf
        - 0.05481717 * r * r
        + 0.00122874 * tf * tf * r
        + 0.00085282 * tf * r * r
        - 0.00000199 * tf * tf * r * r
    )

    # Adjustments
    if r < 13.0 and 80.0 <= tf <= 112.0:
        hi_f -= ((13.0 - r) / 4.0) * math.sqrt(max(0.0, (17.0 - abs(tf - 95.0)) / 17.0))
    elif r > 85.0 and 80.0 <= tf <= 87.0:
        hi_f += ((r - 85.0) / 10.0) * ((87.0 - tf) / 5.0)

    hi_c = (hi_f - 32.0) * 5.0 / 9.0
    return max(t, round(hi_c, 1))


def compute_wet_bulb_c(temp_c: float, rh_pct: float) -> float:
    """Stull's equation for wet-bulb temperature."""
    t = float(temp_c)
    rh = float(rh_pct)
    wb = (
        t * math.atan(0.151977 * math.sqrt(rh + 8.313659))
        + math.atan(t + rh)
        - math.atan(rh - 1.676331)
        + 0.00391838 * (rh ** 1.5) * math.atan(0.023101 * rh)
        - 4.686035
    )
    return round(wb, 1)


def evaluate_heat_risk(
    city_name: str,
    temp_c: float,
    rh_pct: float,
    wind_kph: float = 12.0,
    consecutive_days: int = 1
) -> Dict[str, Any]:
    city_info = MAHARASHTRA_HEAT_CITIES.get(city_name, {
        "tmax_normal": 39.0, "elevation": 300, "region": "Maharashtra"
    })
    t_normal = city_info["tmax_normal"]
    departure = temp_c - t_normal

    heat_index = compute_heat_index_c(temp_c, rh_pct)
    wet_bulb = compute_wet_bulb_c(temp_c, rh_pct)

    # IMD criteria
    is_severe_heatwave = (departure >= 6.5) or (temp_c >= 47.0)
    is_heatwave = (temp_c >= 40.0 and departure >= 4.5) or (temp_c >= 45.0) or is_severe_heatwave

    # Risk Score (0-100)
    score = 0.0
    score += clamp((temp_c / 48.0) * 40.0, 0, 40)
    score += clamp((heat_index / 55.0) * 35.0, 0, 35)
    score += clamp((consecutive_days / 5.0) * 15.0, 0, 15)
    score += clamp((1.0 - min(wind_kph / 25.0, 1.0)) * 10.0, 0, 10)
    score = min(100.0, round(score, 1))

    if score >= 85 or is_severe_heatwave:
        tier = "Critical / Severe Heatwave"
        color = "#ef4444"
        badge = "SEVERE HEATWAVE RED ALERT"
    elif score >= 60 or is_heatwave:
        tier = "High / Heatwave Warning"
        color = "#f59e0b"
        badge = "HEATWAVE ORANGE ALERT"
    elif score >= 35:
        tier = "Moderate / Heat Caution"
        color = "#38bdf8"
        badge = "CAUTION YELLOW ALERT"
    else:
        tier = "Normal / Safe Thermal Range"
        color = "#10b981"
        badge = "NORMAL GREEN SAFE"

    precautions = []
    if "Severe" in tier or "High" in tier:
        precautions.append("Suspend outdoor physical labor between 11:30 AM and 4:30 PM.")
        precautions.append("Mandate shaded rest areas and Oral Rehydration Salt (ORS) stations.")
        precautions.append("High risk of heat exhaustion and heatstroke for elderly and children.")
    elif "Caution" in tier:
        precautions.append("Maintain continuous hydration; avoid direct prolonged sun exposure.")
        precautions.append("Ensure adequate ventilation for livestock and indoor work spaces.")
    else:
        precautions.append("Routine hydration and standard sun protection.")

    return {
        "city": city_name,
        "temperature_c": temp_c,
        "relative_humidity_pct": rh_pct,
        "wind_kph": wind_kph,
        "heat_index_c": heat_index,
        "wet_bulb_c": wet_bulb,
        "departure_c": round(departure, 1),
        "tmax_normal_c": t_normal,
        "is_heatwave": is_heatwave,
        "is_severe_heatwave": is_severe_heatwave,
        "risk_score": score,
        "risk_tier": tier,
        "risk_color": color,
        "risk_badge": badge,
        "precautions": precautions,
        "consecutive_days": consecutive_days
    }
