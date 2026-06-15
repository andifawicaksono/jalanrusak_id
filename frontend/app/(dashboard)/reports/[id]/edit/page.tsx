'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import {
  AlertCircle, AlertTriangle, ArrowLeft, CheckCircle,
  ChevronsDown, Droplets, HelpCircle, ImagePlus, Loader2,
  Triangle, X, Zap,
} from 'lucide-react';
import apiClient from '@/lib/axios';
import { cn } from '@/lib/utils';
import type { DamageType, ReportDetail, ReportPhoto } from '@/types';
import type { LocationData } from '@/components/reports/EditLocationMap';

// ─── Dynamic import (Leaflet requires window) ──────────────────────

const EditLocationMap = dynamic(
  () => import('@/components/reports/EditLocationMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-56 bg-slate-800 rounded-xl animate-pulse flex items-center justify-center">
        <p className="text-sm text-slate-500">Memuat peta...</p>
      </div>
    ),
  },
);

// ─── Damage type config ───────────────────────────────────────────

const DAMAGE_TYPES: {
  value: DamageType;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: 'BERLUBANG', label: 'Berlubang',  Icon: AlertCircle  },
  { value: 'RETAK',     label: 'Retak',      Icon: Zap          },
  { value: 'AMBLAS',    label: 'Amblas',     Icon: ChevronsDown },
  { value: 'BANJIR',    label: 'Tergenang',  Icon: Droplets     },
  { value: 'LONGSOR',   label: 'Longsor',    Icon: Triangle     },
  { value: 'LAINNYA',   label: 'Lainnya',    Icon: HelpCircle   },
];

const SEVERITY_CONFIG = [
  { value: 1, label: 'Ringan',  hex: '#22c55e' },
  { value: 2, label: 'Sedang',  hex: '#84cc16' },
  { value: 3, label: 'Parah',   hex: '#eab308' },
  { value: 4, label: 'Kritis',  hex: '#f97316' },
  { value: 5, label: 'Darurat', hex: '#ef4444' },
];

// ─── Page ─────────────────────────────────────────────────────────

