import asyncio
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from backend.app.models import DownloaderStartRequest, DownloaderStatusResponse
from backend.app.downloader import downloader_service

router = APIRouter(prefix="/downloader", tags=["AuVeCo Downloader"])

@router.get("/status", response_model=DownloaderStatusResponse)
def get_downloader_status():
    return downloader_service.get_state()

@router.post("/start")
def start_downloader(req: DownloaderStartRequest):
    try:
        res = downloader_service.start_download(
            max_downloads=req.max_downloads,
            delay=req.delay,
            timeout=req.timeout
        )
        return {"success": True, "state": res}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/stop")
def stop_downloader():
    res = downloader_service.stop_download()
    return {"success": True, "state": res}

@router.get("/stream")
async def stream_downloader_progress():
    async def event_generator():
        q = asyncio.Queue()

        def callback(data):
            try:
                asyncio.run_coroutine_threadsafe(q.put(data), asyncio.get_event_loop())
            except Exception:
                pass

        downloader_service.on_progress_callback = callback
        # Send initial state
        yield f"data: {json.dumps(downloader_service.get_state())}\n\n"

        try:
            while True:
                data = await q.get()
                yield f"data: {json.dumps(data)}\n\n"
        except asyncio.CancelledError:
            downloader_service.on_progress_callback = None

    return StreamingResponse(event_generator(), media_type="text/event-stream")
