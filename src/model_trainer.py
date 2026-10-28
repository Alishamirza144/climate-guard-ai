"""
Climate Guard AI - Random Forest Model Trainer
Trains and evaluates a Random Forest classifier using strictly chronological splits.
Prevents data leakage through out-of-time evaluation and TimeSeriesSplit cross-validation.
Saves model artifacts and performance metadata.
"""

from datetime import datetime
import json
from pathlib import Path
from typing import Dict, Any, Optional
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    brier_score_loss,
    confusion_matrix,
    classification_report
)
from sklearn.model_selection import TimeSeriesSplit

from src.config import (
    MODEL_PATH,
    MODEL_METADATA_PATH,
    RF_N_ESTIMATORS,
    RF_MAX_DEPTH,
    RF_MIN_SAMPLES_SPLIT,
    RF_MIN_SAMPLES_LEAF,
    RANDOM_SEED,
    SYSTEM_DISCLAIMER
)
from src.data_processor import HydrologicalDataProcessor


class FloodModelTrainer:
    """
    Trains and validates Random Forest models for Nashik flood risk classification.
    Adheres strictly to chronological evaluation to avoid temporal leakage.
    """

    def __init__(self, random_state: int = RANDOM_SEED):
        self.random_state = random_state
        self.model: Optional[RandomForestClassifier] = None
        self.metadata: Dict[str, Any] = {}

    def train_and_evaluate(
        self,
        data_path: Optional[str] = None,
        save_artifacts: bool = True
    ) -> Dict[str, Any]:
        """
        Executes the end-to-end training and evaluation pipeline:
        1. Loads & validates schema
        2. Causal missing data handling
        3. Causal feature engineering
        4. Chronological train/test split (zero leakage)
        5. TimeSeriesSplit cross-validation
        6. Out-of-time test evaluation
        7. Model artifact serialization
        """
        processor = HydrologicalDataProcessor(data_path=data_path)
        df_raw, diagnostics = processor.load_and_validate()
        df_clean, missing_diag = processor.handle_missing_data(df_raw)
        df_features, feature_names = processor.engineer_causal_features(df_clean)

        split_data = processor.chronological_split(df_features, feature_names)

        X_train = split_data["X_train"]
        y_train = split_data["y_train"]
        X_test = split_data["X_test"]
        y_test = split_data["y_test"]

        # Class weights to balance flood vs normal observations
        class_counts = y_train.value_counts().to_dict()
        print(f"Training set class distribution: {class_counts}")

        self.model = RandomForestClassifier(
            n_estimators=RF_N_ESTIMATORS,
            max_depth=RF_MAX_DEPTH,
            min_samples_split=RF_MIN_SAMPLES_SPLIT,
            min_samples_leaf=RF_MIN_SAMPLES_LEAF,
            class_weight="balanced_subsample",
            random_state=self.random_state,
            n_jobs=-1
        )

        # 1. TimeSeriesSplit Cross-Validation on training data
        tscv = TimeSeriesSplit(n_splits=4)
        cv_f1_scores = []
        cv_recall_scores = []

        for fold, (train_cv_idx, val_cv_idx) in enumerate(tscv.split(X_train)):
            X_cv_train, X_cv_val = X_train.iloc[train_cv_idx], X_train.iloc[val_cv_idx]
            y_cv_train, y_cv_val = y_train.iloc[train_cv_idx], y_train.iloc[val_cv_idx]

            fold_rf = RandomForestClassifier(
                n_estimators=50,
                max_depth=RF_MAX_DEPTH,
                class_weight="balanced_subsample",
                random_state=self.random_state
            )
            fold_rf.fit(X_cv_train, y_cv_train)
            val_preds = fold_rf.predict(X_cv_val)
            cv_f1_scores.append(f1_score(y_cv_val, val_preds, zero_division=0))
            cv_recall_scores.append(recall_score(y_cv_val, val_preds, zero_division=0))

        # 2. Fit final model on full chronological training window
        self.model.fit(X_train, y_train)

        # 3. Evaluate strictly on unseen chronological future test window
        y_pred = self.model.predict(X_test)
        y_proba = self.model.predict_proba(X_test)[:, 1]

        acc = float(accuracy_score(y_test, y_pred))
        prec = float(precision_score(y_test, y_pred, zero_division=0))
        rec = float(recall_score(y_test, y_pred, zero_division=0))
        f1 = float(f1_score(y_test, y_pred, zero_division=0))
        roc_auc = float(roc_auc_score(y_test, y_proba)) if len(np.unique(y_test)) > 1 else 0.5
        pr_auc = float(average_precision_score(y_test, y_proba)) if len(np.unique(y_test)) > 1 else 0.0
        brier = float(brier_score_loss(y_test, y_proba))
        cm = confusion_matrix(y_test, y_pred).tolist()

        # Location-wise breakdown on chronological test set
        test_df = split_data["test_df"].copy()
        test_df["_pred"] = y_pred
        test_df["_prob"] = y_proba
        location_metrics = {}
        for loc, grp in test_df.groupby("location"):
            l_acc = float(accuracy_score(grp["flood_label"], grp["_pred"]))
            l_prec = float(precision_score(grp["flood_label"], grp["_pred"], zero_division=0))
            l_rec = float(recall_score(grp["flood_label"], grp["_pred"], zero_division=0))
            l_f1 = float(f1_score(grp["flood_label"], grp["_pred"], zero_division=0))
            l_prauc = float(average_precision_score(grp["flood_label"], grp["_prob"])) if grp["flood_label"].nunique() > 1 else 1.0
            location_metrics[loc] = {
                "sample_count": len(grp),
                "flood_event_count": int(grp["flood_label"].sum()),
                "accuracy": round(l_acc, 4),
                "precision": round(l_prec, 4),
                "recall": round(l_rec, 4),
                "f1_score": round(l_f1, 4),
                "pr_auc": round(l_prauc, 4)
            }

        # 4. Feature Importances
        importances = {
            feat: float(imp)
            for feat, imp in zip(feature_names, self.model.feature_importances_)
        }
        sorted_importances = dict(sorted(importances.items(), key=lambda item: item[1], reverse=True))

        # Check if dataset is synthetic
        is_synthetic = bool(df_raw["is_synthetic"].iloc[0]) if "is_synthetic" in df_raw.columns else True

        self.metadata = {
            "trained_at": datetime.now().isoformat(),
            "model_type": "RandomForestClassifier",
            "is_synthetic_training_data": is_synthetic,
            "disclaimer": SYSTEM_DISCLAIMER,
            "leakage_prevention": {
                "evaluation_mode": "Strict Chronological Split (Out-of-Time)",
                "train_window": [str(split_data["train_start"]), str(split_data["train_end"])],
                "test_window": [str(split_data["test_start"]), str(split_data["test_end"])],
                "train_sample_count": split_data["train_size"],
                "test_sample_count": split_data["test_size"],
                "cv_method": "TimeSeriesSplit(n_splits=4)"
            },
            "metrics": {
                "accuracy": round(acc, 4),
                "precision": round(prec, 4),
                "recall": round(rec, 4),
                "f1_score": round(f1, 4),
                "roc_auc": round(roc_auc, 4),
                "pr_auc": round(pr_auc, 4),
                "brier_score": round(brier, 4),
                "tscv_mean_f1": round(float(np.mean(cv_f1_scores)), 4),
                "tscv_mean_recall": round(float(np.mean(cv_recall_scores)), 4),
                "confusion_matrix": cm,
                "location_wise": location_metrics
            },
            "feature_names": feature_names,
            "feature_importances": sorted_importances,
            "hyperparameters": {
                "n_estimators": RF_N_ESTIMATORS,
                "max_depth": RF_MAX_DEPTH,
                "min_samples_split": RF_MIN_SAMPLES_SPLIT,
                "min_samples_leaf": RF_MIN_SAMPLES_LEAF,
                "class_weight": "balanced_subsample",
                "random_state": self.random_state
            }
        }

        if save_artifacts:
            self.save_artifacts()

        print(f"Model Training Complete! Chronological Test F1: {f1:.4f}, Recall: {rec:.4f}, ROC-AUC: {roc_auc:.4f}")
        return self.metadata

    def save_artifacts(self, model_path: Optional[Path] = None, meta_path: Optional[Path] = None):
        """Saves trained model and metadata."""
        m_path = model_path or MODEL_PATH
        meta_p = meta_path or MODEL_METADATA_PATH

        m_path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.model, m_path)
        with open(meta_p, "w", encoding="utf-8") as f:
            json.dump(self.metadata, f, indent=4)
        print(f"Model serialized to {m_path}")
        print(f"Metadata serialized to {meta_p}")


if __name__ == "__main__":
    trainer = FloodModelTrainer()
    trainer.train_and_evaluate()
