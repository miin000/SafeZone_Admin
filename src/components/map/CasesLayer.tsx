'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { FeatureCollection, Feature, Point } from 'geojson';
import type { Case, DisplayMode, BaseMapStyle } from '@/types';
import {
  getDiseaseColor,
  getStatusColor,
  getSeverityColor,
  getBilingualDiseaseLabel,
  getBilingualStatusLabel,
  getBilingualSeverityLabel,
} from '@/types';

interface CasesLayerProps {
  cases: FeatureCollection;
  mode: DisplayMode;
  baseMap: BaseMapStyle;
  onCaseSelect: (caseData: Case) => void;
}

export default function CasesLayer({
  cases,
  mode,
  baseMap,
  onCaseSelect,
}: CasesLayerProps) {
  const map = useMap();
  const [mapReady, setMapReady] = useState(false);
  
  // Store callback in ref to always have latest version
  const onCaseSelectRef = useRef(onCaseSelect);
  
  // Store layer group reference
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  
  // Update callback ref
  useEffect(() => {
    onCaseSelectRef.current = onCaseSelect;
  }, [onCaseSelect]);

  // Get color based on mode
  const getColor = useCallback((diseaseType: string, status: string) => {
    if (mode === 'points_disease') {
      return getDiseaseColor(diseaseType);
    }
    return getStatusColor(status);
  }, [mode]);

  // Create popup content for a case
  const createPopupContent = useCallback((p: any) => {
    return `
      <div style="min-width: 260px; font-family: system-ui, sans-serif;">
        <div style="font-weight: 800; font-size: 15px; margin-bottom: 8px; color: ${getDiseaseColor(p.disease_type)}">
          ${getBilingualDiseaseLabel(p.disease_type ?? 'Unknown')}
        </div>
        
        <div style="display: grid; gap: 6px; font-size: 12px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="opacity: 0.7">Trạng thái / Status:</span>
            <span style="font-weight: 600; color: ${getStatusColor(p.status)}">${getBilingualStatusLabel(p.status ?? '-')}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between;">
            <span style="opacity: 0.7">Mức độ / Severity:</span>
            <span style="font-weight: 600; color: ${getSeverityColor(p.severity)}">${getBilingualSeverityLabel(p.severity)}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between;">
            <span style="opacity: 0.7">Khu vực / Region:</span>
            <span style="font-weight: 500">${p.region_name ?? `ID: ${p.region_id ?? '-'}`}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between;">
            <span style="opacity: 0.7">Thời gian / Time:</span>
            <span style="font-weight: 500; font-size: 11px">${p.reported_time ? new Date(p.reported_time).toLocaleString('vi-VN') : '-'}</span>
          </div>
        </div>
        
        ${p.notes ? `
          <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.15);">
            <div style="opacity: 0.7; font-size: 11px; margin-bottom: 4px">Ghi chú / Notes:</div>
            <div style="font-size: 12px; opacity: 0.9">${p.notes}</div>
          </div>
        ` : ''}
        
        <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.15); font-size: 11px; opacity: 0.6; text-align: center">
          Click để xem chi tiết / Click to view details
        </div>
      </div>
    `;
  }, []);

  useEffect(() => {
    if (!map) return;
    map.whenReady(() => setMapReady(true));
  }, [map]);

  // Main effect to manage cases layer
  useEffect(() => {
    if (!map || !mapReady || !cases || !cases.features) return;
    
    // Clean up existing layer
    if (layerGroupRef.current) {
      map.removeLayer(layerGroupRef.current);
    }
    
    if (cases.features.length === 0) {
      layerGroupRef.current = null;
      return;
    }
    
    // Create new layer group
    const layerGroup = L.layerGroup();
    
    cases.features.forEach((feature) => {
      if (feature.geometry.type !== 'Point') return;
      
      const coords = feature.geometry.coordinates as [number, number];
      const p = feature.properties || {};
      const sev = Number(p.severity ?? 1);
      
      // Size based on severity
      const radius = sev >= 3 ? 12 : sev === 2 ? 9 : 6;
      
      let fillOpacity = 0.8;
      let weight = 2;
      
      // Color based on mode
      const color = getColor(p.disease_type, p.status);
      
      if (mode === 'points_disease' && sev >= 3) {
        fillOpacity = 0.95;
        weight = 2.5;
      }
      
      // Create circle marker
      const marker = L.circleMarker([coords[1], coords[0]], {
        radius,
        weight,
        opacity: 1,
        fillOpacity,
        color: baseMap === 'dark' ? '#fff' : '#333',
        fillColor: color,
      });
      
      // Bind popup
      marker.bindPopup(createPopupContent(p));
      
      // Add click handler - using ref to always get latest callback
      marker.on('click', () => {
        const caseData: Case = {
          id: p.id,
          external_id: p.external_id,
          disease_type: p.disease_type,
          status: p.status,
          severity: p.severity,
          reported_time: p.reported_time,
          region_id: p.region_id,
          region_name: p.region_name,
          patient_name: p.patient_name,
          patient_age: p.patient_age,
          patient_gender: p.patient_gender,
          notes: p.notes,
          lat: p.lat,
          lon: p.lon,
        };
        onCaseSelectRef.current?.(caseData);
      });
      
      layerGroup.addLayer(marker);
    });
    
    // Add layer to map
    layerGroup.addTo(map);
    
    // Store reference
    layerGroupRef.current = layerGroup;
    
    // Cleanup on unmount or when data changes
    return () => {
      if (layerGroupRef.current) {
        map.removeLayer(layerGroupRef.current);
      }
    };
  }, [map, mapReady, cases, mode, baseMap, getColor, createPopupContent]);

  return null;
}
