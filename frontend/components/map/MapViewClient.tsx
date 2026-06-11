'use client';

import dynamic from 'next/dynamic';
import MapSkeleton from './MapSkeleton';
import type { MapMarker } from '@/types';

// Dynamic import dengan ssr:false HARUS ada di Client Component.
// MapViewClient tidak boleh statically import apapun dari MapView.tsx
// karena itu akan menarik Leaflet ke SSR bundle.
const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

interface Props {
  readonly initialMarkers?: MapMarker[];
  readonly className?: string;
}

export default function MapViewClient({ initialMarkers, className }: Props) {
  return <MapView initialMarkers={initialMarkers} className={className} />;
}
