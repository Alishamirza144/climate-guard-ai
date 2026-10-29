"""
Climate Guard AI - Interactive Chart & Visual Analytics Module
Provides high-performance, data-driven Plotly visualizations for all five modules:
1. Flood Guard AI: Time-series hydrographs, intensity sensitivity, river gauge response curves
2. Heat Guard AI: Diurnal temperature/RH cycle, heat-index vs. wet-bulb, thermal risk isopleths
3. Fire Guard AI: 14-day drying progression, FWI risk trends, wind-velocity sensitivity
4. Crop Shield AI: FAO-56 phenological water demand (ETc), supply/demand balance, soil moisture spectrum
5. Drainage Network: 6-hour storm hydrograph, expected vs. choked discharge, blockage severity trend
6. Multi-Hazard Command Center: Statewide normalized multi-hazard risk radar & bar comparison
"""

import math
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

from src.config import NASHIK_STATIONS
from src.heat_engine import compute_heat_index_c, compute_wet_bulb_c
from src.fire_engine import calculate_fwi_system
from src.crop_engine import CROP_PROFILES, assess_crop_health
from src.drainage_engine import NASHIK_DRAINAGE_NODES, evaluate_drainage_health

# Common Theme Styling Constants (Sky-Blue Climate Theme)
CHART_THEME = "plotly_white"
BG_COLOR = "#EDF7FF"
GRID_COLOR = "#D1E6F8"
FONT_FAMILY = "Inter, -apple-system, BlinkMacSystemFont, sans-serif"


def _base_layout(title: str, height: int = 340) -> Dict[str, Any]:
    return dict(
        template=CHART_THEME,
        paper_bgcolor=BG_COLOR,
        plot_bgcolor=BG_COLOR,
        title=dict(text=title, font=dict(family=FONT_FAMILY, size=14, color="#20364D")),
        font=dict(family=FONT_FAMILY, color="#20364D"),
        margin=dict(l=35, r=35, t=45, b=35),
        height=height,
        hovermode="x unified"
    )


# =========================================================================
# 1. FLOOD GUARD AI CHARTS
# =========================================================================

