import React, { useState } from 'react';
import { Layers, Search, Play, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { AnalyticsSummary, BatchConfirmationPreview } from '../types';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface ConvertPageProps {
  analytics: AnalyticsSummary | null;
  onNavigate: (tab: string) => void;
  showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
  initialMode?: 'batch' | 'single';
}

export const ConvertPage: React.FC<ConvertPageProps> = ({
  analytics,
  onNavigate,
  showToast,
  initialMode = 'batch'
}) => {
  const [conversionMode, setConversionMode] = useState<'batch' | 'single'>(initialMode);

  // Shared Preset
  const [selectedPreset, setSelectedPreset] = useState<string>('medium');

  // Batch Mode States
  const [selectedCount, setSelectedCount] = useState<number>(5);
  const [customCount, setCustomCount] = useState<string>('5');
  const [preview, setPreview] = useState<BatchConfirmationPreview | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);

  // Single / Specific Serial Mode States
  const [auvecoInput, setAuvecoInput] = useState('');
  const [isSubmittingSingle, setIsSubmittingSingle] = useState(false);
  const [reprocessConfirmation, setReprocessConfirmation] = useState<{ message: string; auveco: string } | null>(null);

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

  // Execute Batch Queue
  const handleBatchStartClick = async () => {
    setIsLoadingPreview(true);
    try {
      const p = await api.previewBatch(selectedCount, selectedPreset);
      setPreview(p);
      if (p.requires_confirmation) {
        setShowConfirmationModal(true);
      } else {
        await executeBatchQueue(false);
      }
    } catch (err: any) {
      showToast('error', 'Batch Preview Failed', err.message);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const executeBatchQueue = async (force: boolean) => {
    setIsSubmittingBatch(true);
    try {
      const res = await api.createBatch(selectedCount, selectedPreset, force);
      showToast('success', 'Batch Queued', `Successfully queued ${res.details.queued_count} images for conversion.`);
      setShowConfirmationModal(false);
      onNavigate('queue');
    } catch (err: any) {
      showToast('error', 'Failed to Queue Batch', err.message);
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  // Execute Single / Specific Serial Conversion
  const handleSingleConvert = async (force: boolean = false) => {
    const auveco = auvecoInput.trim();
    if (!auveco) {
      showToast('warning', 'Input Required', 'Please enter a valid AuVeCo serial number.');
      return;
    }

    setIsSubmittingSingle(true);
    setReprocessConfirmation(null);

    try {
      const res = await api.createSingleJob(auveco, selectedPreset, force);
      showToast('success', 'Single Job Queued', `AuVeCo '${res.auveco}' has been queued for CAD conversion.`);
      onNavigate('queue');
    } catch (err: any) {
      let message = err.message;
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.error_type === 'already_approved' || parsed.error_type === 'awaiting_review') {
          setReprocessConfirmation({
            message: parsed.message,
            auveco: auveco
          });
          return;
        }
        message = parsed.message || err.message;
      } catch {
        // Plain error string
      }

      showToast('error', `Validation Error for '${auveco}'`, message);
    } finally {
      setIsSubmittingSingle(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '960px' }}>
      <div className="glass-panel" style={{ padding: '28px', marginBottom: '24px' }}>
        
        {/* Header Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{
            padding: '10px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent-primary)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Layers size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', color: 'var(--text-primary)', margin: 0, fontWeight: 600 }}>Convert Product CAD Renders</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
              Launch CAD conversions in automated batches or by specific AuVeCo serial numbers.
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          padding: '3px',
          border: '1px solid var(--border-color)',
          marginBottom: '24px'
        }}>
          <button
            onClick={() => setConversionMode('batch')}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: conversionMode === 'batch' ? 'var(--accent-primary)' : 'transparent',
              color: conversionMode === 'batch' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: conversionMode === 'batch' ? 600 : 400,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background-color 0.15s ease'
            }}
          >
            <Layers size={15} />
            <span>Automated Batch Mode</span>
          </button>

          <button
            onClick={() => setConversionMode('single')}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: conversionMode === 'single' ? 'var(--accent-primary)' : 'transparent',
              color: conversionMode === 'single' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: conversionMode === 'single' ? 600 : 400,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background-color 0.15s ease'
            }}
          >
            <Search size={15} />
            <span>By AuVeCo Serial Number</span>
          </button>
        </div>

        {/* Shared Quality Preset Selector */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '10px' }}>
            Render Quality Preset:
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div
              onClick={() => setSelectedPreset('medium')}
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                background: selectedPreset === 'medium' ? 'var(--bg-elevated)' : 'var(--bg-card)',
                border: `1px solid ${selectedPreset === 'medium' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                cursor: 'pointer',
                transition: 'border-color 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>Medium Quality</span>
                <span className="badge badge-queued">GPT Image 2</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Standard medium quality CAD reconstruction (model="gpt-image-2", quality="medium"). Balanced speed & detail.
              </p>
            </div>

            <div
              onClick={() => setSelectedPreset('high')}
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                background: selectedPreset === 'high' ? 'var(--bg-elevated)' : 'var(--bg-card)',
                border: `1px solid ${selectedPreset === 'high' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                cursor: 'pointer',
                transition: 'border-color 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>High Quality</span>
                <span className="badge badge-processing">GPT Image 2 High</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                High quality CAD reconstruction (model="gpt-image-2", quality="high"). Maximum detail & sharp surface definition.
              </p>
            </div>
          </div>
        </div>

        {/* Mode 1: Automated Batch Mode */}
        {conversionMode === 'batch' && (
          <div>
            <div style={{ marginBottom: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '10px' }}>
                Select Number of Images to Convert:
              </label>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                {quickCounts.map((cnt) => (
                  <button
                    key={cnt}
                    onClick={() => handleSelectCount(cnt)}
                    className={`btn ${selectedCount === cnt ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                  >
                    {cnt} {cnt === 1 ? 'Image' : 'Images'}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '280px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Custom Quantity:</span>
                <input
                  type="number"
                  min="1"
                  max="2000"
                  value={customCount}
                  onChange={(e) => handleCustomChange(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '7px 10px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px'
                  }}
                />
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
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Eligible images available: <strong style={{ color: 'var(--text-primary)' }}>{analytics?.total_remaining || 0}</strong>
                </div>
                {selectedCount > 10 && (
                  <div style={{ fontSize: '11px', color: 'var(--accent-warning)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                    <AlertTriangle size={13} />
                    Requires confirmation modal ({selectedCount} &gt; 10)
                  </div>
                )}
              </div>

              <button
                onClick={handleBatchStartClick}
                disabled={isLoadingPreview || isSubmittingBatch || (analytics?.total_remaining || 0) === 0}
                className="btn btn-primary"
                style={{ padding: '10px 24px', fontSize: '14px' }}
              >
                <Play size={16} />
                <span>{isLoadingPreview ? 'Preparing Batch...' : `Queue ${selectedCount} Images`}</span>
              </button>
            </div>
          </div>
        )}

        {/* Mode 2: By AuVeCo Serial Number */}
        {conversionMode === 'single' && (
          <div style={{ paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
              Enter AuVeCo Serial Number:
            </label>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="e.g. 11130 or 10066"
                value={auvecoInput}
                onChange={(e) => setAuvecoInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSingleConvert(false)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '14px'
                }}
              />

              <button
                onClick={() => handleSingleConvert(false)}
                disabled={isSubmittingSingle || !auvecoInput.trim()}
                className="btn btn-primary"
                style={{ padding: '10px 20px' }}
              >
                <Play size={15} />
                <span>{isSubmittingSingle ? 'Validating...' : 'Start Job'}</span>
              </button>
            </div>

            {/* Reprocess Confirmation Dialog */}
            {reprocessConfirmation && (
              <div style={{
                padding: '14px',
                background: 'rgba(214, 161, 59, 0.08)',
                border: '1px solid rgba(214, 161, 59, 0.3)',
                borderRadius: 'var(--radius-md)',
                marginTop: '14px'
              }}>
                <div style={{ fontSize: '12px', color: '#E2B86B', marginBottom: '10px' }}>
                  {reprocessConfirmation.message}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleSingleConvert(true)}
                    className="btn btn-warning"
                    style={{ padding: '6px 14px', fontSize: '12px' }}
                  >
                    Confirm Reprocess
                  </button>
                  <button
                    onClick={() => setReprocessConfirmation(null)}
                    className="btn btn-secondary"
                    style={{ padding: '6px 14px', fontSize: '12px' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Batch > 10 */}
      {showConfirmationModal && preview && (
        <ConfirmationModal
          preview={preview}
          preset={selectedPreset}
          onConfirm={() => executeBatchQueue(true)}
          onCancel={() => setShowConfirmationModal(false)}
          isSubmitting={isSubmittingBatch}
        />
      )}
    </div>
  );
};
