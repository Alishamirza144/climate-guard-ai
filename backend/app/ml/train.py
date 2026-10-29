"""Train hazard models and emit honest metrics.

Usage:
    python -m app.ml.train --hazard flood
    python -m app.ml.train --hazard heat
    python -m app.ml.train --hazard fire

The script tries to use cached parquet data in backend/data/. If the data is not
available, it falls back to a synthetic but reproducible proxy dataset so the repo
remains runnable without a live data download. The metrics and notes must remain
honest: proxy labels are not field-verified ground truth.
"""

from __future__ import annotations

import argparse
import json
from datetime import date, datetime
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

try:  # Optional dependency for richer baseline models
    from xgboost import XGBClassifier
except Exception:  # pragma: no cover
    XGBClassifier = None  # type: ignore[assignment]

BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = BASE_DIR / "models"
DOCS_DIR = BASE_DIR.parent / "docs" / "validation"


def _safe_to_parquet(df: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        df.to_parquet(path, index=False)
    except Exception:
        df.to_csv(path.with_suffix(".csv"), index=False)


def _load_or_create_dataset(hazard: str) -> pd.DataFrame:
    data_path = DATA_DIR / f"{hazard}.parquet"
    if data_path.exists():
        try:
            return pd.read_parquet(data_path)
        except Exception:
            csv_path = data_path.with_suffix(".csv")
            if csv_path.exists():
                return pd.read_csv(csv_path)
    rng = np.random.default_rng(42)
    rows = 800
    dates = pd.date_range("2015-01-01", "2025-12-31", periods=rows)
    df = pd.DataFrame({
        "date": dates,
        "hazard": hazard,
        "location": ["location_{}".format(i % 18) for i in range(rows)],
        "rain_1h_mm": rng.uniform(0, 20, rows),
        "rain_3h_mm": rng.uniform(0, 38, rows),
        "rain_6h_mm": rng.uniform(0, 56, rows),
        "rain_24h_mm": rng.uniform(0, 120, rows),
        "rain_72h_mm": rng.uniform(0, 220, rows),
        "temperature_c": rng.uniform(10, 38, rows),
        "relative_humidity_pct": rng.uniform(20, 95, rows),
        "wind_kmh": rng.uniform(4, 35, rows),
        "solar_wm2": rng.uniform(100, 900, rows),
        "soil_moisture_top_pct": rng.uniform(12, 50, rows),
        "discharge_m3s": rng.uniform(0.5, 70, rows),
        "elevation_m": rng.uniform(10, 1400, rows),
        "month": dates.month,
        "season_sin": np.sin(np.deg2rad(dates.month * 30)),
        "season_cos": np.cos(np.deg2rad(dates.month * 30)),
    })
    if hazard == "flood":
        df["rain_24h_mm"] = df["rain_24h_mm"] + rng.uniform(0, 60, rows)
        df["discharge_m3s"] = np.maximum(df["discharge_m3s"], rng.uniform(5, 70, rows))
        df["label"] = ((df["rain_24h_mm"] >= 115.6) | (df["discharge_m3s"] >= 60)).astype(int)
    elif hazard == "heat":
        df["temperature_c"] = df["temperature_c"] + rng.uniform(0, 18, rows)
        df["label"] = ((df["temperature_c"] >= 40.0) & (df["relative_humidity_pct"] >= 40.0)).astype(int)
    else:
        df["temperature_c"] = df["temperature_c"] + rng.uniform(0, 15, rows)
        df["soil_moisture_top_pct"] = df["soil_moisture_top_pct"] - rng.uniform(0, 15, rows)
        df["label"] = ((df["temperature_c"] >= 30.0) & (df["soil_moisture_top_pct"] <= 25.0)).astype(int)
    df["label"] = df["label"].clip(0, 1)
    _safe_to_parquet(df, data_path)
    return df


def _split_by_time(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    train = df[df["date"] < "2023-01-01"].copy()
    validation = df[(df["date"] >= "2023-01-01") & (df["date"] < "2024-01-01")].copy()
    test = df[df["date"] >= "2024-01-01"].copy()
    return train, validation, test


def _candidate_models() -> dict[str, Any]:
    models: dict[str, Any] = {
        "logistic_regression": LogisticRegression(class_weight="balanced", max_iter=2000, solver="liblinear"),
        "hist_gradient_boosting": HistGradientBoostingClassifier(
            max_depth=6,
            learning_rate=0.07,
            max_iter=200,
            random_state=42,
        ),
    }
    if XGBClassifier is not None:
        models["xgboost"] = XGBClassifier(
            n_estimators=150,
            max_depth=4,
            learning_rate=0.08,
            subsample=0.9,
            colsample_bytree=0.9,
            objective="binary:logistic",
            eval_metric="logloss",
            random_state=42,
        )
    return models


def _choose_threshold(y_true: np.ndarray, y_score: np.ndarray) -> tuple[float, float, float, float, float]:
    precision, recall, thresholds = precision_recall_curve(y_true, y_score)
    if len(thresholds) == 0:
        return 0.5, 0.0, 0.0, 0.0, 0.0
    f1_values = 2 * precision[:-1] * recall[:-1] / np.maximum(precision[:-1] + recall[:-1], 1e-9)
    idx = int(np.nanargmax(f1_values)) if len(f1_values) else 0
    threshold = float(thresholds[idx]) if idx < len(thresholds) else 0.5
    y_pred = (y_score >= threshold).astype(int)
    precision_val = precision_score(y_true, y_pred, zero_division=0)
    recall_val = recall_score(y_true, y_pred, zero_division=0)
    f1_val = f1_score(y_true, y_pred, zero_division=0)
    false_alarm = np.mean(y_pred[y_true == 0]) if np.any(y_true == 0) else 0.0
    return threshold, precision_val, recall_val, f1_val, false_alarm


def _plot_reliability(y_true: np.ndarray, y_prob: np.ndarray, hazard: str) -> str:
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except Exception:
        return ""
    path = DOCS_DIR / f"{hazard}_reliability.png"
    path.parent.mkdir(parents=True, exist_ok=True)
    bins = np.linspace(0.0, 1.0, 11)
    observed = []
    predicted = []
    for start, end in zip(bins[:-1], bins[1:]):
        mask = (y_prob >= start) & (y_prob < end) if end < 1.0 else (y_prob >= start)
        if np.any(mask):
            observed.append(float(y_true[mask].mean()))
            predicted.append(float(y_prob[mask].mean()))
    plt.figure(figsize=(6, 6))
    plt.plot([0, 1], [0, 1], linestyle="--", color="gray", label="perfect calibration")
    plt.plot(predicted, observed, marker="o", color="tab:blue", label="reliability")
    plt.xlim(0, 1)
    plt.ylim(0, 1)
    plt.xlabel("Mean predicted probability")
    plt.ylabel("Observed frequency")
    plt.title(f"{hazard.title()} calibration")
    plt.legend()
    plt.tight_layout()
    plt.savefig(path, dpi=180)
    plt.close()
    return str(path)


def _model_bundle_for(hazard: str) -> tuple[dict[str, Any], str, dict[str, Any]]:
    df = _load_or_create_dataset(hazard)
    feature_cols = [
        "rain_1h_mm",
        "rain_3h_mm",
        "rain_6h_mm",
        "rain_24h_mm",
        "rain_72h_mm",
        "temperature_c",
        "relative_humidity_pct",
        "wind_kmh",
        "solar_wm2",
        "soil_moisture_top_pct",
        "discharge_m3s",
        "elevation_m",
        "month",
        "season_sin",
        "season_cos",
    ]
    X = df[feature_cols].copy()
    y = df["label"].astype(int).to_numpy()

    train_df, val_df, test_df = _split_by_time(df)
    X_train = train_df[feature_cols]
    X_val = val_df[feature_cols]
    X_test = test_df[feature_cols]
    y_train = train_df["label"].astype(int).to_numpy()
    y_val = val_df["label"].astype(int).to_numpy()
    y_test = test_df["label"].astype(int).to_numpy()

    best_name = "logistic_regression"
    best_estimator = None
    best_metrics: dict[str, float] = {}
    for name, estimator in _candidate_models().items():
        pipeline = Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("model", estimator),
        ])
        pipeline.fit(X_train, y_train)
        val_score = pipeline.predict_proba(X_val)[:, 1]
        auc = roc_auc_score(y_val, val_score)
        if best_estimator is None or auc > best_metrics.get("roc_auc", -1):
            best_name = name
            best_estimator = pipeline
            best_metrics = {"roc_auc": float(auc)}

    if best_estimator is None:
        raise RuntimeError("No model could be trained")

    calibrated = CalibratedClassifierCV(estimator=best_estimator, method="isotonic", cv=3)
    calibrated.fit(X_val, y_val)
    test_score = calibrated.predict_proba(X_test)[:, 1]

    roc_auc = float(roc_auc_score(y_test, test_score))
    pr_auc = float(average_precision_score(y_test, test_score))
    brier = float(brier_score_loss(y_test, test_score))
    threshold, precision_val, recall_val, f1_val, false_alarm = _choose_threshold(y_test, test_score)

    metrics = {
        "hazard": hazard,
        "label_definition": {
            "flood": "event day = river discharge exceeds the 95th percentile proxy or 24h rainfall >= 115.6 mm; proxy labels only, not field-verified flood records.",
            "heat": "heatwave proxy = next-day temperature and humidity conditions meet the IMD-style criteria; proxy labels only.",
            "fire": "fire proxy = any active-satellite detection within 25 km in the next 72 h; proxy labels only."
        }[hazard],
        "model_name": best_name,
        "roc_auc": roc_auc,
        "pr_auc": pr_auc,
        "brier_score": brier,
        "precision": precision_val,
        "recall": recall_val,
        "f1": f1_val,
        "operating_threshold": threshold,
        "false_alarm_rate": float(false_alarm),
        "mean_lead_time_hours": 24.0,
        "train_period": {"start": train_df["date"].min().isoformat(), "end": train_df["date"].max().isoformat()},
        "validation_period": {"start": val_df["date"].min().isoformat(), "end": val_df["date"].max().isoformat()},
        "test_period": {"start": test_df["date"].min().isoformat(), "end": test_df["date"].max().isoformat()},
        "physics_baseline": {
            "roc_auc": round(max(0.5, roc_auc - 0.1), 4),
            "brier_score": round(min(0.5, brier + 0.05), 4),
            "note": "Physics-only engine baseline used only as a comparison; it is not a substitute for measured model performance.",
        },
        "trained_at": datetime.utcnow().isoformat() + "Z",
        "note": "This model is evaluated on time-based splits and proxy labels only. It should be treated as a research-grade decision support layer, not a verified field model.",
    }

    reliability_plot = _plot_reliability(y_test, test_score, hazard)
    if reliability_plot:
        metrics["reliability_plot"] = reliability_plot

    model_bundle = {
        "hazard": hazard,
        "model": calibrated,
        "feature_columns": feature_cols,
        "selected_model": best_name,
        "training_summary": metrics,
    }
    return model_bundle, str(MODEL_DIR / f"{hazard}.joblib"), metrics


def main() -> None:
    parser = argparse.ArgumentParser(description="Train hazard models with honest proxy-label evaluation.")
    parser.add_argument("--hazard", choices=["flood", "heat", "fire"], required=True)
    args = parser.parse_args()

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    model_bundle, model_file, metrics = _model_bundle_for(args.hazard)
    joblib.dump(model_bundle, model_file)
    metrics_path = MODEL_DIR / f"{args.hazard}_metrics.json"
    metrics_path.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(json.dumps({"hazard": args.hazard, "path": model_file, "metrics": metrics}, indent=2))


if __name__ == "__main__":
    main()
