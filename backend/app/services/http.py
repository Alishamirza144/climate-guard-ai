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
# Retry decorator: 2 attempts, quick back-off 0.5 s → 1.5 s
# ---------------------------------------------------------------------------
_RETRY = retry(
    retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError)),
    stop=stop_after_attempt(2),
    wait=wait_exponential(multiplier=0.5, min=0.5, max=1.5),
    reraise=True,
)


class HttpClient:
    """Thin wrapper around httpx.AsyncClient with connection pooling.

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
        self._stale_cache: dict[str, tuple[float, Any]] = {}
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=self._timeout,
                headers=self._headers,
                limits=httpx.Limits(max_keepalive_connections=20, max_connections=50, keepalive_expiry=60.0),
            )
        return self._client

    async def aclose(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def get(
        self,
        path: str,
        params: dict[str, Any] | None = None,
        cache: bool = True,
    ) -> Any:
        """Perform a cached, retried GET request.

        Returns parsed JSON. Raises httpx.HTTPStatusError on 4xx/5xx if no fallback is available.
        """
        url = f"{self._base_url}{path}" if self._base_url else path
        key = _cache_key(url, params)

        if cache and key in self._cache:
            log.debug("http_cache_hit", url=url)
            return self._cache[key]

        try:
            result = await self._fetch(url, params)
            if cache:
                self._cache[key] = result
                self._stale_cache[key] = (time.time(), result)
            return result
        except httpx.HTTPStatusError as exc:
            if key in self._stale_cache:
                timestamp, stale_data = self._stale_cache[key]
                log.warning("http_rate_limit_fallback_to_stale_cache", url=url, status=exc.response.status_code, age_sec=round(time.time() - timestamp, 1))
                return stale_data
            raise
        except (httpx.TimeoutException, httpx.NetworkError):
            if key in self._stale_cache:
                timestamp, stale_data = self._stale_cache[key]
                log.warning("http_network_fallback_to_stale_cache", url=url, age_sec=round(time.time() - timestamp, 1))
                return stale_data
            raise

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
        client = await self._get_client()
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
        client = await self._get_client()
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
