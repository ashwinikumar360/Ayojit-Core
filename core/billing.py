import os
import hmac
import hashlib
import logging
import razorpay
from fastapi import APIRouter, Request, HTTPException, Depends
from core.auth import get_current_user, supabase

logger = logging.getLogger("core.billing")
router = APIRouter(prefix="/billing", tags=["billing"])

# Initialize Razorpay Client
client = razorpay.Client(auth=(
    os.getenv("RAZORPAY_KEY_ID", "test_key_id"),
    os.getenv("RAZORPAY_KEY_SECRET", "test_key_secret")
))

RAZORPAY_PLAN_IDS = {
    "pinai": os.getenv("RAZORPAY_PLAN_PINAI", "plan_pinai_test"),
    "docpatram": os.getenv("RAZORPAY_PLAN_DOCPATRAM", "plan_docpatram_test"),
    "hindidiff": os.getenv("RAZORPAY_PLAN_HINDIDIFF", "plan_hindidiff_test"),
}


@router.post("/create-subscription/{app_id}")
async def create_subscription(app_id: str, user: dict = Depends(get_current_user)):
    """Creates a Razorpay Subscription session and tracks it in DB."""
    plan_id = RAZORPAY_PLAN_IDS.get(app_id)
    if not plan_id:
        raise HTTPException(status_code=400, detail="No subscription plan for this app")

    try:
        sub = client.subscription.create({
            "plan_id": plan_id,
            "customer_notify": 1,
            "total_count": 12,
            "notes": {"user_id": user["user_id"], "app_id": app_id},
        })
    except Exception as e:
        logger.error(f"Razorpay subscription creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create payment session")

    try:
        supabase.table("subscriptions").upsert({
            "user_id": user["user_id"],
            "app_id": app_id,
            "plan": "free",
            "razorpay_subscription_id": sub["id"],
            "status": "pending",
        }, on_conflict="user_id,app_id").execute()
    except Exception as e:
        logger.error(f"Supabase upsert failed for sub {sub['id']}: {str(e)}")
        raise HTTPException(status_code=500, detail="Database recording failed")

    return {"subscription_id": sub["id"], "short_url": sub.get("short_url")}


@router.post("/webhook")
async def razorpay_webhook(request: Request):
    """Processes webhook updates securely from Razorpay."""
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")

    if not secret:
        logger.error("RAZORPAY_WEBHOOK_SECRET environment variable is missing!")
        raise HTTPException(status_code=500, detail="Configuration error")

    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        logger.warning("Razorpay webhook signature verification failed!")
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    payload = await request.json()
    event = payload.get("event")
    sub_entity = payload.get("payload", {}).get("subscription", {}).get("entity", {})
    sub_id = sub_entity.get("id")

    if event == "subscription.activated":
        logger.info(f"Subscription activated: {sub_id}")
        supabase.table("subscriptions").update({
            "plan": "paid",
            "status": "active",
            "current_period_end": sub_entity.get("current_end"),
        }).eq("razorpay_subscription_id", sub_id).execute()

    elif event in ("subscription.cancelled", "subscription.halted"):
        logger.info(f"Subscription cancelled/halted: {sub_id}")
        supabase.table("subscriptions").update({
            "plan": "free",
            "status": "cancelled",
        }).eq("razorpay_subscription_id", sub_id).execute()

    return {"status": "ok"}
