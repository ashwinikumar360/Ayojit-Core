"""
core/referral.py — Referral system API routes.

Generates unique referral codes per user, tracks claims, and awards
bonus daily queries (+5 per successful referral) to the referrer.
"""

import os
import string
import secrets
import logging
from fastapi import APIRouter, HTTPException, Depends
from core.auth import get_current_user, supabase

logger = logging.getLogger("core.referral")
router = APIRouter(prefix="/referral", tags=["referral"])

REFERRAL_CODE_LENGTH = 8
BONUS_QUERIES_PER_REFERRAL = 5


def generate_code() -> str:
    """Generate a random 8-character uppercase alphanumeric referral code."""
    alphabet = string.ascii_uppercase + string.digits
    # Remove ambiguous characters (O, 0, I, 1, L)
    alphabet = alphabet.replace("O", "").replace("0", "").replace("I", "").replace("1", "").replace("L", "")
    return "".join(secrets.choice(alphabet) for _ in range(REFERRAL_CODE_LENGTH))


@router.get("/code")
async def get_or_create_referral_code(user: dict = Depends(get_current_user)):
    """Get the user's referral code, creating one if it does not exist."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    user_id = user["user_id"]

    try:
        # Check for existing code
        existing = (supabase.table("referral_codes")
                    .select("code, bonus_queries, created_at")
                    .eq("user_id", user_id)
                    .maybe_single()
                    .execute())

        if existing.data:
            # Count how many people used this code
            claims = (supabase.table("referral_claims")
                      .select("id", count="exact")
                      .eq("referral_code_id", existing.data.get("id", ""))
                      .execute())

            # Re-query with id for claim count
            code_row = (supabase.table("referral_codes")
                        .select("id, code, bonus_queries, created_at")
                        .eq("user_id", user_id)
                        .maybe_single()
                        .execute())

            claim_count = 0
            if code_row.data:
                claims = (supabase.table("referral_claims")
                          .select("id", count="exact")
                          .eq("referral_code_id", code_row.data["id"])
                          .execute())
                claim_count = claims.count or 0

            return {
                "code": existing.data["code"],
                "total_referrals": claim_count,
                "bonus_queries_per_referral": BONUS_QUERIES_PER_REFERRAL,
                "total_bonus_earned": claim_count * BONUS_QUERIES_PER_REFERRAL,
            }

        # Generate a new unique code
        for attempt in range(10):
            code = generate_code()
            try:
                supabase.table("referral_codes").insert({
                    "user_id": user_id,
                    "code": code,
                    "bonus_queries": BONUS_QUERIES_PER_REFERRAL,
                }).execute()
                break
            except Exception:
                if attempt == 9:
                    raise HTTPException(status_code=500, detail="Failed to generate unique referral code")
                continue

        return {
            "code": code,
            "total_referrals": 0,
            "bonus_queries_per_referral": BONUS_QUERIES_PER_REFERRAL,
            "total_bonus_earned": 0,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Referral code error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to manage referral code")


@router.post("/claim/{code}")
async def claim_referral(code: str, user: dict = Depends(get_current_user)):
    """Claim a referral code. Awards bonus queries to the referrer."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    user_id = user["user_id"]

    try:
        # Look up the referral code
        code_row = (supabase.table("referral_codes")
                    .select("id, user_id, bonus_queries")
                    .eq("code", code.upper().strip())
                    .maybe_single()
                    .execute())

        if not code_row.data:
            raise HTTPException(status_code=404, detail="Referral code not found")

        referrer_id = code_row.data["user_id"]
        code_id = code_row.data["id"]

        # Block self-referral
        if referrer_id == user_id:
            raise HTTPException(status_code=400, detail="You cannot use your own referral code")

        # Check if already claimed by this user
        existing_claim = (supabase.table("referral_claims")
                          .select("id")
                          .eq("referral_code_id", code_id)
                          .eq("claimed_by", user_id)
                          .maybe_single()
                          .execute())

        if existing_claim.data:
            raise HTTPException(status_code=409, detail="You have already used a referral code")

        # Record the claim
        supabase.table("referral_claims").insert({
            "referral_code_id": code_id,
            "claimed_by": user_id,
        }).execute()

        logger.info(f"Referral claimed: code={code}, referrer={referrer_id}, claimer={user_id}")

        return {
            "status": "claimed",
            "message": f"Referral applied. The referrer earns +{BONUS_QUERIES_PER_REFERRAL} bonus queries per day.",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Referral claim error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to claim referral code")


@router.get("/stats")
async def referral_stats(user: dict = Depends(get_current_user)):
    """Get referral statistics for the current user."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    user_id = user["user_id"]

    try:
        code_row = (supabase.table("referral_codes")
                    .select("id, code, created_at")
                    .eq("user_id", user_id)
                    .maybe_single()
                    .execute())

        if not code_row.data:
            return {
                "has_code": False,
                "total_referrals": 0,
                "total_bonus_earned": 0,
            }

        claims = (supabase.table("referral_claims")
                  .select("claimed_by, claimed_at", count="exact")
                  .eq("referral_code_id", code_row.data["id"])
                  .order("claimed_at", desc=True)
                  .execute())

        claim_count = claims.count or 0

        return {
            "has_code": True,
            "code": code_row.data["code"],
            "total_referrals": claim_count,
            "total_bonus_earned": claim_count * BONUS_QUERIES_PER_REFERRAL,
            "recent_claims": [
                {"claimed_at": c["claimed_at"]}
                for c in (claims.data or [])[:5]
            ],
        }

    except Exception as e:
        logger.error(f"Referral stats error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch referral stats")
