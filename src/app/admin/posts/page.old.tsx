'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Post, PostListResponse, PostStats, PostStatus } from '@/types';
import { POST_STATUS_CONFIG } from '@/types';

const API = process.env.NEXT_PUBLIC_API_URL!;

export default function PostsPage() {
  const [data, setData] = useState<PostListResponse | null>(null);
  const [stats, setStats] = useState<PostStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [status, setStatus] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Review modal
  const [reviewModal, setReviewModal] = useState<{
    open: boolean;
    post: Post | null;
    action: 'approve' | 'reject';
  }>({
    open: false,
    post: null,
    action: 'approve',
  });
  const [adminNote, setAdminNote] = useState('');

  // Load stats
  useEffect(() => {
    fetch(`${API}/posts/stats`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
      },
    })
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  // Load posts
  const loadData = useCallback(() => {
    const sp = new URLSearchParams();
    if (status !== 'ALL') sp.set('status', status);
    sp.set('page', String(page));
    sp.set('limit', String(limit));

    setLoading(true);
    fetch(`${API}/posts?${sp.toString()}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
      },
    })
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [status, page, limit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle review (approve/reject)
  const handleReview = async () => {
    if (!reviewModal.post) return;

    try {
      await fetch(`${API}/posts/${reviewModal.post.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          status: reviewModal.action === 'approve' ? 'approved' : 'rejected',
          adminNote: adminNote || undefined,
        }),
      });

      loadData();
      // Reload stats
      fetch(`${API}/posts/stats`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      })
        .then((r) => r.json())
        .then(setStats)
        .catch(console.error);
    } catch (err) {
      console.error('Review failed:', err);
    } finally {
      setReviewModal({ open: false, post: null, action: 'approve' });
      setAdminNote('');
    }
  };

  const openReviewModal = (post: Post, action: 'approve' | 'reject') => {
    setReviewModal({ open: true, post, action });
    setAdminNote('');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">💬 Quản lý Bài đăng Cộng đồng</h1>
          <p className="text-gray-400 mt-1">
            Duyệt và quản lý bài đăng từ người dùng và cơ quan y tế
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-gray-400 text-sm">Tổng số</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-500">
              {stats.pending}
            </div>
            <div className="text-gray-400 text-sm">Chờ duyệt</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-500">
              {stats.approved}
            </div>
            <div className="text-gray-400 text-sm">Đã duyệt</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-500">
              {stats.rejected}
            </div>
            <div className="text-gray-400 text-sm">Từ chối</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="flex gap-4 items-center">
          <label className="text-sm text-gray-400">Trạng thái:</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="bg-gray-700 rounded px-4 py-2"
          >
            <option value="ALL">Tất cả</option>
            {Object.entries(POST_STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.icon} {cfg.labelVi}
              </option>
            ))}
          </select>

          {/* Quick filter buttons */}
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => {
                setStatus('pending');
                setPage(1);
              }}
              className={`px-3 py-1 rounded text-sm ${
                status === 'pending'
                  ? 'bg-yellow-600'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              ⏳ Chờ duyệt ({stats?.pending || 0})
            </button>
            <button
              onClick={() => {
                setStatus('approved');
                setPage(1);
              }}
              className={`px-3 py-1 rounded text-sm ${
                status === 'approved'
                  ? 'bg-green-600'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              ✅ Đã duyệt
            </button>
          </div>
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
            Đang tải...
          </div>
        ) : !data?.data?.length ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
            Không có bài đăng nào
          </div>
        ) : (
          data.data.map((post) => {
            const statusCfg = POST_STATUS_CONFIG[post.status as PostStatus];

            return (
              <div
                key={post.id}
                className="bg-gray-800 rounded-lg p-4 border-l-4"
                style={{ borderLeftColor: statusCfg?.color }}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                      👤
                    </div>
                    <div>
                      <div className="font-medium">
                        {post.user?.name || 'Ẩn danh'}
                      </div>
                      <div className="text-sm text-gray-400">
                        {new Date(post.createdAt).toLocaleString('vi-VN')}
                      </div>
                    </div>
                  </div>
                  <span
                    className="px-3 py-1 rounded text-sm"
                    style={{
                      backgroundColor: statusCfg?.bgColor,
                      color: statusCfg?.color,
                    }}
                  >
                    {statusCfg?.icon} {statusCfg?.labelVi}
                  </span>
                </div>

                {/* Content */}
                <div className="mb-3">
                  <p className="text-gray-200 whitespace-pre-wrap">
                    {post.content}
                  </p>

                  {/* Location & Disease Type */}
                  <div className="flex gap-4 mt-2 text-sm text-gray-400">
                    {post.location && <span>📍 {post.location}</span>}
                    {post.diseaseType && <span>🦠 {post.diseaseType}</span>}
                  </div>
                </div>

                {/* Images */}
                {post.imageUrls && post.imageUrls.length > 0 && (
                  <div className="flex gap-2 mb-3">
                    {post.imageUrls.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`Image ${idx + 1}`}
                        className="w-24 h-24 object-cover rounded"
                      />
                    ))}
                  </div>
                )}

                {/* Stats & Actions */}
                <div className="flex justify-between items-center pt-3 border-t border-gray-700">
                  <div className="flex gap-6 text-sm text-gray-400">
                    <span>👍 {post.helpfulCount} hữu ích</span>
                    <span>👎 {post.notHelpfulCount} không hữu ích</span>
                  </div>

                  {/* Admin Actions */}
                  {post.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openReviewModal(post, 'approve')}
                        className="px-4 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
                      >
                        ✅ Duyệt
                      </button>
                      <button
                        onClick={() => openReviewModal(post, 'reject')}
                        className="px-4 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                      >
                        ❌ Từ chối
                      </button>
                    </div>
                  )}

                  {post.status === 'approved' && (
                    <button
                      onClick={() => openReviewModal(post, 'reject')}
                      className="px-4 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                    >
                      📥 Thu hồi
                    </button>
                  )}
                </div>

                {/* Admin Note */}
                {post.adminNote && (
                  <div className="mt-3 p-2 bg-gray-700/50 rounded text-sm">
                    <span className="text-gray-400">Ghi chú admin: </span>
                    {post.adminNote}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {data && data.meta.totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-gray-700 rounded disabled:opacity-50"
          >
            ← Trước
          </button>
          <span className="px-4 py-2">
            Trang {page} / {data.meta.totalPages}
          </span>
          <button
            onClick={() =>
              setPage((p) => Math.min(data.meta.totalPages, p + 1))
            }
            disabled={page === data.meta.totalPages}
            className="px-4 py-2 bg-gray-700 rounded disabled:opacity-50"
          >
            Sau →
          </button>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal.open && reviewModal.post && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-lg p-6">
            <h3 className="text-xl font-bold mb-4">
              {reviewModal.action === 'approve'
                ? '✅ Duyệt bài đăng'
                : '❌ Từ chối bài đăng'}
            </h3>

            {/* Post Preview */}
            <div className="bg-gray-700/50 rounded p-3 mb-4 max-h-32 overflow-y-auto">
              <p className="text-sm text-gray-300">
                {reviewModal.post.content}
              </p>
            </div>

            {/* Admin Note */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">
                Ghi chú{' '}
                {reviewModal.action === 'reject' && (
                  <span className="text-red-400">(nên có lý do)</span>
                )}
              </label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
                className="w-full bg-gray-700 rounded px-4 py-2"
                placeholder={
                  reviewModal.action === 'reject'
                    ? 'Lý do từ chối...'
                    : 'Ghi chú (tùy chọn)...'
                }
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() =>
                  setReviewModal({ open: false, post: null, action: 'approve' })
                }
                className="px-4 py-2 bg-gray-700 rounded"
              >
                Hủy
              </button>
              <button
                onClick={handleReview}
                className={`px-4 py-2 rounded ${
                  reviewModal.action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {reviewModal.action === 'approve' ? 'Duyệt' : 'Từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
