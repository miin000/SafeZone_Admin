'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { ADMIN_NAV_ITEMS } from '@/constants/navigation';
import type { Stats, DiseaseStat, StatusStat, WeekStat, RegionStat } from '@/types';
import { 
  getDiseaseColor, 
  getStatusColor, 
  getBilingualDiseaseLabel, 
  getBilingualStatusLabel,
  SEVERITY_COLORS,
} from '@/types';

const API = process.env.NEXT_PUBLIC_API_URL!;

// Shared navigation items
const navItems = ADMIN_NAV_ITEMS;

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedDisease, setSelectedDisease] = useState<string>('ALL');
  const [selectedProvince, setSelectedProvince] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });

  // Build query params
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedDisease !== 'ALL') params.set('diseaseType', selectedDisease);
    if (selectedProvince !== 'ALL') params.set('regionName', selectedProvince);
    if (dateRange.from) params.set('from', dateRange.from);
    if (dateRange.to) params.set('to', dateRange.to);
    return params.toString();
  }, [selectedDisease, selectedProvince, dateRange]);

  // Load stats
  useEffect(() => {
    setLoading(true);
    fetch(`${API}/gis/stats?${queryString}`)
      .then(r => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [queryString]);

  const { summary, byDisease, byStatus, byWeek, topRegions, comparison } = stats || {};

  // Calculate derived stats
  const activeCases = (byStatus || [])
    .filter(s => ['suspected', 'probable', 'confirmed', 'under treatment', 'under observation'].includes(s.status))
    .reduce((sum, s) => sum + s.total, 0);

  const maxDiseaseValue = Math.max(...(byDisease || []).map(d => d.total), 1);

  // Weekly data for chart
  const weeklyData = useMemo(() => {
    return (byWeek || []).slice(-12).map(w => ({
      label: new Date(w.week).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      value: w.total,
    }));
  }, [byWeek]);

  const maxWeekValue = Math.max(...weeklyData.map(d => d.value), 1);

  return (
    <div className="flex">
      <Sidebar navItems={navItems} />

      <main className="flex-1 ml-64">
        <Header />

        <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">📊 Statistics</h1>
            <p className="text-sm text-slate-500">Phân tích số liệu & xu hướng dịch bệnh</p>
          </div>
          <div className="flex gap-3">
            <Link href="/" className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white hover:bg-slate-50">
              🗺️ Bản đồ
            </Link>
          </div>
        </div>

        <div className="p-6 bg-slate-50 min-h-[calc(100vh-200px)]">

        {/* Filters */}
        <div style={filtersContainerStyle}>
          <div style={filterGroupStyle}>
            <label style={filterLabelStyle}>Loại bệnh</label>
            <select 
              value={selectedDisease} 
              onChange={(e) => setSelectedDisease(e.target.value)}
              style={selectStyle}
            >
              <option value="ALL">Tất cả</option>
              {(byDisease || []).map(d => (
                <option key={d.disease_type} value={d.disease_type}>
                  {getBilingualDiseaseLabel(d.disease_type)}
                </option>
              ))}
            </select>
          </div>
          <div style={filterGroupStyle}>
            <label style={filterLabelStyle}>Tỉnh/Thành phố</label>
            <select 
              value={selectedProvince} 
              onChange={(e) => setSelectedProvince(e.target.value)}
              style={selectStyle}
            >
              <option value="ALL">Tất cả</option>
              {(topRegions || []).map(r => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))}
            </select>
          </div>
          <div style={filterGroupStyle}>
            <label style={filterLabelStyle}>Từ ngày</label>
            <input 
              type="date" 
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              style={selectStyle}
            />
          </div>
          <div style={filterGroupStyle}>
            {loading ? (
              <div style={loadingContainerStyle}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
                <div>Đang tải dữ liệu...</div>
              </div>
            ) : (
              <div style={contentGridStyle}>
                {/* Row 1 - Summary Cards */}
                <div style={summaryCardsGridStyle}>
                  <SummaryCard 
                    icon="🏥" 
                    label="Total Cases" 
                    value={summary?.total_cases ?? 0}
                    color="#3b82f6"
                  />
                  <SummaryCard 
                    icon="🚨" 
                    label="Active Cases" 
                    value={activeCases}
                    color="#dc2626"
                    highlight
                  />
                  <SummaryCard 
                    icon="✅" 
                    label="Recovered" 
                    value={(byStatus || []).filter(s => s.status === 'recovered').reduce((sum, s) => sum + s.total, 0)}
                    color="#22c55e"
                  />
                  <SummaryCard 
                    icon="⚠️" 
                    label="High Severity" 
                    value={summary?.high_severity ?? 0}
                    color="#f59e0b"
                  />
                </div>

                {/* Row 2 - Line Chart & Bar Chart */}
                <div style={chartsRowStyle}>
                  {/* Line Chart - Cases over time */}
                  <div style={chartCardStyle}>
                    <div style={chartTitleStyle}>📈 Số ca theo thời gian</div>
                    {weeklyData.length > 0 ? (
                      <div style={{ marginTop: 20, height: 200, position: 'relative' }}>
                        <svg width="100%" height="200" viewBox="0 0 500 200" preserveAspectRatio="xMidYMid meet">
                          {/* Grid lines */}
                          {[0, 1, 2, 3, 4].map(i => (
                            <line key={i} x1="50" y1={20 + i * 40} x2="480" y2={20 + i * 40} stroke="#e2e8f0" strokeWidth="1" />
                          ))}
                          {/* Area */}
                          <path
                            d={`M 50 ${180 - (weeklyData[0]?.value / maxWeekValue) * 160} ${weeklyData.map((d, i) => `L ${50 + (i / (weeklyData.length - 1 || 1)) * 430} ${180 - (d.value / maxWeekValue) * 160}`).join(' ')} L ${50 + 430} 180 L 50 180 Z`}
                            fill="rgba(59, 130, 246, 0.1)"
                          />
                          {/* Line */}
                          <path
                            d={`M ${weeklyData.map((d, i) => `${50 + (i / (weeklyData.length - 1 || 1)) * 430} ${180 - (d.value / maxWeekValue) * 160}`).join(' L ')}`}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {/* Points */}
                          {weeklyData.map((d, i) => (
                            <circle
                              key={i}
                              cx={50 + (i / (weeklyData.length - 1 || 1)) * 430}
                              cy={180 - (d.value / maxWeekValue) * 160}
                              r="5"
                              fill="#3b82f6"
                              stroke="#fff"
                              strokeWidth="2"
                            >
                              <title>{`${d.label}: ${d.value} ca`}</title>
                            </circle>
                          ))}
                          {/* X labels */}
                          {weeklyData.filter((_, i) => i % Math.ceil(weeklyData.length / 6) === 0).map((d, i, arr) => (
                            <text 
                              key={i} 
                              x={50 + (weeklyData.indexOf(d) / (weeklyData.length - 1 || 1)) * 430} 
                              y="198" 
                              textAnchor="middle" 
                              fill="#64748b" 
                              fontSize="11"
                            >
                              {d.label}
                            </text>
                          ))}
                          {/* Y labels */}
                          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
                            <text key={i} x="45" y={180 - t * 160 + 4} textAnchor="end" fill="#64748b" fontSize="11">
                              {Math.round(maxWeekValue * t)}
                            </text>
                          ))}
                        </svg>
                      </div>
                    ) : (
                      <div style={emptyStateStyle}>Không có dữ liệu</div>
                    )}
                  </div>

                  {/* Bar Chart - By Disease */}
                  <div style={chartCardStyle}>
                    <div style={chartTitleStyle}>🦠 Theo loại bệnh</div>
                    <div style={{ marginTop: 20 }}>
                      {(byDisease || []).slice(0, 6).map((d) => (
                        <div key={d.disease_type} style={{ marginBottom: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 13, color: '#475569' }}>{getBilingualDiseaseLabel(d.disease_type)}</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: getDiseaseColor(d.disease_type) }}>{d.total}</span>
                          </div>
                          <div style={progressBgStyle}>
                            <div style={{ 
                              ...progressFillStyle,
                              width: `${(d.total / maxDiseaseValue) * 100}%`,
                              background: `linear-gradient(90deg, ${getDiseaseColor(d.disease_type)}, ${getDiseaseColor(d.disease_type)}99)`,
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* By Region Pie */}
                <div style={chartCardStyle}>
                  <div style={chartTitleStyle}>🏛️ Theo vùng / mức độ nguy hiểm</div>
                  <div style={{ display: 'flex', gap: 32, marginTop: 20 }}>
                    {/* Severity Distribution */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 12 }}>Mức độ nặng</div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <SeverityBadge label="Nặng" value={summary?.high_severity ?? 0} total={summary?.total_cases ?? 1} color={SEVERITY_COLORS[3]} />
                        <SeverityBadge label="TB" value={summary?.medium_severity ?? 0} total={summary?.total_cases ?? 1} color={SEVERITY_COLORS[2]} />
                        <SeverityBadge label="Nhẹ" value={summary?.low_severity ?? 0} total={summary?.total_cases ?? 1} color={SEVERITY_COLORS[1]} />
                      </div>
                    </div>
                    {/* Top Regions */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 12 }}>Top vùng dịch</div>
                      {(topRegions || []).slice(0, 5).map((r, idx) => (
                        <div key={r.id} style={regionItemStyle}>
                          <span style={{
                            ...rankStyle,
                            background: idx < 3 ? ['#ffd700', '#c0c0c0', '#cd7f32'][idx] : '#e5e7eb',
                          }}>{idx + 1}</span>
                          <span style={{ flex: 1, fontSize: 12, color: '#475569' }}>{r.name}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: idx < 3 ? '#dc2626' : '#1e293b' }}>{r.total}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Status Distribution */}
                <div style={chartCardStyle}>
                  <div style={chartTitleStyle}>📊 Theo trạng thái</div>
                  <div style={{ marginTop: 20 }}>
                    {(byStatus || []).slice(0, 6).map((s) => {
                      const percent = summary?.total_cases ? (s.total / summary.total_cases) * 100 : 0;
                      return (
                        <div key={s.status} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                          <span style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: getStatusColor(s.status),
                            flexShrink: 0,
                          }} />
                          <span style={{ flex: 1, fontSize: 12, color: '#475569' }}>{getBilingualStatusLabel(s.status)}</span>
                          <span style={{ fontSize: 12, color: '#94a3b8', minWidth: 40 }}>{percent.toFixed(0)}%</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: getStatusColor(s.status), minWidth: 40, textAlign: 'right' }}>{s.total}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 30-Day Comparison */}
                {comparison && (
                  <div style={comparisonCardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ fontSize: 32 }}>📅</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>30 ngày qua</div>
                        <div style={{ fontSize: 32, fontWeight: 800, color: '#1e293b' }}>{comparison.current_period} ca</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>So với kỳ trước</div>
                        <div style={{ 
                          fontSize: 24, 
                          fontWeight: 700,
                          color: comparison.current_period > comparison.previous_period ? '#dc2626' : '#22c55e',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: 4,
                        }}>
                          {comparison.current_period > comparison.previous_period ? '↑' : '↓'}
                          {Math.abs(comparison.current_period - comparison.previous_period)} ca
                          <span style={{ fontSize: 14, color: '#94a3b8', marginLeft: 8 }}>
                            ({comparison.previous_period} trước đó)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      </main>
    </div>
  );
}

