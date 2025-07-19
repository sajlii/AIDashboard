from flask import Flask, request, jsonify
import pickle
import numpy as np
import pandas as pd
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Load model and encoders
model = pickle.load(open('models/incident_classifier_model.pkl', 'rb'))
vectorizer = pickle.load(open('models/tfidf_vectorizer.pkl', 'rb'))
label_encoder = pickle.load(open('models/label_encoder.pkl', 'rb'))

# Dummy encoder for city — must match training encoder
city_encoder = pickle.load(open('model/city_encoder.pkl', 'rb'))  # you’ll create this below

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()

    description = data.get('description', '')
    nkill = data.get('nkill', 0)
    nwound = data.get('nwound', 0)
    propvalue = data.get('propvalue', 0)
    city = data.get('city', '')

    if not description:
        return jsonify({'error': 'Description is required'}), 400

    # 1. Vectorize description (500 features)
    desc_vec = vectorizer.transform([description]).toarray()

    # 2. Encode city
    try:
        city_encoded = city_encoder.transform([city])[0]
    except:
        city_encoded = 0  # fallback if city not found

        

    # 3. Combine all features (504 total)
    numeric_features = np.array([[nkill, nwound, propvalue, city_encoded]])
    full_input = np.hstack([desc_vec, numeric_features])  # shape (1, 504)

    # 4. Predict
    y_pred = model.predict(full_input)
    label = label_encoder.inverse_transform(y_pred)[0]

    return jsonify({'prediction': label})

if __name__ == '__main__':
    app.run(debug=True)
