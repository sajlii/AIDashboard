# init_db.py
import sqlite3

conn = sqlite3.connect('incident_data.db')
cursor = conn.cursor()

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

conn.commit()
conn.close()

print("Database and table created successfully.")
