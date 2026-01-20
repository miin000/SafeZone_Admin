'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Case, CasesListResponse } from '@/types';
import { STATUS_COLORS, SEVERITY_LEVELS, getBilingualDiseaseLabel, getBilingualStatusLabel } from '@/types';
import CaseModal from '@/components/CaseModal';
import { deleteCase } from '@/hooks/useGisData';

const API = process.env.NEXT_PUBLIC_API_URL!;

// Navigation items
const navItems = [
  { href: '/', icon: '🗺️', label: 'Dashboard' },
  { href: '/stats', icon: '📊', label: 'Statistics' },
  { href: '/admin/reports', icon: '📋', label: 'Reports' },
  { href: '/admin', icon: '🏥', label: 'Cases' },
  { href: '/admin/zones', icon: '🚨', label: 'Zones' },
  { href: '/admin/posts', icon: '💬', label: 'Posts' },
  { href: '/admin/health-info', icon: '📚', label: 'Health Info' },
  { href: '/admin/notifications', icon: '🔔', label: 'Notifications' },
];

export default function AdminPage() {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
    <div style={containerStyle}>
      {/* Left Sidebar */}
      <aside style={{
        ...sidebarStyle,
        width: sidebarCollapsed ? 72 : 240,
      }}>
        <div style={logoContainerStyle}>
          <Link href="/" style={logoStyle}>
            <span style={{ fontSize: 26 }}>🛡️</span>
            {!sidebarCollapsed && <span style={logoTextStyle}>SafeZone</span>}
          </Link>
        </div>

        <nav style={navStyle}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  ...navItemStyle,
                  background: isActive ? 'linear-gradient(90deg, #10b981, #059669)' : 'transparent',
                  color: isActive ? '#fff' : '#64748b',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                }}
              >
                <span style={{ fontSize: 16, minWidth: 22 }}>{item.icon}</span>
                {!sidebarCollapsed && <span style={{ fontSize: 13 }}>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '12px', borderTop: '1px solid #e2e8f0' }}>
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={collapseButtonStyle}>
            {sidebarCollapsed ? '▶' : '◀'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div style={{
        ...mainContentStyle,
        marginLeft: sidebarCollapsed ? 72 : 240,
      }}>
        {/* Header */}
        <header style={headerStyle}>
          <div>
            <h1 style={pageTitleStyle}>🏥 Disease Cases</h1>
            <p style={pageSubtitleStyle}>Quản lý ca bệnh / Case Management</p>
          </div>
          <button
            onClick={() => {
              setEditingCaseId(null);
              setModalOpen(true);
            }}
            style={addButtonStyle}
          >
            + Thêm ca bệnh
          </button>
        </header>

        {/* Filters */}
        <div style={filtersContainerStyle}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={filterLabelStyle}>Tìm kiếm</label>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Tìm theo ID hoặc tên bệnh nhân..."
              style={inputStyle}
            />
          </div>
          <div style={{ flex: '0 0 160px' }}>
            <label style={filterLabelStyle}>Loại bệnh</label>
            <select value={diseaseType} onChange={(e) => { setDiseaseType(e.target.value); setPage(1); }} style={selectStyle}>
              <option value="ALL">Tất cả</option>
              {diseaseOptions.map((d) => (
                <option key={d} value={d}>{getBilingualDiseaseLabel(d)}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '0 0 160px' }}>
            <label style={filterLabelStyle}>Trạng thái</label>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} style={selectStyle}>
              <option value="ALL">Tất cả</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>{getBilingualStatusLabel(s)}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '0 0 140px' }}>
            <label style={filterLabelStyle}>Từ ngày</label>
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} style={selectStyle} />
          </div>
          <div style={{ flex: '0 0 140px' }}>
            <label style={filterLabelStyle}>Đến ngày</label>
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} style={selectStyle} />
          </div>
          <button onClick={handleResetFilters} style={resetButtonStyle}>
            🔄 Reset
          </button>
        </div>

        {/* Stats Summary */}
        {data && (
          <div style={statsRowStyle}>
            <StatCard label="Tổng kết quả" value={data.total} color="#3b82f6" />
            <StatCard label="Trang hiện tại" value={`${data.page} / ${data.totalPages}`} />
            <StatCard label="Đang hiển thị" value={`${data.data.length} ca`} />
          </div>
        )}

        {/* Table */}
        <div style={tableContainerStyle}>
          {loading ? (
            <div style={loadingStyle}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
              <div>Đang tải dữ liệu...</div>
            </div>
          ) : !data || data.data.length === 0 ? (
            <div style={loadingStyle}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
              <div>Không tìm thấy ca bệnh nào</div>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={thStyle}>ID</th>
                      <th style={thStyle}>Loại bệnh</th>
                      <th style={thStyle}>Trạng thái</th>
                      <th style={thStyle}>Mức độ</th>
                      <th style={thStyle}>Khu vực</th>
                      <th style={thStyle}>Ngày báo cáo</th>
                      <th style={thStyle}>Bệnh nhân</th>
                      <th style={{ ...thStyle, width: 100 }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((c) => (
                      <tr key={c.id} style={trStyle}>
                        <td style={tdStyle}>
                          <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>#{c.id}</span>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>{getBilingualDiseaseLabel(c.disease_type)}</span>
                        </td>
                        <td style={tdStyle}>
                          <span style={statusBadgeStyle(c.status)}>
                            <span style={statusDotStyle(c.status)} />
                            {getBilingualStatusLabel(c.status)}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span style={{
                            color: SEVERITY_LEVELS.find(s => s.value === c.severity)?.color || '#64748b',
                            fontWeight: 600,
                          }}>
                            {SEVERITY_LEVELS.find(s => s.value === c.severity)?.label || 'Unknown'}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ color: '#475569' }}>{c.region_name || '-'}</span>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ fontSize: 13, color: '#64748b' }}>
                            {new Date(c.reported_time).toLocaleDateString('vi-VN')}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          {c.patient_name ? (
                            <div>
                              <div style={{ fontWeight: 500, color: '#1e293b' }}>{c.patient_name}</div>
                              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                                {[c.patient_age && `${c.patient_age} tuổi`, c.patient_gender].filter(Boolean).join(', ')}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>-</span>
                          )}
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => { setEditingCaseId(c.id); setModalOpen(true); }}
                              style={actionBtnStyle}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ open: true, caseId: c.id })}
                              style={{ ...actionBtnStyle, borderColor: '#fecaca' }}
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
                <div style={paginationStyle}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={paginationBtnStyle}>
                    ← Trước
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
                          background: page === pageNum ? '#10b981' : '#fff',
                          color: page === pageNum ? '#fff' : '#475569',
                          borderColor: page === pageNum ? '#10b981' : '#e2e8f0',
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} style={paginationBtnStyle}>
                    Sau →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Case Modal */}
      <CaseModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingCaseId(null); }}
        caseId={editingCaseId}
        onSave={handleModalSave}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirm.open && (
        <div style={modalOverlayStyle}>
          <div style={confirmDialogStyle}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 18, color: '#1e293b' }}>Xóa ca bệnh?</h3>
            <p style={{ margin: '0 0 24px 0', color: '#64748b' }}>
              Hành động này không thể hoàn tác. Bạn có chắc muốn xóa ca bệnh #{deleteConfirm.caseId}?
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setDeleteConfirm({ open: false, caseId: null })} style={cancelBtnStyle}>
                Hủy
              </button>
              <button onClick={handleDelete} style={deleteBtnStyle}>
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// SUB COMPONENTS
// ============================================

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={statCardStyle}>
      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: color || '#1e293b', marginTop: 4 }}>{value}</div>
    </div>
  );
}

