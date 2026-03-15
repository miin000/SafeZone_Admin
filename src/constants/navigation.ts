// Shared navigation items for all admin pages

export interface NavItem {
  href: string;
  icon: string;
  label: string;
  adminOnly?: boolean;
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: '/', icon: '🗺️', label: 'Dashboard' },
  { href: '/stats', icon: '📊', label: 'Statistics' },
  { href: '/admin/reports', icon: '📋', label: 'Reports' },
  { href: '/admin', icon: '🏥', label: 'Cases' },
  { href: '/admin/zones', icon: '🚨', label: 'Zones' },
  { href: '/admin/diseases', icon: '🧬', label: 'Diseases' },
  { href: '/admin/posts', icon: '💬', label: 'Posts' },
  { href: '/admin/health-info', icon: '📚', label: 'Health Info' },
  { href: '/admin/notifications', icon: '🔔', label: 'Notifications' },
  { href: '/admin/users', icon: '👥', label: 'Users' },
  { href: '/admin/audit-logs', icon: '📜', label: 'Audit Logs', adminOnly: true },
];
