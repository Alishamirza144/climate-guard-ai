import math

import pytest
from httpx import ASGITransport, AsyncClient

from app.engines.heat import (
    consecutive_hot_days,
    heat_index_celsius,
    imd_heatwave_status,
    score_heat_risk,
)
from app.main import app


def test_heat_index_known_value() -> None:
    value = heat_index_celsius(35.0, 60.0)
    assert 43.0 <= value <= 48.0


def test_imd_heatwave_boundaries() -> None:
    assert imd_heatwave_status(39.9, 35.0, 29.0, 25.0)["heatwave"] is False
    assert imd_heatwave_status(40.0, 35.5, 29.0, 25.0)["heatwave"] is True
    assert imd_heatwave_status(44.9, 40.0, 28.0, 24.0)["heatwave"] is True
    assert imd_heatwave_status(45.0, 39.7, 28.0, 24.0)["heatwave"] is True
    assert imd_heatwave_status(47.0, 39.0, 28.0, 24.0)["severe_heatwave"] is True


def test_missing_data_defaults() -> None:
    value = heat_index_celsius(None, None)
    assert value == 0.0
    status = imd_heatwave_status(None, None, None, None)
    assert status["heatwave"] is False
    assert status["warm_night"] is False


def test_consecutive_hot_days_counts_run() -> None:
    assert consecutive_hot_days([38.0, 39.2, 40.1, 41.0, 42.0, 43.0], threshold=40.0) == 5
    assert consecutive_hot_days([40.0, 39.0, 41.0], threshold=40.0) == 1


def test_heat_score_is_in_range() -> None:
    result = score_heat_risk(
        tmax_c=42.0,
        tmin_c=28.0,
        avg_temperature_c=35.0,
        relative_humidity=55.0,
        wind_speed_kph=5.0,
        shortwave_radiation_wm2=650.0,
        tmax_normal_c=35.0,
        tmin_normal_c=24.0,
        ml_probability=0.82,
        ml_validation_auc=0.74,
        location_name="Pune",
    )
    assert 0.0 <= result["score"] <= 100.0
    assert 0.0 <= result["probability"] <= 1.0
    assert result["level"] in {"Low", "Moderate", "High", "Critical"}
    assert result["headline"]
    assert result["recommended_actions"]


@pytest.mark.asyncio
async def test_heat_risk_route(monkeypatch) -> None:
    class FakeForecast:
        current = {"temperature_2m": 36.0, "relative_humidity_2m": 55, "wind_speed_10m": 4.2}
        hourly = {
            "time": [f"2026-10-25T{i:02d}:00" for i in range(24)],
            "temperature_2m": [35.0 + (i % 6) * 0.7 for i in range(24)],
            "relative_humidity_2m": [60.0] * 24,
            "wind_speed_10m": [3.0] * 24,
            "shortwave_radiation": [500.0] * 24,
        }
        daily = {"temperature_2m_max": [42.0], "temperature_2m_min": [27.0]}

    async def fake_forecast(*args, **kwargs):
        return FakeForecast()

    async def fake_climatology(*args, **kwargs):
        return {"temperature_2m_max": [35.0] * 15, "precipitation_sum": [20.0] * 15}

    monkeypatch.setattr("app.routers.heat.openmeteo.get_forecast", fake_forecast)
    monkeypatch.setattr("app.routers.heat.climatology.build_climatology", fake_climatology)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/risk/heat?lat=18.5204&lon=73.8567")

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["score"] >= 0.0
    assert payload["headline"]
    assert payload["hourly_trend"]
    assert payload["risk_zones"]
