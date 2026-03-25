'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import type { FeatureCollection } from 'geojson';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { ADMIN_NAV_ITEMS } from '@/constants/navigation';
import type { DisplayMode, Case, Stats, DBSCANClustersResponse } from '@/types';
import { 
  getStatusColor, 
  getDiseaseColor, 
  getBilingualDiseaseLabel,
  getBilingualStatusLabel,
  getBilingualSeverityLabel,
  SEVERITY_COLORS,
} from '@/types';
import CaseModal from '@/components/CaseModal';
import ZoneModal from '@/components/ZoneModal';
import { 
  QuickStatCard, 
  StatCard, 
  SeverityItem, 
  DiseaseBar, 
  StatusBar,
  RegionRankItem,
  TrendChart,
  LineChart,
  Card,
  ComparisonCard,
} from '@/components/ui/StatCards';

// Dynamic imports for SSR issues with Leaflet
const MapView = dynamic(() => import('./MapView'), { ssr: false });
const TimelineControl = dynamic(() => import('@/components/map/TimelineControl'), { ssr: false });

const API = process.env.NEXT_PUBLIC_API_URL!;

type TabType = 'filters' | 'stats';

// Zone interface
interface Zone {
  id: string;
  name: string;
  diseaseType: string;
  center: { type: 'Point'; coordinates: [number, number] };
  radiusKm: number;
  riskLevel: string;
  caseCount: number;
  description?: string;
  isActive: boolean;
  startDate?: string;
}

