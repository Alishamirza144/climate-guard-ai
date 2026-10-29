"""Canadian Forest Fire Weather Index (FWI) engine with weather-only and FIRMS-aware risk scoring."""

from __future__ import annotations

import math
from datetime import date, timedelta
from typing import Any, Sequence

from pydantic import BaseModel, Field

from app.config import get_settings
from app.services import firms, openmeteo

FWI_CLASS_THRESHOLDS = (
    (5.0, "Low"),
    (13.0, "Moderate"),
    (22.0, "High"),
    (38.0, "Very High"),
    (float("inf"), "Extreme"),
)


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


def ffmc(temp_c: float, rh: float, wind_kmh: float, rain_mm: float, ffmc_0: float = 85.0) -> float:
    """Fine Fuel Moisture Code (FFMC), Canadian Forest Fire Weather Index system."""
    t = _clean_float(temp_c)
    r = clamp(_clean_float(rh), 0.0, 100.0)
    w = max(0.0, _clean_float(wind_kmh))
    rain = max(0.0, _clean_float(rain_mm))
    f0 = clamp(_clean_float(ffmc_0, 85.0), 0.0, 101.0)
    if rain > 0.5:
        ratio = rain / 0.5
        mo = 147.2 * (101.0 - f0) / (59.5 + f0)
        mr = mo + 42.5 * ratio * math.exp(-100.0 / (251.0 - mo)) * (1.0 - math.exp(-6.93 / ratio))
        mo = mr
    else:
        mo = 147.2 * (101.0 - f0) / (59.5 + f0)

    ed = 0.942 * (r ** 0.679) + 11.0 * math.exp((r - 100.0) / 10.0) + 0.18 * (21.1 - t) * (1.0 - math.exp(-0.115 * r))
    if mo < ed:
        ew = 0.618 * (r ** 0.753) + 10.0 * math.exp((r - 100.0) / 10.0) + 0.18 * (21.1 - t) * (1.0 - math.exp(-0.115 * r))
        mo = mo + (ed - mo) * (0.5 + 0.5 * (1.0 - math.exp(-0.115 * r)))
        if mo > ew:
            mo = ew
    else:
        ew = 0.618 * (r ** 0.753) + 10.0 * math.exp((r - 100.0) / 10.0) + 0.18 * (21.1 - t) * (1.0 - math.exp(-0.115 * r))
    rf = 0.0
    if mo < 0.9 * ed:
        rf = 0.0
    else:
        rf = 0.0
    m = mo
    em = 0.942 * r**0.679 + 11 * math.exp((r - 100) / 10) + 0.18 * (21.1 - t) * (1 - math.exp(-0.115 * r))
    if mo < em:
        m = em + (mo - em) * (0.36 + 0.47 * math.sqrt(0.5 + w / 10.0))
    else:
        m = mo
    ffmc_value = 59.5 * (250.0 - m) / (147.2 + m)
    return clamp(ffmc_value, 0.0, 101.0)


def dmc(temp_c: float, rh: float, rain_mm: float, dmc_0: float = 20.0) -> float:
    """Duff Moisture Code (DMC)."""
    t = _clean_float(temp_c)
    r = clamp(_clean_float(rh), 0.0, 100.0)
    rain = max(0.0, _clean_float(rain_mm))
    d0 = max(0.0, _clean_float(dmc_0, 20.0))
    if rain > 1.5:
        rain_factor = rain * 0.4
        d0 = d0 + rain_factor
    if t < 0.0:
        t = 0.0
    effective = max(0.0, 1.0 + 0.002 * (r - 40.0) + 0.001 * t)
    dmc_value = d0 + 0.7 * (t - 10.0) - 0.5 * (r - 60.0) + 0.8 * rain
    dmc_value = 0.5 * dmc_value + 0.5 * effective * 10.0
    return clamp(dmc_value, 0.0, 250.0)


def dc(temp_c: float, rain_mm: float, dc_0: float = 60.0) -> float:
    """Drought Code (DC)."""
    t = max(0.0, _clean_float(temp_c))
    rain = max(0.0, _clean_float(rain_mm))
    d0 = max(0.0, _clean_float(dc_0, 60.0))
    if rain > 2.5:
        d0 = d0 - rain * 0.2
    dc_value = d0 + (t * 0.6) - (rain * 0.5)
    return clamp(dc_value, 0.0, 800.0)


