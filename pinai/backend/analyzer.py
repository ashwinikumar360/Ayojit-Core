import os
import sqlite3
import pandas as pd
from contextlib import contextmanager

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "pinai.db"))

@contextmanager
def get_db():
    """Context manager for thread-safe SQLite connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


class PincodeAnalyzer:
    def get_nearby_pincodes(self, pincode: str, radius_km: float = 10) -> list[str]:
        """Find nearby pincodes within a bounding box (degree-based calculation)."""
        with get_db() as conn:
            pin_df = pd.read_sql(
                "SELECT latitude, longitude FROM pincodes WHERE pincode = ?",
                conn,
                params=[pincode]
            )
            
            if pin_df.empty or pd.isna(pin_df.iloc[0]["latitude"]):
                return []

            try:
                lat, lon = float(pin_df.iloc[0]["latitude"]), float(pin_df.iloc[0]["longitude"])
            except (ValueError, TypeError):
                return []
            
            # Approximate degree delta offset for radius
            lat_delta = radius_km / 111.0
            lon_delta = radius_km / (111.0 * abs(lat / 90 + 0.01))

            nearby = pd.read_sql(
                """
                SELECT pincode FROM pincodes
                WHERE latitude BETWEEN ? AND ?
                AND longitude BETWEEN ? AND ?
                AND pincode != ?
                LIMIT 20
                """,
                conn,
                params=[lat - lat_delta, lat + lat_delta,
                        lon - lon_delta, lon + lon_delta, pincode]
            )
            return nearby["pincode"].tolist()

    def get_business_metrics(self, pincode: str) -> dict:
        """Calculate commercial viability metrics for a pincode."""
        with get_db() as conn:
            pin_data = pd.read_sql(
                "SELECT * FROM pincodes WHERE pincode = ?",
                conn,
                params=[pincode]
            )
            
            if pin_data.empty:
                return {}

            row = pin_data.iloc[0]
            nearby = self.get_nearby_pincodes(pincode)

            delivery_active = str(row.get("delivery_status", "")).lower() == "delivery"
            nearby_count = len(nearby)
            density_score = min(10, nearby_count)

            # Get district Aadhaar proxy count if exists
            district = row.get("district", "")
            aadhaar_count = 0
            try:
                aadh_df = pd.read_sql(
                    "SELECT total_enrolments FROM aadhaar_data WHERE district LIKE ? LIMIT 20",
                    conn,
                    params=[f"%{district}%"]
                )
                if not aadh_df.empty:
                    aadhaar_count = int(aadh_df["total_enrolments"].sum())
            except Exception:
                pass

            return {
                "pincode": pincode,
                "location": {
                    "office": row.get("office_name", ""),
                    "district": district,
                    "state": row.get("state_name", ""),
                    "division": row.get("division_name", ""),
                    "coordinates": {
                        "lat": float(row.get("latitude", 0) or 0),
                        "lon": float(row.get("longitude", 0) or 0)
                    }
                },
                "business_signals": {
                    "delivery_active": delivery_active,
                    "nearby_pincodes_10km": nearby_count,
                    "market_density_score": density_score,
                    "estimated_catchment_area": f"{nearby_count * 5}-{nearby_count * 15} sq km",
                    "population_proxy_enrolments": aadhaar_count
                },
                "recommendation": self._get_recommendation(density_score, delivery_active)
            }

    def _get_recommendation(self, density: int, delivery: bool) -> str:
        if density >= 8 and delivery:
            return "HIGH POTENTIAL: Dense urban/semi-urban area with active delivery. Strong footfall expected."
        elif density >= 5 and delivery:
            return "MEDIUM POTENTIAL: Growing area with delivery infrastructure. Good for retail expansion."
        elif density >= 3:
            return "EMERGING: Low density but delivery present. First-mover advantage possible."
        else:
            return "RURAL: Very low density. Best for agri-services or rural financial products."

    def compare_pincodes(self, pincodes: list[str]) -> list[dict]:
        """Compare multiple locations."""
        return [self.get_business_metrics(p) for p in pincodes if p]
