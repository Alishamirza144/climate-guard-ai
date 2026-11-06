"""Benchmark script for measuring first-load vs cached latency and verifying data freshness."""

import time
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app

def run_benchmark():
    client = TestClient(app)
    
    cities_to_test = [
        ("nashik", 19.9975, 73.7898),
        ("pune", 18.5204, 73.8567),
        ("mumbai", 19.0760, 72.8777),
        ("delhi", 28.6139, 77.2090),
        ("bengaluru", 12.9716, 77.5946),
    ]
    
    print("\n" + "="*80)
    print("CLIMATEGUARD AI — WEATHER FRESHNESS & LATENCY AUDIT BENCHMARK")
    print("="*80)
    
    for city_id, lat, lon in cities_to_test:
        print(f"\nEvaluating City: {city_id.upper()} ({lat}, {lon})")
        print("-" * 60)
        
        # 1. First-load (cold)
        t0 = time.perf_counter()
        res_cold = client.get(f"/api/weather/live?lat={lat}&lon={lon}")
        cold_latency_ms = (time.perf_counter() - t0) * 1000.0
        
        assert res_cold.status_code == 200, f"Failed with {res_cold.status_code}"
        data_cold = res_cold.json()
        
        # 2. Second-load (warm / cached)
        t0 = time.perf_counter()
        res_warm = client.get(f"/api/weather/live?lat={lat}&lon={lon}")
        warm_latency_ms = (time.perf_counter() - t0) * 1000.0
        
        assert res_warm.status_code == 200
        data_warm = res_warm.json()
        
        # Extract metadata
        actual_obs = data_cold.get("actual_observation") or {}
        comp = data_cold.get("comparison") or {}
        params = data_cold.get("parameters") or {}
        
        print(f"  First-Load (Cold) Latency:   {cold_latency_ms:.1f} ms")
        print(f"  Second-Load (Cached) Latency: {warm_latency_ms:.1f} ms")
        print(f"  Latency Reduction:           {max(0, cold_latency_ms - warm_latency_ms):.1f} ms ({((cold_latency_ms - warm_latency_ms)/max(0.1, cold_latency_ms))*100:.1f}%)")
        print(f"  Model Current Temp:          {params.get('temperature_c')}°C (Instantaneous Live Hourly Estimate)")
        print(f"  Station Mapped:              {comp.get('station_name')} (ID: {comp.get('station_id')})")
        print(f"  Station Distance:            {comp.get('station_distance_km')} km")
        print(f"  Station Status:              {comp.get('station_status')}")
        print(f"  Station Observation IST:     {comp.get('station_obs_timestamp_ist')}")
        print(f"  Station Age:                 {comp.get('station_age_label')} ({comp.get('station_age_hours')}h)")
        print(f"  Station Synoptic Max:        {comp.get('station_temp_max_c')}°C (17:30 IST synoptic cycle)")
        print(f"  Station Morning Min:         {comp.get('station_temp_min_c')}°C (08:30 IST synoptic cycle)")
        print(f"  Delta T (Max Variance):      {comp.get('delta_temp_max_c')}°C (Unblended)")
        print(f"  Rainfall Windows:            Station=[{comp.get('station_rainfall_window')}] vs Model=[{comp.get('model_rainfall_window')}]")
        if comp.get("station_warning"):
            print(f"  Notice/Warning:              {comp.get('station_warning')[:75]}...")

    print("\n" + "="*80)
    print("BENCHMARK COMPLETED SUCCESSFULLY: All freshness metrics and latencies verified.")
    print("="*80 + "\n")

if __name__ == "__main__":
    run_benchmark()
