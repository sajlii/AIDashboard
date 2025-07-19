import sqlite3
import os

# === Path to your database ===
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, '../incident_data.db')

# === Connect and count rows ===
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("SELECT COUNT(*) FROM incidents")
count = cursor.fetchone()[0]

print(f"📊 Total rows in 'incidents' table: {count}")

conn.close()
