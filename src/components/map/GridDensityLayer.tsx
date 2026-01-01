'use client';

import { useMemo } from 'react';
import { useMap, Rectangle, Tooltip } from 'react-leaflet';
import type { FeatureCollection, Point } from 'geojson';
import type { GridCell, RiskLevel } from '@/types';
import { getRiskLevel, getRiskColor, RISK_LEVELS, getBilingualDiseaseLabel } from '@/types';

interface GridDensityLayerProps {
  cases: FeatureCollection;
  gridSize?: number; // in degrees, default ~10km at Vietnam latitudes
  opacity?: number;
  showLabels?: boolean;
}

export default function GridDensityLayer({
  cases,
  gridSize = 0.1, // roughly 10km
  opacity = 0.6,
  showLabels = false,
}: GridDensityLayerProps) {
  const map = useMap();

  // Calculate grid cells based on cases
  const gridData = useMemo(() => {
    if (!cases || !cases.features || cases.features.length === 0) {
      return { cells: [], maxCount: 0, maxSeverity: 0 };
    }

    // Collect all valid points
    const points: Array<{
      lat: number;
      lon: number;
      severity: number;
      disease_type: string;
    }> = [];

    for (const f of cases.features as any[]) {
      const geom = f?.geometry;
      if (!geom || geom.type !== 'Point') continue;
      
      const [lon, lat] = geom.coordinates || [];
      if (typeof lat !== 'number' || typeof lon !== 'number') continue;

      const props = f.properties || {};
      points.push({
        lat,
        lon,
        severity: Number(props.severity ?? 1),
        disease_type: props.disease_type || 'Unknown',
      });
    }

    if (points.length === 0) {
      return { cells: [], maxCount: 0, maxSeverity: 0 };
    }

    // Find bounds
    const lats = points.map(p => p.lat);
    const lons = points.map(p => p.lon);
    const minLat = Math.floor(Math.min(...lats) / gridSize) * gridSize;
    const maxLat = Math.ceil(Math.max(...lats) / gridSize) * gridSize;
    const minLon = Math.floor(Math.min(...lons) / gridSize) * gridSize;
    const maxLon = Math.ceil(Math.max(...lons) / gridSize) * gridSize;

    // Create grid cells
    const cellMap = new Map<string, {
      count: number;
      severitySum: number;
      diseases: Record<string, number>;
      points: typeof points;
    }>();

    for (const point of points) {
      const cellLat = Math.floor(point.lat / gridSize) * gridSize;
      const cellLon = Math.floor(point.lon / gridSize) * gridSize;
      const key = `${cellLat},${cellLon}`;

      if (!cellMap.has(key)) {
        cellMap.set(key, {
          count: 0,
          severitySum: 0,
          diseases: {},
          points: [],
        });
      }

      const cell = cellMap.get(key)!;
      cell.count++;
      cell.severitySum += point.severity;
      cell.diseases[point.disease_type] = (cell.diseases[point.disease_type] || 0) + 1;
      cell.points.push(point);
    }

    // Convert to GridCell array
    const cells: GridCell[] = [];
    let maxCount = 0;
    let maxSeverityScore = 0;

    cellMap.forEach((data, key) => {
      const [lat, lon] = key.split(',').map(Number);
      const avgSeverity = data.severitySum / data.count;
      
      // Calculate risk score: combines count and severity
      // More cases AND higher severity = higher risk
      const normalizedCount = Math.min(data.count / 20, 1); // Cap at 20 cases
      const normalizedSeverity = (avgSeverity - 1) / 2; // Normalize 1-3 to 0-1
      const riskScore = (normalizedCount * 0.6) + (normalizedSeverity * 0.4);

      cells.push({
        id: key,
        bounds: [[lat, lon], [lat + gridSize, lon + gridSize]],
        center: [lat + gridSize / 2, lon + gridSize / 2],
        count: data.count,
        severity_sum: data.severitySum,
        severity_avg: avgSeverity,
        risk_level: getRiskLevel(riskScore),
        diseases: data.diseases,
      });

      maxCount = Math.max(maxCount, data.count);
      maxSeverityScore = Math.max(maxSeverityScore, riskScore);
    });

    return { cells, maxCount, maxSeverity: maxSeverityScore };
  }, [cases, gridSize]);

  if (gridData.cells.length === 0) return null;

  return (
    <>
      {gridData.cells.map((cell) => (
        <GridCellRectangle
          key={cell.id}
          cell={cell}
          opacity={opacity}
          showLabels={showLabels}
          maxCount={gridData.maxCount}
        />
      ))}
      
      {/* Legend */}
      <GridLegend />
    </>
  );
}

// Individual grid cell component
function GridCellRectangle({
  cell,
  opacity,
  showLabels,
  maxCount,
}: {
  cell: GridCell;
  opacity: number;
  showLabels: boolean;
  maxCount: number;
}) {
  const color = getRiskColor(cell.risk_level);
  const riskConfig = RISK_LEVELS.find(r => r.level === cell.risk_level);
  
  // Sort diseases by count
  const sortedDiseases = Object.entries(cell.diseases)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const tooltipContent = `
    <div style="min-width: 180px">
      <div style="font-weight: 700; font-size: 13px; margin-bottom: 6px; color: ${color}">
        ${riskConfig?.labelVi || 'Không xác định'}
      </div>
      <div style="margin: 4px 0">
        <strong>Số ca:</strong> ${cell.count}
      </div>
      <div style="margin: 4px 0">
        <strong>Mức độ TB:</strong> ${cell.severity_avg.toFixed(1)}/3
      </div>
      <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.2)">
        <strong>Loại bệnh:</strong>
        ${sortedDiseases.map(([disease, count]) => 
          `<div style="margin: 2px 0; opacity: 0.8">• ${getBilingualDiseaseLabel(disease)}: ${count}</div>`
        ).join('')}
      </div>
    </div>
  `;

  // Dynamic opacity based on count
  const dynamicOpacity = Math.min(0.3 + (cell.count / maxCount) * 0.5, opacity);

  return (
    <Rectangle
      bounds={cell.bounds}
      pathOptions={{
        color: color,
        weight: 1,
        opacity: 0.8,
        fillColor: color,
        fillOpacity: dynamicOpacity,
      }}
    >
      <Tooltip direction="top" sticky>
        <div dangerouslySetInnerHTML={{ __html: tooltipContent }} />
      </Tooltip>
    </Rectangle>
  );
}

// Legend component for grid density
function GridLegend() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 80,
        right: 10,
        zIndex: 1000,
        background: 'rgba(10, 10, 10, 0.92)',
        padding: 12,
        borderRadius: 10,
        border: '1px solid rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(8px)',
        minWidth: 150,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 8 }}>
        📊 Mức độ nguy cơ
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {[...RISK_LEVELS].reverse().map((level) => (
          <div key={level.level} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8,
            fontSize: 10,
          }}>
            <div style={{
              width: 16,
              height: 16,
              borderRadius: 3,
              background: level.color,
              opacity: 0.7,
            }} />
            <span style={{ opacity: 0.9 }}>{level.labelVi}</span>
          </div>
        ))}
      </div>
      <div style={{
        marginTop: 8,
        paddingTop: 8,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        fontSize: 9,
        opacity: 0.6,
      }}>
        Dựa trên số ca và mức độ nghiêm trọng
      </div>
    </div>
  );
}
