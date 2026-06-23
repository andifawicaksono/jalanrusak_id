'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import {
  AlertCircle, ArrowLeft, Calendar, CheckCircle2, Clock,
  Eye, MapPin, Pencil, Trash2, User, XCircle, Activity, Shield,
  AlertTriangle, ChevronRight, Upload, Loader2, Image as ImageIcon,
  PlayCircle, CheckSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/axios';
import { useAuth } from '@/hooks/useAuth';
import { useReportStore } from '@/store/reportStore';
import {
  cn, formatDateTime, getDamageTypeLabel, getFormSeverityLabel,
  getSeverityMapColor, getStatusLabel, getStatusColor,
} from '@/lib/utils';
import type { ReportDetail, ReportStatus } from '@/types';

// ─── Dynamic imports ──────────────────────────────────────────────

const ReportDetailMap = dynamic(
  () => import('@/components/map/ReportDetailMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full bg-slate-800 animate-pulse rounded-xl flex items-center justify-center">
        <p className="text-slate-500 text-sm">Memuat peta...</p>
      </div>
    ),
  },
);

// ─── Skeleton ─────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-72 sm:h-96 bg-slate-800 rounded-2xl" />
      <div className="flex gap-2">
        <div className="h-6 w-28 bg-slate-800 rounded-full" />
        <div className="h-6 w-24 bg-slate-800 rounded-full" />
      </div>
      <div className="h-8 bg-slate-800 rounded-xl w-3/4" />
      <div className="space-y-2">
        <div className="h-4 bg-slate-800 rounded w-full" />
        <div className="h-4 bg-slate-800 rounded w-5/6" />
        <div className="h-4 bg-slate-800 rounded w-4/6" />
      </div>
      <div className="h-48 bg-slate-800 rounded-xl" />
    </div>
  );
}

// ─── Status timeline config ───────────────────────────────────────

const STATUS_TIMELINE_CONFIG = {
  PENDING:     { Icon: Clock,        bg: 'bg-amber-500/20',  text: 'text-amber-400'  },
  VERIFIED:    { Icon: Shield,       bg: 'bg-blue-500/20',   text: 'text-blue-400'   },
  IN_PROGRESS: { Icon: Activity,     bg: 'bg-orange-500/20', text: 'text-orange-400' },
  RESOLVED:    { Icon: CheckCircle2, bg: 'bg-green-500/20',  text: 'text-green-400'  },
  REJECTED:    { Icon: XCircle,      bg: 'bg-red-500/20',    text: 'text-red-400'    },
} as const;

// ─── Progress Dialog ──────────────────────────────────────────────

interface ProgressDialogProps {
  readonly reportId:     string;
  readonly targetStatus: 'IN_PROGRESS' | 'RESOLVED';
  readonly onClose:      () => void;
  readonly onSuccess:    () => void;
}

