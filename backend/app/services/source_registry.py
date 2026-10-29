from __future__ import annotations

import time
from datetime import UTC, datetime
from typing import Any

import httpx

SOURCE_REGISTRY: list[dict[str, Any]] = [
    {
        "key": "open-meteo",
        "name": "Open-Meteo",
        "category": "Weather",
        "description": "Forecast and archive weather data for precipitation, temperature, humidity, and flood context.",
        "url": "https://api.open-meteo.com/v1/forecast?latitude=18.52&longitude=73.85&current=temperature_2m&timezone=auto",
    },
    {
        "key": "nasa-power",
        "name": "NASA POWER",
        "category": "Climate normals",
        "description": "Daily climatology and agricultural stress context from NASA's POWER API.",
        "url": "https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,PRECTOTCORR&community=RE&longitude=73.85&latitude=18.52&start=20240101&end=20240102&format=JSON",
    },
    {
        "key": "nasa-firms",
        "name": "NASA FIRMS",
        "category": "Fire detection",
        "description": "Thermal hotspot and active fire detections used in wildfire risk assessment.",
        "url": "https://firms.modaps.eosdis.nasa.gov/",
    },
    {
        "key": "overpass",
        "name": "OpenStreetMap Overpass",
        "category": "Hydrology",
        "description": "River and drainage-network geometry extraction for flood and urban drainage analysis.",
        "url": "https://overpass-api.de/api/interpreter?data=%5Bout%3Ajson%5D%3Bnode%5B%22waterway%22%5D%2837.76%2C-122.42%2C37.79%2C-122.38%29%3Bout%20body%3B%5D",
    },
    {
        "key": "nominatim",
        "name": "Nominatim",
        "category": "Geocoding",
        "description": "Reverse geocoding and place lookup for local risk dashboards and alerts.",
        "url": "https://nominatim.openstreetmap.org/reverse?lat=18.52&lon=73.85&format=jsonv2",
    },
]


async def get_data_source_status() -> dict[str, object]:
    """Probe every public data source and return a registry snapshot with freshness metrics."""
    sources: list[dict[str, object]] = []

    for source in SOURCE_REGISTRY:
        name = str(source["name"])
        url = str(source["url"])
        last_successful_call: str | None = None
        latency_ms: int | None = None
        status = "offline"
        description = str(source["description"])

        try:
            started = time.perf_counter()
            async with httpx.AsyncClient(timeout=3.0, follow_redirects=True) as client:
                response = await client.get(
                    url,
                    headers={"User-Agent": "ClimateGuardAI/1.0 (+https://climateguard.ai)"},
                )
            latency_ms = int((time.perf_counter() - started) * 1000)
            if response.status_code < 400:
                status = "online"
                last_successful_call = datetime.now(UTC).isoformat()
            elif response.status_code < 500:
                status = "degraded"
            else:
                status = "offline"
        except Exception:
            status = "offline"

        sources.append(
            {
                "key": source["key"],
                "name": name,
                "category": source["category"],
                "description": description,
                "url": url,
                "status": status,
                "latency_ms": latency_ms,
                "last_successful_call": last_successful_call,
            }
        )

    return {
        "generated_at": datetime.now(UTC).isoformat(),
        "source_count": len(sources),
        "healthy_count": sum(1 for item in sources if item["status"] == "online"),
        "sources": sources,
    }
