"""NASA FIRMS active fire detection client."""

from __future__ import annotations

import csv
import io
from datetime import date

import httpx
from pydantic import BaseModel, ConfigDict, Field

from app.config import get_settings



class FireDetection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    latitude: float
    longitude: float
    brightness: float
    frp: float | None = None
    confidence: int | None = None
    acq_date: date
    acq_time: str | None = None


class FireQueryResult(BaseModel):
    available: bool = True
    detections: list[FireDetection] = Field(default_factory=list)
    error: str | None = None


def parse_fire_csv(csv_text: str) -> list[FireDetection]:
    """Parse NASA FIRMS CSV output into strongly typed objects."""
    reader = csv.DictReader(io.StringIO(csv_text.strip()))
    detections: list[FireDetection] = []
    for row in reader:
        if not row or not row.get("latitude"):
            continue
        detections.append(
            FireDetection(
                latitude=float(row["latitude"]),
                longitude=float(row["longitude"]),
                brightness=float(row.get("bright_t31", row.get("brightness", 0.0))),
                frp=float(row["frp"]) if row.get("frp") not in (None, "") else None,
                confidence=int(float(row["confidence"])) if row.get("confidence") not in (None, "") else None,
                acq_date=date.fromisoformat(row["acq_date"]),
                acq_time=row.get("acq_time") or None,
            )
        )
    return detections


def get_fires(
    min_lat: float,
    min_lon: float,
    max_lat: float,
    max_lon: float,
    days: int = 1,
) -> FireQueryResult:
    """Return daily VIIRS active fire detections for a bounding box.

    Returns an empty list plus available=False when the required FIRMS API key is not configured.
    """
    settings = get_settings()
    api_key = settings.firms_map_key.strip()
    if not api_key:
        return FireQueryResult(available=False, detections=[], error="FIRMS_MAP_KEY is not configured")

    if not 1 <= days <= 5:
        raise ValueError("days must be between 1 and 5")

    bbox = f"{min_lat},{min_lon},{max_lat},{max_lon}"
    url = "https://firms.modaps.eosdis.nasa.gov/api/area/csv/{api_key}/VIIRS_SNPP_NRT/{bbox}/{days}".format(
        api_key=api_key,
        bbox=bbox,
        days=days,
    )
    with httpx.Client(timeout=20.0) as client:
        response = client.get(url)
        response.raise_for_status()
        raw = response.text
    detections = parse_fire_csv(raw)
    return FireQueryResult(available=True, detections=detections)


async def get_fires_async(
    min_lat: float,
    min_lon: float,
    max_lat: float,
    max_lon: float,
    days: int = 1,
) -> FireQueryResult:
    """Async wrapper for use by routers or orchestration code."""
    return get_fires(min_lat, min_lon, max_lat, max_lon, days=days)
