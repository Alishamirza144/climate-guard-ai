from __future__ import annotations

import pytest

from app.engines.grid import build_grid
from app.engines.interpolate import inverse_distance_weighting


@pytest.mark.asyncio
async def test_build_grid_returns_geojson_heat_surface(monkeypatch):
    async def fake_forecast(points):
        return [type("Point", (), {"current": {"temperature_2m": 31.0, "precipitation": 8.5}})() for _ in points]

    async def fake_elevation(points):
        class ElevationResult:
            elevation = [250.0] * len(points)

        return ElevationResult()

    monkeypatch.setattr("app.engines.grid.openmeteo.get_forecast_multi", fake_forecast)
    monkeypatch.setattr("app.engines.grid.openmeteo.elevation", fake_elevation)

    result = await build_grid(18.52, 73.85, radius_km=2.0, n=3)
    assert result["type"] == "FeatureCollection"
    assert len(result["features"]) == 9
    assert len(result["heat"]) == 9
    assert result["heat"][0][2] >= 0.0
    assert result["heat"][0][2] <= 1.0


def test_idw_interpolation_is_known_and_smooth():
    points = [(0.0, 0.0, 1.0), (0.0, 10.0, 5.0), (10.0, 0.0, 2.0), (10.0, 10.0, 4.0)]
    surface = inverse_distance_weighting(points, width=5, height=5, power=2.0)
    assert len(surface) == 5
    assert len(surface[0]) == 5
    assert surface[0][0] <= 1.5
    assert surface[2][2] > 2.0
    assert surface[2][2] < 5.0
