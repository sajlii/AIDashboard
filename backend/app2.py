from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np
import pandas as pd
import sqlite3
import os

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": [
            "http://localhost:3000",          # For local development
            "https://frontend-81h6.vercel.app/"  # Your Vercel frontend URL
        ],
        "methods": ["GET", "POST", "PUT", "DELETE"]
    }
})

# === Paths ===
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'incident_data.db')

# === Load model, vectorizer, and encoder ===
with open("models/incident_classifier_model.pkl", "rb") as f:
    model = pickle.load(f)

with open("models/tfidf_vectorizer.pkl", "rb") as f:
    tfidf = pickle.load(f)

with open("models/label_encoder.pkl", "rb") as f:
    label_encoder = pickle.load(f)

def create_feature_vector(description):
    text_features = tfidf.transform([description]).toarray()
    dummy_values = np.array([[0, 0, 0, 0]])  # nkill, nwound, propvalue, city_encoded
    return np.hstack([text_features, dummy_values])

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        description = data.get('description', '')
        if not description:
            return jsonify({'error': 'Description is required'}), 400

        features = create_feature_vector(description)
        pred = model.predict(features)
        incident_type = label_encoder.inverse_transform(pred)[0]
        return jsonify({'predicted_incident_type': incident_type})
    
    except Exception as e:
        print("Error during prediction:", e)
        return jsonify({'error': str(e)}), 500

@app.route('/incidents', methods=['GET'])
def get_incidents():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM incidents")
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        conn.close()

        # Convert rows to list of dicts
        incidents = [dict(zip(columns, row)) for row in rows]
        return jsonify(incidents)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/', methods=['GET'])
def index():
    return jsonify({
        "message": "✅ Flask backend is running",
        "available_routes": [
            "/predict", "/incidents", "/incident-count", "/add-incident",
            "/update-incident/<id>", "/delete-incident/<id>"
        ]
    })




# def list_routes():
#     # List all registered routes
#     routes = sorted([str(rule) for rule in app.url_map.iter_rules()])
#     return jsonify({'available_routes': routes})


@app.route('/incident-count', methods=['GET'])
def incident_count():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM incidents")
        count = cursor.fetchone()[0]
        conn.close()
        return jsonify({'total_incidents': count})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ✅ NEW ROUTE TO ADD INCIDENT
@app.route('/add-incident', methods=['POST'])
def add_incident():
    data = request.json
    description = data.get('description', '').strip()
    nkill = int(data.get('nkill', 0))
    nwound = int(data.get('nwound', 0))
    city = data.get('city', '').strip()
    incident_date = data.get('incident_date', '').strip()
    propvalue = float(data.get('propvalue', 0.0))

    try:
        # Predict incident_type
        features = create_feature_vector(description)
        pred = model.predict(features)
        incident_type = label_encoder.inverse_transform(pred)[0]

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Ensure table exists
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS incidents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                description TEXT,
                nkill INTEGER,
                nwound INTEGER,
                city TEXT,
                incident_type TEXT,
                incident_date TEXT,
                propvalue REAL,
                attacktype TEXT
            )
        ''')

        cursor.execute('''
            INSERT INTO incidents (
                description, nkill, nwound, city,
                incident_type, incident_date, propvalue, attacktype
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            description, nkill, nwound, city,
            incident_type, incident_date, propvalue, incident_type
        ))

        conn.commit()
        conn.close()

        return jsonify({'success': True, 'attacktype': incident_type})

    except Exception as e:
        print("❌ DB Insert Error:", e)
        return jsonify({'success': False, 'error': str(e)}), 500
    
@app.route('/update-incident/<int:incident_id>', methods=['PUT'])
def update_incident(incident_id):
    data = request.get_json()

    try:
        description = data.get('description', '').strip()
        nkill = int(data.get('nkill', 0))
        nwound = int(data.get('nwound', 0))
        city = data.get('city', '').strip()
        incident_date = data.get('incident_date', '').strip()
        propvalue = float(data.get('propvalue', 0.0))

        # Predict new incident type (optional — based on updated description)
        features = create_feature_vector(description)
        pred = model.predict(features)
        incident_type = label_encoder.inverse_transform(pred)[0]

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute('''
            UPDATE incidents
            SET description = ?, nkill = ?, nwound = ?, city = ?, 
                incident_type = ?, incident_date = ?, propvalue = ?, attacktype = ?
            WHERE id = ?
        ''', (
            description, nkill, nwound, city,
            incident_type, incident_date, propvalue, incident_type,
            incident_id
        ))

        conn.commit()
        conn.close()

        return jsonify({'success': True, 'message': f'Incident {incident_id} updated successfully.', 'attacktype': incident_type})

    except Exception as e:
        print("❌ Update Error:", e)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/delete-incident/<int:incident_id>', methods=['DELETE'])
def delete_incident(incident_id):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute("DELETE FROM incidents WHERE id = ?", (incident_id,))
        conn.commit()
        conn.close()

        return jsonify({'success': True, 'message': f'Incident {incident_id} deleted successfully.'})

    except Exception as e:
        print("❌ Delete Error:", e)
        return jsonify({'success': False, 'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
