from fastapi import APIRouter, HTTPException
from typing import List, Optional
from backend.app.config import settings
from backend.app.db import get_db
from backend.app.models import (
    BatchCreateRequest, BatchConfirmationPreview, SingleConversionRequest
)
from backend.app.job_queue import job_queue_manager

router = APIRouter(prefix="/jobs", tags=["Jobs & Queue"])

@router.post("/batch/preview", response_model=BatchConfirmationPreview)
def preview_batch_job(req: BatchCreateRequest):
    with get_db() as conn:
        cursor = conn.cursor()
        
        if req.selected_auveco_numbers:
            placeholders = ",".join(["?"] * len(req.selected_auveco_numbers))
            eligible_rows = cursor.execute(f"""
            SELECT COUNT(*) as cnt FROM conversions
            WHERE auveco IN ({placeholders}) AND status IN ('eligible', 'failed', 'rejected');
            """, list(req.selected_auveco_numbers)).fetchone()["cnt"]
        else:
            eligible_rows = cursor.execute("""
            SELECT COUNT(*) as cnt FROM conversions WHERE status = 'eligible';
            """).fetchone()["cnt"]

        completed_or_pending = cursor.execute("""
        SELECT COUNT(*) as cnt FROM conversions WHERE status IN ('approved', 'awaiting_review', 'queued', 'processing');
        """).fetchone()["cnt"]

        anomalies_count = cursor.execute("SELECT COUNT(*) as cnt FROM anomalies;").fetchone()["cnt"]

    requested = req.count
    will_queue = min(requested, eligible_rows)
    requires_confirmation = requested > settings.CONFIRMATION_THRESHOLD
    
    # OpenAI gpt-image-2 estimated cost ($0.04 per image approx)
    approx_cost = round(will_queue * 0.04, 2)

    msg = f"Confirm queuing {will_queue} images for CAD conversion using preset '{req.preset.upper()}'."
    warning_text = ""
    if requires_confirmation:
        warning_text = f"API usage for {will_queue} images will incur an estimated cost of ~${approx_cost} USD."

    if will_queue < requested:
        warning_text += f" Note: Only {will_queue} eligible images are available (requested {requested})."

    return BatchConfirmationPreview(
        requested_count=requested,
        eligible_count=eligible_rows,
        will_queue_count=will_queue,
        completed_or_pending_count=completed_or_pending,
        skipped_anomalies_count=anomalies_count,
        estimated_api_calls=will_queue,
        estimated_cost_usd_approx=approx_cost,
        requires_confirmation=requires_confirmation,
        confirmation_message=msg,
        warning=warning_text
    )

@router.post("/batch/create")
def create_batch_job(req: BatchCreateRequest):
    if req.count > settings.CONFIRMATION_THRESHOLD and not req.force_reprocess:
        raise HTTPException(
            status_code=400,
            detail=f"Batch size {req.count} exceeds threshold ({settings.CONFIRMATION_THRESHOLD}). Explicit confirmation required."
        )

    res = job_queue_manager.batch_create_jobs(
        count=req.count,
        preset=req.preset,
        selected_auvecos=req.selected_auveco_numbers,
        force=req.force_reprocess
    )
    return {"success": True, "details": res}

@router.post("/single")
def create_single_job(req: SingleConversionRequest):
    auveco = req.auveco.strip()

    with get_db() as conn:
        cursor = conn.cursor()

        row = cursor.execute("SELECT * FROM conversions WHERE auveco = ?", (auveco,)).fetchone()
        if not row:
            # Check anomalies
            anom = cursor.execute("SELECT * FROM anomalies WHERE auveco = ?", (auveco,)).fetchall()
            if anom:
                anom_details = [dict(a) for a in anom]
                raise HTTPException(
                    status_code=422,
                    detail={
                        "error_type": "anomaly",
                        "message": f"AuVeCo serial '{auveco}' has anomalies preventing conversion.",
                        "anomalies": anom_details
                    }
                )
            raise HTTPException(
                status_code=404,
                detail=f"AuVeCo serial '{auveco}' not found in Excel mapping."
            )

        status = row["status"]
        if status in ["queued", "processing"]:
            raise HTTPException(status_code=400, detail=f"AuVeCo '{auveco}' is already {status}.")

        if status == "approved" and not req.force_reprocess:
            raise HTTPException(
                status_code=409,
                detail={
                    "error_type": "already_approved",
                    "message": f"AuVeCo '{auveco}' is already approved as '{row['phantom']}.png'. Confirmation required to reprocess.",
                    "phantom": row["phantom"]
                }
            )

        if status == "awaiting_review" and not req.force_reprocess:
            raise HTTPException(
                status_code=409,
                detail={
                    "error_type": "awaiting_review",
                    "message": f"AuVeCo '{auveco}' already has a render awaiting review. Confirmation required to reprocess."
                }
            )

        # Queue the single job
        preset_info = settings.QUALITY_PRESETS.get(req.preset.lower(), settings.QUALITY_PRESETS["medium"])
        model_name = preset_info["model"]
        quality_name = preset_info["quality"]

        new_attempt = row["attempt"] + 1 if status in ["rejected", "approved", "awaiting_review", "failed"] else row["attempt"]

        cursor.execute("""
        UPDATE conversions
        SET status = 'queued',
            attempt = ?,
            model = ?,
            quality = ?,
            error_message = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?;
        """, (new_attempt, model_name, quality_name, row["id"]))

    job_queue_manager.notify_listeners()
    return {"success": True, "auveco": auveco, "status": "queued", "preset": req.preset}

@router.get("/queue")
def get_queue_status():
    return job_queue_manager.get_queue_summary()

@router.post("/pause")
def pause_queue():
    job_queue_manager.pause_queue()
    return {"success": True, "status": "paused"}

@router.post("/resume")
def resume_queue():
    job_queue_manager.resume_queue()
    return {"success": True, "status": "running"}

@router.post("/cancel")
def cancel_queue():
    count = job_queue_manager.cancel_queued_jobs()
    return {"success": True, "cancelled_count": count}

@router.post("/retry")
def retry_failed_jobs(preset: Optional[str] = None):
    count = job_queue_manager.retry_failed_jobs(preset=preset)
    return {"success": True, "retried_count": count}
