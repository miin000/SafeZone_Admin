'use client';

import { useState, useCallback, useEffect } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { ADMIN_NAV_ITEMS } from '@/constants/navigation';
import type {
  HealthInfo,
  HealthInfoListResponse,
  HealthInfoStats,
  HealthInfoCategory,
  HealthInfoStatus,
} from '@/types';
import {
  HEALTH_INFO_CATEGORY_CONFIG,
  HEALTH_INFO_STATUS_CONFIG,
} from '@/types';
import HealthInfoModal from '@/components/HealthInfoModal';

const API = process.env.NEXT_PUBLIC_API_URL!;

// Use shared navigation items
const navItems = ADMIN_NAV_ITEMS;

export default function HealthInfoPage() {
  const [data, setData] = useState<HealthInfoListResponse | null>(null);
  const [stats, setStats] = useState<HealthInfoStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [category, setCategory] = useState<string>('ALL');
  const [status, setStatus] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HealthInfo | null>(null);

  // Confirmation dialog
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    itemId: string | null;
  }>({
    open: false,
    itemId: null,
  });

  // Load stats
  useEffect(() => {
    fetch(`${API}/health-info/stats`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
      },
    })
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  // Load health info items
  const loadData = useCallback(() => {
    const sp = new URLSearchParams();
    if (category !== 'ALL') sp.set('category', category);
    if (status !== 'ALL') sp.set('status', status);
    if (search) sp.set('search', search);
    sp.set('page', String(page));
    sp.set('limit', String(limit));

    setLoading(true);
    fetch(`${API}/health-info?${sp.toString()}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
      },
    })
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [category, status, search, page, limit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle delete
  const handleDelete = async () => {
    if (!deleteConfirm.itemId) return;

    try {
      await fetch(`${API}/health-info/${deleteConfirm.itemId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      loadData();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleteConfirm({ open: false, itemId: null });
    }
  };

  // Handle publish
  const handlePublish = async (id: string) => {
    try {
      await fetch(`${API}/health-info/${id}/publish`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      loadData();
    } catch (err) {
      console.error('Publish failed:', err);
    }
  };

  // Handle archive
  const handleArchive = async (id: string) => {
    try {
      await fetch(`${API}/health-info/${id}/archive`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      loadData();
    } catch (err) {
      console.error('Archive failed:', err);
    }
  };

  // Handle modal save
  const handleModalSave = () => {
    loadData();
    // Reload stats
    fetch(`${API}/health-info/stats`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
      },
    })
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error);
  };

  // Reset filters
  const handleResetFilters = () => {
    setCategory('ALL');
    setStatus('ALL');
    setSearch('');
    setPage(1);
  };

  return (
    <div className="flex">
      {/* Sidebar */}
      <Sidebar navItems={navItems} />

      {/* Main Content */}
      <main className="flex-1 ml-64">
        {/* Header */}
        <Header />

        {/* Page Title */}
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <h1 className="text-2xl font-bold text-slate-800">📚 Quản lý thông tin y tế</h1>
          <p className="text-sm text-slate-500">Quản lý nội dung thông tin y tế cho người dùng</p>
        </div>

        {/* Page Content */}
        <div className="p-6 bg-slate-50 min-h-[calc(100vh-80px)]">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="card p-4">
              <div className="text-2xl mb-2">📊</div>
              <div className="text-2xl font-bold text-sky-600">{stats?.total || 0}</div>
              <div className="text-xs text-slate-500">Tổng số</div>
            </div>
            <div className="card p-4">
              <div className="text-2xl mb-2">✅</div>
              <div className="text-2xl font-bold text-emerald-600">{stats?.published || 0}</div>
              <div className="text-xs text-slate-500">Đã xuất bản</div>
            </div>
            <div className="card p-4">
              <div className="text-2xl mb-2">📝</div>
              <div className="text-2xl font-bold text-slate-600">{stats?.draft || 0}</div>
              <div className="text-xs text-slate-500">Bản nháp</div>
            </div>
            <div className="card p-4">
              <div className="text-2xl mb-2">📥</div>
              <div className="text-2xl font-bold text-amber-600">{stats?.archived || 0}</div>
              <div className="text-xs text-slate-500">Đã lưu trữ</div>
            </div>
            <div className="card p-4">
              <div className="text-2xl mb-2">📁</div>
              <div className="text-2xl font-bold text-purple-600">{stats?.byCategory?.length || 0}</div>
              <div className="text-xs text-slate-500">Danh mục</div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="card p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="🔍 Tìm kiếm tiêu đề, nội dung..."
                  className="input w-full"
                />
              </div>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                className="input min-w-[160px]"
              >
                <option value="ALL">Tất cả danh mục</option>
                {Object.entries(HEALTH_INFO_CATEGORY_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.icon} {cfg.labelVi}
                  </option>
                ))}
              </select>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="input min-w-[150px]"
              >
                <option value="ALL">Tất cả trạng thái</option>
                {Object.entries(HEALTH_INFO_STATUS_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.labelVi}
                  </option>
                ))}
              </select>
              <button
                onClick={handleResetFilters}
                className="btn bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                🔄 Đặt lại
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-slate-500">Đang tải...</p>
              </div>
            ) : !data?.items?.length ? (
              <div className="p-12 text-center">
                <div className="text-5xl mb-4">📭</div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Không có dữ liệu</h3>
                <p className="text-slate-500">Thêm mới hoặc thay đổi bộ lọc</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Tiêu đề</th>
                        <th>Danh mục</th>
                        <th>Trạng thái</th>
                        <th>Lượt xem</th>
                        <th>Nổi bật</th>
                        <th>Ngày tạo</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((item) => {
                        const catCfg = HEALTH_INFO_CATEGORY_CONFIG[item.category as HealthInfoCategory];
                        const statusCfg = HEALTH_INFO_STATUS_CONFIG[item.status as HealthInfoStatus];

                        return (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td>
                              <div className="max-w-[250px]">
                                <div className="font-medium text-slate-800">{item.title}</div>
                                {item.summary && (
                                  <div className="text-sm text-slate-500 truncate">{item.summary}</div>
                                )}
                              </div>
                            </td>
                            <td>
                              <span
                                className="badge"
                                style={{
                                  backgroundColor: `${catCfg?.color}15`,
                                  color: catCfg?.color,
                                }}
                              >
                                {catCfg?.icon} {catCfg?.labelVi}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`badge ${
                                  item.status === 'published' ? 'badge-success' :
                                  item.status === 'draft' ? 'bg-slate-100 text-slate-700' :
                                  'badge-warning'
                                }`}
                              >
                                {statusCfg?.labelVi}
                              </span>
                            </td>
                            <td>
                              <span className="text-slate-600">👁️ {item.viewCount}</span>
                            </td>
                            <td>
                              {item.isFeatured ? (
                                <span className="text-amber-500 text-lg">⭐</span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="text-sm text-slate-500">
                              {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                            </td>
                            <td>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingItem(item);
                                    setModalOpen(true);
                                  }}
                                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                                  title="Sửa"
                                >
                                  ✏️
                                </button>
                                {item.status === 'draft' && (
                                  <button
                                    onClick={() => handlePublish(item.id)}
                                    className="p-2 rounded-lg hover:bg-emerald-100 text-emerald-600 transition-colors"
                                    title="Xuất bản"
                                  >
                                    📤
                                  </button>
                                )}
                                {item.status === 'published' && (
                                  <button
                                    onClick={() => handleArchive(item.id)}
                                    className="p-2 rounded-lg hover:bg-amber-100 text-amber-600 transition-colors"
                                    title="Lưu trữ"
                                  >
                                    📥
                                  </button>
                                )}
                                <button
                                  onClick={() => setDeleteConfirm({ open: true, itemId: item.id })}
                                  className="p-2 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
                                  title="Xóa"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {data.meta && data.meta.totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t border-slate-200">
                    <div className="text-sm text-slate-500">
                      Hiển thị {data.items.length} / {data.meta.total} kết quả
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="btn bg-white border border-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ← Trước
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, data.meta.totalPages) }, (_, i) => {
                          let pageNum: number;
                          if (data.meta.totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (page <= 3) {
                            pageNum = i + 1;
                          } else if (page >= data.meta.totalPages - 2) {
                            pageNum = data.meta.totalPages - 4 + i;
                          } else {
                            pageNum = page - 2 + i;
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setPage(pageNum)}
                              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                                page === pageNum
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
                        disabled={page === data.meta.totalPages}
                        className="btn bg-white border border-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Sau →
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center gap-4 bg-red-50">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white text-2xl">
                🗑️
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Xác nhận xóa</h3>
                <p className="text-sm text-slate-500">Hành động không thể hoàn tác</p>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-600">
                Bạn có chắc chắn muốn xóa bài viết này? Tất cả dữ liệu liên quan sẽ bị xóa vĩnh viễn.
              </p>
            </div>
            <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50">
              <button
                onClick={() => setDeleteConfirm({ open: false, itemId: null })}
                className="btn bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                className="btn bg-red-500 text-white hover:bg-red-600"
              >
                🗑️ Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Health Info Modal */}
      {modalOpen && (
        <HealthInfoModal
          item={editingItem}
          onClose={() => {
            setModalOpen(false);
            setEditingItem(null);
          }}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}
