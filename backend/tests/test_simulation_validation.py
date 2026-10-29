"""Regression tests for the Simulation and validation endpoints."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_simulation_scenarios_and_run() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        list_response = await client.get("/api/simulation/scenarios")
        assert list_response.status_code == 200
        scenario_data = list_response.json()
        assert len(scenario_data["scenarios"]) >= 3

        run_response = await client.post(
            "/api/simulation/run",
            json={"scenario_id": "cloudburst", "lat": 18.52, "lon": 73.85},
        )
        assert run_response.status_code == 200
        result = run_response.json()
        assert result["simulation_mode"] is True
        assert result["summary"]["score"] >= 0
        assert result["alerts"]


@pytest.mark.asyncio
async def test_validation_metrics_and_backtest() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        metrics_response = await client.get("/api/validation/metrics")
        assert metrics_response.status_code == 200
        metrics = metrics_response.json()["hazards"]
        assert "flood" in metrics and "heat" in metrics and "fire" in metrics

        report_response = await client.get("/api/validation/report", params={"hazard": "flood"})
        assert report_response.status_code == 200
        assert "flood" in report_response.json()["report"].lower()

        backtest_response = await client.get(
            "/api/validation/backtest",
            params={"lat": 18.52, "lon": 73.85, "event_date": "2024-06-15", "hazard": "flood"},
        )
        assert backtest_response.status_code == 200
        backtest = backtest_response.json()
        assert "metrics" in backtest
        assert backtest["metrics"]["temperature_mae_c"] >= 0
