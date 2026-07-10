import argparse
import json
import os
import re
import time
import typing

import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    roc_auc_score,
    roc_curve
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC
from sklearn.preprocessing import label_binarize

from labels import CANONICAL_LABELS, LABEL_UNKNOWN, standardize_label


TEXT_COLUMNS = [
    "Sub Category",
    "Ward Name",
    "Grievance Status",
    "Staff Remarks"
]

TARGET_COLUMN = "Category"
DATE_COLUMN = "Grievance Date"
PRIORITY_LABELS = ["LOW", "MEDIUM", "HIGH"]

CATEGORY_PRIORITY = {
    "Garbage and Solid Waste": "MEDIUM",
    "Water Supply": "HIGH",
    "Storm Water Drainage": "HIGH",
    "Sewage and Sanitation": "HIGH",
    "Roads and Potholes": "MEDIUM",
    "Street Lights and Electrical": "HIGH",
    "Parks and Environment": "LOW",
    "Public Health": "HIGH",
    "Traffic and Public Safety": "HIGH",
    "Property and Tax": "LOW",
    "Town Planning and Infrastructure": "LOW",
    "Other Public Services": "LOW",
    "Others": "LOW",
}


def normalize_text(value: str) -> str:
    text = "" if value is None else str(value)
    text = text.strip().lower()
    text = re.sub(r"\s+", " ", text)
    return text


def build_text_features(df: pd.DataFrame) -> pd.Series:
    for col in TEXT_COLUMNS:
        if col not in df.columns:
            df[col] = ""

    combined = df[TEXT_COLUMNS[0]].fillna("").astype(str)
    for col in TEXT_COLUMNS[1:]:
        combined = combined + " " + df[col].fillna("").astype(str)

    if DATE_COLUMN in df.columns:
        dates = pd.to_datetime(df[DATE_COLUMN], errors="coerce")
        day_tokens = dates.dt.day_name().fillna("").astype(str)
        month_tokens = dates.dt.month_name().fillna("").astype(str)
        combined = combined + " " + day_tokens + " " + month_tokens

    return combined.map(normalize_text)


def derive_priority_label(text: str, category: str) -> str:
    lower_text = text.lower()
    normalized_category = (category or "").strip()

    mapped_priority = CATEGORY_PRIORITY.get(normalized_category)
    if mapped_priority:
        return mapped_priority

    lower_category = normalized_category.lower()

    high_keywords = ["fire", "accident", "flood", "collapsed", "electrocute", "gas leak", "short circuit"]
    medium_keywords = ["garbage", "waste", "pothole", "drain", "sewage", "street light", "water"]

    if any(keyword in lower_text for keyword in high_keywords):
        return "HIGH"
    if "electrical" in lower_category or "road maintenance" in lower_category:
        return "HIGH"
    if any(keyword in lower_text for keyword in medium_keywords):
        return "MEDIUM"
    if "solid waste" in lower_category or "water" in lower_category:
        return "MEDIUM"
    return "LOW"


def build_priority_labels(text_series: pd.Series, category_series: pd.Series) -> pd.Series:
    return pd.Series(
        [derive_priority_label(text, category) for text, category in zip(text_series, category_series)],
        index=text_series.index
    )


def safe_train_test_split(X, y, test_size: float, seed: int):
    if test_size <= 0 or len(X) < 4:
        return X, None, y, None

    min_count = y.value_counts().min()
    stratify = y if min_count >= 2 else None

    try:
        return train_test_split(
            X,
            y,
            test_size=test_size,
            random_state=seed,
            stratify=stratify
        )
    except ValueError:
        return train_test_split(
            X,
            y,
            test_size=test_size,
            random_state=seed,
            stratify=None
        )


def build_classifier(model_type: str, c_value: float, class_weight: typing.Optional[str], max_iter: int, calibrate: bool):
    if model_type == "linear_svc":
        base = LinearSVC(C=c_value, class_weight=class_weight)
        if calibrate:
            return CalibratedClassifierCV(base, cv=3)
        return base

    return LogisticRegression(
        max_iter=max_iter,
        class_weight=class_weight,
        C=c_value,
        solver="lbfgs"
    )


