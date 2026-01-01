'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { Stats, DiseaseStat, StatusStat, WeekStat, RegionStat } from '@/types';
import { 
  getDiseaseColor, 
  getStatusColor, 
  getBilingualDiseaseLabel, 
  getBilingualStatusLabel,
  SEVERITY_COLORS,
} from '@/types';
import { 
  QuickStatCard, 
  Card, 
  ComparisonCard, 
  DiseaseBar, 
  StatusDistributionBar, 
  RegionRankItem,
  SeverityItem,
  TrendChart,
  LineChart,
  EmptyState,
  LoadingSkeleton,
} from '@/components/ui/StatCards';

const API = process.env.NEXT_PUBLIC_API_URL!;

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetailed, setShowDetailed] = useState(true);
  const [selectedDisease, setSelectedDisease] = useState<string>('ALL');
  const [selectedProvince, setSelectedProvince] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [lineChartDateRange, setLineChartDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });

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
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch stats');
        return r.json();
      })
      .then(setStats)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [queryString]);

  if (error) {
    return (
      <div style={pageStyle}>
        <EmptyState 
          icon="❌" 
          title="Lỗi tải dữ liệu / Error loading data" 
          description={error} 
        />
      </div>
    );
  }

  const { summary, byDisease, byStatus, byWeek, topRegions, comparison } = stats || {};

  // Calculate derived stats
  const activeCases = (byStatus || [])
    .filter(s => ['suspected', 'probable', 'confirmed', 'under treatment', 'under observation'].includes(s.status))
    .reduce((sum, s) => sum + s.total, 0);

  const maxDiseaseValue = Math.max(...(byDisease || []).map(d => d.total), 1);
  const maxRegionValue = topRegions?.[0]?.total || 1;

  // Prepare bar chart data - last 7 days
  const barChartData = useMemo(() => {
    const allData = (byWeek || []).map(w => ({
      label: new Date(w.week).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      value: w.total,
      date: w.week,
    }));
    return allData.slice(-7); // Last 7 days only
  }, [byWeek]);

  // All weekly data for trends
  const weeklyData = useMemo(() => {
    return (byWeek || []).map(w => ({
      label: new Date(w.week).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      value: w.total,
      date: w.week,
    }));
  }, [byWeek]);

  // Prepare line chart data with date range filter
  const lineChartData = useMemo(() => {
    if (!lineChartDateRange.from && !lineChartDateRange.to) return weeklyData;
    
    return weeklyData.filter(d => {
      const date = new Date(d.date);
      if (lineChartDateRange.from && date < new Date(lineChartDateRange.from)) return false;
      if (lineChartDateRange.to && date > new Date(lineChartDateRange.to)) return false;
      return true;
    });
  }, [weeklyData, lineChartDateRange]);

  return (
    <div style={pageStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
            📊 Thống kê / Statistics
          </h1>
          <p style={{ margin: '8px 0 0', opacity: 0.6, fontSize: 14 }}>
            {showDetailed ? 'Phân tích chi tiết / Detailed analysis' : 'Tổng quan dịch bệnh / Epidemic overview'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={() => setShowDetailed(!showDetailed)}
            style={{
              ...linkButtonStyle,
              background: showDetailed ? '#238636' : 'transparent',
              borderColor: showDetailed ? '#238636' : '#2a2a2a',
            }}
          >
            {showDetailed ? '📋 Tổng quan' : '📈 Chi tiết'}
          </button>
          <Link href="/" style={linkButtonStyle}>
            🗺️ Bản đồ
          </Link>
          <Link href="/admin" style={linkButtonStyle}>
            ⚙️ Quản trị
          </Link>
        </div>
      </header>

      {/* Filters - only show in detailed view */}
      {showDetailed && (
        <div style={filterBarStyle}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <label style={labelStyle}>Loại bệnh / Disease</label>
              <select 
                value={selectedDisease} 
                onChange={(e) => setSelectedDisease(e.target.value)}
                style={selectStyle}
              >
                <option value="ALL">Tất cả / All</option>
                {(byDisease || []).map(d => (
                  <option key={d.disease_type} value={d.disease_type}>
                    {getBilingualDiseaseLabel(d.disease_type)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Tỉnh / Province</label>
              <select 
                value={selectedProvince} 
                onChange={(e) => setSelectedProvince(e.target.value)}
                style={selectStyle}
              >
                <option value="ALL">Tất cả / All</option>
                {(topRegions || []).map(r => (
                  <option key={r.id} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Từ ngày / From</label>
              <input 
                type="date" 
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                style={selectStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Đến ngày / To</label>
              <input 
                type="date" 
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                style={selectStyle}
              />
            </div>
            {(selectedDisease !== 'ALL' || selectedProvince !== 'ALL' || dateRange.from || dateRange.to) && (
              <button 
                onClick={() => { setSelectedDisease('ALL'); setSelectedProvince('ALL'); setDateRange({ from: '', to: '' }); }}
                style={resetButtonStyle}
              >
                🔄 Đặt lại / Reset
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div style={contentStyle}>
          <LoadingSkeleton lines={5} />
        </div>
      ) : !showDetailed ? (
        /* ==================== SIMPLIFIED OVERVIEW VIEW ==================== */
        <div style={contentStyle}>
          {/* Quick Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={simpleCardStyle}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🏥</div>
              <div style={{ fontSize: 32, fontWeight: 800 }}>{summary?.total_cases ?? 0}</div>
              <div style={{ fontSize: 13, opacity: 0.6 }}>Tổng ca bệnh</div>
            </div>
            <div style={simpleCardStyle}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🚨</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: activeCases > 0 ? '#f44336' : 'inherit' }}>{activeCases}</div>
              <div style={{ fontSize: 13, opacity: 0.6 }}>Ca đang hoạt động</div>
            </div>
            <div style={simpleCardStyle}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📍</div>
              <div style={{ fontSize: 32, fontWeight: 800 }}>{summary?.matched_region ?? 0}</div>
              <div style={{ fontSize: 13, opacity: 0.6 }}>Vùng ảnh hưởng</div>
            </div>
            <div style={simpleCardStyle}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>⚠️</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: (summary?.high_severity ?? 0) > 0 ? '#ff9800' : 'inherit' }}>{summary?.high_severity ?? 0}</div>
              <div style={{ fontSize: 13, opacity: 0.6 }}>Mức độ nặng</div>
            </div>
          </div>

          {/* 30-Day Comparison - Simple */}
          {comparison && (
            <div style={{ ...simpleCardStyle, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 4 }}>📅 30 ngày qua</div>
                  <div style={{ fontSize: 28, fontWeight: 800 }}>{comparison.current_period} ca</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 4 }}>So với trước đó</div>
                  <div style={{ 
                    fontSize: 20, 
                    fontWeight: 700,
                    color: comparison.current_period > comparison.previous_period ? '#f44336' : 
                           comparison.current_period < comparison.previous_period ? '#4caf50' : '#666'
                  }}>
                    {comparison.current_period > comparison.previous_period ? '↑' : comparison.current_period < comparison.previous_period ? '↓' : '→'}
                    {' '}{Math.abs(comparison.current_period - comparison.previous_period)} ca
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Disease Summary - Simple bars */}
          {byDisease && byDisease.length > 0 && (
            <div style={{ ...simpleCardStyle, marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>🦠 Phân bố theo bệnh</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {byDisease.slice(0, 5).map((d) => (
                  <div key={d.disease_type}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13 }}>{getBilingualDiseaseLabel(d.disease_type)}</span>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{d.total}</span>
                    </div>
                    <div style={{ height: 8, background: '#1a1a1a', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${(d.total / maxDiseaseValue) * 100}%`,
                        background: getDiseaseColor(d.disease_type),
                        borderRadius: 4,
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Simple Weekly Trend */}
          {weeklyData.length > 0 && (
            <div style={{ ...simpleCardStyle, marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>📈 Xu hướng 12 tuần</div>
              <TrendChart data={weeklyData} height={80} />
            </div>
          )}

          {/* CTA to view detailed */}
          <button 
            onClick={() => setShowDetailed(true)}
            style={{
              width: '100%',
              padding: '16px 24px',
              borderRadius: 12,
              border: '1px solid #238636',
              background: '#238636',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            📊 Xem thống kê chi tiết / View Detailed Stats
          </button>
        </div>
      ) : (
        /* ==================== DETAILED VIEW ==================== */
        <div style={contentStyle}>
          {/* Overview Cards */}
          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>📈 Tổng quan / Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
              <QuickStatCard 
                title="Tổng ca bệnh / Total Cases" 
                value={summary?.total_cases ?? 0} 
                icon="🏥"
              />
              <QuickStatCard 
                title="Ca đang hoạt động / Active Cases" 
                value={activeCases} 
                icon="🚨"
                highlight={activeCases > 0}
              />
              <QuickStatCard 
                title="Vùng có ca / Affected Regions" 
                value={summary?.matched_region ?? 0} 
                icon="📍"
              />
              <QuickStatCard 
                title="Mức độ nặng / High Severity" 
                value={summary?.high_severity ?? 0} 
                icon="⚠️"
                highlight={(summary?.high_severity ?? 0) > 0}
              />
              <QuickStatCard 
                title="Số loại bệnh / Disease Types" 
                value={byDisease?.length ?? 0} 
                icon="🦠"
              />
              <QuickStatCard 
                title="Trung bình/tuần / Avg per Week" 
                value={weeklyData.length > 0 ? Math.round(weeklyData.reduce((s, w) => s + w.value, 0) / weeklyData.length) : 0} 
                icon="📊"
              />
            </div>
          </section>

          {/* 30-Day Comparison */}
          {comparison && (
            <section style={sectionStyle}>
              <h2 style={sectionTitleStyle}>📅 So sánh 30 ngày / 30-Day Comparison</h2>
              <ComparisonCard 
                current={comparison.current_period}
                previous={comparison.previous_period}
                label="Số ca bệnh / Case Count"
                periodLabel="30 ngày qua / Last 30 days"
              />
            </section>
          )}

          {/* Severity & Status Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
            
            {/* Severity Distribution */}
            <section>
              <Card title="⚡ Mức độ nghiêm trọng / Severity Distribution" icon="">
                {summary && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                    <SeverityItem 
                      label="Nặng" 
                      labelEn="High"
                      value={summary.high_severity} 
                      total={summary.total_cases} 
                      color={SEVERITY_COLORS[3]} 
                    />
                    <SeverityItem 
                      label="Trung bình" 
                      labelEn="Medium"
                      value={summary.medium_severity} 
                      total={summary.total_cases} 
                      color={SEVERITY_COLORS[2]} 
                    />
                    <SeverityItem 
                      label="Nhẹ" 
                      labelEn="Low"
                      value={summary.low_severity} 
                      total={summary.total_cases} 
                      color={SEVERITY_COLORS[1]} 
                    />
                  </div>
                )}
              </Card>
            </section>

            {/* Status Pie Chart */}
            <section>
              <Card title="🥧 Biểu đồ tròn trạng thái / Status Pie Chart" icon="">
                {byStatus && byStatus.length > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 12 }}>
                    <PieChart data={byStatus.map(s => ({ 
                      label: getBilingualStatusLabel(s.status), 
                      value: s.total, 
                      color: getStatusColor(s.status) 
                    }))} size={140} />
                    <div style={{ flex: 1 }}>
                      {byStatus.slice(0, 5).map(s => (
                        <div key={s.status} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: getStatusColor(s.status) }} />
                          <span style={{ fontSize: 11, flex: 1 }}>{getBilingualStatusLabel(s.status)}</span>
                          <span style={{ fontSize: 11, fontWeight: 700 }}>{s.total}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyState icon="📋" title="Không có dữ liệu / No data" />
                )}
              </Card>
            </section>
          </div>

          {/* Weekly Trend Bar Chart - Full Width */}
          <section style={sectionStyle}>
            <Card title="📊 Biểu đồ cột 7 ngày gần nhất / Last 7 Days Bar Chart" icon="">
              {barChartData.length > 0 ? (
                <div style={{ marginTop: 12 }}>
                  <InteractiveBarChart data={barChartData} height={180} />
                </div>
              ) : (
                <EmptyState icon="📉" title="Không có dữ liệu / No data" />
              )}
            </Card>
          </section>

          {/* Line Chart - Full Width */}
          <section style={sectionStyle}>
            <Card title="📈 Biểu đồ đường xu hướng dịch bệnh / Disease Trend Line Chart" icon="">
              <DateRangePicker 
                value={lineChartDateRange} 
                onChange={setLineChartDateRange}
                minDate={byWeek?.[0]?.week}
                maxDate={byWeek?.[byWeek.length - 1]?.week}
              />
              {lineChartData.length > 0 ? (
                <div style={{ marginTop: 12 }}>
                  <InteractiveLineChart 
                    data={lineChartData} 
                    height={200} 
                    color="#1f77b4"
                    areaColor="#1f77b4"
                  />
                </div>
              ) : (
                <EmptyState icon="📉" title="Không có dữ liệu / No data" />
              )}
            </Card>
          </section>

          {/* Disease Distribution - Pie & Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
            {/* Disease Pie Chart */}
            <section>
              <Card title="🥧 Tỉ lệ theo loại bệnh / Disease Distribution Pie" icon="">
                {byDisease && byDisease.length > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 12 }}>
                    <PieChart data={byDisease.slice(0, 8).map(d => ({ 
                      label: getBilingualDiseaseLabel(d.disease_type), 
                      value: d.total, 
                      color: getDiseaseColor(d.disease_type) 
                    }))} size={160} />
                    <div style={{ flex: 1 }}>
                      {byDisease.slice(0, 6).map(d => (
                        <div key={d.disease_type} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: getDiseaseColor(d.disease_type) }} />
                          <span style={{ fontSize: 11, flex: 1 }}>{getBilingualDiseaseLabel(d.disease_type)}</span>
                          <span style={{ fontSize: 11, fontWeight: 700 }}>{d.total}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyState icon="🦠" title="Không có dữ liệu / No data" />
                )}
              </Card>
            </section>

            {/* Disease Bar Chart */}
            <section>
              <Card title="📊 Biểu đồ cột theo bệnh / Disease Bar Chart" icon="">
                {byDisease && byDisease.length > 0 ? (
                  <div style={{ marginTop: 12 }}>
                    {byDisease.slice(0, 8).map((d) => (
                      <DiseaseBar 
                        key={d.disease_type} 
                        name={d.disease_type} 
                        value={d.total} 
                        max={maxDiseaseValue}
                        showBilingual
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState icon="🦠" title="Không có dữ liệu bệnh / No disease data" />
                )}
              </Card>
            </section>
          </div>

          {/* Province Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, marginTop: 24 }}>
            {/* Province Pie Chart */}
            <section>
              <Card title="🥧 Tỉ lệ theo tỉnh / Province Distribution Pie" icon="">
                {topRegions && topRegions.length > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 12 }}>
                    <PieChart data={topRegions.slice(0, 8).map((r, i) => ({ 
                      label: r.name, 
                      value: r.total, 
                      color: PROVINCE_COLORS[i % PROVINCE_COLORS.length]
                    }))} size={160} />
                    <div style={{ flex: 1 }}>
                      {topRegions.slice(0, 6).map((r, i) => (
                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: PROVINCE_COLORS[i % PROVINCE_COLORS.length] }} />
                          <span style={{ fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                          <span style={{ fontSize: 11, fontWeight: 700 }}>{r.total}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyState icon="🗺️" title="Không có dữ liệu / No data" />
                )}
              </Card>
            </section>

            {/* Province Bar Chart */}
            <section>
              <Card title="📊 Biểu đồ cột theo tỉnh / Province Bar Chart" icon="">
                {topRegions && topRegions.length > 0 ? (
                  <div style={{ marginTop: 12 }}>
                    {topRegions.slice(0, 8).map((r, i) => (
                      <div key={r.id} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: PROVINCE_COLORS[i % PROVINCE_COLORS.length] }} />
                            <span style={{ opacity: 0.9, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                          </span>
                          <span style={{ fontWeight: 700 }}>{r.total}</span>
                        </div>
                        <div style={{ height: 4, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ 
                            height: '100%', 
                            width: `${(r.total / maxRegionValue) * 100}%`, 
                            background: PROVINCE_COLORS[i % PROVINCE_COLORS.length],
                            borderRadius: 2,
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon="🗺️" title="Không có dữ liệu / No data" />
                )}
              </Card>
            </section>
          </div>

          {/* Status Distribution - Full Width */}
          <section style={sectionStyle}>
            <Card title="📋 Phân bố theo trạng thái / Distribution by Status" icon="">
              {byStatus && byStatus.length > 0 ? (
                <StatusDistributionBar data={byStatus} />
              ) : (
                <EmptyState icon="📋" title="Không có dữ liệu trạng thái / No status data" />
              )}
            </Card>
          </section>

          {/* Top Regions Ranking */}
          <section style={sectionStyle}>
            <Card title="🏛️ Top 10 vùng có nhiều ca / Top 10 Regions by Cases" icon="">
              {topRegions && topRegions.length > 0 ? (
                <div style={{ marginTop: 8 }}>
                  {topRegions.slice(0, 10).map((r, idx) => (
                    <RegionRankItem 
                      key={r.id} 
                      rank={idx + 1} 
                      name={r.name} 
                      total={r.total}
                      maxTotal={maxRegionValue}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState icon="🗺️" title="Không có dữ liệu vùng / No region data" />
              )}
            </Card>
          </section>

          {/* Data Summary */}
          <section style={sectionStyle}>
            <div style={{
              background: '#111',
              borderRadius: 12,
              padding: 20,
              border: '1px solid #1a1a1a',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 20,
            }}>
              <div>
                <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>Dữ liệu từ / Data from</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {summary?.min_time ? new Date(summary.min_time).toLocaleDateString('vi-VN') : '-'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>Đến / To</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {summary?.max_time ? new Date(summary.max_time).toLocaleDateString('vi-VN') : '-'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>Số loại bệnh / Disease Types</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{byDisease?.length || 0}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>Số trạng thái / Status Types</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{byStatus?.length || 0}</div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer style={{ marginTop: 32, textAlign: 'center', opacity: 0.5, fontSize: 12 }}>
            <p>🛡️ SafeZone GIS - Hệ thống giám sát dịch bệnh / Epidemic Surveillance System</p>
            <p>Dữ liệu cập nhật lần cuối / Last updated: {new Date().toLocaleString('vi-VN')}</p>
          </footer>
        </div>
      )}
    </div>
  );
}

// Pie Chart Component with hover tooltip
function PieChart({ data, size = 120 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;
  
  let currentAngle = -90; // Start from top
  
  const slices = data.map((d, i) => {
    const percent = (d.value / total) * 100;
    const angle = (percent / 100) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    
    // Calculate path
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = ((startAngle + angle) * Math.PI) / 180;
    const radius = size / 2 - 2;
    const cx = size / 2;
    const cy = size / 2;
    
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);
    
    const largeArc = angle > 180 ? 1 : 0;
    
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    
    // Calculate label position (middle of the slice)
    const midAngle = startAngle + angle / 2;
    const midRad = (midAngle * Math.PI) / 180;
    const labelRadius = radius * 0.65;
    const labelX = cx + labelRadius * Math.cos(midRad);
    const labelY = cy + labelRadius * Math.sin(midRad);
    
    return { ...d, path, percent, labelX, labelY };
  });
  
  const hoveredSlice = hoveredIndex !== null ? slices[hoveredIndex] : null;
  
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <svg width={size} height={size} style={{ flexShrink: 0 }}>
        {slices.map((slice, i) => (
          <path
            key={i}
            d={slice.path}
            fill={slice.color}
            stroke="#0a0a0a"
            strokeWidth="1"
            style={{ 
              cursor: 'pointer',
              transition: 'transform 0.2s, opacity 0.2s',
              transform: hoveredIndex === i ? 'scale(1.05)' : 'scale(1)',
              transformOrigin: `${size/2}px ${size/2}px`,
              opacity: hoveredIndex !== null && hoveredIndex !== i ? 0.6 : 1,
            }}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          />
        ))}
        {/* Center hole for donut effect */}
        <circle cx={size / 2} cy={size / 2} r={size / 4} fill="#0a0a0a" />
        {/* Center text showing hovered percent */}
        {hoveredSlice && (
          <text
            x={size / 2}
            y={size / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#fff"
            fontSize="14"
            fontWeight="bold"
          >
            {hoveredSlice.percent.toFixed(1)}%
          </text>
        )}
      </svg>
      {/* Tooltip */}
      {hoveredSlice && (
        <div style={{
          position: 'absolute',
          top: -60,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.9)',
          border: '1px solid #333',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 12,
          whiteSpace: 'nowrap',
          zIndex: 100,
          pointerEvents: 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: hoveredSlice.color }} />
            <span style={{ fontWeight: 600 }}>{hoveredSlice.label}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
            <span style={{ opacity: 0.7 }}>Số lượng:</span>
            <span style={{ fontWeight: 700 }}>{hoveredSlice.value}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
            <span style={{ opacity: 0.7 }}>Tỉ lệ:</span>
            <span style={{ fontWeight: 700, color: hoveredSlice.color }}>{hoveredSlice.percent.toFixed(1)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Date Range Picker Component
function DateRangePicker({ 
  value, 
  onChange,
  minDate,
  maxDate,
}: { 
  value: { from: string; to: string };
  onChange: (v: { from: string; to: string }) => void;
  minDate?: string;
  maxDate?: string;
}) {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: 11, opacity: 0.7 }}>Từ ngày / From:</label>
        <input
          type="date"
          value={value.from}
          min={minDate}
          max={value.to || maxDate}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid #333',
            background: '#1a1a1a',
            color: '#fff',
            fontSize: 11,
          }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: 11, opacity: 0.7 }}>Đến ngày / To:</label>
        <input
          type="date"
          value={value.to}
          min={value.from || minDate}
          max={maxDate}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid #333',
            background: '#1a1a1a',
            color: '#fff',
            fontSize: 11,
          }}
        />
      </div>
      {(value.from || value.to) && (
        <button
          onClick={() => onChange({ from: '', to: '' })}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid #333',
            background: 'transparent',
            color: '#ff6b6b',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          🗑️ Xóa bộ lọc / Clear
        </button>
      )}
    </div>
  );
}

// Interactive Bar Chart Component with hover tooltip
function InteractiveBarChart({ 
  data, 
  height = 180,
}: { 
  data: { label: string; value: number; date?: string }[]; 
  height?: number;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  if (data.length === 0) return null;
  
  const padding = { top: 20, right: 20, bottom: 35, left: 45 };
  const width = 800;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const barWidth = chartWidth / data.length - 8;
  
  // Grid lines
  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const y = padding.top + (i / 4) * chartHeight;
    const value = Math.round(maxValue - (i / 4) * maxValue);
    return { y, value };
  });

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {gridLines.map((line, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={line.y}
              x2={width - padding.right}
              y2={line.y}
              stroke="#222"
              strokeDasharray="4,4"
            />
            <text
              x={padding.left - 8}
              y={line.y}
              textAnchor="end"
              dominantBaseline="middle"
              fill="#666"
              fontSize="10"
            >
              {line.value}
            </text>
          </g>
        ))}
        
        {/* Bars */}
        {data.map((d, i) => {
          const barHeight = (d.value / maxValue) * chartHeight;
          const x = padding.left + (i * (chartWidth / data.length)) + 4;
          const y = padding.top + chartHeight - barHeight;
          const isHovered = hoveredIndex === i;
          
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={isHovered ? '#1f77b4' : '#1f77b480'}
                rx={4}
                ry={4}
                style={{ cursor: 'pointer', transition: 'fill 0.2s' }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
              {/* Value on top of bar when hovered */}
              {isHovered && (
                <text
                  x={x + barWidth / 2}
                  y={y - 8}
                  textAnchor="middle"
                  fill="#1f77b4"
                  fontSize="12"
                  fontWeight="bold"
                >
                  {d.value}
                </text>
              )}
              {/* X-axis label */}
              <text
                x={x + barWidth / 2}
                y={height - 8}
                textAnchor="middle"
                fill="#666"
                fontSize="10"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      
      {/* Tooltip */}
      {hoveredIndex !== null && data[hoveredIndex] && (
        <div style={{
          position: 'absolute',
          left: `${((padding.left + (hoveredIndex * (chartWidth / data.length)) + 4 + barWidth / 2) / width) * 100}%`,
          top: 10,
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.95)',
          border: '1px solid #444',
          borderRadius: 8,
          padding: '10px 14px',
          fontSize: 12,
          whiteSpace: 'nowrap',
          zIndex: 100,
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: '#1f77b4' }}>
            📅 {data[hoveredIndex].label}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ opacity: 0.7 }}>Số ca / Cases:</span>
            <span style={{ fontWeight: 800, fontSize: 14 }}>{data[hoveredIndex].value}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Interactive Line Chart Component with hover tooltip
function InteractiveLineChart({ 
  data, 
  height = 200, 
  color = '#1f77b4',
  areaColor = '#1f77b4',
}: { 
  data: { label: string; value: number; date?: string }[]; 
  height?: number;
  color?: string;
  areaColor?: string;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  if (data.length === 0) return null;
  
  const padding = { top: 20, right: 20, bottom: 30, left: 45 };
  const width = 800;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const minValue = Math.min(...data.map(d => d.value), 0);
  const valueRange = maxValue - minValue || 1;
  
  // Calculate points
  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1 || 1)) * chartWidth,
    y: padding.top + chartHeight - ((d.value - minValue) / valueRange) * chartHeight,
    ...d,
    index: i,
  }));
  
  // Create line path
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  
  // Create area path
  const areaPath = `
    ${linePath}
    L ${points[points.length - 1].x} ${padding.top + chartHeight}
    L ${points[0].x} ${padding.top + chartHeight}
    Z
  `;
  
  // Grid lines
  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const y = padding.top + (i / 4) * chartHeight;
    const value = Math.round(maxValue - (i / 4) * valueRange);
    return { y, value };
  });
  
  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;
  
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {gridLines.map((line, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={line.y}
              x2={width - padding.right}
              y2={line.y}
              stroke="#222"
              strokeDasharray="4,4"
            />
            <text
              x={padding.left - 8}
              y={line.y}
              textAnchor="end"
              dominantBaseline="middle"
              fill="#666"
              fontSize="10"
            >
              {line.value}
            </text>
          </g>
        ))}
        
        {/* Area fill */}
        <path
          d={areaPath}
          fill={`${areaColor}20`}
        />
        
        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Data points */}
        {points.map((point, i) => (
          <g key={i}>
            <circle
              cx={point.x}
              cy={point.y}
              r={hoveredIndex === i ? 6 : 4}
              fill={hoveredIndex === i ? '#fff' : color}
              stroke={color}
              strokeWidth="2"
              style={{ cursor: 'pointer', transition: 'r 0.2s' }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          </g>
        ))}
        
        {/* X-axis labels */}
        {points.filter((_, i) => i % Math.ceil(data.length / 10) === 0 || i === data.length - 1).map((point, i) => (
          <text
            key={i}
            x={point.x}
            y={height - 8}
            textAnchor="middle"
            fill="#666"
            fontSize="9"
          >
            {point.label}
          </text>
        ))}
      </svg>
      
      {/* Tooltip */}
      {hoveredPoint && (
        <div style={{
          position: 'absolute',
          left: `${(hoveredPoint.x / width) * 100}%`,
          top: `${((hoveredPoint.y - 15) / height) * 100}%`,
          transform: 'translate(-50%, -100%)',
          background: 'rgba(0,0,0,0.95)',
          border: '1px solid #444',
          borderRadius: 8,
          padding: '10px 14px',
          fontSize: 12,
          whiteSpace: 'nowrap',
          zIndex: 100,
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: color }}>
            📅 {hoveredPoint.label}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ opacity: 0.7 }}>Số ca / Cases:</span>
            <span style={{ fontWeight: 800, fontSize: 14 }}>{hoveredPoint.value}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Province colors for charts
const PROVINCE_COLORS = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
  '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5',
];

// Styles
const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#0a0a0a',
  color: '#fff',
};

const headerStyle: React.CSSProperties = {
  background: '#111',
  borderBottom: '1px solid #1a1a1a',
  padding: '20px 32px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 16,
};

const linkButtonStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: 8,
  border: '1px solid #2a2a2a',
  background: 'transparent',
  color: 'inherit',
  textDecoration: 'none',
  fontSize: 13,
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const filterBarStyle: React.CSSProperties = {
  background: '#111',
  borderBottom: '1px solid #1a1a1a',
  padding: '16px 32px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  opacity: 0.6,
  marginBottom: 4,
  fontWeight: 600,
  textTransform: 'uppercase',
};

const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 6,
  border: '1px solid #2a2a2a',
  background: '#0a0a0a',
  color: 'inherit',
  fontSize: 13,
  minWidth: 150,
};

const resetButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 6,
  border: '1px solid #2a2a2a',
  background: 'transparent',
  color: '#fff',
  fontSize: 12,
  cursor: 'pointer',
  marginTop: 18,
};

const contentStyle: React.CSSProperties = {
  padding: '24px 32px',
  maxWidth: 1400,
  margin: '0 auto',
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 24,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  marginBottom: 16,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const simpleCardStyle: React.CSSProperties = {
  background: '#111',
  borderRadius: 12,
  padding: 20,
  border: '1px solid #1a1a1a',
  textAlign: 'center',
};
