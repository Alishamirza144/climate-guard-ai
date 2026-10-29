from __future__ import annotations

import hashlib
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field

from app.config import get_settings
from app.middleware.security import limiter

router = APIRouter(tags=["notifications"])

_push_subscriptions: list[dict[str, Any]] = []


class PushSubscriptionPayload(BaseModel):
    endpoint: str = Field(..., min_length=10)
    keys: dict[str, str] = Field(default_factory=dict)
    auth: str | None = None


@router.post("/notifications/subscribe")
@limiter.limit("20/minute")
async def subscribe_push(
    request: Request,
    data: PushSubscriptionPayload,
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
) -> dict[str, Any]:
    expected = get_settings().iot_api_key.strip()
    if expected:
        if not x_api_key:
            raise HTTPException(status_code=401, detail="missing API key")
        hashed = hashlib.sha256(x_api_key.strip().encode("utf-8")).hexdigest()
        if hashed != hashlib.sha256(expected.strip().encode("utf-8")).hexdigest():
            raise HTTPException(status_code=401, detail="invalid API key")

    key = data.endpoint
    for index, existing in enumerate(_push_subscriptions):
        if existing.get("endpoint") == key:
            existing.update({"keys": data.keys, "auth": data.auth})
            return {"status": "ok", "subscription": existing}

    _push_subscriptions.append({"endpoint": key, "keys": data.keys, "auth": data.auth})
    return {"status": "ok", "subscription": {"endpoint": key, "keys": data.keys, "auth": data.auth}}


@router.get("/notifications/subscriptions")
async def list_subscriptions() -> dict[str, Any]:
    return {"count": len(_push_subscriptions), "subscriptions": _push_subscriptions}
