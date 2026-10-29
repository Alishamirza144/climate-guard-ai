"""Overpass API client for drainage/waterway queries around a point."""

from __future__ import annotations

import math
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.services.http import HttpClient

_client = HttpClient("https://overpass-api.de", timeout=20, ttl=86400)


class OverpassFeature(BaseModel):
    model_config = ConfigDict(extra="allow")

    type: str = "Feature"
    properties: dict[str, Any] = {}
    geometry: dict[str, Any] = {}


class OverpassResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    type: str = "FeatureCollection"
    features: list[OverpassFeature] = []


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


async def query_waterways(lat: float, lon: float, radius_km: float = 3.0) -> dict[str, Any]:
    """Query waterways and culverts for a point within a radius, returning GeoJSON."""
    south, west, north, east = _bbox_for_point(lat, lon, radius_km)
    query = f"""
    [out:json][timeout:30];
    (
      way["waterway"~"^(drain|canal|stream|river|ditch)$"]({south},{west},{north},{east});
      way["culvert"~"."]({south},{west},{north},{east});
      node["waterway"~"^(drain|canal|stream|river|ditch)$"]({south},{west},{north},{east});
      node["culvert"~"."]({south},{west},{north},{east});
    );
    out geom;
    """
    try:
        payload = await _client.get("/api/interpreter", params={"data": query})
    except Exception:
        return OverpassResponse(type="FeatureCollection", features=[]).model_dump(mode="json")
    if payload.get("type") == "FeatureCollection":
        return payload

    features = []
    for element in payload.get("elements", []):
        tags = element.get("tags") or {}
        if element.get("type") in {"way", "node"} and any(
            tag_name in tags for tag_name in ("waterway", "culvert")
        ):
            features.append(_feature_for_element(element))

    return OverpassResponse(
        type="FeatureCollection",
        features=[OverpassFeature.model_validate(feature) for feature in features],
    ).model_dump(mode="json")
