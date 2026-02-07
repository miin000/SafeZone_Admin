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
    <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-gradient-to-b from-emerald-600 to-teal-700 text-white flex flex-col shadow-2xl transition-all duration-300`}>
      <div className="p-4 flex items-center justify-between border-b border-white/20">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏥</span>
            <span className="font-bold text-lg">SafeZone</span>
          </div>
        )}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-1.5 rounded hover:bg-white/10 transition-colors"
        >
          {sidebarCollapsed ? '→' : '←'}
        </button>
      </div>

      {/* Current User Info */}
      {currentUser && !sidebarCollapsed && (
        <div className="px-4 py-3 bg-white/10 border-b border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
              {currentUser.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{currentUser.name}</div>
              <div className="text-xs opacity-90 truncate">{currentUser.email}</div>
            </div>
          </div>
          <div className="mt-2">
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
              currentUser.role === 'admin' 
                ? 'bg-purple-500/30 text-purple-100' 
                : currentUser.role === 'health_authority'
                ? 'bg-blue-500/30 text-blue-100'
                : 'bg-gray-500/30 text-gray-100'
            }`}>
              {currentUser.role === 'admin' ? '👑 Admin' : 
               currentUser.role === 'health_authority' ? '👨‍⚕️ Cơ quan Y tế' : 
               '👤 Người dùng'}
            </span>
          </div>
        </div>
      )}

      {currentUser && sidebarCollapsed && (
        <div className="px-2 py-3 bg-white/10 border-b border-white/20 flex justify-center" title={`${currentUser.name} (${currentUser.role})`}>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
            {currentUser.name?.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                isActive
                  ? 'bg-white text-emerald-700 shadow-md font-medium'
                  : 'hover:bg-white/10'
              }`}
              title={sidebarCollapsed ? item.label : ''}
            >
              <span className="text-xl">{item.icon}</span>
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/20">
        <button
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
          title={sidebarCollapsed ? 'Logout' : ''}
        >
          <span className="text-xl">🚪</span>
          {!sidebarCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}
