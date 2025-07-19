from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import papermill as pm
import uuid
import os
import json

app = Flask(__name__)
CORS(app)  # Allow React frontend to access backend

CSV_FILE = 'dashboard_dataset_cleaned.csv'

# ✅ Route 1: Serve existing incident data from CSV
@app.route('/incidents', methods=['GET'])
def get_incidents():
    try:
        if not os.path.exists(CSV_FILE):
            return jsonify({'error': 'CSV file not found'}), 404
        df = pd.read_csv(CSV_FILE)
        df.fillna('', inplace=True)  # Optional: clean nulls
        return jsonify(df.to_dict(orient='records'))
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ✅ Route 2: Predict incident type from description
@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    description = data.get('description', '')

    if not description:
        return jsonify({'error': 'No description provided'}), 400

    output_notebook = f"executed_{uuid.uuid4().hex}.ipynb"
    result_file = "result.json"

    # Delete previous result
    if os.path.exists(result_file):
        os.remove(result_file)

    try:
        # Execute notebook with given description
        pm.execute_notebook(
            'Project (1).ipynb',        # <- Your ML notebook file
            output_notebook,
            parameters={"description": description}
        )

        # Load prediction result
        if os.path.exists(result_file):
            with open(result_file, 'r') as f:
                result = json.load(f)
            return jsonify(result)
        else:
            return jsonify({'error': 'Prediction not found in result.json'}), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500

    finally:
        if os.path.exists(output_notebook):
            os.remove(output_notebook)

if __name__ == '__main__':
    app.run(port=5000)
