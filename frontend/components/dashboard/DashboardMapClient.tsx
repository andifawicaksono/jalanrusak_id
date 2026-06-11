'use client';

import dynamic from 'next/dynamic';
import DashboardMapSkeleton from './DashboardMapSkeleton';

// Dynamic import dengan ssr:false HARUS ada di Client Component.
// Jangan statically import apapun dari DashboardMap.tsx agar Leaflet
// tidak masuk ke SSR bundle.
const DashboardMap = dynamic(() => import('./DashboardMap'), {
  ssr: false,
  loading: () => <DashboardMapSkeleton />,
});

interface Props {
  readonly className?: string;
}

export default function DashboardMapClient({ className }: Props) {
  return <DashboardMap className={className} />;
}