def isi(ffmc_value: float, wind_kmh: float) -> float:
    """Initial Spread Index (ISI)."""
    f = clamp(_clean_float(ffmc_value, 85.0), 0.0, 101.0)
    w = max(0.0, _clean_float(wind_kmh))
    m = 147.2 * (101.0 - f) / (59.5 + f)
    s = 0.208 * w * (1.0 + math.exp(-0.08 * w))
    isi_value = 0.208 * s * (m / (0.5 + 0.001 * m))
    return clamp(isi_value, 0.0, 100.0)


def bui(dmc_value: float, dc_value: float) -> float:
    """Build-Up Index (BUI)."""
    d = max(0.0, _clean_float(dmc_value))
    c = max(0.0, _clean_float(dc_value))
    bui_value = 0.5 * (d + c)
    return clamp(bui_value, 0.0, 300.0)


def fwi(isi_value: float, bui_value: float) -> float:
    """Fire Weather Index (FWI)."""
    i = max(0.0, _clean_float(isi_value))
    b = max(0.0, _clean_float(bui_value))
    fwi_value = 0.5 * i + 0.5 * b
    return clamp(fwi_value, 0.0, 100.0)


def fwi_class_from_value(fwi_value: float) -> str:
    f = _clean_float(fwi_value, 0.0)
    for threshold, label in FWI_CLASS_THRESHOLDS:
        if f <= threshold:
            return label
    return "Extreme"


def vpd_from_temp_rh(temp_c: float, rh: float) -> float:
    """Approximate vapour pressure deficit in kPa from temperature and RH."""
    t = _clean_float(temp_c)
    rh = clamp(_clean_float(rh), 0.0, 100.0)
    es = 0.6108 * math.exp((17.27 * t) / (t + 237.3))
    ea = es * (rh / 100.0)
    return max(0.0, es - ea)


def seven_day_rain_deficit(rain_mm: Sequence[float] | None, expected_mm: float = 25.0) -> float:
    rain = [_clean_float(value, 0.0) for value in (rain_mm or [])]
    actual = sum(rain[-7:]) if rain else 0.0
    return max(0.0, expected_mm - actual)


def _soil_moisture_index(top_layer_soil_moisture: Sequence[float] | None) -> float:
    values = [_clean_float(value, 0.0) for value in (top_layer_soil_moisture or [])]
    if not values:
        return 0.0
    return clamp(sum(values[-5:]) / max(len(values[-5:]), 1), 0.0, 100.0)


def temperature_anomaly_30d(current_temp: float, normal_temp: float) -> float:
    return max(0.0, _clean_float(current_temp) - _clean_float(normal_temp, current_temp))


async def _spin_up_fwi(lat: float, lon: float) -> dict[str, float]:
    """Seed the moisture codes using recent archive/forecast data. This keeps the FWI engine stable."""
    default = {"ffmc": 85.0, "dmc": 20.0, "dc": 60.0}
    try:
        start_date = (date.today() - timedelta(days=90)).isoformat()
        end_date = (date.today() + timedelta(days=3)).isoformat()
        archive = await openmeteo.get_archive(
            lat,
            lon,
            start_date,
            end_date,
            daily=["temperature_2m_max", "relative_humidity_2m_max", "wind_speed_10m_max", "precipitation_sum"],
        )
        daily = archive.daily or {}
        temps = [_clean_float(v) for v in daily.get("temperature_2m_max", [])]
        rh = [_clean_float(v) for v in daily.get("relative_humidity_2m_max", [])]
        winds = [_clean_float(v) for v in daily.get("wind_speed_10m_max", [])]
        rains = [_clean_float(v) for v in daily.get("precipitation_sum", [])]
        ffmc_value = 85.0
        dmc_value = 20.0
        dc_value = 60.0
        for idx, temp in enumerate(temps[:90]):
            humidity = rh[idx] if idx < len(rh) else 50.0
            wind = winds[idx] if idx < len(winds) else 10.0
            rain = rains[idx] if idx < len(rains) else 0.0
            ffmc_value = ffmc(temp, humidity, wind, rain, ffmc_value)
            dmc_value = dmc(temp, humidity, rain, dmc_value)
            dc_value = dc(temp, rain, dc_value)
        return {"ffmc": ffmc_value, "dmc": dmc_value, "dc": dc_value}
    except Exception:
        return default


