'use client';

import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useMemo, useState, useEffect, useCallback } from 'react';
import type { FeatureCollection } from 'geojson';
import type { LatLngExpression, LatLngBoundsExpression } from 'leaflet';
import HeatLayer from './HeatLayer';
import GridDensityLayer from '@/components/map/GridDensityLayer';
import ZoneLayer from '@/components/map/ZoneLayer';
import CasesLayer from '@/components/map/CasesLayer';
import type { DisplayMode, Case, BaseMapStyle, MapLayerConfig } from '@/types';
import { 
  DISEASE_COLORS, 
  STATUS_COLORS, 
  getDiseaseColor, 
  getStatusColor,
  BASE_MAP_CONFIGS,
} from '@/types';
import CaseDetailPanel from '@/components/CaseDetailPanel';
import MapLayerControl from '@/components/map/MapLayerControl';

// Vietnam bounds - focus map on Vietnam region
const VIETNAM_BOUNDS: LatLngBoundsExpression = [
  [8.18, 102.14],   // Southwest corner
  [23.39, 109.46]   // Northeast corner
];

const VIETNAM_CENTER: LatLngExpression = [16.0, 106.0];

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

interface MapViewProps {
  mode: DisplayMode;
  regions: any;
  cases: FeatureCollection | null;
  zones?: Zone[];
  onCaseClick?: (caseData: Case) => void;
  onZoneClick?: (zone: Zone) => void;
  onToggleZoneActive?: (zone: Zone) => void;
  onModeChange?: (mode: DisplayMode) => void;
  showControls?: boolean;
  initialBaseMap?: BaseMapStyle;
}

// Component to set map bounds
function MapBoundsController() {
  const map = useMap();
  
  useEffect(() => {
    map.setMaxBounds([
      [5, 99],    // Extended Southwest corner
      [26, 115]   // Extended Northeast corner
    ]);
    map.setMinZoom(5);
    map.fitBounds(VIETNAM_BOUNDS, { padding: [20, 20] });
  }, [map]);
  
  return null;
}

// Component to handle base map changes
function BaseMapLayer({ baseMap }: { baseMap: BaseMapStyle }) {
  const config = BASE_MAP_CONFIGS[baseMap];
  return (
    <TileLayer 
      key={baseMap}
      url={config.url}
      attribution={config.attribution}
    />
  );
}

