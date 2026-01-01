'use client';

import { useMemo } from 'react';
import type { Stats } from '@/types';
import { DISEASE_COLORS, STATUS_COLORS, isActiveCase } from '@/types';

interface StatsChartsProps {
  stats: Stats | null;
}

export default function StatsCharts({ stats }: StatsChartsProps) {
  if (!stats) return null;

  const { byDisease, byStatus, byWeek, comparison, summary } = stats;

  // Calculate percentage change for 30-day trend
  const percentChange = useMemo(() => {
    if (!comparison || comparison.previous_period === 0) return null;
    const change = ((comparison.current_period - comparison.previous_period) / comparison.previous_period) * 100;
    return change;
  }, [comparison]);

  // Calculate active cases (suspected + under treatment + under observation)
  const activeCases = useMemo(() => {
    if (!byStatus) return 0;
    return byStatus
      .filter(s => isActiveCase(s.status))
      .reduce((sum, s) => sum + s.total, 0);
  }, [byStatus]);

  // Get max value for bar chart scaling
  const maxWeekValue = useMemo(() => {
    return Math.max(...(byWeek || []).map(w => w.total), 1);
  }, [byWeek]);

  const maxDiseaseValue = useMemo(() => {
    return Math.max(...(byDisease || []).map(d => d.total), 1);
  }, [byDisease]);

  const totalStatusCases = useMemo(() => {
    return (byStatus || []).reduce((sum, s) => sum + s.total, 0);
  }, [byStatus]);

  return (
    <div style={{ marginTop: 20 }}>
      {/* Active Cases Alert */}
      <div style={{
        ...cardStyle,
        background: activeCases > 0 ? 'linear-gradient(135deg, rgba(214,39,40,0.15), rgba(255,127,14,0.1))' : '#111',
        border: activeCases > 0 ? '1px solid rgba(214,39,40,0.3)' : '1px solid #1a1a1a',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 18 }}>🚨</span>
          <div style={cardTitleStyle}>Active Cases</div>
        </div>
        <div style={{ fontSize: 32, fontWeight: 800, color: activeCases > 0 ? '#d62728' : '#2ca02c' }}>
          {activeCases}
        </div>
        <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
          Suspected + Under Treatment + Under Observation
        </div>
      </div>

      {/* 30-Day Trend Comparison */}
      {comparison && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 16 }}>📈</span>
            <div style={cardTitleStyle}>30-Day Trend Analysis</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{comparison.current_period}</div>
              <div style={{ fontSize: 11, opacity: 0.6 }}>Last 30 days</div>
            </div>
            <div style={{ textAlign: 'center', opacity: 0.5 }}>
              <div style={{ fontSize: 20 }}>→</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ 
                fontSize: 20, 
                fontWeight: 700,
                color: percentChange !== null 
                  ? percentChange > 0 ? '#d62728' : percentChange < 0 ? '#2ca02c' : '#7f7f7f'
                  : '#7f7f7f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 4,
              }}>
                {percentChange !== null && (
                  <span style={{ fontSize: 16 }}>
                    {percentChange > 0 ? '↑' : percentChange < 0 ? '↓' : '→'}
                  </span>
                )}
                {percentChange !== null 
                  ? `${Math.abs(percentChange).toFixed(1)}%`
                  : '-'
                }
              </div>
              <div style={{ fontSize: 11, opacity: 0.6 }}>
                vs Previous ({comparison.previous_period})
              </div>
            </div>
          </div>
          {percentChange !== null && (
            <div style={{ 
              marginTop: 12, 
              padding: '8px 12px', 
              borderRadius: 8, 
              background: percentChange > 0 ? 'rgba(214,39,40,0.1)' : 'rgba(44,160,44,0.1)',
              fontSize: 12,
            }}>
              {percentChange > 0 
                ? '⚠️ Số ca tăng so với kỳ trước - cần theo dõi chặt chẽ'
                : percentChange < 0 
                ? '✅ Số ca giảm so với kỳ trước - tình hình cải thiện'
                : '➡️ Số ca ổn định so với kỳ trước'
              }
            </div>
          )}
        </div>
      )}

      {/* Severity Breakdown */}
      {summary && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>⚡</span>
            <div style={cardTitleStyle}>Severity Distribution</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <SeverityCard 
              label="High" 
              value={summary.high_severity} 
              total={summary.total_cases} 
              color="#d62728" 
              emoji="🔴"
            />
            <SeverityCard 
              label="Medium" 
              value={summary.medium_severity} 
              total={summary.total_cases} 
              color="#ff7f0e" 
              emoji="🟠"
            />
            <SeverityCard 
              label="Low" 
              value={summary.low_severity} 
              total={summary.total_cases} 
              color="#2ca02c" 
              emoji="🟢"
            />
          </div>
        </div>
      )}

      {/* Weekly Trend Chart */}
      {byWeek && byWeek.length > 0 && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>📊</span>
            <div style={cardTitleStyle}>Weekly Trend (12 tuần gần nhất)</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
            {byWeek.map((w, idx) => {
              const heightPercent = (w.total / maxWeekValue) * 100;
              const isRecent = idx >= byWeek.length - 4;
              return (
                <div
                  key={w.week}
                  style={{
                    flex: 1,
                    background: isRecent 
                      ? 'linear-gradient(to top, #1f77b4, #4a9fd4)' 
                      : '#1f77b4',
                    height: `${heightPercent}%`,
                    minHeight: 4,
                    borderRadius: '3px 3px 0 0',
                    position: 'relative',
                    opacity: isRecent ? 1 : 0.6,
                    cursor: 'pointer',
                  }}
                  title={`Tuần ${new Date(w.week).toLocaleDateString('vi-VN')}: ${w.total} ca`}
                />
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: 0.5, marginTop: 6 }}>
            <span>{byWeek.length > 0 ? new Date(byWeek[0].week).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : ''}</span>
            <span style={{ opacity: 0.7 }}>→</span>
            <span>{byWeek.length > 0 ? new Date(byWeek[byWeek.length - 1].week).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : ''}</span>
          </div>
        </div>
      )}

      {/* Disease Distribution with standardized colors */}
      {byDisease && byDisease.length > 0 && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>🦠</span>
            <div style={cardTitleStyle}>By Disease Type</div>
          </div>
          <div>
            {byDisease.slice(0, 6).map((d) => {
              const color = DISEASE_COLORS[d.disease_type] || DISEASE_COLORS['Other'];
              const percent = ((d.total / maxDiseaseValue) * 100).toFixed(0);
              return (
                <div key={d.disease_type} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: color,
                      }} />
                      {d.disease_type}
                    </span>
                    <span style={{ fontWeight: 700 }}>{d.total}</span>
                  </div>
                  <div style={{ 
                    height: 6, 
                    background: '#1a1a1a', 
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${percent}%`,
                      background: color,
                      borderRadius: 3,
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Status Distribution - Pie-like visualization */}
      {byStatus && byStatus.length > 0 && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>📋</span>
            <div style={cardTitleStyle}>By Status (Tiến trình dịch bệnh)</div>
          </div>
          
          {/* Status bar visualization */}
          <div style={{ 
            display: 'flex', 
            height: 24, 
            borderRadius: 12,
            overflow: 'hidden',
            marginBottom: 12,
          }}>
            {byStatus.map((s) => {
              const percent = totalStatusCases > 0 ? (s.total / totalStatusCases) * 100 : 0;
              if (percent < 1) return null;
              return (
                <div
                  key={s.status}
                  style={{
                    width: `${percent}%`,
                    background: STATUS_COLORS[s.status] || '#7f7f7f',
                    minWidth: percent > 0 ? 4 : 0,
                  }}
                  title={`${s.status}: ${s.total} (${percent.toFixed(1)}%)`}
                />
              );
            })}
          </div>
          
          {/* Status list */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {byStatus.map((s) => (
              <div key={s.status} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '6px 10px',
                background: '#0a0a0a',
                borderRadius: 6,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: STATUS_COLORS[s.status] || '#7f7f7f',
                  }} />
                  <span style={{ fontSize: 11, textTransform: 'capitalize' }}>{s.status}</span>
                </div>
                <span style={{ fontWeight: 700, fontSize: 12 }}>{s.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SeverityCard({ 
  label, 
  value, 
  total, 
  color, 
  emoji 
}: { 
  label: string; 
  value: number; 
  total: number; 
  color: string; 
  emoji: string;
}) {
  const percent = total > 0 ? (value / total) * 100 : 0;
  
  return (
    <div style={{ 
      flex: 1, 
      textAlign: 'center',
      background: '#0a0a0a',
      borderRadius: 8,
      padding: '10px 8px',
    }}>
      <div style={{ fontSize: 14, marginBottom: 4 }}>{emoji}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>{label}</div>
      <div style={{ fontSize: 10, opacity: 0.5 }}>({percent.toFixed(0)}%)</div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#111',
  borderRadius: 12,
  padding: 14,
  marginBottom: 12,
  border: '1px solid #1a1a1a',
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  opacity: 0.8,
};