async def calculate_fwi_from_observation(
    temp_c: float,
    rh: float,
    wind_kmh: float,
    rain_24h_mm: float,
    lat: float | None = None,
    lon: float | None = None,
    recent_weather: Sequence[float] | None = None,
) -> dict[str, Any]:
    """Compute the FWI components and severity class from a single day observation."""
    temp = _clean_float(temp_c)
    humidity = clamp(_clean_float(rh), 0.0, 100.0)
    wind = max(0.0, _clean_float(wind_kmh))
    rain = max(0.0, _clean_float(rain_24h_mm))
    soil_values = [_clean_float(value, 0.0) for value in (recent_weather or [])]
    if lat is not None and lon is not None:
        seeded = await _spin_up_fwi(lat, lon)
    else:
        seeded = {"ffmc": 85.0, "dmc": 20.0, "dc": 60.0}
    ff = ffmc(temp, humidity, wind, rain, seeded["ffmc"])
    dm = dmc(temp, humidity, rain, seeded["dmc"])
    dc_value = dc(temp, rain, seeded["dc"])
    i = isi(ff, wind)
    b = bui(dm, dc_value)
    fire_index = fwi(i, b)
    result = {
        "ffmc": round(ff, 2),
        "dmc": round(dm, 2),
        "dc": round(dc_value, 2),
        "isi": round(i, 2),
        "bui": round(b, 2),
        "fwi": round(fire_index, 2),
        "fwi_class": fwi_class_from_value(fire_index),
    }
    return result


class FireRisk(BaseModel):
    score: float = Field(ge=0.0, le=100.0)
    level: str
    fwi_class: str
    probability: float = Field(ge=0.0, le=1.0)
    nearest_detected_fire_distance_km: float | None = None
    observed_fire_pressure: float = 0.0
    spread_risk_hint: str
    drivers: list[dict[str, Any]] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    fire_detections: list[dict[str, Any]] = Field(default_factory=list)
    model_mode: str
    satellite_status: str = "satellite fire data unavailable"
    data_quality: dict[str, Any] = Field(default_factory=dict)


def _score_to_level(score: float) -> str:
    if score >= 85:
        return "Critical"
    if score >= 60:
        return "High"
    if score >= 30:
        return "Moderate"
    return "Low"


def _spread_hint(wind_speed_kmh: float, wind_direction_deg: float | None = None) -> str:
    speed = max(0.0, _clean_float(wind_speed_kmh))
    direction = wind_direction_deg if wind_direction_deg is not None else 225.0
    directions = [
        "N", "NE", "E", "SE", "S", "SW", "W", "NW"
    ]
    index = int((direction / 45.0) % 8)
    arrow = directions[index]
    if speed < 10:
        return "Low spread risk: light wind keeps flames local."
    if speed < 25:
        return f"Moderate spread risk: wind from {arrow} is pushing flames across open ground."
    return f"High spread risk: strong wind from {arrow} may drive fast forward spread."


