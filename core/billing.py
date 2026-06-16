import os
import hmac
import hashlib
import logging
import base64
import httpx
from fastapi import APIRouter, Request, HTTPException, Depends
from core.auth import get_current_user, supabase

logger = logging.getLogger("core.billing")
router = APIRouter(prefix="/billing", tags=["billing"])

def get_dodo_api_key() -> str:
    return os.getenv("DODO_API_KEY", "")

def get_dodo_webhook_secret() -> str:
    return os.getenv("DODO_WEBHOOK_SECRET", "")

def get_dodo_product_id(app_id: str) -> str:
    env_keys = {
        "pinai": "DODO_PRODUCT_PINAI",
        "docpatram": "DODO_PRODUCT_DOCPATRAM",
        "hindidiff": "DODO_PRODUCT_HINDIDIFF",
    }
    env_key = env_keys.get(app_id)
    if env_key:
        return os.getenv(env_key, "")
    return ""

def get_dodo_base_url() -> str:
    """Return the correct Dodo Payments base URL based on the API key prefix or content."""
    api_key = get_dodo_api_key()
    if api_key.startswith("live_") or "live" in api_key.lower():
        return "https://live.dodopayments.com"
    return "https://test.dodopayments.com"

async def create_subscription(user_id: str, app_id: str, user_email: str = None) -> dict:
    """Create a recurring subscription checkout session using Dodo Payments API."""
    product_id = get_dodo_product_id(app_id)
    if not product_id:
        raise HTTPException(status_code=400, detail=f"No Dodo product ID configured for app '{app_id}'")
        
    api_key = get_dodo_api_key()
    if not api_key:
        raise HTTPException(status_code=500, detail="DODO_API_KEY environment variable is missing")
        
    base_url = get_dodo_base_url()
    url = f"{base_url}/checkouts"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    return_url = f"https://ayojit-intelligence.vercel.app/apps/{app_id}/billing/success"
    
    payload = {
        "product_cart": [
            {
                "product_id": product_id,
                "quantity": 1
            }
        ],
        "metadata": {
            "user_id": user_id,
            "app_id": app_id
        },
        "return_url": return_url
    }
    
    if user_email:
        payload["customer"] = {"email": user_email}
        
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code not in (200, 201):
                logger.error(f"Dodo Payments API error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=500, detail="Failed to create checkout session with Dodo Payments")
                
            data = response.json()
            checkout_url = data.get("checkout_url")
            sub_id = data.get("subscription_id") or data.get("session_id")
            
            if not checkout_url or not sub_id:
                logger.error(f"Dodo response missing checkout_url or sub_id/session_id: {data}")
                raise HTTPException(status_code=500, detail="Invalid checkout response from Dodo Payments")
                
            # Store in Supabase
            if supabase:
                try:
                    supabase.table("subscriptions").upsert({
                        "user_id": user_id,
                        "app_id": app_id,
                        "plan": "free",
                        "dodo_payments_subscription_id": sub_id,
                        "status": "pending",
                    }, on_conflict="user_id,app_id").execute()
                except Exception as db_err:
                    logger.error(f"Supabase upsert failed: {str(db_err)}")
                    raise HTTPException(status_code=500, detail="Database recording failed")
                    
            return {"subscription_id": sub_id, "checkout_url": checkout_url}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error calling Dodo Payments subscription API: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal billing service error")

async def create_one_time_payment(user_id: str, amount: int, description: str, user_email: str = None) -> str:
    """Create a one-time payment checkout session using Dodo Payments API."""
    product_id = os.getenv("DODO_PRODUCT_VAADVIVAAD")
    if not product_id:
        logger.warning("DODO_PRODUCT_VAADVIVAAD not configured, using default 'vaadvivaad_pwyw'")
        product_id = "vaadvivaad_pwyw"
        
    api_key = get_dodo_api_key()
    if not api_key:
        raise HTTPException(status_code=500, detail="DODO_API_KEY environment variable is missing")
        
    base_url = get_dodo_base_url()
    url = f"{base_url}/checkouts"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    return_url = "https://ayojit-intelligence.vercel.app/apps/vaadvivaad/billing/success"
    
    payload = {
        "product_cart": [
            {
                "product_id": product_id,
                "quantity": 1,
                "amount": amount * 100  # Dodo requires lowest denomination (paise)
            }
        ],
        "metadata": {
            "user_id": user_id,
            "app_id": "vaadvivaad",
            "description": description
        },
        "return_url": return_url
    }
    
    if user_email:
        payload["customer"] = {"email": user_email}
        
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code not in (200, 201):
                logger.error(f"Dodo Payments API error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=500, detail="Failed to create checkout session with Dodo Payments")
                
            data = response.json()
            checkout_url = data.get("checkout_url")
            if not checkout_url:
                logger.error(f"Dodo response missing checkout_url: {data}")
                raise HTTPException(status_code=500, detail="Invalid checkout response from Dodo Payments")
                
            return checkout_url
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error calling Dodo Payments one-time API: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal billing service error")

def verify_webhook_signature(payload: bytes, signature: str, webhook_id: str, webhook_timestamp: str):
    """Verify incoming Dodo webhook signature using HMAC SHA256 with DODO_WEBHOOK_SECRET."""
    webhook_secret = get_dodo_webhook_secret()
    if not webhook_secret:
        logger.error("DODO_WEBHOOK_SECRET environment variable is missing!")
        raise HTTPException(status_code=500, detail="Webhook configuration error")
        
    secret = webhook_secret
    if secret.startswith("whsec_"):
        secret = secret[6:]
        
    try:
        secret_bytes = base64.b64decode(secret)
    except Exception as b64_err:
        logger.error(f"Failed to base64 decode Webhook Secret: {str(b64_err)}")
        raise HTTPException(status_code=500, detail="Webhook secret configuration error")
        
    # Construct signed content: webhook_id.webhook_timestamp.body_str
    try:
        payload_str = payload.decode("utf-8")
    except Exception:
        payload_str = payload.decode("latin1")
        
    signed_content = f"{webhook_id}.{webhook_timestamp}.{payload_str}".encode("utf-8")
    computed_hmac = hmac.new(secret_bytes, signed_content, hashlib.sha256).digest()
    expected_sig = base64.b64encode(computed_hmac).decode("utf-8")
    
    # Split signature header by spaces to support multiple signatures (key rotation)
    matched = False
    for part in signature.split(" "):
        if "," in part:
            version, sig_val = part.split(",", 1)
            if version == "v1" and hmac.compare_digest(expected_sig, sig_val):
                matched = True
                break
                
    if not matched:
        logger.warning("Dodo Payments webhook signature verification failed!")
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

@router.post("/create-subscription/{app_id}")
async def create_subscription_route(app_id: str, user: dict = Depends(get_current_user)):
    """API endpoint to create a subscription checkout URL."""
    res = await create_subscription(user["user_id"], app_id, user.get("email"))
    return res

@router.post("/create-one-time-payment")
async def create_one_time_payment_route(amount: int = 499, description: str = "VaadVivaad Dispute", user: dict = Depends(get_current_user)):
    """API endpoint to create a one-time payment checkout URL."""
    checkout_url = await create_one_time_payment(user["user_id"], amount, description, user.get("email"))
    return {"checkout_url": checkout_url}

@router.post("/webhook")
async def webhook_handler(request: Request):
    """Processes webhook updates securely from Dodo Payments."""
    body = await request.body()
    signature = request.headers.get("webhook-signature", "")
    webhook_id = request.headers.get("webhook-id", "")
    webhook_timestamp = request.headers.get("webhook-timestamp", "")
    
    if not signature or not webhook_id or not webhook_timestamp:
        logger.warning("Missing required webhook verification headers")
        raise HTTPException(status_code=400, detail="Missing verification headers")
        
    # Call signature verification before parsing payload
    verify_webhook_signature(body, signature, webhook_id, webhook_timestamp)
    
    try:
        payload = await request.json()
    except Exception as parse_err:
        logger.error(f"Failed to parse webhook JSON: {str(parse_err)}")
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
        
    event_type = payload.get("eventType") or payload.get("type")
    data = payload.get("data", {})
    metadata = data.get("metadata", {})
    
    sub_id = data.get("subscription_id")
    payment_id = data.get("payment_id")
    user_id = metadata.get("user_id")
    app_id = metadata.get("app_id")
    
    logger.info(f"Received Dodo Payments webhook event: '{event_type}'")
    
    if event_type == "payment.succeeded":
        logger.info(f"Payment succeeded: payment_id={payment_id}, sub_id={sub_id}")
        if supabase:
            try:
                if sub_id:
                    supabase.table("subscriptions").update({
                        "plan": "paid",
                        "status": "active"
                    }).eq("dodo_payments_subscription_id", sub_id).execute()
                elif user_id and app_id:
                    supabase.table("subscriptions").update({
                        "plan": "paid",
                        "status": "active"
                    }).eq("user_id", user_id).eq("app_id", app_id).execute()
            except Exception as e:
                logger.error(f"Failed to update subscription on payment.succeeded: {str(e)}")
                raise HTTPException(status_code=500, detail="Database update failed")
                
    elif event_type == "payment.failed":
        logger.info(f"Payment failed: payment_id={payment_id}, sub_id={sub_id}")
        if supabase:
            try:
                if sub_id:
                    supabase.table("subscriptions").update({
                        "status": "past_due"
                    }).eq("dodo_payments_subscription_id", sub_id).execute()
                elif user_id and app_id:
                    supabase.table("subscriptions").update({
                        "status": "past_due"
                    }).eq("user_id", user_id).eq("app_id", app_id).execute()
            except Exception as e:
                logger.error(f"Failed to update subscription on payment.failed: {str(e)}")
                raise HTTPException(status_code=500, detail="Database update failed")
                
    elif event_type == "subscription.cancelled":
        logger.info(f"Subscription cancelled: sub_id={sub_id}")
        if supabase:
            try:
                if sub_id:
                    supabase.table("subscriptions").update({
                        "status": "cancelled"
                    }).eq("dodo_payments_subscription_id", sub_id).execute()
                elif user_id and app_id:
                    supabase.table("subscriptions").update({
                        "status": "cancelled"
                    }).eq("user_id", user_id).eq("app_id", app_id).execute()
            except Exception as e:
                logger.error(f"Failed to update subscription on subscription.cancelled: {str(e)}")
                raise HTTPException(status_code=500, detail="Database update failed")
                
    return {"status": "ok"}
