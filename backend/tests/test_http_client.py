"""Unit tests for the generic HttpClient wrapper."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.services.http import HttpClient


@pytest.mark.asyncio
async def test_http_client_caches_response() -> None:
    """Second call must return the cached value without a network hit."""
    client = HttpClient(base_url="https://example.com", ttl=60)
    fake_data = {"hello": "world"}

    with patch.object(client, "_fetch", new=AsyncMock(return_value=fake_data)) as mock_fetch:
        r1 = await client.get("/test")
        r2 = await client.get("/test")

    assert r1 == fake_data
    assert r2 == fake_data
    mock_fetch.assert_called_once()  # only one real fetch


@pytest.mark.asyncio
async def test_http_client_no_cache() -> None:
    """cache=False must always call _fetch."""
    client = HttpClient(base_url="https://example.com", ttl=60)
    fake_data = {"n": 1}

    with patch.object(client, "_fetch", new=AsyncMock(return_value=fake_data)) as mock_fetch:
        await client.get("/test", cache=False)
        await client.get("/test", cache=False)

    assert mock_fetch.call_count == 2
