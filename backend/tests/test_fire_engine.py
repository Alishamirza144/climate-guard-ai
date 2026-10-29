import math

from app.engines.fire import calculate_fwi_from_observation, ffmc, fwi_class_from_value, score_fire_risk


def test_ffmc_reference_range() -> None:
    value = ffmc(30.0, 25.0, 15.0, 0.0, 85.0)
    assert 80.0 <= value <= 98.0


def test_fwi_reference_values() -> None:
    result = calculate_fwi_from_observation(30.0, 25.0, 15.0, 0.0)
    assert result["ffmc"] > 80.0
    assert result["fwi"] >= 0.0
    assert result["fwi_class"] in {"Low", "Moderate", "High", "Very High", "Extreme"}


def test_fire_risk_scores_and_state() -> None:
    result = score_fire_risk(
        lat=29.0,
        lon=79.0,
        temp_c=35.0,
        rh=20.0,
        wind_kmh=20.0,
        rain_24h_mm=0.0,
        soil_moisture_top_layers=[18.0, 20.0, 16.0, 14.0],
        temp_normal_30d_c=28.0,
        wind_direction_deg=240.0,
    )
    assert 0.0 <= result["score"] <= 100.0
    assert 0.0 <= result["probability"] <= 1.0
    assert result["fwi_class"]
    assert result["drivers"]
    assert result["recommendations"]


def test_fire_risk_without_firms_key() -> None:
    result = score_fire_risk(
        lat=18.5,
        lon=73.8,
        temp_c=26.0,
        rh=60.0,
        wind_kmh=8.0,
        rain_24h_mm=0.0,
        soil_moisture_top_layers=[30.0, 28.0, 27.0],
        temp_normal_30d_c=25.0,
    )
    assert result["model_mode"] in {"weather-only", "weather-only/no-satellite"}
    assert result["satellite_status"] == "satellite fire data unavailable"
