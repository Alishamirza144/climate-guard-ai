import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app

@pytest.fixture(autouse=True)
def mock_openmeteo(monkeypatch):
    class FakeFlood:
        daily = {"river_discharge": [35.0], "river_discharge_mean": [30.0], "river_discharge_max": [45.0]}

    class FakeForecast:
        current = {
            "temperature_2m": 29.5,
            "relative_humidity_2m": 62,
            "apparent_temperature": 31.0,
            "precipitation": 0.0,
            "rain": 0.0,
            "weather_code": 1,
            "surface_pressure": 1012.0,
            "wind_speed_10m": 14.5,
            "wind_direction_10m": 260,
        }
        daily = {
            "temperature_2m_max": [34.0],
            "temperature_2m_min": [21.0],
            "precipitation_sum": [0.0],
        }
        hourly = {
            "time": [f"2026-11-03T{i:02d}:00" for i in range(24)],
            "precipitation": [0.0] * 24,
            "soil_moisture_0_to_1cm": [0.22] * 24,
        }

    async def fake_get_flood(*args, **kwargs):
        return FakeFlood()

    async def fake_get_forecast(*args, **kwargs):
        return FakeForecast()

    async def fake_fetch_imd(*args, **kwargs):
        return {
            "is_available": True,
            "status": "Delayed observation",
            "station_id": "42921",
            "wmo_id": None,
            "station_name": "Nashik City Observatory",
            "station_lat": 20.0000,
            "station_lon": 73.7800,
            "distance_km": 1.1,
            "observation_date": "2026-11-06",
            "observation_timestamp_utc": "2026-11-06T12:30:05Z",
            "observation_timestamp_ist": "2026-11-06 18:00:05 IST",
            "age_hours": 7.8,
            "age_minutes": 468,
            "age_label": "7h 48m ago",
            "synoptic_cycle_ist": "17:30 IST Evening Synoptic Cycle",
            "next_expected_cycle_ist": "08:30 IST Morning Synoptic Cycle",
            "is_delayed": True,
            "is_stale": False,
            "warning_message": "Station records synoptically twice daily (08:30 & 17:30 IST). Showing latest recorded synoptic cycle (7h 48m ago). Instantaneous ambient conditions are provided by hourly Model Estimate.",
            "freshness": "Delayed observation (7h 48m ago)",
            "data_source": "IMD Public Surface Network Service",
            "rainfall_accumulation_window": "24 hours ending at 08:30 IST",
            "temperature_semantics": {
                "max": "Day Peak recorded at 17:30 IST",
                "min": "Day Low recorded at 08:30 IST",
            },
            "parameters": {
                "temp_max_c": 32.3,
                "temp_min_c": 17.3,
                "prevday_max_c": 33.9,
                "rainfall_past_24h_mm": 0.0,
                "relative_humidity_pct": 38.0,
            },
        }

    monkeypatch.setattr("app.routers.hydromet.openmeteo.get_flood", fake_get_flood)
    monkeypatch.setattr("app.routers.hydromet.openmeteo.get_forecast", fake_get_forecast)
    monkeypatch.setattr("app.routers.hydromet.fetch_imd_station_observation", fake_fetch_imd)

@pytest.mark.asyncio
async def test_cities_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/location/cities")
        assert response.status_code == 200
        data = response.json()
        assert "cities" in data
        assert "total" in data
        assert data["total"] >= 50
        
        # Check compulsory cities
        ids = [c["id"] for c in data["cities"]]
        assert "mumbai" in ids
        assert "pune" in ids
        assert "nashik" in ids
        assert "delhi" in ids
        assert "bengaluru" in ids
        assert "kolkata" in ids

@pytest.mark.asyncio
async def test_cities_filter_and_search():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Filter by region
        response = await client.get("/api/location/cities?region=Maharashtra")
        assert response.status_code == 200
        data = response.json()
        assert all(c["region"] == "Maharashtra" for c in data["cities"])
        
        # Search by query
        response = await client.get("/api/location/cities?q=Pune")
        assert response.status_code == 200
        data = response.json()
        assert any(c["id"] == "pune" for c in data["cities"])

