import React, { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  XCircle,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Layers,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { QueueSummary } from '../types';
import { api } from '../services/api';
import { ProgressRing } from '../components/ProgressRing';

interface QueuePageProps {
  showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
}

export const QueuePage: React.FC<QueuePageProps> = ({ showToast }) => {
  const [queueData, setQueueData] = useState<QueueSummary | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchQueueSummary = async () => {
    try {
      const data = await api.getQueueSummary();
      setQueueData(data);
    } catch (err) {
      console.error('Failed fetching queue summary:', err);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchQueueSummary();

    // SSE Subscription
    const eventSource = new EventSource('/api/stream/queue');

    eventSource.onmessage = (event) => {
      try {
        const data: QueueSummary = JSON.parse(event.data);
        setQueueData(data);
      } catch (err) {
        console.error('Failed to parse SSE event:', err);
      }
    };

    // Fallback polling interval every 3 seconds
    const interval = setInterval(fetchQueueSummary, 3000);

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await api.getQueueSummary();
      setQueueData(data);
      showToast('info', 'Queue Refreshed', 'Live queue status updated.');
    } catch (e: any) {
      showToast('error', 'Refresh Failed', e.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePause = async () => {
    try {
      await api.pauseQueue();
      showToast('info', 'Queue Paused', 'New job dispatching paused.');
    } catch (e: any) {
      showToast('error', 'Error Pausing Queue', e.message);
    }
  };

  const handleResume = async () => {
    try {
      await api.resumeQueue();
      showToast('success', 'Queue Resumed', 'Job dispatching resumed.');
    } catch (e: any) {
      showToast('error', 'Error Resuming Queue', e.message);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel all queued jobs?')) return;
    try {
      const res = await api.cancelQueue();
      showToast('warning', 'Jobs Cancelled', `Cancelled ${res.cancelled_count} queued jobs.`);
    } catch (e: any) {
      showToast('error', 'Error Cancelling Jobs', e.message);
    }
  };

  const handleRetry = async () => {
    try {
      const res = await api.retryFailed();
      showToast('success', 'Retrying Failed Jobs', `Re-queued ${res.retried_count} failed jobs.`);
    } catch (e: any) {
      showToast('error', 'Error Retrying Jobs', e.message);
    }
  };

  if (!queueData) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading live queue stream...</div>;
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}m ${s}s`;
  };

  // Helper for accurate status badge text and style
  const getStatusBadge = () => {
    if (queueData.is_paused) {
      return { label: 'Dispatch Paused', class: 'badge-awaiting_review' };
    }
    if (queueData.processing > 0) {
      return { label: `Processing Active (${queueData.processing} Active)`, class: 'badge-processing' };
    }
    if (queueData.queued > 0) {
      return { label: `Dispatch Ready (${queueData.queued} Queued)`, class: 'badge-queued' };
    }
    return { label: 'Queue Idle', class: 'badge-eligible' };
  };

  const getEtaText = () => {
    if (queueData.remaining === 0) {
      return (queueData.session_completed_jobs || 0) > 0 ? 'Complete' : 'Idle';
    }
    if (queueData.estimated_remaining_seconds > 0) {
      return formatTime(queueData.estimated_remaining_seconds);
    }
    return 'Calculating...';
  };

  const badgeInfo = getStatusBadge();

  return (
    <div className="page-container">
      {/* Top Controls & Status Header */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '18px', color: 'var(--text-primary)', margin: 0, fontWeight: 600 }}>Live Queue Dashboard</h2>
              <span className={`badge ${badgeInfo.class}`}>
                {badgeInfo.label}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Real-time Server-Sent Events (SSE) tracking active CAD reconstructions.
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="btn btn-secondary"
              style={{ padding: '8px 14px' }}
              title="Force refresh queue state"
            >
              <RefreshCw size={15} className={isRefreshing ? 'spin' : ''} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            {queueData.is_paused ? (
              <button onClick={handleResume} className="btn btn-success" style={{ padding: '8px 14px' }}>
                <Play size={15} />
                <span>Resume Dispatch</span>
              </button>
            ) : (
              <button onClick={handlePause} className="btn btn-warning" style={{ padding: '8px 14px' }}>
                <Pause size={15} />
                <span>Pause Dispatch</span>
              </button>
            )}

            <button onClick={handleCancel} disabled={queueData.queued === 0} className="btn btn-secondary" style={{ padding: '8px 14px' }}>
              <XCircle size={15} color="var(--accent-danger)" />
              <span>Cancel Queued ({queueData.queued})</span>
            </button>

            <button onClick={handleRetry} disabled={queueData.failed === 0} className="btn btn-secondary" style={{ padding: '8px 14px' }}>
              <RotateCcw size={15} color="var(--accent-primary)" />
              <span>Retry Failed ({queueData.failed})</span>
            </button>
          </div>
        </div>

        {/* Progress Bar & Ring Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '24px', marginTop: '20px', paddingTop: '18px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ProgressRing percentage={queueData.completion_percentage} size={120} strokeWidth={10} color="var(--accent-primary)" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Overall Progress ({queueData.completion_percentage}%)</span>
              <span style={{ color: 'var(--text-muted)' }}>
                {queueData.remaining === 0
                  ? (queueData.session_completed_jobs || 0) > 0
                    ? `Batch Complete (${queueData.session_completed_jobs} converted)`
                    : 'Queue Idle'
                  : `${queueData.remaining} remaining of ${queueData.session_total_jobs || queueData.total_jobs} in batch`}
              </span>
            </div>

            <div className="progress-bar-bg" style={{ height: '10px', marginBottom: '14px' }}>
              <div className="progress-bar-fill" style={{ width: `${queueData.completion_percentage}%` }} />
            </div>

            <div style={{ display: 'flex', gap: '24px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <div><Clock size={13} style={{ display: 'inline', marginRight: '4px' }} /> Elapsed: <strong style={{ color: 'var(--text-primary)' }}>{formatTime(queueData.elapsed_seconds)}</strong></div>
              <div><Clock size={13} style={{ display: 'inline', marginRight: '4px' }} /> ETA: <strong style={{ color: 'var(--text-primary)' }}>{getEtaText()}</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Stats Counter Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Queued</div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>{queueData.queued}</div>
        </div>
        <div className="glass-panel" style={{ padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Processing</div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#4F7CFF' }}>{queueData.processing}</div>
        </div>
        <div className="glass-panel" style={{ padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Awaiting Review</div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#D6A13B' }}>{queueData.awaiting_review}</div>
        </div>
        <div className="glass-panel" style={{ padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Approved</div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#2FBF8F' }}>{queueData.approved}</div>
        </div>
        <div className="glass-panel" style={{ padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Rejected</div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#E05252' }}>{queueData.rejected}</div>
        </div>
        <div className="glass-panel" style={{ padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Failed</div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#E05252' }}>{queueData.failed}</div>
        </div>
      </div>

      {/* Currently Active Processing Jobs */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '16px', fontWeight: 600 }}>Active Processing Worker Threads</h3>

        {queueData.active_jobs.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            No jobs are actively processing right now.
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>AuVeCo #</th>
                  <th>Phantom #</th>
                  <th>Status</th>
                  <th>Attempt</th>
                  <th>Quality Preset</th>
                  <th>Last Update</th>
                </tr>
              </thead>
              <tbody>
                {queueData.active_jobs.map((job) => (
                  <tr key={job.id}>
                    <td className="mono">#{job.id}</td>
                    <td className="mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{job.auveco}</td>
                    <td className="mono" style={{ color: 'var(--accent-primary)' }}>{job.phantom}</td>
                    <td>
                      <span className="badge badge-processing">
                        <Sparkles size={12} className="spin" />
                        <span>Processing</span>
                      </span>
                    </td>
                    <td>Attempt #{job.attempt}</td>
                    <td><span className="badge badge-queued">{job.quality?.toUpperCase() || 'MEDIUM'}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{job.updated_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
