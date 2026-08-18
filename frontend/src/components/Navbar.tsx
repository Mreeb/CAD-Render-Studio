import React from 'react';
import {
  Download,
  Layers,
  PlaySquare,
  CheckSquare,
  Settings,
  Sparkles
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingReviewCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  pendingReviewCount
}) => {
  const navItems = [
    { id: 'downloader', label: 'Downloader', icon: Download },
    { id: 'convert', label: 'Convert Renders', icon: Layers },
    { id: 'queue', label: 'Live Queue', icon: PlaySquare },
    {
      id: 'review',
      label: 'Review & Approval',
      icon: CheckSquare,
      badge: pendingReviewCount > 0 ? pendingReviewCount : null,
      badgeColor: 'var(--accent-warning)'
    },
    { id: 'settings', label: 'Settings & Status', icon: Settings },
  ];

  return (
    <aside style={{
      width: '240px',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      padding: '18px 12px',
      flexShrink: 0
    }}>
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 8px 20px 8px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--accent-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Sparkles size={16} color="#fff" />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>CAD Render Studio</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Product Ops Engine</div>
        </div>
      </div>

      {/* Navigation List */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id || (activeTab === 'batch' && item.id === 'convert') || (activeTab === 'single' && item.id === 'convert');
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`nav-item-btn ${isActive ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                background: isActive ? '#171D27' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: '1px solid',
                borderColor: isActive ? 'rgba(79, 124, 255, 0.4)' : 'transparent',
                fontWeight: isActive ? 600 : 400,
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon size={16} color={isActive ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span style={{
                  background: item.badgeColor || 'var(--accent-primary)',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div style={{
        padding: '10px 12px',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        fontSize: '11px',
        color: 'var(--text-muted)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-success)', fontWeight: 600, marginBottom: '2px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
          GPT Image 2 Ready
        </div>
        <div>Model: gpt-image-2 (Medium/High)</div>
      </div>
    </aside>
  );
};
