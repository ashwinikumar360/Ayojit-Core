import os
import sqlite3
import csv

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "pinai.db"))
DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))


def init_database():
    """Initializes and loads CSV files into local SQLite instance."""
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Load Pincode Directory
    pincode_file = os.path.join(DATA_DIR, "pincode_directory.csv")
    if os.path.exists(pincode_file):
        print("Importing Pincode Directory CSV...")
        with open(pincode_file, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            original_headers = reader.fieldnames or []
            normalized_headers = [c.lower().strip().replace(" ", "_") for c in original_headers]
            
            # Drop old table and create new one with dynamically parsed columns
            cols_str = ", ".join([f"{h} TEXT" for h in normalized_headers])
            cursor.execute("DROP TABLE IF EXISTS pincodes")
            cursor.execute(f"CREATE TABLE pincodes ({cols_str})")
            
            placeholders = ", ".join(["?" for _ in normalized_headers])
            sql = f"INSERT INTO pincodes VALUES ({placeholders})"
            
            rows = []
            count = 0
            for row in reader:
                rows.append([row.get(h, "") for h in original_headers])
                count += 1
                if len(rows) >= 1000:
                    cursor.executemany(sql, rows)
                    rows = []
            if rows:
                cursor.executemany(sql, rows)
            
        print(f"Success: Loaded {count} rows into table 'pincodes'.")
    else:
        print(f"Warning: {pincode_file} not found. Creating empty table for local mock development.")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pincodes (
                pincode TEXT PRIMARY KEY,
                office_name TEXT,
                pincode_type TEXT,
                delivery_status TEXT,
                district TEXT,
                division_name TEXT,
                region TEXT,
                circle_name TEXT,
                state_name TEXT,
                latitude REAL,
                longitude REAL
            )
        """)
        # Insert a sample mock record for testing
        cursor.execute("""
            INSERT OR REPLACE INTO pincodes 
            (pincode, office_name, delivery_status, district, state_name, latitude, longitude)
            VALUES ('834001', 'Ranchi G.P.O.', 'Delivery', 'Ranchi', 'JHARKHAND', 23.36, 85.33)
        """)

    # 2. Load Aadhaar Monthly Stats
    aadhaar_file = os.path.join(DATA_DIR, "aadhaar_monthly.csv")
    if os.path.exists(aadhaar_file):
        print("Importing Aadhaar Monthly Stats CSV...")
        with open(aadhaar_file, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            original_headers = reader.fieldnames or []
            normalized_headers = [c.lower().strip().replace(" ", "_") for c in original_headers]
            
            cols_str = ", ".join([f"{h} TEXT" for h in normalized_headers])
            cursor.execute("DROP TABLE IF EXISTS aadhaar_data")
            cursor.execute(f"CREATE TABLE aadhaar_data ({cols_str})")
            
            placeholders = ", ".join(["?" for _ in normalized_headers])
            sql = f"INSERT INTO aadhaar_data ({placeholders})"
            
            rows = []
            count = 0
            for row in reader:
                rows.append([row.get(h, "") for h in original_headers])
                count += 1
                if len(rows) >= 1000:
                    cursor.executemany(sql, rows)
                    rows = []
            if rows:
                cursor.executemany(sql, rows)
            
        print(f"Success: Loaded {count} rows into table 'aadhaar_data'.")
    else:
        print(f"Warning: {aadhaar_file} not found. Creating empty table for local mock development.")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS aadhaar_data (
                district TEXT,
                total_enrolments INTEGER
            )
        """)
        cursor.execute("INSERT INTO aadhaar_data (district, total_enrolments) VALUES ('Ranchi', 154320)")

    conn.commit()
    conn.close()
    print(f"SQLite DB initialized successfully at {DB_PATH}")


if __name__ == "__main__":
    init_database()
