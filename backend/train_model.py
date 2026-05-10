"""
House Price Prediction Model Training Script
Uses 'House Price India.csv' to train a GradientBoostingRegressor.
Saves the trained model and feature scaler to disk.
"""

import pandas as pd
import numpy as np
import joblib
import os
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.pipeline import Pipeline

# ─── Paths ────────────────────────────────────────────────────────────────────
DATASET_PATH = os.path.join(os.path.dirname(__file__), "..", "House Price India.csv")
MODEL_DIR    = os.path.dirname(__file__)
MODEL_PATH   = os.path.join(MODEL_DIR, "house_price_model.pkl")

# ─── Feature configuration (must match API schema) ────────────────────────────
FEATURES = [
    "number of bedrooms",
    "number of bathrooms",
    "living area",
    "lot area",
    "number of floors",
    "waterfront present",
    "number of views",
    "condition of the house",
    "grade of the house",
    "Area of the house(excluding basement)",
    "Area of the basement",
    "Built Year",
    "Renovation Year",
    "living_area_renov",
    "lot_area_renov",
    "Number of schools nearby",
    "Distance from the airport",
]
TARGET = "Price"


def load_and_clean(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)

    # Drop columns not used for prediction
    df = df[FEATURES + [TARGET]].copy()

    # Impute any missing values with column medians
    df.fillna(df.median(numeric_only=True), inplace=True)

    return df


def main():
    print("[INFO] Loading dataset...")
    df = load_and_clean(DATASET_PATH)
    print(f"   Shape: {df.shape}")

    X = df[FEATURES]
    y = df[TARGET]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    print("[INFO] Training Linear Regression Model...")
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("model", LinearRegression()),
    ])
    pipeline.fit(X_train, y_train)

    # ─── Evaluation ───────────────────────────────────────────────────────────
    y_pred = pipeline.predict(X_test)
    mae  = mean_absolute_error(y_test, y_pred)
    r2   = r2_score(y_test, y_pred)
    mape = np.mean(np.abs((y_test - y_pred) / y_test)) * 100

    print("\n[RESULTS] Model Performance on Test Set:")
    print(f"   R2 Score   : {r2:.4f}")
    print(f"   MAE        : {mae:,.0f}")
    print(f"   MAPE       : {mape:.2f}%")
    print(f"   Confidence : ~{max(0, 100 - mape):.1f}%")

    # ─── Save ─────────────────────────────────────────────────────────────────
    joblib.dump(pipeline, MODEL_PATH)
    print(f"\n[OK] Model saved to: {MODEL_PATH}")

    # Save feature metadata for validation
    feature_meta = {
        "features": FEATURES,
        "r2": r2,
        "mae": mae,
        "mape": mape,
        "train_size": len(X_train),
        "test_size": len(X_test),
        "stats": {col: {"min": float(X[col].min()), "max": float(X[col].max()),
                        "mean": float(X[col].mean())} for col in FEATURES},
    }
    import json
    meta_path = os.path.join(MODEL_DIR, "model_meta.json")
    with open(meta_path, "w") as f:
        json.dump(feature_meta, f, indent=2)
    print(f"[OK] Metadata saved to: {meta_path}")


if __name__ == "__main__":
    main()
