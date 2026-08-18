import React, { useState, useEffect } from 'react';
import { AlertTriangle, Filter, Search, FileText } from 'lucide-react';
import { api } from '../services/api';
import { AnomalyItem } from '../types';

interface AnomaliesPageProps {
  initialCategory?: string;
  showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
}

export const AnomaliesPage: React.FC<AnomaliesPageProps> = ({ initialCategory, showToast }) => {
  const [categories, setCategories] = useState<Record<string, number>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'all');
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    api.getAnomalyCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const catQuery = selectedCategory === 'all' ? undefined : selectedCategory;
    api.getAnomalies(catQuery)
      .then(setAnomalies)
      .catch((err) => showToast('error', 'Error Loading Anomalies', err.message))
      .finally(() => setIsLoading(false));
  }, [selectedCategory]);

  const categoryLabels: Record<string, string> = {
    all: 'All Anomalies',
    auveco_missing_phantom: 'AuVeCo Missing Phantom',
    phantom_missing_auveco: 'Phantom Missing AuVeCo',
    both_missing: 'Both Cells Missing',
    missing_source_image: 'Missing Source Image',
    duplicate_auveco: 'Duplicate AuVeCo Serials',
    duplicate_phantom: 'Duplicate Phantom Serials',
    one_auveco_multi_phantom: '1 AuVeCo -> Multi Phantom',
    one_phantom_multi_auveco: '1 Phantom -> Multi AuVeCo',
    invalid_source_image: 'Invalid / Corrupt Source Image',
    unmapped_source_files: 'Unmapped Files in DATA_DIR'
  };

  const filteredAnomalies = anomalies.filter((a) => {
    if (!searchFilter) return true;
    const term = searchFilter.toLowerCase();
    return (
      (a.auveco && a.auveco.toLowerCase().includes(term)) ||
      (a.phantom && a.phantom.toLowerCase().includes(term)) ||
      (a.filename && a.filename.toLowerCase().includes(term)) ||
      (a.details && a.details.toLowerCase().includes(term)) ||
      (a.excel_row && a.excel_row.toString().includes(term))
    );
  });

  return (
    <div className="page-container">
      {/* Category Pills Header */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '18px', color: '#fff', margin: 0 }}>Anomalies & Data Integrity Explorer</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
              Detailed breakdown of Excel conflicts, missing files, duplicate serials, and unmapped images.
            </p>
          </div>
        </div>

        {/* Category Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {Object.keys(categoryLabels).map((catKey) => {
            const isSelected = selectedCategory === catKey;
            const cnt = catKey === 'all'
              ? Object.values(categories).reduce((a, b) => a + b, 0)
              : (categories[catKey] || 0);

            return (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '999px',
                  background: isSelected ? 'var(--accent-danger)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${isSelected ? 'transparent' : 'var(--border-color)'}`,
                  color: isSelected ? '#fff' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: isSelected ? 600 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>{categoryLabels[catKey]}</span>
                <span style={{
                  background: isSelected ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.1)',
                  padding: '1px 6px',
                  borderRadius: '999px',
                  fontSize: '11px'
                }}>
                  {cnt}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter & Data Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '320px' }}>
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search serials, rows, or filenames..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-color)',
                color: '#fff',
                fontSize: '13px'
              }}
            />
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Showing {filteredAnomalies.length} anomaly records
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading anomaly records...</div>
        ) : filteredAnomalies.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            No anomaly records found matching this category.
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Category</th>
                  <th>Excel Row</th>
                  <th>AuVeCo #</th>
                  <th>Phantom #</th>
                  <th>Filename</th>
                  <th>Anomaly Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredAnomalies.map((item) => (
                  <tr key={item.id}>
                    <td className="mono">#{item.id}</td>
                    <td>
                      <span className="badge badge-rejected" style={{ fontSize: '10px' }}>
                        {item.category}
                      </span>
                    </td>
                    <td className="mono" style={{ color: 'var(--accent-warning)' }}>
                      {item.excel_row ? `Row ${item.excel_row}` : '-'}
                    </td>
                    <td className="mono" style={{ color: '#fff', fontWeight: 600 }}>{item.auveco || '-'}</td>
                    <td className="mono" style={{ color: 'var(--accent-secondary)' }}>{item.phantom || '-'}</td>
                    <td className="mono" style={{ fontSize: '12px' }}>{item.filename || '-'}</td>
                    <td style={{ color: '#fca5a5', fontSize: '12px' }}>{item.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
