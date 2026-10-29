"""Transparent action recommendations for each hazard and audience."""

from __future__ import annotations

from typing import Any

ACTION_LIBRARY: dict[str, dict[str, list[dict[str, Any]]]] = {
    "flood": {
        "High": [
            {"title": "Inspect drainage system", "priority": "P1", "owner": "Municipal/Authority", "time_window": "0-6h", "description": "Inspect the drainage and storm-water channels for blockages or debris."},
            {"title": "Clear possible blockages", "priority": "P1", "owner": "Citizen", "time_window": "0-3h", "description": "Remove obstructions near drains and culverts before runoff peaks."},
            {"title": "Prepare emergency response team", "priority": "P2", "owner": "Municipal/Authority", "time_window": "3-12h", "description": "Activate flood teams and direct resources to low-lying areas."},
        ],
        "Moderate": [
            {"title": "Check drainage inlets", "priority": "P2", "owner": "Citizen", "time_window": "6-24h", "description": "Keep drains clear and monitor for pooling."},
            {"title": "Review local flood maps", "priority": "P3", "owner": "Municipal/Authority", "time_window": "24h", "description": "Verify vulnerable neighbourhoods and prepare communication."},
        ],
        "Low": [
            {"title": "Monitor rainfall trend", "priority": "P3", "owner": "Citizen", "time_window": "24-72h", "description": "Continue checking for heavy rain bursts and local flooding indicators."},
        ],
    },
    "heat": {
        "High": [
            {"title": "Stay hydrated and avoid outdoor activity", "priority": "P1", "owner": "Citizen", "time_window": "0-12h", "description": "Limit intense outdoor activity and keep water available."},
            {"title": "Check on elderly and vulnerable people", "priority": "P1", "owner": "Municipal/Authority", "time_window": "0-6h", "description": "Reach elderly residents and those with medical conditions."},
            {"title": "Follow local authority advisories", "priority": "P2", "owner": "Citizen", "time_window": "0-24h", "description": "Follow official guidance and cooling-centre information."},
        ],
        "Moderate": [
            {"title": "Increase hydration", "priority": "P2", "owner": "Citizen", "time_window": "12-24h", "description": "Keep fluids up and use cooling measures during peak heat."},
        ],
        "Low": [
            {"title": "Monitor daytime heat levels", "priority": "P3", "owner": "Citizen", "time_window": "24-72h", "description": "Watch for a rapid increase in daytime heat and humidity."},
        ],
    },
    "fire": {
        "High": [
            {"title": "Restrict open burning", "priority": "P1", "owner": "Municipal/Authority", "time_window": "0-6h", "description": "Suspend open burning and inspect high-risk areas for ignition sources."},
            {"title": "Increase fire watch in dry areas", "priority": "P1", "owner": "Citizen", "time_window": "0-12h", "description": "Avoid fire-prone activity in dry grassland and vegetation."},
        ],
        "Moderate": [
            {"title": "Maintain fire breaks", "priority": "P2", "owner": "Municipal/Authority", "time_window": "12-24h", "description": "Check and clear dry vegetation around risk hotspots."},
        ],
        "Low": [
            {"title": "Continue routine monitoring", "priority": "P3", "owner": "Citizen", "time_window": "24-72h", "description": "Keep an eye on dry fuel conditions and local alerts."},
        ],
    },
    "crop": {
        "High": [
            {"title": "Apply recommended fungicide", "priority": "P1", "owner": "Farmer", "time_window": "0-24h", "description": "Treat affected crop zones with the recommended fungicide programme."},
            {"title": "Ensure proper field drainage", "priority": "P1", "owner": "Farmer", "time_window": "0-12h", "description": "Reduce waterlogging and improve field drainage in affected blocks."},
            {"title": "Monitor affected area regularly", "priority": "P2", "owner": "Farmer", "time_window": "24-72h", "description": "Assess disease spread and adjust the treatment plan if needed."},
        ],
        "Moderate": [
            {"title": "Apply recommended fungicide", "priority": "P2", "owner": "Farmer", "time_window": "24-72h", "description": "Apply preventive treatment to vulnerable growth stages."},
            {"title": "Ensure proper field drainage", "priority": "P2", "owner": "Farmer", "time_window": "12-48h", "description": "Keep field runoff channels clear and prevent standing water."},
        ],
        "Low": [
            {"title": "Continue routine scouting", "priority": "P3", "owner": "Farmer", "time_window": "48-72h", "description": "Keep a close watch on crop stress and field moisture."},
        ],
    },
}


def _normalize_level(level: str | None) -> str:
    if not level:
        return "Moderate"
    key = str(level).title()
    if key in {"Critical", "Severe"}:
        return "High"
    if key == "Warn":
        return "Moderate"
    return key if key in {"Low", "Moderate", "High"} else "Moderate"


def build_action_plan(
    hazard: str,
    level: str,
    drivers: list[str] | None,
    time_to_peak: str,
    audience: str,
) -> list[dict[str, Any]]:
    """Return list of action objects with priority, owner and dissemination window."""
    key = str(hazard).lower()
    action_entries = list(ACTION_LIBRARY.get(key, ACTION_LIBRARY["heat"]).get(_normalize_level(level), []))
    if not action_entries:
        action_entries = ACTION_LIBRARY.get(key, ACTION_LIBRARY["heat"]).get("Moderate", [])

    plan: list[dict[str, Any]] = []
    for item in action_entries:
        action = dict(item)
        action["audience"] = audience
        action["hazard"] = hazard
        action["drivers"] = list(drivers or [])
        action["time_to_peak"] = time_to_peak
        if action["owner"] == "Citizen" and audience != "Citizen":
            action["owner"] = audience
        if action["owner"] == "Municipal/Authority" and audience == "Citizen":
            action["owner"] = "Citizen"
        plan.append(action)
    return plan