// ============================================
// SUB COMPONENTS
// ============================================

function SummaryCard({ icon, label, value, color, highlight = false }: { 
  icon: string; label: string; value: number; color: string; highlight?: boolean;
}) {
  return (
    <div style={{
      ...summaryCardStyle,
      background: highlight ? `linear-gradient(135deg, ${color}08, ${color}15)` : '#fff',
      borderColor: highlight ? color : '#e2e8f0',
    }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: highlight ? color : '#1e293b' }}>{value}</div>
      <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function SeverityBadge({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percent = total > 0 ? (value / total) * 100 : 0;
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
      <div style={{ 
        fontSize: 10, 
        color,
        background: `${color}15`,
        padding: '2px 8px',
        borderRadius: 10,
        marginTop: 4,
        display: 'inline-block',
      }}>{percent.toFixed(0)}%</div>
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
};

const navItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 12px',
  borderRadius: 8,
  textDecoration: 'none',
  transition: 'all 0.2s',
};

const collapseButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px',
  borderRadius: 6,
  border: 'none',
  background: '#f1f5f9',
  color: '#64748b',
  cursor: 'pointer',
};

const mainContentStyle: React.CSSProperties = {
  flex: 1,
  transition: 'margin-left 0.3s ease',
};

const headerStyle: React.CSSProperties = {
  background: '#fff',
  padding: '20px 24px',
  borderBottom: '1px solid #e2e8f0',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const pageTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 24,
  fontWeight: 800,
  color: '#1e293b',
};

