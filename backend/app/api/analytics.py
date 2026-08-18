import os
import time
from fastapi import APIRouter
from backend.app.config import settings
from backend.app.db import get_db
from backend.app.models import AnalyticsSummary
from backend.app.reconciler import reconcile_database_and_filesystem

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/summary", response_model=AnalyticsSummary)
def get_analytics_summary(force_reconcile: bool = False):
    with get_db() as conn:
        cursor = conn.cursor()
        count_rows = cursor.execute("SELECT COUNT(*) as cnt FROM conversions;").fetchone()
        if count_rows["cnt"] == 0 or force_reconcile:
            reconcile_database_and_filesystem()

    # Compute image counts from filesystem
    data_dir_files = 0
    if os.path.exists(settings.DATA_DIRECTORY):
        data_dir_files = len([
            f for f in os.listdir(settings.DATA_DIRECTORY)
            if os.path.isfile(os.path.join(settings.DATA_DIRECTORY, f)) and f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))
        ])

    with get_db() as conn:
        cursor = conn.cursor()

        # Count conversion statuses
        rows = cursor.execute("SELECT status, COUNT(*) as cnt FROM conversions GROUP BY status;").fetchall()
        status_map = {r["status"]: r["cnt"] for r in rows}

        # Count anomaly categories
        anom_rows = cursor.execute("SELECT category, COUNT(*) as cnt FROM anomalies GROUP BY category;").fetchall()
        anom_map = {r["category"]: r["cnt"] for r in anom_rows}

    total_valid = sum(status_map.values())
    approved = status_map.get("approved", 0)
    awaiting_review = status_map.get("awaiting_review", 0)
    processing = status_map.get("processing", 0)
    queued = status_map.get("queued", 0)
    eligible = status_map.get("eligible", 0)
    failed = status_map.get("failed", 0)
    rejected = status_map.get("rejected", 0)
    reprocessing = status_map.get("reprocessing", 0)

    total_eligible = eligible + queued + processing
    total_finished = approved + awaiting_review + rejected + failed
    
    completion_pct = round((approved / total_valid * 100), 1) if total_valid > 0 else 0.0
    approval_rate = round((approved / total_finished * 100), 1) if total_finished > 0 else 0.0
    rejection_rate = round(((rejected + reprocessing) / total_finished * 100), 1) if total_finished > 0 else 0.0

    return AnalyticsSummary(
        total_images_in_data_dir=data_dir_files,
        total_valid_excel_mappings=total_valid,
        total_eligible_source_images=total_eligible,
        total_approved=approved,
        total_awaiting_review=awaiting_review,
        total_processing=processing,
        total_queued=queued,
        total_remaining=eligible + queued + processing,
        total_failed=failed,
        total_rejected=rejected,
        total_reprocessing=reprocessing,

        auveco_missing_phantom_count=anom_map.get("auveco_missing_phantom", 0),
        phantom_missing_auveco_count=anom_map.get("phantom_missing_auveco", 0),
        both_missing_count=anom_map.get("both_missing", 0),
        missing_source_image_count=anom_map.get("missing_source_image", 0),
        duplicate_auveco_count=anom_map.get("duplicate_auveco", 0),
        duplicate_phantom_count=anom_map.get("duplicate_phantom", 0),
        one_auveco_multi_phantom_count=anom_map.get("one_auveco_multi_phantom", 0),
        one_phantom_multi_auveco_count=anom_map.get("one_phantom_multi_auveco", 0),
        invalid_source_image_count=anom_map.get("invalid_source_image", 0),
        unmapped_source_files_count=anom_map.get("unmapped_source_files", 0),

        completion_percentage=completion_pct,
        approval_rate=approval_rate,
        rejection_rate=rejection_rate,
        last_reconciled_at=time.strftime("%Y-%m-%d %H:%M:%S")
    )

@router.post("/reconcile")
def manual_reconcile():
    stats = reconcile_database_and_filesystem()
    return {"success": True, "stats": stats}
