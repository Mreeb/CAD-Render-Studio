import {
  AnalyticsSummary,
  BatchConfirmationPreview,
  QueueSummary,
  DownloaderState,
  AnomalyItem,
  SystemHealth,
  ConversionItem,
  ConversionHistoryItem
} from '../types';

const API_BASE = '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let errData;
    try {
      errData = await res.json();
    } catch {
      errData = { detail: res.statusText };
    }
    throw new Error(typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail));
  }

  return res.json();
}

export const api = {
  // Health
  getHealth: () => request<SystemHealth>('/health'),
  getPresets: () => request<Record<string, any>>('/presets'),
  saveApiKey: (apiKey: string) =>
    request<{ success: boolean; message: string }>('/settings/api-key', {
      method: 'POST',
      body: JSON.stringify({ api_key: apiKey }),
    }),
  testApiKey: (apiKey?: string) =>
    request<{ success: boolean; message: string }>('/settings/api-key/test', {
      method: 'POST',
      body: apiKey ? JSON.stringify({ api_key: apiKey }) : undefined,
    }),
  deleteApiKey: () =>
    request<{ success: boolean; message: string }>('/settings/api-key', {
      method: 'DELETE',
    }),

  // Analytics & Reconciliation
  getAnalytics: () => request<AnalyticsSummary>('/analytics/summary'),
  reconcile: () => request<{ success: boolean; stats: any }>('/analytics/reconcile', { method: 'POST' }),

  // Jobs & Queue
  previewBatch: (count: number, preset: string = 'medium', selectedAuvecos?: string[]) =>
    request<BatchConfirmationPreview>('/jobs/batch/preview', {
      method: 'POST',
      body: JSON.stringify({ count, preset, selected_auveco_numbers: selectedAuvecos }),
    }),

  createBatch: (count: number, preset: string = 'medium', forceReprocess: boolean = false, selectedAuvecos?: string[]) =>
    request<{ success: boolean; details: any }>('/jobs/batch/create', {
      method: 'POST',
      body: JSON.stringify({
        count,
        preset,
        force_reprocess: forceReprocess,
        selected_auveco_numbers: selectedAuvecos
      }),
    }),

  createSingleJob: (auveco: string, preset: string = 'medium', forceReprocess: boolean = false) =>
    request<{ success: boolean; auveco: string; status: string }>('/jobs/single', {
      method: 'POST',
      body: JSON.stringify({ auveco, preset, force_reprocess: forceReprocess }),
    }),

  getQueueSummary: () => request<QueueSummary>('/jobs/queue'),
  pauseQueue: () => request<{ success: boolean }>('/jobs/pause', { method: 'POST' }),
  resumeQueue: () => request<{ success: boolean }>('/jobs/resume', { method: 'POST' }),
  cancelQueue: () => request<{ success: boolean; cancelled_count: number }>('/jobs/cancel', { method: 'POST' }),
  retryFailed: (preset?: string) => request<{ success: boolean; retried_count: number }>(`/jobs/retry${preset ? `?preset=${preset}` : ''}`, { method: 'POST' }),

  // Review
  getReviewItems: (status: string = 'awaiting_review') => request<ConversionItem[]>(`/review/list?status=${status}`),
  getHistory: (conversionId: number) => request<ConversionHistoryItem[]>(`/review/history/${conversionId}`),
  processReviewAction: (ids: number[], action: 'approve' | 'reject' | 'reprocess', preset?: string) =>
    request<{ success: boolean; processed_ids: number[]; errors: string[] }>('/review/action', {
      method: 'POST',
      body: JSON.stringify({ ids, action, preset }),
    }),

  // Downloader
  getDownloaderStatus: () => request<DownloaderState>('/downloader/status'),
  startDownloader: (maxDownloads: number = 100, delay: number = 0.5) =>
    request<{ success: boolean; state: DownloaderState }>('/downloader/start', {
      method: 'POST',
      body: JSON.stringify({ max_downloads: maxDownloads, delay }),
    }),
  stopDownloader: () => request<{ success: boolean; state: DownloaderState }>('/downloader/stop', { method: 'POST' }),

  // Anomalies
  getAnomalies: (category?: string) => request<AnomalyItem[]>(`/anomalies/list${category ? `?category=${category}` : ''}`),
  getAnomalyCategories: () => request<Record<string, number>>('/anomalies/categories'),
};
