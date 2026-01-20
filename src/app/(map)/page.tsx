'use client';

import dynamic from 'next/dynamic';

const MapDashboard = dynamic(() => import('./MapDashboardNew'), { ssr: false });

export default function Page() {
  return <MapDashboard />;
}
