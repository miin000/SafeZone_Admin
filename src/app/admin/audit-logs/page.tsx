'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL!;

interface AuditLog {
  id: number;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  description?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
  user?: {
    name: string;
    email: string;
    role: string;
  };
}

const navItems = [
  { href: '/', icon: '🗺️', label: 'Dashboard' },
  { href: '/stats', icon: '📊', label: 'Statistics' },
  { href: '/admin/reports', icon: '📋', label: 'Reports' },
  { href: '/admin', icon: '🏥', label: 'Cases' },
  { href: '/admin/zones', icon: '🚨', label: 'Zones' },
  { href: '/admin/posts', icon: '💬', label: 'Posts' },
  { href: '/admin/health-info', icon: '📚', label: 'Health Info' },
  { href: '/admin/notifications', icon: '🔔', label: 'Notifications' },
  { href: '/admin/users', icon: '👥', label: 'Users' },
  { href: '/admin/audit-logs', icon: '📜', label: 'Audit Logs', adminOnly: true },
];

const actionLabels: Record<string, { label: string; color: string; icon: string }> = {
  view: { label: 'Xem', color: '#3b82f6', icon: '👁️' },
  create: { label: 'Tạo', color: '#10b981', icon: '➕' },
  update: { label: 'Sửa', color: '#f59e0b', icon: '✏️' },
  delete: { label: 'Xóa', color: '#ef4444', icon: '🗑️' },
  approve: { label: 'Duyệt', color: '#10b981', icon: '✅' },
  reject: { label: 'Từ chối', color: '#ef4444', icon: '❌' },
  login: { label: 'Đăng nhập', color: '#8b5cf6', icon: '🔐' },
  logout: { label: 'Đăng xuất', color: '#64748b', icon: '🚪' },
};

const resourceLabels: Record<string, string> = {
  case: 'Ca bệnh',
  report: 'Báo cáo',
  user: 'Người dùng',
  zone: 'Vùng dịch',
  post: 'Bài viết',
  health_info: 'Thông tin y tế',
  notification: 'Thông báo',
  auth: 'Xác thực',
};

export default function AuditLogsPage() {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [resourceFilter, setResourceFilter] = useState<string>('ALL');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Check if user is admin
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
      if (user.role !== 'admin') {
        window.location.href = '/';
      }
    } else {
      window.location.href = '/login';
    }
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      loadLogs();
    }
  }, [page, actionFilter, resourceFilter, currentUser]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '50');
      if (actionFilter !== 'ALL') params.set('action', actionFilter);
      if (resourceFilter !== 'ALL') params.set('resource', resourceFilter);

      const res = await fetch(`${API}/admin/audit-logs?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setLogs(data.data || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 30) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  // Don't render until we confirm user is admin
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <div className="text-xl font-semibold text-slate-800 mb-2">Truy cập bị từ chối</div>
          <div className="text-slate-600">Chỉ Admin mới có quyền truy cập trang này</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full bg-white border-r border-slate-200 shadow-sm z-50 transition-all duration-300 ${sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'}`}>
        <div className="h-16 flex items-center px-4 border-b border-slate-200">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
            SZ
          </div>
          {!sidebarCollapsed && <span className="ml-3 font-bold text-slate-800 text-lg">SafeZone</span>}
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isActive ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute bottom-4 right-4 w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
        >
          {sidebarCollapsed ? '→' : '←'}
        </button>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-[72px]' : 'ml-[260px]'}`}>
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-40">
          <div>
            <h1 className="text-xl font-bold text-slate-800">📜 Nhật ký hệ thống</h1>
            <p className="text-sm text-slate-500">Theo dõi hoạt động của admin</p>
          </div>
        </header>

        <div className="p-6">
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Hành động</label>
                <select
                  value={actionFilter}
                  onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">Tất cả</option>
                  {Object.entries(actionLabels).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tài nguyên</label>
                <select
                  value={resourceFilter}
                  onChange={(e) => { setResourceFilter(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">Tất cả</option>
                  {Object.entries(resourceLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-500">Đang tải...</div>
            ) : logs.length === 0 ? (
              <div className="p-12 text-center text-slate-500">Không có dữ liệu</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Thời gian</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Người dùng</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Hành động</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Tài nguyên</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Mô tả</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {logs.map((log) => {
                      const actionConfig = actionLabels[log.action] || { label: log.action, color: '#64748b', icon: '•' };
                      return (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                            {getTimeAgo(log.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-slate-800">{log.user?.name || 'Unknown'}</div>
                            <div className="text-xs text-slate-500">{log.user?.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
                              style={{ backgroundColor: `${actionConfig.color}15`, color: actionConfig.color }}
                            >
                              <span>{actionConfig.icon}</span>
                              {actionConfig.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {resourceLabels[log.resource] || log.resource}
                            {log.resourceId && <span className="text-slate-400"> #{log.resourceId}</span>}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {log.description || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
                <div className="text-sm text-slate-600">
                  Trang {page} / {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 rounded-lg bg-white border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Trước
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 rounded-lg bg-white border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sau →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
