'use client';

import { useState, useCallback, useEffect } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { ADMIN_NAV_ITEMS } from '@/constants/navigation';
import type { Case, CasesListResponse } from '@/types';
import { STATUS_COLORS, SEVERITY_LEVELS, getBilingualDiseaseLabel, getBilingualStatusLabel } from '@/types';
import CaseModal from '@/components/CaseModal';
import { deleteCase } from '@/hooks/useGisData';

const API = process.env.NEXT_PUBLIC_API_URL!;

// Use shared navigation items
const navItems = ADMIN_NAV_ITEMS;

export default function AdminPage() {
  const [data, setData] = useState<CasesListResponse | null>(null);
  const [loading, setLoading] = useState(true);
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
    <div className="flex">
      <Sidebar navItems={navItems} />
      <main className="flex-1 ml-64">
        <Header />
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">🩺 Quản lý ca bệnh</h1>
            <p className="text-sm text-slate-500">Theo dõi và quản lý các ca bệnh báo cáo</p>
          </div>
          <button
            onClick={() => {
              setEditingCaseId(null);
              setModalOpen(true);
            }}
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold hover:shadow-lg transition-shadow"
          >
            + Thêm ca bệnh
          </button>
        </div>

        <div className="p-6 bg-slate-50 min-h-[calc(100vh-200px)]">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6 bg-white rounded-lg p-4 border border-slate-200">
            <div className="flex-1 min-w-52">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Tìm kiếm</label>
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Tìm theo ID hoặc tên bệnh nhân..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex-1 min-w-40">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Loại bệnh</label>
              <select
                value={diseaseType}
                onChange={(e) => { setDiseaseType(e.target.value); setPage(1); }}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Tất cả</option>
                {diseaseOptions.map((d) => (
                  <option key={d} value={d}>{getBilingualDiseaseLabel(d)}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-40">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Trạng thái</label>
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Tất cả</option>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{getBilingualStatusLabel(s)}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-36">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Từ ngày</label>
              <input
                type="date"
                value={from}
                onChange={(e) => { setFrom(e.target.value); setPage(1); }}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex-1 min-w-36">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Đến ngày</label>
              <input
                type="date"
                value={to}
                onChange={(e) => { setTo(e.target.value); setPage(1); }}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleResetFilters}
                className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm hover:bg-slate-50 transition-colors"
              >
                🔄 Reset
              </button>
            </div>
          </div>

          {/* Stats Summary */}
          {data && (
            <div className="flex gap-4 mb-6">
              <StatCard label="Tổng kết quả" value={data.total} color="#3b82f6" />
              <StatCard label="Trang hiện tại" value={`${data.page} / ${data.totalPages}`} />
              <StatCard label="Đang hiển thị" value={`${data.data.length} ca`} />
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="py-16 text-center">
                <div className="text-5xl mb-4">⏳</div>
                <div className="text-slate-600">Đang tải dữ liệu...</div>
              </div>
            ) : !data || data.data.length === 0 ? (
              <div className="py-16 text-center">
                <div className="text-5xl mb-4">📋</div>
                <div className="text-slate-600">Không tìm thấy ca bệnh nào</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Loại bệnh</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Trạng thái</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Mức độ</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Khu vực</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Ngày báo cáo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Bệnh nhân</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase w-24">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((c) => (
                      <tr key={c.id} className="border-t border-slate-200 hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm">
                          <span className="font-mono text-xs text-slate-500">#{c.id}</span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">{getBilingualDiseaseLabel(c.disease_type)}</td>
                        <td className="px-4 py-3 text-sm">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold">
                          <span style={{ color: SEVERITY_LEVELS.find(s => s.value === c.severity)?.color || '#64748b' }}>
                            {SEVERITY_LEVELS.find(s => s.value === c.severity)?.label || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{c.region_name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {new Date(c.reported_time).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {c.patient_name ? (
                            <div>
                              <div className="font-medium text-slate-900">{c.patient_name}</div>
                              <div className="text-xs text-slate-500">
                                {[c.patient_age && `${c.patient_age} tuổi`, c.patient_gender].filter(Boolean).join(', ')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => { setEditingCaseId(c.id); setModalOpen(true); }}
                              title="Edit"
                              className="px-2.5 py-1.5 rounded border border-slate-200 hover:bg-slate-50 transition-colors"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ open: true, caseId: c.id })}
                              title="Delete"
                              className="px-2.5 py-1.5 rounded border border-red-200 hover:bg-red-50 transition-colors"
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
            )}
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="mt-6 flex justify-between items-center">
              <div className="text-sm text-slate-600">
                Trang {data.page} / {data.totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-50 hover:bg-slate-50"
                >
                  ← Trước
                </button>
                <button
                  disabled={page === data.totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-50 hover:bg-slate-50"
                >
                  Tiếp →
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {modalOpen && (
        <CaseModal
          isOpen={modalOpen}
          caseId={editingCaseId}
          onClose={() => {
            setModalOpen(false);
            setEditingCaseId(null);
          }}
          onSave={handleModalSave}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Xác nhận xóa</h2>
            <p className="text-slate-600 mb-6">Bạn có chắc chắn muốn xóa ca bệnh này? Hành động này không thể hoàn tác.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm({ open: false, caseId: null })}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || '#94a3b8';
  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
      style={{
        background: `${color}20`,
        color: color,
      }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ background: color }}
      />
      {getBilingualStatusLabel(status)}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="px-5 py-3.5 bg-white rounded-xl border border-slate-200 flex-1 min-w-48">
      <div className="text-xs font-semibold text-slate-600 uppercase mb-2">{label}</div>
      <div className="text-2xl font-bold" style={{ color: color || '#1e293b' }}>
        {value}
      </div>
    </div>
  );
}