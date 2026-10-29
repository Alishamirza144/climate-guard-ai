from hypothesis import given, strategies as st

from app.engines.flood import score_flood_risk
from app.engines.heat import score_heat_risk


@given(
    rain_24h_mm=st.floats(min_value=0.0, max_value=500.0, allow_nan=False, allow_infinity=False),
    runoff_depth_mm=st.floats(min_value=0.0, max_value=200.0, allow_nan=False, allow_infinity=False),
    soil_saturation=st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False),
    river_ratio=st.floats(min_value=0.0, max_value=3.0, allow_nan=False, allow_infinity=False),
    terrain_exposure=st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False),
    delta_rain=st.floats(min_value=0.0, max_value=50.0, allow_nan=False, allow_infinity=False),
)
def test_flood_score_is_monotone_in_rainfall(
    rain_24h_mm: float,
    runoff_depth_mm: float,
    soil_saturation: float,
    river_ratio: float,
    terrain_exposure: float,
    delta_rain: float,
) -> None:
    base = score_flood_risk(
        rainfall_24h_mm=rain_24h_mm,
        runoff_depth_mm=runoff_depth_mm,
        soil_saturation=soil_saturation,
        river_ratio=river_ratio,
        terrain_exposure=terrain_exposure,
        affected_zone='test-zone',
        simulation_mode=True,
    )
    higher_rain = score_flood_risk(
        rainfall_24h_mm=rain_24h_mm + delta_rain,
        runoff_depth_mm=runoff_depth_mm,
        soil_saturation=soil_saturation,
        river_ratio=river_ratio,
        terrain_exposure=terrain_exposure,
        affected_zone='test-zone',
        simulation_mode=True,
    )
    assert higher_rain.score >= base.score


@given(
    temp=st.floats(min_value=20.0, max_value=55.0, allow_nan=False, allow_infinity=False),
    humidity=st.floats(min_value=10.0, max_value=98.0, allow_nan=False, allow_infinity=False),
    wind=st.floats(min_value=0.0, max_value=30.0, allow_nan=False, allow_infinity=False),
    solar=st.floats(min_value=0.0, max_value=1000.0, allow_nan=False, allow_infinity=False),
    temp_delta=st.floats(min_value=0.0, max_value=15.0, allow_nan=False, allow_infinity=False),
)
def test_heat_score_is_monotone_in_temperature(
    temp: float,
    humidity: float,
    wind: float,
    solar: float,
    temp_delta: float,
) -> None:
    base = score_heat_risk(
        tmax_c=temp,
        tmin_c=max(10.0, temp - 8.0),
        avg_temperature_c=temp,
        relative_humidity=humidity,
        wind_speed_kph=wind,
        shortwave_radiation_wm2=solar,
        tmax_normal_c=max(20.0, temp - 8.0),
        tmin_normal_c=max(10.0, temp - 12.0),
        location_name='test-loc',
        hourly_trend=[temp] * 8,
        duration_days=3,
        simulation_mode=True,
    )
    hotter = score_heat_risk(
        tmax_c=temp + temp_delta,
        tmin_c=max(10.0, temp + temp_delta - 8.0),
        avg_temperature_c=temp + temp_delta,
        relative_humidity=humidity,
        wind_speed_kph=wind,
        shortwave_radiation_wm2=solar,
        tmax_normal_c=max(20.0, temp - 8.0),
        tmin_normal_c=max(10.0, temp - 12.0),
        location_name='test-loc',
        hourly_trend=[temp + temp_delta] * 8,
        duration_days=3,
        simulation_mode=True,
    )
    assert hotter['score'] >= base['score']
