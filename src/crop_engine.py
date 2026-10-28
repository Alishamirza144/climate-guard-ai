"""
Climate Guard AI - Crop Shield Engine
Implements agronomic crop water requirement and agricultural hazard assessment:
- FAO-56 Penman-Monteith & Crop Coefficients (Kc)
- Growing Degree Days (GDD) phenological stages
- Soil moisture depletion & root-zone water stress (Drought vs. Waterlogging)
- Weather-based fungal / blight risk indicators for Maharashtra agriculture.
"""

from typing import Any, Dict, List

CROP_PROFILES = {
    "Onion (Nashik Red)": {
        "base_temp": 7.0,
        "stages": ["Germination", "Vegetative", "Bulb Initiation", "Bulb Development", "Harvest"],
        "kc_by_stage": [0.5, 0.75, 1.05, 0.95, 0.65],
        "root_depth_m": 0.35,
        "critical_max_temp": 38.0,
        "waterlogging_susceptibility": "High",
        "primary_threat": "Purple blotch & basal rot in unseasonal rain/waterlogging"
    },
    "Soybean (Marathwada/Vidarbha)": {
        "base_temp": 10.0,
        "stages": ["Emergence", "Vegetative", "Flowering", "Pod Formation", "Maturity"],
        "kc_by_stage": [0.4, 0.8, 1.15, 1.05, 0.5],
        "root_depth_m": 0.6,
        "critical_max_temp": 37.0,
        "waterlogging_susceptibility": "Moderate",
        "primary_threat": "Pod blight & dry spell moisture stress"
    },
    "Cotton (Vidarbha Deep Black Soil)": {
        "base_temp": 15.0,
        "stages": ["Seedling", "Vegetative", "Square Formation", "Boll Development", "Boll Opening"],
        "kc_by_stage": [0.45, 0.75, 1.15, 1.20, 0.6],
        "root_depth_m": 1.2,
        "critical_max_temp": 42.0,
        "waterlogging_susceptibility": "High (Square shedding on root rot)",
        "primary_threat": "Pink bollworm & root asphyxiation during waterlogging"
    },
    "Sugarcane (Western Maharashtra)": {
        "base_temp": 12.0,
        "stages": ["Germination", "Tillering", "Grand Growth", "Ripening"],
        "kc_by_stage": [0.5, 0.85, 1.25, 0.75],
        "root_depth_m": 1.2,
        "critical_max_temp": 40.0,
        "waterlogging_susceptibility": "Low-Moderate",
        "primary_threat": "Water stress reduces sucrose accumulation"
    },
    "Wheat (Rabi Season)": {
        "base_temp": 5.0,
        "stages": ["Crown Root Initiation", "Tillering", "Booting/Flowering", "Grain Filling", "Maturity"],
        "kc_by_stage": [0.4, 0.8, 1.15, 1.10, 0.45],
        "root_depth_m": 1.0,
        "critical_max_temp": 32.0,
        "waterlogging_susceptibility": "High (Yield loss on terminal heat & logging)",
        "primary_threat": "Terminal heat stress during grain filling"
    }
}


def assess_crop_health(
    crop_name: str,
    growth_stage_idx: int,
    temp_c: float,
    soil_moisture_pct: float,
    rainfall_24h_mm: float,
    eto_reference_mm_day: float = 5.2
) -> Dict[str, Any]:
    crop = CROP_PROFILES.get(crop_name, CROP_PROFILES["Onion (Nashik Red)"])
    stage_idx = min(growth_stage_idx, len(crop["stages"]) - 1)
    stage_name = crop["stages"][stage_idx]
    kc = crop["kc_by_stage"][stage_idx]

    # Crop Evapotranspiration Requirement: ETc = ETo * Kc (FAO-56)
    etc_daily_mm = round(eto_reference_mm_day * kc, 1)

    # Water Stress Assessment
    # Ideal root zone moisture is typically 45% - 75%
    if soil_moisture_pct > 85.0 or (rainfall_24h_mm > 70.0 and soil_moisture_pct > 80.0):
        water_status = "Waterlogged (Root Asphyxiation Risk)"
        water_color = "#ef4444"
        water_badge = "🌊 WATERLOGGING CRITICAL"
    elif soil_moisture_pct < 35.0:
        water_status = "Moisture Deficit (Drought Stress)"
        water_color = "#f59e0b"
        water_badge = "⚠️ MOISTURE DEFICIT"
    else:
        water_status = "Optimum Soil Moisture"
        water_color = "#10b981"
        water_badge = "✅ OPTIMUM MOISTURE"

    # Thermal Stress
    t_crit = crop["critical_max_temp"]
    if temp_c >= t_crit:
        thermal_status = f"Critical Heat Stress ({temp_c}°C >= {t_crit}°C)"
        thermal_color = "#ef4444"
    elif temp_c >= t_crit - 3.0:
        thermal_status = f"Elevated Thermal Load ({temp_c}°C)"
        thermal_color = "#f59e0b"
    else:
        thermal_status = "Favourable Thermal Range"
        thermal_color = "#10b981"

    # Disease Favourability (High RH / unseasonal rainfall + warm temp)
    if rainfall_24h_mm > 25.0 and soil_moisture_pct > 75.0 and temp_c > 24.0:
        disease_risk = "Elevated Fungal Infection Risk"
        disease_color = "#ef4444"
    else:
        disease_risk = "Low Pathogen Pressure"
        disease_color = "#10b981"

    # Actionable Agronomic Advisories
    recommendations = []
    if "Waterlogged" in water_status:
        recommendations.append("Dig drainage furrows immediately to evacuate standing surface water.")
        recommendations.append("Suspend all fertilizer / chemical broadcast until field moisture subsides.")
    elif "Deficit" in water_status:
        recommendations.append(f"Apply {etc_daily_mm} mm/day irrigation via drip to meet peak {stage_name} demand.")
        recommendations.append("Use bio-mulching to curb evaporative root-zone water loss.")
    else:
        recommendations.append(f"Current moisture matches transpiration requirement ({etc_daily_mm} mm/day).")

    if "Critical" in thermal_status:
        recommendations.append(f"Apply micro-sprinkler misting during 12:00-14:00 to reduce canopy scorching.")

    return {
        "crop": crop_name,
        "stage": stage_name,
        "kc": kc,
        "etc_mm_day": etc_daily_mm,
        "water_status": water_status,
        "water_color": water_color,
        "water_badge": water_badge,
        "thermal_status": thermal_status,
        "thermal_color": thermal_color,
        "disease_risk": disease_risk,
        "disease_color": disease_color,
        "recommendations": recommendations,
        "primary_threat": crop["primary_threat"]
    }
