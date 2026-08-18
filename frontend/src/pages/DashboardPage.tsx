import React, { useState, useEffect, useRef } from 'react';
import {
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Play,
  AlertTriangle,
  ArrowRight,
  Activity,
  AlertCircle
} from 'lucide-react';
import { AnalyticsSummary } from '../types';

interface DashboardPageProps {
  analytics: AnalyticsSummary | null;
  onNavigate: (tab: string, filter?: string) => void;
}

// Smooth interpolated metric counter (400-600ms easeOutCubic)
const AnimatedCounter: React.FC<{ value: number; duration?: number }> = ({ value, duration = 500 }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = value;
    if (startValue === endValue) return;

    let startTime: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
      const current = Math.round(startValue + (endValue - startValue) * eased);
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        prevValueRef.current = endValue;
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value, duration]);

  return <>{displayValue.toLocaleString()}</>;
};

// Restrained Skeleton Shimmer for dashboard loading state
const DashboardSkeleton: React.FC = () => (
  <div className="page-container" style={{ maxWidth: '1280px' }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="dashboard-card skeleton-box" style={{ height: '88px' }} />
      ))}
    </div>
    <div className="dashboard-card skeleton-box" style={{ height: '100px', marginBottom: '24px' }} />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      <div className="dashboard-card skeleton-box" style={{ height: '190px' }} />
      <div className="dashboard-card skeleton-box" style={{ height: '190px' }} />
    </div>
  </div>
);

