'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL!;

export default function LoginPage() {
  const router = useRouter();
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Determine if input is email or phone
      const isEmail = emailOrPhone.includes('@');
      const loginData = isEmail 
        ? { email: emailOrPhone, password, source: 'web' }
        : { phone: emailOrPhone, password, source: 'web' };

      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Đăng nhập thất bại');
      }

      // Check if user has admin or health_authority role
      if (!['admin', 'health_authority'].includes(data.user.role)) {
        throw new Error('Bạn không có quyền truy cập trang quản trị');
      }

      // Save token and user info
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect to dashboard
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Đã có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl mb-4">
            <span className="text-white font-bold text-3xl">SZ</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            SafeZone Admin
          </h1>
          <p className="text-slate-600">
            Hệ thống quản trị giám sát dịch bệnh
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-6">
            Đăng nhập
          </h2>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg border border-red-200 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email hoặc Số điện thoại
              </label>
              <input
                type="text"
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-800"
                placeholder="admin@safezone.vn hoặc 0912345678"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Mật khẩu
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-800"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-3 rounded-lg font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            <p className="mb-2">Chỉ dành cho:</p>
            <div className="flex items-center justify-center gap-4 text-xs">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                👨‍⚕️ Cơ quan y tế
              </span>
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                🔐 Quản trị viên
              </span>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-slate-600 mt-6">
          © 2026 SafeZone. Hệ thống giám sát và cảnh báo dịch bệnh.
        </p>
      </div>
    </div>
  );
}
