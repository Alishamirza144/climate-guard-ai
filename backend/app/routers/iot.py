"""IoT ingestion and live sensor endpoints for drainage monitoring."""

from __future__ import annotations

import asyncio
import json
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.config import get_settings
from app.iot.storage import get_recent_readings, list_devices, save_reading

router = APIRouter(tags=["iot"])


def _require_api_key(x_api_key: str | None) -> None:
    expected = get_settings().iot_api_key.strip()
    if expected:
        if not x_api_key or x_api_key != expected:
            raise HTTPException(status_code=401, detail="invalid or missing API key")
        return
    if not x_api_key or not x_api_key.strip():
        raise HTTPException(status_code=401, detail="invalid or missing API key")


@router.post("/iot/ingest")
async def ingest_reading(payload: dict[str, Any], x_api_key: str | None = Header(default=None, alias="X-API-Key")) -> dict[str, Any]:
    _require_api_key(x_api_key)
    if not payload.get("device_id"):
        raise HTTPException(status_code=400, detail="device_id is required")
    reading = save_reading(payload)
    return {"status": "ok", **reading}


@router.get("/iot/devices")
async def get_devices() -> dict[str, Any]:
    return {"devices": list_devices()}


@router.get("/iot/readings")
async def get_device_readings(device_id: str = Query(...), limit: int = Query(20, ge=1, le=500)) -> dict[str, Any]:
    return {"device_id": device_id, "readings": get_recent_readings(device_id, limit=limit)}


@router.get("/iot/stream")
async def stream_readings() -> StreamingResponse:
    async def event_generator():
        payload = {"devices": list_devices(), "timestamp": datetime.now(UTC).isoformat()}
        yield "event: update\n"
        yield f"data: {json.dumps(payload)}\n\n"
        await asyncio.sleep(0)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/iot/simulate")
async def simulate_readings(payload: dict[str, Any] | None = None, x_api_key: str | None = Header(default=None, alias="X-API-Key")) -> dict[str, Any]:
    _require_api_key(x_api_key)
    body = payload or {}
    scenario = str(body.get("scenario", "normal")).lower()
    device_id = str(body.get("device_id") or "sensor-simulated")
    lat = float(body.get("lat", 19.0) or 19.0)
    lon = float(body.get("lon", 73.0) or 73.0)

    scenarios = {
        "normal": [
            {"water_level_cm": 18.0, "flow_lpm": 96.0, "rainfall_mm": 0.3, "soil_moisture_pct": 28.0, "temperature_c": 24.0, "humidity_pct": 65.0, "battery_v": 12.8, "rssi": -60},
            {"water_level_cm": 19.2, "flow_lpm": 98.0, "rainfall_mm": 0.4, "soil_moisture_pct": 29.0, "temperature_c": 24.3, "humidity_pct": 66.0, "battery_v": 12.7, "rssi": -61},
            {"water_level_cm": 20.0, "flow_lpm": 101.0, "rainfall_mm": 0.5, "soil_moisture_pct": 30.0, "temperature_c": 24.5, "humidity_pct": 67.0, "battery_v": 12.7, "rssi": -62},
        ],
        "heavy-rain": [
            {"water_level_cm": 22.0, "flow_lpm": 120.0, "rainfall_mm": 5.0, "soil_moisture_pct": 35.0, "temperature_c": 25.0, "humidity_pct": 72.0, "battery_v": 12.6, "rssi": -58},
            {"water_level_cm": 24.0, "flow_lpm": 125.0, "rainfall_mm": 7.0, "soil_moisture_pct": 38.0, "temperature_c": 25.5, "humidity_pct": 74.0, "battery_v": 12.6, "rssi": -57},
            {"water_level_cm": 26.0, "flow_lpm": 130.0, "rainfall_mm": 8.2, "soil_moisture_pct": 42.0, "temperature_c": 25.8, "humidity_pct": 76.0, "battery_v": 12.5, "rssi": -57},
        ],
        "blockage": [
            {"water_level_cm": 18.5, "flow_lpm": 100.0, "rainfall_mm": 2.0, "soil_moisture_pct": 28.0, "temperature_c": 24.0, "humidity_pct": 70.0, "battery_v": 12.8, "rssi": -64},
            {"water_level_cm": 23.0, "flow_lpm": 91.0, "rainfall_mm": 3.0, "soil_moisture_pct": 31.0, "temperature_c": 24.5, "humidity_pct": 72.0, "battery_v": 12.7, "rssi": -66},
            {"water_level_cm": 28.0, "flow_lpm": 82.0, "rainfall_mm": 4.0, "soil_moisture_pct": 34.0, "temperature_c": 25.0, "humidity_pct": 75.0, "battery_v": 12.6, "rssi": -68},
        ],
        "full-blockage": [
            {"water_level_cm": 20.0, "flow_lpm": 115.0, "rainfall_mm": 1.5, "soil_moisture_pct": 29.0, "temperature_c": 23.8, "humidity_pct": 68.0, "battery_v": 12.8, "rssi": -60},
            {"water_level_cm": 31.0, "flow_lpm": 66.0, "rainfall_mm": 2.5, "soil_moisture_pct": 36.0, "temperature_c": 24.1, "humidity_pct": 75.0, "battery_v": 12.5, "rssi": -67},
            {"water_level_cm": 42.0, "flow_lpm": 44.0, "rainfall_mm": 3.8, "soil_moisture_pct": 41.0, "temperature_c": 24.4, "humidity_pct": 78.0, "battery_v": 12.4, "rssi": -70},
        ],
    }

    samples = scenarios.get(scenario, scenarios["normal"])
    saved: list[dict[str, Any]] = []
    for idx, item in enumerate(samples):
        payload = {
            "device_id": device_id,
            "ts": datetime.now(UTC).isoformat(),
            "lat": lat + idx * 0.0005,
            "lon": lon + idx * 0.0005,
            "water_level_cm": item["water_level_cm"],
            "flow_lpm": item["flow_lpm"],
            "rainfall_mm": item["rainfall_mm"],
            "soil_moisture_pct": item["soil_moisture_pct"],
            "temperature_c": item["temperature_c"],
            "humidity_pct": item["humidity_pct"],
            "battery_v": item["battery_v"],
            "rssi": item["rssi"],
        }
        saved.append(save_reading(payload))

    return {"status": "ok", "scenario": scenario, "device_id": device_id, "readings": saved}
