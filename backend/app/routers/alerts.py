"""Alert list and watchlist routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.engines.alerts import AlertDecisionEngine

router = APIRouter(tags=["alerts"])


class WatchRequest(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lon: float = Field(..., ge=-180.0, le=180.0)
    name: str | None = None
    channels: list[str] = Field(default_factory=lambda: ["telegram"])
    hazards: list[str] = Field(default_factory=lambda: ["flood", "heat", "fire"])


engine = AlertDecisionEngine()


@router.get("/alerts")
async def list_alerts() -> dict[str, Any]:
    return {"alerts": engine.list_alerts(include_acknowledged=True)}


@router.post("/alerts/{alert_id}/ack")
async def acknowledge_alert(alert_id: int) -> dict[str, Any]:
    acked = engine.ack(alert_id)
    if acked is None:
        raise HTTPException(status_code=404, detail="alert not found")
    return {"status": "ok", "alert": acked}


@router.post("/watch")
async def add_watch(payload: WatchRequest) -> dict[str, Any]:
    return {"status": "ok", "watch": engine.add_watch(lat=payload.lat, lon=payload.lon, name=payload.name, channels=payload.channels, hazards=payload.hazards)}


@router.delete("/watch/{watch_id}")
async def delete_watch(watch_id: int) -> dict[str, Any]:
    deleted = engine.delete_watch(watch_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="watch not found")
    return {"status": "deleted", "id": watch_id}
