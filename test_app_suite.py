"""
Comprehensive test suite for Climate Guard AI Streamlit application and all five core modules.
"""

import unittest
import pandas as pd
import numpy as np

from src.predictor import FloodPredictor
from src.heat_engine import MAHARASHTRA_HEAT_CITIES, evaluate_heat_risk
from src.fire_engine import MAHARASHTRA_FIRE_REGIONS, calculate_fwi_system
from src.crop_engine import CROP_PROFILES, assess_crop_health
from src.drainage_engine import NASHIK_DRAINAGE_NODES, evaluate_drainage_health
import src.chart_utils as cu


class TestClimateGuardSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.predictor = FloodPredictor()

    def test_01_flood_guard_scenarios(self):
        """Test Flood Guard AI inference across multiple hydrological presets."""
        res_normal = self.predictor.predict_scenario(
            location="Ramkund (Panchavati)",
            rainfall_mm=12.0,
            rainfall_intensity_mm_h=3.0,
            river_water_level_m=2.1,
            water_level_change_rate_m_h=0.05,
            soil_moisture_pct=48.0,
            flow_rate_cusecs=2800.0
        )
        self.assertIn("flood_probability_pct", res_normal)
        self.assertLess(res_normal["flood_probability_pct"], 40.0)

        res_critical = self.predictor.predict_scenario(
            location="Someshwar (Gangapur Rd)",
            rainfall_mm=175.0,
            rainfall_intensity_mm_h=45.0,
            river_water_level_m=9.4,
            water_level_change_rate_m_h=2.2,
            soil_moisture_pct=96.0,
            flow_rate_cusecs=46000.0
        )
        self.assertGreater(res_critical["flood_probability_pct"], 70.0)

    def test_02_heat_guard_engine(self):
        """Test Heat Guard AI thermal risk assessment."""
        for city in MAHARASHTRA_HEAT_CITIES:
            eval_res = evaluate_heat_risk(city, 44.0, 35.0, 15.0, 3)
            self.assertIn("heat_index_c", eval_res)
            self.assertIn("wet_bulb_c", eval_res)
            self.assertIn("risk_score", eval_res)
            self.assertIn("precautions", eval_res)
            self.assertGreater(len(eval_res["precautions"]), 0)

    def test_03_fire_guard_engine(self):
        """Test Fire Guard AI Canadian FWI computations."""
        for region in MAHARASHTRA_FIRE_REGIONS:
            fwi_res = calculate_fwi_system(41.0, 18.0, 26.0, days_without_rain=15)
            self.assertIn("ffmc", fwi_res)
            self.assertIn("isi", fwi_res)
            self.assertIn("bui", fwi_res)
            self.assertIn("fwi_score", fwi_res)
            self.assertIn("advisories", fwi_res)
            self.assertGreater(len(fwi_res["advisories"]), 0)

    def test_04_crop_shield_engine(self):
        """Test Crop Shield AI FAO-56 crop stress and water balance."""
        for crop_name, profile in CROP_PROFILES.items():
            for stage_idx in range(len(profile["stages"])):
                crop_eval = assess_crop_health(crop_name, stage_idx, 32.0, 45.0, 5.0, 5.5)
                self.assertIn("kc", crop_eval)
                self.assertIn("etc_mm_day", crop_eval)
                self.assertIn("water_status", crop_eval)
                self.assertIn("recommendations", crop_eval)

    def test_05_drainage_network_engine(self):
        """Test Urban Drainage Network blockage detection."""
        for node_name, node_meta in NASHIK_DRAINAGE_NODES.items():
            drain_eval = evaluate_drainage_health(node_name, 75.0, 1200.0, 45.0)
            self.assertIn("expected_flow_lpm", drain_eval)
            self.assertIn("blockage_pct", drain_eval)
            self.assertIn("severity", drain_eval)
            self.assertIn("actions", drain_eval)

    def test_06_chart_generators_sky_blue_theme(self):
        """Test that all dynamic charts generate valid Plotly figures with Sky-Blue styling."""
        fig_int = cu.build_flood_intensity_sensitivity_chart(
            self.predictor, "Ramkund (Panchavati)", 50.0, 15.0, 5.0, 0.5, 60.0, 12000.0
        )
        self.assertEqual(fig_int.layout.plot_bgcolor, "#EDF7FF")

        fig_gauge = cu.build_flood_gauge_sensitivity_chart(
            self.predictor, "Ramkund (Panchavati)", 50.0, 15.0, 5.0, 0.5, 60.0, 12000.0
        )
        self.assertEqual(fig_gauge.layout.plot_bgcolor, "#EDF7FF")

        fig_diurnal = cu.build_heat_diurnal_chart(42.0, 35.0, "Nagpur (Vidarbha)")
        self.assertEqual(fig_diurnal.layout.plot_bgcolor, "#EDF7FF")

        fig_fire = cu.build_fire_weather_trend_chart(38.0, 22.0, 20.0, 10)
        self.assertEqual(fig_fire.layout.plot_bgcolor, "#EDF7FF")

        fig_crop = cu.build_crop_water_demand_chart("Onion (Nashik Red)", 2, 5.5)
        self.assertEqual(fig_crop.layout.plot_bgcolor, "#EDF7FF")

        fig_drain = cu.build_drainage_storm_hydrograph(
            "Saraf Bazar Storm Culvert", 90.0, 4500.0, 60.0, 1500.0, 30.0
        )
        self.assertEqual(fig_drain.layout.plot_bgcolor, "#EDF7FF")

        fig_radar = cu.build_multi_hazard_radar_chart(35.0, 60.0, 25.0, 40.0, 55.0)
        self.assertEqual(fig_radar.layout.paper_bgcolor, "#EDF7FF")


if __name__ == "__main__":
    unittest.main()
