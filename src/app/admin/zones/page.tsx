'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { ADMIN_NAV_ITEMS } from '@/constants/navigation';
import ZoneModal from '@/components/ZoneModal';

const API = process.env.NEXT_PUBLIC_API_URL!;

// Use shared navigation items
const navItems = ADMIN_NAV_ITEMS;

// Risk level configurations
const RISK_LEVELS = [
  { value: 'low', label: 'Thấp', labelEn: 'Low', color: '#4caf50', bgColor: '#4caf5020' },
  { value: 'medium', label: 'Trung bình', labelEn: 'Medium', color: '#ff9800', bgColor: '#ff980020' },
  { value: 'high', label: 'Cao', labelEn: 'High', color: '#f44336', bgColor: '#f4433620' },
  { value: 'critical', label: 'Nguy hiểm', labelEn: 'Critical', color: '#9c27b0', bgColor: '#9c27b020' },
];

interface Zone {
  id: string;
  name: string;
  diseaseType: string;
  center: {
    type: 'Point';
    coordinates: [number, number]; // [lon, lat]
  };
  radiusKm: number;
  riskLevel: string;
  caseCount: number;
  description?: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function ZonesPage() {
  const [sidebarCollapsed] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [diseaseFilter, setDiseaseFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; zoneId: string | null }>({
    open: false,
    zoneId: null,
  });

  // Load zones
  const loadZones = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeFilter === 'active') params.set('active', 'true');
      if (activeFilter === 'inactive') params.set('active', 'false');
      
