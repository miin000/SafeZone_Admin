'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

// Risk level colors
const RISK_COLORS: Record<string, string> = {
  low: '#4caf50',
  medium: '#ff9800',
  high: '#f44336',
  critical: '#9c27b0',
};

const RISK_LABELS: Record<string, { vi: string; en: string }> = {
  low: { vi: 'Thấp', en: 'Low' },
  medium: { vi: 'Trung bình', en: 'Medium' },
  high: { vi: 'Cao', en: 'High' },
  critical: { vi: 'Nguy hiểm', en: 'Critical' },
};

interface Zone {
  id: string;
  name: string;
  diseaseType: string;
  center: {
    type: 'Point';
    coordinates: [number, number]; // [lon, lat]
  };
  radiusKm: number;
  riskLevel: string;
  caseCount: number;
  description?: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}

interface ZoneLayerProps {
  zones: Zone[];
  onZoneClick?: (zone: Zone) => void;
  onToggleActive?: (zone: Zone) => void;
  opacity?: number;
  showLabels?: boolean;
  animate?: boolean;
}

export default function ZoneLayer({
  zones,
  onZoneClick,
  onToggleActive,
  opacity = 0.4,
  showLabels = true,
  animate = true,
}: ZoneLayerProps) {
  const map = useMap();
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!map) return;
    map.whenReady(() => setMapReady(true));
  }, [map]);
  
  // Store callbacks in refs to always have latest version
  const onZoneClickRef = useRef(onZoneClick);
  const onToggleActiveRef = useRef(onToggleActive);
  
  // Store layer group reference
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const pulseLayerGroupRef = useRef<L.LayerGroup | null>(null);
  
  // Update callback refs
  useEffect(() => {
    onZoneClickRef.current = onZoneClick;
  }, [onZoneClick]);
  
  useEffect(() => {
    onToggleActiveRef.current = onToggleActive;
  }, [onToggleActive]);

  // Create tooltip content for a zone (HTML string for hover)
  const createTooltipContent = useCallback((zone: Zone) => {
    const color = RISK_COLORS[zone.riskLevel] || RISK_COLORS.medium;
    const riskLabel = RISK_LABELS[zone.riskLevel] || RISK_LABELS.medium;
    
    return `
      <div style="min-width: 220px; font-family: system-ui; padding: 4px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #eee;">
          <div style="width: 28px; height: 28px; border-radius: 50%; background: ${color}30; border: 2px solid ${color}; display: flex; align-items: center; justify-content: center; font-size: 12px;">
            🚨
          </div>
          <div>
            <div style="font-weight: 700; font-size: 13px; color: #333;">${zone.name}</div>
            <div style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; border-radius: 4px; background: ${color}20; color: ${color}; font-size: 10px; font-weight: 600;">
              ${riskLabel.vi} / ${riskLabel.en}
            </div>
          </div>
        </div>

        <div style="font-size: 12px; color: #333;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span style="opacity: 0.7;">Loại bệnh:</span>
            <span style="font-weight: 600;">${zone.diseaseType}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span style="opacity: 0.7;">Bán kính:</span>
            <span style="font-weight: 600;">${zone.radiusKm} km</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span style="opacity: 0.7;">Số ca:</span>
            <span style="font-weight: 700; color: ${color};">${zone.caseCount}</span>
          </div>
          ${zone.startDate ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <span style="opacity: 0.7;">Từ ngày:</span>
              <span>${new Date(zone.startDate).toLocaleDateString('vi-VN')}</span>
            </div>
          ` : ''}
        </div>

        ${zone.description ? `
          <div style="margin-top: 6px; padding: 6px; background: #f5f5f5; border-radius: 4px; font-size: 11px; opacity: 0.8; color: #555;">
            ${zone.description}
          </div>
        ` : ''}

        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee; font-size: 10px; color: #888; text-align: center;">
          💡 Nhấn vào để xem chi tiết và chỉnh sửa
        </div>
      </div>
    `;
  }, []);

  // Main effect to manage zones
  useEffect(() => {
    if (!map || !mapReady) return;
    
    // Clean up existing layers
    if (layerGroupRef.current) {
      map.removeLayer(layerGroupRef.current);
    }
    if (pulseLayerGroupRef.current) {
      map.removeLayer(pulseLayerGroupRef.current);
    }
    
    // Filter active zones
    const activeZones = zones.filter((z) => z.isActive);
    
    if (activeZones.length === 0) {
      layerGroupRef.current = null;
      pulseLayerGroupRef.current = null;
      return;
    }
    
    // Create new layer groups
    const layerGroup = L.layerGroup();
    const pulseLayerGroup = L.layerGroup();
    
    activeZones.forEach((zone) => {
      const lat = zone.center.coordinates[1];
      const lon = zone.center.coordinates[0];
      const color = RISK_COLORS[zone.riskLevel] || RISK_COLORS.medium;
      
      // Create main circle
      const circle = L.circle([lat, lon], {
        radius: zone.radiusKm * 1000,
        color: color,
        weight: 3,
        opacity: 1,
        fillColor: color,
        fillOpacity: opacity,
        dashArray: zone.riskLevel === 'critical' ? '10, 5' : undefined,
      });
      
      // Bind tooltip (shows on hover) instead of popup
      circle.bindTooltip(createTooltipContent(zone), {
        direction: 'top',
        offset: [0, -10],
        opacity: 1,
        className: 'zone-tooltip',
        permanent: false,
        sticky: true,
      });

      circle.bindPopup(
        `
          <div style="min-width:200px;padding:6px 4px;">
            <div style="font-weight:700;font-size:13px;margin-bottom:8px;">${zone.name}</div>
            <div style="display:flex;gap:8px;">
              <button data-action="edit-zone" style="flex:1;padding:6px 8px;border-radius:6px;border:1px solid #cbd5e1;background:#f8fafc;cursor:pointer;">✏️ Chỉnh sửa</button>
              <button data-action="toggle-zone" style="flex:1;padding:6px 8px;border-radius:6px;border:1px solid #fecaca;background:#fef2f2;color:#b91c1c;cursor:pointer;">⏸ Tắt vùng</button>
            </div>
          </div>
        `,
        { closeButton: true },
      );
      
      // Add hover effects
      circle.on('mouseover', () => {
        circle.setStyle({ weight: 4, fillOpacity: opacity + 0.1 });
      });
      circle.on('mouseout', () => {
        circle.setStyle({ weight: 3, fillOpacity: opacity });
      });
      
      // Single click opens action popup, double click opens edit modal.
      circle.on('click', () => {
        circle.openPopup();
      });
      circle.on('dblclick', () => {
        onZoneClickRef.current?.(zone);
      });

      circle.on('popupopen', (event) => {
        const root = event.popup.getElement();
        if (!root) return;
        const editBtn = root.querySelector('[data-action="edit-zone"]');
        const toggleBtn = root.querySelector('[data-action="toggle-zone"]');

        editBtn?.addEventListener('click', () => {
          onZoneClickRef.current?.(zone);
          map.closePopup();
        });
        toggleBtn?.addEventListener('click', () => {
          onToggleActiveRef.current?.(zone);
          map.closePopup();
        });
      });

      // Quick shortcut: right-click to toggle active status.
      circle.on('contextmenu', () => {
        onToggleActiveRef.current?.(zone);
      });
      
      layerGroup.addLayer(circle);
      
      // Add pulse effect for critical zones
      if (animate && zone.riskLevel === 'critical') {
        const pulseCircle = L.circle([lat, lon], {
          radius: zone.radiusKm * 1000,
          color: RISK_COLORS.critical,
          weight: 1,
          opacity: 0.3,
          fillColor: RISK_COLORS.critical,
          fillOpacity: 0.1,
          interactive: false,
          className: 'pulse-zone',
        });
        pulseLayerGroup.addLayer(pulseCircle);
      }
    });
    
    // Add layers to map
    layerGroup.addTo(map);
    if (animate) {
      pulseLayerGroup.addTo(map);
    }
    
    // Store references
    layerGroupRef.current = layerGroup;
    pulseLayerGroupRef.current = pulseLayerGroup;
    
    // Cleanup on unmount or when zones change
    return () => {
      if (layerGroupRef.current) {
        map.removeLayer(layerGroupRef.current);
      }
      if (pulseLayerGroupRef.current) {
        map.removeLayer(pulseLayerGroupRef.current);
      }
    };
  }, [map, mapReady, zones, opacity, animate, createTooltipContent]);

  // Add CSS for pulse animation and tooltip styling
  return (
    <style>{`
      .pulse-zone {
        animation: pulse 2s ease-in-out infinite;
      }
      @keyframes pulse {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.6; }
      }
      .zone-tooltip {
        background: white !important;
        border: 1px solid #ddd !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
        padding: 0 !important;
      }
      .zone-tooltip .leaflet-tooltip-content {
        margin: 0 !important;
      }
      .leaflet-tooltip-top.zone-tooltip::before {
        border-top-color: #ddd !important;
      }
    `}</style>
  );
}
