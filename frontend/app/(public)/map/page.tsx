import { Metadata } from 'next';
import MapViewClient from '@/components/map/MapViewClient';
import type { MapMarker } from '@/types';

export const metadata: Metadata = {
  title: 'Peta Laporan — JalanRusak',
  description: 'Peta interaktif laporan kerusakan jalan di seluruh Indonesia',
};

const INITIAL_BBOX = {
  swLat: -6.5, swLng: 106.5,
  neLat: -5.8, neLng: 107.3,
};

async function fetchInitialMarkers(): Promise<MapMarker[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
  try {
    const res = await fetch(
      `${apiUrl}/reports/map-markers?swLat=${INITIAL_BBOX.swLat}&swLng=${INITIAL_BBOX.swLng}&neLat=${INITIAL_BBOX.neLat}&neLng=${INITIAL_BBOX.neLng}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return [];
    const body = await res.json() as { markers: MapMarker[] };
    return body.markers;
  } catch {
    return [];
  }
}

const SEVERITY_LEGEND = [
  { color: '#22c55e', label: 'Ringan' },
  { color: '#eab308', label: 'Sedang' },
  { color: '#f97316', label: 'Parah' },
  { color: '#ef4444', label: 'Kritis' },
];

export default async function MapPage() {
  const initialMarkers = await fetchInitialMarkers();

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b bg-white flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-base font-semibold text-gray-800">Peta Laporan Jalan Rusak</h1>
          <p className="text-xs text-gray-500">Klik marker untuk detail · Klik peta untuk melaporkan</p>
        </div>
        {/* Legenda severity */}
        <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
          {SEVERITY_LEGEND.map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-3 rounded-full border border-white shadow-sm shrink-0"
                style={{ backgroundColor: color }}
              />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Peta penuh */}
      <div className="flex-1">
        <MapViewClient initialMarkers={initialMarkers} className="h-full w-full" />
      </div>
    </div>
  );
}