// ============================================
// STYLES
// ============================================

const containerStyle: React.CSSProperties = {
  display: 'flex',
  minHeight: '100vh',
  background: '#f1f5f9',
};

const sidebarStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  height: '100vh',
  background: '#fff',
  borderRight: '1px solid #e2e8f0',
  display: 'flex',
  flexDirection: 'column',
  transition: 'width 0.3s ease',
  zIndex: 1000,
};

const logoContainerStyle: React.CSSProperties = {
  padding: '18px 16px',
  borderBottom: '1px solid #e2e8f0',
};

const logoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  textDecoration: 'none',
};

const logoTextStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  background: 'linear-gradient(135deg, #10b981, #0ea5e9)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
};

const navStyle: React.CSSProperties = {
  flex: 1,
  padding: '12px 8px',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
};

const navItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 12px',
  borderRadius: 8,
  textDecoration: 'none',
  transition: 'all 0.2s',
};

const collapseButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px',
  borderRadius: 6,
  border: 'none',
  background: '#f1f5f9',
  color: '#64748b',
  cursor: 'pointer',
};

const mainContentStyle: React.CSSProperties = {
  flex: 1,
  transition: 'margin-left 0.3s ease',
};

const headerStyle: React.CSSProperties = {
  background: '#fff',
  padding: '20px 24px',
  borderBottom: '1px solid #e2e8f0',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const pageTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 24,
  fontWeight: 800,
  color: '#1e293b',
};

