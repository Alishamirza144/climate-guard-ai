"""Tests for all 5 climate intelligence module endpoints."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture(autouse=True)
def mock_openmeteo(monkeypatch):
    class FakeForecast:
        current = {
            "temperature_2m": 32.5,
            "relative_humidity_2m": 58,
            "apparent_temperature": 34.0,
            "precipitation": 0.0,
            "rain": 0.0,
            "weather_code": 1,
            "surface_pressure": 1012.0,
            "wind_speed_10m": 12.5,
            "wind_direction_10m": 240,
        }
        daily = {
            "temperature_2m_max": [35.0] * 7,
            "temperature_2m_min": [22.0] * 7,
            "precipitation_sum": [0.0] * 7,
            "precipitation_hours": [0] * 7,
            "et0_fao_evapotranspiration": [4.2] * 7,
            "wind_speed_10m_max": [15.0] * 7,
        }
        hourly = {
            "time": [f"2026-11-03T{i:02d}:00" for i in range(24)],
            "temperature_2m": [30.0] * 24,
            "precipitation": [0.0] * 24,
            "relative_humidity_2m": [55.0] * 24,
            "wind_speed_10m": [12.0] * 24,
            "direct_normal_irradiance": [500.0] * 24,
            "soil_moisture_0_to_1cm": [0.22] * 24,
            "soil_moisture_1_to_3cm": [0.24] * 24,
            "soil_moisture_3_to_9cm": [0.25] * 24,
            "soil_moisture_9_to_27cm": [0.27] * 24,
            "soil_moisture_27_to_81cm": [0.28] * 24,
        }

    async def fake_get_forecast(*args, **kwargs):
        return FakeForecast()

    async def fake_get_archive(*args, **kwargs):
        return {
            "daily": {
                "temperature_2m_max": [33.0] * 30,
                "temperature_2m_min": [20.0] * 30,
            }
        }

    monkeypatch.setattr("app.services.openmeteo.get_forecast", fake_get_forecast)
    monkeypatch.setattr("app.services.openmeteo.get_archive", fake_get_archive)


@pytest.mark.asyncio
async def test_heat_endpoint() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/api/risk/heat?lat=19.9975&lon=73.7898")
    assert resp.status_code == 200
    data = resp.json()
    assert "city_name" in data
    assert "level" in data or "risk_score" in data


@pytest.mark.asyncio
async def test_fire_endpoint() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/api/risk/fire?lat=19.9975&lon=73.7898")
    assert resp.status_code == 200
    data = resp.json()
    assert "city_name" in data
    assert "risk_score" in data or "level" in data


@pytest.mark.asyncio
async def test_crop_get_endpoint() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/api/risk/crop?lat=19.9975&lon=73.7898")
    assert resp.status_code == 200
    data = resp.json()
    assert "city_name" in data
    assert "average_soil_moisture_m3_m3" in data or "soil_moisture_m3_m3" in data


@pytest.mark.asyncio
async def test_crop_post_endpoint() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post("/api/risk/crop", json={"lat": 19.9975, "lon": 73.7898, "crop": "Wheat", "sowing_date": "2026-10-15"})
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("crop", "").lower() == "wheat"
    assert "city_name" in data


@pytest.mark.asyncio
async def test_drainage_endpoint() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/api/risk/drainage?lat=19.9975&lon=73.7898&simulated=false")
    assert resp.status_code == 200
    data = resp.json()
    assert "city_name" in data
    assert "telemetry" in data
    assert data["telemetry"]["is_simulated"] is False


@pytest.mark.asyncio
async def test_drainage_simulation_endpoint() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/api/risk/drainage?lat=19.9975&lon=73.7898&simulated=true")
    assert resp.status_code == 200
    data = resp.json()
    assert data["simulated"] is True
    assert data["telemetry"]["is_simulated"] is True
    assert data["level"] == "Critical"

    # Test GET /api/risk/drainage/simulate
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp_sim = await ac.get("/api/risk/drainage/simulate?lat=19.9975&lon=73.7898")
    assert resp_sim.status_code == 200
    assert resp_sim.json()["simulated"] is True

    # Test POST /api/risk/drainage/simulate
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp_post = await ac.post("/api/risk/drainage/simulate", json={"lat": 19.9975, "lon": 73.7898, "simulated": True})
    assert resp_post.status_code == 200
    assert resp_post.json()["simulated"] is True
