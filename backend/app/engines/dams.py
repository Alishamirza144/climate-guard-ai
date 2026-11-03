"""Dam and reservoir capacity monitoring engine for ClimateGuard AI.

Focuses on the Godavari Basin (Nashik District, Maharashtra) reservoir network:
- Gangapur Dam (Primary upstream regulator on Godavari River)
- Darna Dam (Darna river tributary regulating southern Nashik / Chehdi)
- Mukne Dam (Nashik municipal water supply reservoir)
- Kashyapi Dam (Upstream tributary supplying Gangapur reservoir)
- Girna Dam (Major northern Maharashtra catchment reservoir)

Data source attribution:
Maharashtra Water Resources Department (WRD) / Central Water Commission (CWC).
Calculates:
- Storage Percentage = (Current Storage / Total Capacity) * 100
- Available Storage = Total Capacity - Current Storage
- Downstream Flood Risk Factor (cusecs spillway surge probability)
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from pydantic import BaseModel, Field

# Real-world reservoir capacities from WRD Maharashtra
RESERVOIR_CATALOG: dict[str, dict[str, Any]] = {
    "gangapur": {
        "id": "gangapur",
        "name": "Gangapur Dam",
        "river": "Godavari River",
        "location": "Gangapur, Nashik (10 km upstream of Ramkund)",
        "lat": 20.0489,
        "lon": 73.6890,
        "total_capacity_mcm": 215.88,
        "total_capacity_tmc": 7.63,
        "current_storage_mcm": 155.43,
        "frl_m": 613.56,
        "current_water_level_m": 610.20,
        "inflow_cusecs": 450.0,
        "outflow_cusecs": 650.0,
        "spillway_gates": 9,
        "catchment_sq_km": 357.0,
        "downstream_warning_discharge_cusecs": 15000.0,
        "downstream_danger_discharge_cusecs": 30000.0,
        "primary_purpose": "Nashik City Drinking Water & Irrigation",
        "data_source": "Maharashtra Water Resources Department (WRD Nashik Circle)",
        "is_demonstration": True,
    },
    "darna": {
        "id": "darna",
        "name": "Darna Dam",
        "river": "Darna River",
        "location": "Igatpuri / Darna Basin, Nashik",
        "lat": 19.8242,
        "lon": 73.6789,
        "total_capacity_mcm": 202.44,
        "total_capacity_tmc": 7.15,
        "current_storage_mcm": 147.78,
        "frl_m": 539.50,
        "current_water_level_m": 536.80,
        "inflow_cusecs": 320.0,
        "outflow_cusecs": 500.0,
        "spillway_gates": 6,
        "catchment_sq_km": 404.0,
        "downstream_warning_discharge_cusecs": 18000.0,
        "downstream_danger_discharge_cusecs": 35000.0,
        "primary_purpose": "Irrigation & Darna Confluence regulation",
        "data_source": "Maharashtra Water Resources Department (WRD)",
        "is_demonstration": True,
    },
    "mukne": {
        "id": "mukne",
        "name": "Mukne Dam",
        "river": "Aundha / Mukne River",
        "location": "Igatpuri, Nashik",
        "lat": 19.7892,
        "lon": 73.6120,
        "total_capacity_mcm": 214.30,
        "total_capacity_tmc": 7.57,
        "current_storage_mcm": 160.72,
        "frl_m": 588.60,
        "current_water_level_m": 584.90,
        "inflow_cusecs": 280.0,
        "outflow_cusecs": 400.0,
        "spillway_gates": 5,
        "catchment_sq_km": 210.0,
        "downstream_warning_discharge_cusecs": 12000.0,
        "downstream_danger_discharge_cusecs": 25000.0,
        "primary_purpose": "Nashik Municipal Direct Water Pipeline",
        "data_source": "Maharashtra Water Resources Department (WRD)",
        "is_demonstration": True,
    },
    "kashyapi": {
        "id": "kashyapi",
        "name": "Kashyapi Dam",
        "river": "Kashyapi River",
        "location": "Kashyapi, Trimbak Hills, Nashik",
        "lat": 20.0890,
        "lon": 73.6120,
        "total_capacity_mcm": 41.50,
        "total_capacity_tmc": 1.47,
        "current_storage_mcm": 31.95,
        "frl_m": 630.00,
        "current_water_level_m": 627.40,
        "inflow_cusecs": 110.0,
        "outflow_cusecs": 150.0,
        "spillway_gates": 3,
        "catchment_sq_km": 62.0,
        "downstream_warning_discharge_cusecs": 6000.0,
        "downstream_danger_discharge_cusecs": 12000.0,
        "primary_purpose": "Gangapur Reservoir Feed & Water Security",
        "data_source": "Maharashtra Water Resources Department (WRD)",
        "is_demonstration": True,
    },
    "girna": {
        "id": "girna",
        "name": "Girna Dam",
        "river": "Girna River",
        "location": "Kalwan / Nandgaon, Nashik",
        "lat": 20.4890,
        "lon": 74.5200,
        "total_capacity_mcm": 609.00,
        "total_capacity_tmc": 21.50,
        "current_storage_mcm": 414.12,
        "frl_m": 398.07,
        "current_water_level_m": 393.50,
        "inflow_cusecs": 650.0,
        "outflow_cusecs": 850.0,
        "spillway_gates": 12,
        "catchment_sq_km": 4729.0,
        "downstream_warning_discharge_cusecs": 30000.0,
        "downstream_danger_discharge_cusecs": 60000.0,
        "primary_purpose": "North Maharashtra Agrarian Irrigation & Power",
        "data_source": "Maharashtra Water Resources Department (WRD)",
        "is_demonstration": True,
    },
}


class ReservoirSummary(BaseModel):
    id: str
    name: str
    river: str
    location: str
    lat: float
    lon: float
    total_capacity_mcm: float
    total_capacity_tmc: float
    current_storage_mcm: float
    current_storage_tmc: float
    storage_percentage: float
    available_storage_mcm: float
    available_storage_tmc: float
    frl_m: float
    current_water_level_m: float
    inflow_cusecs: float
    outflow_cusecs: float
    spillway_gates: int
    spillway_status: str
    downstream_threat_level: str
    downstream_warning_discharge_cusecs: float
    downstream_danger_discharge_cusecs: float
    primary_purpose: str
    data_source: str
    is_demonstration: bool
    last_updated: str
    historical_trend: list[dict[str, Any]]
    inflow_outflow_trend: list[dict[str, Any]]


def compute_reservoir_metrics(
    reservoir_id: str = "gangapur",
    custom_storage_mcm: float | None = None,
    custom_inflow: float | None = None,
    custom_outflow: float | None = None,
) -> ReservoirSummary:
    """Compute detailed reservoir telemetry, storage percent, and downstream flood risk."""
    res = RESERVOIR_CATALOG.get(reservoir_id.lower(), RESERVOIR_CATALOG["gangapur"])
    total_mcm = float(res["total_capacity_mcm"])
    
    current_mcm = custom_storage_mcm if custom_storage_mcm is not None else float(res["current_storage_mcm"])
    current_mcm = max(0.0, min(total_mcm, current_mcm))

    inflow = custom_inflow if custom_inflow is not None else float(res["inflow_cusecs"])
    outflow = custom_outflow if custom_outflow is not None else float(res["outflow_cusecs"])

    # Formula 1: Storage Percentage = (Current Storage / Total Storage Capacity) * 100
    storage_percentage = round((current_mcm / total_mcm) * 100.0, 1)

    # Formula 2: Available Storage = Total Storage Capacity - Current Storage
    available_mcm = round(total_mcm - current_mcm, 2)
    mcm_to_tmc = 0.0353147
    current_tmc = round(current_mcm * mcm_to_tmc, 2)
    available_tmc = round(available_mcm * mcm_to_tmc, 2)

    # Determine spillway operational status
    if outflow > res["downstream_danger_discharge_cusecs"]:
        spillway_status = "EMERGENCY DISCHARGE"
        threat_level = "Critical"
    elif outflow > res["downstream_warning_discharge_cusecs"]:
        spillway_status = "HIGH DISCHARGE"
        threat_level = "Warning"
    elif storage_percentage >= 85.0:
        spillway_status = "PRE-RELEASE WATCH"
        threat_level = "Watch"
    else:
        spillway_status = "REGULATED BASEFLOW"
        threat_level = "Normal"

    # 7-day storage trend
    historical_trend: list[dict[str, Any]] = []
    base_pct = storage_percentage
    for day_offset in range(7, 0, -1):
        day_pct = round(base_pct - (7 - day_offset) * 0.4, 1)
        historical_trend.append({
            "day": f"Day -{day_offset}",
            "storage_pct": max(0.0, min(100.0, day_pct)),
            "storage_mcm": round(total_mcm * (day_pct / 100.0), 1),
        })
    historical_trend.append({
        "day": "Today",
        "storage_pct": storage_percentage,
        "storage_mcm": round(current_mcm, 1),
    })

    # Inflow vs Outflow hourly comparison
    inflow_outflow_trend: list[dict[str, Any]] = [
        {"time": "00:00", "inflow_cusecs": max(0, inflow - 120), "outflow_cusecs": outflow},
        {"time": "04:00", "inflow_cusecs": max(0, inflow - 80), "outflow_cusecs": outflow},
        {"time": "08:00", "inflow_cusecs": inflow, "outflow_cusecs": outflow},
        {"time": "12:00", "inflow_cusecs": inflow + 100, "outflow_cusecs": outflow + 50},
        {"time": "16:00", "inflow_cusecs": inflow + 50, "outflow_cusecs": outflow},
        {"time": "20:00", "inflow_cusecs": inflow, "outflow_cusecs": outflow},
    ]

    return ReservoirSummary(
        id=res["id"],
        name=res["name"],
        river=res["river"],
        location=res["location"],
        lat=float(res["lat"]),
        lon=float(res["lon"]),
        total_capacity_mcm=total_mcm,
        total_capacity_tmc=float(res["total_capacity_tmc"]),
        current_storage_mcm=round(current_mcm, 2),
        current_storage_tmc=current_tmc,
        storage_percentage=storage_percentage,
        available_storage_mcm=available_mcm,
        available_storage_tmc=available_tmc,
        frl_m=float(res["frl_m"]),
        current_water_level_m=float(res["current_water_level_m"]),
        inflow_cusecs=round(inflow, 1),
        outflow_cusecs=round(outflow, 1),
        spillway_gates=int(res["spillway_gates"]),
        spillway_status=spillway_status,
        downstream_threat_level=threat_level,
        downstream_warning_discharge_cusecs=float(res["downstream_warning_discharge_cusecs"]),
        downstream_danger_discharge_cusecs=float(res["downstream_danger_discharge_cusecs"]),
        primary_purpose=res["primary_purpose"],
        data_source=res["data_source"],
        is_demonstration=res["is_demonstration"],
        last_updated=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        historical_trend=historical_trend,
        inflow_outflow_trend=inflow_outflow_trend,
    )


def list_all_reservoirs() -> list[dict[str, Any]]:
    """List all reservoirs with key storage indicators."""
    items = []
    for res_id in RESERVOIR_CATALOG:
        summary = compute_reservoir_metrics(res_id)
        items.append(summary.model_dump())
    return items
