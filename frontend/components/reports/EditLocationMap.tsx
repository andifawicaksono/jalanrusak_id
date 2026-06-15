'use client';

import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { useCallback, useRef, useState } from 'react';
import { Crosshair, Loader2 } from 'lucide-react';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)['_getIconUrl'];
L.Icon.Default.mergeOptions({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export interface LocationData {
  lat:      number;
  lng:      number;
  address:  string;
  roadName: string;
}

interface Props {
  value:    LocationData;
  onChange: (data: LocationData) => void;
}

function MapClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onSelect(e.latlng.lat, e.latlng.lng) });
  return null;
}

export default function EditLocationMap({ value, onChange }: Props) {
  const mapRef       = useRef<L.Map | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geolocating, setGeolocating] = useState(false);

  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      setGeocoding(true);
      try {
        const res  = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          { headers: { 'Accept-Language': 'id' } },
        );
        const data = await res.json() as {
          display_name?: string;
          address?: { road?: string };
        };
        onChange({
          lat,
          lng,
          address:  data.display_name ?? value.address,
          roadName: data.address?.road ?? '',
        });
      } catch {
        onChange({ lat, lng, address: value.address, roadName: value.roadName });
      } finally {
        setGeocoding(false);
      }
    },
    [value, onChange],
  );

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      onChange({ ...value, lat, lng });
      void reverseGeocode(lat, lng);
    },
    [value, onChange, reverseGeocode],
  );

  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) return;
    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords;
        mapRef.current?.flyTo([lat, lng], 17, { animate: true, duration: 1 });
        void reverseGeocode(lat, lng);
        setGeolocating(false);
      },
      () => setGeolocating(false),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, [reverseGeocode]);

  return (
    <div className="space-y-3">
      <div className="relative h-56 rounded-xl overflow-hidden border border-slate-700">
        <MapContainer
          center={[value.lat, value.lng]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
          />
          <MapClickHandler onSelect={handleMapClick} />
          <Marker position={[value.lat, value.lng]} />
        </MapContainer>

        <button
          type="button"
          onClick={handleGeolocate}
          disabled={geolocating}
          className="absolute bottom-2 right-2 z-[1000] flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {geolocating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />}
          Lokasi Saya
        </button>

        {geocoding && (
          <div className="absolute inset-x-0 bottom-0 z-[999] bg-slate-900/80 text-xs text-slate-300 text-center py-1">
            Mendeteksi alamat...
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500">Klik pada peta untuk mengubah lokasi</p>

      <div className="space-y-2">
        <div>
          <label className="text-xs font-medium text-slate-400 block mb-1">Alamat *</label>
          <textarea
            rows={2}
            value={value.address}
            onChange={(e) => onChange({ ...value, address: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            placeholder="Alamat lengkap..."
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400 block mb-1">Nama Jalan</label>
          <input
            type="text"
            value={value.roadName}
            onChange={(e) => onChange({ ...value, roadName: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Nama jalan (opsional)"
          />
        </div>
      </div>
    </div>
  );
}
