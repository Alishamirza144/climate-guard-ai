"""Lightweight SQLite storage for IoT devices and sensor readings."""

from __future__ import annotations

import json
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.engines.drainage import analyze_drainage_series

_DB_PATH = Path(__file__).resolve().parents[2] / "climateguard.db"


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = _connect()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS devices (
                device_id TEXT PRIMARY KEY,
                name TEXT,
                lat REAL,
                lon REAL,
                status TEXT,
                last_seen TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT NOT NULL,
                ts TEXT NOT NULL,
                lat REAL,
                lon REAL,
                water_level_cm REAL,
                flow_lpm REAL,
                rainfall_mm REAL,
                soil_moisture_pct REAL,
                temperature_c REAL,
                humidity_pct REAL,
                battery_v REAL,
                rssi INTEGER,
                blockage_probability REAL,
                state TEXT,
                metadata TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY(device_id) REFERENCES devices(device_id)
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


def _upsert_device(device_id: str, *, lat: float | None, lon: float | None, status: str = "normal") -> None:
    now = datetime.now(UTC).isoformat()
    conn = _connect()
    try:
        conn.execute(
            """
            INSERT INTO devices (device_id, lat, lon, status, last_seen, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(device_id)
            DO UPDATE SET lat=excluded.lat, lon=excluded.lon, status=excluded.status, last_seen=excluded.last_seen
            """,
            (device_id, lat, lon, status, now, now),
        )
        conn.commit()
    finally:
        conn.close()


def save_reading(payload: dict[str, Any]) -> dict[str, Any]:
    init_db()
    device_id = str(payload.get("device_id") or "unknown")
    ts = str(payload.get("ts") or datetime.now(UTC).isoformat())
    lat = payload.get("lat")
    lon = payload.get("lon")
    water = float(payload.get("water_level_cm", 0.0) or 0.0)
    flow = float(payload.get("flow_lpm", 0.0) or 0.0)
    rainfall = float(payload.get("rainfall_mm", 0.0) or 0.0)
    soil = float(payload.get("soil_moisture_pct", 0.0) or 0.0)
    temperature = float(payload.get("temperature_c", 0.0) or 0.0)
    humidity = float(payload.get("humidity_pct", 0.0) or 0.0)
    battery = float(payload.get("battery_v", 0.0) or 0.0)
    rssi = int(payload.get("rssi", 0) or 0)

    series = [
        {"water_level_cm": water, "flow_lpm": flow, "rainfall_mm": rainfall, "soil_moisture_pct": soil},
    ]
    analysis = analyze_drainage_series(series)
    probability = float(analysis.get("blockage_probability", 0.0))
    state = str(analysis.get("state", "normal"))
    _upsert_device(device_id, lat=lat, lon=lon, status=state)

    conn = _connect()
    try:
        cursor = conn.execute(
            """
            INSERT INTO readings (
                device_id, ts, lat, lon, water_level_cm, flow_lpm, rainfall_mm,
                soil_moisture_pct, temperature_c, humidity_pct, battery_v, rssi,
                blockage_probability, state, metadata, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                device_id,
                ts,
                lat,
                lon,
                water,
                flow,
                rainfall,
                soil,
                temperature,
                humidity,
                battery,
                rssi,
                probability,
                state,
                json.dumps({"reason": analysis.get("reason", "")}),
                datetime.now(UTC).isoformat(),
            ),
        )
        conn.commit()
        reading_id = cursor.lastrowid
    finally:
        conn.close()

    return {
        "reading_id": reading_id,
        "device_id": device_id,
        "ts": ts,
        "state": state,
        "blockage_probability": probability,
        "severity": analysis.get("severity"),
        "reason": analysis.get("reason"),
    }


def list_devices() -> list[dict[str, Any]]:
    init_db()
    conn = _connect()
    try:
        rows = conn.execute(
            """
            SELECT d.device_id, d.lat, d.lon, d.status, d.last_seen,
                   r.ts, r.water_level_cm, r.flow_lpm, r.rainfall_mm, r.soil_moisture_pct,
                   r.temperature_c, r.humidity_pct, r.battery_v, r.rssi, r.blockage_probability, r.state
            FROM devices d
            LEFT JOIN readings r ON r.id = (
                SELECT id FROM readings WHERE device_id = d.device_id ORDER BY ts DESC LIMIT 1
            )
            ORDER BY d.device_id
            """
        ).fetchall()
    finally:
        conn.close()

    devices: list[dict[str, Any]] = []
    for row in rows:
        devices.append(
            {
                "device_id": row["device_id"],
                "lat": row["lat"],
                "lon": row["lon"],
                "status": row["status"] or "normal",
                "last_seen": row["last_seen"],
                "last_reading": {
                    "ts": row["ts"],
                    "water_level_cm": row["water_level_cm"],
                    "flow_lpm": row["flow_lpm"],
                    "rainfall_mm": row["rainfall_mm"],
                    "soil_moisture_pct": row["soil_moisture_pct"],
                    "temperature_c": row["temperature_c"],
                    "humidity_pct": row["humidity_pct"],
                    "battery_v": row["battery_v"],
                    "rssi": row["rssi"],
                    "blockage_probability": row["blockage_probability"],
                    "state": row["state"],
                }
                if row["ts"] is not None
                else None,
            }
        )
    return devices


def get_recent_readings(device_id: str, limit: int = 20) -> list[dict[str, Any]]:
    init_db()
    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT * FROM readings WHERE device_id = ? ORDER BY ts DESC LIMIT ?",
            (device_id, limit),
        ).fetchall()
    finally:
        conn.close()
    return [dict(row) for row in rows]
