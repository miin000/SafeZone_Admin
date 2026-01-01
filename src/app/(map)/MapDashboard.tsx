'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import type { FeatureCollection } from 'geojson';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { DisplayMode, Case, Stats } from '@/types';
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
  // View states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
  const [zones, setZones] = useState<Zone[]>([]);
  const [diseaseOptions, setDiseaseOptions] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);

  // Sidebar width based on state
  const sidebarWidth = useMemo(() => {
    if (!sidebarOpen) return 0;
    if (sidebarCollapsed) return 56;
    return 380;
  }, [sidebarOpen, sidebarCollapsed]);

  // Load regions once
  useEffect(() => {
    fetch(`${API}/gis/regions`)
      .then(r => r.json())
      .then(setRegions)
      .catch(err => console.error('Error loading regions:', err));
  }, []);

  // Load zones - fetch all including inactive for list display
  const loadZones = useCallback(() => {
    fetch(`${API}/zones?all=true`)
      .then(r => r.json())
      .then(setZones)
      .catch(err => console.error('Error loading zones:', err));
  }, []);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

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

  // Quick date filter handler
  const handleQuickFilter = (filter: string) => {
    setQuickFilter(filter);
    const now = new Date();
    
    switch (filter) {
      case 'today':
        const today = now.toISOString().split('T')[0];
        setFrom(today);
        setTo(today);
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        setFrom(weekAgo.toISOString().split('T')[0]);
        setTo(now.toISOString().split('T')[0]);
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        setFrom(monthAgo.toISOString().split('T')[0]);
        setTo(now.toISOString().split('T')[0]);
        break;
      case 'year':
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        setFrom(yearAgo.toISOString().split('T')[0]);
        setTo(now.toISOString().split('T')[0]);
        break;
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

  // Handle zone toggle active (deactivate/activate from map popup)
  const handleToggleZoneActive = useCallback(async (zone: Zone) => {
    if (!confirm(`Bạn có chắc muốn ${zone.isActive ? 'tắt' : 'bật'} vùng dịch "${zone.name}"?`)) {
      return;
    }
    try {
      const res = await fetch(`${API}/zones/${zone.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !zone.isActive }),
      });
      if (res.ok) {
        loadZones();
      } else {
        alert('Lỗi khi cập nhật trạng thái vùng dịch');
      }
    } catch (err) {
      console.error('Error toggling zone:', err);
      alert('Lỗi kết nối khi cập nhật vùng dịch');
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

  // Handle mode change from MapView
  const handleModeChange = useCallback((newMode: DisplayMode) => {
    setMode(newMode);
  }, []);

  // Timeline date change handler
  const handleTimelineDateChange = useCallback((date: string) => {
    setTo(date);
    setQuickFilter('custom');
  }, []);

  // Get date range for timeline
  const timelineMinDate = stats?.summary?.min_time?.split('T')[0] || '2024-01-01';
  const timelineMaxDate = stats?.summary?.max_time?.split('T')[0] || new Date().toISOString().split('T')[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Top Navigation Bar */}
      <div style={{
        height: 52,
        minHeight: 52,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(200, 200, 200, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 1001,
        color: '#1f2937',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, color: '#1f2937' }}>
            🛡️ SafeZone
          </h1>
          <span style={{ opacity: 0.6, fontSize: 12, color: '#6b7280' }}>Hệ thống giám sát dịch bệnh GIS</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/stats" style={navButtonStyle}>
            📊 Thống kê
          </Link>
          <Link href="/admin" style={navButtonStyle}>
            ⚙️ Quản trị
          </Link>
          <Link href="/admin/reports" style={{ ...navButtonStyle, borderColor: '#ff9800', color: '#ff9800' }}>
            📋 Báo cáo
          </Link>
          <button
            onClick={() => {
              setEditingCaseId(null);
              setModalOpen(true);
            }}
            style={navButtonPrimaryStyle}
          >
            + Thêm ca
          </button>
          <button
            onClick={() => {
              setEditingZoneId(null);
              setZoneModalOpen(true);
            }}
            style={{ ...navButtonPrimaryStyle, background: '#f44336' }}
          >
            🚨 Vùng dịch
          </button>
        </div>
      </div>

      {/* Main Content - Sidebar + Map */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div 
          style={{ 
            width: sidebarWidth,
            minWidth: sidebarWidth,
            borderRight: sidebarOpen ? '1px solid rgba(200, 200, 200, 0.5)' : 'none',
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.3s ease, min-width 0.3s ease',
            position: 'relative',
            color: '#1f2937',
          }}
        >
        {sidebarOpen && !sidebarCollapsed && (
          <>
            {/* Sidebar Header */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(200, 200, 200, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => setActiveTab('filters')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: 'none',
                    background: activeTab === 'filters' ? '#238636' : 'rgba(0,0,0,0.05)',
                    color: activeTab === 'filters' ? '#fff' : '#4b5563',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  🗺️ Bộ lọc
                </button>
                <button
                  onClick={() => setActiveTab('stats')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: 'none',
                    background: activeTab === 'stats' ? '#238636' : 'rgba(0,0,0,0.05)',
                    color: activeTab === 'stats' ? '#fff' : '#4b5563',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  📊 Thống kê
                </button>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button 
                  onClick={() => setSidebarCollapsed(true)}
                  style={iconButtonStyle}
                  title="Thu nhỏ / Collapse"
                >
                  ◀
                </button>
                <button 
                  onClick={() => setSidebarOpen(false)}
                  style={iconButtonStyle}
                  title="Đóng sidebar / Close"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {activeTab === 'filters' ? (
                <FiltersTab
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
                  onAddCase={() => {
                    setEditingCaseId(null);
                    setModalOpen(true);
                  }}
                  onAddZone={() => {
                    setEditingZoneId(null);
                    setZoneModalOpen(true);
                  }}
                  stats={stats}
                  zones={zones}
                  showTimeline={showTimeline}
                  setShowTimeline={setShowTimeline}
                />
              ) : (
                <StatsTab stats={stats} />
              )}
            </div>
          </>
        )}

        {/* Collapsed Sidebar */}
        {sidebarOpen && sidebarCollapsed && (
          <div style={{ padding: '14px 8px', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            <button 
              onClick={() => setSidebarCollapsed(false)}
              style={iconButtonStyle}
              title="Mở rộng / Expand"
            >
              ▶
            </button>
            <div style={{ height: 1, background: 'rgba(200, 200, 200, 0.4)', width: '80%', margin: '8px 0' }} />
            <button
              onClick={() => { setSidebarCollapsed(false); setActiveTab('filters'); }}
              style={{
                ...iconButtonStyle,
                background: activeTab === 'filters' ? '#238636' : 'transparent',
              }}
              title="Bộ lọc / Filters"
            >
              🗺️
            </button>
            <button
              onClick={() => { setSidebarCollapsed(false); setActiveTab('stats'); }}
              style={{
                ...iconButtonStyle,
                background: activeTab === 'stats' ? '#238636' : 'transparent',
              }}
              title="Thống kê / Stats"
            >
              📊
            </button>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toggle button when sidebar closed */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              position: 'absolute',
              left: 12,
              top: 12,
              zIndex: 1000,
              ...iconButtonStyle,
              background: '#238636',
              width: 44,
              height: 44,
              fontSize: 18,
            }}
            title="Mở sidebar / Open sidebar"
          >
            ☰
          </button>
        )}

        {/* Map Area */}
        <div style={{ flex: 1, position: 'relative' }}>
          {!cases ? (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>🗺️</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Đang tải dữ liệu...</div>
              <div style={{ opacity: 0.6, marginTop: 8, fontSize: 14 }}>
                Loading case data and regions...
              </div>
            </div>
          ) : (
            <MapView
              mode={mode}
              regions={regions}
              cases={cases}
              zones={zones}
              onCaseClick={handleCaseClick}
              onZoneClick={handleZoneClick}
              onToggleZoneActive={handleToggleZoneActive}
              onModeChange={handleModeChange}
            />
          )}
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
    </div>
  );
}

// ============================================
// FILTERS TAB COMPONENT
// ============================================
function FiltersTab({
  mode, setMode,
  diseaseType, setDiseaseType,
  status, setStatus,
  from, setFrom,
  to, setTo,
  quickFilter, handleQuickFilter, setQuickFilter,
  diseaseOptions, statusOptions,
  handleResetFilters,
  onAddCase,
  onAddZone,
  stats,
  zones,
  showTimeline,
  setShowTimeline,
}: any) {
  return (
    <div style={{ padding: '16px 18px' }}>
      {/* Quick Stats */}
      {stats && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <QuickStatCard 
              title="Tổng ca / Total" 
              value={stats.summary?.total_cases ?? 0} 
              icon="🏥"
            />
            <QuickStatCard 
              title="Đang hoạt động / Active" 
              value={
                stats.byStatus
                  ?.filter((s: any) => ['suspected', 'probable', 'confirmed', 'under treatment', 'under observation'].includes(s.status))
                  .reduce((sum: number, s: any) => sum + s.total, 0) ?? 0
              } 
              icon="🚨"
              highlight
            />
          </div>
        </div>
      )}

      {/* Display Mode */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Chế độ hiển thị / Display Mode</label>
        <select 
          value={mode} 
          onChange={(e) => setMode(e.target.value as DisplayMode)} 
          style={inputStyle}
        >
          <option value="points_disease">🦠 Loại bệnh (màu) + Mức độ</option>
          <option value="points_status">📊 Trạng thái (màu) + Mức độ</option>
          <option value="heatmap">🔥 Bản đồ nhiệt / Heatmap</option>
          <option value="grid_density">📐 Lưới nguy cơ / Risk Grid</option>
        </select>
      </div>

      {/* Disease Type */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Loại bệnh / Disease Type</label>
        <select 
          value={diseaseType} 
          onChange={(e) => setDiseaseType(e.target.value)} 
          style={inputStyle}
        >
          <option value="ALL">Tất cả / All</option>
          {diseaseOptions.map((d: string) => (
            <option key={d} value={d}>{getBilingualDiseaseLabel(d)}</option>
          ))}
        </select>
      </div>

      {/* Status */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Trạng thái / Status</label>
        <select 
          value={status} 
          onChange={(e) => setStatus(e.target.value)} 
          style={inputStyle}
        >
          <option value="ALL">Tất cả / All</option>
          {statusOptions.map((s: string) => (
            <option key={s} value={s}>{getBilingualStatusLabel(s)}</option>
          ))}
        </select>
      </div>

      {/* Quick date filters */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Khoảng thời gian / Time Period</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'today', label: 'Hôm nay' },
            { key: 'week', label: '7 ngày' },
            { key: 'month', label: '30 ngày' },
            { key: 'year', label: '1 năm' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => handleQuickFilter(f.key)}
              style={{
                ...quickFilterStyle,
                background: quickFilter === f.key ? '#238636' : 'rgba(255, 255, 255, 0.9)',
                borderColor: quickFilter === f.key ? '#238636' : 'rgba(200, 200, 200, 0.5)',
                color: quickFilter === f.key ? '#fff' : '#374151',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom date range with time */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Từ / From</label>
          <input 
            type="datetime-local" 
            value={from ? `${from}T00:00` : ''} 
            onChange={(e) => {
              const val = e.target.value;
              setFrom(val ? val.split('T')[0] : '');
              setQuickFilter('custom');
            }} 
            style={inputStyle} 
          />
        </div>
        <div>
          <label style={labelStyle}>Đến / To</label>
          <input 
            type="datetime-local" 
            value={to ? `${to}T23:59` : ''} 
            onChange={(e) => {
              const val = e.target.value;
              setTo(val ? val.split('T')[0] : '');
              setQuickFilter('custom');
            }} 
            style={inputStyle} 
          />
        </div>
      </div>

      {/* Timeline Toggle */}
      <div style={{ marginBottom: 16 }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
          padding: '10px 12px',
          background: showTimeline ? '#23863620' : 'rgba(255, 255, 255, 0.9)',
          border: `1px solid ${showTimeline ? '#238636' : 'rgba(200, 200, 200, 0.5)'}`,
          borderRadius: 8,
          color: '#374151',
        }}>
          <input
            type="checkbox"
            checked={showTimeline}
            onChange={(e) => setShowTimeline(e.target.checked)}
            style={{ accentColor: '#238636' }}
          />
          <span style={{ fontSize: 12 }}>
            🎬 Hiển thị timeline / Show timeline
          </span>
        </label>
      </div>

      {/* Zone Summary */}
      {zones && zones.length > 0 && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          borderRadius: 10,
          padding: 12,
          marginBottom: 16,
          border: '1px solid rgba(200, 200, 200, 0.4)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8, opacity: 0.8, color: '#6b7280' }}>
            🚨 Vùng dịch đang hoạt động / Active Zones
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#f44336' }}>
            {zones.filter((z: any) => z.isActive).length}
          </div>
          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4, color: '#6b7280' }}>
            Tổng: {zones.length} vùng
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button 
          onClick={handleResetFilters}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: 8,
            border: '1px solid rgba(200, 200, 200, 0.5)',
            background: 'rgba(255, 255, 255, 0.8)',
            color: '#4b5563',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          🔄 Đặt lại
        </button>
      </div>

      {/* Footer info */}
      <div style={{ 
        marginTop: 18,
        padding: '12px',
        background: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 10,
        fontSize: 11,
        opacity: 0.8,
        border: '1px solid rgba(200, 200, 200, 0.4)',
        color: '#6b7280',
      }}>
        <div>💡 Click marker để xem chi tiết / Click to view details</div>
        <div style={{ marginTop: 4 }}>🗺️ Bản đồ tập trung vào Việt Nam / Focus on Vietnam</div>
      </div>
    </div>
  );
}

// ============================================
// STATS TAB COMPONENT (Enhanced with charts)
// ============================================
function StatsTab({ stats }: { stats: Stats | null }) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  if (!stats) {
    return (
      <div style={{ padding: 24, textAlign: 'center', opacity: 0.7 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
        <div>Đang tải thống kê... / Loading stats...</div>
      </div>
    );
  }

  const { summary, byDisease, byStatus, byWeek, topRegions, comparison } = stats;

  const activeCases = (byStatus || [])
    .filter((s: any) => ['suspected', 'probable', 'confirmed', 'under treatment', 'under observation'].includes(s.status))
    .reduce((sum: number, s: any) => sum + s.total, 0);

  const maxDiseaseValue = Math.max(...(byDisease || []).map((d: any) => d.total), 1);
  
  // Prepare 7-day data
  const last7Days = (byWeek || []).slice(-7).map((w: any) => ({
    label: new Date(w.week).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
    value: w.total,
  }));
  const maxWeekValue = Math.max(...last7Days.map(d => d.value), 1);

  return (
    <div style={{ padding: '16px 18px' }}>
      {/* Summary Cards - 4 main stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <StatCard title="Tổng ca" value={summary?.total_cases ?? 0} />
        <StatCard title="Hoạt động" value={activeCases} highlight={activeCases > 0} />
        <StatCard title="Nặng" value={summary?.high_severity ?? 0} color={SEVERITY_COLORS[3]} />
        <StatCard title="Vùng" value={summary?.matched_region ?? 0} />
      </div>

      {/* 30-Day Comparison - Simple */}
      {comparison && (
        <div style={cardStyle}>
          <div style={cardTitleStyle}>📅 So sánh 30 ngày</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#1f2937' }}>{comparison.current_period}</div>
              <div style={{ fontSize: 10, opacity: 0.5 }}>30 ngày qua</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ 
                fontSize: 16, 
                fontWeight: 700,
                color: comparison.current_period > comparison.previous_period ? '#f44336' : 
                       comparison.current_period < comparison.previous_period ? '#4caf50' : '#666',
              }}>
                {comparison.current_period > comparison.previous_period ? '↑' : 
                 comparison.current_period < comparison.previous_period ? '↓' : '→'}
                {' '}{Math.abs(comparison.current_period - comparison.previous_period)}
              </div>
              <div style={{ fontSize: 10, opacity: 0.5 }}>vs kỳ trước</div>
            </div>
          </div>
        </div>
      )}

      {/* 7-Day Line Chart */}
      {last7Days.length > 0 && (
        <div style={cardStyle}>
          <div style={cardTitleStyle}>📈 Xu hướng 7 ngày gần nhất</div>
          <div style={{ marginTop: 12, position: 'relative' }}>
            <svg width="100%" height="100" viewBox="0 0 320 100" preserveAspectRatio="xMidYMid meet">
              {/* Grid lines */}
              {[0, 1, 2].map(i => (
                <line key={i} x1="30" y1={20 + i * 30} x2="310" y2={20 + i * 30} stroke="rgba(0,0,0,0.1)" strokeDasharray="3,3" />
              ))}
              {/* Area */}
              <path
                d={`M 30 ${80 - (last7Days[0]?.value / maxWeekValue) * 60} ${last7Days.map((d, i) => `L ${30 + (i / (last7Days.length - 1 || 1)) * 280} ${80 - (d.value / maxWeekValue) * 60}`).join(' ')} L ${30 + 280} 80 L 30 80 Z`}
                fill="rgba(31, 119, 180, 0.15)"
              />
              {/* Line */}
              <path
                d={`M ${last7Days.map((d, i) => `${30 + (i / (last7Days.length - 1 || 1)) * 280} ${80 - (d.value / maxWeekValue) * 60}`).join(' L ')}`}
                fill="none"
                stroke="#1f77b4"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Points */}
              {last7Days.map((d, i) => (
                <circle
                  key={i}
                  cx={30 + (i / (last7Days.length - 1 || 1)) * 280}
                  cy={80 - (d.value / maxWeekValue) * 60}
                  r={hoveredPoint === i ? 6 : 4}
                  fill={hoveredPoint === i ? '#fff' : '#1f77b4'}
                  stroke="#1f77b4"
                  strokeWidth="2"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredPoint(i)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}
              {/* X labels */}
              {last7Days.map((d, i) => (
                <text key={i} x={30 + (i / (last7Days.length - 1 || 1)) * 280} y="95" textAnchor="middle" fill="#666" fontSize="8">{d.label}</text>
              ))}
            </svg>
            {/* Tooltip */}
            {hoveredPoint !== null && last7Days[hoveredPoint] && (
              <div style={{
                position: 'absolute',
                left: `${((30 + (hoveredPoint / (last7Days.length - 1 || 1)) * 280) / 320) * 100}%`,
                top: 0,
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.9)',
                color: '#fff',
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: 11,
                whiteSpace: 'nowrap',
                zIndex: 10,
                pointerEvents: 'none',
              }}>
                <div style={{ fontWeight: 600 }}>📅 {last7Days[hoveredPoint].label}</div>
                <div>Số ca: <strong>{last7Days[hoveredPoint].value}</strong></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top 3 Diseases - Simple bars */}
      {byDisease && byDisease.length > 0 && (
        <div style={cardStyle}>
          <div style={cardTitleStyle}>🦠 Top bệnh</div>
          <div style={{ marginTop: 10 }}>
            {byDisease.slice(0, 3).map((d: any) => (
              <div key={d.disease_type} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                  <span style={{ color: '#374151' }}>{getBilingualDiseaseLabel(d.disease_type)}</span>
                  <span style={{ fontWeight: 700, color: getDiseaseColor(d.disease_type) }}>{d.total}</span>
                </div>
                <div style={{ height: 6, background: 'rgba(0, 0, 0, 0.1)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${(d.total / maxDiseaseValue) * 100}%`,
                    background: getDiseaseColor(d.disease_type),
                    borderRadius: 3,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top 5 Regions */}
      {topRegions && topRegions.length > 0 && (
        <div style={cardStyle}>
          <div style={cardTitleStyle}>🏛️ Top vùng dịch</div>
          <div style={{ marginTop: 10 }}>
            {topRegions.slice(0, 5).map((r: any, idx: number) => (
              <div key={r.id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                marginBottom: 8,
                padding: '6px 8px',
                background: idx < 3 ? 'rgba(244, 67, 54, 0.08)' : 'transparent',
                borderRadius: 6,
              }}>
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  background: idx < 3 ? ['#ffd700', '#c0c0c0', '#cd7f32'][idx] : '#e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                  color: idx < 3 ? '#000' : '#6b7280',
                }}>
                  {idx + 1}
                </div>
                <div style={{ flex: 1, fontSize: 11, color: '#374151' }}>{r.name}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: idx < 3 ? '#f44336' : '#1f2937' }}>{r.total}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Link to detailed stats */}
      <Link
        href="/stats"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginTop: 14,
          padding: '14px 18px',
          borderRadius: 10,
          border: '1px solid #238636',
          background: '#238636',
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        📈 Xem thống kê chi tiết
      </Link>
    </div>
  );
}

// ============================================
// STYLES
// ============================================
const navButtonStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 6,
  border: '1px solid rgba(200, 200, 200, 0.6)',
  background: 'rgba(255, 255, 255, 0.8)',
  color: '#4b5563',
  fontSize: 12,
  fontWeight: 500,
  textDecoration: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const navButtonPrimaryStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 6,
  border: 'none',
  background: '#238636',
  color: 'white',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const iconButtonStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: '1px solid rgba(200, 200, 200, 0.5)',
  background: 'rgba(255, 255, 255, 0.9)',
  color: '#6b7280',
  fontSize: 13,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const tabStyle: React.CSSProperties = {
  flex: 1,
  padding: '12px 16px',
  background: 'transparent',
  border: 'none',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

const labelStyle: React.CSSProperties = { 
  display: 'block', 
  fontSize: 10, 
  opacity: 0.7, 
  marginBottom: 6,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  color: '#6b7280',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid rgba(200, 200, 200, 0.5)',
  background: 'rgba(255, 255, 255, 0.9)',
  color: '#1f2937',
  fontSize: 13,
  cursor: 'pointer',
};

const quickFilterStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 6,
  border: '1px solid rgba(200, 200, 200, 0.5)',
  background: 'rgba(255, 255, 255, 0.85)',
  color: '#374151',
  fontSize: 11,
  cursor: 'pointer',
};

const cardStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.9)',
  borderRadius: 10,
  padding: 14,
  marginBottom: 12,
  border: '1px solid rgba(200, 200, 200, 0.4)',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  opacity: 0.8,
  color: '#6b7280',
};