export default function MapView({ 
  mode, 
  regions, 
  cases,
  zones = [],
  onCaseClick,
  onZoneClick,
  onToggleZoneActive,
  onModeChange,
  showControls = true,
  initialBaseMap = 'osm',
}: MapViewProps) {
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [layerConfig, setLayerConfig] = useState<MapLayerConfig>({
    showRegions: true,
    showCases: true,
    showZones: false,
    showDensity: false,
    showClusters: false,
    baseMap: initialBaseMap,
  });

  const diseaseColor = useMemo(() => makeCategoricalColorMap(), []);
  const statusColor = useMemo(() => makeStatusColorMap(), []);

  // Handle case selection - use useCallback to create stable reference
  const handleCaseSelect = useCallback((caseData: Case) => {
    setSelectedCase(caseData);
  }, []);

  const handlePanelClose = useCallback(() => {
    setSelectedCase(null);
  }, []);

  const handleEditCase = useCallback((caseData: Case) => {
    if (onCaseClick) {
      onCaseClick(caseData);
    }
    setSelectedCase(null);
  }, [onCaseClick]);

  const handleLayerConfigChange = useCallback((updates: Partial<MapLayerConfig>) => {
    setLayerConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const handleModeChange = useCallback((newMode: DisplayMode) => {
    if (onModeChange) {
      onModeChange(newMode);
    }
  }, [onModeChange]);

  // Determine if we should show points
  const showPoints = mode === 'points_disease' || mode === 'points_status' || mode === 'clusters';

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <MapContainer 
        center={VIETNAM_CENTER} 
        zoom={6} 
        style={{ height: '100%', width: '100%' }}
        maxBoundsViscosity={1.0}
      >
        <MapBoundsController />
        <BaseMapLayer baseMap={layerConfig.baseMap} />

        {/* Region boundaries layer */}
        {regions && layerConfig.showRegions && (
          <GeoJSON
            key={`regions-${layerConfig.baseMap}`}
            data={regions}
            style={() => ({
              weight: 1,
              opacity: 0.9,
              color: layerConfig.baseMap === 'dark' ? '#444' : layerConfig.baseMap === 'satellite' ? '#fff' : '#666',
              fillOpacity: 0.05,
              fillColor: layerConfig.baseMap === 'dark' ? '#333' : '#666',
            })}
            onEachFeature={(feature: any, layer) => {
              const p = feature?.properties || {};
              const title = p.TinhThanh ?? p.name ?? `Region ${p.id ?? ''}`;
              layer.bindTooltip(String(title), { sticky: true });
            }}
          />
        )}

        {/* HEATMAP Layer */}
        {mode === 'heatmap' && cases && <HeatLayer cases={cases} />}

        {/* GRID DENSITY Layer */}
        {mode === 'grid_density' && cases && (
          <GridDensityLayer 
            cases={cases} 
            gridSize={0.009} // ~1km cells
            opacity={0.6}
          />
        )}

        {/* ZONE Layer - Epidemic Zones (rendered before points so points are on top) */}
        {zones && zones.length > 0 && layerConfig.showZones && (
          <ZoneLayer
            zones={zones}
            onZoneClick={onZoneClick}
            onToggleActive={onToggleZoneActive}
            opacity={0.25}
            showLabels={true}
            animate={true}
          />
        )}

        {/* POINTS Layer - using CasesLayer for better event handling */}
        {showPoints && cases && cases.features && cases.features.length > 0 && layerConfig.showCases && (
          <CasesLayer
            cases={cases}
            mode={mode}
            baseMap={layerConfig.baseMap}
            onCaseSelect={handleCaseSelect}
          />
        )}

        {/* Legend */}
        <Legend mode={mode} diseaseColor={diseaseColor} statusColor={statusColor} />
      </MapContainer>

      {/* Map Layer Controls */}
      {showControls && (
        <MapLayerControl
          config={layerConfig}
          mode={mode}
          onConfigChange={handleLayerConfigChange}
          onModeChange={handleModeChange}
        />
      )}

      {/* Case Detail Panel */}
      <CaseDetailPanel
        caseData={selectedCase}
        onClose={handlePanelClose}
        onEdit={handleEditCase}
      />
    </div>
  );
}

/** Disease color map */
function makeCategoricalColorMap() {
  return {
    get: (key: string) => getDiseaseColor(key),
    entries: () => Object.entries(DISEASE_COLORS).filter(([k]) => k !== 'Other' && k !== 'Unknown'),
  } as const;
}

/** Status color map */
function makeStatusColorMap() {
  return {
    get: (key: string) => getStatusColor(key),
    entries: () => Object.entries(STATUS_COLORS).filter(([k]) => k !== 'unknown'),
  } as const;
}

/** Enhanced Legend with bilingual labels */
function Legend({
  mode,
  diseaseColor,
  statusColor,
}: {
  mode: DisplayMode;
  diseaseColor: ReturnType<typeof makeCategoricalColorMap>;
  statusColor: ReturnType<typeof makeStatusColorMap>;
}) {
  const [collapsed, setCollapsed] = useState(false);
  
  const diseaseItems = [
    { key: 'Dengue', labelEn: 'Dengue Fever', labelVi: 'Sốt xuất huyết', color: DISEASE_COLORS['Dengue'] },
    { key: 'HFMD', labelEn: 'Hand Foot Mouth', labelVi: 'Tay chân miệng', color: DISEASE_COLORS['HFMD'] },
    { key: 'Influenza', labelEn: 'Influenza', labelVi: 'Cúm', color: DISEASE_COLORS['Influenza'] },
    { key: 'COVID-19', labelEn: 'COVID-19', labelVi: 'COVID-19', color: DISEASE_COLORS['COVID-19'] },
    { key: 'Cholera', labelEn: 'Cholera', labelVi: 'Dịch tả', color: DISEASE_COLORS['Cholera'] },
    { key: 'Measles', labelEn: 'Measles', labelVi: 'Sởi', color: DISEASE_COLORS['Measles'] },
    { key: 'Malaria', labelEn: 'Malaria', labelVi: 'Sốt rét', color: DISEASE_COLORS['Malaria'] },
    { key: 'Typhoid', labelEn: 'Typhoid', labelVi: 'Thương hàn', color: DISEASE_COLORS['Typhoid'] },
    { key: 'Hepatitis', labelEn: 'Hepatitis', labelVi: 'Viêm gan', color: DISEASE_COLORS['Hepatitis'] },
    { key: 'Tuberculosis', labelEn: 'Tuberculosis', labelVi: 'Lao phổi', color: DISEASE_COLORS['Tuberculosis'] },
    { key: 'Other', labelEn: 'Other', labelVi: 'Khác', color: DISEASE_COLORS['Other'] },
  ];

  const statusItems = [
    { key: 'suspected', labelEn: 'Suspected', labelVi: 'Nghi ngờ', color: STATUS_COLORS['suspected'] },
    { key: 'probable', labelEn: 'Probable', labelVi: 'Có khả năng', color: STATUS_COLORS['probable'] },
    { key: 'confirmed', labelEn: 'Confirmed', labelVi: 'Xác nhận', color: STATUS_COLORS['confirmed'] },
    { key: 'under treatment', labelEn: 'Treatment', labelVi: 'Điều trị', color: STATUS_COLORS['under treatment'] },
    { key: 'under observation', labelEn: 'Observation', labelVi: 'Theo dõi', color: STATUS_COLORS['under observation'] },
    { key: 'recovered', labelEn: 'Recovered', labelVi: 'Đã khỏi', color: STATUS_COLORS['recovered'] },
    { key: 'deceased', labelEn: 'Deceased', labelVi: 'Tử vong', color: STATUS_COLORS['deceased'] },
  ];

  // Don't show legend for grid_density (it has its own)
  if (mode === 'grid_density') return null;

  const items = mode === 'points_disease' ? diseaseItems : mode === 'points_status' ? statusItems : [];

  const title =
    mode === 'points_disease'
      ? '🦠 Loại bệnh / Disease Type'
      : mode === 'points_status'
      ? '📊 Trạng thái / Status'
      : '🔥 Bản đồ nhiệt / Heatmap';

  return (
    <div
      style={{
        position: 'absolute',
        right: 10,
        top: 10,
        zIndex: 1000,
        background: 'rgba(10,10,10,0.95)',
        padding: collapsed ? 10 : 12,
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.15)',
        maxWidth: collapsed ? 44 : 220,
        backdropFilter: 'blur(10px)',
        transition: 'all 0.2s ease',
      }}
    >
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: 16,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Mở chú thích / Show legend"
        >
          📋
        </button>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 11 }}>{title}</div>
            <button
              onClick={() => setCollapsed(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: 14,
                opacity: 0.6,
                padding: 0,
              }}
              title="Thu gọn / Collapse"
            >
              ✕
            </button>
          </div>

          {mode === 'heatmap' ? (
            <div>
              <div style={{ 
                height: 10, 
                borderRadius: 5,
                background: 'linear-gradient(to right, #2ca02c, #ffff00, #ff7f0e, #d62728)',
                marginBottom: 6,
              }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, opacity: 0.7 }}>
                <span>Thấp / Low</span>
                <span>Cao / High</span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {items.map((item) => (
                <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ 
                    width: 10, 
                    height: 10, 
                    borderRadius: '50%', 
                    background: item.color, 
                    display: 'inline-block',
                    border: '1px solid rgba(255,255,255,0.2)',
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 10, opacity: 0.9, lineHeight: 1.3 }}>
                    {item.labelVi}
                    <span style={{ opacity: 0.5, marginLeft: 4, fontSize: 9 }}>({item.labelEn})</span>
                  </span>
                </div>
              ))}
              
              {/* Severity Legend */}
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: 9, fontWeight: 600, marginBottom: 6, opacity: 0.7 }}>
                  Kích thước = Mức độ / Size = Severity
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#d62728', display: 'inline-block' }} />
                    <span style={{ fontSize: 9, opacity: 0.7 }}>Nặng</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#ff7f0e', display: 'inline-block' }} />
                    <span style={{ fontSize: 9, opacity: 0.7 }}>TB</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2ca02c', display: 'inline-block' }} />
                    <span style={{ fontSize: 9, opacity: 0.7 }}>Nhẹ</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
