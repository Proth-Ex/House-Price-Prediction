# AI House Price Predictor

A full-stack template for a web-based Machine Learning application predicting house prices.

## Architecture

*   **Frontend**: Vanilla HTML/CSS/JS with a dynamic, glassmorphic UI design.
*   **Backend**: Python FastAPI serving as the API layer to host the ML model.
*   **Model Integration**: Easily drop in your trained `scikit-learn` or `TensorFlow` models.

## Project Structure

```text
c:\WorkSpace\AI\house_prediction\
├── backend/
│   ├── main.py          # FastAPI application
│   └── requirements.txt # Python dependencies
├── frontend/
│   ├── index.html       # Web interface
│   ├── css/
│   │   └── style.css    # Responsive styles
│   └── js/
│       └── main.js      # Form handling and API logic
└── README.md
```

## Getting Started

### 1. Backend Setup

Prerequisites: Python 3.8+

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

The API will start running at `http://localhost:8000`.
You can view the interactive Swagger API documentation at `http://localhost:8000/docs`.

### 2. Frontend Setup

The frontend consists of static files. You can serve them using any HTTP server, or simply open `frontend/index.html` in your web browser.

To start a simple local server for the frontend:
```bash
cd frontend
python -m http.server 3000
```
Then visit `http://localhost:3000` in your browser.

## Customizing the ML Model

1.  Train your model using a Jupyter notebook or separate pipeline.
2.  Export the model using `joblib` or `pickle`.
3.  Load the model in `backend/main.py`.
4.  Update the `predict_price` function to feed the frontend features into your `model.predict()` call.

```python
# Example integration
import joblib
model = joblib.load("model/house_price_model.pkl")

@app.post("/predict")
async def predict_price(features: HouseFeatures):
    input_data = [[features.area, features.bedrooms, features.bathrooms]] # map to your model's inputs
    prediction = model.predict(input_data)[0]
    return {"predicted_price": prediction}
```
