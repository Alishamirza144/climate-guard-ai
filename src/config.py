"""
Climate Guard AI - Configuration Module
Defines system paths, station metadata, hydrological thresholds,
feature schemas, and operational limitation notices for Nashik, Maharashtra.
"""

from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
MODELS_DIR = BASE_DIR / "models"

# Ensure directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# File Paths
SYNTHETIC_DATA_PATH = DATA_DIR / "synthetic_nashik_flood_data.csv"
MODEL_PATH = MODELS_DIR / "flood_rf_model.joblib"
MODEL_METADATA_PATH = MODELS_DIR / "model_metadata.json"
HISTORICAL_SOURCES_JSON = DATA_DIR / "historical_sources_manifest.json"

# Mandatory Dataset Schema Column Definitions
SCHEMA_COLUMNS = [
    "timestamp",
    "location",
    "rainfall_mm",
    "rainfall_intensity_mm_h",
    "river_water_level_m",
    "water_level_change_rate_m_h",
    "soil_moisture_pct",
    "elevation_m",
    "slope_deg",
    "flow_rate_cusecs",
    "flood_label",
    "flood_severity",
    "is_synthetic"
]

FEATURE_COLUMNS = [
    "rainfall_mm",
    "rainfall_intensity_mm_h",
    "river_water_level_m",
    "water_level_change_rate_m_h",
    "soil_moisture_pct",
    "elevation_m",
    "slope_deg",
    "flow_rate_cusecs"
]

TARGET_COLUMN = "flood_label"

# Station Geographical & Hydrological Profiles for Nashik
# Based on Godavari River course from Gangapur Dam to downstream Niphad
NASHIK_STATIONS = {
    "Ramkund (Panchavati)": {
        "lat": 20.0077,
        "lon": 73.7915,
        "elevation_m": 560.0,
        "slope_deg": 1.2,
        "warning_gauge_m": 6.5,   # Blue Line equivalent
        "danger_gauge_m": 8.5,    # Red Line equivalent (Dutondya Maruti chest level)
        "warning_discharge_cusecs": 20000,
        "danger_discharge_cusecs": 35000,
        "description": "Historical ghats along Godavari. Highest vulnerability to dam discharge backwater.",
        "risk_zone": "High Urban Vulnerability"
    },
    "Holkar Bridge": {
        "lat": 20.0125,
        "lon": 73.7980,
        "elevation_m": 558.0,
        "slope_deg": 1.5,
        "warning_gauge_m": 6.8,
        "danger_gauge_m": 8.8,
        "warning_discharge_cusecs": 22000,
        "danger_discharge_cusecs": 38000,
        "description": "Critical urban vehicular bridge connecting Panchavati and Old Nashik.",
        "risk_zone": "High Urban Vulnerability"
    },
    "Someshwar (Gangapur Rd)": {
        "lat": 20.0315,
        "lon": 73.7432,
        "elevation_m": 585.0,
        "slope_deg": 3.5,
        "warning_gauge_m": 5.0,
        "danger_gauge_m": 7.0,
        "warning_discharge_cusecs": 18000,
        "danger_discharge_cusecs": 32000,
        "description": "Upstream gorge and temple area near waterfall entry to city.",
        "risk_zone": "Moderate Vulnerability"
    },
    "Tapovan (Kapila Sangam)": {
        "lat": 19.9982,
        "lon": 73.8156,
        "elevation_m": 552.0,
        "slope_deg": 1.8,
        "warning_gauge_m": 6.0,
        "danger_gauge_m": 8.0,
        "warning_discharge_cusecs": 25000,
        "danger_discharge_cusecs": 40000,
        "description": "Confluence point of Godavari and Kapila rivers. Backflow hazard during peak rainfall.",
        "risk_zone": "High Urban Vulnerability"
    },
    "Gangapur Dam Catchment": {
        "lat": 20.0489,
        "lon": 73.6890,
        "elevation_m": 610.0,
        "slope_deg": 4.8,
        "warning_gauge_m": 4.0,
        "danger_gauge_m": 5.5,
        "warning_discharge_cusecs": 15000,
        "danger_discharge_cusecs": 30000,
        "description": "Primary reservoir regulating Godavari flow into Nashik. Critical inflow driver from Trimbak.",
        "risk_zone": "Hydrological Control Point"
    },
    "Saykheda (Niphad Downstream)": {
        "lat": 20.0890,
        "lon": 74.0520,
        "elevation_m": 540.0,
        "slope_deg": 0.8,
        "warning_gauge_m": 7.5,
        "danger_gauge_m": 9.5,
        "warning_discharge_cusecs": 30000,
        "danger_discharge_cusecs": 50000,
        "description": "Low-lying downstream agricultural flood basin subject to prolonged inundation.",
        "risk_zone": "Severe Rural Basin Vulnerability"
    },
    "Trimbakeshwar (Upper Catchment)": {
        "lat": 19.9320,
        "lon": 73.5300,
        "elevation_m": 720.0,
        "slope_deg": 6.8,
        "warning_gauge_m": 3.8,
        "danger_gauge_m": 5.2,
        "warning_discharge_cusecs": 10000,
        "danger_discharge_cusecs": 18000,
        "description": "Origin of Godavari River in Brahmagiri Hills. Heaviest Western Ghats orographic precipitation zone; headwater surge indicator.",
        "risk_zone": "High Catchment Flash-Flood Zone"
    },
    "Darna Confluence (Chehdi)": {
        "lat": 19.9620,
        "lon": 73.8650,
        "elevation_m": 548.0,
        "slope_deg": 1.1,
        "warning_gauge_m": 6.2,
        "danger_gauge_m": 8.2,
        "warning_discharge_cusecs": 24000,
        "danger_discharge_cusecs": 40000,
        "description": "Confluence of Godavari and Darna rivers. Backwater confluence surge zone causing inundation in southern Nashik and Bhagur.",
        "risk_zone": "High Tributary Confluence Vulnerability"
    }
}

# Machine Learning Training Hyperparameters (Tuned via TimeSeriesSplit CV on Training Set)
RANDOM_SEED = 42
RF_N_ESTIMATORS = 100
RF_MAX_DEPTH = 10
RF_MIN_SAMPLES_SPLIT = 2
RF_MIN_SAMPLES_LEAF = 2
CHRONOLOGICAL_SPLIT_RATIO = 0.80  # 80% train (earlier dates), 20% test (latest dates)

# Data Limitations & Disclaimers
SYSTEM_DISCLAIMER = (
    "NOTICE: This system provides algorithmic decision support for flood risk estimation in Nashik. "
    "In demo mode, physics-consistent synthetic benchmark datasets are utilized. "
    "Never treat synthetic benchmark results as official real-time meteorological forecasts. "
    "Always adhere to official directives from the Nashik Municipal Corporation (NMC), "
    "District Disaster Management Authority (DDMA), and Water Resources Department (WRD) Maharashtra."
)

MISSING_DATA_THRESHOLDS = {
    "max_allowed_consecutive_nans": 3,
    "stale_telemetry_hours_warning": 6,
    "flow_rate_spike_multiplier": 3.0
}
