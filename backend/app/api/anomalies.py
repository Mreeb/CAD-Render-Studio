from fastapi import APIRouter, Query
from typing import List, Optional
from backend.app.db import get_db
from backend.app.models import AnomalyItem

router = APIRouter(prefix="/anomalies", tags=["Anomalies"])

@router.get("/list", response_model=List[AnomalyItem])
def get_anomalies_list(category: Optional[str] = None):
    with get_db() as conn:
        cursor = conn.cursor()
        if category:
            rows = cursor.execute("""
            SELECT * FROM anomalies WHERE category = ? ORDER BY id ASC;
            """, (category,)).fetchall()
        else:
            rows = cursor.execute("SELECT * FROM anomalies ORDER BY id ASC;").fetchall()
        return [dict(r) for r in rows]

@router.get("/categories")
def get_anomaly_categories():
    with get_db() as conn:
        cursor = conn.cursor()
        rows = cursor.execute("""
        SELECT category, COUNT(*) as cnt FROM anomalies GROUP BY category;
        """).fetchall()
        return {r["category"]: r["cnt"] for r in rows}
