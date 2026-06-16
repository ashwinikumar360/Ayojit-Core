import logging
from typing import Optional
from supabase import Client
from core.asset_registry import get_asset, verify_and_resolve_asset

logger = logging.getLogger("core.compliance")


def log_compliance_event(
    app_id: str,
    action: str,
    asset_id: str,
    user_id: Optional[str] = None,
    db: Optional[Client] = None
) -> bool:
    """
    Verify asset compliance, extract license rules, and save compliance audit trails.
    """
    try:
        # 1. Resolve and verify the asset first (will raise error if blocked/noncommercial)
        resolved_asset = verify_and_resolve_asset(asset_id, db)
        
        license_type = resolved_asset.get("license_type", "unclear")
        attribution = resolved_asset.get("attribution_requirement", False)
        
        attribution_text = ""
        if attribution:
            attribution_text = (
                f"This output is derived from '{resolved_asset.get('name')}' "
                f"licensed under {license_type}. "
                f"Source: {resolved_asset.get('source_url')} (Version: {resolved_asset.get('version_tag')})"
            )

        logger.info(f"[COMPLIANCE AUDIT] App '{app_id}' executed action '{action}' on asset '{asset_id}' (License: {license_type})")

        # 2. Write to Supabase compliance logs if DB is available
        if db:
            log_entry = {
                "user_id": user_id,
                "app_id": app_id,
                "action": action,
                "asset_id": resolved_asset["id"],
                "license_type": license_type,
                "attribution_text": attribution_text if attribution_text else None
            }
            db.table("license_compliance_logs").insert(log_entry).execute()
            logger.info("Compliance log event successfully stored in database.")
            
        return True
    except Exception as e:
        logger.error(f"Compliance audit check failed: {str(e)}")
        # If it was blocked, propagate the permission error
        if isinstance(e, PermissionError) or isinstance(e, ValueError):
            raise e
        return False
