"""Test suite for Dam Capacity Monitoring and Seasonal Risk Engine."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.engines.dams import RESERVOIR_CATALOG, compute_reservoir_metrics, list_all_reservoirs
from app.engines.seasonal import apply_hysteresis, evaluate_winter_conditions, get_current_season
from app.main import app


def test_seasonal_detection() -> None:
    season = get_current_season()
    assert season in {"winter", "summer", "monsoon", "post_monsoon"}


def test_winter_normal_conditions_returns_no_risk() -> None:
    eval_result = evaluate_winter_conditions(
        rainfall_24h_mm=0.0,
        river_water_level_m=1.8,
        river_rate_of_rise_m_h=0.0,
        dam_discharge_cusecs=650.0,
        drainage_blockage_pct=5.0,
    )
    assert eval_result["is_normal"] is True
    assert eval_result["status_text"] == "NO RISK – CONDITIONS NORMAL"
    assert eval_result["status_badge"] == "NORMAL"
    assert eval_result["alert_category"] == "NORMAL"
    assert any("No significant rainfall" in r for r in eval_result["reasons"])


def test_winter_unusual_rainfall_triggers_warning() -> None:
    eval_result = evaluate_winter_conditions(
        rainfall_24h_mm=75.0,
        river_water_level_m=4.8,
        river_rate_of_rise_m_h=0.6,
        dam_discharge_cusecs=18000.0,
        drainage_blockage_pct=45.0,
    )
    assert eval_result["is_normal"] is False
    assert eval_result["alert_category"] in {"WARNING", "CRITICAL"}
    assert len(eval_result["anomalies"]) >= 2


def test_apply_hysteresis_stability() -> None:
    # When previously Low, score 28 stays Low
    level, _ = apply_hysteresis(28.0, previous_level="Low")
    assert level == "Low"

    # When previously Moderate, score 28 stays Moderate (deadband prevents flip)
    level_prev_mod, _ = apply_hysteresis(28.0, previous_level="Moderate")
    assert level_prev_mod == "Moderate"

    # When score drops to 24 (below 30 - 4), drops to Low
    level_drop, _ = apply_hysteresis(24.0, previous_level="Moderate")
    assert level_drop == "Low"


def test_dam_metrics_calculation_gangapur() -> None:
    res = compute_reservoir_metrics("gangapur")
    assert res.name == "Gangapur Dam"
    assert res.total_capacity_mcm == 215.88
    # Storage Percentage = (Current Storage / Total Capacity) * 100
    expected_pct = round((res.current_storage_mcm / res.total_capacity_mcm) * 100.0, 1)
    assert res.storage_percentage == expected_pct
    # Available Storage = Total Capacity - Current Storage
    assert round(res.available_storage_mcm + res.current_storage_mcm, 1) == round(res.total_capacity_mcm, 1)
    assert len(res.historical_trend) == 8
    assert len(res.inflow_outflow_trend) == 6


def test_dam_custom_scenario_simulation() -> None:
    # Simulate high storage and outflow
    res = compute_reservoir_metrics(
        "gangapur",
        custom_storage_mcm=210.0,
        custom_inflow=25000.0,
        custom_outflow=32000.0,
    )
    assert res.storage_percentage > 95.0
    assert res.downstream_threat_level == "Critical"
    assert res.spillway_status == "EMERGENCY DISCHARGE"


@pytest.mark.asyncio
async def test_dams_api_routes() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. List all dams
        res = await client.get("/api/dams")
        assert res.status_code == 200
        dams_list = res.json()
        assert len(dams_list) >= 5
        assert any(d["id"] == "gangapur" for d in dams_list)

        # 2. Get specific dam details
        res_gangapur = await client.get("/api/dams/gangapur")
        assert res_gangapur.status_code == 200
        data = res_gangapur.json()
        assert data["id"] == "gangapur"
        assert "storage_percentage" in data
        assert "available_storage_mcm" in data
        assert "inflow_outflow_trend" in data

        # 3. Process time header
        assert "X-Process-Time" in res_gangapur.headers


@pytest.mark.asyncio
async def test_risk_overview_returns_emergency_alert_and_normal_winter_status(monkeypatch) -> None:
    class FakeForecast:
        current = {"temperature_2m": 24.0, "relative_humidity_2m": 50, "precipitation": 0.0}
        hourly = {
            "time": [f"2026-11-03T{i:02d}:00" for i in range(24)],
            "precipitation": [0.0] * 24,
            "temperature_2m": [24.0] * 24,
            "relative_humidity_2m": [50.0] * 24,
        }
        daily = {"temperature_2m_max": [26.0], "temperature_2m_min": [14.0], "precipitation_sum": [0.0]}

    async def fake_forecast(*args, **kwargs):
        return FakeForecast()

    async def fake_flood(*args, **kwargs):
        return {"daily": {"river_discharge": [50.0], "river_discharge_mean": [50.0], "river_discharge_max": [80.0]}}

    async def fake_elevation(*args, **kwargs):
        class Elevation:
            elevation = [560.0]
        return Elevation()

    async def fake_waterways(*args, **kwargs):
        return {"type": "FeatureCollection", "features": []}

    monkeypatch.setattr("app.routers.risk.openmeteo.get_forecast", fake_forecast)
    monkeypatch.setattr("app.routers.risk.openmeteo.get_flood", fake_flood)
    monkeypatch.setattr("app.routers.risk.openmeteo.elevation", fake_elevation)
    monkeypatch.setattr("app.routers.risk.overpass.query_waterways", fake_waterways)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/risk/overview?lat=19.9975&lon=73.7898")
        assert res.status_code == 200
        payload = res.json()
        assert "emergency_alert" in payload
        assert "title" in payload["emergency_alert"]
        assert "status" in payload["emergency_alert"]
        assert "reason" in payload["emergency_alert"]
        assert "NO" in payload["emergency_alert"]["title"] or payload["emergency_alert"]["status"] == "NORMAL"
