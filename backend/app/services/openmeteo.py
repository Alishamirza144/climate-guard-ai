"""Typed clients for Open-Meteo forecast, archive, flood, and geocoding APIs."""

from __future__ import annotations

from datetime import date
from typing import Any, Sequence

from pydantic import BaseModel, ConfigDict, Field

from app.services.http import HttpClient

_FORECAST_URL = "https://api.open-meteo.com"
_ARCHIVE_URL = "https://archive-api.open-meteo.com"
_FLOOD_URL = "https://flood-api.open-meteo.com"
_GEOCODING_URL = "https://geocoding-api.open-meteo.com"

HOURLY_VARIABLES = (
    "precipitation",
    "rain",
    "temperature_2m",
    "relative_humidity_2m",
    "dew_point_2m",
    "apparent_temperature",
    "wind_speed_10m",
    "wind_gusts_10m",
    "wind_direction_10m",
    "shortwave_radiation",
    "et0_fao_evapotranspiration",
    "vapour_pressure_deficit",
    "soil_moisture_0_to_1cm",
    "soil_moisture_1_to_3cm",
    "soil_moisture_3_to_9cm",
    "soil_moisture_9_to_27cm",
    "soil_moisture_27_to_81cm",
    "soil_temperature_0cm",
    "surface_pressure",
    "cloud_cover",
)
DAILY_VARIABLES = (
    "temperature_2m_max",
    "temperature_2m_min",
    "precipitation_sum",
    "precipitation_hours",
    "et0_fao_evapotranspiration",
    "sunrise",
    "sunset",
)
FLOOD_DAILY_VARIABLES = (
    "river_discharge",
    "river_discharge_mean",
    "river_discharge_median",
    "river_discharge_max",
)

_forecast_client = HttpClient(_FORECAST_URL, timeout=20, ttl=300)
_archive_client = HttpClient(_ARCHIVE_URL, timeout=30, ttl=86400)
_flood_client = HttpClient(_FLOOD_URL, timeout=20, ttl=3600)
_geocoding_client = HttpClient(_GEOCODING_URL, timeout=10, ttl=86400)