export default function MapDashboard() {
  // Sidebar states
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('filters');
  const [showTimeline, setShowTimeline] = useState(false);

  // Filter states
  const [mode, setMode] = useState<DisplayMode>('points_disease');
  const [diseaseType, setDiseaseType] = useState<string>('ALL');
  const [status, setStatus] = useState<string>('ALL');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [quickFilter, setQuickFilter] = useState<string>('all');

  // Data states
  const [regions, setRegions] = useState<any>(null);
  const [cases, setCases] = useState<FeatureCollection | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [clusters, setClusters] = useState<DBSCANClustersResponse | null>(null);
  const [clustersLoading, setClustersLoading] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [diseaseOptions, setDiseaseOptions] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [pendingPublicationCount, setPendingPublicationCount] = useState(0);

  // DBSCAN tuning
  const [dbscanEpsKm, setDbscanEpsKm] = useState<number>(3);
  const [dbscanMinPoints, setDbscanMinPoints] = useState<number>(4);
  const [dbscanIncludeNoise, setDbscanIncludeNoise] = useState<boolean>(false);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);

  // Load regions once
  useEffect(() => {
    fetch(`${API}/gis/regions`)
      .then(r => r.json())
      .then(setRegions)
      .catch(err => console.error('Error loading regions:', err));
  }, []);

  // Load zones
  const loadZones = useCallback(() => {
    fetch(`${API}/zones?all=true`)
      .then(r => r.json())
      .then(setZones)
      .catch(err => console.error('Error loading zones:', err));
  }, []);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  useEffect(() => {
    fetch(`${API}/reports?status=pending&page=1&limit=1`)
      .then((r) => (r.ok ? r.json() : { total: 0 }))
      .then((data) => setPendingPublicationCount(Number(data?.total || 0)))
      .catch(() => setPendingPublicationCount(0));
  }, [cases, zones]);

  // Build URL params
  const buildParams = useCallback(() => {
    const sp = new URLSearchParams();
    if (diseaseType !== 'ALL') sp.set('diseaseType', diseaseType);
    if (status !== 'ALL') sp.set('status', status);
    if (from) sp.set('from', from);
    if (to) sp.set('to', to);
    return sp.toString();
  }, [diseaseType, status, from, to]);

  // Load stats
  useEffect(() => {
    fetch(`${API}/gis/stats?${buildParams()}`)
      .then(r => r.json())
      .then((s: Stats) => {
        setStats(s);
        setDiseaseOptions((s.byDisease || []).map((x: any) => x.disease_type));
        setStatusOptions((s.byStatus || []).map((x: any) => x.status));
      })
      .catch(err => console.error('Error loading stats:', err));
  }, [buildParams]);

  // Load cases
  const loadCases = useCallback(() => {
    fetch(`${API}/gis/cases?${buildParams()}`)
      .then(r => r.json())
      .then((fc: FeatureCollection) => {
        setCases(fc);
      })
      .catch(err => console.error('Error loading cases:', err));
  }, [buildParams]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  // Load DBSCAN clusters (on-demand when cluster mode is selected)
  const loadClusters = useCallback(() => {
    const sp = new URLSearchParams(buildParams());
    sp.set('clusterDistanceKm', String(dbscanEpsKm));
    sp.set('minPoints', String(dbscanMinPoints));
    if (dbscanIncludeNoise) {
      sp.set('includeNoise', 'true');
    }

    setClustersLoading(true);
    fetch(`${API}/gis/clusters?${sp.toString()}`)
      .then(r => r.json())
      .then((data: DBSCANClustersResponse) => setClusters(data))
      .catch(err => console.error('Error loading DBSCAN clusters:', err))
      .finally(() => setClustersLoading(false));
  }, [buildParams, dbscanEpsKm, dbscanMinPoints, dbscanIncludeNoise]);

  useEffect(() => {
    if (mode !== 'clusters_dbscan') return;
    loadClusters();
  }, [mode, loadClusters]);

  // Quick date filter handler
  const handleQuickFilter = (filter: string) => {
    setQuickFilter(filter);
    const now = new Date();

    switch (filter) {
      case 'today': {
        const today = now.toISOString().split('T')[0];
        setFrom(today);
        setTo(today);
        break;
      }
      case 'week': {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        setFrom(weekAgo.toISOString().split('T')[0]);
        setTo(now.toISOString().split('T')[0]);
        break;
      }
      case 'month': {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        setFrom(monthAgo.toISOString().split('T')[0]);
        setTo(now.toISOString().split('T')[0]);
        break;
      }
      case 'year': {
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        setFrom(yearAgo.toISOString().split('T')[0]);
        setTo(now.toISOString().split('T')[0]);
        break;
      }
      case 'all':
      default:
        setFrom('');
        setTo('');
        break;
    }
  };

  // Handle case click from map
  const handleCaseClick = useCallback((caseData: Case) => {
    setEditingCaseId(caseData.id);
    setModalOpen(true);
  }, []);

  // Handle zone click from map
  const handleZoneClick = useCallback((zone: Zone) => {
    setEditingZoneId(zone.id);
    setZoneModalOpen(true);
  }, []);

  // Handle zone toggle from map
  const handleToggleZoneActive = useCallback(async (zone: Zone) => {
    if (!confirm(`Bạn có chắc muốn ${zone.isActive ? 'tắt' : 'bật'} vùng dịch "${zone.name}"?`)) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/zones/${zone.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ isActive: !zone.isActive }),
      });
      if (res.ok) {
        loadZones();
      }
    } catch (err) {
      console.error('Error toggling zone:', err);
    }
  }, [loadZones]);

  // Handle modal save
  const handleModalSave = useCallback(() => {
    loadCases();
    fetch(`${API}/gis/stats?${buildParams()}`)
      .then(r => r.json())
      .then(setStats)
      .catch(err => console.error('Error reloading stats:', err));
  }, [loadCases, buildParams]);

  // Handle zone modal save
  const handleZoneModalSave = useCallback(() => {
    loadZones();
  }, [loadZones]);

  // Reset all filters
  const handleResetFilters = () => {
    setDiseaseType('ALL');
    setStatus('ALL');
    setFrom('');
    setTo('');
    setQuickFilter('all');
  };

  // Handle mode change
  const handleModeChange = useCallback((newMode: DisplayMode) => {
    setMode(newMode);
  }, []);

  // Timeline date change handler
  const handleTimelineDateChange = useCallback((date: string) => {
    setTo(date);
    setQuickFilter('custom');
  }, []);

  const timelineMinDate = stats?.summary?.min_time?.split('T')[0] || '2024-01-01';
  const timelineMaxDate = stats?.summary?.max_time?.split('T')[0] || new Date().toISOString().split('T')[0];

  // Calculate active cases
  const activeCases = useMemo(() => {
    return (stats?.byStatus || [])
      .filter((s: any) => ['suspected', 'probable', 'confirmed', 'under treatment', 'under observation'].includes(s.status))
      .reduce((sum: number, s: any) => sum + s.total, 0);
  }, [stats]);

  return (
    <div className="flex">
      <Sidebar navItems={ADMIN_NAV_ITEMS} />

      <main className="flex-1 ml-64">
        <Header />

        {/* Map & side panel container */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', minHeight: 'calc(100vh - 120px)' }}>
          {/* Map Area */}
          <div style={{ flex: 1, position: 'relative' }}>
            {!cases ? (
              <div style={loadingOverlayStyle}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Đang tải dữ liệu...</div>
                <div style={{ opacity: 0.6, marginTop: 8, fontSize: 14, color: '#64748b' }}>
                  Loading map data...
                </div>
              </div>
            ) : (
              <MapView
                mode={mode}
                regions={regions}
                cases={cases}
                clusters={clusters}
                zones={zones}
                onCaseClick={handleCaseClick}
                onZoneClick={handleZoneClick}
                onToggleZoneActive={handleToggleZoneActive}
                onModeChange={handleModeChange}
              />
            )}

            {/* Floating Action Buttons */}
            <div style={floatingActionsStyle}>
              <button
                onClick={() => {
                  setEditingCaseId(null);
                  setModalOpen(true);
                }}
                style={fabStyle}
                title="Thêm ca bệnh"
              >
                ➕ Thêm ca
              </button>
              <button
                onClick={() => {
                  setEditingZoneId(null);
                  setZoneModalOpen(true);
                }}
                style={{ ...fabStyle, background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                title="Tạo vùng dịch"
              >
                🚨 Vùng dịch
              </button>
            </div>

            {/* Timeline Control */}
            {showTimeline && stats?.summary?.min_time && (
              <TimelineControl
                minDate={timelineMinDate}
                maxDate={timelineMaxDate}
                selectedDate={to || timelineMaxDate}
                onDateChange={handleTimelineDateChange}
              />
            )}
          </div>

          {/* Right Sidebar - Filters & Stats */}
          {rightPanelOpen && (
            <div style={rightPanelStyle}>
              {/* Panel Header */}
              <div style={panelHeaderStyle}>
                <div style={tabsContainerStyle}>
                  <button
                    onClick={() => setActiveTab('filters')}
                    style={{
                      ...tabButtonStyle,
                      background: activeTab === 'filters' ? '#10b981' : 'transparent',
                      color: activeTab === 'filters' ? '#fff' : '#64748b',
                    }}
                  >
                    🔍 Bộ lọc
                  </button>
                  <button
                    onClick={() => setActiveTab('stats')}
                    style={{
                      ...tabButtonStyle,
                      background: activeTab === 'stats' ? '#10b981' : 'transparent',
                      color: activeTab === 'stats' ? '#fff' : '#64748b',
                    }}
                  >
                    📊 Thống kê
                  </button>
                </div>
                <button
                  onClick={() => setRightPanelOpen(false)}
                  style={closeButtonStyle}
                >
                  ✕
                </button>
              </div>

              {/* Panel Content */}
              <div style={panelContentStyle}>
                {activeTab === 'filters' ? (
                  <FiltersPanel
                    mode={mode}
                    setMode={setMode}
                    diseaseType={diseaseType}
                    setDiseaseType={setDiseaseType}
                    status={status}
                    setStatus={setStatus}
                    from={from}
                    setFrom={setFrom}
                    to={to}
                    setTo={setTo}
                    quickFilter={quickFilter}
                    handleQuickFilter={handleQuickFilter}
                    setQuickFilter={setQuickFilter}
                    diseaseOptions={diseaseOptions}
                    statusOptions={statusOptions}
                    handleResetFilters={handleResetFilters}
                    stats={stats}
                    zones={zones}
                    showTimeline={showTimeline}
                    setShowTimeline={setShowTimeline}
                    dbscanEpsKm={dbscanEpsKm}
                    setDbscanEpsKm={setDbscanEpsKm}
                    dbscanMinPoints={dbscanMinPoints}
                    setDbscanMinPoints={setDbscanMinPoints}
                    dbscanIncludeNoise={dbscanIncludeNoise}
                    setDbscanIncludeNoise={setDbscanIncludeNoise}
                    clusters={clusters}
                    clustersLoading={clustersLoading}
                    pendingPublicationCount={pendingPublicationCount}
                  />
                ) : (
                  <StatsPanel stats={stats} />
                )}
              </div>
            </div>
          )}

          {/* Toggle Right Panel Button */}
          {!rightPanelOpen && (
            <button
              onClick={() => setRightPanelOpen(true)}
              style={togglePanelButtonStyle}
            >
              ◀ Mở bộ lọc
            </button>
          )}
        </div>
        
        {/* Case Modal */}
        <CaseModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingCaseId(null);
          }}
          caseId={editingCaseId}
          onSave={handleModalSave}
        />

        {/* Zone Modal */}
        <ZoneModal
          isOpen={zoneModalOpen}
          onClose={() => {
            setZoneModalOpen(false);
            setEditingZoneId(null);
          }}
          zoneId={editingZoneId}
          onSave={handleZoneModalSave}
        />
      </main>
    </div>
  );
}

