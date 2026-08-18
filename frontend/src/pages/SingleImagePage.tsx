import React, { useState } from 'react';
import { Search, Play, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { AnomalyModal } from '../components/AnomalyModal';

interface SingleImagePageProps {
  onNavigate: (tab: string, category?: string) => void;
  showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
}

export const SingleImagePage: React.FC<SingleImagePageProps> = ({ onNavigate, showToast }) => {
  const [auvecoInput, setAuvecoInput] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [anomalyError, setAnomalyError] = useState<{ title: string; message: string; anomalies?: any[] } | null>(null);
  const [confirmationData, setConfirmationData] = useState<{ message: string; auveco: string } | null>(null);

  const handleConvert = async (force: boolean = false) => {
    const auveco = auvecoInput.trim();
    if (!auveco) {
      showToast('warning', 'Input Required', 'Please enter a valid AuVeCo serial number.');
      return;
    }

    setIsSubmitting(true);
    setAnomalyError(null);
    setConfirmationData(null);

    try {
      const res = await api.createSingleJob(auveco, selectedPreset, force);
      showToast('success', 'Single Job Queued', `AuVeCo '${res.auveco}' has been queued for CAD conversion.`);
      onNavigate('queue');
    } catch (err: any) {
      let message = err.message;
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.error_type === 'anomaly') {
          setAnomalyError({
            title: `Anomaly Detected for '${auveco}'`,
            message: parsed.message,
            anomalies: parsed.anomalies
          });
          return;
        }
        if (parsed.error_type === 'already_approved' || parsed.error_type === 'awaiting_review') {
          setConfirmationData({
            message: parsed.message,
            auveco: auveco
          });
          return;
        }
        message = parsed.message || err.message;
      } catch {
        // Normal text error string
      }

      setAnomalyError({
        title: `Validation Error for '${auveco}'`,
        message: message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '800px' }}>
      <div className="glass-panel" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <div style={{
            padding: '12px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            color: '#fff'
          }}>
            <Search size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', color: '#fff', margin: 0 }}>Convert Single Product Image</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
              Look up an AuVeCo serial number, validate Phantom mapping, and launch single CAD render job.
            </p>
          </div>
        </div>

        {/* Input Box */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
            AuVeCo Serial Number:
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              placeholder="e.g. 11130 or 10066"
              value={auvecoInput}
              onChange={(e) => setAuvecoInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConvert(false)}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--border-color)',
                color: '#fff',
                fontFamily: 'var(--font-mono)',
                fontSize: '15px'
              }}
            />

            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--border-color)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600
              }}
            >
              <option value="medium">Medium Preset</option>
              <option value="high">High Preset</option>
            </select>

            <button
              onClick={() => handleConvert(false)}
              disabled={isSubmitting || !auvecoInput.trim()}
              className="btn btn-primary"
              style={{ padding: '12px 24px' }}
            >
              <Play size={16} />
              <span>{isSubmitting ? 'Validating...' : 'Start Job'}</span>
            </button>
          </div>
        </div>

        {/* Confirmation Dialog for reprocess existing */}
        {confirmationData && (
          <div style={{
            padding: '16px',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '13px', color: '#fef3c7', marginBottom: '12px' }}>
              {confirmationData.message}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => handleConvert(true)}
                className="btn btn-warning"
                style={{ padding: '8px 16px', fontSize: '12px' }}
              >
                Confirm Reprocess
              </button>
              <button
                onClick={() => setConfirmationData(null)}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '12px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Anomaly Notification Modal */}
      {anomalyError && (
        <AnomalyModal
          title={anomalyError.title}
          message={anomalyError.message}
          anomalies={anomalyError.anomalies}
          onClose={() => setAnomalyError(null)}
          onAction={(act) => {
            setAnomalyError(null);
            onNavigate('anomalies');
          }}
        />
      )}
    </div>
  );
};
