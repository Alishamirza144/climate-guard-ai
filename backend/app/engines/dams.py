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
    # ── PUNE REGION ──
    "khadakwasla": {
        "id": "khadakwasla",
        "name": "Khadakwasla Dam",
        "river": "Mutha River",
        "location": "Khadakwasla, Pune",
        "lat": 18.4410,
        "lon": 73.7620,
        "total_capacity_mcm": 56.00,
        "total_capacity_tmc": 1.97,
        "current_storage_mcm": 42.50,
        "frl_m": 582.40,
        "current_water_level_m": 580.10,
        "inflow_cusecs": 520.0,
        "outflow_cusecs": 700.0,
        "spillway_gates": 11,
        "catchment_sq_km": 501.0,
        "downstream_warning_discharge_cusecs": 12000.0,
        "downstream_danger_discharge_cusecs": 28000.0,
        "primary_purpose": "Pune City Core Drinking Water Supply",
        "data_source": "Maharashtra WRD (Pune Division)",
        "is_demonstration": True,
    },
    "panshet": {
        "id": "panshet",
        "name": "Panshet Dam (Tanajisagar)",
        "river": "Ambi River",
        "location": "Velhe, Pune",
        "lat": 18.3750,
        "lon": 73.6180,
        "total_capacity_mcm": 303.00,
        "total_capacity_tmc": 10.65,
        "current_storage_mcm": 235.80,
        "frl_m": 636.50,
        "current_water_level_m": 632.10,
        "inflow_cusecs": 410.0,
        "outflow_cusecs": 550.0,
        "spillway_gates": 4,
        "catchment_sq_km": 119.0,
        "downstream_warning_discharge_cusecs": 15000.0,
        "downstream_danger_discharge_cusecs": 30000.0,
        "primary_purpose": "Pune Municipal Supply & Mutha Basin Regulation",
        "data_source": "Maharashtra WRD (Pune Division)",
        "is_demonstration": True,
    },
    "pavana": {
        "id": "pavana",
        "name": "Pavana Dam",
        "river": "Pavana River",
        "location": "Maval, Pune / PCMC",
        "lat": 18.6750,
        "lon": 73.4980,
        "total_capacity_mcm": 271.00,
        "total_capacity_tmc": 9.57,
        "current_storage_mcm": 208.50,
        "frl_m": 612.80,
        "current_water_level_m": 609.40,
        "inflow_cusecs": 350.0,
        "outflow_cusecs": 480.0,
        "spillway_gates": 6,
        "catchment_sq_km": 113.0,
        "downstream_warning_discharge_cusecs": 14000.0,
        "downstream_danger_discharge_cusecs": 28000.0,
        "primary_purpose": "Pimpri-Chinchwad (PCMC) Municipal Water Supply",
        "data_source": "Maharashtra WRD",
        "is_demonstration": True,
    },
    # ── MUMBAI / MMR REGION ──
    "bhatsa": {
        "id": "bhatsa",
        "name": "Bhatsa Dam",
        "river": "Bhatsa River",
        "location": "Shahapur, Thane / Mumbai Region",
        "lat": 19.5250,
        "lon": 73.2560,
        "total_capacity_mcm": 976.10,
        "total_capacity_tmc": 34.40,
        "current_storage_mcm": 745.20,
        "frl_m": 142.07,
        "current_water_level_m": 139.80,
        "inflow_cusecs": 780.0,
        "outflow_cusecs": 950.0,
        "spillway_gates": 5,
        "catchment_sq_km": 388.0,
        "downstream_warning_discharge_cusecs": 25000.0,
        "downstream_danger_discharge_cusecs": 50000.0,
        "primary_purpose": "Mumbai Municipal Water (BMC) & Hydro Power",
        "data_source": "Brihanmumbai Municipal Corporation (BMC) / WRD",
        "is_demonstration": True,
    },
    "middle_vaitarna": {
        "id": "middle_vaitarna",
        "name": "Middle Vaitarna Dam",
        "river": "Vaitarna River",
        "location": "Mokhada, Palghar / MMR",
        "lat": 19.7020,
        "lon": 73.2780,
        "total_capacity_mcm": 193.50,
        "total_capacity_tmc": 6.83,
        "current_storage_mcm": 156.20,
        "frl_m": 285.00,
        "current_water_level_m": 282.40,
        "inflow_cusecs": 310.0,
        "outflow_cusecs": 420.0,
        "spillway_gates": 5,
        "catchment_sq_km": 160.0,
        "downstream_warning_discharge_cusecs": 16000.0,
        "downstream_danger_discharge_cusecs": 32000.0,
        "primary_purpose": "Mumbai Direct Piped Drinking Water",
        "data_source": "Brihanmumbai Municipal Corporation (BMC)",
        "is_demonstration": True,
    },
    "tansa": {
        "id": "tansa",
        "name": "Tansa Dam",
        "river": "Tansa River",
        "location": "Shahapur, Thane",
        "lat": 19.5540,
        "lon": 73.2720,
        "total_capacity_mcm": 145.00,
        "total_capacity_tmc": 5.12,
        "current_storage_mcm": 118.90,
        "frl_m": 128.63,
        "current_water_level_m": 126.50,
        "inflow_cusecs": 240.0,
        "outflow_cusecs": 300.0,
        "spillway_gates": 38,
        "catchment_sq_km": 136.0,
        "downstream_warning_discharge_cusecs": 15000.0,
        "downstream_danger_discharge_cusecs": 28000.0,
        "primary_purpose": "BMC Water Supply to Mumbai",
        "data_source": "BMC Hydraulic Engineer Department",
        "is_demonstration": True,
    },
    # ── NATIONAL / REGIONAL DAMS ──
    "sardar_sarovar": {
        "id": "sardar_sarovar",
        "name": "Sardar Sarovar Dam",
        "river": "Narmada River",
        "location": "Kevadia, Narmada, Gujarat",
        "lat": 21.8280,
        "lon": 73.7480,
        "total_capacity_mcm": 9460.00,
        "total_capacity_tmc": 334.00,
        "current_storage_mcm": 7250.00,
        "frl_m": 138.68,
        "current_water_level_m": 134.20,
        "inflow_cusecs": 8500.0,
        "outflow_cusecs": 9200.0,
        "spillway_gates": 30,
        "catchment_sq_km": 88000.0,
        "downstream_warning_discharge_cusecs": 150000.0,
        "downstream_danger_discharge_cusecs": 300000.0,
        "primary_purpose": "Multi-State Irrigation, Drinking Water & Power",
        "data_source": "Narmada Control Authority / CWC",
        "is_demonstration": True,
    },
    "krishnarajasagara": {
        "id": "krishnarajasagara",
        "name": "Krishnarajasagara (KRS) Dam",
        "river": "Cauvery River",
        "location": "Mandya / Mysuru, Karnataka",
        "lat": 12.4280,
        "lon": 76.5740,
        "total_capacity_mcm": 1368.00,
        "total_capacity_tmc": 48.30,
        "current_storage_mcm": 1054.00,
        "frl_m": 38.04,
        "current_water_level_m": 36.10,
        "inflow_cusecs": 1200.0,
        "outflow_cusecs": 1500.0,
        "spillway_gates": 152,
        "catchment_sq_km": 10619.0,
        "downstream_warning_discharge_cusecs": 35000.0,
        "downstream_danger_discharge_cusecs": 70000.0,
        "primary_purpose": "Bengaluru Drinking Water & Cauvery Irrigation",
        "data_source": "Karnataka Water Resources Department / CWC",
        "is_demonstration": True,
    },
    "nagarjuna_sagar": {
        "id": "nagarjuna_sagar",
        "name": "Nagarjuna Sagar Dam",
        "river": "Krishna River",
        "location": "Nalgonda / Guntur, Telangana/AP",
        "lat": 16.5760,
        "lon": 79.3130,
        "total_capacity_mcm": 11472.00,
        "total_capacity_tmc": 405.00,
        "current_storage_mcm": 8650.00,
        "frl_m": 179.83,
        "current_water_level_m": 175.40,
        "inflow_cusecs": 5400.0,
        "outflow_cusecs": 6200.0,
        "spillway_gates": 26,
        "catchment_sq_km": 214185.0,
        "downstream_warning_discharge_cusecs": 100000.0,
        "downstream_danger_discharge_cusecs": 250000.0,
        "primary_purpose": "Irrigation, Power & Hyderabad Municipal Reserve",
        "data_source": "Krishna River Management Board (KRMB) / CWC",
        "is_demonstration": True,
    },
    "tehri": {
        "id": "tehri",
        "name": "Tehri Dam",
        "river": "Bhagirathi River",
        "location": "Tehri Garhwal, Uttarakhand",
        "lat": 30.3780,
        "lon": 78.4800,
        "total_capacity_mcm": 3540.00,
        "total_capacity_tmc": 125.00,
        "current_storage_mcm": 2810.00,
        "frl_m": 830.00,
        "current_water_level_m": 818.50,
        "inflow_cusecs": 2200.0,
        "outflow_cusecs": 2500.0,
        "spillway_gates": 4,
        "catchment_sq_km": 7511.0,
        "downstream_warning_discharge_cusecs": 45000.0,
        "downstream_danger_discharge_cusecs": 90000.0,
        "primary_purpose": "Delhi Drinking Water (300 cusecs) & Hydro Power",
        "data_source": "THDC India / Central Water Commission",
        "is_demonstration": True,
    },
    "bhakra": {
        "id": "bhakra",
        "name": "Bhakra Dam (Gobind Sagar)",
        "river": "Sutlej River",
        "location": "Bilaspur, Himachal Pradesh",
        "lat": 31.4100,
        "lon": 76.4380,
        "total_capacity_mcm": 9621.00,
        "total_capacity_tmc": 339.70,
        "current_storage_mcm": 7450.00,
        "frl_m": 513.58,
        "current_water_level_m": 507.20,
        "inflow_cusecs": 4500.0,
        "outflow_cusecs": 5100.0,
        "spillway_gates": 4,
        "catchment_sq_km": 56980.0,
        "downstream_warning_discharge_cusecs": 50000.0,
        "downstream_danger_discharge_cusecs": 100000.0,
        "primary_purpose": "Punjab/Haryana/Delhi Irrigation & Power",
        "data_source": "Bhakra Beas Management Board (BBMB) / CWC",
        "is_demonstration": True,
    },
    "hirakud": {
        "id": "hirakud",
        "name": "Hirakud Dam",
        "river": "Mahanadi River",
        "location": "Sambalpur, Odisha",
        "lat": 21.5200,
        "lon": 83.8700,
        "total_capacity_mcm": 8136.00,
        "total_capacity_tmc": 287.00,
        "current_storage_mcm": 6210.00,
        "frl_m": 192.02,
        "current_water_level_m": 189.60,
        "inflow_cusecs": 3800.0,
        "outflow_cusecs": 4500.0,
        "spillway_gates": 98,
        "catchment_sq_km": 83400.0,
        "downstream_warning_discharge_cusecs": 80000.0,
        "downstream_danger_discharge_cusecs": 180000.0,
        "primary_purpose": "Mahanadi Delta Flood Control, Irrigation & Power",
        "data_source": "Odisha DoWR / Central Water Commission",
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


def list_all_reservoirs(lat: float | None = None, lon: float | None = None) -> list[dict[str, Any]]:
    """List all reservoirs with key storage indicators, sorted by proximity to lat/lon if provided."""
    items = []
    for res_id in RESERVOIR_CATALOG:
        summary = compute_reservoir_metrics(res_id)
        dump = summary.model_dump()
        if lat is not None and lon is not None:
            dist = (dump["lat"] - lat) ** 2 + (dump["lon"] - lon) ** 2
            dump["_dist"] = dist
        items.append(dump)
    if lat is not None and lon is not None:
        items.sort(key=lambda d: d.get("_dist", 0.0))
        for d in items:
            d.pop("_dist", None)
    return items