      const res = await fetch(`${API}/zones?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setZones(Array.isArray(data) ? data : data.data || []);
      } else {
        setZones([]);
      }
    } catch (err) {
      console.error('Error loading zones:', err);
      setZones([]);
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: zones.length,
      active: zones.filter(z => z.isActive).length,
      inactive: zones.filter(z => !z.isActive).length,
      critical: zones.filter(z => z.riskLevel === 'critical').length,
      high: zones.filter(z => z.riskLevel === 'high').length,
      medium: zones.filter(z => z.riskLevel === 'medium').length,
      low: zones.filter(z => z.riskLevel === 'low').length,
    };
  }, [zones]);

  // Filtered zones
  const filteredZones = useMemo(() => {
    return zones.filter(z => {
      if (riskFilter !== 'ALL' && z.riskLevel !== riskFilter) return false;
      if (activeFilter === 'active' && !z.isActive) return false;
      if (activeFilter === 'inactive' && z.isActive) return false;
      if (diseaseFilter !== 'ALL' && z.diseaseType !== diseaseFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !z.name.toLowerCase().includes(query) &&
          !z.diseaseType.toLowerCase().includes(query) &&
          !(z.description || '').toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [zones, riskFilter, activeFilter, diseaseFilter, searchQuery]);

  // Get unique disease types
  const diseaseTypes = useMemo(() => {
    return [...new Set(zones.map(z => z.diseaseType))];
  }, [zones]);

  // Handle delete
  const handleDelete = async () => {
    if (!deleteConfirm.zoneId) return;
    
    try {
      const res = await fetch(`${API}/zones/${deleteConfirm.zoneId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        loadZones();
      }
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleteConfirm({ open: false, zoneId: null });
    }
  };

  // Handle toggle active
  const handleToggleActive = async (zone: Zone) => {
    try {
      const res = await fetch(`${API}/zones/${zone.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !zone.isActive }),
      });
      if (res.ok) {
        loadZones();
      }
    } catch (err) {
      console.error('Toggle active failed:', err);
    }
  };

  // Get risk level config
  const getRiskConfig = (level: string) => {
    return RISK_LEVELS.find(r => r.value === level) || RISK_LEVELS[0];
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar */}
      <Sidebar navItems={navItems} />

      {/* Main Content */}
      <main className="flex-1 ml-64">
        {/* Top Bar */}
        <Header />
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-40">
          <div>
            <h1 className="text-xl font-bold text-slate-800">🚨 Quản lý vùng dịch</h1>
            <p className="text-sm text-slate-500">Epidemic Zone Management</p>
          </div>
          <button
            onClick={() => {
              setEditingZoneId(null);
              setModalOpen(true);
            }}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            + Thêm vùng dịch
          </button>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
            <div 
              onClick={() => { setRiskFilter('ALL'); setActiveFilter('ALL'); }}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                riskFilter === 'ALL' && activeFilter === 'ALL' ? 'ring-2 ring-sky-500 bg-sky-50' : ''
              }`}
            >
              <div className="text-2xl mb-2">📊</div>
              <div className="text-2xl font-bold text-sky-600">{stats.total}</div>
              <div className="text-xs text-slate-500">Tất cả</div>
            </div>
            <div 
              onClick={() => { setActiveFilter('active'); setRiskFilter('ALL'); }}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                activeFilter === 'active' ? 'ring-2 ring-emerald-500 bg-emerald-50' : ''
              }`}
            >
              <div className="text-2xl mb-2">✅</div>
              <div className="text-2xl font-bold text-emerald-600">{stats.active}</div>
              <div className="text-xs text-slate-500">Đang hoạt động</div>
            </div>
            <div 
              onClick={() => { setActiveFilter('inactive'); setRiskFilter('ALL'); }}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                activeFilter === 'inactive' ? 'ring-2 ring-slate-500 bg-slate-100' : ''
              }`}
            >
              <div className="text-2xl mb-2">⏸️</div>
              <div className="text-2xl font-bold text-slate-600">{stats.inactive}</div>
              <div className="text-xs text-slate-500">Đã tắt</div>
            </div>
            <div 
              onClick={() => { setRiskFilter('critical'); setActiveFilter('ALL'); }}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                riskFilter === 'critical' ? 'ring-2 ring-purple-500 bg-purple-50' : ''
              }`}
            >
              <div className="text-2xl mb-2">🔴</div>
              <div className="text-2xl font-bold text-purple-600">{stats.critical}</div>
              <div className="text-xs text-slate-500">Nguy hiểm</div>
            </div>
            <div 
              onClick={() => { setRiskFilter('high'); setActiveFilter('ALL'); }}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                riskFilter === 'high' ? 'ring-2 ring-red-500 bg-red-50' : ''
              }`}
            >
              <div className="text-2xl mb-2">🟠</div>
              <div className="text-2xl font-bold text-red-600">{stats.high}</div>
              <div className="text-xs text-slate-500">Cao</div>
            </div>
            <div 
              onClick={() => { setRiskFilter('medium'); setActiveFilter('ALL'); }}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                riskFilter === 'medium' ? 'ring-2 ring-orange-500 bg-orange-50' : ''
              }`}
            >
              <div className="text-2xl mb-2">🟡</div>
              <div className="text-2xl font-bold text-orange-600">{stats.medium}</div>
              <div className="text-xs text-slate-500">Trung bình</div>
            </div>
            <div 
              onClick={() => { setRiskFilter('low'); setActiveFilter('ALL'); }}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                riskFilter === 'low' ? 'ring-2 ring-green-500 bg-green-50' : ''
              }`}
            >
              <div className="text-2xl mb-2">🟢</div>
              <div className="text-2xl font-bold text-green-600">{stats.low}</div>
              <div className="text-xs text-slate-500">Thấp</div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="card p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="🔍 Tìm kiếm theo tên, loại bệnh..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input w-full"
                />
              </div>
              <select
                value={diseaseFilter}
                onChange={(e) => setDiseaseFilter(e.target.value)}
                className="input min-w-[160px]"
              >
                <option value="ALL">Tất cả loại bệnh</option>
                {diseaseTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <button 
                onClick={() => {
                  setRiskFilter('ALL');
                  setActiveFilter('ALL');
                  setDiseaseFilter('ALL');
                  setSearchQuery('');
                }}
                className="btn bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                🔄 Đặt lại
              </button>
            </div>
          </div>

          {/* Zones List */}
          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-slate-500">Đang tải...</p>
              </div>
            ) : filteredZones.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-5xl mb-4">🗺️</div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Không có vùng dịch nào</h3>
                <p className="text-slate-500 mb-4">Thay đổi bộ lọc hoặc tạo vùng dịch mới</p>
                <button
                  onClick={() => {
                    setEditingZoneId(null);
                    setModalOpen(true);
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  + Tạo vùng dịch đầu tiên
                </button>
              </div>
            ) : (
              <>
                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Tên vùng</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Loại bệnh</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Mức độ</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Bán kính</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Ca bệnh</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Trạng thái</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Ngày tạo</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600 w-[120px]">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredZones.map((zone) => {
                        const riskConfig = getRiskConfig(zone.riskLevel);
                        return (
                          <tr key={zone.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-800">{zone.name}</div>
                              {zone.description && (
                                <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">
                                  {zone.description}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                {zone.diseaseType}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span 
                                className="px-2.5 py-1 rounded-full text-xs font-medium"
                                style={{ 
                                  backgroundColor: riskConfig.bgColor,
                                  color: riskConfig.color 
                                }}
                              >
                                {riskConfig.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {zone.radiusKm} km
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-semibold text-slate-800">{zone.caseCount}</span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleToggleActive(zone)}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                  zone.isActive
                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                              >
                                {zone.isActive ? '✓ Hoạt động' : '⏸ Đã tắt'}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-500">
                              {zone.startDate
                                ? new Date(zone.startDate).toLocaleDateString('vi-VN')
                                : zone.createdAt
                                ? new Date(zone.createdAt).toLocaleDateString('vi-VN')
                                : '-'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingZoneId(zone.id);
                                    setModalOpen(true);
                                  }}
                                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
                                  title="Chỉnh sửa"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm({ open: true, zoneId: zone.id })}
                                  className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-600 transition-colors"
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

                {/* Summary */}
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-sm text-slate-500">
                  Hiển thị {filteredZones.length} / {zones.length} vùng dịch
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Zone Modal */}
      <ZoneModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingZoneId(null);
        }}
        zoneId={editingZoneId}
        onSave={() => {
          loadZones();
          setModalOpen(false);
          setEditingZoneId(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirm.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-2xl">
            <div className="text-5xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Xóa vùng dịch?</h3>
            <p className="text-slate-500 mb-6">
              Hành động này không thể hoàn tác. Bạn có chắc muốn xóa vùng dịch này?
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setDeleteConfirm({ open: false, zoneId: null })}
                className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold hover:shadow-lg transition-all"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
