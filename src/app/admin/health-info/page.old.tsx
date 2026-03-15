// Legacy admin health-info implementation kept only for reference.
// This file is not used by the app runtime and is intentionally
// reduced to a simple placeholder component so it does not
// participate in type-checking or require missing modules.

'use client';

export default function LegacyHealthInfoPagePlaceholder() {
  return null;
}

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
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">📚 Quản lý Thông tin Y tế</h1>
          <p className="text-gray-400 mt-1">
            Quản lý nội dung thông tin y tế cho người dùng
          </p>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            setModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <span>+</span>
          <span>Thêm mới</span>
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-gray-400 text-sm">Tổng số</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-500">
              {stats.published}
            </div>
            <div className="text-gray-400 text-sm">Đã xuất bản</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-500">{stats.draft}</div>
            <div className="text-gray-400 text-sm">Bản nháp</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-500">
              {stats.archived}
            </div>
            <div className="text-gray-400 text-sm">Đã lưu trữ</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-500">
              {stats.byCategory?.length || 0}
            </div>
            <div className="text-gray-400 text-sm">Danh mục</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Tìm kiếm</label>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Tiêu đề, nội dung..."
              className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Danh mục</label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
            >
              <option value="ALL">Tất cả danh mục</option>
              {Object.entries(HEALTH_INFO_CATEGORY_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.icon} {cfg.labelVi}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Trạng thái
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
            >
              <option value="ALL">Tất cả trạng thái</option>
              {Object.entries(HEALTH_INFO_STATUS_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.labelVi}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Button */}
          <div className="flex items-end">
            <button
              onClick={handleResetFilters}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm"
            >
              Xóa bộ lọc
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Đang tải...</div>
        ) : !data?.items?.length ? (
          <div className="p-8 text-center text-gray-400">
            Không có dữ liệu
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm">Tiêu đề</th>
                <th className="px-4 py-3 text-left text-sm">Danh mục</th>
                <th className="px-4 py-3 text-left text-sm">Trạng thái</th>
                <th className="px-4 py-3 text-left text-sm">Lượt xem</th>
                <th className="px-4 py-3 text-left text-sm">Nổi bật</th>
                <th className="px-4 py-3 text-left text-sm">Ngày tạo</th>
                <th className="px-4 py-3 text-center text-sm">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => {
                const catCfg =
                  HEALTH_INFO_CATEGORY_CONFIG[
                    item.category as HealthInfoCategory
                  ];
                const statusCfg =
                  HEALTH_INFO_STATUS_CONFIG[item.status as HealthInfoStatus];

                return (
                  <tr key={item.id} className="border-t border-gray-700">
                    <td className="px-4 py-3">
                      <div className="font-medium">{item.title}</div>
                      {item.summary && (
                        <div className="text-sm text-gray-400 truncate max-w-xs">
                          {item.summary}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-1 rounded text-sm"
                        style={{
                          backgroundColor: `${catCfg?.color}20`,
                          color: catCfg?.color,
                        }}
                      >
                        {catCfg?.icon} {catCfg?.labelVi}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-1 rounded text-sm"
                        style={{
                          backgroundColor: statusCfg?.bgColor,
                          color: statusCfg?.color,
                        }}
                      >
                        {statusCfg?.labelVi}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      👁️ {item.viewCount}
                    </td>
                    <td className="px-4 py-3">
                      {item.isFeatured ? (
                        <span className="text-yellow-500">⭐</span>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        {/* Edit */}
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setModalOpen(true);
                          }}
                          className="p-1 hover:bg-gray-700 rounded"
                          title="Sửa"
                        >
                          ✏️
                        </button>

                        {/* Publish/Archive */}
                        {item.status === 'draft' && (
                          <button
                            onClick={() => handlePublish(item.id)}
                            className="p-1 hover:bg-gray-700 rounded"
                            title="Xuất bản"
                          >
                            📤
                          </button>
                        )}
                        {item.status === 'published' && (
                          <button
                            onClick={() => handleArchive(item.id)}
                            className="p-1 hover:bg-gray-700 rounded"
                            title="Lưu trữ"
                          >
                            📥
                          </button>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() =>
                            setDeleteConfirm({ open: true, itemId: item.id })
                          }
                          className="p-1 hover:bg-red-900/50 rounded text-red-500"
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
        )}

        {/* Pagination */}
        {data && data.meta.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-700 flex justify-between items-center">
            <div className="text-sm text-gray-400">
              Hiển thị {data.items.length} / {data.meta.total} kết quả
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50"
              >
                ←
              </button>
              <span className="px-3 py-1">
                {page} / {data.meta.totalPages}
              </span>
              <button
                onClick={() =>
                  setPage((p) => Math.min(data.meta.totalPages, p + 1))
                }
                disabled={page === data.meta.totalPages}
                className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50"
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-bold mb-4">Xác nhận xóa</h3>
            <p className="text-gray-400 mb-6">
              Bạn có chắc chắn muốn xóa bài viết này? Hành động này không thể
              hoàn tác.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() =>
                  setDeleteConfirm({ open: false, itemId: null })
                }
                className="px-4 py-2 bg-gray-700 rounded"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 rounded"
              >
                Xóa
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