const pageSubtitleStyle: React.CSSProperties = {
  margin: '4px 0 0',
  fontSize: 14,
  color: '#64748b',
};

const headerButtonStyle: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  background: '#fff',
  color: '#475569',
  fontSize: 14,
  textDecoration: 'none',
};

const filtersContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: 16,
  padding: '16px 24px',
  background: '#fff',
  borderBottom: '1px solid #e2e8f0',
  flexWrap: 'wrap',
  alignItems: 'flex-end',
};

const filterGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const filterLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#64748b',
  textTransform: 'uppercase',
};

const selectStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
  fontSize: 14,
  color: '#1e293b',
  minWidth: 160,
};

const resetButtonStyle: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
  color: '#475569',
  fontSize: 14,
  cursor: 'pointer',
};

const loadingContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 60,
  color: '#64748b',
};

const contentGridStyle: React.CSSProperties = {
  padding: 24,
  display: 'flex',
  flexDirection: 'column',
  gap: 24,
};

const summaryCardsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: 16,
};

const summaryCardStyle: React.CSSProperties = {
  padding: 24,
  borderRadius: 16,
  border: '1px solid #e2e8f0',
  background: '#fff',
  textAlign: 'center',
  transition: 'all 0.2s',
};

const chartsRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
  gap: 24,
};

const chartCardStyle: React.CSSProperties = {
  padding: 24,
  borderRadius: 16,
  border: '1px solid #e2e8f0',
  background: '#fff',
};

const chartTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: '#1e293b',
};

const progressBgStyle: React.CSSProperties = {
  height: 10,
  background: '#e2e8f0',
  borderRadius: 5,
  overflow: 'hidden',
};

const progressFillStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: 5,
  transition: 'width 0.3s ease',
};

const regionItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 0',
  borderBottom: '1px solid #f1f5f9',
};

const rankStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 11,
  fontWeight: 700,
};

const emptyStateStyle: React.CSSProperties = {
  padding: 40,
  textAlign: 'center',
  color: '#94a3b8',
};

const comparisonCardStyle: React.CSSProperties = {
  padding: 24,
  borderRadius: 16,
  border: '1px solid #e2e8f0',
  background: 'linear-gradient(135deg, #f8fafc, #fff)',
};