@pytest.mark.asyncio
async def test_live_weather_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/weather/live?lat=19.9975&lon=73.7898")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["ONLINE", "LIVE", "live"]
        assert "parameters" in data
        assert data.get("is_direct_sensor_wire") is False
        assert "Numerical Weather Model" in data.get("data_type", "")
        params = data["parameters"]
        assert params["temperature_c"] == 29.5
        assert params["temp_max_c"] == 34.0
        assert params["temp_min_c"] == 21.0
        assert params["relative_humidity_pct"] == 62
        assert "weather_condition" in params
        assert "observation_timestamp" in data
        assert data["is_live"] is True
        # Actual observation and transparent comparison tests
        assert "actual_observation" in data
        assert "comparison" in data
        assert data["actual_observation"]["station_id"] == "42921"
        assert data["actual_observation"]["is_available"] is True
        assert data["actual_observation"]["status"] == "Delayed observation"
        assert data["comparison"]["station_distance_km"] == 1.1
        assert data["comparison"]["station_temp_max_c"] == 32.3
        assert data["comparison"]["delta_temp_max_c"] == -1.7
        assert "Synoptic 24 hours" in data["comparison"]["station_rainfall_window"]
        assert "Rolling 24 hours" in data["comparison"]["model_rainfall_window"]
        assert "instantaneous_temperature_semantics" in data["comparison"]

@pytest.mark.asyncio
async def test_weather_freshness_thresholds():
    from app.services.imd import parse_imd_observation_timing
    from datetime import datetime, timezone, timedelta

    # 1. Fresh observation (1 hour ago)
    now_utc = datetime.now(timezone.utc)
    t1 = (now_utc - timedelta(hours=1)).strftime("%Y-%m-%d %H:%M:%S")
    res1 = parse_imd_observation_timing(t1)
    assert res1["status"] == "Fresh observation"
    assert res1["is_delayed"] is False
    assert res1["is_stale"] is False
    assert res1["warning_message"] is None

    # 2. Delayed observation (7 hours ago, regular synoptic gap)
    t2 = (now_utc - timedelta(hours=7)).strftime("%Y-%m-%d %H:%M:%S")
    res2 = parse_imd_observation_timing(t2)
    assert res2["status"] == "Delayed observation"
    assert res2["is_delayed"] is True
    assert res2["is_stale"] is False
    assert "synoptically twice daily" in res2["warning_message"]

    # 3. Stale observation (18 hours ago, missed cycle)
    t3 = (now_utc - timedelta(hours=18)).strftime("%Y-%m-%d %H:%M:%S")
    res3 = parse_imd_observation_timing(t3)
    assert res3["status"] == "Stale observation"
    assert res3["is_stale"] is True
    assert "stale" in res3["warning_message"].lower()

@pytest.mark.asyncio
async def test_verified_imd_stations_coverage():
    from app.services.imd import VERIFIED_IMD_STATIONS, find_nearest_verified_station
    from app.data.cities import INDIA_CITIES

    assert len(VERIFIED_IMD_STATIONS) >= 70
    for c in INDIA_CITIES:
        st = find_nearest_verified_station(c["lat"], c["lon"], c["id"])
        assert st is not None
        assert "station_id" in st
        assert "station_name" in st
        assert "distance_km" in st
        assert st["distance_km"] < 100.0  # Station must be within 100km radius

@pytest.mark.asyncio
async def test_water_levels_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Test for Nashik Godavari river gauge
        response = await client.get("/api/water-levels?city_id=nashik&lat=19.9975&lon=73.7898")
        assert response.status_code == 200
        data = response.json()
        assert "city" in data
        assert "stations" in data
        assert data.get("is_direct_cwc_sensor") is False
        assert data.get("is_calibrated_model") is True
        assert len(data["stations"]) > 0
        station = data["stations"][0]
        assert "station_name" in station
        assert "current_water_level_m" in station
        assert station["unit"] == "m"
        assert "warning_threshold_m" in station
        assert "danger_threshold_m" in station
        assert station.get("is_direct_cwc_sensor") is False

@pytest.mark.asyncio
async def test_water_levels_unknown_location():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Specific city without rivers
        response = await client.get("/api/water-levels?city_id=nonexistent_city")
        assert response.status_code == 200
        data = response.json()
        assert "stations" in data

@pytest.mark.asyncio
async def test_dams_endpoint_prioritization():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/dams?lat=18.5204&lon=73.8567")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 5
        top_dam = data[0]
        assert top_dam.get("is_verified_live_telemetry") is False
        assert "Estimate" in top_dam.get("data_type", "")
        top_dam_names = [d["name"] for d in data[:4]]
        assert any("Khadakwasla" in name or "Panshet" in name or "Pavana" in name for name in top_dam_names)
