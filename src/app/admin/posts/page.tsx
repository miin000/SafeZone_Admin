'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { ADMIN_NAV_ITEMS } from '@/constants/navigation';
import type { Post, PostListResponse, PostStats, PostStatus } from '@/types';
import { POST_STATUS_CONFIG } from '@/types';

const API = process.env.NEXT_PUBLIC_API_URL!;

// Use shared navigation items
const navItems = ADMIN_NAV_ITEMS;

export default function PostsPage() {
  const pathname = usePathname();
  const [data, setData] = useState<PostListResponse | null>(null);
  const [stats, setStats] = useState<PostStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
    
    // Always show all posts for admin (including pending)
    sp.set('showAll', 'true');
    
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

  // Filter posts by search
  const filteredPosts = data?.data?.filter(post => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      post.content?.toLowerCase().includes(query) ||
      post.user?.name?.toLowerCase().includes(query) ||
      post.location?.toLowerCase().includes(query) ||
      post.diseaseType?.toLowerCase().includes(query)
    );
  }) || [];

  const formatDateTime = (value: string) => {
    const hasTimezone =
      value.endsWith('Z') || /([+-]\d{2}:?\d{2})$/.test(value);
    return new Date(hasTimezone ? value : `${value}Z`).toLocaleString('vi-VN');
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
          <h1 className="text-2xl font-bold text-slate-800">💬 Quản lý bài đăng</h1>
          <p className="text-sm text-slate-500">Duyệt và quản lý bài đăng cộng đồng</p>
        </div>

        {/* Page Content */}
        <div className="p-6 bg-slate-50 min-h-[calc(100vh-80px)]">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div 
              onClick={() => { setStatus('ALL'); setPage(1); }}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                status === 'ALL' ? 'ring-2 ring-sky-500 bg-sky-50' : ''
              }`}
            >
              <div className="text-2xl mb-2">📊</div>
              <div className="text-2xl font-bold text-sky-600">{stats?.total || 0}</div>
              <div className="text-xs text-slate-500">Tổng số</div>
            </div>
            <div 
              onClick={() => { setStatus('pending'); setPage(1); }}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                status === 'pending' ? 'ring-2 ring-amber-500 bg-amber-50' : ''
              }`}
            >
              <div className="text-2xl mb-2">⏳</div>
              <div className="text-2xl font-bold text-amber-600">{stats?.pending || 0}</div>
              <div className="text-xs text-slate-500">Chờ duyệt</div>
            </div>
            <div 
              onClick={() => { setStatus('approved'); setPage(1); }}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                status === 'approved' ? 'ring-2 ring-emerald-500 bg-emerald-50' : ''
              }`}
            >
              <div className="text-2xl mb-2">✅</div>
              <div className="text-2xl font-bold text-emerald-600">{stats?.approved || 0}</div>
              <div className="text-xs text-slate-500">Đã duyệt</div>
            </div>
            <div 
              onClick={() => { setStatus('rejected'); setPage(1); }}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                status === 'rejected' ? 'ring-2 ring-red-500 bg-red-50' : ''
              }`}
            >
              <div className="text-2xl mb-2">❌</div>
              <div className="text-2xl font-bold text-red-600">{stats?.rejected || 0}</div>
              <div className="text-xs text-slate-500">Từ chối</div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="card p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="🔍 Tìm kiếm bài đăng..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input w-full"
                />
              </div>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="input min-w-[150px]"
              >
                <option value="ALL">Tất cả trạng thái</option>
                {Object.entries(POST_STATUS_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.icon} {cfg.labelVi}
                  </option>
                ))}
              </select>
              <button 
                onClick={() => {
                  setStatus('ALL');
                  setSearchQuery('');
                  setPage(1);
                }}
                className="btn bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                🔄 Đặt lại
              </button>
            </div>
          </div>

          {/* Posts List */}
          <div className="space-y-4">
            {loading ? (
              <div className="card p-12 text-center">
                <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-slate-500">Đang tải...</p>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="text-5xl mb-4">📭</div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Không có bài đăng nào</h3>
                <p className="text-slate-500">Thay đổi bộ lọc để xem các bài đăng khác</p>
              </div>
            ) : (
              filteredPosts.map((post) => {
                const statusCfg = POST_STATUS_CONFIG[post.status as PostStatus];
                const statusColors: Record<string, string> = {
                  pending: 'border-l-amber-500',
                  approved: 'border-l-emerald-500',
                  rejected: 'border-l-red-500',
                };

                return (
                  <div
                    key={post.id}
                    className={`card p-5 border-l-4 ${statusColors[post.status] || 'border-l-slate-300'}`}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-slate-100 rounded-full flex items-center justify-center text-xl">
                          👤
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">
                            {post.user?.name || 'Ẩn danh'}
                          </div>
                          <div className="text-sm text-slate-500">
                            {formatDateTime(post.createdAt)}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`badge ${
                          post.status === 'pending' ? 'badge-warning' :
                          post.status === 'approved' ? 'badge-success' :
                          post.status === 'rejected' ? 'badge-error' :
                          'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {statusCfg?.icon} {statusCfg?.labelVi}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="mb-4">
                      <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {post.content}
                      </p>

                      {/* Location & Disease Type */}
                      {(post.location || post.diseaseType) && (
                        <div className="flex flex-wrap gap-4 mt-3">
                          {post.location && (
                            <span className="text-sm text-slate-500 flex items-center gap-1">
                              📍 {post.location}
                            </span>
                          )}
                          {post.diseaseType && (
                            <span className="text-sm text-slate-500 flex items-center gap-1">
                              🦠 {post.diseaseType}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Images */}
                    {post.imageUrls && post.imageUrls.length > 0 && (
                      <div className="flex gap-2 mb-4 overflow-x-auto">
                        {post.imageUrls.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`Image ${idx + 1}`}
                            className="w-24 h-24 object-cover rounded-lg border border-slate-200"
                          />
                        ))}
                      </div>
                    )}

                    {/* Stats & Actions */}
                    <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                      <div className="flex gap-6 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          👍 <span className="text-emerald-600 font-medium">{post.helpfulCount}</span> hữu ích
                        </span>
                        <span className="flex items-center gap-1">
                          👎 <span className="text-red-600 font-medium">{post.notHelpfulCount}</span> không hữu ích
                        </span>
                      </div>

                      {/* Admin Actions */}
                      <div className="flex gap-2">
                        {post.status === 'pending' && (
                          <>
                            <button
                              onClick={() => openReviewModal(post, 'approve')}
                              className="btn bg-emerald-500 text-white hover:bg-emerald-600 text-sm"
                            >
                              ✅ Duyệt
                            </button>
                            <button
                              onClick={() => openReviewModal(post, 'reject')}
                              className="btn bg-red-500 text-white hover:bg-red-600 text-sm"
                            >
                              ❌ Từ chối
                            </button>
                          </>
                        )}

                        {post.status === 'approved' && (
                          <button
                            onClick={() => openReviewModal(post, 'reject')}
                            className="btn bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm"
                          >
                            📥 Thu hồi
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Admin Note */}
                    {post.adminNote && (
                      <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-sm text-slate-500">💬 Ghi chú admin: </span>
                        <span className="text-sm text-slate-700">{post.adminNote}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {data && data.meta && data.meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 card p-4">
              <div className="text-sm text-slate-500">
                Trang {page} / {data.meta.totalPages}
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
        </div>
      </main>

      {/* Review Modal */}
      {reviewModal.open && reviewModal.post && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-2xl ${
                  reviewModal.action === 'approve' 
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600' 
                    : 'bg-gradient-to-br from-red-500 to-rose-600'
                }`}>
                  {reviewModal.action === 'approve' ? '✅' : '❌'}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {reviewModal.action === 'approve' ? 'Duyệt bài đăng' : 'Từ chối bài đăng'}
                  </h2>
                  <p className="text-sm text-slate-500">Xác nhận hành động</p>
                </div>
              </div>
              <button 
                onClick={() => setReviewModal({ open: false, post: null, action: 'approve' })}
                className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Post Preview */}
              <div className="card p-4 mb-4 bg-slate-50 max-h-32 overflow-y-auto">
                <p className="text-sm text-slate-700">
                  {reviewModal.post.content}
                </p>
              </div>

              {/* Admin Note */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Ghi chú {reviewModal.action === 'reject' && <span className="text-red-500">(nên có lý do)</span>}
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={3}
                  className="input w-full resize-none"
                  placeholder={
                    reviewModal.action === 'reject'
                      ? 'Lý do từ chối...'
                      : 'Ghi chú (tùy chọn)...'
                  }
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50">
              <button
                onClick={() => setReviewModal({ open: false, post: null, action: 'approve' })}
                className="btn bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={handleReview}
                className={`btn text-white ${
                  reviewModal.action === 'approve'
                    ? 'bg-emerald-500 hover:bg-emerald-600'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {reviewModal.action === 'approve' ? '✅ Duyệt' : '❌ Từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
