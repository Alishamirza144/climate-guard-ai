from httpx import ASGITransport, AsyncClient

from app.main import app


async def test_scenario_library_returns_expected_entries() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/simulation/scenarios")

    assert response.status_code == 200, response.text
    payload = response.json()
    assert isinstance(payload.get("scenarios"), list)
    assert len(payload["scenarios"]) >= 6
    titles = {item["id"] for item in payload["scenarios"]}
    assert {"cloudburst", "flood-dam-release", "heatwave", "fire", "terminal-heat", "blocked-drain"} <= titles


async def test_validation_metrics_endpoint_returns_model_stats() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/validation/metrics")

    assert response.status_code == 200, response.text
    payload = response.json()
    assert set(payload["hazards"]).issuperset({"flood", "heat", "fire"})
    for metric in ("roc_auc", "pr_auc", "brier_score", "precision", "recall", "false_alarm_rate"):
        for hazard in ("flood", "heat", "fire"):
            assert metric in payload["hazards"][hazard]
