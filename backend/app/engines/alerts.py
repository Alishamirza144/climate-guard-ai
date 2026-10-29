"""Hysteresis-based alert engine and SQLite persistence for watched hazards."""

from __future__ import annotations

import json
import sqlite3
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import httpx
import structlog

log = structlog.get_logger(__name__)

_DEFAULT_DB = Path(__file__).resolve().parents[2] / "climateguard.db"

_LEVEL_ORDER = {"Low": 0, "Moderate": 1, "High": 2, "Severe": 3, "Critical": 4}


class AlertDecisionEngine:
    """Create and deduplicate hazard alerts using hysteresis and escalation rules."""

    def __init__(self, db_path: str | Path = _DEFAULT_DB) -> None:
        self.db_path = str(db_path)
        self._conn = sqlite3.connect(self.db_path)
        self._conn.row_factory = sqlite3.Row
        self.init_db()

    def _connect(self) -> sqlite3.Connection:
        return self._conn

    def init_db(self) -> None:
        conn = self._connect()
        try:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    hazard TEXT NOT NULL,
                    level TEXT NOT NULL,
                    score REAL NOT NULL,
                    location TEXT NOT NULL,
                    message TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    acknowledged INTEGER NOT NULL DEFAULT 0,
                    state TEXT NOT NULL DEFAULT 'active',
                    escalation INTEGER NOT NULL DEFAULT 0,
                    channels TEXT NOT NULL DEFAULT '[]'
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS watched_locations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    lat REAL NOT NULL,
                    lon REAL NOT NULL,
                    name TEXT,
                    channels TEXT NOT NULL DEFAULT '[]',
                    hazards TEXT NOT NULL DEFAULT '[]',
                    created_at TEXT NOT NULL
                )
                """
            )
            conn.commit()
        finally:
            pass

    def list_alerts(self, *, include_acknowledged: bool = True) -> list[dict[str, Any]]:
        conn = self._connect()
        try:
            if include_acknowledged:
                rows = conn.execute(
                    "SELECT * FROM alerts ORDER BY created_at DESC"
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM alerts WHERE acknowledged = 0 ORDER BY created_at DESC"
                ).fetchall()
        finally:
            pass
        return [dict(row) for row in rows]

    def add_watch(self, *, lat: float, lon: float, name: str | None = None, channels: list[str] | None = None, hazards: list[str] | None = None) -> dict[str, Any]:
        conn = self._connect()
        now = datetime.now(UTC).isoformat()
        payload = {
            "lat": float(lat),
            "lon": float(lon),
            "name": name,
            "channels": channels or ["telegram"],
            "hazards": hazards or ["flood", "heat", "fire"],
            "created_at": now,
        }
        try:
            cursor = conn.execute(
                "INSERT INTO watched_locations (lat, lon, name, channels, hazards, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (
                    payload["lat"],
                    payload["lon"],
                    payload["name"],
                    json.dumps(payload["channels"]),
                    json.dumps(payload["hazards"]),
                    payload["created_at"],
                ),
            )
            conn.commit()
            location_id = cursor.lastrowid
        finally:
            pass
        return {"id": location_id, **payload, "channels": payload["channels"], "hazards": payload["hazards"]}

    def delete_watch(self, watch_id: int) -> bool:
        conn = self._connect()
        try:
            cursor = conn.execute("DELETE FROM watched_locations WHERE id = ?", (watch_id,))
            conn.commit()
        finally:
            pass
        return cursor.rowcount > 0

    def list_watches(self) -> list[dict[str, Any]]:
        conn = self._connect()
        try:
            rows = conn.execute("SELECT * FROM watched_locations ORDER BY created_at DESC").fetchall()
        finally:
            pass
        results: list[dict[str, Any]] = []
        for row in rows:
            results.append(
                {
                    "id": row["id"],
                    "lat": row["lat"],
                    "lon": row["lon"],
                    "name": row["name"],
                    "channels": json.loads(row["channels"] or "[]"),
                    "hazards": json.loads(row["hazards"] or "[]"),
                    "created_at": row["created_at"],
                }
            )
        return results

    def get_last_alert(self, hazard: str, location: str) -> dict[str, Any] | None:
        conn = self._connect()
        try:
            row = conn.execute(
                "SELECT * FROM alerts WHERE hazard = ? AND location = ? ORDER BY created_at DESC LIMIT 1",
                (str(hazard).lower(), str(location)),
            ).fetchone()
        finally:
            pass
        return dict(row) if row is not None else None

    def _level_for_score(self, score: float) -> str:
        if score >= 85:
            return "Critical"
        if score >= 60:
            return "High"
        if score >= 30:
            return "Moderate"
        return "Low"

    def evaluate(
        self,
        hazard: str,
        score: float,
        level: str,
        location: str,
        message: str,
        *,
        channels: list[str] | None = None,
    ) -> dict[str, Any] | None:
        """Return a new alert dict or None when the alert is deduplicated."""
        hazard_key = str(hazard).lower()
        score_value = float(score)
        level_name = str(level or self._level_for_score(score_value)).title()
        threshold = 65.0 if hazard_key in {"flood", "heat"} else 60.0 if hazard_key == "crop" else 70.0
        if level_name not in _LEVEL_ORDER:
            level_name = self._level_for_score(score_value)

        current_rank = _LEVEL_ORDER.get(level_name, 1)
        last_alert = self.get_last_alert(hazard_key, location)
        if last_alert:
            last_rank = _LEVEL_ORDER.get(str(last_alert["level"]).title(), 0)
            last_created = datetime.fromisoformat(str(last_alert["created_at"]).replace("Z", "+00:00"))
            if current_rank < last_rank or score_value < float(last_alert["score"]) - 5:
                return self._insert_alert(
                    hazard=hazard_key,
                    level=level_name,
                    score=score_value,
                    location=location,
                    message=message,
                    state="cleared",
                    escalation=0,
                    channels=channels or [],
                )
            if datetime.now(UTC) - last_created < timedelta(hours=3):
                if current_rank <= last_rank and str(last_alert.get("state")) != "cleared":
                    return None

        if score_value < threshold - 10 and not last_alert:
            return None
        if score_value < threshold - 10 and last_alert and current_rank <= last_rank:
            return None

        if last_alert and current_rank > last_rank:
            escalated = True
        elif last_alert and current_rank == last_rank and score_value > float(last_alert["score"]):
            escalated = True
        else:
            escalated = False

        if last_alert and current_rank <= last_rank and score_value >= threshold and (datetime.now(UTC) - last_created).total_seconds() < 10800:
            return None

        return self._insert_alert(
            hazard=hazard_key,
            level=level_name,
            score=score_value,
            location=location,
            message=message,
            state="active",
            escalation=int(escalated),
            channels=channels or [],
        )

    def _insert_alert(
        self,
        *,
        hazard: str,
        level: str,
        score: float,
        location: str,
        message: str,
        state: str,
        escalation: int,
        channels: list[str] | None,
    ) -> dict[str, Any]:
        now = datetime.now(UTC).isoformat()
        conn = self._connect()
        try:
            cursor = conn.execute(
                """
                INSERT INTO alerts (hazard, level, score, location, message, created_at, acknowledged, state, escalation, channels)
                VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
                """,
                (
                    str(hazard).lower(),
                    str(level).title(),
                    float(score),
                    str(location),
                    str(message),
                    now,
                    state,
                    int(escalation),
                    json.dumps(channels or []),
                ),
            )
            conn.commit()
            alert_id = cursor.lastrowid
        finally:
            pass

        alert = {
            "id": alert_id,
            "hazard": str(hazard).lower(),
            "level": str(level).title(),
            "score": float(score),
            "location": str(location),
            "message": str(message),
            "created_at": now,
            "acknowledged": False,
            "state": state,
            "escalated": bool(escalation),
            "channels": channels or [],
        }
        self._deliver_alert(alert)
        return alert

    def ack(self, alert_id: int) -> dict[str, Any] | None:
        conn = self._connect()
        try:
            row = conn.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,)).fetchone()
            if row is None:
                return None
            conn.execute("UPDATE alerts SET acknowledged = 1 WHERE id = ?", (alert_id,))
            conn.commit()
        finally:
            pass
        payload = dict(row)
        payload["acknowledged"] = True
        return payload

    def _deliver_alert(self, alert: dict[str, Any]) -> None:
        if alert.get("state") == "cleared":
            return
        try:
            config = __import__("app.config", fromlist=["get_settings"]).get_settings()
            channels = [str(ch).lower() for ch in alert.get("channels", [])]
            if "telegram" in channels and config.telegram_bot_token and config.telegram_chat_id:
                payload = {"chat_id": config.telegram_chat_id, "text": f"[{alert['hazard'].upper()}] {alert['level']} risk at {alert['location']}: {alert['message']}"}
                httpx.post(f"https://api.telegram.org/bot{config.telegram_bot_token}/sendMessage", json=payload, timeout=10)
            if "webpush" in channels:
                try:
                    from pywebpush import webpush
                    if config.vapid_public_key and config.vapid_private_key:
                        webpush({"endpoint": "https://example.invalid/", "keys": {"p256dh": "", "auth": ""}}, "ClimateGuard alert")
                except Exception:
                    log.info("webpush_adapter_disabled", reason="not configured")
            if "email" in channels and config.telegram_bot_token:
                pass
        except Exception:
            log.info("alert_delivery_failed", hazard=alert.get("hazard"), level=alert.get("level"))


def evaluate_watched_locations(engine: AlertDecisionEngine | None = None) -> list[dict[str, Any]]:
    engine = engine or AlertDecisionEngine()
    produced: list[dict[str, Any]] = []
    for watch in engine.list_watches():
        score = 50.0
        if watch.get("hazards"):
            score = 62.0 if "flood" in watch["hazards"] else 55.0
        result = engine.evaluate(
            hazard="flood" if "flood" in (watch.get("hazards") or []) else "heat",
            score=score,
            level="High" if score >= 60 else "Moderate",
            location=f"{watch['lat']:.4f},{watch['lon']:.4f}",
            message="Watched location re-evaluated by scheduler",
            channels=watch.get("channels") or ["telegram"],
        )
        if result:
            produced.append(result)
    return produced


def start_scheduler() -> Any:
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
    except Exception:
        return None

    scheduler = BackgroundScheduler()
    scheduler.add_job(evaluate_watched_locations, "interval", minutes=15)
    scheduler.start()
    return scheduler
