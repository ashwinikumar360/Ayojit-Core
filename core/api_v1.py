"""
core/api_v1.py — Public API v1 with API key authentication.

Provides external access to PinAI, DocPatram, and HindiDiff endpoints
for third-party integrations. Each request is authenticated via an API key
stored as a SHA-256 hash in the api_keys table.
"""

import os
import hashlib
import logging
from datetime import datetime
from fastapi import APIRouter, Request, HTTPException, Header
from core.auth import supabase

logger = logging.getLogger("core.api_v1")
router = APIRouter(prefix="/v1", tags=["api_v1"])


def hash_api_key(key: str) -> str:
    """SHA-256 hash of the raw API key for storage comparison."""
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


async def authenticate_api_key(x_api_key: str = Header(..., alias="X-API-Key")) -> dict:
    """Validate the API key against the api_keys table."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    key_hash = hash_api_key(x_api_key)

    try:
        row = (supabase.table("api_keys")
               .select("id, user_id, scopes, rate_limit_per_minute, is_active")
               .eq("key_hash", key_hash)
               .maybe_single()
               .execute())

        if not row.data:
            raise HTTPException(status_code=401, detail="Invalid API key")

        if not row.data.get("is_active", False):
            raise HTTPException(status_code=403, detail="API key has been deactivated")

        # Update last_used_at timestamp
        supabase.table("api_keys").update({
            "last_used_at": datetime.utcnow().isoformat()
        }).eq("id", row.data["id"]).execute()

        return {
            "key_id": row.data["id"],
            "user_id": row.data["user_id"],
            "scopes": row.data.get("scopes", []),
            "rate_limit": row.data.get("rate_limit_per_minute", 30),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"API key auth error: {str(e)}")
        raise HTTPException(status_code=500, detail="Authentication service error")


def check_scope(api_key_data: dict, required_scope: str):
    """Verify the API key has permission for the requested scope."""
    scopes = api_key_data.get("scopes", [])
    if required_scope not in scopes:
        raise HTTPException(
            status_code=403,
            detail=f"API key does not have '{required_scope}' scope. Current scopes: {scopes}"
        )


@router.post("/pinai/insight")
async def api_pinai_insight(request: Request, x_api_key: str = Header(..., alias="X-API-Key")):
    """Public API: Get PinAI location insight by pincode."""
    api_key_data = await authenticate_api_key(x_api_key)
    check_scope(api_key_data, "pinai")

    body = await request.json()
    pincode = body.get("pincode", "")
    business_type = body.get("business_type", "retail")

    if not pincode or len(pincode) != 6 or not pincode.isdigit():
        raise HTTPException(status_code=400, detail="Invalid pincode. Must be 6 digits.")

    # Proxy to the internal PinAI backend
    import httpx
    pinai_url = os.getenv("PINAI_INTERNAL_URL", "http://localhost:8001")

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(
                f"{pinai_url}/insight",
                json={"pincode": pincode, "business_type": business_type},
                headers={"Authorization": f"Bearer internal-api-proxy"}
            )
            if res.status_code != 200:
                raise HTTPException(status_code=res.status_code, detail="PinAI service error")
            return res.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="PinAI service timeout")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PinAI proxy error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal service error")


@router.post("/docpatram/generate")
async def api_docpatram_generate(request: Request, x_api_key: str = Header(..., alias="X-API-Key")):
    """Public API: Generate a document via DocPatram."""
    api_key_data = await authenticate_api_key(x_api_key)
    check_scope(api_key_data, "docpatram")

    body = await request.json()
    template_id = body.get("template_id", "")
    fields = body.get("fields", {})

    if not template_id:
        raise HTTPException(status_code=400, detail="template_id is required")

    import httpx
    docpatram_url = os.getenv("DOCPATRAM_INTERNAL_URL", "http://localhost:8002")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                f"{docpatram_url}/generate",
                json={"template_id": template_id, "fields": fields},
                headers={"Authorization": f"Bearer internal-api-proxy"}
            )
            if res.status_code != 200:
                raise HTTPException(status_code=res.status_code, detail="DocPatram service error")
            return res.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="DocPatram service timeout")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"DocPatram proxy error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal service error")


@router.post("/hindidiff/generate")
async def api_hindidiff_generate(request: Request, x_api_key: str = Header(..., alias="X-API-Key")):
    """Public API: Generate an image via HindiDiff."""
    api_key_data = await authenticate_api_key(x_api_key)
    check_scope(api_key_data, "hindidiff")

    body = await request.json()
    prompt = body.get("prompt", "")

    if not prompt or len(prompt) < 3:
        raise HTTPException(status_code=400, detail="prompt must be at least 3 characters")

    import httpx
    hindidiff_url = os.getenv("HINDIDIFF_INTERNAL_URL", "http://localhost:8004")

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.post(
                f"{hindidiff_url}/generate",
                json={"prompt": prompt},
                headers={"Authorization": f"Bearer internal-api-proxy"}
            )
            if res.status_code != 200:
                raise HTTPException(status_code=res.status_code, detail="HindiDiff service error")
            return res.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="HindiDiff service timeout (image generation can take up to 60s)")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"HindiDiff proxy error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal service error")


@router.get("/status")
async def api_status():
    """Public API: Get current operational status for all apps."""
    if not supabase:
        return {"statuses": [], "note": "Database not connected"}

    try:
        result = supabase.table("system_status").select("app_id, status, message, updated_at").execute()
        return {"statuses": result.data or []}
    except Exception as e:
        logger.error(f"Status endpoint error: {str(e)}")
        return {"statuses": [], "error": "Failed to fetch status"}
