"""
Climate Guard AI - Flood Predictor & Risk Inference Engine
Executes real-time inference on hydrological telemetry for Nashik stations.
Computes calibrated flood probability, determines risk tiers (Normal, Blue Line, Red Line),
generates official precautionary advisories, and detects missing or out-of-distribution inputs.
"""

from datetime import datetime
import json
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
import joblib
import numpy as np
import pandas as pd

from src.config import (
    MODEL_PATH,
    MODEL_METADATA_PATH,
    NASHIK_STATIONS,
    SYSTEM_DISCLAIMER
)


class FloodPredictor:
    """
    Inference and advisory engine for Nashik flood risk assessment.
    """

    def __init__(self, model_path: Optional[Path] = None, metadata_path: Optional[Path] = None):
        self.model_path = model_path or MODEL_PATH
        self.metadata_path = metadata_path or MODEL_METADATA_PATH
        self.model = None
        self.metadata = {}
        self.is_loaded = False
        self._load_model_artifacts()

    def _load_model_artifacts(self):
        """Loads serialized model and feature metadata."""
        if Path(self.model_path).exists() and Path(self.metadata_path).exists():
            self.model = joblib.load(self.model_path)
            with open(self.metadata_path, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)
            self.is_loaded = True
        else:
            self.is_loaded = False

    def predict_scenario(
        self,
        location: str,
        rainfall_mm: float,
        rainfall_intensity_mm_h: float,
        river_water_level_m: float,
        water_level_change_rate_m_h: float,
        soil_moisture_pct: float,
        flow_rate_cusecs: float,
        rain_72h_accum_mm: Optional[float] = None,
        flow_lag_12h_cusecs: Optional[float] = None,
        telemetry_timestamp: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calculates flood risk for a specific Nashik station given telemetry or simulated inputs.
        """
        if not self.is_loaded:
            raise RuntimeError("Model is not loaded. Please train or load the model first.")

        station_info = NASHIK_STATIONS.get(location, {
            "elevation_m": 560.0,
            "slope_deg": 1.5,
            "warning_gauge_m": 6.5,
            "danger_gauge_m": 8.5,
            "warning_discharge_cusecs": 20000,
            "danger_discharge_cusecs": 35000,
            "description": "Unregistered station",
            "risk_zone": "General Basin"
        })

        elev = station_info["elevation_m"]
        slope = station_info["slope_deg"]
        warning_gauge = station_info["warning_gauge_m"]
        danger_gauge = station_info["danger_gauge_m"]

        # Default causal lags and physics indicators if not explicitly provided
        r_12h = rainfall_mm * 0.7
        r_24h = rainfall_mm * 1.2
        r_72h = rain_72h_accum_mm if rain_72h_accum_mm is not None else rainfall_mm * 2.2
        f_lag_6 = flow_rate_cusecs * 0.95
        f_lag_12 = flow_lag_12h_cusecs if flow_lag_12h_cusecs is not None else flow_rate_cusecs * 0.90
        flow_accel = (flow_rate_cusecs - f_lag_6) / 6.0
        sm_deficit = max(0.0, 100.0 - soil_moisture_pct)
        runoff_pot = rainfall_intensity_mm_h * (soil_moisture_pct / 100.0)
        surge_sat = max(0.0, water_level_change_rate_m_h) * (soil_moisture_pct / 100.0)
        topo_idx = float(np.log(max(10.0, 1000.0 - elev) / np.tan(np.radians(max(slope, 0.5)))))
        gauge_ratio = river_water_level_m / warning_gauge

        # Build feature vector matching training feature names
        feature_dict = {
            "rainfall_mm": rainfall_mm,
            "rainfall_intensity_mm_h": rainfall_intensity_mm_h,
            "river_water_level_m": river_water_level_m,
            "water_level_change_rate_m_h": water_level_change_rate_m_h,
            "soil_moisture_pct": soil_moisture_pct,
            "elevation_m": elev,
            "slope_deg": slope,
            "flow_rate_cusecs": flow_rate_cusecs,
            "rain_12h_accum_mm": r_12h,
            "rain_24h_accum_mm": r_24h,
            "rain_72h_accum_mm": r_72h,
            "flow_lag_6h_cusecs": f_lag_6,
            "flow_lag_12h_cusecs": f_lag_12,
            "discharge_acceleration_cusecs_h": flow_accel,
            "soil_saturation_deficit_pct": sm_deficit,
            "runoff_generation_potential": runoff_pot,
            "surge_saturation_index": surge_sat,
            "topo_wetness_index": topo_idx,
            "gauge_to_warning_ratio": gauge_ratio
        }

        # Check feature presence against metadata
        expected_features = self.metadata.get("feature_names", list(feature_dict.keys()))
        input_df = pd.DataFrame([feature_dict])[expected_features]

        # Model Inference
        raw_prob = float(self.model.predict_proba(input_df)[0][1])

        # Hydrological Safety Floor: If physical gauge or dam discharge surpasses danger mark,
        # override probability to reflect critical inundation physics
        if river_water_level_m >= danger_gauge or flow_rate_cusecs >= station_info["danger_discharge_cusecs"]:
            calibrated_prob = max(raw_prob, 0.92)
        elif river_water_level_m >= warning_gauge or flow_rate_cusecs >= station_info["warning_discharge_cusecs"]:
            calibrated_prob = max(raw_prob, 0.65)
        else:
            calibrated_prob = raw_prob

        # Categorize Risk Tier
        if calibrated_prob >= 0.70 or river_water_level_m >= danger_gauge:
            risk_tier = "CRITICAL / RED LINE DANGER"
            risk_color = "#dc2626"  # Red
            badge = "RED ALERT (धोका पातळी)"
            severity_code = 2
        elif calibrated_prob >= 0.40 or river_water_level_m >= warning_gauge:
            risk_tier = "MODERATE / BLUE LINE WARNING"
            risk_color = "#f59e0b"  # Amber
            badge = "BLUE ALERT (इशारा पातळी)"
            severity_code = 1
        else:
            risk_tier = "LOW / NORMAL CONDITION"
            risk_color = "#10b981"  # Green
            badge = "GREEN (सुरक्षित पातळी)"
            severity_code = 0

        # Precautionary Advisories tailored to Nashik context
        advisories, actions = self._get_precautions(risk_tier, location, river_water_level_m, flow_rate_cusecs)

        # Missing & Out-Of-Distribution Sensor Checks
        sensor_warnings = self._audit_input_sensors(
            rainfall_mm, rainfall_intensity_mm_h, river_water_level_m, soil_moisture_pct, flow_rate_cusecs
        )

        return {
            "location": location,
            "timestamp": telemetry_timestamp or datetime.now().strftime("%Y-%m-%d %H:%M:%S IST"),
            "risk_tier": risk_tier,
            "risk_badge": badge,
            "risk_color": risk_color,
            "severity_code": severity_code,
            "flood_probability_pct": round(calibrated_prob * 100, 1),
            "raw_model_prob": round(raw_prob, 4),
            "sensor_telemetry": feature_dict,
            "station_profile": station_info,
            "precautions": advisories,
            "recommended_actions": actions,
            "sensor_warnings": sensor_warnings,
            "is_synthetic_model": self.metadata.get("is_synthetic_training_data", True),
            "disclaimer": SYSTEM_DISCLAIMER
        }

    def _get_precautions(self, risk_tier: str, location: str, gauge: float, flow: float) -> Tuple[List[str], List[str]]:
        """Generates localized precautionary advisories according to NMC / DDMA protocols."""
        advisories = []
        actions = []

        if "RED" in risk_tier:
            advisories = [
                f"CRITICAL RED LINE BREACH: River level ({gauge:.1f}m) or upstream discharge ({flow:,.0f} cusecs) threatens urban inundation.",
                "High flood velocity through Panchavati & Ramkund ghats with temple submergence (Dutondya Maruti chest-level).",
                "Severe backwater surging into Kapila-Godavari confluence at Tapovan and low-lying Saykheda farmlands.",
                "High probability of localized electrical shutdown and traffic bridge closures (Holkar / Victoria bridges)."
            ]
            actions = [
                "IMMEDIATE EVACUATION: Evacuate riverside shanties, shopfronts, and residents at Saraf Bazaar, Ramkund, and Tapovan to designated relief camps.",
                "ROAD CLOSURES: Close Holkar Bridge, Amrutdham underpasses, and riverfront ring roads to all civilian traffic.",
                "EMERGENCY MOBILIZATION: Alert NDRF 5th Battalion, Nashik Municipal Fire Brigade, and activate NMC Emergency Operations Centre (1077 / 0253-2578500).",
                "PUBLIC BROADCAST: Sound flood sirens across Godavari ghats and issue SMS alerts across vulnerable zones."
            ]
        elif "BLUE" in risk_tier:
            advisories = [
                f"BLUE LINE WARNING ACTIVE: River water level ({gauge:.1f}m) has reached warning thresholds.",
                "Gangapur Dam spillway gates are discharging elevated flow into the riverbed.",
                "Godavari ghat steps and lower bathing areas submerged; high river velocity.",
                "Potential waterlogging along storm drains draining into Godavari."
            ]
            actions = [
                "CLEAR GHATS: Evacuate pilgrims, vendors, and parked vehicles from Ramkund, Gandhi Talav, and Talkuteshwar ghats.",
                "RESTRICT ACCESS: Post police and civil defense personnel at riverfront access points to stop bathing.",
                "MONITOR DISCHARGE: Maintain continuous coordination with WRD Gangapur Dam flood control desk.",
                "COMMUNITY ALERT: Issue advisory to riverside commercial establishments to move inventory to upper floors."
            ]
        else:
            advisories = [
                "NORMAL OPERATIONAL CONDITIONS: River water levels and dam releases are well within normal riverbed capacity.",
                "Soil moisture levels permit standard drainage absorption.",
                "No imminent flood threat detected across Nashik urban or downstream sectors."
            ]
            actions = [
                "ROUTINE MONITORING: Continue 6-hourly hydrological telemetry logging.",
                "DRAINAGE CLEARANCE: Ensure municipal culverts and storm drains remain free of monsoon debris.",
                "CITIZEN SAFETY: Advise regular caution near slippery riverbanks during monsoon spells."
            ]

        return advisories, actions

    def _audit_input_sensors(
        self,
        rain: float,
        rain_int: float,
        gauge: float,
        sm: float,
        flow: float
    ) -> List[str]:
        """Detects anomalies, missing signals, or out-of-distribution values."""
        warnings = []
        if rain > 250.0:
            warnings.append(f"EXTREME RAINFALL VALUE: 24h Rainfall ({rain} mm) exceeds 99th percentile historical monsoon threshold.")
        if rain_int > 80.0:
            warnings.append(f"CLOUDBURST INTENSITY: Hourly rate ({rain_int} mm/h) signals localized cloudburst event.")
        if flow > 80000.0:
            warnings.append(f"CATASTROPHIC DISCHARGE: Upstream discharge ({flow:,.0f} cusecs) exceeds standard 100-year return capacity of Gangapur spillway.")
        if sm > 98.0:
            warnings.append("SOIL FULL SATURATION: Root zone soil is 100% saturated. Any incremental rainfall will directly convert to 100% surface runoff.")
        if gauge < 0.2:
            warnings.append("ANOMALOUS GAUGE LOW: Gauge reading is near zero, which may indicate sensor malfunction or telemetry transmission loss.")
        return warnings
