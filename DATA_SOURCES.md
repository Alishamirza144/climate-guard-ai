# Historical Data Sources & Integration Guide
## Climate Guard AI — Flood Prediction for Nashik, Maharashtra

> **ETHICAL INTEGRITY & REPRODUCIBILITY NOTICE**  
> In compliance with strict scientific standards, **no historical flood records or rainfall telemetry are invented or fabricated**.  
> The system utilizes a documented schema designed to accept official government telemetry. When running in demo mode without proprietary government logins, the system operates on a physics-grounded synthetic benchmark dataset, which is explicitly labelled `is_synthetic = True` across every observation.

---

### 1. Reliable Historical & Real-Time Data Sources

The table below catalogs official and scientific data providers covering the Godavari River Basin and Nashik District:

| Source Identifier | Organization & Authority | Data Provided | Geographic Coverage | Official Access Portal | Licensing & Access Terms |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **WRD_MAH** | **Water Resources Department (WRD)**, Govt. of Maharashtra | Dam storage levels, daily reservoir inflow/outflow, Gangapur & Darna dam spillway discharge (cusecs) | Nashik District Dams & Godavari Barrages | [wrd.maharashtra.gov.in](https://wrd.maharashtra.gov.in) | Govt. of Maharashtra Public Water Information System / Daily Flood Bulletins |
| **IMD_PUNE** | **India Meteorological Department (IMD)** Pune / National Data Centre | High-resolution gridded rainfall (0.25° x 0.25°), AWS hourly observations, rainfall intensity | Nashik City, Trimbakeshwar, Peth, Igatpuri | [imdpune.gov.in](https://imdpune.gov.in) / [mausam.imd.gov.in](https://mausam.imd.gov.in) | Open Data / Research Portal (custom data requests through NDC Pune) |
| **CWC_INDIA** | **Central Water Commission (CWC)**, Ministry of Jal Shakti | Real-time river water gauge levels, warning/danger level threshold telemetry, hydrographs | Godavari Basin Gauging Stations | [ffs.india-water.gov.in](https://ffs.india-water.gov.in) | Open Flood Forecast System (India-WRIS) |
| **OPEN_METEO** | **Open-Meteo Historical Archive** (ERA5-Land reanalysis) | Hourly precipitation, volumetric soil moisture (0–7 cm), surface runoff | Coordinates `20.0077°N, 73.7915°E` (Nashik) | [open-meteo.com](https://open-meteo.com) | Free Open Access under CC BY 4.0; ECMWF Copernicus License |
| **NASA_POWER** | **NASA POWER Project** (Earth Science Division) | Daily/hourly precipitation (`PRECTOTCORR`), root-zone soil wetness (`GWETROOT`) | Global Grid (0.5° x 0.5°), point extraction for Nashik | [power.larc.nasa.gov](https://power.larc.nasa.gov) | NASA Open Science Data Policy |
| **ISRO_BHUVAN** | **National Remote Sensing Centre (NRSC) / ISRO** | CartoDEM Digital Elevation Model (30m spatial resolution) for terrain elevation and slope | Godavari River corridor & Western Ghats | [bhuvan.nrsc.gov.in](https://bhuvan.nrsc.gov.in) | Open Bhuvan Geospatial Data Policy |
| **DDMA_NMC** | **District Disaster Management Authority (DDMA)** & Nashik Municipal Corp (NMC) | Verified historical flood markers, Blue Line / Red Line survey benchmarks | Ramkund, Panchavati Ghats, Holkar Bridge | [nashikcorporation.in](https://nashikcorporation.in) | Municipal Flood Mitigation Gazette |

---

### 2. Historical Flood Benchmarks in Nashik City

Historical inundations in Nashik are predominantly controlled by dam discharges from **Gangapur Dam** (10 km upstream) combined with severe cloudbursts in the Trimbakeshwar catchment:

- **September 2019 Flood**: Gangapur Dam discharged over **31,000 cusecs**, submerging the historic Ramkund steps and Dutondya Maruti statue up to chest level. Holkar Bridge was shut to traffic.
- **August 2016 Flood**: Continuous torrential rain in Trimbak belt led to a cumulative discharge exceeding **43,000 cusecs**, causing major inundation in low-lying Panchavati, Saraf Bazaar, and downstream Saykheda.
- **July-August 2006 Flood**: Record discharge of **90,000+ cusecs** into Godavari caused historic urban flooding across Nashik city.

#### Official Physical Thresholds at Ramkund (Ghat Gauge):
- **Normal Flow**: Discharge < 15,000 cusecs | Gauge < 5.0 meters
- **Warning Level (Blue Line / इशारा पातळी)**: Discharge ~ 20,000 to 25,000 cusecs | Gauge: **6.5 meters**
- **Danger Level (Red Line / धोका पातळी)**: Discharge > 35,000 cusecs | Gauge: **8.5 meters** (Dutondya Maruti temple submerged)

---

### 3. Step-by-Step Guide: How to Plug in Real Data

To replace the synthetic benchmark dataset with verified field telemetry from IMD / WRD:

1. **Obtain CSV / Excel Telemetry**:
   - Download the monsoon telemetry records for your desired stations from WRD Maharashtra or IMD Pune.
2. **Format According to Climate Guard Schema**:
   Ensure your CSV contains the following columns:
   ```csv
   timestamp,location,rainfall_mm,rainfall_intensity_mm_h,river_water_level_m,water_level_change_rate_m_h,soil_moisture_pct,elevation_m,slope_deg,flow_rate_cusecs,flood_label,flood_severity,is_synthetic
   ```
   Set `is_synthetic = False` for all verified rows.
3. **Drop the File**:
   Save the file into `data/raw/real_nashik_flood_data.csv`.
4. **Trigger Retraining**:
   Run:
   ```bash
   python -m src.model_trainer --data-path data/raw/real_nashik_flood_data.csv
   ```
5. **Inspect the Dashboard**:
   The dashboard will automatically detect `is_synthetic = False` in the model metadata and update the system trust badge to **Verified Telemetry Active**.
