"""
House Price Prediction API
Loads the trained Linear Regression pipeline and serves predictions via FastAPI.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib
import numpy as np
import json
import os
import csv
from typing import Optional

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BASE_DIR, "house_price_model.pkl")
META_PATH  = os.path.join(BASE_DIR, "model_meta.json")

# ─── Load model at startup ────────────────────────────────────────────────────
model    = None
metadata = {}

def load_model():
    global model, metadata
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        print("[OK] Model loaded successfully.")
    else:
        print("[WARN] Model file not found. Run train_model.py first.")

    if os.path.exists(META_PATH):
        with open(META_PATH) as f:
            metadata = json.load(f)

load_model()

TALUKA_CSV_PATH = os.path.join(BASE_DIR, "..", "Goa_Taluka_Multipliers.csv")
taluka_multipliers = {}

def load_talukas():
    global taluka_multipliers
    if os.path.exists(TALUKA_CSV_PATH):
        with open(TALUKA_CSV_PATH, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    taluka_multipliers[row["Taluka"].strip()] = float(row["Location_Multiplier"])
                except Exception:
                    pass

load_talukas()

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="House Price Prediction API",
    description="Predicts house prices using a trained Linear Regression model.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Schemas ──────────────────────────────────────────────────────────────────
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
    "Area of the basement",
    "Built Year",
    "Renovation Year",
    "living_area_renov",
    "lot_area_renov",
    "Number of schools nearby",
    "Distance from the airport",
]

class HouseFeatures(BaseModel):
    bedrooms:              int   = Field(..., ge=1,  le=20,   description="Number of bedrooms")
    bathrooms:             float = Field(..., ge=0.5, le=10,  description="Number of bathrooms")
    living_area:           int   = Field(..., ge=100, le=15000, description="Living area in sq ft")
    lot_area:              int   = Field(..., ge=100, le=500000, description="Lot area in sq ft")
    floors:                float = Field(..., ge=1,  le=4,    description="Number of floors")
    waterfront:            int   = Field(..., ge=0,  le=1,    description="Waterfront property (0 or 1)")
    views:                 int   = Field(..., ge=0,  le=4,    description="Number of views (0-4)")
    condition:             int   = Field(..., ge=1,  le=5,    description="Condition (1-5)")
    grade:                 int   = Field(..., ge=1,  le=13,   description="Grade (1-13)")
    area_excluding_basement: int = Field(..., ge=0,  le=15000, description="Above-ground sq ft")
    basement_area:         int   = Field(..., ge=0,  le=5000, description="Basement sq ft")
    built_year:            int   = Field(..., ge=1800, le=2025, description="Year built")
    renovation_year:       int   = Field(..., ge=0,  le=2025, description="Renovation year (0 if never)")
    living_area_renov:     int   = Field(..., ge=100, le=15000, description="Living area after renovation sq ft")
    lot_area_renov:        int   = Field(..., ge=100, le=500000, description="Lot area after renovation sq ft")
    schools_nearby:        int   = Field(..., ge=0,  le=20,   description="Number of schools nearby")
    airport_distance:      int   = Field(..., ge=0,  le=200,  description="Distance from airport (km)")
    taluka:                Optional[str] = Field(None, description="Taluka for price multiplier")

class PredictionResult(BaseModel):
    predicted_price:  float
    currency:         str   = "INR"
    confidence_pct:   float
    model_r2:         float
    price_range_low:  float
    price_range_high: float

# ─── Endpoints ────────────────────────────────────────────────────────────────
@app.post("/predict", response_model=PredictionResult)
async def predict_price(features: HouseFeatures):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Run train_model.py first.")

    # Build feature vector in the exact training order
    X = np.array([[
        features.bedrooms,
        features.bathrooms,
        features.living_area,
        features.lot_area,
        features.floors,
        features.waterfront,
        features.views,
        features.condition,
        features.grade,
        features.basement_area,
        features.built_year,
        features.renovation_year,
        features.living_area_renov,
        features.lot_area_renov,
        features.schools_nearby,
        features.airport_distance,
    ]])

    predicted = float(model.predict(X)[0])
    predicted = max(0, predicted)

    if features.taluka and features.taluka in taluka_multipliers:
        predicted *= taluka_multipliers[features.taluka]

    mape        = metadata.get("mape", 15.0)
    r2          = metadata.get("r2",   0.85)
    confidence  = max(0.0, round(100 - mape, 1))
    margin      = predicted * (mape / 100)

    return PredictionResult(
        predicted_price  = round(predicted, 2),
        currency         = "INR",
        confidence_pct   = confidence,
        model_r2         = round(r2, 4),
        price_range_low  = round(max(0, predicted - margin), 2),
        price_range_high = round(predicted + margin, 2),
    )


@app.get("/talukas")
async def get_talukas():
    return {"talukas": list(taluka_multipliers.keys())}


@app.get("/health")
async def health_check():
    return {
        "status":        "healthy" if model else "model_missing",
        "model_version": "v2.0.0",
        "model_loaded":  model is not None,
        "r2_score":      metadata.get("r2"),
        "trained_on":    metadata.get("train_size"),
    }


@app.get("/model-info")
async def model_info():
    if not metadata:
        raise HTTPException(status_code=404, detail="Metadata not available.")
    return metadata