class GeoPoint(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class ForecastResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    latitude: float
    longitude: float
    timezone: str | None = None
    current: dict[str, Any] | None = None
    current_units: dict[str, str] | None = None
    hourly: dict[str, list[str | float | int | None]] | None = None
    hourly_units: dict[str, str] | None = None
    daily: dict[str, list[str | float | int | None]] | None = None
    daily_units: dict[str, str] | None = None


class ArchiveResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    latitude: float
    longitude: float
    timezone: str | None = None
    hourly: dict[str, list[str | float | int | None]] | None = None
    hourly_units: dict[str, str] | None = None
    daily: dict[str, list[str | float | int | None]] | None = None
    daily_units: dict[str, str] | None = None


class FloodResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    latitude: float
    longitude: float
    timezone: str | None = None
    daily: dict[str, list[str | float | int | None]] | None = None
    daily_units: dict[str, str] | None = None


class GeocodingResult(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: int
    name: str
    latitude: float
    longitude: float
    country: str | None = None
    admin1: str | None = None
    timezone: str | None = None


class GeocodingResponse(BaseModel):
    results: list[GeocodingResult] = Field(default_factory=list)
    generationtime_ms: float | None = None


class ElevationResponse(BaseModel):
    elevation: list[float | None]


def _coordinate_lists(points: Sequence[GeoPoint | tuple[float, float]]) -> tuple[str, str]:
    if not points:
        raise ValueError("At least one coordinate is required")
    coordinates = [
        point
        if isinstance(point, GeoPoint)
        else GeoPoint(latitude=point[0], longitude=point[1])
        for point in points
    ]
    latitudes = ",".join(str(point.latitude) for point in coordinates)
    longitudes = ",".join(str(point.longitude) for point in coordinates)
    return latitudes, longitudes


async def get_forecast(
    lat: float,
    lon: float,
    past_days: int = 3,
    forecast_days: int = 3,
) -> ForecastResponse:
    """Fetch hourly, daily, and current forecast data for one coordinate."""
    if not 0 <= past_days <= 92:
        raise ValueError("past_days must be between 0 and 92")
    if not 0 <= forecast_days <= 16:
        raise ValueError("forecast_days must be between 0 and 16")
    point = GeoPoint(latitude=lat, longitude=lon)
    payload = await _forecast_client.get(
        "/v1/forecast",
        params={
            "latitude": point.latitude,
            "longitude": point.longitude,
            "hourly": ",".join(HOURLY_VARIABLES),
            "daily": ",".join(DAILY_VARIABLES),
            "current": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m",
            "timezone": "auto",
            "past_days": past_days,
            "forecast_days": forecast_days,
        },
    )
    return ForecastResponse.model_validate(payload)


async def get_forecast_multi(
    points: Sequence[GeoPoint | tuple[float, float]],
) -> list[ForecastResponse]:
    """Fetch forecasts for a coordinate grid in one comma-separated API request."""
    latitudes, longitudes = _coordinate_lists(points)
    payload = await _forecast_client.get(
        "/v1/forecast",
        params={
            "latitude": latitudes,
            "longitude": longitudes,
            "hourly": ",".join(HOURLY_VARIABLES),
            "daily": ",".join(DAILY_VARIABLES),
            "current": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m",
            "timezone": "auto",
        },
    )
    results = payload if isinstance(payload, list) else [payload]
    return [ForecastResponse.model_validate(item) for item in results]


async def get_archive(
    lat: float,
    lon: float,
    start: date | str,
    end: date | str,
    hourly: Sequence[str] | None = None,
    daily: Sequence[str] | None = None,
) -> ArchiveResponse:
    """Fetch selected historical hourly and/or daily variables."""
    point = GeoPoint(latitude=lat, longitude=lon)
    start_date, end_date = date.fromisoformat(str(start)), date.fromisoformat(str(end))
    if start_date > end_date:
        raise ValueError("start must be on or before end")
    if not hourly and not daily:
        raise ValueError("At least one hourly or daily variable is required")

    params: dict[str, Any] = {
        "latitude": point.latitude,
        "longitude": point.longitude,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "timezone": "auto",
    }
    if hourly:
        params["hourly"] = ",".join(hourly)
    if daily:
        params["daily"] = ",".join(daily)
    payload = await _archive_client.get("/v1/archive", params=params)
    return ArchiveResponse.model_validate(payload)


async def get_flood(
    lat: float,
    lon: float,
    past_days: int = 3,
    forecast_days: int = 3,
) -> FloodResponse:
    """Fetch daily river-discharge forecasts for a coordinate."""
    point = GeoPoint(latitude=lat, longitude=lon)
    payload = await _flood_client.get(
        "/v1/flood",
        params={
            "latitude": point.latitude,
            "longitude": point.longitude,
            "daily": ",".join(FLOOD_DAILY_VARIABLES),
            "timezone": "auto",
            "past_days": past_days,
            "forecast_days": forecast_days,
        },
    )
    return FloodResponse.model_validate(payload)


async def geocode(query: str) -> GeocodingResponse:
    """Search place names using the Open-Meteo geocoding API."""
    normalized_query = query.strip()
    if not normalized_query:
        raise ValueError("query must not be empty")
    payload = await _geocoding_client.get(
        "/v1/search",
        params={"name": normalized_query, "count": 10, "language": "en", "format": "json"},
    )
    return GeocodingResponse.model_validate(payload)


async def elevation(points: Sequence[GeoPoint | tuple[float, float]]) -> ElevationResponse:
    """Look up terrain elevation for one or more coordinates."""
    latitudes, longitudes = _coordinate_lists(points)
    payload = await _forecast_client.get(
        "/v1/elevation",
        params={"latitude": latitudes, "longitude": longitudes},
    )
    return ElevationResponse.model_validate(payload)
