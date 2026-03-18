'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'user' | 'health_authority' | 'admin';
}

export default function Header() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const handleUpdate = () => { const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {
        console.error('Failed to parse user data');
      }
    }
  }; handleUpdate(); window.addEventListener('user-updated', handleUpdate); return () => window.removeEventListener('user-updated', handleUpdate); }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleChangePassword = () => {
    router.push('/profile?tab=password');
    setShowUserMenu(false);
  };

  const handleProfile = () => {
    router.push('/profile');
    setShowUserMenu(false);
  };

  if (!currentUser) {
    return null;
  }

  const firstLetter = currentUser.name?.charAt(0).toUpperCase() || 'A';
  
  const roleColors: Record<string, string> = {
    admin: 'bg-purple-500/20 text-purple-700',
    health_authority: 'bg-blue-500/20 text-blue-700',
    user: 'bg-slate-500/20 text-slate-700',
  };

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex-1" />

        {/* Right Section: User Menu */}
        <div className="flex items-center gap-4">
          {/* User Avatar + Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 transition-colors"
              title={`${currentUser.name} (${currentUser.role})`}
            >
              {/* Avatar Circle */}
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-semibold text-sm">
                {firstLetter}
              </div>

              {/* User Name (hidden on mobile) */}
              <div className="hidden sm:block text-right">
                <div className="text-sm font-medium text-slate-800">{currentUser.name}</div>
                <div className="text-xs text-slate-500">
                  {currentUser.role === 'admin'
                    ? '👑 Admin'
                    : currentUser.role === 'health_authority'
                    ? '👨‍⚕️ Y tế'
                    : '👤 User'}
                </div>
              </div>

              {/* Dropdown Arrow */}
              <span className="hidden sm:block text-slate-400">▼</span>
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div
                className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50"
                onMouseLeave={() => setShowUserMenu(false)}
              >
                {/* User Info */}
                <div className="px-4 py-3 border-b border-slate-200">
                  <div className="text-sm font-medium text-slate-800">{currentUser.name}</div>
                  <div className="text-xs text-slate-500">{currentUser.email}</div>
                  <div className="mt-2">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${roleColors[currentUser.role]}`}
                    >
                      {currentUser.role === 'admin'
                        ? '👑 Admin'
                        : currentUser.role === 'health_authority'
                        ? '👨‍⚕️ Cơ quan Y tế'
                        : '👤 Người dùng'}
                    </span>
                  </div>
                </div>

                {/* Menu Items */}
                <button
                  onClick={handleProfile}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                >
                  👤 Hồ sơ cá nhân
                </button>

                <button
                  onClick={handleChangePassword}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                >
                  🔑 Đổi mật khẩu
                </button>

                <div className="border-t border-slate-200 my-1" />

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors font-medium"
                >
                  🚪 Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
