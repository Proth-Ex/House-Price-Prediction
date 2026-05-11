import joblib
import numpy as np

model = joblib.load('c:/WorkSpace/AI/house_prediction/backend/house_price_model.pkl')
print(type(model))

X = np.array([[
    3, # bedrooms
    2, # bathrooms
    1500, # living_area
    4000, # lot_area
    1, # floors
    0, # waterfront
    0, # views
    3, # condition
    7, # grade
    1500, # area_excluding_basement
    0, # basement_area
    1990, # built_year
    0, # renovation_year
    1500, # living_area_renov
    4000, # lot_area_renov
    2, # schools_nearby
    15, # airport_distance
]])

pred = model.predict(X)
print("Prediction:", pred)
