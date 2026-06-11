'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import useSWR from 'swr';
import { X, MapPin, Calendar, Eye, ExternalLink, Loader2 } from 'lucide-react';
import apiClient from '@/lib/axios';
import { cn, formatDate, getStatusLabel, getStatusColor, getSeverityLabel, getSeverityMapColor, getDamageTypeLabel } from '@/lib/utils';
import { MapMarker, ReportDetail } from '@/types';

// ─── Fetcher ──────────────────────────────────────────────────────

const fetcher = (url: string) =>
  apiClient.get<{ report: ReportDetail }>(url).then((r) => r.data.report);

// ─── Sub-components ───────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3 p-4">
      <div className="h-36 bg-gray-200 rounded-lg" />
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </div>
      <div className="h-8 bg-gray-200 rounded-lg" />
    </div>
  );
}

function SeverityDot({ severity }: { severity: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full text-white"
      style={{ backgroundColor: getSeverityMapColor(severity) }}
    >
      {getSeverityLabel(severity)}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────

interface Props {
  marker: MapMarker;
  onClose: () => void;
}

export default function ReportPopup({ marker, onClose }: Props) {
  // Animasi mount/unmount
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };

  // Fetch detail laporan saat popup tampil — SWR meng-cache hasilnya
  const { data: report, isLoading } = useSWR(
    `/reports/${marker.id}`,
    fetcher,
    {
      revalidateOnFocus: false,
      // Gunakan data marker (yg sudah ada) sebagai petunjuk; fetch full detail di bg
      dedupingInterval: 30_000,
    },
  );

  const primaryPhoto = report?.photos.find((p) => p.isPrimary) ?? report?.photos[0];

  return (
    <div
      className={cn(
        'bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100',
        'transition-all duration-250 ease-out',
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <SeverityDot severity={marker.severity} />
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', getStatusColor(marker.status))}>
            {getStatusLabel(marker.status)}
          </span>
          <span className="text-xs text-gray-400 font-medium">
            {getDamageTypeLabel(marker.damageType)}
          </span>
        </div>
        <button
          onClick={handleClose}
          className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Tutup"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      {isLoading || !report ? (
        <Skeleton />
      ) : (
        <div className="p-4 pt-2 space-y-3">
          {/* Foto utama */}
          {primaryPhoto && (
            <div className="relative h-36 rounded-xl overflow-hidden bg-gray-100">
              <Image
                src={primaryPhoto.url}
                alt={report.title}
                fill
                className="object-cover"
                sizes="320px"
                unoptimized={primaryPhoto.url.startsWith('http://localhost')}
              />
              {report.photos.length > 1 && (
                <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                  +{report.photos.length - 1} foto
                </span>
              )}
            </div>
          )}

          {/* Info utama */}
          <div>
            <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
              {report.title}
            </h3>
            {report.reportNumber && (
              <p className="text-xs text-gray-400 mt-0.5">{report.reportNumber}</p>
            )}
          </div>

          {/* Meta: alamat + tanggal */}
          <div className="space-y-1">
            <div className="flex items-start gap-1.5 text-xs text-gray-500">
              <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-gray-400" />
              <span className="line-clamp-2">{report.address}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span>{formatDate(report.reportedAt)}</span>
              <span className="text-gray-300 mx-0.5">·</span>
              <Eye className="h-3.5 w-3.5 text-gray-400" />
              <span>{report.viewsCount} dilihat</span>
            </div>
          </div>

          {/* CTA */}
          <Link
            href={`/reports/${report.id}`}
            className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Lihat Detail
          </Link>
        </div>
      )}
    </div>
  );
}
