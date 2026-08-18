import React, { useState } from 'react';
import { AlertTriangle, DollarSign, Layers, X, Check } from 'lucide-react';
import { BatchConfirmationPreview } from '../types';

interface ConfirmationModalProps {
  preview: BatchConfirmationPreview;
  preset: string;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  preview,
  preset,
  onConfirm,
  onCancel,
  isSubmitting
}) => {
  const [confirmedCheck, setConfirmedCheck] = useState(false);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '560px' }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(245, 158, 11, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              padding: '8px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.2)',
              color: 'var(--accent-warning)'
            }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', color: '#fff', margin: 0 }}>Batch Conversion Confirmation</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Processing over 10 images requires explicit user confirmation
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Metrics Grid */}
        <div style={{ padding: '24px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '20px'
          }}>
            <div style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Images Requested</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#fff' }}>{preview.requested_count}</div>
            </div>
            <div style={{ padding: '14px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
              <div style={{ fontSize: '12px', color: '#818cf8' }}>Will Actually Queue</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#818cf8' }}>{preview.will_queue_count}</div>
            </div>
            <div style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Completed / Pending</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#fff' }}>{preview.completed_or_pending_count}</div>
            </div>
            <div style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Skipped Anomalies</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--accent-danger)' }}>{preview.skipped_anomalies_count}</div>
            </div>
          </div>

          {/* Cost & Preset Notice */}
          <div style={{
            padding: '14px 18px',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px',
            fontSize: '13px',
            color: '#fef3c7'
          }}>
            <div style={{ fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <DollarSign size={16} color="var(--accent-warning)" />
              <span>API Cost & Quality Warning</span>
            </div>
            <div>{preview.warning}</div>
            <div style={{ marginTop: '6px', fontSize: '12px', opacity: 0.8 }}>
              Selected Quality Preset: <strong>{preset.toUpperCase()}</strong> (Model: gpt-image-2)
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            color: '#fff'
          }}>
            <input
              type="checkbox"
              checked={confirmedCheck}
              onChange={(e) => setConfirmedCheck(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
            />
            <span>I understand—process {preview.will_queue_count} images</span>
          </label>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '16px 24px',
          background: 'rgba(15, 20, 30, 0.8)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button onClick={onCancel} className="btn btn-secondary">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!confirmedCheck || isSubmitting}
            className="btn btn-primary"
          >
            {isSubmitting ? 'Queueing Batch...' : `Confirm & Queue ${preview.will_queue_count} Jobs`}
          </button>
        </div>
      </div>
    </div>
  );
};
