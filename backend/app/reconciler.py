import os
import time
from PIL import Image
from typing import Dict, Any, List
from backend.app.config import settings
from backend.app.db import get_db, init_db
from backend.app.excel_parser import parse_excel_and_analyze, validate_image_file

def reconcile_database_and_filesystem() -> Dict[str, Any]:
    """
    Reconciles SQLite database records against:
    - Latest Excel workbook
    - DATA_DIRECTORY (source images)
    - CAD_REVIEW_DIRECTORY (pending renders)
    - CAD_DIRECTORY (approved CAD renders)
    Resets interrupted 'processing' jobs to 'queued'.
    Populates anomalies table.
    """
    init_db()
    analysis = parse_excel_and_analyze()

    approved_dir = settings.CAD_DIRECTORY
    review_dir = settings.CAD_REVIEW_DIRECTORY

    scanned_count = analysis.total_rows_scanned
    valid_mappings = analysis.valid_mappings
    anomalies = analysis.anomalies

    stats = {
        "rows_scanned": scanned_count,
        "valid_mappings": len(valid_mappings),
        "anomalies_logged": len(anomalies),
        "approved_found": 0,
        "awaiting_review_found": 0,
        "resumable_jobs_reset": 0,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }

    with get_db() as conn:
        cursor = conn.cursor()

        # Update anomalies table
        cursor.execute("DELETE FROM anomalies;")
        for a in anomalies:
            cursor.execute("""
            INSERT INTO anomalies (category, excel_row, auveco, phantom, filename, details)
            VALUES (?, ?, ?, ?, ?, ?);
            """, (
                a.get("category"),
                a.get("excel_row"),
                a.get("auveco"),
                a.get("phantom"),
                a.get("filename"),
                a.get("details")
            ))

        # Reset any leftover 'processing' jobs to 'queued' so they resume safely
        cursor.execute("""
        UPDATE conversions
        SET status = 'queued', updated_at = CURRENT_TIMESTAMP
        WHERE status = 'processing';
        """)
        stats["resumable_jobs_reset"] = cursor.rowcount

        # Sync valid Excel mappings into conversions table
        for item in valid_mappings:
            auveco = item["auveco"]
            phantom = item["phantom"]
            source_filename = item["source_filename"]
            source_path = item["source_path"]
            excel_row = item["excel_row"]

            # Check filesystem for approved CAD render (<PHANTOM>.png)
            expected_approved_filename = f"{phantom}.png"
            expected_approved_path = os.path.join(approved_dir, expected_approved_filename)
            is_approved = validate_image_file(expected_approved_path)

            # Check filesystem for pending review CAD render
            expected_review_filename = f"{auveco}_review.png"
            expected_review_path = os.path.join(review_dir, expected_review_filename)
            is_pending_review = validate_image_file(expected_review_path)

            # Query existing record
            row = cursor.execute("SELECT * FROM conversions WHERE auveco = ? AND phantom = ?", (auveco, phantom)).fetchone()

            if is_approved:
                stats["approved_found"] += 1
                new_status = "approved"
            elif is_pending_review:
                stats["awaiting_review_found"] += 1
                new_status = "awaiting_review"
            else:
                if row:
                    # Keep existing non-final status if set (e.g. queued, rejected, failed)
                    existing_status = row["status"]
                    if existing_status in ["queued", "processing", "rejected", "failed", "reprocessing"]:
                        new_status = existing_status
                    else:
                        new_status = "eligible"
                else:
                    new_status = "eligible"

            if row:
                cursor.execute("""
                UPDATE conversions
                SET source_filename = ?,
                    source_path = ?,
                    approved_path = CASE WHEN ? THEN ? ELSE approved_path END,
                    review_path = CASE WHEN ? THEN ? ELSE review_path END,
                    status = ?,
                    excel_row = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?;
                """, (
                    source_filename,
                    source_path,
                    1 if is_approved else 0, expected_approved_path if is_approved else None,
                    1 if is_pending_review else 0, expected_review_path if is_pending_review else None,
                    new_status,
                    excel_row,
                    row["id"]
                ))
            else:
                cursor.execute("""
                INSERT INTO conversions (
                    auveco, phantom, source_filename, source_path,
                    review_path, approved_path, status, excel_row
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    auveco,
                    phantom,
                    source_filename,
                    source_path,
                    expected_review_path if is_pending_review else None,
                    expected_approved_path if is_approved else None,
                    new_status,
                    excel_row
                ))

    return stats
