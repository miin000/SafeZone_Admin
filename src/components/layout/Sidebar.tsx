'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SidebarProps {
  navItems: Array<{ href: string; icon: string; label: string }>;
  pathname: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ navItems, pathname, collapsed, onToggleCollapse }: SidebarProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        console.error('Failed to parse user', e);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return { label: 'Quản trị', color: 'bg-red-100 text-red-700' };
      case 'health_authority':
        return { label: 'Cơ quan Y tế', color: 'bg-emerald-100 text-emerald-700' };
      default:
        return { label: 'User', color: 'bg-slate-100 text-slate-700' };
    }
  };

  const roleBadge = user ? getRoleBadge(user.role) : null;

  return (
    <aside 
      className={`fixed left-0 top-0 h-full bg-white border-r border-slate-200 shadow-sm z-50 transition-all duration-300 ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-slate-200">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
          SZ
        </div>
        {!collapsed && (
          <span className="ml-3 font-bold text-slate-800 text-lg">SafeZone</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              {!collapsed && (
                <span className="font-medium text-sm">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="border-t border-slate-200 p-3">
        {user && (
          <div className={`mb-2 ${collapsed ? 'text-center' : ''}`}>
            {!collapsed ? (
              <>
                <div className="px-3 py-2 bg-slate-50 rounded-lg mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">👤</span>
                    <span className="font-medium text-sm text-slate-800 truncate">
                      {user.name}
                    </span>
                  </div>
                  {roleBadge && (
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${roleBadge.color}`}>
                      {roleBadge.label}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="flex justify-center mb-2">
                <span className="text-2xl">👤</span>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
          title={collapsed ? 'Đăng xuất' : undefined}
        >
          <span className="text-lg">🚪</span>
          {!collapsed && <span className="font-medium text-sm">Đăng xuất</span>}
        </button>

        {!collapsed && (
          <button
            onClick={onToggleCollapse}
            className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <span className="text-sm">◀</span>
            <span className="font-medium text-xs">Thu gọn</span>
          </button>
        )}

        {collapsed && (
          <button
            onClick={onToggleCollapse}
            className="w-full mt-2 flex items-center justify-center px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            title="Mở rộng"
          >
            <span className="text-sm">▶</span>
          </button>
        )}
      </div>
    </aside>
  );
}
