from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.engines.crop import gdd_for_day, vpd_from_temp_rh, water_stress_coefficient


def test_gdd_for_day() -> None:
    assert gdd_for_day(28.0, 18.0, 10.0) == 13.0


def test_water_stress_coefficient() -> None:
    ks = water_stress_coefficient(root_zone_m=0.6, field_capacity=0.32, wilting_point=0.15, current_moisture=0.20, depletion_fraction=0.55)
    assert 0.0 <= ks <= 1.0
    assert abs(ks - 0.653) < 1e-3


def test_vpd_from_temp_rh() -> None:
    vpd = vpd_from_temp_rh(25.0, 50.0)
    assert vpd > 1.5
    assert vpd < 1.7


@pytest.mark.asyncio
async def test_crop_route_returns_payload(monkeypatch: pytest.MonkeyPatch) -> None:
    class DummyArchive:
        daily = {
            "temperature_2m_max": [28.0, 30.0, 32.0],
            "temperature_2m_min": [16.0, 18.0, 20.0],
        }

    class DummyForecast:
        hourly = {
            "temperature_2m": [26.0, 28.0, 30.0, 31.0, 32.0, 33.0, 34.0],
            "relative_humidity_2m": [68.0, 70.0, 72.0, 74.0, 76.0, 78.0, 80.0],
            "precipitation": [0.0, 0.5, 1.5, 0.0, 0.0, 0.0, 0.0],
            "et0_fao_evapotranspiration": [2.8, 3.0, 3.2, 3.1, 3.0, 3.0, 3.1],
            "soil_moisture_0_to_1cm": [0.22, 0.23, 0.24, 0.25, 0.25, 0.26, 0.26],
            "soil_moisture_1_to_3cm": [0.21, 0.22, 0.23, 0.23, 0.24, 0.24, 0.25],
            "soil_moisture_3_to_9cm": [0.23, 0.24, 0.25, 0.25, 0.26, 0.26, 0.27],
            "soil_moisture_9_to_27cm": [0.24, 0.25, 0.25, 0.26, 0.27, 0.27, 0.28],
            "soil_moisture_27_to_81cm": [0.25, 0.25, 0.26, 0.27, 0.27, 0.28, 0.28],
        }

    async def fake_get_archive(*args, **kwargs):
        return DummyArchive()

    async def fake_get_forecast(*args, **kwargs):
        return DummyForecast()

    from app.services import openmeteo

    monkeypatch.setattr(openmeteo, "get_archive", fake_get_archive)
    monkeypatch.setattr(openmeteo, "get_forecast", fake_get_forecast)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/risk/crop",
            json={
                "lat": 18.5,
                "lon": 73.9,
                "crop": "wheat",
                "sowing_date": "2026-10-01",
                "soil_type": "loam",
                "irrigation": "drip",
            },
        )

    assert response.status_code == 200
    payload = response.json()
    assert "score" in payload
    assert "stage" in payload
    assert "water_stress" in payload
    assert "disease_favourability" in payload
    assert "ndvi_context" in payload
