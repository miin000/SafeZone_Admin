'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { ADMIN_NAV_ITEMS } from '@/constants/navigation';

const API = process.env.NEXT_PUBLIC_API_URL!;

interface Disease {
  id: string;
  name: string;
  description?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  aliases?: string;
  icdCode?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const RISK_LEVELS = [
  { value: 'low', label: 'Thấp', labelEn: 'Low', color: '#4caf50', bgColor: '#4caf5020' },
  { value: 'medium', label: 'Trung bình', labelEn: 'Medium', color: '#ff9800', bgColor: '#ff980020' },
  { value: 'high', label: 'Cao', labelEn: 'High', color: '#f44336', bgColor: '#f4433620' },
  { value: 'critical', label: 'Nguy hiểm', labelEn: 'Critical', color: '#9c27b0', bgColor: '#9c27b020' },
];

const navItems = ADMIN_NAV_ITEMS;

export default function DiseasesPage() {
  const router = useRouter();
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingDisease, setEditingDisease] = useState<Disease | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    aliases: string;
    icdCode: string;
    isActive: boolean;
  }>({
    name: '',
    description: '',
    riskLevel: 'medium',
    aliases: '',
    icdCode: '',
    isActive: true,
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Load diseases
  const loadDiseases = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/diseases`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setDiseases(data);
      }
    } catch (err) {
      console.error('Error loading diseases:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDiseases();
  }, [loadDiseases]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Vui lòng nhập tên bệnh');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const method = editingDisease ? 'PATCH' : 'POST';
      const url = editingDisease 
        ? `${API}/diseases/${editingDisease.id}`
        : `${API}/diseases`;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert(editingDisease ? '✅ Cập nhật bệnh thành công!' : '✅ Thêm bệnh mới thành công!');
        setShowModal(false);
        setEditingDisease(null);
        setFormData({
          name: '',
          description: '',
          riskLevel: 'medium',
          aliases: '',
          icdCode: '',
          isActive: true,
        });
        loadDiseases();
      } else if (res.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      } else {
        alert('❌ Lỗi: ' + (await res.text()));
      }
    } catch (err) {
      alert('❌ Lỗi kết nối: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Handle delete
  const handleDelete = async (diseaseId: string, diseaseName: string) => {
    if (!confirm(`Bạn chắc chắn muốn xóa bệnh "${diseaseName}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const res = await fetch(`${API}/diseases/${diseaseId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        alert('✅ Xóa bệnh thành công!');
        loadDiseases();
      } else if (res.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      } else {
        alert('❌ Lỗi xóa bệnh');
      }
    } catch (err) {
      alert('❌ Lỗi kết nối');
    }
  };

  // Handle edit
  const handleEdit = (disease: Disease) => {
    setEditingDisease(disease);
    setFormData({
      name: disease.name,
      description: disease.description || '',
      riskLevel: disease.riskLevel,
      aliases: disease.aliases || '',
      icdCode: disease.icdCode || '',
      isActive: disease.isActive,
    });
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setEditingDisease(null);
    setFormData({
      name: '',
      description: '',
      riskLevel: 'medium',
      aliases: '',
      icdCode: '',
      isActive: true,
    });
  };

  // Filter diseases
  const filteredDiseases = diseases.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.aliases && d.aliases.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getRiskLevelConfig = (level: string) => {
    return RISK_LEVELS.find(r => r.value === level) || RISK_LEVELS[1];
  };

  return (
    <div className="flex">
      <Sidebar navItems={navItems} />
      <main className="flex-1 ml-64">
        <Header />
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">🧬 Quản lý dịch bệnh</h1>
            <p className="text-sm text-slate-500">Manage diseases and risk levels</p>
          </div>
          <button
            onClick={() => {
              setEditingDisease(null);
              setShowModal(true);
            }}
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold hover:shadow-lg transition-shadow"
          >
            ➕ Thêm bệnh mới
          </button>
        </div>

        <div className="p-6 bg-slate-50 min-h-[calc(100vh-200px)]">
          {/* Search bar */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Tìm kiếm bệnh..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Diseases List */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="py-16 text-center">
                <div className="text-5xl mb-4">⏳</div>
                <div className="text-slate-600">Đang tải...</div>
              </div>
            ) : filteredDiseases.length === 0 ? (
              <div className="py-16 text-center">
                <div className="text-5xl mb-4">🦠</div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Không có bệnh nào</h3>
                <p className="text-slate-500">Hãy thêm một bệnh mới để bắt đầu</p>
              </div>
            ) : (
              <>
                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Tên bệnh</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Mức độ</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Mô tả</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Mã ICD</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Trạng thái</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase w-24">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDiseases.map((disease) => {
                        const riskConfig = getRiskLevelConfig(disease.riskLevel);
                        return (
                          <tr key={disease.id} className="border-t border-slate-200 hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-900">{disease.name}</td>
                            <td className="px-4 py-3">
                              <span
                                className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium"
                                style={{
                                  backgroundColor: riskConfig.bgColor,
                                  color: riskConfig.color,
                                }}
                              >
                                {riskConfig.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {disease.description ? disease.description.substring(0, 40) + (disease.description.length > 40 ? '...' : '') : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-500 font-mono">{disease.icdCode || '-'}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${disease.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                {disease.isActive ? '✓ Hoạt động' : '✗ Vô hiệu'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex gap-2 justify-center">
                                <button
                                  onClick={() => handleEdit(disease)}
                                  className="px-2.5 py-1.5 rounded border border-slate-200 hover:bg-slate-50 transition-colors"
                                  title="Sửa"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleDelete(disease.id, disease.name)}
                                  className="px-2.5 py-1.5 rounded border border-red-200 hover:bg-red-50 transition-colors"
                                  title="Xóa"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Info */}
                <div className="px-6 py-4 border-t border-slate-200 text-sm text-slate-500">
                  Hiển thị {filteredDiseases.length} bệnh
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">
                {editingDisease ? '✏️ Sửa bệnh' : '➕ Thêm bệnh mới'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">
                  Tên bệnh *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="VD: COVID-19, Sốt xuất huyết"
                />
              </div>

              {/* Risk Level */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">
                  Mức độ nguy hiểm
                </label>
                <select
                  value={formData.riskLevel}
                  onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {RISK_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label} / {level.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">
                  Mô tả
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={3}
                  placeholder="Mô tả về bệnh..."
                />
              </div>

              {/* Aliases */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">
                  Tên gọi khác (cách bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  value={formData.aliases}
                  onChange={(e) => setFormData({ ...formData, aliases: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="VD: SARS-CoV-2, Corona"
                />
              </div>

              {/* ICD Code */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">
                  Mã ICD-10
                </label>
                <input
                  type="text"
                  value={formData.icdCode}
                  onChange={(e) => setFormData({ ...formData, icdCode: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="VD: U07.1"
                />
              </div>

              {/* Active */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 cursor-pointer"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
                  Hoạt động
                </label>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold hover:shadow-lg transition-shadow"
                >
                  {editingDisease ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}