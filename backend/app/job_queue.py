import os
import time
import queue
import threading
from typing import Dict, Any, List, Optional, Callable
from backend.app.config import settings
from backend.app.db import get_db
from backend.app.cad_converter import convert_image_to_cad

class JobQueueManager:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(JobQueueManager, cls).__new__(cls)
                cls._instance._init_queue()
            return cls._instance

    def _init_queue(self):
        self.is_paused = False
        self.worker_threads: List[threading.Thread] = []
        self.max_workers = settings.MAX_CONCURRENT_CONVERSIONS
        self.queue_lock = threading.Lock()
        self.listeners: List[Callable[[Dict[str, Any]], None]] = []
        self.start_time: Optional[float] = None
        self.session_total_jobs = 0
        self.session_completed_jobs = 0

        # Start background dispatch thread
        self.dispatch_thread = threading.Thread(target=self._dispatch_loop, daemon=True)
        self.dispatch_thread.start()

    def register_listener(self, callback: Callable[[Dict[str, Any]], None]):
        with self.queue_lock:
            self.listeners.append(callback)

    def unregister_listener(self, callback: Callable[[Dict[str, Any]], None]):
        with self.queue_lock:
            if callback in self.listeners:
                self.listeners.remove(callback)

    def notify_listeners(self):
        state = self.get_queue_summary()
        with self.queue_lock:
            active_listeners = list(self.listeners)
        for cb in active_listeners:
            try:
                cb(state)
            except Exception:
                pass

    def pause_queue(self):
        with self.queue_lock:
            self.is_paused = True
        self.notify_listeners()

    def resume_queue(self):
        with self.queue_lock:
            self.is_paused = False
        self.notify_listeners()

    def cancel_queued_jobs(self) -> int:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE conversions
            SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
            WHERE status = 'queued';
            """)
            cancelled_count = cursor.rowcount

        with self.queue_lock:
            self.session_total_jobs = max(0, self.session_total_jobs - cancelled_count)

        self.notify_listeners()
        return cancelled_count

    def retry_failed_jobs(self, preset: Optional[str] = None) -> int:
        with get_db() as conn:
            cursor = conn.cursor()
            if preset:
                cursor.execute("""
                UPDATE conversions
                SET status = 'queued', quality = ?, retry_count = 0, error_message = NULL, updated_at = CURRENT_TIMESTAMP
                WHERE status = 'failed';
                """, (preset,))
            else:
                cursor.execute("""
                UPDATE conversions
                SET status = 'queued', retry_count = 0, error_message = NULL, updated_at = CURRENT_TIMESTAMP
                WHERE status = 'failed';
                """)
            count = cursor.rowcount

        with self.queue_lock:
            if count > 0:
                self.session_total_jobs += count
                if not self.start_time:
                    self.start_time = time.time()

        self.notify_listeners()
        return count

    def get_queue_summary(self) -> Dict[str, Any]:
        with get_db() as conn:
            cursor = conn.cursor()

            stats_rows = cursor.execute("""
            SELECT status, COUNT(*) as cnt FROM conversions GROUP BY status;
            """).fetchall()
            status_counts = {r["status"]: r["cnt"] for r in stats_rows}

            total_jobs = sum(status_counts.values())
            queued = status_counts.get("queued", 0)
            processing = status_counts.get("processing", 0)
            awaiting_review = status_counts.get("awaiting_review", 0)
            approved = status_counts.get("approved", 0)
            rejected = status_counts.get("rejected", 0)
            reprocessing = status_counts.get("reprocessing", 0)
            failed = status_counts.get("failed", 0)
            cancelled = status_counts.get("cancelled", 0)
            eligible = status_counts.get("eligible", 0)

            # Active processing items list
            active_items = cursor.execute("""
            SELECT id, auveco, phantom, status, attempt, model, quality, updated_at
            FROM conversions WHERE status IN ('processing', 'reprocessing') ORDER BY updated_at DESC;
            """).fetchall()
            active_list = [dict(r) for r in active_items]

        remaining = queued + processing

        # Calculate session completion percentage
        with self.queue_lock:
            if remaining == 0:
                # No jobs queued or processing - batch is done or idle
                if self.session_completed_jobs > 0:
                    completion_pct = 100.0
                else:
                    completion_pct = 0.0
            elif self.session_total_jobs > 0:
                completion_pct = round((self.session_completed_jobs / self.session_total_jobs * 100), 1)
                if completion_pct > 100.0:
                    completion_pct = 100.0
            else:
                completion_pct = 0.0

            elapsed_seconds = round(time.time() - self.start_time, 1) if (self.start_time and remaining > 0) else 0.0
            
            # Estimate remaining time
            eta_seconds = 0.0
            if self.session_completed_jobs > 0 and elapsed_seconds > 0 and remaining > 0:
                avg_per_job = elapsed_seconds / self.session_completed_jobs
                eta_seconds = round(avg_per_job * remaining, 1)

            session_total = self.session_total_jobs
            session_completed = self.session_completed_jobs

        return {
            "is_paused": self.is_paused,
            "total_jobs": total_jobs,
            "session_total_jobs": session_total,
            "session_completed_jobs": session_completed,
            "queued": queued,
            "processing": processing,
            "awaiting_review": awaiting_review,
            "approved": approved,
            "rejected": rejected,
            "reprocessing": reprocessing,
            "failed": failed,
            "cancelled": cancelled,
            "eligible": eligible,
            "remaining": remaining,
            "completion_percentage": completion_pct,
            "elapsed_seconds": elapsed_seconds,
            "estimated_remaining_seconds": eta_seconds,
            "active_jobs": active_list
        }

    def batch_create_jobs(self, count: int, preset: str = "medium", selected_auvecos: Optional[List[str]] = None, force: bool = False) -> Dict[str, Any]:
        """Queues eligible conversion jobs up to requested count."""
        preset_info = settings.QUALITY_PRESETS.get(preset.lower(), settings.QUALITY_PRESETS["medium"])
        model_name = preset_info["model"]
        quality_name = preset_info["quality"]

        with get_db() as conn:
            cursor = conn.cursor()

            if selected_auvecos:
                placeholders = ",".join(["?"] * len(selected_auvecos))
                query = f"""
                SELECT * FROM conversions
                WHERE auveco IN ({placeholders}) AND status IN ('eligible', 'failed', 'rejected')
                LIMIT ?;
                """
                params = list(selected_auvecos) + [count]
                eligible_rows = cursor.execute(query, params).fetchall()
            else:
                eligible_rows = cursor.execute("""
                SELECT * FROM conversions
                WHERE status = 'eligible'
                ORDER BY excel_row ASC
                LIMIT ?;
                """, (count,)).fetchall()

            queued_ids = []
            for r in eligible_rows:
                cursor.execute("""
                UPDATE conversions
                SET status = 'queued', model = ?, quality = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?;
                """, (model_name, quality_name, r["id"]))
                queued_ids.append(r["id"])

        if queued_ids:
            with self.queue_lock:
                # Get current queued + processing count
                with get_db() as conn:
                    cursor = conn.cursor()
                    active_cnt = cursor.execute("SELECT COUNT(*) as cnt FROM conversions WHERE status IN ('queued', 'processing')").fetchone()["cnt"]

                if active_cnt == len(queued_ids):
                    # Start fresh session for new batch
                    self.start_time = time.time()
                    self.session_completed_jobs = 0
                    self.session_total_jobs = len(queued_ids)
                else:
                    # Append to active session
                    self.session_total_jobs += len(queued_ids)

            self.notify_listeners()

        return {
            "queued_count": len(queued_ids),
            "queued_ids": queued_ids,
            "preset": preset,
            "model": model_name,
            "quality": quality_name
        }

    def _dispatch_loop(self):
        while True:
            try:
                time.sleep(0.5)

                if self.is_paused:
                    continue

                # Clean dead worker threads
                self.worker_threads = [t for t in self.worker_threads if t.is_alive()]

                if len(self.worker_threads) >= self.max_workers:
                    continue

                # Fetch next queued job
                with get_db() as conn:
                    cursor = conn.cursor()
                    job_row = cursor.execute("""
                    SELECT * FROM conversions WHERE status = 'queued' ORDER BY updated_at ASC LIMIT 1;
                    """).fetchone()

                    if not job_row:
                        continue

                    job_id = job_row["id"]
                    cursor.execute("""
                    UPDATE conversions SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?;
                    """, (job_id,))

                # Notify status change
                self.notify_listeners()

                # Launch worker thread
                t = threading.Thread(target=self._process_single_job, args=(job_id,), daemon=True)
                t.start()
                self.worker_threads.append(t)

            except Exception:
                pass

    def _process_single_job(self, job_id: int):
        try:
            with get_db() as conn:
                cursor = conn.cursor()
                job = cursor.execute("SELECT * FROM conversions WHERE id = ?", (job_id,)).fetchone()

            if not job:
                return

            auveco = job["auveco"]
            phantom = job["phantom"]
            source_path = job["source_path"]
            attempt = job["attempt"]
            model = job["model"] or "gpt-image-2"
            quality = job["quality"] or "medium"
            review_filename = f"{auveco}_review.png"
            review_path = os.path.join(settings.CAD_REVIEW_DIRECTORY, review_filename)

            # Perform conversion
            result = convert_image_to_cad(
                input_image_path=source_path,
                output_image_path=review_path,
                auveco=auveco,
                phantom=phantom,
                job_id=job_id,
                version=attempt,
                model=model,
                quality=quality
            )

            # Update DB on success
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                UPDATE conversions
                SET status = 'awaiting_review',
                    review_path = ?,
                    error_message = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?;
                """, (review_path, job_id))

                # Log version history
                cursor.execute("""
                INSERT INTO conversion_history (conversion_id, auveco, phantom, attempt, model, quality, review_path, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'awaiting_review');
                """, (job_id, auveco, phantom, attempt, model, quality, review_path))

            with self.queue_lock:
                self.session_completed_jobs += 1

        except Exception as err:
            error_str = str(err)
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                UPDATE conversions
                SET status = 'failed',
                    error_message = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?;
                """, (error_str, job_id))

                cursor.execute("""
                INSERT INTO conversion_history (conversion_id, auveco, phantom, attempt, model, quality, status, error_message)
                VALUES (?, ?, ?, ?, ?, ?, 'failed', ?);
                """, (job_id, job["auveco"], job["phantom"], job["attempt"], job["model"], job["quality"], error_str))

            with self.queue_lock:
                self.session_completed_jobs += 1

        finally:
            self.notify_listeners()

job_queue_manager = JobQueueManager()
