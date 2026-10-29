"""NASA GIBS tile URL template helpers for the frontend map layer stack."""

from __future__ import annotations


def get_tile_templates() -> dict[str, str]:
    """Return WMTS URL templates for NDVI and true-colour layers."""
    return {
        "ndvi": "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_L3_NDVI_8Day/default/{time}/EPSG3857/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg",
        "true_color": "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/{time}/EPSG3857/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg",
    }
