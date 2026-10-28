# 🌊 Climate Guard AI — Flood Prediction for Nashik, Maharashtra

[![Python 3.12](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![Machine Learning](https://img.shields.io/badge/ML-Scikit--Learn%20%7C%20Random%20Forest-orange.svg)](https://scikit-learn.org/)
[![Dashboard](https://img.shields.io/badge/UI-Streamlit-red.svg)](https://streamlit.io/)
[![Zero Data Leakage](https://img.shields.io/badge/Evaluation-Chronological%20Time--Series-emerald.svg)]()
[![Region](https://img.shields.io/badge/Basin-Godavari%20River%20%7C%20Nashik-blueviolet.svg)]()

> **Hackathon Edition**: An end-to-end Machine Learning Early Warning System (EWS) designed to predict flash floods and urban inundations along the Godavari River basin in **Nashik, Maharashtra**.

---

## 🌟 Key Highlights & Engineering Features

1. **Strict Zero-Leakage ML Pipeline**:
   - Standard random train/test splits cause fatal temporal leakage in time-series hydrology.
   - Climate Guard AI enforces **strict chronological out-of-time evaluation** (training exclusively on earlier monsoon seasons and testing on unseen future years).
   - In-training cross-validation uses forward-chaining **`TimeSeriesSplit`** with no future lookahead.
2. **Physics-Grounded Hydrological Modeling**:
   - Integrates Western Ghats precipitation, peak rainfall intensity, upstream **Gangapur Dam spillway discharge (cusecs)**, Godavari river gauge telemetry, rate-of-rise dynamics, volumetric soil moisture saturation, elevation, and terrain slope.
3. **Rigorous Ethical & Data Integrity Standards**:
   - In demo mode, clearly labelled synthetic benchmark data (`is_synthetic = True`) is utilized. **No historical records or telemetry are fabricated.**
   - All official government historical data sources (**WRD Maharashtra, IMD Pune, CWC India, NASA POWER, ISRO CartoDEM**) are cataloged in [`DATA_SOURCES.md`](DATA_SOURCES.md).
4. **Interactive Command-Center Dashboard**:
   - Built with Streamlit, Plotly, and Folium.
   - Interactive Nashik vulnerability map tracing the Godavari river path through **Gangapur Dam, Someshwar, Ramkund, Holkar Bridge, Tapovan, and Saykheda**.
   - Hydro-risk gauge, multi-axis historical hydrographs, and real-time emergency scenario simulators.
   - Precautionary action protocols aligned with the **Nashik Municipal Corporation (NMC)** and **District Disaster Management Authority (DDMA)** guidelines.
5. **Sensor Diagnostics & Limitation Auditor**:
   - Automatic detection of missing sensor feeds, delayed transmissions, and physically anomalous out-of-distribution extremes.

---

## 📐 Dataset Schema Specification

The pipeline enforces a strict 13-attribute schema defined in [`src/data_schema.py`](src/data_schema.py):

| Attribute | Data Type | Physical Units | Valid Range | Description |
| :--- | :--- | :--- | :--- | :--- |
| `timestamp` | Datetime (ISO) | YYYY-MM-DD HH:MM:SS | 2018–Present | Monotonically sorted observation time |
| `location` | String / Categorical | Station Name | 6 Nashik Stations | Specific hydrological monitoring point |
| `rainfall_mm` | Float | Millimeters (mm) | 0.0 – 600.0 mm | 24-hour cumulative precipitation |
| `rainfall_intensity_mm_h` | Float | mm / hour | 0.0 – 150.0 mm/h | Peak hourly rainfall intensity (cloudburst indicator) |
| `river_water_level_m` | Float | Meters (m) | 0.0 – 20.0 m | Godavari river gauge above riverbed level |
| `water_level_change_rate_m_h`| Float | Meters / hour | -8.0 to +8.0 m/h | Hourly rate of water level rise or drop |
| `soil_moisture_pct` | Float | Percentage (%) | 0.0 – 100.0 % | Volumetric root-zone soil saturation |
| `elevation_m` | Float | Meters AMSL | 400.0 – 1000.0 m | Station ground elevation from CartoDEM / SRTM |
| `slope_deg` | Float | Degrees (°) | 0.0 – 45.0° | Terrain slope gradient |
| `flow_rate_cusecs` | Float | cusecs (ft³/s) | 0.0 – 150,000 | Gangapur Dam spillway discharge / river flow rate |
| `flood_label` | Integer Class | Binary (0 / 1) | 0 or 1 | Ground truth flood status (0=Normal, 1=Inundation) |
| `flood_severity` | Integer Class | Ordinal (0, 1, 2) | 0, 1, 2 | 0: Normal, 1: Blue Line Warning, 2: Red Line Danger |
| `is_synthetic` | Boolean | True / False | True or False | Strict benchmark transparency tag |

---

## 🏛️ Monitored Stations along Godavari River (Nashik)

| Station Name | Coordinates | Elevation | Slope | Warning Level (Blue Line) | Danger Level (Red Line) | Vulnerability Profile |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Trimbakeshwar (Upper Catchment)** | 19.9320°N, 73.5300°E | 720 m | 6.8° | 3.8 m / 10k cusecs | 5.2 m / 18k cusecs | Origin in Brahmagiri; heavy orographic rain zone; headwater surge indicator |
| **Gangapur Dam Catchment** | 20.0489°N, 73.6890°E | 610 m | 4.8° | 4.0 m / 15k cusecs | 5.5 m / 30k cusecs | Hydrological control reservoir regulating Nashik flow |
| **Someshwar (Gangapur Rd)** | 20.0315°N, 73.7432°E | 585 m | 3.5° | 5.0 m / 18k cusecs | 7.0 m / 32k cusecs | Upstream gorge and waterfall entrance to city |
| **Ramkund (Panchavati)** | 20.0077°N, 73.7915°E | 560 m | 1.2° | 6.5 m / 20k cusecs | 8.5 m / 35k cusecs | Critical historical ghats; Dutondya Maruti water marker |
| **Holkar Bridge** | 20.0125°N, 73.7980°E | 558 m | 1.5° | 6.8 m / 22k cusecs | 8.8 m / 38k cusecs | Major arterial urban bridge connecting city sectors |
| **Tapovan (Kapila Sangam)**| 19.9982°N, 73.8156°E | 552 m | 1.8° | 6.0 m / 25k cusecs | 8.0 m / 40k cusecs | Confluence of Godavari & Kapila; backflow hazard |
| **Darna Confluence (Chehdi)** | 19.9620°N, 73.8650°E | 548 m | 1.1° | 6.2 m / 24k cusecs | 8.2 m / 40k cusecs | Confluence of Godavari & Darna; backwater surge inundating South Nashik |
| **Saykheda (Niphad)** | 20.0890°N, 74.0520°E | 540 m | 0.8° | 7.5 m / 30k cusecs | 9.5 m / 50k cusecs | Downstream low-lying agrarian flood basin |

---

## 🏗️ Project Architecture

```
climate/
├── data/
│   ├── synthetic_nashik_flood_data.csv        # Physics-consistent benchmark data (24,192 records across 8 stations)
│   ├── historical_sources_manifest.json       # Official IMD/WRD/CWC endpoints & metadata
│   └── raw/                                   # Ingestion directory for verified field CSVs
├── models/
│   ├── flood_rf_model.joblib                  # Serialized trained Random Forest classifier
│   └── model_metadata.json                    # Chronological split windows, metrics & importances
├── src/
│   ├── __init__.py                            # Package initializer
│   ├── config.py                              # Station coordinates, danger marks, hyperparams, notices
│   ├── data_schema.py                         # Schema definitions, physical ranges, validation engine
│   ├── synthetic_data_generator.py            # Hydrological simulator modeling monsoon surges
│   ├── data_processor.py                      # Causal lag features, imputation, chronological split
│   ├── model_trainer.py                       # Chronological RF training, TimeSeriesSplit CV, metrics
│   ├── predictor.py                           # Inference engine, warning tiers, precautionary SOPs
│   └── historical_data_sources.py             # Official source documentation & API fetcher
├── app.py                                     # Command-center Streamlit dashboard
├── test_pipeline.py                           # Automated end-to-end test suite (6 tests)
├── requirements.txt                           # Pinned dependencies
├── DATA_SOURCES.md                            # Comprehensive historical data guide & integration steps
└── README.md                                  # Complete system documentation
```

---

## 🚀 Installation & Local Run Guide

### 1. Prerequisites
- Python 3.10+ (tested on Python 3.12 on Windows / Linux / macOS)
- Git (optional)

### 2. Setup Virtual Environment

On Windows (PowerShell):
```powershell
# Navigate to project folder
cd c:\Users\Admin\OneDrive\Desktop\climate

# Create virtual environment
py -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Upgrade pip and install dependencies
pip install -r requirements.txt
```

On Linux / macOS (bash):
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Generate Benchmark Dataset & Train Model
```powershell
# Generate physics-grounded synthetic benchmark data for Nashik stations (2018-2024)
python -m src.synthetic_data_generator

# Train Random Forest with strict chronological evaluation
python -m src.model_trainer
```

### 4. Run Automated Test Suite
```powershell
# Verifies schema integrity, zero temporal leakage, model persistence, and predictor
python test_pipeline.py
```
*(All 6 unit tests should report `OK`)*

### 5. Launch the Streamlit Dashboard
```powershell
streamlit run app.py
```
The application will open automatically in your browser at:  
👉 **`http://localhost:8501`**

---

## 📊 Model Evaluation & Leakage Prevention Audit

The model is evaluated using **out-of-time chronological validation**:
- **Chronological Training Window**: `2018-06-15` to `2023-08-18` (19,352 samples across 8 stations)
- **Unseen Future Test Window**: `2023-08-18` to `2024-09-30` (4,840 samples across 8 stations)
- **Leakage Assertion**: $\max(\text{train\_timestamp}) < \min(\text{test\_timestamp})$ strictly enforced.
- **Label Leakage Elimination**: Direct threshold tautologies like `gauge_to_warning_ratio` are completely excised in favor of multi-scale Antecedent Precipitation Index (API) and upstream hydrodynamic travel lags.

### Out-of-Time Test Metrics:
- **Accuracy**: `99.98%`
- **Precision (Flood)**: `100.0%`
- **Recall (Critical Flood Event Detection)**: `99.77%` *(431 / 432 true flood events detected, 1 false negative at Someshwar gorge)*
- **F1-Score**: `0.9988`
- **ROC-AUC**: `1.0000`
- **PR-AUC**: `1.0000`
- **Brier Calibration Score**: `0.0005`
- **TimeSeriesSplit (4-Fold) Mean F1**: `0.9944`

### Top Hydrological Feature Importances (Leakage-Free):
1. `flow_rate_cusecs` (Gangapur Dam spillway release rate) — **26.6%**
2. `rainfall_mm` (Catchment precipitation) — **19.8%**
3. `rain_12h_accum_mm` (12-hour antecedent rainfall accumulation) — **17.5%**
4. `flow_lag_6h_cusecs` (6-hour upstream hydrodynamic travel lag) — **8.9%**
5. `runoff_generation_potential` (Rainfall intensity $\times$ soil saturation) — **7.8%**
6. `rainfall_intensity_mm_h` (Peak hourly rainfall rate) — **5.8%**
7. `soil_moisture_pct` (Volumetric soil moisture saturation) — **3.2%**
8. `rain_24h_accum_mm` (24-hour antecedent cumulative rainfall) — **3.0%**
9. `flow_lag_12h_cusecs` (12-hour downstream routing lag) — **2.9%**
10. `soil_saturation_deficit_pct` (Remaining infiltration capacity) — **1.6%**

---

## 🛡️ Precautionary Protocols & Emergency SOPs

Climate Guard AI maps estimated flood probability and water levels to 3 distinct operational tiers:

- 🟢 **LOW / NORMAL (सुरक्षित पातळी)**:
  - Discharge < 15,000 cusecs; gauge well within riverbed capacity.
  - Action: Routine 6-hourly telemetry logging; municipal storm drain clearance.
- 🟡 **BLUE LINE WARNING (इशारा पातळी)**:
  - Discharge ~20,000 cusecs; gauge $\ge 6.5\text{ m}$ at Ramkund.
  - Action: Clear pilgrims, vendors, and parked vehicles from Ramkund and Gandhi Talav ghats; restrict river bathing; police postings at ghat steps.
- 🔴 **RED LINE DANGER (धोका पातळी)**:
  - Discharge > 35,000 cusecs; gauge $\ge 8.5\text{ m}$ at Ramkund (Dutondya Maruti temple submerged).
  - Action: Immediate evacuation of riverfront shanties and shops (Saraf Bazaar, Bhadrakali, Tapovan); traffic closures on Holkar and Victoria bridges; mobilization of NDRF 5th Battalion; activation of NMC Emergency Operations Centre (**1077 / 0253-2578500**).

---

## ⚠️ Limitations & Disclaimers

1. **Synthetic Demo Status**: In the absence of direct access to restricted government SCADA portals, the current deployment runs on physics-grounded synthetic benchmark data. It must **not** be presented as official live government predictions.
2. **Upstream Dam Human Factor**: Releases from Gangapur, Kashyapi, and Darna dams depend on manual gate operation policies and WRD water management decisions that can deviate from purely physical rainfall triggers.
3. **Plugging In Real Data**: Real telemetry files can be dropped into `data/raw/` adhering to [`DATA_SOURCES.md`](DATA_SOURCES.md) to instantly retrain on verified measurements.

---

## 📜 License
Developed for educational and hackathon demonstration purposes. Released under the MIT License.
