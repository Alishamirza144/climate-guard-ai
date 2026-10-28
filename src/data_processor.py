"""
Climate Guard AI - Hydrological Data Processor
Handles data loading, causal feature engineering, missingness audits,
and chronological train/test splitting to guarantee ZERO temporal data leakage.
"""

from typing import Tuple, Dict, Any, Optional
import pandas as pd
import numpy as np
from src.config import (
    SYNTHETIC_DATA_PATH,
    FEATURE_COLUMNS,
    TARGET_COLUMN,
    CHRONOLOGICAL_SPLIT_RATIO,
    MISSING_DATA_THRESHOLDS
)
from src.data_schema import HydrologicalSchemaValidator


class HydrologicalDataProcessor:
    """
    Processes time-series hydrological observations for Nashik flood modeling.
    Guarantees zero data leakage through strict causal processing and chronological splits.
    """

    def __init__(self, data_path: Optional[str] = None):
        self.data_path = data_path or SYNTHETIC_DATA_PATH
        self.validator = HydrologicalSchemaValidator()
        self.missingness_report = {}

    def load_and_validate(self, file_path: Optional[str] = None) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """Loads dataset and runs schema validation."""
        path_to_load = file_path or self.data_path
        df = pd.read_csv(path_to_load)
        df["timestamp"] = pd.to_datetime(df["timestamp"])

        # Strictly sort chronologically per location
        df = df.sort_values(by=["location", "timestamp"]).reset_index(drop=True)

        is_valid, errors, diagnostics = self.validator.validate_dataframe(df)
        if not is_valid:
            raise ValueError(f"Dataset validation failed: {errors}")

        self.missingness_report = diagnostics.get("missing_values_per_col", {})
        return df, diagnostics

    def handle_missing_data(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Causal missing data handling (strictly past-to-future).
        Applies forward-fill per station, then backfill only for boundary starting conditions.
        Emits warnings if missing gaps exceed safety thresholds.
        """
        df_clean = df.copy()
        warnings = []

        for station in df_clean["location"].unique():
            station_mask = df_clean["location"] == station
            station_df = df_clean.loc[station_mask].copy()

            # Check consecutive nulls for each feature column
            for col in FEATURE_COLUMNS:
                if col in station_df.columns:
                    null_series = station_df[col].isna()
                    consecutive_nulls = null_series.astype(int).groupby((~null_series).cumsum()).cumsum()
                    max_streak = consecutive_nulls.max() if len(consecutive_nulls) > 0 else 0
                    if max_streak > MISSING_DATA_THRESHOLDS["max_allowed_consecutive_nans"]:
                        warnings.append(
                            f"Warning: Station '{station}' has {max_streak} consecutive missing readings in '{col}'."
                        )

            # Causal forward-fill per station
            station_df = station_df.ffill().bfill()
            df_clean.loc[station_mask] = station_df

        return df_clean, {"missing_warnings": warnings}

    def engineer_causal_features(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, list]:
        """
        Engineers physics-based hydrological indicators using strictly backward-looking windows.
        NO future-looking centered windows or forward-looking aggregations.
        """
        df_feat = df.copy()
        engineered_cols = []

        # Sort strictly by location and timestamp before computing lags
        df_feat = df_feat.sort_values(by=["location", "timestamp"]).reset_index(drop=True)

        # Compute per station
        dfs = []
        for station, group in df_feat.groupby("location", sort=False):
            g = group.copy()
            # 1. Multi-scale antecedent rainfall accumulation (API)
            g["rain_12h_accum_mm"] = g["rainfall_mm"].rolling(window=2, min_periods=1).sum()
            g["rain_24h_accum_mm"] = g["rainfall_mm"].rolling(window=4, min_periods=1).sum()
            g["rain_72h_accum_mm"] = g["rainfall_mm"].rolling(window=12, min_periods=1).sum()

            # 2. Upstream Gangapur Dam spillway transit lag & discharge acceleration
            g["flow_lag_6h_cusecs"] = g["flow_rate_cusecs"].shift(1).bfill()
            g["flow_lag_12h_cusecs"] = g["flow_rate_cusecs"].shift(2).bfill()
            g["discharge_acceleration_cusecs_h"] = (g["flow_rate_cusecs"] - g["flow_lag_6h_cusecs"]) / 6.0

            # 3. Soil moisture deficit & Horton overland runoff generation potential
            g["soil_saturation_deficit_pct"] = 100.0 - g["soil_moisture_pct"]
            g["runoff_generation_potential"] = g["rainfall_intensity_mm_h"] * (g["soil_moisture_pct"] / 100.0)

            # 4. Water surge interaction (water level surge rate x soil saturation ratio)
            g["surge_saturation_index"] = (
                np.maximum(0, g["water_level_change_rate_m_h"]) * (g["soil_moisture_pct"] / 100.0)
            )

            # 5. Geomorphological Topographic Wetness Index proxy (elevation & slope)
            g["topo_wetness_index"] = np.log(
                (1000.0 - g["elevation_m"]) / np.tan(np.radians(np.maximum(g["slope_deg"], 0.5)))
            )

            dfs.append(g)

        df_feat = pd.concat(dfs, ignore_index=True)
        # Re-sort globally chronologically
        df_feat = df_feat.sort_values(by=["timestamp", "location"]).reset_index(drop=True)

        new_features = [
            "rain_12h_accum_mm",
            "rain_24h_accum_mm",
            "rain_72h_accum_mm",
            "flow_lag_6h_cusecs",
            "flow_lag_12h_cusecs",
            "discharge_acceleration_cusecs_h",
            "soil_saturation_deficit_pct",
            "runoff_generation_potential",
            "surge_saturation_index",
            "topo_wetness_index"
        ]
        all_features = FEATURE_COLUMNS + new_features
        return df_feat, all_features

    def chronological_split(
        self,
        df: pd.DataFrame,
        feature_cols: list,
        split_ratio: float = CHRONOLOGICAL_SPLIT_RATIO
    ) -> Dict[str, Any]:
        """
        Strictly splits data by timestamp to prevent temporal data leakage.
        Evaluates the model on unseen future events only.
        """
        # Ensure chronological order
        df_sorted = df.sort_values(by="timestamp").reset_index(drop=True)

        split_idx = int(len(df_sorted) * split_ratio)
        cutoff_timestamp = df_sorted.loc[split_idx, "timestamp"]

        train_mask = df_sorted["timestamp"] < cutoff_timestamp
        test_mask = df_sorted["timestamp"] >= cutoff_timestamp

        train_df = df_sorted[train_mask].copy()
        test_df = df_sorted[test_mask].copy()

        # Strict leakage audit assertion
        train_max_ts = train_df["timestamp"].max()
        test_min_ts = test_df["timestamp"].min()
        assert train_max_ts < test_min_ts, (
            f"LEAKAGE DETECTED: Train max timestamp ({train_max_ts}) is not strictly before "
            f"Test min timestamp ({test_min_ts})"
        )

        X_train = train_df[feature_cols]
        y_train = train_df[TARGET_COLUMN]
        X_test = test_df[feature_cols]
        y_test = test_df[TARGET_COLUMN]

        return {
            "X_train": X_train,
            "y_train": y_train,
            "X_test": X_test,
            "y_test": y_test,
            "train_df": train_df,
            "test_df": test_df,
            "cutoff_timestamp": cutoff_timestamp,
            "train_start": train_df["timestamp"].min(),
            "train_end": train_max_ts,
            "test_start": test_min_ts,
            "test_end": test_df["timestamp"].max(),
            "train_size": len(train_df),
            "test_size": len(test_df),
            "feature_names": feature_cols
        }
