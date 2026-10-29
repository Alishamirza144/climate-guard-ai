from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from app.engines.actions import build_action_plan
from app.engines.alerts import AlertDecisionEngine


def test_actions_for_each_audience() -> None:
    flood = build_action_plan(
        hazard="flood",
        level="High",
        drivers=["rainfall surge", "blocked drain"],
        time_to_peak="24h",
        audience="Citizen",
    )
    assert any(action["title"] == "Inspect drainage system" for action in flood)
    assert any(action["owner"] == "Citizen" for action in flood)

    heat = build_action_plan(
        hazard="heat",
        level="High",
        drivers=["heat index"],
        time_to_peak="12h",
        audience="Municipal/Authority",
    )
    assert any(action["title"] == "Check on elderly and vulnerable people" for action in heat)

    crop = build_action_plan(
        hazard="crop",
        level="Moderate",
        drivers=["fungal stress"],
        time_to_peak="72h",
        audience="Farmer",
    )
    assert any(action["title"] == "Apply recommended fungicide" for action in crop)


def test_alert_hysteresis_and_deduplication() -> None:
    engine = AlertDecisionEngine(db_path=":memory:")

    a1 = engine.evaluate(
        hazard="flood",
        score=80,
        level="High",
        location="Test Ward",
        message="Flooding risk rising",
    )
    assert a1 is not None
    assert a1["level"] == "High"

    a2 = engine.evaluate(
        hazard="flood",
        score=78,
        level="High",
        location="Test Ward",
        message="Same situation",
    )
    assert a2 is None

    a3 = engine.evaluate(
        hazard="flood",
        score=92,
        level="Severe",
        location="Test Ward",
        message="Escalated flood risk",
    )
    assert a3 is not None
    assert a3["level"] == "Severe"

    a4 = engine.evaluate(
        hazard="flood",
        score=70,
        level="Moderate",
        location="Test Ward",
        message="Risk falling",
    )
    assert a4 is not None
    assert a4["state"] == "cleared"


def test_alert_escalation_creation_and_queryset() -> None:
    engine = AlertDecisionEngine(db_path=":memory:")
    first = engine.evaluate("heat", 70, "High", "Zone A", "Heat risk expanding")
    second = engine.evaluate("heat", 85, "Severe", "Zone A", "Heat risk severe")
    assert first is not None
    assert second is not None
    assert second["escalated"] is True
    alerts = engine.list_alerts()
    assert len(alerts) >= 2
    assert any(item["hazard"] == "heat" for item in alerts)


@pytest.mark.asyncio
async def test_overview_snapshot_has_disclaimer_and_summary() -> None:
    from app.engines.overview import build_overview_snapshot

    snapshot = await build_overview_snapshot(
        lat=19.0,
        lon=73.0,
        flood={"score": 74, "level": "High", "probability": 0.74},
        heat={"score": 61, "level": "Moderate", "probability": 0.61},
        fire={"score": 42, "level": "Low", "probability": 0.42},
        crop={"score": 58, "level": "Moderate", "probability": 0.58},
    )

    assert snapshot["disclaimer"] == "Decision-support only. Follow official IMD/CWC/NDMA advisories."
    assert snapshot["highest_priority_alert"]["title"]
    assert snapshot["hazards"]["flood"]["risk_percent"] == 74
    assert snapshot["hazards"]["heat"]["risk_percent"] == 61
    assert snapshot["hazards"]["fire"]["risk_percent"] == 42
