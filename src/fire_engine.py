"""
Climate Guard AI - Fire Guard Engine
Implements the Canadian Forest Fire Weather Index (FWI) System:
- Fine Fuel Moisture Code (FFMC)
- Duff Moisture Code (DMC)
- Drought Code (DC)
- Initial Spread Index (ISI)
- Buildup Index (BUI)
- Fire Weather Index (FWI)
For Maharashtra forest reserves and wildfire zones.
"""

import math
from typing import Any, Dict, List

MAHARASHTRA_FIRE_REGIONS = {
    "Tadoba-Andhari Tiger Reserve (Chandrapur)": {
        "lat": 20.2520, "lon": 79.3130, "fuel_type": "Dry Deciduous Teak & Bamboo",
        "district": "Chandrapur", "elevation": 210
    },
    "Melghat Tiger Reserve (Amravati)": {
        "lat": 21.4333, "lon": 77.2000, "fuel_type": "Dry Deciduous Hardwood",
        "district": "Amravati", "elevation": 650
    },
    "Western Ghats / Trimbak Forest (Nashik)": {
        "lat": 19.9250, "lon": 73.5410, "fuel_type": "Semi-Evergreen / Scrub Basalt",
        "district": "Nashik", "elevation": 720
    },
    "Sanjay Gandhi National Park (Mumbai/Thane)": {
        "lat": 19.2288, "lon": 72.9182, "fuel_type": "Mixed Moist Deciduous Urban Fringe",
        "district": "Mumbai Suburban", "elevation": 120
    },
    "Radhanagari Wildlife Sanctuary (Kolhapur)": {
        "lat": 16.4250, "lon": 73.9850, "fuel_type": "Southern Tropical Semi-Evergreen",
        "district": "Kolhapur", "elevation": 580
    },
    "Yawal Wildlife Sanctuary (Jalgaon)": {
        "lat": 21.4167, "lon": 75.6833, "fuel_type": "Satpura Dry Deciduous & Grassland",
        "district": "Jalgaon", "elevation": 340
    }
}


def clamp(val: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, val))


def calculate_fwi_system(
    temp_c: float,
    rh_pct: float,
    wind_kph: float,
    days_without_rain: int = 5,
    prev_rain_mm: float = 0.0
) -> Dict[str, Any]:
    """
    Standard Canadian Forest Fire Weather Index (FWI) components.
    """
    t = float(temp_c)
    h = clamp(float(rh_pct), 5.0, 100.0)
    w = max(1.0, float(wind_kph))

    # 1. Fine Fuel Moisture Code (FFMC)
    # Estimate baseline equilibrium moisture content
    rf = prev_rain_mm
    m0 = 15.0 - (days_without_rain * 1.8) + (rf * 2.0)
    m0 = clamp(m0, 2.0, 100.0)

    # Equilibrium moisture content for drying
    ed = 0.942 * (h ** 0.679) + (11.0 * math.exp((h - 100.0) / 10.0)) + 0.18 * (21.1 - t) * (1.0 - math.exp(-0.115 * h))
    if m0 > ed:
        kw = 0.424 * (1.0 - ((100.0 - h) / 100.0) ** 1.7) + (0.0694 * math.sqrt(w)) * (1.0 - ((100.0 - h) / 100.0) ** 8.0)
        kd = kw * (0.581 * math.exp(0.0365 * t))
        m = ed + (m0 - ed) * (10.0 ** (-kd))
    else:
        ew = 0.618 * (h ** 0.753) + (10.0 * math.exp((h - 100.0) / 10.0)) + 0.18 * (21.1 - t) * (1.0 - math.exp(-0.115 * h))
        m = ew - (ew - m0) * 0.75

    ffmc = clamp(59.5 * (250.0 - m) / (147.2 + m), 0.0, 101.0)

    # 2. Initial Spread Index (ISI)
    # Wind influence function
    fw = math.exp(0.05039 * w)
    # Fine fuel moisture function
    fm = 91.9 * math.exp(-0.1386 * m) * (1.0 + (m ** 5.31) / (4.93e7))
    isi = 0.208 * fw * fm

    # 3. Duff Moisture Code (DMC) & Drought Code (DC) approximations
    dmc = clamp((t * 0.8) + (days_without_rain * 2.2) - (h * 0.15), 2.0, 150.0)
    dc = clamp((t * 1.5) + (days_without_rain * 6.0) - (rf * 3.0), 10.0, 600.0)

    # 4. Buildup Index (BUI)
    if dmc <= 0.4 * dc:
        bui = (0.8 * dmc * dc) / (dmc + 0.4 * dc + 0.001)
    else:
        bui = dmc - (1.0 - (0.8 * dc) / (dmc + 0.4 * dc + 0.001)) * (0.92 + (0.0114 * dmc) ** 1.7)
    bui = max(0.0, bui)

    # 5. Fire Weather Index (FWI)
    if bui <= 80.0:
        fd = 0.626 * (bui ** 0.809) + 2.0
    else:
        fd = 1000.0 / (25.0 + 108.64 * math.exp(-0.023 * bui))
    b = 0.1 * isi * fd
    if b > 1.0:
        fwi = math.exp(2.72 + 0.434 * math.log(b))
    else:
        fwi = b

    fwi = round(max(0.0, fwi), 1)

    # Danger Classification
    if fwi >= 38.0:
        tier = "Extreme"
        color = "#ef4444"
        badge = "🔥 EXTREME WILDFIRE DANGER"
    elif fwi >= 22.0:
        tier = "Very High"
        color = "#ea580c"
        badge = "🟠 VERY HIGH FIRE THREAT"
    elif fwi >= 13.0:
        tier = "High"
        color = "#f59e0b"
        badge = "🟡 HIGH FIRE RISK"
    elif fwi >= 5.0:
        tier = "Moderate"
        color = "#38bdf8"
        badge = "🔵 MODERATE FIRE POTENTIAL"
    else:
        tier = "Low"
        color = "#10b981"
        badge = "🟢 LOW RISK / SAFE"

    advisories = []
    if "Extreme" in tier or "Very High" in tier:
        advisories.append("Full fire ban in forest reserves. Thermal patrols mobilized.")
        advisories.append("High probability of crown fires and rapid wind-driven fire spread.")
        advisories.append("Pre-position water tenders and forest quick-response brigades.")
    elif "High" in tier:
        advisories.append("Prohibit agricultural stubble and waste burning near forest borders.")
        advisories.append("Maintain clear firebreaks along critical reserve boundaries.")
    else:
        advisories.append("Standard wildfire surveillance and dry-brush clearing.")

    return {
        "fwi_score": fwi,
        "ffmc": round(ffmc, 1),
        "isi": round(isi, 1),
        "dmc": round(dmc, 1),
        "dc": round(dc, 1),
        "bui": round(bui, 1),
        "risk_tier": tier,
        "risk_color": color,
        "risk_badge": badge,
        "advisories": advisories
    }
