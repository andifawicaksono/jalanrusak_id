'use client';

// CSS Leaflet — aman di-import karena komponen ini selalu di-load dengan ssr:false
import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { MapContainer, TileLayer, Marker, ZoomControl } from 'react-leaflet';
import { getSeverityMapColor } from '@/lib/utils';

// ─── Fix icon default Leaflet ─────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function createIcon(severity: number): L.DivIcon {
  const color = getSeverityMapColor(severity);
  return L.divIcon({
    className: '',
    html: `<div style="
      width:40px;height:40px;
      background:${color};
      border-radius:50%;
      border:3px solid white;
      box-shadow:0 0 0 5px ${color}35, 0 4px 14px rgba(0,0,0,0.45);
    "></div>`,
    iconSize:   [40, 40],
    iconAnchor: [20, 20],
  });
}

// ─── Props ────────────────────────────────────────────────────────

interface Props {
  readonly lat: number;
  readonly lng: number;
  readonly severity: number;
  readonly className?: string;
}

// ─── Component ────────────────────────────────────────────────────

export default function ReportDetailMap({ lat, lng, severity, className = '' }: Props) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={16}
      className={`${className} rounded-xl`}
      zoomControl={false}
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <ZoomControl position="bottomright" />
      <Marker position={[lat, lng]} icon={createIcon(severity)} />
    </MapContainer>
  );
}
