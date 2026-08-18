import os
import shutil
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from backend.app.config import settings
from backend.app.db import get_db
from backend.app.models import ReviewActionRequest
from backend.app.excel_parser import validate_image_file
from backend.app.job_queue import job_queue_manager

router = APIRouter(prefix="/review", tags=["Review & Approval"])

@router.get("/list")
def get_review_items(status: str = "awaiting_review"):
    with get_db() as conn:
        cursor = conn.cursor()
        rows = cursor.execute("""
        SELECT * FROM conversions WHERE status = ? ORDER BY updated_at DESC;
        """, (status,)).fetchall()
        return [dict(r) for r in rows]

@router.get("/history/{conversion_id}")
def get_conversion_history(conversion_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        rows = cursor.execute("""
        SELECT * FROM conversion_history WHERE conversion_id = ? ORDER BY attempt DESC;
        """, (conversion_id,)).fetchall()
        return [dict(r) for r in rows]

@router.post("/action")
def process_review_action(req: ReviewActionRequest):
    if not req.ids:
        raise HTTPException(status_code=400, detail="No item IDs provided.")

    action = req.action.lower()
    if action not in ["approve", "reject", "reprocess"]:
        raise HTTPException(status_code=400, detail="Action must be 'approve', 'reject', or 'reprocess'.")

    processed = []
    errors = []

    with get_db() as conn:
        cursor = conn.cursor()

        for item_id in req.ids:
            row = cursor.execute("SELECT * FROM conversions WHERE id = ?", (item_id,)).fetchone()
            if not row:
                errors.append(f"Item ID {item_id} not found.")
                continue

            auveco = row["auveco"]
            phantom = row["phantom"]
            review_path = row["review_path"]

            if action == "approve":
                if not review_path or not validate_image_file(review_path):
                    errors.append(f"Item '{auveco}' review image is missing or invalid.")
                    continue

                approved_filename = f"{phantom}.png"
                approved_path = os.path.join(settings.CAD_DIRECTORY, approved_filename)

                try:
                    os.makedirs(settings.CAD_DIRECTORY, exist_ok=True)
                    shutil.copy2(review_path, approved_path)

                    cursor.execute("""
                    UPDATE conversions
                    SET status = 'approved',
                        approved_path = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?;
                    """, (approved_path, item_id))

                    cursor.execute("""
                    INSERT INTO conversion_history (conversion_id, auveco, phantom, attempt, model, quality, review_path, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'approved');
                    """, (item_id, auveco, phantom, row["attempt"], row["model"], row["quality"], review_path))

                    processed.append(item_id)

                except Exception as e:
                    errors.append(f"Could not copy approved image for '{auveco}': {str(e)}")

            elif action == "reject":
                cursor.execute("""
                UPDATE conversions
                SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
                WHERE id = ?;
                """, (item_id,))

                cursor.execute("""
                INSERT INTO conversion_history (conversion_id, auveco, phantom, attempt, model, quality, review_path, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'rejected');
                """, (item_id, auveco, phantom, row["attempt"], row["model"], row["quality"], review_path))

                processed.append(item_id)

            elif action == "reprocess":
                preset_str = req.preset or row["quality"] or "medium"
                preset_info = settings.QUALITY_PRESETS.get(preset_str.lower(), settings.QUALITY_PRESETS["medium"])

                cursor.execute("""
                UPDATE conversions
                SET status = 'queued',
                    attempt = attempt + 1,
                    model = ?,
                    quality = ?,
                    error_message = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?;
                """, (preset_info["model"], preset_info["quality"], item_id))

                processed.append(item_id)

    job_queue_manager.notify_listeners()

    return {
        "success": True,
        "action": action,
        "processed_ids": processed,
        "errors": errors
    }
