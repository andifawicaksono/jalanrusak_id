'use client';

// CSS Leaflet — aman di-import di sini karena komponen ini SELALU di-load dengan ssr:false
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/lib/assets/MarkerCluster.css';
import 'react-leaflet-cluster/lib/assets/MarkerCluster.Default.css';

import L from 'leaflet';
import { MapContainer, TileLayer, Marker, ZoomControl, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Crosshair, MapPin, X } from 'lucide-react';

import { useMapData, INITIAL_BBOX } from '@/hooks/useMapData';
import ReportPopup from './ReportPopup';
import MapFilters from './MapFilters';
import { BoundingBox, DamageType, MapMarker } from '@/types';
import { getSeverityMapColor } from '@/lib/utils';

// ─── Fix ikon default Leaflet (webpack menghapus URL) ─────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Konfigurasi Peta ─────────────────────────────────────────────

const DEFAULT_CENTER: [number, number] = [-6.2088, 106.8456]; // Jakarta
const DEFAULT_ZOOM = 12;

// ─── Ikon DivIcon per Tipe Kerusakan ─────────────────────────────

const DAMAGE_SVG: Record<DamageType, string> = {
  BERLUBANG: `<circle cx="12" cy="12" r="4.5" stroke="rgba(255,255,255,0.9)" stroke-width="1.8" fill="rgba(0,0,0,0.25)"/>`,
  RETAK:     `<path d="M11 7l1.5 3-1.5 3 1.5 4" stroke="rgba(255,255,255,0.9)" stroke-width="1.8" stroke-linecap="round" fill="none"/>`,
  AMBLAS:    `<path d="M12 7v10M9 14l3 3 3-3" stroke="rgba(255,255,255,0.9)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  BANJIR:    `<path d="M7 15q2.5-4 5 0t5 0" stroke="rgba(255,255,255,0.9)" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M7 11q2.5-4 5 0t5 0" stroke="rgba(255,255,255,0.9)" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
  LONGSOR:   `<path d="M7 17l5-9 5 9H7z" stroke="rgba(255,255,255,0.9)" stroke-width="1.5" fill="rgba(255,255,255,0.15)"/>`,
  LAINNYA:   `<text x="12" y="16.5" text-anchor="middle" font-size="11" font-weight="700" font-family="system-ui,sans-serif" fill="rgba(255,255,255,0.95)">?</text>`,
};

function createMarkerIcon(severity: number, damageType: DamageType): L.DivIcon {
  const color = getSeverityMapColor(severity);
  return L.divIcon({
    className: '',
    html: `<div style="width:32px;height:32px;background:${color};border-radius:50%;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;cursor:pointer;"><svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${DAMAGE_SVG[damageType]}</svg></div>`,
    iconSize:    [32, 32],
    iconAnchor:  [16, 16],
    popupAnchor: [0, -22],
  });
}

const CLICK_ICON = L.divIcon({
  className: '',
  html: `<div style="width:24px;height:24px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 0 0 3px rgba(59,130,246,0.35);"></div>`,
  iconSize:   [24, 24],
  iconAnchor: [12, 12],
});

// ─── Inner Components (harus child dari MapContainer) ────────────

interface MapEventsProps {
  onBoundsChange: (bbox: BoundingBox) => void;
  onMapClick: (latlng: L.LatLng) => void;
  setLeafletMap: (map: L.Map) => void;
}

function MapEvents({ onBoundsChange, onMapClick, setLeafletMap }: MapEventsProps) {
  const map = useMapEvents({
    moveend: () => {
      const b = map.getBounds();
      onBoundsChange({
        swLat: b.getSouth(),
        swLng: b.getWest(),
        neLat: b.getNorth(),
        neLng: b.getEast(),
      });
    },
    click: (e) => {
      onMapClick(e.latlng);
    },
  });

  useEffect(() => {
    setLeafletMap(map);
  }, [map, setLeafletMap]);

  return null;
}

// ─── MapView (komponen utama) ─────────────────────────────────────

interface MapViewProps {
  readonly initialMarkers?: MapMarker[];
  readonly className?: string;
}

