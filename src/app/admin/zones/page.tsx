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
  lifecycleStatus?: 'proposed' | 'pending_approval' | 'approved' | 'rejected' | 'closed';
  source?: 'manual' | 'dbscan';
  proposalConfidence?: number | null;
  proposalMetadata?: Record<string, unknown> | null;
  proposedAt?: string;
  proposedBy?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface DbscanPreviewResponse {
  diseaseCount: number;
  totals: {
    totalClusters: number;
    eligibleClusters: number;
    estimatedProposals: number;
    skipped: {
      clusterTooSmall: number;
      lowConfidence: number;
      invalidCenter: number;
      overlapWithExistingZone: number;
    };
  };
  summary: Array<{
    diseaseType: string;
    totalClusters: number;
    eligibleClusters: number;
    estimatedProposals: number;
    skipped: {
      clusterTooSmall: number;
      lowConfidence: number;
      invalidCenter: number;
      overlapWithExistingZone: number;
    };
  }>;
}

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [pendingZones, setPendingZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [proposalWindowDays, setProposalWindowDays] = useState(14);
  const [proposalEpsKm, setProposalEpsKm] = useState(3);
  const [proposalMinPoints, setProposalMinPoints] = useState(4);
  const [proposalMinClusterCases, setProposalMinClusterCases] = useState(3);
  const [proposalMinConfidence, setProposalMinConfidence] = useState(0.45);
  const [proposalDiseaseType, setProposalDiseaseType] = useState('ALL');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<DbscanPreviewResponse | null>(null);

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

  const getToken = useCallback(() => {
    if (typeof window === 'undefined') return '';
    return (localStorage.getItem('token') || '').trim();
  }, []);

  const handleUnauthorized = useCallback(() => {
    if (typeof window === 'undefined') return;
    alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }, []);

  // Load zones
  const loadZones = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeFilter === 'ALL') params.set('all', 'true');
      if (activeFilter === 'active') params.set('active', 'true');
      if (activeFilter === 'inactive') params.set('active', 'false');

      const pendingParams = new URLSearchParams();
      pendingParams.set('all', 'true');
      pendingParams.set('lifecycleStatus', 'pending_approval');

      const [resMain, resPending] = await Promise.all([
        fetch(`${API}/zones?${params.toString()}`),
        fetch(`${API}/zones?${pendingParams.toString()}`),
      ]);

      if (resMain.ok) {
        const data = await resMain.json();
        const rows: Zone[] = Array.isArray(data) ? data : data.data || [];
        const main = rows.filter((z) => z.lifecycleStatus !== 'pending_approval');
        setZones(main);
      } else {
        setZones([]);
      }

      if (resPending.ok) {
        const pendingData = await resPending.json();
        const pendingRows: Zone[] = Array.isArray(pendingData)
          ? pendingData
          : pendingData.data || [];
        setPendingZones(pendingRows);
      } else {
        setPendingZones([]);
      }
    } catch (err) {
      console.error('Error loading zones:', err);
      setZones([]);
      setPendingZones([]);
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
      const token = getToken();
      const res = await fetch(`${API}/zones/${deleteConfirm.zoneId}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
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
      const token = getToken();
      const res = await fetch(`${API}/zones/${zone.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ isActive: !zone.isActive }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (res.ok) {
        loadZones();
      }
    } catch (err) {
      console.error('Toggle active failed:', err);
    }
  };

  const buildDbscanPayload = useCallback(() => {
    const to = new Date();
    const safeWindowDays = Math.min(90, Math.max(3, proposalWindowDays));
    const from = new Date(
      to.getTime() - safeWindowDays * 24 * 60 * 60 * 1000,
    );

    const payload: Record<string, unknown> = {
      from: from.toISOString(),
      to: to.toISOString(),
      epsKm: Math.min(30, Math.max(0.1, proposalEpsKm)),
      minPoints: Math.min(50, Math.max(1, Math.floor(proposalMinPoints))),
      minClusterCases: Math.min(
        500,
        Math.max(2, Math.floor(proposalMinClusterCases)),
      ),
      minConfidence: Math.min(1, Math.max(0, proposalMinConfidence)),
    };

    if (proposalDiseaseType !== 'ALL') {
      payload.diseaseTypes = [proposalDiseaseType];
    }

    return payload;
  }, [
    proposalWindowDays,
    proposalEpsKm,
    proposalMinPoints,
    proposalMinClusterCases,
    proposalMinConfidence,
    proposalDiseaseType,
  ]);

  const handlePreviewDbscan = async () => {
    setPreviewLoading(true);
    try {
      const token = getToken();
      if (!token) {
        handleUnauthorized();
        return;
      }

      const res = await fetch(`${API}/zones/proposals/dbscan/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(buildDbscanPayload()),
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Không thể xem trước đề xuất DBSCAN');
      }

      const data = await res.json();
      setPreviewData(data);
    } catch (err) {
      console.error('Preview proposals failed:', err);
      alert('Không thể xem trước đề xuất DBSCAN. Vui lòng thử lại.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleGenerateDbscanProposals = async () => {
    setGenerating(true);
    try {
      const token = getToken();
      if (!token) {
        handleUnauthorized();
        return;
      }
      const payload = buildDbscanPayload();

      const res = await fetch(`${API}/zones/proposals/dbscan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (res.status === 401) {
          handleUnauthorized();
          return;
        }
        const msg = await res.text();
        throw new Error(msg || 'Không thể tạo đề xuất DBSCAN');
      }

      const result = await res.json();
      alert(
        `Đã tạo ${result.createdCount || 0} đề xuất, bỏ qua ${result.skippedCount || 0}.`,
      );
      loadZones();
    } catch (err) {
      console.error('Generate proposals failed:', err);
      alert('Không thể tạo đề xuất từ DBSCAN. Vui lòng thử lại.');
    } finally {
      setGenerating(false);
    }
  };

  const handleApproveProposal = async (zoneId: string) => {
    try {
      const token = getToken();
      const res = await fetch(`${API}/zones/${zoneId}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ note: 'Duyệt công bố vùng dịch từ đề xuất DBSCAN' }),
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!res.ok) {
        throw new Error('Approve proposal failed');
      }
      loadZones();
    } catch (err) {
      console.error('Approve proposal failed:', err);
      alert('Duyệt đề xuất thất bại.');
    }
  };

  const handleRejectProposal = async (zoneId: string) => {
    try {
      const token = getToken();
      const res = await fetch(`${API}/zones/${zoneId}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ note: 'Từ chối đề xuất vùng dịch sau khi rà soát' }),
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!res.ok) {
        throw new Error('Reject proposal failed');
      }
      loadZones();
    } catch (err) {
      console.error('Reject proposal failed:', err);
      alert('Từ chối đề xuất thất bại.');
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
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Quản lý vùng dịch</h1>
            <p className="text-sm text-slate-500">Epidemic Zone Management</p>
          </div>
          <button
            onClick={() => {
              setEditingZoneId(null);
              setModalOpen(true);
            }}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Thêm vùng dịch
          </button>
          <button
            onClick={handleGenerateDbscanProposals}
            disabled={generating}
            className="ml-3 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-60"
          >
            {generating ? 'Đang tạo đề xuất...' : 'Đề xuất từ DBSCAN'}
          </button>
        </header>

        {/* Page Content */}
        <div className="p-6">
          <div className="card p-4 mb-6">
            <h3 className="text-base font-semibold text-slate-800 mb-3">Thiết lập DBSCAN đề xuất vùng dịch</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
              <label className="text-sm text-slate-600">
                Cửa sổ ngày
                <input
                  type="number"
                  min={3}
                  max={90}
                  step={1}
                  value={proposalWindowDays}
                  onChange={(e) => setProposalWindowDays(Number(e.target.value || 14))}
                  className="input w-full mt-1"
                />
              </label>
              <label className="text-sm text-slate-600">
                Eps (km)
                <input
                  type="number"
                  min={0.1}
                  max={30}
                  step={0.1}
                  value={proposalEpsKm}
                  onChange={(e) => setProposalEpsKm(Number(e.target.value || 3))}
                  className="input w-full mt-1"
                />
              </label>
              <label className="text-sm text-slate-600">
                Min points
                <input
                  type="number"
                  min={1}
                  max={50}
                  step={1}
                  value={proposalMinPoints}
                  onChange={(e) => setProposalMinPoints(Number(e.target.value || 4))}
                  className="input w-full mt-1"
                />
              </label>
              <label className="text-sm text-slate-600">
                Min ca trong cụm
                <input
                  type="number"
                  min={2}
                  max={500}
                  step={1}
                  value={proposalMinClusterCases}
                  onChange={(e) => setProposalMinClusterCases(Number(e.target.value || 3))}
                  className="input w-full mt-1"
                />
              </label>
              <label className="text-sm text-slate-600">
                Min confidence
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={proposalMinConfidence}
                  onChange={(e) => setProposalMinConfidence(Number(e.target.value || 0.45))}
                  className="input w-full mt-1"
                />
              </label>
              <label className="text-sm text-slate-600">
                Bệnh áp dụng
                <select
                  value={proposalDiseaseType}
                  onChange={(e) => setProposalDiseaseType(e.target.value)}
                  className="input w-full mt-1"
                >
                  <option value="ALL">Tất cả bệnh</option>
                  {diseaseTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={handlePreviewDbscan}
                disabled={previewLoading}
                className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 disabled:opacity-60"
              >
                {previewLoading ? 'Đang xem trước...' : 'Xem trước đề xuất'}
              </button>
              <span className="text-xs text-slate-500">
                Xem trước số cụm đủ điều kiện trước khi tạo vùng dịch chờ công bố.
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Gợi ý khởi điểm: eps 2-4km, minPoints 4-6 cho khu đô thị; eps 4-8km, minPoints 3-5 cho khu thưa dân.
            </p>

            {previewData && (
              <div className="mt-4 border border-slate-200 rounded-xl p-3 bg-slate-50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="text-xs text-slate-500">Tổng cụm</div>
                    <div className="text-lg font-semibold text-slate-800">{previewData.totals.totalClusters}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="text-xs text-slate-500">Đủ điều kiện</div>
                    <div className="text-lg font-semibold text-emerald-700">{previewData.totals.eligibleClusters}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="text-xs text-slate-500">Ước tính đề xuất</div>
                    <div className="text-lg font-semibold text-blue-700">{previewData.totals.estimatedProposals}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="text-xs text-slate-500">Loại do trùng vùng</div>
                    <div className="text-lg font-semibold text-amber-700">{previewData.totals.skipped.overlapWithExistingZone}</div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-600 border-b border-slate-200">
                        <th className="py-1 pr-3">Bệnh</th>
                        <th className="py-1 pr-3">Tổng cụm</th>
                        <th className="py-1 pr-3">Đủ điều kiện</th>
                        <th className="py-1 pr-3">Loại do nhỏ</th>
                        <th className="py-1 pr-3">Loại do confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.summary.map((s) => (
                        <tr key={s.diseaseType} className="border-b border-slate-100">
                          <td className="py-1 pr-3 text-slate-800">{s.diseaseType}</td>
                          <td className="py-1 pr-3">{s.totalClusters}</td>
                          <td className="py-1 pr-3 text-emerald-700 font-medium">{s.eligibleClusters}</td>
                          <td className="py-1 pr-3">{s.skipped.clusterTooSmall}</td>
                          <td className="py-1 pr-3">{s.skipped.lowConfidence}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Pending publication proposals */}
          <div className="card p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-slate-800">Vùng dịch chờ công bố</h3>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                {pendingZones.length} đề xuất
              </span>
            </div>

            {pendingZones.length === 0 ? (
              <p className="text-sm text-slate-500">Chưa có đề xuất nào đang chờ duyệt.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">Tên đề xuất</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">Bệnh</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">Nguy cơ</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">Confidence</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">Nguồn</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">Ca cụm</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingZones.map((zone) => {
                      const riskConfig = getRiskConfig(zone.riskLevel);
                      const clusterCaseCount = Number(
                        (zone.proposalMetadata as any)?.clusterCaseCount ?? NaN,
                      );
                      const displayCaseCount = Number.isFinite(clusterCaseCount)
                        ? clusterCaseCount
                        : zone.caseCount;
                      return (
                        <tr key={zone.id} className="border-b border-slate-100">
                          <td className="px-3 py-2 text-sm font-medium text-slate-800">{zone.name}</td>
                          <td className="px-3 py-2 text-sm text-slate-600">{zone.diseaseType}</td>
                          <td className="px-3 py-2 text-sm">
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{ backgroundColor: riskConfig.bgColor, color: riskConfig.color }}
                            >
                              {riskConfig.label}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-sm text-slate-600">
                            {typeof zone.proposalConfidence === 'number'
                              ? `${Math.round(zone.proposalConfidence * 100)}%`
                              : '-'}
                          </td>
                          <td className="px-3 py-2 text-sm text-slate-600 uppercase">
                            {zone.source || 'manual'}
                          </td>
                          <td className="px-3 py-2 text-sm text-slate-600">
                            {displayCaseCount}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleApproveProposal(zone.id)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-semibold hover:bg-emerald-200"
                              >
                                Duyệt
                              </button>
                              <button
                                onClick={() => handleRejectProposal(zone.id)}
                                className="px-2.5 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200"
                              >
                                Từ chối
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
            <div 
              onClick={() => { setRiskFilter('ALL'); setActiveFilter('ALL'); }}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                riskFilter === 'ALL' && activeFilter === 'ALL' ? 'ring-2 ring-sky-500 bg-sky-50' : ''
              }`}
            >
              <div className="text-2xl font-bold text-sky-600">{stats.total}</div>
              <div className="text-xs text-slate-500">Tất cả</div>
            </div>
            <div 
              onClick={() => { setActiveFilter('active'); setRiskFilter('ALL'); }}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                activeFilter === 'active' ? 'ring-2 ring-emerald-500 bg-emerald-50' : ''
              }`}
            >
              <div className="text-2xl font-bold text-emerald-600">{stats.active}</div>
              <div className="text-xs text-slate-500">Đang hoạt động</div>
            </div>
            <div 
              onClick={() => { setActiveFilter('inactive'); setRiskFilter('ALL'); }}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                activeFilter === 'inactive' ? 'ring-2 ring-slate-500 bg-slate-100' : ''
              }`}
            >
              <div className="text-2xl font-bold text-slate-600">{stats.inactive}</div>
              <div className="text-xs text-slate-500">Đã tắt</div>
            </div>
            <div 
              onClick={() => { setRiskFilter('critical'); setActiveFilter('ALL'); }}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                riskFilter === 'critical' ? 'ring-2 ring-purple-500 bg-purple-50' : ''
              }`}
            >
              <div className="text-2xl font-bold text-purple-600">{stats.critical}</div>
              <div className="text-xs text-slate-500">Nguy hiểm</div>
            </div>
            <div 
              onClick={() => { setRiskFilter('high'); setActiveFilter('ALL'); }}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                riskFilter === 'high' ? 'ring-2 ring-red-500 bg-red-50' : ''
              }`}
            >
              <div className="text-2xl font-bold text-red-600">{stats.high}</div>
              <div className="text-xs text-slate-500">Cao</div>
            </div>
            <div 
              onClick={() => { setRiskFilter('medium'); setActiveFilter('ALL'); }}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                riskFilter === 'medium' ? 'ring-2 ring-orange-500 bg-orange-50' : ''
              }`}
            >
              <div className="text-2xl font-bold text-orange-600">{stats.medium}</div>
              <div className="text-xs text-slate-500">Trung bình</div>
            </div>
            <div 
              onClick={() => { setRiskFilter('low'); setActiveFilter('ALL'); }}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                riskFilter === 'low' ? 'ring-2 ring-green-500 bg-green-50' : ''
              }`}
            >
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
                  placeholder="Tìm kiếm theo tên, loại bệnh..."
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
                Đặt lại
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
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Không có vùng dịch nào</h3>
                <p className="text-slate-500 mb-4">Thay đổi bộ lọc hoặc tạo vùng dịch mới</p>
                <button
                  onClick={() => {
                    setEditingZoneId(null);
                    setModalOpen(true);
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  Tạo vùng dịch đầu tiên
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
                                {zone.isActive ? 'Hoạt động' : 'Đã tắt'}
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
                                  S
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm({ open: true, zoneId: zone.id })}
                                  className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-600 transition-colors"
                                  title="Xóa"
                                >
                                  X
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
