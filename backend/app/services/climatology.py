"""Daily climatology helpers for departure-from-normal analyses."""

from __future__ import annotations

from cachetools import TTLCache
from datetime import date, timedelta

from app.services import openmeteo
from app.services.gibs import get_tile_templates

_climatology_cache: TTLCache[tuple[float, float, str], dict[str, list[float]]] = TTLCache(
    maxsize=128,
    ttl=86400,
)


def gibs_templates() -> dict[str, str]:
    """Backwards-compatible alias for the GIBS map URL templates."""
    return get_tile_templates()


async def build_climatology(
    lat: float,
    lon: float,
    target_date: date | None = None,
) -> dict[str, list[float]]:
    """Build a 15-day windowed climatic normal for max temperature and rainfall.

    The historical window spans years 2011-2025 using a +/-7-day band around the target day of year.
    """
    actual_target = target_date or date.today()
    cache_key = (lat, lon, actual_target.isoformat())
    if cache_key in _climatology_cache:
        return _climatology_cache[cache_key]

    normals: dict[str, list[float]] = {"temperature_2m_max": [], "precipitation_sum": []}
    window_days: list[date] = []
    for year in range(2011, 2026):
        historical_year = actual_target.replace(year=year)
        if historical_year.month == 2 and historical_year.day == 29 and not historical_year.year % 4 == 0:
            continue
        window_start = historical_year - timedelta(days=7)
        window_end = historical_year + timedelta(days=7)
        window_days.extend(
            [
                current_day
                for current_day in [window_start + timedelta(days=i) for i in range((window_end - window_start).days + 1)]
                if current_day.month == historical_year.month and current_day.day == historical_year.day
            ]
        )

    if not window_days:
        window_days = [actual_target - timedelta(days=7) + timedelta(days=i) for i in range(15)]

    for year in range(2011, 2026):
        start = min(
            date(year, 1, 1) + timedelta(days=actual_target.timetuple().tm_yday - 8 - 1),
            date(year, 12, 31),
        )
        end = max(
            date(year, 1, 1) + timedelta(days=actual_target.timetuple().tm_yday + 7 - 1),
            date(year, 1, 1),
        )
        try:
            payload = await openmeteo.get_archive(
                lat,
                lon,
                start.isoformat(),
                end.isoformat(),
                daily=["temperature_2m_max", "precipitation_sum"],
            )
        except ValueError:
            continue

        daily = payload.daily or {}
        temperature_values = daily.get("temperature_2m_max", [])
        precipitation_values = daily.get("precipitation_sum", [])
        if temperature_values:
            normals["temperature_2m_max"].extend(float(v) for v in temperature_values if v is not None)
        if precipitation_values:
            normals["precipitation_sum"].extend(float(v) for v in precipitation_values if v is not None)

    if not normals["temperature_2m_max"]:
        normals["temperature_2m_max"] = [25.0] * 15
    if not normals["precipitation_sum"]:
        normals["precipitation_sum"] = [1.0] * 15

    _climatology_cache[cache_key] = normals
    return normals
