import os
import sys
import logging
import httpx
from fastapi import FastAPI, HTTPException, Request, Depends, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Import core dependencies from root core/auth.py
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from core.auth import get_current_user, enforce_quota, increment_usage, supabase
from core.compliance import log_compliance_event

load_dotenv()

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("docpatram.backend")

app = FastAPI(
    title="DocPatram Backend",
    description="Thin API gateway for document parsing using BharatGen Patram-7B VLM."
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

from docpatram.backend.ocr import extract_from_upload
from docpatram.backend.anonymizer import anonymize_text
# Reuse the Cloudinary upload utility from HindiDiff backend directly
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "hindidiff", "backend")))
from storage import upload_base64_image
import base64

DOCUMENT_TYPES = ["general", "aadhaar", "pan", "ration_card", "land_record", "hospital_form", "pension_form"]
PATRAM_HF_SPACE_URL = os.getenv("PATRAM_HF_SPACE_URL", "")


@app.get("/")
def root():
    return {
        "status": "active",
        "model": "BharatGen Patram-7B Proxy Gateway",
        "supported_docs": DOCUMENT_TYPES
    }


# Maximum upload size: 10MB
MAX_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "tiff", "tif"}


@app.post("/extract")
@limiter.limit("5/minute")
async def extract_document(
    request: Request,
    file: UploadFile = File(...),
    document_type: str = Form("general"),
    language: str = Form("mixed"),
    anonymize: bool = Form(True),
    user: dict = Depends(enforce_quota("docpatram", "doc_gen"))
):
    """Parses uploads, runs OCR, scrubs PII, queries Patram VLM, and logs metadata."""
    if document_type not in DOCUMENT_TYPES:
        raise HTTPException(status_code=400, detail=f"document_type must be one of: {DOCUMENT_TYPES}")

    # 1. Enforce file size limit
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size allowed is 10MB.")

    # 2. Enforce file extensions
    filename = file.filename or "doc.jpg"
    ext = filename.lower().split(".")[-1]
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=415, detail=f"Invalid file type. Supported extensions: {ALLOWED_EXTENSIONS}")

    try:
        # Verify and audit compliance for DocPatram
        log_compliance_event(
            app_id="docpatram",
            action="extract_document",
            asset_id="data.gov.in/public_templates",
            user_id=user["user_id"],
            db=supabase
        )

        # Log translation asset compliance if regional language is processed
        if language != "english":
            log_compliance_event(
                app_id="docpatram",
                action="translate_regional_text",
                asset_id="IndicTrans2",
                user_id=user["user_id"],
                db=supabase
            )

        # 3. OCR text extraction
        ocr_result = extract_from_upload(file_bytes, filename, language)
        if "error" in ocr_result:
            raise HTTPException(status_code=400, detail=ocr_result["error"])

        raw_text = ocr_result["text"]

        # 4. Anonymize PII if requested (DPDP Compliance)
        anon_result = {}
        processing_text = raw_text
        if anonymize:
            anon_result = anonymize_text(raw_text)
            processing_text = anon_result["anonymized_text"]

        # 5. Extract structured fields using Patram-7B on HF Spaces (thin proxy client)
        structured_data = {}
        cloudinary_url = ""
        
        # Only image files are sent directly to the vision VLM
        if ext in ["jpg", "jpeg", "png", "tiff", "tif"]:
            if not PATRAM_HF_SPACE_URL:
                logger.error("PATRAM_HF_SPACE_URL environment variable is not configured!")
                raise HTTPException(status_code=500, detail="Vision inference server not configured")

            async with httpx.AsyncClient(timeout=180.0) as client:
                files = {"file": (filename, file_bytes, file.content_type)}
                data = {"document_type": document_type}
                
                hf_headers = {}
                hf_token = os.getenv("HF_TOKEN")
                if hf_token:
                    hf_headers["Authorization"] = f"Bearer {hf_token}"

                logger.info(f"Forwarding image to Patram HF Space: {PATRAM_HF_SPACE_URL}/extract")
                resp = await client.post(
                    f"{PATRAM_HF_SPACE_URL}/extract",
                    files=files,
                    data=data,
                    headers=hf_headers
                )
                
                if resp.status_code != 200:
                    logger.error(f"Patram HF Space returned error status {resp.status_code}: {resp.text}")
                    raise HTTPException(status_code=502, detail="Upstream VLM processing failed")
                
                structured_data = resp.json()

            # Upload scanned image to Cloudinary for historical retrieval
            b64_str = base64.b64encode(file_bytes).decode("utf-8")
            cloudinary_url = upload_base64_image(b64_str, filename=f"docpatram_{user['user_id']}_{file.filename}")
        else:
            # For PDFs, fallback to text-based extraction matching fields structurally
            structured_data = {
                "extracted_text_preview": processing_text[:800],
                "note": "Layout Vision VLM features are only applicable to scanned images. PDF processed via text-OCR."
            }

        # 6. Save document references to Supabase history log (RLS rules govern client access)
        try:
            if supabase:
                supabase.table("documents").insert({
                    "user_id": user["user_id"],
                    "title": filename,
                    "url": cloudinary_url if cloudinary_url else "data:text/plain;charset=utf-8," + processing_text[:200],
                    "asset_id": "data.gov.in/public_templates"
                }).execute()
        except Exception as db_err:
            logger.error(f"Failed to record document metadata in Supabase: {str(db_err)}")

        # 7. Increment user quota count
        increment_usage(user["user_id"], "docpatram", "doc_gen", asset_id="data.gov.in/public_templates")

        return {
            "filename": filename,
            "document_type": document_type,
            "pages": ocr_result.get("pages", 1),
            "ocr_text": processing_text[:500] + "..." if len(processing_text) > 500 else processing_text,
            "structured_extraction": structured_data,
            "anonymization": {
                "applied": anonymize,
                "pii_entities_found": anon_result.get("pii_count", 0),
                "entities": anon_result.get("pii_found", [])
            },
            "document_url": cloudinary_url
        }

    except Exception as e:
        logger.error(f"DocPatram extraction request failed: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Internal server error during document processing")


@app.get("/health")
def health():
    return {"status": "ok"}
