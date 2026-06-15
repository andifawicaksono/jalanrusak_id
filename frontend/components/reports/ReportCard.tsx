'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Calendar, Trash2, AlertTriangle } from 'lucide-react';
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
}

// Severity bar: 1–5 → width % dan warna
function getSeverityBar(severity: number): { width: string; color: string } {
  const width = `${(severity / 5) * 100}%`;
  if (severity <= 2) return { width, color: 'bg-green-500' };
  if (severity === 3) return { width, color: 'bg-yellow-500' };
  if (severity === 4) return { width, color: 'bg-orange-500' };
  return { width, color: 'bg-red-500' };
}

export default function ReportCard({ report, showActions = true }: ReportCardProps) {
  const { user, isAdmin }  = useAuth();
  const { deleteReport }   = useReportStore();

  const canDelete  = showActions && (user?.id === report.userId || isAdmin);
  const firstPhoto = report.photos?.[0];
  const { width: severityWidth, color: severityColor } = getSeverityBar(report.severity);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm('Apakah Anda yakin ingin menghapus laporan ini?')) {
      await deleteReport(report.id);
    }
  };

  return (
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
              {/* gradient overlay bawah agar badge terbaca */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <MapPin className="h-10 w-10 text-slate-600" />
              <span className="text-xs text-slate-500">Tidak ada foto</span>
            </div>
          )}

          {/* Badge status */}
          <div className="absolute top-3 left-3 z-10">
            <span className={cn(
              'inline-flex items-center text-xs px-2.5 py-1 rounded-full font-semibold shadow-sm',
              getStatusColor(report.status),
            )}>
              {getStatusLabel(report.status)}
            </span>
          </div>

          {/* Badge jenis kerusakan */}
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

          {/* Lokasi & tanggal */}
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

          {/* Severity bar */}
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

          {/* Footer: hapus */}
          {canDelete && (
            <div className="pt-3 border-t border-slate-700/50 flex justify-end">
              <button
                onClick={handleDelete}
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
  );
}
