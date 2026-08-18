import pytest
from backend.app.db import init_db, get_db
from backend.app.job_queue import job_queue_manager

def test_job_queue_summary_and_pause_resume():
    init_db()
    summary = job_queue_manager.get_queue_summary()
    assert "queued" in summary
    assert "processing" in summary
    assert "approved" in summary

    job_queue_manager.pause_queue()
    assert job_queue_manager.is_paused is True

    job_queue_manager.resume_queue()
    assert job_queue_manager.is_paused is False
