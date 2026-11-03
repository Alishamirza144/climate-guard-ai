"""Location geocoding, reverse-geocoding, and India cities directory endpoints."""

from __future__ import annotations

from typing import Any
from fastapi import APIRouter, HTTPException, Query

from app.data.cities import CITY_BY_ID, INDIA_CITIES, find_nearest_city
from app.services import nominatim, openmeteo

router = APIRouter(tags=["location"])


@router.get("/location/cities")
async def get_india_cities(
    region: str | None = Query(None, description="Filter by region (e.g. Maharashtra, North India, South India)"),
    state: str | None = Query(None, description="Filter by state name"),
    q: str | None = Query(None, description="Search query string"),
) -> dict[str, Any]:
    """Return supported Indian cities with coordinates, river monitoring stations, and reservoir links."""
    cities = INDIA_CITIES
    if region and region.lower() != "all":
        cities = [c for c in cities if c["region"].lower() == region.lower()]
    if state:
        cities = [c for c in cities if c["state"].lower() == state.lower()]
    if q and q.strip():
        term = q.strip().lower()
        cities = [
            c for c in cities
            if term in c["name"].lower() or term in c["state"].lower() or term in c["region"].lower()
        ]
    return {
        "total": len(cities),
        "cities": cities,
    }


@router.get("/location/nearest")
async def get_nearest_city(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
) -> dict[str, Any]:
    """Find the closest supported Indian city for given coordinates."""
    city = find_nearest_city(lat, lon)
    return city


@router.get("/location/city/{city_id}")
async def get_city_by_id(city_id: str) -> dict[str, Any]:
    """Return specific city metadata, rivers, and reservoir links."""
    key = city_id.lower().strip()
    if key not in CITY_BY_ID:
        raise HTTPException(status_code=404, detail=f"City '{city_id}' not found in catalog.")
    return CITY_BY_ID[key]


@router.get("/location/search")
async def search_location(q: str = Query(..., min_length=1, description="Place name to geocode")):
    results = await openmeteo.geocode(q)
    return {
        "results": [
            {
                "id": item.id,
                "name": item.name,
                "latitude": item.latitude,
                "longitude": item.longitude,
                "country": item.country,
                "admin1": item.admin1,
                "timezone": item.timezone,
            }
            for item in results.results
        ],
    }


@router.get("/location/reverse")
async def reverse_location(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
):
    result = await nominatim.reverse_geocode(lat, lon)
    return {
        "lat": lat,
        "lon": lon,
        "display_name": result.get("display_name"),
        "address": result.get("address", {}),
    }
