from __future__ import annotations

import math

import pytest
from httpx import ASGITransport, AsyncClient

from app.engines.flood import (
    FloodRisk,
    antecedent_soil_saturation_index,
    compute_rainfall_accumulations,
    compute_river_component,
    compute_terrain_exposure,
    compute_zone_ranking,
    rainfall_class_for_24h,
    score_flood_risk,
    scs_runoff,
    weighted_physics_score,
)
from app.main import app


def test_rainfall_accumulations_1h_3h_6h_24h_and_peak() -> None:
    values = [0.0, 1.0, 2.5, 3.0, 0.5, 0.0, 4.0, 5.0, 1.0, 0.0] * 3
    result = compute_rainfall_accumulations(values)
    assert result["1h"] > 0
    assert result["3h"] > result["1h"]
    assert result["24h"] > result["6h"]
    assert result["peak_hourly_intensity_mm_h"] >= max(values)


def test_rainfall_accumulations_zero_rain() -> None:
    result = compute_rainfall_accumulations([0.0] * 25)
    assert result["1h"] == 0.0
    assert result["24h"] == 0.0
    assert result["peak_hourly_intensity_mm_h"] == 0.0


def test_rainfall_class_heavy() -> None:
    assert rainfall_class_for_24h(80.0) == "Heavy"


def test_rainfall_class_very_heavy() -> None:
    assert rainfall_class_for_24h(150.0) == "Very Heavy"


def test_rainfall_class_extremely_heavy() -> None:
    assert rainfall_class_for_24h(250.0) == "Extremely Heavy"


def test_rainfall_class_light() -> None:
    assert rainfall_class_for_24h(20.0) == "Light"


def test_soil_saturation_index_weighted_layers() -> None:
    layers = [0.10, 0.18, 0.27, 0.35, 0.42]
    result = antecedent_soil_saturation_index(layers)
    assert 0.0 <= result <= 1.0
    assert result > 0.3


def test_soil_saturation_index_missing_values() -> None:
    result = antecedent_soil_saturation_index([None, 0.15, 0.30, None, 0.55])
    assert 0.0 <= result <= 1.0


def test_soil_saturation_index_zero_values() -> None:
    result = antecedent_soil_saturation_index([0.0, 0.0, 0.0, 0.0, 0.0])
    assert result == 0.0


def test_scs_runoff_zero_rain() -> None:
    assert scs_runoff(0.0, cn=75.0) == 0.0


def test_scs_runoff_extreme_rain() -> None:
    value = scs_runoff(300.0, cn=85.0)
    assert value > 100.0
    assert value < 300.0


def test_scs_runoff_urban_cn() -> None:
    value = scs_runoff(50.0, cn=85.0)
    assert value > 0.0


def test_scs_runoff_very_low() -> None:
    value = scs_runoff(5.0, cn=70.0)
    assert value >= 0.0


def test_river_component_ratios() -> None:
    data = {"river_discharge": [100.0, 120.0, 150.0], "river_discharge_mean": 130.0, "river_discharge_max": 200.0}
    result = compute_river_component(data)
    assert result["ratio_to_mean"] > 0.0
    assert result["ratio_to_max"] > 0.0
    assert result["rising_limb_24h"] >= 0.0


def test_river_component_percentile() -> None:
    values = [10.0, 20.0, 30.0, 40.0, 50.0]
    result = compute_river_component({"river_discharge": values, "river_discharge_mean": 25.0, "river_discharge_max": 60.0})
    assert result["percentile_90day"] >= 0.0
    assert result["percentile_90day"] <= 100.0


def test_river_component_missing_data() -> None:
    result = compute_river_component({})
    assert result["ratio_to_mean"] == 0.0
    assert result["ratio_to_max"] == 0.0
    assert result["rising_limb_24h"] == 0.0


def test_terrain_exposure_low_lying() -> None:
    result = compute_terrain_exposure(
        elevation=10.0,
        median_elevation=25.0,
        nearest_waterway_m=120.0,
        waterway_density=0.3,
    )
    assert result["low_lying"] is True
    assert result["relative_elevation_m"] < 0


def test_terrain_exposure_not_low_lying() -> None:
    result = compute_terrain_exposure(
        elevation=50.0,
        median_elevation=30.0,
        nearest_waterway_m=400.0,
        waterway_density=0.8,
    )
    assert result["low_lying"] is False
    assert result["relative_elevation_m"] > 0


def test_terrain_exposure_missing_values() -> None:
    result = compute_terrain_exposure(None, None, None, None)
    assert result["low_lying"] is False
    assert result["relative_elevation_m"] == 0.0


