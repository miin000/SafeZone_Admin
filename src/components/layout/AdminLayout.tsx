'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  icon: string;
  label: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { href: '/', icon: '🗺️', label: 'Dashboard (Map)' },
  { href: '/stats', icon: '📊', label: 'Statistics' },
  { href: '/admin/reports', icon: '📋', label: 'Reports' },
  { href: '/admin', icon: '🏥', label: 'Disease Cases' },
  { href: '/admin/zones', icon: '🚨', label: 'Epidemic Zones' },
  { href: '/admin/posts', icon: '💬', label: 'Community Posts' },
  { href: '/admin/health-info', icon: '📚', label: 'Health Information' },
  { href: '/admin/notifications', icon: '🔔', label: 'Notifications' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3);
  const [searchQuery, setSearchQuery] = useState('');

  // Get current page title
  const currentPage = navItems.find(item => item.href === pathname);
  const pageTitle = currentPage?.label || 'SafeZone Admin';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowUserMenu(false);
    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showUserMenu]);

  return (
    <div style={containerStyle}>
      {/* Fixed Sidebar */}
      <aside style={{
        ...sidebarStyle,
        width: sidebarCollapsed ? 72 : 260,
      }}>
        {/* Logo */}
        <div style={logoContainerStyle}>
          <Link href="/" style={logoStyle}>
            <span style={{ fontSize: 28 }}>🛡️</span>
            {!sidebarCollapsed && (
              <span style={logoTextStyle}>SafeZone</span>
            )}
          </Link>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={collapseButtonStyle}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? '▶' : '◀'}
          </button>
        </div>

        {/* Navigation */}
        <nav style={navStyle}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href));
            
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
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span style={{ fontSize: 18, minWidth: 24 }}>{item.icon}</span>
                {!sidebarCollapsed && (
                  <span style={{ fontWeight: isActive ? 600 : 500 }}>{item.label}</span>
                )}
                {item.badge && !sidebarCollapsed && (
                  <span style={badgeStyle}>{item.badge}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Section at Bottom */}
        {!sidebarCollapsed && (
          <div style={userSectionStyle}>
            <div style={dividerStyle} />
            <Link href="/admin/profile" style={profileLinkStyle}>
              <div style={avatarSmallStyle}>👤</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>Admin User</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Super Admin</div>
              </div>
            </Link>
            <button style={logoutButtonStyle}>
              🚪 Logout
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div style={{
        ...mainContentStyle,
        marginLeft: sidebarCollapsed ? 72 : 260,
      }}>
        {/* Top Bar */}
        <header style={topBarStyle}>
          <div style={topBarLeftStyle}>
            <h1 style={pageTitleStyle}>{pageTitle}</h1>
          </div>
          
          <div style={topBarRightStyle}>
            {/* Global Search */}
            <div style={searchContainerStyle}>
              <span style={searchIconStyle}>🔍</span>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={searchInputStyle}
              />
            </div>

            {/* Notification Bell */}
            <button style={iconButtonStyle} title="Notifications">
              <span>🔔</span>
              {notificationCount > 0 && (
                <span style={notificationBadgeStyle}>{notificationCount}</span>
              )}
            </button>

            {/* User Avatar Dropdown */}
            <div style={{ position: 'relative' }}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUserMenu(!showUserMenu);
                }}
                style={avatarButtonStyle}
              >
                <div style={avatarStyle}>👤</div>
                <span style={{ fontSize: 12 }}>▼</span>
              </button>

              {showUserMenu && (
                <div style={dropdownMenuStyle}>
                  <Link href="/admin/profile" style={dropdownItemStyle}>
                    👤 Profile
                  </Link>
                  <Link href="/admin/settings" style={dropdownItemStyle}>
                    ⚙️ Settings
                  </Link>
                  <div style={dropdownDividerStyle} />
                  <button style={dropdownItemStyle}>
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main style={pageContentStyle}>
          {children}
        </main>
      </div>
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
  background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
  borderRight: '1px solid #e2e8f0',
  display: 'flex',
  flexDirection: 'column',
  transition: 'width 0.3s ease',
  zIndex: 1000,
  boxShadow: '2px 0 8px rgba(0, 0, 0, 0.04)',
};

const logoContainerStyle: React.CSSProperties = {
  padding: '20px 16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: '1px solid #e2e8f0',
};

const logoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  textDecoration: 'none',
  color: 'inherit',
};

const logoTextStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 800,
  background: 'linear-gradient(135deg, #10b981, #0ea5e9)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
};

const collapseButtonStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  border: 'none',
  background: '#f1f5f9',
  color: '#64748b',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 10,
  transition: 'all 0.2s',
};

const navStyle: React.CSSProperties = {
  flex: 1,
  padding: '16px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  overflowY: 'auto',
};

const navItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 14px',
  borderRadius: 10,
  textDecoration: 'none',
  fontSize: 14,
  transition: 'all 0.2s ease',
};

const badgeStyle: React.CSSProperties = {
  marginLeft: 'auto',
  background: '#ef4444',
  color: '#fff',
  fontSize: 11,
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: 10,
};

const userSectionStyle: React.CSSProperties = {
  padding: '12px 16px',
};

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: '#e2e8f0',
  marginBottom: 12,
};

const profileLinkStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '8px 0',
  textDecoration: 'none',
  color: 'inherit',
};

const avatarSmallStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #10b981, #0ea5e9)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 16,
};

const logoutButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  marginTop: 8,
  borderRadius: 8,
  border: '1px solid #fee2e2',
  background: '#fef2f2',
  color: '#dc2626',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const mainContentStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  transition: 'margin-left 0.3s ease',
};

const topBarStyle: React.CSSProperties = {
  height: 64,
  background: '#ffffff',
  borderBottom: '1px solid #e2e8f0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 24px',
  position: 'sticky',
  top: 0,
  zIndex: 100,
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
};

const topBarLeftStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
};

const pageTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 700,
  color: '#1e293b',
};

const topBarRightStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
};

const searchContainerStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
};

const searchIconStyle: React.CSSProperties = {
  position: 'absolute',
  left: 12,
  fontSize: 14,
  color: '#94a3b8',
};

const searchInputStyle: React.CSSProperties = {
  width: 280,
  padding: '10px 12px 10px 36px',
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
  fontSize: 14,
  color: '#1e293b',
  outline: 'none',
  transition: 'all 0.2s',
};

const iconButtonStyle: React.CSSProperties = {
  position: 'relative',
  width: 40,
  height: 40,
  borderRadius: 10,
  border: 'none',
  background: '#f8fafc',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 18,
  transition: 'all 0.2s',
};

const notificationBadgeStyle: React.CSSProperties = {
  position: 'absolute',
  top: 4,
  right: 4,
  width: 18,
  height: 18,
  borderRadius: '50%',
  background: '#ef4444',
  color: '#fff',
  fontSize: 10,
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const avatarButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 12px 6px 6px',
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  background: '#fff',
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const avatarStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #10b981, #0ea5e9)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 14,
};

const dropdownMenuStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 8px)',
  right: 0,
  width: 180,
  background: '#fff',
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
  padding: '8px',
  zIndex: 1000,
};

const dropdownItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: 'none',
  background: 'transparent',
  color: '#475569',
  fontSize: 14,
  cursor: 'pointer',
  textDecoration: 'none',
  transition: 'all 0.2s',
};

const dropdownDividerStyle: React.CSSProperties = {
  height: 1,
  background: '#e2e8f0',
  margin: '4px 0',
};

const pageContentStyle: React.CSSProperties = {
  flex: 1,
  padding: 24,
  overflowY: 'auto',
};
