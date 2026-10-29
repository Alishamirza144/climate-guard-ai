"""Local demo support with a warm cached Nashik flood snapshot.

This keeps the laptop demo working even when the network is unavailable by storing
and reusing the last successful payload locally in backend/cache/.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.routers.simulation import SCENARIO_LIBRARY

BACKEND_ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = BACKEND_ROOT / "cache"
DEFAULT_CACHE_PATH = CACHE_DIR / "last_demo_snapshot.json"

DEMO_LOCATION: dict[str, float | str] = {
    "name": "Nashik",
    "lat": 20.0110,
    "lon": 73.7900,
}


def _default_demo_payload() -> dict[str, Any]:
    scenario = next((item for item in SCENARIO_LIBRARY if item["id"] == "flood-dam-release"), SCENARIO_LIBRARY[0])
    synthetic = scenario["synthetic"].copy()
    synthetic["lat"] = float(DEMO_LOCATION["lat"])
    synthetic["lon"] = float(DEMO_LOCATION["lon"])
    payload = {
        "scenario_id": "flood-dam-release",
        "title": scenario["title"],
        "hazard": "flood",
        "location": DEMO_LOCATION,
        "simulation_mode": True,
        "generated_at": datetime.now(UTC).isoformat(),
        "synthetic_inputs": synthetic,
        "alerts": [
            {
                "hazard": "flood",
                "level": "High",
                "score": 86.1,
                "message": "River inflow and urban drainage exceed safe operating limits.",
            }
        ],
        "summary": {
            "score": 86.1,
            "level": "High",
            "probability": 0.89,
            "lead_time_hours": 24,
            "simulation_mode": True,
        },
    }
    return payload


def build_demo_payload(cache_path: str | Path | None = None) -> dict[str, Any]:
    target = Path(cache_path) if cache_path is not None else DEFAULT_CACHE_PATH
    if target.exists():
        try:
            with target.open("r", encoding="utf-8") as fh:
                payload = json.load(fh)
            if isinstance(payload, dict) and payload.get("scenario_id"):
                return payload
        except (json.JSONDecodeError, OSError):
            pass

    payload = _default_demo_payload()
    if target.parent.exists() or target.parent.mkdir(parents=True, exist_ok=True):
        with target.open("w", encoding="utf-8") as fh:
            json.dump(payload, fh, indent=2, sort_keys=True)
    return payload


def save_demo_snapshot(payload: dict[str, Any], cache_path: str | Path | None = None) -> Path:
    target = Path(cache_path) if cache_path is not None else DEFAULT_CACHE_PATH
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2, sort_keys=True)
    return target
