"""Typed client and daily climatology helpers for NASA POWER."""

from __future__ import annotations

from collections import defaultdict
from datetime import date
from typing import Any, Sequence

from pydantic import BaseModel, ConfigDict, Field

from app.services.http import HttpClient

_client = HttpClient(
    "https://power.larc.nasa.gov",
    timeout=30,
    ttl=86400,
    headers={"Accept": "application/json"},
)
DEFAULT_PARAMETERS = ("T2M", "T2M_MAX", "PRECTOTCORR", "RH2M", "ALLSKY_SFC_SW_DWN")


class PowerCoordinate(BaseModel):
    latitude: float
    longitude: float


class PowerGeometry(BaseModel):
    coordinates: list[float]


class PowerProperties(BaseModel):
    model_config = ConfigDict(extra="allow")

    parameter: dict[str, dict[str, float | None]]
    parameters: dict[str, dict[str, Any]] = Field(default_factory=dict)


class PowerResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    type: str | None = None
    geometry: PowerGeometry | None = None
    properties: PowerProperties


class DayOfYearNormal(BaseModel):
    day_of_year: int = Field(ge=1, le=366)
    values: dict[str, float]
    sample_count: int = Field(ge=1)


def _power_date(value: date | str) -> str:
    parsed = date.fromisoformat(str(value))
    return parsed.strftime("%Y%m%d")


async def get_daily(
    lat: float,
    lon: float,
    start: date | str,
    end: date | str,
    parameters: Sequence[str] = DEFAULT_PARAMETERS,
) -> PowerResponse:
    """Fetch daily point observations from NASA POWER (agricultural community)."""
    start_date, end_date = date.fromisoformat(str(start)), date.fromisoformat(str(end))
    if start_date > end_date:
        raise ValueError("start must be on or before end")
    if not parameters:
        raise ValueError("At least one parameter is required")
    payload = await _client.get(
        "/api/temporal/daily/point",
        params={
            "parameters": ",".join(parameters),
            "community": "AG",
            "longitude": lon,
            "latitude": lat,
            "start": _power_date(start_date),
            "end": _power_date(end_date),
            "format": "JSON",
        },
    )
    return PowerResponse.model_validate(payload)


def compute_day_of_year_normals(
    response: PowerResponse,
    parameters: Sequence[str] | None = None,
) -> list[DayOfYearNormal]:
    """Average NASA POWER observations by calendar day, ignoring -999 missing data."""
    parameter_data = response.properties.parameter
    selected = list(parameters) if parameters is not None else list(parameter_data)
    daily_values: dict[int, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))

    for parameter in selected:
        if parameter not in parameter_data:
            raise ValueError(f"Parameter {parameter!r} is not present in the POWER response")
        for date_key, value in parameter_data[parameter].items():
            if value is None or value == -999:
                continue
            observation_date = date.fromisoformat(
                f"{date_key[:4]}-{date_key[4:6]}-{date_key[6:8]}"
            )
            daily_values[observation_date.timetuple().tm_yday][parameter].append(float(value))

    normals: list[DayOfYearNormal] = []
    for day_of_year in sorted(daily_values):
        means = {
            parameter: sum(values) / len(values)
            for parameter, values in daily_values[day_of_year].items()
            if values
        }
        if means:
            sample_counts = [len(values) for values in daily_values[day_of_year].values()]
            normals.append(
                DayOfYearNormal(
                    day_of_year=day_of_year,
                    values=means,
                    sample_count=min(sample_counts),
                )
            )
    return normals
