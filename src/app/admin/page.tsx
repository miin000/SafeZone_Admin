'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Case, CasesListResponse } from '@/types';
import { STATUS_COLORS, SEVERITY_LEVELS } from '@/types';
import CaseModal from '@/components/CaseModal';
import { deleteCase } from '@/hooks/useGisData';

const API = process.env.NEXT_PUBLIC_API_URL!;

export default function AdminPage() {
  const [data, setData] = useState<CasesListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [diseaseType, setDiseaseType] = useState<string>('ALL');
  const [status, setStatus] = useState<string>('ALL');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);

  // Confirmation dialog
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; caseId: string | null }>({
    open: false,
    caseId: null,
  });

  // Options for filters
  const [diseaseOptions, setDiseaseOptions] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);

  // Load options from stats
  useEffect(() => {
    fetch(`${API}/gis/stats`)
      .then(r => r.json())
      .then((stats) => {
        setDiseaseOptions((stats.byDisease || []).map((x: any) => x.disease_type));
        setStatusOptions((stats.byStatus || []).map((x: any) => x.status));
      })
      .catch(console.error);
  }, []);

  // Load cases
  const loadCases = useCallback(() => {
    const sp = new URLSearchParams();
    if (diseaseType !== 'ALL') sp.set('diseaseType', diseaseType);
    if (status !== 'ALL') sp.set('status', status);
    if (from) sp.set('from', from);
    if (to) sp.set('to', to);
    if (search) sp.set('search', search);
    sp.set('page', String(page));
    sp.set('limit', String(limit));

    setLoading(true);
    fetch(`${API}/gis/cases/list?${sp.toString()}`)
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [diseaseType, status, from, to, search, page, limit]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  // Handle delete
  const handleDelete = async () => {
    if (!deleteConfirm.caseId) return;
    
    try {
      await deleteCase(deleteConfirm.caseId);
      loadCases();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleteConfirm({ open: false, caseId: null });
    }
  };

  // Handle modal save
  const handleModalSave = () => {
    loadCases();
  };

  // Reset filters
  const handleResetFilters = () => {
    setDiseaseType('ALL');
    setStatus('ALL');
    setFrom('');
    setTo('');
    setSearch('');
    setPage(1);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      {/* Header */}
      <header style={{
        background: '#111',
        borderBottom: '1px solid #1a1a1a',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>🛡️ SafeZone Admin</h1>
          </a>
          <span style={{ opacity: 0.5, fontSize: 14 }}>Quản lý ca bệnh / Case Management</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <a 
            href="/"
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid #2a2a2a',
              background: 'transparent',
              color: 'inherit',
              textDecoration: 'none',
              fontSize: 14,
            }}
          >
            🗺️ Bản đồ
          </a>
          <a 
            href="/admin/reports"
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid #ff9800',
              background: '#ff980015',
              color: '#ff9800',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            📋 Duyệt báo cáo
          </a>
          <a 
            href="/admin/notifications"
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid #2a2a2a',
              background: 'transparent',
              color: 'inherit',
              textDecoration: 'none',
              fontSize: 14,
            }}
          >
            🔔 Thông báo
          </a>
          <button
            onClick={() => {
              setEditingCaseId(null);
              setModalOpen(true);
            }}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: '#2ca02c',
              color: 'white',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Thêm ca bệnh
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: 24 }}>
        {/* Filters */}
        <div style={{
          background: '#111',
          borderRadius: 12,
          border: '1px solid #1a1a1a',
          padding: 20,
          marginBottom: 24,
        }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={labelStyle}>Tìm kiếm / Search</label>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm theo ID hoặc tên bệnh nhân..."
                style={inputStyle}
              />
            </div>
            <div style={{ flex: '0 0 160px' }}>
              <label style={labelStyle}>Loại bệnh / Disease Type</label>
              <select
                value={diseaseType}
                onChange={(e) => {
                  setDiseaseType(e.target.value);
                  setPage(1);
                }}
                style={inputStyle}
              >
                <option value="ALL">All Diseases</option>
                {diseaseOptions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: '0 0 160px' }}>
              <label style={labelStyle}>Status</label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                style={inputStyle}
              >
                <option value="ALL">All Statuses</option>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: '0 0 140px' }}>
              <label style={labelStyle}>From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: '0 0 140px' }}>
              <label style={labelStyle}>To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
                style={inputStyle}
              />
            </div>
            <button
              onClick={handleResetFilters}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: '1px solid #2a2a2a',
                background: 'transparent',
                color: 'inherit',
                fontSize: 14,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        {data && (
          <div style={{
            display: 'flex',
            gap: 16,
            marginBottom: 24,
          }}>
            <StatCard label="Total Results" value={data.total} />
            <StatCard label="Current Page" value={`${data.page} / ${data.totalPages}`} />
            <StatCard label="Showing" value={`${data.data.length} cases`} />
          </div>
        )}

        {/* Table */}
        <div style={{
          background: '#111',
          borderRadius: 12,
          border: '1px solid #1a1a1a',
          overflow: 'hidden',
        }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', opacity: 0.7 }}>
              Loading cases...
            </div>
          ) : !data || data.data.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', opacity: 0.7 }}>
              No cases found
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#0a0a0a' }}>
                      <th style={thStyle}>ID</th>
                      <th style={thStyle}>External ID</th>
                      <th style={thStyle}>Disease</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Severity</th>
                      <th style={thStyle}>Region</th>
                      <th style={thStyle}>Reported</th>
                      <th style={thStyle}>Patient</th>
                      <th style={{ ...thStyle, width: 120 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((c) => (
                      <tr key={c.id} style={{ borderTop: '1px solid #1a1a1a' }}>
                        <td style={tdStyle}>
                          <span style={{ fontFamily: 'monospace', opacity: 0.7 }}>#{c.id}</span>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
                            {c.external_id || '-'}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ fontWeight: 600 }}>{c.disease_type}</span>
                        </td>
                        <td style={tdStyle}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 10px',
                            borderRadius: 20,
                            background: `${STATUS_COLORS[c.status] || '#7f7f7f'}20`,
                            fontSize: 12,
                            textTransform: 'capitalize',
                          }}>
                            <span style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: STATUS_COLORS[c.status] || '#7f7f7f',
                            }} />
                            {c.status}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span style={{
                            color: SEVERITY_LEVELS.find(s => s.value === c.severity)?.color || '#7f7f7f',
                            fontWeight: 700,
                          }}>
                            {SEVERITY_LEVELS.find(s => s.value === c.severity)?.label || 'Unknown'}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          {c.region_name || '-'}
                        </td>
                        <td style={tdStyle}>
                          <span style={{ fontSize: 13 }}>
                            {new Date(c.reported_time).toLocaleDateString()}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          {c.patient_name ? (
                            <div>
                              <div style={{ fontWeight: 500 }}>{c.patient_name}</div>
                              <div style={{ fontSize: 12, opacity: 0.6 }}>
                                {[c.patient_age && `${c.patient_age}y`, c.patient_gender].filter(Boolean).join(', ')}
                              </div>
                            </div>
                          ) : (
                            <span style={{ opacity: 0.5 }}>-</span>
                          )}
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => {
                                setEditingCaseId(c.id);
                                setModalOpen(true);
                              }}
                              style={actionBtnStyle}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ open: true, caseId: c.id })}
                              style={{ ...actionBtnStyle, borderColor: '#d62728' }}
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data.totalPages > 1 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 8,
                  padding: 16,
                  borderTop: '1px solid #1a1a1a',
                }}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={paginationBtnStyle}
                  >
                    ← Previous
                  </button>
                  
                  {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (data.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= data.totalPages - 2) {
                      pageNum = data.totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        style={{
                          ...paginationBtnStyle,
                          background: page === pageNum ? '#1f77b4' : 'transparent',
                          borderColor: page === pageNum ? '#1f77b4' : '#2a2a2a',
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                    disabled={page === data.totalPages}
                    style={paginationBtnStyle}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Case Modal */}
      <CaseModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingCaseId(null);
        }}
        caseId={editingCaseId}
        onSave={handleModalSave}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirm.open && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
        }}>
          <div style={{
            background: '#0a0a0a',
            borderRadius: 16,
            border: '1px solid #2a2a2a',
            padding: 24,
            maxWidth: 400,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>⚠️</div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 18 }}>Delete Case?</h3>
            <p style={{ margin: '0 0 24px 0', opacity: 0.7 }}>
              This action cannot be undone. Are you sure you want to delete case #{deleteConfirm.caseId}?
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setDeleteConfirm({ open: false, caseId: null })}
                style={{
                  padding: '10px 24px',
                  borderRadius: 8,
                  border: '1px solid #2a2a2a',
                  background: 'transparent',
                  color: 'inherit',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                style={{
                  padding: '10px 24px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#d62728',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      background: '#111',
      borderRadius: 10,
      border: '1px solid #1a1a1a',
      padding: '12px 20px',
    }}>
      <div style={{ opacity: 0.6, fontSize: 12, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{value}</div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  opacity: 0.7,
  marginBottom: 6,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #2a2a2a',
  background: '#0a0a0a',
  color: 'inherit',
  fontSize: 14,
};

const thStyle: React.CSSProperties = {
  padding: '14px 16px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  opacity: 0.7,
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: 14,
};

const actionBtnStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #2a2a2a',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 14,
};

const paginationBtnStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 6,
  border: '1px solid #2a2a2a',
  background: 'transparent',
  color: 'inherit',
  fontSize: 13,
  cursor: 'pointer',
};
