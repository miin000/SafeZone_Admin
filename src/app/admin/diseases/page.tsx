'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
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

type OutbreakStatus = 'active' | 'closed';

interface DiseaseOutbreak {
  id: string;
  diseaseId: string;
  name: string | null;
  description: string | null;
  startDate: string;
  endDate: string | null;
  status: OutbreakStatus;
  reopenedFromOutbreakId: string | null;
  createdAt: string;
  updatedAt: string;
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

  const [showOutbreakModal, setShowOutbreakModal] = useState(false);
  const [outbreakDisease, setOutbreakDisease] = useState<Disease | null>(null);
  const [outbreaksLoading, setOutbreaksLoading] = useState(false);
  const [outbreaks, setOutbreaks] = useState<DiseaseOutbreak[]>([]);
  const [outbreakCreateName, setOutbreakCreateName] = useState('');
  const [outbreakCreateDescription, setOutbreakCreateDescription] = useState('');
  const [outbreakCreateStartDate, setOutbreakCreateStartDate] = useState('');
  const [outbreakCreateEndDate, setOutbreakCreateEndDate] = useState('');
  const [outbreakCloseEndDate, setOutbreakCloseEndDate] = useState('');
  const [outbreakEditingId, setOutbreakEditingId] = useState<string | null>(null);