export default function EditReportPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  // ── Form state ──────────────────────────────────────────────────
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [damageType,  setDamageType]  = useState<DamageType>('BERLUBANG');
  const [severity,    setSeverity]    = useState(3);
  const [location,    setLocation]    = useState<LocationData>({
    lat: -6.2, lng: 106.8, address: '', roadName: '',
  });

  // ── Photo state ─────────────────────────────────────────────────
  const [existingPhotos, setExistingPhotos] = useState<ReportPhoto[]>([]);
  const [keepPhotoIds,   setKeepPhotoIds]   = useState<string[]>([]);
  const [newPhotos,      setNewPhotos]      = useState<File[]>([]);
  const [newPhotoUrls,   setNewPhotoUrls]   = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Page state ──────────────────────────────────────────────────
  const [loading,    setLoading]    = useState(true);
  const [notFound,   setNotFound]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors,     setErrors]     = useState<Record<string, string>>({});

  // ── Load report ─────────────────────────────────────────────────
  const loadReport = useCallback(async () => {
    if (!params.id) return;
    try {
      const res    = await apiClient.get<{ report: ReportDetail }>(`/reports/${params.id}`);
      const report = res.data.report;

      setTitle(report.title);
      setDescription(report.description);
      setDamageType(report.damageType);
      setSeverity(report.severity);
      setLocation({
        lat:      report.latitude,
        lng:      report.longitude,
        address:  report.address,
        roadName: report.roadName ?? '',
      });
      setExistingPhotos(report.photos);
      setKeepPhotoIds(report.photos.map((p) => p.id));
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status === 404) setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { void loadReport(); }, [loadReport]);

  // Revoke object URLs on unmount
  useEffect(() => {
    return () => { newPhotoUrls.forEach((url) => URL.revokeObjectURL(url)); };
  }, [newPhotoUrls]);

  // ── Photo handlers ──────────────────────────────────────────────

  function removeExistingPhoto(id: string) {
    setKeepPhotoIds((prev) => prev.filter((pid) => pid !== id));
  }

  function restoreExistingPhoto(id: string) {
    setKeepPhotoIds((prev) => [...prev, id]);
  }

  function addNewPhotos(files: FileList | null) {
    if (!files) return;
    const total = keepPhotoIds.length + newPhotos.length + files.length;
    if (total > 5) {
      setErrors((e) => ({ ...e, photos: 'Maksimal 5 foto' }));
      return;
    }
    const arr = Array.from(files);
    setNewPhotos((prev) => [...prev, ...arr]);
    setNewPhotoUrls((prev) => [...prev, ...arr.map((f) => URL.createObjectURL(f))]);
    setErrors((e) => { const n = { ...e }; delete n['photos']; return n; });
  }

  function removeNewPhoto(idx: number) {
    URL.revokeObjectURL(newPhotoUrls[idx]);
    setNewPhotos((prev) => prev.filter((_, i) => i !== idx));
    setNewPhotoUrls((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── Validation ──────────────────────────────────────────────────

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (title.trim().length < 5)       errs['title']   = 'Judul minimal 5 karakter';
    if (description.trim().length < 10) errs['desc']   = 'Deskripsi minimal 10 karakter';
    if (!location.address.trim())       errs['address'] = 'Alamat wajib diisi';
    if (keepPhotoIds.length + newPhotos.length === 0) {
      errs['photos'] = 'Minimal 1 foto harus ada';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Submit ──────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const fd = new FormData();
    fd.append('title',       title.trim());
    fd.append('description', description.trim());
    fd.append('latitude',    String(location.lat));
    fd.append('longitude',   String(location.lng));
    fd.append('address',     location.address.trim());
    if (location.roadName.trim()) fd.append('roadName', location.roadName.trim());
    fd.append('damageType', damageType);
    fd.append('severity',   String(severity));
    keepPhotoIds.forEach((id) => fd.append('keepPhotoIds', id));
    newPhotos.forEach((f) => fd.append('photos', f));

    setSubmitting(true);
    try {
      await apiClient.patch(`/reports/${params.id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      router.push(`/reports/${params.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      setErrors((e) => ({ ...e, submit: msg ?? 'Gagal menyimpan perubahan' }));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render states ────────────────────────────────────────────────

  if (!loading && notFound) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center gap-4">
        <div className="h-16 w-16 bg-red-500/15 rounded-2xl flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
        <p className="text-slate-400">Laporan tidak ditemukan.</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          Kembali
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4 animate-pulse">
        <div className="h-5 w-20 bg-slate-800 rounded" />
        <div className="h-8 w-48 bg-slate-800 rounded" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-slate-800 rounded-xl" />
        ))}
      </div>
    );
  }

  const totalPhotos = keepPhotoIds.length + newPhotos.length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-16">

      {/* Header */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>
        <h1 className="text-2xl font-bold text-slate-100">Edit Laporan</h1>
        <p className="text-sm text-slate-500 mt-1">Perbarui informasi kerusakan jalan</p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">

        {/* ── Judul ── */}
        <div>
          <label className="text-sm font-medium text-slate-300 block mb-1.5">
            Judul Laporan *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={cn(
              'w-full bg-slate-900 border rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors',
              errors['title'] ? 'border-red-500' : 'border-slate-700',
            )}
            placeholder="Contoh: Jalan berlubang besar di depan pasar..."
          />
          {errors['title'] && <p className="text-xs text-red-400 mt-1">{errors['title']}</p>}
        </div>

        {/* ── Deskripsi ── */}
        <div>
          <label className="text-sm font-medium text-slate-300 block mb-1.5">
            Deskripsi Kerusakan *
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={cn(
              'w-full bg-slate-900 border rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors resize-none',
              errors['desc'] ? 'border-red-500' : 'border-slate-700',
            )}
            placeholder="Deskripsikan kondisi kerusakan secara detail..."
          />
          {errors['desc'] && <p className="text-xs text-red-400 mt-1">{errors['desc']}</p>}
        </div>

        {/* ── Lokasi ── */}
        <div>
          <p className="text-sm font-medium text-slate-300 mb-2">Lokasi *</p>
          <EditLocationMap value={location} onChange={setLocation} />
          {errors['address'] && <p className="text-xs text-red-400 mt-1">{errors['address']}</p>}
        </div>

        {/* ── Jenis Kerusakan ── */}
        <div>
          <p className="text-sm font-medium text-slate-300 mb-2">Jenis Kerusakan *</p>
          <div className="grid grid-cols-3 gap-2">
            {DAMAGE_TYPES.map(({ value, label, Icon }) => {
              const active = damageType === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDamageType(value)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all',
                    active
                      ? 'border-blue-500 bg-blue-500/15 text-blue-300'
                      : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600',
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                  {active && <CheckCircle className="h-3 w-3 text-blue-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Tingkat Keparahan ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="severity-range" className="text-sm font-medium text-slate-300">
              Tingkat Keparahan *
            </label>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{
                color:           SEVERITY_CONFIG[severity - 1]?.hex,
                backgroundColor: `${SEVERITY_CONFIG[severity - 1]?.hex}20`,
              }}
            >
              {severity} — {SEVERITY_CONFIG[severity - 1]?.label}
            </span>
          </div>
          <input
            id="severity-range"
            type="range"
            min={1} max={5} step={1}
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            style={{ accentColor: SEVERITY_CONFIG[severity - 1]?.hex }}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[11px] px-0.5">
            {SEVERITY_CONFIG.map((s) => (
              <span
                key={s.value}
                style={{ color: severity === s.value ? s.hex : '#475569' }}
                className="font-medium transition-colors"
              >
                {s.label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Foto ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-300">Foto Laporan *</p>
            <span className="text-xs text-slate-500">{totalPhotos}/5 foto</span>
          </div>

          {errors['photos'] && <p className="text-xs text-red-400 mb-2">{errors['photos']}</p>}

          <div className="grid grid-cols-3 gap-2">
            {/* Existing photos */}
            {existingPhotos.map((photo) => {
              const kept = keepPhotoIds.includes(photo.id);
              return (
                <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden border border-slate-700">
                  <Image
                    src={photo.url}
                    alt="Foto laporan"
                    fill
                    className={cn('object-cover transition-opacity', !kept && 'opacity-30')}
                    sizes="200px"
                    unoptimized={photo.url.startsWith('http')}
                  />
                  <button
                    type="button"
                    onClick={() => kept ? removeExistingPhoto(photo.id) : restoreExistingPhoto(photo.id)}
                    className={cn(
                      'absolute top-1.5 right-1.5 h-6 w-6 rounded-full flex items-center justify-center transition-colors',
                      kept
                        ? 'bg-red-500/80 hover:bg-red-500 text-white'
                        : 'bg-green-500/80 hover:bg-green-500 text-white',
                    )}
                  >
                    {kept ? <X className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                  </button>
                  {!kept && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded">Dihapus</span>
                    </div>
                  )}
                  {photo.isPrimary && kept && (
                    <span className="absolute bottom-1.5 left-1.5 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-medium">
                      Utama
                    </span>
                  )}
                </div>
              );
            })}

            {/* New photos */}
            {newPhotoUrls.map((url, idx) => (
              <div key={url} className="relative aspect-square rounded-xl overflow-hidden border border-slate-700">
                <Image src={url} alt="Foto baru" fill className="object-cover" sizes="200px" />
                <button
                  type="button"
                  onClick={() => removeNewPhoto(idx)}
                  className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <span className="absolute bottom-1.5 left-1.5 text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded font-medium">
                  Baru
                </span>
              </div>
            ))}

            {/* Add photo button */}
            {totalPhotos < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-slate-700 hover:border-blue-500/50 hover:bg-blue-500/5 flex flex-col items-center justify-center gap-1.5 text-slate-500 hover:text-blue-400 transition-all"
              >
                <ImagePlus className="h-6 w-6" />
                <span className="text-xs">Tambah</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => addNewPhotos(e.target.files)}
          />
        </div>

        {/* ── Submit error ── */}
        {errors['submit'] && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
            <p className="text-sm text-red-400">{errors['submit']}</p>
          </div>
        )}

        {/* ── Buttons ── */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3 rounded-xl border border-slate-700 text-sm text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              'Simpan Perubahan'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
