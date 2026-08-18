import os
import sys
import json
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from backend.app.config import settings
from backend.app.reconciler import reconcile_database_and_filesystem
from backend.app.job_queue import job_queue_manager

from backend.app.api.analytics import router as analytics_router
from backend.app.api.jobs import router as jobs_router
from backend.app.api.review import router as review_router
from backend.app.api.downloader_api import router as downloader_router
from backend.app.api.anomalies import router as anomalies_router
from backend.app.api.static_media import router as static_media_router
from backend.app.api.health import router as health_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup reconciliation
    reconcile_database_and_filesystem()
    yield

app = FastAPI(
    title="CAD Product Render Manager API",
    description="Backend API for AI-generated CAD product render management & review.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers under /api prefix
app.include_router(health_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(jobs_router, prefix="/api")
app.include_router(review_router, prefix="/api")
app.include_router(downloader_router, prefix="/api")
app.include_router(anomalies_router, prefix="/api")
app.include_router(static_media_router, prefix="/api")

@app.get("/api/stream/queue")
async def stream_queue_progress():
    """SSE endpoint for live queue progress updates."""
    async def event_generator():
        q = asyncio.Queue()

        def callback(data):
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.run_coroutine_threadsafe(q.put(data), loop)
            except Exception:
                pass

        job_queue_manager.register_listener(callback)
        
        # Send initial summary state immediately
        yield f"data: {json.dumps(job_queue_manager.get_queue_summary())}\n\n"

        try:
            while True:
                data = await q.get()
                yield f"data: {json.dumps(data)}\n\n"
        except asyncio.CancelledError:
            job_queue_manager.unregister_listener(callback)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# Serve React Static Production Frontend if dist exists
def get_base_dir():
    if getattr(sys, 'frozen', False):
        return sys._MEIPASS
    return os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

base_dir = get_base_dir()
frontend_dist = os.path.join(base_dir, "frontend", "dist")

if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="static_assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith("api/"):
            return None
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
