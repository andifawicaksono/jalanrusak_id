'use client';

// CSS imports — aman karena komponen ini SELALU di-load dengan ssr:false
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/lib/assets/MarkerCluster.css';
import 'react-leaflet-cluster/lib/assets/MarkerCluster.Default.css';

import L from 'leaflet';
import { MapContainer, TileLayer, Marker, CircleMarker, ZoomControl, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import { Layers, Map } from 'lucide-react';
import apiClient from '@/lib/axios';
import { getSeverityMapColor } from '@/lib/utils';
import type { BoundingBox, DamageType, MapMarker } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ─── Fix ikon default Leaflet ─────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Constants ────────────────────────────────────────────────────
const DEFAULT_CENTER: [number, number] = [-6.2088, 106.8456];
const DEFAULT_ZOOM   = 10;

// ─── Ikon marker per tipe kerusakan ──────────────────────────────

const DAMAGE_SVG: Record<DamageType, string> = {
  BERLUBANG: `<circle cx="12" cy="12" r="4.5" stroke="rgba(255,255,255,0.9)" stroke-width="1.8" fill="rgba(0,0,0,0.25)"/>`,
  RETAK:     `<path d="M11 7l1.5 3-1.5 3 1.5 4" stroke="rgba(255,255,255,0.9)" stroke-width="1.8" stroke-linecap="round" fill="none"/>`,
  AMBLAS:    `<path d="M12 7v10M9 14l3 3 3-3" stroke="rgba(255,255,255,0.9)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  BANJIR:    `<path d="M7 15q2.5-4 5 0t5 0" stroke="rgba(255,255,255,0.9)" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
  LONGSOR:   `<path d="M7 17l5-9 5 9H7z" stroke="rgba(255,255,255,0.9)" stroke-width="1.5" fill="rgba(255,255,255,0.15)"/>`,
  LAINNYA:   `<text x="12" y="16.5" text-anchor="middle" font-size="11" font-weight="700" font-family="system-ui,sans-serif" fill="rgba(255,255,255,0.95)">?</text>`,
};

function createIcon(severity: number, damageType: DamageType): L.DivIcon {
  const color = getSeverityMapColor(severity);
  return L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${DAMAGE_SVG[damageType]}</svg></div>`,
    iconSize:   [28, 28],
    iconAnchor: [14, 14],
  });
}

// ─── Inner: Capture map bounds on move ───────────────────────────

function BoundsCapture({ onBoundsChange }: { onBoundsChange: (b: BoundingBox) => void }) {
  const map = useMapEvents({
    moveend: () => {
      const b = map.getBounds();
      onBoundsChange({
        swLat: b.getSouth(), swLng: b.getWest(),
        neLat: b.getNorth(), neLng: b.getEast(),
      });
    },
  });
  useEffect(() => {
    const b = map.getBounds();
    onBoundsChange({
      swLat: b.getSouth(), swLng: b.getWest(),
      neLat: b.getNorth(), neLng: b.getEast(),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// ─── SWR Fetcher ─────────────────────────────────────────────────

const fetcher = (key: string) =>
  apiClient.get<{ markers: MapMarker[]; total: number }>(key).then((r) => r.data);

// ─── Main Component ───────────────────────────────────────────────

type ViewMode = 'markers' | 'heatmap';

interface DashboardMapProps {
  readonly className?: string;
}

export default function DashboardMap({ className }: DashboardMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const [viewMode, setViewMode] = useState<ViewMode>('markers');
  const [bbox, setBbox] = useState<BoundingBox>({
    swLat: -6.5, swLng: 106.5, neLat: -5.8, neLng: 107.3,
  });

  const swrKey = `/reports/map-markers?swLat=${bbox.swLat}&swLng=${bbox.swLng}&neLat=${bbox.neLat}&neLng=${bbox.neLng}`;
  const { data, isLoading } = useSWR(swrKey, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval:  20_000,
  });
  const markers = data?.markers ?? [];

  const handleBoundsChange = useCallback((b: BoundingBox) => setBbox(b), []);

  if (!isMounted) return (
    <div className={cn('relative', className)}>
      <div className="h-full w-full bg-muted rounded-xl animate-pulse flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Memuat peta...</p>
      </div>
    </div>
  );

  return (
    <div className={cn('relative', className)}>
      {/* ── Toggle view mode ── */}
      <div className="absolute top-3 right-3 z-[1000] flex rounded-lg overflow-hidden border border-slate-700 bg-slate-900 shadow-md">
        <button
          onClick={() => setViewMode('markers')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
            viewMode === 'markers'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted',
          )}
          title="Tampilan marker"
        >
          <Map className="h-3.5 w-3.5" />
          Marker
        </button>
        <button
          onClick={() => setViewMode('heatmap')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
            viewMode === 'heatmap'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted',
          )}
          title="Tampilan heatmap"
        >
          <Layers className="h-3.5 w-3.5" />
          Heatmap
        </button>
      </div>

      {/* ── Loading indicator ── */}
      {isLoading && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/95 rounded-full px-3 py-1.5 text-xs font-medium text-slate-300 shadow flex items-center gap-2">
          <span className="h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block" />
          Memuat marker...
        </div>
      )}

      {/* ── Marker count ── */}
      <div className="absolute bottom-8 left-3 z-[1000] bg-slate-900/90 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-400 shadow">
        {markers.length} titik kerusakan
      </div>

      {/* ── Map ── */}
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full rounded-xl"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <ZoomControl position="bottomright" />
        <BoundsCapture onBoundsChange={handleBoundsChange} />

        {viewMode === 'markers' ? (
          /* Clustered marker view */
          <MarkerClusterGroup chunkedLoading>
            {markers.map((m) => (
              <Marker
                key={m.id}
                position={[m.latitude, m.longitude]}
                icon={createIcon(m.severity, m.damageType)}
              />
            ))}
          </MarkerClusterGroup>
        ) : (
          /* Heatmap view: semi-transparent circles colored by severity */
          <>
            {markers.map((m) => (
              <CircleMarker
                key={m.id}
                center={[m.latitude, m.longitude]}
                radius={20}
                pathOptions={{
                  color:       getSeverityMapColor(m.severity),
                  fillColor:   getSeverityMapColor(m.severity),
                  fillOpacity: 0.25,
                  weight:      0,
                }}
              />
            ))}
          </>
        )}
      </MapContainer>
    </div>
  );
}

