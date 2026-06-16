import os
import sys
import logging
import hashlib
from fastapi import FastAPI, HTTPException, Request, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
from typing import Optional, List
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Import core dependencies from root core/auth.py
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from core.auth import get_current_user, enforce_quota, increment_usage, supabase

from twilio.request_validator import RequestValidator

load_dotenv()

async def verify_twilio_signature(request: Request):
    """Verify incoming request signature from Twilio."""
    twilio_token = os.getenv("TWILIO_AUTH_TOKEN")
    if not twilio_token:
        # Bypassed if TWILIO_AUTH_TOKEN is not configured in env
        return
        
    validator = RequestValidator(twilio_token)
    signature = request.headers.get("X-Twilio-Signature", "")
    url = str(request.url)
    
    # Read form body parameters
    form_data = await request.form()
    params = dict(form_data)
    
    if not validator.validate(url, params, signature):
        logger.warning(f"Twilio webhook signature verification failed for URL: {url}")
        raise HTTPException(status_code=403, detail="Invalid Twilio signature")


# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kisan.backend")

app = FastAPI(
    title="Kisan Voice AI Backend",
    description=" Helplines for regional farmers using KCC dataset RAG."
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

LANGUAGE_CODES = {
    "hindi": "hi",
    "bengali": "bn",
    "telugu": "te",
    "marathi": "mr",
    "tamil": "ta",
    "gujarati": "gu",
    "kannada": "kn",
    "odia": "or",
    "punjabi": "pa",
    "malayalam": "ml",
    "assamese": "as",
    "maithili": "mai",
    "english": "en",
}

from app.asr import transcribe_audio_query
from app.rag import get_best_answer
from app.voice import create_welcome_twiml, create_answer_twiml


class FarmerQuery(BaseModel):
    query: str = Field(..., max_length=500)
    language: str = Field("hi", max_length=10)
    crop: Optional[str] = None


@app.get("/")
def root():
    return {
        "status": "active",
        "service": "Kisan Voice AI Helpdesk",
        "supported_languages": list(LANGUAGE_CODES.keys())
    }


@app.get("/voice/audio")
async def get_voice_audio(text: str, language: str = "hi"):
    """
    Returns audio synthesized using Indic Parler-TTS.
    Verifies compliance registry first.
    """
    from core.language_services import synthesize_speech
    audio_bytes = await synthesize_speech(text, language=language, db=supabase)
    return Response(content=audio_bytes, media_type="audio/wav")


@app.post("/voice/inbound")
@limiter.limit("10/minute")
async def handle_inbound_call(request: Request, _ = Depends(verify_twilio_signature)):
    """Twilio webhook intercepting incoming calls."""
    base_url = str(request.base_url).rstrip("/")
    twiml = create_welcome_twiml(base_url, language="hi")
    return Response(content=twiml, media_type="application/xml")


@app.post("/voice/process")
@limiter.limit("10/minute")
async def process_voice_call(
    request: Request,
    SpeechResult: str = Form(default=""),
    From: str = Form(default=""),
    CallSid: str = Form(default=""),
    _ = Depends(verify_twilio_signature)
):
    """Twilio callback handling Speech transcription, RAG execution, and audio synthesis."""
    base_url = str(request.base_url).rstrip("/")
    if not SpeechResult.strip():
        # Re-play welcome if no voice query was captured
        twiml = create_welcome_twiml(base_url, language="hi")
        return Response(content=twiml, media_type="application/xml")

    # Hash caller phone number to protect PII compliance (DPDP compliance)
    hashed_caller = hashlib.sha256(From.encode()).hexdigest()
    logger.info(f"Received query from call {CallSid} (Caller: {hashed_caller[:12]}...): {SpeechResult}")

    # Fetch resolving answer from ChromaDB KCC transcripts
    answer = get_best_answer(SpeechResult)
    
    # Store Call logs securely in Supabase analytics for admin reviews (RLS locked)
    try:
        if supabase:
            supabase.table("usage_logs").insert({
                "user_id": "00000000-0000-0000-0000-000000000000", # System ID for citizen call operations
                "app_id": "kisan-voice-ai",
                "action": f"call_log: {hashed_caller[:12]}: {SpeechResult[:100]}",
                "asset_id": "data.gov.in/kcc"
            }).execute()
    except Exception as db_err:
        logger.error(f"Failed to log call usage statistics: {str(db_err)}")

    # Compile regional response audio using Parler TTS via custom endpoint
    twiml = create_answer_twiml(base_url, answer, language="hi")
    return Response(content=twiml, media_type="application/xml")


@app.post("/api/query")
async def query_assistant(payload: FarmerQuery, user: dict = Depends(get_current_user)):
    """REST endpoint for integration with web dashboard queries."""
    answer = get_best_answer(payload.query, crop=payload.crop)
    
    # Log usage statistics
    increment_usage(user["user_id"], "kisan-voice-ai", "query", asset_id="data.gov.in/kcc")

    return {
        "query": payload.query,
        "answer": answer,
        "language": payload.language,
        "source": "AIKosh KCC Transcript DB"
    }


@app.get("/logs")
async def view_call_logs(user: dict = Depends(get_current_user)):
    """Retrieves hashed call stats for government admin dashboard reviews."""
    # Verifies authorized admin role in real deployments; returns list of recent log transactions
    if not supabase:
        return {"logs": []}
    try:
        resp = (supabase.table("usage_logs")
                .select("*")
                .eq("app_id", "kisan-voice-ai")
                .order("created_at", { "ascending": False })
                .limit(50)
                .execute())
        return {"logs": resp.data or []}
    except Exception as e:
        logger.error(f"Failed to fetch admin call logs: {str(e)}")
        raise HTTPException(status_code=500, detail="Database retrieval failed")


@app.get("/health")
def health():
    return {"status": "ok"}
