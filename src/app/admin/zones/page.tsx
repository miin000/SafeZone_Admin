'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ZoneModal from '@/components/ZoneModal';
import { ADMIN_NAV_ITEMS } from '@/constants/navigation';

const API = process.env.NEXT_PUBLIC_API_URL!;

interface Zone {
  id: string;
  name: string;
  diseaseType: string;
  riskLevel: string;
  caseCount: number;
  isActive: boolean;
  lifecycleStatus?: string;
  createdAt?: string;
}

const riskLabels: Record<string, string> = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  critical: 'Nguy hiểm',
};

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');

  const loadZones = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/zones?all=true`);
      if (!response.ok) throw new Error('Không thể tải vùng dịch');
      const data = await response.json();
      setZones(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error(error);
      setZones([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  const filteredZones = useMemo(
    () =>
      zones.filter((zone) => {
        const matchesRisk =
          riskFilter === 'all' || zone.riskLevel === riskFilter;
        const query = search.trim().toLowerCase();
        const matchesSearch =
          !query ||
          zone.name.toLowerCase().includes(query) ||
          zone.diseaseType.toLowerCase().includes(query);
        return matchesRisk && matchesSearch;
      }),
    [zones, riskFilter, search],
  );

  const toggleZone = async (zone: Zone) => {
    const token = localStorage.getItem('token') || '';
    const response = await fetch(`${API}/zones/${zone.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ isActive: !zone.isActive }),
    });
    if (!response.ok) {
      alert('Không thể cập nhật trạng thái vùng dịch');
      return;
    }
    loadZones();
  };

  const deleteZone = async (zone: Zone) => {
    if (!window.confirm(`Xóa vùng dịch "${zone.name}"?`)) return;
    const token = localStorage.getItem('token') || '';
    const response = await fetch(`${API}/zones/${zone.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      alert('Không thể xóa vùng dịch');
      return;
    }
    loadZones();
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar navItems={ADMIN_NAV_ITEMS} />
      <main className="ml-64">
        <Header />
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Quản lý vùng dịch</h1>
              <p className="text-sm text-slate-500">
                Vùng dịch chỉ được tạo/cập nhật từ ca đã xác nhận và đánh giá dịch tễ.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingZoneId(null);
                setModalOpen(true);
              }}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold"
            >
              + Thêm vùng dịch
            </button>
          </div>

          <div className="mb-4 flex gap-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên vùng hoặc bệnh..."
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2"
            />
            <select
              value={riskFilter}
              onChange={(event) => setRiskFilter(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <option value="all">Tất cả mức rủi ro</option>
              {Object.entries(riskLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
            {loading ? (
              <div className="p-8 text-center text-slate-500">Đang tải...</div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Tên vùng</th>
                    <th className="px-4 py-3">Bệnh</th>
                    <th className="px-4 py-3">Rủi ro</th>
                    <th className="px-4 py-3">Ca đã xác nhận</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredZones.map((zone) => (
                    <tr key={zone.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium">{zone.name}</td>
                      <td className="px-4 py-3">{zone.diseaseType}</td>
                      <td className="px-4 py-3">{riskLabels[zone.riskLevel] || zone.riskLevel}</td>
                      <td className="px-4 py-3">{zone.caseCount}</td>
                      <td className="px-4 py-3">{zone.isActive ? 'Đang hoạt động' : 'Đã tắt'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setEditingZoneId(zone.id); setModalOpen(true); }}
                            className="rounded border px-2 py-1"
                          >
                            Sửa
                          </button>
                          <button onClick={() => toggleZone(zone)} className="rounded border px-2 py-1">
                            {zone.isActive ? 'Tắt' : 'Bật'}
                          </button>
                          <button onClick={() => deleteZone(zone)} className="rounded border border-red-200 px-2 py-1 text-red-600">
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
      <ZoneModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingZoneId(null); }}
        zoneId={editingZoneId}
        onSave={() => { setModalOpen(false); setEditingZoneId(null); loadZones(); }}
      />
    </div>
  );
}
