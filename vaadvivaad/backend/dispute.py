import os
import sqlite3
import uuid
import json
from datetime import datetime
from contextlib import contextmanager
from typing import Optional, List

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "disputes.db"))
DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))

@contextmanager
def get_db():
    """Context manager for thread-safe SQLite connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_db():
    """Initialize disputes table schema."""
    os.makedirs(DATA_DIR, exist_ok=True)
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS disputes (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                dispute_type TEXT NOT NULL,
                amount REAL NOT NULL,
                language TEXT DEFAULT 'hi',
                complainant_name TEXT,
                complainant_phone TEXT,
                respondent_name TEXT,
                respondent_phone TEXT,
                complainant_statement TEXT NOT NULL,
                respondent_statement TEXT,
                ai_analysis TEXT,
                resolution TEXT,
                resolved_at TEXT,
                accepted_by TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_status ON disputes(status);
            CREATE INDEX IF NOT EXISTS idx_phone ON disputes(complainant_phone);
        """)
        conn.commit()


def create_dispute(
    dispute_type: str,
    amount: float,
    complainant_name: str,
    complainant_phone: str,
    complainant_statement: str,
    respondent_name: str,
    respondent_phone: Optional[str] = None,
    language: str = "hi",
) -> str:
    """Inserts a new dispute record into the database."""
    dispute_id = f"VV{str(uuid.uuid4())[:8].upper()}"
    with get_db() as conn:
        conn.execute(
            """INSERT INTO disputes
               (id, created_at, dispute_type, amount, language,
                complainant_name, complainant_phone, respondent_name,
                respondent_phone, complainant_statement, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'waiting_respondent')""",
            (
                dispute_id,
                datetime.now().isoformat(),
                dispute_type,
                amount,
                language,
                complainant_name,
                complainant_phone,
                respondent_name,
                respondent_phone,
                complainant_statement,
            ),
        )
        conn.commit()
    return dispute_id


def get_dispute(dispute_id: str) -> Optional[dict]:
    """Retrieve a single dispute record."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM disputes WHERE id = ?", [dispute_id]
        ).fetchone()
        
        if row:
            d = dict(row)
            if d.get("ai_analysis"):
                try:
                    d["ai_analysis"] = json.loads(d["ai_analysis"])
                except Exception:
                    pass
            return d
        return None


def update_respondent_statement(dispute_id: str, statement: str) -> bool:
    """Updates the dispute record with respondent's input statement."""
    with get_db() as conn:
        updated = conn.execute(
            "UPDATE disputes SET respondent_statement = ?, status = 'in_analysis' WHERE id = ?",
            [statement, dispute_id],
        ).rowcount
        conn.commit()
    return updated > 0


def save_ai_analysis(dispute_id: str, analysis: dict, resolution: str) -> bool:
    """Logs the final AI analysis and mediation document text."""
    with get_db() as conn:
        updated = conn.execute(
            """UPDATE disputes SET ai_analysis = ?, resolution = ?,
               status = 'resolved', resolved_at = ?
               WHERE id = ?""",
            [json.dumps(analysis), resolution, datetime.now().isoformat(), dispute_id],
        ).rowcount
        conn.commit()
    return updated > 0


def list_disputes(phone: str = None, status: str = None) -> List[dict]:
    """List disputes with filtration criteria."""
    with get_db() as conn:
        query = "SELECT id, created_at, status, dispute_type, amount, complainant_name, respondent_name FROM disputes WHERE 1=1"
        params = []
        if phone:
            query += " AND (complainant_phone = ? OR respondent_phone = ?)"
            params.extend([phone, phone])
        if status:
            query += " AND status = ?"
            params.append(status)
        query += " ORDER BY created_at DESC LIMIT 50"
        
        rows = conn.execute(query, params).fetchall()
        return [dict(r) for r in rows]
