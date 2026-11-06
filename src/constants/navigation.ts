// Shared navigation items for all admin pages

export interface NavItem {
  href: string;
  icon: string;
  label: string;
  adminOnly?: boolean;
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: '/', icon: '🗺️', label: 'Tổng quan' },
  { href: '/stats', icon: '📊', label: 'Thống kê' },
  { href: '/admin/reports', icon: '📋', label: 'Báo cáo' },
  { href: '/admin', icon: '🏥', label: 'Ca bệnh' },
  { href: '/admin/zones', icon: '🚨', label: 'Vùng dịch' },
  { href: '/admin/diseases', icon: '🧬', label: 'Danh mục bệnh' },
  { href: '/admin/posts', icon: '💬', label: 'Bài viết' },
  { href: '/admin/health-info', icon: '📚', label: 'Thông tin sức khỏe' },
  { href: '/admin/notifications', icon: '🔔', label: 'Thông báo' },
  { href: '/admin/users', icon: '👥', label: 'Người dùng' },
  { href: '/admin/audit-logs', icon: '📜', label: 'Nhật ký kiểm toán', adminOnly: true },
];
