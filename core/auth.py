import os
import logging
import jwt
from datetime import date
from typing import Optional
from fastapi import Header, HTTPException, Depends
from supabase import create_client, Client
from slowapi import Limiter
from slowapi.util import get_remote_address

DEMO_MODE = os.getenv("DEMO_MODE", "false").lower() == "true"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("core.auth")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

# Initialize Supabase client safely
supabase = None
if SUPABASE_URL and SUPABASE_SERVICE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    except Exception as e:
        logger.error(f"Failed to initialize Supabase: {str(e)}")
else:
    logger.warning("SUPABASE_URL or SUPABASE_SERVICE_KEY not set in environment. Running in mock/offline mode.")

# SlowAPI Limiter instance
limiter = Limiter(key_func=get_remote_address)

# Free daily limits per app, per action type
FREE_LIMITS = {
    "kisan-voice-ai": {"call": 5},
    "pinai":          {"query": 5},
    "docpatram":      {"doc_gen": 5},
    "vaadvivaad":     {"dispute": 1},
    "hindidiff":      {"image_gen": 5},
}

# Strict daily limits for Paid plans (Premium) to safeguard free API rate-limits
PAID_LIMITS = {
    "kisan-voice-ai": {"call": 50},
    "pinai":          {"query": 30},
    "docpatram":      {"doc_gen": 40},
    "vaadvivaad":     {"dispute": 10},
    "hindidiff":      {"image_gen": 30},
}

PAID_PLAN_PRICE_INR = {
    "pinai": 299,
    "docpatram": 999,
    "vaadvivaad": 499,
    "hindidiff": 99,
}


async def get_current_user(authorization: str = Header(...)) -> dict:
    """Decode Supabase JWT from Authorization: Bearer <token> header."""
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )
    except jwt.PyJWTError as e:
        logger.error(f"JWT decode failed: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return {"user_id": payload["sub"], "email": payload.get("email")}


def get_plan(user_id: str, app_id: str) -> str:
    """Check if the user is on the active paid plan."""
    try:
        row = (supabase.table("subscriptions")
               .select("plan, status")
               .eq("user_id", user_id)
               .eq("app_id", app_id)
               .maybe_single()
               .execute())
        if row.data and row.data["plan"] == "paid" and row.data["status"] == "active":
            return "paid"
    except Exception as e:
        logger.error(f"Error fetching subscription for user {user_id}: {str(e)}")
    
    return "free"


def get_today_usage(user_id: str, app_id: str, action: str) -> int:
    """Get request counts logged today by this user."""
    try:
        row = (supabase.table("usage_logs")
               .select("count")
               .eq("user_id", user_id)
               .eq("app_id", app_id)
               .eq("action", action)
               .eq("usage_date", str(date.today()))
               .maybe_single()
               .execute())
        return row.data["count"] if row.data else 0
    except Exception as e:
        logger.error(f"Error fetching usage for user {user_id}: {str(e)}")
        return 0


def increment_usage(user_id: str, app_id: str, action: str, asset_id: Optional[str] = None):
    """Log or increment user request actions."""
    if not supabase:
        logger.info(f"Offline mode: skip DB logging for {user_id} on {app_id} (asset: {asset_id})")
        return

    try:
        existing = (supabase.table("usage_logs")
                    .select("id, count")
                    .eq("user_id", user_id)
                    .eq("app_id", app_id)
                    .eq("action", action)
                    .eq("usage_date", str(date.today()))
                    .maybe_single()
                    .execute())
        
        if existing.data:
            supabase.table("usage_logs").update(
                {"count": existing.data["count"] + 1}
            ).eq("id", existing.data["id"]).execute()
        else:
            supabase.table("usage_logs").insert({
                "user_id": user_id,
                "app_id": app_id,
                "action": action,
                "asset_id": asset_id,
                "usage_date": str(date.today()),
                "count": 1
            }).execute()
    except Exception as e:
        logger.error(f"Failed to increment usage for user {user_id}: {str(e)}")


def enforce_quota(app_id: str, action: str):
    """FastAPI dependency to block request when quota exceeded."""
    async def _check(user: dict = Depends(get_current_user)):
        plan = get_plan(user["user_id"], app_id)
        used = get_today_usage(user["user_id"], app_id, action)
        
        if plan == "paid":
            limit = PAID_LIMITS.get(app_id, {}).get(action, 20)
            if used >= limit:
                logger.info(f"Paid user {user['user_id']} exceeded paid quota limit of {limit} for {app_id}")
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": "quota_exceeded",
                        "message": f"Premium daily limit reached ({limit}/{limit}). Please contact support for custom enterprise plans.",
                        "upgrade_url": ""
                    }
                )
            return user
        
        limit = FREE_LIMITS.get(app_id, {}).get(action, 5)
        if used >= limit:
            logger.info(f"User {user['user_id']} exceeded quota limit for {app_id}")
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "quota_exceeded",
                    "message": f"Free daily limit reached ({limit}/{limit}). Upgrade to Premium for ₹{PAID_PLAN_PRICE_INR.get(app_id,'—')}/month to get {PAID_LIMITS.get(app_id, {}).get(action, 20)} daily requests.",
                    "upgrade_url": f"/apps/{app_id}/billing"
                }
            )
        return user
    return _check


def log_usage(app_id: str, action: str):
    """Post-request helper to register query counts."""
    def _log(user: dict):
        increment_usage(user["user_id"], app_id, action)
    return _log