// ============================================
// FILTERS PANEL
// ============================================
function FiltersPanel({
  mode, setMode,
  diseaseType, setDiseaseType,
  status, setStatus,
  from, setFrom,
  to, setTo,
  quickFilter, handleQuickFilter, setQuickFilter,
  diseaseOptions, statusOptions,
  handleResetFilters,
  stats,
  zones,
  showTimeline,
  setShowTimeline,
  dbscanEpsKm,
  setDbscanEpsKm,
  dbscanMinPoints,
  setDbscanMinPoints,
  dbscanIncludeNoise,
  setDbscanIncludeNoise,
  clusters,
  clustersLoading,
  pendingPublicationCount,
}: any) {
  return (
    <div>
      {/* Quick Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 20 }}>
          <div style={quickStatStyle}>
            <span style={{ fontSize: 20 }}>🏥</span>
            <div>
              <div style={quickStatValueStyle}>{stats.summary?.total_cases ?? 0}</div>
              <div style={quickStatLabelStyle}>Tổng ca</div>
            </div>
          </div>
          <div style={{ ...quickStatStyle, background: 'linear-gradient(135deg, #fef2f2, #fee2e2)' }}>
            <span style={{ fontSize: 20 }}>🚨</span>
            <div>
              <div style={{ ...quickStatValueStyle, color: '#dc2626' }}>
                {(stats.byStatus || [])
                  .filter((s: any) => ['suspected', 'probable', 'confirmed', 'under treatment'].includes(s.status))
                  .reduce((sum: number, s: any) => sum + s.total, 0)}
              </div>
              <div style={quickStatLabelStyle}>Đang hoạt động</div>
            </div>
          </div>
          <div style={{ ...quickStatStyle, background: 'linear-gradient(135deg, #fffbeb, #fef3c7)' }}>
            <span style={{ fontSize: 20 }}>⏳</span>
            <div>
              <div style={{ ...quickStatValueStyle, color: '#b45309' }}>{pendingPublicationCount}</div>
              <div style={quickStatLabelStyle}>Chờ công bố</div>
            </div>
          </div>
        </div>
      )}

      {/* Display Mode */}
      <div style={filterGroupStyle}>
        <label style={labelStyle}>Chế độ hiển thị</label>
        <select 
          value={mode} 
          onChange={(e) => setMode(e.target.value as DisplayMode)} 
          style={selectStyle}
        >
          <option value="points_disease">🦠 Theo loại bệnh</option>
          <option value="points_status">📊 Theo trạng thái</option>
          <option value="heatmap">🔥 Bản đồ nhiệt</option>
          <option value="clusters_dbscan">🧩 Cụm DBSCAN</option>
        </select>
      </div>

      {mode === 'clusters_dbscan' && (
        <div style={{ ...filterGroupStyle, border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#f8fafc' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
            Thiết lập DBSCAN
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={labelStyle}>eps (km)</label>
              <input
                type="number"
                min={0.5}
                max={20}
                step={0.5}
                value={dbscanEpsKm}
                onChange={(e) => setDbscanEpsKm(Number(e.target.value || 3))}
                style={selectStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>minPoints</label>
              <input
                type="number"
                min={1}
                max={50}
                step={1}
                value={dbscanMinPoints}
                onChange={(e) => setDbscanMinPoints(Number(e.target.value || 4))}
                style={selectStyle}
              />
            </div>
          </div>
          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={dbscanIncludeNoise}
              onChange={(e) => setDbscanIncludeNoise(e.target.checked)}
              style={{ accentColor: '#10b981' }}
            />
            <span>Hiển thị noise points</span>
          </label>
          <div style={{ marginTop: 8, fontSize: 11, color: '#64748b' }}>
            {clustersLoading
              ? 'Đang chạy DBSCAN...'
              : clusters
              ? `Clusters: ${clusters.totalClusters} | In clusters: ${clusters.totalCasesInClusters} | Noise: ${clusters.noiseCount}`
              : 'Chưa có dữ liệu DBSCAN'}
          </div>
        </div>
      )}

      {/* Disease Type */}
      <div style={filterGroupStyle}>
        <label style={labelStyle}>Loại bệnh</label>
        <select 
          value={diseaseType} 
          onChange={(e) => setDiseaseType(e.target.value)} 
          style={selectStyle}
        >
          <option value="ALL">Tất cả</option>
          {diseaseOptions.map((d: string) => (
            <option key={d} value={d}>{getBilingualDiseaseLabel(d)}</option>
          ))}
        </select>
      </div>

      {/* Status */}
      <div style={filterGroupStyle}>
        <label style={labelStyle}>Trạng thái</label>
        <select 
          value={status} 
          onChange={(e) => setStatus(e.target.value)} 
          style={selectStyle}
        >
          <option value="ALL">Tất cả</option>
          {statusOptions.map((s: string) => (
            <option key={s} value={s}>{getBilingualStatusLabel(s)}</option>
          ))}
        </select>
      </div>

      {/* Quick Date Filters */}
      <div style={filterGroupStyle}>
        <label style={labelStyle}>Khoảng thời gian</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'today', label: 'Hôm nay' },
            { key: 'week', label: '7 ngày' },
            { key: 'month', label: '30 ngày' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => handleQuickFilter(f.key)}
              style={{
                ...quickFilterButtonStyle,
                background: quickFilter === f.key ? '#10b981' : '#f8fafc',
                color: quickFilter === f.key ? '#fff' : '#475569',
                borderColor: quickFilter === f.key ? '#10b981' : '#e2e8f0',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Từ ngày</label>
          <input 
            type="date" 
            value={from} 
            onChange={(e) => {
              setFrom(e.target.value);
              setQuickFilter('custom');
            }} 
            style={selectStyle} 
          />
        </div>
        <div>
          <label style={labelStyle}>Đến ngày</label>
          <input 
            type="date" 
            value={to} 
            onChange={(e) => {
              setTo(e.target.value);
              setQuickFilter('custom');
            }} 
            style={selectStyle} 
          />
        </div>
      </div>

      {/* Timeline Toggle */}
      <div style={filterGroupStyle}>
        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            checked={showTimeline}
            onChange={(e) => setShowTimeline(e.target.checked)}
            style={{ accentColor: '#10b981' }}
          />
          <span>🎬 Hiển thị timeline</span>
        </label>
      </div>

      {/* Zone Summary */}
      {zones && zones.length > 0 && (
        <div style={zoneSummaryStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>🚨</span>
            <span style={{ fontWeight: 600, color: '#1e293b' }}>Vùng dịch</span>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#dc2626' }}>
                {zones.filter((z: any) => z.isActive).length}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Hoạt động</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#64748b' }}>
                {zones.length}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Tổng</div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Button */}
      <button onClick={handleResetFilters} style={resetButtonStyle}>
        🔄 Đặt lại bộ lọc
      </button>
    </div>
  );
}

// ============================================
// STATS PANEL
// ============================================
function StatsPanel({ stats }: { stats: Stats | null }) {
  if (!stats) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
        <div style={{ color: '#64748b' }}>Đang tải thống kê...</div>
      </div>
    );
  }

  const { summary, byDisease, byStatus, byWeek, topRegions, comparison } = stats;
  const maxDiseaseValue = Math.max(...(byDisease || []).map((d: any) => d.total), 1);

  return (
    <div>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={statCardStyle}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#1e293b' }}>{summary?.total_cases ?? 0}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Tổng số ca</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#dc2626' }}>{summary?.high_severity ?? 0}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Ca nặng</div>
        </div>
      </div>

      {/* 30-Day Comparison */}
      {comparison && (
        <div style={comparisonCardStyle}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>So sánh 30 ngày</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#1e293b' }}>{comparison.current_period}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>30 ngày qua</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ 
                fontSize: 16, 
                fontWeight: 700,
                color: comparison.current_period > comparison.previous_period ? '#dc2626' : '#22c55e',
              }}>
                {comparison.current_period > comparison.previous_period ? '↑' : '↓'}
                {Math.abs(comparison.current_period - comparison.previous_period)}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>vs kỳ trước</div>
            </div>
          </div>
        </div>
      )}

      {/* Top Diseases */}
      {byDisease && byDisease.length > 0 && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>🦠 Loại bệnh</div>
          {byDisease.slice(0, 4).map((d: any) => (
            <div key={d.disease_type} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#475569' }}>{getBilingualDiseaseLabel(d.disease_type)}</span>
                <span style={{ fontWeight: 700, color: getDiseaseColor(d.disease_type) }}>{d.total}</span>
              </div>
              <div style={progressBarBgStyle}>
                <div style={{ 
                  ...progressBarStyle,
                  width: `${(d.total / maxDiseaseValue) * 100}%`,
                  background: getDiseaseColor(d.disease_type),
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top Regions */}
      {topRegions && topRegions.length > 0 && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>🏛️ Top vùng</div>
          {topRegions.slice(0, 5).map((r: any, idx: number) => (
            <div key={r.id} style={regionItemStyle}>
              <div style={{
                ...rankBadgeStyle,
                background: idx < 3 ? ['#ffd700', '#c0c0c0', '#cd7f32'][idx] : '#e5e7eb',
              }}>
                {idx + 1}
              </div>
              <span style={{ flex: 1, fontSize: 12, color: '#475569' }}>{r.name}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: idx < 3 ? '#dc2626' : '#1e293b' }}>{r.total}</span>
            </div>
          ))}
        </div>
      )}

      {/* Link to detailed stats */}
      <Link href="/stats" style={viewMoreLinkStyle}>
        📈 Xem thống kê chi tiết
      </Link>
    </div>
  );
}

// ============================================
// STYLES
// ============================================
const containerStyle: React.CSSProperties = {
  display: 'flex',
  minHeight: '100vh',
  background: '#f1f5f9',
};

const sidebarStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  height: '100vh',
  background: '#fff',
  borderRight: '1px solid #e2e8f0',
  display: 'flex',
  flexDirection: 'column',
  transition: 'width 0.3s ease',
  zIndex: 1000,
  boxShadow: '2px 0 8px rgba(0, 0, 0, 0.04)',
};

const logoContainerStyle: React.CSSProperties = {
  padding: '18px 16px',
  borderBottom: '1px solid #e2e8f0',
};

const logoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  textDecoration: 'none',
  color: 'inherit',
};

const logoTextStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  background: 'linear-gradient(135deg, #10b981, #0ea5e9)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
};

const navStyle: React.CSSProperties = {
  flex: 1,
  padding: '12px 8px',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  overflowY: 'auto',
};

const navItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 12px',
  borderRadius: 8,
  textDecoration: 'none',
  transition: 'all 0.2s ease',
};

const collapseButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px',
  borderRadius: 6,
  border: 'none',
  background: '#f1f5f9',
  color: '#64748b',
  cursor: 'pointer',
  fontSize: 12,
};

const mainContentStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  transition: 'margin-left 0.3s ease',
};

const loadingOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  textAlign: 'center',
  zIndex: 10,
};

const floatingActionsStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 24,
  left: 24,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  zIndex: 1000,
};

const fabStyle: React.CSSProperties = {
  padding: '12px 20px',
  borderRadius: 12,
  border: 'none',
  background: 'linear-gradient(135deg, #10b981, #059669)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
  transition: 'all 0.2s ease',
};

const rightPanelStyle: React.CSSProperties = {
  width: 340,
  background: '#fff',
  borderLeft: '1px solid #e2e8f0',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.04)',
};

const panelHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  borderBottom: '1px solid #e2e8f0',
};

const tabsContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  background: '#f1f5f9',
  padding: 4,
  borderRadius: 8,
};

const tabButtonStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 6,
  border: 'none',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const closeButtonStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  border: 'none',
  background: '#f1f5f9',
  color: '#64748b',
  cursor: 'pointer',
  fontSize: 12,
};

const panelContentStyle: React.CSSProperties = {
  flex: 1,
  padding: 16,
  overflowY: 'auto',
};