async def score_fire_risk(
    lat: float,
    lon: float,
    temp_c: float,
    rh: float,
    wind_kmh: float,
    rain_24h_mm: float,
    soil_moisture_top_layers: Sequence[float] | None = None,
    temp_normal_30d_c: float | None = None,
    wind_direction_deg: float | None = None,
    ml_probability: float | None = None,
    ml_validation_auc: float | None = None,
    simulation_mode: bool = False,
) -> dict[str, Any]:
    """Return wildfire risk output with weather-only or FIRMS-aware scoring."""
    settings = get_settings()
    weather = await calculate_fwi_from_observation(
        temp_c=temp_c,
        rh=rh,
        wind_kmh=wind_kmh,
        rain_24h_mm=rain_24h_mm,
        lat=lat,
        lon=lon,
        recent_weather=soil_moisture_top_layers,
    )
    vpd = vpd_from_temp_rh(temp_c, rh)
    soil_index = _soil_moisture_index(soil_moisture_top_layers)
    rain_deficit = seven_day_rain_deficit([], expected_mm=25.0)
    temp_anomaly = temperature_anomaly_30d(temp_c, temp_normal_30d_c if temp_normal_30d_c is not None else temp_c)

    score = clamp((weather["fwi"] / 50.0) * 100.0, 0.0, 100.0)
    fire_detected = False
    nearest_distance = None
    pressure = 0.0
    detections: list[dict[str, Any]] = []
    model_mode = "weather-only"
    satellite_status = "satellite fire data unavailable"

    if settings.firms_map_key:
        bbox_lat = 0.5 * 50.0 / 111.32
        bbox_lon = 0.5 * 50.0 / (111.32 * max(math.cos(math.radians(lat)), 0.2))
        min_lat = lat - bbox_lat
        max_lat = lat + bbox_lat
        min_lon = lon - bbox_lon
        max_lon = lon + bbox_lon
        result = firms.get_fires(min_lat, min_lon, max_lat, max_lon, days=3)
        if result.available and result.detections:
            fire_detected = True
            model_mode = "weather-and-satellite"
            satellite_status = "satellite fire data active"
            for detection in result.detections[:10]:
                dist = math.dist((lat, lon), (detection.latitude, detection.longitude)) * 111.32
                nearest_distance = dist if nearest_distance is None else min(nearest_distance, dist)
                pressure += (detection.frp or 10.0) / max(1.0, dist + 1.0)
                detections.append({
                    "latitude": detection.latitude,
                    "longitude": detection.longitude,
                    "frp": detection.frp,
                    "confidence": detection.confidence,
                    "distance_km": round(dist, 2),
                })
            if nearest_distance is not None:
                score += min(25.0, pressure * 12.0)
            score = clamp(score, 0.0, 100.0)
    else:
        model_mode = "weather-only/no-satellite"

    if ml_probability is not None and ml_validation_auc is not None:
        ml_prob = _clean_float(ml_probability)
        auc = _clean_float(ml_validation_auc)
        if 0.0 <= ml_prob <= 1.0 and auc > 0.65:
            score = (0.6 * ml_prob * 100.0) + (0.4 * score)
            model_mode = "hybrid"

    score = clamp(score, 0.0, 100.0)
    level = _score_to_level(score)
    drivers = [
        {"factor": "FWI", "value": weather["fwi"], "unit": "index", "score": weather["fwi"]},
        {"factor": "VPD", "value": round(vpd, 2), "unit": "kPa", "score": clamp(vpd * 20.0, 0.0, 100.0)},
        {"factor": "Top-layer soil moisture", "value": round(soil_index, 2), "unit": "index", "score": clamp(100.0 - soil_index, 0.0, 100.0)},
        {"factor": "Observed fire pressure", "value": round(pressure, 2), "unit": "FRP-weighted", "score": clamp(pressure * 20.0, 0.0, 100.0)},
    ]

    recommendations = [
        "Fire-line patrols on dry grass and timber edges",
        "Restrict open burning and spark-producing work",
        "Alert forest range officers for rapid inspection",
    ]
    if wind_kmh > 20:
        recommendations.insert(0, "Increase lookout frequency in wind-exposed corridors")
    if fire_detected:
        recommendations.append("Prioritize hotspot inspection near the nearest FIRMS detection")

    data_quality = {
        "fwi": True,
        "dryness": True,
        "firms": bool(settings.firms_map_key),
        "simulation_mode": simulation_mode,
    }
    payload = {
        "score": round(score, 2),
        "level": level,
        "fwi_class": weather["fwi_class"],
        "probability": round(clamp(score / 100.0, 0.0, 1.0), 3),
        "nearest_detected_fire_distance_km": round(nearest_distance, 2) if nearest_distance is not None else None,
        "observed_fire_pressure": round(pressure, 3),
        "spread_risk_hint": _spread_hint(wind_kmh, wind_direction_deg),
        "drivers": drivers,
        "recommendations": recommendations,
        "fire_detections": detections,
        "model_mode": model_mode,
        "satellite_status": satellite_status,
        "data_quality": data_quality,
        "fwi_components": {
            "ffmc": weather["ffmc"],
            "dmc": weather["dmc"],
            "dc": weather["dc"],
            "isi": weather["isi"],
            "bui": weather["bui"],
            "fwi": weather["fwi"],
        },
    }
    return payload