function ProgressDialog({ reportId, targetStatus, onClose, onSuccess }: ProgressDialogProps) {
  const [files,      setFiles]      = useState<File[]>([]);
  const [previews,   setPreviews]   = useState<string[]>([]);
  const [notes,      setNotes]      = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isInProgress = targetStatus === 'IN_PROGRESS';
  const title = isInProgress ? 'Mulai Proses Perbaikan' : 'Selesaikan Laporan';
  const desc  = isInProgress
    ? 'Unggah foto kondisi awal pekerjaan sebagai bukti mulai pengerjaan.'
    : 'Unggah foto hasil pekerjaan yang sudah selesai sebagai bukti penyelesaian.';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []).slice(0, 5);
    setFiles(selected);
    setPreviews(selected.map((f) => URL.createObjectURL(f)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      toast.error('Minimal 1 foto bukti wajib diunggah.');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('status', targetStatus);
      if (notes.trim()) fd.append('notes', notes.trim());
      files.forEach((f) => fd.append('photos', f));

      await apiClient.post(`/reports/${reportId}/progress`, fd);
      toast.success(
        isInProgress
          ? 'Status laporan diperbarui ke Sedang Diproses.'
          : 'Laporan berhasil diselesaikan.',
      );
      onSuccess();
      onClose();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Gagal memperbarui status. Silakan coba lagi.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800">
          <div className={cn(
            'h-9 w-9 rounded-full flex items-center justify-center shrink-0',
            isInProgress ? 'bg-orange-500/15' : 'bg-green-500/15',
          )}>
            {isInProgress
              ? <PlayCircle className="h-5 w-5 text-orange-400" />
              : <CheckSquare className="h-5 w-5 text-green-400" />}
          </div>
          <div>
            <h2 className="font-semibold text-slate-100 text-base">{title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Photo upload */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Foto Bukti <span className="text-red-400">*</span>
              <span className="text-slate-500 font-normal ml-1">(maks. 5 foto)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            {previews.length === 0 ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-2 h-32 rounded-xl border-2 border-dashed border-slate-700 hover:border-slate-500 hover:bg-slate-800/50 transition-colors text-slate-500 hover:text-slate-400"
              >
                <Upload className="h-7 w-7" />
                <span className="text-sm">Klik untuk memilih foto</span>
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {previews.map((src, idx) => (
                    <div key={idx} className="relative h-20 w-20 rounded-xl overflow-hidden border border-slate-700">
                      <Image src={src} alt={`Preview ${idx + 1}`} fill className="object-cover" />
                    </div>
                  ))}
                  {previews.length < 5 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-20 w-20 rounded-xl border-2 border-dashed border-slate-700 hover:border-slate-500 flex items-center justify-center text-slate-600 hover:text-slate-400 transition-colors"
                    >
                      <ImageIcon className="h-6 w-6" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500">{previews.length} foto dipilih</p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Catatan Progress <span className="text-slate-500 font-normal">(opsional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Jelaskan kondisi atau perkembangan pekerjaan..."
              className="w-full bg-slate-800/60 border border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || files.length === 0}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                isInProgress
                  ? 'bg-orange-600 hover:bg-orange-500'
                  : 'bg-green-600 hover:bg-green-500',
              )}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Menyimpan...' : isInProgress ? 'Mulai Proses' : 'Selesaikan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

export default function ReportDetailPage() {
  const params  = useParams<{ id: string }>();
  const router  = useRouter();
  const { user, isAdmin, canManageProgress } = useAuth();
  const { deleteReport } = useReportStore();

  const [report,       setReport]       = useState<ReportDetail | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [notFound,     setNotFound]     = useState(false);
  const [activeIdx,    setActiveIdx]    = useState(0);
  const [deleting,     setDeleting]     = useState(false);
  const [progressFor,  setProgressFor]  = useState<'IN_PROGRESS' | 'RESOLVED' | null>(null);

  const fetchReport = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    try {
      const res = await apiClient.get<{ report: ReportDetail }>(`/reports/${params.id}`);
      setReport(res.data.report);
      const primaryIdx = res.data.report.photos.findIndex((p) => p.isPrimary);
      setActiveIdx(primaryIdx >= 0 ? primaryIdx : 0);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status === 404) setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { void fetchReport(); }, [fetchReport]);

  // Delete authorization: ADMIN always, PUBLIC only for PENDING/REJECTED
  const isOwner     = !!(user && report && user.id === report.userId);
  const canDelete   = !!(user && report && (
    isAdmin ||
    (isOwner && user.role !== 'VERIFIER' && user.role !== 'FIELD_VERIFIER' &&
      (report.status === 'PENDING' || report.status === 'REJECTED'))
  ));
  const canEdit     = !!(user && report && (isOwner || isAdmin) &&
    report.status !== 'VERIFIED' && report.status !== 'RESOLVED');

  // Progress buttons
  const canStartProgress = canManageProgress && report?.status === 'VERIFIED';
  const canResolve       = canManageProgress && report?.status === 'IN_PROGRESS';

  async function handleDelete() {
    if (!report) return;
    setDeleting(true);
    try {
      await deleteReport(report.id);
      toast.success('Laporan berhasil dihapus.');
      router.push('/reports');
    } catch {
      toast.error('Gagal menghapus laporan.');
      setDeleting(false);
    }
  }

  // Filter status history to progress entries with proof photos
  const progressHistory = (report?.statusHistory ?? [])
    .filter((e) => e.newStatus === 'IN_PROGRESS' || e.newStatus === 'RESOLVED')
    .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());

  const chronHistory = [...(report?.statusHistory ?? [])].reverse();

  // ── Not found ────────────────────────────────────────────────────
  if (!loading && notFound) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center gap-4">
        <div className="h-16 w-16 bg-red-500/15 rounded-2xl flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-100">Laporan tidak ditemukan</h1>
          <p className="text-slate-500 text-sm mt-1">
            Laporan ini mungkin sudah dihapus atau ID tidak valid.
          </p>
        </div>
        <Link
          href="/reports"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Daftar
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="h-5 w-24 bg-slate-800 rounded mb-5 animate-pulse" />
        <DetailSkeleton />
      </div>
    );
  }

  if (!report) return null;

  const activePhoto   = report.photos[activeIdx];
  const severityColor = getSeverityMapColor(report.severity);

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </button>
          <span className="text-xs font-mono text-slate-500 tracking-wider">
            {report.reportNumber}
          </span>
        </div>

        {/* ── Photo gallery ── */}
        {report.photos.length > 0 && (
          <div className="space-y-2">
            <div className="relative h-72 sm:h-96 rounded-2xl overflow-hidden bg-slate-800">
              <Image
                src={activePhoto?.url ?? report.photos[0].url}
                alt={report.title}
                fill
                className="object-cover"
                sizes="(max-width: 896px) 100vw, 896px"
                priority
              />
              {report.photos.length > 1 && (
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full">
                  {activeIdx + 1} / {report.photos.length}
                </div>
              )}
            </div>
            {report.photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {report.photos.map((photo, idx) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setActiveIdx(idx)}
                    className={cn(
                      'relative shrink-0 h-16 w-16 rounded-xl overflow-hidden transition-all',
                      idx === activeIdx
                        ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-950 opacity-100'
                        : 'opacity-50 hover:opacity-80',
                    )}
                  >
                    <Image src={photo.url} alt={`Foto ${idx + 1}`} fill className="object-cover" sizes="64px" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Badges ── */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('inline-flex items-center text-xs px-3 py-1 rounded-full font-semibold', getStatusColor(report.status))}>
            {getStatusLabel(report.status)}
          </span>
          <span className="inline-flex items-center text-xs px-3 py-1 rounded-full font-medium bg-slate-800 text-slate-300 border border-slate-700">
            {getDamageTypeLabel(report.damageType)}
          </span>
          <span
            className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-semibold"
            style={{ color: severityColor, backgroundColor: `${severityColor}20` }}
          >
            <AlertTriangle className="h-3 w-3" />
            {getFormSeverityLabel(report.severity)}
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-500 ml-auto">
            <Eye className="h-3.5 w-3.5" />
            {report.viewsCount} dilihat
          </span>
        </div>

        {/* ── Title + description ── */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 leading-tight">
            {report.title}
          </h1>
          <p className="text-slate-400 leading-relaxed text-sm sm:text-base">
            {report.description}
          </p>
        </div>

        {/* ── Info grid + map ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800 overflow-hidden">
            <div className="flex items-start gap-3 px-4 py-3.5">
              <div className="h-8 w-8 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="h-4 w-4 text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 font-medium mb-0.5">Lokasi</p>
                <p className="text-sm text-slate-200 leading-snug">{report.address}</p>
                {report.roadName && <p className="text-xs text-slate-500 mt-0.5">{report.roadName}</p>}
                <p className="text-xs font-mono text-slate-600 mt-1">
                  {report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="h-8 w-8 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-0.5">Dilaporkan</p>
                <p className="text-sm text-slate-200">{formatDateTime(report.reportedAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="h-8 w-8 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-slate-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-0.5">Pelapor</p>
                {report.isAnonymous
                  ? <p className="text-sm text-slate-400 italic">Anonim</p>
                  : <p className="text-sm text-slate-200">{report.user?.name ?? '—'}</p>}
              </div>
            </div>
            {report.region && (
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="h-8 w-8 rounded-lg bg-teal-500/15 flex items-center justify-center shrink-0">
                  <Shield className="h-4 w-4 text-teal-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-0.5">Wilayah</p>
                  <p className="text-sm text-slate-200">
                    {report.region.name}
                    <span className="text-slate-500 ml-1 text-xs">({report.region.level})</span>
                  </p>
                </div>
              </div>
            )}
            <div className="px-4 py-3.5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500 font-medium">Tingkat Keparahan</p>
                <span className="text-xs font-semibold" style={{ color: severityColor }}>
                  {report.severity}/5 — {getFormSeverityLabel(report.severity)}
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(report.severity / 5) * 100}%`, backgroundColor: severityColor }}
                />
              </div>
            </div>
          </div>
          <div className="h-64 lg:h-auto min-h-64 rounded-2xl overflow-hidden border border-slate-800">
            <ReportDetailMap
              lat={report.latitude}
              lng={report.longitude}
              severity={report.severity}
              className="h-full w-full"
            />
          </div>
        </div>

        {/* ── Progress Penanganan ── */}
        {(canManageProgress || progressHistory.length > 0) && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Activity className="h-4 w-4 text-orange-400" />
                Progress Penanganan
              </h2>
              {/* Action buttons */}
              <div className="flex gap-2">
                {canStartProgress && (
                  <button
                    type="button"
                    onClick={() => setProgressFor('IN_PROGRESS')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 text-orange-400 rounded-lg transition-colors"
                  >
                    <PlayCircle className="h-3.5 w-3.5" />
                    Mulai Proses
                  </button>
                )}
                {canResolve && (
                  <button
                    type="button"
                    onClick={() => setProgressFor('RESOLVED')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 text-green-400 rounded-lg transition-colors"
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                    Selesaikan
                  </button>
                )}
              </div>
            </div>

            {progressHistory.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <Activity className="h-8 w-8 text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Belum ada progress pekerjaan lapangan.</p>
                {canStartProgress && (
                  <p className="text-xs text-slate-600 mt-1">
                    Klik "Mulai Proses" untuk memulai penanganan laporan ini.
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {progressHistory.map((entry) => {
                  const cfg = STATUS_TIMELINE_CONFIG[entry.newStatus as keyof typeof STATUS_TIMELINE_CONFIG];
                  return (
                    <div key={entry.id} className="px-5 py-4 space-y-3">
                      {/* Header: status + user + date */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold',
                            getStatusColor(entry.newStatus),
                          )}>
                            {cfg && <cfg.Icon className="h-3 w-3" />}
                            {getStatusLabel(entry.newStatus)}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-medium text-slate-300">{entry.user?.name ?? 'Petugas'}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(entry.changedAt)}</p>
                        </div>
                      </div>
                      {/* Notes */}
                      {entry.notes && (
                        <p className="text-xs text-slate-400 bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50 leading-relaxed">
                          {entry.notes}
                        </p>
                      )}
                      {/* Proof photos */}
                      {entry.proofPhotos.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {entry.proofPhotos.map((photo) => (
                            <div key={photo.id} className="relative shrink-0 h-24 w-24 rounded-xl overflow-hidden border border-slate-700">
                              <Image src={photo.url} alt="Foto bukti" fill className="object-cover" sizes="96px" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Status Timeline ── */}
        {chronHistory.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-slate-300 mb-4">Riwayat Status</h2>
            <div className="space-y-0">
              {chronHistory.map((entry, idx) => {
                const cfg    = STATUS_TIMELINE_CONFIG[entry.newStatus as keyof typeof STATUS_TIMELINE_CONFIG];
                const isLast = idx === chronHistory.length - 1;
                const Icon   = cfg?.Icon ?? Clock;
                return (
                  <div key={entry.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={cn('h-7 w-7 rounded-full flex items-center justify-center shrink-0', cfg?.bg ?? 'bg-slate-700')}>
                        <Icon className={cn('h-3.5 w-3.5', cfg?.text ?? 'text-slate-400')} />
                      </div>
                      {!isLast && <div className="w-0.5 flex-1 bg-slate-800 my-1" />}
                    </div>
                    <div className={cn('pb-4', isLast && 'pb-0')}>
                      <div className="flex items-center gap-2 flex-wrap">
                        {entry.oldStatus && (
                          <>
                            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', getStatusColor(entry.oldStatus))}>
                              {getStatusLabel(entry.oldStatus)}
                            </span>
                            <ChevronRight className="h-3 w-3 text-slate-600" />
                          </>
                        )}
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold', getStatusColor(entry.newStatus))}>
                          {getStatusLabel(entry.newStatus)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {entry.user?.name ?? 'Sistem'} · {formatDateTime(entry.changedAt)}
                      </p>
                      {entry.notes && (
                        <p className="text-xs text-slate-400 mt-1.5 bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="flex items-center gap-3 pt-2 pb-6 border-t border-slate-800">
          <Link
            href="/map"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <MapPin className="h-4 w-4" />
            Lihat di Peta
          </Link>
          <div className="ml-auto flex items-center gap-2">
            {canEdit && (
              <Link
                href={`/reports/${report.id}/edit`}
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 border border-blue-500/20 hover:bg-blue-500/10 px-4 py-2 rounded-xl transition-colors"
              >
                <Pencil className="h-4 w-4" />
                Edit Laporan
              </Link>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 border border-red-500/20 hover:bg-red-500/10 px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? 'Menghapus...' : 'Hapus Laporan'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Progress Dialog ── */}
      {progressFor && (
        <ProgressDialog
          reportId={report.id}
          targetStatus={progressFor}
          onClose={() => setProgressFor(null)}
          onSuccess={fetchReport}
        />
      )}
    </>
  );
}
