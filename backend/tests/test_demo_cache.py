from __future__ import annotations

from pathlib import Path

from app.demo import DEMO_LOCATION, build_demo_payload, save_demo_snapshot


def test_demo_cache_round_trip(tmp_path: Path) -> None:
    payload = {"scenario_id": "flood-dam-release", "summary": {"level": "High"}}
    cache_path = tmp_path / "demo_snapshot.json"

    save_demo_snapshot(payload, cache_path)

    data = build_demo_payload(cache_path)
    assert data["scenario_id"] == "flood-dam-release"
    assert data["summary"]["level"] == "High"


def test_demo_location_uses_nashik_flood_defaults() -> None:
    assert DEMO_LOCATION["name"] == "Nashik"
    payload = build_demo_payload()
    assert payload["location"]["name"] == "Nashik"
    assert payload["hazard"] == "flood"
