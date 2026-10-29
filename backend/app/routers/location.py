"""Location geocoding and reverse-geocoding endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.services import nominatim, openmeteo

router = APIRouter(tags=["location"])


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
