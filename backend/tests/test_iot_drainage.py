from __future__ import annotations

import asyncio

import pytest
from httpx import ASGITransport, AsyncClient

from app.engines.drainage import analyze_drainage_series, detect_blockage_signature
from app.main import app


def test_blockage_signature_partial_blockage() -> None:
    series = [
        {"water_level_cm": 20.0, "flow_lpm": 120.0, "rainfall_mm": 2.0},
        {"water_level_cm": 22.0, "flow_lpm": 118.0, "rainfall_mm": 2.0},
        {"water_level_cm": 25.0, "flow_lpm": 110.0, "rainfall_mm": 3.0},
        {"water_level_cm": 28.0, "flow_lpm": 96.0, "rainfall_mm": 5.0},
        {"water_level_cm": 32.0, "flow_lpm": 88.0, "rainfall_mm": 5.0},
        {"water_level_cm": 36.0, "flow_lpm": 80.0, "rainfall_mm": 6.0},
    ]
    result = detect_blockage_signature(series)
    assert result["flagged"] is True
    assert result["severity"] in {"Watch", "Blockage Likely", "Blocked"}


def test_normal_series_not_flagged() -> None:
    series = [
        {"water_level_cm": 18.0, "flow_lpm": 95.0, "rainfall_mm": 0.2},
        {"water_level_cm": 19.0, "flow_lpm": 96.0, "rainfall_mm": 0.4},
        {"water_level_cm": 20.0, "flow_lpm": 98.0, "rainfall_mm": 0.3},
        {"water_level_cm": 21.0, "flow_lpm": 101.0, "rainfall_mm": 0.1},
        {"water_level_cm": 21.0, "flow_lpm": 100.0, "rainfall_mm": 0.2},
    ]
    result = detect_blockage_signature(series)
    assert result["flagged"] is False


def test_sensor_fault_is_not_blockage() -> None:
    series = [
        {"water_level_cm": 10.0, "flow_lpm": 50.0, "rainfall_mm": 0.0},
        {"water_level_cm": 12.0, "flow_lpm": 48.0, "rainfall_mm": 0.0},
        {"water_level_cm": 1000.0, "flow_lpm": 1000.0, "rainfall_mm": 0.0},
        {"water_level_cm": 999.0, "flow_lpm": 900.0, "rainfall_mm": 0.0},
    ]
    result = analyze_drainage_series(series)
    assert result["state"] == "fault"
    assert result["blockage_probability"] < 0.5


@pytest.mark.asyncio
async def test_iot_ingest_requires_key() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/api/iot/ingest",
            json={
                "device_id": "sensor-001",
                "ts": "2026-10-25T12:00:00Z",
                "lat": 19.0,
                "lon": 73.0,
                "water_level_cm": 25.0,
                "flow_lpm": 120.0,
                "rainfall_mm": 2.0,
                "soil_moisture_pct": 28.0,
                "temperature_c": 28.0,
                "humidity_pct": 80.0,
                "battery_v": 12.7,
                "rssi": -68,
            },
        )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_iot_ingest_and_list_devices() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/api/iot/ingest",
            json={
                "device_id": "sensor-002",
                "ts": "2026-10-25T12:00:00Z",
                "lat": 19.1,
                "lon": 73.1,
                "water_level_cm": 27.0,
                "flow_lpm": 130.0,
                "rainfall_mm": 1.5,
                "soil_moisture_pct": 32.0,
                "temperature_c": 29.0,
                "humidity_pct": 78.0,
                "battery_v": 12.8,
                "rssi": -60,
            },
            headers={"X-API-Key": "test-key"},
        )
        assert resp.status_code == 200, resp.text
        list_resp = await client.get("/api/iot/devices")
        assert list_resp.status_code == 200
        data = list_resp.json()
        assert "devices" in data
        assert any(device["device_id"] == "sensor-002" for device in data["devices"])
