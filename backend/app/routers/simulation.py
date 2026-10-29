"""Synthetic scenario runner used for simulation demonstrations and validation labs."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.engines.fire import score_fire_risk
from app.engines.flood import score_flood_risk
from app.engines.heat import score_heat_risk

router = APIRouter(tags=["simulation"])

SCENARIO_LIBRARY: list[dict[str, Any]] = [
    {
        "id": "cloudburst",
        "title": "Pune-style cloudburst",
        "hazard": "flood",
        "location": {"name": "Pune", "lat": 18.5204, "lon": 73.8567},
        "description": "Intense short-duration rainfall overwhelms urban drainage and creates flash flooding risk.",
        "synthetic": {
            "rainfall_24h_mm": 165.0,
            "runoff_depth_mm": 44.0,
            "soil_saturation": 0.72,
            "river_ratio": 1.8,
            "terrain_exposure": 0.68,
            "temperature_c": 31.0,
            "humidity_percent": 88.0,
            "wind_speed_kph": 18.0,
            "shortwave_radiation_wm2": 780.0,
        },
    },
    {
        "id": "flood-dam-release",
        "title": "Nashik Godavari flood with dam release",
        "hazard": "flood",
        "location": {"name": "Nashik", "lat": 20.0110, "lon": 73.7900},
        "description": "Dam release increases downstream discharge and creates a river-rise spike. ",
        "synthetic": {
            "rainfall_24h_mm": 142.0,
            "runoff_depth_mm": 36.0,
            "soil_saturation": 0.75,
            "river_ratio": 2.3,
            "terrain_exposure": 0.72,
            "temperature_c": 30.5,
            "humidity_percent": 82.0,
            "wind_speed_kph": 12.0,
            "shortwave_radiation_wm2": 720.0,
        },
    },
    {
        "id": "heatwave",
        "title": "Nagpur severe heatwave",
        "hazard": "heat",
        "location": {"name": "Nagpur", "lat": 21.1458, "lon": 79.0882},
        "description": "Urban heat builds through the day with strong daytime maxima and limited night recovery.",
        "synthetic": {
            "temperature_c": 46.0,
            "tmin_c": 29.0,
            "avg_temperature_c": 42.5,
            "relative_humidity": 33.0,
            "wind_speed_kph": 8.0,
            "shortwave_radiation_wm2": 950.0,
            "tmax_normal_c": 36.0,
            "tmin_normal_c": 24.0,
            "hourly_trend": [38.0, 40.0, 42.0, 44.5, 46.0, 45.0, 42.0, 40.0, 38.0],
        },
    },
    {
        "id": "fire",
        "title": "Uttarakhand pre-monsoon fire",
        "hazard": "fire",
        "location": {"name": "Uttarakhand", "lat": 30.3165, "lon": 78.0322},
        "description": "Dry fuel conditions, high wind, and low rainfall elevate wildfire ignition and spread risk.",
        "synthetic": {
            "temperature_c": 34.0,
            "relative_humidity": 18.0,
            "wind_kmh": 30.0,
            "rain_24h_mm": 2.0,
            "soil_moisture_top_layers": [14.0, 16.0, 18.0, 17.0, 15.0],
            "temp_normal_30d_c": 28.0,
            "wind_direction_deg": 120.0,
            "lat": 30.3165,
            "lon": 78.0322,
        },
    },
    {
        "id": "terminal-heat",
        "title": "Punjab wheat terminal heat stress",
        "hazard": "heat",
        "location": {"name": "Punjab", "lat": 30.7333, "lon": 76.7794},
        "description": "Late-season crop stress under high day temperature and low nighttime cooling.",
        "synthetic": {
            "temperature_c": 41.2,
            "tmin_c": 26.0,
            "avg_temperature_c": 39.0,
            "relative_humidity": 42.0,
            "wind_speed_kph": 10.0,
            "shortwave_radiation_wm2": 900.0,
            "tmax_normal_c": 34.0,
            "tmin_normal_c": 21.0,
            "hourly_trend": [34.0, 36.0, 38.5, 40.0, 41.2, 40.5, 38.0, 36.5, 35.0],
        },
    },
    {
        "id": "blocked-drain",
        "title": "Blocked-drain urban flooding",
        "hazard": "flood",
        "location": {"name": "Mumbai", "lat": 19.0760, "lon": 72.8777},
        "description": "A blocked stormwater line generates rapid local pooling and elevated urban runoff risk.",
        "synthetic": {
            "rainfall_24h_mm": 110.0,
            "runoff_depth_mm": 31.0,
            "soil_saturation": 0.66,
            "river_ratio": 0.92,
            "terrain_exposure": 0.86,
            "temperature_c": 29.0,
            "humidity_percent": 86.0,
            "wind_speed_kph": 14.0,
            "shortwave_radiation_wm2": 680.0,
        },
    },
]


class ScenarioRunRequest(BaseModel):
    scenario_id: str = Field(...)
    lat: float | None = Field(default=None, ge=-90.0, le=90.0)
    lon: float | None = Field(default=None, ge=-180.0, le=180.0)


def _scenario_by_id(scenario_id: str) -> dict[str, Any]:
    for scenario in SCENARIO_LIBRARY:
        if scenario["id"] == scenario_id:
            return scenario
    raise ValueError(f"Unknown scenario: {scenario_id}")


@router.get("/simulation/scenarios")
async def list_scenarios() -> dict[str, Any]:
    return {"scenarios": [
        {
            "id": item["id"],
            "title": item["title"],
            "hazard": item["hazard"],
            "location": item["location"],
            "description": item["description"],
        }
        for item in SCENARIO_LIBRARY
    ]}


@router.post("/simulation/run")
async def run_scenario(payload: ScenarioRunRequest) -> dict[str, Any]:
    scenario = _scenario_by_id(payload.scenario_id)
    synthetic = dict(scenario["synthetic"])
    location = scenario["location"]
    lat = float(payload.lat if payload.lat is not None else location["lat"])
    lon = float(payload.lon if payload.lon is not None else location["lon"])
    synthetic["lat"] = lat
    synthetic["lon"] = lon

    hazard = scenario["hazard"]
    alerts: list[dict[str, Any]] = []

    if hazard == "flood":
        result = score_flood_risk(
            rainfall_24h_mm=float(synthetic["rainfall_24h_mm"]),
            runoff_depth_mm=float(synthetic["runoff_depth_mm"]),
            soil_saturation=float(synthetic["soil_saturation"]),
            river_ratio=float(synthetic["river_ratio"]),
            terrain_exposure=float(synthetic["terrain_exposure"]),
            affected_zone=location["name"],
            lead_time_hours=24,
            hourly_trend=synthetic.get("hourly_trend", [float(synthetic["rainfall_24h_mm"]) / 2] * 8),
            simulation_mode=True,
            data_quality={"simulation_mode": True, "synthetic_weather": True, "sensor_stream": True},
        )
        alerts.append({
            "hazard": "flood",
            "level": result.level,
            "score": round(float(result.score), 1),
            "message": result.expected_severity,
        })
        summary = {
            "score": round(float(result.score), 1),
            "level": result.level,
            "probability": round(float(result.probability), 3),
            "lead_time_hours": int(result.lead_time_hours),
            "simulation_mode": True,
        }
    elif hazard == "heat":
        result = score_heat_risk(
            tmax_c=float(synthetic["temperature_c"]),
            tmin_c=float(synthetic.get("tmin_c", synthetic["temperature_c"] - 7.0)),
            avg_temperature_c=float(synthetic.get("avg_temperature_c", synthetic["temperature_c"])),
            relative_humidity=float(synthetic.get("relative_humidity", 45.0)),
            wind_speed_kph=float(synthetic.get("wind_speed_kph", 8.0)),
            shortwave_radiation_wm2=float(synthetic.get("shortwave_radiation_wm2", 700.0)),
            tmax_normal_c=float(synthetic.get("tmax_normal_c", synthetic["temperature_c"] - 5.0)),
            tmin_normal_c=float(synthetic.get("tmin_normal_c", synthetic.get("tmin_c", 24.0))),
            location_name=location["name"],
            hourly_trend=synthetic.get("hourly_trend", [float(synthetic["temperature_c"]) - 2.0] * 8),
            duration_days=4,
            simulation_mode=True,
            data_quality={"simulation_mode": True, "synthetic_weather": True, "sensor_stream": True},
        )
        alerts.append({
            "hazard": "heat",
            "level": result["level"],
            "score": round(float(result["score"]), 1),
            "message": result["headline"],
        })
        summary = {
            "score": round(float(result["score"]), 1),
            "level": result["level"],
            "probability": round(float(result["probability"]), 3),
            "lead_time_hours": 24,
            "simulation_mode": True,
        }
    else:
        result = await score_fire_risk(
            lat=lat,
            lon=lon,
            temp_c=float(synthetic["temperature_c"]),
            rh=float(synthetic.get("relative_humidity", 25.0)),
            wind_kmh=float(synthetic.get("wind_kmh", 20.0)),
            rain_24h_mm=float(synthetic.get("rain_24h_mm", 5.0)),
            soil_moisture_top_layers=synthetic.get("soil_moisture_top_layers"),
            temp_normal_30d_c=float(synthetic.get("temp_normal_30d_c", 28.0)),
            wind_direction_deg=float(synthetic.get("wind_direction_deg", 180.0)),
            simulation_mode=True,
        )
        alerts.append({
            "hazard": "fire",
            "level": result["level"],
            "score": round(float(result["score"]), 1),
            "message": result["spread_risk_hint"],
        })
        summary = {
            "score": round(float(result["score"]), 1),
            "level": result["level"],
            "probability": round(float(result["probability"]), 3),
            "lead_time_hours": 24,
            "simulation_mode": True,
        }

    return {
        "scenario_id": scenario["id"],
        "title": scenario["title"],
        "hazard": hazard,
        "location": location,
        "simulation_mode": True,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "synthetic_inputs": synthetic,
        "alerts": alerts,
        "summary": summary,
    }
