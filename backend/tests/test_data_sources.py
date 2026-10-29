from __future__ import annotations

import json
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.services import climatology, firms, nasa_power, nominatim, openmeteo, overpass

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.mark.asyncio
async def test_openmeteo_forecast_fixture(monkeypatch):
    payload = json.loads((FIXTURES / "openmeteo_forecast.json").read_text())

    async def fake_get(path, params=None, cache=True):
        assert path == "/v1/forecast"
        return payload

    monkeypatch.setattr(openmeteo._forecast_client, "get", fake_get)
    result = await openmeteo.get_forecast(18.5204, 73.8567)

    assert result.latitude == 18.5204
    assert result.current is not None
    assert result.current["temperature_2m"] == 29.2
    assert result.daily is not None
    assert result.daily["temperature_2m_max"][0] == 31.4


@pytest.mark.asyncio
async def test_openmeteo_flood_fixture(monkeypatch):
    payload = json.loads((FIXTURES / "openmeteo_flood.json").read_text())

    async def fake_get(path, params=None, cache=True):
        assert path == "/v1/flood"
        return payload

    monkeypatch.setattr(openmeteo._flood_client, "get", fake_get)
    result = await openmeteo.get_flood(19.9975, 73.7898)

    assert result.daily is not None
    assert result.daily["river_discharge"][0] == 120.4


@pytest.mark.asyncio
async def test_nasa_power_fixture(monkeypatch):
    payload = json.loads((FIXTURES / "nasa_power_daily.json").read_text())

    async def fake_get(path, params=None, cache=True):
        assert path == "/api/temporal/daily/point"
        return payload

    monkeypatch.setattr(nasa_power._client, "get", fake_get)
    result = await nasa_power.get_daily(19.9975, 73.7898, "2024-01-01", "2024-01-03")

    assert result.properties.parameter["T2M"]["20240101"] == 26.1
    normals = nasa_power.compute_day_of_year_normals(result, ["T2M", "PRECTOTCORR"])
    assert normals[0].day_of_year in {1, 2, 3}


@pytest.mark.asyncio
async def test_firms_csv_parses_and_handles_missing_key(monkeypatch):
    csv_text = (FIXTURES / "firms_fire_detections.csv").read_text()
    parsed = firms.parse_fire_csv(csv_text)
    assert parsed[0].latitude == 19.99
    assert parsed[0].brightness > 0

    monkeypatch.setattr(firms, "get_settings", lambda: type("Settings", (), {"firms_map_key": ""})())
    result = firms.get_fires(18.0, 73.0, 19.0, 74.0, days=1)
    assert result.available is False
    assert result.detections == []


@pytest.mark.asyncio
async def test_overpass_and_nominatim_fixtures(monkeypatch):
    overpass_payload = json.loads((FIXTURES / "overpass_waterways.geojson").read_text())
    reverse_payload = json.loads((FIXTURES / "nominatim_reverse.json").read_text())

    async def fake_overpass_get(path, params=None, cache=True):
        assert path == "/api/interpreter"
        return overpass_payload

    async def fake_nominatim_get(path, params=None, cache=True):
        assert path == "/reverse"
        return reverse_payload

    monkeypatch.setattr(overpass._client, "get", fake_overpass_get)
    waterways = await overpass.query_waterways(19.9975, 73.7898)
    assert waterways["type"] == "FeatureCollection"
    assert waterways["features"][0]["properties"]["waterway"] == "river"

    monkeypatch.setattr(nominatim._client, "get", fake_nominatim_get)
    reverse = await nominatim.reverse_geocode(19.9975, 73.7898)
    assert reverse["address"]["city"] == "Nashik"


@pytest.mark.asyncio
async def test_climatology_fixture(monkeypatch):
    archive_payload = json.loads((FIXTURES / "openmeteo_archive.json").read_text())

    async def fake_get(path, params=None, cache=True):
        assert path == "/v1/archive"
        return archive_payload

    monkeypatch.setattr(openmeteo._archive_client, "get", fake_get)
    normals = await climatology.build_climatology(19.9975, 73.7898)
    assert "temperature_2m_max" in normals
    assert "precipitation_sum" in normals
    assert normals["temperature_2m_max"][0] >= 15


@pytest.mark.asyncio
async def test_gibs_templates():
    templates = climatology.gibs_templates()
    assert "ndvi" in templates
    assert "true_color" in templates


@pytest.mark.live
async def test_live_openmeteo_pune_forecast():
    live = await openmeteo.get_forecast(18.5204, 73.8567, past_days=1, forecast_days=2)
    assert live.current is not None
    assert isinstance(live.current["temperature_2m"], (int, float))


@pytest.mark.live
async def test_live_nasa_power_pune():
    live = await nasa_power.get_daily(18.5204, 73.8567, "2026-10-01", "2026-10-03")
    assert "T2M" in live.properties.parameter


@pytest.mark.asyncio
async def test_data_sources_route_returns_registry() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/data-sources")

    assert response.status_code == 200, response.text
    payload = response.json()
    assert isinstance(payload.get("sources"), list)
    assert len(payload["sources"]) >= 1
    first = payload["sources"][0]
    assert "name" in first and "status" in first
