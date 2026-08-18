import os
from pathlib import Path
from typing import Dict, Optional
from fastapi import APIRouter, HTTPException
from openai import OpenAI
from backend.app.config import settings, BASE_DIR
from backend.app.models import SystemHealthResponse

router = APIRouter(tags=["Health & Status"])

@router.get("/health", response_model=SystemHealthResponse)
def get_health_status():
    has_api_key = bool(settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip())
    excel_exists = os.path.exists(settings.EXCEL_FILE)

    return SystemHealthResponse(
        status="ok",
        openai_api_key_configured=has_api_key,
        excel_file_exists=excel_exists,
        excel_file_path=settings.EXCEL_FILE,
        data_dir_path=settings.DATA_DIRECTORY,
        cad_review_dir_path=settings.CAD_REVIEW_DIRECTORY,
        cad_dir_path=settings.CAD_DIRECTORY,
        database_file_path=settings.DATABASE_FILE,
        max_concurrent_conversions=settings.MAX_CONCURRENT_CONVERSIONS
    )

@router.get("/presets")
def get_quality_presets():
    return settings.QUALITY_PRESETS

@router.post("/settings/api-key")
def update_api_key(payload: Dict[str, str]):
    new_key = payload.get("api_key", "").strip()
    if not new_key:
        raise HTTPException(status_code=400, detail="API Key cannot be empty.")
    
    settings.OPENAI_API_KEY = new_key
    
    # Save permanently to .env file
    env_path = BASE_DIR / ".env"
    env_lines = []
    key_found = False
    
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("OPENAI_API_KEY="):
                    env_lines.append(f"OPENAI_API_KEY={new_key}\n")
                    key_found = True
                else:
                    env_lines.append(line)
    
    if not key_found:
        env_lines.append(f"OPENAI_API_KEY={new_key}\n")
        
    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(env_lines)
        
    return {"success": True, "message": "API key saved permanently."}

@router.post("/settings/api-key/test")
def test_api_key(payload: Optional[Dict[str, str]] = None):
    key_to_test = (payload.get("api_key", "").strip() if payload else "") or settings.OPENAI_API_KEY
    if not key_to_test:
        raise HTTPException(status_code=400, detail="No API Key provided or configured to test.")

    try:
        client = OpenAI(api_key=key_to_test)
        # Lightweight test query to verify authentication
        client.models.list()
        return {"success": True, "message": "Connection successful! OpenAI API key is valid and active."}
    except Exception as e:
        err_msg = str(e)
        if "Incorrect API key" in err_msg or "invalid_api_key" in err_msg:
            err_msg = "Invalid API key provided. Please check the key format."
        raise HTTPException(status_code=400, detail=f"OpenAI API test failed: {err_msg}")

@router.delete("/settings/api-key")
def delete_api_key():
    settings.OPENAI_API_KEY = ""
    
    env_path = BASE_DIR / ".env"
    if os.path.exists(env_path):
        env_lines = []
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                if not line.startswith("OPENAI_API_KEY="):
                    env_lines.append(line)
        with open(env_path, "w", encoding="utf-8") as f:
            f.writelines(env_lines)
            
    return {"success": True, "message": "API key deleted successfully."}
