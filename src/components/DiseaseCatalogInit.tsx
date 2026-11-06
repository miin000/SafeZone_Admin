'use client';

import { useEffect } from 'react';
import { setDiseaseCatalog } from '@/types';

const API = process.env.NEXT_PUBLIC_API_URL!;

export default function DiseaseCatalogInit() {
  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetch(`${API}/diseases`)
        .then((r) => r.json())
        .then((rows) => {
          if (cancelled) return;
          const items = Array.isArray(rows)
            ? rows
                .map((d: any) => ({
                  name: typeof d?.name === 'string' ? d.name : '',
                  nameVi:
                    typeof d?.nameVi === 'string'
                      ? d.nameVi
                      : typeof d?.name_vi === 'string'
                        ? d.name_vi
                        : null,
                }))
                .filter((d) => d.name)
            : [];

          setDiseaseCatalog(items);
        })
        .catch(() => {
          // silent: UI falls back to local labels
        });
    };

    load();

    const onRefresh = () => load();
    window.addEventListener('safezone:diseaseCatalogUpdated', onRefresh);

    return () => {
      window.removeEventListener('safezone:diseaseCatalogUpdated', onRefresh);
      cancelled = true;
    };
  }, []);

  return null;
}
