import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  History,
  Eye,
  Check,
  X,
  Maximize2,
  CheckSquare
} from 'lucide-react';
import { api } from '../services/api';
import { ConversionItem, ConversionHistoryItem } from '../types';

interface ReviewPageProps {
  showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
}

interface CustomCheckboxProps {
  checked: boolean;
  onChange: () => void;
}

const CustomCheckbox: React.FC<CustomCheckboxProps> = ({ checked, onChange }) => {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className="custom-checkbox-box"
      style={{
        width: '18px',
        height: '18px',
        borderRadius: '4px',
        border: checked ? '1.5px solid #4F7CFF' : '1.5px solid #384252',
        backgroundColor: checked ? '#4F7CFF' : 'var(--bg-elevated)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 150ms ease-out',
        flexShrink: 0
      }}
    >
      {checked && <Check size={12} color="#ffffff" strokeWidth={3} />}
    </div>
  );
};

export const ReviewPage: React.FC<ReviewPageProps> = ({ showToast }) => {
  const [items, setItems] = useState<ConversionItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Card transition status state (id -> 'approving' | 'rejecting' | 'reprocessing')
  const [animatingCardIds, setAnimatingCardIds] = useState<Record<number, 'approving' | 'rejecting' | 'reprocessing'>>({});

  // Selected item for side-by-side comparison modal
  const [activeItem, setActiveItem] = useState<ConversionItem | null>(null);
  const [historyItems, setHistoryItems] = useState<ConversionHistoryItem[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Reprocess preset option
  const [reprocessPreset, setReprocessPreset] = useState<string>('medium');

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const data = await api.getReviewItems('awaiting_review');
      setItems(data);
    } catch (err: any) {
      showToast('error', 'Error Loading Review Items', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleToggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const isAllSelected = items.length > 0 && selectedIds.length === items.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((item) => item.id));
    }
  };

  const handleAction = async (action: 'approve' | 'reject' | 'reprocess', targetIds?: number[]) => {
    const idsToProcess = targetIds || selectedIds;
    if (idsToProcess.length === 0) {
      showToast('warning', 'No Items Selected', 'Please select at least one item.');
      return;
    }

    // Trigger local transition overlays for target cards
    const transitionState: 'approving' | 'rejecting' | 'reprocessing' =
      action === 'approve' ? 'approving' : action === 'reject' ? 'rejecting' : 'reprocessing';

    const newAnimMap = { ...animatingCardIds };
    idsToProcess.forEach((id) => {
      newAnimMap[id] = transitionState;
    });
    setAnimatingCardIds(newAnimMap);

    // Short 240ms transition delay before completing backend call
    setTimeout(async () => {
      try {
        const res = await api.processReviewAction(idsToProcess, action, reprocessPreset);
        if (res.success) {
          showToast(
            'success',
            `Action '${action.toUpperCase()}' Completed`,
            `Successfully updated ${res.processed_ids.length} items.`
          );
          setSelectedIds((prev) => prev.filter((id) => !idsToProcess.includes(id)));
          if (activeItem && idsToProcess.includes(activeItem.id)) {
            setActiveItem(null);
          }
          fetchItems();
        }
      } catch (err: any) {
        showToast('error', 'Review Action Failed', err.message);
      } finally {
        setAnimatingCardIds((prev) => {
          const updated = { ...prev };
          idsToProcess.forEach((id) => delete updated[id]);
          return updated;
        });
      }
    }, 240);
  };

  const viewHistory = async (item: ConversionItem) => {
    try {
      const h = await api.getHistory(item.id);
      setHistoryItems(h);
      setShowHistoryModal(true);
    } catch (e: any) {
      showToast('error', 'Error Loading History', e.message);
    }
  };

  return (
    <div className="page-container">
      {/* Header Toolbar */}
      <div className="glass-panel" style={{ padding: '18px 22px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', color: 'var(--text-primary)', margin: 0, fontWeight: 600 }}>CAD Render Review & Approval</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            Compare original product photos with reconstructed CAD renders before approving for production.
          </p>
        </div>

        {/* Action Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Select All Toggle Button */}
          {items.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="btn btn-secondary"
              style={{ padding: '8px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <CustomCheckbox checked={isAllSelected} onChange={handleSelectAll} />
              <span>{isAllSelected ? 'Deselect All' : `Select All (${items.length})`}</span>
            </button>
          )}

          {/* Approve Selected Button */}
          <button
            onClick={() => handleAction('approve')}
            disabled={selectedIds.length === 0}
            className="btn btn-success"
            style={{ padding: '8px 14px', fontSize: '12px' }}
          >
            <CheckCircle2 size={14} />
            <span>Approve Selected ({selectedIds.length})</span>
          </button>

          {/* Reject Selected Button */}
          <button
            onClick={() => handleAction('reject')}
            disabled={selectedIds.length === 0}
            className="btn btn-outline-danger"
            style={{ padding: '8px 14px', fontSize: '12px' }}
          >
            <XCircle size={14} />
            <span>Reject Selected ({selectedIds.length})</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <select
              value={reprocessPreset}
              onChange={(e) => setReprocessPreset(e.target.value)}
              style={{
                padding: '7px 10px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--input-bg)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '12px'
              }}
            >
              <option value="medium">Medium Preset</option>
              <option value="high">High Preset</option>
            </select>

            <button
              onClick={() => handleAction('reprocess')}
              disabled={selectedIds.length === 0}
              className="btn btn-secondary"
              style={{ padding: '8px 14px', fontSize: '12px' }}
            >
              <RotateCcw size={14} color="var(--accent-primary)" />
              <span>Reprocess Selected</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Review Grid */}
      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading items awaiting review...</div>
      ) : items.length === 0 ? (
        <div className="glass-panel" style={{ padding: '48px', textAlign: 'center' }}>
          <CheckCircle2 size={40} color="var(--accent-success)" style={{ margin: '0 auto 14px auto' }} />
          <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '6px' }}>No Pending Reviews</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            All generated CAD renders have been reviewed or approved.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {items.map((item, idx) => {
            const isSelected = selectedIds.includes(item.id);
            const animState = animatingCardIds[item.id];
            const sourceUrl = item.source_filename ? `/api/media/source/${item.source_filename}` : '';
            const reviewFilename = `${item.auveco}_review.png`;
            const reviewUrl = `/api/media/review/${reviewFilename}`;

            return (
              <div
                key={item.id}
                className={`review-card ${isSelected ? 'selected' : ''} ${animState ? 'animating-out' : ''}`}
                style={{ animationDelay: `${Math.min(idx * 30, 240)}ms` }}
              >
                {/* Status Overlay Transition on Action */}
                {animState && (
                  <div className="card-overlay-status">
                    {animState === 'approving' && (
                      <>
                        <CheckCircle2 size={32} color="#2FBF8F" />
                        <span style={{ fontWeight: 600, color: '#2FBF8F', fontSize: '14px' }}>Approved!</span>
                      </>
                    )}
                    {animState === 'rejecting' && (
                      <>
                        <XCircle size={32} color="#E05252" />
                        <span style={{ fontWeight: 600, color: '#E05252', fontSize: '14px' }}>Rejected</span>
                      </>
                    )}
                    {animState === 'reprocessing' && (
                      <>
                        <RotateCcw size={32} color="#4F7CFF" className="spin" />
                        <span style={{ fontWeight: 600, color: '#4F7CFF', fontSize: '14px' }}>Reprocessing...</span>
                      </>
                    )}
                  </div>
                )}

                {/* Consolidated Compact Header with Custom Checkbox */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)', marginBottom: '12px' }}>
                  <div
                    onClick={() => handleToggleSelect(item.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}
                  >
                    <CustomCheckbox checked={isSelected} onChange={() => handleToggleSelect(item.id)} />
                    <span className="mono" style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
                      {item.auveco}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>Phantom: <strong className="mono" style={{ color: 'var(--accent-primary)' }}>{item.phantom}</strong></span>
                    <span>Preset: <strong style={{ color: 'var(--text-secondary)' }}>{item.quality?.toUpperCase() || 'MEDIUM'}</strong></span>
                    <span className="badge badge-awaiting_review" style={{ fontSize: '10px', padding: '2px 6px' }}>#{item.attempt}</span>
                  </div>
                </div>

                {/* Side-by-Side Mini Preview with Zoom & Compare Overlay */}
                <div className="side-by-side-grid" style={{ gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textAlign: 'center' }}>Original Photo</div>
                    <div className="image-card-box review-image-wrapper review-mini-box" onClick={() => setActiveItem(item)}>
                      <img src={sourceUrl} alt={item.auveco} loading="lazy" />
                      <div className="review-compare-overlay">
                        <Maximize2 size={13} />
                        <span>Compare</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--accent-primary)', marginBottom: '4px', textAlign: 'center', fontWeight: 500 }}>CAD Render</div>
                    <div className="image-card-box review-image-wrapper review-mini-box" onClick={() => setActiveItem(item)}>
                      <img src={reviewUrl} alt={item.phantom} loading="lazy" />
                      <div className="review-compare-overlay">
                        <Maximize2 size={13} />
                        <span>Compare</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Item Card Actions Divider & Toolbar */}
                <div style={{ display: 'flex', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--border-color)', alignItems: 'center' }}>
                  <button
                    onClick={() => handleAction('approve', [item.id])}
                    className="btn btn-success"
                    style={{ flex: 1, padding: '7px 10px', fontSize: '12px' }}
                  >
                    <Check size={14} />
                    <span>Approve</span>
                  </button>

                  <button
                    onClick={() => handleAction('reject', [item.id])}
                    className="btn btn-outline-danger"
                    style={{ flex: 1, padding: '7px 10px', fontSize: '12px' }}
                  >
                    <X size={14} />
                    <span>Reject</span>
                  </button>

                  <button
                    onClick={() => setActiveItem(item)}
                    className="btn btn-secondary"
                    style={{ padding: '7px 10px', fontSize: '12px' }}
                    title="View side-by-side zoom comparison"
                  >
                    <Eye size={13} />
                    <span>View</span>
                  </button>

                  <button
                    onClick={() => viewHistory(item)}
                    className="btn btn-secondary"
                    style={{ padding: '7px 10px', fontSize: '12px' }}
                    title="View earlier attempt history"
                  >
                    <History size={13} />
                    <span>History</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Side-by-Side Zoom Modal */}
      {activeItem && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '960px', width: '90%' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', margin: 0, fontWeight: 600 }}>
                  CAD Render Comparison — AuVeCo {activeItem.auveco} / Phantom {activeItem.phantom}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                  Attempt #{activeItem.attempt} | Model: {activeItem.model} | Quality: {activeItem.quality?.toUpperCase()}
                </p>
              </div>
              <button onClick={() => setActiveItem(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              <div className="side-by-side-grid" style={{ gap: '20px' }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Original Source Photo ({activeItem.auveco}.png)
                  </div>
                  <div className="image-card-box review-modal-box">
                    <img src={`/api/media/source/${activeItem.source_filename}`} alt={activeItem.auveco} />
                  </div>
                </div>

                <div>
                  <div style={{ fontWeight: 500, fontSize: '13px', color: 'var(--accent-primary)', marginBottom: '6px' }}>
                    Reconstructed CAD Render ({activeItem.phantom}.png)
                  </div>
                  <div className="image-card-box review-modal-box">
                    <img src={`/api/media/review/${activeItem.auveco}_review.png`} alt={activeItem.phantom} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '14px 22px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => handleAction('reject', [activeItem.id])} className="btn btn-outline-danger" style={{ padding: '8px 16px' }}>
                Reject Render
              </button>
              <button onClick={() => handleAction('approve', [activeItem.id])} className="btn btn-success" style={{ padding: '8px 16px' }}>
                Approve & Save to CAD_DIRECTORY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Viewer Modal */}
      {showHistoryModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '620px' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', margin: 0, fontWeight: 600 }}>Conversion Version History</h3>
              <button onClick={() => setShowHistoryModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', maxHeight: '380px', overflowY: 'auto' }}>
              {historyItems.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No earlier attempt history found.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {historyItems.map((h) => (
                    <div key={h.id} style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>Attempt #{h.attempt}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{h.created_at} | Model: {h.model} ({h.quality})</div>
                        {h.error_message && <div style={{ fontSize: '11px', color: '#E05252', marginTop: '4px' }}>Error: {h.error_message}</div>}
                      </div>
                      <span className={`badge badge-${h.status}`}>{h.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
