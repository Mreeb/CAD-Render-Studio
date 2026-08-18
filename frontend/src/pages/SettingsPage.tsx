import React, { useState } from 'react';
import {
  Settings,
  Key,
  RefreshCw,
  Save,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { SystemHealth } from '../types';
import { api } from '../services/api';

interface SettingsPageProps {
  health: SystemHealth | null;
  onReconcile: () => void;
  isReconciling: boolean;
  showToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ health, onReconcile, isReconciling, showToast }) => {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKeyText, setShowKeyText] = useState(false);
  
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [isDeletingKey, setIsDeletingKey] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [lastReconcileStats, setLastReconcileStats] = useState<any>(null);

  const isConfigured = health?.openai_api_key_configured;

  // Format validation
  const keyToValidate = apiKeyInput.trim();
  const isValidFormat = !keyToValidate || keyToValidate.startsWith('sk-');
  const isInputEmpty = !keyToValidate;

  const handleSaveKey = async () => {
    if (!keyToValidate) {
      if (showToast) showToast('warning', 'API Key Required', 'Please enter a valid OpenAI API key.');
      return;
    }
    if (!isValidFormat) {
      if (showToast) showToast('error', 'Invalid Key Format', 'OpenAI API keys typically start with "sk-".');
      return;
    }

    setIsSavingKey(true);
    setTestResult(null);
    try {
      await api.saveApiKey(keyToValidate);
      if (showToast) showToast('success', 'API Key Saved', 'Key updated and stored locally in environment configuration.');
      setApiKeyInput('');
      onReconcile();
    } catch (err: any) {
      if (showToast) showToast('error', 'Error Saving Key', err.message);
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleTestKey = async () => {
    setIsTestingKey(true);
    setTestResult(null);
    try {
      const res = await api.testApiKey(keyToValidate || undefined);
      setTestResult({ success: true, message: res.message });
      if (showToast) showToast('success', 'OpenAI Connection Test', res.message);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
      if (showToast) showToast('error', 'Test Failed', err.message);
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleDeleteKey = async () => {
    setIsDeletingKey(true);
    setTestResult(null);
    try {
      await api.deleteApiKey();
      if (showToast) showToast('warning', 'API Key Deleted', 'The API key has been removed.');
      setApiKeyInput('');
      setConfirmDelete(false);
      onReconcile();
    } catch (err: any) {
      if (showToast) showToast('error', 'Error Deleting Key', err.message);
    } finally {
      setIsDeletingKey(false);
    }
  };

  const handleReconcileClick = async () => {
    try {
      const res = await api.reconcile();
      setLastReconcileStats(res.stats);
      onReconcile();
    } catch (err: any) {
      if (showToast) showToast('error', 'Reconciliation Error', err.message);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '820px' }}>
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '20px' }}>
        
        {/* Compact Title Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            padding: '8px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent-primary)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Settings size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: '16px', color: 'var(--text-primary)', margin: 0, fontWeight: 600 }}>System Settings & Key Management</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
              Configure your OpenAI API credentials and run disk/database state reconciliations.
            </p>
          </div>
        </div>

        {/* Compact API Key Panel */}
        <div style={{
          padding: '16px 18px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-elevated)',
          border: `1px solid ${isConfigured ? 'rgba(47, 191, 143, 0.3)' : 'rgba(224, 82, 82, 0.3)'}`,
          marginBottom: '18px'
        }}>
          {/* Status Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={16} color={isConfigured ? '#2FBF8F' : '#E05252'} />
              <div>
                <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', marginRight: '6px' }}>
                  OpenAI API Key:
                </span>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: isConfigured ? '#2FBF8F' : '#E05252'
                }}>
                  {isConfigured ? 'Configured & Active' : 'Missing / Not Configured'}
                </span>
              </div>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={13} color="var(--accent-primary)" />
              <span>Stored locally in environment configuration</span>
            </div>
          </div>

          {/* Form Input Section */}
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              {isConfigured ? 'Update API Key (Optional):' : 'Enter OpenAI API Key:'}
            </label>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                <input
                  type={showKeyText ? 'text' : 'password'}
                  placeholder={isConfigured ? 'Paste new key to update (e.g. sk-proj-...)' : 'sk-proj-...'}
                  value={apiKeyInput}
                  onChange={(e) => {
                    setApiKeyInput(e.target.value);
                    setTestResult(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 36px 8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--input-bg)',
                    border: `1px solid ${!isValidFormat ? '#E05252' : 'var(--border-color)'}`,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowKeyText(!showKeyText)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title={showKeyText ? 'Hide API Key' : 'Show API Key'}
                >
                  {showKeyText ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Action Buttons */}
              <button
                type="button"
                onClick={handleSaveKey}
                disabled={isSavingKey || isInputEmpty || !isValidFormat}
                className="btn btn-primary"
                style={{ padding: '8px 14px' }}
              >
                {isConfigured ? <Edit3 size={14} /> : <Save size={14} />}
                <span>{isSavingKey ? 'Saving...' : isConfigured ? 'Update Key' : 'Save Key'}</span>
              </button>

              <button
                type="button"
                onClick={handleTestKey}
                disabled={isTestingKey || (!isConfigured && isInputEmpty)}
                className="btn btn-secondary"
                style={{ padding: '8px 12px', fontSize: '12px' }}
                title="Test OpenAI API Connection"
              >
                <Zap size={14} color={isTestingKey ? 'var(--accent-warning)' : 'var(--accent-primary)'} />
                <span>{isTestingKey ? 'Testing...' : 'Test Connection'}</span>
              </button>
            </div>

            {!isValidFormat && (
              <div style={{ fontSize: '11px', color: '#E05252', marginTop: '4px' }}>
                Invalid key format. OpenAI keys usually begin with "sk-".
              </div>
            )}
          </div>

          {/* Inline Test Result Badge */}
          {testResult && (
            <div style={{
              marginTop: '8px',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: testResult.success ? '#132922' : '#2B1818',
              border: `1px solid ${testResult.success ? 'rgba(47, 191, 143, 0.3)' : 'rgba(224, 82, 82, 0.3)'}`,
              color: testResult.success ? '#2FBF8F' : '#E05252'
            }}>
              {testResult.success ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Low-Prominence Subtle Delete Action */}
          {isConfigured && (
            <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px border var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 0',
                    textDecoration: 'underline',
                    opacity: 0.8
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#E05252')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  <Trash2 size={11} />
                  <span>Remove API Key</span>
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#E05252' }}>
                  <span>Delete saved key from environment?</span>
                  <button
                    onClick={handleDeleteKey}
                    disabled={isDeletingKey}
                    className="btn btn-danger"
                    style={{ padding: '3px 8px', fontSize: '11px' }}
                  >
                    {isDeletingKey ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '11px' }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reconciliation Details Section */}
        <div style={{
          padding: '16px 18px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h4 style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0, fontWeight: 600 }}>
                System Database & Disk Reconciliation
              </h4>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={12} />
                <span>Last Run: <strong>{lastReconcileStats?.timestamp || 'Startup'}</strong></span>
                <span>• Status: <strong style={{ color: isReconciling ? 'var(--accent-warning)' : 'var(--accent-success)' }}>{isReconciling ? 'Running...' : 'Idle'}</strong></span>
              </div>
            </div>

            <button
              onClick={handleReconcileClick}
              disabled={isReconciling}
              className="btn btn-primary"
              style={{ padding: '7px 14px', fontSize: '12px' }}
            >
              <RefreshCw size={13} className={isReconciling ? 'spin' : ''} />
              <span>{isReconciling ? 'Reconciling...' : 'Run Full Reconciliation'}</span>
            </button>
          </div>

          {/* Last Run Results Summary */}
          {lastReconcileStats && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '8px',
              padding: '10px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              fontSize: '12px'
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Rows Scanned</span>
                <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{lastReconcileStats.rows_scanned?.toLocaleString()}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Valid Mappings</span>
                <strong style={{ color: '#2FBF8F', fontSize: '13px' }}>{lastReconcileStats.valid_mappings?.toLocaleString()}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Anomalies Logged</span>
                <strong style={{ color: '#E05252', fontSize: '13px' }}>{lastReconcileStats.anomalies_logged?.toLocaleString()}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Resumable Jobs Reset</span>
                <strong style={{ color: '#4F7CFF', fontSize: '13px' }}>{lastReconcileStats.resumable_jobs_reset}</strong>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
