'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { ADMIN_NAV_ITEMS } from '@/constants/navigation';

const API = process.env.NEXT_PUBLIC_API_URL!;

// Use shared navigation items
const navItems = ADMIN_NAV_ITEMS;

interface Zone {
  id: string;
  name: string;
  diseaseType: string;
  riskLevel: string;
  isActive: boolean;
}

interface NotificationHistory {
  id: string;
  title: string;
  body: string;
  type: string;
  sentAt: string;
  targetZoneId?: string;
  targetZoneName?: string;
}

interface RawNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  createdAt: string;
  data?: {
    zoneId?: string;
    zoneName?: string;
  };
}

export default function NotificationsPage() {
  const router = useRouter();
  
  // Zones for selecting target
  const [zones, setZones] = useState<Zone[]>([]);
  const [loadingZones, setLoadingZones] = useState(true);
  
  // Notification form
  const [showSendModal, setShowSendModal] = useState(false);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifType, setNotifType] = useState<'all' | 'zone'>('all');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [sending, setSending] = useState(false);
  
  // Notification history
  const [notifications, setNotifications] = useState<NotificationHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Load active zones for targeting
  const loadZones = useCallback(async () => {
    setLoadingZones(true);
    try {
      const res = await fetch(`${API}/zones?active=true`);
      if (res.ok) {
        const data = await res.json();
        setZones(Array.isArray(data) ? data : data.data || []);
      }
    } catch (err) {
      console.error('Error loading zones:', err);
    } finally {
      setLoadingZones(false);
    }
  }, []);

  // Load notification history
  const loadNotificationHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      const res = await fetch(`${API}/notifications/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const rows: RawNotification[] = Array.isArray(data) ? data : data.data || [];
        // Map database notifications to UI format
        const mappedNotifications: NotificationHistory[] = rows.map((notif) => ({
          id: notif.id,
          title: notif.title,
          body: notif.body,
          type: notif.type === 'epidemic_alert' ? 'zone' : 'all',
          sentAt: notif.createdAt,
          targetZoneId: notif.data?.zoneId,
          targetZoneName: notif.data?.zoneName,
        }));
        setNotifications(mappedNotifications);
      } else if (res.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        router.push('/login');
      } else {
        const err = await res.json().catch(() => ({}));
        console.error('Failed to load notification history:', err);
        setNotifications([]);
      }
    } catch (err) {
      console.error('Error loading notification history:', err);
      setNotifications([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [router]);

  useEffect(() => {
    loadZones();
    loadNotificationHistory();
  }, [loadZones, loadNotificationHistory]);

  // Stats
  const stats = useMemo(() => ({
    totalSent: notifications.length,
    zoneAlerts: notifications.filter(n => n.type === 'zone').length,
    broadcastAlerts: notifications.filter(n => n.type === 'all').length,
  }), [notifications]);

  // Send notification
  const handleSendNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) {
      alert('Vui lòng nhập tiêu đề và nội dung thông báo');
      return;
    }
    if (notifType === 'zone' && !selectedZoneId) {
      alert('Vui lòng chọn vùng dịch');
      return;
    }

    setSending(true);
    try {
      // Call notification API (Firebase Cloud Messaging or similar)
      const payload = {
        title: notifTitle,
        body: notifBody,
        type: notifType,
        zoneId: notifType === 'zone' ? selectedZoneId : undefined,
      };

      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      const res = await fetch(`${API}/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        // Reload notification history
        await loadNotificationHistory();

        // Reset form
        setNotifTitle('');
        setNotifBody('');
        setNotifType('all');
        setSelectedZoneId('');
        setShowSendModal(false);
        alert('Gửi thông báo thành công!');
      } else if (res.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        router.push('/login');
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Gửi thông báo thất bại: ${errorData.message || res.statusText}`);
      }
    } catch (err) {
      console.error('Error sending notification:', err);
      alert('Lỗi kết nối');
    } finally {
      setSending(false);
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const hasTimezone =
      dateStr.endsWith('Z') || /([+-]\d{2}:?\d{2})$/.test(dateStr);
    const d = new Date(hasTimezone ? dateStr : `${dateStr}Z`);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800">🔔 Quản lý thông báo</h1>
          <button onClick={() => { setNotifType('all'); setShowSendModal(true); }} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 ml-auto flex items-center font-medium">+ Thêm thông báo</button><p className="text-sm text-slate-500">Quản lý và gửi thông báo cho người dùng</p>
        </div>

        {/* Page Content */}
        <div className="p-6 bg-slate-50 min-h-[calc(100vh-80px)]">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="card p-4">
              <div className="text-2xl mb-2">📨</div>
              <div className="text-2xl font-bold text-sky-600">{stats.totalSent}</div>
              <div className="text-xs text-slate-500">Tổng thông báo đã gửi</div>
            </div>
            <div className="card p-4">
              <div className="text-2xl mb-2">🚨</div>
              <div className="text-2xl font-bold text-red-600">{stats.zoneAlerts}</div>
              <div className="text-xs text-slate-500">Cảnh báo vùng dịch</div>
            </div>
            <div className="card p-4">
              <div className="text-2xl mb-2">📢</div>
              <div className="text-2xl font-bold text-amber-600">{stats.broadcastAlerts}</div>
              <div className="text-xs text-slate-500">Thông báo chung</div>
            </div>
          </div>

          {/* Active Zones Quick View */}
          <div className="card p-5 mb-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">🚨 Vùng dịch đang hoạt động</h2>
            {loadingZones ? (
              <div className="text-center py-4 text-slate-500">Đang tải...</div>
            ) : zones.length === 0 ? (
              <div className="text-center py-4 text-slate-500">
                Chưa có vùng dịch nào đang hoạt động
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {zones.slice(0, 6).map(zone => (
                  <div 
                    key={zone.id}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <div className={`w-3 h-3 rounded-full ${
                      zone.riskLevel === 'critical' ? 'bg-purple-500' :
                      zone.riskLevel === 'high' ? 'bg-red-500' :
                      zone.riskLevel === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 truncate">{zone.name}</div>
                      <div className="text-xs text-slate-500">{zone.diseaseType}</div>
                    </div>
                    <button
                      onClick={() => {
                        setNotifType('zone');
                        setSelectedZoneId(zone.id);
                        setShowSendModal(true);
                      }}
                      className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"
                    >
                      Gửi TB
                    </button>
                  </div>
                ))}
              </div>
            )}
            {zones.length > 6 && (
              <Link href="/admin/zones" className="block text-center mt-3 text-sm text-emerald-600 hover:underline">
                Xem tất cả {zones.length} vùng dịch →
              </Link>
            )}
          </div>

          {/* Notification History */}
          <div className="card p-5">
            <h2 className="text-lg font-bold text-slate-800 mb-4">📜 Lịch sử thông báo</h2>
            {loadingHistory ? (
              <div className="text-center py-8 text-slate-500">Đang tải...</div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <div className="text-4xl mb-2">📭</div>
                Chưa có thông báo nào được gửi
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map(notif => (
                  <div 
                    key={notif.id}
                    className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                      notif.type === 'zone' ? 'bg-red-100' : 'bg-amber-100'
                    }`}>
                      {notif.type === 'zone' ? '🚨' : '📢'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-800">{notif.title}</span>
                        {notif.targetZoneName && (
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                            {notif.targetZoneName}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{notif.body}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>📅 {formatDate(notif.sentAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* How it works */}
          <div className="card p-5 mt-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">ℹ️ Cách hoạt động</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                <div className="text-2xl mb-2">1️⃣</div>
                <div className="font-semibold text-slate-800 mb-1">Tạo vùng dịch</div>
                <div className="text-sm text-slate-600">Admin tạo vùng dịch tại trang Zones</div>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                <div className="text-2xl mb-2">2️⃣</div>
                <div className="font-semibold text-slate-800 mb-1">Gửi thông báo</div>
                <div className="text-sm text-slate-600">Gửi cảnh báo đến người dùng trong vùng hoặc tất cả</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                <div className="text-2xl mb-2">3️⃣</div>
                <div className="font-semibold text-slate-800 mb-1">Cảnh báo người dùng</div>
                <div className="text-sm text-slate-600">App mobile hiển thị push notification ngay lập tức</div>
              </div>
              <div className="p-4 bg-sky-50 rounded-lg border border-sky-100">
                <div className="text-2xl mb-2">4️⃣</div>
                <div className="font-semibold text-slate-800 mb-1">Theo dõi & Cập nhật</div>
                <div className="text-sm text-slate-600">Xem lịch sử gửi thông báo gần nhất</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Send Notification Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
              <h3 className="text-lg font-bold">📤 Gửi thông báo đẩy</h3>
              <p className="text-sm text-emerald-100">Push notification to mobile users</p>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Type Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Loại thông báo</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setNotifType('all')}
                    className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                      notifType === 'all'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xl mb-1">📢</div>
                    <div className="font-medium">Tất cả</div>
                    <div className="text-xs text-slate-500">Gửi đến mọi người</div>
                  </button>
                  <button
                    onClick={() => setNotifType('zone')}
                    className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                      notifType === 'zone'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xl mb-1">🚨</div>
                    <div className="font-medium">Vùng dịch</div>
                    <div className="text-xs text-slate-500">Chỉ người trong vùng</div>
                  </button>
                </div>
              </div>

              {/* Zone Selection (if type is zone) */}
              {notifType === 'zone' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Chọn vùng dịch</label>
                  <select
                    value={selectedZoneId}
                    onChange={(e) => setSelectedZoneId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">-- Chọn vùng dịch --</option>
                    {zones.map(zone => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name} ({zone.diseaseType})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tiêu đề</label>
                <input
                  type="text"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="Nhập tiêu đề thông báo..."
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nội dung</label>
                <textarea
                  value={notifBody}
                  onChange={(e) => setNotifBody(e.target.value)}
                  placeholder="Nhập nội dung thông báo..."
                  rows={4}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setShowSendModal(false)}
                className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSendNotification}
                disabled={sending}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
              >
                {sending ? 'Đang gửi...' : '📤 Gửi thông báo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
