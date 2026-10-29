"""Overview summary across flood, heat, fire, and crop risks."""

from __future__ import annotations

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
        "flood": {"risk_percent": int(flood["risk_percent"]), "level": flood["level"], "badge": flood["badge"], "probability": flood["probability"]},
        "heat": {"risk_percent": int(heat["risk_percent"]), "level": heat["level"], "badge": heat["badge"], "probability": heat["probability"]},
        "fire": {"risk_percent": int(fire["risk_percent"]), "level": fire["level"], "badge": fire["badge"], "probability": fire["probability"]},
    }
    if crop.get("risk_percent", 0):
        hazards_payload["crop"] = {"risk_percent": int(crop["risk_percent"]), "level": crop["level"], "badge": crop["badge"], "probability": crop["probability"]}

    outlook = {
        "24h": f"{_hazard_title('flood')} risk remains {flood['level']} with the highest near-term concern in local drainage and runoff.",
        "72h": f"{_hazard_title('heat')} and {_hazard_title('fire')} remain the main watch points; keep monitoring all vulnerable zones.",
    }

    return {
        "lat": lat,
        "lon": lon,
        "hazards": hazards_payload,
        "highest_priority_alert": {
            "title": f"{highest['level']} {_hazard_title(highest['hazard'])} Risk Detected",
            "location": f"{lat:.3f}, {lon:.3f}",
            "recommended_action": recommended_action,
            "hazard": highest["hazard"],
            "level": highest["level"],
        },
        "outlook": outlook,
        "disclaimer": DISCLAMER,
    }