  const [archiveFrom, setArchiveFrom] = useState('');
  const [archiveTo, setArchiveTo] = useState('');
  const [archiveOutbreakId, setArchiveOutbreakId] = useState('');
  const [archiving, setArchiving] = useState(false);
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

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString();
  };

  const toDateInputValue = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  };

  const requireTokenOrLogin = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return null;
    }
    return token;
  }, [router]);

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

  const hasActiveOutbreak = useMemo(() => {
    return outbreaks.some(o => o.status === 'active');
  }, [outbreaks]);

  const activeOutbreak = useMemo(() => {
    return outbreaks.find(o => o.status === 'active') || null;
  }, [outbreaks]);

  const openOutbreakModal = async (disease: Disease) => {
    setOutbreakDisease(disease);
    setShowOutbreakModal(true);
    setOutbreakCreateName('');
    setOutbreakCreateDescription('');
    setOutbreakCreateStartDate('');
    setOutbreakCreateEndDate('');
    setOutbreakCloseEndDate('');
    setOutbreakEditingId(null);
    setArchiveFrom('');
    setArchiveTo('');
    setArchiveOutbreakId('');
    await loadOutbreaks(disease.id);
  };

  const closeOutbreakModal = () => {
    setShowOutbreakModal(false);
    setOutbreakDisease(null);
    setOutbreaks([]);
    setOutbreakCreateName('');
    setOutbreakCreateDescription('');
    setOutbreakCreateStartDate('');
    setOutbreakCreateEndDate('');
    setOutbreakCloseEndDate('');
    setOutbreakEditingId(null);
    setArchiveFrom('');
    setArchiveTo('');
    setArchiveOutbreakId('');
  };

  const loadOutbreaks = useCallback(async (diseaseId: string) => {
    setOutbreaksLoading(true);
    try {
      const token = requireTokenOrLogin();
      if (!token) return;
      const res = await fetch(`${API}/diseases/${diseaseId}/outbreaks`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as DiseaseOutbreak[];
      setOutbreaks(Array.isArray(data) ? data : []);
    } catch (err) {
      alert('❌ Lỗi tải danh sách đợt dịch: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setOutbreaksLoading(false);
    }
  }, [requireTokenOrLogin]);

  const createOutbreak = async () => {
    if (!outbreakDisease) return;
    const isCreatingClosedOutbreak = Boolean(outbreakCreateEndDate);
    if (hasActiveOutbreak && !isCreatingClosedOutbreak) {
      alert('⚠️ Bệnh này đang có 1 đợt dịch đang hoạt động. Hãy đóng đợt hiện tại trước (hoặc tạo đợt lịch sử bằng cách chọn ngày kết thúc).');
      return;
    }

    try {
      const token = requireTokenOrLogin();
      if (!token) return;
      const body: { name?: string; description?: string; startDate?: string; endDate?: string } = {};
      if (outbreakCreateName.trim()) body.name = outbreakCreateName.trim();
      if (outbreakCreateDescription.trim()) body.description = outbreakCreateDescription.trim();
      if (outbreakCreateStartDate)
        body.startDate = new Date(outbreakCreateStartDate).toISOString();
      if (outbreakCreateEndDate)
        body.endDate = new Date(outbreakCreateEndDate).toISOString();

      const res = await fetch(`${API}/diseases/${outbreakDisease.id}/outbreaks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      alert('✅ Tạo đợt dịch mới thành công');
      setOutbreakCreateName('');
      setOutbreakCreateDescription('');
      setOutbreakCreateStartDate('');
      setOutbreakCreateEndDate('');
      await loadOutbreaks(outbreakDisease.id);
    } catch (err) {
      alert('❌ Lỗi tạo đợt dịch: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const startEditOutbreak = (o: DiseaseOutbreak) => {
    setOutbreakEditingId(o.id);
    setOutbreakCreateName(o.name || '');
    setOutbreakCreateDescription(o.description || '');
    setOutbreakCreateStartDate(toDateInputValue(o.startDate));
    setOutbreakCreateEndDate(toDateInputValue(o.endDate));
  };

  const cancelEditOutbreak = () => {
    setOutbreakEditingId(null);
    setOutbreakCreateName('');
    setOutbreakCreateDescription('');
    setOutbreakCreateStartDate('');
    setOutbreakCreateEndDate('');
  };

  const saveOutbreakEdit = async () => {
    if (!outbreakDisease || !outbreakEditingId) return;

    try {
      const token = requireTokenOrLogin();
      if (!token) return;
      const body: { name?: string; description?: string; startDate?: string; endDate?: string | null } = {};
      if (outbreakCreateName.trim()) body.name = outbreakCreateName.trim();
      if (outbreakCreateDescription.trim()) body.description = outbreakCreateDescription.trim();
      if (outbreakCreateStartDate) body.startDate = new Date(outbreakCreateStartDate).toISOString();
      body.endDate = outbreakCreateEndDate ? new Date(outbreakCreateEndDate).toISOString() : null;

      const res = await fetch(`${API}/outbreaks/${outbreakEditingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      alert('✅ Đã cập nhật đợt dịch');
      cancelEditOutbreak();
      await loadOutbreaks(outbreakDisease.id);
    } catch (err) {
      alert('❌ Lỗi cập nhật đợt dịch: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const deleteOutbreak = async (outbreakId: string) => {
    if (!outbreakDisease) return;
    if (!confirm('Xóa đợt dịch này? Nếu đợt đã đóng, hệ thống sẽ hiện lại (unarchive) các ca bệnh thuộc đợt.')) {
      return;
    }
    try {
      const token = requireTokenOrLogin();
      if (!token) return;
      const res = await fetch(`${API}/outbreaks/${outbreakId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      alert('✅ Đã xóa đợt dịch');
      if (outbreakEditingId === outbreakId) cancelEditOutbreak();
      await loadOutbreaks(outbreakDisease.id);
    } catch (err) {
      alert('❌ Lỗi xóa đợt dịch: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const closeOutbreak = async (outbreakId: string, endDate?: string) => {
    if (!confirm('Đóng đợt dịch này? Ca bệnh thuộc đợt sẽ được ẩn (archive) khỏi bản đồ mặc định.')) {
      return;
    }
    try {
      const token = requireTokenOrLogin();
      if (!token) return;
      const body: { endDate?: string } = {};
      if (endDate) body.endDate = new Date(endDate).toISOString();
      const res = await fetch(`${API}/outbreaks/${outbreakId}/close`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      alert('✅ Đã đóng đợt dịch');
      if (outbreakDisease) await loadOutbreaks(outbreakDisease.id);
    } catch (err) {
      alert('❌ Lỗi đóng đợt dịch: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const reopenOutbreak = async (outbreakId: string) => {
    if (hasActiveOutbreak) {
      alert('⚠️ Bệnh này đang có 1 đợt dịch đang hoạt động. Không thể mở lại đợt khác cùng lúc.');
      return;
    }
    try {
      const token = requireTokenOrLogin();
      if (!token) return;
      const res = await fetch(`${API}/outbreaks/${outbreakId}/reopen`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      alert('✅ Đã mở lại đợt dịch');
      if (outbreakDisease) await loadOutbreaks(outbreakDisease.id);
    } catch (err) {
      alert('❌ Lỗi mở lại đợt dịch: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const newOutbreakFromOld = async (outbreakId: string) => {
    if (!confirm('Tạo đợt dịch mới từ đợt này? (Hệ thống sẽ đóng đợt cũ và tạo đợt mới active)')) {
      return;
    }
    try {
      const token = requireTokenOrLogin();
      if (!token) return;
      const body: { name?: string; startDate?: string } = {};
      if (outbreakCreateName.trim()) body.name = outbreakCreateName.trim();
      if (outbreakCreateStartDate)
        body.startDate = new Date(outbreakCreateStartDate).toISOString();
      const res = await fetch(`${API}/outbreaks/${outbreakId}/new-from-old`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      alert('✅ Đã tạo đợt dịch mới');
      setOutbreakCreateName('');
      setOutbreakCreateStartDate('');
      if (outbreakDisease) await loadOutbreaks(outbreakDisease.id);
    } catch (err) {
      alert('❌ Lỗi tạo đợt mới: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const bulkArchive = async (mode: 'archive' | 'unarchive') => {
    if (!outbreakDisease) return;
    if (!archiveFrom && !archiveTo && !archiveOutbreakId) {
      if (!confirm('Bạn chưa chọn thời gian/đợt dịch. Thao tác sẽ áp dụng cho toàn bộ ca của bệnh này. Tiếp tục?')) {
        return;
      }
    }

    setArchiving(true);
    try {
      const token = requireTokenOrLogin();
      if (!token) return;
      const body: {
        diseaseType: string;
        from?: string;
        to?: string;
        outbreakId?: string;
      } = {
        diseaseType: outbreakDisease.name,
      };
      if (archiveFrom) body.from = new Date(archiveFrom).toISOString();
      if (archiveTo) body.to = new Date(archiveTo).toISOString();
      if (archiveOutbreakId) body.outbreakId = archiveOutbreakId;

      const res = await fetch(`${API}/gis/cases/${mode}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { affected?: number };
      alert(
        `✅ ${mode === 'archive' ? 'Đã ẩn' : 'Đã hiển thị lại'} ${data?.affected ?? 0} ca`,
      );
    } catch (err) {
      alert('❌ Lỗi thao tác ca bệnh: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setArchiving(false);
    }
  };

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
      alert(
        '❌ Lỗi kết nối: ' + (err instanceof Error ? err.message : 'Unknown error'),
      );
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
                                  onClick={() => openOutbreakModal(disease)}
                                  className="px-2.5 py-1.5 rounded border border-slate-200 hover:bg-slate-50 transition-colors"
                                  title="Đợt dịch"
                                >
                                  🗓️
                                </button>
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
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      riskLevel: e.target.value as Disease['riskLevel'],
                    })
                  }
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

      {/* Outbreak Modal */}
      {showOutbreakModal && outbreakDisease && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[92vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">🗓️ Quản lý đợt dịch</h2>
                <p className="text-sm text-slate-500">{outbreakDisease.name}</p>
              </div>
              <button
                onClick={closeOutbreakModal}
                className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>

            <div className="p-4 sm:p-6 bg-slate-50 space-y-6 overflow-y-auto max-h-[calc(92vh-74px)]">
              {/* Create */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-800">{outbreakEditingId ? 'Chỉnh sửa đợt dịch' : 'Tạo đợt dịch'}</h3>
                    <p className="text-sm text-slate-500">{outbreakEditingId ? 'Cập nhật thông tin đợt dịch' : 'Mỗi bệnh chỉ có 1 đợt active tại một thời điểm'}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full ${hasActiveOutbreak ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {hasActiveOutbreak ? 'Đang có đợt active' : 'Chưa có đợt active'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Tên đợt (tuỳ chọn)</label>
                    <input
                      value={outbreakCreateName}
                      onChange={e => setOutbreakCreateName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="VD: Đợt 2026 - bùng phát trở lại"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase min-h-[32px]">Ngày bắt đầu</label>
                    <input
                      type="date"
                      value={outbreakCreateStartDate}
                      onChange={e => setOutbreakCreateStartDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase min-h-[32px]">Ngày kết thúc (tuỳ chọn)</label>
                    <input
                      type="date"
                      value={outbreakCreateEndDate}
                      onChange={e => setOutbreakCreateEndDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Mô tả (tuỳ chọn)</label>
                    <textarea
                      value={outbreakCreateDescription}
                      onChange={e => setOutbreakCreateDescription(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="VD: Khu vực bùng phát, nguyên nhân dự đoán, ghi chú xử lý..."
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end mt-4">
                  {outbreakEditingId && (
                    <button
                      onClick={cancelEditOutbreak}
                      className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Hủy sửa
                    </button>
                  )}
                  <button
                    onClick={outbreakEditingId ? saveOutbreakEdit : createOutbreak}
                    disabled={!outbreakEditingId && hasActiveOutbreak && !outbreakCreateEndDate}
                    className={`px-4 py-2 rounded-lg text-white font-semibold ${(!outbreakEditingId && hasActiveOutbreak && !outbreakCreateEndDate) ? 'bg-slate-300 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-lg transition-shadow'}`}
                  >
                    {outbreakEditingId ? '💾 Lưu thay đổi' : '➕ Tạo đợt mới'}
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">Danh sách đợt dịch</h3>
                  <button
                    onClick={() => loadOutbreaks(outbreakDisease.id)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm"
                  >
                    ↻ Tải lại
                  </button>
                </div>

                {outbreaksLoading ? (
                  <div className="py-10 text-center text-slate-600">⏳ Đang tải...</div>
                ) : outbreaks.length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="text-4xl mb-2">📭</div>
                    <div className="text-slate-700 font-medium">Chưa có đợt dịch</div>
                    <div className="text-slate-500 text-sm">Hãy tạo 1 đợt dịch để quản lý vòng đời</div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[780px] border-collapse table-fixed">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Tên đợt</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Trạng thái</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase w-44">Bắt đầu</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase w-44">Kết thúc</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase w-64">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outbreaks.map(o => (
                          <tr key={o.id} className="border-t border-slate-200 hover:bg-slate-50">
                            <td className="px-4 py-3 text-sm text-slate-800">
                              {o.name || '(Không tên)'}
                              {activeOutbreak?.id === o.id && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                  Active
                                </span>
                              )}
                              {o.description && (
                                <div className="text-xs text-slate-500 mt-1">{o.description}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${o.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                {o.status === 'active' ? 'Hoạt động' : 'Đã đóng'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap tabular-nums align-top">{formatDateTime(o.startDate)}</td>
                            <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap tabular-nums align-top">{formatDateTime(o.endDate)}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2 justify-center flex-wrap">
                                {o.status === 'active' ? (
                                  <>
                                    <input
                                      type="date"
                                      value={outbreakCloseEndDate}
                                      onChange={e => setOutbreakCloseEndDate(e.target.value)}
                                      className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                      title="Ngày kết thúc (tuỳ chọn)"
                                    />
                                    <button
                                      onClick={() => closeOutbreak(o.id, outbreakCloseEndDate || undefined)}
                                      className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm"
                                    >
                                      ⛔ Đóng
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => reopenOutbreak(o.id)}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm"
                                  >
                                    ▶️ Mở lại
                                  </button>
                                )}
                                <button
                                  onClick={() => newOutbreakFromOld(o.id)}
                                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm"
                                  title="Đóng đợt cũ và tạo đợt mới active"
                                >
                                  ♻️ Tạo đợt mới
                                </button>

                                <button
                                  onClick={() => startEditOutbreak(o)}
                                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm"
                                >
                                  ✏️ Sửa
                                </button>

                                <button
                                  onClick={() => deleteOutbreak(o.id)}
                                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm text-red-600"
                                >
                                  🗑️ Xóa
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Archive cases */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="mb-3">
                  <h3 className="font-semibold text-slate-800">Ẩn/Hiện ca bệnh (Archive)</h3>
                  <p className="text-sm text-slate-500">Dùng để tránh bản đồ bị kín theo thời gian</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Từ ngày</label>
                    <input
                      type="date"
                      value={archiveFrom}
                      onChange={e => setArchiveFrom(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Đến ngày</label>
                    <input
                      type="date"
                      value={archiveTo}
                      onChange={e => setArchiveTo(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Theo đợt (tuỳ chọn)</label>
                    <select
                      value={archiveOutbreakId}
                      onChange={e => setArchiveOutbreakId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">(Không chọn)</option>
                      {outbreaks.map(o => (
                        <option key={o.id} value={o.id}>
                          {o.status === 'active' ? 'Active' : 'Closed'} - {o.name || o.id.slice(0, 8)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 justify-end mt-4">
                  <button
                    onClick={() => bulkArchive('unarchive')}
                    disabled={archiving}
                    className={`px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 ${archiving ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    👁️ Hiện lại
                  </button>
                  <button
                    onClick={() => bulkArchive('archive')}
                    disabled={archiving}
                    className={`px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold hover:shadow-lg transition-shadow ${archiving ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    🧹 Ẩn bớt
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}