'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Calendar, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Report } from '@/types';
import {
  formatDate, getStatusLabel, getStatusColor,
  getSeverityLabel, getDamageTypeLabel, cn,
} from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useReportStore } from '@/store/reportStore';

interface ReportCardProps {
  readonly report: Report;
  readonly showActions?: boolean;
  readonly onDeleteSuccess?: () => void;
}

function getSeverityBar(severity: number): { width: string; color: string } {
  const width = `${(severity / 5) * 100}%`;
  if (severity <= 2) return { width, color: 'bg-green-500' };
  if (severity === 3) return { width, color: 'bg-yellow-500' };
  if (severity === 4) return { width, color: 'bg-orange-500' };
  return { width, color: 'bg-red-500' };
}

const DELETABLE_STATUSES = ['PENDING', 'REJECTED'] as const;

export default function ReportCard({ report, showActions = true, onDeleteSuccess }: ReportCardProps) {
  const { user } = useAuth();
  const { deleteReport } = useReportStore();

  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting]   = useState(false);

  const isAdmin         = user?.role === 'ADMIN';
  const isVerifier      = user?.role === 'VERIFIER';
  const isFieldVerifier = user?.role === 'FIELD_VERIFIER';
  const isOwner         = user?.id === report.userId;
  const ownerCanDelete  = isOwner && !isVerifier && !isFieldVerifier && DELETABLE_STATUSES.includes(report.status as typeof DELETABLE_STATUSES[number]);
  const canDelete       = showActions && (isAdmin || ownerCanDelete);

  const firstPhoto = report.photos?.[0];
  const { width: severityWidth, color: severityColor } = getSeverityBar(report.severity);

  const openConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(true);
  };

  const closeConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(false);
  };

  const confirmDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleting(true);
    try {
      await deleteReport(report.id);
      toast.success('Laporan berhasil dihapus.');
      setShowConfirm(false);
      onDeleteSuccess?.();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Gagal menghapus laporan. Silakan coba lagi.';
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Link href={`/reports/${report.id}`} className="block group">
        <article className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-700/70 hover:border-slate-600 hover:shadow-xl hover:shadow-slate-900/50 hover:-translate-y-1 transition-all duration-300">

          {/* ── Gambar ── */}
          <div className="relative h-48 bg-gradient-to-br from-slate-800 to-slate-700 overflow-hidden">
            {firstPhoto ? (
              <>
                <Image
                  src={firstPhoto.url}
                  alt={report.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <MapPin className="h-10 w-10 text-slate-600" />
                <span className="text-xs text-slate-500">Tidak ada foto</span>
              </div>
            )}

            <div className="absolute top-3 left-3 z-10">
              <span className={cn(
                'inline-flex items-center text-xs px-2.5 py-1 rounded-full font-semibold shadow-sm',
                getStatusColor(report.status),
              )}>
                {getStatusLabel(report.status)}
              </span>
            </div>

            <div className="absolute top-3 right-3 z-10">
              <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium bg-black/40 text-white backdrop-blur-sm">
                {getDamageTypeLabel(report.damageType)}
              </span>
            </div>
          </div>

          {/* ── Konten ── */}
          <div className="p-4">
            <h3 className="font-semibold text-slate-100 text-base mb-1 line-clamp-1 group-hover:text-blue-400 transition-colors">
              {report.title}
            </h3>
            <p className="text-sm text-slate-400 line-clamp-2 mb-3 leading-relaxed">
              {report.description ?? 'Tidak ada deskripsi.'}
            </p>

            <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
              <div className="flex items-center gap-1 min-w-0">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate max-w-[160px]">{report.address ?? '—'}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(report.createdAt)}</span>
              </div>
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Keparahan
                </span>
                <span className="font-medium text-slate-400">
                  {getSeverityLabel(report.severity)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${severityColor}`}
                  style={{ width: severityWidth }}
                />
              </div>
            </div>

            {canDelete && (
              <div className="pt-3 border-t border-slate-700/50 flex justify-end">
                <button
                  onClick={openConfirm}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors py-1 px-2 rounded-lg hover:bg-red-500/10"
                  title="Hapus laporan"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus
                </button>
              </div>
            )}
          </div>

        </article>
      </Link>

      {/* ── Konfirmasi Hapus ── */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={closeConfirm}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-red-500/15 border border-red-500/20 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="font-semibold text-slate-100 text-base">Hapus Laporan</h3>
            </div>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Apakah Anda yakin ingin menghapus laporan ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={closeConfirm}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
