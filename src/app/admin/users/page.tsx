'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { ADMIN_NAV_ITEMS } from '@/constants/navigation';

const API = process.env.NEXT_PUBLIC_API_URL!;

// Use shared navigation items
const navItems = ADMIN_NAV_ITEMS;

interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'user' | 'health_authority' | 'admin';
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

type StaffRole = 'health_authority' | 'admin';

interface UserFormData {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: StaffRole;
  isActive: boolean;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'health_authority',
    isActive: true,
  });

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; userId: string | null }>({
    open: false,
    userId: null,
  });

  // Load users
  const loadUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const url = roleFilter !== 'ALL'
        ? `${API}/admin/users/staff?role=${roleFilter}`
        : `${API}/admin/users/staff`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(Array.isArray(data) ? data : data.data || []);
      } else if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        router.push('/login');
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.message || 'Không thể tải danh sách tài khoản');
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      alert('Lỗi kết nối khi tải danh sách tài khoản');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter, router]);

  // Load current user info
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

  // Handle create/update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      const url = editingUser 
        ? `${API}/admin/users/${editingUser.id}` 
        : `${API}/admin/users`;
      
      const method = editingUser ? 'PUT' : 'POST';
      
      // Don't send password if empty on edit
      let payload: Partial<UserFormData> = { ...formData };
      if (editingUser && !formData.password) {
        const { password, ...rest } = formData;
        payload = rest;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        loadUsers();
        setModalOpen(false);
        resetForm();
      } else if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        router.push('/login');
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to save user');
      }
    } catch (error) {
      console.error('Failed to save user:', error);
      alert('Failed to save user');
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteConfirm.userId) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      const response = await fetch(`${API}/admin/users/${deleteConfirm.userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        loadUsers();
      } else if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        router.push('/login');
      } else {
        alert('Failed to delete user');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    } finally {
      setDeleteConfirm({ open: false, userId: null });
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      name: '',
      phone: '',
      role: 'health_authority',
      isActive: true,
    });
    setEditingUser(null);
  };

  // Open modal for create
  const handleCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  // Open modal for edit
  const handleEdit = (user: User) => {
    setEditingUser(user);
    // Only admin and health_authority users are listed, so role is safe to cast
    const staffRole: StaffRole = (user.role === 'admin' || user.role === 'health_authority') 
      ? user.role as StaffRole 
      : 'health_authority';
    setFormData({
      email: user.email,
      password: '',
      name: user.name,
      phone: user.phone,
      role: staffRole,
      isActive: user.isActive,
    });
    setModalOpen(true);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'health_authority': return 'Cơ quan Y tế';
      case 'user': return 'Người dùng';
      default: return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'health_authority': return 'bg-blue-100 text-blue-800';
      case 'user': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <h1 className="text-2xl font-bold text-slate-800">👥 Quản lý người dùng</h1>
          <p className="text-sm text-slate-500">Quản lý tài khoản và quyền truy cập người dùng</p>
        </div>

        {/* Page Content */}
        <div className="p-6 bg-slate-50 min-h-[calc(100vh-80px)]">
          {/* Header */}
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-800">👥 Quản lý tài khoản staff</h1>
              <p className="text-sm text-slate-500 mt-1">Quản lý tài khoản Admin và Cơ quan y tế</p>
            </div>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-md flex items-center gap-2"
            >
              <span>➕</span>
              <span>Tạo tài khoản</span>
            </button>
          </div>
        </header>

          {/* Filters */}
          <div className="bg-white border-b border-slate-200 px-8 py-4">
          <div className="flex gap-4 items-center">
            <label className="text-sm font-medium text-slate-700">Vai trò:</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="ALL">Tất cả</option>
              <option value="admin">Admin</option>
              <option value="health_authority">Cơ quan Y tế</option>
            </select>
            <div className="text-sm text-slate-600 ml-auto">
              Tổng: <strong>{users.length}</strong> tài khoản
            </div>
          </div>
        </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-8">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
                <p className="mt-4 text-slate-600">Đang tải...</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Tên</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Số điện thoại</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Vai trò</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Tạo lúc</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase tracking-wider">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900">{user.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {user.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? 'Hoạt động' : 'Vô hiệu hóa'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          ✏️ Sửa
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ open: true, userId: user.id })}
                          className="text-red-600 hover:text-red-900"
                        >
                          🗑️ Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {users.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  Không có tài khoản nào
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal for Create/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">
                {editingUser ? 'Sửa tài khoản' : 'Tạo tài khoản mới'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Mật khẩu {editingUser && <span className="text-slate-500 text-xs">(để trống nếu không đổi)</span>}
                  {!editingUser && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required={!editingUser}
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Vai trò <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as StaffRole })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                >
                  <option value="health_authority">Cơ quan Y tế</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                />
                <label htmlFor="isActive" className="ml-2 text-sm font-medium text-slate-700">
                  Tài khoản hoạt động
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  {editingUser ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Xác nhận xóa</h3>
            <p className="text-slate-600 mb-6">
              Bạn có chắc chắn muốn xóa tài khoản này? Tài khoản sẽ bị vô hiệu hóa.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm({ open: false, userId: null })}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  </div>
  );
}
