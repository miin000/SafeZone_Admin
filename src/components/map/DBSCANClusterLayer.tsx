'use client';

import { CircleMarker, Popup, Tooltip } from 'react-leaflet';
import type { DBSCANClustersResponse } from '@/types';

interface DBSCANClusterLayerProps {
  data: DBSCANClustersResponse | null;
}

function getClusterColor(severityCombined: number): string {
  if (severityCombined >= 3) return '#dc2626';
  if (severityCombined >= 2) return '#f97316';
  return '#16a34a';
}

function getClusterRadius(count: number): number {
  // Gentle logarithmic growth so high-density clusters stay visible without covering the map.
  return Math.max(8, Math.min(28, 8 + Math.log2(count + 1) * 4));
}

export default function DBSCANClusterLayer({ data }: DBSCANClusterLayerProps) {
  if (!data) return null;

  return (
    <>
      {data.clusters.map((cluster) => {
        const radius = getClusterRadius(cluster.count);
        const color = getClusterColor(cluster.severity.combined);

        return (
          <CircleMarker
            key={`cluster-${cluster.id}`}
            center={[cluster.center.lat, cluster.center.lon]}
            radius={radius}
            pathOptions={{
              color: '#ffffff',
              weight: 2,
              fillColor: color,
              fillOpacity: 0.82,
            }}
          >
            <Tooltip direction="top" offset={[0, -4]} opacity={0.95}>
              {`Cụm #${cluster.id} - ${cluster.count} ca`}
            </Tooltip>
            <Popup>
              <div style={{ minWidth: 270, fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ fontWeight: 800, marginBottom: 8, fontSize: 14 }}>
                  Cụm DBSCAN #{cluster.id}
                </div>

                <div style={{ display: 'grid', gap: 6, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ opacity: 0.75 }}>Số ca trong cụm:</span>
                    <span style={{ fontWeight: 700 }}>{cluster.count}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ opacity: 0.75 }}>Core points:</span>
                    <span style={{ fontWeight: 700 }}>{cluster.dbscan.pointTypeSummary.core}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ opacity: 0.75 }}>Border points:</span>
                    <span style={{ fontWeight: 700 }}>{cluster.dbscan.pointTypeSummary.border}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ opacity: 0.75 }}>Mức độ cụm:</span>
                    <span style={{ fontWeight: 700 }}>{cluster.severity.combined}</span>
                  </div>
                  {typeof cluster.severity.score === 'number' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ opacity: 0.75 }}>Điểm cụm:</span>
                      <span style={{ fontWeight: 700 }}>{cluster.severity.score.toFixed(3)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ opacity: 0.75 }}>TB severity:</span>
                    <span style={{ fontWeight: 700 }}>{cluster.severity.average}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ opacity: 0.75 }}>Neighbors (min-max):</span>
                    <span style={{ fontWeight: 700 }}>{`${cluster.dbscan.neighbors.min} - ${cluster.dbscan.neighbors.max}`}</span>
                  </div>
                </div>

                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 4 }}>Nhóm bệnh:</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{cluster.diseases.join(', ')}</div>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

      {data.parameters.includeNoise &&
        data.noisePoints.map((point) => (
          <CircleMarker
            key={`noise-${point.id}`}
            center={[point.lat, point.lon]}
            radius={6}
            bubblingMouseEvents={false}
            eventHandlers={{
              click: (e) => {
                e.target.openPopup();
              },
            }}
            pathOptions={{
              color: '#111827',
              weight: 1,
              fillColor: '#9ca3af',
              fillOpacity: 0.85,
            }}
          >
            <Tooltip direction="top" offset={[0, -2]} opacity={0.95}>
              {`Noise #${point.id} - ${point.disease_type}`}
            </Tooltip>
            <Popup>
              <div style={{ minWidth: 250, fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ fontWeight: 800, marginBottom: 8, fontSize: 14 }}>
                  Noise Point #{point.id}
                </div>
                <div style={{ display: 'grid', gap: 6, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ opacity: 0.75 }}>Bệnh:</span>
                    <span style={{ fontWeight: 700 }}>{point.disease_type}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ opacity: 0.75 }}>Trạng thái:</span>
                    <span style={{ fontWeight: 700 }}>{point.status}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ opacity: 0.75 }}>Severity:</span>
                    <span style={{ fontWeight: 700 }}>{point.severity}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ opacity: 0.75 }}>Thời gian:</span>
                    <span style={{ fontWeight: 700 }}>
                      {new Date(point.reported_time).toLocaleString('vi-VN')}
                    </span>
                  </div>
                </div>
                <div style={{ marginTop: 8, fontSize: 11, opacity: 0.75 }}>
                  Điểm này không đủ mật độ để vào cụm DBSCAN ở cấu hình hiện tại.
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
    </>
  );
}
