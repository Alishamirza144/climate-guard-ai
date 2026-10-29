"""Unit/integration tests for GET /api/health."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_health_returns_200() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/api/health")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_health_payload() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/api/health")
    data = resp.json()
    assert data["status"] == "ok"
    assert "timestamp" in data
    assert "python" in data
    assert "version" in data