export default function MapView({ initialMarkers, className = 'h-full w-full' }: MapViewProps) {
  const [leafletMap, setLeafletMap] = useState<L.Map | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [clickLocation, setClickLocation] = useState<L.LatLng | null>(null);

  const { markers, isLoading, filters, updateFilters, updateBbox } = useMapData({
    initialBbox:    INITIAL_BBOX,
    initialMarkers,
  });

  // ─── Handler ──────────────────────────────────────────────────

  const handleMarkerClick = useCallback((marker: MapMarker) => {
    setSelectedMarker(marker);
    setClickLocation(null);
  }, []);

  const handleMapClick = useCallback((latlng: L.LatLng) => {
    if (selectedMarker) {
      setSelectedMarker(null);
    } else {
      setClickLocation(latlng);
    }
  }, [selectedMarker]);

  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation || !leafletMap) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        leafletMap.flyTo([pos.coords.latitude, pos.coords.longitude], 16, {
          animate: true,
          duration: 1.5,
        });
      },
      () => { /* permission denied atau error — abaikan */ },
    );
  }, [leafletMap]);

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className={`relative ${className}`}>

      {/* ── Filter overlay (kiri atas) ── */}
      <div className="absolute top-3 left-3 z-[1000]">
        <MapFilters
          filters={filters}
          onChange={updateFilters}
          count={markers.length}
        />
      </div>

      {/* ── Tombol geolokasi (kanan atas) ── */}
      <button
        onClick={handleGeolocate}
        title="Tampilkan lokasi saya"
        className="absolute top-3 right-3 z-[1000] bg-slate-900/95 border border-slate-700 rounded-xl p-2.5 shadow-lg hover:bg-slate-800 active:bg-slate-700 transition-colors"
      >
        <Crosshair className="h-5 w-5 text-slate-300" />
      </button>

      {/* ── Popup laporan (bawah tengah) ── */}
      {selectedMarker && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-80 max-w-[calc(100vw-24px)]">
          <ReportPopup
            marker={selectedMarker}
            onClose={() => setSelectedMarker(null)}
          />
        </div>
      )}

      {/* ── Bar "Laporkan di sini" (bawah tengah, muncul saat klik peta) ── */}
      {clickLocation && !selectedMarker && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] max-w-[calc(100vw-24px)]">
          <div className="flex items-center gap-2.5 bg-slate-900 rounded-2xl shadow-2xl px-4 py-3 border border-slate-700">
            <MapPin className="h-4 w-4 text-blue-400 shrink-0" />
            <code className="text-xs text-slate-400 font-mono">
              {clickLocation.lat.toFixed(5)}, {clickLocation.lng.toFixed(5)}
            </code>
            <Link
              href="/reports/new"
              className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            >
              Laporkan di sini
            </Link>
            <button
              onClick={() => setClickLocation(null)}
              className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Indikator loading (atas tengah) ── */}
      {isLoading && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/95 rounded-full px-4 py-2 shadow-lg flex items-center gap-2 backdrop-blur-sm border border-slate-700">
          <span className="h-3.5 w-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block" />
          <span className="text-xs text-slate-300 font-medium">Memuat marker...</span>
        </div>
      )}

      {/* ── Leaflet MapContainer ── */}
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        <ZoomControl position="bottomright" />

        <MapEvents
          onBoundsChange={updateBbox}
          onMapClick={handleMapClick}
          setLeafletMap={setLeafletMap}
        />

        <MarkerClusterGroup chunkedLoading>
          {markers.map((marker) => (
            <Marker
              key={marker.id}
              position={[marker.latitude, marker.longitude]}
              icon={createMarkerIcon(marker.severity, marker.damageType)}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  handleMarkerClick(marker);
                },
              }}
            />
          ))}
        </MarkerClusterGroup>

        {clickLocation && !selectedMarker && (
          <Marker
            position={[clickLocation.lat, clickLocation.lng]}
            icon={CLICK_ICON}
            interactive={false}
          />
        )}
      </MapContainer>
    </div>
  );
}
