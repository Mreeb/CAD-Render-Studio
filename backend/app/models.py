from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class ConversionItem(BaseModel):
    id: int
    auveco: str
    phantom: str
    source_filename: Optional[str] = None
    source_path: Optional[str] = None
    review_path: Optional[str] = None
    approved_path: Optional[str] = None
    status: str
    attempt: int = 1
    model: str = "gpt-image-2"
    quality: str = "medium"
    excel_row: Optional[int] = None
    error_message: Optional[str] = None
    retry_count: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class ConversionHistoryItem(BaseModel):
    id: int
    conversion_id: int
    auveco: str
    phantom: str
    attempt: int
    model: str
    quality: str
    review_path: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    created_at: Optional[str] = None

class BatchCreateRequest(BaseModel):
    count: int = Field(..., gt=0, description="Requested number of eligible images to process")
    preset: str = Field("medium", description="Quality preset: 'medium' or 'high'")
    selected_auveco_numbers: Optional[List[str]] = Field(None, description="Optional explicit selection")
    force_reprocess: bool = Field(False, description="Whether to reprocess items requiring confirmation")

class BatchConfirmationPreview(BaseModel):
    requested_count: int
    eligible_count: int
    will_queue_count: int
    completed_or_pending_count: int
    skipped_anomalies_count: int
    estimated_api_calls: int
    estimated_cost_usd_approx: float
    requires_confirmation: bool
    confirmation_message: str
    warning: str

class SingleConversionRequest(BaseModel):
    auveco: str
    preset: str = Field("medium", description="Quality preset: 'medium' or 'high'")
    force_reprocess: bool = False

class ReviewActionRequest(BaseModel):
    ids: List[int]
    action: str = Field(..., description="'approve', 'reject', or 'reprocess'")
    preset: Optional[str] = Field(None, description="Optional new quality preset if reprocessing")

class DownloaderStartRequest(BaseModel):
    max_downloads: int = Field(100, ge=1, le=5000)
    delay: float = 0.5
    timeout: int = 25

class DownloaderStatusResponse(BaseModel):
    status: str
    total_scanned: int
    eligible_found: int
    unique_serials: int
    already_present: int
    duplicates_skipped: int
    downloaded_count: int
    not_found_count: int
    failed_count: int
    current_serial: str
    max_downloads: int

class AnomalyItem(BaseModel):
    id: int
    category: str
    excel_row: Optional[int] = None
    auveco: Optional[str] = None
    phantom: Optional[str] = None
    filename: Optional[str] = None
    details: Optional[str] = None
    created_at: Optional[str] = None

class AnalyticsSummary(BaseModel):
    total_images_in_data_dir: int
    total_valid_excel_mappings: int
    total_eligible_source_images: int
    total_approved: int
    total_awaiting_review: int
    total_processing: int
    total_queued: int
    total_remaining: int
    total_failed: int
    total_rejected: int
    total_reprocessing: int
    
    # Anomaly metric breakdowns
    auveco_missing_phantom_count: int
    phantom_missing_auveco_count: int
    both_missing_count: int
    missing_source_image_count: int
    duplicate_auveco_count: int
    duplicate_phantom_count: int
    one_auveco_multi_phantom_count: int
    one_phantom_multi_auveco_count: int
    invalid_source_image_count: int
    unmapped_source_files_count: int
    
    completion_percentage: float
    approval_rate: float
    rejection_rate: float
    
    last_reconciled_at: str

class SystemHealthResponse(BaseModel):
    status: str
    openai_api_key_configured: bool
    excel_file_exists: bool
    excel_file_path: str
    data_dir_path: str
    cad_review_dir_path: str
    cad_dir_path: str
    database_file_path: str
    max_concurrent_conversions: int
