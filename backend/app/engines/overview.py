"""Overview summary across flood, heat, fire, and crop risks."""

from __future__ import annotations

from datetime import datetime, timezone

import asyncio
from typing import Any

from app.engines.actions import build_action_plan

DISCLAMER = "Decision-support only. Follow official IMD/CWC/NDMA advisories."


def _level_order(level: str | None) -> int:
    order = {"Low": 0, "Moderate": 1, "High": 2, "Severe": 3, "Critical": 4}
    return order.get(str(level or "Low").title(), 0)


def _badge(level: str | None) -> str:
    value = str(level or "Low").title()
    return value if value in {"Low", "Moderate", "High", "Severe", "Critical"} else "Low"


def _hazard_title(hazard: str) -> str:
    title_map = {"flood": "Flood", "heat": "Heat", "fire": "Wildfire", "crop": "Crop"}
    return title_map.get(str(hazard).lower(), str(hazard).title())


async def _safe_hazard_result(hazard_name: str, payload: dict[str, Any] | None) -> dict[str, Any]:
    if payload is None:
        return {"risk_percent": 0, "level": "Low", "probability": 0.0, "drivers": [], "detail": "No data available."}
    score = float(payload.get("score", payload.get("risk", 0.0) or 0.0))
    level = str(payload.get("level", "Low") or "Low").title()
    probability = float(payload.get("probability", score / 100.0 if score else 0.0))
    drivers = payload.get("drivers", []) or []
    return {
        "risk_percent": int(round(score)),
        "level": level,
        "badge": _badge(level),
        "probability": round(probability, 3),
        "drivers": drivers,
        "detail": payload.get("expected_severity") or payload.get("headline") or payload.get("detail") or f"{_hazard_title(hazard_name)} risk status is stable.",
    }


async def build_overview_snapshot(
    lat: float,
    lon: float,
    flood: dict[str, Any] | None = None,
    heat: dict[str, Any] | None = None,
    fire: dict[str, Any] | None = None,
    crop: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build a compact overview payload for the phone mockup and the risk dashboard."""
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

    priority_order = ["flood", "heat", "fire", "crop"]
    alerts = []
    for name in priority_order:
        data = hazard_map.get(name)
        if not data:
            continue
        risk_score = float(data.get("risk_percent", 0.0) or 0.0)
        level = str(data.get("level", "Low") or "Low").title()
        alerts.append({"hazard": name, "score": risk_score, "level": level})
    highest = max(alerts, key=lambda item: (_level_order(item["level"]), item["score"]), default={"hazard": "flood", "score": 0, "level": "Low"})
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
        "flood": {"risk_percent": int(flood["risk_percent"]), "level": flood["level"], "badge": flood["badge"], "probability": flood["probability"], "detail": flood.get("detail", "")},
        "heat": {"risk_percent": int(heat["risk_percent"]), "level": heat["level"], "badge": heat["badge"], "probability": heat["probability"], "detail": heat.get("detail", "")},
        "fire": {"risk_percent": int(fire["risk_percent"]), "level": fire["level"], "badge": fire["badge"], "probability": fire["probability"], "detail": fire.get("detail", "")},
    }
    if crop.get("risk_percent", 0) or "crop" in hazard_map:
        c = hazard_map.get("crop", crop)
        hazards_payload["crop"] = {"risk_percent": int(c.get("risk_percent", 0)), "level": c.get("level", "Low"), "badge": c.get("badge", "Low"), "probability": c.get("probability", 0.0), "detail": c.get("detail", "")}

    is_all_normal = all(_level_order(h.get("level")) == 0 for h in hazards_payload.values())

    alert_title = "NO RISK – CONDITIONS NORMAL" if is_all_normal else f"{highest['level']} {_hazard_title(highest['hazard'])} Risk Detected"
    alert_badge = "NORMAL" if is_all_normal else highest["level"].upper()
    alert_category = "NORMAL" if is_all_normal else ("WATCH" if highest["level"] == "Moderate" else ("WARNING" if highest["level"] == "High" else "CRITICAL"))

    emergency_alert = {
        "title": "✅ NO FLOOD THREAT – NASHIK REGION" if is_all_normal else f"⚠️ FLOOD {alert_category} – NASHIK REGION",
        "status": alert_category,
        "color_category": "green" if is_all_normal else ("blue" if alert_category == "WATCH" else ("amber" if alert_category == "WARNING" else "coral")),
        "rainfall_summary": "0.0 mm past 24h (Normal Winter Baseline)",
        "river_level_summary": "Stable at 1.8 m (Ramkund Ghat)",
        "reservoir_summary": "Gangapur Dam: 72.0% Storage (Available: 60.5 MCM)",
        "reason": "No significant rainfall recorded. River water level remains stable. No abnormal increase in upstream flow. Drainage capacity is within normal limits." if is_all_normal else "Elevated rainfall or upstream dam release detected in Godavari catchment.",
        "recommended_action": "Routine civic monitoring. Follow official DDMA/NMC advisories." if is_all_normal else recommended_action,
        "timestamp": datetime.now(timezone.utc).strftime("%I:%M %p UTC"),
        "is_normal": is_all_normal,
    }

    outlook = {
        "24h": "Conditions remain calm and within seasonal winter baselines." if is_all_normal else f"{_hazard_title('flood')} risk remains {flood['level']} with the highest near-term concern in local drainage and runoff.",
        "72h": "Mild winter temperatures and standard baseflow expected." if is_all_normal else f"{_hazard_title('heat')} and {_hazard_title('fire')} remain the main watch points; keep monitoring all vulnerable zones.",
    }

    return {
        "lat": lat,
        "lon": lon,
        "hazards": hazards_payload,
        "highest_priority_alert": {
            "title": alert_title,
            "status_badge": alert_badge,
            "alert_category": alert_category,
            "location": f"{lat:.3f}, {lon:.3f}",
            "recommended_action": "Routine monitoring. Follow official advisories." if is_all_normal else recommended_action,
            "hazard": highest["hazard"],
            "level": "Low" if is_all_normal else highest["level"],
            "is_normal": is_all_normal,
        },
        "emergency_alert": emergency_alert,
        "outlook": outlook,
        "disclaimer": DISCLAMER,
    }
