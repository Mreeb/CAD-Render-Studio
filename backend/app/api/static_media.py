import os
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from backend.app.config import settings

router = APIRouter(prefix="/media", tags=["Media Serving"])

def secure_file_response(directory: str, filename: str) -> FileResponse:
    base = Path(directory).resolve()
    target = (base / filename).resolve()
    
    # Path traversal check
    if not str(target).startswith(str(base)):
        raise HTTPException(status_code=403, detail="Access denied: Path traversal detected.")

    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail=f"File '{filename}' not found.")

    return FileResponse(str(target))

@router.get("/source/{filename}")
def serve_source_image(filename: str):
    return secure_file_response(settings.DATA_DIRECTORY, filename)

@router.get("/review/{filename}")
def serve_review_image(filename: str):
    return secure_file_response(settings.CAD_REVIEW_DIRECTORY, filename)

@router.get("/approved/{filename}")
def serve_approved_image(filename: str):
    return secure_file_response(settings.CAD_DIRECTORY, filename)