const togglePanelButtonStyle: React.CSSProperties = {
  position: 'absolute',
  right: 0,
  top: '50%',
  transform: 'translateY(-50%)',
  padding: '12px 8px',
  borderRadius: '8px 0 0 8px',
  border: 'none',
  background: '#fff',
  color: '#64748b',
  fontSize: 12,
  cursor: 'pointer',
  boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)',
  writingMode: 'vertical-rl',
};

const quickStatStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: 14,
  background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
  borderRadius: 12,
  border: '1px solid #bbf7d0',
};

const quickStatValueStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  color: '#166534',
  lineHeight: 1,
};

const quickStatLabelStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#64748b',
  marginTop: 2,
};

const filterGroupStyle: React.CSSProperties = {
  marginBottom: 16,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#64748b',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
  fontSize: 13,
  color: '#1e293b',
  cursor: 'pointer',
};

const quickFilterButtonStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 6,
  border: '1px solid #e2e8f0',
  fontSize: 12,
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const checkboxLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 12px',
  background: '#f8fafc',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 13,
  color: '#475569',
};

const zoneSummaryStyle: React.CSSProperties = {
  padding: 14,
  background: '#fef2f2',
  borderRadius: 12,
  border: '1px solid #fecaca',
  marginBottom: 16,
};

const resetButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
  color: '#475569',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
};

const statCardStyle: React.CSSProperties = {
  padding: 16,
  background: '#f8fafc',
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  textAlign: 'center',
};

const comparisonCardStyle: React.CSSProperties = {
  padding: 16,
  background: '#fff',
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  marginBottom: 16,
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 20,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: '#64748b',
  marginBottom: 12,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const progressBarBgStyle: React.CSSProperties = {
  height: 6,
  background: '#e2e8f0',
  borderRadius: 3,
  overflow: 'hidden',
};

const progressBarStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: 3,
  transition: 'width 0.3s ease',
};

const regionItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 0',
  borderBottom: '1px solid #f1f5f9',
};

const rankBadgeStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 11,
  fontWeight: 700,
  color: '#1e293b',
};

const viewMoreLinkStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '14px',
  borderRadius: 10,
  background: 'linear-gradient(135deg, #10b981, #059669)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  textDecoration: 'none',
};