def build_flood_time_series_chart(
    hist_df: Optional[pd.DataFrame],
    station_name: str,
    window_records: int = 120
) -> Optional[go.Figure]:
    """Generates multi-attribute historical time-series hydrograph."""
    if hist_df is None or hist_df.empty:
        return None

    st_df = hist_df[hist_df["location"] == station_name].copy()
    if st_df.empty:
        return None

    st_df = st_df.tail(window_records)
    st_meta = NASHIK_STATIONS.get(station_name, {"warning_gauge_m": 6.5, "danger_gauge_m": 8.5})

    fig = go.Figure()
    # 1. Rainfall Intensity (Bar, secondary y)
    fig.add_trace(go.Bar(
        x=st_df["timestamp"],
        y=st_df["rainfall_intensity_mm_h"],
        name="Rainfall Intensity (mm/h)",
        marker_color="#38bdf8",
        opacity=0.45,
        yaxis="y2"
    ))
    # 2. Dam Discharge (Line, secondary y)
    fig.add_trace(go.Scatter(
        x=st_df["timestamp"],
        y=st_df["flow_rate_cusecs"],
        name="Spillway Discharge (cusecs)",
        line=dict(color="#818cf8", width=1.5),
        yaxis="y3"
    ))
    # 3. Soil Moisture (Line, primary y)
    fig.add_trace(go.Scatter(
        x=st_df["timestamp"],
        y=st_df["soil_moisture_pct"],
        name="Soil Moisture (%)",
        line=dict(color="#34d399", width=1.5, dash="dot"),
        yaxis="y1"
    ))
    # 4. River Gauge (Thick Line, primary y)
    fig.add_trace(go.Scatter(
        x=st_df["timestamp"],
        y=st_df["river_water_level_m"],
        name="River Gauge Level (m)",
        line=dict(color="#0284c7", width=2.8),
        yaxis="y1"
    ))

    # Reference Warning & Danger Lines
    w_val = st_meta["warning_gauge_m"]
    d_val = st_meta["danger_gauge_m"]
    fig.add_hline(y=w_val, line_dash="dash", line_color="#f59e0b", annotation_text=f"Blue Line ({w_val}m)")
    fig.add_hline(y=d_val, line_dash="dash", line_color="#ef4444", annotation_text=f"Red Line ({d_val}m)")

    layout = _base_layout(f"Hydrological Dynamics & Telemetry Trends ({station_name})", height=380)
    layout.update(
        xaxis=dict(gridcolor=GRID_COLOR, title="Timestamp (Hourly)"),
        yaxis=dict(title="Gauge Level (m) & Soil Moisture (%)", gridcolor=GRID_COLOR, range=[0, max(d_val + 3.0, 14.0)]),
        yaxis2=dict(title="Rainfall Intensity (mm/h)", overlaying="y", side="right", range=[0, 100], showgrid=False),
        yaxis3=dict(title="Discharge (cusecs)", overlaying="y", side="right", autoshift=True, showgrid=False),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    fig.update_layout(layout)
    return fig


def build_flood_intensity_sensitivity_chart(
    predictor: Any,
    location: str,
    current_rain_mm: float,
    current_int_mm_h: float,
    current_gauge_m: float,
    current_rate_m_h: float,
    current_sm_pct: float,
    current_flow_cusecs: float
) -> go.Figure:
    """Computes flood probability sensitivity across rainfall intensity levels (0-120 mm/h)."""
    test_intensities = np.linspace(0.0, 120.0, 25)
    probabilities = []

    for test_int in test_intensities:
        pred = predictor.predict_scenario(
            location=location,
            rainfall_mm=current_rain_mm,
            rainfall_intensity_mm_h=float(test_int),
            river_water_level_m=current_gauge_m,
            water_level_change_rate_m_h=current_rate_m_h,
            soil_moisture_pct=current_sm_pct,
            flow_rate_cusecs=current_flow_cusecs
        )
        probabilities.append(pred["flood_probability_pct"])

    # Current operating point
    curr_pred = predictor.predict_scenario(
        location=location,
        rainfall_mm=current_rain_mm,
        rainfall_intensity_mm_h=current_int_mm_h,
        river_water_level_m=current_gauge_m,
        water_level_change_rate_m_h=current_rate_m_h,
        soil_moisture_pct=current_sm_pct,
        flow_rate_cusecs=current_flow_cusecs
    )
    curr_prob = curr_pred["flood_probability_pct"]

    fig = go.Figure()
    # Risk Color-Coded Curve
    fig.add_trace(go.Scatter(
        x=test_intensities,
        y=probabilities,
        mode="lines",
        name="Model Probability Curve",
        line=dict(color="#38bdf8", width=3)
    ))
    # Current Reading Point
    fig.add_trace(go.Scatter(
        x=[current_int_mm_h],
        y=[curr_prob],
        mode="markers+text",
        name="Current Reading",
        text=[f"Current: {curr_prob}%"],
        textposition="top left",
        marker=dict(color=curr_pred["risk_color"], size=13, line=dict(color="#ffffff", width=2))
    ))

    # Reference Hazard Thresholds
    fig.add_hline(y=40.0, line_dash="dot", line_color="#34d399", annotation_text="Advisory Tier (40%)")
    fig.add_hline(y=70.0, line_dash="dash", line_color="#ef4444", annotation_text="Critical Inundation (70%)")

    layout = _base_layout(f"Predicted Flood Probability vs. Rainfall Intensity ({location})", height=320)
    layout.update(
        xaxis=dict(title="Peak Rainfall Intensity (mm/h)", gridcolor=GRID_COLOR),
        yaxis=dict(title="Predicted Inundation Probability (%)", gridcolor=GRID_COLOR, range=[0, 105]),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    fig.update_layout(layout)
    return fig


def build_flood_gauge_sensitivity_chart(
    predictor: Any,
    location: str,
    current_rain_mm: float,
    current_int_mm_h: float,
    current_gauge_m: float,
    current_rate_m_h: float,
    current_sm_pct: float,
    current_flow_cusecs: float
) -> go.Figure:
    """Computes flood probability sensitivity as River Gauge varies from 1.0m to 12.0m."""
    test_gauges = np.linspace(1.0, 12.0, 30)
    probabilities = []
    st_meta = NASHIK_STATIONS.get(location, {"warning_gauge_m": 6.5, "danger_gauge_m": 8.5})

    for g in test_gauges:
        pred = predictor.predict_scenario(
            location=location,
            rainfall_mm=current_rain_mm,
            rainfall_intensity_mm_h=current_int_mm_h,
            river_water_level_m=float(g),
            water_level_change_rate_m_h=current_rate_m_h,
            soil_moisture_pct=current_sm_pct,
            flow_rate_cusecs=current_flow_cusecs
        )
        probabilities.append(pred["flood_probability_pct"])

    curr_pred = predictor.predict_scenario(
        location=location,
        rainfall_mm=current_rain_mm,
        rainfall_intensity_mm_h=current_int_mm_h,
        river_water_level_m=current_gauge_m,
        water_level_change_rate_m_h=current_rate_m_h,
        soil_moisture_pct=current_sm_pct,
        flow_rate_cusecs=current_flow_cusecs
    )
    curr_prob = curr_pred["flood_probability_pct"]

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=test_gauges,
        y=probabilities,
        mode="lines",
        name="Gauge Sensitivity",
        line=dict(color="#00f0ff", width=3)
    ))
    fig.add_trace(go.Scatter(
        x=[current_gauge_m],
        y=[curr_prob],
        mode="markers+text",
        name="Current Gauge",
        text=[f"Current: {current_gauge_m:.1f}m ({curr_prob}%)"],
        textposition="bottom right",
        marker=dict(color=curr_pred["risk_color"], size=13, line=dict(color="#ffffff", width=2))
    ))

    # Warning & Danger Gauge Lines
    fig.add_vline(x=st_meta["warning_gauge_m"], line_dash="dot", line_color="#f59e0b", annotation_text="Blue Line")
    fig.add_vline(x=st_meta["danger_gauge_m"], line_dash="dash", line_color="#ef4444", annotation_text="Red Line")

    layout = _base_layout(f"Risk-Level Transition vs. River Gauge Level ({location})", height=320)
    layout.update(
        xaxis=dict(title="River Water Level Gauge (m)", gridcolor=GRID_COLOR),
        yaxis=dict(title="Predicted Inundation Probability (%)", gridcolor=GRID_COLOR, range=[0, 105]),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    fig.update_layout(layout)
    return fig


# =========================================================================
# 2. HEAT GUARD AI CHARTS
# =========================================================================

def build_heat_diurnal_chart(temp_max: float, rh_at_tmax: float, city_name: str) -> go.Figure:
    """Generates 24-hour diurnal thermal cycle: Temp, RH, Heat Index & Wet-Bulb vs. Time."""
    hours = np.arange(0, 24)
    # Sinusoidal diurnal temperature: Min at 06:00, Peak at 14:00
    temp_min = temp_max - 12.0
    temps = []
    rhs = []
    his = []
    wbs = []

    for h in hours:
        # Solar angle factor (0 at 06:00, 1 at 14:00)
        phi = (h - 6.0) % 24
        if phi <= 12:
            t = temp_min + (temp_max - temp_min) * (math.sin(math.pi * phi / 16.0) ** 1.5)
        else:
            t = temp_max - (temp_max - temp_min) * (((phi - 12) / 12.0) ** 0.8)
        t = round(max(temp_min, t), 1)

        # Inverse relative humidity: high at dawn, lowest in afternoon
        rh = round(max(10.0, min(95.0, rh_at_tmax + (temp_max - t) * 1.8)), 1)
        hi = compute_heat_index_c(t, rh)
        wb = compute_wet_bulb_c(t, rh)

        temps.append(t)
        rhs.append(rh)
        his.append(hi)
        wbs.append(wb)

    fig = go.Figure()
    # Temperature & Heat Index lines
    fig.add_trace(go.Scatter(x=hours, y=temps, name="Ambient Temp (°C)", line=dict(color="#20364D", width=2)))
    fig.add_trace(go.Scatter(x=hours, y=his, name="NWS Heat Index (°C)", line=dict(color="#f59e0b", width=3)))
    fig.add_trace(go.Scatter(x=hours, y=wbs, name="Wet-Bulb Temp (°C)", line=dict(color="#38bdf8", width=2, dash="dot")))
    # Relative Humidity (secondary axis)
    fig.add_trace(go.Scatter(x=hours, y=rhs, name="Relative Humidity (%)", line=dict(color="#34d399", width=1.5, dash="dash"), yaxis="y2"))

    # IMD Threshold Lines
    fig.add_hline(y=40.0, line_dash="dot", line_color="#fbbf24", annotation_text="IMD Heatwave Threshold (40°C)")
    fig.add_hline(y=45.0, line_dash="dash", line_color="#ef4444", annotation_text="IMD Severe Heatwave (45°C)")

    layout = _base_layout(f"24-Hour Diurnal Thermal Profile & Heat Index ({city_name})", height=350)
    layout.update(
        xaxis=dict(title="Hour of Day (00:00 - 23:00 IST)", gridcolor=GRID_COLOR, tickmode="linear", tick0=0, dtick=2),
        yaxis=dict(title="Temperature & Indices (°C)", gridcolor=GRID_COLOR, range=[20, max(55.0, max(his) + 5)]),
        yaxis2=dict(title="Relative Humidity (%)", overlaying="y", side="right", range=[0, 100], showgrid=False),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    fig.update_layout(layout)
    return fig


def build_heat_sensitivity_curve(current_temp: float, current_rh: float) -> go.Figure:
    """Plots Temperature vs. Heat Index with RH isopleths and risk thresholds."""
    temps = np.linspace(26.0, 48.0, 25)
    fig = go.Figure()

    rh_levels = [25.0, 45.0, 65.0, 85.0]
    colors = ["#38bdf8", "#34d399", "#fbbf24", "#ef4444"]

    for rh, col in zip(rh_levels, colors):
        hi_curve = [compute_heat_index_c(t, rh) for t in temps]
        fig.add_trace(go.Scatter(
            x=temps, y=hi_curve, mode="lines",
            name=f"RH: {int(rh)}%", line=dict(color=col, width=2)
        ))

    # Current Operating Point
    curr_hi = compute_heat_index_c(current_temp, current_rh)
    fig.add_trace(go.Scatter(
        x=[current_temp], y=[curr_hi], mode="markers+text",
        name="Current Reading",
        text=[f"Current: {curr_hi}°C"],
        textposition="top left",
        marker=dict(color="#2784D8", size=13, line=dict(color="#ef4444", width=3))
    ))

    # Reference Hazard Thresholds
    fig.add_hline(y=41.0, line_dash="dot", line_color="#fbbf24", annotation_text="NWS Danger (41°C)")
    fig.add_hline(y=54.0, line_dash="dash", line_color="#ef4444", annotation_text="NWS Extreme Danger (54°C)")

    layout = _base_layout("Temperature vs. Heat Index Sensitivity (RH Curves)", height=330)
    layout.update(
        xaxis=dict(title="Dry-Bulb Temperature (°C)", gridcolor=GRID_COLOR),
        yaxis=dict(title="Calculated Heat Index (°C)", gridcolor=GRID_COLOR, range=[25, 65]),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    fig.update_layout(layout)
    return fig


# =========================================================================
# 3. FIRE GUARD AI CHARTS
# =========================================================================

def build_fire_weather_trend_chart(
    temp_c: float,
    rh_pct: float,
    wind_kph: float,
    current_dry_days: int
) -> go.Figure:
    """Simulates 14-day dry spell progression for FFMC, BUI, and FWI."""
    days = list(range(0, 16))
    ffmc_vals = []
    bui_vals = []
    fwi_vals = []

    for d in days:
        eval_res = calculate_fwi_system(temp_c, rh_pct, wind_kph, days_without_rain=d)
        ffmc_vals.append(eval_res["ffmc"])
        bui_vals.append(eval_res["bui"])
        fwi_vals.append(eval_res["fwi_score"])

    curr_res = calculate_fwi_system(temp_c, rh_pct, wind_kph, days_without_rain=current_dry_days)
    curr_fwi = curr_res["fwi_score"]

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=days, y=ffmc_vals, name="Fine Fuel Moisture (FFMC)", line=dict(color="#38bdf8", width=2)))
    fig.add_trace(go.Scatter(x=days, y=bui_vals, name="Buildup Index (BUI)", line=dict(color="#818cf8", width=2, dash="dot")))
    fig.add_trace(go.Scatter(x=days, y=fwi_vals, name="Fire Weather Index (FWI)", line=dict(color="#ef4444", width=3.2)))

    # Current Day Marker
    fig.add_trace(go.Scatter(
        x=[current_dry_days], y=[curr_fwi], mode="markers+text",
        name="Current Dryness",
        text=[f"Day {current_dry_days}: FWI {curr_fwi}"],
        textposition="top center",
        marker=dict(color=curr_res["risk_color"], size=13, line=dict(color="#ffffff", width=2))
    ))

    # FWI Category Thresholds
    fig.add_hline(y=13.0, line_dash="dot", line_color="#fbbf24", annotation_text="High Fire Danger (13)")
    fig.add_hline(y=38.0, line_dash="dash", line_color="#ef4444", annotation_text="Extreme Fire Danger (38)")

    layout = _base_layout("14-Day Dry Spell Progression vs. Fire Weather Index (FWI)", height=350)
    layout.update(
        xaxis=dict(title="Days Without Rainfall (Cumulative Drying Days)", gridcolor=GRID_COLOR, dtick=2),
        yaxis=dict(title="FWI Index Value & Fuel Codes", gridcolor=GRID_COLOR, range=[0, max(60.0, max(fwi_vals) + 10)]),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    fig.update_layout(layout)
    return fig


def build_fire_wind_sensitivity_chart(
    temp_c: float,
    rh_pct: float,
    dry_days: int,
    current_wind: float
) -> go.Figure:
    """Shows the non-linear relationship between Wind Speed and Fire Weather Index."""
    winds = np.linspace(2.0, 60.0, 25)
    fwi_curve = []

    for w in winds:
        res = calculate_fwi_system(temp_c, rh_pct, float(w), days_without_rain=dry_days)
        fwi_curve.append(res["fwi_score"])

    curr_res = calculate_fwi_system(temp_c, rh_pct, current_wind, days_without_rain=dry_days)
    curr_fwi = curr_res["fwi_score"]

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=winds, y=fwi_curve, mode="lines",
        name="FWI Spread Acceleration", line=dict(color="#f97316", width=3)
    ))
    fig.add_trace(go.Scatter(
        x=[current_wind], y=[curr_fwi], mode="markers+text",
        name="Current Wind Speed",
        text=[f"{current_wind} km/h: FWI {curr_fwi}"],
        textposition="top left",
        marker=dict(color=curr_res["risk_color"], size=13, line=dict(color="#ffffff", width=2))
    ))

    fig.add_hline(y=22.0, line_dash="dot", line_color="#fbbf24", annotation_text="Very High (22)")
    fig.add_hline(y=38.0, line_dash="dash", line_color="#ef4444", annotation_text="Extreme (38)")

    layout = _base_layout("Fire Weather Index (FWI) vs. 10m Wind Speed", height=320)
    layout.update(
        xaxis=dict(title="Wind Velocity (km/h)", gridcolor=GRID_COLOR),
        yaxis=dict(title="Fire Weather Index Score", gridcolor=GRID_COLOR),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    fig.update_layout(layout)
    return fig


# =========================================================================
# 4. CROP SHIELD AI CHARTS
# =========================================================================

def build_crop_water_demand_chart(crop_name: str, current_stage_idx: int, eto_mm: float) -> go.Figure:
    """FAO-56 Crop Coefficient (Kc) and Daily Crop Water Demand (ETc) across growth stages."""
    crop = CROP_PROFILES.get(crop_name, CROP_PROFILES["Onion (Nashik Red)"])
    stages = crop["stages"]
    kc_values = crop["kc_by_stage"]
    etc_values = [round(eto_mm * kc, 1) for kc in kc_values]

    fig = go.Figure()
    # Bar chart for ETc demand
    colors = ["#38bdf8" if i != current_stage_idx else "#fbbf24" for i in range(len(stages))]
    fig.add_trace(go.Bar(
        x=stages, y=etc_values, name="Daily Water Demand ETc (mm/day)",
        marker_color=colors, text=etc_values, textposition="auto"
    ))
    # Line for Kc multiplier
    fig.add_trace(go.Scatter(
        x=stages, y=kc_values, name="FAO-56 Kc Multiplier",
        line=dict(color="#34d399", width=2.5), yaxis="y2"
    ))

    layout = _base_layout(f"Phenological Stage Crop Water Demand ETc ({crop_name})", height=340)
    layout.update(
        xaxis=dict(title="Crop Growth Stage", gridcolor=GRID_COLOR),
        yaxis=dict(title="Crop Water Demand ETc (mm/day)", gridcolor=GRID_COLOR, range=[0, max(etc_values) + 3]),
        yaxis2=dict(title="FAO-56 Kc Coeff", overlaying="y", side="right", range=[0, 1.5], showgrid=False),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    fig.update_layout(layout)
    return fig


def build_crop_water_balance_chart(
    etc_demand: float,
    rainfall_24h: float,
    soil_moisture_pct: float
) -> go.Figure:
    """Visualizes Water Demand vs. Water Supply & Soil Infiltration Balance."""
    # Available water proxy from rain + accessible soil storage
    effective_rain = rainfall_24h * 0.8
    # Baseline available root soil water: 50% is standard balance point
    soil_water_contribution = (soil_moisture_pct - 35.0) * 0.25
    available_water = max(0.0, effective_rain + soil_water_contribution)
    balance = available_water - etc_demand

    categories = ["Crop Demand (ETc)", "Available Water", "Net Water Balance"]
    values = [etc_demand, available_water, balance]
    bar_colors = ["#38bdf8", "#34d399", "#10b981" if balance >= 0 else "#ef4444"]

    fig = go.Figure(go.Bar(
        x=categories, y=values, marker_color=bar_colors,
        text=[f"{v:+.1f} mm" if i == 2 else f"{v:.1f} mm" for i, v in enumerate(values)],
        textposition="auto"
    ))

    layout = _base_layout("Crop Water Demand vs. Available Water Supply (24h Balance)", height=320)
    layout.update(
        yaxis=dict(title="Water Quantity (mm/day)", gridcolor=GRID_COLOR),
        xaxis=dict(gridcolor=GRID_COLOR)
    )
    fig.update_layout(layout)
    return fig


def build_crop_soil_spectrum_chart(current_sm_pct: float) -> go.Figure:
    """Visualizes where soil moisture lies along the 5 Agronomic Zones."""
    fig = go.Figure(go.Indicator(
        mode="gauge+number",
        value=current_sm_pct,
        title={'text': "Root-Zone Soil Moisture (%) & Stress Zones", 'font': {'color': '#20364D'}},
        gauge={
            'axis': {'range': [0, 100], 'tickcolor': "#20364D"},
            'bar': {'color': "#38bdf8", 'thickness': 0.3},
            'steps': [
                {'range': [0, 35], 'color': "rgba(239, 68, 68, 0.45)"},      # Permanent Wilting / Drought
                {'range': [35, 50], 'color': "rgba(245, 158, 11, 0.35)"},    # Moisture Deficit
                {'range': [50, 75], 'color': "rgba(16, 185, 129, 0.40)"},    # Optimum
                {'range': [75, 85], 'color': "rgba(56, 189, 248, 0.35)"},    # Wet / Field Capacity
                {'range': [85, 100], 'color': "rgba(239, 68, 68, 0.55)"}     # Waterlogging Root Rot
            ],
            'threshold': {
                'line': {'color': "#ffffff", 'width': 3},
                'thickness': 0.8,
                'value': current_sm_pct
            }
        }
    ))
    layout = _base_layout("", height=220)
    fig.update_layout(layout)
    return fig


# =========================================================================
# 5. DRAINAGE NETWORK CHARTS
# =========================================================================

def build_drainage_storm_hydrograph(
    node_name: str,
    crit_depth_cm: float,
    capacity_lpm: float,
    current_depth_cm: float,
    current_flow_lpm: float,
    current_rain_mm_h: float
) -> go.Figure:
    """Simulates 6-hour urban storm event: Water Depth, Expected Discharge & Choked Outflow."""
    hours = np.linspace(0, 6, 25)
    # Triangular storm rainfall pulse peaking at hour 2.5
    rain_pulse = [max(0.0, current_rain_mm_h * math.exp(-((t - 2.5) ** 2) / 1.5)) for t in hours]

    depth_curve = []
    exp_flow_curve = []
    actual_flow_curve = []
    blockage_curve = []

    # Scaling factor based on user's current reading
    depth_scale = current_depth_cm / max(15.0, crit_depth_cm * 0.6)

    for r in rain_pulse:
        depth = min(crit_depth_cm * 1.3, max(5.0, (15.0 + r * 1.8) * depth_scale))
        depth_fraction = min(depth / max(crit_depth_cm, 1.0), 1.5)
        expected = capacity_lpm * (depth_fraction ** 0.5) * 0.75 + (r * 25.0)

        # Choked flow simulation reflecting current blockage severity
        flow_ratio = current_flow_lpm / max(100.0, (capacity_lpm * (current_depth_cm / crit_depth_cm) ** 0.5 * 0.75 + current_rain_mm_h * 25.0))
        flow_ratio = max(0.2, min(1.0, flow_ratio))
        actual = expected * flow_ratio

        blk = max(0.0, min(100.0, (1.0 - (actual / max(expected, 1.0))) * 100.0))

        depth_curve.append(round(depth, 1))
        exp_flow_curve.append(round(expected, 1))
        actual_flow_curve.append(round(actual, 1))
        blockage_curve.append(round(blk, 1))

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=hours, y=depth_curve, name="Culvert Water Depth (cm)", line=dict(color="#38bdf8", width=2.8)))
    fig.add_trace(go.Scatter(x=hours, y=exp_flow_curve, name="Expected Hydraulic Flow (LPM)", line=dict(color="#34d399", width=2, dash="dash"), yaxis="y2"))
    fig.add_trace(go.Scatter(x=hours, y=actual_flow_curve, name="Measured Choked Flow (LPM)", line=dict(color="#f59e0b", width=2.5), yaxis="y2"))

    # Critical Submergence Depth Line
    fig.add_hline(y=crit_depth_cm, line_dash="dash", line_color="#ef4444", annotation_text=f"Critical Depth ({crit_depth_cm}cm)")

    layout = _base_layout(f"6-Hour Urban Storm Hydrograph & Hydraulic Balancing ({node_name})", height=350)
    layout.update(
        xaxis=dict(title="Storm Event Duration (Hours)", gridcolor=GRID_COLOR, dtick=1),
        yaxis=dict(title="Water Depth (cm)", gridcolor=GRID_COLOR, range=[0, max(crit_depth_cm * 1.4, max(depth_curve) + 10)]),
        yaxis2=dict(title="Discharge Flow (LPM)", overlaying="y", side="right", range=[0, max(exp_flow_curve) * 1.2], showgrid=False),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    fig.update_layout(layout)
    return fig


def build_drainage_blockage_trend_chart(
    hours: List[float],
    blockage_pct_list: List[float],
    current_blockage: float
) -> go.Figure:
    """Plots Blockage Discrepancy Index (%) over time with severity thresholds."""
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=hours, y=blockage_pct_list, mode="lines+markers",
        name="Blockage Index (%)", line=dict(color="#ef4444", width=3)
    ))

    fig.add_hline(y=35.0, line_dash="dot", line_color="#fbbf24", annotation_text="Warning (35%)")
    fig.add_hline(y=60.0, line_dash="dash", line_color="#ef4444", annotation_text="Critical Choke (60%)")

    layout = _base_layout("Calculated Blockage Anomaly (%) vs. Storm Timeline", height=300)
    layout.update(
        xaxis=dict(title="Timeline (Hours)", gridcolor=GRID_COLOR),
        yaxis=dict(title="Blockage Discrepancy Index (%)", gridcolor=GRID_COLOR, range=[0, 105]),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    fig.update_layout(layout)
    return fig


def build_drainage_capacity_sensitivity_chart(
    crit_depth_cm: float,
    capacity_lpm: float,
    current_rain_mm_h: float
) -> go.Figure:
    """Rainfall Intensity vs. Drainage Capacity Utilization (%) under Clean vs. Choked states."""
    rain_range = np.linspace(0.0, 80.0, 25)
    clean_util = [min(140.0, (r * 35.0 / capacity_lpm) * 100.0 + 20.0) for r in rain_range]
    choked_util = [min(180.0, (r * 35.0 / (capacity_lpm * 0.45)) * 100.0 + 35.0) for r in rain_range]

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=rain_range, y=clean_util, name="Design Clean Culvert", line=dict(color="#34d399", width=2.5)))
    fig.add_trace(go.Scatter(x=rain_range, y=choked_util, name="Choked Screen / Silt Buildup", line=dict(color="#ef4444", width=2.8)))

    fig.add_vline(x=current_rain_mm_h, line_dash="dot", line_color="#38bdf8", annotation_text=f"Current: {current_rain_mm_h}mm/h")
    fig.add_hline(y=100.0, line_dash="dash", line_color="#ef4444", annotation_text="100% Inundation Overflow")

    layout = _base_layout("Storm Rainfall Intensity vs. Drainage Capacity Utilization", height=320)
    layout.update(
        xaxis=dict(title="Rainfall Intensity (mm/h)", gridcolor=GRID_COLOR),
        yaxis=dict(title="Capacity Utilization (%)", gridcolor=GRID_COLOR, range=[0, 160]),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    fig.update_layout(layout)
    return fig


# =========================================================================
# 6. MULTI-HAZARD EXECUTIVE COMMAND RADAR
# =========================================================================

def build_multi_hazard_radar_chart(
    flood_prob_pct: float,
    heat_score: float,
    fwi_score: float,
    crop_stress_pct: float,
    drainage_blockage_pct: float
) -> go.Figure:
    """Generates normalized radar and bar chart across all five environmental hazards."""
    # Normalize FWI to 0-100 scale (38 is Extreme = 100%)
    fwi_norm = min(100.0, (fwi_score / 38.0) * 100.0)

    categories = [
        "1. Flood Inundation",
        "2. Heatwave Stress",
        "3. Wildfire Weather (FWI)",
        "4. Crop Water Stress",
        "5. Storm Drain Blockage"
    ]
    values = [flood_prob_pct, heat_score, fwi_norm, crop_stress_pct, drainage_blockage_pct]

    # Polar Radar
    fig = go.Figure()
    fig.add_trace(go.Scatterpolar(
        r=values + [values[0]],
        theta=categories + [categories[0]],
        fill='toself',
        fillcolor="rgba(56, 189, 248, 0.25)",
        line=dict(color="#38bdf8", width=2.5),
        name="Current Risk Profile"
    ))

    fig.update_layout(
        template=CHART_THEME,
        paper_bgcolor=BG_COLOR,
        polar=dict(
            radialaxis=dict(visible=True, range=[0, 100], gridcolor=GRID_COLOR, tickfont=dict(color="#5B7188")),
            angularaxis=dict(gridcolor=GRID_COLOR, tickfont=dict(family=FONT_FAMILY, color="#20364D", size=12))
        ),
        title=dict(text="Statewide Multi-Hazard Threat Profile (Normalized 0-100%)", font=dict(family=FONT_FAMILY, size=15, color="#20364D")),
        height=380,
        margin=dict(l=45, r=45, t=50, b=45)
    )
    return fig