def test_subscores_are_capped_range() -> None:
    subscores = weighted_physics_score(0.9, 0.8, 0.7, 0.6, 0.5)
    assert 0.0 <= subscores["rainfall"] <= 100.0
    assert 0.0 <= subscores["runoff"] <= 100.0
    assert 0.0 <= subscores["soil"] <= 100.0
    assert 0.0 <= subscores["river"] <= 100.0
    assert 0.0 <= subscores["terrain"] <= 100.0


def test_combined_physics_score_in_range() -> None:
    score = weighted_physics_score(90.0, 80.0, 70.0, 60.0, 50.0)["physics_score"]
    assert 0.0 <= score <= 100.0
    assert score > 65.0


def test_score_flood_risk_physics_mode() -> None:
    risk = score_flood_risk(
        rainfall_24h_mm=70.0,
        runoff_depth_mm=15.0,
        soil_saturation=0.7,
        river_ratio=1.2,
        terrain_exposure=0.6,
    )
    assert risk.model_mode == "physics"
    assert risk.score >= 0.0
    assert risk.score <= 100.0
    assert 0.0 <= risk.probability <= 1.0
    assert risk.level in {"Low", "Moderate", "High", "Critical"}
    assert risk.expected_severity


def test_score_flood_risk_ml_mode() -> None:
    risk = score_flood_risk(
        rainfall_24h_mm=90.0,
        runoff_depth_mm=18.0,
        soil_saturation=0.8,
        river_ratio=1.3,
        terrain_exposure=0.8,
        ml_probability=0.85,
        ml_validation_auc=0.76,
    )
    assert risk.model_mode == "hybrid"
    assert risk.score >= 0.0
    assert risk.score <= 100.0


def test_score_flood_risk_no_data_defaults() -> None:
    risk = score_flood_risk(0.0, 0.0, 0.0, 0.0, 0.0)
    assert risk.score == 0.0
    assert risk.probability == 0.0
    assert risk.level == "Low"


def test_compute_zone_ranking_returns_top_5() -> None:
    zones = compute_zone_ranking([
        {"name": "Riverside Area", "risk": 78.0},
        {"name": "East Zone", "risk": 88.0},
        {"name": "North Zone", "risk": 66.0},
        {"name": "West Zone", "risk": 72.0},
        {"name": "South Zone", "risk": 91.0},
        {"name": "Central Zone", "risk": 52.0},
        {"name": "Market Zone", "risk": 60.0},
    ])
    assert len(zones) == 5
    assert zones[0]["risk"] >= zones[-1]["risk"]


def test_zone_ranking_ignores_empty() -> None:
    zones = compute_zone_ranking([])
    assert zones == []


def test_flood_risk_model_dump_has_no_null_nan() -> None:
    risk = score_flood_risk(100.0, 25.0, 0.9, 1.4, 0.9)
    payload = risk.model_dump(mode="json")
    assert not any(v is None for v in payload.values())
    for value in payload.values():
        if isinstance(value, float):
            assert math.isfinite(value)


@pytest.mark.asyncio
async def test_flood_risk_route(monkeypatch) -> None:
    class FakeForecast:
        current = {"temperature_2m": 28.0, "relative_humidity_2m": 70, "precipitation": 18.0}
        hourly = {
            "time": [f"2026-10-25T{i:02d}:00" for i in range(24)],
            "precipitation": [1.0] * 24,
        }
        daily = {"temperature_2m_max": [30.0], "temperature_2m_min": [24.0], "precipitation_sum": [25.0]}

    async def fake_forecast(*args, **kwargs):
        return FakeForecast()

    async def fake_flood(*args, **kwargs):
        return {"daily": {"river_discharge": [120.0], "river_discharge_mean": [90.0], "river_discharge_max": [160.0]}}

    async def fake_elevation(*args, **kwargs):
        class Elevation:
            elevation = [40.0]

        return Elevation()

    async def fake_waterways(*args, **kwargs):
        return {"type": "FeatureCollection", "features": [{"properties": {"waterway": "river"}}]}

    monkeypatch.setattr("app.routers.risk.openmeteo.get_forecast", fake_forecast)
    monkeypatch.setattr("app.routers.risk.openmeteo.get_flood", fake_flood)
    monkeypatch.setattr("app.routers.risk.openmeteo.elevation", fake_elevation)
    monkeypatch.setattr("app.routers.risk.overpass.query_waterways", fake_waterways)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/risk/flood?lat=19.9975&lon=73.7898")

    assert response.status_code == 200
    payload = response.json()
    assert payload["score"] >= 0.0
    assert payload["level"]
    assert payload["model_mode"]
    assert payload["drivers"]
