"""Overview summary across flood, heat, fire, and crop risks with city awareness and NO-RISK / INSUFFICIENT DATA logic."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any

from app.data.cities import find_nearest_city
from app.engines.actions import build_action_plan

DISCLAIMER = "Decision-support only. Follow official IMD/CWC/NDMA advisories."


def _level_order(level: str | None) -> int:
    order = {"Insufficient Data": -1, "Low": 0, "Moderate": 1, "High": 2, "Very High": 3, "Severe": 3, "Critical": 4, "Extreme": 4}
    return order.get(str(level or "Low").title(), 0)


def _badge(level: str | None) -> str:
    value = str(level or "Low").title()
    if value in {"Low", "Moderate", "High", "Very High", "Severe", "Critical", "Extreme", "Insufficient Data"}:
        return value
    return "Low"


def _hazard_title(hazard: str) -> str:
    title_map = {"flood": "Flood", "heat": "Heat", "fire": "Wildfire", "crop": "Crop"}
    return title_map.get(str(hazard).lower(), str(hazard).title())


async def _safe_hazard_result(hazard_name: str, payload: dict[str, Any] | None) -> dict[str, Any]:
    if payload is None:
        return {
            "risk_percent": 0,
            "level": "Insufficient Data",
            "badge": "Insufficient Data",
            "probability": 0.0,
            "drivers": [],
            "detail": "Telemetry unavailable from upstream sensor network.",
            "data_quality": "insufficient_data",
        }
    if payload.get("data_quality") == "insufficient_data":
        return {
            "risk_percent": 0,
            "level": "Insufficient Data",
            "badge": "Insufficient Data",
            "probability": 0.0,
            "drivers": ["Telemetry feed unavailable"],
            "detail": "Critical environmental data missing. Displaying Insufficient Data.",
            "data_quality": "insufficient_data",
        }
    score = float(payload.get("score", payload.get("risk", 0.0) or 0.0))
    raw_level = str(payload.get("level", "Low") or "Low").title()
    # Align to 5 risk bands: 0-19 Low, 20-39 Moderate, 40-59 High, 60-79 Very High, 80-100 Extreme
    if raw_level not in {"Low", "Moderate", "High", "Very High", "Critical", "Extreme"}:
        if score < 20:
            level = "Low"
        elif score < 40:
            level = "Moderate"
        elif score < 60:
            level = "High"
        elif score < 80:
            level = "Very High"
        else:
            level = "Extreme"
    else:
        level = raw_level

    probability = float(payload.get("probability", score / 100.0 if score else 0.0))
    drivers = payload.get("drivers", []) or []
    return {
        "risk_percent": int(round(score)),
        "level": level,
        "badge": _badge(level),
        "probability": round(probability, 3),
        "drivers": drivers,
        "detail": (
            payload.get("expected_severity")
            or payload.get("headline")
            or payload.get("detail")
            or f"{_hazard_title(hazard_name)} risk status is stable."
        ),
        "data_quality": payload.get("data_quality", "live"),
    }


async def build_overview_snapshot(
    lat: float,
    lon: float,
    flood: dict[str, Any] | None = None,
    heat: dict[str, Any] | None = None,
    fire: dict[str, Any] | None = None,
    crop: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build a compact overview payload for the front-end dashboard and risk cards."""
    city = find_nearest_city(lat, lon)
    city_name = city["name"]
    state_name = city["state"]
    primary_river = (
        f"{city['rivers'][0]['station']} ({city['rivers'][0]['river']})"
        if city.get("rivers")
        else "Local Drainage Basin"
    )
    primary_reservoir_id = city["reservoirs"][0] if city.get("reservoirs") else "regional"
    primary_reservoir = f"{primary_reservoir_id.replace('_', ' ').title()} Reservoir"

    if flood is None and heat is None and fire is None and crop is None:
        flood, heat, fire = await asyncio.gather(
            _safe_hazard_result("flood", {"score": 0, "level": "Low"}),
            _safe_hazard_result("heat", {"score": 0, "level": "Low"}),
            _safe_hazard_result("fire", {"score": 0, "level": "Low"}),
        )
        crop = {"score": 0, "level": "Low", "probability": 0.0, "drivers": []}
    else:
        flood, heat, fire, crop = await asyncio.gather(
            _safe_hazard_result("flood", flood),
            _safe_hazard_result("heat", heat),
            _safe_hazard_result("fire", fire),
            _safe_hazard_result("crop", crop),
        )

    hazard_map = {"flood": flood, "heat": heat, "fire": fire}
    if crop.get("risk_percent", 0) > 0:
        hazard_map["crop"] = crop

    # Check for INSUFFICIENT DATA condition
    def _is_hazard_insufficient(h: dict[str, Any] | None) -> bool:
        if not h or not isinstance(h, dict):
            return True
        if h.get("data_quality") in {"insufficient_data", "failed", "stale", "unavailable"}:
            return True
        if h.get("level") in {"Insufficient Data", "Data Unavailable", "Error"}:
            return True
        if h.get("data_unavailable") is True:
            return True
        return False

    has_insufficient_data = any(
        _is_hazard_insufficient(h) for h in (flood, heat, fire)
    )

    priority_order = ["flood", "heat", "fire", "crop"]
    alerts = []
    for name in priority_order:
        data = hazard_map.get(name)
        if not data:
            continue
        risk_score = float(data.get("risk_percent", 0.0) or 0.0)
        level = str(data.get("level", "Low") or "Low").title()
        alerts.append({"hazard": name, "score": risk_score, "level": level})

    highest = max(
        alerts,
        key=lambda item: (_level_order(item["level"]), item["score"]),
        default={"hazard": "flood", "score": 0, "level": "Low"},
    )
    hazard_label = _hazard_title(highest["hazard"])

    action_plan = build_action_plan(
        hazard=highest["hazard"],
        level=highest["level"],
        drivers=[str(item) for item in hazard_map.get(highest["hazard"], {}).get("drivers", [])[:3]],
        time_to_peak="24-72h",
        audience="Citizen",
    )
    recommended_action = action_plan[0]["title"] if action_plan else "Monitor conditions and follow local guidance"

    hazards_payload = {
        "flood": {
            "risk_percent": int(flood["risk_percent"]),
            "level": flood["level"],
            "badge": flood["badge"],
            "probability": flood["probability"],
            "detail": flood.get("detail", ""),
        },
        "heat": {
            "risk_percent": int(heat["risk_percent"]),
            "level": heat["level"],
            "badge": heat["badge"],
            "probability": heat["probability"],
            "detail": heat.get("detail", ""),
        },
        "fire": {
            "risk_percent": int(fire["risk_percent"]),
            "level": fire["level"],
            "badge": fire["badge"],
            "probability": fire["probability"],
            "detail": fire.get("detail", ""),
        },
    }
    if crop.get("risk_percent", 0) or "crop" in hazard_map:
        c = hazard_map.get("crop", crop)
        hazards_payload["crop"] = {
            "risk_percent": int(c.get("risk_percent", 0)),
            "level": c.get("level", "Low"),
            "badge": c.get("badge", "Low"),
            "probability": c.get("probability", 0.0),
            "detail": c.get("detail", ""),
        }

    is_all_normal = (not has_insufficient_data) and all(
        _level_order(h.get("level")) <= 0 for h in hazards_payload.values()
    )

    if has_insufficient_data:
        alert_title = "INSUFFICIENT DATA – UPSTREAM TELEMETRY DELAYED"
        alert_badge = "DATA GAP"
        alert_category = "INSUFFICIENT_DATA"
    elif is_all_normal:
        alert_title = "NO RISK – CONDITIONS NORMAL"
        alert_badge = "NORMAL"
        alert_category = "NORMAL"
    else:
        alert_title = f"{highest['level']} {_hazard_title(highest['hazard'])} Risk Detected"
        alert_badge = highest["level"].upper()
        if highest["level"] in {"Moderate"}:
            alert_category = "WATCH"
        elif highest["level"] in {"High", "Very High"}:
            alert_category = "WARNING"
        else:
            alert_category = "CRITICAL"

    rainfall_24h = flood.get("rainfall_24h_mm", 0.0) if isinstance(flood, dict) else 0.0

    highest_hazard = highest.get("hazard", "flood")
    highest_hazard_title = _hazard_title(highest_hazard).upper()

    if has_insufficient_data:
        emergency_title = f"ℹ️ INSUFFICIENT DATA – {city_name.upper()} REGION"
    elif is_all_normal:
        emergency_title = f"✅ NO ACTIVE FLOOD THREAT – {city_name.upper()} REGION"
    else:
        if highest_hazard == "flood":
            if alert_category == "WATCH":
                emergency_title = f"⚠️ FLOOD WATCH – {city_name.upper()} REGION"
            elif alert_category == "WARNING":
                emergency_title = f"⚠️ FLOOD WARNING – {city_name.upper()} REGION"
            else:
                emergency_title = f"🚨 FLOOD CRITICAL – {city_name.upper()} REGION"
        else:
            emergency_title = f"⚠️ {highest_hazard_title} {alert_category} – {city_name.upper()} REGION"

    emergency_alert = {
        "title": emergency_title,
        "status": alert_category,
        "color_category": (
            "blue"
            if has_insufficient_data
            else (
                "green"
                if is_all_normal
                else (
                    "blue"
                    if alert_category == "WATCH"
                    else ("amber" if alert_category == "WARNING" else "coral")
                )
            )
        ),
        "rainfall_summary": f"{rainfall_24h:.1f} mm past 24h (IMD/Open-Meteo)",
        "river_level_summary": f"Station: {primary_river}",
        "reservoir_summary": f"{primary_reservoir}: Regional Storage Monitored",
        "reason": (
            f"Telemetry feed for {city_name} is currently synchronizing. Sensor readings are marked insufficient rather than assuming zero risk."
            if has_insufficient_data
            else (
                f"No significant rainfall recorded in {city_name} ({state_name}). River water level and runoff remain within nominal limits."
                if is_all_normal
                else (
                    f"Elevated hydrometeorological risk signals detected in {city_name} catchment."
                    if highest_hazard == "flood"
                    else f"Elevated {_hazard_title(highest_hazard).lower()} stress conditions detected in {city_name} region."
                )
            )
        ),
        "recommended_action": (
            "Awaiting updated sensor telemetry. Follow district administration bulletins."
            if has_insufficient_data
            else (
                f"Routine civic monitoring. Follow official DDMA/{city_name} Municipal advisories."
                if is_all_normal
                else recommended_action
            )
        ),
        "timestamp": datetime.now(timezone.utc).strftime("%I:%M %p UTC"),
        "is_normal": is_all_normal,
        "city_name": city_name,
        "state_name": state_name,
    }

    outlook = {
        "24h": (
            f"Conditions in {city_name} remain calm and within seasonal baselines."
            if is_all_normal
            else f"{_hazard_title(highest['hazard'])} risk remains {highest['level']} in {city_name}."
        ),
        "72h": (
            f"Standard weather trajectory expected for {city_name} ({state_name})."
            if is_all_normal
            else f"Continue active telemetry tracking across {city_name} vulnerable sectors."
        ),
    }

    return {
        "lat": lat,
        "lon": lon,
        "city_name": city_name,
        "state_name": state_name,
        "hazards": hazards_payload,
        "highest_priority_alert": {
            "title": alert_title,
            "status_badge": alert_badge,
            "alert_category": alert_category,
            "location": f"{city_name}, {state_name} ({lat:.3f}, {lon:.3f})",
            "recommended_action": (
                "Routine monitoring. Follow official advisories."
                if is_all_normal
                else recommended_action
            ),
            "hazard": highest["hazard"],
            "level": "Low" if is_all_normal else highest["level"],
            "is_normal": is_all_normal,
        },
        "emergency_alert": emergency_alert,
        "outlook": outlook,
        "disclaimer": DISCLAIMER,
    }
