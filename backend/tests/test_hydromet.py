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

    monkeypatch.setattr("app.routers.hydromet.openmeteo.get_flood", fake_get_flood)
    monkeypatch.setattr("app.routers.hydromet.openmeteo.get_forecast", fake_get_forecast)

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
        params = data["parameters"]
        assert params["temperature_c"] == 29.5
        assert params["temp_max_c"] == 34.0
        assert params["temp_min_c"] == 21.0
        assert params["relative_humidity_pct"] == 62
        assert "weather_condition" in params
        assert "observation_timestamp" in data
        assert data["is_live"] is True

@pytest.mark.asyncio
async def test_water_levels_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Test for Nashik Godavari river gauge
        response = await client.get("/api/water-levels?city_id=nashik&lat=19.9975&lon=73.7898")
        assert response.status_code == 200
        data = response.json()
        assert "city" in data
        assert "stations" in data
        assert len(data["stations"]) > 0
        station = data["stations"][0]
        assert "station_name" in station
        assert "current_water_level_m" in station
        assert station["unit"] == "m"
        assert "warning_threshold_m" in station
        assert "danger_threshold_m" in station

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
        top_dam_names = [d["name"] for d in data[:4]]
        assert any("Khadakwasla" in name or "Panshet" in name or "Pavana" in name for name in top_dam_names)
