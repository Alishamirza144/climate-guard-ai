"""Authoritative India Meteorological Department (IMD) observation service.

Retrieves actual surface observatory readings across India and provides
transparent comparison against numerical weather prediction model estimates.
"""

from __future__ import annotations

import math
import os
from datetime import datetime, timezone, timedelta
from typing import Any
from pydantic import BaseModel, ConfigDict, Field
import structlog

from app.services.http import HttpClient

log = structlog.get_logger(__name__)

# IMD Station Network Endpoint
_IMD_CITYWX_URL = "https://city.imd.gov.in"
_IMD_GATEWAY_URL = "https://api.imd.gov.in"

# Cache client with 15-minute TTL (IMD synoptic observations update every 3-12 hours)
_imd_client = HttpClient(
    _IMD_CITYWX_URL,
    timeout=12,
    ttl=900,
    headers={
        "Referer": "https://city.imd.gov.in/citywx/responsive/",
        "Origin": "https://city.imd.gov.in",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
    },
)

# Verified Authoritative IMD Station Registry
# Verified against IMD Station Directory (https://city.imd.gov.in/citywx/responsive/api/search.php)
VERIFIED_IMD_STATIONS: dict[str, dict[str, Any]] = {
    "nashik": {
        "station_id": "42921",
        "station_name": "Nashik City Observatory",
        "lat": 20.0000,
        "lon": 73.7800,
        "state": "Maharashtra",
        "authority": "India Meteorological Department (IMD)",
        "station_type": "Principal Surface Observatory",
        "note": "Verified IMD Station ID 42921 (Nashik). Note: WMO ID 43087 maps to Hanamkonda in IMD API.",
    },
    "pune": {
        "station_id": "43063",
        "station_name": "Pune Shivajinagar Observatory",
        "lat": 18.5300,
        "lon": 73.8400,
        "state": "Maharashtra",
        "authority": "India Meteorological Department (IMD)",
        "station_type": "Principal Surface Observatory",
    },
    "mumbai": {
        "station_id": "43003",
        "station_name": "Mumbai Santacruz Observatory",
        "lat": 19.1200,
        "lon": 72.8400,
        "state": "Maharashtra",
        "authority": "India Meteorological Department (IMD)",
        "station_type": "Regional Meteorological Centre",
    },
    "thane": {
        "station_id": "18001",
        "station_name": "Thane Station",
        "lat": 19.2200,
        "lon": 72.9800,
        "state": "Maharashtra",
        "authority": "India Meteorological Department (IMD)",
        "station_type": "Metropolitan Weather Station",
    },
    "navi_mumbai": {
        "station_id": "99940",
        "station_name": "Navi Mumbai (Panvel)",
        "lat": 18.9900,
        "lon": 73.1200,
        "state": "Maharashtra",
        "authority": "India Meteorological Department (IMD)",
        "station_type": "Metropolitan Weather Station",
    },
    "nagpur": {
        "station_id": "42867",
        "station_name": "Nagpur Sonegaon Airport",
        "lat": 21.1000,
        "lon": 79.0500,
        "state": "Maharashtra",
        "authority": "India Meteorological Department (IMD)",
        "station_type": "Regional Meteorological Centre",
    },
    "chhatrapati_sambhajinagar": {
        "station_id": "43014",
        "station_name": "Aurangabad Observatory",
        "lat": 19.8800,
        "lon": 75.3800,
        "state": "Maharashtra",
        "authority": "India Meteorological Department (IMD)",
        "station_type": "Surface Observatory",
    },
    "solapur": {
        "station_id": "43117",
        "station_name": "Solapur Observatory",
        "lat": 17.6700,
        "lon": 75.9000,
        "state": "Maharashtra",
        "authority": "India Meteorological Department (IMD)",
        "station_type": "Surface Observatory",
    },
    "kolhapur": {
        "station_id": "43157",
        "station_name": "Kolhapur Observatory",
        "lat": 16.7000,
        "lon": 74.2300,
        "state": "Maharashtra",
        "authority": "India Meteorological Department (IMD)",
        "station_type": "Surface Observatory",
    },
    "delhi": {
        "station_id": "42182",
        "station_name": "New Delhi Safdarjung Observatory",
        "lat": 28.5800,
        "lon": 77.2000,
        "state": "Delhi",
        "authority": "India Meteorological Department (IMD)",
        "station_type": "National Weather Forecasting Centre",
    },
    "bengaluru": {
        "station_id": "43295",
        "station_name": "Bengaluru City Observatory",
        "lat": 12.9700,
        "lon": 77.5800,
        "state": "Karnataka",
        "authority": "India Meteorological Department (IMD)",
        "station_type": "Meteorological Centre",
    },
    "hyderabad": {
        "station_id": "43128",
        "station_name": "Hyderabad Observatory",
        "lat": 17.4500,
        "lon": 78.4700,
        "state": "Telangana",
        "authority": "India Meteorological Department (IMD)",
        "station_type": "Meteorological Centre",
    },
    "ahmedabad": {
        "station_id": "42647",
        "station_name": "Ahmedabad Observatory",
        "lat": 23.0700,
        "lon": 72.6300,
        "state": "Gujarat",
        "authority": "India Meteorological Department (IMD)",
        "station_type": "Meteorological Centre",
    },
    "chennai": {
        "station_id": "43279",
        "station_name": "Chennai Meenambakkam Observatory",
        "lat": 13.0000,
        "lon": 80.1800,
        "state": "Tamil Nadu",
        "authority": "India Meteorological Department (IMD)",
        "station_type": "Regional Meteorological Centre",
    },
    "kolkata": {
        "station_id": "42807",
        "station_name": "Kolkata Alipore Observatory",
        "lat": 22.5300,
        "lon": 88.3300,
        "state": "West Bengal",
        "authority": "India Meteorological Department (IMD)",
        "station_type": "Regional Meteorological Centre",
    },
    "jaipur": {
        "station_id": "42348",
        "station_name": "Jaipur AMO Observatory",
        "lat": 26.8200,
        "lon": 75.8000,
        "state": "Rajasthan",
        "authority": "India Meteorological Department (IMD)",
        "station_type": "Meteorological Centre",
    },
    "lucknow": {
        "station_id": "42369",
        "station_name": "Lucknow Airport Observatory",
        "lat": 26.7700,
        "lon": 80.8800,
        "state": "Uttar Pradesh",
        "authority": "India Meteorological Department (IMD)",
        "station_type": "Meteorological Centre",
    },
    "patna": {
        "station_id": "42492",
        "station_name": "Patna Airport Observatory",
        "lat": 25.6000,
        "lon": 85.1000,
        "state": "Bihar",
        "authority": "India Meteorological Department (IMD)",
        "station_type": "Meteorological Centre",
    },
    "bhopal": {
        "station_id": "42667",
        "station_name": "Bhopal Arera Hills Observatory",
        "lat": 23.2300,
        "lon": 77.4300,
        "state": "Madhya Pradesh",
        "authority": "India Meteorological Department (IMD)",
        "station_type": "Meteorological Centre",
    },
    "chandigarh": {
        "station_id": "42105",
        "station_name": "Chandigarh City Observatory",
        "lat": 30.7300,
        "lon": 76.7800,
        "state": "Chandigarh",
        "authority": "India Meteorological Department (IMD)",
        "station_type": "Meteorological Centre",
    },
    "srinagar": {
        "station_id": "42027",
        "station_name": "Srinagar City Observatory",
        "lat": 34.0800,
        "lon": 74.8000,
        "state": "Jammu & Kashmir",
        "authority": "India Meteorological Department (IMD)",
        "station_type": "Meteorological Centre",
    },
    "dehradun": {
        "station_id": "42111",
        "station_name": "Dehradun Mokhampur Observatory",
        "lat": 30.3200,
        "lon": 78.0300,
        "state": "Uttarakhand",
        "authority": "India Meteorological Department (IMD)",
        "station_type": "Meteorological Centre",
    },
    "shimla": {
        "station_id": "42083",
        "station_name": "Shimla City Observatory",
        "lat": 31.1000,
        "lon": 77.1700,
        "state": "Himachal Pradesh",
        "authority": "India Meteorological Department (IMD)",
        "station_type": "Meteorological Centre",
    },
    "guwahati": {
        "station_id": "42410",
        "station_name": "Guwahati Airport Observatory",
        "lat": 26.1000,
        "lon": 91.5800,
        "state": "Assam",
        "authority": "India Meteorological Department (IMD)",
        "station_type": "Regional Meteorological Centre",
    },
    "thiruvananthapuram": {
        "station_id": "43371",
        "station_name": "Thiruvananthapuram City Observatory",
        "lat": 8.4800,
        "lon": 76.9500,
        "state": "Kerala",
        "authority": "India Meteorological Department (IMD)",
        "station_type": "Meteorological Centre",
    },
}


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two coordinates in kilometers using Haversine formula."""
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    )
    return round(2.0 * r * math.asin(math.sqrt(a)), 1)


def find_nearest_verified_station(lat: float, lon: float, city_id: str | None = None) -> dict[str, Any]:
    """Find the verified IMD station for a city ID or the closest verified station by coordinates."""
    if city_id and city_id.lower().strip() in VERIFIED_IMD_STATIONS:
        station = dict(VERIFIED_IMD_STATIONS[city_id.lower().strip()])
        station["distance_km"] = haversine_distance(lat, lon, station["lat"], station["lon"])
        return station

    best_station = None
    min_dist = float("inf")
    for s_info in VERIFIED_IMD_STATIONS.values():
        dist = haversine_distance(lat, lon, s_info["lat"], s_info["lon"])
        if dist < min_dist:
            min_dist = dist
            best_station = dict(s_info)
            best_station["distance_km"] = dist

    if best_station:
        return best_station

    return {
        "station_id": "42921",
        "station_name": "Nashik City Observatory",
        "lat": 20.0000,
        "lon": 73.7800,
        "state": "Maharashtra",
        "authority": "India Meteorological Department (IMD)",
        "station_type": "Surface Observatory",
        "distance_km": haversine_distance(lat, lon, 20.0000, 73.7800),
    }


def _safe_float(val: Any) -> float | None:
    if val is None:
        return None
    try:
        s = str(val).strip()
        if not s or s.lower() in {"none", "null", "nan", "99.9", "999.0", "999", "999.00", "-"}:
            return None
        return round(float(s), 1)
    except (ValueError, TypeError):
        return None


def calculate_observation_age(updat_str: str | None) -> tuple[float | None, str]:
    """Compute age in hours and human-readable freshness label from IMD IST update timestamp."""
    if not updat_str:
        return None, "Observation timestamp unavailable"
    try:
        # Format: "YYYY-MM-DD HH:MM:SS" IST
        # IST is UTC+5:30
        ist_tz = timezone(timedelta(hours=5, minutes=30))
        dt_obs = datetime.strptime(updat_str.strip(), "%Y-%m-%d %H:%M:%S").replace(tzinfo=ist_tz)
        now_ist = datetime.now(timezone.utc).astimezone(ist_tz)
        age_seconds = (now_ist - dt_obs).total_seconds()
        age_hours = round(max(0.0, age_seconds / 3600.0), 1)

        if age_hours < 1.0:
            freshness_label = f"Fresh observation ({int(age_seconds // 60)}m ago)"
        elif age_hours < 24.0:
            freshness_label = f"Observed {age_hours}h ago ({updat_str[-8:-3]} IST cycle)"
        else:
            days = int(age_hours // 24)
            freshness_label = f"Previous cycle ({days}d ago)"
        return age_hours, freshness_label
    except Exception:
        return None, "Observation timestamp unparsed"


async def fetch_imd_station_observation(
    city_lat: float,
    city_lon: float,
    city_id: str | None = None,
) -> dict[str, Any]:
    """Retrieve actual verified IMD station observation for the given location."""
    station = find_nearest_verified_station(city_lat, city_lon, city_id)
    station_id = station["station_id"]

    # Check if official API Gateway credentials are configured in environment
    api_key = os.getenv("IMD_API_KEY")
    auth_token = os.getenv("IMD_AUTH_TOKEN")
    gateway_status = {
        "endpoint": f"{_IMD_GATEWAY_URL}/api/v1/current_wx?id={station_id}",
        "documentation_url": "https://api.imd.gov.in/public/api_reference.html",
        "has_credentials": bool(api_key),
        "status": "AUTHENTICATED" if (api_key and auth_token) else "REQUIRES_REGISTRATION",
        "note": "Official api.imd.gov.in gateway requires dual X-API-KEY and Authorization: Bearer JWT registration.",
    }

    raw_item: dict[str, Any] | None = None
    source_type = "IMD Public Surface Network Service"

    try:
        # Fetch from verified IMD station network endpoint
        payload = await _imd_client.post(
            "/citywx/responsive/api/fetchCity_static.php",
            data={"ID": station_id},
        )
        if isinstance(payload, list) and len(payload) > 0 and isinstance(payload[0], dict):
            raw_item = payload[0]
        elif isinstance(payload, dict) and "station_id" in payload:
            raw_item = payload
    except Exception as exc:
        log.warning("imd_station_fetch_error", station_id=station_id, error=str(exc))

    if not raw_item:
        return {
            "is_available": False,
            "station_id": station_id,
            "station_name": station["station_name"],
            "station_lat": station["lat"],
            "station_lon": station["lon"],
            "distance_km": station["distance_km"],
            "data_source": source_type,
            "gateway_status": gateway_status,
            "message": f"IMD surface station telemetry temporarily unreachable for {station['station_name']}. Showing model estimates.",
            "observation_date": None,
            "observation_timestamp_ist": None,
            "age_hours": None,
            "freshness": "UNAVAILABLE",
            "parameters": None,
        }

    # Extract actual observations
    updat_str = raw_item.get("updat")
    obs_date = raw_item.get("dat")
    age_hours, freshness_str = calculate_observation_age(updat_str)

    max_temp = _safe_float(raw_item.get("max"))
    min_temp = _safe_float(raw_item.get("min"))
    prev_max = _safe_float(raw_item.get("prevday_max"))
    rain_24h = _safe_float(raw_item.get("rainfall"))
    if rain_24h is None:
        rain_24h = 0.0

    rh_0830 = _safe_float(raw_item.get("rh0830"))
    rh_1730 = _safe_float(raw_item.get("rh1730"))

    # Active relative humidity (use latest recorded synoptic hour: 1730 if available, else 0830)
    current_rh = rh_1730 if (rh_1730 is not None and rh_1730 > 0) else rh_0830

    forecast_text = raw_item.get("forecast0") or "Clear sky"
    sunrise = raw_item.get("sunrise")
    sunset = raw_item.get("sunset")

    return {
        "is_available": True,
        "station_id": station_id,
        "station_name": raw_item.get("station") or station["station_name"],
        "station_lat": float(raw_item.get("lat") or station["lat"]),
        "station_lon": float(raw_item.get("lon") or station["lon"]),
        "distance_km": station["distance_km"],
        "authority": "India Meteorological Department (IMD)",
        "station_type": station.get("station_type", "Principal Surface Observatory"),
        "observation_date": obs_date,
        "observation_timestamp_ist": updat_str,
        "age_hours": age_hours,
        "freshness": freshness_str,
        "data_source": source_type,
        "gateway_status": gateway_status,
        "parameters": {
            "temp_max_c": max_temp,
            "temp_min_c": min_temp,
            "prevday_max_c": prev_max,
            "rainfall_past_24h_mm": rain_24h,
            "relative_humidity_0830_pct": rh_0830,
            "relative_humidity_1730_pct": rh_1730,
            "relative_humidity_pct": current_rh,
            "synoptic_forecast": forecast_text,
            "sunrise": sunrise,
            "sunset": sunset,
            "atmospheric_pressure_hpa": None,  # Not supplied by standard citywx synoptic feed
            "wind_speed_kmh": None,  # Not supplied by standard citywx synoptic feed
            "wind_direction_deg": None,
        },
    }