export const DashboardPage: React.FC<DashboardPageProps> = ({ analytics, onNavigate }) => {
  if (!analytics) {
    return <DashboardSkeleton />;
  }

  const processingTotal = analytics.total_queued + analytics.total_processing;
  const hasFailures = analytics.total_failed > 0;

  const topAnomalies = [
    { key: 'auveco_missing_phantom', label: 'AuVeCo Missing Phantom', count: analytics.auveco_missing_phantom_count },
    { key: 'phantom_missing_auveco', label: 'Phantom Missing AuVeCo', count: analytics.phantom_missing_auveco_count },
    { key: 'both_missing', label: 'Both Missing', count: analytics.both_missing_count },
    { key: 'missing_source_image', label: 'Missing Source Image', count: analytics.missing_source_image_count },
    { key: 'unmapped_source_files', label: 'Unmapped Source Files', count: analytics.unmapped_source_files_count },
  ]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const totalDataIssues =
    analytics.auveco_missing_phantom_count +
    analytics.phantom_missing_auveco_count +
    analytics.both_missing_count +
    analytics.missing_source_image_count +
    analytics.duplicate_auveco_count +
    analytics.duplicate_phantom_count +
    analytics.one_auveco_multi_phantom_count +
    analytics.one_phantom_multi_auveco_count +
    analytics.invalid_source_image_count +
    analytics.unmapped_source_files_count;

  // Compact recent system activity log
  const recentActivities = [
    {
      id: 1,
      text: `${analytics.total_approved.toLocaleString()} CAD renders approved for production`,
      type: 'success',
      time: 'Completed'
    },
    {
      id: 2,
      text: `${analytics.total_awaiting_review.toLocaleString()} CAD renders currently awaiting review`,
      type: 'warning',
      time: 'Pending'
    },
    {
      id: 3,
      text: `Database & disk reconciled (${analytics.total_valid_excel_mappings.toLocaleString()} valid mappings)`,
      type: 'info',
      time: analytics.last_reconciled_at || 'Startup'
    }
  ];

  return (
    <div className="page-container" style={{ maxWidth: '1280px' }}>
      {/* 1. Four Primary Metric Cards (+ Failed Jobs conditionally) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: hasFailures ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        {/* Metric 1: Remaining Eligible */}
        <div
          className="dashboard-card metrics-card"
          onClick={() => onNavigate('convert')}
          style={{ animationDelay: '0ms' }}
        >
          <div className="metrics-card-header">
            <span>Remaining Eligible</span>
            <div className="metrics-card-icon" style={{ color: '#4F7CFF' }}>
              <ImageIcon size={15} />
            </div>
          </div>
          <div className="metrics-card-value">
            <AnimatedCounter value={analytics.total_remaining} />
          </div>
        </div>

        {/* Metric 2: Processing (Queued & Active combined) */}
        <div
          className="dashboard-card metrics-card"
          onClick={() => onNavigate('queue')}
          style={{ animationDelay: '50ms' }}
        >
          <div className="metrics-card-header">
            <span>Processing (Queued & Active)</span>
            <div className="metrics-card-icon" style={{ color: '#4F7CFF' }}>
              <Play size={15} />
            </div>
          </div>
          <div className="metrics-card-value">
            <AnimatedCounter value={processingTotal} />
          </div>
        </div>

        {/* Metric 3: Awaiting Review */}
        <div
          className="dashboard-card metrics-card"
          onClick={() => onNavigate('review')}
          style={{
            animationDelay: '100ms',
            borderColor: analytics.total_awaiting_review > 0 ? 'rgba(214, 161, 59, 0.4)' : undefined
          }}
        >
          <div className="metrics-card-header">
            <span>Awaiting Review</span>
            <div className="metrics-card-icon" style={{ color: '#D6A13B' }}>
              <Clock size={15} />
            </div>
          </div>
          <div className="metrics-card-value">
            <AnimatedCounter value={analytics.total_awaiting_review} />
          </div>
        </div>

        {/* Metric 4: Approved Renders */}
        <div
          className="dashboard-card metrics-card"
          onClick={() => onNavigate('review')}
          style={{ animationDelay: '150ms' }}
        >
          <div className="metrics-card-header">
            <span>Approved Renders</span>
            <div className="metrics-card-icon" style={{ color: '#2FBF8F' }}>
              <CheckCircle2 size={15} />
            </div>
          </div>
          <div className="metrics-card-value" style={{ color: '#2FBF8F' }}>
            <AnimatedCounter value={analytics.total_approved} />
          </div>
        </div>

        {/* Conditional Metric 5: Failed Jobs */}
        {hasFailures && (
          <div
            className="dashboard-card metrics-card"
            onClick={() => onNavigate('queue')}
            style={{ animationDelay: '200ms', borderColor: 'rgba(224, 82, 82, 0.4)' }}
          >
            <div className="metrics-card-header">
              <span>Failed Jobs</span>
              <div className="metrics-card-icon" style={{ color: '#E05252' }}>
                <AlertCircle size={15} />
              </div>
            </div>
            <div className="metrics-card-value" style={{ color: '#E05252' }}>
              <AnimatedCounter value={analytics.total_failed} />
            </div>
          </div>
        )}
      </div>

      {/* 2. One Slim Overall Completion Bar Card */}
      <div className="dashboard-card" style={{ padding: '20px 24px', marginBottom: '24px', animationDelay: '200ms' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Overall CAD Reconstruction Progress
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '12px' }}>
              {analytics.completion_percentage}% Completed (<AnimatedCounter value={analytics.total_approved} /> approved)
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Approval Rate: <strong style={{ color: '#2FBF8F' }}>{analytics.approval_rate}%</strong>
          </div>
        </div>

        {/* Progress Bar with Moving Shimmer Highlight only while processing */}
        <div className="slim-progress-bg">
          <div
            className={`slim-progress-fill ${processingTotal > 0 ? 'processing' : ''}`}
            style={{ width: `${analytics.completion_percentage}%` }}
          />
        </div>

        {/* Secondary System Metadata */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', gap: '20px' }}>
            <span>Source Images: <strong style={{ color: 'var(--text-secondary)' }}><AnimatedCounter value={analytics.total_images_in_data_dir} /></strong></span>
            <span>Excel Mappings: <strong style={{ color: 'var(--text-secondary)' }}><AnimatedCounter value={analytics.total_valid_excel_mappings} /></strong></span>
            <span>Model: <strong style={{ color: 'var(--text-secondary)' }}>gpt-image-2 (1536x1024)</strong></span>
          </div>
          <div>
            Last Reconciled: <strong style={{ color: 'var(--text-secondary)' }}>{analytics.last_reconciled_at || 'Startup'}</strong>
          </div>
        </div>
      </div>

      {/* 3. Two Side-by-Side Compact Panels: Data Issues & Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Left Panel: Data Issues */}
        <div className="dashboard-card" style={{ padding: '20px', animationDelay: '250ms' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={15} color="#D6A13B" />
              <h3 style={{ fontSize: '14px', margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>
                Data Issues (<AnimatedCounter value={totalDataIssues} />)
              </h3>
            </div>
            <button
              onClick={() => onNavigate('anomalies')}
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: '11px' }}
            >
              <span>View all categories</span>
              <ArrowRight size={12} className="arrow-icon" />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {topAnomalies.map((item) => (
              <div
                key={item.key}
                onClick={() => onNavigate('anomalies', item.key)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
                className="anomaly-row-item"
              >
                <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 600, color: item.count > 0 ? '#E05252' : 'var(--text-muted)' }}>
                    <AnimatedCounter value={item.count} />
                  </span>
                  <ArrowRight size={13} className="arrow-icon" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: Recent System Activity with Slide-in animation */}
        <div className="dashboard-card" style={{ padding: '20px', animationDelay: '300ms' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Activity size={15} color="#4F7CFF" />
            <h3 style={{ fontSize: '14px', margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>
              Recent System Activity
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentActivities.map((act, idx) => (
              <div
                key={act.id}
                className="activity-row-entry"
                style={{
                  animationDelay: `${idx * 60}ms`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-elevated)',
                  borderLeft: `3px solid ${act.type === 'success' ? '#2FBF8F' : act.type === 'warning' ? '#D6A13B' : '#4F7CFF'}`
                }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>{act.text}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '12px', flexShrink: 0 }}>{act.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
