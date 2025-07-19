import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, '../incident_data.db')

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("SELECT * FROM incidents ORDER BY id DESC LIMIT 5")  # get last 5 rows
rows = cursor.fetchall()

print("📋 Last 5 entries in 'incidents' table:")
for row in rows:
    print(row)

conn.close()
