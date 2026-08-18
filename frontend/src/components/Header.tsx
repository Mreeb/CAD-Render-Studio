import React from 'react';
import { AnalyticsSummary } from '../types';
import { ImageIcon, Play, Clock, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  analytics?: AnalyticsSummary | null;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, analytics }) => {
  const processingTotal = (analytics?.total_queued || 0) + (analytics?.total_processing || 0);

  return (
    <header style={{
      height: '58px',
      borderBottom: '1px solid var(--border-color)',
      padding: '0 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'var(--bg-secondary)',
      flexShrink: 0
    }}>
      <div>
        <h1 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>{title}</h1>
        {subtitle && <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>{subtitle}</p>}
      </div>

      {/* Compact Persistent Status Bar (4 Live Statistics) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '6px 16px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        fontSize: '12px'
      }}>
        {/* Metric 1: Remaining Eligible */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title="Remaining Eligible Images">
          <ImageIcon size={13} color="#4F7CFF" />
          <span style={{ color: 'var(--text-muted)' }}>Eligible:</span>
          <strong style={{ color: 'var(--text-primary)' }}>{(analytics?.total_remaining || 0).toLocaleString()}</strong>
        </div>

        <div style={{ width: '1px', height: '14px', background: 'var(--border-color)' }} />

        {/* Metric 2: Processing */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title="Processing (Queued & Active)">
          <Play size={13} color="#4F7CFF" />
          <span style={{ color: 'var(--text-muted)' }}>Processing:</span>
          <strong style={{ color: 'var(--text-primary)' }}>{processingTotal.toLocaleString()}</strong>
        </div>

        <div style={{ width: '1px', height: '14px', background: 'var(--border-color)' }} />

        {/* Metric 3: Awaiting Review */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title="Awaiting Review">
          <Clock size={13} color="#D6A13B" />
          <span style={{ color: 'var(--text-muted)' }}>Review:</span>
          <strong style={{ color: (analytics?.total_awaiting_review || 0) > 0 ? '#D6A13B' : 'var(--text-primary)' }}>
            {(analytics?.total_awaiting_review || 0).toLocaleString()}
          </strong>
        </div>

        <div style={{ width: '1px', height: '14px', background: 'var(--border-color)' }} />

        {/* Metric 4: Approved Renders */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title="Approved CAD Renders">
          <CheckCircle2 size={13} color="#2FBF8F" />
          <span style={{ color: 'var(--text-muted)' }}>Approved:</span>
          <strong style={{ color: '#2FBF8F' }}>{(analytics?.total_approved || 0).toLocaleString()}</strong>
        </div>
      </div>
    </header>
  );
};
