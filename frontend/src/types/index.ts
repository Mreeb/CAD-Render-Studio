export type JobStatus =
  | 'eligible'
  | 'queued'
  | 'processing'
  | 'awaiting_review'
  | 'approved'
  | 'rejected'
  | 'reprocessing'
  | 'failed'
  | 'cancelled'
  | 'skipped'
  | 'anomaly';

export interface ConversionItem {
  id: number;
  auveco: string;
  phantom: string;
  source_filename?: string;
  source_path?: string;
  review_path?: string;
  approved_path?: string;
  status: JobStatus;
  attempt: number;
  model: string;
  quality: string;
  excel_row?: number;
  error_message?: string;
  retry_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface ConversionHistoryItem {
  id: number;
  conversion_id: number;
  auveco: string;
  phantom: string;
  attempt: number;
  model: string;
  quality: string;
  review_path?: string;
  status: JobStatus;
  error_message?: string;
  created_at?: string;
}

export interface AnalyticsSummary {
  total_images_in_data_dir: number;
  total_valid_excel_mappings: number;
  total_eligible_source_images: number;
  total_approved: number;
  total_awaiting_review: number;
  total_processing: number;
  total_queued: number;
  total_remaining: number;
  total_failed: number;
  total_rejected: number;
  total_reprocessing: number;

  auveco_missing_phantom_count: number;
  phantom_missing_auveco_count: number;
  both_missing_count: number;
  missing_source_image_count: number;
  duplicate_auveco_count: number;
  duplicate_phantom_count: number;
  one_auveco_multi_phantom_count: number;
  one_phantom_multi_auveco_count: number;
  invalid_source_image_count: number;
  unmapped_source_files_count: number;

  completion_percentage: number;
  approval_rate: number;
  rejection_rate: number;
  last_reconciled_at: string;
}

export interface BatchConfirmationPreview {
  requested_count: number;
  eligible_count: number;
  will_queue_count: number;
  completed_or_pending_count: number;
  skipped_anomalies_count: number;
  estimated_api_calls: number;
  estimated_cost_usd_approx: number;
  requires_confirmation: boolean;
  confirmation_message: string;
  warning: string;
}

export interface QueueSummary {
  is_paused: boolean;
  total_jobs: number;
  session_total_jobs?: number;
  session_completed_jobs?: number;
  queued: number;
  processing: number;
  awaiting_review: number;
  approved: number;
  rejected: number;
  reprocessing: number;
  failed: number;
  cancelled: number;
  eligible: number;
  remaining: number;
  completion_percentage: number;
  elapsed_seconds: number;
  estimated_remaining_seconds: number;
  active_jobs: ConversionItem[];
}

export interface DownloaderState {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'stopped' | 'failed';
  total_scanned: number;
  eligible_found: number;
  unique_serials: number;
  already_present: number;
  duplicates_skipped: number;
  downloaded_count: number;
  not_found_count: number;
  failed_count: number;
  current_serial: string;
  max_downloads: number;
  started_at?: string;
  updated_at?: string;
}

export interface AnomalyItem {
  id: number;
  category: string;
  excel_row?: number;
  auveco?: string;
  phantom?: string;
  filename?: string;
  details?: string;
  created_at?: string;
}

export interface SystemHealth {
  status: string;
  openai_api_key_configured: boolean;
  excel_file_exists: boolean;
  excel_file_path: string;
  data_dir_path: string;
  cad_review_dir_path: string;
  cad_dir_path: string;
  database_file_path: string;
  max_concurrent_conversions: number;
}
