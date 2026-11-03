import asyncio
import sys
from pathlib import Path

# Add backend to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.data.cities import INDIA_CITIES, CITY_BY_ID
from app.routers.hydromet import get_live_weather, get_water_levels
from app.engines.dams import list_all_reservoirs

async def test_live_telemetry():
    test_cities = ["mumbai", "pune", "nashik", "delhi", "bengaluru", "kolkata"]
    print(f"Total Indian cities configured in database: {len(INDIA_CITIES)}")
    print("=" * 80)
    
    for cid in test_cities:
        c = CITY_BY_ID[cid]
        weather = await get_live_weather(lat=c["lat"], lon=c["lon"])
        water = await get_water_levels(lat=c["lat"], lon=c["lon"], city_id=cid)
        dams = list_all_reservoirs(lat=c["lat"], lon=c["lon"])
        
        top_dam = dams[0]["name"] if dams else "None"
        top_storage = dams[0]["storage_percentage"] if dams else 0
        p = weather.get("parameters", {})
        stations = water.get("stations", [])
        st_names = [s["station_name"] for s in stations[:2]]
        
        print(f"CITY: {c['name']} ({c['state']}) | Coordinates: ({c['lat']}, {c['lon']})")
        print(f"  * Weather Status: {weather.get('status')} | Source: {weather.get('source')}")
        print(f"  * Temp: {p.get('temperature_c')} deg C | Min: {p.get('temp_min_c')} | Max: {p.get('temp_max_c')}")
        print(f"  * Humidity: {p.get('relative_humidity_pct')}% | Pressure: {p.get('surface_pressure_hpa')} hPa")
        print(f"  * Rain: {p.get('rainfall_past_24h_mm')} mm | Condition: {p.get('weather_condition')}")
        print(f"  * Soil Moisture: {p.get('soil_moisture_m3_m3')} m3/m3")
        print(f"  * River Gauges ({len(stations)} indexed): {', '.join(st_names)}")
        if stations:
            st0 = stations[0]
            print(f"      - {st0['station_name']} ({st0['river_name']}): Level = {st0['current_water_level_m']}m (Warn: {st0['warning_threshold_m']}m, Danger: {st0['danger_threshold_m']}m)")
        print(f"  * Nearest Regional Reservoir: {top_dam} (Storage: {top_storage}%)")
        print("-" * 80)

if __name__ == "__main__":
    asyncio.run(test_live_telemetry())
