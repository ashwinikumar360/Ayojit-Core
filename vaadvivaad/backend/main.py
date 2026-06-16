import os
import sys
import hmac
import hashlib
import logging
import re
from fastapi import FastAPI, HTTPException, Request, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Import core dependencies from root core/auth.py
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from core.auth import get_current_user, supabase

load_dotenv()

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vaadvivaad.backend")

app = FastAPI(
    title="VaadVivaad Backend",
    description="AI dispute resolution for Indian MSMEs using Sarvam-2B (Apache-2.0) reasoning."
)

# SlowAPI Limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Allowed CORS
ALLOWED_ORIGINS = [
    "https://ayojit-intelligence.vercel.app",
    "http://localhost:3000"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from vaadvivaad.backend.dispute import (
    init_db, create_dispute, get_dispute,
    update_respondent_statement, list_disputes
)
from vaadvivaad.backend.resolution import run_mediation
from vaadvivaad.backend.report import generate_dispute_pdf

# Initialize DB on load
init_db()

DISPUTE_TYPES = [
    "payment_default",
    "goods_not_delivered",
    "quality_issue",
    "contract_breach",
    "service_dispute",
    "refund_denied",
    "invoice_dispute",
]


class DisputeCreate(BaseModel):
    dispute_type: str = Field(..., description="Classification category of the conflict")
    amount: float = Field(..., ge=1.0, description="Disputed amount in INR")
    complainant_name: str = Field(..., max_length=150)
    complainant_phone: str = Field(..., max_length=15)
    complainant_statement: str = Field(..., max_length=5000, description="Detail text of the complaint")
    respondent_name: str = Field(..., max_length=150)
    respondent_phone: Optional[str] = Field(None, max_length=15)
    language: str = Field("hi", description="Primary language choice ('hi' or 'en')")
    
    # Razorpay payment keys for validation of 2nd+ disputes
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None

    @field_validator("dispute_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in DISPUTE_TYPES:
            raise ValueError(f"dispute_type must be one of: {DISPUTE_TYPES}")
        return v

    @field_validator("complainant_statement")
    @classmethod
    def clean_statement(cls, v: str) -> str:
        # Strip simple HTML/script injections
        cleaned = re.sub(r'<[^>]*>', '', v)
        if not cleaned.strip():
            raise ValueError("Statement description cannot be empty")
        return cleaned.strip()


class RespondentResponse(BaseModel):
    dispute_id: str = Field(..., description="Unique dispute transaction ID")
    respondent_statement: str = Field(..., max_length=5000, description="Respondent side explanation text")

    @field_validator("respondent_statement")
    @classmethod
    def clean_statement(cls, v: str) -> str:
        cleaned = re.sub(r'<[^>]*>', '', v)
        if not cleaned.strip():
            raise ValueError("Statement description cannot be empty")
        return cleaned.strip()


@app.get("/")
def root():
    return {
        "status": "active",
        "model": "Sarvam-2B v0.5 Reasoning Engine",
        "supported_disputes": DISPUTE_TYPES
    }


def verify_razorpay_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """Verifies that the payment token signature matches Razorpay signature parameters."""
    secret = os.getenv("RAZORPAY_KEY_SECRET", "")
    if not secret:
        logger.error("RAZORPAY_KEY_SECRET is not configured!")
        return False
        
    msg = f"{order_id}|{payment_id}"
    expected = hmac.new(secret.encode(), msg.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


@app.post("/dispute/file")
@limiter.limit("3/minute")
async def file_dispute(request: Request, dispute: DisputeCreate, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    """Registers a dispute. Checks lifetime free status, charging payment if user has used quota."""
    user_id = user["user_id"]
    
    # Check if user has filed a dispute already (VaadVivaad limit = 1 free dispute ever)
    existing = None
    if supabase:
        try:
            existing = (supabase.table("lifetime_usage")
                        .select("id")
                        .eq("user_id", user_id)
                        .eq("app_id", "vaadvivaad")
                        .eq("action", "dispute")
                        .maybe_single()
                        .execute())
        except Exception as e:
            logger.error(f"Failed to fetch lifetime usage quota: {str(e)}")
            existing = None

    if existing and existing.data:
        # User has already used their free dispute. Verify payment parameters
        if not dispute.razorpay_order_id or not dispute.razorpay_payment_id or not dispute.razorpay_signature:
            raise HTTPException(
                status_code=402,
                detail={
                    "error": "payment_required",
                    "message": "You have already used your 1 free lifetime dispute. Filing subsequent disputes requires a one-time fee of ₹499.",
                    "amount_inr": 499
                }
            )
        
        # Verify transaction signature
        if not verify_razorpay_signature(dispute.razorpay_order_id, dispute.razorpay_payment_id, dispute.razorpay_signature):
            raise HTTPException(status_code=400, detail="Invalid Razorpay transaction signature")

    # Create dispute
    dispute_id = create_dispute(
        dispute_type=dispute.dispute_type,
        amount=dispute.amount,
        complainant_name=dispute.complainant_name,
        complainant_phone=dispute.complainant_phone,
        complainant_statement=dispute.complainant_statement,
        respondent_name=dispute.respondent_name,
        respondent_phone=dispute.respondent_phone,
        language=dispute.language
    )

    # Log lifetime usage if first time
    if (not existing or not existing.data) and supabase:
        try:
            supabase.table("lifetime_usage").insert({
                "user_id": user_id,
                "app_id": "vaadvivaad",
                "action": "dispute",
                "asset_id": "data.gov.in/legal_judgments"
            }).execute()
        except Exception as insert_err:
            logger.error(f"Failed to log lifetime usage: {str(insert_err)}")

    return {
        "dispute_id": dispute_id,
        "status": "filed",
        "message": f"Dispute {dispute_id} filed. Share this ID with {dispute.respondent_name} to respond.",
        "next_step": f"POST /dispute/respond with dispute_id: {dispute_id}"
    }


@app.post("/dispute/respond")
@limiter.limit("5/minute")
async def respond_to_dispute(request: Request, response: RespondentResponse, background_tasks: BackgroundTasks):
    """Respondent submits defense. Triggers AI mediation processing."""
    dispute = get_dispute(response.dispute_id)
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
        
    if dispute["status"] not in ["waiting_respondent", "in_analysis"]:
        raise HTTPException(status_code=400, detail=f"Cannot respond to dispute in current status: {dispute['status']}")

    update_respondent_statement(response.dispute_id, response.respondent_statement)

    # Run AI mediation asynchronously in background
    background_tasks.add_task(run_mediation, response.dispute_id)

    return {
        "dispute_id": response.dispute_id,
        "status": "in_analysis",
        "message": "Response received. AI mediation evaluation is running. Check back in 30 seconds."
    }


@app.get("/dispute/{dispute_id}")
async def get_dispute_status(dispute_id: str):
    """Retrieve details and resolution report of a dispute."""
    dispute = get_dispute(dispute_id)
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    # Scrub phone numbers from public endpoint responses
    public_view = {k: v for k, v in dispute.items() if k not in ["complainant_phone", "respondent_phone"]}
    return public_view


@app.get("/dispute/{dispute_id}/pdf")
async def get_dispute_pdf(dispute_id: str):
    """Generates and downloads the PDF mediation document."""
    pdf_bytes = generate_dispute_pdf(dispute_id)
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Dispute PDF report is not ready or dispute does not exist")
        
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=vaadvivaad_{dispute_id}.pdf"
        }
    )


@app.post("/dispute/{dispute_id}/mediate")
async def force_mediation(dispute_id: str):
    """Forces manual mediation run (admin trigger)."""
    result = await run_mediation(dispute_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.get("/disputes")
async def get_disputes(phone: Optional[str] = None, status: Optional[str] = None):
    """Lists recent disputes."""
    return {"disputes": list_disputes(phone=phone, status=status)}


@app.get("/health")
def health():
    return {"status": "ok"}