def train_bert_classifier(embeddings: np.ndarray, labels: pd.Series, c_value: float, class_weight: typing.Optional[str], max_iter: int):
    classifier = LogisticRegression(
        max_iter=max_iter,
        class_weight=class_weight,
        C=c_value,
        solver="lbfgs"
    )
    classifier.fit(embeddings, labels)
    return classifier


def save_confusion_matrix(y_true, y_pred, labels, output_path: str):
    cm = confusion_matrix(y_true, y_pred, labels=labels)
    size = max(6.0, min(20.0, 0.5 * len(labels)))
    fig, ax = plt.subplots(figsize=(size, size))
    ax.imshow(cm, cmap="Blues")
    ax.set_xticks(range(len(labels)))
    ax.set_yticks(range(len(labels)))
    ax.set_xticklabels(labels, rotation=90, fontsize=8)
    ax.set_yticklabels(labels, fontsize=8)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    ax.set_title("Confusion Matrix")
    fig.tight_layout()
    fig.savefig(output_path, dpi=200)
    plt.close(fig)


def save_roc_curve(roc_data, output_path: str):
    micro = roc_data.get("micro") if isinstance(roc_data, dict) else None
    if not micro or not micro.get("fpr") or not micro.get("tpr"):
        return

    fig, ax = plt.subplots(figsize=(7.5, 6))
    ax.plot(micro["fpr"], micro["tpr"], color="#f472b6", linewidth=2.5, label=f"Micro-average ROC (AUC = {micro['auc']:.4f})")
    ax.plot([0, 1], [0, 1], linestyle="--", color="gray", linewidth=1.5, label="Random baseline")
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1.02)
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.set_title("Multiclass ROC Curve")
    ax.grid(True, linestyle=":", linewidth=0.7, alpha=0.6)
    ax.legend(loc="lower right")
    fig.tight_layout()
    fig.savefig(output_path, dpi=200)
    plt.close(fig)


def build_roc_data(y_true, y_score, labels):
    if y_true is None or y_score is None or len(labels) < 2:
        return {}

    y_true_bin = label_binarize(y_true, classes=labels)
    if y_true_bin.shape[1] != len(labels):
        return {}

    roc_data = {}

    try:
        micro_fpr, micro_tpr, _ = roc_curve(y_true_bin.ravel(), y_score.ravel())
        roc_data["micro"] = {
            "fpr": micro_fpr.tolist(),
            "tpr": micro_tpr.tolist(),
            "auc": float(roc_auc_score(y_true_bin, y_score, average="micro"))
        }
    except ValueError:
        return {}

    try:
        roc_data["macro_auc"] = float(roc_auc_score(y_true_bin, y_score, average="macro"))
    except ValueError:
        roc_data["macro_auc"] = None

    per_class = {}
    for index, label in enumerate(labels):
        try:
            fpr, tpr, _ = roc_curve(y_true_bin[:, index], y_score[:, index])
            per_class[label] = {
                "fpr": fpr.tolist(),
                "tpr": tpr.tolist(),
                "auc": float(roc_auc_score(y_true_bin[:, index], y_score[:, index]))
            }
        except ValueError:
            continue

    roc_data["per_class"] = per_class
    return roc_data


