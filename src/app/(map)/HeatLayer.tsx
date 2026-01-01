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

      // weight theo severity (nếu null => 1)
      const sev = Number(f?.properties?.severity ?? 1);
      const w = sev >= 3 ? 1.0 : sev === 2 ? 0.7 : 0.4;

      pts.push([lat, lon, w]);
    }

    // @ts-ignore
    const heat = (L as any).heatLayer(pts, {
      radius: 22,
      blur: 18,
      maxZoom: 14,
    }).addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [map, cases]);

  return null;
}
