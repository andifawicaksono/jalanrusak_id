'use client';

// CSS di-import di sini karena komponen ini SELALU di-load dengan ssr:false
import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCallback, useRef, useState } from 'react';
import { Crosshair, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

// Fix Leaflet default icon (webpack menghapus URL internal)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Schema ─────────────────────────────────────────────────────────

const locationSchema = z.object({
  latitude:  z.number({ required_error: 'Pilih lokasi di peta' }),
  longitude: z.number({ required_error: 'Pilih lokasi di peta' }),
  address:   z.string().min(5, 'Alamat minimal 5 karakter').trim(),
  roadName:  z.string().trim().optional().default(''),
});

export type LocationFormData = z.infer<typeof locationSchema>;

// ─── Inner Components ────────────────────────────────────────────────

function MapClickHandler({
  onSelect,
}: {
  onSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => onSelect(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

// ─── Props ───────────────────────────────────────────────────────────

interface Props {
  defaultValues: {
    latitude: number | null;
    longitude: number | null;
    address: string;
    roadName: string;
  };
  onNext: (data: LocationFormData) => void;
}

// ─── Component ───────────────────────────────────────────────────────

export default function LocationPicker({ defaultValues, onNext }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      latitude:  defaultValues.latitude  ?? undefined,
      longitude: defaultValues.longitude ?? undefined,
      address:   defaultValues.address,
      roadName:  defaultValues.roadName,
    },
  });

  const lat = watch('latitude');
  const lng = watch('longitude');

  const reverseGeocode = useCallback(
    async (latitude: number, longitude: number) => {
      setIsGeocoding(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
          { headers: { 'Accept-Language': 'id' } },
        );
        const data = await res.json() as {
          display_name?: string;
          address?: { road?: string };
        };
        if (data.display_name) {
          setValue('address', data.display_name, { shouldValidate: true });
        }
        if (data.address?.road) {
          setValue('roadName', data.address.road);
        }
      } catch {
        // Biarkan user isi manual jika geocoding gagal
      } finally {
        setIsGeocoding(false);
      }
    },
    [setValue],
  );

  const handleLocationSelect = useCallback(
    (latitude: number, longitude: number) => {
      setValue('latitude',  latitude,  { shouldValidate: true });
      setValue('longitude', longitude, { shouldValidate: true });
      void reverseGeocode(latitude, longitude);
    },
    [setValue, reverseGeocode],
  );

  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) return;
    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        handleLocationSelect(coords.latitude, coords.longitude);
        mapRef.current?.flyTo([coords.latitude, coords.longitude], 17, {
          animate: true,
          duration: 1,
        });
        setIsGeolocating(false);
      },
      () => setIsGeolocating(false),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, [handleLocationSelect]);

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      {/* Peta */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">
          Lokasi Kerusakan *
        </label>
        <p className="text-xs text-slate-500">
          Klik peta atau gunakan tombol GPS untuk menentukan lokasi
        </p>

        {(errors.latitude ?? errors.longitude) && (
          <p className="text-sm text-red-400 font-medium">
            Pilih lokasi di peta terlebih dahulu
          </p>
        )}

        <div className="relative h-72 rounded-2xl overflow-hidden border border-slate-700">
          <MapContainer
            center={lat && lng ? [lat, lng] : [-6.2088, 106.8456]}
            zoom={lat && lng ? 16 : 12}
            className="h-full w-full"
            // react-leaflet 4 menerima callback ref untuk capture map instance
            ref={(map: L.Map | null) => { mapRef.current = map; }}
            zoomControl
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            <MapClickHandler onSelect={handleLocationSelect} />
            {lat !== undefined && lng !== undefined && lat !== null && lng !== null && (
              <Marker position={[lat, lng]} />
            )}
          </MapContainer>

          {/* Tombol GPS — absolute di atas peta */}
          <button
            type="button"
            onClick={handleGeolocate}
            disabled={isGeolocating}
            title="Gunakan lokasi saya"
            className="absolute top-3 right-3 z-[1000] bg-slate-900/95 border border-slate-700 rounded-xl p-2.5 shadow-lg hover:bg-slate-800 disabled:opacity-70 transition-colors"
          >
            {isGeolocating ? (
              <span className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block" />
            ) : (
              <Crosshair className="h-5 w-5 text-slate-300" />
            )}
          </button>
        </div>

        {/* Koordinat */}
        {lat && lng && (
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/50 rounded-xl px-3 py-2 border border-slate-700/50">
            <MapPin className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <code className="font-mono">{lat.toFixed(6)}, {lng.toFixed(6)}</code>
            {isGeocoding && (
              <span className="ml-1 text-blue-500">Mencari alamat...</span>
            )}
          </div>
        )}
      </div>

      {/* Alamat */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-300">
          Alamat / Deskripsi Lokasi *
        </label>
        <textarea
          {...register('address')}
          rows={3}
          placeholder="Contoh: Jl. Gatot Subroto, depan RSUD Kab. X, Kecamatan Y..."
          className={cn(
            'w-full px-3 py-2.5 rounded-xl border text-sm resize-none',
            'bg-slate-800/60 text-slate-100 placeholder:text-slate-500',
            'focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-0',
            errors.address ? 'border-red-500' : 'border-slate-700',
          )}
        />
        {errors.address && (
          <p className="text-xs text-red-400">{errors.address.message}</p>
        )}
      </div>

      {/* Nama Jalan (opsional) */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-300">
          Nama Jalan{' '}
          <span className="font-normal text-slate-500">(opsional)</span>
        </label>
        <input
          {...register('roadName')}
          type="text"
          placeholder="Contoh: Jl. Gatot Subroto"
          className="w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-0"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        Lanjutkan ke Detail Kerusakan →
      </button>
    </form>
  );
}