def train_model(
    data_path: str,
    out_dir: str,
    model_path: typing.Optional[str],
    test_size: float,
    seed: int,
    sample_rows: typing.Optional[int],
    model_type: str,
    c_value: float,
    class_weight: typing.Optional[str],
    max_iter: int,
    ngram_max: int,
    min_df: int,
    max_features: typing.Optional[int],
    calibrate: bool,
    bert_enabled: bool,
    bert_model_name: str
):
    df = pd.read_csv(data_path)

    if sample_rows and sample_rows > 0 and sample_rows < len(df):
        df = df.sample(n=sample_rows, random_state=seed)

    if TARGET_COLUMN not in df.columns:
        raise ValueError(f"Missing target column: {TARGET_COLUMN}")

    df = df.dropna(subset=[TARGET_COLUMN])
    df[TARGET_COLUMN] = df[TARGET_COLUMN].astype(str).str.strip()
    df = df[df[TARGET_COLUMN] != ""]
    df[TARGET_COLUMN] = df[TARGET_COLUMN].map(standardize_label)

    text = build_text_features(df)
    labels = df[TARGET_COLUMN]
    priority_labels = build_priority_labels(text, labels)

    X_train, X_test, y_train, y_test = safe_train_test_split(
        text,
        labels,
        test_size=test_size,
        seed=seed
    )

    if model_type == "linear_svc" and not calibrate:
        calibrate = True

    classifier = build_classifier(
        model_type=model_type,
        c_value=c_value,
        class_weight=class_weight,
        max_iter=max_iter,
        calibrate=calibrate
    )

    model = Pipeline([
        (
            "tfidf",
            TfidfVectorizer(
                stop_words="english",
                ngram_range=(1, ngram_max),
                min_df=min_df,
                max_features=max_features
            )
        ),
        ("clf", classifier)
    ])

    model.fit(X_train, y_train)

    priority_model = Pipeline([
        (
            "tfidf",
            TfidfVectorizer(
                stop_words="english",
                ngram_range=(1, ngram_max),
                min_df=min_df,
                max_features=max_features
            )
        ),
        ("clf", build_classifier(model_type, c_value, class_weight, max_iter, calibrate))
    ])

    priority_train = priority_labels.loc[X_train.index]
    priority_model.fit(X_train, priority_train)

    labels_set = set(labels.unique().tolist())
    label_order = [label for label in CANONICAL_LABELS if label in labels_set]
    if LABEL_UNKNOWN in labels_set and LABEL_UNKNOWN not in label_order:
        label_order.append(LABEL_UNKNOWN)

    metrics = {
        "train_rows": int(len(X_train)),
        "test_rows": int(0 if X_test is None else len(X_test)),
        "labels": label_order,
        "model_type": model_type,
        "class_weight": class_weight or "none",
        "calibrated": calibrate,
        "label_standardization": {
            "canonical_labels": CANONICAL_LABELS,
            "unknown_label": LABEL_UNKNOWN
        },
        "tfidf": {
            "ngram_max": ngram_max,
            "min_df": min_df,
            "max_features": max_features
        },
        "hyperparams": {
            "C": c_value,
            "max_iter": max_iter
        }
    }

    bert_metrics = {
        "enabled": False,
        "model_name": bert_model_name
    }

    os.makedirs(out_dir, exist_ok=True)

    shap_background_path = None
    if len(X_train) > 0:
        shap_background = X_train.sample(n=min(len(X_train), 200), random_state=seed).tolist()
        shap_background_path = os.path.join(out_dir, "shap_background.json")
        with open(shap_background_path, "w", encoding="utf-8") as background_file:
            json.dump(shap_background, background_file, ensure_ascii=True, indent=2)

    per_class_csv_path = os.path.join(out_dir, "per_class_report.csv")
    confusion_matrix_path = os.path.join(out_dir, "confusion_matrix.png")
    roc_curve_path = os.path.join(out_dir, "roc_curve.png")

    if X_test is not None:
        preds = model.predict(X_test)
        y_score = model.predict_proba(X_test)
        report = classification_report(y_test, preds, labels=label_order, output_dict=True, zero_division=0)
        report_df = pd.DataFrame(report).transpose()
        report_df.to_csv(per_class_csv_path, index=True)
        save_confusion_matrix(y_test, preds, label_order, confusion_matrix_path)
        roc_data = build_roc_data(y_test, y_score, label_order)
        save_roc_curve(roc_data, roc_curve_path)
        priority_test = priority_labels.loc[X_test.index]
        priority_preds = priority_model.predict(X_test)
        priority_report = classification_report(priority_test, priority_preds, output_dict=True, zero_division=0)
        priority_report_df = pd.DataFrame(priority_report).transpose()
        priority_per_class_csv = os.path.join(out_dir, "priority_per_class_report.csv")
        priority_report_df.to_csv(priority_per_class_csv, index=True)
        priority_confusion_path = os.path.join(out_dir, "priority_confusion_matrix.png")
        save_confusion_matrix(priority_test, priority_preds, PRIORITY_LABELS, priority_confusion_path)

        metrics.update({
            "accuracy": float(accuracy_score(y_test, preds)),
            "f1_macro": float(f1_score(y_test, preds, average="macro")),
            "f1_weighted": float(f1_score(y_test, preds, average="weighted")),
            "classification_report": report,
            "roc_auc": roc_data.get("macro_auc"),
            "roc_curve": roc_data,
            "per_class_csv": per_class_csv_path,
            "confusion_matrix_png": confusion_matrix_path,
            "roc_curve_png": roc_curve_path,
            "priority_report": priority_report,
            "priority_per_class_csv": priority_per_class_csv,
            "priority_confusion_matrix_png": priority_confusion_path
        })
    else:
        metrics["note"] = "Test split skipped (insufficient data or test_size=0)."

    if shap_background_path:
        metrics["shap_background"] = shap_background_path

    metrics["bert"] = bert_metrics

    resolved_model_path = model_path or os.path.join(out_dir, "model.pkl")
    joblib.dump(model, resolved_model_path)

    priority_model_path = os.path.join(out_dir, "priority_model.pkl")
    joblib.dump(priority_model, priority_model_path)

    bert_model_path = None
    bert_priority_model_path = None
    if bert_enabled:
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError as exc:
            raise ImportError("sentence-transformers is required for --bert training") from exc

        embedder = SentenceTransformer(bert_model_name, device="cpu")
        X_train_embeddings = embedder.encode(
            X_train.tolist(),
            batch_size=32,
            show_progress_bar=False,
            normalize_embeddings=True
        )
        bert_classifier = train_bert_classifier(X_train_embeddings, y_train, c_value, class_weight, max_iter)

        priority_train = priority_labels.loc[X_train.index]
        bert_priority_classifier = train_bert_classifier(X_train_embeddings, priority_train, c_value, class_weight, max_iter)

        bert_model_path = os.path.join(out_dir, "bert_model.pkl")
        bert_priority_model_path = os.path.join(out_dir, "bert_priority_model.pkl")
        joblib.dump(bert_classifier, bert_model_path)
        joblib.dump(bert_priority_classifier, bert_priority_model_path)

        bert_metrics["enabled"] = True
        bert_metrics["model_path"] = bert_model_path
        bert_metrics["priority_model_path"] = bert_priority_model_path

        if X_test is not None:
            X_test_embeddings = embedder.encode(
                X_test.tolist(),
                batch_size=32,
                show_progress_bar=False,
                normalize_embeddings=True
            )
            bert_preds = bert_classifier.predict(X_test_embeddings)
            bert_metrics["accuracy"] = float(accuracy_score(y_test, bert_preds))
            bert_metrics["f1_macro"] = float(f1_score(y_test, bert_preds, average="macro"))
            bert_metrics["f1_weighted"] = float(f1_score(y_test, bert_preds, average="weighted"))

    metrics_path = os.path.join(out_dir, "metrics.json")
    with open(metrics_path, "w", encoding="utf-8") as metrics_file:
        json.dump(metrics, metrics_file, indent=2)

    metadata = {
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "data_path": os.path.abspath(data_path),
        "out_dir": os.path.abspath(out_dir),
        "model_path": os.path.abspath(resolved_model_path),
        "text_columns": TEXT_COLUMNS,
        "target_column": TARGET_COLUMN,
        "date_column": DATE_COLUMN,
        "sample_rows": sample_rows or 0,
        "test_size": test_size,
        "seed": seed,
        "model_type": model_type,
        "class_weight": class_weight or "none",
        "calibrated": calibrate,
        "label_standardization": {
            "canonical_labels": CANONICAL_LABELS,
            "unknown_label": LABEL_UNKNOWN,
            "label_order": label_order
        },
        "tfidf": {
            "ngram_max": ngram_max,
            "min_df": min_df,
            "max_features": max_features
        },
        "hyperparams": {
            "C": c_value,
            "max_iter": max_iter
        },
        "priority_model_path": os.path.abspath(priority_model_path),
        "bert": {
            "enabled": bert_enabled,
            "model_name": bert_model_name,
            "model_path": None if bert_model_path is None else os.path.abspath(bert_model_path),
            "priority_model_path": None if bert_priority_model_path is None else os.path.abspath(bert_priority_model_path)
        },
        "shap_background": None if shap_background_path is None else os.path.abspath(shap_background_path)
    }

    metadata_path = os.path.join(out_dir, "metadata.json")
    with open(metadata_path, "w", encoding="utf-8") as meta_file:
        json.dump(metadata, meta_file, indent=2)

    return resolved_model_path, priority_model_path, metrics_path, metadata_path


