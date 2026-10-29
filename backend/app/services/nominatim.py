"""Nominatim reverse geocoding client with a global 1 request / second limiter."""

from __future__ import annotations

import asyncio
import time
from typing import Any

from app.services.http import HttpClient

_client = HttpClient(
    "https://nominatim.openstreetmap.org",
    timeout=15,
    ttl=86400,
    headers={"User-Agent": "ClimateGuardAI/0.1 (https://climateguard.ai)"},
)
_rate_lock = asyncio.Lock()
_last_request_at = 0.0


async def _rate_limited_get(path: str, params: dict[str, Any] | None = None) -> Any:
    global _last_request_at
    async with _rate_lock:
        now = time.monotonic()
        elapsed = now - _last_request_at
        if elapsed < 1.0:
            await asyncio.sleep(1.0 - elapsed)
        _last_request_at = time.monotonic()
        return await _client.get(path, params=params)


async def reverse_geocode(lat: float, lon: float, language: str = "en") -> dict[str, Any]:
    """Reverse geocode a lat/lon pair using Nominatim."""
    params = {
        "lat": lat,
        "lon": lon,
        "format": "jsonv2",
        "addressdetails": 1,
        "zoom": 18,
        "accept-language": language,
    }
    return await _rate_limited_get("/reverse", params=params)
