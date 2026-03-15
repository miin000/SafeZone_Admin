'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'user' | 'health_authority' | 'admin';
}

interface NavItem {
  href: string;
  icon: string;
  label: string;
  adminOnly?: boolean;
}

interface SidebarProps {
  navItems: Array<NavItem>;
}

export default function Sidebar({ navItems }: SidebarProps) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter(item => {
    if (item.adminOnly && currentUser?.role !== 'admin') {
      return false;
    }
    return true;
  });

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {
        console.error('Failed to parse user data');
      }
    }
  }, []);

  return (
    <aside
      className={`${
        sidebarCollapsed ? 'w-20' : 'w-64'
      } bg-gradient-to-b from-emerald-600 to-teal-700 text-white flex flex-col shadow-lg transition-all duration-300 fixed left-0 top-0 h-screen`}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-white/20">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏥</span>
            <span className="font-bold text-lg">SafeZone</span>
          </div>
        )}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white"
          title={sidebarCollapsed ? 'Expand' : 'Collapse'}
        >
          {sidebarCollapsed ? '→' : '←'}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-white/20 text-white font-semibold'
                  : 'text-white/80 hover:bg-white/10'
              }`}
              title={item.label}
            >
              <span className="text-xl">{item.icon}</span>
              {!sidebarCollapsed && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Info Section */}
      {currentUser && (
        <div className="px-3 py-3 border-t border-white/20">
          {sidebarCollapsed ? (
            <div
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold flex-shrink-0 mx-auto"
              title={`${currentUser.name} (${currentUser.role})`}
            >
              {currentUser.name?.charAt(0).toUpperCase()}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {currentUser.name?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{currentUser.name}</div>
                  <div className="text-xs opacity-80 truncate">{currentUser.email}</div>
                </div>
              </div>

              <div>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    currentUser.role === 'admin'
                      ? 'bg-purple-500/30 text-purple-100'
                      : currentUser.role === 'health_authority'
                      ? 'bg-blue-500/30 text-blue-100'
                      : 'bg-gray-500/30 text-gray-100'
                  }`}
                >
                  {currentUser.role === 'admin'
                    ? '👑 Admin'
                    : currentUser.role === 'health_authority'
                    ? '👨‍⚕️ Y tế'
                    : '👤 User'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
