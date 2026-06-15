'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Plus, FileText, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useReportStore } from '@/store/reportStore';
import ReportCard from '@/components/reports/ReportCard';

// ─── Skeleton Card ─────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-800 animate-pulse">
      <div className="h-48 bg-slate-700" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-slate-700 rounded-full w-3/4" />
        <div className="h-3 bg-slate-700 rounded-full w-full" />
        <div className="h-3 bg-slate-700 rounded-full w-2/3" />
        <div className="pt-2 flex justify-between">
          <div className="h-3 bg-slate-700 rounded-full w-1/3" />
          <div className="h-3 bg-slate-700 rounded-full w-1/4" />
        </div>
      </div>
    </div>
  );
}

// ─── Stat Pill ─────────────────────────────────────────────────────

function StatPill({
  icon: Icon,
  count,
  label,
  colorClass,
  bgClass,
}: {
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly count: number;
  readonly label: string;
  readonly colorClass: string;
  readonly bgClass: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${bgClass} rounded-xl px-4 py-2.5 border border-slate-700/50`}>
      <Icon className={`h-4 w-4 shrink-0 ${colorClass}`} />
      <span className={`text-xl font-bold leading-none ${colorClass}`}>{count}</span>
      <span className="text-xs text-slate-500 leading-tight">{label}</span>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { reports, isLoading, error, fetchReports } = useReportStore();

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const list      = reports ?? [];
  const pending   = list.filter((r) => r.status === 'PENDING').length;
  const resolved  = list.filter((r) => r.status === 'RESOLVED').length;
  const rejected  = list.filter((r) => r.status === 'REJECTED').length;

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Laporan Saya</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Kelola semua laporan yang telah Anda buat
          </p>
        </div>
        <Link
          href="/reports/new"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5 shadow-sm hover:shadow-md shrink-0"
        >
          <Plus className="h-4 w-4" />
          Buat Laporan
        </Link>
      </div>

      {/* ── Stats ── */}
      {!isLoading && list.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <StatPill icon={FileText}    count={list.length} label="Total"    colorClass="text-slate-300"  bgClass="bg-slate-800/50" />
          <StatPill icon={Clock}       count={pending}     label="Menunggu" colorClass="text-amber-400"  bgClass="bg-amber-500/10" />
          <StatPill icon={CheckCircle2} count={resolved}   label="Selesai"  colorClass="text-green-400"  bgClass="bg-green-500/10" />
          <StatPill icon={XCircle}     count={rejected}    label="Ditolak"  colorClass="text-red-400"    bgClass="bg-red-500/10" />
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
          <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Loading Skeleton ── */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {['s1','s2','s3','s4','s5','s6'].map((k) => (
            <SkeletonCard key={k} />
          ))}
        </div>
      )}

      {/* ── Empty State ── */}
      {!isLoading && !error && list.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-700 rounded-2xl bg-slate-800/30">
          <div className="h-14 w-14 rounded-2xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center mb-4">
            <FileText className="h-7 w-7 text-blue-400" />
          </div>
          <p className="font-semibold text-slate-200 mb-1">Belum ada laporan</p>
          <p className="text-sm text-slate-500 mb-5 text-center max-w-xs">
            Mulai berkontribusi dengan melaporkan kerusakan jalan di sekitar Anda.
          </p>
          <Link
            href="/reports/new"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md"
          >
            <Plus className="h-4 w-4" />
            Buat Laporan Pertama
          </Link>
        </div>
      )}

      {/* ── Report Grid ── */}
      {!isLoading && list.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}

    </div>
  );
}
