"""
Climate Guard AI - End-to-End Pipeline Verification Suite
Tests schema integrity, chronological anti-leakage guarantee,
model persistence, inference correctness, and diagnostic alerts.
"""

import sys
import unittest
from pathlib import Path
import numpy as np
import pandas as pd

from src.config import (
    SYNTHETIC_DATA_PATH,
    MODEL_PATH,
    MODEL_METADATA_PATH,
    NASHIK_STATIONS,
    SCHEMA_COLUMNS
)
from src.data_schema import HydrologicalSchemaValidator, get_schema_summary
from src.data_processor import HydrologicalDataProcessor
from src.model_trainer import FloodModelTrainer
from src.predictor import FloodPredictor
from src.historical_data_sources import export_sources_manifest, HISTORICAL_DATA_REGISTRY


class TestClimateGuardPipeline(unittest.TestCase):
    """Automated tests for Climate Guard AI flood prediction system."""

    def test_01_schema_validation(self):
        """Verify schema validator enforces types, mandatory columns, and monotonicity."""
        self.assertTrue(SYNTHETIC_DATA_PATH.exists(), "Synthetic dataset file must exist")
        df = pd.read_csv(SYNTHETIC_DATA_PATH)
        validator = HydrologicalSchemaValidator()
        is_valid, errors, diag = validator.validate_dataframe(df)
        self.assertTrue(is_valid, f"Dataset schema validation failed: {errors}")
        self.assertEqual(len(errors), 0)
        self.assertEqual(set(SCHEMA_COLUMNS).issubset(df.columns), True)
        self.assertEqual(diag["chronological_status"], "Monotonically Sorted")

    def test_02_zero_temporal_data_leakage(self):
        """Verify chronological split guarantees max(train_time) < min(test_time)."""
        processor = HydrologicalDataProcessor()
        df, _ = processor.load_and_validate()
        df_clean, _ = processor.handle_missing_data(df)
        df_feat, feature_names = processor.engineer_causal_features(df_clean)
        split = processor.chronological_split(df_feat, feature_names, split_ratio=0.8)

        train_max = split["train_end"]
        test_min = split["test_start"]

        self.assertLess(
            train_max,
            test_min,
            f"Temporal leakage detected! Train max ({train_max}) >= Test min ({test_min})"
        )
        self.assertEqual(len(split["X_train"]) + len(split["X_test"]), len(df_feat))

    def test_03_model_persistence_and_metrics(self):
        """Verify model artifacts exist and contain valid evaluation metrics."""
        self.assertTrue(MODEL_PATH.exists(), "Serialized model artifact must exist")
        self.assertTrue(MODEL_METADATA_PATH.exists(), "Model metadata JSON must exist")

        import json
        with open(MODEL_METADATA_PATH, "r", encoding="utf-8") as f:
            meta = json.load(f)

        self.assertEqual(meta["model_type"], "RandomForestClassifier")
        self.assertIn("metrics", meta)
        metrics = meta["metrics"]
        self.assertGreaterEqual(metrics["f1_score"], 0.85)
        self.assertGreaterEqual(metrics["recall"], 0.85)
        self.assertIn("feature_importances", meta)
        self.assertTrue(meta["is_synthetic_training_data"])

    def test_04_predictor_inference_scenarios(self):
        """Test inference across low, moderate, and critical flood scenarios."""
        predictor = FloodPredictor()
        self.assertTrue(predictor.is_loaded, "Predictor must load model successfully")

        # Scenario A: Normal dry condition
        res_normal = predictor.predict_scenario(
            location="Ramkund (Panchavati)",
            rainfall_mm=2.0,
            rainfall_intensity_mm_h=0.5,
            river_water_level_m=1.2,
            water_level_change_rate_m_h=0.0,
            soil_moisture_pct=30.0,
            flow_rate_cusecs=1200.0
        )
        self.assertIn("NORMAL", res_normal["risk_tier"])
        self.assertLess(res_normal["flood_probability_pct"], 35.0)

        # Scenario B: Critical Red Line breach condition
        res_critical = predictor.predict_scenario(
            location="Ramkund (Panchavati)",
            rainfall_mm=140.0,
            rainfall_intensity_mm_h=35.0,
            river_water_level_m=9.2,
            water_level_change_rate_m_h=1.5,
            soil_moisture_pct=92.0,
            flow_rate_cusecs=42000.0
        )
        self.assertIn("RED", res_critical["risk_tier"])
        self.assertGreaterEqual(res_critical["flood_probability_pct"], 80.0)
        self.assertGreater(len(res_critical["recommended_actions"]), 0)

    def test_05_out_of_distribution_auditing(self):
        """Verify out-of-distribution sensor alerts fire on extreme physics values."""
        predictor = FloodPredictor()
        res_ood = predictor.predict_scenario(
            location="Someshwar (Gangapur Rd)",
            rainfall_mm=320.0,  # Extreme
            rainfall_intensity_mm_h=95.0,  # Cloudburst
            river_water_level_m=0.1,  # Anomalous low
            water_level_change_rate_m_h=0.5,
            soil_moisture_pct=99.0,  # Saturated
            flow_rate_cusecs=95000.0  # Massive flood
        )
        self.assertGreater(len(res_ood["sensor_warnings"]), 0)

    def test_06_historical_sources_export(self):
        """Verify historical data manifest export works and matches registry."""
        manifest_path = export_sources_manifest()
        self.assertTrue(manifest_path.exists())
        self.assertIn("IMD_PUNE", HISTORICAL_DATA_REGISTRY)
        self.assertIn("WRD_MAHARASHTRA", HISTORICAL_DATA_REGISTRY)


if __name__ == "__main__":
    unittest.main(verbosity=2)
