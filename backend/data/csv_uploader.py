import pandas as pd
import sqlite3
import pickle
import os

# === Adjusted paths based on your structure ===
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, '../incident_data.db')
MODEL_PATH = os.path.join(BASE_DIR, '../models/incident_classifier_model.pkl')
CSV_PATH = os.path.join(BASE_DIR, 'dashboard_dataset_cleaned.csv')  # Change if needed

# === Load trained ML model ===
try:
    with open(MODEL_PATH, 'rb') as f:
        model = pickle.load(f)
except FileNotFoundError:
    print(f"❌ Model file not found at {MODEL_PATH}")
    exit(1)

# === Load CSV ===
try:
    df = pd.read_csv(CSV_PATH)

    # === Universal Cleaner ===
    def clean_dataframe(df):
        for col in df.columns:
            if df[col].dtype == object:
                df[col] = df[col].fillna('').apply(lambda x: x.strip() if isinstance(x, str) else '')
            elif pd.api.types.is_numeric_dtype(df[col]):
                df[col] = df[col].apply(lambda x: 0 if pd.isna(x) or str(x).strip() == '' else x)
        return df

    df = clean_dataframe(df)

    # === Predict missing incident_type ===
    if 'incident_type' not in df.columns or df['incident_type'].isnull().any():
        print("🔍 Predicting missing incident_type...")
        df['attacktype'] = model.predict(df['description'].tolist())
        df['incident_type'] = df['attacktype']
    else:
        df['attacktype'] = df['incident_type']

    # === Connect to DB ===
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # ✅ Create table if not exists
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

    # === Insert data ===
    for _, row in df.iterrows():
        try:
            cursor.execute('''
                INSERT INTO incidents (
                    description, nkill, nwound, city,
                    incident_type, incident_date, propvalue, attacktype
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                row['description'],
                int(row['nkill']) if str(row['nkill']).strip() != '' else 0,
                int(row['nwound']) if str(row['nwound']).strip() != '' else 0,
                row['city'],
                row['incident_type'],
                row['incident_date'],
                float(row['propvalue']) if str(row['propvalue']).strip() != '' else 0.0,
                row['attacktype']
            ))
        except Exception as insert_error:
            print(f"⚠️ Skipping row due to error: {insert_error}")
            continue

    conn.commit()
    conn.close()
    print("✅ CSV uploaded successfully into the database.")

except FileNotFoundError:
    print(f"❌ CSV file not found at {CSV_PATH}")
except Exception as e:
    print(f"❌ Upload failed: {e}")
