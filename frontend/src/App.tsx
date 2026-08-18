import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { AnalyticsSummary, SystemHealth } from './types';

import { Navbar } from './components/Navbar';
import { Header } from './components/Header';
import { ToastContainer, ToastMessage } from './components/Toast';

import { ConvertPage } from './pages/ConvertPage';
import { QueuePage } from './pages/QueuePage';
import { ReviewPage } from './pages/ReviewPage';
import { DownloaderPage } from './pages/DownloaderPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  // Convert Renders is the default landing page
  const [activeTab, setActiveTab] = useState<string>('convert');

  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchSummaryData = async () => {
    try {
      const [aData, hData] = await Promise.all([
        api.getAnalytics(),
        api.getHealth()
      ]);
      setAnalytics(aData);
      setHealth(hData);
    } catch (err: any) {
      console.error('Failed fetching summary data:', err);
    }
  };

  useEffect(() => {
    fetchSummaryData();
    const interval = setInterval(fetchSummaryData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleReconcile = async () => {
    setIsReconciling(true);
    try {
      const res = await api.reconcile();
      showToast('success', 'Reconciliation Complete', `Synced ${res.stats.rows_scanned} rows & updated database.`);
      await fetchSummaryData();
    } catch (err: any) {
      showToast('error', 'Reconciliation Error', err.message);
    } finally {
      setIsReconciling(false);
    }
  };

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
  };

  const pageTitleMap: Record<string, string> = {
    downloader: 'Image Downloader',
    convert: 'Convert CAD Renders',
    batch: 'Convert CAD Renders',
    single: 'Convert CAD Renders',
    queue: 'Live Queue & Processing',
    review: 'Review & Approval Workflow',
    settings: 'System Settings & Status'
  };

  const pendingCount = analytics?.total_awaiting_review || 0;

  return (
    <div className="app-container">
      {/* Sidebar Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleNavigate}
        pendingReviewCount={pendingCount}
      />

      {/* Main Content Area */}
      <div className="main-content">
        <Header
          title={pageTitleMap[activeTab] || 'CAD Render Studio'}
          subtitle="AI-Powered Engineering Product CAD Reconstruction"
          analytics={analytics}
        />

        <main style={{ flex: 1, overflowY: 'auto' }}>
          {(activeTab === 'convert' || activeTab === 'batch') && (
            <ConvertPage analytics={analytics} onNavigate={handleNavigate} showToast={showToast} initialMode="batch" />
          )}
          {activeTab === 'single' && (
            <ConvertPage analytics={analytics} onNavigate={handleNavigate} showToast={showToast} initialMode="single" />
          )}
          {activeTab === 'queue' && <QueuePage showToast={showToast} />}
          {activeTab === 'review' && <ReviewPage showToast={showToast} />}
          {activeTab === 'downloader' && <DownloaderPage showToast={showToast} />}
          {activeTab === 'settings' && <SettingsPage health={health} onReconcile={handleReconcile} isReconciling={isReconciling} showToast={showToast} />}
        </main>
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
};

export default App;
