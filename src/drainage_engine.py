"""
Climate Guard AI - Drainage Network Engine
Implements urban hydraulic balancing and culvert blockage signature detection:
- Inflow vs. Culvert Discharge balancing
- Blockage signature: Water level rising while discharge drops
- Urban flood risk scoring for Nashik municipal stormlines and underpasses
- Emergency crew and pump station dispatch triggers.
"""

from typing import Any, Dict, List

NASHIK_DRAINAGE_NODES = {
    "Saraf Bazar Storm Culvert": {
        "lat": 20.0050, "lon": 73.7920, "capacity_lpm": 3200, "critical_depth_cm": 75,
        "type": "Masonry Box Culvert", "catchment_type": "Dense Commercial Market"
    },
    "CBS Circle Underpass Drain": {
        "lat": 19.9980, "lon": 73.7850, "capacity_lpm": 4500, "critical_depth_cm": 90,
        "type": "Reinforced RCC Pipe & Sump", "catchment_type": "Major Traffic Hub"
    },
    "Shalimar Chowk Arterial Conduit": {
        "lat": 19.9940, "lon": 73.7890, "capacity_lpm": 2800, "critical_depth_cm": 65,
        "type": "Covered Open Drain", "catchment_type": "High Siltation Zone"
    },
    "Mumbai Naka Highway Underpass": {
        "lat": 19.9820, "lon": 73.7780, "capacity_lpm": 5200, "critical_depth_cm": 110,
        "type": "High-Volume Culvert + Storm Pump", "catchment_type": "National Highway Junction"
    },
    "Panchavati Market Outfall": {
        "lat": 20.0110, "lon": 73.7960, "capacity_lpm": 3600, "critical_depth_cm": 80,
        "type": "Riverfront Gravity Outfall", "catchment_type": "Riparian Lowland"
    }
}


def evaluate_drainage_health(
    node_name: str,
    water_depth_cm: float,
    measured_flow_lpm: float,
    upstream_rain_mm_h: float
) -> Dict[str, Any]:
    node = NASHIK_DRAINAGE_NODES.get(node_name, NASHIK_DRAINAGE_NODES["Saraf Bazar Storm Culvert"])
    cap_lpm = node["capacity_lpm"]
    crit_depth = node["critical_depth_cm"]

    # Hydraulic physics expected flow (Manning's / Torricelli proxy)
    # Under free flow: Flow ~ C * sqrt(depth) + rainfall inflow
    depth_fraction = min(water_depth_cm / max(crit_depth, 1.0), 1.5)
    expected_flow = cap_lpm * (depth_fraction ** 0.5) * 0.75 + (upstream_rain_mm_h * 25.0)

    # Hydraulic Blockage Discrepancy:
    # If water depth is high (> 40% critical) but measured flow is significantly below expected (< 60% of expected)
    is_blocked = False
    blockage_pct = 0.0

    if water_depth_cm > (crit_depth * 0.35):
        if measured_flow_lpm < (expected_flow * 0.65):
            is_blocked = True
            blockage_pct = round(max(0.0, min(100.0, (1.0 - (measured_flow_lpm / max(expected_flow, 1.0))) * 100.0)), 1)

    # Severity determination
    if water_depth_cm >= crit_depth and is_blocked:
        severity = "Critical Inundation / Severe Choke"
        color = "#ef4444"
        badge = "🚨 SEVERE BLOCKAGE / FLOOD HAZARD"
    elif is_blocked:
        severity = "Partial Blockage Detected"
        color = "#f59e0b"
        badge = "⚠️ PARTIAL SILTATION WARNING"
    elif water_depth_cm >= (crit_depth * 0.85):
        severity = "High Water Level (Near Capacity)"
        color = "#f59e0b"
        badge = "🟠 HIGH FLOW SURGE"
    else:
        severity = "Normal Free Flow"
        color = "#10b981"
        badge = "✅ CLEAR DRAINAGE FLOW"

    actions = []
    if "Severe" in severity:
        actions.append("Dispatch NMC Jetting & Suction Machine to clear trash screen.")
        actions.append("Activate auxiliary diesel dewatering pump at sump pit.")
        actions.append("Issue traffic detour advisory for low-lying underpass.")
    elif "Partial" in severity:
        actions.append("Schedule municipal manual declogging within 2 hours.")
        actions.append("Monitor silt accumulation telemetry rate.")
    else:
        actions.append("Culvert hydraulic discharge operates within design parameters.")

    return {
        "node": node_name,
        "water_depth_cm": water_depth_cm,
        "critical_depth_cm": crit_depth,
        "measured_flow_lpm": measured_flow_lpm,
        "expected_flow_lpm": round(expected_flow, 1),
        "capacity_lpm": cap_lpm,
        "is_blocked": is_blocked,
        "blockage_pct": blockage_pct,
        "severity": severity,
        "color": color,
        "badge": badge,
        "actions": actions,
        "culvert_type": node["type"],
        "catchment_type": node["catchment_type"]
    }
