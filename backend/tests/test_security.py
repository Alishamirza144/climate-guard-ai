from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_security_headers() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
        response = await client.get('/api/health')
        assert response.status_code == 200
        assert 'strict-transport-security' in response.headers
        assert 'x-content-type-options' in response.headers
        assert 'content-security-policy' in response.headers


@pytest.mark.asyncio
async def test_validation_error_payload() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
        response = await client.get('/api/validation/backtest', params={'lat': 'invalid', 'lon': '73.85', 'event_date': '2024-06-15'})
        assert response.status_code == 422
        payload = response.json()
        assert payload['error'] == 'invalid_request'
