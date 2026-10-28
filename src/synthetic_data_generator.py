"""
Climate Guard AI - Synthetic Hydrological Data Generator
Generates physics-informed, clearly labelled synthetic demo data for Nashik, Maharashtra.
STRICT REQUIREMENT: All rows are explicitly labelled `is_synthetic = True`.
NEVER present these results as real flood predictions.
Used exclusively for pipeline demonstration, algorithmic testing, and UI validation.
"""

from datetime import datetime, timedelta
from pathlib import Path
import numpy as np
import pandas as pd
from src.config import (
    SYNTHETIC_DATA_PATH,
    NASHIK_STATIONS,
    SCHEMA_COLUMNS,
    RANDOM_SEED
)


def generate_synthetic_nashik_dataset(
    start_year: int = 2018,
    end_year: int = 2024,
    output_path: Path = SYNTHETIC_DATA_PATH
) -> pd.DataFrame:
    """
    Generates synthetic hydrological time-series for Nashik stations during monsoon months
    (June 15 to September 30) for each year from start_year to end_year.

    Incorporates physical relationships:
    - Upstream Gangapur Dam release drives downstream Godavari river level with lag.
    - Cumulative rainfall saturates soil moisture.
    - Low-elevation/low-slope stations (Ramkund, Saykheda) experience higher flood susceptibility.
    """
    np.random.seed(RANDOM_SEED)
    records = []

    # Iterate over monsoon seasons
    for year in range(start_year, end_year + 1):
        start_date = datetime(year, 6, 15, 0, 0)
        end_date = datetime(year, 9, 30, 23, 0)
        total_hours = int((end_date - start_date).total_seconds() / 3600) + 1

        # Base monsoon rain waves (representing low pressure systems / monsoon troughs)
        time_index = [start_date + timedelta(hours=i) for i in range(0, total_hours, 6)]  # 6-hour intervals
        n_steps = len(time_index)

        # Generate 3-5 major rainfall surge events per season
        surge_peaks = np.random.choice(n_steps, size=np.random.randint(3, 6), replace=False)
        base_rain = np.random.exponential(scale=3.0, size=n_steps)

        surge_rain = np.zeros(n_steps)
        for peak in surge_peaks:
            duration = np.random.randint(8, 20)  # steps (48h - 120h)
            window = np.exp(-0.5 * ((np.arange(n_steps) - peak) / (duration / 2)) ** 2)
            peak_intensity = np.random.uniform(50.0, 160.0)
            surge_rain += window * peak_intensity

        catchment_rainfall_24h = base_rain + surge_rain
        catchment_rainfall_24h = np.clip(catchment_rainfall_24h, 0.0, 350.0)

        # Catchment soil moisture builds up with rainfall
        soil_moisture_series = np.zeros(n_steps)
        current_sm = 35.0  # base starting soil moisture %
        for i in range(n_steps):
            rain_in = catchment_rainfall_24h[i]
            current_sm = current_sm * 0.96 + (rain_in * 0.35)
            current_sm = np.clip(current_sm, 20.0, 95.0)
            soil_moisture_series[i] = current_sm

        # Dam discharge (cusecs) triggered when catchment rain and soil moisture are high
        base_discharge = 1500.0 + np.random.uniform(0, 1000, n_steps)
        surge_discharge = np.zeros(n_steps)
        for i in range(n_steps):
            if soil_moisture_series[i] > 65.0 and catchment_rainfall_24h[i] > 40.0:
                # Emergency spillway releases from Gangapur Dam
                surge_discharge[i] = (catchment_rainfall_24h[i] * 250.0) + (soil_moisture_series[i] * 120.0)
                if catchment_rainfall_24h[i] > 90.0:
                    surge_discharge[i] += np.random.uniform(15000, 35000)

        dam_discharge_series = base_discharge + surge_discharge
        # Smooth discharge hydrograph
        dam_discharge_series = np.convolve(dam_discharge_series, np.ones(3)/3, mode='same')
        dam_discharge_series = np.clip(dam_discharge_series, 500.0, 65000.0)

        # Now simulate for each Nashik station
        for station_name, meta in NASHIK_STATIONS.items():
            elev = meta["elevation_m"]
            slope = meta["slope_deg"]
            warning_gauge = meta["warning_gauge_m"]
            danger_gauge = meta["danger_gauge_m"]

            # Station-specific rainfall variations (Western Ghats Trimbak / Gangapur get more rain than downstream Niphad)
            if "Trimbak" in station_name:
                station_rain = catchment_rainfall_24h * np.random.uniform(1.20, 1.45, n_steps)
            elif "Dam" in station_name or "Someshwar" in station_name:
                station_rain = catchment_rainfall_24h * np.random.uniform(1.0, 1.25, n_steps)
            elif "Saykheda" in station_name:
                station_rain = catchment_rainfall_24h * np.random.uniform(0.75, 1.0, n_steps)
            elif "Darna" in station_name:
                station_rain = catchment_rainfall_24h * np.random.uniform(0.95, 1.20, n_steps)
            else:
                station_rain = catchment_rainfall_24h * np.random.uniform(0.9, 1.1, n_steps)

            station_rain = np.round(np.clip(station_rain, 0.0, 400.0), 1)
            station_intensity = np.round(station_rain / np.random.uniform(4.0, 8.0), 1)

            # River gauge height based on dam discharge, tributary inflow, and local terrain
            base_gauge = 1.5 + (dam_discharge_series / 5000.0)
            if "Trimbak" in station_name:
                # Steep headwater stream driven by local rainfall runoff
                gauge_level = 1.0 + (station_rain / 55.0)
            elif "Ramkund" in station_name:
                gauge_level = base_gauge * 1.15
            elif "Saykheda" in station_name:
                gauge_level = base_gauge * 1.25  # flat basin backwater
            elif "Darna" in station_name:
                gauge_level = base_gauge * 1.18  # tributary confluence backwater
            else:
                gauge_level = base_gauge * 0.95

            # Add minor sensor noise
            gauge_level = np.clip(gauge_level + np.random.normal(0, 0.15, n_steps), 0.5, 15.0)

            # Water level change rate (m/h)
            change_rate = np.zeros(n_steps)
            change_rate[1:] = (gauge_level[1:] - gauge_level[:-1]) / 6.0  # 6-hour interval
            change_rate = np.round(np.clip(change_rate, -5.0, 5.0), 2)

            for step_idx in range(n_steps):
                ts = time_index[step_idx]
                r_24 = float(station_rain[step_idx])
                r_int = float(station_intensity[step_idx])
                w_lvl = float(np.round(gauge_level[step_idx], 2))
                w_rate = float(change_rate[step_idx])
                sm = float(np.round(soil_moisture_series[step_idx], 1))
                flow = float(np.round(dam_discharge_series[step_idx], 0))

                # Deterministic Flood Ground Truth based on hydrology physics & NMC thresholds
                # Flood occurs if river water level exceeds station warning threshold OR
                # discharge exceeds warning threshold and soil is saturated.
                is_danger = (w_lvl >= danger_gauge) or (flow >= meta["danger_discharge_cusecs"])
                is_warning = (w_lvl >= warning_gauge) or (flow >= meta["warning_discharge_cusecs"] and sm > 75.0)

                if is_danger:
                    flood_label = 1
                    flood_severity = 2  # Danger
                elif is_warning:
                    flood_label = 1
                    flood_severity = 1  # Warning
                else:
                    flood_label = 0
                    flood_severity = 0  # Normal

                records.append({
                    "timestamp": ts.strftime("%Y-%m-%d %H:%M:%S"),
                    "location": station_name,
                    "rainfall_mm": r_24,
                    "rainfall_intensity_mm_h": r_int,
                    "river_water_level_m": w_lvl,
                    "water_level_change_rate_m_h": w_rate,
                    "soil_moisture_pct": sm,
                    "elevation_m": elev,
                    "slope_deg": slope,
                    "flow_rate_cusecs": flow,
                    "flood_label": int(flood_label),
                    "flood_severity": int(flood_severity),
                    "is_synthetic": True  # STRICT LABELING
                })

    df = pd.DataFrame(records)

    # Sort strictly chronologically per station
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values(by=["timestamp", "location"]).reset_index(drop=True)
    df["timestamp"] = df["timestamp"].dt.strftime("%Y-%m-%d %H:%M:%S")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"Generated synthetic dataset with {len(df)} rows across {len(NASHIK_STATIONS)} stations.")
    print(f"Saved to: {output_path}")
    return df


if __name__ == "__main__":
    generate_synthetic_nashik_dataset()
