'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Calendar, Trash2 } from 'lucide-react';
import { Report } from '@/types';
import { formatDate, getStatusLabel, getStatusColor, getSeverityLabel, getSeverityColor, cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useReportStore } from '@/store/reportStore';

interface ReportCardProps {
  report: Report;
  /** Tampilkan tombol hapus jika true (default: false) */
  showActions?: boolean;
}

/**
 * Kartu ringkasan laporan yang ditampilkan di daftar.
 * Menampilkan foto pertama, status, severity, lokasi, dan tanggal.
 */
export default function ReportCard({ report, showActions = true }: ReportCardProps) {
  const { user, isAdmin } = useAuth();
  const { deleteReport } = useReportStore();

  // Tampilkan tombol hapus hanya untuk pemilik laporan atau admin
  const canDelete = showActions && (user?.id === report.userId || isAdmin);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault(); // Cegah navigasi ke detail laporan
    if (confirm('Apakah Anda yakin ingin menghapus laporan ini?')) {
      await deleteReport(report.id);
    }
  };

  const firstPhoto = report.photos?.[0];

  return (
    <Link href={`/reports/${report.id}`} className="block group">
      <article className="bg-card border rounded-xl overflow-hidden hover:shadow-md transition-shadow">

        {/* Foto Laporan */}
        <div className="relative h-48 bg-muted">
          {firstPhoto ? (
            <Image
              src={firstPhoto.url}
              alt={report.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <MapPin className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}

          {/* Badge Status */}
          <div className="absolute top-3 left-3">
            <span className={cn('text-xs px-2 py-1 rounded-full font-medium', getStatusColor(report.status))}>
              {getStatusLabel(report.status)}
            </span>
          </div>
        </div>

        {/* Konten */}
        <div className="p-4">
          <h3 className="font-semibold text-base mb-1 line-clamp-1 group-hover:text-primary transition-colors">
            {report.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {report.description}
          </p>

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[150px]">{report.address}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(report.createdAt)}</span>
            </div>
          </div>

          {/* Severity + Delete */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <span className={cn('text-xs font-medium', getSeverityColor(report.severity))}>
              Kerusakan: {getSeverityLabel(report.severity)}
            </span>

            {canDelete && (
              <button
                onClick={handleDelete}
                className="text-destructive hover:text-destructive/70 transition-colors"
                title="Hapus laporan"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
