'use client';

import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useMemo, useState, useEffect, useCallback } from 'react';
import type { FeatureCollection } from 'geojson';
import type { LatLngExpression, LatLngBoundsExpression } from 'leaflet';
import HeatLayer from './HeatLayer';
import DBSCANClusterLayer from '@/components/map/DBSCANClusterLayer';
import ZoneLayer from '@/components/map/ZoneLayer';
import CasesLayer from '@/components/map/CasesLayer';
import type {
  DisplayMode,
  Case,
  BaseMapStyle,
  MapLayerConfig,
  DBSCANClustersResponse,
} from '@/types';
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
  clusters?: DBSCANClustersResponse | null;
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
  clusters = null,
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

  // Determine if we should show case points
  const showPoints = mode === 'points_disease' || mode === 'points_status';
  const showClusters = mode === 'clusters_dbscan';

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

        {/* DBSCAN clusters layer */}
        {showClusters && layerConfig.showCases && (
          <DBSCANClusterLayer data={clusters} />
        )}

        {/* Legend */}
        <Legend
          mode={mode}
          diseaseColor={diseaseColor}
          statusColor={statusColor}
          cases={cases}
          clusters={clusters}
        />
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
  cases,
  clusters,
}: {
  mode: DisplayMode;
  diseaseColor: ReturnType<typeof makeCategoricalColorMap>;
  statusColor: ReturnType<typeof makeStatusColorMap>;
  cases: FeatureCollection | null;
  clusters: DBSCANClustersResponse | null;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const diseaseItems = useMemo(() => {
    const values = new Set<string>();
    for (const f of (cases?.features || []) as any[]) {
      const disease = f?.properties?.disease_type;
      if (typeof disease === 'string' && disease.trim()) {
        values.add(disease.trim());
      }
    }

    return [...values].sort().map((key) => ({
      key,
      labelEn: key,
      labelVi: key,
      color: diseaseColor.get(key),
    }));
  }, [cases, diseaseColor]);

  const statusItems = [
    { key: 'suspected', labelEn: 'Suspected', labelVi: 'Nghi ngờ', color: STATUS_COLORS['suspected'] },
    { key: 'probable', labelEn: 'Probable', labelVi: 'Có khả năng', color: STATUS_COLORS['probable'] },
    { key: 'confirmed', labelEn: 'Confirmed', labelVi: 'Xác nhận', color: STATUS_COLORS['confirmed'] },
    { key: 'under treatment', labelEn: 'Treatment', labelVi: 'Điều trị', color: STATUS_COLORS['under treatment'] },
    { key: 'under observation', labelEn: 'Observation', labelVi: 'Theo dõi', color: STATUS_COLORS['under observation'] },
    { key: 'recovered', labelEn: 'Recovered', labelVi: 'Đã khỏi', color: STATUS_COLORS['recovered'] },
    { key: 'deceased', labelEn: 'Deceased', labelVi: 'Tử vong', color: STATUS_COLORS['deceased'] },
  ];

  const items = mode === 'points_disease' ? diseaseItems : mode === 'points_status' ? statusItems : [];

  const title =
    mode === 'points_disease'
      ? '🦠 Loại bệnh / Disease Type'
      : mode === 'points_status'
      ? '📊 Trạng thái / Status'
      : mode === 'clusters_dbscan'
      ? '🧩 Cụm DBSCAN / DBSCAN Clusters'
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
            <div style={{ fontWeight: 700, fontSize: 12, color: '#ffffff' }}>{title}</div>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.85)' }}>
                <span>Thấp / Low</span>
                <span>Cao / High</span>
              </div>
            </div>
          ) : mode === 'clusters_dbscan' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, color: '#ffffff', opacity: 0.9 }}>
                Cụm DBSCAN: vòng tròn càng lớn = càng nhiều ca
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
                  <span style={{ fontSize: 11, color: '#ffffff' }}>Cụm nặng (combined 3)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f97316', display: 'inline-block' }} />
                  <span style={{ fontSize: 11, color: '#ffffff' }}>Cụm trung bình (combined 2)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                  <span style={{ fontSize: 11, color: '#ffffff' }}>Cụm nhẹ (combined 1)</span>
                </div>
              </div>
              <div style={{ marginTop: 4, fontSize: 10, color: 'rgba(255,255,255,0.72)' }}>
                {clusters
                  ? `eps≈${clusters.parameters.epsKmApprox.toFixed(2)}km | minPts=${clusters.parameters.minPoints} | clusters=${clusters.totalClusters} | noise=${clusters.noiseCount}`
                  : 'Đang tải dữ liệu DBSCAN...'}
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
                  <span style={{ fontSize: 11, color: '#ffffff', lineHeight: 1.3 }}>
                    {item.labelVi}
                    <span style={{ color: 'rgba(255,255,255,0.6)', marginLeft: 4, fontSize: 9 }}>({item.labelEn})</span>
                  </span>
                </div>
              ))}
              
              {/* Severity Legend */}
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 6, color: 'rgba(255,255,255,0.85)' }}>
                  Kích thước = Mức độ / Size = Severity
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#d62728', display: 'inline-block' }} />
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)' }}>Nặng</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#ff7f0e', display: 'inline-block' }} />
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)' }}>TB</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2ca02c', display: 'inline-block' }} />
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)' }}>Nhẹ</span>
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
