'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { toast } from 'sonner';
import {
  AlertCircle, CheckCircle2, ChevronLeft,
  ExternalLink, Eye, EyeOff, Loader2, MapPin,
} from 'lucide-react';
import apiClient from '@/lib/axios';
import { useReportFormStore } from '@/store/reportFormStore';
import {
  cn, getDamageTypeLabel, getFormSeverityLabel, getSeverityMapColor,
} from '@/lib/utils';
import type { DamageType } from '@/types';
import type { LocationState, DamageState } from '@/store/reportFormStore';

// ─── Sub-components ──────────────────────────────────────────────────

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 py-2.5 border-b border-slate-700/50 last:border-0">
      <span className="text-xs text-slate-500 font-medium w-28 shrink-0 pt-0.5">
        {label}
      </span>
      <div className="text-sm text-slate-200 leading-snug">{children}</div>
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────

interface Props {
  readonly location: LocationState;
  readonly damage: DamageState;
  readonly photos: File[];
  readonly primaryPhotoIndex: number;
  readonly onBack: () => void;
  readonly onSuccess: () => void;
}

// ─── Component ───────────────────────────────────────────────────────

export default function ReportConfirm({
  location, damage, photos, primaryPhotoIndex, onBack, onSuccess,
}: Props) {
  const { setIsSubmitting, setUploadProgress } = useReportFormStore();

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{
    id: string;
    reportNumber: string;
  } | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [photos]);

  const canSubmit =
    location.latitude !== null &&
    location.longitude !== null &&
    location.address.trim().length >= 5 &&
    damage.damageType !== null &&
    damage.title.trim().length >= 5 &&
    damage.description.trim().length >= 10 &&
    photos.length > 0;

  async function handleSubmit() {
    if (!canSubmit) return;

    setIsLoading(true);
    setError(null);
    setIsSubmitting(true);
    setUploadProgress(0);
    setProgress(0);

    const fd = new FormData();
    fd.append('title',       damage.title.trim());
    fd.append('description', damage.description.trim());
    fd.append('latitude',    String(location.latitude));
    fd.append('longitude',   String(location.longitude));
    fd.append('address',     location.address.trim());
    if (location.roadName?.trim()) {
      fd.append('roadName', location.roadName.trim());
    }
    fd.append('damageType',  damage.damageType as DamageType);
    fd.append('severity',    String(damage.severity));
    fd.append('isAnonymous', String(damage.isAnonymous));

    // Foto primary harus di indeks 0 (backend: idx === 0 → isPrimary)
    const ordered = [...photos];
    if (primaryPhotoIndex > 0 && primaryPhotoIndex < ordered.length) {
      const [primary] = ordered.splice(primaryPhotoIndex, 1);
      ordered.unshift(primary);
    }
    ordered.forEach((photo) => fd.append('photos', photo));

    try {
      const res = await apiClient.post<{
        report: { id: string; reportNumber: string };
      }>('/reports', fd, {
        onUploadProgress: (evt) => {
          const pct = evt.total
            ? Math.round((evt.loaded * 100) / evt.total)
            : 0;
          setProgress(pct);
          setUploadProgress(pct);
        },
      });

      setSubmitted({
        id:           res.data.report.id,
        reportNumber: res.data.report.reportNumber,
      });
      setIsSubmitting(false);
      toast.success('Laporan berhasil dibuat', {
        description: `Nomor laporan: ${res.data.report.reportNumber}`,
      });
      onSuccess();
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? ((err.response?.data as { message?: string; error?: string })?.message ??
          (err.response?.data as { message?: string; error?: string })?.error ??
          'Gagal mengirim laporan. Silakan coba lagi.')
        : 'Gagal mengirim laporan. Silakan coba lagi.';
      setError(msg);
      toast.error('Laporan gagal dikirim', { description: msg });
      setIsSubmitting(false);
    } finally {
      setIsLoading(false);
    }
  }

  // ── Sukses ───────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="bg-slate-900 rounded-2xl border border-slate-700 p-8 text-center space-y-5">
        <div className="h-16 w-16 bg-green-500/15 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-9 w-9 text-green-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100">Laporan Terkirim!</h2>
          <p className="text-slate-400 text-sm mt-1">
            Laporan Anda akan diverifikasi oleh petugas kami
          </p>
        </div>
        <div className="bg-slate-800 rounded-xl px-4 py-3">
          <p className="text-xs text-slate-500 mb-1">Nomor Laporan</p>
          <p className="text-lg font-bold text-blue-400 tracking-wider font-mono">
            {submitted.reportNumber}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={`/reports/${submitted.id}`}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Lihat Laporan
          </Link>
          <Link
            href="/dashboard"
            className="flex-1 flex items-center justify-center border border-slate-700 text-slate-300 font-medium py-3 rounded-xl hover:bg-slate-800 transition-colors"
          >
            Ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ── Konfirmasi ────────────────────────────────────────────────────────

  const severityColor = getSeverityMapColor(damage.severity);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-slate-100">Konfirmasi Laporan</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Periksa kembali data sebelum mengirim
        </p>
      </div>

      {/* Kartu ringkasan */}
      <div className="bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden">

        {/* Foto preview mini */}
        {previews.length > 0 && (
          <div className="p-4 border-b border-slate-700/50">
            <p className="text-xs font-medium text-slate-500 mb-2.5">
              Foto ({photos.length})
            </p>
            <div className="flex gap-2">
              {previews.map((url, idx) => {
                const isPrimary = idx === primaryPhotoIndex;
                return (
                  <div
                    key={idx}
                    className={cn(
                      'relative shrink-0 h-16 w-16 rounded-xl overflow-hidden',
                      isPrimary
                        ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-slate-900'
                        : 'opacity-70',
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Foto ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                    {isPrimary && (
                      <div className="absolute inset-0 flex items-end justify-center pb-1">
                        <span className="text-[9px] font-bold text-white bg-blue-600 rounded px-1">
                          Utama
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Detail rows */}
        <div className="px-4 py-1">
          <SummaryRow label="Lokasi">
            <div className="flex items-start gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0 mt-0.5" />
              <span>{location.address}</span>
            </div>
            {location.roadName?.trim() && (
              <p className="text-xs text-slate-500 mt-1 ml-5">
                {location.roadName}
              </p>
            )}
          </SummaryRow>

          <SummaryRow label="Koordinat">
            <code className="text-xs font-mono text-slate-300">
              {location.latitude?.toFixed(6)},{' '}
              {location.longitude?.toFixed(6)}
            </code>
          </SummaryRow>

          <SummaryRow label="Jenis">
            {damage.damageType
              ? getDamageTypeLabel(damage.damageType)
              : '—'}
          </SummaryRow>

          <SummaryRow label="Keparahan">
            <span className="font-semibold" style={{ color: severityColor }}>
              {damage.severity} — {getFormSeverityLabel(damage.severity)}
            </span>
          </SummaryRow>

          <SummaryRow label="Judul">{damage.title}</SummaryRow>

          <SummaryRow label="Deskripsi">
            <span className="leading-relaxed">{damage.description}</span>
          </SummaryRow>

          <SummaryRow label="Identitas">
            <div className="flex items-center gap-1.5">
              {damage.isAnonymous ? (
                <>
                  <EyeOff className="h-3.5 w-3.5 text-slate-500" />
                  <span>Anonim</span>
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5 text-slate-500" />
                  <span>Nama ditampilkan</span>
                </>
              )}
            </div>
          </SummaryRow>
        </div>
      </div>

      {/* Peringatan validasi */}
      {!canSubmit && (
        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-300 space-y-1">
            {location.latitude === null && (
              <p>• Lokasi belum dipilih (kembali ke Langkah 1)</p>
            )}
            {damage.damageType === null && (
              <p>• Jenis kerusakan belum dipilih</p>
            )}
            {photos.length === 0 && (
              <p>• Minimal 1 foto harus dilampirkan</p>
            )}
          </div>
        </div>
      )}

      {/* Error API */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Progress upload */}
      {isLoading && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Mengirim laporan...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Tombol aksi */}
      <div className="flex gap-3 pb-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-5 py-3 rounded-xl border border-slate-700 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali
        </button>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!canSubmit || isLoading}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition-colors',
            canSubmit && !isLoading
              ? 'bg-blue-600 hover:bg-blue-500 text-white'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed',
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Mengirim...
            </>
          ) : (
            'Kirim Laporan'
          )}
        </button>
      </div>
    </div>
  );
}
