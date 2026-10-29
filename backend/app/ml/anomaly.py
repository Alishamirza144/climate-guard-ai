"""Anomaly detection for time-series monitoring.

This module intentionally combines two simple, interpretable detectors:
- IsolationForest on rolling feature windows
- robust z-score on a single series with median/MAD

The output is a 0-1 anomaly score and a human-readable reason string for UI or alerting.
"""

from __future__ import annotations

import math
from typing import Iterable

import numpy as np
from sklearn.ensemble import IsolationForest


def _median_abs_deviation(values: Iterable[float]) -> tuple[float, float]:
    arr = np.asarray(list(values), dtype=float)
    if arr.size == 0:
        return 0.0, 0.0
    median = float(np.median(arr))
    mad = float(np.median(np.abs(arr - median)))
    if mad == 0:
        return median, 0.0
    return median, mad


def rolling_robust_zscore(series: Iterable[float], window: int = 12) -> list[float]:
    values = list(series)
    output: list[float] = []
    for idx in range(len(values)):
        start = max(0, idx - window + 1)
        slice_values = values[start:idx + 1]
        median, mad = _median_abs_deviation(slice_values)
        current = float(values[idx])
        if mad == 0:
            output.append(0.0)
        else:
            output.append(abs(current - median) / (1.4826 * mad))
    return output


def isolation_forest_anomaly_matrix(series: Iterable[float], window: int = 12) -> list[float]:
    values = np.asarray(list(series), dtype=float).reshape(-1, 1)
    if values.size == 0:
        return []
    model = IsolationForest(contamination=0.05, random_state=0)
    model.fit(values)
    scores = -model.score_samples(values)
    low = float(np.min(scores))
    high = float(np.max(scores))
    if high == low:
        return [0.0 for _ in values]
    return [float((score - low) / (high - low)) for score in scores]


def anomaly_score_0_1(series: Iterable[float], *, window: int = 12) -> float:
    stats = isolation_forest_anomaly_matrix(series, window)
    zscores = rolling_robust_zscore(series, window)
    if not stats or not zscores:
        return 0.0
    combined = [0.5 * s + 0.5 * min(z / 5.0, 1.0) for s, z in zip(stats, zscores)]
    return float(min(max(np.mean(combined), 0.0), 1.0))


def describe_anomaly(
    series_name: str,
    current_value: float,
    previous_value: float,
    baseline_value: float,
    delta_pct: float,
) -> str:
    if baseline_value == 0:
        baseline_value = 1e-9
    change_pct = ((current_value - previous_value) / max(abs(previous_value), 1e-6)) * 100.0
    if "water" in series_name.lower() and change_pct > 0:
        return f"{series_name} rising {abs(change_pct):.1f}% while baseline is {baseline_value:.1f}; this may indicate rapid accumulation."
    if "flow" in series_name.lower() and delta_pct < -20:
        return f"{series_name} dropped {abs(delta_pct):.1f}% despite rising conditions, suggesting a possible lag or blockage signal."
    if "rain" in series_name.lower() and current_value > baseline_value:
        return f"rainfall exceeded baseline by {abs((current_value / baseline_value) - 1.0) * 100.0:.1f}% over the recent window."
    if "soil" in series_name.lower() and current_value < baseline_value * 0.8:
        return f"soil moisture is {abs((1 - current_value / baseline_value) * 100.0):.1f}% below the recent baseline."
    return f"{series_name} deviated materially from its recent baseline; monitor the trend closely."


def detect_anomaly_reason(
    metric_name: str,
    current: float,
    reference: float,
    direction: str,
    scale: float,
) -> str:
    delta = current - reference
    proportional = (delta / max(abs(reference), 1e-6)) * 100.0
    if direction == "rising":
        return f"{metric_name} rising {abs(proportional):.1f}% while the local baseline sits at {reference:.1f}; this is {scale:.1f}x the recent norm."
    if direction == "falling":
        return f"{metric_name} dropped {abs(proportional):.1f}% versus the recent baseline, which may indicate depletion or blockage."
    return f"{metric_name} is out of line with the recent baseline by {abs(proportional):.1f}%."


def detect_anomaly_profile(
    water_level_cm: float | list[float],
    flow_m3s: float | list[float],
    rainfall_mm: float | list[float],
    soil_moisture_pct: float | list[float],
) -> dict[str, float | str]:
    water = list(water_level_cm) if isinstance(water_level_cm, list) else [float(water_level_cm)]
    flow = list(flow_m3s) if isinstance(flow_m3s, list) else [float(flow_m3s)]
    rain = list(rainfall_mm) if isinstance(rainfall_mm, list) else [float(rainfall_mm)]
    soil = list(soil_moisture_pct) if isinstance(soil_moisture_pct, list) else [float(soil_moisture_pct)]

    water_score = anomaly_score_0_1(water)
    flow_score = anomaly_score_0_1(flow)
    rain_score = anomaly_score_0_1(rain)
    soil_score = anomaly_score_0_1(soil)

    final = min(1.0, max(water_score, flow_score, rain_score, soil_score))
    reasons: list[str] = []
    if water_score >= 0.5 and len(water) > 1:
        reasons.append(describe_anomaly("water level", water[-1], water[-2], np.median(water), 0.0))
    if flow_score >= 0.5 and len(flow) > 1:
        reasons.append(describe_anomaly("flow", flow[-1], flow[-2], np.median(flow), 0.0))
    if rain_score >= 0.5 and len(rain) > 1:
        reasons.append(describe_anomaly("rainfall", rain[-1], rain[-2], np.median(rain), 0.0))
    if soil_score >= 0.5 and len(soil) > 1:
        reasons.append(describe_anomaly("soil moisture", soil[-1], soil[-2], np.median(soil), 0.0))
    if not reasons:
        reasons.append("No material anomaly detected against the recent dynamic baseline.")
    return {
        "score": round(float(final), 3),
        "level": "High" if final >= 0.75 else "Moderate" if final >= 0.45 else "Low",
        "reason": " | ".join(reasons[:2]),
    }
