import React from 'react';
import { AlertOctagon, X, ArrowRight, ShieldAlert } from 'lucide-react';

interface AnomalyModalProps {
  title: string;
  message: string;
  anomalies?: any[];
  onClose: () => void;
  onAction?: (actionType: string) => void;
}

export const AnomalyModal: React.FC<AnomalyModalProps> = ({
  title,
  message,
  anomalies,
  onClose,
  onAction
}) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '560px' }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(239, 68, 68, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              padding: '8px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.2)',
              color: 'var(--accent-danger)'
            }}>
              <AlertOctagon size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', color: '#fff', margin: 0 }}>{title}</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Data & Integrity Warning</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          <p style={{ fontSize: '14px', color: '#e2e8f0', marginBottom: '16px' }}>{message}</p>

          {anomalies && anomalies.length > 0 && (
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              marginBottom: '20px',
              maxHeight: '180px',
              overflowY: 'auto'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Detected Anomaly Details:
              </div>
              {anomalies.map((a, idx) => (
                <div key={idx} style={{ fontSize: '12px', color: '#fca5a5', marginBottom: '4px' }}>
                  • {a.details || a.message || JSON.stringify(a)}
                </div>
              ))}
            </div>
          )}

          <div style={{
            padding: '12px 16px',
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: 'var(--radius-md)',
            fontSize: '12px',
            color: 'var(--text-secondary)'
          }}>
            <ShieldAlert size={14} style={{ inlineSize: 'auto', marginRight: '6px' }} />
            Automated batch processing skips anomaly items to prevent corrupted database mappings.
          </div>
        </div>

        <div style={{
          padding: '16px 24px',
          background: 'rgba(15, 20, 30, 0.8)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
          {onAction && (
            <button onClick={() => onAction('view_anomalies')} className="btn btn-primary">
              <span>View Anomalies Explorer</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
