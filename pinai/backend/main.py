import os
import sys
import logging
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Import core dependencies from root core/auth.py
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from core.auth import get_current_user, enforce_quota, increment_usage

load_dotenv()

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pinai.backend")

app = FastAPI(
    title="PinAI Backend",
    description="Hyperlocal business intelligence by pincode using open datasets."
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

from pinai.backend.analyzer import PincodeAnalyzer
from pinai.backend.insights import generate_business_insight, generate_expansion_report

analyzer = PincodeAnalyzer()

class PincodeRequest(BaseModel):
    pincode: str = Field(..., description="6-digit Indian Pincode")
    business_type: str = Field("retail", description="Type of business to evaluate")

    @field_validator("pincode")
    @classmethod
    def validate_pincode(cls, v: str) -> str:
        if len(v) != 6 or not v.isdigit():
            raise ValueError("Pincode must be exactly 6 digits")
        return v


class ExpansionRequest(BaseModel):
    current_pincode: str = Field(..., description="6-digit Indian Pincode")
    candidate_pincodes: List[str] = Field(..., description="List of expansion candidate pincodes")

    @field_validator("current_pincode")
    @classmethod
    def validate_current(cls, v: str) -> str:
        if len(v) != 6 or not v.isdigit():
            raise ValueError("Pincode must be exactly 6 digits")
        return v

    @field_validator("candidate_pincodes")
    @classmethod
    def validate_candidates(cls, v: List[str]) -> List[str]:
        if len(v) > 5:
            raise ValueError("Maximum 5 candidate pincodes allowed")
        for pin in v:
            if len(pin) != 6 or not pin.isdigit():
                raise ValueError("All candidate pincodes must be exactly 6 digits")
        return v


@app.get("/")
def root():
    return {"status": "active", "model": "PinAI Data Analysis Engine"}


@app.post("/insight")
@limiter.limit("10/minute")
async def get_insight(req: PincodeRequest, request: Request, user: dict = Depends(enforce_quota("pinai", "query"))):
    """Generates business intelligence insights and charges quotas."""
    try:
        metrics = analyzer.get_business_metrics(req.pincode)
        if not metrics:
            raise HTTPException(status_code=404, detail="Pincode data not found in database")
        
        insight = generate_business_insight(req.pincode, req.business_type)
        
        # Increment quota logs
        increment_usage(user["user_id"], "pinai", "query")

        return {
            "pincode": req.pincode,
            "business_type": req.business_type,
            "insight": insight,
            "metrics": metrics
        }
    except Exception as e:
        logger.error(f"Error serving insight query: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Internal analysis engine error")


@app.post("/expansion")
@limiter.limit("10/minute")
async def get_expansion_analysis(req: ExpansionRequest, request: Request, user: dict = Depends(enforce_quota("pinai", "query"))):
    """Compares multiple pincode profiles for business expansion."""
    try:
        report = generate_expansion_report(req.current_pincode, req.candidate_pincodes)
        comparisons = analyzer.compare_pincodes([req.current_pincode] + req.candidate_pincodes)
        
        # Increment quota logs
        increment_usage(user["user_id"], "pinai", "query")

        return {
            "report": report,
            "comparisons": comparisons
        }
    except Exception as e:
        logger.error(f"Error serving expansion query: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal analysis engine error")


@app.get("/health")
def health():
    return {"status": "ok"}
