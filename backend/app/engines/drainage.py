"""Drainage blockage detection for storm-water monitoring sensors.

This module treats the sensor stream as a hydraulic balancing problem: if water
level rises while flow falls below expected discharge for that level, the channel
is showing a blockage signature. The detector keeps the implementation explainable
and lightweight so it can run both in the app and in tests without external
services.
"""

from __future__ import annotations

import math
from collections.abc import Mapping, Sequence
from typing import Any

from app.ml.anomaly import anomaly_score_0_1


def _clean_float(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        result = float(value)
    except (TypeError, ValueError):
        return default
    if math.isnan(result) or math.isinf(result):
        return default
    return result


def _as_sequence(values: Sequence[Mapping[str, Any]] | Sequence[dict[str, Any]] | None) -> list[dict[str, Any]]:
    if values is None:
        return []
    output: list[dict[str, Any]] = []
    for item in values:
        if isinstance(item, Mapping):
            output.append(dict(item))
        else:
            output.append({"water_level_cm": item[0] if len(item) > 0 else 0.0, "flow_lpm": item[1] if len(item) > 1 else 0.0, "rainfall_mm": item[2] if len(item) > 2 else 0.0})
    return output


def clamp(value: float, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _expected_flow_lpm(water_level_cm: float, rainfall_mm: float = 0.0) -> float:
    """A calibrated hydraulic proxy for a drain/channel system.

    The relationship is intentionally simple: larger water levels and recent rain
    raise the expected discharge, but a falling flow relative to that expectation is
    the signature that indicates buildup or blockage.
    """
    water = max(0.0, _clean_float(water_level_cm, 0.0))
    rain = max(0.0, _clean_float(rainfall_mm, 0.0))
    return 5.0 * water + 6.0 * rain + 10.0


def _sensor_fault(series: list[dict[str, Any]]) -> bool:
    for sample in series:
        water = _clean_float(sample.get("water_level_cm"), 0.0)
        flow = _clean_float(sample.get("flow_lpm"), 0.0)
        rain = _clean_float(sample.get("rainfall_mm"), 0.0)
        soil = _clean_float(sample.get("soil_moisture_pct"), 0.0)
        if water < 0 or water > 400 or flow < 0 or flow > 5000 or rain < 0 or rain > 250 or soil < 0 or soil > 100:
            return True
    return False


def detect_blockage_signature(series: Sequence[Mapping[str, Any]] | Sequence[dict[str, Any]]) -> dict[str, Any]:
    """Return explainable blockage risk for a short sensor time series."""
    samples = _as_sequence(series)
    if not samples:
        return {"flagged": False, "severity": "Normal", "probability": 0.0, "state": "normal", "reason": "No readings available."}

    if _sensor_fault(samples):
        return {
            "flagged": False,
            "severity": "Sensor fault",
            "probability": 0.15,
            "state": "fault",
            "reason": "One or more readings are outside physically plausible ranges; treat the channel as sensor-faulted rather than blocked.",
        }

    water_levels = [_clean_float(sample.get("water_level_cm"), 0.0) for sample in samples]
    flow_values = [_clean_float(sample.get("flow_lpm"), 0.0) for sample in samples]
    rain_values = [_clean_float(sample.get("rainfall_mm"), 0.0) for sample in samples]

    starting_level = water_levels[0]
    ending_level = water_levels[-1]
    water_rise_pct = 0.0 if starting_level <= 0 else ((ending_level - starting_level) / starting_level) * 100.0
    average_flow = sum(flow_values) / max(len(flow_values), 1)
    current_flow = flow_values[-1]
    flow_drop_pct = 0.0 if average_flow <= 0 else ((average_flow - current_flow) / average_flow) * 100.0
    expected_current = _expected_flow_lpm(ending_level, rain_values[-1])
    efficiency = current_flow / max(expected_current, 1.0)
    anomaly_score = (anomaly_score_0_1(flow_values) + anomaly_score_0_1(water_levels)) / 2.0

    probability = clamp(
        0.12
        + max(0.0, (1.0 - efficiency)) * 0.95
        + max(0.0, water_rise_pct / 100.0) * 0.25
        + max(0.0, flow_drop_pct / 100.0) * 0.50
        + max(0.0, anomaly_score - 0.3) * 0.55,
        0.0,
        1.0,
    )
    if probability >= 0.85:
        severity = "Blocked"
        state = "blocked"
    elif probability >= 0.65:
        severity = "Blockage Likely"
        state = "risk"
    elif probability >= 0.4:
        severity = "Watch"
        state = "watch"
    else:
        severity = "Normal"
        state = "normal"

    reason = (
        f"Water level rose {water_rise_pct:.1f}% while flow efficiency is {efficiency:.2f} of the expected hydraulic trend; "
        f"the recent anomaly score is {anomaly_score:.2f}."
    )
    flagged = probability >= 0.4
    return {
        "flagged": flagged,
        "severity": severity,
        "probability": round(probability, 3),
        "state": state,
        "reason": reason,
    }


def analyze_drainage_series(series: Sequence[Mapping[str, Any]] | Sequence[dict[str, Any]]) -> dict[str, Any]:
    """Public, UI-friendly wrapper around the blockage signature logic."""
    result = detect_blockage_signature(series)
    return {
        "state": result["state"],
        "blockage_probability": float(result["probability"]),
        "flagged": bool(result["flagged"]),
        "severity": result["severity"],
        "reason": result["reason"],
    }
