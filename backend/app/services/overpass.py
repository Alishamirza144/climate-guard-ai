"""Overpass API and Validated Local Hydrology Architecture.

Provides robust river network and drainage cartography across Indian urban basins.
Implements a multi-tier fallback architecture:
1. Live Overpass endpoint query with short timeout (if accessible).
2. Secondary mirror endpoint fallback.
3. High-resolution pre-validated local OpenStreetMap & CWC hydrographic dataset.
4. Clear separation between static geographic waterways and measured river telemetry.
"""

from __future__ import annotations

import asyncio
import math
from typing import Any

from pydantic import BaseModel, ConfigDict
import structlog

from app.data.hydrology import (
    HYDROLOGY_DATASET_TIMESTAMP,
    HYDROLOGY_SOURCE_LABEL,
    get_validated_waterways,
)
from app.services.http import HttpClient

log = structlog.get_logger(__name__)

# Primary Overpass API client
_client = HttpClient(
    "https://overpass-api.de",
    timeout=6,
    ttl=86400,
    headers={"User-Agent": "ClimateGuardAI/1.0 (+https://climateguard.ai; hydrology-research)"},
)

# Secondary Overpass mirror client
_secondary_client = HttpClient(
    "https://overpass.kumi.systems",
    timeout=6,
    ttl=86400,
    headers={"User-Agent": "ClimateGuardAI/1.0 (+https://climateguard.ai; hydrology-research)"},
)


class OverpassFeature(BaseModel):
    model_config = ConfigDict(extra="allow")

    type: str = "Feature"
    properties: dict[str, Any] = {}
    geometry: dict[str, Any] = {}


class OverpassResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    type: str = "FeatureCollection"
    features: list[OverpassFeature] = []
    metadata: dict[str, Any] = {}


def _bbox_for_point(lat: float, lon: float, radius_km: float = 3.0) -> tuple[float, float, float, float]:
    radius_degrees_lat = radius_km / 111.32
    radius_degrees_lon = radius_km / (111.32 * max(math.cos(math.radians(lat)), 1e-6))
    south = lat - radius_degrees_lat
    north = lat + radius_degrees_lat
    west = lon - radius_degrees_lon
    east = lon + radius_degrees_lon
    return south, west, north, east


def _feature_for_element(element: dict[str, Any]) -> dict[str, Any]:
    props = {"id": element.get("id"), "waterway": element.get("tags", {}).get("waterway")}
    props.update(element.get("tags", {}))
    coords = element.get("geometry")
    if element.get("type") == "node":
        geometry = {"type": "Point", "coordinates": [float(element["lon"]), float(element["lat"])]}
    elif coords:
        geometry = {
            "type": "LineString",
            "coordinates": [[float(point["lon"]), float(point["lat"])] for point in coords],
        }
    else:
        geometry = {"type": "Point", "coordinates": [0.0, 0.0]}
    return {"type": "Feature", "properties": props, "geometry": geometry}


_waterway_cache: dict[str, dict[str, Any]] = {}


async def query_waterways(
    lat: float,
    lon: float,
    radius_km: float = 3.0,
    city_hint: str | None = None,
) -> dict[str, Any]:
    """Query waterways and culverts around coordinates using multi-tier fallback.

    Guarantees that application never blocks or fails when public Overpass is down:
    1. Checks in-memory waterway cache.
    2. Tries primary Overpass API with short non-blocking timeout (0.8s).
    3. Tries secondary Overpass mirror (0.8s).
    4. Seamlessly falls back to verified OpenStreetMap & CWC local dataset.
    """
    valid_hint = city_hint.strip().lower() if isinstance(city_hint, str) and city_hint.strip() else None
    cache_key = f"{round(lat, 3)}_{round(lon, 3)}_{valid_hint or ''}"
    if cache_key in _waterway_cache:
        return _waterway_cache[cache_key]

    south, west, north, east = _bbox_for_point(lat, lon, radius_km)
    query = f"""
    [out:json][timeout:10];
    (
      way["waterway"~"^(drain|canal|stream|river|ditch)$"]({south},{west},{north},{east});
      way["culvert"~"."]({south},{west},{north},{east});
      node["waterway"~"^(drain|canal|stream|river|ditch)$"]({south},{west},{north},{east});
      node["culvert"~"."]({south},{west},{north},{east});
    );
    out geom;
    """

    payload = None

    # Tier 1: Try Primary Overpass with short timeout (0.8s)
    try:
        payload = await asyncio.wait_for(
            _client.get("/api/interpreter", params={"data": query}),
            timeout=0.8,
        )
    except Exception as exc:
        log.debug("overpass_primary_failed", error=str(exc))

    # Tier 2: Try Secondary Overpass Mirror if Primary failed (0.8s)
    if not payload or not isinstance(payload, dict):
        try:
            payload = await asyncio.wait_for(
                _secondary_client.get("/api/interpreter", params={"data": query}),
                timeout=0.8,
            )
        except Exception as exc:
            log.debug("overpass_secondary_failed", error=str(exc))

    # If an Overpass server successfully responded:
    if payload and isinstance(payload, dict):
        if payload.get("type") == "FeatureCollection" and payload.get("features"):
            payload.setdefault("metadata", {
                "source": "OpenStreetMap Overpass Live API",
                "data_type": "geographic_waterway_cartography",
                "is_measured_telemetry": False,
                "status": "LIVE_OVERPASS_API",
            })
            return payload

        elements = payload.get("elements", [])
        if elements:
            features = []
            for element in elements:
                tags = element.get("tags") or {}
                if element.get("type") in {"way", "node"} and any(
                    tag_name in tags for tag_name in ("waterway", "culvert")
                ):
                    features.append(_feature_for_element(element))

            if features:
                resp = OverpassResponse(
                    type="FeatureCollection",
                    features=[OverpassFeature.model_validate(f) for f in features],
                    metadata={
                        "source": "OpenStreetMap Overpass Live Query",
                        "data_type": "geographic_waterway_cartography",
                        "is_measured_telemetry": False,
                        "status": "LIVE_OVERPASS_API",
                    },
                )
                res_dump = resp.model_dump(mode="json")
                _waterway_cache[cache_key] = res_dump
                return res_dump

    # Tier 3: High-reliability fallback to locally stored and validated OSM & CWC hydrography
    validated = get_validated_waterways(lat, lon, radius_km, city_hint=valid_hint)
    _waterway_cache[cache_key] = validated
    return validated
