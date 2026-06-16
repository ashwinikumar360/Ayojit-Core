"""
core/admin.py — Super-admin panel API routes.

Provides revenue dashboard data, user management, and system status controls.
Admin status is verified against the admin_users table in Supabase.
"""

import os
import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from core.auth import get_current_user, supabase

logger = logging.getLogger("core.admin")
router = APIRouter(prefix="/admin", tags=["admin"])


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """Dependency that blocks non-admin users."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        row = (supabase.table("admin_users")
               .select("role")
               .eq("user_id", user["user_id"])
               .maybe_single()
               .execute())
        if not row.data:
            raise HTTPException(status_code=403, detail="Admin access required")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin check failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Admin verification failed")

    user["admin_role"] = row.data["role"]
    return user


@router.get("/revenue")
async def revenue_dashboard(admin: dict = Depends(require_admin)):
    """Aggregate revenue and subscription metrics across all 5 apps."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        # Total active paid subscriptions
        active_subs = (supabase.table("subscriptions")
                       .select("app_id, plan, status")
                       .eq("plan", "paid")
                       .eq("status", "active")
                       .execute())

        # Per-app breakdown
        app_counts = {}
        for sub in (active_subs.data or []):
            app_id = sub["app_id"]
            app_counts[app_id] = app_counts.get(app_id, 0) + 1

        # Price map for MRR calculation (monthly prices in INR)
        price_map = {
            "pinai": 299,
            "docpatram": 999,
            "hindidiff": 99,
        }

        mrr = sum(
            app_counts.get(app_id, 0) * price
            for app_id, price in price_map.items()
        )

        # Total registered users
        total_profiles = (supabase.table("profiles")
                          .select("id", count="exact")
                          .execute())

        # Today's usage across all apps
        today = datetime.utcnow().strftime("%Y-%m-%d")
        today_usage = (supabase.table("usage_logs")
                       .select("app_id, count")
                       .eq("usage_date", today)
                       .execute())

        total_requests_today = sum(row.get("count", 0) for row in (today_usage.data or []))

        return {
            "mrr_inr": mrr,
            "total_active_subscriptions": len(active_subs.data or []),
            "per_app_subscriptions": app_counts,
            "total_users": total_profiles.count or 0,
            "total_requests_today": total_requests_today,
            "generated_at": datetime.utcnow().isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Revenue dashboard error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate revenue report")


@router.get("/users")
async def list_users(
    page: int = 1,
    per_page: int = 50,
    search: str = "",
    admin: dict = Depends(require_admin)
):
    """List all users with their subscription and usage data."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        offset = (page - 1) * per_page

        query = supabase.table("profiles").select("*", count="exact")
        if search:
            query = query.ilike("full_name", f"%{search}%")
        query = query.order("created_at", desc=True)
        query = query.range(offset, offset + per_page - 1)
        result = query.execute()

        users = result.data or []
        user_ids = [u["id"] for u in users]

        # Batch fetch subscriptions for these users
        subs_data = []
        if user_ids:
            subs_result = (supabase.table("subscriptions")
                           .select("user_id, app_id, plan, status")
                           .in_("user_id", user_ids)
                           .execute())
            subs_data = subs_result.data or []

        # Map subscriptions to users
        subs_map = {}
        for s in subs_data:
            uid = s["user_id"]
            if uid not in subs_map:
                subs_map[uid] = []
            subs_map[uid].append({
                "app_id": s["app_id"],
                "plan": s["plan"],
                "status": s["status"],
            })

        enriched_users = []
        for u in users:
            enriched_users.append({
                "id": u["id"],
                "full_name": u.get("full_name"),
                "phone": u.get("phone"),
                "preferred_language": u.get("preferred_language", "hi"),
                "onboarding_completed": u.get("onboarding_completed", False),
                "created_at": u.get("created_at"),
                "subscriptions": subs_map.get(u["id"], []),
            })

        return {
            "users": enriched_users,
            "total": result.count or 0,
            "page": page,
            "per_page": per_page,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"User listing error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to list users")


@router.get("/users/{user_id}")
async def get_user_detail(user_id: str, admin: dict = Depends(require_admin)):
    """Get detailed information for a specific user."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        profile = (supabase.table("profiles")
                   .select("*")
                   .eq("id", user_id)
                   .maybe_single()
                   .execute())
        if not profile.data:
            raise HTTPException(status_code=404, detail="User not found")

        subs = (supabase.table("subscriptions")
                .select("*")
                .eq("user_id", user_id)
                .execute())

        # Last 30 days usage
        thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")
        usage = (supabase.table("usage_logs")
                 .select("app_id, action, usage_date, count")
                 .eq("user_id", user_id)
                 .gte("usage_date", thirty_days_ago)
                 .order("usage_date", desc=True)
                 .execute())

        return {
            "profile": profile.data,
            "subscriptions": subs.data or [],
            "recent_usage": usage.data or [],
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"User detail error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch user details")


@router.post("/status/{app_id}")
async def update_system_status(
    app_id: str,
    status: str = "operational",
    message: str = "",
    admin: dict = Depends(require_admin)
):
    """Update operational status for a specific app."""
    valid_statuses = ["operational", "degraded", "outage", "maintenance"]
    if status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )

    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        supabase.table("system_status").upsert({
            "app_id": app_id,
            "status": status,
            "message": message or f"Status changed to {status}",
            "updated_by": admin["user_id"],
            "updated_at": datetime.utcnow().isoformat(),
        }, on_conflict="app_id").execute()

        return {"app_id": app_id, "status": status, "message": message}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Status update error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update system status")


@router.get("/status")
async def get_all_status(admin: dict = Depends(require_admin)):
    """Get operational status for all apps."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        result = supabase.table("system_status").select("*").execute()
        return {"statuses": result.data or []}
    except Exception as e:
        logger.error(f"Status fetch error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch system statuses")
