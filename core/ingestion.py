import os
import hashlib
import json
import logging
from typing import Optional, Any, Dict
from supabase import Client

logger = logging.getLogger("core.ingestion")


def calculate_sha256(file_path: str) -> str:
    """
    Calculate the SHA-256 fingerprint hash of a file for compliance provenance checks.
    """
    sha256 = hashlib.sha256()
    try:
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256.update(byte_block)
        return sha256.hexdigest()
    except Exception as e:
        logger.error(f"Failed to calculate hash for {file_path}: {str(e)}")
        raise e


def log_ingestion_run(
    asset_id: str,
    file_path: str,
    schema_metadata: Dict[str, Any],
    db: Optional[Client] = None
) -> Optional[str]:
    """
    Record an ingestion run, generating a fingerprint hash and saving metadata to the database.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Source data file not found at: {file_path}")

    # Generate SHA-256 fingerprint hash
    file_hash = calculate_sha256(file_path)
    
    logger.info(f"Ingesting asset '{asset_id}' from '{file_path}' (SHA-256: {file_hash})")

    # If Supabase is configured, write the record
    if db:
        try:
            record = {
                "asset_id": asset_id,
                "file_path": os.path.abspath(file_path),
                "file_hash": file_hash,
                "schema_metadata": schema_metadata
            }
            res = db.table("ingestion_runs").insert(record).execute()
            if res.data:
                logger.info(f"Provenance logged in Supabase with ID: {res.data[0]['id']}")
                return res.data[0]['id']
        except Exception as e:
            logger.error(f"Failed to write ingestion provenance to database: {str(e)}")
            
    return None


def get_latest_provenance(asset_id: str, db: Optional[Client] = None) -> Dict[str, Any]:
    """
    Retrieve the latest provenance log for a registered asset.
    """
    if db:
        try:
            res = (db.table("ingestion_runs")
                   .select("*")
                   .eq("asset_id", asset_id)
                   .order("ingested_at", {"ascending": False})
                   .limit(1)
                   .maybe_single()
                   .execute())
            if res.data:
                return res.data
        except Exception as e:
            logger.warning(f"Database query for latest provenance failed: {str(e)}")

    # Standalone mock fallback details for local verification
    return {
        "asset_id": asset_id,
        "file_path": "local/data/fallback",
        "file_hash": "sha256_mock_hash_for_offline_local_development_compliance",
        "schema_metadata": {"status": "offline_fallback"}
    }
