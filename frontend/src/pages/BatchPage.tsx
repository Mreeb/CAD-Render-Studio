import React, { useState, useEffect } from 'react';
import { Layers, Sparkles, AlertTriangle, Play, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';
import { AnalyticsSummary, BatchConfirmationPreview } from '../types';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface BatchPageProps {
  analytics: AnalyticsSummary | null;
  onNavigate: (tab: string) => void;
  showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
}

export const BatchPage: React.FC<BatchPageProps> = ({ analytics, onNavigate, showToast }) => {
  const [selectedCount, setSelectedCount] = useState<number>(5);
  const [customCount, setCustomCount] = useState<string>('5');
  const [selectedPreset, setSelectedPreset] = useState<string>('medium');
  const [presets, setPresets] = useState<Record<string, any>>({});

  const [preview, setPreview] = useState<BatchConfirmationPreview | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.getPresets().then(setPresets).catch(() => {});
  }, []);

  const quickCounts = [1, 5, 10, 25, 100];

  const handleSelectCount = (count: number) => {
    setSelectedCount(count);
    setCustomCount(count.toString());
  };

  const handleCustomChange = (val: string) => {
    setCustomCount(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
      setSelectedCount(num);
    }
  };

  const handleStartClick = async () => {
    setIsLoadingPreview(true);
    try {
      const p = await api.previewBatch(selectedCount, selectedPreset);
      setPreview(p);
      if (p.requires_confirmation) {
        setShowModal(true);
      } else {
        // Direct queue submit for <= 10
        await executeQueue(false);
      }
    } catch (err: any) {
      showToast('error', 'Batch Preview Failed', err.message);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const executeQueue = async (force: boolean) => {
    setIsSubmitting(true);
    try {
      const res = await api.createBatch(selectedCount, selectedPreset, force);
      showToast('success', 'Batch Queued', `Successfully queued ${res.details.queued_count} images for conversion.`);
      setShowModal(false);
      onNavigate('queue');
    } catch (err: any) {
      showToast('error', 'Failed to Queue Batch', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '1000px' }}>
      <div className="glass-panel" style={{ padding: '32px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <div style={{
            padding: '12px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            color: '#fff'
          }}>
            <Layers size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', color: '#fff', margin: 0 }}>Batch CAD Reconstruction</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
              Select batch size and render quality preset to convert product photos in Excel order.
            </p>
          </div>
        </div>

        {/* Quantity Selection */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '12px' }}>
            Select Number of Images to Convert:
          </label>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {quickCounts.map((cnt) => (
              <button
                key={cnt}
                onClick={() => handleSelectCount(cnt)}
                className={`btn ${selectedCount === cnt ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '12px 24px', fontSize: '15px', borderRadius: 'var(--radius-md)' }}
              >
                {cnt} {cnt === 1 ? 'Image' : 'Images'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '300px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Custom Quantity:</span>
            <input
              type="number"
              min="1"
              max="2000"
              value={customCount}
              onChange={(e) => handleCustomChange(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--border-color)',
                color: '#fff',
                fontFamily: 'var(--font-mono)',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        {/* Quality Preset Selector */}
        <div style={{ marginBottom: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '12px' }}>
            Render Quality Preset:
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div
              onClick={() => setSelectedPreset('medium')}
              style={{
                padding: '18px',
                borderRadius: 'var(--radius-lg)',
                background: selectedPreset === 'medium' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                border: `2px solid ${selectedPreset === 'medium' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '16px', color: '#fff' }}>Medium Quality</span>
                <span className="badge badge-queued">GPT Image 2</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Standard medium quality CAD reconstruction (model="gpt-image-2", quality="medium"). Balanced speed & detail.
              </p>
            </div>

            <div
              onClick={() => setSelectedPreset('high')}
              style={{
                padding: '18px',
                borderRadius: 'var(--radius-lg)',
                background: selectedPreset === 'high' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                border: `2px solid ${selectedPreset === 'high' ? 'var(--accent-purple)' : 'var(--border-color)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '16px', color: '#fff' }}>High Quality</span>
                <span className="badge badge-processing">GPT Image 2 High</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                High quality CAD reconstruction (model="gpt-image-2", quality="high"). Maximum detail & sharp surface definition.
              </p>
            </div>
          </div>
        </div>

        {/* Launch Button & Info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '20px',
          borderTop: '1px solid var(--border-color)'
        }}>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Eligible images available: <strong style={{ color: '#fff' }}>{analytics?.total_remaining || 0}</strong>
            </div>
            {selectedCount > 10 && (
              <div style={{ fontSize: '12px', color: 'var(--accent-warning)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                <AlertTriangle size={14} />
                Requires explicit confirmation modal ({selectedCount} &gt; 10)
              </div>
            )}
          </div>

          <button
            onClick={handleStartClick}
            disabled={isLoadingPreview || isSubmitting || (analytics?.total_remaining || 0) === 0}
            className="btn btn-primary"
            style={{ padding: '14px 28px', fontSize: '15px' }}
          >
            <Play size={18} />
            <span>{isLoadingPreview ? 'Preparing Batch...' : `Queue ${selectedCount} Images`}</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal for > 10 */}
      {showModal && preview && (
        <ConfirmationModal
          preview={preview}
          preset={selectedPreset}
          onConfirm={() => executeQueue(true)}
          onCancel={() => setShowModal(false)}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
};
