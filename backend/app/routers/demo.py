"""Local demo endpoints with offline-safe cached payloads."""

from __future__ import annotations

from fastapi import APIRouter

from app.demo import build_demo_payload, save_demo_snapshot

router = APIRouter(tags=["demo"])


@router.get("/demo")
async def get_demo_payload() -> dict[str, object]:
    payload = build_demo_payload()
    return {
        "demo_mode": True,
        "cached": True,
        "location": payload.get("location", {}),
        "scenario_id": payload.get("scenario_id"),
        "hazard": payload.get("hazard"),
        "summary": payload.get("summary", {}),
    }


@router.post("/demo/warmup")
async def warmup_demo(payload: dict[str, object] | None = None) -> dict[str, object]:
    body = dict(payload or {})
    if not body.get("scenario_id"):
        body["scenario_id"] = "flood-dam-release"
    if not body.get("hazard"):
        body["hazard"] = "flood"
    if not body.get("location"):
        body["location"] = {
            "name": "Nashik",
            "lat": 20.0110,
            "lon": 73.7900,
        }
    if not body.get("summary"):
        body["summary"] = {"score": 86.1, "level": "High", "probability": 0.89}
    path = save_demo_snapshot(body)
    return {"status": "ok", "cache_path": str(path), "payload": body}
