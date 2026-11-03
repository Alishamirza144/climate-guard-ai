# Crop risk worked example

This example matches the logic implemented in [backend/app/engines/crop.py](../../backend/app/engines/crop.py).

## 1) GDD calculation

For wheat, the base temperature is 10 C.

Given:
- Tmax = 28 C
- Tmin = 18 C
- Tb = 10 C

Daily GDD:

GDD = ((28 + 18) / 2) - 10 = 23 - 10 = 13 C-day

The code uses:

```python
from app.engines.crop import gdd_for_day

gdd_for_day(28.0, 18.0, 10.0)
# 13.0
```

## 2) Water stress coefficient (Ks)

The crop engine uses the FAO-56 depletion formulation:

- Root-zone depth = 0.60 m
- Field capacity (loam) = 0.32
- Wilting point (loam) = 0.15
- Current root-zone moisture = 0.20
- Depletion fraction p = 0.55

First compute TAW:

TAW = (FC - WP) * root_zone_depth * 1000
TAW = (0.32 - 0.15) * 0.60 * 1000 = 102 mm

Then compute Dr:

Dr = (FC - current_moisture) * root_zone_depth * 1000
Dr = (0.32 - 0.20) * 0.60 * 1000 = 72 mm

Then:

Ks = (TAW - Dr) / ((1 - p) * TAW)
Ks = (102 - 72) / ((1 - 0.55) * 102)
Ks = 30 / (0.45 * 102)
Ks = 30 / 45.9 = 0.653

The code uses:

```python
from app.engines.crop import water_stress_coefficient

water_stress_coefficient(
    root_zone_m=0.6,
    field_capacity=0.32,
    wilting_point=0.15,
    current_moisture=0.20,
    depletion_fraction=0.55,
)
# 0.653
```

## 3) VPD calculation

Given:
- T = 25 C
- RH = 50%

Sat vapour pressure:

es = 0.6108 * exp(17.27 * 25 / (25 + 237.3))

es ≈ 3.17 kPa

VPD = es * (1 - RH / 100)
VPD = 3.17 * (1 - 0.50) = 1.585 kPa

The code uses:

```python
from app.engines.crop import vpd_from_temp_rh

vpd_from_temp_rh(25.0, 50.0)
# about 1.59 kPa
```

This matches the stated acceptance band: the value is greater than 1.5 and less than 1.7.

## 4) Practical interpretation

- GDD is a crop-development accumulator.
- Ks indicates water stress severity; a value near 1.0 means the crop is not strongly water-limited.
- VPD is a high-value stress signal when air is dry and transpiration demand is elevated.
- The disease-favourability output is a weather-based index only, not a diagnosis.
- NDVI is contextual imagery from NASA GIBS and is not a field-level measurement.
