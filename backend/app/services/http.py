"""Generic async HTTP client with timeout, retry (exponential back-off) and TTL cache.

Reference: tenacity docs — https://tenacity.readthedocs.io/
Reference: httpx docs   — https://www.python-httpx.org/
"""

from __future__ import annotations

import hashlib
import json
import time
from typing import Any

import httpx
import structlog
from cachetools import TTLCache
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

log = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# In-memory TTL cache  (max 512 entries, 5-minute TTL by default)
# ---------------------------------------------------------------------------
_cache: TTLCache[str, Any] = TTLCache(maxsize=512, ttl=300)


def _cache_key(url: str, params: dict[str, Any] | None) -> str:
    raw = json.dumps({"url": url, "params": params or {}}, sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Retry decorator: 3 attempts, exponential back-off 1 s → 4 s
# ---------------------------------------------------------------------------
_RETRY = retry(
    retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError)),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=4),
    reraise=True,
)


class HttpClient:
    """Thin wrapper around httpx.AsyncClient.

    Usage::

        client = HttpClient(base_url="https://api.example.com", ttl=600)
        data = await client.get("/endpoint", params={"q": "value"})
    """

    def __init__(
        self,
        base_url: str = "",
        timeout: float = 10.0,
        ttl: int = 300,
        headers: dict[str, str] | None = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self._ttl = ttl
        self._headers = {"User-Agent": "ClimateGuard-AI/0.1.0 (resilience@climateguard.ai)", **(headers or {})}
        # Per-instance cache with custom TTL
        self._cache: TTLCache[str, Any] = TTLCache(maxsize=256, ttl=ttl)

    async def get(
        self,
        path: str,
        params: dict[str, Any] | None = None,
        cache: bool = True,
    ) -> Any:
        """Perform a cached, retried GET request.

        Returns parsed JSON. Raises httpx.HTTPStatusError on 4xx/5xx.
        """
        url = f"{self._base_url}{path}" if self._base_url else path
        key = _cache_key(url, params)

        if cache and key in self._cache:
            log.debug("http_cache_hit", url=url)
            return self._cache[key]

        result = await self._fetch(url, params)

        if cache:
            self._cache[key] = result
        return result

    async def get_text(
        self,
        path: str,
        params: dict[str, Any] | None = None,
        cache: bool = True,
    ) -> str:
        """Perform a cached, retried GET request and return its text body."""
        url = f"{self._base_url}{path}" if self._base_url else path
        key = _cache_key(url, params)

        if cache and key in self._cache:
            log.debug("http_cache_hit", host=httpx.URL(url).host)
            return self._cache[key]

        result = await self._fetch_text(url, params)

        if cache:
            self._cache[key] = result
        return result

    @_RETRY
    async def _fetch(self, url: str, params: dict[str, Any] | None) -> Any:
        t0 = time.perf_counter()
        async with httpx.AsyncClient(timeout=self._timeout, headers=self._headers) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            elapsed = time.perf_counter() - t0
            log.info(
                "http_response",
                host=resp.url.host,
                status=resp.status_code,
                elapsed_s=round(elapsed, 3),
            )
            return resp.json()

    @_RETRY
    async def _fetch_text(self, url: str, params: dict[str, Any] | None) -> str:
        t0 = time.perf_counter()
        async with httpx.AsyncClient(timeout=self._timeout, headers=self._headers) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            elapsed = time.perf_counter() - t0
            log.info(
                "http_response",
                host=resp.url.host,
                status=resp.status_code,
                elapsed_s=round(elapsed, 3),
            )
            return resp.text
