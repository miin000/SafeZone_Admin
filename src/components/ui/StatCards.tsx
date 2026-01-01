'use client';

import { getDiseaseColor, getStatusColor, getBilingualDiseaseLabel, getBilingualStatusLabel } from '@/types';
import type { Stats } from '@/types';

// ============================================
// LINE CHART (Disease Trend)
// ============================================
export function LineChart({ 
  data,
  height = 120,
  showLabels = true,
  showDots = true,
  color = '#1f77b4',
  areaColor,
  title,
}: { 
  data: { label: string; value: number; date?: string }[];
  height?: number;
  showLabels?: boolean;
  showDots?: boolean;
  color?: string;
  areaColor?: string;
  title?: string;
}) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
        Không có dữ liệu / No data
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const minValue = Math.min(...data.map(d => d.value), 0);
  const range = maxValue - minValue || 1;
  
  const padding = { top: 20, right: 10, bottom: showLabels ? 30 : 10, left: 40 };
  const chartWidth = 100; // percentage
  const chartHeight = height - padding.top - padding.bottom;
  
  // Generate SVG path
  const getY = (value: number) => {
    return chartHeight - ((value - minValue) / range) * chartHeight;
  };
  
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1 || 1)) * 100,
    y: getY(d.value),
    value: d.value,
    label: d.label,
  }));
  
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x}% ${p.y}`).join(' ');
  const areaPath = `${linePath} L 100% ${chartHeight} L 0% ${chartHeight} Z`;
  
  // Generate Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    value: Math.round(minValue + t * range),
    y: chartHeight * (1 - t),
  }));

  return (
    <div>
      {title && (
        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8, opacity: 0.8 }}>{title}</div>
      )}
      <div style={{ position: 'relative', height }}>
        {/* Y-axis labels */}
        <div style={{ 
          position: 'absolute', 
          left: 0, 
          top: padding.top, 
          bottom: padding.bottom,
          width: padding.left - 5,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          {yTicks.reverse().map((tick, i) => (
            <span key={i} style={{ fontSize: 9, opacity: 0.5, textAlign: 'right' }}>
              {tick.value}
            </span>
          ))}
        </div>
        
        {/* Chart area */}
        <svg 
          style={{ 
            position: 'absolute',
            left: padding.left,
            top: padding.top,
            width: `calc(100% - ${padding.left + padding.right}px)`,
            height: chartHeight,
          }}
          preserveAspectRatio="none"
          viewBox={`0 0 100 ${chartHeight}`}
        >
          {/* Grid lines */}
          {yTicks.map((tick, i) => (
            <line
              key={i}
              x1="0%"
              y1={tick.y}
              x2="100%"
              y2={tick.y}
              stroke="#2a2a2a"
              strokeWidth="0.5"
            />
          ))}
          
          {/* Area fill */}
          {areaColor && (
            <path
              d={areaPath}
              fill={areaColor}
              opacity={0.3}
            />
          )}
          
          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Dots */}
          {showDots && points.map((p, i) => (
            <circle
              key={i}
              cx={`${p.x}%`}
              cy={p.y}
              r="4"
              fill={color}
              stroke="#0a0a0a"
              strokeWidth="2"
              style={{ cursor: 'pointer' }}
            >
              <title>{`${p.label}: ${p.value} ca`}</title>
            </circle>
          ))}
        </svg>
        
        {/* X-axis labels */}
        {showLabels && (
          <div style={{
            position: 'absolute',
            left: padding.left,
            right: padding.right,
            bottom: 0,
            height: padding.bottom,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            paddingTop: 5,
          }}>
            {data.length <= 10 ? (
              data.map((d, i) => (
                <span key={i} style={{ fontSize: 9, opacity: 0.5, textAlign: 'center', flex: 1 }}>
                  {d.label}
                </span>
              ))
            ) : (
              <>
                <span style={{ fontSize: 9, opacity: 0.5 }}>{data[0]?.label}</span>
                <span style={{ fontSize: 9, opacity: 0.5 }}>{data[Math.floor(data.length / 2)]?.label}</span>
                <span style={{ fontSize: 9, opacity: 0.5 }}>{data[data.length - 1]?.label}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// QUICK STAT CARD
// ============================================
export function QuickStatCard({ 
  title, 
  value, 
  icon, 
  highlight = false,
  trend,
  subtitle,
}: { 
  title: string; 
  value: number | string; 
  icon: string; 
  highlight?: boolean;
  trend?: { value: number; isPositive: boolean };
  subtitle?: string;
}) {
  return (
    <div style={{
      background: highlight 
        ? 'linear-gradient(135deg, rgba(214,39,40,0.08), rgba(255,127,14,0.05))' 
        : 'rgba(255, 255, 255, 0.9)',
      border: highlight ? '1px solid rgba(214,39,40,0.3)' : '1px solid rgba(200, 200, 200, 0.4)',
      borderRadius: 10,
      padding: 12,
      transition: 'all 0.2s ease',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 600, color: '#6b7280' }}>{title}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div style={{ 
          fontSize: 22, 
          fontWeight: 800, 
          color: highlight ? '#d62728' : '#1f2937',
          lineHeight: 1,
        }}>
          {value}
        </div>
        {trend && (
          <div style={{ 
            fontSize: 11, 
            fontWeight: 600,
            color: trend.isPositive ? '#d62728' : '#2ca02c',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}>
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            <span>{Math.abs(trend.value).toFixed(1)}%</span>
          </div>
        )}
      </div>
      {subtitle && (
        <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4, color: '#9ca3af' }}>{subtitle}</div>
      )}
    </div>
  );
}

// ============================================
// STAT CARD (Compact)
// ============================================
export function StatCard({ 
  title, 
  value, 
  highlight = false,
  color,
}: { 
  title: string; 
  value: number | string; 
  highlight?: boolean;
  color?: string;
}) {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.95)',
      border: '1px solid rgba(200, 200, 200, 0.4)',
      borderRadius: 8,
      padding: 10,
      textAlign: 'center',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
    }}>
      <div style={{ 
        fontSize: 18, 
        fontWeight: 800, 
        color: color || (highlight ? '#d62728' : '#1f2937'),
      }}>
        {value}
      </div>
      <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2, color: '#6b7280' }}>{title}</div>
    </div>
  );
}

// ============================================
// SEVERITY ITEM
// ============================================
export function SeverityItem({ 
  label, 
  labelEn,
  value, 
  total, 
  color,
}: { 
  label: string; 
  labelEn?: string;
  value: number; 
  total: number; 
  color: string;
}) {
  const percent = total > 0 ? (value / total) * 100 : 0;
  return (
    <div style={{ 
      flex: 1, 
      textAlign: 'center', 
      background: '#0a0a0a', 
      borderRadius: 8, 
      padding: 8,
      border: '1px solid #1a1a1a',
    }}>
      <div style={{ fontSize: 16, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>
        {labelEn ? `${labelEn}` : label}
      </div>
      <div style={{ fontSize: 9, opacity: 0.5 }}>{label}</div>
      <div style={{ 
        fontSize: 9, 
        opacity: 0.4,
        marginTop: 4,
        padding: '2px 6px',
        background: `${color}20`,
        borderRadius: 4,
        color,
      }}>
        {percent.toFixed(0)}%
      </div>
    </div>
  );
}

// ============================================
// DISEASE BAR
// ============================================
export function DiseaseBar({ 
  name, 
  value, 
  max,
  showBilingual = true,
}: { 
  name: string; 
  value: number; 
  max: number;
  showBilingual?: boolean;
}) {
  const percent = (value / max) * 100;
  const color = getDiseaseColor(name);
  const label = showBilingual ? getBilingualDiseaseLabel(name) : name;
  
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        fontSize: 11, 
        marginBottom: 3,
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ 
            width: 8, 
            height: 8, 
            borderRadius: '50%', 
            background: color,
            flexShrink: 0,
          }} />
          <span style={{ opacity: 0.9 }}>{label}</span>
        </span>
        <span style={{ fontWeight: 700, color }}>{value}</span>
      </div>
      <div style={{ 
        height: 4, 
        background: '#1a1a1a', 
        borderRadius: 2,
        overflow: 'hidden',
      }}>
        <div style={{ 
          height: '100%', 
          width: `${percent}%`, 
          background: `linear-gradient(90deg, ${color}, ${color}aa)`,
          borderRadius: 2,
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  );
}

// ============================================
// STATUS BAR
// ============================================
export function StatusBar({ 
  status, 
  value, 
  total,
  showBilingual = true,
}: { 
  status: string; 
  value: number; 
  total: number;
  showBilingual?: boolean;
}) {
  const percent = total > 0 ? (value / total) * 100 : 0;
  const color = getStatusColor(status);
  const label = showBilingual ? getBilingualStatusLabel(status) : status;
  
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      fontSize: 11,
      padding: '6px 8px',
      background: '#0a0a0a',
      borderRadius: 6,
      border: '1px solid #1a1a1a',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }} />
        <span style={{ opacity: 0.9 }}>{label}</span>
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 700, color }}>{value}</span>
        <span style={{ 
          fontSize: 9, 
          opacity: 0.5,
          padding: '1px 4px',
          background: `${color}20`,
          borderRadius: 3,
        }}>
          {percent.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

// ============================================
// TREND CHART (Mini Bar Chart)
// ============================================
export function TrendChart({ 
  data,
  height = 50,
  showLabels = false,
}: { 
  data: { label: string; value: number }[];
  height?: number;
  showLabels?: boolean;
}) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  
  return (
    <div>
      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-end', 
        gap: 2, 
        height,
      }}>
        {data.map((d, idx) => {
          const heightPercent = (d.value / maxValue) * 100;
          const isRecent = idx >= data.length - 4;
          return (
            <div
              key={d.label}
              style={{
                flex: 1,
                background: isRecent 
                  ? 'linear-gradient(180deg, #1f77b4, #1f77b488)'
                  : '#1f77b455',
                height: `${Math.max(heightPercent, 2)}%`,
                borderRadius: '3px 3px 0 0',
                transition: 'height 0.3s ease',
                cursor: 'pointer',
              }}
              title={`${d.label}: ${d.value} ca`}
            />
          );
        })}
      </div>
      {showLabels && data.length <= 12 && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginTop: 4,
          fontSize: 8,
          opacity: 0.5,
        }}>
          <span>{data[0]?.label}</span>
          <span>{data[data.length - 1]?.label}</span>
        </div>
      )}
    </div>
  );
}

// ============================================
// REGION RANK ITEM
// ============================================
export function RegionRankItem({ 
  rank, 
  name, 
  total,
  maxTotal,
}: { 
  rank: number; 
  name: string; 
  total: number;
  maxTotal?: number;
}) {
  const showBar = maxTotal && maxTotal > 0;
  const barPercent = showBar ? (total / maxTotal) * 100 : 0;
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 0',
      borderBottom: '1px solid #1a1a1a',
    }}>
      <span style={{ 
        width: 20, 
        height: 20, 
        borderRadius: '50%', 
        background: rank <= 3 ? '#1f77b4' : '#1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        fontWeight: 700,
        flexShrink: 0,
      }}>
        {rank}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          fontSize: 12, 
          fontWeight: 500,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {name}
        </div>
        {showBar && (
          <div style={{ 
            height: 3, 
            background: '#1a1a1a', 
            borderRadius: 2,
            marginTop: 4,
          }}>
            <div style={{
              height: '100%',
              width: `${barPercent}%`,
              background: '#1f77b4',
              borderRadius: 2,
            }} />
          </div>
        )}
      </div>
      <span style={{ 
        fontWeight: 700, 
        color: '#1f77b4',
        fontSize: 13,
      }}>
        {total}
      </span>
    </div>
  );
}

// ============================================
// COMPARISON CARD
// ============================================
export function ComparisonCard({
  current,
  previous,
  label,
  periodLabel,
}: {
  current: number;
  previous: number;
  label: string;
  periodLabel?: string;
}) {
  const percentChange = previous > 0 
    ? ((current - previous) / previous) * 100 
    : current > 0 ? 100 : 0;
  
  const isIncrease = percentChange > 0;
  const isDecrease = percentChange < 0;
  
  return (
    <div style={{
      background: '#111',
      borderRadius: 10,
      padding: 14,
      border: '1px solid #1a1a1a',
    }}>
      <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 8 }}>{label}</div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-end',
      }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{current}</div>
          <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4 }}>
            {periodLabel || '30 ngày qua'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ 
            fontSize: 18, 
            fontWeight: 700,
            color: isIncrease ? '#d62728' : isDecrease ? '#2ca02c' : '#7f7f7f',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            justifyContent: 'flex-end',
          }}>
            <span>{isIncrease ? '↑' : isDecrease ? '↓' : '→'}</span>
            <span>{Math.abs(percentChange).toFixed(1)}%</span>
          </div>
          <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>
            vs kỳ trước ({previous})
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CARD WRAPPER
// ============================================
export function Card({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div style={{
      background: '#111',
      borderRadius: 10,
      padding: 12,
      border: '1px solid #1a1a1a',
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 12,
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          opacity: 0.8,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          {icon && <span>{icon}</span>}
          {title}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ============================================
// STATUS DISTRIBUTION BAR
// ============================================
export function StatusDistributionBar({ 
  data,
}: { 
  data: { status: string; total: number }[];
}) {
  const total = data.reduce((sum, d) => sum + d.total, 0);
  if (total === 0) return null;
  
  return (
    <div>
      <div style={{ 
        display: 'flex', 
        height: 16, 
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid #1a1a1a',
      }}>
        {data.map((d) => {
          const percent = (d.total / total) * 100;
          if (percent < 1) return null;
          return (
            <div
              key={d.status}
              style={{
                width: `${percent}%`,
                background: getStatusColor(d.status),
                minWidth: percent > 0 ? 4 : 0,
                transition: 'width 0.3s ease',
              }}
              title={`${getBilingualStatusLabel(d.status)}: ${d.total} (${percent.toFixed(1)}%)`}
            />
          );
        })}
      </div>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
        gap: 4,
        marginTop: 8,
      }}>
        {data.map((d) => (
          <StatusBar 
            key={d.status} 
            status={d.status} 
            value={d.total} 
            total={total} 
          />
        ))}
      </div>
    </div>
  );
}

// ============================================
// LOADING SKELETON
// ============================================
export function LoadingSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div style={{ padding: 16 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 16,
            background: 'linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            borderRadius: 4,
            marginBottom: 8,
            width: `${100 - i * 15}%`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

// ============================================
// EMPTY STATE
// ============================================
export function EmptyState({ 
  icon = '📊', 
  title, 
  description,
}: { 
  icon?: string; 
  title: string; 
  description?: string;
}) {
  return (
    <div style={{ 
      padding: 32, 
      textAlign: 'center',
      opacity: 0.7,
    }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
      {description && (
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{description}</div>
      )}
    </div>
  );
}