const pageSubtitleStyle: React.CSSProperties = {
  margin: '4px 0 0',
  fontSize: 14,
  color: '#64748b',
};

const addButtonStyle: React.CSSProperties = {
  padding: '12px 24px',
  borderRadius: 10,
  border: 'none',
  background: 'linear-gradient(135deg, #10b981, #059669)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};

const filtersContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: 16,
  padding: '16px 24px',
  background: '#fff',
  borderBottom: '1px solid #e2e8f0',
  flexWrap: 'wrap',
  alignItems: 'flex-end',
};

const filterLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#64748b',
  marginBottom: 6,
  textTransform: 'uppercase',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
  fontSize: 14,
  color: '#1e293b',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
  fontSize: 14,
  color: '#1e293b',
  cursor: 'pointer',
};

const resetButtonStyle: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  background: '#fff',
  color: '#475569',
  fontSize: 14,
  cursor: 'pointer',
};

const statsRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 16,
  padding: '16px 24px',
};

const statCardStyle: React.CSSProperties = {
  padding: '14px 20px',
  background: '#fff',
  borderRadius: 12,
  border: '1px solid #e2e8f0',
};

const tableContainerStyle: React.CSSProperties = {
  margin: '0 24px 24px',
  background: '#fff',
  borderRadius: 16,
  border: '1px solid #e2e8f0',
  overflow: 'hidden',
};

const loadingStyle: React.CSSProperties = {
  padding: 60,
  textAlign: 'center',
  color: '#64748b',
};

const thStyle: React.CSSProperties = {
  padding: '14px 16px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 700,
  color: '#64748b',
  textTransform: 'uppercase',
  borderBottom: '1px solid #e2e8f0',
};

const trStyle: React.CSSProperties = {
  borderBottom: '1px solid #f1f5f9',
  transition: 'background 0.2s',
  background: '#ffffff',
};

const tdStyle: React.CSSProperties = {
  padding: '14px 16px',
  fontSize: 14,
  color: '#1e293b',
  background: '#ffffff',
};

const statusBadgeStyle = (status: string): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 12px',
  borderRadius: 20,
  background: `${STATUS_COLORS[status] || '#94a3b8'}15`,
  fontSize: 12,
  fontWeight: 500,
});

const statusDotStyle = (status: string): React.CSSProperties => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: STATUS_COLORS[status] || '#94a3b8',
});

const actionBtnStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  background: '#fff',
  cursor: 'pointer',
  fontSize: 14,
  transition: 'all 0.2s',
};

const paginationStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: 8,
  padding: 16,
  borderTop: '1px solid #e2e8f0',
};

const paginationBtnStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  background: '#fff',
  color: '#475569',
  fontSize: 13,
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10000,
};

const confirmDialogStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 20,
  padding: 32,
  maxWidth: 400,
  textAlign: 'center',
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '12px 28px',
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  background: '#fff',
  color: '#475569',
  fontSize: 14,
  cursor: 'pointer',
};

const deleteBtnStyle: React.CSSProperties = {
  padding: '12px 28px',
  borderRadius: 10,
  border: 'none',
  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};
