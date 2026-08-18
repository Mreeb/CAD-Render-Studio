import React, { useState, useEffect } from 'react';
import { Download, Square, RefreshCw, CheckCircle2, AlertCircle, FileCheck, ImageIcon, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { DownloaderState } from '../types';

interface DownloaderPageProps {
  showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
}

export const DownloaderPage: React.FC<DownloaderPageProps> = ({ showToast }) => {
  const [maxDownloads, setMaxDownloads] = useState<number>(100);
  const [downloaderState, setDownloaderState] = useState<DownloaderState | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStatus = async () => {
    try {
      const state = await api.getDownloaderStatus();
      setDownloaderState(state);
    } catch (e) {
      console.error('Failed fetching downloader status:', e);
    }
  };

  useEffect(() => {
    // Initial status fetch
    fetchStatus();

    // SSE Stream Subscription
    const eventSource = new EventSource('/api/downloader/stream');
    eventSource.onmessage = (event) => {
      try {
        const state: DownloaderState = JSON.parse(event.data);
        setDownloaderState(state);
      } catch (e) {
        console.error('Downloader SSE parse error:', e);
      }
    };

    // Fallback polling interval every 3 seconds
    const interval = setInterval(fetchStatus, 3000);

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const state = await api.getDownloaderStatus();
      setDownloaderState(state);
      showToast('info', 'Downloader Refreshed', 'Downloader state updated.');
    } catch (e: any) {
      showToast('error', 'Refresh Failed', e.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStart = async () => {
    setIsStarting(true);
    try {
      const res = await api.startDownloader(maxDownloads);
      showToast('info', 'Downloader Started', `Downloading up to ${maxDownloads} new product images.`);
      setDownloaderState(res.state);
    } catch (e: any) {
      showToast('error', 'Could Not Start Downloader', e.message);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async () => {
    try {
      const res = await api.stopDownloader();
      showToast('warning', 'Downloader Stopped', 'Stop request sent.');
      setDownloaderState(res.state);
    } catch (e: any) {
      showToast('error', 'Error Stopping Downloader', e.message);
    }
  };

  const isRunning = downloaderState?.status === 'running';
  const currentDownloaded = downloaderState?.downloaded_count || 0;
  const targetMax = downloaderState?.max_downloads || maxDownloads || 100;
  const progressPct = Math.min(100, Math.round((currentDownloaded / targetMax) * 100));

  return (
    <div className="page-container" style={{ maxWidth: '900px' }}>
      <div className="glass-panel" style={{ padding: '32px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <div style={{
            padding: '12px',
            borderRadius: '12px',
            background: 'var(--accent-primary)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Download size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', color: 'var(--text-primary)', margin: 0, fontWeight: 600 }}>Image Downloader</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
              Automated image scraper & SuiteCommerce API engine to populate DATA_DIRECTORY.
            </p>
          </div>
        </div>

        {/* Configuration Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Max New Images to Download:
            </label>
            <input
              type="number"
              min="1"
              max="5000"
              value={maxDownloads}
              onChange={(e) => setMaxDownloads(parseInt(e.target.value, 10) || 100)}
              disabled={isRunning}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--input-bg)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', paddingTop: '20px' }}>
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="btn btn-secondary"
              style={{ padding: '11px 16px' }}
              title="Manual refresh downloader status"
            >
              <RefreshCw size={15} className={isRefreshing ? 'spin' : ''} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            {isRunning ? (
              <button onClick={handleStop} className="btn btn-danger" style={{ padding: '11px 22px' }}>
                <Square size={16} />
                <span>Stop Downloader</span>
              </button>
            ) : (
              <button onClick={handleStart} disabled={isStarting} className="btn btn-primary" style={{ padding: '11px 22px' }}>
                <Download size={16} />
                <span>{isStarting ? 'Starting...' : 'Start Downloader'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Downloader Status Box with Live Activity Indicator */}
        {downloaderState && (
          <div style={{
            padding: '22px',
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isRunning && <Loader2 size={16} color="var(--accent-primary)" className="spin" />}
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Live Downloader Progress</span>
              </div>
              <span className={`badge ${isRunning ? 'badge-processing' : downloaderState.status === 'completed' ? 'badge-approved' : 'badge-eligible'}`}>
                {downloaderState.status.toUpperCase()}
              </span>
            </div>

            {/* Current Active Action Display */}
            <div style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                Status: <span style={{ color: isRunning ? 'var(--accent-primary)' : 'var(--text-primary)', fontWeight: 600 }}>{downloaderState.current_serial || 'Ready'}</span>
              </div>
              {isRunning && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Progress: <strong style={{ color: 'var(--text-primary)' }}>{currentDownloaded}</strong> / {targetMax} ({progressPct}%)
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {isRunning && (
              <div className="slim-progress-bg" style={{ height: '8px', marginBottom: '18px' }}>
                <div className="slim-progress-fill processing" style={{ width: `${progressPct}%` }} />
              </div>
            )}

            {/* Stats Counter Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Downloaded</div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: '#2FBF8F' }}>{downloaderState.downloaded_count}</div>
              </div>
              <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Already Present</div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: '#4F7CFF' }}>{downloaderState.already_present}</div>
              </div>
              <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Duplicates Skipped</div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: '#D6A13B' }}>{downloaderState.duplicates_skipped}</div>
              </div>
              <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Not Found</div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: '#E05252' }}>{downloaderState.not_found_count}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
