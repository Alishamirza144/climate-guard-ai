"""Inverse-distance-weighting interpolation for smooth heat-map surfaces."""

from __future__ import annotations

from typing import Sequence


def inverse_distance_weighting(
    points: Sequence[tuple[float, float, float]],
    width: int = 40,
    height: int = 40,
    power: float = 2.0,
) -> list[list[float]]:
    """Upsample scattered risk values to a dense 2D surface using IDW.

    Each point is (lat, lon, value). The output is a height x width matrix of
    interpolated values in the range [0, 1].
    """
    if not points:
        return [[0.0 for _ in range(width)] for _ in range(height)]
    if width <= 0 or height <= 0:
        raise ValueError("width and height must be positive")

    lats = [point[0] for point in points]
    lons = [point[1] for point in points]
    values = [float(point[2]) for point in points]

    lat_min, lat_max = min(lats), max(lats)
    lon_min, lon_max = min(lons), max(lons)

    grid: list[list[float]] = []
    for row in range(height):
        values_row: list[float] = []
        y_ratio = (height - 1) and row / (height - 1)
        lat = lat_min + (lat_max - lat_min) * y_ratio
        for col in range(width):
            x_ratio = (width - 1) and col / (width - 1)
            lon = lon_min + (lon_max - lon_min) * x_ratio
            numerator = 0.0
            denominator = 0.0
            for lat_p, lon_p, value in zip(lats, lons, values):
                distance_sq = (lat - lat_p) ** 2 + (lon - lon_p) ** 2
                if distance_sq == 0:
                    numerator = value
                    denominator = 1.0
                    break
                weight = 1.0 / (distance_sq ** (power / 2.0))
                numerator += weight * value
                denominator += weight
            values_row.append(numerator / denominator if denominator else 0.0)
        grid.append(values_row)
    return grid


def smooth_heat_values(
    points: Sequence[tuple[float, float, float]],
    width: int = 40,
    height: int = 40,
    power: float = 2.0,
) -> list[list[float]]:
    """Convenience wrapper returning the dense interpolated heat surface."""
    return inverse_distance_weighting(points, width=width, height=height, power=power)
