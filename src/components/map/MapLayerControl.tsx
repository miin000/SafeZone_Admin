'use client';

import { useState } from 'react';
import type { BaseMapStyle, DisplayMode, MapLayerConfig } from '@/types';
import { BASE_MAP_CONFIGS } from '@/types';

interface MapLayerControlProps {
  config: MapLayerConfig;
  mode: DisplayMode;
  onConfigChange: (config: Partial<MapLayerConfig>) => void;
  onModeChange: (mode: DisplayMode) => void;
}

export default function MapLayerControl({
  config,
  mode,
  onConfigChange,
  onModeChange,
}: MapLayerControlProps) {
  const [expanded, setExpanded] = useState(false);

  const displayModes: { value: DisplayMode; icon: string; label: string; labelVi: string }[] = [
    { value: 'points_disease', icon: '🦠', label: 'By Disease', labelVi: 'Theo loại bệnh' },
    { value: 'points_status', icon: '📊', label: 'By Status', labelVi: 'Theo trạng thái' },
    { value: 'points_severity', icon: '⚠️', label: 'By Severity', labelVi: 'Theo mức độ' },
    { value: 'heatmap', icon: '🔥', label: 'Heatmap', labelVi: 'Bản đồ nhiệt' },
    { value: 'grid_density', icon: '📐', label: 'Risk Grid', labelVi: 'Lưới nguy cơ' },
    { value: 'clusters', icon: '⭕', label: 'Clusters', labelVi: 'Cụm điểm' },
  ];

  const baseMaps: { value: BaseMapStyle; icon: string }[] = [
    { value: 'osm', icon: '🗺️' },
    { value: 'dark', icon: '🌙' },
    { value: 'light', icon: '☀️' },
    { value: 'satellite', icon: '🛰️' },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        top: 80,
        left: 10,
        zIndex: 1000,
      }}
    >
      {/* Collapsed View */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          style={{
            background: 'rgba(10, 10, 10, 0.92)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 10,
            padding: '10px 14px',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backdropFilter: 'blur(8px)',
          }}
        >
          <span>🗂️</span>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Lớp bản đồ</span>
        </button>
      )}

      {/* Expanded View */}
      {expanded && (
        <div
          style={{
            background: 'rgba(10, 10, 10, 0.95)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 12,
            padding: 16,
            backdropFilter: 'blur(10px)',
            minWidth: 220,
          }}
        >
          {/* Header */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 12,
          }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#ffffff' }}>🗂️ Lớp bản đồ</span>
            <button
              onClick={() => setExpanded(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: 16,
                opacity: 0.6,
              }}
            >
              ✕
            </button>
          </div>

          {/* Display Mode */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>
              Chế độ hiển thị
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {displayModes.map((dm) => (
                <button
                  key={dm.value}
                  onClick={() => onModeChange(dm.value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: mode === dm.value ? '1px solid #1f77b4' : '1px solid #2a2a2a',
                    background: mode === dm.value ? '#1f77b420' : 'transparent',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: 12,
                    textAlign: 'left',
                  }}
                >
                  <span>{dm.icon}</span>
                  <span style={{ flex: 1 }}>{dm.labelVi}</span>
                  {mode === dm.value && <span style={{ color: '#1f77b4' }}>✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Base Map Selection */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>
              Bản đồ nền
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {baseMaps.map((bm) => {
                const mapConfig = BASE_MAP_CONFIGS[bm.value];
                return (
                  <button
                    key={bm.value}
                    onClick={() => onConfigChange({ baseMap: bm.value })}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: 6,
                      border: config.baseMap === bm.value ? '1px solid #1f77b4' : '1px solid #2a2a2a',
                      background: config.baseMap === bm.value ? '#1f77b420' : 'transparent',
                      color: '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                    }}
                    title={mapConfig.nameVi}
                  >
                    <span style={{ fontSize: 16 }}>{bm.icon}</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>{mapConfig.nameVi}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Layer Toggles */}
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>
              Hiển thị lớp
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <LayerToggle
                label="Ranh giới tỉnh"
                icon="🗺️"
                checked={config.showRegions}
                onChange={(checked) => onConfigChange({ showRegions: checked })}
              />
              <LayerToggle
                label="Điểm ca bệnh"
                icon="📍"
                checked={config.showCases}
                onChange={(checked) => onConfigChange({ showCases: checked })}
              />
            </div>
          </div>

          {/* Zone Layer Toggle - Separate section */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>
              🚨 Vùng dịch bệnh
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <LayerToggle
                label="Hiển thị vùng dịch"
                icon="🔴"
                checked={config.showZones}
                onChange={(checked) => onConfigChange({ showZones: checked })}
              />
            </div>
          </div>

          {/* Info */}
          <div style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid #2a2a2a',
            fontSize: 11,
            color: 'rgba(255,255,255,0.6)',
          }}>
            💡 Dùng scroll để zoom, kéo để di chuyển
          </div>
        </div>
      )}
    </div>
  );
}

// Toggle Switch Component
function LayerToggle({
  label,
  icon,
  checked,
  onChange,
}: {
  label: string;
  icon: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      cursor: 'pointer',
      padding: '6px 8px',
      borderRadius: 6,
      background: checked ? '#1f77b410' : 'transparent',
    }}>
      <span style={{ fontSize: 12 }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 12, color: '#ffffff' }}>{label}</span>
      <div
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          background: checked ? '#1f77b4' : '#333',
          position: 'relative',
          transition: 'background 0.2s ease',
        }}
        onClick={() => onChange(!checked)}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: 'white',
            position: 'absolute',
            top: 2,
            left: checked ? 18 : 2,
            transition: 'left 0.2s ease',
          }}
        />
      </div>
    </label>
  );
}