def parse_args():
    parser = argparse.ArgumentParser(description="Train the grievance category classifier.")
    parser.add_argument("--data-path", default="data.csv", help="Path to the input CSV file.")
    parser.add_argument("--out-dir", default="artifacts", help="Directory for metrics and metadata.")
    parser.add_argument("--model-path", default=None, help="Optional model output path.")
    parser.add_argument("--test-size", type=float, default=0.2, help="Fraction reserved for testing.")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for splits.")
    parser.add_argument("--sample-rows", type=int, default=0, help="Sample N rows for quick runs.")
    parser.add_argument("--model", choices=["logistic", "linear_svc"], default="logistic", help="Classifier type.")
    parser.add_argument("--C", type=float, default=1.0, help="Inverse regularization strength.")
    parser.add_argument("--class-weight", choices=["balanced", "none"], default="balanced", help="Class weighting.")
    parser.add_argument("--max-iter", type=int, default=2000, help="Max iterations for solver.")
    parser.add_argument("--ngram-max", type=int, default=2, help="Max n-gram size.")
    parser.add_argument("--min-df", type=int, default=2, help="Min document frequency for terms.")
    parser.add_argument("--max-features", type=int, default=0, help="Cap vocabulary size (0 = unlimited).")
    parser.add_argument("--calibrate", action="store_true", help="Calibrate linear SVC to enable predict_proba.")
    parser.add_argument("--bert", action="store_true", help="Enable MiniLM BERT embeddings and classifiers.")
    parser.add_argument("--bert-model-name", default="all-MiniLM-L6-v2", help="SentenceTransformer model name.")
    return parser.parse_args()


def main():
    args = parse_args()
    class_weight = None if args.class_weight == "none" else args.class_weight
    max_features = None if args.max_features <= 0 else args.max_features

    model_path, priority_model_path, metrics_path, metadata_path = train_model(
        data_path=args.data_path,
        out_dir=args.out_dir,
        model_path=args.model_path,
        test_size=args.test_size,
        seed=args.seed,
        sample_rows=args.sample_rows or None,
        model_type=args.model,
        c_value=args.C,
        class_weight=class_weight,
        max_iter=args.max_iter,
        ngram_max=args.ngram_max,
        min_df=args.min_df,
        max_features=max_features,
        calibrate=args.calibrate,
        bert_enabled=args.bert,
        bert_model_name=args.bert_model_name
    )

    print("Training complete")
    print(f"Model: {model_path}")
    print(f"Priority model: {priority_model_path}")
    print(f"Metrics: {metrics_path}")
    print(f"Metadata: {metadata_path}")


if __name__ == "__main__":
    main()
