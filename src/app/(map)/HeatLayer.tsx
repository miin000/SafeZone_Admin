'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import type { FeatureCollection } from 'geojson';

export default function HeatLayer({ cases }: { cases: FeatureCollection }) {
  const map = useMap();

  useEffect(() => {
    const pts: any[] = [];

    for (const f of (cases.features || []) as any[]) {
      const geom = f?.geometry;
      if (!geom || geom.type !== 'Point') continue;
      const [lon, lat] = geom.coordinates || [];
      if (typeof lat !== 'number' || typeof lon !== 'number') continue;

      // Weight = severity (normalized) so heatmap reflects both density and severity.
      const severityRaw = Number(f?.properties?.severity ?? 1);
      const severity = Number.isFinite(severityRaw) ? severityRaw : 1;
      const weight = Math.min(Math.max(severity / 3, 0.2), 1);

      pts.push([lat, lon, weight]);
    }

    // @ts-ignore
    const heat = (L as any).heatLayer(pts, {
      radius: 22,
      blur: 18,
      max: 1,
      maxZoom: 14,
    }).addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [map, cases]);

  return null;
}
