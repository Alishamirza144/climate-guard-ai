"""Spatial grid helper used to build a local heat-map around a user-selected point."""

from __future__ import annotations

import math
from statistics import median
from typing import Any

from app.services import openmeteo


async def build_grid(
    lat: float,
    lon: float,
    radius_km: float = 10.0,
    n: int = 7,
) -> dict[str, Any]:
    """Build an n x n spatial grid around a point with terrain and risk metadata.

    The response is in GeoJSON FeatureCollection form, with a heat array of
    [lat, lon, intensity 0..1] used by the frontend map renderer.
    """
    if n < 2:
        raise ValueError("n must be at least 2")
    if radius_km <= 0:
        raise ValueError("radius_km must be positive")

    lat_span = radius_km / 111.32
    lon_span = radius_km / (111.32 * max(math.cos(math.radians(lat)), 0.2))
    lat_step = (2 * lat_span) / (n - 1)
    lon_step = (2 * lon_span) / (n - 1)

    points: list[tuple[float, float]] = []
    for row in range(n):
        for col in range(n):
            current_lat = lat - lat_span + row * lat_step
            current_lon = lon - lon_span + col * lon_step
            points.append((current_lat, current_lon))

    forecast_points = await openmeteo.get_forecast_multi(points)
    elevation_points = await openmeteo.elevation(points)
    elevation_values = []
    for value in elevation_points.elevation:
        if value is not None:
            elevation_values.append(float(value))
    base_elev = median(elevation_values) if elevation_values else 0.0

    features: list[dict[str, Any]] = []
    heat: list[list[float]] = []

    for index, (point_lat, point_lon) in enumerate(points):
        forecast = forecast_points[index] if index < len(forecast_points) else None
        current = forecast.current if forecast else None
        temperature = float(current["temperature_2m"]) if current and current.get("temperature_2m") is not None else 0.0
        precipitation = float(current["precipitation"]) if current and current.get("precipitation") is not None else 0.0
        elevation = float(elevation_points.elevation[index]) if index < len(elevation_points.elevation) and elevation_points.elevation[index] is not None else 0.0
        relative_elevation = elevation - base_elev
        low_lying = relative_elevation < -5.0

        north = points[index - n] if index >= n else None
        south = points[index + n] if index + n < len(points) else None
        east = points[index + 1] if (index + 1) % n != 0 else None
        west = points[index - 1] if index % n != 0 else None
        deltas: list[float] = []
        for neighbor in (north, south, east, west):
            if neighbor is None:
                continue
            neighbor_elev = float(elevation_points.elevation[points.index(neighbor)]) if neighbor in points and points.index(neighbor) < len(elevation_points.elevation) and elevation_points.elevation[points.index(neighbor)] is not None else elevation
            deltas.append(abs(elevation - neighbor_elev) / max(1.0, (math.dist((point_lat, point_lon), neighbor) * 111.32), 1.0))
        slope = sum(deltas) / len(deltas) if deltas else 0.0

        temp_norm = min(max((temperature + 10.0) / 40.0, 0.0), 1.0)
        rain_norm = min(max(precipitation / 30.0, 0.0), 1.0)
        low_lying_norm = 1.0 if low_lying else 0.0
        intensity = min(max(0.45 * temp_norm + 0.35 * rain_norm + 0.20 * low_lying_norm, 0.0), 1.0)

        heat.append([point_lat, point_lon, intensity])
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [point_lon, point_lat]},
                "properties": {
                    "row": int(index / n),
                    "col": index % n,
                    "elevation": elevation,
                    "relative_elevation": relative_elevation,
                    "low_lying": low_lying,
                    "slope": slope,
                    "temperature_2m": temperature,
                    "precipitation": precipitation,
                    "intensity": intensity,
                },
            }
        )

    return {
        "type": "FeatureCollection",
        "features": features,
        "heat": heat,
    }
