"""
Climate Guard AI - Dataset Schema & Validation
Ensures data integrity for hydrological telemetry in Nashik, Maharashtra.
Validates all required fields: rainfall, rainfall intensity, river water level,
water-level change, soil moisture, elevation, slope, flow rate, location,
timestamp, and verified flood labels.
"""

from typing import Dict, List, Tuple, Any
import pandas as pd
import numpy as np
from src.config import SCHEMA_COLUMNS, FEATURE_COLUMNS, NASHIK_STATIONS

# Range constraints for Nashik hydrology
NUMERICAL_CONSTRAINTS = {
    "rainfall_mm": (0.0, 600.0),                  # Max 24h monsoon rainfall
    "rainfall_intensity_mm_h": (0.0, 150.0),       # Peak hourly cloudburst/deluge
    "river_water_level_m": (0.0, 20.0),            # River gauge height
    "water_level_change_rate_m_h": (-8.0, 8.0),   # Gauge surge/drop per hour
    "soil_moisture_pct": (0.0, 100.0),             # Volumetric water content %
    "elevation_m": (400.0, 1000.0),                # Elevation in meters AMSL
    "slope_deg": (0.0, 45.0),                      # Topographic slope in degrees
    "flow_rate_cusecs": (0.0, 150000.0)            # Dam discharge / river flow
}


class HydrologicalSchemaValidator:
    """
    Validator to enforce strict data types, physical ranges,
    chronological integrity, and missingness checks on flood datasets.
    """

    def __init__(self, stations_dict: Dict[str, Any] = None):
        self.stations = stations_dict or NASHIK_STATIONS

    def validate_dataframe(self, df: pd.DataFrame) -> Tuple[bool, List[str], Dict[str, Any]]:
        """
        Validates an input DataFrame against the required Nashik Flood schema.
        Returns:
            is_valid (bool): True if schema checks pass.
            errors (list of str): List of critical schema errors.
            diagnostics (dict): Statistical summary, missingness report, range warnings.
        """
        errors = []
        warnings = []
        diagnostics = {
            "row_count": len(df),
            "column_count": len(df.columns),
            "missing_values_per_col": {},
            "range_violations": {},
            "stations_found": [],
            "chronological_status": "Not Verified"
        }

        # 1. Column Presence Check
        missing_columns = [col for col in SCHEMA_COLUMNS if col not in df.columns]
        if missing_columns:
            errors.append(f"Missing mandatory columns: {missing_columns}")
            return False, errors, diagnostics

        # 2. Timestamp Validation
        try:
            df["timestamp"] = pd.to_datetime(df["timestamp"])
        except Exception as e:
            errors.append(f"Timestamp column could not be parsed to datetime: {str(e)}")

        # 3. Location Check
        unique_locations = df["location"].unique().tolist()
        diagnostics["stations_found"] = unique_locations
        unknown_locs = [loc for loc in unique_locations if loc not in self.stations]
        if unknown_locs:
            warnings.append(f"Locations not registered in station configuration: {unknown_locs}")

        # 4. Missing Values Inspection
        nan_counts = df[SCHEMA_COLUMNS].isna().sum().to_dict()
        diagnostics["missing_values_per_col"] = nan_counts
        total_nans = sum(nan_counts.values())
        if total_nans > 0:
            warnings.append(f"Dataset contains {total_nans} missing values across schema columns.")

        # 5. Range Constraints Check
        for col, (min_val, max_val) in NUMERICAL_CONSTRAINTS.items():
            if col in df.columns:
                below = (df[col] < min_val).sum()
                above = (df[col] > max_val).sum()
                if below > 0 or above > 0:
                    diagnostics["range_violations"][col] = {
                        "below_min": int(below),
                        "above_max": int(above),
                        "allowed_range": (min_val, max_val)
                    }
                    warnings.append(
                        f"Column '{col}' has {below} values < {min_val} and {above} values > {max_val}."
                    )

        # 6. Target Label Check
        if not set(df["flood_label"].dropna().unique()).issubset({0, 1}):
            errors.append(f"Target 'flood_label' must be binary (0 or 1). Found: {df['flood_label'].unique()}")

        # 7. Chronological Monotonicity per Station
        is_chronological = True
        for loc in unique_locations:
            loc_df = df[df["location"] == loc]
            if not loc_df["timestamp"].is_monotonic_increasing:
                is_chronological = False
                errors.append(f"Station '{loc}' timestamps are not sorted monotonically increasing.")
                break

        diagnostics["chronological_status"] = "Monotonically Sorted" if is_chronological else "Non-monotonic"
        diagnostics["warnings"] = warnings

        is_valid = len(errors) == 0
        return is_valid, errors, diagnostics


def get_schema_summary() -> pd.DataFrame:
    """Returns a structured summary table of the data schema for documentation and UI."""
    data = []
    for col in SCHEMA_COLUMNS:
        req_type = "Numeric (Float)"
        unit = "-"
        if col == "timestamp":
            req_type = "Datetime (ISO-8601)"
            unit = "UTC / IST"
        elif col == "location":
            req_type = "Categorical / String"
            unit = "Station Name"
        elif col in ["flood_label", "flood_severity"]:
            req_type = "Integer Class"
            unit = "0: Normal, 1: Warning, 2: Danger"
        elif col == "is_synthetic":
            req_type = "Boolean"
            unit = "True/False"
        elif "mm_h" in col:
            unit = "mm/hour"
        elif "mm" in col:
            unit = "mm"
        elif "_m_h" in col:
            unit = "m/hour"
        elif "_m" in col:
            unit = "meters AMSL / gauge"
        elif "_pct" in col:
            unit = "%"
        elif "_deg" in col:
            unit = "degrees"
        elif "cusecs" in col:
            unit = "cusecs (ft³/s)"

        constraints = NUMERICAL_CONSTRAINTS.get(col, ("-", "-"))
        valid_range = f"{constraints[0]} to {constraints[1]}" if constraints != ("-", "-") else "N/A"

        data.append({
            "Column Name": col,
            "Type": req_type,
            "Unit": unit,
            "Expected Range": valid_range,
            "Required": "Yes"
        })
    return pd.DataFrame(data)
